let _dq9Pool=null;
let _dq9PoolFailed=false;
let _dq9PreflightDone=false;
let _dq9Gen=0;
let _dq9Active=null;
(function runWorkerPreflight(){
const end=ok=>{if(!ok)_dq9PoolFailed=true;_dq9PreflightDone=true;};
if(typeof Worker==='undefined'||typeof Blob==='undefined'||typeof URL.createObjectURL!=='function')return end(false);
try{
const blob=new Blob(['self.postMessage("ok")'],{type:'text/javascript'});
const url=URL.createObjectURL(blob);
const w=new Worker(url);
const stop=(ok,msg)=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);console[ok?'info':'warn']('[DQ9] Worker preflight '+msg);end(ok);};
const t=setTimeout(()=>stop(false,'timeout — disabling Workers'),2000);
w.onmessage=()=>stop(true,'OK');
w.onerror=()=>stop(false,'error — disabling Workers');
}catch(e){
console.debug('[DQ9] Worker preflight exception — disabling Workers',e);
end(false);
}
})();
const DQ9_CHUNK_SIZES={scan:1024,atMonster:2048,atPattern:2048};
const DQ9_CHUNK_MIN={scan:64,atMonster:128,atPattern:128};
const DQ9_CHUNKS_PER_WORKER=12;
function pickChunkSize(kind,totalUnits,workerCount){
const hi=DQ9_CHUNK_SIZES[kind]||1024;
const lo=Math.min(DQ9_CHUNK_MIN[kind]||64,hi);
const want=Math.ceil(totalUnits/Math.max(1,workerCount*DQ9_CHUNKS_PER_WORKER));
return Math.max(lo,Math.min(hi,want));
}
function getWorkerCount(){
try{
const q=new URLSearchParams(window.location.search).get('workers');
if(q){const n=parseInt(q);if(n>=1)return Math.min(n,256);}
}catch{}
if(typeof window.DQ9_WORKER_COUNT==='number'&&window.DQ9_WORKER_COUNT>=1)return Math.min(Math.floor(window.DQ9_WORKER_COUNT),256);
return Math.max(1,Math.min(navigator.hardwareConcurrency||4,256));
}
function getWorkerBlobURL(){return '5.js';}
function createPoolWorker(blobURL,wi){
const w=new Worker(blobURL);
w.onmessage=(e)=>handlePoolMessage(wi,e.data);
w.onerror=(e)=>handlePoolFatalError(wi,e);
return w;
}
function releasePoolWorker(wi){
const p=_dq9Pool;
if(p&&p.idle.indexOf(wi)===-1)p.idle.push(wi);
}
function getSearchWorkerPool(){
if(_dq9Pool)return _dq9Pool;
if(!_dq9PreflightDone||_dq9PoolFailed)return null;
try{
const blobURL=getWorkerBlobURL();
const count=getWorkerCount();
const workers=[];
for(let i=0;i<count;i++){
workers.push(createPoolWorker(blobURL,i));
}
_dq9Pool={workers,idle:workers.map((_,i)=>i)};
console.info('[DQ9] Search worker pool ready: '+count+' workers (override with ?workers=N)');
}catch(err){
console.warn('Web Worker 無法建立，搜尋將退回主執行緒執行。',err);
_dq9PoolFailed=true;
_dq9Pool=null;
}
return _dq9Pool;
}
function broadcastToPool(msg){
if(_dq9Pool)for(const w of _dq9Pool.workers)w.postMessage(msg);
}
function dispatchPoolJobs(){
const a=_dq9Active,p=_dq9Pool;
if(a&&p&&!a.finished){
while(a.queue.length>0&&p.idle.length>0){
const chunkId=a.queue.shift();
const wi=p.idle.pop();
a.inFlight.set(chunkId,0);
p.workers[wi].postMessage(Object.assign({type:'chunk',gen:a.gen},a.chunks[chunkId]));
}
}
dispatchSolveQueue();
}
function flushReadyResults(a){
while(a.nextFlush<a.chunks.length){
const items=a.slots[a.nextFlush];
if(items===undefined&&!a.finished)return;
a.slots[a.nextFlush]=undefined;
a.nextFlush++;
if(items&&items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}
}
function updatePoolProgress(a){
if(a.finished||!a.callbacks.onProgress)return;
let processed=a.unitsDone;
for(const entry of a.inFlight)processed+=a.chunks[entry[0]].units*entry[1];
a.callbacks.onProgress({processed,total:a.totalUnits,hits:a.hits,rStr:a.lastRStr,seedHex:a.lastSeedHex});
}
function finishPoolRun(a,result,errMsg){
if(a.finished)return;
a.finished=true;
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
flushReadyResults(a);
if(_dq9Active===a)_dq9Active=null;
if(errMsg==='_RETRY_MAIN_THREAD_'&&a._retryJob&&a._retryCallbacks){
console.info('[DQ9] Retrying search on main thread...');
runSearchJob(a._retryJob,a._retryCallbacks);
return;
}
if(errMsg!==undefined){if(a.callbacks.onError)a.callbacks.onError(errMsg);}
else{if(a.callbacks.onDone)a.callbacks.onDone(result);}
setTimeout(dispatchSolveQueue,0);
}
function handlePoolMessage(workerIdx,m){
if(!m)return;
if(/^solve/.test(m.type)){
handleSolveMessage(workerIdx,m);
return;
}
if(m.type==='chunkDone'||m.type==='error')releasePoolWorker(workerIdx);
const a=_dq9Active;
if(!a||m.gen!==a.gen||a.finished){dispatchPoolJobs();return;}
if(a._watchdog){clearTimeout(a._watchdog);a._watchdog=null;}
if(m.type==='tick'){
if(a.inFlight.has(m.chunkId))a.inFlight.set(m.chunkId,m.frac||0);
if(m.rStr!==undefined&&m.rStr!==null)a.lastRStr=m.rStr;
if(m.seedHex!==undefined&&m.seedHex!==null)a.lastSeedHex=m.seedHex;
updatePoolProgress(a);
return;
}
if(m.type==='chunkDone'){
a.inFlight.delete(m.chunkId);
if(m.aborted){a.queue.unshift(m.chunkId);dispatchPoolJobs();return;}
a.hits+=m.hits||0;
a.unitsDone+=a.chunks[m.chunkId].units;
a.doneCount++;
if(a.unordered){
const items=m.items||[];
if(items.length>0&&a.callbacks.onBatch)a.callbacks.onBatch(items);
}else{
a.slots[m.chunkId]=m.items||[];
flushReadyResults(a);
}
updatePoolProgress(a);
if(a.doneCount===a.chunks.length){finishPoolRun(a,{hits:a.hits,cancelled:false});}
else{dispatchPoolJobs();}
return;
}
if(m.type==='error'){
console.error('Worker chunk error:',m.message);
broadcastToPool({type:'cancel'});
finishPoolRun(a,null,m.message);
return;
}
}
function startPoolWatchdog(a){
a._watchdog=setTimeout(()=>{
if(a.doneCount===0&&!a.finished){
console.warn('[DQ9] Workers unresponsive — falling back to main thread');
abortAllSolveTasks('Workers unresponsive');
for(const w of _dq9Pool.workers)w.terminate();
_dq9Pool=null;
_dq9PoolFailed=true;
finishPoolRun(a,null,'_RETRY_MAIN_THREAD_');
}
},3000);
}
function handlePoolFatalError(workerIdx,e){
const msg=(e&&e.message)||'Worker error';
console.error('Search worker fatal error:',e&&(e.message||e));
if(_siSolveBusy.has(workerIdx)){
const t=_siSolveBusy.get(workerIdx);
_siSolveBusy.delete(workerIdx);
t.reject(new Error(msg));
replaceSolveWorker(workerIdx);
}
const a=_dq9Active;
if(a&&!a.finished){
broadcastToPool({type:'cancel'});
finishPoolRun(a,null,msg);
}
}
function requestSearchCancel(){
searchCancel=true;
const a=_dq9Active;
if(a&&!a.finished){
broadcastToPool({type:'cancel'});
finishPoolRun(a,{hits:a.hits,cancelled:true});
}
}
function runSearchJob(job,callbacks){
if(job.kind==='scan'&&callbacks.unordered&&!job.tagOrder)job=Object.assign({},job,{tagOrder:true});
const pool=getSearchWorkerPool();
if(pool){
requeueBusySolveTasks();
const gen=++_dq9Gen;
const seedSpan=job.endSeed-job.startSeed+1;
const rankCount=(job.kind==='scan'&&job.ranks)?job.ranks.length:1;
const chunkSize=pickChunkSize(job.kind,seedSpan*rankCount,pool.workers.length);
const chunks=[];
const seedMajor=job.kind==='scan'&&(!!callbacks.unordered||!!job.bySeed)&&rankCount>1;
if(seedMajor){
const seedsPerChunk=Math.max(1,Math.ceil(chunkSize/rankCount));
for(let s=job.startSeed;s<=job.endSeed;s+=seedsPerChunk){
const e=Math.min(s+seedsPerChunk-1,job.endSeed);
chunks.push({chunkId:chunks.length,ranks:job.ranks,startSeed:s,endSeed:e,units:(e-s+1)*rankCount});
}
}else{
const span=extra=>{
for(let s=job.startSeed;s<=job.endSeed;s+=chunkSize){
const e=Math.min(s+chunkSize-1,job.endSeed);
chunks.push({chunkId:chunks.length,...extra,startSeed:s,endSeed:e,units:e-s+1});
}
};
if(job.kind==='scan')for(const rank of job.ranks)span({rank});
else span();
}
if(chunks.length===0){
if(callbacks.onDone)callbacks.onDone({hits:0,cancelled:false});
return;
}
let totalUnits=0;
for(const c of chunks)totalUnits+=c.units;
_dq9Active={
gen,callbacks,chunks,totalUnits,
unitsDone:0,hits:0,doneCount:0,
unordered:!!callbacks.unordered,
queue:chunks.map(c=>c.chunkId),
slots:new Array(chunks.length),
nextFlush:0,inFlight:new Map(),
lastRStr:(job.kind==='scan'&&chunks[0].rank!==undefined)?hex2(chunks[0].rank):'',
lastSeedHex:hex4(job.startSeed),
finished:false,
_retryJob:job,_retryCallbacks:callbacks,
};
broadcastToPool({type:'job',gen,job});
dispatchPoolJobs();
startPoolWatchdog(_dq9Active);
return;
}
(async()=>{
const io={
cancelled:()=>searchCancel,
progress:(data)=>{if(callbacks.onProgress)callbacks.onProgress(data);},
batch:(items)=>{if(callbacks.onBatch)callbacks.onBatch(items);},
yield:()=>new Promise(r=>setTimeout(r,0)),
};
try{
const hits=await getCoreSearchRunner(job.kind)(job,io);
if(callbacks.onDone)callbacks.onDone({hits,cancelled:searchCancel});
}catch(err){
console.error(err);
if(callbacks.onError)callbacks.onError(''+(err&&err.message||err));
}
})();
}
let _siSolveGen=0,_siInspectorGen=0,_siInspectorSignature=null;
let _siSolveSeq=0;
const _siSolveQueue=[];
const _siSolveBusy=new Map();
function takeIdlePoolWorker(){
const p=_dq9Pool;
if(!p||p.idle.length===0)return-1;
const a=_dq9Active;
if(a&&!a.finished&&a.queue.length>0)return-1;
return p.idle.pop();
}
function dispatchSolveQueue(){
while(_siSolveQueue.length>0){
const wi=takeIdlePoolWorker();
if(wi<0)return;
const t=_siSolveQueue.shift();
_siSolveBusy.set(wi,t);
_dq9Pool.workers[wi].postMessage(t.msg);
}
}
function handleSolveMessage(workerIdx,m){
const t=_siSolveBusy.get(workerIdx);
if(!t||m.solveId!==t.solveId)return;
_siSolveBusy.delete(workerIdx);
const p=_dq9Pool;
if(p&&p.idle.indexOf(workerIdx)===-1)p.idle.push(workerIdx);
dispatchPoolJobs();
if(m.type==='solveDone'||m.type==='solveKmcShardDone'||
m.type==='solveKillAllShardDone')t.resolve(m);
else t.reject(new Error(m.message||'Solver Worker error'));
}
function queueSolverWorkerMessage(msg,front,owner){
const solveId=++_siSolveSeq;
return new Promise((resolve,reject)=>{
const task={solveId,resolve,reject,owner,msg:Object.assign({},msg,{solveId})};
if(front)_siSolveQueue.unshift(task);else _siSolveQueue.push(task);
dispatchSolveQueue();
});
}
function partitionSolverRoots(spec,workerCount){
const src=spec.sSkills||spec.variants||[];
const roots=[];
for(let i=0;i<src.length;i++){
if(src[i]&&src[i].at>0&&spec.spaces.some(sp=>
(!sp.depths||sp.depths.length>0)&&src[i].at<=sp.target))roots.push(i);
}
if(workerCount<2)return null;
if(roots.length===0)return[];
if(roots.length<2)return null;
return roots.map(root=>[root]);
}
function solverShardCapsFilled(spec,counts){
if(spec.sSkills)return spec.spaces.every(sp=>counts.get(sp.key).total>=sp.cap);
return spec.spaces.every(sp=>sp.depths.every(depth=>(counts.get(sp.key).depths.get(depth)||0)>=sp.cap));
}
async function runParallelSolverShards(type,spec,common,pool,operation){
const groups=partitionSolverRoots(spec,pool.workers.length);
if(groups===null)return null;
if(groups.length===0)return mergeSolverShardPayloads(spec,[]);
window._solverLastParallelDispatch={type,workers:pool.workers.length,shards:0,roots:0,totalRoots:groups.length};
const payloads=[],waveWidth=Math.max(2,pool.workers.length*2);
const counts=new Map(spec.spaces.map(sp=>[sp.key,{kept:new Map(),total:0,depths:new Map()}]));
for(let start=0;start<groups.length;start+=waveWidth){
const wave=groups.slice(start,start+waveWidth);
const settled=await Promise.all(wave.map(roots=>
queueSolverWorkerMessage(Object.assign({},common,{type,spec,roots}),false,operation).then(value=>({value}),error=>({error}))));
if(operation.cancelled||operation.gen!==_siSolveGen)throw operation.error||makeSolverCancellationError('Solver generation changed');
const failed=settled.find(x=>x.error);
if(failed)throw failed.error;
for(const item of settled){
const payload=item.value.payload;
payloads.push(payload);
for(const space of spec.spaces){
const rows=payload&&payload.buckets&&payload.buckets[space.key];
if(!rows)continue;
const count=counts.get(space.key);
for(const row of rows){
const depth=space.depths?row.depth:null;
if(space.depths&&!space.depths.includes(depth))continue;
let kept=count.kept.get(depth)||0;
const combos=row.combos||[];
if(spec.sSkills){
const added=Math.min(combos.length,Math.max(0,Math.ceil(space.cap-kept)));
kept+=added;count.total+=added;
}else{
for(let i=0;i<combos.length&&kept<space.cap;i++){
const length=combos[i].length;
count.depths.set(length,(count.depths.get(length)||0)+1);
kept++;count.total++;
}
}
count.kept.set(depth,kept);
}
}
}
window._solverLastParallelDispatch.shards+=wave.length;
window._solverLastParallelDispatch.roots+=wave.reduce((s,g)=>s+g.length,0);
if(solverShardCapsFilled(spec,counts))break;
}
return mergeSolverShardPayloads(spec,payloads);
}
function queueSolveTask(render,options,idBase,bucketBase,owner){
const cacheKey=solverResultCacheKey(render,options);
const cached=getCachedSolverResult(cacheKey,idBase,bucketBase);
if(cached)return Promise.resolve(cached);
if(solverBatUnreachable(render))return Promise.resolve(rebaseSolverCachedResult(setCachedSolverResult(cacheKey,solverBatUnreachableResult(),idBase,bucketBase),idBase,bucketBase));
const oldPending=_solverResultPending.get(cacheKey);
if(oldPending&&!oldPending.cancelled&&oldPending.gen===_siSolveGen){
if(owner!=='probe')oldPending.owner='view';
window._solverResultCacheStats.pendingHits++;
return oldPending.promise.then(entry=>rebaseSolverCachedResult(entry,idBase,bucketBase));
}
if(oldPending)_solverResultPending.delete(cacheKey);
const pool=getSearchWorkerPool();
if(!pool)return Promise.reject(new Error('Worker pool unavailable'));
window._solverResultCacheStats.misses++;
const operation={gen:_siSolveGen,owner:owner==='probe'?'probe':'view',cancelled:false,stages:options.blockStages||new Map(),promise:null};
_solverResultPending.set(cacheKey,operation);
const common={lang:DISPLAY_LANG,dom:{si_useStats:!!options.useStats,si_multiPlayer:!!options.multiPlayer,si_blockFallback:!!options.blockFallback},chars:options.chars};
let searchIncomplete=false;
const ensureCurrent=()=>{
if(operation.cancelled||operation.gen!==_siSolveGen||_solverResultPending.get(cacheKey)!==operation)
throw operation.error||makeSolverCancellationError('Solver generation changed');
};
const finalRender=async(extra)=>{
ensureCurrent();
const result=await queueSolverWorkerMessage(Object.assign({},common,{
type:'solve',render,idBase,bucketBase,incomplete:searchIncomplete
},extra||{}),true,operation);
ensureCurrent();
(searchIncomplete||(searchIncomplete=!!result.incomplete));
return result;
};
const buildStage=async(kind,stage)=>{
ensureCurrent();
const key=kind+':'+(stage||'');
if(!operation.stages.has(key)){
const spec=prepareParallelSolverSpec(render,options,kind,stage);
operation.stages.set(key,spec?runParallelSolverShards(kind==='kmc'?'solveKmcShard':'solveKillAllShard',spec,common,pool,operation):Promise.resolve(null));
}
const result=await operation.stages.get(key);
ensureCurrent();
return result;
};
const execute=async()=>{
ensureCurrent();
if(!operation.stages.has('plan'))operation.stages.set('plan',prepareParallelSolverSpec(render,options,'plan'));
const planInfo=operation.stages.get('plan');
const planType=planInfo&&planInfo.plan?planInfo.plan.planType:'kill_all';
const isFallbackPath=planType!=='kill_all';
let result,killAllR1=null;
if(planType==='kill_all'){
killAllR1=await buildStage('killAll','r1');
if(!killAllR1)return finalRender();
result=await finalRender({prebuiltKillAll:killAllR1,deferKillAll:true});
}else{
const prebuiltKmc=planType==='kill_mercy_clear'?await buildStage('kmc'):null;
result=await finalRender({prebuiltKmc,deferKillAll:true});
}
if(result.needsKillAll==='r1'){
killAllR1=await buildStage('killAll','r1');
if(!killAllR1){
result=await finalRender({forceKillAll:true,initialFallback:true});
result.fallback=true;return result;
}
result=await finalRender({forceKillAll:true,initialFallback:true,prebuiltKillAll:killAllR1,deferKillAll:true});
}
if(result.needsKillAll==='r2'){
const r2=await buildStage('killAll','r2');
if(!r2)result=await finalRender({forceKillAll:true,initialFallback:isFallbackPath,prebuiltKillAll:null});
else{
const all=Object.assign({},killAllR1||{},r2,{r1:[],incomplete:!!((killAllR1==null?void 0:killAllR1.incomplete)||r2.incomplete)});
result=await finalRender({forceKillAll:true,initialFallback:isFallbackPath,prebuiltKillAll:all,deferKillAll:false});
}
}
return result;
};
operation.promise=execute().then(result=>{
ensureCurrent();
if(!options.blockFallback&&result&&result.solvable===false&&!result.incomplete&&solverFieldBlock(render.monGroups.filter(g=>g.count>0).map(g=>g.hex))>0){
result.needsBlockFallback=true;
result.blockStages=operation.stages;
}
return setCachedSolverResult(cacheKey,result,idBase,bucketBase);
}).finally(()=>{
if(_solverResultPending.get(cacheKey)===operation)_solverResultPending.delete(cacheKey);
});
return operation.promise.then(entry=>rebaseSolverCachedResult(entry,idBase,bucketBase));
}
function replaceSolveWorker(wi){
const p=_dq9Pool;
if(!p)return;
try{p.workers[wi].onmessage=null;p.workers[wi].onerror=null;p.workers[wi].terminate();}catch(e){}
const w=createPoolWorker(getWorkerBlobURL(),wi);
p.workers[wi]=w;
const a=_dq9Active;
if(a&&!a.finished&&a._retryJob)w.postMessage({type:'job',gen:a.gen,job:a._retryJob});
if(p.idle.indexOf(wi)===-1)p.idle.push(wi);
}
const SOLVER_CANCELLED='SOLVER_CANCELLED';
function makeSolverCancellationError(reason){
const err=new Error(reason||'Solver cancelled');
err.code=SOLVER_CANCELLED;
return err;
}
function cancelAllSolveTasks(reason,keepKeys,owner){
_siSolveGen++;_siInspectorGen++;
const err=makeSolverCancellationError(reason),keys=new Set(keepKeys||[]),retained=new Set();
for(const[key,operation]of _solverResultPending){
if(keys.has(key)&&!operation.cancelled){operation.gen=_siSolveGen;operation.owner=owner==='probe'?'probe':'view';retained.add(operation);}
else{operation.cancelled=true;operation.error=err;_solverResultPending.delete(key);}
}
_fleePending.clear();
let kept=0;
for(const task of _siSolveQueue){
if(retained.has(task.owner))_siSolveQueue[kept++]=task;
else task.reject(err);
}
_siSolveQueue.length=kept;
for(const[wi,task]of _siSolveBusy){
if(retained.has(task.owner))continue;
_siSolveBusy.delete(wi);task.reject(err);replaceSolveWorker(wi);
}
dispatchPoolJobs();
}
function abortAllSolveTasks(reason){
_solverResultPending.clear();
const err=new Error(reason||'Worker pool lost');
for(const t of _siSolveQueue)t.reject(err);
_siSolveQueue.length=0;
for(const t of _siSolveBusy.values())t.reject(err);
_siSolveBusy.clear();
}
function requeueBusySolveTasks(){
if(_siSolveBusy.size===0)return;
for(const[wi,t]of _siSolveBusy){_siSolveQueue.unshift(t);replaceSolveWorker(wi);}
_siSolveBusy.clear();
}
(function(){
if(typeof document==='undefined'||!document.createElement||!document.body||
!document.body.appendChild||!document.body.removeChild||
!document.body.querySelectorAll||typeof MutationObserver!=='function')return;
function supportsFlexGap(){
var probe=document.createElement('div');
probe.style.cssText='position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px';
probe.innerHTML='<i style="height:1px"></i><i style="height:1px"></i>';
document.body.appendChild(probe);
var supported=probe.scrollHeight===3;
document.body.removeChild(probe);
return supported;
}
function start(){
if(supportsFlexGap())return;
var selector='.header,.checkbox-field,.cb-pair,.chest-count-row,.si-grid,.si-field,'+
'#solverPanel .sv-row,#solverPanel .sv-hdr,#marathonModal .mrt-topbar,'+
'#marathonModal .mrt-tbg,.chest-count-row>label,[style*="gap:"]';
var states=new WeakMap(),bases=new WeakMap(),applied=new WeakMap(),ownedStyle=new WeakMap();
function base(child){
var saved=bases.get(child);
if(!saved){
var css=getComputedStyle(child);
saved=[css.marginTop,css.marginRight,css.marginBottom,css.marginLeft];
saved.paddingTop=css.paddingTop;
saved.paddingLeft=css.paddingLeft;
bases.set(child,saved);
}
return saved;
}
function setStyle(el,key,value){
var changes=applied.get(el);
if(!changes){changes={};applied.set(el,changes);}
var prior=changes[key];
if(prior&&prior[0]===value&&el.style[key]===prior[1])return;
if(el.style[key]!==value){
el.style[key]=value;
ownedStyle.set(el,el.getAttribute('style'));
}
changes[key]=[value,el.style[key]];
}
function setMargin(child,values){
['marginTop','marginRight','marginBottom','marginLeft'].forEach(function(key,i){
setStyle(child,key,values[i]);
});
}
function add(value,gap){return gap?'calc('+value+' + '+gap+'px)':value;}
function update(el){
var state=states.get(el),css=getComputedStyle(el);
if(css.display!=='flex'&&css.display!=='inline-flex')return;
var row=parseFloat(css.rowGap)||0,col=parseFloat(css.columnGap)||0;
if(!row&&!col)return;
if(css.flexWrap!=='nowrap'){
if(!state){
state={paddingTop:css.paddingTop,paddingLeft:css.paddingLeft,
marginTop:css.marginTop,marginLeft:css.marginLeft,width:el.style.width};
states.set(el,state);
}
if(parseFloat(state.paddingLeft)>=col)setStyle(el,'paddingLeft',
'calc('+state.paddingLeft+' - '+col+'px)');
else{
setStyle(el,'marginLeft','calc('+state.marginLeft+' - '+col+'px)');
if(state.width==='100%')setStyle(el,'width','calc(100% + '+col+'px)');
}
if(parseFloat(state.paddingTop)>=row)setStyle(el,'paddingTop',
'calc('+state.paddingTop+' - '+row+'px)');
else setStyle(el,'marginTop','calc('+state.marginTop+' - '+row+'px)');
Array.prototype.forEach.call(el.children,function(child){
var margins=base(child);
setMargin(child,[margins[0]==='auto'?'auto':add(margins[0],row),
margins[1],margins[2],margins[3]==='auto'?'auto':add(margins[3],col)]);
if(margins[0]==='auto'&&row)setStyle(child,'paddingTop',add(margins.paddingTop,row));
if(margins[3]==='auto'&&col)setStyle(child,'paddingLeft',add(margins.paddingLeft,col));
});
}else{
var previous=false,vertical=css.flexDirection.indexOf('column')===0;
Array.prototype.forEach.call(el.childNodes,function(child){
if(child.nodeType===3){if(child.textContent.trim())previous=true;return;}
if(child.nodeType!==1)return;
var margins=base(child),visible=getComputedStyle(child).display!=='none';
setMargin(child,[add(margins[0],vertical&&previous&&visible?row:0),
margins[1],margins[2],add(margins[3],!vertical&&previous&&visible?col:0)]);
if(visible)previous=true;
});
}
}
function scan(root){
if(root.nodeType!==1)return;
if(root.matches(selector))update(root);
Array.prototype.forEach.call(root.querySelectorAll(selector),update);
}
scan(document.body);
var scheduled=false;
function rescan(){
if(scheduled)return;
scheduled=true;
setTimeout(function(){scheduled=false;scan(document.body);},0);
}
new MutationObserver(function(records){
for(var i=0;i<records.length;i++){
var record=records[i],target=record.target;
if(record.type==='attributes'&&target.matches(selector)){
if(record.attributeName==='style'&&ownedStyle.get(target)===target.getAttribute('style'))continue;
rescan();return;
}
if(record.type!=='childList')continue;
if(states.has(target)){rescan();return;}
for(var j=0;j<record.addedNodes.length;j++){
var node=record.addedNodes[j];
if(node.nodeType===1&&(node.matches(selector)||node.querySelector(selector))){rescan();return;}
}
}
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
window.addEventListener('resize',rescan);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
})();
const uiVal=(id)=>byId(id).value;
function refreshI18n(){
document.querySelectorAll('[data-i18n]').forEach(el=>{
const key=el.getAttribute('data-i18n');
let text=i18nDict[key];
if(text){
if(el.tagName==='OPTION'&&b3fThreeItems.includes(el.value)){text=String(text)+String(' (3)');}
el.textContent=text;
}
});
for(const[id,label]of Object.entries(OG)){const el=byId(id);if(el)el.label=label;}
const sl=byId('at_lblSteps');if(sl)sl.textContent=H05;
if(typeof updateFSItems==='function'){for(let i=1;i<=3;i++)updateFSItems(i);}
['at_pattern','si_pattern'].forEach(sid=>{
const sel=byId(sid);
if(sel){
const cv=sel.value;
sel.querySelectorAll('option').forEach((o,idx)=>{if(idx>0&&AT_O[idx-1])o.textContent=AT_O[idx-1][1];});
sel.value=cv;
}
});
['at_env','si_env'].forEach(sid=>{
const sel=byId(sid);
if(sel)sel.querySelectorAll('option').forEach((o,i)=>{if(ENV_OPTS[i])o.textContent=ENV_OPTS[i];});
});
for(let b=1;b<=4;b++){const sel=byId('si_job'+b);if(sel)sel.querySelectorAll('option').forEach(o=>{const v=parseInt(o.value);if(!isNaN(v)&&VOC_STATS[v])o.textContent=DISPLAY_LANG==='EN'?VOC_STATS[v].en:VOC_STATS[v].jp;});}
initSolverStatInputs();
}
function switchUILang(lang){
if(!['TW','EN','JP'].includes(lang))return;
setDisplayLang(lang);
refreshI18n();
document.querySelectorAll('.lang-sw').forEach(b=>{
if(b.dataset.lang===lang){b.style.background='#00A2E8';b.style.color='#fff';b.style.borderColor='#00A2E8';}
else{b.style.background='#224';b.style.color='#888';b.style.borderColor='#444';}
});
const mm=byId('marathonModal');
if(mm){mrtLang=lang==='EN'?'en':'jp';const bl=byId('mrt_btnLang');if(bl)bl.textContent=mrtLang.toUpperCase();if(mm.classList.contains('open')){mrtBuildTable();mrtRenderRows();}}
if(mapData&&mapData.floorCount>0){
const cc=byId('controls_container');
const sc=byId('single_map_controls');
if(cc&&sc)cc.appendChild(sc);
renderResult();
}
}
function seedCapForConds(conds){
return 0x7FFF;
}
function readSearchFilterLoc(){return true;}
function readSearchRank(){const rank=parseInt(uiVal('rank')),rStr=hex2(rank);return{rank,rStr,targetRankKey:resolveRankKey(rStr)};}
const readRanksToSearch=()=>byId('searchAllRanks').checked?MAP_RANK:[parseInt(uiVal('rank'))];
const hasUltimateConds=conds=>conds.hasBoxCond||Object.keys(conds).some(k=>k!=='reqBox'&&k!=='hasBoxCond'&&conds[k]!=="");
function getValidatedSeedRange(){
let minStr=byId('cond_seed_min')?uiVal('cond_seed_min').trim():"";
let maxStr=byId('cond_seed_max')?uiVal('cond_seed_max').trim():"";
let customMin=minStr?parseInt(minStr,16):0;
let customMax=maxStr?parseInt(maxStr,16):0x7FFF;
if(isNaN(customMin)||customMin<0)customMin=0;
if(isNaN(customMax)||customMax>0x7FFF)customMax=0x7FFF;
if(customMin>customMax){const t=customMin;customMin=customMax;customMax=t;byId('cond_seed_min').value=hex4(customMin);byId('cond_seed_max').value=hex4(customMax);}
const searchFilterLoc=readSearchFilterLoc();
const startSeed=customMin;
const endSeed=searchFilterLoc?Math.min(customMax,LOCATION_SEED_MAX):customMax;
if(startSeed>endSeed){alert(A08);return null;}
return{startSeed,endSeed,searchFilterLoc};
}
function validateHex(id,minVal,maxVal,padLen,errMsg){
const el=byId(id);
if(!el||!el.value)return;
const v=el.value.trim().toUpperCase();
if(!v.length||/[^0-9A-F]/.test(v)){alert(errMsg);el.value='';return;}
const n=parseInt(v,16);
if(isNaN(n)||n<minVal||n>maxVal){alert(errMsg);el.value='';return;}
if(padLen)el.value=v.padStart(padLen,'0');
}
const COND_FIELDS={
prefix:'cond_prefix',suffix:'cond_suffix',locale:'cond_locale',
lv:'cond_lv',location:'cond_location',bq:'cond_bq',bqCount:'cond_bq_count',
env:'cond_env',monster:'cond_monster',depth:'cond_depth',boss:'cond_boss',
seedMin:'cond_seed_min',seedMax:'cond_seed_max',elist:'cond_elist',
onlyMon:'cond_only_mon',anomaly:'cond_anomaly'
};
const BOX_RANK_CHARS=Array.from({length:10},(_,i)=>CHEST_RANK[i+1]);
const USP_FAST_MODES={
'usp_map':{i18n:'TKB4_1',mode:'map'},
'usp_map_d':{i18n:'TKB4_2',mode:'map',showFloors:true},
'usp_floor':{i18n:'TKB4_3',mode:'floor'},
'usp_floor_d':{i18n:'TKB4_4',mode:'floor',showFloors:true},
'usp_slow':{i18n:'TKB4_5',mode:'map',slowest:true},
'usp_slow_d':{i18n:'TKB4_6',mode:'map',slowest:true,showFloors:true},
'usp_maxtile':{i18n:'TKB4_7',mode:'maxtile',metric:'maxtile'},
'usp_mintile':{i18n:'TKB4_8',mode:'maxtile',metric:'mintile'},
'usp_maxwalk':{i18n:'TKB4_9',mode:'maxtile',metric:'maxwalk'},
'usp_maxiso':{i18n:'TKB4_10',mode:'maxtile',metric:'maxiso'},
'usp_maxghost':{i18n:'TKB4_11',mode:'maxtile',metric:'maxghost'}
};
function getUltimateConds(){
const getV=(id)=>{const el=byId(id);return el?el.value.trim():"";};
const reqBox={};
BOX_RANK_CHARS.forEach((ch,i)=>{reqBox[i+1]=parseInt(getV('cond_box_'+ch))||0;});
const conds={};
for(const[key,id]of Object.entries(COND_FIELDS))conds[key]=getV(id);
conds.reqBox=reqBox;
conds.hasBoxCond=Object.values(reqBox).some(v=>v>0);
return conds;
}
let isSearching=false;
let searchCancel=false;
function initSearchResultArea(headerHtml,progressText){
byId('searchResults').innerHTML=`<div style="color:#aaa;font-size:13px;margin-bottom:8px;">${headerHtml||''}${B01} <span id="searchProgress" style="color:#fff;font-weight:bold">${progressText||'0%'}</span></div><div id="searchGrid" class="search-grid"></div>`;
return{grid:byId('searchGrid'),progressSpan:byId('searchProgress')};
}
function setStopButton(btn,stopText){
const text=btn.textContent,bg=btn.style.background,color=btn.style.color;
btn.textContent=stopText;btn.style.background='#f44';btn.style.color='#fff';
return()=>{btn.textContent=text;btn.style.background=bg;btn.style.color=color;};
}
function showConditionConflictResult(){
if(!byId('searchResults'))return;
initSearchResultArea('','100% ('+B07+')');
}
function makeResultClickHandler(seed,rStr,jumpFloor){
return()=>{
const seedHex=hex4(seed);
byId('seed').value=seedHex;
if(rStr)byId('rank').value="0x"+rStr;
calculate();
const siSeed=byId('si_seed');
if(siSeed)siSeed.value=seedHex;
const mR=byId('mrt_inRank');
const mS=byId('mrt_inSeed');
if(mR&&rStr)mR.value=rStr;
if(mS)mS.value=seedHex;
const resultEl=byId('result');
try{resultEl.scrollIntoView({behavior:'smooth'});}
catch(err){resultEl.scrollIntoView(true);}
if(jumpFloor!==undefined&&jumpFloor!==null&&jumpFloor!==-1){
setTimeout(()=>{
const tab=document.querySelectorAll('.floor-tab')[jumpFloor];
if(tab)tab.click();
},50);
}
};
}
function searchDoneMsg(hitCount){
return searchCancel?`${B05} (${B04}${hitCount} ${B03})`:`100% (${(''+B06)?B06+' ':''}${hitCount} ${B03})`;
}
function restoreSearchUI(restoreBtn){
isSearching=false;
restoreBtn();
}
function handleSearchError(errorLabel,msg,restoreBtn,progressSpan,hitCount){
console.error(errorLabel,msg);
alert(A02);
searchCancel=true;
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
}
function materializeResultItem(item){
const node=document.createElement('div');
node.className='search-result-item';
if(item.hasD)node.dataset.hasD="true";
if(item.specialStyle)node.style.border=item.specialStyle;
if(item.title)node.title=item.title;
node.innerHTML=item.html;
node.onclick=makeResultClickHandler(item.seed,item.rStr,item.jumpFloor);
return node;
}
function newSeedCard(seed){
const node=document.createElement('div');
node.className='search-result-item srs';
node.dataset.seed=seed;
node.onclick=seedCardClick;
node.innerHTML=`<div class="srs-seed">${hex4(seed)}</div><div class="srs-lines"></div><div class="srs-ranks"></div>`;
return{seed,node,lines:node.children[1],ranks:node.children[2],fc:0};
}
function addSeedCardRank(card,it){
if(it.fc>card.fc){
card.fc=it.fc;
card.lines.innerHTML=it.ghost.map(([f,at])=>ghostLineHtml(f,at)).join('');
}
const b=document.createElement('button');
b.textContent=it.rStr;
b.title=`${it.name} (B1F~B${it.fc}F)`;
b.dataset.fc=it.fc;b.dataset.jf=it.jumpFloor;
if(it.hasD)b.dataset.hasD="true";
if(!it.box&&!it.sp.length){card.ranks.appendChild(b);return;}
const row=document.createElement('div');
row.className='srs-rr';
row.appendChild(b);
row.insertAdjacentHTML('beforeend',[it.box,...it.sp.map(specialTagHtml)].filter(Boolean).join('<br>'));
card.ranks.appendChild(row);
}
function seedCardClick(e){
const b=e.target.closest('.srs-ranks button');
if(b)makeResultClickHandler(+this.dataset.seed,b.textContent,+b.dataset.jf)();
}
function isBetterMetricResult(cand,cur){
if(cand.fc!==cur.fc)return cand.fc>cur.fc;
const cD=(cand.rStr==='DD'),uD=(cur.rStr==='DD');
if(cD!==uD)return cD;
return cand.sortCost<cur.sortCost;
}
function executeSharedSearch(config){
if(isSearching){requestSearchCancel();return;}
const conds=config.conds||getUltimateConds();
if(config.condsTransform)config.condsTransform(conds);
const searchFilterLoc=config.searchFilterLoc!==undefined?config.searchFilterLoc:readSearchFilterLoc();
if(!getLocationBQFilters(conds).valid){
showConditionConflictResult();
return;
}
if(config.validateConds&&!config.validateConds(conds,searchFilterLoc)){return;}
const rangeData=getValidatedSeedRange();
if(!rangeData)return;
let{startSeed,endSeed}=rangeData;
endSeed=Math.min(endSeed,seedCapForConds(conds));
isSearching=true;searchCancel=false;
const btn=byId(config.btnId);
const restoreStyle=btn?setStopButton(btn,config.stopText||'🛑 STOP'):null;
const restoreBtn=()=>{if(btn){restoreStyle();btn.textContent=config.btnText;}};
let ranksToSearch=readRanksToSearch();
if(config.filterRanks){ranksToSearch=config.filterRanks(ranksToSearch,conds);}
const{grid,progressSpan}=initSearchResultArea();
if(ranksToSearch.length===0){
progressSpan.textContent="100% ("+(config.emptyRankMsg||B08)+")";
isSearching=false;
restoreBtn();
return;
}
let hitCount=0;
let renderedCount=0;
const bySeed=!!config.bySeed;
let seedCard=null,seedCount=0;
const sortTopN=config.sortTopN;
const sortDesc=!!config.sortDesc;
const dedupBySeed=!!config.dedupBySeed;
const dedupMap=dedupBySeed?new Map():null;
const dedupBetter=config.dedupBetter||isBetterMetricResult;
const dedupKeyFn=config.dedupKeyFn||(it=>it.seed);
const sortBucket=(sortTopN!==undefined&&!dedupBySeed)?[]:null;
const costCmp=(a,b)=>sortDesc?(b.sortCost-a.sortCost):(a.sortCost-b.sortCost);
const ordCmp=(a,b)=>(a._ord||0)-(b._ord||0);
const sortCmp=(a,b)=>costCmp(a,b)||ordCmp(a,b);
const dedupFirst=dedupBySeed?new Map():null;
const pruneCap=(sortTopN!==undefined&&sortTopN!==Infinity)?Math.max(sortTopN*4,200):Infinity;
const jobParams=Object.assign({},config.params||{});
if(config.metricEdgeFromEndSeed)jobParams.metricEdgeSeed=endSeed;
const job={
kind:'scan',
processor:config.processor,
params:jobParams,
conds,searchFilterLoc,
ranks:ranksToSearch,
startSeed,endSeed,
lang:DISPLAY_LANG,
bySeed,
};
runSearchJob(job,{
unordered:(sortBucket!==null)||dedupBySeed,
onProgress:(p)=>{
hitCount=p.hits;
progressSpan.textContent=Math.floor((p.processed/p.total)*100)+'% ('+(p.rStr?B02+' '+p.rStr+', ':'')+'Seed '+p.seedHex+') ['+B04+''+p.hits+' '+B03+']';
},
onBatch:(items)=>{
if(dedupMap){
for(const it of items){
const key=dedupKeyFn(it);
const cur=dedupMap.get(key);
if(!cur||dedupBetter(it,cur)||(!dedupBetter(cur,it)&&ordCmp(it,cur)<0))dedupMap.set(key,it);
if(it._ord!==undefined){
const first=dedupFirst.get(key);
if(first===undefined||it._ord<first)dedupFirst.set(key,it._ord);
}
}
return;
}
if(sortBucket){
for(const it of items)sortBucket.push(it);
if(sortBucket.length>pruneCap){sortBucket.sort(sortCmp);sortBucket.length=sortTopN;}
return;
}
if(bySeed){
const fragment=document.createDocumentFragment();
for(const it of items){
if(!seedCard||seedCard.seed!==it.seed){seedCard=newSeedCard(it.seed);fragment.appendChild(seedCard.node);seedCount++;}
addSeedCardRank(seedCard,it);
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
return;
}
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)return;
const fragment=document.createDocumentFragment();
for(const it of items){
if(config.renderCap!==undefined&&renderedCount>=config.renderCap)break;
fragment.appendChild(materializeResultItem(it));
renderedCount++;
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
},
onDone:(d)=>{
hitCount=d.hits;
restoreSearchUI(restoreBtn);
if(dedupMap){
const entries=[...dedupMap.entries()];
if(dedupFirst.size>0)entries.sort((a,b)=>dedupFirst.get(a[0])-dedupFirst.get(b[0]));
const arr=entries.map(e=>e[1]);
if(config.renderFinal){
config.renderFinal(arr,costCmp,grid);
}else{
arr.sort(costCmp);
const shown=(sortTopN!==undefined&&sortTopN!==Infinity)?arr.slice(0,sortTopN):arr;
const fragment=document.createDocumentFragment();
addItems(fragment,shown);
if(fragment.childNodes.length>0)grid.appendChild(fragment);
}
let doneTxt=searchDoneMsg(hitCount);
if(arr.length!==hitCount)doneTxt+=' · '+arr.length;
progressSpan.textContent=doneTxt;
}else if(sortBucket){
sortBucket.sort(ordCmp);
const arrS=config.preSort?config.preSort(sortBucket):sortBucket;
arrS.sort(sortCmp);
let shown=arrS.slice(0,sortTopN);
let tail=null;
if(config.groupTail){
tail=shown.filter(config.groupTail.match);
if(tail.length>0)shown=shown.filter(it=>!config.groupTail.match(it));
else tail=null;
}
const fragment=document.createDocumentFragment();
addItems(fragment,shown);
if(tail){
fragment.appendChild(mkHdr(config.groupTail.label));
addItems(fragment,tail);
}
if(fragment.childNodes.length>0)grid.appendChild(fragment);
const shownCount=shown.length+(tail?tail.length:0);
let doneTxt=searchDoneMsg(hitCount);
if(shownCount!==hitCount)doneTxt+=' · '+shownCount;
progressSpan.textContent=doneTxt;
}else{
progressSpan.textContent=searchDoneMsg(hitCount)+(bySeed&&seedCount!==hitCount?' · '+seedCount:'');
}
if(config.onDoneExtra)config.onDoneExtra(d);
},
onError:(msg)=>{
handleSearchError("搜尋過程發生錯誤：",msg,restoreBtn,progressSpan,hitCount);
}
});
}
function validateElistOnlyMonCombo(conds){
if(conds.onlyMon&&conds.elist&&!isCombinedElistMonsterSearch(conds)){alert(A11);return false;}
return true;
}
function startUltimateSearch(){
const conds=getUltimateConds();
if(!validateElistOnlyMonCombo(conds))return;
if(USP_FAST_MODES[conds.anomaly]){startFastestSearch(conds);return;}
const searchOnlyWithD=byId('searchOnlyWithD').checked;
executeSharedSearch({
conds,
btnId:'searchBtnSpecific',
btnText:'🎯 Search',
emptyRankMsg:B07,
validateConds:conds=>{
if(!hasUltimateConds(conds)){alert(A01);return false;}
return true;
},
filterRanks:(ranksToSearch,conds)=>sharedRankFilter(ranksToSearch,conds,false),
processor:'ultimate',
params:{searchOnlyWithD},
bySeed:conds.anomaly==='ghost',
});
}
function MultibugSearch(){
const conds=getUltimateConds();
if(!validateElistOnlyMonCombo(conds))return;
if(USP_FAST_MODES[conds.anomaly]){alert(A15);return;}
if(conds.anomaly){alert(A12);return;}
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const isCombinedSearch=isCombinedElistMonsterSearch(conds);
let effectiveElistCond=cond_elist;
const searchOnlyWithDNode=byId('searchOnlyWithD');
const searchOnlyWithD=searchOnlyWithDNode?searchOnlyWithDNode.checked:false;
const requireFloorIncrease=byId('requireFloorIncrease').checked;
const requireBugFloorHitNode=byId('requireBugFloorHit');
const requireBugFloorHit=requireBugFloorHitNode?requireBugFloorHitNode.checked:false;
if(!cond_elist&&!cond_only_mon&&!searchOnlyWithD&&!conds.hasBoxCond){effectiveElistCond='ONLY';}
executeSharedSearch({
conds,
btnId:'searchBtnBug',
btnText:H07,
stopText:'STOP',
emptyRankMsg:B07,
filterRanks:(ranksToSearch,conds)=>{
return sharedRankFilter(ranksToSearch,conds,true);
},
processor:'multibug',
params:{searchOnlyWithD,requireFloorIncrease,requireBugFloorHit,effectiveElistCond,isCombinedSearch},
});
}
function clearUltimateSearch(){
const inputIds=Object.values(COND_FIELDS).concat(BOX_RANK_CHARS.map(ch=>'cond_box_'+ch));
inputIds.forEach(id=>{
let el=byId(id);
if(el){el.value='';}
});
let bqEl=byId('cond_bq');
if(bqEl){bqEl.disabled=false;bqEl.style.opacity='1';}
const checkboxIds=['searchAllRanks','searchOnlyWithD','requireFloorIncrease','requireBugFloorHit'];
checkboxIds.forEach(id=>{
let el=byId(id);
if(el){el.checked=false;}
});
}
function startFastestSearch(conds=getUltimateConds()){
if(!validateElistOnlyMonCombo(conds))return;
if(conds.elist==='MULTI_SPECIAL'){alert(A13);return;}
const fm=USP_FAST_MODES[conds.anomaly];
const mode=fm?fm.mode:((conds.elist||conds.onlyMon)?'floor':'map');
const slowest=fm?fm.slowest:false;
const showFloors=fm?fm.showFloors:false;
if(mode==='floor'){
if(!(conds.elist||conds.onlyMon||conds.depth)){alert(A16);return;}
}else if(mode!=='maxtile'){
if(!(conds.depth||conds.lv||conds.elist||conds.onlyMon||conds.location||conds.boss)){alert(A14);return;}
}
const useDepth2=(mode==='floor'&&!(conds.elist||conds.onlyMon)&&!!conds.depth);
const allRanksOn=byId('searchAllRanks').checked;
const isMaxTile=(mode==='maxtile');
const metricType=fm?fm.metric:null;
const dedupBySeed=isMaxTile||(useDepth2&&parseInt(conds.depth)>=15&&allRanksOn);
const searchOnlyWithD=byId('searchOnlyWithD').checked;
executeSharedSearch({
conds,
btnId:'searchBtnSpecific',
btnText:'🎯 Search',
emptyRankMsg:B07,
sortTopN:isMaxTile?undefined:((mode==='floor'&&!useDepth2)?Infinity:50),
sortDesc:slowest||(isMaxTile&&metricType!=='mintile'),
dedupBySeed,
dedupBetter:isMaxTile?
((cand,cur)=>(metricType==='mintile'?cand.sortCost<cur.sortCost:cand.sortCost>cur.sortCost)||(cand.sortCost===cur.sortCost&&cand.jumpFloor<cur.jumpFloor))
:undefined,
dedupKeyFn:isMaxTile?(it=>(it._dimLabel||'')+':'+(it.seed+it.jumpFloor+1)):undefined,
renderFinal:isMaxTile?renderMetricSearchResults(metricType):undefined,
validateConds:()=>true,
metricEdgeFromEndSeed:isMaxTile,
condsTransform:(c)=>{
if(USP_FAST_MODES[c.anomaly])c.anomaly='';
if(useDepth2){c.depth2=c.depth;c.depth='';}
},
filterRanks:(ranksToSearch,conds)=>{
if(isMaxTile)return[0xDD];
const allRanks=byId('searchAllRanks').checked;
let ranks=(allRanks&&conds.depth2&&parseInt(conds.depth2)<=14)?[0xDD]:ranksToSearch;
return sharedRankFilter(ranks,conds,false);
},
processor:'fastest',
params:{searchOnlyWithD,fastestMode:mode,showFloors,slowest,metricType:fm?fm.metric:null},
});
}
const mkHdr=(txt)=>{const h=document.createElement('div');
h.style.cssText='width:100%;color:#fc6;font-weight:bold;font-size:13px;margin:12px 0 4px;border-bottom:1px solid #555;padding-bottom:2px;';
h.textContent=txt;return h;};
const addItems=(fr,list)=>{for(const it of list)fr.appendChild(materializeResultItem(it));};
function renderMetricSearchResults(metric){
const cutTies=(g,n)=>{let c=Math.min(n,g.length);
if(c>0&&c<g.length){const thr=g[c-1].sortCost;while(c<g.length&&g[c].sortCost===thr)c++;}
return g.slice(0,c);};
if(metric==='maxghost')return(arr,sortCmp,grid)=>{
arr.sort(sortCmp);
const top=cutTies(arr,50);
const fr=document.createDocumentFragment();
fr.appendChild(mkHdr('Top '+top.length));
addItems(fr,top);
grid.appendChild(fr);
};
if(metric==='maxiso')return(arr,sortCmp,grid)=>{
const groups={};
for(const it of arr)(groups[it.sortCost]=groups[it.sortCost]||[]).push(it);
const fr=document.createDocumentFragment();
for(const k of Object.keys(groups).map(Number).sort((a,b)=>b-a)){
const g=groups[k];g.sort(sortCmp);
fr.appendChild(mkHdr(k+' '+T('tiles','格','マス')+' — '+g.length));
addItems(fr,g);
}
grid.appendChild(fr);
};
return(arr,sortCmp,grid)=>{
const groups={};
for(const it of arr){const d=it._dimLabel||'?';if(!groups[d])groups[d]=[];groups[d].push(it);}
const fr=document.createDocumentFragment();
for(const dim of MAXTILE_DIMS){
const dl=dim+'x'+dim;const g=groups[dl];if(!g||g.length===0)continue;
g.sort(sortCmp);
const top=cutTies(g,10);
fr.appendChild(mkHdr(dl+' — Top '+top.length));
addItems(fr,top);
}
grid.appendChild(fr);
};
}
function executeItemSearch(config){
executeSharedSearch({
btnId:config.btnId,
btnText:config.btnText,
stopText:'STOP',
filterRanks:config.filterRanks,
processor:'item',
sortTopN:config.sortTopN,
preSort:config.preSort,
groupTail:config.groupTail,
params:Object.assign({checker:config.checker},config.checkerParams||{}),
});
}
function FreeSearch(){
let groups=[];
let reqFloorCount=0;
for(let i=1;i<=3;i++){
let f=parseInt(byId(`fs_f_${i}`).value);
let b=parseInt(byId(`fs_b_${i}`).value);
let r=parseInt(byId(`fs_r_${i}`).value);
let itm=byId(`fs_i_${i}`).value;
let t_str=byId(`fs_t_${i}`).value.trim();
if(b===-1&&r===0&&itm==="ANY")continue;
if(f===0){
alert(T('Please specify a floor.','請指定目標樓層！','階層を指定してください！'));
return;
}
let t_val=t_str===""?-1:parseInt(t_str);
if(t_val!==-1&&t_val<CHEST_TIMER_OFFSET)t_val=CHEST_TIMER_OFFSET;
let targetItems=itm==="ANY"?[]:expandItemGroup(itm);
let allowedRanks=new Set();
if(r>0)allowedRanks.add(r);
else if(targetItems.length>0){
for(const rank of getChestRanksForItems(targetItems))allowedRanks.add(rank);
}
reqFloorCount=Math.max(reqFloorCount,f);
groups.push({
floor:f,boxIdx:b,rank:r,
items:targetItems.length>0?targetItems:null,
timerVal:t_val,
allowedRanks:allowedRanks
});
}
if(groups.length===0){alert(A01);return;}
executeItemSearch({
btnId:'btnFreeSearch',btnText:'Free',
filterRanks:(ranks,conds)=>{
let validRanks=ranks;
for(let g of groups){
if(g.allowedRanks.size>0){
const offset=floorMRAt(0,g.floor-1);
validRanks=filterMapRanksBySMRAndChest(validRanks,conds,[Array.from(g.allowedRanks)],offset);
}
}
return validRanks;
},
checker:'free',
checkerParams:{
reqFloorCount,
groups:groups.map((g)=>({floor:g.floor,boxIdx:g.boxIdx,rank:g.rank,items:g.items,timerVal:g.timerVal})),
}
});
}
function searchItemGroup(){const o=byId('searchItem').selectedOptions[0];return o?o.parentElement.id:'';}
function getQuickloadSearchTarget(){
const targetItem=uiVal('searchItem');
const isB9F=searchItemGroup()==='ogS';
if(searchItemGroup()==='og5'){alert(A03);return null;}
const checkItems=expandItemGroup(targetItem);
const isThree=b3fThreeItems.includes(targetItem);
return{targetItem,isB9F,checkItems,reqCount:isB9F?2:isThree?3:2,targetFloors:isB9F?[8]:isThree?[2]:[2,3]};
}
function QuickloadSearch(qlSec){
const target=getQuickloadSearchTarget();
if(!target)return;
const{isB9F,checkItems,reqCount,targetFloors}=target;
const chestRanks=getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'searchBtn',btnText:H01,
filterRanks:chestRankFilter(chestRanks,isB9F?2:0),
checker:qlSec==null?'quickload':'quickload9',
...astarPresetConfig(wantAstar,{b9Rows:isB9F,x3Count:reqCount+1}),
checkerParams:{targetFloors,checkItems,reqCount,isB9F,chestRanks,qlSec,wantAstar,checkB10:wantAstar&&isB9F}
});
}
function qlMode(){const el=byId('ql_mode');return el?el.value:'';}
function qlModeSec(){const m=qlMode();return(m==='5'||m==='5A'||m==='5D')?0:(m==='9'||m==='9A'||m==='9D')?4:null;}
function qlModeAstar(){const m=qlMode();return m==='D'||m==='5D'||m==='9D';}
const preSortB10Rows=key=>arr=>{
const b10=arr.filter(it=>it[key]).sort((a,b)=>a.sortCost-b.sortCost).slice(0,5);
return arr.filter(it=>!it[key]).concat(b10);
};
function astarPresetConfig(wantAstar,opts){
if(!wantAstar)return{};
const o=opts||{};
const cfg={sortTopN:Infinity};
if(o.b9Rows)cfg.preSort=preSortB10Rows('isB10');
else if(o.jfire)cfg.preSort=preSortB10Rows('isJfireB10');
if(o.x3Count!==undefined)cfg.groupTail={match:it=>it.isX3,label:'x'+o.x3Count};
return cfg;
}
function startSearch(){
const m=qlMode();
if(m===''||m==='D'){QuickloadSearch();return;}
NineSearch(m==='9A'||m==='5A',qlModeSec());
}
function NineSearch(multiFloor,qlSec){
const target=getQuickloadSearchTarget();
if(!target)return;
const{targetItem,isB9F,checkItems}=target;
if(multiFloor){
let anchorFloors,anchorThreshold,otherThreshold,filterOffset;
if(targetItem==='Millionaire'||targetItem==='Ethereal stone'){
anchorFloors=[2,3];anchorThreshold=2;otherThreshold=1;filterOffset=0;
}else if(isB9F){
anchorFloors=[];anchorThreshold=2;otherThreshold=1;filterOffset=null;
}else if(targetItem==='Mini medal'){
anchorFloors=[2];anchorThreshold=3;otherThreshold=2;filterOffset=0;
}else{
anchorFloors=[];anchorThreshold=2;otherThreshold=2;filterOffset=null;
}
const needOneWith=(anchorFloors.length===0&&otherThreshold<2)?2:0;
const chestRanks=getChestRanksForItems(checkItems);
executeItemSearch({
btnId:'searchBtn',btnText:H01,
filterRanks:chestRankFilter(chestRanks,filterOffset),
checker:'quickload9all',
checkerParams:{checkItems,chestRanks,anchorFloors,anchorThreshold,otherThreshold,needOneWith,qlSec}
});
return;
}
QuickloadSearch(qlSec);
}
function ThirdChestSearch(isS3){
let checkItems,targetFloors,colorStyle;
if(isS3){
checkItems=["Sage's elixir","Sainted soma"];
targetFloors=[12,13];
colorStyle='#F0F0aa';
}else{
const targetItem=uiVal('searchItem');
const millionaire2Items=ITEMS_MILLIONAIRE_BOX3;
checkItems=(targetItem==='Millionaire')?millionaire2Items:[targetItem];
targetFloors=[2,3];
colorStyle='#11F514';
}
const chestRanks=isS3?[10]:getChestRanksForItems(checkItems);
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'searchBtnBox3',btnText:H03,
filterRanks:chestRankFilter(chestRanks,isS3?3:0),
checker:'third',
...astarPresetConfig(wantAstar),
checkerParams:{targetFloors,checkItems,isS3:!!isS3,colorStyle,chestRanks,wantAstar}
});
}
function Box3Search(){
const m=qlMode();
if(m==='9A'||m==='5A'){alert(A05);return;}
const targetValue=uiVal('searchItem');
const supportedForBox3=['Ethereal stone','Lucida shard','Sainted soma','Hephaestus\' flame','Millionaire'];
if(!supportedForBox3.includes(targetValue)){
alert(A05);
return;
}
ThirdChestSearch(targetValue==='Sainted soma');
}
function JFireSearch(qlSec){
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'BtnTK',btnText:H02,
filterRanks:(ranks)=>ranks.filter(rank=>row4(TableC,8,rank,NO_ROW)[1]>=9),
checker:'jfire',
...astarPresetConfig(wantAstar,{jfire:true}),
checkerParams:{qlSec,wantAstar}
});
}
const TK_MATERIALS=new Map([['Dangerous bustier','Aggressence'],['Fuddle bow','Mirrorstone'],['Slime shield','Iron ore'],["Sorcerer's stone",'670G']]);
function TKSearch(){
const m=qlMode();
if(m==='9A'||m==='5A'){alert(A05);return;}
const qlSec=qlModeSec();
const targetItem=uiVal('searchItem');
if(targetItem==='Sainted soma'){JFireSearch(qlSec);return;}
let wpTargets=[];
let strictMatTargets=[];
let broadMatTargets=[];
let isMillionaire=false;
let isMonsterBox=false;
let minSec=0,maxSec=0;
if(targetItem==='Millionaire'){
isMillionaire=true;
wpTargets=ITEMS_MILLIONAIRE;
strictMatTargets=["Gold bar","Orichalcum"];
broadMatTargets=ITEMS_MILLIONAIRE_BOX3.concat(["Gold bar","Orichalcum"]);
}else if(searchItemGroup()==='og5'){
isMonsterBox=true;
wpTargets=[targetItem];
strictMatTargets=[targetItem];
if(targetItem==="Pandora's box"){
minSec=25;
maxSec=35;
}else{
minSec=20;
maxSec=30;
}
}else if(TK_MATERIALS.has(targetItem)){
wpTargets=[targetItem];
strictMatTargets=[TK_MATERIALS.get(targetItem)];
}else{alert(A05);return;}
let allMatTargets=isMillionaire?broadMatTargets:strictMatTargets;
const wantAstar=qlModeAstar();
executeItemSearch({
btnId:'BtnTK',btnText:H02,
filterRanks:(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[getChestRanksForItems(wpTargets),getChestRanksForItems(allMatTargets)],0),
checker:'tk',
...astarPresetConfig(wantAstar),
checkerParams:{targetItem,wpTargets,strictMatTargets,broadMatTargets,isMillionaire,isMonsterBox,minSec,maxSec,qlSec,wantAstar}
});
}
function appendSpawnMonsterOptions(select,spawnList,formatName){
for(const entry of spawnList){
if(entry.length<3)continue;
const md=MONSTER_DB[entry[0]];
if(!md)continue;
const opt=document.createElement('option');
opt.value=entry[0];
opt.textContent=formatName(md);
select.appendChild(opt);
}
}
const readAtEnvMR=()=>({envType:parseInt(uiVal('at_env')),
floorMR:parseInt(uiVal('at_mr'))});
const readAtMaxSteps=()=>{const el=byId('at_maxSteps'),v=parseInt(el.value);return isNaN(v)||v<1?parseInt(el.defaultValue):v;};
function atUpd(){
const{envType,floorMR}=readAtEnvMR();
const sel=byId('at_mon');
sel.innerHTML='';
const spawnList=getSpawnList(envType,floorMR);
if(!spawnList.length)return;
appendSpawnMonsterOptions(sel,spawnList,md=>`${md.jp} (${md.en})`);
updateATOnlyMonsters();
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',atinit);
}else{
setTimeout(atinit,0);
}
function appendPatternOptions(sel,li){AT_O.forEach(([key,label])=>sel.add(new Option(li===undefined?label:label[li],key)));}
function atinit(){
atUpd();
const patSel=byId('at_pattern');
if(patSel)appendPatternOptions(patSel);
dwInit();
}
function getMonsterNameByAT(atVal,envType,floorMR,id=getMonsterIdByAT(atVal,envType,floorMR)){
return id!==null&&MONSTER_DB[id]?getMonsterDisplayName(id):"?";
}
function getMonsterIdByAT(atVal,envType,floorMR){
const spawnList=getSpawnList(envType,floorMR);
for(const entry of spawnList)if(entry.length>=3&&atVal>=entry[1]&&atVal<=entry[2])return entry[0];
return null;
}
function updateATOnlyMonsters(){
const{envType,floorMR}=readAtEnvMR();
document.querySelectorAll('.at-dynamic-mon').forEach(el=>{
const atVal=parseInt(el.getAttribute('data-at'));
if(!isNaN(atVal))el.textContent=getMonsterNameByAT(atVal,envType,floorMR);
});
}
function updateBattleAT(){
const deftInput=byId('at_deft');
const userDeft=(deftInput&&deftInput.value!=='')?parseInt(deftInput.value):DEFAULT_USER_DEFT;
const nInput=byId('at_n_input');
const n=(nInput&&nInput.value!=='')?parseInt(nInput.value):0;
const cN=atPopIndex(n);
const{envType,floorMR}=readAtEnvMR();
document.querySelectorAll('.at-m-card').forEach(card=>{
const seed=parseInt(card.getAttribute('data-seed'));
const{atN,atN1}=getATPair(seed,cN);
const{deft,color:deftColor,label:deftLabel}=formatDeftness(atN1);
const frame=battleATContext(cN,deft,userDeft);
const atnLabel=card.querySelector('.at-m-atn-label');
if(atnLabel){
atnLabel.textContent=atnLabel.textContent.includes('AT[')?`AT[${cN}]: `:`AT +${cN}: `;
}
const atnVal=card.querySelector('.at-m-atval');
if(atnVal)atnVal.textContent=atN;
const monStrong=card.querySelector('.at-dynamic-mon');
if(monStrong){
monStrong.setAttribute('data-at',atN);
monStrong.textContent=getMonsterNameByAT(atN,envType,floorMR);
}
const deftSpan=card.querySelector('.at-m-deft');
if(deftSpan){
deftSpan.style.color=deftColor;
deftSpan.textContent=`${G18} ${deftLabel}`;
}
card.querySelectorAll('.at-dynamic-battle').forEach(el=>{
const target=parseInt(el.getAttribute('data-target'));
const{d1,d2,d4}=battleATBudgets(frame,target);
el.textContent=`${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}`;
});
});
}
const debouncedUpdateBattleAT=debounce(updateBattleAT,100);
function readAtPatternUI(){
const patSel=byId('at_pattern'),probSel=byId('at_threshold');
return{threshold:parseInt(probSel.value),pType:AT_PAT[patSel.value]||0,
patternName:patSel.options[patSel.selectedIndex].text,probText:probSel.options[probSel.selectedIndex].text};
}
function atSearch(){
if(isSearching){requestSearchCancel();return;}
isSearching=true;searchCancel=false;
const restoreBtn=setStopButton(byId('atSearchBtn'),'STOP');
const{envType:monEnvType,floorMR:monFloorMR}=readAtEnvMR();
const monId=uiVal('at_mon');
const nVal=parseInt(uiVal('at_n_input'));
if(isNaN(nVal)||nVal<0){isSearching=false;restoreBtn();return;}
const N=atPopIndex(nVal);
const spawnList=SPAWN_DB[monEnvType]&&SPAWN_DB[monEnvType][monFloorMR];
const atEntry=spawnList.find(e=>e[0]===monId&&e.length>=3);
const atmin=atEntry?atEntry[1]:-1,atmax=atEntry?atEntry[2]:-1;
if(atmin<0){isSearching=false;restoreBtn();return;}
const md=MONSTER_DB[monId];
const conds=getUltimateConds();
if(!getLocationBQFilters(conds).valid){
showConditionConflictResult();
isSearching=false;
restoreBtn();
return;
}
if(!validateElistOnlyMonCombo(conds)){isSearching=false;restoreBtn();return;}
const searchOnlyWithD=byId('searchOnlyWithD').checked;
const maxSeed=0x7FFF;
const rangeData=getValidatedSeedRange();
if(!rangeData){isSearching=false;restoreBtn();return;}
const{startSeed,endSeed,searchFilterLoc}=rangeData;
const ranks=hasUltimateConds(conds)?sharedRankFilter(readRanksToSearch(),conds):[parseInt(uiVal('rank'))];
const deftInput=uiVal('at_deft').trim();
const deftMax=deftInput!==''?parseInt(deftInput):-1;
const{threshold:atThreshold,pType,patternName,probText}=readAtPatternUI();
let atMaxSteps=readAtMaxSteps();
if(atMaxSteps<N)atMaxSteps=N;
let headerExtra='';
if(deftMax>=0)headerExtra+=` ｜ ${G18} ${deftMax}`;
if(pType>0){
headerExtra+=` ｜ ${patternName} (${probText})`;
}
const{grid,progressSpan}=initSearchResultArea(`<div style="color:#0ca;font-size:12px;margin-bottom:6px;">${ENV_NAMES[monEnvType][1]} Rank ${monFloorMR} ｜ ${md.jp} (${md.en}) ｜ POP=${N} (Zoom=${nVal}) ｜ AT: ${atmin}～${atmax} ${headerExtra}</div>`);
if(ranks.length===0){progressSpan.textContent="100% ("+B07+")";isSearching=false;restoreBtn();return;}
const job={
kind:'atMonster',lang:DISPLAY_LANG,
conds,searchFilterLoc,searchOnlyWithD,ranks,
startSeed,endSeed:Math.min(endSeed,maxSeed),
N,atmin,atmax,deftMax,userDeft:deftMax<0?DEFAULT_USER_DEFT:deftMax,
pType,atThreshold,atMaxSteps,patternName,probText,
};
runAtResultSearch(job,grid,progressSpan,restoreBtn,
p=>Math.floor((p.processed/p.total)*100)+'% ['+B04+''+p.hits+' '+B03+']',
"AT Monster Search error:");
}
function runAtResultSearch(job,grid,progressSpan,restoreBtn,formatProgress,errorLabel){
let hitCount=0;
const allResults=[];
runSearchJob(job,{
onProgress:(p)=>{
hitCount=p.hits;
progressSpan.textContent=formatProgress(p);
},
onBatch:(items)=>{
for(const it of items)allResults.push({node:materializeResultItem(it),pop:it.pop});
},
onDone:(d)=>{
hitCount=d.hits;
finalizeAtSearchResults(allResults,grid,byId('at_sortPOP').checked);
restoreSearchUI(restoreBtn);
progressSpan.textContent=searchDoneMsg(hitCount);
},
onError:(msg)=>{
handleSearchError(errorLabel,msg,restoreBtn,progressSpan,hitCount);
}
});
}
function finalizeAtSearchResults(results,grid,sortByPOP){
if(sortByPOP)results.sort((a,b)=>a.pop-b.pop);
const fragment=document.createDocumentFragment();
for(const res of results)fragment.appendChild(res.node);
if(fragment.children.length>0)grid.appendChild(fragment);
updateBattleAT();
}
function atPtnSearch(){
if(isSearching){requestSearchCancel();return;}
isSearching=true;searchCancel=false;
const restoreBtn=setStopButton(byId('atPtnSchBtn'),'STOP');
const{threshold,pType,patternName,probText}=readAtPatternUI();
if(pType===0){alert(A01);isSearching=false;restoreBtn();return;}
let maxSteps=readAtMaxSteps();
const nVal=parseInt(uiVal('at_n_input'));
const POPIndex=atPopIndex((isNaN(nVal)||nVal<0)?0:nVal);
const deftInput=byId('at_deft');
const userDeft=deftInput&&deftInput.value!==''?parseInt(deftInput.value):DEFAULT_USER_DEFT;
if(maxSteps<POPIndex)maxSteps=POPIndex;
const{rStr,targetRankKey}=readSearchRank();
const rangeData=getValidatedSeedRange();
if(!rangeData){isSearching=false;restoreBtn();return;}
const{startSeed,endSeed,searchFilterLoc}=rangeData;
const{grid,progressSpan}=initSearchResultArea(`<div style="color:#f80;font-size:12px;margin-bottom:6px;">${patternName} ｜ ${probText} ｜ N=${POPIndex} (n=${nVal||0}) ｜ Rank ${rStr}</div>`);
const job={
kind:'atPattern',lang:DISPLAY_LANG,
threshold,pType,maxSteps,POPIndex,userDeft,searchFilterLoc,targetRankKey,startSeed,endSeed,patternName,probText,
};
runAtResultSearch(job,grid,progressSpan,restoreBtn,
p=>Math.floor((p.processed/p.total)*100)+'% (Seed '+p.seedHex+') ['+B04+''+p.hits+' '+B03+']',
"AT Pattern Search error:");
}
function addHelpBtn(text,title,css,onclick,id){
const h4=document.querySelector('#unified_search_panel h4');
if(!h4)return false;
const b=document.createElement('button');
if(id)b.id=id;
b.textContent=text;
b.title=title;
b.className='help-btn';
b.style.cssText=css;
b.onclick=onclick;
h4.appendChild(b);
return true;
}
function initCPUBenchmark(){addHelpBtn('💻','CPU Benchmark','--hb-bd:#088;font-size:11px;',startCPUBenchmark,'cpuBenchBtn');}
function startCPUBenchmark(){
if(isSearching){requestSearchCancel();return;}
const t0=performance.now();
executeSharedSearch({
btnId:'cpuBenchBtn',
btnText:'💻',
stopText:'🛑',
emptyRankMsg:B07,
searchFilterLoc:true,
validateConds:()=>true,
renderCap:0,
filterRanks:(ranksToSearch,conds)=>sharedRankFilter(ranksToSearch,conds,false),
processor:'fastest',
params:{searchOnlyWithD:false,benchmarkMode:true},
onDoneExtra:(d)=>{
const elapsed=((performance.now()-t0)/1000).toFixed(2);
const sp=byId('searchProgress');
if(sp)sp.textContent=searchDoneMsg(d.hits)+' ⏱ '+elapsed+'s';
},
});
}
const MRT_PREVIEW_ROWS=30;
const MRT_HL={};
MRT_HL['Sainted soma']={bg:'#FFC90E',fg:'#000'};
ITEMS_S_WEAPONS.forEach(w=>MRT_HL[w]={bg:'#1a8a3c',fg:'#fff'});
MRT_HL['Ethereal stone']={bg:'#c018a0',fg:'#fff'};
ITEMS_METAL_SLIME.forEach(i=>MRT_HL[i]={bg:'#383850',fg:'#d0d8f0'});
ITEMS_MILLIONAIRE.forEach(i=>MRT_HL[i]={bg:'#08c',fg:'#fff'});
MRT_HL['Lucida shard']={bg:'#B5E61D',fg:'#000'};
['Dangerous bustier','Fuddle bow'].forEach(i=>MRT_HL[i]={bg:'#FFAEC9',fg:'#000'});
const MRT_RK_COLORS={10:'#f4f',9:'#fa0',8:'#4cf',7:'#8f8',6:'#ff8',5:'#aaa',4:'#888',3:'#666',2:'#555',1:'#444'};
const MRT_PRESETS={
'DD,263C':{custom:{3:[0],4:[0],7:[0],8:[1],9:[0],10:[0],11:[0],12:[0],13:[0],14:[0],15:[0],16:[0]}},
'B5,3CA2':{custom:{4:[0],5:[0],6:[0],7:[0],8:[0,2],9:[0],10:[1],13:[0],14:[0]}},
'DD,2E7A':{custom:{3:[0],4:[0],6:[0],7:[1],9:[0],10:[0],11:[0,2],12:[1]}},
'C9,7FE0':{custom:{3:[0],4:[0,2],5:[0],8:[0],9:[1],10:[0],11:[0],12:[0],13:[0]}},
'C9,2AC6':{custom:{3:[0,1]}},
'DD,32BB':{custom:{3:[0,1,2],4:[0,1]}},
'DD,235E':{custom:{3:[0,1]}},
'C9,158D':{custom:{3:[0,1]}},
'DD,5C43':{custom:{3:[0,1],4:[0],5:[1],6:[0],9:[0],10:[0],11:[0],13:[0,1],14:[1]}},
'DD,47D0':{custom:{3:[0,1],4:[1],5:[0],6:[0],7:[0,1,2],8:[0]}},
'DD,1341':{custom:{3:[0,1,2],5:[0],6:[0,1],7:[0]}},
};
let mrtEngine=null,mrtChests=[],mrtVisChests=[],mrtFilter='ALL',mrtCustom=null,mrtHiddenChests=new Set(),mrtRankWidths={};
function mrtMeasureRankWidths(){
const canvas=document.createElement('canvas');
const ctx=canvas.getContext('2d');
const isMobile=window.innerWidth<=600;
const isEN=mrtLang!=='jp';
ctx.font=(isMobile?'10px ':'11px ')+(isEN?'system-ui,-apple-system,sans-serif':'"Hiragino Sans","PingFang TC",sans-serif');
mrtRankWidths={};
const ranks=new Set(mrtChests.map(cd=>cd.rank));
for(const rank of ranks){
let maxW=0,acc=0;
for(let i3=TableO[rank-1];i3<TableO[rank];i3++){
if(acc>99)break;
acc+=TableP[i3];
const r=TableR[TableQ[i3]];
const name=isEN?(r[0]||'\u2014'):(r[1]||r[0]||'\u2014');
const w=ctx.measureText(name).width;
if(w>maxW)maxW=w;
}
mrtRankWidths[rank]=Math.ceil(maxW)+12;
}
}
let mrtLang=DISPLAY_LANG==='EN'?'en':'jp',mrtRunning=false,mrtRAF=null,mrtOrigin=0,mrtRealSec=0,mrtElapsedMs=0;
function mrtInternalSec(){return mrtRealSec-CHEST_TIMER_OFFSET;}
function mrtGetStartSec(){
const el=byId('mrt_timerStart');
const v=el?parseFloat(el.value):NaN;
return isNaN(v)?0:v;
}
function mrtOpen(){
mrtCacheEls();
mrtLang=DISPLAY_LANG==='EN'?'en':'jp';
const bl=byId('mrt_btnLang');if(bl)bl.textContent=mrtLang.toUpperCase();
mrtPopulateCustomHL();
const modal=byId('marathonModal');
modal.classList.add('open');
const rSel=byId('rank');
const sSel=byId('seed');
if(rSel){const v=rSel.value.replace('0x','');byId('mrt_inRank').value=v;}
if(sSel&&sSel.value)byId('mrt_inSeed').value=sSel.value;
mrtInputChange();
mrtResizeMain();
}
function mrtClose(){mrtResetTimer();byId('marathonModal').classList.remove('open');}
function mrtResizeMain(){
const tb=document.querySelector('#marathonModal .mrt-topbar');
const ma=byId('mrt_mainArea');
if(tb&&ma)ma.style.height=(window.innerHeight-tb.offsetHeight)+'px';
}
function mrtCompute(){
const seed=parseInt(uiVal('mrt_inSeed').trim(),16);
if(isNaN(seed)||seed<0||seed>0x7FFF){byId('mrt_mainArea').innerHTML='<p style="color:#f44;padding:20px">Invalid Seed</p>';return;}
mrtEngine=new GrottoDetail();
mrtEngine.MapSeed=seed;
mrtEngine.MapRank=parseInt(uiVal('mrt_inRank'),16);
mrtEngine.calculateDetail();
mrtChests=[];
for(let f=0;f<mrtEngine.floorCount;f++){
const d=mrtEngine.di[f];
for(let b=0;b<d[8];b++){
const info=mrtEngine.getBoxInfo(f,b);
mrtChests.push({floor:f,floorNum:f+1,floorLabel:'B'+(f+1)+'F',box:b,rank:info.rank,rankName:CHEST_RANK[info.rank]||'?'});
}
}
mrtMeasureRankWidths();
mrtBuildTable();
mrtRenderRows();
}
function mrtIsVis(cd){
if(mrtFilter==='CUSTOM'&&mrtCustom){const a=mrtCustom[cd.floorNum];return a?a.includes(cd.box):false;}
if(mrtFilter==='SA')return cd.rank>=9;
if(mrtFilter==='AB')return cd.rank===9||cd.rank===8;
return true;
}
function mrtBuildTable(keepScroll){
const area=byId('mrt_mainArea');
const savedScroll=keepScroll?area.scrollLeft:0;
area.scrollLeft=0;area.scrollTop=0;
mrtVisChests=mrtChests.filter(cd=>mrtIsVis(cd)&&!mrtHiddenChests.has(cd.floor+':'+cd.box));
if(!mrtVisChests.length){area.innerHTML='<p style="color:#555;padding:20px;text-align:center">No chests</p>';return;}
const gridCols='42px '+mrtVisChests.map(cd=>(mrtRankWidths[cd.rank]||100)+'px').join(' ');
let hdr='<div class="mrt-vhdr-time">sec</div>';
for(let ci=0;ci<mrtVisChests.length;ci++){
const cd=mrtVisChests[ci];
const clr=MRT_RK_COLORS[cd.rank]||'#888';
hdr+='<div class="mrt-vhdr" data-ck="'+cd.floor+':'+cd.box+'" style="cursor:pointer"><span class="mrt-vhdr-floor">'+cd.floorLabel+'</span><br><span class="mrt-vhdr-rk" style="color:'+clr+'">'+cd.rankName+(cd.box+1)+'</span></div>';
}
area.innerHTML='<div class="mrt-vgrid" style="grid-template-columns:'+gridCols+'">'+hdr+'<div id="mrt_vbody" style="display:contents"></div></div>';
area.querySelector('.mrt-vgrid').addEventListener('click',function(e){
const cell=e.target.closest('[data-ck]');
if(!cell)return;
mrtHiddenChests.add(cell.dataset.ck);
mrtMarkFilter(null);
mrtBuildTable(true);mrtRenderRows();
});
if(savedScroll)area.scrollLeft=savedScroll;
}
function mrtRenderRows(){
const vb=byId('mrt_vbody');
if(!vb||!mrtVisChests.length)return;
const is=mrtInternalSec();
const st=Math.max(0,is),ed=st+MRT_PREVIEW_ROWS;
const isEN=mrtLang!=='jp';
const cellCls=isEN?'mrt-vcell mrt-vcell-en':'mrt-vcell';
const parts=[];
for(let s=st;s<=ed;s++){
const cur=(s===is),rCls=cur?' mrt-vrow-cur':'';
parts.push('<div class="mrt-vtime',rCls,'">',String(s+CHEST_TIMER_OFFSET).padStart(3,'0'),'</div>');
for(let ci=0;ci<mrtVisChests.length;ci++){
const cd=mrtVisChests[ci];
const[en,jp]=mrtEngine.getBoxItem(cd.floor,cd.box,s);
const hl=en?MRT_HL[en]:null;
const style=hl?' style="background:'+hl.bg+';color:'+hl.fg+';cursor:pointer"':' style="cursor:pointer"';
const label=mrtLang==='jp'?(jp||en||'\u2014'):(en||'\u2014');
parts.push('<div class="',cellCls,rCls,'" data-ck="',cd.floor,':',cd.box,'"',style,'>',label,'</div>');
}
}
vb.innerHTML=parts.join('');
}
function mrtTimerLoop(){
if(!mrtRunning)return;
mrtElapsedMs=Date.now()-mrtOrigin;
const ns=Math.floor(mrtElapsedMs/1000);
mrtUpdateStopwatch(mrtElapsedMs);
if(ns!==mrtRealSec){mrtRealSec=ns;mrtRenderRows();}
mrtRAF=requestAnimationFrame(mrtTimerLoop);
}
let _mrtTimerText=null,_mrtTimerDisp=null,_mrtBtnStart=null;
function mrtCacheEls(){
_mrtTimerText=byId('mrt_timerText');
_mrtTimerDisp=byId('mrt_timerDisp');
_mrtBtnStart=byId('mrt_btnStart');
}
function mrtUpdateStopwatch(ms){
if(!_mrtTimerText)mrtCacheEls();
if(!_mrtTimerText)return;
const isPrep=ms<0;
const absMs=Math.abs(ms);
const s=Math.floor(absMs/1000);
const cs=Math.floor((absMs%1000)/10);
_mrtTimerText.textContent=isPrep?'-'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0'):String(s).padStart(3,'0')+'.'+String(cs).padStart(2,'0');
_mrtTimerDisp.style.color=isPrep?'#f88':'#0f0';
}
function mrtToggleTimer(){
if(mrtRunning){
mrtRunning=false;
if(mrtRAF){cancelAnimationFrame(mrtRAF);mrtRAF=null;}
_mrtBtnStart.textContent='\u25B6';
_mrtBtnStart.classList.remove('running');
}else{
mrtOrigin=Date.now()-mrtElapsedMs;
mrtRunning=true;
_mrtBtnStart.textContent='\u23F8';
_mrtBtnStart.classList.add('running');
mrtTimerLoop();
}
}
function mrtResetTimer(render=true){
if(mrtRunning){cancelAnimationFrame(mrtRAF);mrtRAF=null;mrtRunning=false;}
const s=mrtGetStartSec();
mrtRealSec=s;mrtElapsedMs=s*1000;
if(_mrtBtnStart){_mrtBtnStart.textContent='\u25B6';_mrtBtnStart.classList.remove('running');}
mrtUpdateStopwatch(mrtElapsedMs);
if(render)mrtRenderRows();
}
const mrtMarkFilter=f=>document.querySelectorAll('#marathonModal .mrt-fbtn').forEach(b=>b.classList.toggle('active',b.dataset.f===f));
function mrtSetFilter(f){
mrtFilter=f;mrtCustom=null;mrtHiddenChests.clear();
mrtMarkFilter(f);
mrtBuildTable();mrtRenderRows();
}
function mrtToggleLang(){
mrtLang=mrtLang==='en'?'jp':'en';
byId('mrt_btnLang').textContent=mrtLang.toUpperCase();
mrtPopulateCustomHL();
mrtMeasureRankWidths();
mrtBuildTable();mrtRenderRows();
}
function mrtApplyPreset(){
const sel=byId('mrt_presets');
if(!sel.value)return;
const[rank,seed]=sel.value.split(',');
byId('mrt_inRank').value=rank;
byId('mrt_inSeed').value=seed;
const pd=MRT_PRESETS[sel.value];
if(pd&&pd.custom){mrtFilter='CUSTOM';mrtCustom=pd.custom;mrtMarkFilter(null);}
mrtHiddenChests.clear();
mrtResetTimer(false);mrtCompute();
}
function mrtInputChange(){
const seedVal=uiVal('mrt_inSeed').trim();
if(seedVal.length<1||/[^0-9A-Fa-f]/.test(seedVal))return;
mrtCustom=null;mrtFilter='ALL';mrtHiddenChests.clear();
mrtMarkFilter('ALL');
mrtResetTimer(false);mrtCompute();
}
const debouncedMrtInput=debounce(mrtInputChange,200);
const MRT_CUSTOM_HL1={bg:'#801',fg:'#fff'};
const MRT_CUSTOM_HL2={bg:'#3f48cc',fg:'#fff'};
let mrtCustomHL1Item='',mrtCustomHL2Item='';
const MRT_BUILTIN_HL={};
for(const k in MRT_HL)MRT_BUILTIN_HL[k]=MRT_HL[k];
function mrtPopulateCustomHL(){
const seen={},items=[];
TableR.forEach(r=>{if(!seen[r[0]]){seen[r[0]]=true;items.push({en:r[0],jp:r[1]});}});
const isJP=mrtLang==='jp';
items.sort((a,b)=>isJP?a.jp.localeCompare(b.jp,'ja'):a.en.localeCompare(b.en));
['mrt_customHL1','mrt_customHL2'].forEach(id=>{
const sel=byId(id);
if(!sel)return;
const prev=sel.value;
const label=id.endsWith('1')?'\u2014 HL1 \u2014':'\u2014 HL2 \u2014';
let html='<option value="">'+label+'</option>';
items.forEach(it=>{html+='<option value="'+it.en+'">'+(isJP?it.jp:it.en)+'</option>';});
sel.innerHTML=html;
sel.value=prev;
});
}
function mrtApplyCustomHL(){
[mrtCustomHL1Item,mrtCustomHL2Item].forEach(name=>{
if(!name)return;
if(MRT_BUILTIN_HL[name])MRT_HL[name]=MRT_BUILTIN_HL[name];
else delete MRT_HL[name];
});
mrtCustomHL1Item=uiVal('mrt_customHL1');
mrtCustomHL2Item=uiVal('mrt_customHL2');
if(mrtCustomHL1Item)MRT_HL[mrtCustomHL1Item]=MRT_CUSTOM_HL1;
if(mrtCustomHL2Item)MRT_HL[mrtCustomHL2Item]=MRT_CUSTOM_HL2;
mrtRenderRows();
}
window.addEventListener('resize',()=>{if(byId('marathonModal').classList.contains('open'))mrtResizeMain();});
function siBuildSeqHtml(seqArray){
const GC=[
[['#f44','#ccc'],['#c018a0','#ccc']],
[['#4c4','#ccc'],['#fa0','#ccc']],
[['#00A2E8','#ccc'],['#88f','#ccc']]
];
const BK=['','rgba(255,136,255,0.25)','rgba(34,177,76,0.25)','rgba(0,162,232,0.25)','rgba(255,170,0,0.25)'];
let items=seqArray.map(item=>{
let gi=item.gIdx!==undefined?item.gIdx:0;
let ri=item.isR!==undefined?(item.isR?0:1):0;
let cp=GC[gi]?(GC[gi][ri]||GC[0][0]):GC[0][0];
let color=item.red?cp[0]:cp[1];
let fw=item.red?'bold':'normal';
let bg=BK[item.bk]||'';
let bgStyle=bg?`background:${bg};padding:0 2px;border-radius:2px;`:'';
return`<span style="color:${color};font-weight:${fw};${bgStyle}" title="${item.type}">${item.val}</span>`;
});
return`<div style="margin-top:6px;font-size:11px;color:#aaa;line-height:1.6;">`+C24+`: [ ${items.join(', ')} ]</div>`;
}
function initSeedInspectorUI(){
initSolverStatInputs();
const mrSel=byId('si_mr');
if(mrSel){
mrSel.options.length=0;
for(let i=1;i<=12;i++)mrSel.options.add(new Option(i,i));
mrSel.value=2;
}
for(let b=1;b<=4;b++){
const tSel=byId(`si_t${b}`);
if(tSel){
tSel.options.length=0;
tSel.options.add(new Option('--',0));
for(let i=1;i<=99;i++)tSel.options.add(new Option(i,i));
tSel.value=99;
}
}
const patSel=byId('si_pattern');
if(patSel){
patSel.options.length=0;
patSel.options.add(new Option('----','none'));
appendPatternOptions(patSel);
}
}
function updateSeedInspector(){var _ios15,_ios16;
window._siBuckets=null;
_siInspectorGen++;
let _solverOpt;
try{_solverOpt=snapshotSolverOptions();}
catch(e){
_siInspectorSignature=null;
cancelAllSolveTasks('Invalid character stats');
const box=byId('si_at_results');if(box)box.innerHTML='<div style="color:#f44;">'+e.message+'</div>';
const target=byId('si_target_results');if(target)target.innerHTML='';
const modalBody=byId('si_submodal_body');if(modalBody)modalBody.textContent=e.message;
return;
}
const seedHex=uiVal('si_seed').trim()||'0000';
const seed=parseInt(seedHex,16);
const envType=parseInt(uiVal('si_env'));
const floorMR=parseInt(uiVal('si_mr'));
const userDeft=parseInt(uiVal('si_deft'))||0;
const n=parseInt(uiVal('si_n'))||0;
let groupSize=parseInt(uiVal('si_group_size'))||1;
const supSel1=byId('si_sup1');
const supSel2=byId('si_sup2');
const supPool=dwSupPool(envType,floorMR);
[supSel1,supSel2].forEach(sel=>{
const cur=sel.value;
if(sel.options.length!==supPool.length||(supPool.length>0&&sel.options[0].value!==supPool[0])){
sel.innerHTML='';
for(const hx of supPool){sel.options.add(new Option(getMonsterShieldName(hx),hx));}
sel.value=cur;
}
});
const tLvs=[
parseInt(uiVal('si_t1'))||0,
parseInt(uiVal('si_t2'))||0,
parseInt(uiVal('si_t3'))||0,
parseInt(uiVal('si_t4'))||0
];
const scanMax=parseInt(uiVal('si_scan_max'))||0;
const targetTotalStep=parseInt(uiVal('si_target_step'))||35;
const pSelect=byId('si_pattern');
const pTypeStr=pSelect.value;
const pType=AT_PAT[pTypeStr]||0;
if(isNaN(seed)){_siInspectorSignature=null;cancelAllSolveTasks('Invalid Inspector seed');return;}
const N=atPopIndex(n);
const{atN:atN_val,atN1:atN1_val}=getATPair(seed,N);
const monId=getMonsterIdByAT(atN_val,envType,floorMR);
const monName=getMonsterNameByAT(atN_val,envType,floorMR,monId);
const _md=monId?MONSTER_DB[monId]:null;
const encounterModel=getEncounterModel(envType,floorMR,monId);
const _isAlone=!!(encounterModel==null?void 0:encounterModel.isAlone);
if(_isAlone)groupSize=1;
const grpSel=byId('si_group_size');
grpSel.disabled=_isAlone;
if(_isAlone)grpSel.value='1';
if(_isAlone){
[supSel1,supSel2].forEach(s=>{s.innerHTML='<option disabled selected>Alone</option>';s.disabled=true;});
}else{
if((supSel1.disabled=groupSize<=1))supSel1.value='';
else if(!supSel1.value&&supPool.length)supSel1.value=supPool[0];
if((supSel2.disabled=groupSize<=2))supSel2.value='';
else if(!supSel2.value&&supPool.length)supSel2.value=supPool[0];
}
const _supId1=supSel1.value||null;
const _supId2=supSel2.value||null;
const _mdR=(md)=>md?md.d[3]:256;
const _mdN=(md)=>md?md.d[1]:128;
const rareRarity=groupSize>=2?[_mdR(_md),_mdR(_supId1?MONSTER_DB[_supId1]:_md),_mdR(_supId2?MONSTER_DB[_supId2]:_md)]:_mdR(_md);
const normRarity=groupSize>=2?[_mdN(_md),_mdN(_supId1?MONSTER_DB[_supId1]:_md),_mdN(_supId2?MONSTER_DB[_supId2]:_md)]:_mdN(_md);
const mapDeft=calcDeftness(atN1_val);
const atContext=battleATContext(N,mapDeft,userDeft);
const{canRound2}=atContext;
const[abs_1,abs_2,abs_4]=atContext.firstUnused;
let patternMsg="";
let foundOffset=-1;
let foundSequence=null;
let anchorEnd=-1;
const targetPatterns=SI_PATTERN_INDICES[pTypeStr];
const dropSlots=buildDropSlots(groupSize,rareRarity,normRarity,tLvs);
if(pType>0&&scanMax>0&&targetPatterns){
const founds=scanDropPatternStarts(seed,pTypeStr,dropSlots,Math.max(38,abs_1),N+scanMax,3);
const found=founds[0];
if(found){
foundOffset=battleATBudgets(atContext,found.start).d1;
foundSequence=found.simulation.seq;
anchorEnd=found.start;
for(let i=1;i<founds.length&&founds[i].start===anchorEnd+1;i++)anchorEnd=founds[i].start;
}
patternMsg=foundOffset!==-1?
C20+` <span class="si-highlight" style="color:#0f0;">AT +${abs_1+foundOffset}</span>`:`<span style="color:#888;">${scanMax}`+C21+`</span>`;
}
let battleStr="";
const inspectorKeys=[],inspectorProbes=[];
let seqHtml="";
if(pType>0&&foundOffset!==-1){
const budgets=battleATBudgetsForRun(atContext,abs_1+foundOffset,anchorEnd);
const{d1,d2,d4}=budgets;
seqHtml=siBuildSeqHtml(foundSequence);
const showCombos=d1>=0&&d1<=970;
const encounters=enumerateEncounterOutcomes(encounterModel);
if(showCombos){
const resultsByT=new Map();
const _pFmt=(p)=>{
if(!(p>0))return'';
const pc=p*100;
const txt=pc>=10?pc.toFixed(0):pc>=1?pc.toFixed(1):pc>=0.01?pc.toFixed(2):'<0.01';
return` <span style="color:#6a6;font-size:9px;">p≈${txt}%</span>`;
};
function _derivePlan(monGroups){
const p=deriveSolverBattlePlan(monGroups,monId,_solverMercyLv,false);
if(p.planType==='kill_mercy_clear')
return{type:p.planType,effMon:1+p.postAlive,postAlive:p.postAlive};
if(p.planType==='mercy_first')
return{type:p.planType,effMon:p.postAlive,postAlive:p.postAlive};
return{type:'kill_all',effMon:p.T,postAlive:0};
}
const _solverMercyLv=(_solverOpt.chars&&_solverOpt.chars.length)
?Math.max(..._solverOpt.chars.map(c=>c.lv||99)):99;
const _atForT=(t)=>battleATForCount(budgets,t);
const _fleeTask=(mg,t)=>({bat:_atForT(t),monGroups:mg,monId,mapDeft,userDeft,canRound2});
const _fleeState=(mg,t)=>{
if(_atForT(t)<0)return'flee';
const task=_fleeTask(mg,t);
const v=peekFleeVerdict(task,_solverOpt);
if(v===false)return'flee';
if(v==='fallback')return'fallback';
if(v==='block-pending')return'block-pending';
if(v===true)return'ok';
inspectorProbes.push(task);
return'pending';
};
const _pendTag=(st)=>st==='pending'
?' <span style="color:#888;font-size:9px;" title="solver judging">…</span>':'';
function _addResult(T,effMon,desc,monGroups,killAllDesc,fleeDesc){
if(!resultsByT.has(T))resultsByT.set(T,{mixes:[],flee:[],nextOrder:0});
const bucket=resultsByT.get(T);
const order=bucket.nextOrder++;
if(effMon<0){bucket.flee.push({order,desc});return;}
bucket.mixes.push({desc,monGroups,killAllDesc,fleeDesc,order});
}
for(const encounter of encounters){
const{total:T,monGroups:mg,probability}=encounter;
const inspectorTask=_fleeTask(mg,T);
if(inspectorTask.bat>=0)inspectorKeys.push(solverResultCacheKey(inspectorTask,_solverOpt));
if(T===1)continue;
const plan=_atForT(T)===0?{type:'kill_all',effMon:T,postAlive:0}:_derivePlan(mg);
const state=_fleeState(mg,T),pTag=_pFmt(probability);
const mainTag=`<span style="color:#f9c">${mergedSpeciesLabel(mg[0])}</span>`;
const labels=mg.slice(1).map(s=>mergedSpeciesLabel(s));
const supText=labels.length?'+'+labels.join('+'):'';
const mainPrefix=mainTag+(labels.length?' ':'');
const supTag=labels.length?`<span style="color:#a8f">${supText}</span>`:'';
const hp=labels.length===1?(((_ios16=((_ios15=getMonDB(mg[1].hex))==null?void 0:_ios15.s[0]))!=null?_ios16:0)):null;
const base=mainPrefix+(hp===null?supTag:`<span style="color:#a8f">${supText} HP${hp}</span>`);
const fleeDesc=mainPrefix+supTag+(hp===null?'':` <span style="color:#f44">HP${hp}</span>`)+pTag;
const killAllDesc=base+_pendTag(state)+pTag;
if(state==='flee')_addResult(T,-1,fleeDesc);
else if(state==='fallback')_addResult(T,T,base+pTag,mg,undefined,fleeDesc);
else if(plan.type==='kill_all')_addResult(T,T,killAllDesc,mg,undefined,fleeDesc);
else{
const label=!labels.length?L36:plan.type==='mercy_first'?L39:plan.postAlive>0?L38:L37;
const desc=mainPrefix+supTag+`<span style="color:#0f0"> ${label}→×${plan.effMon}</span>`+_pendTag(state)+pTag;
_addResult(T,plan.effMon,desc,mg,killAllDesc,fleeDesc);
}
}
window._siBuckets={d1,d2,d4,monId,mapDeft,userDeft,canRound2,resultsByT,
singleEncounter:encounters.find(e=>e.total===1)};
const _batBtn=(val,bk,lbl)=>`<span onclick="showSolverBucket('${bk}')" title="${L40}${lbl}${L41}" style="color:#fa0;font-weight:bold;font-size:15px;cursor:pointer;text-decoration:underline dotted;padding:0 3px;">${siFormatAT(val)}</span>`;
battleStr=`<div style="margin:2px 0;">${H06} ${_batBtn(d1,'d1','×1')} / ${_batBtn(d2,'d2','×2-3')} / ${_batBtn(d4,'d4','×4-5')}</div>`
+`<div style="color:#0aa;font-size:9px;margin:1px 0 0 0;">${L42}</div>`;
}
battleStr+=`<div style="color:#888;font-size:11px;margin-top:3px;">`+C22+`</div>`
+`<div style="margin-top:3px;">${seqHtml}</div>`;
}else{
const currentRng=advanceATRng(seed,abs_1-1);
const defaultSim=simulateDropSlots(currentRng,dropSlots,true);
seqHtml=siBuildSeqHtml(defaultSim.seq);
battleStr=`<div id="batLine1" style="margin:2px 0;">${H06} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_1}</span> <span style="color:#888;font-size:10px;">×1</span></div>`
+`<div id="batLine2" style="margin:2px 0;">${H06} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_2}</span> <span style="color:#888;font-size:10px;">×2-3</span></div>`
+`<div id="batLine3" style="margin:2px 0;">${H06} <span style="color:#fa0;font-weight:bold;font-size:14px;">${abs_4}</span> <span style="color:#888;font-size:10px;">×4-5</span></div>`
+`<div style="color:#888;font-size:11px;margin-top:3px;">`+C23+`</div>`
+`<div style="margin-top:3px;">${seqHtml}</div>`;
}
const activeKeys=Array.from(new Set(inspectorKeys)).sort();
const inspectorSignature=JSON.stringify(activeKeys);
if(inspectorSignature!==_siInspectorSignature){_siInspectorSignature=inspectorSignature;cancelAllSolveTasks('Inspector inputs changed',activeKeys,'probe');}
const inspectorGen=_siInspectorGen;
if(inspectorProbes.length){
Promise.all(inspectorProbes.map(t=>requestFleeVerdict(t,_solverOpt))).then((verdicts)=>{
if(inspectorGen===_siInspectorGen&&verdicts.every(v=>v!==null))updateSeedInspector();
});
}
const s_target=advanceATRng(seed,targetTotalStep);
const atTarget_val=atFromRng(s_target);
const _mainRR=Array.isArray(rareRarity)?rareRarity[0]:rareRarity;
const DropThreshold=dropATThreshold(_mainRR);
let firstThiefLv=tLvs[0]>0?tLvs[0]:99;
const ThiefThreshold=thiefATThreshold(_mainRR,firstThiefLv);
const resBox=byId('si_at_results');
resBox.innerHTML=`
<div style="display:flex;justify-content:space-between;">
<span>AT ${N}: <span class="si-highlight">${atN_val}</span> → ${monName}</span>
<span style="font-size:11px;">${patternMsg}</span>
</div>
<div>AT ${N+1}: <span style="color:#39C5BB;">${atN1_val}</span> ➔ `+G26+`: <span class="si-highlight">${mapDeft}</span></div>
<div style="margin-top:5px;padding-top:5px;border-top:1px dashed #335;">
${battleStr}
</div>`;
const targetBox=byId('si_target_results');
targetBox.innerHTML=`
<div>AT <span style="color:#fff;">${targetTotalStep}</span>: <span class="si-highlight" style="color:#f44;font-size:15px;">${atTarget_val}</span></div>
<div style="font-size:11px;margin-top:5px;color:#ccc;">
`+C25+` (≤${DropThreshold}): ${passesATThreshold(atTarget_val,DropThreshold)?'✅ '+L46:'❌ '+L47}<br>
`+C26+` (Lv${firstThiefLv} ≤${ThiefThreshold}): ${passesATThreshold(atTarget_val,ThiefThreshold)?'✅ '+L46:'❌ '+L47}
</div>`;
}
function openSeedInspector(){
byId('seedInspectorModal').style.display='flex';
updateSeedInspector();
}
function closeSeedInspector(e){
if(!e||e.target.className==='modal-close'){_siInspectorSignature=null;cancelAllSolveTasks('Seed Inspector closed');byId('seedInspectorModal').style.display='none';}
}
const debouncedUpdateSeedInspector=debounce(updateSeedInspector,100);
function buildSolverLegendHtml(){
const L=DISPLAY_LANG;
const legends=[
['🛡️',L==='EN'?'Shield block':L==='JP'?'盾ガード':'盾格擋'],
['⚔',L==='EN'?'Falcon Blade':L==='JP'?'はやぶさの剣':'隼劍'],
['🪡',L==='EN'?'Poison Needle':L==='JP'?'どくばり':'毒針'],
[L==='EN'?'(weapon)':'(武器)',L==='EN'?'×1.1':L==='JP'?'×1.1':'×1.1'],
['🗡',L==='EN'?'Metal Slime Sword/Spear':L==='JP'?'メタスラの剣／やり':'金屬史萊姆劍／槍'],
['🌀',L==='EN'?'Attribeauty':'風林火山'],
['💨',L==='EN'?'Miss (AT consumed)':L==='JP'?'ミス (AT消費あり)':'Miss (AT 照常消耗)'],
['👉',L==='EN'?'Target Support Monster but not Metal':L==='JP'?'メタルではなく仲間を指名':'瞄跟班、不瞄金屬'],
['🔱',L==='EN'?'Poker':L==='JP'?'きしんのまそう':'鬼神槍'],
];
return'<div style="font-size:9px;color:#666;margin:4px 0 2px 0;line-height:1.6;">'
+legends.map(([e,n])=>e+'<span style="color:#888;">'+n+'</span>').join('')
+'</div>';
}
function initSolverStatInputs(){
for(let i=1;i<=4;i++){
for(const f of SOLVER_STAT_FIELDS.filter(f=>!f.solverOnly)){const input=byId('si_'+f.dom+i);if(input){input.min=f.min;input.max=999;input.step=1;}}
const atk=byId('si_atk'+i);
if(atk){
atk.min=0;atk.max=999;atk.step=1;
atk.placeholder=T('Auto','自動');
atk.title=T('Final ATK override (0–999); leave blank to use STR plus equipment.','最終 ATK 覆寫（0–999）；空白時依 STR＋裝備自動計算。','最終攻撃力を指定（0–999）。空欄なら STR＋装備から自動計算。');
atk.setAttribute('aria-label','ATK '+i);
}
}
}
function applyJobStats(charNum){
const sel=byId('si_job'+charNum);
if(!sel||sel.value==='')return;
const job=VOC_STATS[parseInt(sel.value)];
if(!job)return;
for(const field of SOLVER_STAT_FIELDS.filter(f=>!f.solverOnly)){const el=byId('si_'+field.dom+charNum);if(el)el.value=job.s[field.preset];}
updateSeedInspector();
}
document.addEventListener('input',e=>{if(e.target.classList.contains('sv-stat'))debouncedUpdateSeedInspector();});
window._solverComboMap={};
window._solverComboId=0;
window._solverBucketId=0;
async function showBlockFallback(bucketId){
const st=window._solverBuckets&&window._solverBuckets[bucketId];
if(!st||!st.blocked)return;
if(st.request){
if(st.loading)return;
const request=st.request,gen=_siSolveGen,el=byId(request.elementId),prompt=byId(bucketId+'_blk');
if(!el||!prompt)return;
st.loading=true;prompt.textContent=L43;
try{
const result=await queueSolveTask(request.render,Object.assign({},request.options,{blockFallback:true,blockStages:request.stages}),request.idBase,request.bucketBase);
if(gen!==_siSolveGen||byId(request.elementId)!==el)return;
if(!result||typeof result.solvable!=='boolean'){
prompt.textContent=T('Result unknown — click to retry alternatives','結果未知，點擊重試替代方案','結果は不明です — クリックして代替案を再計算');
return;
}
Object.assign(window._solverComboMap,result.comboMap||{});
for(const[id,state]of Object.entries(result.buckets||{}))window._solverBuckets[id]=Object.assign({},state);
el.innerHTML=result.solvable?result.html:'<div style="font-size:9px;margin-left:16px;"><span style="color:#f44;">'+L44+'</span></div>';
st.blocked=false;
for(const id of Object.keys(result.buckets||{}))showBlockFallback(id);
setCachedSolverResult(solverResultCacheKey(request.render,request.options),result,request.idBase,request.bucketBase);
cacheFleeVerdictResult(request.render,request.options,result);
if(result.fallback&&request.killAllDesc){const desc=byId(request.descId);if(desc)desc.innerHTML=request.killAllDesc;}
}catch(e){
if(gen===_siSolveGen&&byId(request.elementId)===el)prompt.textContent=T('Calculation failed — click to retry alternatives','計算失敗，點擊重試替代方案','計算に失敗しました — クリックして代替案を再計算');
}finally{st.loading=false;}
return;
}
const rows=document.getElementsByClassName(bucketId+'_row');
for(let i=0;i<st.init;i++){if(rows[i])rows[i].style.display='';}
st.shown=st.init;
st.blocked=false;
const blkEl=byId(bucketId+'_blk');
if(blkEl)blkEl.style.display='none';
const moreEl=byId(bucketId+'_more');
if(moreEl&&st.shown<st.total)moreEl.style.display='';
}
function showMoreCombos(bucketId){
const st=window._solverBuckets&&window._solverBuckets[bucketId];
if(!st)return;
const SHOW_STEP=10;
const rows=document.getElementsByClassName(bucketId+'_row');
const next=Math.min(st.shown+SHOW_STEP,st.total);
for(let i=st.shown;i<next;i++){if(rows[i])rows[i].style.display='';}
st.shown=next;
const moreEl=byId(bucketId+'_more');
if(moreEl){
if(st.shown>=st.total)moreEl.style.display='none';
else moreEl.textContent='+'+(st.total-st.shown)+L09;
}
}
function expandCombo(id){
const el=byId('combo_detail_'+id);
if(!el)return;
if(el.innerHTML){el.style.display=el.style.display==='none'?'block':'none';return;}
const data=window._solverComboMap[id];
if(!data)return;
el.innerHTML=renderSolverSimTrace(data);
el.style.display='block';
}
function renderSolverSimTrace(data){
if(data.neutralConditions)return renderSolverNeutralDetails(data);
const{combo,killTargets,defend}=data;
if(!(killTargets==null?void 0:killTargets.length))return'<div style="color:#666;font-size:9px;margin-left:24px;">—</div>';
if(!data.battleProof)
return'<div style="color:#888;font-size:9px;margin-left:24px;">'+L19+'</div>';
const proof={...data.battleProof,useStats:true,usage:solverConditionStatUsage(combo,data.battleProof,killTargets)},chars=proof.party,assign=proof.assign;
const eggAssign=proof.eggAssign||data.eggAssign;
const eggTargets=solverConditionEggTargets(combo,eggAssign,proof.assign||assign,chars.length);
const rows=new Map((proof.actionResults||[]).map(r=>[r.ci,r]));
const initial=buildSimInstances(killTargets),names=solverTraceInstanceNames(initial,killTargets);
const sn=v=>DISPLAY_LANG==='EN'?(v.en||v.jp):v.jp;
const charLabel=c=>{
if(!c)return'?';
const role=L20+(c.slot||chars.indexOf(c)+1);
return role+(c.job!=null&&VOC_STATS[c.job]?' '+(DISPLAY_LANG==='EN'?VOC_STATS[c.job].en:VOC_STATS[c.job].jp):'');
};
const hpRange=i=>'HP'+Math.max(0,i.hpLow)+'~'+Math.max(0,i.hp);
const remainingText=left=>left.length?left.map(i=>'<b>'+names[i.index]+'</b> '+hpRange(i)).join(' / '):L28;
let html='<div style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:4px;margin-top:1px;">';
html+='<div style="color:#888;">'+L21+initial.map((i,index)=>'<b>'+names[index]+'</b> '+hpRange(i)).join(' / ')+'</div>';
for(let ci=0;ci<combo.length;ci++){
if(ci%SOLVER_ROUND_SIZE===0){
const acting=assign.slice(ci,ci+SOLVER_ROUND_SIZE),defenders=[0,1,2,3].filter(index=>!acting.includes(index));
html+='<div data-stats-round="'+(ci/SOLVER_ROUND_SIZE+1)+'" style="color:#789;">'+(ci?L06:L05)+(defenders.length?' · '+L34+defenders.map(index=>charLabel(chars[index])).join(', '):'')+'</div>';
}
const a=combo[ci],char=actorAt(chars,assign,ci),row=rows.get(ci);
const who='<span style="color:#6cf;font-size:8px;">'+charLabel(char)+'</span> ';
const lead='<div>'+L22+(ci+1)+L23+who;
const usage=proof.usage.find(row=>row.index===proof.assign[ci]),actionUsage=usage&&usage.actions.find(row=>row.ci===ci);
const statText=solverActionStatText(proof,ci);
const equipment=actionUsage&&WEAPON_META[actionUsage.equip]?' · '+L64+' '+solverConditionText(solverWeaponName(actionUsage.equip)):'';
const atStr=' · AT '+(a.at||0)+equipment+(statText?' · '+solverConditionText(statText):'');
if(a.jp==='おうえん'){
const target=eggTargets[ci],beneficiary=target===undefined?'?':
L20+((assign?assign[target]:target%4)+1)+' '+sn(combo[target]);
html+=lead+'<span style="color:#ff0;">'+sn(a)+'</span> → '+beneficiary+atStr+'</div>';
continue;
}
if(a.at===0&&getFourceEls(a.jp)){
html+=lead+'<span style="color:#f80;">'+sn(a)+'</span> → '+T('All allies','全員','味方全員')+' '+L30+atStr+'</div>';
continue;
}
if(!row){html+=lead+sn(a)+atStr+'</div>';continue;}
if(a.jp==='みのがす'){
const removed=row.targets.map(t=>names[t.index]);
html+=lead+'<span style="color:#0ff;">'+sn(a)+'</span>'+atStr+' → '+
(removed.length?removed.join(',')+L24:L25)+L27+remainingText(row.remaining)+'</div>';
continue;
}
const kind=SolverActionGate.targetKind(lookupSkill(a.jp)),hits=SolverActionGate.hits(a);
const mul=(eggAssign==null?void 0:eggAssign[ci])||1,metalOnly=row.targets.every(t=>isMetalHex(t.hex));
const mulStr=mul>1?'<span style="color:#ff0;">×'+mul+
(metalOnly?'':'＋'+tensionFlat(mul,(char==null?void 0:char.lv)||99))+'</span>':'';
const count=(kind==='A'||kind==='G')?' · '+T('Hits per enemy','每隻擊數','1体あたりの攻撃回数')+' '+hits+
' · '+T('Targets hit','命中')+' '+row.targets.length+' '+T('enemies','隻','体'):' · '+L65+' '+hits;
const detail=row.targets.map(t=>{
const ko=t.outcome==='ko',possible=t.outcome==='possible';
const before={hp:t.hpBefore,hpLow:t.hpLowBefore};
return names[t.index]+': '+hpRange(before)+'→<span style="color:'+
(ko?'#f44':possible?'#f80':'#8f8')+';">'+Math.max(0,t.hpLow)+'~'+Math.max(0,t.hp)+
'</span>'+(ko?L32:possible?L33:'');
}).join(' / ');
html+=lead+'<span style="color:#ccc;">'+sn(a)+(row.miss?' 💨':'')+'</span>'+mulStr+' ['+kind+']'+atStr+count+' → '+
detail+L27+remainingText(row.remaining)+'</div>';
}
if((defend==null?void 0:defend.length))html+='<div style="color:#789;margin-top:1px;">'+L34+
defend.map(i=>charLabel(chars[i])).join(', ')+'</div>';
return html+renderSolverPlanVariantRows(data)+'</div>';
}
const SOLVER_RESULT_CACHE_MAX=192;
const _solverResultCache=new Map();
const _solverResultPending=new Map();
window._solverResultCacheStats={hits:0,pendingHits:0,misses:0};
const solverCharsSig=(chars)=>(chars||[]).map(c=>{
const s=c.stats||{};
return[c.slot,c.lv,c.job,c.agi,s.atkOverride,s.might,s.str,s.mending,s.deft].join(',');
}).join(';');
function solverResultCacheKey(render,options){
const canRound2=solverAllowsRound2(render.mapDeft,render.canRound2);
const charSig=options.useStats?solverCharsSig(options.chars):'neutral';
return[DISPLAY_LANG,render.monId,render.bat,canRound2?1:0,render.userDeft,render.mapDeft,
options.useStats?1:0,options.multiPlayer?1:0,options.blockFallback?1:0,charSig,
(render.monGroups||[]).map(g=>[g.hex,g.count||1,g.death||0,g.isMain?1:0].join(':')).join(',')
].join('|');
}
function rebaseSolverCachedResult(entry,idBase,bucketBase){
const src=entry.result,idDelta=(idBase||0)-(entry.idBase||0);
const bucketDelta=(bucketBase||0)-(entry.bucketBase||0);
const html=(src.html||'')
.replace(/expandCombo\((\d+)\)/g,(_,n)=>'expandCombo('+(+n+idDelta)+')')
.replace(/combo_detail_(\d+)/g,(_,n)=>'combo_detail_'+(+n+idDelta))
.replace(/\bsb(\d+)(?=[_'"\s]|$)/g,(_,n)=>'sb'+(+n+bucketDelta));
const comboMap={};
for(const[id,value]of Object.entries(src.comboMap||{}))
comboMap[+id+idDelta]=Object.assign({},value);
const buckets={};
for(const[id,value]of Object.entries(src.buckets||{})){
const m=/^sb(\d+)$/.exec(id);
buckets[m?'sb'+(+m[1]+bucketDelta):id]=Object.assign({},value);
}
return Object.assign({},src,{html,comboMap,buckets});
}
function getCachedSolverResult(key,idBase,bucketBase){
const entry=_solverResultCache.get(key);
if(!entry)return null;
if(!entry.result.needsBlockFallback&&solverResultVerdict(entry.result)===null){_solverResultCache.delete(key);return null;}
_solverResultCache.delete(key);_solverResultCache.set(key,entry);
window._solverResultCacheStats.hits++;
return rebaseSolverCachedResult(entry,idBase,bucketBase);
}
function setCachedSolverResult(key,result,idBase,bucketBase){
const entry={result,idBase:idBase||0,bucketBase:bucketBase||0};
if(!result.needsBlockFallback&&solverResultVerdict(result)===null)return entry;
if(_solverResultCache.has(key))_solverResultCache.delete(key);
_solverResultCache.set(key,entry);
while(_solverResultCache.size>SOLVER_RESULT_CACHE_MAX)
_solverResultCache.delete(_solverResultCache.keys().next().value);
return _solverResultCache.get(key);
}
const snapshotSolverOptions=()=>({
chars:readCharStatsFromDom(),
useStats:solverUseStatsEnabled(),
multiPlayer:solverMultiPlayerEnabled()
});
const _fleeVerdict=new Map();
const _fleePending=new Map();
const FLEE_ID_BASE=900000,FLEE_BK_BASE=9000;
let _fleeProbeSeq=0;
const fleeVerdictKey=solverResultCacheKey;
function solverResultVerdict(result){
if(!result||result.needsKillAll||result.needsBlockFallback||typeof result.solvable!=='boolean')return null;
return result.solvable;
}
function peekFleeVerdict(task,opt){
const k=fleeVerdictKey(task,opt);
return _fleeVerdict.has(k)?_fleeVerdict.get(k):null;
}
function cacheFleeVerdictResult(task,opt,result,key=fleeVerdictKey(task,opt)){
if(result&&result.needsBlockFallback){_fleeVerdict.set(key,'block-pending');return'block-pending';}
const verdict=solverResultVerdict(result);
if(verdict===null)return null;
const solvable=verdict&&result.fallback?'fallback':verdict;
_fleeVerdict.set(key,solvable);
return solvable;
}
function requestFleeVerdict(task,opt){
const k=fleeVerdictKey(task,opt);
if(_fleeVerdict.has(k))return Promise.resolve(_fleeVerdict.get(k));
if(_fleePending.has(k))return _fleePending.get(k);
const solveGen=_siSolveGen;
const n=++_fleeProbeSeq;
const p=queueSolveTask(task,opt,FLEE_ID_BASE+n*100,FLEE_BK_BASE+n,'probe').then((m)=>{
if(solveGen!==_siSolveGen)return null;
return cacheFleeVerdictResult(task,opt,m,k);
}).catch(()=>null).finally(()=>{
if(_fleePending.get(k)===p)_fleePending.delete(k);
});
_fleePending.set(k,p);
return p;
}
const makeD1SolveTask=(b)=>b.singleEncounter?({
bat:b.d1,
monGroups:b.singleEncounter.monGroups,
monId:b.monId,
mapDeft:b.mapDeft,
userDeft:b.userDeft,
canRound2:b.canRound2
}):null;
function ensureSolverSubmodal(){
if(byId('si_submodal'))return;
const ov=document.createElement('div');
ov.id='si_submodal';
ov.style.cssText='display:none;position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:10001;background:rgba(0,0,0,0.78);align-items:flex-start;justify-content:center;padding:18px;overflow:auto;';
ov.onclick=(e)=>{if(e.target===ov)closeSolverBucket();};
ov.innerHTML='<div onclick="event.stopPropagation()" style="background:#0a0a1a;border:1px solid #0ff;border-radius:12px;max-width:920px;width:100%;max-height:90vh;overflow:auto;padding:14px;box-shadow:0 0 24px rgba(0,255,255,0.25);">'
+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;position:-webkit-sticky;position:sticky;top:0;background:#0a0a1a;padding-bottom:6px;border-bottom:1px solid #224;">'
+'<span id="si_submodal_title" style="color:#0ff;font-size:14px;font-weight:bold;"></span>'
+'<span onclick="closeSolverBucket()" style="cursor:pointer;color:#999;font-size:22px;line-height:1;padding:0 4px;">&times;</span>'
+'</div><div id="si_submodal_body"></div></div>';
document.body.appendChild(ov);
}
function closeSolverBucket(){
cancelAllSolveTasks('Solver view closed');
const ov=byId('si_submodal');
if(ov){ov.style.display='none';const b=byId('si_submodal_body');if(b)b.innerHTML='';}
}
function solverTaskOutputSignature(htmlStr,useStats){
const rawHtml=htmlStr||SOLVER_DASH;
const comboIds=[];
const comboPattern=/expandCombo\((\d+)\)/g;
let comboMatch;
while((comboMatch=comboPattern.exec(rawHtml))!==null)comboIds.push(comboMatch[1]);
const htmlSig=rawHtml
.replace(/expandCombo\(\d+\)/g,'expandCombo(#)')
.replace(/combo_detail_\d+/g,'combo_detail_#')
.replace(/sb\d+/g,'sb#');
const stable=(v)=>{
if(Array.isArray(v))return v.map(stable);
if(v&&typeof v==='object'){
const out={};
for(const k of Object.keys(v).sort())out[k]=stable(v[k]);
return out;
}
return v;
};
const rowSig=(r)=>[solverComboActionSignature(r.combo),JSON.stringify(stable(r.eggAssign||null)),
JSON.stringify(stable(r.assign||null)),JSON.stringify(stable(r.defend||null)),
useStats?(r.outcomeSig||''):''].join('\x1d');
const detailSig=comboIds.map(id=>{
const e=window._solverComboMap&&window._solverComboMap[id];
if(!e)return'missing:'+id;
return[rowSig(e),...(e.planVariants||[]).map(rowSig),'\x1f',...(e.skillVariants||[]).map(rowSig)].join('\x1e');
}).join('\x1c');
return htmlSig+'\x1b'+detailSig;
}
function showSolverBucket(bucket){
const b=window._siBuckets;
if(!b)return;
let options;
try{options=snapshotSolverOptions();}
catch(e){
window._siBuckets=null;
cancelAllSolveTasks('Invalid character stats');
ensureSolverSubmodal();
const title=byId('si_submodal_title');if(title)title.textContent='Solver';
const body=byId('si_submodal_body');if(body)body.innerHTML='<div style="color:#f44;">'+e.message+'</div>';
const modal=byId('si_submodal');if(modal)modal.style.display='flex';
return;
}
const viewGen=_siSolveGen+1;
ensureSolverSubmodal();
window._solverComboMap={};window._solverComboId=0;window._solverBucketId=0;window._solverBuckets={};
let html=buildSolverLegendHtml(),title='';
const tasks=[],taskElementIds=[],taskMeta=[];
const fleeSections=new Map();
const _hdr=(bat,tLbl)=>`<div style="margin:6px 0 2px 0;">${H06} <span style="color:#fa0;font-weight:bold;font-size:14px;">${siFormatAT(bat)}</span> <span style="color:#888;font-size:10px;">${tLbl}</span></div>`;
const _queueTask=(task,meta)=>{
const id='si_solver_task_'+viewGen+'_'+tasks.length;
tasks.push(task);taskElementIds.push(id);taskMeta.push(meta||null);
html+=`<div id="${id}"><div style="color:#39C5BB;font-size:10px;margin-left:16px;">${L43}</div></div>`;
};
if(bucket==='d1'){
title=`${H06} ${siFormatAT(b.d1)}｜${L40}×1`;
html+=_hdr(b.d1,'×1');
const task=makeD1SolveTask(b);
if(task)_queueTask(task);
else html+='<div style="color:#666;font-size:11px;margin-left:16px;">'+L45+'</div>';
}else{
const Ts=bucket==='d2'?[2,3]:[4,5];
const headBat=bucket==='d2'?b.d2:b.d4;
const headLbl=bucket==='d2'?'×2-3':'×4-5';
title=`${H06} ${siFormatAT(headBat)}｜${L40}${headLbl}`;
let any=false;
for(const T of Ts){
const entry=b.resultsByT&&b.resultsByT.get(T);
if(!entry||(entry.mixes.length===0&&entry.flee.length===0))continue;
any=true;
const tBat=battleATForCount(b,T);
html+=_hdr(tBat,'×'+T);
for(const m of entry.mixes){
const taskNo=tasks.length;
const rowId='si_solver_pattern_'+viewGen+'_'+taskNo;
const descId=rowId+'_desc';
html+=`<div id="${rowId}"><div id="${descId}" style="font-size:9px;margin-left:16px;color:#888;line-height:1.4;margin-bottom:1px;">${m.desc}</div>`;
_queueTask({bat:tBat,monGroups:m.monGroups,monId:b.monId,mapDeft:b.mapDeft,userDeft:b.userDeft,canRound2:b.canRound2},
{pattern:true,section:'T'+T,rowId,descId,desc:m.desc,
fleeDesc:m.fleeDesc||m.desc,fleeOrder:m.order,killAllDesc:m.killAllDesc});
html+='</div>';
}
const fleeRowId='si_solver_flee_'+viewGen+'_T'+T;
const fleeItemsId=fleeRowId+'_items';
const fleeItems=entry.flee.map(v=>({order:v.order,html:v.desc}));
const _fleeItemsHtml=()=>fleeItems.slice().sort((a,b)=>a.order-b.order)
.map(v=>v.html).join(' · ');
fleeSections.set('T'+T,{rowId:fleeRowId,itemsId:fleeItemsId,items:fleeItems});
html+=`<div id="${fleeRowId}" style="${fleeItems.length?'':'display:none;'}font-size:9px;margin-left:16px;"><span style="color:#f44;">${L44}</span> <span id="${fleeItemsId}">${_fleeItemsHtml()}</span></div>`;
}
if(!any)html+='<div style="color:#666;font-size:11px;margin-left:16px;">'+L45+'</div>';
}
cancelAllSolveTasks('Superseded by a new Solver view',tasks.map(task=>solverResultCacheKey(task,options)));
byId('si_submodal_title').innerHTML=title;
byId('si_submodal_body').innerHTML=html;
byId('si_submodal').style.display='flex';
if(tasks.length===0)return;
const ID_SPAN=100000,BK_SPAN=1000;
const _fill=(i,htmlStr)=>{
const el=byId(taskElementIds[i]);
if(el)el.innerHTML=htmlStr||SOLVER_DASH;
};
const taskResults=new Array(tasks.length);
let completedTasks=0;
const _mergeEquivalentPatterns=()=>{
const seen=new Map();
for(let i=0;i<tasks.length;i++){
const meta=taskMeta[i],result=taskResults[i];
if(!meta||!meta.pattern||!result||result.flee||result.needsBlockFallback)continue;
const sig=meta.section+'\x1a'+solverTaskOutputSignature(result.html,options.useStats);
if(!seen.has(sig)){seen.set(sig,i);continue;}
const keepMeta=taskMeta[seen.get(sig)];
if(!keepMeta.mergedDescs)keepMeta.mergedDescs=[keepMeta.desc];
keepMeta.mergedDescs.push(meta.desc);
const descEl=byId(keepMeta.descId);
if(descEl)descEl.innerHTML=keepMeta.mergedDescs.join('<br>');
const duplicateRow=byId(meta.rowId);
if(duplicateRow)duplicateRow.remove();
}
};
const _completeTask=(i,result)=>{
if(viewGen!==_siSolveGen)return;
if(result.comboMap)Object.assign(window._solverComboMap,result.comboMap);
if(result.buckets)Object.assign(window._solverBuckets,result.buckets);
const verdict=cacheFleeVerdictResult(tasks[i],options,result);
const meta=taskMeta[i];
if(result.needsBlockFallback){
const bucketId='sb'+i*BK_SPAN;
window._solverBuckets[bucketId]={blocked:true,request:{render:tasks[i],options,stages:result.blockStages,idBase:i*ID_SPAN,bucketBase:i*BK_SPAN,elementId:taskElementIds[i],descId:meta&&meta.descId,killAllDesc:meta&&meta.killAllDesc}};
const prompt='<div id="'+bucketId+'_blk" style="font-size:10px;margin-left:16px;color:#08c;cursor:pointer;" onclick="showBlockFallback(\''+bucketId+'\')">'+L17+'</div>';
taskResults[i]={html:prompt,flee:false,needsBlockFallback:true};
_fill(i,prompt);
completedTasks++;
if(completedTasks===tasks.length)_mergeEquivalentPatterns();
return;
}
if((verdict===false||verdict===null)&&(meta==null?void 0:meta.pattern)){
taskResults[i]={html:'',flee:true};
const section=fleeSections.get(meta.section);
if(section){
section.items.push({order:meta.fleeOrder,html:meta.fleeDesc});
const itemsEl=byId(section.itemsId);
const rowEl=byId(section.rowId);
if(itemsEl)itemsEl.innerHTML=section.items.slice().sort((a,b)=>a.order-b.order)
.map(v=>v.html).join(' · ');
if(rowEl)rowEl.style.display='';
}
const patternRow=byId(meta.rowId);
if(patternRow)patternRow.remove();
completedTasks++;
if(completedTasks===tasks.length)_mergeEquivalentPatterns();
return;
}
const resultHtml=(verdict===false||verdict===null)
?`<div style="font-size:9px;margin-left:16px;"><span style="color:#f44;">${L44}</span></div>`
:(result&&result.html!==undefined?result.html:'');
taskResults[i]={html:resultHtml,flee:false};
if(verdict==='fallback'&&(taskMeta[i]==null?void 0:taskMeta[i].killAllDesc)){
const descEl=byId(taskMeta[i].descId);
const fbDesc=taskMeta[i].killAllDesc;
if(descEl)descEl.innerHTML=fbDesc;
taskMeta[i].desc=fbDesc;
}
_fill(i,taskResults[i].html);
completedTasks++;
if(completedTasks===tasks.length)_mergeEquivalentPatterns();
};
tasks.forEach((task,i)=>{
queueSolveTask(task,options,i*ID_SPAN,i*BK_SPAN).then((m)=>{
if(viewGen!==_siSolveGen)return;
_completeTask(i,m);
}).catch((e)=>{
if(viewGen!==_siSolveGen)return;
console.warn('[Solver] Worker solve 失敗:',e&&e.message);
_fill(i,`<div style="font-size:9px;margin-left:16px;"><span style="color:#fa0;">${T('Worker failed. Result unknown.','Worker 失敗，結果未知。','Worker が失敗したため結果は不明です。')}</span></div>`);
completedTasks++;
if(completedTasks===tasks.length)_mergeEquivalentPatterns();
});
});
}
