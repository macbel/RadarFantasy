(function (root) {
  'use strict';
  const text = (v, n = 240) => String(v ?? '').replace(/[\x00-\x1f<>]/g, '').slice(0, n);
  const money = v => v !== null && v !== '' && Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const signed = v => v !== null && v !== '' && Number.isSafeInteger(Number(v)) ? Number(v) : null;
  function standing(rows, userId) {
    const index=rows.findIndex(row=>row.isMe===true || (Number(userId)>0 && Number(row.userId)===Number(userId)));
    if(index<0)return null;
    const row=rows[index];const rank=money(row.rank ?? row.position);const leader=rows.find(r=>Number(r.rank ?? r.position)===1)||rows[0];
    const points=signed(row.points);const leaderPoints=signed(leader?.points);
    return {rank:rank>0?rank:index+1,points,gapToLeader:points!==null&&leaderPoints!==null?Math.max(0,leaderPoints-points):null};
  }
  function validateResult(result, context) {
    if (!result || result.schemaVersion !== 1 || !result.strategy || !Array.isArray(result.actions) || result.actions.length > 12) throw new Error('invalid_output');
    const players = new Map([...context.market, ...context.squad].map(p => [p.id, p]));
    const evidence = new Set(context.evidence.map(e => e.id));
    let total = 0;
    const seen = new Set();
    const age = Date.now() - Date.parse(context.finance.updatedAt);
    const fresh = age >= -60000 && age <= 900000 && context.finance.balance !== null && context.finance.balance >= 0;
    const actions = result.actions.map(a => {
      if (!['buy','sell','hold','avoid','wait'].includes(a.type) || ![1,2,3].includes(a.priority) || !['low','medium','high'].includes(a.confidence) || !Array.isArray(a.evidenceIds) || a.evidenceIds.some(id => !evidence.has(id))) throw new Error('invalid_output');
      const p = players.get(a.playerId);
      if (a.type !== 'wait' && !p || seen.has(a.playerId) && a.type !== 'wait') throw new Error('invalid_output');
      if (p) seen.add(a.playerId);
      if (a.type === 'buy' && !context.market.some(p => p.id === a.playerId) || ['sell','hold'].includes(a.type) && !context.squad.some(p => p.id === a.playerId)) throw new Error('invalid_output');
      let amount = money(a.amount), maximumAmount = money(a.maximumAmount);
      if (a.type === 'buy') {
        if (!fresh || context.finance.maximumBid === null || context.finance.availableBudget === null || amount === null || maximumAmount === null || amount > maximumAmount || maximumAmount > p.rationalMax || maximumAmount > context.finance.maximumBid) throw new Error('invalid_budget');
        total += Math.max(0, maximumAmount - (p.ownBid || 0));
      } else { amount = null; maximumAmount = null; }
      return {type:a.type,playerId:p?.id || null,priority:a.priority,confidence:a.confidence,reason:text(a.reason,500),evidenceIds:a.evidenceIds.slice(0,8),amount,maximumAmount,prerequisites:(a.prerequisites || []).slice(0,4).map(v=>text(v))};
    });
    if (total > context.finance.availableBudget) throw new Error('invalid_budget');
    return {schemaVersion:1,strategy:{summary:text(result.strategy.summary,700),priorities:(result.strategy.priorities || []).slice(0,3).map(v=>text(v))},actions,risks:(result.risks || []).slice(0,6).map(v=>text(v)),limitations:(result.limitations || []).slice(0,6).map(v=>text(v))};
  }
  function snapshot(adapter, profile, horizonRounds) {
    const input = adapter.read();
    const evidence = [];
    let detailed=0;
    function player(p) {
      const id = text(p.biwengerPlayerId || p.playerId || p.id,64);
      const plan = adapter.plan(p);
      const refs = [];
      const rawMatches=p.sourceSummary?.recentMatches || p.sourceSummary?.biwenger?.recentMatches;
      const includeDetail=detailed++<40;
      const matches=includeDetail&&Array.isArray(rawMatches)?rawMatches.slice(0,5).map(m=>`${text(m.date,20)} ${text(m.opponent,40)}: ${signed(m.points ?? m.score) ?? '?'} pts; ${m.played===false?'DNP':text(m.minutes ?? '?',5)+' min'}`).join(' | '):null;
      const fixture=p.marketIntelligence?.nextMatch || p.nextMatch || p.nextFixture;
      for (const [type,value] of [['health', p.health ? `${text(p.health.status,30)}; ${text(p.health.detail || p.health.reason,180)}; fuente ${text(p.health.source,60)||'no identificada'}; fecha ${text(p.health.updatedAt || p.health.fetchedAt,40)||'desconocida'}`:null], ['form',matches], ['fixture',includeDetail&&fixture?`${text(fixture.date || fixture.kickoff,40)} ${text(fixture.opponent || fixture.opponentName,80)} ${text(fixture.venue || fixture.homeAway,30)}`:null]]) {
        if (!value) continue;
        const eid = `${type}:${id}`; refs.push(eid);
        evidence.push({id:eid,type,playerId:id,source:'Datos disponibles en Radar',fetchedAt:text(p.fetchedAt || p.enrichedAt || ''),value:text(value,type==='form'?600:400)});
      }
      return {id,name:text(p.name,100),team:text(p.team,80),position:text(p.position,15),price:money(p.price || p.biwengerValue),points:signed(p.points),rationalMax:money(plan.rationalMax) || 0,recommendedBid:money(plan.recommendedBid) || 0,ownBid:money(plan.ownBidAmount) || 0,reliability:text(p.reliability?.label || p.confidence || ''),evidenceIds:refs};
    }
    const playerId=p=>text(p.biwengerPlayerId || p.playerId || p.id,64);
    const unique=list=>{const ids=new Set();return list.filter(p=>{const id=playerId(p);if(!id||ids.has(id))return false;ids.add(id);return true;});};
    const ownIds=new Set(input.squad.map(playerId));
    const market = unique(input.market).filter(p=>!ownIds.has(playerId(p))).slice(0,25).map(player);
    const squad = unique(input.squad).slice(0,40).map(player);
    for(const entry of input.news || []) {
      const p=[...market,...squad].find(p=>p.id===String(entry.biwengerPlayerId)||p.name===entry.name);if(!p)continue;
      for(const article of (entry.articles || []).slice(0,2)){
        if(evidence.filter(e=>e.type==='news'&&e.playerId===p.id).length>=2)break;
        const date=article.publishedAt;const age=Date.now()-Date.parse(date);if(!date||age< -60000||age>604800000||!Number.isFinite(age))continue;
        let url;try{url=new URL(article.link);if(url.protocol!=='https:'||url.username||url.password)continue;}catch(_){continue;}
        if(evidence.some(e=>e.playerId===p.id&&e.url===url.href))continue;
        const id=`news:${p.id}:${p.evidenceIds.length}`;p.evidenceIds.push(id);evidence.push({id,type:'news',playerId:p.id,title:text(article.title,240),source:text(article.source || url.hostname,100),url:url.href,publishedAt:date,fetchedAt:input.newsFetchedAt || '',value:''});
      }
    }
    const finance = {balance:input.finance.balance === null ? null : Number(input.finance.balance),maximumBid:money(input.finance.maximumBid),committedBids:money(input.finance.bidTotal),availableBudget:money(input.budget),updatedAt:text(input.finance.updatedAt,40)};
    const context={leagueId:text(input.leagueId,64),competition:text(input.competition,40),scoring:text(input.scoring,40),asOf:new Date().toISOString(),profile,horizonRounds,finance,market,squad,rivals:input.rivals || [],myStanding:input.myStanding || null,evidence,coverage:{market:market.length > 0,squad:squad.length > 0,rivalsLoaded:(input.rivals || []).length,rivalsTotal:input.rivalsTotal || 0,warnings:[...(input.warnings || []),evidence.some(e=>e.type==='news')?'Sólo se citan noticias fechadas de los últimos 7 días.':'Sin noticias fechadas recientes disponibles.','Mercado: máximo 25 candidatos. Plantilla: máximo 40 jugadores; racha/calendario detallados de 40 perfiles prioritarios.']}};
    const bytes=()=>new TextEncoder().encode(JSON.stringify(context)).length;
    let trimmed=false;while((bytes()>96000||evidence.length>240)&&evidence.some(e=>e.type!=='health')){const index=evidence.findLastIndex(e=>e.type!=='health');const [removed]=evidence.splice(index,1);for(const p of[...market,...squad])p.evidenceIds=p.evidenceIds.filter(id=>id!==removed.id);trimmed=true;}
    if(trimmed)context.coverage.warnings.push('Se recortaron evidencias secundarias por el límite de transporte; se conserva el estado disponible de todos los jugadores.');return context;
  }
  function mount(adapter) {
    const host = document.getElementById('market-ai-advisor'); if (!host) return;
    let generation = 0, scope = '', job = null, result = null, resultExpiry = 0, signature = '', controller = null, timer = null;
    const el = name => host.querySelector(`[data-ai="${name}"]`);
    const errors={advisor_not_enabled:'Esta cuenta no tiene habilitado el asesor.',worker_not_paired:'Empareja primero tu PC.',worker_auth:'Se ha revocado la conexión del PC.',job_pending:'Ya hay un análisis pendiente.',advisor_rate_limit:'Has alcanzado el límite de análisis. Inténtalo más tarde.',relay_busy:'El asesor está ocupado. Inténtalo más tarde.',expired:'El PC no completó el análisis a tiempo.',cli_failed:'Codex no pudo completar el análisis. Revisa el agente del PC.',cli_timeout:'El análisis del PC agotó el tiempo disponible.',invalid_output:'La respuesta no superó las comprobaciones. Vuelve a analizar.',invalid_budget:'La respuesta propuso importes incompatibles con tu presupuesto.',login_required:'Inicia sesión en Codex con ChatGPT en tu PC.',invalid_pair_code:'El código ya caducó o se utilizó.',pair_cooldown:'Espera unos segundos antes de generar otro código.',pair_rate_limit:'Demasiados intentos de emparejamiento. Espera unos minutos.',job_not_found:'El análisis ha caducado. Solicita uno nuevo.'};
    const message = v => { el('status').textContent = errors[v] || v; };
    const cacheKey=()=>`fantasy-market-scout.market-ai.v1.${scope}`;
    const request = async (path, body, signal) => {
      const r = await adapter.fetch(`/api/market-advisor${path}`, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal} : {signal});
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'No se pudo completar la solicitud'); return data;
    };
    function reset(preserve=false) { generation++; controller?.abort(); clearTimeout(timer); job = null; if(!preserve){result=null;el('result').replaceChildren();} el('pair-code').textContent=''; el('analyze').disabled=false; el('cancel').hidden=true; }
    function render(value, context) {
      const safe = validateResult(value,context); const container=el('result'); container.replaceChildren();
      const add=(tag,t)=>{const n=document.createElement(tag);n.textContent=t;container.append(n);};
      add('strong','Plan IA · '+new Date(value.generatedAt || Date.now()).toLocaleString('es-ES')); add('p',safe.strategy.summary);
      add('small',`Cobertura: ${context.market.length} candidatos · ${context.squad.length} propios · ${context.coverage.rivalsLoaded}/${context.coverage.rivalsTotal} plantillas rivales.`);
      safe.strategy.priorities.forEach(v=>add('p','• '+v));
      const labels={buy:'Pujar por',sell:'Vender',hold:'Conservar',avoid:'Evitar',wait:'Esperar'};
      const nominees=safe.actions.filter(a=>a.playerId).sort((a,b)=>a.priority-b.priority).slice(0,3).map(a=>`${labels[a.type]} ${[...context.market,...context.squad].find(p=>p.id===a.playerId)?.name || ''}`);
      if(nominees.length)add('p',nominees.join(' · '));
      const confidence={low:'baja',medium:'media',high:'alta'};
      safe.actions.forEach(a=>{
        add('p',`${labels[a.type]} ${[...context.market,...context.squad].find(p=>p.id===a.playerId)?.name || ''} · prioridad ${a.priority} · confianza ${confidence[a.confidence]}${a.amount!==null?' · puja recomendada '+a.amount.toLocaleString('es-ES')+' €':''}${a.maximumAmount !== null ? ' · tope '+a.maximumAmount.toLocaleString('es-ES')+' €' : ''}: ${a.reason}`);
        a.prerequisites.forEach(v=>add('small',`Condición: ${v}`));
        if(a.type==='sell')add('small','Venta candidata: confirma una oferta y su precio, y mantén cobertura deportiva. El ingreso no se suma al presupuesto hasta completar la venta.');
      });
      for(const e of context.evidence.filter(e=>e.type==='news')) {try{const u=new URL(e.url);if(u.protocol!=='https:')continue;const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`${e.title} · ${e.source} · ${new Date(e.publishedAt).toLocaleDateString('es-ES')}`;container.append(a);}catch(_){} }
      [...safe.risks,...safe.limitations,...context.coverage.warnings].forEach(v=>add('small',v));
      result=safe;resultExpiry=(Date.parse(value.generatedAt)||Date.now())+900000;
    }
    async function status() {if(job)return;const g=generation;try {const s=await request('/status');if(g!==generation)return;host.hidden=!s.enabled; message(s.paired ? s.workerOnline ? 'PC conectado. Análisis manual con tu cuenta ChatGPT.' : 'PC sin conexión reciente. Enciéndelo y ejecuta el agente.' : 'Empareja tu PC para usar tu cuenta ChatGPT.');el('analyze').disabled=!s.paired;el('revoke').hidden=!s.paired;} catch(e){if(g===generation)message(result?'Sin conexión. Conservas el plan anterior con su fecha.':e.message);} }
    async function cancelChangedJob() {
      const id=job;const g=++generation;controller?.abort();clearTimeout(timer);job=null;el('analyze').disabled=true;
      if(id)try{await request(`/jobs/${id}/cancel`,{});}catch(e){if(g!==generation)return false;message('No se pudo confirmar la cancelación. Reintenta tras recuperar la conexión.');el('analyze').disabled=false;el('cancel').hidden=true;return false;}
      if(g!==generation)return false;reset();message('Los datos han cambiado. Solicita un análisis actualizado.');return true;
    }
    el('pair').onclick=async()=>{const g=generation;try{const s=await request('/pair/start',{});if(g!==generation)return;el('pair-code').textContent=`Código (5 min): ${s.pairCode}`;message('Introduce este código en el agente del PC. El resumen pasa temporalmente por el relay HTTPS y se borra al recogerlo.');setTimeout(()=>{if(g===generation)el('pair-code').textContent='';},300000);}catch(e){if(g===generation)message(e.message);}};
    el('revoke').onclick=async()=>{try{await request('/pair/revoke',{});reset();await status();}catch(e){message(e.message);}};
    el('cancel').onclick=async()=>{const id=job;reset();if(id)try{await request(`/jobs/${id}/cancel`,{});}catch(_){}message('Análisis cancelado.');};
    el('analyze').onclick=async()=>{
      reset(true); const g=generation; controller=new AbortController(); el('analyze').disabled=true;el('cancel').hidden=false;
      try {
      message('Preparando noticias y plantillas visibles…');
      if(adapter.prepare)await adapter.prepare(controller.signal).catch(()=>{});if(g!==generation)return;
      const context=snapshot(adapter,el('profile').value,Number(el('horizon').value));signature=adapter.signature();
      if (!context.market.length) {message('Carga primero el mercado.');el('analyze').disabled=false;el('cancel').hidden=true;return;}
      message('Enviando resumen privado al PC…');const created=await request('/jobs',{schemaVersion:1,requestId:crypto.randomUUID(),context},controller.signal);if(g!==generation)return;job=created.jobId;
        const poll=async()=>{try{if(g!==generation)return;if(signature!==adapter.signature()){await cancelChangedJob();return;}const s=await request(`/jobs/${job}`,null,controller.signal);if(g!==generation)return;if(s.status==='completed'){render(s.result,context);try{localStorage.setItem(cacheKey(),JSON.stringify({signature,expires:Date.now()+900000,result:s.result,context}));}catch(_){}message('Análisis completado. Revisa las condiciones antes de operar.');el('analyze').disabled=false;el('cancel').hidden=true;job=null;}else if(['failed','expired','cancelled'].includes(s.status)){throw new Error(s.errorCode || 'El análisis ha caducado.');}else{message(s.status==='running'?'Tu PC está analizando…':'Esperando al agente del PC…');timer=setTimeout(poll,3000);}}catch(e){if(g!==generation)return;job=null;message(e.message);el('analyze').disabled=false;el('cancel').hidden=true;}};await poll();
      }catch(e){if(g!==generation)return;message(e.message);el('analyze').disabled=false;el('cancel').hidden=true;}
    };
    const heartbeat=()=>{if(scope&&!document.hidden&&host.closest('.view')?.classList.contains('active')){if(result&&!job&&Date.now()>resultExpiry){try{localStorage.removeItem(cacheKey());}catch(_){}reset();message('El plan ha caducado. Actualiza el análisis antes de operar.');}else void status();}setTimeout(heartbeat,30000);};setTimeout(heartbeat,30000);
    return {refresh(){const next=adapter.scope();if(next!==scope){scope=next;reset();if(next){try{const cached=JSON.parse(localStorage.getItem(cacheKey()));if(cached&&cached.expires>Date.now()&&cached.signature===adapter.signature()){signature=cached.signature;render(cached.result,cached.context);}else localStorage.removeItem(cacheKey());}catch(_){}status();}}else if(job&&signature!==adapter.signature()){void cancelChangedJob();}else if(result&&signature!==adapter.signature()){try{localStorage.removeItem(cacheKey());}catch(_){}reset();message('Datos actualizados: vuelve a analizar.');}}};
  }
  const api={snapshot,standing,validateResult,mount}; if(typeof module==='object')module.exports=api;else root.RadarMarketAI=api;
})(typeof window==='object'?window:globalThis);
