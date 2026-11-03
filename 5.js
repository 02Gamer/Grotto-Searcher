importScripts('1.js','2.js');
let wkGen=-1;
let wkJob=null;
let wkCancelled=false;
let wkChain=Promise.resolve();
self.addEventListener('message',(e)=>{
const m=e.data;
if(!m)return;
if(m.type==='cancel'){wkCancelled=true;return;}
if(m.type==='job'){
wkGen=m.gen;
wkJob=m.job;
wkCancelled=false;
setDisplayLang(m.job.lang||'EN');
initItemI18n();
return;
}
if(m.type==='chunk'){
wkChain=wkChain.then(()=>runChunk(m)).catch((err)=>{
console.error('Worker chunk error:',err);
self.postMessage({type:'error',gen:m.gen,chunkId:m.chunkId,message:''+(err&&err.message||err)});
});
return;
}
});
async function runChunk(c){
if(c.gen!==wkGen||!wkJob){
self.postMessage({type:'chunkDone',gen:c.gen,chunkId:c.chunkId,items:[],hits:0,aborted:true});
return;
}
const job=wkJob;
const items=[];
const io={
cancelled:()=>wkCancelled||c.gen!==wkGen,
progress:(p)=>self.postMessage({type:'tick',gen:c.gen,chunkId:c.chunkId,
frac:p.total>0?p.processed/p.total:1,rStr:p.rStr,seedHex:p.seedHex}),
batch:(b)=>{for(const x of b)items.push(x);},
yield:()=>new Promise(r=>setTimeout(r,0)),
};
const extra={startSeed:c.startSeed,endSeed:c.endSeed};
if(job.kind==='scan'){
extra.allRanks=job.ranks;
extra.ranks=c.ranks||[c.rank];
if(c.ranks)extra.seedMajor=true;
}
const chunkJob=Object.assign({},job,extra);
const runner=getCoreSearchRunner(job.kind);
const hits=runner?await runner(chunkJob,io):0;
const aborted=io.cancelled();
self.postMessage({type:'chunkDone',gen:c.gen,chunkId:c.chunkId,
items:aborted?[]:items,hits:aborted?0:hits,aborted});
}
function setupSolverWorker(m){
setDisplayLang(m.lang||'EN');
self.window=self;
self.document={getElementById:(id)=>(m.dom&&(id in m.dom))?{checked:!!m.dom[id]}:null};
readCharStatsFromDom=()=>m.chars||[];
window._solverComboMap={};window._solverComboId=m.idBase||0;
window._solverBucketId=m.bucketBase||0;window._solverBuckets={};
window._solverFallback=!!m.initialFallback;window._solverSolvable=null;
window._solverNeedsKillAll=null;
_solverSearchIncomplete=false;_solverRenderDepth=0;_solverGoldState=null;
}
self.addEventListener('message',(e)=>{
const m=e.data;
if(!m)return;
if(m.type==='solve'){
try{
setupSolverWorker(m);
const html=renderSolverResult(m.render.bat,m.render.monGroups,m.render.monId,
m.render.mapDeft,m.render.canRound2,!!m.forceKillAll,
m.prebuiltKmc||null,m.prebuiltKillAll||null,!!m.deferKillAll,false,!!m.incomplete,m.render.userDeft);
self.postMessage({type:'solveDone',solveId:m.solveId,html,
comboMap:window._solverComboMap,buckets:window._solverBuckets,
fallback:window._solverFallback||false,solvable:window._solverSolvable,
incomplete:_solverSearchIncomplete,
needsKillAll:window._solverNeedsKillAll||null});
}catch(err){
self.postMessage({type:'solveError',solveId:m.solveId,message:''+(err&&err.stack||err)});
}
return;
}
if(m.type==='solveKmcShard'||m.type==='solveKillAllShard'){
try{
setupSolverWorker(m);
const payload=m.type==='solveKmcShard'
?buildKmcShardPayload(m.spec,m.roots)
:buildKillAllShardPayload(m.spec,m.roots);
self.postMessage({type:m.type+'Done',solveId:m.solveId,payload});
}catch(err){
self.postMessage({type:m.type+'Error',solveId:m.solveId,
message:''+(err&&err.stack||err)});
}
return;
}
});
