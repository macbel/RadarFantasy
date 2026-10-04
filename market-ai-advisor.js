(function (root) {
  'use strict';
  const text = (v, n = 240) => String(v ?? '').replace(/[\x00-\x1f<>]/g, '').slice(0, n);
  const money = v => v !== null && v !== '' && Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const signed = v => v !== null && v !== '' && Number.isSafeInteger(Number(v)) ? Number(v) : null;
  function normalizedFixtures(rows) {
    return (Array.isArray(rows)?rows:[]).filter(m=>m&&typeof m==='object').slice(0,3).map(m=>{
      const seconds=Number(m.timestamp);const candidate=new Date(seconds*1000);const date=Number.isFinite(seconds)&&seconds>0&&Number.isFinite(candidate.getTime())?candidate.toISOString():text(m.date || m.kickoff,40);
      return {date,opponent:text(typeof m.opponent==='object'?m.opponent?.name:m.opponent || m.opponentName,80),venue:typeof m.isHome==='boolean'?(m.isHome?'casa':'fuera'):text(m.venue || m.homeAway,30)};
    }).filter(m=>Number.isFinite(Date.parse(m.date))&&m.opponent);
  }
  function healthEvidence(p) {
    const h=p.health;if(!h)return null;
    const apiFootball=/api[ -]?football/i.test([h.injuryRisk,h.source,h.provider].join(' '));
    const estimate=!apiFootball?text(h.expectedReturn,180):'';
    let url;try{const u=new URL(h.medicalUrl);if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch(_){}
    const provider=text(h.source || h.provider || (apiFootball?'API-Football':url?new URL(url).hostname:'origen no identificado'),70);
    const date=text(h.updatedAt || h.fetchedAt || p.fetchedAt || p.enrichedAt,40);
    return {source:provider,fetchedAt:date,url,value:`Estado: ${text(h.status,30)}. ${text(h.detail || h.reason,150)}. ${estimate?'Estimación de evolución/retorno (no confirmado): '+estimate+'.':'Sin plazo de recuperación confirmado.'} Fuente: ${provider}; fecha: ${date||'desconocida'}.`};
  }
  function standing(rows, userId) {
    const index=rows.findIndex(row=>row.isMe===true || (Number(userId)>0 && Number(row.userId)===Number(userId)));
    if(index<0)return null;
    const row=rows[index];const rank=money(row.rank ?? row.position);const leader=rows.find(r=>Number(r.rank ?? r.position)===1)||rows[0];
    const points=signed(row.points);const leaderPoints=signed(leader?.points);
    return {rank:rank>0?rank:index+1,points,gapToLeader:points!==null&&leaderPoints!==null?Math.max(0,leaderPoints-points):null};
  }
  function newsSample(market,squad,focus) {
    const group=(players)=>{
      const focused=focus?players.filter(p=>String(p.biwengerPlayerId || p.playerId || p.id)===focus.id):[];
      const critical=players.filter(p=>['injured','doubtful','suspended'].includes(p.health?.status)||(p.sourceSummary?.recentMatches || p.sourceSummary?.biwenger?.recentMatches)?.[0]?.played===false).slice(0,4);
      const selected=[],ids=new Set();for(const p of [...focused,...critical,...players]){const id=String(p.biwengerPlayerId || p.playerId || p.id);if(ids.has(id))continue;ids.add(id);selected.push(p);if(selected.length>=8)break;}return selected;
    };
    return [...group(market),...group(squad)];
  }
  function validateResult(result, context) {
    const focus=context.focusPlayer;
    if(focus&&(!['market','squad'].includes(focus.origin)||typeof focus.id!=='string'||!context[focus.origin].some(p=>p.id===focus.id)))throw new Error('invalid_focus');
    if (!result || result.schemaVersion !== 1 || !result.strategy || !Array.isArray(result.actions) || result.actions.length > 5 || typeof result.strategy.summary!=='string' || result.strategy.summary.length>180) throw new Error('invalid_output');
    const players = new Map([...context.market, ...context.squad].map(p => [p.id, p]));
    const evidence = new Set(context.evidence.map(e => e.id));
    let total = 0;
    const seen = new Set();
    const age = Date.now() - Date.parse(context.finance.updatedAt);
    const fresh = age >= -60000 && age <= 900000 && context.finance.balance !== null && context.finance.balance >= 0;
    const actions = result.actions.map(a => {
      if (!['buy','sell','hold','avoid','wait'].includes(a.type) || ![1,2,3].includes(a.priority) || !['low','medium','high'].includes(a.confidence) || !Array.isArray(a.evidenceIds) || a.evidenceIds.some(id => !evidence.has(id))) throw new Error('invalid_output');
      const p = players.get(a.playerId);
      if(typeof a.reason!=='string'||a.reason.length>200||!Array.isArray(a.prerequisites)||a.prerequisites.length>2||a.prerequisites.some(v=>typeof v!=='string'||v.length>140))throw new Error('invalid_output');
      if (a.type !== 'wait' && !p || seen.has(a.playerId) && a.type !== 'wait') throw new Error('invalid_output');
      if (p) seen.add(a.playerId);
      if (a.type === 'buy' && !context.market.some(p => p.id === a.playerId) || ['sell','hold'].includes(a.type) && !context.squad.some(p => p.id === a.playerId)) throw new Error('invalid_output');
      let amount = money(a.amount), maximumAmount = money(a.maximumAmount);
      if (a.type === 'buy') {
        if (!fresh || context.finance.maximumBid === null || context.finance.availableBudget === null || amount === null || maximumAmount === null || amount > maximumAmount || maximumAmount > p.rationalMax || maximumAmount > context.finance.maximumBid) throw new Error('invalid_budget');
        total += Math.max(0, maximumAmount - (p.ownBid || 0));
      } else { amount = null; maximumAmount = null; }
      return {type:a.type,playerId:p?.id || null,priority:a.priority,confidence:a.confidence,reason:text(a.reason,200),evidenceIds:a.evidenceIds.slice(0,8),amount,maximumAmount,prerequisites:a.prerequisites.map(v=>text(v,140))};
    });
    if(focus&&(actions.length>3||!actions.some(a=>a.playerId===focus.id)))throw new Error('invalid_focus');
    if (total > context.finance.availableBudget) throw new Error('invalid_budget');
    if(!Array.isArray(result.risks)||!Array.isArray(result.limitations)||result.risks.length>2||result.limitations.length>2)throw new Error('invalid_output');
    const insights=result.rivalInsights??[];const aliases=new Set((context.rivals||[]).map(r=>r.alias));const seenRivals=new Set();
    if(!Array.isArray(insights)||insights.length>3)throw new Error('invalid_output');
    for(const i of insights){if(!i||!aliases.has(i.rivalAlias)||seenRivals.has(i.rivalAlias)||typeof i.opinion!=='string'||i.opinion.length>180)throw new Error('invalid_output');seenRivals.add(i.rivalAlias);}
    return {schemaVersion:1,strategy:{summary:text(result.strategy.summary,180),priorities:(result.strategy.priorities || []).slice(0,3).map(v=>text(v))},actions,rivalInsights:insights.map(i=>({rivalAlias:i.rivalAlias,opinion:text(i.opinion,180)})),risks:result.risks.map(v=>text(v,180)),limitations:result.limitations.map(v=>text(v,180))};
  }
  function snapshot(adapter, profile, horizonRounds, focus) {
    const input = adapter.read();
    const evidence = [];
    let detailed=0;
    function player(p, own=false) {
      const id = text(p.biwengerPlayerId || p.playerId || p.id,64);
      const plan = adapter.plan(p);
      const refs = [];
      const rawMatches=p.sourceSummary?.recentMatches || p.sourceSummary?.biwenger?.recentMatches;
      const includeDetail=detailed++<40;
      const matches=includeDetail&&Array.isArray(rawMatches)?rawMatches.slice(0,5).map(m=>`${text(m.date,20)} ${text(m.opponent,40)}: ${signed(m.points ?? m.score) ?? '?'} pts; ${m.played===false?'DNP':text(m.minutes ?? '?',5)+' min'}`).join(' | '):null;
      const health=healthEvidence(p);
      const fixtures=normalizedFixtures(adapter.fixtures?adapter.fixtures(p):p.marketIntelligence?.calendar?.matches || [p.nextMatch || p.nextFixture].filter(Boolean));
      const fixture=includeDetail&&fixtures.length?fixtures.map(m=>`${m.date} vs ${m.opponent} (${m.venue||'sede desconocida'})`).join(' | '):null;
      const role=typeof p.marketIntelligence?.role==='string'?`Estimación del motor local, no rol confirmado: ${text(p.marketIntelligence.role,80)}. Titularidad derivada/importada ${Number.isFinite(Number(p.starter))?Math.max(0,Math.min(100,Number(p.starter)))+'/100':'sin dato'}; no probabilidad calibrada. Comprobar noticias y minutos.`:null;
      const compactOwn=own?`Plantilla propia: últimos partidos ${Array.isArray(rawMatches)?rawMatches.slice(0,3).map(m=>m.played===false?'no jugó':`${signed(m.points ?? m.score) ?? '?'} pts/${text(m.minutes ?? '?',5)} min`).join('; '):'sin datos'}; próximo ${fixtures[0]?fixtures[0].date+' vs '+fixtures[0].opponent:'sin calendario'}. ${role||'Rol sin confirmar.'}`:null;
      for (const [type,value] of [['health',health?.value], ['form',matches], ['fixture',fixture],['roster',compactOwn|| (includeDetail?role:null)]]) {
        if (!value) continue;
        const eid = `${type}:${id}`; refs.push(eid);
        evidence.push({id:eid,type,playerId:id,source:type==='health'?health.source:type==='roster'?'Estimación del motor local':'Datos disponibles en Radar',fetchedAt:type==='health'?health.fetchedAt:text(p.fetchedAt || p.enrichedAt || ''),...(type==='health'&&health.url?{url:health.url}:{}),value:text(value,type==='form'||type==='health'?600:400)});
      }
      return {id,name:text(p.name,100),team:text(p.team,80),position:text(p.position,15),price:money(p.price || p.biwengerValue),valueChange: signed(p.biwengerDiff ?? p.sourceSummary?.fantasy?.biwengerDiff),localExpectedPoints:typeof p.marketIntelligence?.expectedPoints==='number'&&Number.isFinite(p.marketIntelligence.expectedPoints)?Math.round(p.marketIntelligence.expectedPoints*100)/100:null,points:signed(p.points),rationalMax:money(plan.rationalMax) || 0,recommendedBid:money(plan.recommendedBid) || 0,ownBid:money(plan.ownBidAmount) || 0,reliability:text(p.reliability?.label || p.confidence || ''),evidenceIds:refs};
    }
    const playerId=p=>text(p.biwengerPlayerId || p.playerId || p.id,64);
    if(focus&&(!['market','squad'].includes(focus.origin)||typeof focus.id!=='string'||focus.id.length>64||!input[focus.origin].some(p=>playerId(p)===focus.id)))throw new Error('invalid_focus');
    const prioritize=list=>focus?[...list].sort((a,b)=>Number(playerId(b)===focus.id)-Number(playerId(a)===focus.id)):list;
    const unique=list=>{const ids=new Set();return list.filter(p=>{const id=playerId(p);if(!id||ids.has(id))return false;ids.add(id);return true;});};
    const ownIds=new Set(input.squad.map(playerId));
    const market = prioritize(unique(input.market).filter(p=>!ownIds.has(playerId(p)))).slice(0,25).map(p=>player(p));
    const squad = prioritize(unique(input.squad)).slice(0,40).map(p=>player(p,true));
    if(focus&&![...market,...squad].some(p=>p.id===focus.id))throw new Error('invalid_focus');
    for(const entry of input.news || []) {
      const p=[...market,...squad].find(p=>p.id===String(entry.biwengerPlayerId)||p.name===entry.name);if(!p)continue;
      const articles=[...(entry.articles || [])].sort((a,b)=>(Number(b.sourceKind==='comment_reply')-Number(a.sourceKind==='comment_reply'))||String(b.publishedAt).localeCompare(String(a.publishedAt)));
      for(const article of articles.slice(0,2)){
        if(evidence.filter(e=>e.type==='news'&&e.playerId===p.id).length>=2)break;
        const date=article.publishedAt;const age=Date.now()-Date.parse(date);if(!date||age< -60000||age>604800000||!Number.isFinite(age))continue;
        let url;try{url=new URL(article.link);if(url.protocol!=='https:'||url.username||url.password)continue;}catch(_){continue;}
        if(evidence.some(e=>e.playerId===p.id&&e.url===url.href))continue;
        const hosts={'www.futbolfantasy.com':'FutbolFantasy','futbolfantasy.com':'FutbolFantasy','www.jornadaperfecta.com':'Jornada Perfecta','jornadaperfecta.com':'Jornada Perfecta','biwenger.as.com':'Biwenger','www.biwenger.com':'Biwenger','biwenger.com':'Biwenger'};
        const verified=article.verifiedAt&&hosts[url.hostname]&&url.hostname===article.sourceHost;
        const id=`news:${p.id}:${p.evidenceIds.length}`;p.evidenceIds.push(id);evidence.push({id,type:'news',playerId:p.id,title:text(article.title,240),source:verified?hosts[url.hostname]:'Enlace deportivo sin verificación del asesor',sourceHost:url.hostname,url:url.href,publishedAt:date,fetchedAt:article.verifiedAt || input.newsFetchedAt || '',sourceKind:verified&&['news','opinion','comment_reply'].includes(article.sourceKind)?article.sourceKind:'unverified',platform:verified?text(article.platform,30):'unknown',recommendationScope:verified?text(article.recommendationScope,30):'none',authorName:verified?text(article.authorName,100):'',authorRole:verified?text(article.authorRole,50):'unverified',authorVerification:verified?text(article.authorVerification,70):'unknown',parentId:verified?text(article.parentId,50):'',commentId:verified?text(article.commentId,50):'',value:text(article.excerpt,800)});
      }
    }
    const finance = {balance:input.finance.balance === null ? null : Number(input.finance.balance),maximumBid:money(input.finance.maximumBid),committedBids:money(input.finance.bidTotal),availableBudget:money(input.budget),updatedAt:text(input.finance.updatedAt,40)};
    const context={leagueId:text(input.leagueId,64),competition:text(input.competition,40),scoring:text(input.scoring,40),asOf:new Date().toISOString(),profile,horizonRounds,finance,market,squad,rivals:input.rivals || [],myStanding:input.myStanding || null,evidence,coverage:{market:market.length > 0,squad:squad.length > 0,rivalsLoaded:(input.rivals || []).length,rivalsTotal:input.rivalsTotal || 0,sources:input.sourceCoverage || null,warnings:[...(input.warnings || []),evidence.some(e=>e.type==='news')?'Sólo se citan noticias/respuestas fechadas de los últimos 7 días.':'Sin noticias ni respuestas fechadas recientes disponibles.','Mercado: máximo 25 candidatos. Plantilla: máximo 40 jugadores; racha/calendario detallados de 40 perfiles prioritarios.']}};
    if(focus)context.focusPlayer={id:focus.id,origin:focus.origin};
    const bytes=()=>new TextEncoder().encode(JSON.stringify(context)).length;
    let trimmed=false;while((bytes()>94000||evidence.length>240)&&evidence.some(e=>e.type!=='health')){let index=evidence.findLastIndex(e=>e.type!=='health'&&e.playerId!==focus?.id&&!(e.type==='roster'&&ownIds.has(e.playerId)));if(index<0)index=evidence.findLastIndex(e=>e.type!=='health');const [removed]=evidence.splice(index,1);for(const p of[...market,...squad])p.evidenceIds=p.evidenceIds.filter(id=>id!==removed.id);trimmed=true;}
    if(trimmed)context.coverage.warnings.push('Se recortaron evidencias secundarias por el límite de transporte; se conserva el estado disponible de todos los jugadores.');
    context.coverage.commentsUsed=new Set(evidence.filter(e=>e.sourceKind==='comment_reply').map(e=>e.url)).size;return context;
  }
  function renderPlan(container,value,context) {
    const safe=validateResult(value,context);container.replaceChildren();
    const add=(parent,tag,content,className)=>{const n=document.createElement(tag);n.textContent=content;if(className)n.className=className;parent.append(n);return n;};
    const fold=(parent,label)=>{const d=document.createElement('details');add(d,'summary',label);parent.append(d);return d;};
    const labels={buy:'Puja por',sell:'Vende',hold:'Mantén',avoid:'Evita',wait:'Espera con'};
    const confidence={low:'baja',medium:'media',high:'alta'};
    const focused=context.focusPlayer&&context[context.focusPlayer.origin].find(p=>p.id===context.focusPlayer.id);
    add(container,'strong',`${focused?'Consulta sobre '+focused.name:'Plan'} · ${context.horizonRounds===3?'próximas 3 jornadas':'próxima jornada'}`);
    add(container,'small',new Date(value.generatedAt || Date.now()).toLocaleString('es-ES'),'market-ai-date');
    const cite=(parent,e)=>{try{const u=new URL(e.url);if(u.protocol!=='https:'||u.username||u.password)return;const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';const kind={news:'Noticia deportiva',opinion:'Opinión editorial',comment_reply:'Consulta y respuesta',unverified:'Enlace no verificado'}[e.sourceKind]||'Fuente';const identity=e.sourceKind==='comment_reply'?(e.authorRole==='publicly_attributed'?` · atribuida a ${e.authorName}; identidad no verificada`:e.authorRole==='unverified'?' · identidad no verificada':' · autoría identificada'):'';a.textContent=`${kind}: ${e.title || e.source} · ${e.source} · ${e.publishedAt?new Date(e.publishedAt).toLocaleDateString('es-ES'):e.fetchedAt?new Date(e.fetchedAt).toLocaleDateString('es-ES'):'fecha desconocida'}${identity}`;parent.append(a);}catch(_){} };
    for(const a of [...safe.actions].sort((a,b)=>a.priority-b.priority)){
      const row=document.createElement('article');row.className='market-ai-action';container.append(row);
      const player=[...context.market,...context.squad].find(p=>p.id===a.playerId);
      const heading=player?`${labels[a.type]} ${player.name}`:'Espera';
      add(row,'p',`${heading}: ${a.reason}`,'market-ai-action-copy');
      if(a.type==='buy')add(row,'strong',`${a.amount.toLocaleString('es-ES')} € · tope ${a.maximumAmount.toLocaleString('es-ES')} €`,'market-ai-bid');
      a.prerequisites.forEach(v=>add(row,'small',`Sólo si: ${v}`,'market-ai-critical-condition'));
      if(a.type==='sell')add(row,'small','Venta candidata; no cuentes el ingreso hasta confirmarla.','market-ai-critical-condition');
      const detail=fold(row,'Motivos y fuentes');add(detail,'small',`Prioridad ${a.priority} · confianza ${confidence[a.confidence]}`);
      if(a.type==='sell')add(detail,'small','Confirma oferta, precio y sustituto/cobertura deportiva antes de vender.');
      for(const id of a.evidenceIds){const e=context.evidence.find(e=>e.id===id);if(!e)continue;if(e.url)cite(detail,e);else add(detail,'small',`${e.source}: ${e.value || e.title || 'Dato disponible'}${e.fetchedAt?' · '+e.fetchedAt:' · fecha desconocida'}`);}
      if(!a.evidenceIds.length)add(detail,'small','Sin evidencia específica citada: revisa el contexto antes de operar.');
    }
    if(!safe.actions.length)add(container,'p',safe.strategy.summary);
    if(safe.rivalInsights.length){const rivals=fold(container,'Lectura de rivales');safe.rivalInsights.forEach(i=>{const r=context.rivals.find(r=>r.alias===i.rivalAlias);add(rivals,'p',`${r?.name||i.rivalAlias}${r?.rank?' · puesto '+r.rank:''}: ${i.opinion}`);});add(rivals,'small','Opinión sobre plantillas visibles resumidas. Presupuestos y pujas ocultos desconocidos.');}
    const general=fold(container,'Contexto, cobertura y riesgos');
    if(safe.actions.length)add(general,'p',safe.strategy.summary);
    add(general,'small',`${context.market.length} candidatos · ${context.squad.length} propios · ${context.coverage.rivalsLoaded}/${context.coverage.rivalsTotal} plantillas rivales.`);
    if(context.coverage.sources){const c=context.coverage.sources;add(general,'small',`JP: ${c.threadsRead||0} hilos y ${c.repliesRead||0} respuestas leídos · ${c.verified||0} con señal de autoría · ${c.unverified||0} sin identidad verificada · ${context.coverage.commentsUsed||0} incluidas.`);}
    [...safe.risks,...safe.limitations,...context.coverage.warnings].forEach(v=>add(general,'small',v));
    const cited=new Set(safe.actions.flatMap(a=>a.evidenceIds));for(const e of context.evidence.filter(e=>e.type==='news'&&!cited.has(e.id)))cite(general,e);
    return safe;
  }
  function mount(adapter) {
    const host=document.getElementById('market-ai-advisor');if(!host)return;
    let generation=0,scope='',job=null,signature='',controller=null,timer=null,enabled=false,paired=false,dialog=null,active=null;
    let general=null,generalExpiry=0;
    const el=name=>host.querySelector(`[data-ai="${name}"]`);
    const errors={invalid_focus:'Este jugador ya no está disponible en este contexto.',advisor_not_enabled:'Esta cuenta no tiene habilitado el asesor.',worker_not_paired:'Empareja primero tu PC.',worker_auth:'Se ha revocado la conexión del PC.',job_pending:'Ya hay un análisis pendiente. Cancélalo antes de iniciar otro.',advisor_rate_limit:'Has alcanzado el límite de análisis. Inténtalo más tarde.',relay_busy:'El asesor está ocupado. Inténtalo más tarde.',expired:'El PC no completó el análisis a tiempo.',cli_failed:'Codex no pudo completar el análisis. Revisa el agente del PC.',cli_timeout:'El análisis del PC agotó el tiempo disponible.',invalid_output:'La respuesta no superó las comprobaciones. Vuelve a analizar.',invalid_budget:'La respuesta propuso importes incompatibles con tu presupuesto.',login_required:'Inicia sesión en Codex con ChatGPT en tu PC.',invalid_pair_code:'El código ya caducó o se utilizó.',pair_cooldown:'Espera unos segundos antes de generar otro código.',pair_rate_limit:'Demasiados intentos de emparejamiento. Espera unos minutos.',job_not_found:'El análisis ha caducado. Solicita uno nuevo.'};
    const message=(v,run=active)=>{(run?.status||el('status')).textContent=errors[v]||v;};
    const key=(focus,profile=el('profile').value,horizon=el('horizon').value)=>`fantasy-market-scout.market-ai.v4.${scope}.${profile}.${horizon}.${focus?focus.origin+':'+focus.id:'general'}`;
    const request=async(path,body,signal)=>{const r=await adapter.fetch(`/api/market-advisor${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal}:{signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudo completar la solicitud');return data;};
    const availability=()=>{adapter.availability?.(enabled,Boolean(active));};
    function idle(){el('analyze').disabled=!paired;el('cancel').hidden=true;if(dialog)dialog.querySelector('[data-player-ai-cancel]').hidden=true;availability();}
    function reset(clearGeneral=false){generation++;controller?.abort();clearTimeout(timer);job=null;active=null;el('pair-code').textContent='';if(clearGeneral){general=null;el('result').replaceChildren();}idle();}
    async function status(){if(active)return;const g=generation;try{const s=await request('/status');if(g!==generation)return;enabled=Boolean(s.enabled);paired=Boolean(s.paired);host.hidden=!enabled;availability();message(paired?s.workerOnline?'PC conectado. Análisis manual con tu cuenta ChatGPT.':'PC sin conexión reciente. Enciéndelo y ejecuta el agente.':'Empareja tu PC para usar tu cuenta ChatGPT.');idle();el('revoke').hidden=!paired;}catch(e){if(g===generation)message(general?'Sin conexión. Conservas el plan anterior con su fecha.':e.message);}}
    async function cancel(changed=false){const id=job,run=active;const g=++generation;controller?.abort();clearTimeout(timer);job=null;active={cancelling:true,status:run?.status||el('status')};try{if(id)await request(`/jobs/${id}/cancel`,{});if(g!==generation)return;message(changed?'Los datos han cambiado. Solicita un análisis actualizado.':'Análisis cancelado.',run);}catch(_){if(g!==generation)return;message('No se pudo confirmar la cancelación. Reintenta tras recuperar la conexión.',run);}active=null;idle();}
    function readCache(focus,output){try{const cache=JSON.parse(localStorage.getItem(key(focus)));if(cache&&cache.expires>Date.now()&&cache.signature===adapter.signature()&&JSON.stringify(cache.context.focusPlayer||null)===JSON.stringify(focus||null)){renderPlan(output,cache.result,cache.context);return cache;}localStorage.removeItem(key(focus));}catch(_){}return null;}
    async function run(focus=null,output=el('result'),statusNode=el('status')){
      if(active){message('job_pending',{status:statusNode});return false;}
      if(!enabled||!paired){message(enabled?'worker_not_paired':'advisor_not_enabled',{status:statusNode});return false;}
      const g=++generation;signature='';controller=new AbortController();const current={focus,output,status:statusNode,profile:el('profile').value,horizon:Number(el('horizon').value),cache:key(focus)};active=current;el('analyze').disabled=true;el('cancel').hidden=false;if(focus&&dialog)dialog.querySelector('[data-player-ai-cancel]').hidden=false;availability();
      try{
        message('Preparando noticias y plantillas visibles…',current);if(adapter.prepare)await adapter.prepare(controller.signal,focus).catch(()=>{});if(g!==generation)return false;
        const context=snapshot(adapter,current.profile,current.horizon,focus);signature=adapter.signature();
        if(!context.market.length&&!focus)throw new Error('Carga primero el mercado.');
        message('Enviando resumen privado al PC…',current);const created=await request('/jobs',{schemaVersion:1,requestId:crypto.randomUUID(),context},controller.signal);
        if(g!==generation){try{await request(`/jobs/${created.jobId}/cancel`,{});}catch(_){}return false;}job=created.jobId;
        const poll=async()=>{try{if(g!==generation)return;if(signature!==adapter.signature()){await cancel(true);return;}const s=await request(`/jobs/${job}`,null,controller.signal);if(g!==generation)return;
          if(s.status==='completed'){
            if(current.focus&&current.output.isConnected===false){await cancel();return;}
            renderPlan(current.output,s.result,context);const expires=(Date.parse(s.result.generatedAt)||Date.now())+900000;
            if(!focus){general=s.result;generalExpiry=expires;}
            try{localStorage.setItem(current.cache,JSON.stringify({signature,expires,result:s.result,context}));}catch(_){}
            message('Análisis completado. Revisa las condiciones antes de operar.',current);job=null;active=null;idle();
          }else if(['failed','expired','cancelled'].includes(s.status))throw new Error(s.errorCode||'El análisis ha caducado.');else{message(s.status==='running'?'Tu PC está analizando…':'Esperando al agente del PC…',current);timer=setTimeout(poll,3000);}
        }catch(e){if(g!==generation)return;job=null;active=null;message(e.message,current);idle();}};await poll();return true;
      }catch(e){if(g!==generation)return false;job=null;active=null;message(e.message,current);idle();return false;}
    }
    el('pair').onclick=async()=>{const g=generation;try{const s=await request('/pair/start',{});if(g!==generation)return;el('pair-code').textContent=`Código (5 min): ${s.pairCode}`;message('Introduce este código en el agente del PC. El resumen pasa temporalmente por el relay HTTPS y se borra al recogerlo.');setTimeout(()=>{if(g===generation)el('pair-code').textContent='';},300000);}catch(e){if(g===generation)message(e.message);}};
    el('revoke').onclick=async()=>{try{await request('/pair/revoke',{});reset(true);enabled=false;paired=false;dialog?.close();await status();}catch(e){message(e.message);}};
    el('cancel').onclick=()=>cancel();el('analyze').onclick=()=>run();
    function consult(id,origin){
      if(!enabled)return false;
      if(!dialog){dialog=document.createElement('dialog');dialog.className='player-ai-dialog';dialog.setAttribute('aria-labelledby','player-ai-title');dialog.innerHTML='<header><h3 id="player-ai-title">Consulta IA del jugador</h3><button type="button" data-player-ai-close aria-label="Cerrar consulta IA">Cerrar</button></header><p data-player-ai-status role="status"></p><div data-player-ai-result aria-live="polite"></div><button type="button" data-player-ai-cancel hidden>Cancelar análisis</button>';document.body.append(dialog);dialog.querySelector('[data-player-ai-cancel]').onclick=()=>cancel();dialog.querySelector('[data-player-ai-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(active?.focus)void cancel();});}
      const output=dialog.querySelector('[data-player-ai-result'),statusNode=dialog.querySelector('[data-player-ai-status]');
      if(active){output.replaceChildren();statusNode.textContent=errors.job_pending;dialog.querySelector('[data-player-ai-cancel]').hidden=false;if(!dialog.open)dialog.showModal();return false;}
      output.replaceChildren();statusNode.textContent='';if(!dialog.open)dialog.showModal();const focus={id:String(id),origin};
      const cache=readCache(focus,output);if(cache){statusNode.textContent='Consulta guardada con su fecha. Revisa las condiciones.';return true;}
      void run(focus,output,statusNode);return true;
    }
    const heartbeat=()=>{if(scope&&!document.hidden&&(host.closest('.view')?.classList.contains('active')||dialog?.open)){if(general&&!active&&Date.now()>generalExpiry){general=null;el('result').replaceChildren();message('El plan ha caducado. Actualiza el análisis antes de operar.');}else void status();}setTimeout(heartbeat,30000);};setTimeout(heartbeat,30000);
    return {consult,refresh(){const next=adapter.scope();if(next!==scope){if(active)void cancel(true);scope=next;reset(true);dialog?.close();enabled=false;paired=false;availability();if(next){const cached=readCache(null,el('result'));if(cached){general=cached.result;generalExpiry=cached.expires;signature=cached.signature;}void status();}}else if(active&&signature&&signature!==adapter.signature()){void cancel(true);}else if(general&&signature!==adapter.signature()){try{localStorage.removeItem(key(null));}catch(_){}general=null;el('result').replaceChildren();message('Datos actualizados: vuelve a analizar.');if(dialog?.open)dialog.querySelector('[data-player-ai-result]').replaceChildren();}if(dialog?.open&&signature&&signature!==adapter.signature()){dialog.querySelector('[data-player-ai-result]').replaceChildren();message('Datos actualizados: vuelve a consultar.',{status:dialog.querySelector('[data-player-ai-status]')});}availability();}};
  }
  const api={snapshot,standing,healthEvidence,normalizedFixtures,newsSample,renderPlan,validateResult,mount}; if(typeof module==='object')module.exports=api;else root.RadarMarketAI=api;
})(typeof window==='object'?window:globalThis);
