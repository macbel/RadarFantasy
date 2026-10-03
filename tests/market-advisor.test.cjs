const assert = require('node:assert/strict');
const {validateResult,snapshot,standing,mount} = require('../market-ai-advisor.js');
const {cleanEnv,baseUrl,buildPrompt,modelPolicy,codexArguments,infer} = require('../scripts/market-agent.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const context={market:[{id:'1',rationalMax:100,ownBid:10},{id:'2',rationalMax:100,ownBid:0}],squad:[{id:'3'}],finance:{balance:200,maximumBid:100,availableBudget:100,updatedAt:new Date().toISOString()},evidence:[{id:'health:1'}]};
const result={schemaVersion:1,strategy:{summary:'<img onerror=x> Plan',priorities:['Reforzar']},actions:[{type:'buy',playerId:'1',priority:1,reason:'Datos visibles',evidenceIds:['health:1'],confidence:'medium',amount:90,maximumAmount:100,prerequisites:[]}],risks:[],limitations:[]};
const clone=v=>JSON.parse(JSON.stringify(v));
assert.equal(validateResult(result,context).actions[0].maximumAmount,100);
assert(!validateResult(result,context).strategy.summary.includes('<'));
for(const change of [r=>r.actions[0].playerId='unknown',r=>r.actions[0].maximumAmount=101,r=>r.actions[0].evidenceIds=['fake'],r=>r.actions.push({...r.actions[0],playerId:'2'}),r=>r.actions[0].type='sell']){const r=clone(result);change(r);assert.throws(()=>validateResult(r,context));}
for(const change of [c=>c.finance.balance=-1,c=>c.finance.balance=null,c=>c.finance.updatedAt='2000-01-01',c=>c.finance.updatedAt='2099-01-01',c=>c.finance.availableBudget=null]){const c=clone(context);change(c);assert.throws(()=>validateResult(result,c));}
assert.deepEqual(cleanEnv({PATH:'ok',CODEX_APP_TOOLS_PIPE_PATH:'private',CODEX_SESSION_ID:'private',OPENAI_API_KEY:'private',MCP_TOKEN:'private',THREAD_ID:'private'}),{PATH:'ok'});
assert.throws(()=>baseUrl('http://example.test'));assert.throws(()=>baseUrl('https://user:pass@example.test'));
const s=snapshot({read:()=>({market:[{id:'1',name:'A',health:{status:'doubtful'}}],squad:[],finance:{balance:200,updatedAt:new Date().toISOString()},budget:200,leagueId:'l',news:[{name:'A',articles:[{title:'Reciente',link:'https://example.test/news',publishedAt:new Date().toISOString()},{title:'sin fecha',link:'https://example.test/no'}]}]}),plan:()=>({rationalMax:100})},'balanced',1);
assert.equal(s.evidence.filter(e=>e.type==='news').length,1);
assert(!JSON.stringify(s).includes('sin fecha'));
const many=Array.from({length:65},(_,i)=>({id:String(i+1),name:'Jugador '+i,points:-2,health:{status:'doubtful',detail:'Detalle'.repeat(100)},sourceSummary:{recentMatches:Array.from({length:5},()=>({date:'2026-10-02',opponent:'Rival',points:-1,minutes:90}))},nextFixture:{date:'2026-10-03',opponent:'Rival'}}));
const large=snapshot({read:()=>({market:many.slice(0,25),squad:many.slice(25),finance:{balance:200,updatedAt:new Date().toISOString()},budget:200,leagueId:'l',news:many.map(p=>({name:p.name,articles:[1,2].map(i=>({title:'Noticia'.repeat(50),link:`https://example.test/${p.id}/${i}`,publishedAt:new Date().toISOString()}))})),rivals:Array.from({length:50},()=>({summary:'R'.repeat(500)}))}),plan:()=>({rationalMax:100})},'balanced',1);
assert.equal(large.squad.length,40);assert.equal(large.evidence.filter(e=>e.type==='health').length,65);assert(large.evidence.filter(e=>e.type==='form').length<=40);assert(large.evidence.length<=240);assert(new TextEncoder().encode(JSON.stringify(large)).length<=96000);assert.equal(large.market[0].points,-2);
const overlap=snapshot({read:()=>({market:[{id:'1',name:'Own'},{id:'2',name:'Market'},{id:'2',name:'Duplicate'}],squad:[{id:'1',name:'Own'},{id:'1',name:'Duplicate'}],finance:{balance:0},leagueId:'l'}),plan:()=>({})},'balanced',1);
assert.deepEqual(overlap.market.map(p=>p.id),['2']);assert.deepEqual(overlap.squad.map(p=>p.id),['1']);
assert.deepEqual(standing([{userId:2,points:25},{userId:1,points:0}],1),{rank:2,points:0,gapToLeader:25});
assert.deepEqual(standing([{userId:1,points:0,rank:1},{userId:2,points:-2}],1),{rank:1,points:0,gapToLeader:0});
assert.equal(standing([{points:4}],0),null);
const namedPrompt=buildPrompt({market:[{id:'actual-market-id',name:'Jugador de mercado real'}],squad:[{id:'actual-squad-id',name:'Jugador propio real'}]});
assert(namedPrompt.includes('Usa exclusivamente nombres reales del snapshot y sólo IDs y evidencias presentes'));
assert(namedPrompt.includes('su ingreso no es saldo asegurado'));
assert(namedPrompt.includes('Jugador de mercado real'));assert(namedPrompt.includes('Jugador propio real'));
assert(!namedPrompt.includes('Guler')&&!namedPrompt.includes('Fermín'));
assert.equal(modelPolicy('gpt-6.1-sol'),'gpt-6.1-sol');assert.equal(modelPolicy('gpt-6-astra'),'gpt-6-astra');assert.throws(()=>modelPolicy('gpt-6-luna'),/model_not_allowed/);
assert(codexArguments('gpt-6.1-sol','schema','output').includes('model_reasoning_effort="high"'));
assert(namedPrompt.includes('comment_reply')&&namedPrompt.includes('noticias/respuestas discrepan')&&namedPrompt.includes('Respeta scoring'));
const sourced=snapshot({read:()=>({market:[{id:'1',name:'Fermín'}],squad:[],finance:{balance:0},leagueId:'l',sourceCoverage:{threadsRead:2,repliesRead:2,verified:0,unverified:2},news:[{name:'Fermín',articles:[{title:'Noticia',link:'https://www.jornadaperfecta.com/blog/article/',sourceHost:'www.jornadaperfecta.com',sourceKind:'news',platform:'general',publishedAt:new Date().toISOString(),verifiedAt:new Date().toISOString()},{title:'Consulta real',link:'https://www.jornadaperfecta.com/blog/article/#comment-2',sourceHost:'www.jornadaperfecta.com',sourceKind:'comment_reply',platform:'biwenger',authorRole:'publicly_attributed',authorName:'Juanjo Rivero',authorVerification:'public_staff_attribution_identity_unverified',excerpt:'Pregunta: Fermín o Güler en Biwenger? Respuesta: Fermín.',publishedAt:new Date().toISOString(),verifiedAt:new Date().toISOString()}]}]}),plan:()=>({})},'balanced',1);
assert.equal(sourced.evidence[0].sourceKind,'comment_reply');assert.equal(sourced.evidence[0].source,'Jornada Perfecta');assert(sourced.evidence[0].value.includes('Pregunta:'));assert.equal(sourced.coverage.commentsUsed,1);
const rss=snapshot({read:()=>({market:[{id:'1',name:'A'}],squad:[],finance:{balance:0},leagueId:'l',news:[{name:'A',articles:[{title:'Fuente falsa',link:'https://news.google.com/rss/articles/a',source:'Jornada Perfecta',sourceKind:'opinion',publishedAt:new Date().toISOString()}]}]}),plan:()=>({})},'balanced',1);
assert.equal(rss.evidence[0].sourceKind,'unverified');assert.notEqual(rss.evidence[0].source,'Jornada Perfecta');
assert(snapshot({read:()=>({market:[],squad:[],finance:{},leagueId:'l'}),plan:()=>({})},'balanced',1).coverage.warnings.some(w=>w.startsWith('Sin noticias')));
async function cancellationUI(){
  const previous={document:global.document,localStorage:global.localStorage,setTimeout:global.setTimeout};
  const elements=Object.fromEntries(['status','result','pair-code','analyze','cancel','profile','horizon','pair','revoke'].map(k=>[k,{textContent:'',disabled:false,hidden:false,value:k==='profile'?'balanced':'1',replaceChildren(){},append(){}}]));
  const host={querySelector:s=>elements[s.match(/"([^"]+)"/)[1]],closest:()=>({classList:{contains:()=>true}})};
  global.document={getElementById:()=>host,hidden:false};global.localStorage={getItem:()=>null,removeItem(){}};global.setTimeout=()=>0;
  let signature='original';const calls=[];let bad=false;
  const input={market:[{id:'1',name:'A'}],squad:[],finance:{balance:100,updatedAt:new Date().toISOString()},leagueId:'l'};
  const adapter={scope:()=> 'account:league',signature:()=>signature,plan:()=>({rationalMax:100}),read:()=>{if(bad)throw new Error('snapshot_failure');return input;},fetch:async path=>{calls.push(path);if(path.endsWith('/jobs')){signature='changed';return{ok:true,json:async()=>({jobId:'id'})};}return{ok:true,json:async()=>({enabled:true,paired:true,workerOnline:true,cancelled:true})};}};
  try{const ui=mount(adapter);ui.refresh();await Promise.resolve();await elements.analyze.onclick();assert(calls.includes('/api/market-advisor/jobs/id/cancel'));assert.equal(elements.analyze.disabled,false);assert(elements.status.textContent.includes('cambiado'));bad=true;await elements.analyze.onclick();assert.equal(elements.analyze.disabled,false);assert.equal(elements.status.textContent,'snapshot_failure');}finally{Object.assign(global,previous);}
}
async function fakeCli(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'radar-worker-test-'));const fake=path.join(dir,'fake.cjs');fs.writeFileSync(fake,`const fs=require('node:fs');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{if(!input.includes('SNAPSHOT_DATOS'))process.exit(2);fs.writeFileSync('result.json',${JSON.stringify(JSON.stringify(result))});});`);try{const r=await infer(context,{executable:process.execPath,args:[fake]});assert.equal(r.actions[0].playerId,'1');}finally{fs.rmSync(dir,{recursive:true,force:true});}}
Promise.resolve().then(cancellationUI).then(fakeCli).then(()=>console.log('Market advisor: evidence, budgets, stale finance, isolation, duplicate IDs, standing, cancellation and fake CLI passed')).catch(e=>{console.error(e);process.exitCode=1;});
