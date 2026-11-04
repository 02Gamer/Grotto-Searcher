const RANKS={
"02":{fqMin:2,fqMax:55},
"38":{fqMin:56,fqMax:60},
"3D":{fqMin:61,fqMax:75},
"4C":{fqMin:76,fqMax:80},
"51":{fqMin:81,fqMax:100},
"65":{fqMin:101,fqMax:120},
"79":{fqMin:121,fqMax:140},
"8D":{fqMin:141,fqMax:160},
"A1":{fqMin:161,fqMax:180},
"B5":{fqMin:181,fqMax:200},
"C9":{fqMin:201,fqMax:220},
"DD":{fqMin:221,fqMax:248}
};
const BQ_MIN=2,BQ_MAX=248;
const BQ_D_MIN=245;
const LOCATION_SEED_MAX=0x7FFF;
const LOCATION_FQ_BANDS=[
{fqMin:2,fqMax:50,locationMax:47},
{fqMin:51,fqMax:80,locationMax:131},
{fqMin:81,fqMax:248,locationMax:150}
];
const QUEST015="Quest 015";
const QUEST015_EXC={seed:0x0032,fq:0x02,loc:5,bqFill:2};
const isQuest015InFQRange=(seed,fqMin,fqMax)=>seed===QUEST015_EXC.seed&&QUEST015_EXC.fq>=fqMin&&QUEST015_EXC.fq<=fqMax;
function hasConditionValue(raw){return raw!=null&&String(raw).trim()!=="";}
function parseBaseQuality(raw){
if(!hasConditionValue(raw))return null;
const value=Number(String(raw).trim());
return Number.isInteger(value)&&value>=BQ_MIN&&value<=BQ_MAX?value:NaN;
}
function parseLocationCode(raw){
if(!hasConditionValue(raw))return null;
const text=String(raw).trim();
if(!/^[0-9A-Fa-f]{1,2}$/.test(text))return NaN;
const value=parseInt(text,16);
return value>=0x01&&value<=0x96?value:NaN;
}
function getLocationBQFilters(conds){
const location=parseLocationCode(conds&&conds.location);
const baseQ=parseBaseQuality(conds&&conds.bq);
return{location,baseQ,valid:!Number.isNaN(location)&&!Number.isNaN(baseQ)};
}
function getLocationMax(finalQuality){
for(const band of LOCATION_FQ_BANDS)if(finalQuality<=band.fqMax)return band.locationMax;
return LOCATION_FQ_BANDS[LOCATION_FQ_BANDS.length-1].locationMax;
}
function locationFromR3(r3,finalQuality){return(r3%getLocationMax(finalQuality))+1;}
function calcFinalQuality(baseQ,r1){
const final=baseQ+Math.trunc(r1%BQ_MODULO[baseQ]-BQ_TENTH[baseQ]);
return final<BQ_MIN?BQ_MIN:final>BQ_MAX?BQ_MAX:final;
}
const BQ_MODULO=new Int32Array(256),BQ_TENTH=new Float64Array(256);
const BQ_FQ_LO=new Int32Array(256),BQ_FQ_HI=new Int32Array(256);
let BQ_D_FQ=BQ_MAX;
for(let b=BQ_MIN;b<=BQ_MAX;b++){
const m=Math.floor(b/10)*2+1;
BQ_MODULO[b]=m;
BQ_TENTH[b]=b/10;
let lo=BQ_MAX,hi=BQ_MIN;
for(let r=0;r<m;r++){
const f=calcFinalQuality(b,r);
if(f<lo)lo=f;
if(f>hi)hi=f;
}
BQ_FQ_LO[b]=lo;
BQ_FQ_HI[b]=hi;
if(b>=BQ_D_MIN&&lo<BQ_D_FQ)BQ_D_FQ=lo;
}
const bqScanRangeCache={};
function getBaseQScanRange(fqMin,fqMax){
const key=fqMin+':'+fqMax;
let r=bqScanRangeCache[key];
if(!r){
let lo=BQ_MIN,hi=BQ_MAX;
while(lo<=BQ_MAX&&BQ_FQ_HI[lo]<fqMin)lo++;
while(hi>=BQ_MIN&&BQ_FQ_LO[hi]>fqMax)hi--;
r=bqScanRangeCache[key]={lo,hi};
}
return r;
}
const BQ_FEAS_R1_END=0x8000;
let bqCountFeasibility=null,bqFeasWork=null;
function advanceBqCountFeasibility(untilR1){
if(bqCountFeasibility)return true;
if(!bqFeasWork){
const keys=Object.keys(RANKS),acc={};
for(const k of keys)acc[k]={minTotal:Infinity,minGroup:Infinity};
bqFeasWork={keys,acc,pre:new Int32Array(BQ_MAX+2),r1:0};
}
const w=bqFeasWork,pre=w.pre;
const cnt=(lo,hi)=>hi<lo?0:pre[hi]-pre[lo-1];
const end=untilR1<BQ_FEAS_R1_END?untilR1:BQ_FEAS_R1_END;
for(;w.r1<end;w.r1++){
pre.fill(0);
for(let bq=BQ_MIN;bq<=BQ_MAX;bq++)pre[calcFinalQuality(bq,w.r1)]++;
for(let q=1;q<pre.length;q++)pre[q]+=pre[q-1];
for(const k of w.keys){
const{fqMin,fqMax}=RANKS[k],tot=cnt(fqMin,fqMax);
if(tot===0)continue;
const a=w.acc[k];
if(tot<a.minTotal)a.minTotal=tot;
for(const band of LOCATION_FQ_BANDS){
const n=cnt(Math.max(fqMin,band.fqMin),Math.min(fqMax,band.fqMax));
if(n>0&&n<a.minGroup)a.minGroup=n;
}
}
}
if(w.r1<BQ_FEAS_R1_END)return false;
bqCountFeasibility=w.acc;
bqFeasWork=null;
return true;
}
function getBqCountFeasibility(){
if(!bqCountFeasibility)advanceBqCountFeasibility(BQ_FEAS_R1_END);
return bqCountFeasibility;
}
function isBqCountRankPossible(rank,mode){
const key=hex2(rank),info=RANKS[key];
if(!info)return true;
if(mode==='D'||mode==='Dp')return info.fqMax>=BQ_D_FQ;
if(mode==='1p'&&isQuest015InFQRange(QUEST015_EXC.seed,info.fqMin,info.fqMax))return true;
const f=getBqCountFeasibility()[key];
return(mode==='1'?f.minTotal:f.minGroup)===1;
}
function formatRanges(nums){
if(nums.length===0)return C16;
const s=[...nums].sort((a,b)=>a-b),ranges=[];
for(let i=0,j;i<s.length;i=j){
for(j=i+1;j<s.length&&s[j]===s[j-1]+1;j++);
ranges.push(j-1>i?`${s[i]}-${s[j-1]}`:`${s[i]}`);
}
return ranges.join(',');
}
let SEED_TO_TIMERS_CACHE=null;
function ensureSeedTimerCache(){
if(SEED_TO_TIMERS_CACHE)return;
SEED_TO_TIMERS_CACHE={};
for(let t=0;t<65536;t++){
const s=atFromRng(lcg(lcg(t)));
(SEED_TO_TIMERS_CACHE[s]||(SEED_TO_TIMERS_CACHE[s]=[])).push(t);
}
}
function timerToR1R3(timer){
const x1=lcg(timer);
return{r1:atFromRng(x1),r3:atFromRng(lcg(lcg(x1)))};
}
function calcLocations(seed,rStr){
const{fqMin,fqMax}=RANKS[rStr]||{fqMin:BQ_MIN,fqMax:BQ_MAX};
const seenLocations={},outputOrder=[];
const addLoc=(timer,loc,bqs)=>{
let set=seenLocations[loc];
if(!set){
set=seenLocations[loc]=new Set();
outputOrder.push({timer,location:loc,minBq:bqs[0]});
}
for(const bq of bqs)set.add(bq);
};
ensureSeedTimerCache();
const scan=getBaseQScanRange(fqMin,fqMax);
for(const timer of SEED_TO_TIMERS_CACHE[seed]||[]){
const{r1,r3}=timerToR1R3(timer);
const locToBq={};
for(let baseQ=scan.lo;baseQ<=scan.hi;baseQ++){
const finalQ=calcFinalQuality(baseQ,r1);
if(finalQ<fqMin||finalQ>fqMax)continue;
const calcLoc=locationFromR3(r3,finalQ);
(locToBq[calcLoc]||(locToBq[calcLoc]=[])).push(baseQ);
}
for(const loc in locToBq)addLoc(timer,+loc,locToBq[loc]);
}
if(isQuest015InFQRange(seed,fqMin,fqMax))addLoc(QUEST015,QUEST015_EXC.loc,[QUEST015_EXC.bqFill]);
outputOrder.sort((a,b)=>{
if(a.timer===QUEST015)return 1;
if(b.timer===QUEST015)return-1;
return a.timer!==b.timer?a.timer-b.timer:a.minBq-b.minBq;
});
return{outputOrder,seenLocations};
}
let _cachedLocData=null,_cachedLocSeed=null,_cachedLocRankKey=null;
function resetLocationCache(){_cachedLocData=_cachedLocSeed=_cachedLocRankKey=null;}
function getLocDataCached(seed,targetRankKey){
if(!Number.isInteger(seed)||seed<0||seed>LOCATION_SEED_MAX||targetRankKey==null)return null;
if(!peekLocDataCached(seed,targetRankKey)){
_cachedLocData=calcLocations(seed,targetRankKey);
_cachedLocSeed=seed;
_cachedLocRankKey=targetRankKey;
}
return _cachedLocData;
}
function peekLocDataCached(seed,targetRankKey){
return _cachedLocData&&_cachedLocSeed===seed&&_cachedLocRankKey===targetRankKey?_cachedLocData:null;
}
function matchesLocationBQ(locData,locNum,targetLocNum,targetBqNum){
const bqs=locData&&locData.seenLocations[locNum];
return!!bqs
&&(targetLocNum===null||locNum===targetLocNum)
&&(targetBqNum===null||bqs.has(targetBqNum));
}
function hex2(n){return n.toString(16).toUpperCase().padStart(2,'0');}
function hex4(n){return n.toString(16).toUpperCase().padStart(4,'0');}
function dispName(eng){return DISPLAY_LANG!=='EN'?eng.mapNameJP:eng.mapName;}
function dispBoss(eng){return DISPLAY_LANG!=='EN'?eng.bossNameJP:eng.bossName;}
function buildOnlyMonExpectedStr(conds){
if(!(conds&&conds.onlyMon))return'';
let name=conds.onlyMon;
if(DISPLAY_LANG!=='EN')for(const id in MONSTER_DB)if(MONSTER_DB[id].en===conds.onlyMon){name=MONSTER_DB[id].jp;break;}
return name+EL_ONLY;
}
function resolveRankKey(rStr,rankNum){
return RANKS[rStr]?rStr:rankNum!==undefined&&RANKS[rankNum]?rankNum:null;
}
const rankInfoList=ranks=>ranks.map(rank=>{const rStr=hex2(rank);return{rank,rStr,targetRankKey:resolveRankKey(rStr,rank)};});
function checkBasicConds(searchEngine,conds){
if(conds.prefix&&searchEngine._details[5]!=conds.prefix)return false;
if(conds.suffix&&searchEngine._details[6]!=conds.suffix)return false;
if(conds.locale&&searchEngine.MapLocale!=conds.locale)return false;
if(conds.lv&&searchEngine._details[4]!=conds.lv)return false;
if(conds.env&&searchEngine._details[3]!=conds.env)return false;
if(conds.monster&&searchEngine._details[2]!=conds.monster)return false;
if(conds.depth&&searchEngine._details[1]!=conds.depth)return false;
if(conds.boss&&searchEngine._details[0]!=conds.boss)return false;
return true;
}
function isCombinedElistMonsterSearch(conds){
return!!(conds&&conds.onlyMon)&&['2','3','4','PARTIAL_NONE'].includes(conds.elist);
}
function checkOnlyMonPossible(searchEngine,conds){
if(!(conds&&conds.onlyMon))return true;
const baseMR=searchEngine.monsterRank,maxFloorMR=floorMRAt(baseMR,searchEngine.floorCount-1);
for(let fMR=baseMR;fMR<=maxFloorMR;fMR++)if(matchesOnlyMonFloor(searchEngine._details[3],fMR,conds.onlyMon))return true;
return false;
}
function allBqsD(bqs){
for(const bq of bqs)if(bq<BQ_D_MIN)return false;
return true;
}
function checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey){
const{location,baseQ,valid}=getLocationBQFilters(conds);
if(!valid)return false;
const bqCount=conds.bqCount||"";
if(location===null&&baseQ===null&&!searchFilterLoc&&!bqCount)return true;
if(seed>LOCATION_SEED_MAX||targetRankKey==null)return false;
const locData=getLocDataCached(seed,targetRankKey);
if(!locData||locData.outputOrder.length===0)return false;
if(location!==null||baseQ!==null){
let found=false;
for(const o of locData.outputOrder)if(matchesLocationBQ(locData,o.location,location,baseQ)){found=true;break;}
if(!found)return false;
}
const sets=locData.seenLocations;
switch(bqCount){
case"1":{
const all=new Set();
for(const loc in sets)for(const bq of sets[loc])all.add(bq);
return all.size===1;
}
case"D":for(const loc in sets)if(!allBqsD(sets[loc]))return false;return true;
case"Dp":for(const loc in sets)if(allBqsD(sets[loc]))return true;return false;
case"1p":for(const loc in sets)if(sets[loc].size===1)return true;return false;
}
return true;
}
function checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc){
resetLocationCache();
return checkBasicConds(engine,conds)&&checkLocationBQ(seed,conds,searchFilterLoc,targetRankKey);
}
function makeDBadge(dValue){
return dValue>0?` <span style="background:#fa0;color:#000;padding:1px 4px;border-radius:3px;font-size:10px;">${dValue}</span>`:'';
}
function getElistMonsterBadge(envType,floorMR,targetCount,onlyMonNameStr){
const result={badge:'',isCombinedHit:false};
const spawnDb=getSpawnList(envType,floorMR);
if(!spawnDb.length)return result;
result.isCombinedHit=matchesOnlyMonFloor(envType,floorMR,onlyMonNameStr);
if(targetCount>0){
const names=[];
for(const e of spawnDb){
if(e.length<2)continue;
if(MONSTER_DB[e[0]])names.push(getMonsterDisplayName(e[0]));
if(names.length===targetCount)break;
}
if(names.length>0)result.badge=`<br><span style="display:inline-block;color:#aaa;font-size:11px;">${names.join(' + ')}</span>`;
}
return result;
}
function evalElistFloorHit(searchEngine,f,info,elistCond){
const{kind,count}=classifyElistState(info.state);
const targetCount=kind==='reduced'?count:0;
const isElistHit=targetCount>0&&elistCond===String(targetCount)
||elistCond==='PARTIAL_NONE'&&kind==='partial'
||elistCond==='ONLY'&&kind==='only'
||elistCond==='NONE'&&kind==='none'
||elistCond==='SIZE_15'&&searchEngine.di[f][2]===15;
return{targetCount,isElistHit};
}
function noteElistHit(result,info,text,f,done){
if(info.dValue>0)result.hasMatchedD=true;
if(done)return false;
if(!result.specialHitDetails.includes(text))result.specialHitDetails.push(text);
if(result.jumpToFloor===-1)result.jumpToFloor=f;
return true;
}
function checkElistAndD(searchEngine,conds,searchOnlyWithD,_onlyMonExpectedStr){
const result={match:true,specialHitDetails:[],jumpToFloor:-1,hasMatchedD:false};
const elist=conds.elist,multi=elist==='MULTI_SPECIAL';
if(!(elist||conds.onlyMon||searchOnlyWithD))return result;
const isCombinedSearch=isCombinedElistMonsterSearch(conds);
let hasAnyD=false;
let elistMatched=!isCombinedSearch&&!elist;
let onlyMatched=!isCombinedSearch&&!conds.onlyMon;
const specials=[];
const envType=searchEngine._details[3],baseMR=searchEngine._details[2];
for(let f=0;f<searchEngine.floorCount;f++){
const info=getFloorElistInfo(searchEngine,f);
if(!info.state)continue;
if(info.dValue>0)hasAnyD=true;
const{targetCount,isElistHit}=evalElistFloorHit(searchEngine,f,info,elist);
let monBadge='',isCombinedMatchedThisFloor=false;
if((targetCount>0&&(elist===String(targetCount)||(elist==='SIZE_15'&&isElistHit)))||(isCombinedSearch&&isElistHit)){
const badgeData=getElistMonsterBadge(envType,floorMRAt(baseMR,f),targetCount,isCombinedSearch?conds.onlyMon:null);
monBadge=badgeData.badge;
isCombinedMatchedThisFloor=badgeData.isCombinedHit;
}
const text=`B${f+1}F: ${info.state}${makeDBadge(info.dValue)}${monBadge}`;
specials.push({f,dValue:info.dValue,text});
if(isCombinedSearch){
if(isCombinedMatchedThisFloor&&noteElistHit(result,info,text,f,elistMatched))elistMatched=onlyMatched=true;
}else{
if(elist&&!multi&&isElistHit&&noteElistHit(result,info,text,f,elistMatched))elistMatched=true;
if(conds.onlyMon&&info.state.includes(_onlyMonExpectedStr)&&noteElistHit(result,info,text,f,onlyMatched))onlyMatched=true;
}
}
if(multi){
elistMatched=specials.length>=2;
if(elistMatched){
for(const s of specials){
if(!result.specialHitDetails.includes(s.text))result.specialHitDetails.push(s.text);
if(s.dValue>0)result.hasMatchedD=true;
}
if(result.jumpToFloor===-1)result.jumpToFloor=specials[0].f;
}
}
if((searchOnlyWithD&&!hasAnyD)||!elistMatched||!onlyMatched)result.match=false;
else if(searchOnlyWithD&&(elist||conds.onlyMon)&&!multi&&!result.hasMatchedD)result.match=false;
return result;
}
const ANOM_RULE={
tkb:{i18n:'TKB1_1',test:s=>[s.first.tkb!==-1,s.first.tkb]},
chamber:{i18n:'TKB2_1',iso:true,test:s=>[s.first.chamber!==-1,s.first.chamber]},
multi_chamber:{i18n:'TKB2_2',iso:true,test:s=>[s.chamberFloors>=2,s.first.chamber]},
multi_region:{i18n:'TKB2_3',iso:true,test:s=>[s.first.multiRegion!==-1,s.first.multiRegion]},
tkb_chamber:{i18n:'TKB1_2',iso:true,test:s=>[s.combo,s.first.tkb!==-1?s.first.tkb:s.first.chamber]},
nochest:{i18n:'TKB1_3',test:s=>[s.first.nochest!==-1,s.first.nochest]},
stair:{i18n:'TKB3_0',test:s=>[s.first.stair!==-1,s.first.stair]},
ghost:{i18n:'TKB3_1',test:s=>[s.first.ghost!==-1,s.first.ghost]},
softlock:{i18n:'TKB3_2',test:s=>[s.first.softlock!==-1,s.first.softlock]}
};
function anomRule(key){
switch(key){
case'tkb':return ANOM_RULE.tkb;
case'nochest':return ANOM_RULE.nochest;
case'chamber':return ANOM_RULE.chamber;
case'stair':return ANOM_RULE.stair;
case'ghost':return ANOM_RULE.ghost;
case'softlock':return ANOM_RULE.softlock;
case'multi_region':return ANOM_RULE.multi_region;
case'multi_chamber':return ANOM_RULE.multi_chamber;
case'tkb_chamber':return ANOM_RULE.tkb_chamber;
}
return null;
}
const ghostLineHtml=(f,at)=>`<span class="an-ghost" data-f="${f}">B${f+1}F ${TKB3_1}: ${at}</span>`;
function checkAnomalies(searchEngine,conds){
const result={match:true,anomalyDetails:[],jumpToFloor:-1};
const key=conds.anomaly;
if(key==="")return result;
const rule=anomRule(key),skipIso=!(rule&&rule.iso),det=result.anomalyDetails;
const first={tkb:-1,nochest:-1,chamber:-1,stair:-1,ghost:-1,softlock:-1,multiRegion:-1};
const mark=(k,f)=>{if(first[k]===-1)first[k]=f;};
let combo=false,chamberFloors=0;
for(let f=0;f<searchEngine.floorCount;f++){
const fl=`B${f+1}F `;
if(key==='softlock'){
if(searchEngine.isStairOverflow[f]){
det.push(`<span style="color:#fff;font-size:11px;font-weight:bold;background:#c00;padding:1px 4px;border-radius:3px;border:1px solid #f44;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${fl}${TKB3_2}</span>`);
mark('softlock',f);
}
continue;
}
if(key==='ghost'){
const gs=[];
scanGhostStairs(searchEngine.di[f],gs);
if(gs.length>0){
const at=gs.join(', ');
det.push(ghostLineHtml(f,at));
(result.ghost||(result.ghost=[])).push([f,at]);
mark('ghost',f);
}
continue;
}
const anom=getFloorAnomalies(searchEngine,f,skipIso);
if(anom.hasInaccessibleStair){
det.push(`<span style="color:#ff0000;font-size:11px;font-weight:bold;background:#550000;padding:1px 4px;border-radius:3px;">${fl}${TKB3_0}</span>`);
mark('stair',f);
}
if(anom.hasInaccessibleChest){
if(anom.totalChests===1){
det.push(`<span style="color:#0ff;font-size:11px;font-weight:bold;background:#004466;padding:1px 4px;border-radius:3px;border:1px solid #08a;">${fl}${TKB1_3}</span>`);
mark('nochest',f);
}else{
det.push(`<span style="color:#ff69b4;font-size:11px;font-weight:bold;">${fl}${TKB1_1}</span>`);
}
mark('tkb',f);
}
if(anom.hasChamber){
chamberFloors++;
if(anom.isolatedRegions.length>=2)mark('multiRegion',f);
const countBadges=anom.isolatedRegions.map(size=>`<span style="background:#ff6ec7;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;margin-left:4px;box-shadow:1px 1px 2px rgba(0,0,0,0.5);">${size}</span>`).join('');
det.push(`<span style="color:#fa0;font-size:11px;">${fl}${TKB2_1} ${countBadges}</span>`);
mark('chamber',f);
if(anom.hasInaccessibleChest)combo=true;
}
}
if(rule){
const[ok,jump]=rule.test({first,chamberFloors,combo});
if(ok)result.jumpToFloor=jump;
else result.match=false;
}
return result;
}
function rankCanDropInMRRange(r,numMin,numMax){
for(let num=numMin;num<=numMax;num++){
if(r>=TableF[(num-1)*4+1]&&r<=TableF[(num-1)*4+2])return true;
}
return false;
}
function getRankSMRInfo(rank,conds){
const c=conds||{},outside=(v,lo,hi)=>v<lo||v>hi;
if(hasConditionValue(c.bq)){
const bq=parseBaseQuality(c.bq),rankInfo=RANKS[hex2(rank)];
if(Number.isNaN(bq)||rankInfo&&(BQ_FQ_HI[bq]<rankInfo.fqMin||BQ_FQ_LO[bq]>rankInfo.fqMax))return null;
}
const[minSMR,maxSMR]=row4(TableC,8,rank,[1,9]);
if(c.monster&&outside(parseInt(c.monster),minSMR,maxSMR))return null;
const[floorLo,floorHi]=row4(TableB,9,rank,[2,16]);
if(c.depth&&outside(parseInt(c.depth),floorLo,floorHi))return null;
if(c.depth2&&parseInt(c.depth2)>floorHi)return null;
const[minBoss,maxBoss]=row4(TableD,9,rank,[1,12]);
if(c.boss&&outside(parseInt(c.boss),minBoss,maxBoss))return null;
if(c.lv){
const pick=(v,dft)=>v?parseInt(v):dft,clampLv=v=>v<1?1:v>99?99:v;
const base=(b,d,s)=>(b+d+s-4)*3;
const lvLo=clampLv(base(pick(c.boss,minBoss),pick(c.depth,floorLo),pick(c.monster,minSMR))-5);
const lvHi=clampLv(base(pick(c.boss,maxBoss),pick(c.depth,floorHi),pick(c.monster,maxSMR))+5);
if(outside(parseInt(c.lv),lvLo,lvHi))return null;
}
return{minSMR,maxSMR,maxFloorCount:c.depth?parseInt(c.depth):floorHi,minBoss,maxBoss};
}
function sharedRankFilter(ranksToSearch,conds,isBugSearch=false){
if(!getLocationBQFilters(conds).valid)return[];
if(conds.bqCount)ranksToSearch=ranksToSearch.filter(rank=>isBqCountRankPossible(rank,conds.bqCount));
if(!conds.onlyMon&&!conds.monster&&!hasConditionValue(conds.bq)&&!conds.hasBoxCond&&!conds.prefix&&!conds.suffix&&!conds.lv&&!conds.depth&&!conds.depth2&&!conds.boss)return ranksToSearch;
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
const{minSMR,maxSMR,maxFloorCount,minBoss,maxBoss}=info;
if(conds.prefix&&!rowsHit(TableH,5,minSMR,maxSMR,parseInt(conds.prefix)))return false;
if(conds.suffix&&!rowsHit(TableI,4,minBoss,maxBoss,parseInt(conds.suffix)))return false;
const maxFloor=isBugSearch?15:maxFloorCount-1;
if(conds.hasBoxCond){
const maxPossibleNum=floorMRAt(maxSMR,maxFloor);
for(let r=10;r>=1;r--)if(conds.reqBox[r]>0&&!rankCanDropInMRRange(r,minSMR,maxPossibleNum))return false;
}
if(!conds.onlyMon)return true;
const targetEnv=conds.env?parseInt(conds.env):0;
const smrStart=conds.monster?parseInt(conds.monster):minSMR,smrEnd=conds.monster?parseInt(conds.monster):maxSMR;
for(let env=1;env<=5;env++){
if(targetEnv&&env!==targetEnv)continue;
for(let fMR=1;fMR<=12;fMR++){
if(!matchesOnlyMonFloor(env,fMR,conds.onlyMon))continue;
for(let smr=smrStart;smr<=smrEnd;smr++)if(fMR>=smr&&fMR<=floorMRAt(smr,maxFloor))return true;
}
}
return false;
});
}
function getDispItem(enName){let trans=i18nDict['I_'+enName];return trans?String(trans).split('(')[0]:enName;}
const ITEMS_MILLIONAIRE=["Hero spear","Pruning knife","Wyrmwand","Wizardly whip","Beast claws","Attribeauty","Heavy hatchet","Megaton hammer","Pentarang","Metal slime sword","Metal slime spear"];
const ITEMS_MILLIONAIRE_BOX3=ITEMS_MILLIONAIRE.slice(0,7);
const ITEMS_S_WEAPONS=["Stardust sword","Poker","Deft dagger","Bright staff","Gringham whip","Knockout rod","Dragonlord claws","Critical fan","Bad axe","Groundbreaker","Meteorang","Angel's bow"];
const ITEMS_METAL_SLIME=["Metal slime sword","Metal slime spear","Metal slime shield","Metal slime armour","Metal slime helm","Metal slime gauntlets","Metal slime sollerets"];
const ITEM_GROUPS=new Map([['Millionaire',ITEMS_MILLIONAIRE],['S weapon',ITEMS_S_WEAPONS],['Metasla',ITEMS_METAL_SLIME]]);
function expandItemGroup(v){return ITEM_GROUPS.get(v)||[v];}
function getChestRanksForItems(itemNames){
const ranks=[];
for(let r=1;r<=10;r++){
for(let i=TableO[r-1];i<TableO[r];i++)if(itemNames.includes(TableR[TableQ[i]][0])){ranks.push(r);break;}
}
return ranks;
}
const chestRankFilter=(chestRanks,off)=>(ranks,conds)=>filterMapRanksBySMRAndChest(ranks,conds,[chestRanks],off);
function filterMapRanksBySMRAndChest(ranksToSearch,conds,chestRankGroups,targetFloorOffset){
return ranksToSearch.filter(rank=>{
const info=getRankSMRInfo(rank,conds);
if(!info)return false;
if(!chestRankGroups||chestRankGroups.length===0)return true;
let minFloor=0,maxFloor=info.maxFloorCount-1;
if(targetFloorOffset!=null){
minFloor=maxFloor=targetFloorOffset*4;
if(info.maxFloorCount<=minFloor)return false;
}
const minNum=floorMRAt(info.minSMR,minFloor),maxNum=floorMRAt(info.maxSMR,maxFloor);
return chestRankGroups.every(group=>group.some(r=>rankCanDropInMRRange(r,minNum,maxNum)));
});
}
const DEFAULT_USER_DEFT=999;
function calcDeftness(at){
const raw=Math.ceil(at/32768*100-2)*20;
return raw<=0?0:raw>999?1000:raw;
}
function formatDeftness(at){
const deft=calcDeftness(at);
const color=deft>=1000?'#f44':deft<=1?'#888':'#39C5BB';
const label=deft>=1000?'1000':deft<=0?'1':deft.toString();
return{deft,color,label};
}
const BAT_AT_MAX=970;
function siFormatAT(val){
if(val<-2)return'⊖';
if(val>BAT_AT_MAX)return'⊕';
return val;
}
const atPopIndex=n=>35+29*n;
function advanceATRng(seed,steps){
let rng=seed>>>0;
for(let i=0;i<steps;i++)rng=lcg(rng);
return rng;
}
function getATPair(seed,N){
const s=advanceATRng(seed,N);
return{atN:atFromRng(s),atN1:atFromRng(lcg(s))};
}
function battleATContext(N,mapDeft,userDeft){
const canRound2=userDeft>=mapDeft,first=N+(canRound2?3:4);
return{canRound2,firstUnused:[first,first+1,first+2]};
}
function battleATBudgets(context,target){
const u=context.firstUnused;
return{d1:target-u[0],d2:target-u[1],d4:target-u[2]};
}
function battleATBudgetsForRun(context,runStart,runEnd){
const last=Math.max(runStart,runEnd);
const pick=(k)=>Math.min(Math.max(context.firstUnused[k],runStart),last)-context.firstUnused[k];
return{d1:pick(0),d2:pick(1),d4:pick(2)};
}
const battleATForCount=(budget,count)=>count===1?budget.d1:count<=3?budget.d2:budget.d4;
const DEFAULT_RARE_RATE=256,DEFAULT_NORMAL_RATE=128;
function dropATThreshold(inverseRate){return inverseRate>0?Math.floor(32768/inverseRate):-1;}
function thiefATThreshold(inverseRate,level){if(!(inverseRate>0)||!(level>0))return-1;return Math.floor(32767/Math.floor(inverseRate*100/level))+1;}
function passesATThreshold(at,threshold){return at<=threshold;}
function formatATPtnHTML(extractLen,step,valsBuffer,hb){
const out=[];
for(let i=extractLen-1;i>=0;i--){
const v=valsBuffer[(step-i)%10];
out.push((hb&(1<<i))!==0?`<strong style="color:#f44;">${v}</strong>`:`<span style="color:#666;">${v}</span>`);
}
return out.join(', ');
}
function scanSeedForAtPattern(seed,maxSteps,threshold,pType,minStart){
const valsBuffer=new Int32Array(10),rows=AT_PATTERN_TABLES[pType]||[],foundByStart=new Map();
const noLowerBound=maxSteps<=50,effMinStart=noLowerBound?1:minStart;
let rng=seed,historyBits=0,validCount=0;
for(let step=1;step<=maxSteps;step++){
rng=lcg(rng);
const val=atFromRng(rng);
if(!noLowerBound&&step<38)continue;
historyBits=((historyBits<<1)|(passesATThreshold(val,threshold)?1:0))&1023;
valsBuffer[step%10]=val;
validCount++;
for(const row of rows){
if(validCount<row.length||!row.accept[historyBits&row.mask])continue;
const startStep=step-row.length+1;
if(startStep>=effMinStart&&!foundByStart.has(startStep)){
foundByStart.set(startStep,{start:startStep,valsHtml:formatATPtnHTML(row.length,step,valsBuffer,historyBits)});
}
}
}
return{foundOffsets:[...foundByStart.values()].sort((a,b)=>a.start-b.start)};
}
function LocaHtmlFromData(locData,conds){
if(!locData||locData.outputOrder.length===0)return"";
const{location,baseQ,valid}=getLocationBQFilters(conds);
if(!valid)return"";
const matchedLocs=[];
for(const o of locData.outputOrder)if(matchesLocationBQ(locData,o.location,location,baseQ))matchedLocs.push(hex2(o.location));
return matchedLocs.length>0
?`<span style="margin-left:4px;color:#ccc;font-size:10px;background:#222;padding:1px 4px;border-radius:3px;">${matchedLocs.join(' / ')}</span>`:"";
}
function getLocHtmlCached(seed,targetRankKey,conds){
const locData=getLocDataCached(seed,targetRankKey);
return locData?LocaHtmlFromData(locData,conds):"";
}
function matchReqBoxes(counts,reqBox){
const boxStr=[];
for(let r=10;r>=1;r--){
if(reqBox[r]>0){
if(counts[r-1]!==reqBox[r])return null;
boxStr.push(`${CHEST_RANK[r]}${reqBox[r]}`);
}
}
return boxStr.join(' ');
}
function ChestHtml(engine,conds){
if(!conds.hasBoxCond)return"";
const boxText=matchReqBoxes(engine._details2,conds.reqBox);
return boxText===null?null:`<span style="color:#fc0;font-size:11px;background:#420;padding:2px 4px;border-radius:3px;">${boxText}</span>`;
}
const fmtStep=v=>Number.isInteger(v)?''+v:v.toFixed(1);
const fmtStepD=v=>v==null?'—':fmtStep(v);
const minAstar=arr=>{const m=Math.min(...arr.map(v=>v==null?Infinity:v));return m===Infinity?null:m;};
const specialTagHtml=s=>`<span class="sp-tag">${s}</span>`;
const seedTagHtml=(seed,size)=>`<span style="color:#ffd700;font-weight:bold${size?`;font-size:${size}px;`:''}">${hex4(seed)}</span>`;
const rankTagHtml=rStr=>`<span style="color:#888">(Rank ${rStr})</span>`;
function buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,specialHitDetails,anomalyDetails,mid='',tail=''}){
const locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const specialHtml=specialHitDetails.length>0?`<div style="margin-top:4px;">${specialHitDetails.map(specialTagHtml).join('<br>')}</div>`:'';
const anomalyHtml=anomalyDetails.length>0?`<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;">${anomalyDetails.map(html=>html.replace('<span style="','<span style="display:inline-block;line-height:1.4;margin-top:4px;')).join('')}</div>`:'';
return`
${seedTagHtml(seed)}
${rankTagHtml(rStr)}<br>
<span style="color:#0ff;font-size:11px">${dispName(searchEngine)}</span>${locHtml}
${mid}
<div style="margin-top:4px;">${boxHtml}</div>
${specialHtml}
${anomalyHtml}
${tail}
`;
}
const matchJumpFloor=(elistResult,anomResult)=>elistResult.jumpToFloor!==-1?elistResult.jumpToFloor:anomResult.jumpToFloor;
function buildAtOffsetsHtml(foundOffsets){
return foundOffsets.map(o=>`<span style="color:#0ff;font-size:12px;">AT +${o.start} <span style="color:#888;">[${o.valsHtml}]</span></span>`).join('<br>');
}
function buildBattleAtDiffsHtml(foundOffsets,N,deft,userDeft=DEFAULT_USER_DEFT){
const context=battleATContext(N,deft,userDeft);
const lines=foundOffsets.map(o=>{
const{d1,d2,d4}=battleATBudgets(context,o.start);
return`<span class="at-dynamic-battle" data-target="${o.start}" style="font-size:11px;text-shadow:0 0 2px rgba(255,170,0,0.5);">${siFormatAT(d1)} / ${siFormatAT(d2)} / ${siFormatAT(d4)}</span>`;
}).join(`<br><span style="color:transparent;font-size:11px;">${H06} </span>`);
return`<span style="color:#fa0;margin-left:12px;font-size:11px;">${H06} ${lines}</span>`;
}
function buildAtInfoCardHtml(seed,N,atN,atN1,diffsHtml){
const{color:deftColor,label:deftLabel}=formatDeftness(atN1);
return`<div class="at-m-card" data-seed="${seed}" style="margin-top:4px;padding:5px 8px;background:#0a1a1a;border:1px solid #055;border-radius:3px;">
<span style="color:#4c4;font-size:11px;"><span class="at-m-atn-label">AT[${N}]: </span><span class="at-m-atval">${atN}</span></span>
<strong class="at-dynamic-mon" data-at="${atN}" style="color:#f8f;margin-left:8px;font-size:11px;text-shadow:0 0 2px rgba(255,136,255,0.5);"></strong>
<br><span class="at-m-deft" style="color:${deftColor};display:inline-block;margin-top:4px;font-size:11px;">${G18} ${deftLabel}</span>
${diffsHtml}</div>`;
}
function buildAtPatternBoxHtml(patternName,probText,offsetsHtml){
return`<div style="margin-top:4px;padding:4px 8px;background:#111;border:1px solid #333;border-radius:4px;">
<span style="color:#fa0;font-size:11px;font-weight:bold;">${patternName} (${probText})</span><br>${offsetsHtml}</div>`;
}
const SI_PATTERN_INDICES=Object.fromEntries(AT_O.map(([k,,p])=>[k,p]));
const isNormalDropPattern=key=>AT_O.some(o=>o[0]===key&&o[3]);
function rollDropSlot(nextAT,rareThreshold,normalThreshold){
const rareVal=nextAT(),rareHit=passesATThreshold(rareVal,rareThreshold);
const normalVal=rareHit?null:nextAT();
return{rareVal,rareHit,normalVal,normalHit:normalVal!==null&&passesATThreshold(normalVal,normalThreshold)};
}
function forEachDropSlot(gSize,tLevels,visit){
for(let bk=0;bk<=4;bk++){
if(bk&&!(tLevels[bk-1]>0))continue;
for(let m=0;m<gSize;m++)visit(m,bk);
}
}
function buildDropSlots(gSize,rRarity,nRarity,tLevels){
const rate=(rates,i)=>Array.isArray(rates)?(rates[i]!==undefined?rates[i]:rates[0]):rates;
const threshold=(rates,m,bk)=>bk?thiefATThreshold(rate(rates,m),tLevels[bk-1]):dropATThreshold(rate(rates,m));
const slots=[];
forEachDropSlot(gSize,tLevels,(m,bk)=>{
slots.push({gIdx:m,bk,rareThreshold:threshold(rRarity,m,bk),normalThreshold:threshold(nRarity,m,bk)});
});
return slots;
}
function simulateDropSlots(startRng,slots,recordSeq){
let rng=startRng>>>0,rngCount=0;
const seq=[],rareHits=[],normHits=[];
const nextAT=()=>{rng=lcg(rng);rngCount++;return atFromRng(rng);};
for(const slot of slots){
const first=rngCount+1,{gIdx,bk}=slot;
const draw=rollDropSlot(nextAT,slot.rareThreshold,slot.normalThreshold);
if(draw.rareHit)rareHits.push(first);
if(draw.normalHit)normHits.push(first+1);
if(recordSeq){
const row=(isR,val,red)=>({val,red,gIdx,isR,bk,
type:bk?`Book${bk} Group${gIdx+1} (${isR?'R':'N'})`:`Group${gIdx+1} Drop (${isR?'R':'N'})`});
seq.push(row(true,draw.rareVal,draw.rareHit));
if(draw.normalVal!==null)seq.push(row(false,draw.normalVal,draw.normalHit));
}
}
return{seq,rareHits,normHits};
}
function compileATPattern(patterns,normal){
return[...new Set(patterns.map(p=>p[p.length-1]))].sort((a,b)=>a-b).map(length=>{
const candidates=patterns.filter(p=>p[p.length-1]===length),accept=new Uint8Array(1<<length);
for(let bits=0;bits<accept.length;bits++){
let at=0;const hits=[];
const nextAT=()=>{const pos=at++;return pos<length&&(bits&(1<<(length-1-pos)))?0:1;};
while(at<length){
const first=at+1,draw=rollDropSlot(nextAT,0,0);
if(normal?draw.normalHit:draw.rareHit)hits.push(first+(normal?1:0));
}
accept[bits]=siMatchesPattern(hits,candidates)?1:0;
}
return{length,mask:(1<<length)-1,accept};
});
}
const AT_PATTERN_TABLES=Object.fromEntries(Object.entries(SI_PATTERN_INDICES)
.map(([key,patterns])=>[AT_PAT[key],compileATPattern(patterns,isNormalDropPattern(key))]));
function scanDropPatternStarts(seed,key,slots,firstStart,lastStart,limit=Infinity){
const patterns=SI_PATTERN_INDICES[key];
if(!patterns||firstStart>lastStart||limit<1)return[];
const normal=isNormalDropPattern(key),out=[];
let rng=advanceATRng(seed,firstStart-1);
for(let start=firstStart;start<=lastStart;start++){
const sim=simulateDropSlots(rng,slots,false);
if(siMatchesPattern(normal?sim.normHits:sim.rareHits,patterns)){
out.push({start,simulation:simulateDropSlots(rng,slots,true)});
if(out.length>=limit)break;
}
rng=lcg(rng);
}
return out;
}
function siMatchesPattern(hits,patterns){
if(!patterns)return false;
next:for(const p of patterns){
if(hits.length<p.length)continue;
for(let i=0;i<p.length;i++)if(hits[i]!==p[i])continue next;
return true;
}
return false;
}
function initItemI18n(){
TableR.forEach(pair=>{i18nDict['I_'+pair[0]]=T(pair[0],pair[1]);});
Object.assign(i18nDict,{"I_Millionaire":T("Millionaire","大富豪"),"I_S weapon":T("S weapon","S武器")});
}
const SEED_SETUP={
ultimate:(engine,job)=>{
engine.trackOverflow=(job.conds.anomaly==='softlock'||job.conds.anomaly==='ghost');
job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);
},
item:null,
multibug:(engine,job)=>{job._onlyMonExpectedStr=buildOnlyMonExpectedStr(job.conds);},
fastest:(engine,job)=>{
SEED_SETUP.ultimate(engine,job);
engine.force_16_floors=(job.params.fastestMode==='maxtile');
}
};
const CHEST_TIMER_OFFSET=5;
const meetsQuickloadBasicReq=(eng,p,conds)=>eng.floorCount>=(p.isB9F?9:3)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isB9F?2:0).length>0;
const ITEM_BASIC_REQS={
free:(eng,p)=>eng.floorCount>=p.reqFloorCount,
quickload:meetsQuickloadBasicReq,
quickload9:meetsQuickloadBasicReq,
quickload9all:(eng,p,conds)=>eng.floorCount>=2&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],null).length>0,
third:(eng,p,conds)=>eng.floorCount>=(p.isS3?14:4)&&filterMapRanksBySMRAndChest([eng.MapRank],conds,[p.chestRanks],p.isS3?3:0).length>0,
jfire:eng=>eng.monsterRank===9&&eng.floorCount>=9,
tk:eng=>eng.floorCount>=3,
};
const QL_MARK_5={sec:0,mk:'⑤',mkColor:'#7fd4ff'},QL_MARK_9={sec:4,mk:'⑨',mkColor:'#b19cd9'};
const getQuickloadMark=(p)=>(p.qlSec===0?QL_MARK_5:QL_MARK_9);
const QL_SOLO={sec:1,mk:STR_SOLO,mkColor:'#f9b'},QL_PARTY={sec:2,mk:STR_PARTY,mkColor:'#ffd700'};
function scanQuickloadFloors(eng,p,modeA,modeB){
const checkSet=new Set(p.checkItems),hitTypes=[],multi=[];
const useB10=!!(p.checkB10&&p.isB9F);
let firstHitFloor=-1,astarBoxes=null,astarFloor=-1;
for(const f of useB10?[8,9]:p.targetFloors){
if(f>=eng.floorCount)continue;
const prefixStr=(p.isB9F&&!useB10)?'B9F ':`B${f+1}F `;
let boxes=null,fHtml='';
for(let i=0;i<2;i++){
const mode=i===0?modeA:modeB;
if(!mode)break;
const names=eng.getFloorItemNames(f,mode.sec),hitIdx=[];
for(let b=0;b<names.length;b++)if(checkSet.has(names[b]))hitIdx.push(b);
if(hitIdx.length<p.reqCount)continue;
const line=`<span style="color:${mode.mkColor};font-size:11px">${prefixStr}${mode.mk} x${hitIdx.length}</span>`;
hitTypes.push(line);
fHtml=fHtml?fHtml+'<br>'+line:line;
if(boxes===null)boxes=hitIdx;
}
if(boxes===null)continue;
if(firstHitFloor===-1){
firstHitFloor=f;
if(p.wantAstar){astarFloor=f;astarBoxes=boxes;}
}
if(useB10)multi.push({floor:f,displayHtml:fHtml,astar:calcSameFloorChestChainCost(eng,f,boxes),isB10:f===9,isX3:boxes.length>p.reqCount});
}
if(useB10)return multi.length>0?{isHit:true,multi}:{isHit:false};
if(hitTypes.length===0)return{isHit:false};
const res={isHit:true,jumpFloor:firstHitFloor,displayHtml:hitTypes.join('<br>')};
if(astarBoxes){
res.astar=calcSameFloorChestChainCost(eng,astarFloor,astarBoxes);
if(astarBoxes.length>p.reqCount)res.astarX3=true;
}
return res;
}
function scanWpFirstTwo(eng,p,fIdx,uniSec,wpSet,soloColor,hits,soloIdx,partyIdx){
const soloNames=eng.getFloorItemNames(fIdx,uniSec==null?1:uniSec);
const partyNames=uniSec==null?eng.getFloorItemNames(fIdx,2):soloNames;
let found=false;
const limit=Math.min(2,soloNames.length);
for(let b=0;b<limit;b++){
const s=soloNames[b],pp=partyNames[b];
const sHit=wpSet.has(s),pHit=wpSet.has(pp);
if(!sHit&&!pHit)continue;
const t=uniSec!=null?`${uniSec+CHEST_TIMER_OFFSET}s`:(sHit&&pHit)?STR_BOTH:(pHit?STR_PARTY:STR_SOLO);
const color=uniSec!=null?getQuickloadMark(p).mkColor:t===STR_PARTY?"#ffd700":soloColor;
const rName=CHEST_RANK[eng.getBoxInfo(fIdx,b).rank]||'?';
hits.push(`<span style="color:${color};font-size:11px">B${fIdx+1}F ${rName}${b+1}: ${getDispItem(pHit?pp:s)} (${t})</span>`);
if(sHit)soloIdx.push(b);
if(pHit)partyIdx.push(b);
found=true;
}
return found;
}
const JFIRE_WP_SET=new Set(["Sainted soma"]);
function getWpChestCases(wpPartyIdx,wpSoloIdx){
const same=wpPartyIdx.length===wpSoloIdx.length&&wpPartyIdx.every((v,i)=>v===wpSoloIdx[i]);
if(same)return wpPartyIdx.length?[wpPartyIdx]:[];
const cs=[];
if(wpPartyIdx.length)cs.push(wpPartyIdx);
if(wpSoloIdx.length)cs.push(wpSoloIdx);
return cs;
}
function setWpTargetAstar(eng,o,wpFloor,fIdx,wpPartyIdx,wpSoloIdx){
const d=eng.di[fIdx],tgt=[{g:fIdx,gx:d[17],gy:d[18]}];
const vals=getWpChestCases(wpPartyIdx,wpSoloIdx).map(bx=>calcCrossFloorChestRouteCost(eng,wpFloor,bx,tgt));
o.astar=minAstar(vals);
if(vals.length===2)o.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
function checkTKThirdChest(eng,floor,checkSec,laterSec,targets,laterTargets){
let valid=false,item="",rank="";
if(eng.floorCount>floor&&eng.getBoxCount(floor)>=3){
item=eng.getBoxItem(floor,2,checkSec)[0];
rank=CHEST_RANK[eng.getBoxInfo(floor,2).rank]||'?';
valid=targets.includes(item)&&!laterTargets.includes(eng.getBoxItem(floor,2,laterSec)[0]);
}
return{valid,item,rank};
}
const DUNGEON_CHECKERS={
free:(eng,p)=>{
const groupHits=[],used=new Map();
for(const g of p.groups){
const f=g.floor-1;
if(f>=eng.floorCount)return{isHit:false};
const bCount=eng.getBoxCount(f);
let gHtmlStr=null;
for(let b=0;b<bCount&&gHtmlStr===null;b++){
if((g.boxIdx===0||g.boxIdx===1||g.boxIdx===2)?b!==g.boxIdx:g.boxIdx===3&&b>=2)continue;
const rank=eng.getBoxInfo(f,b).rank;
if(g.rank>0&&rank!==g.rank)continue;
const key=f+'_'+b,u=used.get(key);
const head=`<span style="color:#ffd700;font-size:11px;">B${f+1}F ${CHEST_RANK[rank]}${b+1} `;
if(!g.items&&g.timerVal===-1){
if(u)continue;
used.set(key,true);
gHtmlStr=head+'(Any)</span>';
continue;
}
if(u===true)continue;
const s0=g.timerVal===-1?0:Math.max(0,g.timerVal-CHEST_TIMER_OFFSET),s1=g.timerVal===-1?255:s0;
for(let s=s0;s<=s1;s++){
if(u&&u.has(s))continue;
const itemEN=eng.getBoxItem(f,b,s)[0];
if(g.items===null||g.items.includes(itemEN)){
if(u)u.add(s);else used.set(key,new Set([s]));
gHtmlStr=head+`(${s+CHEST_TIMER_OFFSET}s): ${getDispItem(itemEN)}</span>`;
break;
}
}
}
if(gHtmlStr===null)return{isHit:false};
groupHits.push(gHtmlStr);
}
return{isHit:true,jumpFloor:p.groups[0].floor-1,displayHtml:groupHits.join('<br>'),specialStyle:"1px solid #08c"};
},
quickload:(eng,p)=>scanQuickloadFloors(eng,p,QL_SOLO,QL_PARTY),
quickload9:(eng,p)=>scanQuickloadFloors(eng,p,getQuickloadMark(p)),
quickload9all:(eng,p)=>{
const{sec,mk,mkColor}=getQuickloadMark(p);
const checkSet=new Set(p.checkItems),anchorSet=new Set(p.anchorFloors||[]),hitFloors=[];
let anchorHit=false;
for(let f=0;f<eng.floorCount;f++){
const names=eng.getFloorItemNames(f,sec);
let cnt=0;
for(let b=0;b<names.length;b++)if(checkSet.has(names[b]))cnt++;
const isAnchor=anchorSet.has(f);
if(cnt>=(isAnchor?p.anchorThreshold:p.otherThreshold)){
hitFloors.push({f,cnt});
if(isAnchor)anchorHit=true;
}
}
const oneOK=!p.needOneWith||hitFloors.some(h=>h.cnt>=p.needOneWith);
if(hitFloors.length<2||(anchorSet.size>0&&!anchorHit)||!oneOK)return{isHit:false};
const parts=hitFloors.map(h=>`<span style="color:${mkColor};font-size:11px">B${h.f+1}F ${mk} x${h.cnt}</span>`);
return{isHit:true,jumpFloor:hitFloors[0].f,displayHtml:parts.join('<br>')};
},
third:(eng,p)=>{
const[f1,f2]=p.targetFloors;
if(eng.getBoxCount(f1)<3||eng.getBoxCount(f2)<3)return{isHit:false};
if(p.isS3&&(eng.getBoxInfo(f1,2).rank!==10||eng.getBoxInfo(f2,2).rank!==10))return{isHit:false};
const p1=eng.getBoxItem(f1,2,2)[0],p2=eng.getBoxItem(f2,2,2)[0];
const r1=CHEST_RANK[eng.getBoxInfo(f1,2).rank]||'?',r2=CHEST_RANK[eng.getBoxInfo(f2,2).rank]||'?';
if(!p.checkItems.includes(p1)||!p.checkItems.includes(p2))return{isHit:false};
const res={
isHit:true,jumpFloor:f1,
displayHtml:`<span style="color:${p.colorStyle};font-size:11px">B${f1+1}F ${r1}3: ${getDispItem(p1)}<br>B${f2+1}F ${r2}3: ${getDispItem(p2)}</span>`
};
if(p.wantAstar){
const d1=eng.di[f1],d2=eng.di[f2];
const sumLegs=(...legs)=>legs.some(v=>v==null)?null:legs.reduce((a,b)=>a+b,0);
const prefix=calcWalkCostUpToFloor(eng,f1);
const forward=sumLegs(
prefix,
calcPointWalkCost(eng,f1,d1[4],d1[5],d1[17],d1[18]),
calcCrossFloorLegCost(eng,f1,d1[17],d1[18],f2,d2[17],d2[18])
);
const reverse=sumLegs(
prefix,
calcCrossFloorLegCost(eng,f1,d1[4],d1[5],f2,d2[17],d2[18]),
calcCrossFloorLegCost(eng,f2,d2[17],d2[18],f1,d1[17],d1[18])
);
const vals=[forward,reverse];
res.astar=minAstar(vals);
res.astarText=vals.map(fmtStepD).join(' / ');
res.astarTitle=''+T('Forward / Reverse full A* route','順走 / 逆走完整 A* 路線','順走 / 逆走の完全 A* ルート');
}
return res;
},
jfire:(eng,p)=>{
const uniSec=p.qlSec;
const shift=uniSec==null?0:uniSec-2;
const SOMA="Sainted soma",ELIXIR="Sage's elixir";
const scanWp=(wpFloor,thirdFloors,chooseShortest)=>{
if(wpFloor>=eng.floorCount)return null;
const wpBoxCount=eng.getBoxCount(wpFloor);
const wpHits=[],wpSoloIdx=[],wpPartyIdx=[];
const wpMet=scanWpFirstTwo(eng,p,wpFloor,uniSec,JFIRE_WP_SET,"#f9d",wpHits,wpSoloIdx,wpPartyIdx);
if(!wpMet||(wpBoxCount>=3&&eng.getBoxItem(wpFloor,2,2+shift)[0]===SOMA))return null;
const targets=[];
for(const fIdx of thirdFloors){
if(fIdx>=eng.floorCount||eng.getBoxCount(fIdx)<3||eng.getBoxInfo(fIdx,2).rank!==10)continue;
const pItem=eng.getBoxItem(fIdx,2,2+shift)[0];
if(pItem!==SOMA&&pItem!==ELIXIR)continue;
const target={floor:fIdx,det:`B${fIdx+1}F S3: ${getDispItem(pItem)}`};
if(p.wantAstar)setWpTargetAstar(eng,target,wpFloor,fIdx,wpPartyIdx,wpSoloIdx);
targets.push(target);
}
if(targets.length===0)return null;
let best=targets[0];
if(chooseShortest&&p.wantAstar){
const cost=t=>t.astar==null?Infinity:t.astar;
for(let i=1;i<targets.length;i++)if(cost(targets[i])<cost(best))best=targets[i];
}
const res={isHit:true,jumpFloor:wpFloor,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${best.det}</span>`};
if(p.wantAstar){
res.astar=best.astar;
if(best.astarText!==undefined)res.astarText=best.astarText;
}
return res;
};
const main=scanWp(8,[8,9],false);
if(!p.wantAstar)return main||{isHit:false};
const extra=scanWp(9,[8,9,10],true);
const multi=[];
if(main)multi.push(Object.assign({floor:8,isJfireB10:false},main));
if(extra)multi.push(Object.assign({floor:9,isJfireB10:true},extra));
return multi.length>0?{isHit:true,multi}:{isHit:false};
},
tk:(eng,p)=>{
const wpSet=new Set(p.wpTargets),wpHits=[],wpSoloIdx=[],wpPartyIdx=[];
const uniSec=p.qlSec;
const shift=uniSec==null?0:uniSec-2;
const checkWp=(fIdx)=>fIdx<eng.floorCount&&scanWpFirstTwo(eng,p,fIdx,uniSec,wpSet,"#f9b",wpHits,wpSoloIdx,wpPartyIdx);
if(p.isMonsterBox){
if(!checkWp(2)||!(eng.floorCount>2&&eng.getBoxCount(2)>=3))return{isHit:false};
const b3Rank=CHEST_RANK[eng.getBoxInfo(2,2).rank]||'?';
for(let s=p.minSec+shift;s<=p.maxSec+shift;s++){
if(eng.getBoxItem(2,2,s)[0]!==p.targetItem)continue;
const matDet=`B3F ${b3Rank}3 (${s+CHEST_TIMER_OFFSET}s): ${getDispItem(p.targetItem)}`;
const res={isHit:true,jumpFloor:2,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#f66;font-size:11px;font-weight:bold;">${matDet}</span>`,specialStyle:"1px solid #f66"};
if(p.wantAstar)setWpTargetAstar(eng,res,2,2,wpPartyIdx,wpSoloIdx);
return res;
}
return{isHit:false};
}
const wpFloor=checkWp(2)?2:checkWp(3)?3:-1;
if(wpFloor===-1)return{isHit:false};
const strict=p.strictMatTargets,targetsFor=fl=>p.isMillionaire&&wpFloor!==fl?p.broadMatTargets:strict;
const checkSec=(p.isMillionaire?2:8)+shift;
const labelText=p.isMillionaire?"":`(${checkSec+CHEST_TIMER_OFFSET}s)`;
const b3=checkTKThirdChest(eng,2,checkSec,20+shift,targetsFor(2),strict);
const b4=checkTKThirdChest(eng,3,checkSec,20+shift,targetsFor(3),strict);
if(!b3.valid&&!b4.valid)return{isHit:false};
const c2Met=b3.valid&&b4.valid;
const det=(name,c)=>`${name} ${c.rank}3 ${labelText}: ${getDispItem(c.item)}`;
const matDet=c2Met?det('B3F',b3)+'<br>'+det('B4F',b4):b3.valid?det('B3F',b3):det('B4F',b4);
const res={isHit:true,jumpFloor:wpFloor,displayHtml:`${wpHits.join('<br>')}<br><span style="color:#11F514;font-size:11px">${matDet}</span>`,specialStyle:c2Met?"1px solid #fa0":""};
if(p.wantAstar){
const t3=b3.valid?{g:2,gx:eng.di[2][17],gy:eng.di[2][18]}:null;
const t4=b4.valid?{g:3,gx:eng.di[3][17],gy:eng.di[3][18]}:null;
const cost=(bx,tgts)=>calcCrossFloorChestRouteCost(eng,wpFloor,bx,tgts);
const cases=getWpChestCases(wpPartyIdx,wpSoloIdx);
if(cases.length===1){
if(c2Met){
const a3=cost(cases[0],[t3]),a4=cost(cases[0],[t4]),ab=cost(cases[0],[t3,t4]);
res.astar=minAstar([a3,a4,ab]);
res.astarText=`${fmtStepD(a3)} / ${fmtStepD(a4)} / ${fmtStepD(ab)}`;
}else{
res.astar=cost(cases[0],[t3||t4]);
}
}else if(cases.length===2){
const vals=cases.map(bx=>c2Met?minAstar([cost(bx,[t3]),cost(bx,[t4]),cost(bx,[t3,t4])]):cost(bx,[t3||t4]));
res.astar=minAstar(vals);
res.astarText=`${fmtStepD(vals[0])} / ${fmtStepD(vals[1])}`;
}
}
return res;
}
};
function countFloorTiles(eng,f){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return 0;
let count=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(isMainWalkable(di[(y<<4)+x+792]))count++;}
return count;
}
const MAXTILE_DIMS=[16,15,14,13,12,11,10];
const MAXTILE_REP_FLOORS=[0,4,8,12];
const MAXTILE_CHEST_VARIANT_FLOORS=[2,3];
const MAXTILE_EDGE_SEED=0x7FFF;
const MAXTILE_EDGE_FLOORS=[1,2,3,5,6,7,9,10,11,13,14,15];
function listMetricSampleFloors(eng,includeChestVariants=false,edgeSeed=MAXTILE_EDGE_SEED){
const floors=MAXTILE_REP_FLOORS.slice();
if(includeChestVariants)floors.push(...MAXTILE_CHEST_VARIANT_FLOORS);
if(eng.MapSeed===edgeSeed)floors.push(...MAXTILE_EDGE_FLOORS);
return[...new Set(floors)];
}
function findFloorMaxChamberArea(eng,f){
const a=getFloorAnomalies(eng,f);
let mx=0;for(const s of a.isolatedRegions)if(s>mx)mx=s;
return mx>=3?mx:null;
}
function countFloorGhostStairs(eng,f){
const c=scanGhostStairs(eng.di[f]);
return c>0?c:null;
}
function collectMetricPerFloor(eng,metricFn,includeChestVariants=false,edgeSeed=MAXTILE_EDGE_SEED){
const out=[],fc=eng.floorCount;
for(const f of listMetricSampleFloors(eng,includeChestVariants,edgeSeed)){
if(f>=fc)continue;
const di=eng.di[f];const W=di[2],H=di[3];
if(W<=0||H<=0||W!==H||!MAXTILE_DIMS.includes(W))continue;
const val=metricFn(eng,f);
if(val!==null&&val!==undefined)out.push({f,val,dim:W+'x'+H});
}
return out;
}
function buildFastestMapHtml(eng,hideFloors,upToFloor){
const fcAll=eng.floorCount;if(fcAll<=0)return null;
const hasLimit=upToFloor>=0;
const limit=hasLimit?Math.min(upToFloor,fcAll):fcAll;
const pf=new Array(limit);let sum=0;
for(let f=0;f<limit;f++){const c=calcFloorWalkCost(eng,f);if(c===null)return null;pf[f]=c;sum+=c;}
let html=`<div style="margin-top:4px;"><span style="color:#ffc90e;font-weight:bold;font-size:14px">${fmtStep(sum)}</span></div>`;
if(!hideFloors){
const floors=pf.map((c,f)=>{const isGoal=(!hasLimit&&f===limit-1);return`<span style="color:${isGoal?'#fc6':'#9ab'}">B${f+1}F${isGoal?'✦':''}<b style="color:#cde">${fmtStep(c)}</b></span>`;}).join('<span style="color:#445"> · </span>');
html+=`<div style="margin-top:3px;font-size:11px;font-family:monospace;line-height:1.7">${floors}</div>`;
}
return{html,cost:sum};
}
function needsMapGeneration(conds,searchOnlyWithD){
return!!(conds.hasBoxCond||conds.elist||conds.onlyMon||searchOnlyWithD||conds.anomaly!=="");
}
const searchYieldStride=needMap=>needMap?250:1000;
function evaluateMapSearchConditions(engine,seed,targetRankKey,conds,searchFilterLoc,searchOnlyWithD,onlyMonExpectedStr){
engine.calculateDetail(true);
if(!checkUltimateCondsMatch(engine,seed,targetRankKey,conds,searchFilterLoc))return null;
if(!checkOnlyMonPossible(engine,conds))return null;
if(needsMapGeneration(conds,searchOnlyWithD))engine.createDungeonDetail();
const boxHtml=ChestHtml(engine,conds);
if(boxHtml===null)return null;
const elistResult=checkElistAndD(engine,conds,searchOnlyWithD,onlyMonExpectedStr);
if(!elistResult.match)return null;
const anomResult=checkAnomalies(engine,conds);
if(!anomResult.match)return null;
return{boxHtml,elistResult,anomResult};
}
const SEED_PROCESSORS={
ultimate:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
job.searchFilterLoc,job.params.searchOnlyWithD,job._onlyMonExpectedStr);
if(!match)return null;
const{boxHtml,elistResult,anomResult}=match;
const jumpFloor=matchJumpFloor(elistResult,anomResult);
if(job.bySeed)return{seed,rStr,hasD:elistResult.hasMatchedD,jumpFloor,
fc:searchEngine.floorCount,name:dispName(searchEngine),ghost:anomResult.ghost,box:boxHtml,sp:elistResult.specialHitDetails};
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,
specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails});
return{seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor};
},
multibug:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const cond_elist=conds.elist;
const cond_only_mon=conds.onlyMon;
const _onlyMonExpectedStr=job._onlyMonExpectedStr;
const{requireFloorIncrease,requireBugFloorHit,searchOnlyWithD,effectiveElistCond,isCombinedSearch}=job.params;
searchEngine.multibug_offset=0;
searchEngine.force_16_floors=false;
searchEngine.calculateDetail(true);
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
const origFloors=searchEngine.floorCount,origBoss=dispBoss(searchEngine),origName=dispName(searchEngine);
searchEngine.multibug_offset=1;
searchEngine.calculateDetail();
const bugFloors=searchEngine.floorCount,bugBoss=dispBoss(searchEngine),bugName=dispName(searchEngine);
const isFloorIncreased=bugFloors>origFloors;
if(requireFloorIncrease&&!isFloorIncreased)return null;
searchEngine.multibug_offset=0;
searchEngine.force_16_floors=true;
searchEngine.calculateDetail();
try{
let boxHtml="";
if(conds.hasBoxCond){
const actualBoxCounts=[0,0,0,0,0,0,0,0,0,0];
for(let f=2;f<bugFloors;f++){
const d=searchEngine.di[f];
for(let b=0;b<d[8];b++)actualBoxCounts[d[9+b]-1]++;
}
const boxText=matchReqBoxes(actualBoxCounts,conds.reqBox);
if(boxText===null)return null;
boxHtml=`<div style="margin-top:4px;"><span style="color:#fc0;font-size:10px;background:#420;padding:2px 4px;border-radius:3px;">${boxText}</span></div>`;
}
const envType=searchEngine._details[3],baseMR=searchEngine._details[2];
let foundSpecialFloors=[];
let specialHitCount=0;
let hasAnyD=false;
for(let f=4;f<16;f++){
const elistInfo=getFloorElistInfo(searchEngine,f);
if(elistInfo.dValue>0)hasAnyD=true;
let isElistHit=false,isOnlyHit=false;
if(elistInfo.state){
let floorHit=null;
if(!effectiveElistCond||effectiveElistCond==='MULTI_SPECIAL')isElistHit=true;
else{
floorHit=evalElistFloorHit(searchEngine,f,elistInfo,effectiveElistCond);
isElistHit=floorHit.isElistHit;
}
if(isCombinedSearch){
isOnlyHit=isElistHit&&!!floorHit&&getElistMonsterBadge(envType,floorMRAt(baseMR,f),floorHit.targetCount,cond_only_mon).isCombinedHit;
}else isOnlyHit=!cond_only_mon||elistInfo.state.includes(_onlyMonExpectedStr);
}
const isSpecialMatch=isElistHit&&isOnlyHit;
if(isSpecialMatch)specialHitCount++;
if(elistInfo.state||(searchOnlyWithD&&elistInfo.dValue>0)){
foundSpecialFloors.push({
floor:f+1,
isElistHit,
hex:elistInfo.hex,
state:elistInfo.state||EL_NORMAL,
dValue:elistInfo.dValue,
envType,
floorMR:floorMRAt(baseMR,f),
isSpecialMatch
});
}
}
if(requireBugFloorHit){
foundSpecialFloors=foundSpecialFloors.filter(info=>info.floor>origFloors&&info.floor<=bugFloors);
hasAnyD=foundSpecialFloors.some(info=>info.dValue>0);
specialHitCount=foundSpecialFloors.filter(info=>info.state!==EL_NORMAL).length;
if(foundSpecialFloors.length===0)return null;
}
const wantsSpecial=effectiveElistCond||cond_only_mon;
if(searchOnlyWithD&&!hasAnyD)return null;
if(searchOnlyWithD&&wantsSpecial&&effectiveElistCond!=='MULTI_SPECIAL'&&!foundSpecialFloors.some(info=>info.dValue>0&&info.isSpecialMatch))return null;
if(effectiveElistCond==='MULTI_SPECIAL'&&specialHitCount<2)return null;
if(wantsSpecial&&specialHitCount===0)return null;
const lowFloors=Math.min(origFloors,bugFloors);
const elistHtmlStr=foundSpecialFloors.map(info=>{
const stateColor=info.state===EL_NORMAL?"#888"
:info.floor<=lowFloors?"#4f4":info.floor<=origFloors?"#00a2e8":info.floor<=bugFloors?"#fa0":"#f7f";
let line=`<span style="color:#0ff;font-size:12px;">B${info.floor}F: [${info.hex}] <strong style="color:${stateColor};">${info.state}</strong>${makeDBadge(info.dValue)}</span>`;
const cls=classifyElistState(info.state);
const surviveCount=cls.kind==='reduced'?cls.count:0;
if(surviveCount>0&&(cond_elist===surviveCount.toString()||isCombinedSearch||(cond_elist==='SIZE_15'&&info.isElistHit))){
line+=getElistMonsterBadge(info.envType,info.floorMR,surviveCount,null).badge;
}
return line;
}).join('<br>');
const cachedLocData=peekLocDataCached(seed,targetRankKey);
const locHtml=cachedLocData?LocaHtmlFromData(cachedLocData,conds):"";
const bugIcon=isFloorIncreased?'📈':'';
const html=`
${seedTagHtml(seed,15)}
${rankTagHtml(rStr)}<br>
<div style="background:#111;padding:4px 8px;border-radius:4px;margin:4px 0;border:1px solid #333;">
<span style="color:#aaa;font-size:11px">[Source] ${origName} | B${origFloors}F | ${origBoss}</span><br>
<span style="color:#f8f;font-size:11px">[Bug] ${bugName} | B${bugFloors}F | ${bugBoss} ${bugIcon}</span>
</div>${locHtml}${boxHtml}
<div style="padding-top:2px;">${elistHtmlStr}</div>
`;
return{seed,rStr,html,hasD:hasAnyD};
}finally{searchEngine.force_16_floors=false;}
},
item:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const p=job.params;
searchEngine.calculateDetail(true);
const basicReq=ITEM_BASIC_REQS[p.checker];
if(basicReq&&!basicReq(searchEngine,p,conds))return null;
if(!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
searchEngine.createDungeonDetail();
const boxHtml=ChestHtml(searchEngine,conds);
if(boxHtml===null)return null;
const hitResult=DUNGEON_CHECKERS[p.checker](searchEngine,p);
if(!hitResult||!hitResult.isHit)return null;
const locHtml=getLocHtmlCached(seed,targetRankKey,conds);
const mapNameDisp=dispName(searchEngine);
const astarSpan=(text,attr='')=>` <span${attr} style="color:#ffc90e;font-size:11px;font-family:monospace;">${text}</span>`;
const buildHtml=(astarHtml,displayHtml)=>`
${seedTagHtml(seed)}
${rankTagHtml(rStr)}${astarHtml}<br>
<span style="color:#0ff;font-size:11px;margin-bottom:2px;display:inline-block;">${mapNameDisp}</span>${locHtml}
<div style="margin-top:4px;">${boxHtml}</div>
<div style="margin-top:4px;">${displayHtml}</div>
`;
if(hitResult.multi){
return hitResult.multi.map((row)=>({seed,rStr,html:buildHtml(astarSpan(row.astarText!==undefined?row.astarText:fmtStepD(row.astar)),row.displayHtml),jumpFloor:row.floor,specialStyle:'',title:''+J01,sortCost:row.astar==null?1e9:row.astar,isB10:row.isB10,isJfireB10:!!row.isJfireB10,isX3:!!row.isX3}));
}
const astarHtml=hitResult.astarText!==undefined
?astarSpan(hitResult.astarText,hitResult.astarTitle?` title="${hitResult.astarTitle}"`:'')
:(hitResult.astar!==undefined?astarSpan(fmtStepD(hitResult.astar)):'');
const ret={seed,rStr,html:buildHtml(astarHtml,hitResult.displayHtml),jumpFloor:hitResult.jumpFloor||0,specialStyle:hitResult.specialStyle||'',title:''+J01};
if(hitResult.astar!==undefined)ret.sortCost=hitResult.astar==null?1e9:hitResult.astar;
if(hitResult.astarX3)ret.isX3=true;
return ret;
},
fastest:(searchEngine,seed,rStr,targetRankKey,job)=>{
const conds=job.conds;
const params=job.params;
const benchmarkMode=!!params.benchmarkMode;
const _fastMode=params.fastestMode;
searchEngine.calculateDetail(true);
if(_fastMode!=='maxtile'&&!checkUltimateCondsMatch(searchEngine,seed,targetRankKey,conds,job.searchFilterLoc))return null;
if(!benchmarkMode&&_fastMode==='map'&&!params.slowest&&searchEngine._details[0]===12&&parseInt(conds.boss)!==12)return null;
if(_fastMode!=='maxtile'&&!checkOnlyMonPossible(searchEngine,conds))return null;
searchEngine.createDungeonDetail();
if(_fastMode==='maxtile'){
const _metric=params.metricType||'maxtile';
const _edgeSeed=(params.metricEdgeSeed===undefined)?job.endSeed:params.metricEdgeSeed;
const metricFn=_metric==='maxiso'?findFloorMaxChamberArea:_metric==='maxghost'?countFloorGhostStairs
:_metric==='maxwalk'?calcFloorWalkCost:countFloorTiles;
const showDim=_metric==='maxiso'||_metric==='maxghost';
const rows=collectMetricPerFloor(searchEngine,metricFn,_metric!=='maxghost',_edgeSeed);
const results=rows.map(r=>{
const valHtml=_metric==='maxwalk'?fmtStep(r.val):r.val;
let at='';
if(_metric==='maxghost'){const gs=[];scanGhostStairs(searchEngine.di[r.f],gs);at=`<br>${ghostLineHtml(r.f,gs.join(', '))}`;}
const cardHtml=`${seedTagHtml(seed)}<br>`
+`<span style="color:#ffc90e;font-weight:bold;font-size:13px">${valHtml}</span> `
+`<span style="color:#9ab;font-size:11px">B${r.f+1}F</span>`
+(showDim?` <span style="color:#678;font-size:10px">${r.dim}</span>`:'')+at;
return{seed,rStr:'DD',html:cardHtml,jumpFloor:r.f,sortCost:r.val,fc:searchEngine.floorCount,_dimLabel:r.dim};
});
return results.length>0?results:null;
}
const boxHtml=ChestHtml(searchEngine,conds);
if(boxHtml===null)return null;
const elistResult=checkElistAndD(searchEngine,conds,params.searchOnlyWithD,job._onlyMonExpectedStr);
if(!elistResult.match)return null;
const anomResult=checkAnomalies(searchEngine,conds);
if(!anomResult.match)return null;
let jumpToFloor=matchJumpFloor(elistResult,anomResult);
let upToFloor=-1;
if(!benchmarkMode&&_fastMode!=='map'){
if((conds.elist||conds.onlyMon)&&elistResult.jumpToFloor!==-1){
upToFloor=elistResult.jumpToFloor;
}else if(_fastMode==='floor'&&conds.depth2){
const _d2=parseInt(conds.depth2);
if(searchEngine.floorCount<_d2)return null;
upToFloor=_d2;
if(jumpToFloor===-1)jumpToFloor=_d2-1;
}
}
const fastestRes=benchmarkMode?buildFastestMapHtml(searchEngine,false,-1):buildFastestMapHtml(searchEngine,!params.showFloors,upToFloor);
if(fastestRes===null)return null;
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,
specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails,mid:fastestRes.html});
return{seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor:jumpToFloor,sortCost:fastestRes.cost,fc:searchEngine.floorCount};
}
};
function getProcessorEntry(name){
switch(name){
case'ultimate':return{setup:SEED_SETUP.ultimate,proc:SEED_PROCESSORS.ultimate};
case'multibug':return{setup:SEED_SETUP.multibug,proc:SEED_PROCESSORS.multibug};
case'fastest':return{setup:SEED_SETUP.fastest,proc:SEED_PROCESSORS.fastest};
case'item':return{setup:SEED_SETUP.item,proc:SEED_PROCESSORS.item};
}
return null;
}
async function coreRunScanJob(job,io){
const totalCombos=job.ranks.length*(job.endSeed-job.startSeed+1);
let processed=0,hitCount=0;
const searchEngine=new GrottoDetail();
const entry=getProcessorEntry(job.processor);
if(!entry)throw new Error('unknown processor: '+job.processor);
const proc=entry.proc;
if(entry.setup)entry.setup(searchEngine,job);
const yieldStride=searchYieldStride(job.processor!=='ultimate'
||needsMapGeneration(job.conds,job.params&&job.params.searchOnlyWithD));
const allRanks=job.allRanks||job.ranks;
const tagOrder=!!job.tagOrder;
let rankOrder;
const tag=(it,rank,seed,k)=>{
if(tagOrder){
if(!rankOrder){
rankOrder=new Map();
for(let i=0;i<allRanks.length;i++){
const value=allRanks[i];
if(i in allRanks&&value===value&&!rankOrder.has(value))rankOrder.set(value,i);
}
}
const order=rankOrder.get(rank);
it._ord=((order===undefined?-1:order)*0x10000+seed)*4096+k;
}
return it;
};
const runSeed=(rank,rStr,targetRankKey,seed,list)=>{
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
const item=proc(searchEngine,seed,rStr,targetRankKey,job);
if(item){
hitCount++;
if(Array.isArray(item))item.forEach((it,k)=>list.push(tag(it,rank,seed,k)));
else list.push(tag(item,rank,seed,0));
}
processed++;
};
if(job.seedMajor||job.bySeed){
const rankInfo=rankInfoList(job.ranks);
const byRank=rankInfo.map(()=>[]),bySeed=!!job.bySeed;
const seedStride=Math.max(1,Math.round(yieldStride/rankInfo.length));
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%seedStride===0){
io.progress({processed,total:totalCombos,hits:hitCount,seedHex:hex4(seed)});
if(bySeed&&byRank[0].length>0){io.batch(byRank[0]);byRank[0]=[];}
await io.yield();
}
for(let ri=0;ri<rankInfo.length;ri++){
const{rank,rStr,targetRankKey}=rankInfo[ri];
runSeed(rank,rStr,targetRankKey,seed,byRank[bySeed?0:ri]);
}
}
for(const list of byRank)if(list.length>0)io.batch(list);
return hitCount;
}
let batch=[];
for(const rank of job.ranks){
if(io.cancelled())break;
const rStr=hex2(rank),targetRankKey=resolveRankKey(rStr,rank);
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(seed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount,rStr,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
runSeed(rank,rStr,targetRankKey,seed,batch);
}
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATMonsterJob(job,io){
const conds=job.conds;
const{N,atmin,atmax,deftMax,pType,atThreshold,atMaxSteps,searchOnlyWithD,searchFilterLoc}=job;
const userDeft=job.userDeft==null?DEFAULT_USER_DEFT:job.userDeft;
const atMchSeeds=new Map();
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if((seed&8191)===0){if(io.cancelled())return 0;await io.yield();}
const pair=getATPair(seed,N);
if(pair.atN<atmin||pair.atN>atmax)continue;
if(deftMax>=0&&calcDeftness(pair.atN1)>deftMax)continue;
atMchSeeds.set(seed,pair);
}
const atPtnOffsets=new Map();
if(pType>0){
let scanned=0;
for(const[seed,pair]of atMchSeeds){
if((++scanned&255)===0){if(io.cancelled())return 0;await io.yield();}
const frame=battleATContext(N,calcDeftness(pair.atN1),userDeft);
const{foundOffsets}=scanSeedForAtPattern(seed,atMaxSteps,atThreshold,pType,frame.firstUnused[0]);
if(foundOffsets.length>0)atPtnOffsets.set(seed,foundOffsets);
else atMchSeeds.delete(seed);
}
}
const yieldStride=searchYieldStride(needsMapGeneration(conds,searchOnlyWithD));
const searchEngine=new GrottoDetail();
SEED_SETUP.ultimate(searchEngine,job);
const rankInfo=rankInfoList(job.ranks);
const totalCombos=atMchSeeds.size*rankInfo.length;
let processed=0,hitCount=0,batch=[],tailSeed=-1,tail='';
seeds:for(const[seed,atinfo]of atMchSeeds)for(const{rank,rStr,targetRankKey}of rankInfo){
if(io.cancelled())break seeds;
if(processed%yieldStride===0){
io.progress({processed,total:totalCombos,hits:hitCount});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
processed++;
searchEngine.MapSeed=seed;
searchEngine.MapRank=rank;
const match=evaluateMapSearchConditions(searchEngine,seed,targetRankKey,conds,
searchFilterLoc,searchOnlyWithD,job._onlyMonExpectedStr);
if(!match)continue;
const{boxHtml,elistResult,anomResult}=match;
hitCount++;
if(tailSeed!==seed){
tailSeed=seed;
const offsets=atPtnOffsets.get(seed);
let diffsHtml='',patHtml='';
if(offsets){
patHtml=buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(offsets));
diffsHtml=buildBattleAtDiffsHtml(offsets,N,calcDeftness(atinfo.atN1),userDeft);
}
tail=buildAtInfoCardHtml(seed,N,atinfo.atN,atinfo.atN1,diffsHtml)+patHtml;
}
const html=buildSeedCardHtml({searchEngine,seed,rStr,targetRankKey,conds,boxHtml,
specialHitDetails:elistResult.specialHitDetails,anomalyDetails:anomResult.anomalyDetails,tail});
batch.push({seed,rStr,html,hasD:elistResult.hasMatchedD,jumpFloor:matchJumpFloor(elistResult,anomResult),pop:atinfo.atN});
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
async function coreRunATPatternJob(job,io){
const totalSeeds=job.endSeed-job.startSeed+1,N=job.POPIndex;
const userDeft=job.userDeft==null?DEFAULT_USER_DEFT:job.userDeft;
let hitCount=0,processed=0,batch=[];
for(let seed=job.startSeed;seed<=job.endSeed;seed++){
if(io.cancelled())break;
if(job.searchFilterLoc&&calcLocations(seed,job.targetRankKey).outputOrder.length===0){processed++;continue;}
if(processed%1000===0){
io.progress({processed,total:totalSeeds,hits:hitCount,seedHex:hex4(seed)});
if(batch.length>0){io.batch(batch);batch=[];}
await io.yield();
}
processed++;
const{atN,atN1}=getATPair(seed,N),deft=calcDeftness(atN1);
const{foundOffsets}=scanSeedForAtPattern(seed,job.maxSteps,job.threshold,job.pType,battleATContext(N,deft,userDeft).firstUnused[0]);
if(foundOffsets.length===0)continue;
hitCount++;
const html=`
${seedTagHtml(seed,13)}<br>
${buildAtPatternBoxHtml(job.patternName,job.probText,buildAtOffsetsHtml(foundOffsets))}
${buildAtInfoCardHtml(seed,N,atN,atN1,buildBattleAtDiffsHtml(foundOffsets,N,deft,userDeft))}
`;
batch.push({seed,rStr:null,html,pop:atN});
}
if(batch.length>0)io.batch(batch);
return hitCount;
}
function getCoreSearchRunner(kind){
if(kind==='scan')return coreRunScanJob;
if(kind==='atMonster')return coreRunATMonsterJob;
if(kind==='atPattern')return coreRunATPatternJob;
return()=>0;
}
const SKILL_DB=[
{id:9,cat:"skill",weapon:"Minstrel",jp:"火ふき芸",en:"Hot Lick",target:"S",at:[128,0],miss:120,ev:0,blk:0,el:5,metal:0,dmg:{s:3,b:20}},
{id:10,cat:"skill",weapon:"Hammer",jp:"ビッグバン",en:"Big Banga",target:"A",at:[74,0],miss:74,ev:0,blk:1,el:10,metal:0,dmg:{s:60,b:300},hiden:1},
{id:11,cat:"spell",jp:"ドルマドン",en:"Kazammle",target:"S",at:[67,0],miss:59,ev:0,blk:1,el:10,metal:0,cls:[10],dmg:{s:30,b:285,m:615,st:"might",lo:480,hi:999}},
{id:12,cat:"spell",jp:"メラガイアー",en:"Kafrizzle",target:"S",at:[55,0],miss:41,ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:23,b:292,m:600,st:"might",lo:480,hi:999}},
{id:26,cat:"skill",weapon:"Boomerang",jp:"ギガスロー",en:"Gigathrow",target:"S",at:[39,0],miss:29,ev:1,blk:1,el:8,metal:0,hiden:1},
{id:24,cat:"skill",weapon:"Whip",jp:"双竜打ち (単体)",en:"Twin Dragon Lash (Single)",target:"S",at:[30,12],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:2,max:2},mul:1.25},
{id:31,cat:"spell",jp:"マヒャド",en:"Kacrack",target:"A",at:[29,1],ev:0,blk:1,el:6,metal:0,cls:[2],dmg:{s:12,b:92,m:216,st:"might",lo:200,hi:999}},
{id:25,cat:"skill",weapon:"Whip",jp:"地這い大蛇",en:"Serpent's Bite",target:"G",at:[29,1],ev:1,blk:1,el:9,metal:0,hiden:1,mul:2},
{id:27,cat:"skill",weapon:"Hammer",jp:"ランドインパクト",en:"Crackerwhack",target:"A",at:[29,1],ev:0,blk:1,el:9,metal:0,dmg:{s:15,b:175}},
{id:28,cat:"skill",weapon:"Bow",jp:"シャイニングボウ",en:"Shining Shot",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:5,b:150},hiden:1},
{id:42,cat:"skill",weapon:"Boomerang",jp:"シャインスコール",en:"Starburst Throw",target:"A",at:[29,1],ev:0,blk:1,el:11,metal:0,dmg:{s:10,b:105}},
{id:43,cat:"spell",jp:"イオグランデ",en:"Kaboomle",target:"A",at:[29,1],ev:0,blk:0,el:8,metal:0,cls:[10],dmg:{s:10,b:210,m:480,st:"might",lo:550,hi:999}},
{id:44,cat:"item",jp:"ばくだん石",en:"Rockbomb shard",target:"A",at:[29,1],ev:0,blk:0,el:0,metal:0,dmg:{s:5,b:25}},
{id:40,cat:"item",jp:"マグマの杖",en:"Magma Staff",target:"A",at:[28,1],miss:20,ev:0,blk:0,el:8,metal:0,dmg:{s:5,b:25}},
{id:21,cat:"skill",weapon:"Sword",jp:"ギガブレイク",en:"Gigagash",target:"G",at:[23,1],miss:0,ev:0,blk:1,el:11,metal:0,dmg:{s:75,b:260,m:520,st:"str+might",lo:500,hi:1998},hiden:1},
{id:23,cat:"skill",weapon:"Whip",jp:"らせん打ち",en:"Hypnowhip",target:"S",at:[22,0],miss:14,ev:1,blk:1,el:0,metal:0},
{id:22,cat:"skill",weapon:"Spear",jp:"ジゴスパーク",en:"Lightning Storm",target:"A",at:[20,1],ev:0,blk:1,antiBlk:false,el:8,metal:0,dmg:{s:15,b:205,m:405,st:"str+might",lo:500,hi:1998},hiden:1},
{id:45,cat:"skill",weapon:"Fisticuffs",jp:"ばくれつけん",en:"Multifists",target:"RA",at:[20,8],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{id:46,cat:"skill",weapon:"Fisticuffs",jp:"岩石おとし",en:"Boulder Toss",target:"A",at:[20,1],ev:1,blk:1,el:9,metal:0,dmg:{s:10,b:110,m:300,st:"str+deft",lo:500,hi:1998}},
{id:30,cat:"spell",jp:"マヒャデドス",en:"Kacrackle",target:"A",at:[17,1],ev:0,blk:0,el:6,metal:0,cls:[2],dmg:{s:20,b:185,m:510,st:"might",lo:550,hi:999}},
{id:47,cat:"spell",jp:"バギクロス",en:"Kaswoosh",target:"G",at:[17,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:50,b:130,m:205,st:"might",lo:200,hi:999}},
{id:48,cat:"skill",weapon:"Spear",jp:"一閃づき",en:"Thunder Thrust",target:"S",at:[14,0],miss:0,ev:1,blk:1,el:0,metal:0},
{id:35,cat:"skill",weapon:"Whip",jp:"愛のムチ",en:"Lashings of Love",target:"G",at:[14,5],ev:1,blk:1,el:0,metal:0,tmul:{12:1.5}},
{id:36,cat:"skill",weapon:"Claws",jp:"ゴッドスマッシュ",en:"Hand of God",target:"S",at:[14,0],ev:0,blk:1,el:11,metal:0,dmg:{s:40,b:220,m:440,st:"str",lo:300,hi:999},hiden:1},
{id:37,cat:"skill",weapon:"Fan",jp:"波紋演舞",en:"Water Slaughterer",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{10:1.5}},
{id:49,cat:"skill",weapon:"Axe",jp:"たいぼく斬",en:"Poplar Toppler",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,tmul:{4:1.5}},
{id:50,cat:"skill",weapon:"Axe",jp:"蒼天魔斬",en:"Parallax",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,mul:1.25},
{id:38,cat:"skill",weapon:"Axe",jp:"オノむそう",en:"Axes of Evil",target:"G",at:[14,4],ev:1,blk:1,el:0,metal:0},
{id:15,cat:"skill",weapon:"Axe",jp:"森羅万象斬",en:"Whopper Chop",target:"S",at:[14,0],ev:0,blk:1,el:0,metal:0,dmg:{s:20,b:200,m:480,st:"str",lo:250,hi:600},hiden:1},
{id:51,cat:"skill",weapon:"Bow",jp:"さみだれうち",en:"Rain of Pain",target:"RA",at:[14,10],ev:1,blk:1,el:0,metal:0,hitRange:{normalMin:4,max:4},mul:0.5},
{id:52,cat:"skill",weapon:"Fisticuffs",jp:"せいけんづき",en:"Knuckle Sandwich",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0},
{id:4,cat:"skill",weapon:"Gladiator",jp:"とうこん討ち",en:"Clap Trap",target:"S",at:[14,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.2},
{id:5,cat:"skill",weapon:"Gladiator",jp:"とうこん討ち(毒針)",baseSkillId:4,en:"Clap Trap (Poison Needle)",target:"S",at:[14,0],ev:1,blk:1,el:0,metal:0,equip:"どくばり"},
{id:29,cat:"skill",weapon:"Paladin",jp:"グランドネビュラ",en:"Solar Flair",target:"G",at:[14,1],ev:0,blk:1,el:11,metal:0,dmg:{s:15,b:195,m:390,st:"mending",lo:200,hi:849},hiden:1},
{id:53,cat:"spell",jp:"ドルモーア",en:"Kazam",target:"S",at:[14,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:30,b:150,m:345,st:"might",lo:225,hi:999}},
{id:54,cat:"spell",jp:"バギマ",en:"Swoosh",target:"G",at:[14,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:15,b:40,m:138,st:"might",lo:100,hi:999}},
{id:13,cat:"spell",jp:"メラゾーマ",en:"Kafrizz",target:"S",at:[11,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:12,b:190,m:319,st:"might",lo:220,hi:999}},
{id:55,cat:"spell",jp:"バギ",en:"Woosh",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,cls:[5,11],dmg:{s:8,b:16,m:69,st:"might",lo:50,hi:999}},
{id:16,cat:"item",jp:"さばきの杖",en:"Staff of Sentencing",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:8,b:16}},
{id:56,cat:"item",jp:"れっぷうのおうぎ",en:"Foehn Fan",target:"G",at:[11,1],ev:0,blk:0,el:7,metal:0,dmg:{s:8,b:16}},
{id:1,cat:"skill",weapon:"Other",jp:"攻撃",en:"Attack",target:"S",at:[8,8],miss:0,ev:1,blk:1,el:0,metal:0,fh:2},
{id:3,cat:"skill",weapon:"Other",jp:"攻撃(毒針)",baseSkillId:1,en:"Attack (Poison Needle)",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,equip:"どくばり"},
{id:57,cat:"skill",weapon:"Other",jp:"攻撃 (ｸﾞﾙｰﾌﾟ)",en:"Attack (Group)",target:"G",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{id:2,cat:"skill",weapon:"Other",jp:"攻撃 (全体)",en:"Attack (All)",target:"A",at:[8,4],miss:0,ev:1,blk:1,el:0,metal:0},
{id:58,cat:"skill",weapon:"Sword",jp:"ドラゴン斬り",en:"Dragon Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,tmul:{1:1.5}},
{id:7,cat:"skill",weapon:"Sword",jp:"メタル斬り",en:"Metal Slash",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:1,fh:2},
{id:6,cat:"skill",weapon:"Sword",jp:"はやぶさ斬り",en:"Falcon Slash",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,fh:4,mul:0.75},
{id:59,cat:"skill",weapon:"Sword",jp:"ギガスラッシュ",en:"Gigaslash",target:"G",at:[8,4],ev:0,blk:1,el:11,metal:0,dmg:{s:20,b:160,m:360,st:"str+might",lo:500,hi:1998}},
{id:8,cat:"skill",weapon:"Spear",jp:"しっぷうづき",en:"Mercurial Thrust",target:"S",at:[8,0],pri:2,ev:1,blk:1,el:0,metal:0},
{id:60,cat:"skill",weapon:"Spear",jp:"けものづき",en:"Cattle Prod",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{2:1.5}},
{id:61,cat:"skill",weapon:"Knife",jp:"キラーブーン",en:"Fly Swat",target:"S",at:[8,1],ev:1,blk:1,el:0,metal:0,kph:2,tmul:{5:1.5}},
{id:62,cat:"skill",weapon:"Wand",jp:"悪魔ばらい",en:"Beelzefreeze",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0},
{id:63,cat:"skill",weapon:"Staff",jp:"黄泉送り",en:"Deliverance",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{7:1.5}},
{id:64,cat:"skill",weapon:"Claws",jp:"ウィングブロウ",en:"Propeller Blade",target:"S",at:[8,8],ev:1,blk:1,el:7,metal:0,hit:2},
{id:65,cat:"skill",weapon:"Claws",jp:"裂鋼拳",en:"Can Opener",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{6:1.5}},
{id:66,cat:"skill",weapon:"Claws",jp:"タイガークロー",en:"Hardclaw",target:"S",at:[8,8],ev:1,blk:1,el:0,metal:0,hit:2,mul:0.75},
{id:67,cat:"skill",weapon:"Hammer",jp:"ドラムクラッシュ",en:"Monster Masher",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{11:1.5}},
{id:68,cat:"skill",weapon:"Bow",jp:"バードシュート",en:"Flutter Disaster",target:"S",at:[8,0],ev:1,blk:1,el:0,metal:0,tmul:{3:1.5}},
{id:69,cat:"skill",weapon:"Boomerang",jp:"クロスカッター",en:"Crosscutter Throw",target:"A",at:[8,4],ev:1,blk:1,el:0,metal:0,mul:0.75},
{id:39,cat:"skill",weapon:"Boomerang",jp:"パワフルスロー",en:"Power Throw",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,mul:0.75},
{id:70,cat:"skill",weapon:"Boomerang",jp:"スライムブロウ",en:"Ooze Bruiser",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:0,tmul:{0:1.5}},
{id:71,cat:"skill",weapon:"Boomerang",jp:"バーニングバード",en:"Firebird Throw",target:"RA",at:[8,8],ev:1,blk:1,el:5,metal:0,hitRange:{normalMin:7,max:7},mul:0.3},
{id:72,cat:"skill",weapon:"Boomerang",jp:"メタルウィング",en:"Metalicker",target:"A",at:[8,5],ev:1,blk:1,el:0,metal:1},
{id:73,cat:"skill",weapon:"Fisticuffs",jp:"石つぶて",en:"Stone's Throw",target:"G",at:[8,8],ev:1,blk:1,el:9,metal:0,dmg:{s:7,b:17}},
{id:74,cat:"skill",weapon:"Fisticuffs",jp:"かまいたち",en:"Wind Sickles",target:"G",at:[8,5],ev:1,blk:1,el:0,metal:0},
{id:75,cat:"skill",weapon:"Gladiator",jp:"もろば斬り",en:"Double-Edged Slash",target:"S",at:[8,0],miss:0,ev:1,blk:1,el:0,metal:0,mul:1.5},
{id:34,cat:"skill",weapon:"Gladiator",jp:"無心こうげき",en:"Blind Man's Biff",target:"RS",at:[8,1],ev:1,blk:1,el:0,metal:0,fh:2,mul:1.5},
{id:41,cat:"skill",weapon:"Luminary",jp:"バックダンサー呼び",en:"Disco Stew",target:"A",at:[8,1],ev:1,blk:1,el:0,metal:0,dmg:{s:25,b:210}},
{id:14,cat:"spell",jp:"メラ",en:"Frizz",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:2,b:14,m:99,st:"might",lo:50,hi:999}},
{id:76,cat:"spell",jp:"メラミ",en:"Frizzle",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,cls:[2],dmg:{s:10,b:80,m:199,st:"might",lo:100,hi:999}},
{id:77,cat:"spell",jp:"ヒャド",en:"Crack",target:"S",at:[8,0],ev:0,blk:1,el:6,metal:0,cls:[2,5],dmg:{s:5,b:30,m:119,st:"might",lo:50,hi:999}},
{id:32,cat:"spell",jp:"ヒャダルコ",en:"Crackle",target:"G",at:[8,8],ev:0,blk:1,el:6,metal:0,cls:[2,5],dmg:{s:8,b:50,m:150,st:"might",lo:100,hi:999}},
{id:78,cat:"spell",jp:"ドルマ",en:"Zam",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:8,b:24,m:139,st:"might",lo:62,hi:999}},
{id:79,cat:"spell",jp:"ドルクマ",en:"Zammle",target:"S",at:[8,0],ev:0,blk:0,el:10,metal:0,cls:[10],dmg:{s:15,b:65,m:228,st:"might",lo:125,hi:999}},
{id:80,cat:"item",jp:"はじゃのつるぎ",en:"Cautery Sword",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:2,b:8}},
{id:81,cat:"item",jp:"ひかりのつるぎ",en:"Aurora Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:2,b:8}},
{id:82,cat:"item",jp:"ほのおのつるぎ",en:"Fire Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:83,cat:"item",jp:"インフェルノソード",en:"Inferno Blade",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:84,cat:"item",jp:"こおりのやいば",en:"Icicle Dirk",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0,dmg:{s:5,b:30}},
{id:85,cat:"item",jp:"フェンリルのキバ",en:"Fenrir Fang",target:"G",at:[8,8],ev:0,blk:0,el:6,metal:0,dmg:{s:5,b:30}},
{id:86,cat:"item",jp:"まどうしの杖",en:"Wizard's Staff",target:"S",at:[8,0],ev:0,blk:1,el:5,metal:0,dmg:{s:2,b:14}},
{id:87,cat:"item",jp:"ドラゴンの杖",en:"Wyrmwand",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:88,cat:"item",jp:"ほのおのツメ",en:"Fire Claws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:89,cat:"item",jp:"しゃくねつのツメ",en:"Combusticlaws",target:"A",at:[8,1],ev:1,blk:0,el:5,metal:0,dmg:{s:5,b:28}},
{id:17,cat:"skill",weapon:"Staff",jp:"なぎはらい",en:"Party Pooper",target:"G",at:[6,6],ev:1,blk:1,el:0,metal:0},
{id:19,cat:"skill",weapon:"Ranger",jp:"みのがす",en:"Mercy",target:"A",at:[0,0],miss:0,ev:0,blk:0,el:12,metal:0},
{id:18,cat:"spell",jp:"ザラキーマ",en:"Kathwack",target:"A",at:[0,0],ev:0,blk:0,el:12,metal:0,cls:[1]},
{id:90,cat:"skill",weapon:"Armamentalist",jp:"ファイアフォース",en:"Fire Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[5]},
{id:91,cat:"skill",weapon:"Armamentalist",jp:"アイスフォース",en:"Frost Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[6]},
{id:92,cat:"skill",weapon:"Armamentalist",jp:"ストームフォース",en:"Gale Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[7,8]},
{id:93,cat:"skill",weapon:"Armamentalist",jp:"ダークフォース",en:"Funereal Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[9,10]},
{id:94,cat:"skill",weapon:"Armamentalist",jp:"ライトフォース",en:"Life Fource",target:"P",at:[0,0],ev:0,blk:0,el:0,metal:0,addsEl:[11]},
{id:20,cat:"skill",weapon:"Other",jp:"おうえん",en:"Egg On",target:"O",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0,hiden:1},
{id:95,cat:"skill",weapon:"Other",jp:"ためる",en:"Psyche Up",target:"U",at:[0,0],miss:0,ev:0,blk:0,el:0,metal:0}
];
const GROTTO_BATTLE={
1:{
1:{x:3,m:[["00B",1,3,0,4,10,2,10],["00E",1,3,0,4,12,2,12],["022",1,3,0,4,10,2,10],["082",1,2,0,4,11,1,11],["08C",1,3,0,4,11,2,11]]},
2:{x:3,m:[["036",1,3,0,4,11,2,11],["03B",1,3,0,4,11,2,11],["063",1,2,0,4,10,2,10],["087",1,2,0,4,11,2,11],["0BD",1,1,0,4,11,1,11]]},
3:{x:4,m:[["034",1,3,0,4,10,1,10],["083",1,3,0,4,12,2,12],["08B",1,2,0,4,11,2,11],["099",1,2,0,4,11,2,11],["101",1,2,0,4,11,2,11]]},
4:{x:4,m:[["076",1,3,0,4,11,2,11],["07C",1,3,0,4,11,2,11],["080",1,2,0,4,12,2,12],["0AE",1,1,0,4,12,2,12],["0D9",1,2,0,4,11,1,11]]},
5:{x:4,m:[["052",1,2,0,4,11,1,11],["07D",1,3,0,4,11,2,11],["0B6",1,2,0,4,12,2,12],["0C5",1,2,0,4,12,2,12],["0DD",1,1,0,4,11,1,11]]},
6:{x:4,m:[["02F",1,3,0,4,11,2,11],["089",1,2,0,4,11,1,11],["097",1,3,0,4,12,2,12],["0A9",1,1,0,4,12,2,12],["105",1,2,0,4,12,2,12]]},
7:{x:4,m:[["04D",1,1,0,4,10,0,1],["089",1,2,0,4,12,2,12],["0B4",1,2,0,4,12,2,12],["0B7",1,1,0,4,12,2,12],["0D5",1,2,0,4,11,1,11]]},
8:{x:3,m:[["037",1,3,0,4,6,2,6],["0C6",1,2,0,4,12,2,12],["0F5",1,1,0,4,11,2,11],["102",1,1,0,4,12,2,12],["109",1,1,0,4,12,2,12]]},
9:{x:3,m:[["035",1,2,0,4,11,2,11],["0AF",1,1,0,4,11,1,11],["0ED",1,1,0,4,11,1,11],["109",1,1,0,4,11,1,11],["14E",1,1,0,4,11,1,11]]},
10:{x:3,m:[["0B5",1,2,0,4,11,1,11],["0ED",1,2,0,4,11,1,11],["0F1",1,1,0,4,11,1,11],["147",1,1,1,0,1,0,1],["14E",1,1,0,4,11,1,11]]},
11:{x:3,m:[["035",1,2,0,4,11,2,11],["0D7",1,1,0,4,12,1,12],["0E2",1,1,0,4,11,1,11],["0ED",1,2,0,4,11,1,11],["147",1,1,1,0,1,0,1]]},
12:{x:3,m:[["0D7",1,1,0,4,11,1,11],["0E2",1,1,0,4,12,1,12],["0EB",1,1,0,4,11,1,11],["0F1",1,1,0,4,11,1,11],["149",1,1,0,4,12,1,12]]},
},
2:{
1:{x:3,m:[["053",1,3,0,4,10,2,10],["077",1,2,1,0,1,0,1],["084",1,3,0,4,10,2,10],["096",1,2,0,4,11,1,11],["0BA",1,2,0,4,11,2,11]]},
2:{x:3,m:[["02A",1,3,0,4,12,2,12],["09F",1,2,0,4,11,2,11],["0A4",1,1,0,4,10,2,10],["0C8",1,3,0,4,11,2,11],["0DC",1,1,1,4,11,1,11]]},
3:{x:4,m:[["040",1,4,1,0,1,0,1],["04C",1,2,0,4,12,2,12],["0A3",1,2,0,4,11,1,11],["0B1",1,2,0,4,12,2,12]]},
4:{x:4,m:[["034",1,3,0,4,11,2,11],["062",1,3,0,4,11,2,11],["086",1,3,0,4,11,2,11],["08F",1,3,0,4,12,2,12],["0AC",1,1,0,4,11,1,11]]},
5:{x:4,m:[["062",1,3,0,4,11,2,11],["094",1,2,0,4,12,2,12],["0B2",1,2,0,4,11,1,11],["0CB",1,2,0,4,12,2,12],["0DD",1,1,0,4,11,1,11]]},
6:{x:4,m:[["097",1,3,0,4,12,2,12],["0A6",1,1,0,4,12,2,12],["0BC",1,2,0,4,12,2,12],["0D5",1,2,0,4,11,1,11],["105",1,2,0,4,12,2,12]]},
7:{x:4,m:[["01B",1,3,0,4,12,2,12],["0B8",1,1,0,4,12,2,12],["0DE",1,1,0,4,12,2,12],["105",1,2,0,4,12,2,12],["141",1,1,0,4,11,1,11]]},
8:{x:3,m:[["035",1,2,0,4,11,2,11],["04D",1,2,0,4,12,2,12],["0A8",1,2,0,4,12,2,12],["0B8",1,2,0,4,12,2,12],["141",1,2,0,4,12,2,12]]},
9:{x:3,m:[["035",1,2,0,4,11,2,11],["0B8",1,2,0,4,11,1,11],["0C2",1,2,0,4,11,1,11],["0EF",1,2,0,4,11,1,11],["141",1,3,0,4,11,1,11]]},
10:{x:3,m:[["04D",1,2,0,4,11,1,11],["0C2",1,2,0,4,11,1,11],["0EF",1,2,0,4,11,1,11],["0FE",1,2,0,4,11,1,11],["14A",1,1,0,4,12,1,12]]},
11:{x:3,m:[["0B9",1,1,0,4,12,1,12],["0E6",1,1,1,0,1,0,1],["0EF",1,2,0,4,11,1,11],["0FE",1,2,0,4,11,1,11],["14A",1,1,0,4,12,1,12]]},
12:{x:3,m:[["0E4",1,1,1,0,1,0,1],["0E5",1,1,1,0,1,0,1],["0E6",1,1,1,0,1,0,1],["0F2",1,1,0,4,12,1,12],["14A",1,1,0,4,11,1,11]]},
},
3:{
1:{x:3,m:[["008",1,3,0,4,10,2,10],["067",1,3,0,4,10,2,10],["06A",1,2,0,4,11,1,11],["06D",1,3,0,4,11,2,11]]},
2:{x:3,m:[["012",1,3,0,4,11,2,11],["05F",1,3,0,4,12,2,12],["065",1,2,0,4,11,2,11],["072",1,3,0,4,11,2,11],["0CA",1,2,0,4,11,1,11]]},
3:{x:4,m:[["068",1,3,0,4,11,2,11],["06D",1,3,0,4,10,2,10],["0A5",1,1,0,4,11,1,11],["0E8",1,4,0,4,11,2,11],["0E9",1,2,0,4,11,2,11]]},
4:{x:4,m:[["056",1,2,0,4,12,2,12],["079",1,3,1,0,1,0,1],["0A2",1,2,0,4,12,2,12],["0A5",1,1,0,4,12,2,12],["0D9",1,1,0,4,10,1,10]]},
5:{x:4,m:[["031",1,3,0,4,10,2,10],["0BE",1,1,0,4,12,2,12],["0CC",1,2,0,4,11,1,11],["0D9",1,1,0,4,12,2,12],["103",1,2,0,4,12,2,12]]},
6:{x:4,m:[["0B2",1,2,0,4,12,2,12],["0B7",1,1,0,4,12,2,12],["0C1",1,2,0,4,12,2,12],["0CC",1,3,0,4,12,2,12],["103",1,2,0,4,12,2,12]]},
7:{x:4,m:[["02F",1,3,0,4,11,2,11],["0B7",1,1,0,4,12,2,12],["0C1",1,2,0,4,12,2,12],["0CE",1,2,0,4,12,2,12],["0DE",1,3,0,4,12,2,12]]},
8:{x:3,m:[["05D",1,3,0,4,11,2,11],["0C4",1,2,0,4,12,2,12],["0E0",1,1,0,4,12,2,12],["0F3",1,2,0,4,12,2,12],["143",1,2,0,4,12,2,12]]},
9:{x:3,m:[["0B8",1,2,0,4,11,1,11],["0E0",1,2,0,4,11,1,11],["0F7",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11],["143",1,2,0,4,11,1,11]]},
10:{x:3,m:[["0B9",1,1,0,4,11,1,11],["0F6",1,2,0,4,11,1,11],["0F7",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11]]},
11:{x:3,m:[["0EC",1,1,0,4,12,1,12],["0F6",1,2,0,4,11,1,11],["0FA",1,2,0,4,11,1,11],["145",1,1,0,4,11,1,11]]},
12:{x:3,m:[["0EC",1,2,0,4,12,1,12],["0F4",1,1,0,4,11,1,11],["0F8",1,2,0,4,9,1,9],["145",1,1,0,4,12,1,12]]},
},
4:{
1:{x:3,m:[["03D",1,3,0,4,13,2,13],["05E",1,3,0,4,10,2,10],["09D",1,3,0,4,11,2,11],["0CF",1,2,0,4,12,2,12],["104",1,2,0,4,12,1,12]]},
2:{x:3,m:[["051",1,2,0,4,11,2,11],["095",1,2,0,4,13,2,13],["09E",1,3,0,4,13,2,13],["0B3",1,2,0,4,11,2,11],["0D4",1,2,0,4,10,1,10]]},
3:{x:4,m:[["059",1,2,0,4,13,2,13],["06E",1,3,0,4,12,2,12],["0A2",1,3,0,4,13,2,13],["0CD",1,2,0,4,9,1,9],["104",1,2,0,4,10,2,10]]},
4:{x:4,m:[["013",1,3,0,4,11,2,11],["05A",1,2,0,4,12,2,12],["0A0",1,3,0,4,13,2,13],["0FF",1,2,0,4,12,2,12],["106",1,1,0,4,12,1,12]]},
5:{x:4,m:[["057",1,3,0,4,12,2,12],["060",1,3,0,4,12,2,12],["070",1,2,0,4,13,2,13],["0B4",1,3,0,4,13,2,13],["107",1,1,0,4,11,1,11]]},
6:{x:4,m:[["057",1,2,0,4,12,2,12],["0A8",1,1,0,4,12,2,12],["0A9",1,1,0,4,11,2,11],["0B4",1,2,0,4,13,2,13],["102",1,2,0,4,12,1,12]]},
7:{x:4,m:[["037",1,3,0,4,6,2,6],["0A8",1,1,0,4,12,1,12],["0AF",1,1,0,4,12,2,12],["0DA",1,1,0,4,13,2,13],["102",1,1,0,4,12,2,12]]},
8:{x:3,m:[["0B5",1,2,0,4,13,2,13],["0DA",1,1,0,4,12,2,12],["0F3",1,2,0,4,13,2,13],["0F5",1,1,0,4,12,2,12],["14B",1,1,0,4,12,2,12]]},
9:{x:3,m:[["0F0",1,2,0,4,11,1,11],["0F3",1,2,0,4,11,1,11],["0F5",1,1,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["14B",1,1,0,4,12,1,12]]},
10:{x:3,m:[["0F0",1,2,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["0FB",2,3,0,4,10,1,10],["10C",1,1,0,4,12,1,12],["14B",1,1,0,4,11,1,11]]},
11:{x:3,m:[["0B0",1,1,0,4,12,1,12],["0F8",1,2,0,4,9,1,9],["0FB",2,3,0,4,12,1,12],["0FD",1,2,0,4,11,1,11],["10C",1,1,0,4,12,1,12]]},
12:{x:3,m:[["0B0",1,1,0,4,12,1,12],["0FD",1,2,0,4,12,1,12],["108",1,1,0,4,12,1,12],["10C",1,1,0,4,11,1,11],["148",1,1,1,0,1,0,1]]},
},
5:{
1:{x:3,m:[["03E",1,3,0,4,10,1,10],["074",1,3,0,4,12,2,12],["07B",1,3,0,4,11,2,11],["07F",1,3,0,4,12,2,12],["0C8",1,1,0,4,11,2,11]]},
2:{x:3,m:[["086",1,3,0,4,11,1,11],["087",1,2,0,4,11,2,11],["08D",1,3,0,4,11,2,11],["0BB",1,2,0,4,12,2,12],["0D0",1,3,0,4,11,2,11]]},
3:{x:4,m:[["015",1,4,0,4,11,2,11],["02C",1,3,0,4,11,2,11],["078",1,3,1,0,1,0,1],["08C",1,3,0,4,10,2,10],["0DC",1,2,0,4,11,1,11]]},
4:{x:4,m:[["01B",1,3,0,4,12,2,12],["040",1,4,1,0,1,0,1],["078",1,3,1,0,1,0,1],["0A7",1,1,0,4,11,1,11],["0B1",1,2,0,4,11,2,11]]},
5:{x:4,m:[["080",1,2,0,4,11,2,11],["088",1,2,0,4,12,2,12],["092",1,3,0,4,11,2,11],["0A7",1,2,0,4,12,2,12],["0C9",1,2,0,4,11,1,11]]},
6:{x:4,m:[["02E",1,3,0,4,11,2,11],["06B",1,3,0,4,12,2,12],["0B2",1,2,0,4,12,2,12],["0C0",1,2,0,4,10,1,10],["0DF",1,3,0,4,12,2,12]]},
7:{x:4,m:[["0AA",1,1,0,4,12,2,12],["0C0",1,3,0,4,10,2,10],["0C3",1,2,0,4,12,2,12],["0C6",1,2,0,4,11,1,11],["0DF",1,2,0,4,12,2,12]]},
8:{x:3,m:[["0C3",1,2,0,4,12,2,12],["0D5",1,2,0,4,12,2,12],["0D6",1,1,0,4,11,1,11],["0DA",1,1,0,4,12,2,12],["0FC",1,2,0,4,12,2,12]]},
9:{x:3,m:[["0B5",1,2,0,4,11,1,11],["0D6",1,1,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["0FC",1,2,0,4,11,1,11],["109",1,1,0,4,11,1,11]]},
10:{x:3,m:[["0C7",1,2,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["0FC",1,2,0,4,11,1,11],["109",1,1,0,4,11,1,11],["144",1,1,0,4,11,1,11]]},
11:{x:3,m:[["0AB",1,1,0,4,12,1,12],["0C7",1,2,0,4,11,1,11],["0F9",1,2,0,4,11,1,11],["144",1,1,0,4,11,1,11],["14D",1,1,0,4,11,1,11]]},
12:{x:3,m:[["0AB",1,1,0,4,12,1,12],["0C7",1,2,0,4,11,1,11],["0E7",1,1,1,0,1,0,1],["0EE",1,1,0,4,11,1,11],["14D",1,1,0,4,12,1,12]]},
},
};
const GROTTO_SUPPORT={
1:{
1:[["00B",1,4,3,21],["00E",1,3,4,21],["022",1,4,3,21],["082",1,2,4,21],["08C",1,3,4,21,["100",1,3,3,21]]],
2:[["036",1,4,3,21],["03B",1,3,3,21],["063",1,2,4,21],["087",1,2,4,21],["0BD",1,1,4,21,["08A",1,2,3,21]]],
3:[["034",1,4,4,21],["083",1,2,4,21],["08B",1,2,3,21],["099",1,2,3,21],["101",1,3,3,21],["0BD",1,1,4,21]],
4:[["076",1,3,3,21],["07C",1,3,3,21],["080",1,2,4,21],["0AE",1,1,4,21],["0D9",1,1,4,21,["064",1,2,3,21]]],
5:[["052",1,3,4,21],["07D",1,3,3,21],["0B6",1,3,3,21],["0C5",1,3,3,21],["0DD",1,2,4,21],["0AE",1,1,4,21]],
6:[["02F",1,4,4,21],["089",1,2,4,21],["097",1,2,4,21],["0A9",1,2,3,21],["105",1,2,3,21],["0DF",1,1,3,21]],
7:[["04D",1,2,2,34],["089",1,2,6,34],["0B4",1,1,7,34],["0B7",1,2,6,34],["0D5",1,3,7,34],["0AA",1,2,6,34]],
8:[["037",1,3,3,33],["0C6",1,3,6,33],["0F5",1,1,5,33],["102",1,2,6,33],["109",1,1,7,33],["0AF",1,1,6,33]],
9:[["0AF",1,1,5,35],["0ED",1,1,7,35],["109",1,1,6,35],["14E",1,1,7,35],["0F5",1,1,5,35],["0C6",1,3,5,35]],
10:[["0B5",2,4,2,27],["0ED",1,2,6,27],["0F1",1,1,7,27],["14E",1,1,6,27],["141",1,2,6,27]],
11:[["035",1,4,3,33],["0D7",1,1,7,33],["0E2",1,1,7,33],["0ED",1,3,5,33],["0F1",1,1,6,33],["14E",1,1,5,33]],
12:[["0D7",1,1,6,31],["0E2",1,1,6,31],["0EB",1,1,7,31],["0F1",1,1,5,31],["149",1,1,7,31]]
},
2:{
1:[["053",1,2,3,16],["084",1,3,3,16],["096",1,2,4,16],["0BA",1,2,4,16],["0DC",1,1,2,16]],
2:[["02A",1,4,4,17],["09F",1,2,4,17],["0A4",1,1,3,17],["0C8",1,1,4,17],["0BC",1,2,2,17]],
3:[["04C",1,3,1,20],["0A3",1,2,6,20],["0B1",1,2,7,20,["032",1,3,6,20]]],
4:[["034",1,4,4,17],["062",1,4,4,17],["086",1,3,3,17],["08F",1,3,4,17],["0AC",1,1,2,17]],
5:[["062",1,4,4,20],["094",1,2,4,20],["0B2",1,2,4,20],["0CB",1,2,4,20],["0DD",1,1,2,20],["097",1,2,2,20]],
6:[["097",1,2,4,21],["0A6",1,1,3,21],["0BC",1,2,3,21],["0D5",1,2,3,21],["105",1,2,4,21],["0B2",1,2,4,21]],
7:[["01B",1,3,1,19],["0B8",1,1,4,19],["0DE",1,1,4,19],["105",1,2,3,19],["141",1,1,3,19],["0A6",1,1,4,19]],
8:[["035",1,3,3,31],["04D",1,2,2,31],["0A8",1,1,6,31],["0B8",1,2,7,31],["141",1,2,7,31],["0DE",1,1,6,31]],
9:[["035",1,2,5,31],["0B8",1,2,6,31],["0C2",1,2,7,31],["0EF",1,2,7,31],["141",1,2,6,31]],
10:[["04D",1,3,1,32],["0C2",1,2,6,32],["0EF",1,3,6,32],["0FE",1,2,7,32],["14A",1,1,7,32],["0FC",1,2,5,32]],
11:[["0B9",1,2,1,29],["0EF",1,3,7,29],["0FE",1,2,7,29],["14A",1,1,7,29],["0C2",1,2,7,29]],
12:[["0E4",1,1,7,27],["0E5",1,1,7,27],["0F2",1,2,1,27],["035",1,4,6,27],["0FE",1,2,6,27]]
},
3:{
1:[["008",1,4,3,18],["067",1,4,4,18],["06A",1,4,4,18],["06D",1,3,3,18],["05C",1,4,4,18]],
2:[["012",1,4,4,20],["05F",1,3,3,20],["065",1,2,3,20],["072",1,2,4,20],["0CA",1,2,3,20],["06A",1,4,3,20]],
3:[["068",1,4,4,23],["06D",1,3,3,23],["0A5",1,1,3,23],["0E8",1,4,4,23],["0E9",1,2,4,23],["054",1,2,5,23]],
4:[["056",1,2,3,18],["0A2",1,2,4,18],["0A5",1,1,5,18],["0D9",1,1,3,18],["0BE",1,1,3,18]],
5:[["031",1,4,3,21],["0BE",1,1,4,21],["0CC",1,2,3,21],["0D9",1,1,4,21],["103",1,2,4,21],["0AD",1,1,3,21]],
6:[["0B2",1,2,4,21],["0B7",1,1,3,21],["0C1",1,2,3,21],["0CC",1,2,4,21],["103",1,2,3,21],["0AD",1,1,4,21]],
7:[["02F",1,3,3,21],["0B7",1,1,4,21],["0C1",1,2,4,21],["0CE",1,3,4,21],["0DE",1,1,3,21],["05D",1,3,3,21]],
8:[["05D",1,4,6,36],["0C4",1,2,5,36],["0E0",1,2,5,36],["0F3",1,2,7,36],["143",1,1,7,36],["02F",1,4,6,36]],
9:[["0B8",1,2,6,36],["0E0",1,2,5,36],["0F7",1,2,7,36],["0FA",1,2,7,36],["143",1,2,6,36],["0C4",1,2,5,36]],
10:[["0B9",1,2,1,29],["0F6",1,2,7,29],["0F7",1,1,7,29],["0FA",1,2,7,29],["143",1,2,7,29]],
11:[["0EC",1,1,7,30],["0F6",1,2,6,30],["0FA",1,3,5,30],["145",1,1,7,30],["0F7",1,3,5,30]],
12:[["0EC",1,2,6,27],["0F4",1,1,7,27],["0F8",1,2,6,27],["145",1,1,7,27],["0F2",1,4,1,27]]
},
4:{
1:[["03D",1,4,3,21],["05E",1,3,4,21],["09D",1,2,4,21],["0CF",1,2,4,21],["104",1,2,3,21,["04B",1,2,3,21]]],
2:[["051",1,2,3,21],["095",1,2,4,21],["09E",1,2,4,21],["0B3",1,2,3,21],["0D4",1,2,3,21],["101",1,2,4,21]],
3:[["059",1,2,3,21],["06E",1,3,4,21],["0A2",1,2,4,21],["0CD",1,2,3,21],["104",1,2,4,21],["101",1,2,3,21]],
4:[["013",1,4,3,20],["05A",1,2,3,20],["0A0",1,2,4,20],["0FF",1,2,4,20],["106",1,1,4,20],["107",1,1,2,20]],
5:[["057",1,2,4,21],["060",1,3,3,21],["070",1,2,3,21],["0B4",1,2,3,21],["107",1,1,4,21],["0A9",1,2,4,21]],
6:[["057",1,2,3,21],["0A8",1,1,4,21],["0A9",1,2,3,21],["0B4",1,2,3,21],["102",1,2,4,21],["0CE",1,2,4,21]],
7:[["037",1,4,3,25],["0A8",1,1,4,25],["0AF",1,1,4,25],["0DA",1,1,5,25],["102",1,2,5,25],["0CE",1,2,4,25]],
8:[["0B5",1,4,2,33],["0DA",1,1,6,33],["0F3",1,2,5,33],["0F5",1,1,7,33],["14B",1,1,7,33],["037",1,4,6,33]],
9:[["0F0",1,2,7,31],["0F3",1,2,5,31],["0F5",1,1,6,31],["0F8",1,2,7,31],["14B",1,1,6,31]],
10:[["0F0",1,2,6,36],["0F8",1,2,6,36],["0FB",1,2,7,36],["10C",1,1,7,36],["14B",1,1,5,36],["0F5",1,1,5,36]],
11:[["0B0",1,1,7,36],["0F8",1,2,5,36],["0FB",1,2,6,36],["0FD",1,1,7,36],["10C",1,1,6,36],["0F0",1,2,5,36]],
12:[["0B0",1,1,7,29],["0FD",1,2,7,29],["108",1,1,7,29],["10C",1,1,7,29],["0B9",1,2,1,29]]
},
5:{
1:[["03E",1,4,4,21],["074",1,4,3,21],["07B",1,3,4,21],["07F",1,2,3,21],["0C8",1,1,4,21,["025",1,4,3,21]]],
2:[["086",1,3,3,21],["087",1,2,3,21],["08D",1,3,4,21],["0BB",1,2,4,21],["0D0",1,2,4,21],["02C",1,4,3,21]],
3:[["015",1,4,4,14],["02C",1,4,3,14],["08C",1,3,3,14],["0DC",1,1,4,14]],
4:[["01B",1,3,1,29],["0A7",1,2,7,29],["0B1",1,2,7,29],["088",1,2,7,29],["0DC",1,1,7,29]],
5:[["080",1,2,3,21],["088",1,2,4,21],["092",1,3,3,21],["0A7",1,2,3,21],["0C9",1,1,4,21],["02E",1,3,4,21]],
6:[["02E",1,4,5,24],["06B",1,4,3,24],["0B2",1,2,3,24],["0C0",1,2,4,24],["0DF",1,1,5,24],["0AA",1,1,4,24]],
7:[["0AA",1,1,3,21],["0C0",1,2,3,21],["0C3",1,2,4,21],["0C6",1,2,4,21],["0DF",1,2,3,21],["0D5",1,2,4,21]],
8:[["0C3",1,2,5,33],["0D5",1,3,5,33],["0D6",1,1,7,33],["0DA",1,1,6,33],["0FC",1,2,3,33],["0AF",1,1,7,33]],
9:[["0B5",2,3,2,34],["0D6",1,1,6,34],["0F9",1,2,7,34],["0FC",1,2,6,34],["109",1,1,7,34],["0AF",1,1,6,34]],
10:[["0C7",1,2,7,36],["0F9",1,2,6,36],["0FC",1,2,5,36],["109",1,1,6,36],["144",1,1,7,36],["0D6",1,1,5,36]],
11:[["0AB",1,1,7,36],["0C7",1,2,6,36],["0F9",1,2,5,36],["144",1,1,6,36],["14D",1,1,7,36],["109",1,1,5,36]],
12:[["0AB",1,1,6,29],["0C7",1,2,5,29],["0EE",1,1,7,29],["14D",1,1,6,29],["144",1,1,5,29]]
}
};
const WEAPON_CAT_META={
"Sword":{"skl_a":60,"wmul":{"1":1.1}},
"Spear":{"skl_a":60,"wmul":{"2":1.1}},
"Bow":{"skl_a":60,"wmul":{"3":1.1}},
"Axe":{"skl_a":60,"wmul":{"4":1.1}},
"Knife":{"skl_a":60,"wmul":{"5":1.1}},
"Claws":{"skl_a":60,"wmul":{"6":1.1}},
"Staff":{"skl_a":60,"wmul":{"7":1.1}},
"Wand":{"skl_a":0,"wmul":{"8":1.1}},
"Fan":{"skl_a":60,"wmul":{"10":1.1}},
"Hammer":{"skl_a":60,"wmul":{"11":1.1}},
"Whip":{"skl_a":60,"wmul":{"12":1.1}},
"Boomerang":{"skl_a":60}
};
const WEAPON_META={
"はやぶさの剣":{"cat":"Sword","en":"Falcon blade","falcon":true,"a":26,"note":"⚔"},
"メタスラの剣":{"cat":"Sword","en":"Metal slime sword","metal":1,"a":110,"note":"🗡"},
"メタスラのやり":{"cat":"Spear","en":"Metal slime spear","metal":1,"a":115,"note":"🗡"},
"風林火山":{"cat":"Fan","en":"Attribeauty","metal":1,"antiBlk":true,"pri":1,"a":123,"note":"🌀"},
"きしんのまそう":{"cat":"Spear","en":"Poker","antiBlk":true,"a":144,"note":"🔱"},
"キラーピアス":{"cat":"Knife","en":"Falcon knife earrings","falcon":true,"a":1,"note":"💍","needDeath0":true},
"どくばり":{"cat":"Knife","en":"Poison needle","fixedDmg":1,"hits":1,"note":"🪡","needDeath0":true},
"剣":{"cat":"Sword","generic":true,"a":180},
"ヤリ":{"cat":"Spear","generic":true,"a":176},
"弓":{"cat":"Bow","generic":true,"a":178},
"オノ":{"cat":"Axe","generic":true,"a":178},
"短剣":{"cat":"Knife","generic":true,"a":155},
"ツメ":{"cat":"Claws","generic":true,"a":173},
"棍":{"cat":"Staff","generic":true,"a":170},
"杖":{"cat":"Wand","generic":true,"a":98},
"扇":{"cat":"Fan","generic":true,"a":164},
"ハンマー":{"cat":"Hammer","generic":true,"a":174},
"ムチ":{"cat":"Whip","generic":true,"a":140},
"ブーメラン":{"a":138,"cat":"Boomerang","generic":true},
"ドラゴンキラー":{"a":73,"cat":"Sword","wmul":{"1":1.2}},
"ホーリーランス":{"a":39,"cat":"Spear","wmul":{"7":1.2}},
"バトルフォーク":{"a":47,"cat":"Spear","wmul":{"10":1.2}},
"聖なるナイフ":{"a":18,"cat":"Knife","wmul":{"7":1.2}},
"バタフライダガー":{"a":38,"cat":"Knife","wmul":{"5":1.2}},
"うみなりの杖":{"a":25,"cat":"Wand","wmul":{"10":1.2}},
"女王のムチ":{"a":80,"cat":"Whip","wmul":{"12":1.2}},
"しゅらのこん":{"a":142,"cat":"Staff","wmul":{"9":1.2}},
"まよけのツメ":{"a":43,"cat":"Claws","wmul":{"9":1.2}},
"ドリルナックル":{"a":61,"cat":"Claws","wmul":{"6":1.2}},
"まじゅうのツメ":{"a":114,"cat":"Claws","wmul":{"2":1.2}},
"竜王のツメ":{"a":143,"cat":"Claws","wmul":{"1":1.2}},
"たつじんのオノ":{"a":87,"cat":"Axe","wmul":{"4":1.2}},
"ふんさいのおおなた":{"a":134,"cat":"Axe","wmul":{"11":1.2}},
"きょだいスパナ":{"a":64,"cat":"Hammer","wmul":{"6":1.2}},
"きょじんのハンマー":{"a":109,"cat":"Hammer","wmul":{"11":1.2}},
"ペンタグラム":{"a":89,"cat":"Boomerang","wmul":{"8":1.2}},
"かりうどの弓":{"a":70,"cat":"Bow","wmul":{"3":1.2}},
"天使の弓":{"a":142,"cat":"Bow","wmul":{"8":1.2}},
"最小攻撃力":{"a":3}
};
const SOLVER_ENTRIES=[
{jp:'攻撃'},
{jp:'攻撃 (全体)',en:'Attack(All)'},
{jp:'攻撃(毒針)',needle:true},
{jp:'とうこん討ち'},
{jp:'とうこん討ち(毒針)',needle:true},
{jp:'はやぶさ斬り'},
{jp:'メタル斬り'},
{jp:'しっぷうづき'},
{jp:'火ふき芸'},
{jp:'ビッグバン'},
{jp:'ドルマドン'},
{jp:'メラガイアー'},
{jp:'メラゾーマ'},
{jp:'メラ'},
{jp:'森羅万象斬'},
{jp:'さばきの杖'},
{jp:'なぎはらい'},
{jp:'ザラキーマ'},
{jp:'みのがす'},
{jp:'おうえん'},
{jp:'ギガブレイク'},
{jp:'ジゴスパーク'},
{jp:'らせん打ち'},
{jp:'双竜打ち',alias:'双竜打ち (単体)',soloGroup:true},
{jp:'地這い大蛇'},
{jp:'ギガスロー'},
{jp:'ランドインパクト'},
{jp:'シャイニングボウ'},
{jp:'グランドネビュラ'},
{jp:'マヒャデドス'},
{jp:'マヒャド'},
{jp:'ヒャダルコ'},
{jp:'バギムーチョ'},
{jp:'無心こうげき'},
{jp:'愛のムチ'},
{jp:'ゴッドスマッシュ'},
{jp:'波紋演舞'},
{jp:'オノむそう'},
{jp:'パワフルスロー'},
{jp:'マグマの杖'},
{jp:'バックダンサー呼び'},
];
const FOURCE_BONUS=1.1;
const DMG_STAT={
might:[['might'],s=>s.might||0],
str:[['str'],s=>s.str||0],
'str+might':[['str','might'],s=>(s.str||0)+(s.might||0)],
'str+deft':[['str','deft'],s=>(s.str||0)+(s.deft||0)],
mending:[['mending'],s=>s.mending||0],
stat:[['might','mending'],s=>s.might||s.mending||0]
};
const SOLVER_STAT_FIELDS=[
{key:'atk',label:'ATK',min:7,solverOnly:true},
{key:'str',dom:'str',label:'STR',preset:0,min:4},
{key:'might',dom:'might',label:L02,preset:1,min:0},
{key:'agi',dom:'agi',label:'AGI',preset:2,min:4,actor:true},
{key:'mending',dom:'mend',label:L04,preset:3,min:0},
{key:'deft',dom:'deft',label:'Deftness',preset:4,min:1},
];
const VOC_STATS=[
{jp:'戦士',en:'Warrior',s:[504,300,278,300,421]},
{jp:'僧侶',en:'Priest',s:[301,300,512,700,416]},
{jp:'魔法使い',en:'Mage',s:[196,700,601,300,514]},
{jp:'武闘家',en:'Martial Artist',s:[499,300,700,300,465]},
{jp:'盗賊',en:'Thief',s:[399,300,610,381,612]},
{jp:'旅芸人',en:'Minstrel',s:[346,461,559,495,514]},
{jp:'ﾊﾞﾄﾙﾏｽﾀｰ',en:'Gladiator',s:[600,300,224,300,466]},
{jp:'ﾊﾟﾗﾃﾞｨﾝ',en:'Paladin',s:[454,300,173,464,219]},
{jp:'魔法戦士',en:'Armamentalist',s:[451,582,273,300,320]},
{jp:'ﾚﾝｼﾞｬｰ',en:'Ranger',s:[405,300,364,500,710]},
{jp:'賢者',en:'Sage',s:[302,537,318,508,267]},
{jp:'ｽｰﾊﾟｰｽﾀｰ',en:'Luminary',s:[248,377,561,618,469]},
{jp:'種ﾄﾞｰﾋﾟﾝｸﾞ',en:'Boosted',s:[999,999,999,999,999]},
];
const TENSION=[
{eggs:1,lv:5,mul:1.5},
{eggs:2,lv:20,mul:2.5},
{eggs:3,lv:50,mul:4.0},
];
const TENSION_MULS=TENSION.map(t=>t.mul);
const getTensionLevel=(mul)=>TENSION[Math.max(0,tensionStage(mul)-1)].lv;
const tensionStage=(mul)=>mul>=TENSION[2].mul?TENSION[2].eggs:mul>=TENSION[1].mul?TENSION[1].eggs:mul>1?TENSION[0].eggs:0;
const tensionFlat=(mul,lv,isMetal)=>isMetal?0:tensionStage(mul)*(1+Math.floor((lv>0?lv:99)/10));
const applyTension=(dmg,mul,lv,isMetal)=>mul>1&&dmg>0?Math.floor(dmg*mul)+tensionFlat(mul,lv,isMetal):dmg;
const METAL_MONSTERS=new Set(['01B','04C','04D','0B5','0B9','0F2']);
const SOLVER_ROUND_SIZE=4;
const SOLVER_MAX_ACTIONS=SOLVER_ROUND_SIZE*2;
const SOLVER_BASIC_SKILLS=['攻撃','とうこん討ち'];
const SOLVER_CONDITION_BOUNDS_REPLAY_LIMIT=4000,SOLVER_CONDITION_BOUNDS_FIND_LIMIT=40000,SOLVER_CONDITION_BOUNDS_REJECT_STREAK=256;
const SOLVER_ROW_FALLBACK_TAG={
'':' <span style="color:#fa0;font-size:9px;" title="mercy/KMC → kill all">⚡</span>',
'partial-mercy':' <span style="color:#fa0;font-size:9px;" title="Fallback: defeat some companions, then Mercy">⚡</span>'
};
const SOLVER_VARIANT_MAX=12;
const WTYPE_GENERIC_BY_T={};
for(const jp in WEAPON_META){
const wm=WEAPON_META[jp],cat=WEAPON_CAT_META[wm.cat];
if(wm.generic&&cat)for(const type in cat.wmul||{})WTYPE_GENERIC_BY_T[type]={cat:wm.cat,jp};
}
const _solverWeaponData=Object.fromEntries(Object.entries(WEAPON_META).map(([eq,wm])=>{
const cat=WEAPON_CAT_META[wm.cat],bonus=cat&&wm.a+cat.skl_a,fixedDmg=weaponMetaValue(eq,'fixedDmg');
const ready=!!wm.cat&&(fixedDmg?Number.isInteger(fixedDmg)&&fixedDmg>0&&Number.isInteger(wm.hits)&&wm.hits>0:!!cat&&Number.isInteger(wm.a)&&wm.a>=0&&Number.isInteger(cat.skl_a)&&cat.skl_a>=0&&bonus>=WEAPON_META['最小攻撃力'].a);
return[eq,{ready,bonus}];
}));
const AB_WEAPONS=Object.keys(WEAPON_META).filter(eq=>weaponMetaValue(eq,'antiBlk')).map(eq=>[eq,WEAPON_META[eq].note]);
const PLUS1_WEAPONS=Object.keys(WEAPON_META).filter(eq=>weaponMetaValue(eq,'metal'));
const METAL_ONLY_WEAPONS=new Set(Object.keys(WEAPON_META).filter(eq=>weaponMetaValue(eq,'metal')&&!weaponMetaValue(eq,'falcon')&&!weaponMetaValue(eq,'antiBlk')&&!weaponMetaValue(eq,'pri')&&!weaponMetaValue(eq,'fixedDmg')&&!WEAPON_META[eq].wmul));
const _solverDefaultEquips=new WeakMap();
let _solverAtkDomain;
function weaponMetaValue(eq,key){
const wm=WEAPON_META[eq];
if(!wm)return undefined;
const cat=WEAPON_CAT_META[wm.cat];
const value=wm[key]===undefined&&cat?cat[key]:wm[key];
return value===undefined&&key==='en'&&wm.generic?wm.cat:value;
}
function solverWeaponReady(eq){
const row=_solverWeaponData[eq];
return!!(row&&row.ready);
}
function solverWeaponCompatible(sk,eq){
const wm=WEAPON_META[eq];
return!!(sk&&solverWeaponReady(eq)&&(sk.equip?eq===sk.equip:!weaponMetaValue(eq,'fixedDmg')&&WEAPON_SKILLS[wm.cat]&&WEAPON_SKILLS[wm.cat].has(sk.jp)));
}
function solverDefaultEquip(sk){
if(!sk)return'';
if(_solverDefaultEquips.has(sk))return _solverDefaultEquips.get(sk);
let result=sk.equip||'',first='';
if(!result&&sk.at[0]!==0&&!((sk.dmg||sk.fixedDmg||sk.el===12)&&!WEAPON_SKILLS[sk.weapon])){
for(const eq in WEAPON_META)if(solverWeaponCompatible(sk,eq)){if(WEAPON_META[eq].generic){result=eq;break;}first=first||eq;}
result=result||first;
}
_solverDefaultEquips.set(sk,result);
return result;
}
function deriveSolverAtk(str,equip,override,skill){
if(!solverWeaponReady(equip)||weaponMetaValue(equip,'fixedDmg'))return null;
if(override!==undefined&&(!skill||solverConditionStatKeys(skill,true).includes('atk')))return Number.isInteger(override)&&override>=0&&override<=999?override:null;
const domain=_solverAtkDomain||(_solverAtkDomain=solverStatDomain('str'));
if(!Number.isInteger(str)||str<domain.min||str>999)return null;
return Math.min(999,str+_solverWeaponData[equip].bonus);
}
function getWeaponTypeMultiplier(equip,monId){
if(!equip)return 1;
const wm=WEAPON_META[equip],cat=wm&&WEAPON_CAT_META[wm.cat];
const mon=getMonDB(monId);
return mon&&(wm&&wm.wmul&&wm.wmul[mon.t]||cat&&cat.wmul&&cat.wmul[mon.t])||1;
}
function solverWeaponMul(sk,equip,hex){return sk&&sk.dmg?1:getWeaponTypeMultiplier(equip||(sk&&WEAPON_SKILLS[sk.weapon]?solverDefaultEquip(sk):''),hex);}
const _solverMinimumDamageBasis=new WeakMap();
const _solverSingleRemovalBasis=new WeakMap();
function solverMinimumDamageBound(action,hexId,chars){
const mon=getMonDB(hexId),hp=mon&&mon.s[0],limit=hp&&monHpMin(hp),sk=lookupSkill(action.jp);
if(!mon||!(hp>0)||!Number.isFinite(hp)||isMetalHex(hexId)||mon.s[4]>0)return null;
if(!sk||!(action.at>0)||action.equip==='miss'||isSolverNonDamageRemoval(action))return{chip:0,removal:0};
if(sk.dmg&&sk.dmg.m&&sk.dmg.m!==sk.dmg.b&&(!(sk.dmg.m>=sk.dmg.b)||!(sk.dmg.hi>sk.dmg.lo)||!DMG_STAT[sk.dmg.st]))return{chip:0,removal:0};
const forms=action.equip||action.needle?[action]:[action,...getSkillEquipOpts(action.jp,hexId).map(o=>({...action,...o}))];
const hits=SolverActionGate.hits(action),statsKey=chars?JSON.stringify(chars.map(c=>c.stats)):null;
let known=_solverMinimumDamageBasis.get(sk);
if(!known){known=new Map();_solverMinimumDamageBasis.set(sk,known);}
let low=Infinity;
for(const form of forms)for(const force of[null,...Object.values(FOURCE_EL)]){
const wm=solverWeaponMul(sk,form.equip,hexId),eff=actionMetalEff(sk,form.equip),key=JSON.stringify([hexId,form.equip||'',wm,eff,force,statsKey]);
let value=known.get(key);
if(value===undefined){
value=Infinity;
let points=chars?chars.map(c=>c.stats):[MIN_STATS];
if(!chars&&!sk.dmg&&!sk.fixedDmg){
const domain={min:solverStatMin('atk',form.equip)};
const starts=[domain.min,Math.floor(mon.s[2]/2)+1,Math.floor(mon.s[2]/1.75)+1];
points=[...new Set(starts.map(atk=>Math.max(domain.min,Math.min(999,atk))))].map(atk=>({...MIN_STATS,atk}));
}
for(const st of points){
const d=calcSkillDamageCache(sk,st,hexId,force,wm,eff,form.equip);
if(!d||!Number.isFinite(d.min)||!Number.isFinite(d.max)||d.max<0){value=0;break;}
value=Math.min(value,d.max);
}
if(!Number.isFinite(value))value=0;
known.set(key,value);
}
low=Math.min(low,value);
}
if(!Number.isFinite(low))low=0;
const chip=low*hits,head=low*Math.max(0,hits-1);
return Object.freeze({chip,removal:head>=limit?2:chip>=limit?1:0});
}
function solverSingleRemovalCapacity(variants,hexId){
const mon=getMonDB(hexId);
if(!mon||!(mon.s[0]>0)||!Number.isFinite(mon.s[0])||isMetalHex(hexId)||mon.s[4]>0)return null;
const chars=solverUseStatsEnabled()?readCharStatsFromDom():null,key=JSON.stringify([hexId,chars?chars.map(c=>c.stats):null]);
let known=_solverSingleRemovalBasis.get(variants);
if(!known){known=new Map();_solverSingleRemovalBasis.set(variants,known);}
if(known.has(key))return known.get(key);
const rows=variants.map(v=>solverMinimumDamageBound(v,hexId,chars)||{chip:0,removal:0});
const result=Object.freeze({removal:Object.freeze({capacity:1,values:Object.freeze(rows.map(r=>r.removal))}),chips:Object.freeze({limit:monHpMin(mon.s[0]),values:Object.freeze(rows.map(r=>r.chip))})});
known.set(key,result);
return result;
}
function getRankOrderValue(r){return r==='gold'?2:r==='orange'?1:0;}
function binarySearchTrue(lo,hi,pred,mode){
if(mode==='min'){
while(lo<hi){const m=(lo+hi)>>1;if(pred(m))hi=m;else lo=m+1;}
return lo;
}else if(mode==='max'){
let cap=lo-1;
while(lo<=hi){const m=(lo+hi)>>1;if(pred(m)){cap=m;lo=m+1;}else hi=m-1;}
return cap;
}
}
const SKILL_IDX={},SKILL_BY_ID=[];
const FOURCE_EL={};
const FOURCE_EN={};
const WEAPON_SKILLS={};
for(const wm of Object.values(WEAPON_META)){
if(!WEAPON_SKILLS[wm.cat])WEAPON_SKILLS[wm.cat]=new Set();
}
for(const s of SKILL_DB){
SKILL_IDX[s.jp]=s;
SKILL_BY_ID[s.id]=s;
if(s.addsEl)FOURCE_EL[s.jp]=s.addsEl;
if(s.weapon==='Armamentalist'&&s.en)FOURCE_EN[s.jp]=s.en;
if(s.cat!=='spell'&&s.cat!=='item'){
const isGlad=s.weapon==='Gladiator';
const isAtkS=s.jp==='攻撃'&&s.target==='S';
for(const cat of Object.keys(WEAPON_SKILLS))if(s.weapon===cat||isGlad||isAtkS)WEAPON_SKILLS[cat].add(s.jp);
}
}
function isHitBased(skill){
const t=skill.target;
return t==='S'||t==='RS'||t==='RG'||t==='RA';
}
function getHits(skill,hasDoubling){
if(!isHitBased(skill))return 1;
const dh=skill.fh||skill.kph;
const fixedRange=(skill.hitRange&&skill.hitRange.normalMin===skill.hitRange.max)?skill.hitRange.max:0;
const base=skill.hit||fixedRange||(dh?dh/2:1);
if(hasDoubling&&!fixedRange&&dh)return dh;
else return base;
}
function getEquipHitCount(sk,eq){
if(weaponMetaValue(eq,'fixedDmg'))return WEAPON_META[eq].hits;
else return getHits(sk,!!(weaponMetaValue(eq,'falcon')&&solverWeaponCompatible(sk,eq)));
}
function buildSolverExactHitVariants(base,firstAT,diffAT,maxHits,minEarlyHits){
const H=Math.max(1,Math.floor(maxHits||1));
const full=Object.assign({},base,{at:solverATForCount(firstAT,diffAT,H),hits:H});
const out=[full];
for(let h=Math.max(1,Math.floor(minEarlyHits||1));h<H;h++){
out.push(Object.assign({},base,{
at:solverATForCount(firstAT,diffAT,h),hits:h,earlyKill:true,
note:(base.note||'')+`⚡${h}hit`
}));
}
return out;
}
for(const e of SOLVER_ENTRIES)if(e.alias&&SKILL_IDX[e.alias])SKILL_IDX[e.jp]=SKILL_IDX[e.alias];
function lookupSkill(key){return typeof key==='number'?SKILL_BY_ID[key]:SKILL_IDX[key];}
const ACT_EGG={jp:'おうえん',en:lookupSkill('おうえん').en,at:lookupSkill('おうえん').at[0],equip:'',note:'',hits:0};
const ACT_MERCY={jp:'みのがす',en:lookupSkill('みのがす').en,at:lookupSkill('みのがす').at[0],equip:'',note:'',hits:0};
const ACT_ISSEN={jp:'一閃づき',en:lookupSkill('一閃づき').en,at:lookupSkill('一閃づき').at[0],equip:'',note:'',hits:1};
const METAL_PADDING=[
['攻撃','メタスラの剣'],
['攻撃','風林火山'],
['しっぷうづき','メタスラのやり'],
['はやぶさ斬り','メタスラの剣'],
['メタル斬り',''],
['メタル斬り','はやぶさの剣'],
['とうこん討ち','メタスラの剣'],
['とうこん討ち','風林火山'],
['無心こうげき','メタスラの剣'],
['無心こうげき','風林火山'],
['火ふき芸','miss','💨'],
['ビッグバン','miss','💨'],
['ドルマドン','miss','💨'],
['メラガイアー','miss','💨'],
['おうえん',''],
].map(([jp,eq,note])=>{const sk=lookupSkill(jp);return[jp,sk.en,eq==='miss'?sk.miss:solverATForCount(sk.at[0],sk.at[1],getEquipHitCount(sk,eq)),eq,WEAPON_META[eq]?WEAPON_META[eq].note:(note||'')];});
function calcPhysicalDamageRange(x,y,mul){
const ratio=x>0?y/x:999;
if(ratio>=2)return{min:0,max:1};
if(ratio>=1.75)return{min:0,max:Math.floor(x/16)};
const zBase=Math.floor(x/2)-Math.floor(y/4);
const z=Math.floor(Math.max(zBase,0)*(mul||1));
const eps=Math.floor(z/16)+1;
return{min:Math.max(0,z-eps),max:z+eps};
}
function applyElementMod(baseDmg,el,monId){
if(!el)return baseDmg;
const mon=getMonDB(monId);
if(!mon)return baseDmg;
return Math.floor(baseDmg*mon.s[el]/100);
}
function applyElementAndFource(baseDmg,skill,monId,fourceEls){
if(skill.fixedDmg)return baseDmg;
if(skill.el)return applyElementMod(baseDmg,skill.el,monId);
if(!fourceEls||fourceEls.length===0)return baseDmg;
const mon=getMonDB(monId);
if(!mon)return baseDmg;
let best=baseDmg;
for(const el of fourceEls){
const mod=Math.floor(applyElementMod(baseDmg,el,monId)*FOURCE_BONUS);
if(mod>best)best=mod;
}
return best;
}
function applyTypeMul(baseDmg,skill,monId){
if(!skill.tmul)return baseDmg;
const mon=getMonDB(monId);
if(!mon)return baseDmg;
const factor=skill.tmul[mon.t]||1.0;
return Math.floor(baseDmg*factor);
}
const skillDamageStatReads=sk=>sk.fixedDmg?[]:sk.dmg?(DMG_STAT[sk.dmg.st]||[[]])[0]:['atk'];
function getDamageStat(statKey,stats){const f=DMG_STAT[statKey];return f?f[1](stats):0;}
function calcBaseDmg(skill,stats){
if(skill.fixedDmg)return{min:skill.fixedDmg,max:skill.fixedDmg};
const d=skill.dmg;
if(!d)return null;
if(!d.m||d.b===d.m){return{min:d.b-d.s,max:d.b+d.s};}
const sv=getDamageStat(d.st,stats);
const clamped=Math.max(d.lo,Math.min(sv,d.hi));
const calcBase=d.b+Math.floor((clamped-d.lo)*(d.m-d.b)/(d.hi-d.lo));
return{min:calcBase-d.s,max:calcBase+d.s};
}
function calcSkillDamage(skill,stats,monId,fourceEls,wmul,metalEff,equip){
const mon=getMonDB(monId);
if(!mon)return null;
let base=calcBaseDmg(skill,stats),fixed=false;
if(!base){
const weapon=equip||solverDefaultEquip(skill);
if(!solverWeaponReady(weapon))return null;
const value=weaponMetaValue(weapon,'fixedDmg');
if(value){base={min:value,max:value};fixed=true;}
else{
const atk=stats&&stats.atk!==undefined
?Number.isInteger(stats.atk)&&stats.atk>=solverStatMin('atk',weapon)&&stats.atk<=999?stats.atk:null
:deriveSolverAtk(stats&&stats.str,weapon,stats&&stats.atkOverride,skill);
if(atk===null)return null;
base=calcPhysicalDamageRange(atk,mon.s[2],skill.mul);
}
}
let dMin=base.min,dMax=base.max,pre=null;
if(fixed)metalEff=0;
else{
dMin=applyTypeMul(dMin,skill,monId);
dMax=applyTypeMul(dMax,skill,monId);
if(wmul&&wmul!==1){dMin=Math.floor(dMin*wmul);dMax=Math.floor(dMax*wmul);}
pre=skill.fixedDmg?null:{min:dMin,max:dMax};
dMin=applyElementAndFource(dMin,skill,monId,fourceEls);
dMax=applyElementAndFource(dMax,skill,monId,fourceEls);
if(METAL_ONLY_WEAPONS.has(equip)&&!isMetalHex(monId)&&dMin>0)return null;
dMin+=metalEff;dMax+=metalEff;
}
const hpMax=mon.s[0];
const hpMin=monHpMin(hpMax);
const kill=dMin>=hpMax?'gold':dMax>=hpMin?'orange':null;
return{
min:dMin,max:dMax,pre,metalEff:metalEff||0,
hpMin,hpMax,kill,
evade:skill.ev?mon.s[3]:0,
block:skill.blk?mon.s[4]:0,
};
}
const _solverStatDomains=new Map();
for(const field of SOLVER_STAT_FIELDS)_solverStatDomains.set(field.key,field);
for(const skill of SKILL_DB){
const key=skill.dmg&&skill.dmg.st,reads=key&&key.includes('+')&&DMG_STAT[key]&&DMG_STAT[key][0];
if(reads&&!_solverStatDomains.has(key))_solverStatDomains.set(key,{key,
min:reads.reduce((n,field)=>n+_solverStatDomains.get(field).min,0),max:reads.length*999,sum:reads});
}
const solverStatDomain=key=>_solverStatDomains.get(key);
const solverStatMin=(key,equip)=>key==='atk'&&WEAPON_META[equip]&&!WEAPON_META[equip].generic&&WEAPON_META[equip].a>=0
?Math.max(solverStatDomain(key).min,Math.min(999,solverStatDomain('str').min+WEAPON_META[equip].a)):solverStatDomain(key).min;
const NEUTRAL_PARTY=()=>[0,1,2,3].map(i=>({
stats:{...EXT_STATS},agi:solverStatMin('agi')+3-i,lv:99,job:12,slot:i+1,
}));
var _ios1,_ios2;
const solverUseStatsEnabled=()=>!!((_ios1=byId('si_useStats'))==null?void 0:_ios1.checked);
const solverMultiPlayerEnabled=()=>!!((_ios2=byId('si_multiPlayer'))==null?void 0:_ios2.checked);
function readCharStatsFromDom(){
if(!solverUseStatsEnabled())return NEUTRAL_PARTY();
const chars=[],v=id=>{const el=byId(id);return el?(el.validity&&el.validity.badInput?'NaN':el.value):undefined;};
for(let i=1;i<=4;i++){
const jobRaw=v('si_job'+i);
const{agi,...stats}=Object.fromEntries(SOLVER_STAT_FIELDS.filter(f=>!f.solverOnly).map(f=>[f.key,Number(v('si_'+f.dom+i))]));
const atkRaw=v('si_atk'+i);
if(atkRaw!==undefined&&atkRaw.trim()!=='')stats.atkOverride=Number(atkRaw);
chars.push({stats,agi,lv:parseInt(v('si_t'+i))||99,
job:(jobRaw===undefined||jobRaw==='')?null:parseInt(jobRaw),slot:i});
}
if(!solverConditionPartyDomainOK(chars))throw new RangeError(T('Invalid character stats.','角色能力不合法。','能力値が不正です。'));
chars.sort((a,b)=>b.agi-a.agi);
return chars;
}
const SOLVER_STAT_KEYS=SOLVER_STAT_FIELDS.filter(f=>!f.actor).map(f=>f.key);
const EXT_STATS=Object.fromEntries(SOLVER_STAT_KEYS.map(key=>[key,999]));
const MIN_STATS=Object.fromEntries(SOLVER_STAT_KEYS.map(key=>[key,solverStatMin(key)]));
const solverConditionPartyDomainOK=party=>party.every(c=>c.stats&&SOLVER_STAT_FIELDS.every(f=>{
if(f.solverOnly&&solverUseStatsEnabled())return c.stats[f.key]===undefined;
const value=f.actor?c[f.key]:c.stats[f.key];
return Number.isInteger(value)&&value>=f.min&&value<=999;
})&&(c.stats.atkOverride===undefined||Number.isInteger(c.stats.atkOverride)&&c.stats.atkOverride>=0&&c.stats.atkOverride<=999));
function solverActionDamage(sk,hex,fEls,r,hits,mul,lv,cacheKey){
let values,key;
if(cacheKey!==undefined){
const state=_solverDmgCache.search;
values=state.boosted.get(cacheKey);
if(!values){values=new Map();state.boosted.set(cacheKey,values);}
key=r.min+'|'+r.max+'|'+(r.pre?r.pre.min+'|'+r.pre.max:'')+'|'+(r.metalEff||0);
const saved=values.get(key);
if(saved!==undefined)return{...saved};
}
const metal=isMetalHex(hex);
let result;
if(mul>1&&!metal&&r.pre){
const pre=r.pre,flat=tensionFlat(mul,lv),el=x=>applyElementAndFource(x,sk,hex,fEls),eff=r.metalEff||0;
result={min:el(Math.floor(pre.min*hits*mul)+flat)+eff*hits,max:el(Math.floor(pre.max*hits*mul)+flat)+eff*hits,
head:hits>1?el(Math.floor(pre.max*(hits-1)*mul)+flat)+eff*(hits-1):0};
}else result={min:applyTension(r.min*hits,mul,lv,metal),max:applyTension(r.max*hits,mul,lv,metal),
head:(hits-1)*Math.floor(r.max*mul)+(metal?0:tensionFlat(mul,lv))};
if(values)values.set(key,{...result});
return result;
}
const isMetalHex=(hex)=>METAL_MONSTERS.has(hex);
const monHpMin=(hp)=>Math.floor(hp*0.8);
const getMonDB=(hex)=>MONSTER_DB[hex];
const getFourceEls=(jp)=>FOURCE_EL[jp]||null;
const findInlineFource=(combo)=>combo.find(v=>v.at===0&&getFourceEls(v.jp))||null;
const maxCharLv=(chars)=>(chars&&chars.length)?Math.max.apply(null,chars.map(c=>(c&&c.lv)||99)):99;
function actorAt(chars,assign,ci){
if(!chars)return undefined;
return chars[assign?assign[ci]:(chars.length?ci%chars.length:ci)];
}
function actorLv(chars,assign,ci){
const c=actorAt(chars,assign,ci);
return(c&&c.lv)?c.lv:maxCharLv(chars);
}
const makeEggOnPrefix=(n)=>Array(n).fill(ACT_EGG);
const makeFourceAction=(f)=>({jp:f.jp,en:f.en||f.jp,at:0,equip:'',note:'',hits:0});
function getWeaponMetalFlag(eq){
if(eq==null||eq===''||eq==='miss')return 0;
return weaponMetaValue(eq,'metal')?1:0;
}
function actionMetalEff(sk,eq){return!(sk&&sk.dmg)&&((sk&&sk.metal)||getWeaponMetalFlag(eq))?1:0;}
const solverWeaponAddsPlus1=(sk,eq)=>!!sk&&!!actionMetalEff(sk,eq)&&!actionMetalEff(sk,'');
function getMetalChipMaxDamage(jp,eq){
const sk=lookupSkill(jp)||null;
if(!sk)return 0;
return metalChipPerHit(sk,eq).max*getEquipHitCount(sk,eq);
}
function solverRoundStart(index){return Math.floor(index/SOLVER_ROUND_SIZE)*SOLVER_ROUND_SIZE;}
function solverRoundDepths(round){
return Array.from({length:SOLVER_ROUND_SIZE},(_,i)=>(round-1)*SOLVER_ROUND_SIZE+i+1);
}
function solverRound2RemovalCost(total){return Math.floor(total/2);}
function solverRoundCost(combo,total,r1Removal){
return combo.length>SOLVER_ROUND_SIZE&&r1Removal?solverRound2RemovalCost(total):0;
}
function solverActorSlotOK(pick,k,actor,char,locks,pri){
const r0=solverRoundStart(k),lock=locks[k];
for(let j=r0;j<k;j++)if(pick[j]===actor)return false;
if(lock&&(char.job===null||(char.job!==12&&lock.indexOf(char.job)<0)))return false;
if(lock&&r0>0&&char.job===12)for(let j=0;j<r0;j++)if(pick[j]===actor&&locks[j]&&!locks[j].some(job=>lock.includes(job)))return false;
return!(k>r0&&pri[k]===pri[k-1]&&actor<pick[k-1]);
}
function solverEarlyStopStructureOK(combo){
return!combo.some((v,ci)=>v.earlyKill&&ci!==combo.length-1);
}
function solverFinalActionOK(combo){
const last=combo[combo.length-1];
return last.at>0||last.jp==='みのがす';
}
function isSolverRandomTargetSkill(sk){
const t=SolverActionGate.targetKind(sk);
return t==='RS'||t==='RA'||t==='RG';
}
function solverMetalExecutionCount(combo){
return combo.reduce((n,v)=>n+(isMetalExecutionAction(v)?1:0),0);
}
function solverMetalExecutionsLast(combo){
return[...combo.filter(v=>!isMetalExecutionAction(v)),...combo.filter(isMetalExecutionAction)];
}
function solverMercyLvReached(mon,casterLv){return!(mon.s[13]+7>casterLv);}
function solverMercyCanRemove(inst,casterLv){
if(!inst.alive||inst.death<=0)return false;
const mon=getMonDB(inst.hex);
return!!mon&&!(mon.s[12]<=0)&&solverMercyLvReached(mon,casterLv);
}
function solverEggCanBenefit(action,targets,damage){
if(!solverEggDamageAction(action))return false;
const kind=SolverActionGate.targetKind(lookupSkill(action.jp));
return!targets||targets.some((t,i)=>{
if(!t)return false;
const hex=t.hex||t,group=t.groupIdx===undefined?i:t.groupIdx;
return t.count!==0&&!isMetalHex(hex)
&&((kind!=='S'&&kind!=='G')||action.tgtGroup===undefined||action.tgtGroup===group)
&&(!damage||((damage[hex]==null?void 0:damage[hex].min)||0)>0);
});
}
function solverAllowsRound2(mapDeft,canRound2){
return canRound2===undefined?mapDeft<1000:!!canRound2;
}
function priOrderOK(combo){
for(let i=1;i<combo.length;i++){
if(i%SOLVER_ROUND_SIZE===0)continue;
if(_actionPri(combo[i])>_actionPri(combo[i-1]))return false;
}
return true;
}
const _actionPri=(v)=>(lookupSkill(v.jp)&&lookupSkill(v.jp).pri)||(v.equip&&weaponMetaValue(v.equip,'pri'))||0;
function makeFinisherGate(combo){
const pri=combo.map(_actionPri);
const minPri=Math.min.apply(null,pri);
const earlyN=combo.reduce((n,v)=>n+(v.earlyKill?1:0),0);
const fin=combo.findIndex(v=>WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul);
return(fi)=>pri[fi]===minPri&&earlyN-(combo[fi].earlyKill?1:0)===0&&(fin<0||fi===fin);
}
function getSkillClassLock(action){
const sk=lookupSkill(action.jp);
return(sk&&sk.cat==='spell'&&Array.isArray(sk.cls))?sk.cls:null;
}
function canExecuteMetal(action,hexId){
if(!isMetalExecutionAction(action))return null;
return{isValid:isMetalHex(hexId)};
}
const METAL_ACTION_KEYS=new Set(METAL_PADDING
.filter(row=>row[2]>0)
.map(row=>row[0]+'\x1f'+row[2]+'\x1f'+row[3]));
function isMetalActionSkill(action){
if(!action||action.supTarget||!(action.at>0))return false;
if(action.jp==='一閃づき')return action.at===ACT_ISSEN.at;
return METAL_ACTION_KEYS.has(action.jp+'\x1f'+action.at+'\x1f'+(action.equip||''));
}
function isMetalExecutionAction(action){
return!!action&&action.jp==='一閃づき';
}
function isSolverNonDamageRemoval(action){
return action.jp==='ザラキーマ'||action.jp==='みのがす'||isMetalExecutionAction(action);
}
function solverNeedleTargetOK(hex){var _ios6;return((_ios6=getMonDB(hex))==null?void 0:_ios6.s[12])===0;}
function solverEggDamageAction(action){
const sk=action&&lookupSkill(action.jp);
return!!(sk&&action.at>0&&!isMetalExecutionAction(action)
&&sk.el!==12&&!sk.fixedDmg&&!weaponMetaValue(action.equip,'fixedDmg'));
}
function solverPreservesTension(action){
return action.jp==='おうえん'||action.jp==='ザラキーマ'
||(action.at===0&&!!getFourceEls(action.jp));
}
function solverEggCanReach(combo,eggCI,targetCI,assign,actorCount=SOLVER_ROUND_SIZE){
if((combo[eggCI]==null?void 0:combo[eggCI].jp)!=='おうえん'||targetCI<=eggCI||!solverEggDamageAction(combo[targetCI]))return false;
const actor=ci=>assign?assign[ci]:ci%actorCount;
const beneficiary=actor(targetCI);
if(beneficiary===actor(eggCI))return false;
for(let ci=eggCI+1;ci<targetCI;ci++)
if(actor(ci)===beneficiary&&!solverPreservesTension(combo[ci]))return false;
return true;
}
function deriveSolverBattlePlan(monGroups,monId,mercyLv,forceKillAll){
const T=groupTotal(monGroups||[]);
const tc2=solverRound2RemovalCost(T);
const isMetal=isMetalHex(monId);
const mainGroup=monGroups&&monGroups[0];
const sups=(monGroups||[]).filter(g=>!g.isMain);
mercyLv=mercyLv>0?mercyLv:99;
const effectiveDeath=(g)=>(g&&solverMercyCanRemove({hex:g.hex,death:g.death,alive:true},mercyLv))?g.death:0;
const metalSupCount=!isMetal
?sups.reduce((s,g)=>s+((g.count>0&&g.hex&&isMetalHex(g.hex))?g.count:0),0):0;
let planType='kill_all',postAlive=T;
if(!forceKillAll&&T>1&&mainGroup){
const d0SC=sups.filter(g=>effectiveDeath(g)===0).reduce((s,g)=>s+g.count,0);
const dG0SC=sups.filter(g=>effectiveDeath(g)>0).reduce((s,g)=>s+g.count,0);
if(effectiveDeath(mainGroup)===0&&dG0SC>0){
if(metalSupCount>0){
planType='kill_mercy_clear';postAlive=d0SC+(mainGroup.count-1);
}else{
planType='mercy_first';postAlive=mainGroup.count+d0SC;
}
}else if(effectiveDeath(mainGroup)>0&&(mainGroup.count>=2||dG0SC>0)){
planType='kill_mercy_clear';postAlive=d0SC;
}
}
if(forceKillAll){planType='kill_all';postAlive=0;}
return{T,tc2,hexId:monId,isMetal,mainGroup,sups,metalSupCount,planType,postAlive,effectiveDeath};
}
function pickBestFource(hexId){
const mon=getMonDB(hexId);
if(!mon)return null;
let bestJp=null,bestMod=0;
for(const[jp,elArr]of Object.entries(FOURCE_EL)){
for(const elIdx of elArr){
const mod=mon.s[elIdx]||100;
if(mod>bestMod){bestJp=jp;bestMod=mod;}
}
}
if(bestMod<=100)return null;
return{jp:bestJp,en:FOURCE_EN[bestJp]||bestJp};
}
function isMultiTargetOnly(combo){
const counts={};
for(const v of combo){
const sk=lookupSkill(v.jp);
if(v.jp==='おうえん'||(sk&&sk.hiden)){
counts[v.jp]=(counts[v.jp]||0)+1;
if(counts[v.jp]>=2)return true;
}
}
return false;
}
function canMetalChipsKill(comboPads,metalHPs){
if(!metalHPs||metalHPs.length===0)return true;
const chips=comboPads.filter(c=>(c.mdmg||0)>0).map(c=>c.mdmg);
if(chips.length===0)return true;
const minHPs=metalHPs.map(h=>monHpMin(h));
const D=chips.reduce((a,b)=>a+b,0);
const cap=minHPs.reduce((s,h)=>s+Math.max(0,h-1),0);
if(D>cap)return false;
const maxChip=Math.max(...chips);
const maxBin=Math.max(...minHPs.map(h=>h-1));
if(maxChip>maxBin)return false;
return true;
}
function solverFieldBlock(hexes){
return Math.max(0,...hexes.map(h=>{const m=h&&getMonDB(h);return(m&&m.s[4])||0;}));
}
function solverActionAntiBlock(action){
const sd=lookupSkill(action.jp);
if(sd&&sd.blk===0)return true;
return!!(action.equip&&weaponMetaValue(action.equip,'antiBlk')&&!(sd&&sd.antiBlk===false));
}
function solverBlockedHitReason(action){
if(solverActionAntiBlock(action))return null;
const sk=lookupSkill(action.jp);
if(SolverActionGate.targetKind(sk)!=='A')return'blocked_target';
return'blocked_at';
}
function solverBlockStructureOK(combo,targets){
if(!solverBlockRuleEnabled()||!targets.every(t=>!(t.count>0)||solverFieldBlock([t.hex])>0))return true;
return combo.every(v=>!(v.at>0)||!solverBlockedHitReason(v));
}
function solverTargetImmuneToElement(el,hex){
const m=el>0&&hex&&!isMetalHex(hex)&&getMonDB(hex);
return!!m&&m.s[el]===0;
}
function solverWeaponPurposeOK(action,sk,targets,dTable,assign,ci){
const eq=action.equip;
if(METAL_ONLY_WEAPONS.has(eq))return targets.length>0&&targets.every(t=>isMetalHex(t.hex)||!!(dTable&&dTable[t.hex]&&dTable[t.hex].hit));
if(!eq||eq==='miss'||weaponMetaValue(eq,'falcon')||weaponMetaValue(eq,'fixedDmg'))return true;
if(action.priSwap||weaponMetaValue(eq,'pri')&&!(sk&&sk.pri)){
const moved=!!assign&&solverUseStatsEnabled()&&!(_solverFieldHexes||[]).some(isMetalHex)
&&assign.some((a,j)=>j>ci&&j<solverRoundStart(ci)+SOLVER_ROUND_SIZE&&a<assign[ci]);
if(action.priSwap||moved)return moved;
}
if(weaponMetaValue(eq,'antiBlk')&&!(sk&&sk.antiBlk===false)&&targets.some(t=>solverFieldBlock([t.hex])>0))return true;
if(targets.some(t=>!isMetalHex(t.hex)&&solverWeaponMul(sk,eq,t.hex)>1))return true;
return solverWeaponAddsPlus1(sk,eq)&&!isMetalExecutionAction(action)
&&targets.some(t=>isMetalHex(t.hex)||solverTargetImmuneToElement(sk&&sk.el,t.hex));
}
const solverBlockRuleEnabled=()=>{const el=byId('si_blockFallback');return!(el&&el.checked);};
function getSkillEquipOpts(jp,hexId,kind){
const state=_solverDmgCache.search,block=solverBlockRuleEnabled();
const key=JSON.stringify([jp,hexId,_solverFieldHexes,block]);
let options=state.equipOptions.get(key);
if(options===undefined){
const sk=lookupSkill(jp),opts=[],field=[hexId,...(_solverFieldHexes||[])];
if(sk&&!sk.dmg&&!sk.fixedDmg)for(const hex of field){
const mon=hex&&!isMetalHex(hex)&&getMonDB(hex);
if(!mon||mon.s[4]>0&&block)continue;
const generic=WTYPE_GENERIC_BY_T[mon.t];
if(generic&&solverWeaponCompatible(sk,generic.jp))opts.push({equip:generic.jp,note:'('+generic.jp+')'});
for(const equip in WEAPON_META)if(WEAPON_META[equip].wmul&&WEAPON_META[equip].wmul[mon.t]&&solverWeaponCompatible(sk,equip))opts.push({equip,note:'('+equip+')'});
}
if(sk&&sk.blk===1&&sk.antiBlk!==false&&solverFieldBlock(field)>0)for(const[equip,note]of AB_WEAPONS)if(solverWeaponCompatible(sk,equip))opts.push({equip,note});
if(PLUS1_WEAPONS.some(equip=>solverWeaponAddsPlus1(sk,equip))&&sk&&sk.blk===1&&field.some(hex=>hex&&isMetalHex(hex))){
if(SolverActionGate.targetKind(sk)==='S'){
if(!isMetalHex(hexId))for(const row of METAL_PADDING)
if(row[0]===jp&&weaponMetaValue(row[3],'metal'))opts.push({equip:row[3],note:row[4]});
}else for(const equip of PLUS1_WEAPONS)if(!(METAL_ONLY_WEAPONS.has(equip)&&opts.some(o=>METAL_ONLY_WEAPONS.has(o.equip)))&&solverWeaponCompatible(sk,equip))opts.push({equip,note:WEAPON_META[equip].note});
}
options={all:opts.filter((o,i)=>!(WEAPON_META[o.equip].generic&&WEAPON_META[o.equip].cat===sk.weapon)&&opts.findIndex(p=>p.equip===o.equip)===i)};
state.equipOptions.set(key,options);
}
let result=options.all;
if(kind==='plain'){
if(options.plain===undefined)options.plain=result.filter(option=>!(WEAPON_META[option.equip]&&WEAPON_META[option.equip].wmul));
result=options.plain;
}else if(kind==='multiplier'){
if(options.multiplier===undefined)options.multiplier=result.filter(option=>WEAPON_META[option.equip]&&WEAPON_META[option.equip].wmul);
result=options.multiplier;
}else if(kind==='first'){
if(options.first===undefined)options.first=result.slice(0,1);
result=options.first;
}
return result.map(option=>({...option}));
}
const _solverBatTables=new Map();
const _solverBatFeasible=new WeakMap();
const _solverBatReach=new Map();
function solverBatTable(T,round2){
const key=T+':'+(round2?2:1);
if(_solverBatTables.has(key))return _solverBatTables.get(key);
const forms=new Map(),add=(at,sk,miss)=>{if(!forms.has(at))forms.set(at,[]);forms.get(at).push({sk,miss});};
for(const sk of SKILL_DB){
if(!sk.at)continue;
const first=sk.at[0],diff=sk.at[1]||0,multi=!isHitBased(sk);
const maxN=multi?T:isSolverRandomTargetSkill(sk)&&sk.hitRange?sk.hitRange.max
:Math.max(getHits(sk,false),getHits(sk,true),sk.hitRange?sk.hitRange.max:1,sk.hit||1);
for(let n=1;n<=maxN;n++)add(solverATForCount(first,diff,n),sk,false);
if(Number.isFinite(sk.miss))add(sk.miss,sk,true);
}
const slots=round2?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE,ats=[...forms.keys()].filter(at=>at>0);
const single=new Set(ats.filter(at=>forms.get(at).every(f=>SolverActionGate.targetKind(f.sk)==='S'&&f.sk.dmg&&solverConditionStatKeys(f.sk).length<=1)));
const size=Math.max(...ats)*slots+1;
const sums=[new Uint8Array(size)],other=[new Uint8Array(size)];
sums[0][0]=1;
for(let k=1;k<=slots;k++){
const next=new Uint8Array(size),mixed=new Uint8Array(size);
for(let v=0;v<size;v++){
if(!sums[k-1][v])continue;
for(const at of ats)if(v+at<size){next[v+at]=1;if(other[k-1][v]||!single.has(at))mixed[v+at]=1;}
}
sums.push(next);other.push(mixed);
}
const free=new Uint8Array(size);
for(let k=0;k<slots;k++)for(let v=0;v<size;v++)if(sums[k][v])free[v]=1;
const table={forms,slots,size,free,other:other[slots],full:sums[slots],singles:[...single].sort((a,b)=>b-a)};
_solverBatTables.set(key,table);
return table;
}
function solverBatStructureFeasible(table,sum,monsters){
const actors=solverUseStatsEnabled()?readCharStatsFromDom():null,party=actors?JSON.stringify(actors.map(c=>[c.stats,c.lv,c.job])):'';
const verdicts=_solverBatFeasible;
let byTable=verdicts.get(table);
if(!byTable){byTable=new Map();verdicts.set(table,byTable);}
const key=sum+'|'+monsters.join(',')+'|'+party;
if(byTable.has(key))return byTable.get(key);
const reaches=_solverBatReach;
const reach=(sk,hex)=>{
const id=sk.jp+'|'+hex+'|'+party;
if(reaches.has(id))return reaches.get(id);
const stat=solverConditionStatKeys(sk)[0],action={jp:sk.jp,at:sk.at[0],equip:'',hits:0},r={zero:false,hit:false};
for(let v=actors?0:stat?solverStatMin(stat):0;v<=(actors?actors.length-1:stat?999:0)&&!(r.zero&&r.hit);v++){
const stats=actors?actors[v].stats:stat?{...EXT_STATS,[stat]:v}:EXT_STATS;
const d=skillDamagePerHit(sk,action,hex,stats,null);
if(d.none||!Number.isFinite(d.min)||!Number.isFinite(d.max)){r.zero=true;r.hit=true;}else if(d.max===0)r.zero=true;else if(d.min>0)r.hit=true;
}
reaches.set(id,r);return r;
};
const feasible=acts=>{
const hits=acts.filter(f=>!f.miss);
if(acts.some(f=>!monsters.some(hex=>f.miss?reach(f.sk,hex).zero:reach(f.sk,hex).hit)))return false;
const owner=new Array(hits.length).fill(-1);
const assign=(m,seen)=>hits.some((f,i)=>!seen[i]&&reach(f.sk,monsters[m]).hit&&(seen[i]=true)&&
(owner[i]<0||assign(owner[i],seen))&&((owner[i]=m),true));
return monsters.every((_,m)=>assign(m,[]));
};
const pick=[];
const choose=(i,acts)=>i===pick.length?feasible(acts)
:table.forms.get(pick[i]).some(f=>{acts.push(f);const ok=choose(i+1,acts);acts.pop();return ok;});
const walk=(start,rem)=>{
if(pick.length===table.slots)return rem===0&&choose(0,[]);
for(let i=start;i<table.singles.length;i++){
const at=table.singles[i];
if(at>rem)continue;
pick.push(at);const ok=walk(i,rem-at);pick.pop();
if(ok)return true;
}
return false;
};
const result=walk(0,sum);
byTable.set(key,result);
return result;
}
function solverBatUnreachable(render){
const bat=render&&render.bat,groups=render&&render.monGroups||[];
if(!Number.isInteger(bat)||!(bat>0)||!groups.length||groups.some(g=>!g||!g.hex||!getMonDB(g.hex)||g.count!==undefined&&(!Number.isInteger(g.count)||g.count<=0)))return false;
if(solverUseStatsEnabled()&&!readCharStatsFromDom().length)return false;
const T=groupTotal(groups),round2=solverAllowsRound2(render.mapDeft,render.canRound2);
const table=solverBatTable(T,round2);
const sums=(round2?[0,solverRound2RemovalCost(T)]:[0]).map(c=>bat-c).filter(v=>v>=0&&v<table.size);
if(sums.some(v=>table.free[v]||table.other[v]))return false;
const monsters=groups.flatMap(g=>Array.from({length:g.count||1},()=>g.hex));
return sums.every(v=>!table.full[v]||!solverBatStructureFeasible(table,v,monsters));
}
const SOLVER_DASH='<div style="color:#666;font-size:10px;margin-left:16px;">—</div>';
const solverBatUnreachableResult=()=>({html:SOLVER_DASH,comboMap:{},buckets:{},fallback:false,solvable:false,incomplete:false,needsKillAll:null});
function isSolverATReachable(variants,target,maxSlots,minSlots){
minSlots=Math.max(1,minSlots||1);
if(!(target>0)||!(maxSlots>0))return false;
const depths=solverATReachableDepths(variants,target,maxSlots,minSlots);
for(let slot=minSlots;slot<=maxSlots;slot++)if(depths[slot])return true;
return false;
}
function solverATReachableDepths(variants,target,maxSlots,stopAtReachableFrom){
const reachable=new Uint8Array(maxSlots+1);
if(!(target>0)||!(maxSlots>0))return reachable;
const atValues=[...new Set((variants||[]).map(v=>v.at||0)
.filter(at=>at>0&&at<=target))];
if(atValues.length===0)return reachable;
const maxAT=Math.max(...atValues);
if(target>maxAT*maxSlots)return reachable;
let prev=new Uint8Array(target+1);
prev[0]=1;
for(let slot=1;slot<=maxSlots;slot++){
const next=new Uint8Array(target+1);
for(let sum=0;sum<=target;sum++){
if(!prev[sum])continue;
for(const at of atValues){
const n=sum+at;
if(n<=target)next[n]=1;
}
}
reachable[slot]=next[target];
if(stopAtReachableFrom!==undefined&&slot>=stopAtReachableFrom&&reachable[slot])break;
prev=next;
}
return reachable;
}
function solverCandidateStructureOK(rawCombo,context){
const{isMetal,killTargets,T,planType,postAlive,metalSupNeed:_metalSupNeed}=context;
if(isMetal||!killTargets||T<=1)return true;
const combo=_metalSupNeed>0?solverMetalExecutionsLast(rawCombo):rawCombo;
const K=planType==='kill_all'?T:(planType==='kill_mercy_clear'?1+postAlive:postAlive);
const maxGrp=Math.max(...killTargets.map(g=>g.count||1));
let cap=0;
for(const v of combo){
if(!(v.at>0))continue;
const sk=lookupSkill(v.jp);
const tgt=sk?sk.target:'S';
if(tgt==='A'){cap=K;break;}
else if(tgt==='G'||tgt==='RG')cap+=maxGrp;
else if(tgt==='RA'||tgt==='RS')cap+=Math.max(v.hits||0,(sk&&sk.hitRange&&sk.hitRange.max)||1);
else cap+=1;
}
if(cap<K)return false;
const _isMetalG=killTargets.map(g=>isMetalHex(g.hex));
const gMaxW=killTargets.map(g=>g.count||0);
let mAliveW=0;
for(let gi=0;gi<killTargets.length;gi++)if(_isMetalG[gi])mAliveW+=gMaxW[gi];
let nmMaxW=T-mAliveW;
let nmCapW=0;
for(const v of combo){
if(v.jp==='みのがす'){
let drop=0;
for(let gi=1;gi<killTargets.length;gi++){
if(killTargets[gi].death>0){drop+=killTargets[gi].count;gMaxW[gi]=0;}
}
if(planType==='kill_mercy_clear'){
drop+=killTargets[0].death>0?killTargets[0].count:1;
gMaxW[0]=killTargets[0].death>0?0:Math.max(0,gMaxW[0]-1);
}
nmMaxW-=drop;
continue;
}
if(!(v.at>0))continue;
if(_metalSupNeed>0&&isMetalExecutionAction(v)){
if(mAliveW<1)return false;
mAliveW-=1;continue;
}
const skW=lookupSkill(v.jp);
if(v.tgtGroup!==undefined&&_isMetalG[v.tgtGroup]&&!isMetalActionSkill(v))return false;
const nmLowW=Math.max(0,nmMaxW-nmCapW);
const aliveMaxW=nmMaxW+mAliveW;
const aliveLowW=Math.max(1,nmLowW+mAliveW);
if(aliveMaxW<1)return false;
if(v.tgtGroup!==undefined&&(gMaxW[v.tgtGroup]||0)<1)return false;
if(v.soloGroup){
let anySolo=false;
for(let gi=0;gi<killTargets.length;gi++){
if(gMaxW[gi]<1)continue;
if(_isMetalG[gi]?gMaxW[gi]===1:Math.max(0,gMaxW[gi]-nmCapW)<=1){anySolo=true;break;}
}
if(!anySolo)return false;
}
if(v.aoeK!==undefined){
if(v.tgtGroup!==undefined){
const gm=gMaxW[v.tgtGroup]!==undefined?gMaxW[v.tgtGroup]:0;
if(_isMetalG[v.tgtGroup]?(v.aoeK!==gm):(v.aoeK>gm||v.aoeK<Math.max(1,gm-nmCapW)))return false;
}else if(v.aoeK>aliveMaxW||v.aoeK<aliveLowW)return false;
}else if(isSolverRandomTargetSkill(skW)){
if(aliveMaxW!==1)return false;
}
const tgtW=skW?skW.target:'S';
if(v.aoeK!==undefined)nmCapW+=v.aoeK;
else if(tgtW==='A')nmCapW+=nmMaxW;
else if(tgtW==='G'||tgtW==='RG')nmCapW+=(v.tgtGroup!==undefined&&gMaxW[v.tgtGroup]!==undefined)?gMaxW[v.tgtGroup]:Math.max(...gMaxW);
else if(tgtW==='RA'||tgtW==='RS')nmCapW+=Math.max(v.hits||0,1);
else nmCapW+=1;
}
return true;
}
function buildSolverEggAssignments(eggCIs,dmgCIs,canReach=(egg,ci)=>ci>egg){
if(!eggCIs.length)return[null];
const results=[],seen=new Set();
const validPerEgg=eggCIs.map(eCI=>dmgCIs.filter(dCI=>canReach(eCI,dCI)));
const recurse=(idx,counts)=>{
const key=idx+':'+dmgCIs.map(ci=>counts[ci]||0).join(',');
if(seen.has(key))return;
seen.add(key);
if(idx===eggCIs.length){
const assign={};
for(const ci in counts)assign[ci]=TENSION[Math.min(counts[ci]-1,TENSION.length-1)].mul;
results.push(assign);return;
}
for(const ci of validPerEgg[idx]){
counts[ci]=(counts[ci]||0)+1;
recurse(idx+1,counts);
if(--counts[ci]===0)delete counts[ci];
}
};
recurse(0,{});
const later=dmgCIs.slice().reverse(),fin=later[0],chips=a=>Object.keys(a).filter(ci=>+ci!==fin).length;
results.sort((a,b)=>{const diff=chips(a)-chips(b);if(diff)return diff;for(const ci of later){const d=(b[ci]||1)-(a[ci]||1);if(d)return d;}return 0;});
return results.length?results:[null];
}
function solverConditionEggTargets(combo,eggAssign,assign,actorCount=SOLVER_ROUND_SIZE){
if(!eggAssign)return{};
const eggs=combo.map((a,ci)=>a.jp==='おうえん'?ci:-1).filter(ci=>ci>=0);
const keys=Object.keys(eggAssign).map(Number).sort((a,b)=>a-b),counts={},targets={};
if(keys.some(ci=>!solverEggDamageAction(combo[ci])||!TENSION_MULS.includes(eggAssign[ci])))return{};
const walk=i=>{
if(i===eggs.length)return keys.every(ci=>counts[ci]&&
TENSION[Math.min(counts[ci]-1,TENSION.length-1)].mul===eggAssign[ci]);
for(const ci of keys){
if(!solverEggCanReach(combo,eggs[i],ci,assign,actorCount))continue;
const count=(counts[ci]||0)+1;
if(TENSION[Math.min(count-1,TENSION.length-1)].mul>eggAssign[ci])continue;
counts[ci]=count;targets[eggs[i]]=ci;
if(walk(i+1))return true;
counts[ci]--;delete targets[eggs[i]];
}
return false;
};
return walk(0)?targets:{};
}
function solverMetalPadForms(excl,allowEgg=true){
return METAL_PADDING
.map(([jp,en,at,eq,note])=>{
const sk=lookupSkill(jp)||null;
return{jp,en,at,equip:eq,note,hits:sk?getEquipHitCount(sk,eq):1,
mdmg:(eq==='miss'?0:getMetalChipMaxDamage(jp,eq))};
})
.filter(p=>p.equip==='miss'||p.at===0||p.mdmg>0)
.filter(p=>allowEgg||p.jp!=='おうえん')
.filter(p=>!excl||!excl.has(p.jp))
.sort((a,b)=>b.at-a.at);
}
function solverMetalSupportPads(monGroups,_nonMetalSups,_effDeath,_currentChars){
let excludedPads,excludedPadsAfterMercy,supPads;
const _mkExcluded=(supList)=>{
const set=new Set();
const seen=new Set();
for(const row of METAL_PADDING){
const jp=row[0];
if(seen.has(jp))continue;seen.add(jp);
const sk=lookupSkill(jp)||null;
if(!sk)continue;
if(sk.target==='S'||sk.target==='G')continue;
for(const g of supList){
const m=getMonDB(g.hex);
if(!m)continue;
const hp100=m.s[0];
const hp80=monHpMin(hp100);
const eq=row[3];
const span=buildCharDamageSpan(sk,g.hex,eq,getEquipHitCount(sk,eq),_currentChars);
if(span.max>=hp80){set.add(jp);break;}
}
}
return set;
};
excludedPads=_mkExcluded(_nonMetalSups);
const _stayAfterMercy=_nonMetalSups.filter(g=>_effDeath(g)===0);
excludedPadsAfterMercy=_stayAfterMercy.length===_nonMetalSups.length
?excludedPads:_mkExcluded(_stayAfterMercy);
supPads=[];
for(const row of METAL_PADDING){
if(row[3]!=='miss')continue;
const sk=lookupSkill(row[0])||null;
if(!sk||sk.target!=='S'||sk.ev!==0||!(sk.el>0))continue;
const hitAT=sk.at[0];
if(!(hitAT>0)||hitAT===sk.miss)continue;
for(let gi=0;gi<monGroups.length;gi++){
const g=monGroups[gi];
if(!(g.count>0)||!g.hex||isMetalHex(g.hex))continue;
const m=getMonDB(g.hex);
if(!m||!(m.s[sk.el]>0))continue;
const hp100=m.s[0];
const hp80=monHpMin(hp100);
const span=buildCharDamageSpan(sk,g.hex,'',getEquipHitCount(sk,''),_currentChars);
if(span.max>=hp80)continue;
supPads.push({jp:row[0],en:row[1],at:hitAT,equip:'',note:'👉',hits:1,mdmg:0,tgtGroup:gi,supTarget:true});
}
}
for(const row of METAL_PADDING){
const sk=lookupSkill(row[0])||null;
if(!sk||sk.target!=='S'||row[3]==='miss')continue;
const H=getEquipHitCount(sk,row[3]);
if(H<=1)continue;
for(let gi=0;gi<monGroups.length;gi++){
const g=monGroups[gi];
if(!(g.count>0)||!g.hex||isMetalHex(g.hex))continue;
const m=getMonDB(g.hex);
if(!m||(sk.ev&&m.s[3]!==0)||(sk.blk&&m.s[4]!==0))continue;
for(let h=1;h<H;h++){
supPads.push({jp:row[0],en:row[1],at:solverATForCount(sk.at[0],sk.at[1],h),equip:row[3],note:(row[4]||'')+'👉'+`⚡${h}hit`,hits:h,earlyKill:true,mdmg:0,tgtGroup:gi,supTarget:true,retarget:true});
}
}
}
supPads.sort((a,b)=>b.at-a.at);
return{excludedPads,excludedPadsAfterMercy,supPads};
}
const solverInsertMercy=(c,k)=>[...c.slice(0,k),ACT_MERCY,...c.slice(k)];
function solverMercyFirstIndex(c){
if(c.some(v=>v.metalFirst)){
let k=0;
while(k<c.length&&isMetalExecutionAction(c[k]))k++;
return k;
}
return(c[0]&&c[0].supTarget)?1:0;
}
function solverMercyFirstPlacement(c){
return solverMercyPlacements(c,{round:1})[0]||solverInsertMercy(c,solverMercyFirstIndex(c));
}
function solverMercySecondRoundPlacement(c){
return solverMercyPlacements(c,{round:2})[0]
||solverInsertMercy(c,c.some(v=>v.metalFirst)?solverMercyFirstIndex(c):SOLVER_ROUND_SIZE);
}
function solverMercyPlacements(c,context={}){
const{round=1,planType='mercy_first',postAlive,killTargets,mercyLevels}=context;
if(planType!=='mercy_first'||postAlive<=0||c.length>=SOLVER_MAX_ACTIONS||c.some(v=>v.jp==='みのがす'))return[];
if(killTargets&&killTargets[0]&&killTargets[0].death>0)return[];
const metalFirst=c.some(v=>v.metalFirst);
const canonical=metalFirst?solverMercyFirstIndex(c):round===2?SOLVER_ROUND_SIZE:solverMercyFirstIndex(c);
const execution=c.findIndex(v=>isMetalExecutionAction(v)||v.jp==='ザラキーマ');
const lo=round===2&&!metalFirst?SOLVER_ROUND_SIZE:0;
const hi=Math.min(c.length-1,round===2||metalFirst?SOLVER_MAX_ACTIONS-1:SOLVER_ROUND_SIZE-1,
!metalFirst&&execution>=0?execution:c.length-1);
const out=[];
const slots=metalFirst?[canonical]:[canonical,...Array.from({length:Math.max(0,hi-lo+1)},(_,i)=>lo+i)];
for(const k of new Set(slots)){
if(k<lo||k>hi)continue;
const nc=solverInsertMercy(c,k);
if(killTargets&&nc.some((v,i)=>v.tgtGroup!==undefined
&&(!killTargets[v.tgtGroup]||!solverMercyTargetPresent(killTargets[v.tgtGroup],i,k,mercyLevels))))continue;
if(priOrderOK(nc)&&(!killTargets||solverCandidateStructureOK(nc,context)))out.push(nc);
}
return out;
}
function solverMercyTargetPresent(group,slot,mercyAt,mercyLevels){
return!(mercyAt>=0&&slot>mercyAt&&mercyLevels&&mercyLevels.length
&&mercyLevels.every(lv=>solverMercyCanRemove({...group,alive:true},lv)));
}
function solverMercyAlternatives(combo,walk){
const mercyAt=combo.findIndex(v=>v.jp==='みのがす');
if(!walk||walk.planType!=='mercy_first'||mercyAt<0||combo.some(v=>v.metalFirst))return[];
return solverMercyPlacements(combo.filter(v=>v.jp!=='みのがす'),
{...walk,round:mercyAt<SOLVER_ROUND_SIZE?1:2})
.filter(t=>t.findIndex(v=>v.jp==='みのがす')!==mercyAt);
}
function solverMercyChipPrefixOK(actionResults){
const mercy=actionResults&&actionResults.find(r=>r.kind==='mercy');
return!!(mercy&&mercy.targets.length&&mercy.remaining.length&&!actionResults.some(r=>r.ci<mercy.ci
&&r.targets.some(t=>t.outcome!=='alive')));
}
function solverMetalFirstTailOK(combo){
return!combo.some(v=>_actionPri(v)>0)&&!combo.some(isMetalExecutionAction);
}
function solverNeedleCandidateOK(combo,mon,isMetal){
if(mon&&combo.some(v=>v.needDeath0)&&mon.s[12]>0)return false;
return!(isMetal&&combo.some(v=>v.needle));
}
function findLargestGroup(list,gik){
const groups={};
for(const inst of list)(groups[inst[gik]]=groups[inst[gik]]||[]).push(inst);
let best=null,bestLen=0;
for(const g in groups){if(groups[g].length>bestLen){bestLen=groups[g].length;best=groups[g];}}
return best||[];
}
function metalChipPerHit(sk,equip){
if(sk.el>0)return{min:0,max:0};
if(actionMetalEff(sk,equip))return{min:1,max:2};
return!sk.dmg&&!sk.fixedDmg?{min:0,max:1}:{min:0,max:0};
}
const SolverActionGate=Object.freeze({
hits(action){return action&&action.hits>0?Math.floor(action.hits):1;},
targetKind(sk){
if(!sk)return null;
const t=sk.target;
if(t==='RS'||t==='RA'||t==='RG')return t;
else if(t==='A'||t==='G'||t==='S')return t;
else if(t==='U'||t==='P'||t==='O')return t;
throw new Error('Unknown skill target kind: '+t);
},
targets(alive,action,sk,groupKey){
groupKey=groupKey||'groupIdx';
const tgt=this.targetKind(sk),random=isSolverRandomTargetSkill(sk);
if(random&&(alive.length!==1||action.tgtGroup!==undefined||action.soloGroup||action.supTarget||action.retarget)){
return{targets:[],reason:'randomTarget'};
}
if(tgt==='U'||tgt==='P'||tgt==='O')return{targets:[],reason:'noTarget'};
const ordered=alive.slice().sort((a,b)=>b.hp-a.hp);
const metalAction=isMetalActionSkill(action);
const mainMetalAlive=alive.some(x=>x[groupKey]===0&&isMetalHex(x.hex));
const finish=(targets)=>{
if(!targets.length)return{targets:[],reason:'tgtdead'};
if(action.needDeath0&&targets.some(t=>!solverNeedleTargetOK(t.hex)))
return{targets:[],reason:'death_not_zero'};
const hitsMetal=targets.some(x=>isMetalHex(x.hex));
const hitsNonMetal=targets.some(x=>!isMetalHex(x.hex));
if(hitsMetal&&!hitsNonMetal&&!metalAction)
return{targets:[],reason:'metalRule'};
if(mainMetalAlive&&hitsNonMetal&&!metalAction&&!action.supTarget)
return{targets:[],reason:'metalAim'};
return{targets,reason:null};
};
if(random||tgt==='A')return finish(alive.slice());
if(tgt==='G'){
let targets;
if(action.tgtGroup!==undefined){
targets=alive.filter(x=>x[groupKey]===action.tgtGroup);
}else if(metalAction&&mainMetalAlive){
const mt=ordered.find(x=>isMetalHex(x.hex));
targets=mt?alive.filter(x=>x[groupKey]===mt[groupKey]):[];
}else{
targets=findLargestGroup(alive,groupKey);
}
return finish(targets);
}
let target=ordered[0];
const mainMetal=isMetalExecutionAction(action)?ordered.find(i=>isMetalHex(i.hex)&&i[groupKey]===0):undefined;
const mt=metalAction&&(mainMetalAlive||isMetalExecutionAction(action))?(mainMetal||ordered.find(i=>isMetalHex(i.hex))):undefined;
if(mt){
target=mt;
}else if(action.soloGroup){
const gc={};
for(const x of ordered)gc[x[groupKey]]=(gc[x[groupKey]]||0)+1;
target=ordered.find(x=>gc[x[groupKey]]===1);
if(!target)return{targets:[],reason:'soloGroup'};
}else if(action.tgtGroup!==undefined){
target=ordered.find(x=>x[groupKey]===action.tgtGroup);
if(!target)return{targets:[],reason:'tgtdead'};
}
return finish(target?[target]:[]);
},
survivesBeforeHit(hits,head,hpLow){
hits=Math.max(1,Math.floor(hits||1));
return hits<=1||Math.floor(head||0)<hpLow;
},
step(target,hits,dMin,dMax,head){
hits=Math.max(1,Math.floor(hits||1));
const hp=target.hp-Math.floor(dMin||0);
const hpLow=target.hpLow-Math.floor(dMax||0);
return{
hp,hpLow,
fullHits:this.survivesBeforeHit(hits,head,target.hpLow),
uncertain:hpLow<=0&&hp>0,
dead:hp<=0
};
},
exactHitReason(action,step){
if(!step.fullHits)return'at_hit_count';
if(action&&action.earlyKill&&!step.dead)return'at_hit_count';
if(action&&isSolverRandomTargetSkill(lookupSkill(action.jp))&&!step.dead&&!step.uncertain)return'at_hit_count';
return null;
},
commit(target,step){
target.hp=step.hp;target.hpLow=step.hpLow;
if(step.dead)target.alive=false;
}
});
SKILL_DB.forEach(s=>SolverActionGate.targetKind(s));
function actionAtUnstable(action,minDmg,maxDmg){
if(!action)return false;
if(minDmg===0&&maxDmg===0){
const sk=lookupSkill(action.jp);
if(sk&&(isSolverNonDamageRemoval(action)||['U','P','O'].includes(SolverActionGate.targetKind(sk))))return false;
return!sk||!Number.isFinite(sk.miss)||sk.miss!==action.at;
}
return action.at>0&&!(minDmg>0)&&maxDmg>0;
}
function solverKathwackCanClear(groups){
return groups.every(g=>{const mon=getMonDB(g.hex);return mon&&mon.s[12]>0;});
}
function solverKathwackCasters(chars,useStats){return chars.filter(c=>!useStats||c.job===1);}
function solverKathwackChance(might){
if(might>=799)return 100;
if(might>200)return 75+(might-200)*25/599;
return 75;
}
function solveMetalCombo(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads){
if(hexId&&!isMetalHex(hexId)){
return[];
}
metalCount=metalCount||monCount;
const issenAT=ACT_ISSEN.at;
const totalIssenAT=issenAT*metalCount;
if(bat<totalIssenAT)return[];
if(metalCount>maxSlots)return[];
const remaining=bat-totalIssenAT;
const issenTail=Array(metalCount).fill(ACT_ISSEN);
if(remaining===0)return[issenTail.slice()];
const pads=solverMetalPadForms(excludedPads,monCount>metalCount);
const _relax=(relaxPads&&relaxPads!==excludedPads)?relaxPads:null;
const padsRelax=_relax?solverMetalPadForms(_relax,monCount>metalCount):null;
const unlocked=_relax&&excludedPads?new Set([...excludedPads].filter(jp=>!_relax.has(jp))):null;
const MAX=3;
const padSlots=maxSlots-metalCount;
function dfs(pool,startIdx,rem,combo,out,slots,head,needUnlocked){
if(solverSearchCapped(out.length>=MAX))return;
if(rem===0){
if(needUnlocked&&!combo.some(p=>unlocked.has(p.jp)))return;
if(canMetalChipsKill([...head,...combo],metalHPs))out.push([...head,...combo,...issenTail]);
return;
}
if(rem<0||combo.length>=slots)return;
for(let i=startIdx;i<pool.length;i++){
if(pool[i].at===0&&rem>0&&combo.length>=slots-1)continue;
if(pool[i].at>rem)continue;
combo.push(pool[i]);
dfs(pool,i,rem-pool[i].at,combo,out,slots,head,needUnlocked);
combo.pop();
}
}
const results=[];
dfs(pads,0,remaining,[],results,padSlots,[],false);
results.sort((a,b)=>a.length-b.length);
const relaxRes=[];
if(padsRelax){
dfs(padsRelax,0,remaining,[],relaxRes,padSlots,[],true);
relaxRes.sort((a,b)=>a.length-b.length);
}
const supRes=[];
if(supPads&&supPads.length&&padSlots>=1){
for(const sp of supPads){
if(sp.at>remaining)continue;
dfs(padsRelax||pads,0,remaining-sp.at,[],supRes,padSlots-1,[sp],false);
if(solverSearchCapped(supRes.length>=MAX))break;
}
supRes.sort((a,b)=>a.length-b.length);
}
return results.concat(relaxRes,supRes);
}
let _solverFieldHexes=null;
let _solverGroupCounts=null;
let _solverFieldTotal=null;
let _solverIssenNeed=0;
let _solverUseStats=true;
let _solverSearchIncomplete=false,_solverRenderDepth=0,_x12Kills=null;
let _solverGoldState=null;
function solverMainKillCI(actionResults){
if(!actionResults)return-1;
let possCI=-1;
for(const ar of actionResults){
if(ar.kind!=='damage')continue;
for(const t of ar.targets){
if(t.groupIdx===0&&t.outcome==='ko')return ar.ci;
if(t.groupIdx===0&&t.outcome==='possible'&&possCI<0)possCI=ar.ci;
}
}
return possCI;
}
function solverRestClearCI(actionResults){
if(!actionResults)return-1;
for(let i=actionResults.length-1;i>=0;i--){
const ar=actionResults[i];
for(const t of ar.targets)if(t.groupIdx>0&&(t.outcome==='ko'||t.outcome==='removed'))return ar.ci;
}
return-1;
}
function solverSearchCapped(stop){if(stop)_solverSearchIncomplete=true;return stop;}
const solverBuildContextSnapshot=()=>({groupCounts:_solverGroupCounts?_solverGroupCounts.slice():null,
fieldTotal:_solverFieldTotal,fieldHexes:_solverFieldHexes,useStats:_solverUseStats});
function withSolverBuildContext(spec,run){
const prev=[_solverGroupCounts,_solverFieldTotal,_solverIssenNeed,_solverUseStats,_solverFieldHexes];
_solverGroupCounts=spec.groupCounts?spec.groupCounts.slice():null;
_solverFieldTotal=spec.fieldTotal;_solverIssenNeed=spec.metalSupNeed||0;
_solverUseStats=spec.useStats!==false;_solverFieldHexes=spec.fieldHexes||null;
try{return run();}
finally{[_solverGroupCounts,_solverFieldTotal,_solverIssenNeed,_solverUseStats,_solverFieldHexes]=prev;}
}
function solverComboActionSignature(combo){
return(combo||[]).map(v=>[
v.jp,v.at||0,v.equip||'',v.note||'',SolverActionGate.hits(v),v.earlyKill?1:0,
v.aoeK!==undefined?v.aoeK:'',v.soloGroup?1:0,v.needle?1:0,v.needDeath0?1:0
].join('\x1f')).join('\x1e');
}
const solverBasicSkillForAT=at=>SOLVER_BASIC_SKILLS.find(jp=>lookupSkill(jp)&&lookupSkill(jp).at[0]===at)||null;
const solverPlainForm=a=>a.at>0&&!a.needle&&!a.earlyKill&&!a.missAT&&a.equip!=='miss'&&!isMetalExecutionAction(a);
function solverBasicSkillOf(action){
if(!action||!solverPlainForm(action)||SOLVER_BASIC_SKILLS.includes(action.jp))return null;
const sk=lookupSkill(action.jp);
if(!sk||sk.dmg||sk.fixedDmg)return null;
return solverBasicSkillForAT(action.at);
}
function solverKillerFormOK(action,hex,stats){
const sk=lookupSkill(action.jp),rep=(SolverActionGate.targetKind(sk)==='S'||isSolverRandomTargetSkill(sk))&&solverBasicSkillOf(action);
if(!rep)return true;
const hit=(a,st)=>skillDamagePerHit(lookupSkill(a.jp),a,hex,st,null).min;
const ok=st=>hit(action,st)>hit({jp:rep,at:action.at,equip:action.equip||solverDefaultEquip(sk)},st),known=_solverDmgCache.search.killer;
if(!solverUseStatsEnabled()){
const key=JSON.stringify([action.jp,action.at,action.equip||'',hex]);
if(known.has(key))return known.get(key);
let found=false;
for(let m=solverStatMin('atk',action.equip);m<=999&&!found;m++)found=ok({...MIN_STATS,atk:m});
known.set(key,found);
return found;
}else{
if(!stats)return true;
const key=JSON.stringify(['on',action.jp,action.at,action.equip||'',hex,stats]);
if(known.has(key))return known.get(key);
const found=ok(stats);
known.set(key,found);
return found;
}
}
function solverATForCount(first,diff,n){return first+diff*Math.max(0,n-1);}
function expandSolverCombos(monCount,fieldShape){
const groupCounts=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'groupCounts')?fieldShape.groupCounts:_solverGroupCounts;
const fieldTotal=fieldShape&&Object.prototype.hasOwnProperty.call(fieldShape,'fieldTotal')?fieldShape.fieldTotal:_solverFieldTotal;
const fieldHexes=_solverFieldHexes||[],activeHexes=fieldHexes.filter((hex,gi)=>!groupCounts||groupCounts[gi]>0),variants=[];
for(const entry of SOLVER_ENTRIES){
const sk=lookupSkill(entry.alias||entry.jp);
if(!sk)continue;
const first=sk.at[0],diff=entry.diff!==undefined?entry.diff:sk.at[1],en=entry.en||sk.en;
const unknownZero=sk.el>=5&&sk.el<=11&&!sk.fixedDmg&&!Number.isFinite(sk.miss)
&&(sk.dmg||!Object.keys(WEAPON_META).some(eq=>solverWeaponCompatible(sk,eq)&&(weaponMetaValue(eq,'fixedDmg')||actionMetalEff(sk,eq))));
if(unknownZero&&!(sk.target==='G'&&groupCounts)&&activeHexes.length
&&activeHexes.every(hex=>{const mon=getMonDB(hex);return mon&&mon.s[sk.el]===0;}))continue;
if(isSolverRandomTargetSkill(sk)){
if(monCount>1)continue;
if(sk.hitRange&&sk.hitRange.normalMin!==sk.hitRange.max){
for(let hits=1;hits<sk.hitRange.normalMin;hits++)variants.push({jp:entry.jp,en,at:solverATForCount(first,diff,hits),equip:'',note:`⚡${hits}hit`,hits,earlyKill:true});
continue;
}
}
if(entry.jp==='攻撃 (全体)'&&monCount<=1)continue;
const multi=!!entry.ga||sk.target==='A'||sk.target==='G';
if(multi){
if(sk.target==='G'&&groupCounts){
for(let gi=0;gi<groupCounts.length;gi++){
if(!(groupCounts[gi]>0))continue;
const mon=getMonDB(fieldHexes[gi]);
if(unknownZero&&mon&&mon.s[sk.el]===0)continue;
if(diff===0)variants.push({jp:entry.jp,en,at:first,equip:'',note:'',hits:0,tgtGroup:gi});
else for(let count=1;count<=groupCounts[gi];count++)variants.push({jp:entry.jp,en,at:solverATForCount(first,diff,count),equip:'',note:'',hits:0,aoeK:count,tgtGroup:gi});
}
}else if(diff===0)variants.push({jp:entry.jp,en,at:first,equip:'',note:'',hits:0});
else{
const maximum=typeof fieldTotal==='number'&&fieldTotal>0?fieldTotal:monCount;
for(let count=1;count<=maximum;count++){
if(entry.jp==='攻撃 (全体)'&&count<=1)continue;
variants.push({jp:entry.jp,en,at:solverATForCount(first,diff,count),equip:'',note:'',hits:0,aoeK:count});
}
}
continue;
}
const hitBased=isHitBased(sk),hits=hitBased?getHits(sk,false):(sk.hit||1);
const base={jp:entry.jp,en,equip:entry.needle?sk.equip:'',note:entry.needle?WEAPON_META[sk.equip].note:'',
soloGroup:entry.soloGroup,needle:entry.needle,needDeath0:entry.needle&&WEAPON_META[sk.equip].needDeath0};
if(hitBased)variants.push(...buildSolverExactHitVariants(base,first,diff,hits));
else variants.push(Object.assign({},base,{at:solverATForCount(first,diff,hits),hits:0}));
if(hitBased)for(const equip of Object.keys(WEAPON_META)){
if(!weaponMetaValue(equip,'falcon')||!solverWeaponCompatible(sk,equip))continue;
const extraHits=getEquipHitCount(sk,equip);
if(extraHits<=hits)continue;
variants.push(...buildSolverExactHitVariants({jp:entry.jp,en,equip,note:WEAPON_META[equip].note,...(WEAPON_META[equip].needDeath0?{needDeath0:true}:{})},first,diff,extraHits,hits+1));
}
}
if(_solverIssenNeed>0)variants.unshift(ACT_ISSEN);
return variants.filter(v=>!(v.earlyKill&&solverBasicSkillForAT(v.at)));
}
function expandComboEquipVariants(combos,hexId){
if(!hexId)return combos;
const mon=getMonDB(hexId);
if(!mon)return combos;
const result=[];
for(const combo of combos){
result.push(combo);
const exp=[];
for(let i=0;i<combo.length;i++){
const v=combo[i];
if(v.at===0||v.equip||v.needle||isMetalExecutionAction(v)){exp.push(null);continue;}
const opts=getSkillEquipOpts(v.jp,hexId,'plain');
exp.push(opts.length?opts:null);
}
if(exp.every(e=>!e))continue;
const isGen=o=>!!(o&&o.equip&&WEAPON_META[o.equip]&&WEAPON_META[o.equip].generic);
let choices=null,genMode=false;
const enumerate=(k,cur)=>{
if(k===combo.length){
if(cur.every(c=>c===null||c.equip===''))return;
if(genMode&&!cur.some(isGen))return;
const nc=combo.slice();
for(let j=0;j<cur.length;j++){
if(cur[j]&&cur[j].equip)nc[j]=Object.assign({},combo[j],cur[j]);
}
const sorted=sortComboByPriority(nc);
if(sorted.some((v,i)=>v!==nc[i])
&&(isMetalHex(hexId)||nc.some(isMetalExecutionAction)))return;
result.push(sorted);
return;
}
for(const opt of choices[k]){cur.push(opt);enumerate(k+1,cur);cur.pop();}
};
for(const all of exp.some(opts=>opts&&opts.some(isGen))?[false,true]:[false]){
genMode=all;
choices=exp.map(opts=>!opts?[null]:all&&opts.some(isGen)?opts
:[{equip:'',note:''},...opts.filter(o=>!isGen(o))]);
enumerate(0,[]);
}
}
return result;
}
function buildSolverATSearch(variants){
const n=variants.length;
const min=new Int32Array(n+1),max=new Int32Array(n+1);
min[n]=0x7fffffff;max[n]=-0x7fffffff;
for(let i=n-1;i>=0;i--){
const at=variants[i].at;
min[i]=at>0&&at<min[i+1]?at:min[i+1];
max[i]=at>0&&at>max[i+1]?at:max[i+1];
}
return{variants,min,max};
}
function walkSolverATCombos(search,target,depth,visit,stop,rootIdx,opts={}){
const{variants,min,max}=search;
const removal=opts.removal,chips=opts.chips;
const combo=[],frames=[];
let remaining=target,removed=0,chipSum=0,chipMax=0,start=0;
if(rootIdx!==undefined){
const root=variants[rootIdx];
if(!root||!(root.at>0)||root.at>target||depth<1)return;
combo.push(root);remaining-=root.at;start=rootIdx;
removed=removal?removal.values[rootIdx]||0:0;
chipSum=chipMax=chips?chips.values[rootIdx]||0:0;
}
frames.push({next:start,remaining,removed,chipSum,chipMax});
while(frames.length){
if(stop())return;
const frame=frames[frames.length-1];
if((removal&&frame.removed>removal.capacity)||(chips&&frame.chipSum-frame.chipMax>=chips.limit)){
frames.pop();if(frames.length)combo.pop();continue;
}
if(frame.remaining===0&&combo.length===depth){
visit(combo);frames.pop();if(frames.length)combo.pop();continue;
}
if(frame.remaining<=0||combo.length>=depth||frame.next>=variants.length){
frames.pop();if(frames.length)combo.pop();continue;
}
const i=frame.next++,v=variants[i];
if(!(v.at>0)||v.at>frame.remaining)continue;
const rem=frame.remaining-v.at,slots=depth-combo.length-1;
if(slots===0?rem!==0:rem<min[i]*slots||rem>max[i]*slots)continue;
const r=frame.removed+(removal?removal.values[i]||0:0),c=chips?chips.values[i]||0:0;
const sum=frame.chipSum+c,largest=Math.max(frame.chipMax,c);
if((removal&&r>removal.capacity)||(chips&&sum-largest>=chips.limit))continue;
combo.push(v);frames.push({next:i,remaining:rem,removed:r,chipSum:sum,chipMax:largest});
}
}
function solveBattleCombo(bat,monCount,maxSlots,hexId,fieldShape){
if(bat<=0)return[];
const variants=expandSolverCombos(monCount,fieldShape);
if(!isSolverATReachable(variants,bat,maxSlots))return[];
const results=[],mon=hexId?getMonDB(hexId):null,useScreen=!!(mon&&monCount<=1),scoreCandidates=useScreen&&!_solverUseStats;
const fource=scoreCandidates?pickBestFource(hexId):null,fEls=fource?getFourceEls(fource.jp):null;
const state=_solverDmgCache.search,scoreContext=scoreCandidates?JSON.stringify([hexId,solverBuildContextSnapshot(),solverBlockRuleEnabled(),solverMultiPlayerEnabled()]):null;
const search=buildSolverATSearch(variants);
const basis=useScreen?solverSingleRemovalCapacity(variants,hexId):null;
let raw=0;
for(let depth=1;depth<=maxSlots;depth++){
const sink=[];
walkSolverATCombos(search,bat,depth,combo=>{
raw++;
let sc=0;
if(scoreCandidates){
const equipped=combo.map(v=>{
if(v.at===0||v.equip||v.needle)return v;
const eq=getSkillEquipOpts(v.jp,hexId,'first')[0];
return eq?Object.assign({},v,eq):v;
});
for(const candidate of equipped.some((v,i)=>v!==combo[i])?[combo,equipped]:[combo]){
const signature=scoreContext+'|'+JSON.stringify(candidate);
let value=state.scores.get(signature);
if(value===undefined){
const r1=getRankOrderValue(checkSolverDamage(candidate,hexId,mon,null,1,null,{},undefined));
const rf=r1===2?0:fEls?getRankOrderValue(checkSolverDamage(candidate,hexId,mon,null,1,fEls,{},undefined)):0;
if(r1===2)value=90000;
else if(rf===2)value=70000;
else{
const q1=calcSolverMinStat(candidate,hexId,1,null,true);
if(q1)value=50000-Math.min(q1.min,9999);
else if(r1===1)value=45000;
else{
const qf=fource?calcSolverMinStat(candidate,hexId,1,fource,true):null;
if(qf)value=40000-Math.min(qf.min,9999);
else if(rf===1)value=35000;
else{
value=0;
for(const mul of TENSION_MULS){
if(checkSolverDamage(candidate,hexId,mon,null,mul,null,{},undefined)||(fEls&&checkSolverDamage(candidate,hexId,mon,null,mul,fEls,{},undefined))){value=30000;break;}
const qt=calcSolverMinStat(candidate,hexId,mul,null,true);
if(qt){value=20000-Math.min(qt.min,9999);break;}
const qtf=fource?calcSolverMinStat(candidate,hexId,mul,fource,true):null;
if(qtf){value=10000-Math.min(qtf.min,9999);break;}
}
}
}
}
state.scores.set(signature,value);
}
sc=Math.max(sc,value);if(sc>=90000)break;
}
}
sink.push({c:combo.slice(),sc,ord:sink.length});
},()=>solverSearchCapped((!useScreen&&sink.length>=30)||raw>=6000),undefined,basis||{});
if(scoreCandidates)sink.sort((a,b)=>(b.sc-a.sc)||(a.ord-b.ord));
for(const item of sink)results.push(item.c);
}
return results;
}
function solveMetalComboOrders(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads,phaseBGroupCounts){
const last=solveMetalCombo(bat,monCount,maxSlots,metalCount,metalHPs,excludedPads,hexId,supPads,relaxPads);
if(!isMetalHex(hexId))return last;
const mc=metalCount||monCount;
const nonMetalCount=monCount-mc;
if(!(nonMetalCount>0))return last;
const rem=bat-ACT_ISSEN.at*mc,slots=maxSlots-mc;
if(!(rem>0)||slots<1)return last;
const issenMF={...ACT_ISSEN,metalFirst:true,orderVariant:true};
const head=Array(mc).fill(issenMF);
const phaseCounts=Array.isArray(phaseBGroupCounts)
?phaseBGroupCounts
:(_solverGroupCounts?_solverGroupCounts.map((n,gi)=>gi===0?0:n):null);
const phaseShape={groupCounts:phaseCounts,fieldTotal:nonMetalCount};
const first=[];
for(const c of solveBattleCombo(rem,nonMetalCount,slots,null,phaseShape)){
if(!solverMetalFirstTailOK(c))continue;
first.push([...head,...c]);
}
return last.concat(first);
}
function makeKmcBuildSpec(bat,T,postAlive,tc2,canRound2,hexId,metalSupNeed){
const phaseAVars=expandSolverCombos(T);
const sSkills=phaseAVars.filter(v=>{
if(metalSupNeed>0&&isMetalExecutionAction(v))return false;
const sk=lookupSkill(v.jp);
return sk&&sk.target==='S'&&v.at>0&&v.at<=bat;
});
const kmcFource=(!isMetalHex(hexId)&&hexId)?pickBestFource(hexId):null;
const spaces=[{key:'r1',target:bat,loLen:1,hiLen:SOLVER_ROUND_SIZE,cap:30}];
if(canRound2){
spaces.push({key:'r2a',target:bat,loLen:SOLVER_ROUND_SIZE+1,hiLen:SOLVER_MAX_ACTIONS,cap:14});
if(tc2>0)spaces.push({key:'r2b',target:bat-tc2,loLen:SOLVER_ROUND_SIZE+1,hiLen:SOLVER_MAX_ACTIONS,cap:14});
}
return{bat,T,postAlive,tc2,canRound2:!!canRound2,hexId,
metalSupNeed,sSkills,kmcFourceAction:kmcFource?makeFourceAction(kmcFource):null,
...solverBuildContextSnapshot(),spaces};
}
function buildKmcRootSpace(spec,space,rootIdx){
const res=[],sSkills=spec.sSkills||[];
const root=sSkills[rootIdx];
if(!root||root.at>space.target)return res;
const buffTargets=spec.fieldHexes||(spec.hexId?[spec.hexId]:null);
let state;
if(spec.postAlive!==0){
state=_solverDmgCache.search;
const context=JSON.stringify([spec.bat,spec.T,spec.postAlive,spec.tc2,spec.canRound2,spec.hexId,spec.metalSupNeed,
solverBuildContextSnapshot(),_solverIssenNeed,solverBlockRuleEnabled(),solverMultiPlayerEnabled(),DISPLAY_LANG]);
if(state.kmcTailContext!==context){state.kmcTails.clear();state.kmcTailContext=context;}
}
const pushV=(arr)=>{
if(arr.length>=space.loLen&&arr.length<=space.hiLen&&!solverSearchCapped(res.length>=space.cap))res.push(arr);
};
const copyCombos=list=>{
const copies=new Map();
return list.map(combo=>combo.map(action=>{
if(!copies.has(action))copies.set(action,Object.assign({},action));
return copies.get(action);
}));
};
const dfsA=(start,seqA,aSum)=>{
if(solverSearchCapped(res.length>=space.cap))return;
if(aSum>0){
const eggA=seqA.some(v=>solverEggCanBenefit(v,buffTargets));
const fourceA=spec.kmcFourceAction&&seqA.some(v=>solverEggCanBenefit(v,buffTargets)&&!lookupSkill(v.jp).el);
if(spec.postAlive===0){
if(aSum===space.target){
pushV([...seqA,ACT_MERCY]);
if(eggA)pushV([ACT_EGG,...seqA,ACT_MERCY]);
if(fourceA)pushV([spec.kmcFourceAction,...seqA,ACT_MERCY]);
}
}else{
const bTgt=space.target-aSum;
if(bTgt>0){
const maxLenB=space.hiLen-seqA.length-1;
if(maxLenB>=1){
const key=bTgt+':'+maxLenB;
let tail=state.kmcTails.get(key),bCombos;
if(!tail){
const before=_solverSearchIncomplete;
_solverSearchIncomplete=false;
try{
bCombos=solveBattleCombo(bTgt,spec.postAlive,maxLenB);
tail={combos:copyCombos(bCombos),incomplete:_solverSearchIncomplete};
state.kmcTails.set(key,tail);
}finally{_solverSearchIncomplete=before||_solverSearchIncomplete;}
}else{
bCombos=copyCombos(tail.combos);
if(tail.incomplete)_solverSearchIncomplete=true;
}
for(const b of bCombos){
const eggB=b.some(v=>solverEggCanBenefit(v,buffTargets));
const fourceB=spec.kmcFourceAction&&b.some(v=>solverEggCanBenefit(v,buffTargets)&&!lookupSkill(v.jp).el);
pushV([...seqA,ACT_MERCY,...b]);
if(eggA||eggB)pushV([ACT_EGG,...seqA,ACT_MERCY,...b]);
if(eggB)pushV([...seqA,ACT_MERCY,ACT_EGG,...b]);
if(fourceA||fourceB)pushV([spec.kmcFourceAction,...seqA,ACT_MERCY,...b]);
if(fourceB)pushV([...seqA,ACT_MERCY,spec.kmcFourceAction,...b]);
if(solverSearchCapped(res.length>=space.cap))break;
}
}
}
}
}
if(seqA.length>=space.hiLen-1)return;
for(let i=start;i<sSkills.length;i++){
if(aSum+sSkills[i].at>space.target)continue;
seqA.push(sSkills[i]);
dfsA(i,seqA,aSum+sSkills[i].at);
seqA.pop();
if(solverSearchCapped(res.length>=space.cap))return;
}
};
dfsA(rootIdx,[root],root.at);
return res;
}
function buildSolverShardPayload(spec,roots,buildRows){
return withSolverBuildContext(spec,()=>{
const buckets={};
for(const space of spec.spaces)buckets[space.key]=[];
for(const root of roots)for(const space of spec.spaces)
buckets[space.key].push(...buildRows(space,root));
return{buckets,incomplete:_solverSearchIncomplete};
});
}
function mergeSolverShardPayloads(spec,payloads){
const merged={incomplete:(payloads||[]).some(p=>!p||p.incomplete)};
for(const space of spec.spaces){
const rows=[];
for(const p of payloads||[]){
const part=p&&p.buckets&&p.buckets[space.key];
if(part)rows.push(...part);else merged.incomplete=true;
}
const received=new Set(rows.map(r=>r.root));
if((spec.sSkills||spec.variants||[]).some((v,i)=>v.at>0&&v.at<=space.target&&
(!space.depths||space.depths.length)&&!received.has(i)))merged.incomplete=true;
rows.sort((a,b)=>(space.depths?a.depth-b.depth:0)||(a.root-b.root));
const out=[];
for(const depth of space.depths||[null]){
let kept=0;
for(const row of rows){
if(depth!==null&&row.depth!==depth)continue;
for(const combo of row.combos||[]){
if(kept>=space.cap){merged.incomplete=true;break;}
out.push(combo);kept++;
}
if(kept>=space.cap){merged.incomplete=true;break;}
}
}
merged[space.key]=out;
}
return merged;
}
function buildKmcShardPayload(spec,roots){
return buildSolverShardPayload(spec,roots,(space,root)=>
[{root,combos:buildKmcRootSpace(spec,space,root)}]);
}
function buildKmcSerialPayload(spec){
const roots=spec.sSkills.map((_,i)=>i);
return mergeSolverShardPayloads(spec,[buildKmcShardPayload(spec,roots)]);
}
function makeKillAllBuildSpec(bat,T,tc2,canRound2,hexId,metalSupNeed,stage){
const variants=expandSolverCombos(T);
const spaces=[];
const byTarget=new Map();
const reachable=(target,depths)=>{
if(!byTarget.has(target))byTarget.set(target,solverATReachableDepths(variants,target,canRound2?SOLVER_MAX_ACTIONS:SOLVER_ROUND_SIZE));
return depths.filter(d=>byTarget.get(target)[d]);
};
if(stage!=='r2')spaces.push({key:'r1',target:bat,depths:reachable(bat,solverRoundDepths(1)),cap:30});
if(stage!=='r1'&&canRound2){
spaces.push({key:'r2a',target:bat,depths:reachable(bat,solverRoundDepths(2)),cap:30});
if(tc2>0)spaces.push({key:'r2b',target:bat-tc2,depths:reachable(bat-tc2,solverRoundDepths(2)),cap:30});
}
return{bat,T,tc2,canRound2:!!canRound2,hexId,metalSupNeed,variants,
...solverBuildContextSnapshot(),spaces};
}
function buildKillAllRootDepth(spec,space,depth,rootIdx,search){
const res=[];
walkSolverATCombos(search||buildSolverATSearch(spec.variants||[]),space.target,depth,
combo=>res.push(combo.slice()),()=>solverSearchCapped(res.length>=space.cap),rootIdx);
return res;
}
function buildKillAllShardPayload(spec,roots){
const search=buildSolverATSearch(spec.variants||[]);
return buildSolverShardPayload(spec,roots,(space,root)=>space.depths.map(depth=>
({depth,root,combos:buildKillAllRootDepth(spec,space,depth,root,search)})));
}
function prepareParallelSolverSpec(render,options,kind,stage){
if(!render||!(render.bat>0)||!render.monGroups||!render.monGroups.length)return null;
const monGroups=render.monGroups;
const canRound2=solverAllowsRound2(render.mapDeft,render.canRound2);
const chars=options&&options.chars||[];
const mercyLv=chars.length?Math.max(...chars.map(c=>c.lv||99)):99;
const plan=deriveSolverBattlePlan(monGroups,render.monId,mercyLv,false);
const{T,tc2,hexId,metalSupCount:metalSupNeed}=plan;
return withSolverBuildContext({groupCounts:monGroups.map(g=>g.count||1),fieldTotal:T,fieldHexes:monGroups.map(g=>g.hex),
metalSupNeed,useStats:!(options&&options.useStats===false)},()=>{
if(kind==='kmc'){
if(plan.planType!=='kill_mercy_clear')return null;
return makeKmcBuildSpec(render.bat,T,plan.postAlive,tc2,canRound2,hexId,metalSupNeed);
}
if(kind==='killAll'){
if(T<=1||isMetalHex(hexId))return null;
return makeKillAllBuildSpec(render.bat,T,tc2,canRound2,hexId,metalSupNeed,stage);
}
return{plan};
});
}
function buildSimInstances(targets){
const sim=[];
for(let ti=0;ti<targets.length;ti++){
const t=targets[ti];
const m=getMonDB(t.hex);
const hp=m?m.s[0]:9999,hpLow=monHpMin(hp),killFloor=hp-hpLow+1;
for(let k=0;k<(t.count||1);k++)
sim.push({hex:t.hex,hp,hpLow,killFloor,alive:true,
death:t.death!==undefined?t.death:(m?m.s[12]:100),groupIdx:ti});
}
return sim;
}
function metalExecuteInst(inst){
inst.hp=0;if('hpLow'in inst)inst.hpLow=0;inst.alive=false;
return inst.groupIdx===0;
}
function skillDamagePerHit(sk,action,hex,stats,fourceEls,wmulOverride){
if(isMetalHex(hex)){
const mc=metalChipPerHit(sk,action.equip);
return{min:mc.min,max:mc.max,metal:true};
}
const wm=wmulOverride!==undefined?wmulOverride:solverWeaponMul(sk,action.equip,hex);
const r=calcSkillDamageCache(sk,stats,hex,fourceEls||null,wm,actionMetalEff(sk,action.equip),action.equip);
return r?{min:r.min,max:r.max,metal:false,pre:r.pre,metalEff:r.metalEff}
:{min:0,max:0,metal:false,none:true};
}
function buildCharDamageSpan(sk,hx,eq,hits,charsArr){
let minDmg=Infinity,maxDmg=0;
for(const c of charsArr){
const r=calcSkillDamageCache(sk,c.stats,hx,null,solverWeaponMul(sk,eq,hx),actionMetalEff(sk,eq),eq);
if(r){
if(r.min*hits<minDmg)minDmg=r.min*hits;
if(r.max*hits>maxDmg)maxDmg=r.max*hits;
}
}
if(minDmg===Infinity)minDmg=0;
return{min:minDmg,max:maxDmg};
}
function sortComboByPriority(combo){
if(!combo.some(v=>_actionPri(v)!==0))return combo;
return combo.map((v,i)=>({v,i}))
.sort((a,b)=>(Math.floor(a.i/SOLVER_ROUND_SIZE)-Math.floor(b.i/SOLVER_ROUND_SIZE))
||(_actionPri(b.v)-_actionPri(a.v))||(a.i-b.i))
.map(x=>x.v);
}
const solverPriSwapSeen=new WeakMap();
function solverPriSwapCombos(combo,hexId,pool,ordered){
const mon=getMonDB(hexId),field=[hexId,...(_solverFieldHexes||[])].map(hex=>({hex,count:1}));
if(!mon||field.some(t=>t.hex&&isMetalHex(t.hex)))return[];
const key=c=>{const s=c.map(v=>solverComboActionSignature([v]));return(ordered?s:s.filter((x,i)=>c[i].at>0).sort().concat(s.map((x,i)=>c[i].at>0?'':x))).join('\x1d');};
let seen=solverPriSwapSeen.get(pool);
if(!seen)solverPriSwapSeen.set(pool,seen=new Set(pool.map(key)));
const fast=lookupSkill('しっぷうづき'),fan=[],spear=[],out=[];
combo.forEach((v,i)=>{
const sk=lookupSkill(v.jp);
if(!sk||!(v.at>0)||v.equip||v.needle||v.earlyKill||_actionPri(v))return;
for(const eq in WEAPON_META)if(weaponMetaValue(eq,'pri')&&solverWeaponCompatible(sk,eq))
fan.push({i,a:{...v,equip:eq,note:WEAPON_META[eq].note,priSwap:true},rep:SOLVER_BASIC_SKILLS.includes(v.jp)?1:0,mul:(sk.mul||1)*(sk.tmul&&sk.tmul[mon.t]||1)*solverWeaponMul(sk,eq,hexId)});
if(v.at===fast.at[0]&&v.jp!==fast.jp)spear.push({i,a:{jp:fast.jp,en:fast.en,at:v.at,equip:'',note:'',hits:1,...(v.tgtGroup!==undefined?{tgtGroup:v.tgtGroup}:{})}});
});
fan.sort((x,y)=>y.rep-x.rep||y.mul-x.mul);
for(const{i,a}of[...fan,...spear]){
const c=sortComboByPriority(combo.map((v,j)=>j===i?a:v)),k=key(c);
if(!seen.has(k)&&solverBlockStructureOK(c,field)){seen.add(k);out.push(c);}
}
return out;
}
function finisherLastOrder(arr,fi){
if(fi==null||fi<0||fi>=arr.length-1)return arr;
return arr.slice(0,fi).concat(arr.slice(fi+1),[arr[fi]]);
}
function permuteComboSlots(combo,slotFilter,keyFn,evalFn){
const slots=[],vals=[];
for(let i=0;i<combo.length;i++)if(slotFilter(combo[i])){slots.push(i);vals.push(combo[i]);}
if(vals.length<2||vals.length>5)return null;
const seen=new Set();
let result=null;
const walk=(rest,cur)=>{
if(result&&result.done)return;
if(!rest.length){
const nc=combo.slice();
for(let k=0;k<slots.length;k++)nc[slots[k]]=cur[k];
const key=nc.map(keyFn).join('¶');
if(seen.has(key))return;
seen.add(key);
result=evalFn(nc,result);
return;
}
const choices=new Set();
for(let i=0;i<rest.length;i++){
if(result&&result.done)return;
const key=keyFn(rest[i]);
if(choices.has(key))continue;
choices.add(key);
walk(rest.slice(0,i).concat(rest.slice(i+1)),cur.concat([rest[i]]));
}
};
walk(vals,[]);
return result;
}
function forEachSolverAssignment(combo,chars,visitor){
const N=chars.length,n=combo.length;
const locks=combo.map(getSkillClassLock);
const pri=combo.map(_actionPri),swap=combo.findIndex(v=>v.priSwap);
const pick=[];
let stopped=false;
const walk=()=>{
if(stopped)return;
if(pick.length===n){
if(swap>=0&&!solverWeaponPurposeOK(combo[swap],null,[],null,pick,swap))return;
if(visitor(pick.slice())===true)stopped=true;
return;
}
const k=pick.length;
for(let i=0;i<N&&!stopped;i++){
if(!solverActorSlotOK(pick,k,i,chars[i],locks,pri))continue;
pick.push(i);
walk();
pick.pop();
}
};
walk();
return stopped;
}
function metalClearReorder(combo,killTargets,hexId,evaluate,bat){
return permuteComboSlots(combo,
v=>v.at>0&&!isMetalExecutionAction(v),
v=>v.jp+'|'+(v.equip||'')+'|'+(v.hits||0)+'|'+v.at,
(nc,prev)=>{
if(evaluate)return evaluate(nc)||prev;
if(!priOrderOK(nc))return prev;
const best=findBestAssignment(nc,hexId,getMonDB(hexId),killTargets,1,null,bat);
return best.rating?{combo:nc,best,done:true}:prev;
});
}
const _solverVariantSegs=new WeakMap(),_solverVariantIds=new Map();
function solverWeaponVariantKey(combo,slot,equip){
return combo.map((v,i)=>{
const hit=i===slot?undefined:_solverVariantSegs.get(v);
if(hit!==undefined)return hit;
const seg=[v.jp,v.at||0,i===slot?equip:v.equip||'',v.hits||0,v.earlyKill?1:0,v.aoeK!==undefined?v.aoeK:'',
v.tgtGroup!==undefined?v.tgtGroup:'',v.soloGroup?1:0,v.needle?1:0,v.supTarget?1:0].join('\x1f');
let id=_solverVariantIds.get(seg);
if(id===undefined){id=_solverVariantIds.size.toString(36);_solverVariantIds.set(seg,id);}
if(i!==slot)_solverVariantSegs.set(v,id);
return id;
}).join('\x1e');
}
function solverSpecialWeaponSlots(combo){
return combo.map((v,i)=>v.equip&&WEAPON_META[v.equip]&&!WEAPON_META[v.equip].generic?i:-1).filter(i=>i>=0);
}
const solverGenericEquips=new WeakMap(),solverCounterpartIds=new WeakMap();
function solverGenericCounterpartKeys(combo,slot){
const v=combo[slot];
let ids=solverCounterpartIds.get(v);
if(!ids){
const sk=lookupSkill(v.jp);
let eqs=solverGenericEquips.get(sk);
if(!eqs)solverGenericEquips.set(sk,eqs=['',...Object.keys(WEAPON_META).filter(eq=>WEAPON_META[eq].generic&&solverWeaponCompatible(sk,eq))]);
solverCounterpartIds.set(v,ids=eqs.map(eq=>solverWeaponVariantKey([v],0,eq)));
}
const segs=solverWeaponVariantKey(combo).split('\x1e');
return ids.map(id=>{segs[slot]=id;return segs.join('\x1e');});
}
function findBestAssignment(combo,hexId,mon,killTargets,tensionMul,fourceEls,bat){
const chars=readCharStatsFromDom();
const idxs=[];for(let i=0;i<chars.length;i++)idxs.push(i);
const scope=JSON.stringify([hexId,killTargets,tensionMul,fourceEls,solverBlockRuleEnabled()]);
let dead=_solverDmgCache.search.dead.get(scope);
if(!dead)_solverDmgCache.search.dead.set(scope,dead=new Map());
const fail=last=>{dead.set(solverWeaponVariantKey(combo),last);return{rating:null,assign:null,defend:idxs.slice(),eggAssign:null};};
for(const slot of solverSpecialWeaponSlots(combo)){
if(weaponMetaValue(combo[slot].equip,'pri'))continue;
for(const key of solverGenericCounterpartKeys(combo,slot)){const last=dead.get(key);if(last!==undefined&&last<slot)return fail(last);}
}
let best=null,last=-1;
forEachSolverAssignment(combo,chars,(assign)=>{
const out={};
const rating=checkSolverDamage(combo,hexId,mon,killTargets,tensionMul,fourceEls,out,assign);
last=Math.max(last,out.rejectLast===undefined?Infinity:out.rejectLast);
const rk=getRankOrderValue(rating);
if(rk===2&&bat!==undefined&&_solverGoldState&&!_solverGoldState.gold)
verifySolverConditionParty(combo,killTargets,hexId,bat,chars,assign,tensionMul,fourceEls,out.eggAssign,false,out,rating);
if(rk>0){
const entry={rating,assign,defend:idxs.filter(k=>!assign.includes(k)),eggAssign:out.eggAssign||null,finIdx:out.finIdx};
if(!best||rk>getRankOrderValue(best.rating))best=entry;
}
return!!(best&&getRankOrderValue(best.rating)===2);
});
if(!best)return fail(last);
return best;
}
function findBestOrderedAssignment(combo,hexId,mon,killTargets,tensionMul,fourceEls,bat){
if(killTargets)return{combo,best:findBestAssignment(combo,hexId,mon,killTargets,tensionMul,fourceEls,bat)};
const orders=new Map(),originalKey=JSON.stringify(combo),forms=new Map();
const keyOf=v=>v.jp+'|'+(v.equip||'')+'|'+(v.hits||0);
const dmg=combo.filter(v=>v.at>0);
let complete=dmg.length>=2&&dmg.length<=5;
for(const v of dmg){
const key=keyOf(v),form=JSON.stringify(v);
if(forms.has(key)&&forms.get(key)!==form)complete=false;
forms.set(key,form);
}
const _eval=c=>{
const prev=_x12Kills,kills=new Set();_x12Kills={c,k:kills};
let best;
try{best=findBestAssignment(c,hexId,mon,killTargets,tensionMul,fourceEls,bat);}
finally{_x12Kills=prev;}
if(prev&&prev.c===c)for(const k of kills)prev.k.add(k);
orders.set(JSON.stringify(c),{combo:c,best,kills});
return best;
};
const r=permuteComboSlots(combo,
v=>v.at>0,
keyOf,
(nc,prev)=>{
if(!priOrderOK(nc))return prev;
const best=_eval(nc);
if(!best.rating||(prev&&getRankOrderValue(best.rating)<=getRankOrderValue(prev.best.rating)))return prev;
return{combo:nc,best,done:best.rating==='gold'};
});
if(r)return{combo:r.combo,best:r.best,orders,complete};
const original=orders.get(originalKey);
return{combo,best:original?original.best:_eval(combo),orders,complete};
}
function checkSolverDamage(combo,hexId,mon,killTargets,tensionMul,fourceEls,outInfo,assign,forcedEggAssign,evaluationChars,evaluation){
const chars=evaluationChars||readCharStatsFromDom();
if(!mon)return null;
tensionMul=tensionMul||1;
const _actor=(ci)=>actorAt(chars,assign,ci);
if(evaluation&&evaluation.initialHP!=null)return null;
if(!killTargets||!killTargets.length)killTargets=[{hex:hexId,count:1,death:getMonDB(hexId).s[12]}];
const instances=buildSimInstances(killTargets);
const metalMainBattle=instances.some(i=>i.groupIdx===0&&isMetalHex(i.hex));
if(instances.length===0)return null;
const uniqueHexes=[...new Set(killTargets.map(t=>t.hex))];
const inlineFource=findInlineFource(combo);
const fourceCI=inlineFource?combo.indexOf(inlineFource):-1;
const effectiveFEls=inlineFource?(getFourceEls(inlineFource.jp)||[]):fourceEls;
const hasFource=effectiveFEls&&effectiveFEls.length>0;
const skillDmg=[];
for(let ci=0;ci<combo.length;ci++){
const sk=lookupSkill(combo[ci].jp);
const hits=SolverActionGate.hits(combo[ci]);
const tgt=SolverActionGate.targetKind(sk);
const dmg={},dmgF={},_ac=_actor(ci);
for(const hex of uniqueHexes){
if(!sk||!getMonDB(hex)||!_ac&&!isMetalHex(hex)){dmg[hex]={min:0,max:0};dmgF[hex]=dmg[hex];continue;}
if(isMetalHex(hex)){
const mc=skillDamagePerHit(sk,combo[ci],hex,null,null);
const _md={min:mc.min*hits,max:mc.max*hits,hit:mc};
dmg[hex]=_md;dmgF[hex]=_md;
continue;
}
const r=skillDamagePerHit(sk,combo[ci],hex,_ac.stats,null);
dmg[hex]=r.none?{min:0,max:0}:{min:r.min*hits,max:r.max*hits,hit:r};
if(hasFource){
const rF=calcSkillDamageCache(sk,_ac.stats,hex,effectiveFEls,solverWeaponMul(sk,combo[ci].equip,hex),actionMetalEff(sk,combo[ci].equip),combo[ci].equip);
dmgF[hex]=rF?{min:rF.min*hits,max:rF.max*hits,hit:rF}:dmg[hex];
}else{
dmgF[hex]=dmg[hex];
}
}
skillDmg.push({dmg,dmgF,tgt,hits});
}
const eggCIs=[];
const dmgCIs=[];
for(let ci=0;ci<combo.length;ci++)if(combo[ci].jp==='おうえん')eggCIs.push(ci);
for(let ci=0;ci<skillDmg.length;ci++){
if(combo[ci].at>0)dmgCIs.push(ci);
}
const x12=combo.map((v,ci)=>WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul?ci:-1).filter(ci=>ci>=0),x12Mercy=combo.length>0&&combo[combo.length-1].jp==='みのがす';
if(x12.length>1||x12.length&&!x12Mercy&&x12[0]!==combo.length-1)return null;
const eggEligibleCIs=dmgCIs.filter(ci=>solverEggCanBenefit(combo[ci],instances,
hasFource&&(!inlineFource||ci>fourceCI)?skillDmg[ci].dmgF:skillDmg[ci].dmg));
const externalAssign=(!eggCIs.length&&tensionMul>1&&eggEligibleCIs.length>0)
?{[eggEligibleCIs[eggEligibleCIs.length-1]]:tensionMul}:null;
function _simRun(mode,eggAssign){
const trace=evaluation&&evaluation.trace;
const actionResults=evaluation&&evaluation.captureActions?[]:null;
if(trace)trace.length=0;
const sim=instances.map(inst=>({
hex:inst.hex,groupIdx:inst.groupIdx,death:inst.death,
hp:mode==='min'?inst.hp:inst.hpLow,
hpLow:inst.hpLow,killFloor:inst.killFloor,
alive:true
}));
const path=[];
const numericKills=new Set(),eggBenefited=[],fourceBenefited=new Set();
const _targetKey=(inst)=>[(inst.groupIdx===0?'M':'S'),inst.hex,inst.death,inst.hp,inst.hpLow].join(':');
let r1Removal=false;
const _done=(allDead,rejectAt,reason)=>({allDead,rejectAt,reason,pathSig:path.join(';'),actionResults,r1Removal,lastMainKill,fallbackKind});
const resultTarget=(target,outcome,step)=>({index:sim.indexOf(target),groupIdx:target.groupIdx,hex:target.hex,outcome,
hpBefore:target.hp,hpLowBefore:target.hpLow,
hp:outcome==='ko'?0:step?step.hp:target.hp,
hpLow:outcome==='ko'?0:step?step.hpLow:target.hpLow});
const recordAction=(ci,kind,targets)=>{var _ios7;
const changed=new Map(targets.map(t=>[t.index,t]));
const remaining=sim.map((t,index)=>({index,hex:t.hex,groupIdx:t.groupIdx,hp:t.hp,hpLow:t.hpLow,alive:t.alive}))
.filter(t=>t.alive&&!['ko','removed'].includes(((_ios7=changed.get(t.index))==null?void 0:_ios7.outcome)))
.map(t=>changed.has(t.index)?{...t,hp:changed.get(t.index).hp,hpLow:changed.get(t.index).hpLow}:t);
actionResults.push({ci,kind,targets,remaining});
};
let fourceOn=!inlineFource&&hasFource;
let mainKilled=false,lastMainKill=-1,weakKill=-1,companionKilled=false,fallbackKind;
for(let ci=0;ci<skillDmg.length;ci++){
const sd=skillDmg[ci];
const alive=sim.filter(i=>i.alive);
if(alive.length===0){path.push(ci+':!earlyclear');return _done(false,ci,'earlyclear');}
if(combo[ci].jp==='みのがす'){
const removed=[],removedTargets=[],casterLv=actorLv(chars,assign,ci);
let companionRemoved=false;
for(const inst of sim){
if(!solverMercyCanRemove(inst,maxCharLv(chars)))continue;
if(!solverMercyCanRemove(inst,casterLv)){path.push(ci+':m?');return _done(false,ci,'mercy_lv');}
if(inst.groupIdx===0&&!mainKilled){path.push(ci+':m!');return _done(false,ci,'mercymain');}
removed.push(_targetKey(inst));
if(inst.groupIdx>0)companionRemoved=true;
if(actionResults)removedTargets.push(resultTarget(inst,'removed'));
inst.alive=false;
}
if(ci===combo.length-1&&companionKilled&&companionRemoved)fallbackKind='partial-mercy';
path.push(ci+':m:'+removed.sort().join(','));
if(ci<SOLVER_ROUND_SIZE&&removed.length)r1Removal=true;
if(actionResults)recordAction(ci,'mercy',removedTargets);
continue;
}
if(combo[ci].jp==='おうえん'){path.push(ci+':e');continue;}
if(inlineFource&&combo[ci].jp===inlineFource.jp&&!fourceOn){fourceOn=true;path.push(ci+':f');continue;}
if(!sd.tgt){path.push(ci+':n');continue;}
const mul=(eggAssign&&eggAssign[ci])?eggAssign[ci]:1;
const tLv=mul>1?actorLv(chars,assign,ci):99;
const dTable=fourceOn?sd.dmgF:sd.dmg;
const useDmg=mode==='min'?'min':'max';
const sk=lookupSkill(combo[ci].jp),numericAction=!isSolverNonDamageRemoval(combo[ci]);
const picked=SolverActionGate.targets(alive,combo[ci],sk,'groupIdx');
if(picked.reason){path.push(ci+':!'+picked.reason);return _done(false,ci,picked.reason);}
if(metalMainBattle&&combo[ci].tgtGroup!==undefined&&SolverActionGate.targetKind(sk)==='S'
&&!(combo[ci].supTarget&&alive.some(t=>t.groupIdx===0&&isMetalHex(t.hex))))
{path.push(ci+':!retarget');return _done(false,ci,'retarget');}
const blockedReason=solverBlockRuleEnabled()&&picked.targets.some(t=>solverFieldBlock([t.hex])>0)?solverBlockedHitReason(combo[ci]):null;
if(blockedReason){path.push(ci+':!'+blockedReason);return _done(false,ci,blockedReason);}
if(!solverWeaponPurposeOK(combo[ci],sk,picked.targets,dTable,assign,ci)){path.push(ci+':!weapon_idle');return _done(false,ci,'weapon_idle');}
if(sk&&sk.miss!=null&&combo[ci].at===sk.miss&&sk.miss!==solverATForCount(sk.at[0],sk.at[1],isHitBased(sk)?SolverActionGate.hits(combo[ci]):picked.targets.length)
&&picked.targets.some(t=>((dTable[t.hex]||{}).max||0)>0)){path.push(ci+':!at_mismatch');return _done(false,ci,'at_mismatch');}
if(combo[ci].aoeK!==undefined&&combo[ci].aoeK!==picked.targets.length){
path.push(ci+':!aoeK');return _done(false,ci,'aoeK');
}
if(mul>1){
const benefited=picked.targets.filter(target=>solverEggCanBenefit(combo[ci],[target],dTable));
if(!benefited.length){
path.push(ci+':!no_egg_damage');return _done(false,ci,'no_egg_damage');
}
eggBenefited.push(benefited);
}
path.push(ci+':d:'+picked.targets.map(_targetKey).sort().join(','));
const stepForTarget=target=>{
const table=dTable[target.hex]||{};
const t=solverActionDamage(sk,target.hex,fourceOn?effectiveFEls:null,table.hit||{min:0,max:0},sd.hits,mul,tLv);
if(inlineFource&&fourceOn&&!sk.el&&solverEggCanBenefit(combo[ci],[target],dTable)){
const off=solverActionDamage(sk,target.hex,null,(sd.dmg[target.hex]||{}).hit||{min:0,max:0},sd.hits,mul,tLv);
if(t.min>off.min||t.max>off.max)fourceBenefited.add(target);
}
const step=SolverActionGate.step(target,sd.hits,t[useDmg],t.max,t.head);
step.damage=t[useDmg];
return step;
};
const savedSteps=new Map();
if(actionResults){
const results=picked.targets.map(target=>{
const exec=canExecuteMetal(combo[ci],target.hex);
if(exec)return resultTarget(target,exec.isValid?'ko':'alive');
const step=stepForTarget(target);savedSteps.set(target,step);
return resultTarget(target,step.dead?'ko':step.uncertain?'possible':'alive',step);
});
recordAction(ci,'damage',results);
}
const traceRow=trace?{ci,mode,fourceOn,targets:picked.targets.map(t=>sim.indexOf(t)),
alive:alive.map(t=>sim.indexOf(t)),steps:[]}:null;
if(traceRow)trace.push(traceRow);
let missed=true;
for(const target of picked.targets){
const exec=canExecuteMetal(combo[ci],target.hex);
let down;
if(exec){
if(!exec.isValid)return _done(false,ci,'non_metal_issen');
if(traceRow)traceRow.steps.push({index:sim.indexOf(target),execute:true});
if(target.groupIdx!==0&&!mainKilled)return _done(false,ci,'main_first');
if(ci<SOLVER_ROUND_SIZE)r1Removal=true;
down=metalExecuteInst(target);
}else{
const dMax=(dTable[target.hex]||{}).max||0;
if(actionAtUnstable(combo[ci],(dTable[target.hex]||{}).min||0,dMax)){
path.push(ci+':!at_unstable');
return _done(false,ci,'at_unstable');
}
const step=savedSteps.get(target)||stepForTarget(target);
if(step.hp!==target.hp||step.hpLow!==target.hpLow)missed=false;
if(traceRow)traceRow.steps.push({index:sim.indexOf(target),dead:step.dead,uncertain:step.uncertain,
...(step.dead&&numericAction?{killFloor:target.killFloor}:{})});
if(SolverActionGate.exactHitReason(combo[ci],step))return _done(false,ci,'at_hit_count');
if(step.dead&&numericAction&&step.damage<target.killFloor)
return _done(false,ci,'kill_damage');
if(step.uncertain){if(target.groupIdx===0)lastMainKill=ci;return _done(false,ci,'uncertain');}
if(step.dead&&target.groupIdx!==0&&!mainKilled)return _done(false,ci,'main_first');
if(step.dead&&target.groupIdx===0&&weakKill<0&&!solverKillerFormOK(combo[ci],target.hex,(_actor(ci)||{}).stats))weakKill=ci;
SolverActionGate.commit(target,step);
if(step.dead&&numericAction)numericKills.add(target);
if(ci<SOLVER_ROUND_SIZE&&step.dead)r1Removal=true;
down=step.dead&&target.groupIdx===0;
}
if(!target.alive&&target.groupIdx>0)companionKilled=true;
if(down){if(x12Mercy&&x12.length&&ci>x12[0])return _done(false,ci,'x12_kill');mainKilled=true;lastMainKill=ci;}
}
if(actionResults&&numericAction&&missed)actionResults[actionResults.length-1].miss=true;
if(x12Mercy&&ci===x12[0]&&lastMainKill!==ci)return _done(false,ci,'x12_kill');
}
if(weakKill>=0)return _done(false,weakKill,'weak_killer');
for(const targets of eggBenefited)if(!targets.some(target=>numericKills.has(target)))
return _done(false,combo.length-1,'no_egg_damage_goal');
if(inlineFource&&![...fourceBenefited].some(target=>numericKills.has(target)))
return _done(false,combo.length-1,'no_fource_damage_goal');
return _done(sim.every(i=>!i.alive),-1,null);
}
const proposedAssigns=forcedEggAssign!==undefined?[forcedEggAssign]:(eggCIs.length>0
?buildSolverEggAssignments(eggCIs,eggEligibleCIs,(egg,ci)=>solverEggCanReach(combo,egg,ci,assign,chars.length)):[externalAssign]);
const assigns=eggCIs.length?proposedAssigns.filter(a=>
Object.keys(solverConditionEggTargets(combo,a,assign,chars.length)).length===eggCIs.length):proposedAssigns;
const _lastCI=skillDmg.length-1;
const _mercyFinal=_lastCI>=0&&combo[_lastCI].jp==='みのがす';
let bestRating=null,bestAssign=null,bestPathSig=null,bestActionResults=null,bestR1Removal=false,bestFallbackKind,cleanPathSig=null,fallbackPathSig=null;
const minRuns=[];let rejectedRun=null;
for(const assign of assigns){
const r=_simRun('min',assign);
minRuns.push(r);
if(fallbackPathSig===null)fallbackPathSig=r.pathSig;
if(r.allDead&&r.rejectAt<0){
let a=assign,b=r;const k=r.lastMainKill,cmp=(x,y)=>Object.keys(x).filter(ci=>+ci!==k).length-Object.keys(y).filter(ci=>+ci!==k).length||(y[k]||1)-(x[k]||1);
if(_mercyFinal&&a&&k>=0)for(const t of assigns.slice(minRuns.length).filter(x=>x&&cmp(x,a)<0).sort(cmp)){const rt=_simRun('min',t);if(rt.allDead&&rt.rejectAt<0&&rt.lastMainKill===k){a=t;b=rt;break;}}
bestRating='gold';bestAssign=a;bestPathSig=b.pathSig;bestActionResults=b.actionResults;bestR1Removal=b.r1Removal;bestFallbackKind=b.fallbackKind;break;}
if(r.rejectAt<0&&cleanPathSig===null)cleanPathSig=r.pathSig;
}
if(_x12Kills&&_x12Kills.c===combo)for(const r of minRuns)if(r.lastMainKill>=0)_x12Kills.k.add(r.lastMainKill);
if(!bestRating&&!_mercyFinal&&!(_solverGoldState&&_solverGoldState.gold)){
for(let i=0;i<assigns.length;i++){
const assign=assigns[i],rMin=minRuns[i];
if(rMin.reason==='uncertain'&&rMin.rejectAt===_lastCI){
const rMax=_simRun('max',assign);
if(rMax.reason==='kill_damage'&&!rejectedRun)rejectedRun=rMax;
if(rMax.allDead&&rMax.rejectAt<0){bestRating='orange';bestAssign=assign;bestPathSig=rMin.pathSig+'>'+rMax.pathSig;bestActionResults=rMin.actionResults;bestR1Removal=rMin.r1Removal;break;}
}
}
}
const rejected=rejectedRun||minRuns[0];
if(outInfo){
if(bestAssign)outInfo.eggAssign=bestAssign;
outInfo.pathSig=bestPathSig!==null?bestPathSig:(rejectedRun?rejectedRun.pathSig:cleanPathSig!==null?cleanPathSig:(fallbackPathSig||''));
if(evaluation&&evaluation.captureActions)outInfo.actionResults=bestActionResults||(rejected?rejected.actionResults:null)||[];
outInfo.r1Removal=bestR1Removal;
outInfo.fallbackKind=bestFallbackKind;
outInfo.finIdx=dmgCIs.length?dmgCIs[dmgCIs.length-1]:-1;
outInfo.rejection=bestRating?null:(rejected&&rejected.reason)||'incomplete';
outInfo.rejectAt=bestRating?-1:rejected?rejected.rejectAt:-1;
outInfo.rejectLast=bestRating?Infinity:Math.max(-1,...minRuns.map(r=>r.rejectAt<0?Infinity:r.rejectAt));
}
return bestRating;
}
function planAFinisher(combo,hexId,mon,killTargets,maxSlots,bat){
if(!killTargets||killTargets.length<2)return null;
if(!combo.every(v=>v.at>0))return null;
const aIdx=[];
for(let i=0;i<combo.length;i++){const sk=lookupSkill(combo[i].jp);if(sk&&sk.target==='A')aIdx.push(i);}
if(aIdx.length!==1)return null;
const fin=combo[aIdx[0]];
if(SolverActionGate.hits(fin)>1)return null;
const chips=combo.filter((v,i)=>i!==aIdx[0]);
const freeCI=[];
for(let ci=0;ci<chips.length;ci++){
const sk=lookupSkill(chips[ci].jp);
if(!sk)return null;
if(sk.target==='S'&&!chips[ci].soloGroup&&chips[ci].tgtGroup===undefined){freeCI.push(ci);continue;}
if(sk.target==='G'&&chips[ci].tgtGroup!==undefined)continue;
return null;
}
const chars=readCharStatsFromDom();
const nG=killTargets.length;
const dmgOf=(v)=>{
const sk=lookupSkill(v.jp);const hits=SolverActionGate.hits(v);const out={};
for(const t of killTargets){
let mn=0,mx=0,pre=null;
for(const c of chars){const r=calcSkillDamageCache(sk,c.stats,t.hex,null,1,actionMetalEff(sk,v.equip),v.equip);if(r){if(r.min>mn)mn=r.min;if(r.max>mx)mx=r.max;
if(r.pre)pre={min:Math.max(pre?pre.min:0,r.pre.min),max:Math.max(pre?pre.max:0,r.pre.max)};}}
out[t.hex]={min:mn*hits,max:mx*hits,hit:{min:mn,max:mx,pre,metalEff:actionMetalEff(sk,v.equip)},hits};
}
return out;
};
const finD=dmgOf(fin);
const chipD=chips.map(dmgOf);
const tiers=[{eggs:0,mul:1}].concat(solverEggCanBenefit(fin,killTargets)?TENSION:[]);
let vBudget=48;
for(const tier of tiers){
if(combo.length+tier.eggs>maxSlots)break;
let feas=true;const needG=[],capG=[];
for(let g=0;g<nG;g++){
const m=getMonDB(killTargets[g].hex);
if(!m){feas=false;break;}
const H=m.s[0];
const fd=finD[killTargets[g].hex];
needG[g]=Math.max(0,H-solverActionDamage(lookupSkill(fin.jp),killTargets[g].hex,null,fd.hit,fd.hits,tier.mul,maxCharLv(chars)).min);
capG[g]=monHpMin(H)-1;
if(needG[g]>0&&(killTargets[g].count||1)>1){feas=false;break;}
if(needG[g]>capG[g]){feas=false;break;}
}
if(!feas)continue;
const baseMin=new Array(nG).fill(0),baseMax=new Array(nG).fill(0);
for(let ci=0;ci<chips.length;ci++){
if(freeCI.indexOf(ci)>=0)continue;
const g=chips[ci].tgtGroup;const hx=killTargets[g].hex;
baseMin[g]+=chipD[ci][hx].min;baseMax[g]+=chipD[ci][hx].max;
}
const idxs=freeCI.map(()=>0);
while(true){
const minS=baseMin.slice(),maxS=baseMax.slice();
freeCI.forEach((ci,k)=>{const g=idxs[k];const hx=killTargets[g].hex;minS[g]+=chipD[ci][hx].min;maxS[g]+=chipD[ci][hx].max;});
let ok=true;
for(let g=0;g<nG;g++){if(minS[g]<needG[g]||maxS[g]>capG[g]){ok=false;break;}}
if(ok){
const prefix=makeEggOnPrefix(tier.eggs);
const planned=[...prefix,...chips.map((c,ci)=>{const k=freeCI.indexOf(ci);return k>=0?Object.assign({},c,{tgtGroup:idxs[k]}):c;}),fin];
if(--vBudget<0)return null;
const pb=findBestAssignment(planned,hexId,mon,killTargets,1,null,bat);
if(pb.rating==='gold')return{combo:planned,eggAssign:pb.eggAssign,assign:pb.assign,defend:pb.defend,multiOnly:tier.eggs>=2};
}
let j=0;
while(j<idxs.length&&++idxs[j]>=nG){idxs[j]=0;j++;}
if(j>=idxs.length)break;
}
}
return null;
}
let _solverDmgCache=new WeakMap();
function resetSolverDamageCache(context){
if(context!==undefined&&_solverDmgCache.context===context)return;
_solverDmgCache=new WeakMap();
_solverDmgCache.context=context;
_solverDmgCache.search={objects:new WeakMap(),actionIds:new Map(),paper:new Map(),damage:new Map(),aggregate:new Map(),finisher:new Map(),requirements:new Map(),scores:new Map(),variables:new Map(),readings:new WeakMap(),dead:new Map(),boosted:new Map(),kmcTails:new Map(),kmcTailContext:null,equipOptions:new Map(),killer:new Map()};
}
resetSolverDamageCache();
function calcSkillDamageCache(sk,st,hexId,fEls,wmul,metalEff,equip){
let byContext=_solverDmgCache.get(sk);
if(!byContext){byContext=new Map();_solverDmgCache.set(sk,byContext);}
const contextKey=(equip||'')+'|'+hexId+'|'+(fEls?fEls.join(','):'')+'|'+(wmul||1)+'|'+(metalEff||0);
let byStats=byContext.get(contextKey);
if(!byStats){byStats=new Map();byContext.set(contextKey,byStats);}
let statsKey;
if(sk.fixedDmg)statsKey=0;
else if(sk.dmg){
const d=sk.dmg;
statsKey=!d.m||d.b===d.m?0:Math.max(d.lo,Math.min(getDamageStat(d.st,st),d.hi));
}else if(st.atk!==undefined)statsKey=st.atk;
else statsKey=(st.str||0)+'|'+(st.atkOverride===undefined?'':st.atkOverride);
const saved=byStats.get(statsKey);
if(saved!==undefined)return saved;
const result=calcSkillDamage(sk,st,hexId,fEls,wmul,metalEff,equip);
byStats.set(statsKey,result);
return result;
}
function solverPaperDamageUpperBound(combo,hexId,tensionMul,fEls,ids){
const state=_solverDmgCache.search,mul=tensionMul>1?tensionMul:1;
let total=0;
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci];
if(isSolverNonDamageRemoval(action))return Infinity;
if(!(action.at>0))continue;
const key=ids[ci]+'|'+JSON.stringify([hexId,mul,fEls]);
let best=state.paper.get(key);
if(best===undefined){
const sk=lookupSkill(action.jp);
if(!sk)best=Infinity;
else{
best=0;
for(const els of fEls?[null,fEls]:[null]){
const range=calcSkillDamageCache(sk,EXT_STATS,hexId,els,solverWeaponMul(sk,action.equip,hexId),actionMetalEff(sk,action.equip),action.equip);
if(!range||!Number.isFinite(range.max)){best=Infinity;break;}
const hits=SolverActionGate.hits(action),boost=solverEggDamageAction(action)?mul:1;
const damage=solverActionDamage(sk,hexId,els,range,hits,boost,99,JSON.stringify([sk,hexId,els,hits,boost,99]));
best=Math.max(best,damage.max);
}
}
state.paper.set(key,best);
}
total+=best;
}
return total;
}
function calcSolverMinStat(combo,hexId,tensionMul,fource,scoreMemo=false){
const state=_solverDmgCache.search,mul=tensionMul||1;
const chars=mul>1&&_solverUseStats?readCharStatsFromDom():null;
const levels=combo.map((_,ci)=>chars?actorLv(chars,null,ci):99);
const fEls=fource?getFourceEls(fource.jp):null;
const ids=combo.map(action=>{
let id=state.objects.get(action);
if(id===undefined){
const signature=JSON.stringify(action);
id=state.actionIds.get(signature);
if(id===undefined){id=state.actionIds.size;state.actionIds.set(signature,id);}
state.objects.set(action,id);
}
return id;
});
const context=JSON.stringify([hexId,mul,fEls,!!fource,levels,DISPLAY_LANG]);
const reqKey=JSON.stringify(ids)+'|'+context+'|'+(scoreMemo?1:0);
if(state.requirements.has(reqKey))return state.requirements.get(reqKey);
const mon=getMonDB(hexId),skills=combo.map(v=>lookupSkill(v.jp));
let result=null;
if(mon&&combo.length){
const hp=mon.s[0],hpLow=monHpMin(hp),hits=combo.map(SolverActionGate.hits);
if(combo.length===1){
const action=combo[0],sk=skills[0];
if(sk&&!canExecuteMetal(action,hexId)&&!(fource&&sk.el)&&!(!sk.dmg&&sk.el)){
if(sk.el&&solverTargetImmuneToElement(sk.el,hexId))result={stat:null,min:Infinity,label:'×'};
else{
const keys=solverConditionStatKeys(sk),sum=!_solverUseStats&&sk.dmg&&solverStatDomain(sk.dmg.st)&&solverStatDomain(sk.dmg.st).sum;
const key=sum?sk.dmg.st:keys[0],scaling=!!key,ceiling=sum?sum.length*999:999;
const memoKey=ids[0]+'|'+JSON.stringify([hexId,fEls,'single',key||'',mul,levels[0]]);
let table=state.damage.get(memoKey);
if(!table){table=new Map();state.damage.set(memoKey,table);}
const damageAt=value=>{
const known=table.get(value);if(known!==undefined)return known;
const stats=sum?cloneSolverConditionParty([{stats:MIN_STATS}],[{index:0,key}],[value])[0].stats:{...MIN_STATS};
if(key&&!sum)stats[key]=value;
const range=calcSkillDamageCache(sk,stats,hexId,fEls,solverWeaponMul(sk,action.equip,hexId),actionMetalEff(sk,action.equip),action.equip);
const damage=range?solverActionDamage(sk,hexId,fEls,range,hits[0],mul,levels[0]):null;
table.set(value,damage);return damage;
};
const kill=value=>{const damage=damageAt(value);return!!damage&&damage.min>=hp;};
const safe=value=>{const damage=damageAt(value);return!!damage&&SolverActionGate.survivesBeforeHit(hits[0],damage.head,hpLow);};
if(!scaling){if(kill(0)&&safe(0))result={stat:null,min:0,label:''};}
else if(kill(ceiling)){
const minimum=binarySearchTrue(solverStatMin(key),ceiling,kill,'min');
if(hits[0]<=1||safe(minimum)){
const maximum=scoreMemo||hits[0]<=1?ceiling:binarySearchTrue(minimum,ceiling,safe,'max');
result={stat:key,min:minimum,label:getStatLabel(key)+(maximum<ceiling?' '+minimum+'~'+maximum:'≥'+minimum)};
if(maximum<ceiling)result.max=maximum;
}
}
}
}
}else{
const paper=solverPaperDamageUpperBound(combo,hexId,mul,fEls,ids);
if(!(Number.isFinite(paper)&&paper<hpLow)){
const all=ids.slice().sort().join('\x1d'),rows=[];
const damageAt=(ci,key,value)=>{
if(!skills[ci]||combo[ci].at===0||canExecuteMetal(combo[ci],hexId))return{min:0,max:0};
let table=rows[ci]&&rows[ci][key||''];
if(!table){
const rowKey=ids[ci]+'|'+JSON.stringify([hexId,fEls,key||'']);
table=state.damage.get(rowKey);
if(!table){table=new Map();state.damage.set(rowKey,table);}
if(!rows[ci])rows[ci]={};rows[ci][key||'']=table;
}
const known=table.get(value);if(known!==undefined)return known;
const stats={...EXT_STATS};if(key)stats[key]=value;
const range=calcSkillDamageCache(skills[ci],stats,hexId,fEls,solverWeaponMul(skills[ci],combo[ci].equip,hexId),actionMetalEff(skills[ci],combo[ci].equip),combo[ci].equip);
const damage=range?{min:range.min*hits[ci],max:range.max*hits[ci],hit:range}:{min:0,max:0};
table.set(value,damage);return damage;
};
const boostKeys=skills.map((sk,ci)=>JSON.stringify([sk,hexId,fEls,hits[ci],mul,levels[ci]]));
const boosted=(damage,ci)=>solverActionDamage(skills[ci],hexId,fEls,damage.hit||{min:0,max:0},hits[ci],mul,levels[ci],boostKeys[ci]);
const gate=makeFinisherGate(combo);
let best=null;
for(let fi=0;fi<combo.length;fi++){
if(!gate(fi))continue;
const key=getSkillDriveStat(skills[fi]);
if(!key){
if(!_solverUseStats&&!scoreMemo&&solverConditionStatKeys(skills[fi]).length===0){
const finKey='fixed|'+ids[fi]+'|'+JSON.stringify([hexId,mul,fEls,levels[fi],hits[fi]]);
let saved=state.finisher.get(finKey);
if(saved===undefined){
const damage=boosted(damageAt(fi,null,0),fi);
saved=damage.min>=hp&&SolverActionGate.survivesBeforeHit(hits[fi],damage.head,hpLow)?{minS:0,capS:999,fixed:true}:null;
state.finisher.set(finKey,saved);
}
if(saved){
const candidate={key:null,fi,...saved};
if(!best||candidate.minS<best.minS||(candidate.minS===best.minS&&candidate.capS>best.capS))best=candidate;
if(best.minS===0&&best.capS===999)break;
}
}
continue;
}
const finKey=all+'|'+ids[fi]+'|'+JSON.stringify([hexId,mul,fEls,key,levels[fi]]);
let saved=state.finisher.get(finKey);
const sumKey=all+'|'+JSON.stringify([hexId,fEls,key]);
let sums=state.aggregate.get(sumKey);
if(!sums){sums=new Map();state.aggregate.set(sumKey,sums);}
const evaluate=value=>{
let sum=sums.get(value);
if(sum===undefined){
sum={min:0,max:0};
for(let ci=0;ci<combo.length;ci++){const damage=damageAt(ci,key,value);sum.min+=damage.min;sum.max+=damage.max;}
sums.set(value,sum);
}
const fin=damageAt(fi,key,value);
return{min:sum.min-fin.min,max:sum.max-fin.max,fin};
};
const gold=value=>{const e=evaluate(value);return e.max+e.fin.max>=hpLow&&e.min+boosted(e.fin,fi).min>=hp;};
const safe=value=>{const e=evaluate(value);return e.max<hpLow&&SolverActionGate.survivesBeforeHit(hits[fi],boosted(e.fin,fi).head,hpLow-e.max);};
if(saved===undefined){
saved=null;
if(gold(999)){
const minimum=binarySearchTrue(solverStatMin(key),999,gold,'min');
if(safe(minimum))saved={minS:minimum};
}
state.finisher.set(finKey,saved);
}
if(!saved)continue;
if(!scoreMemo&&saved.capS===undefined)saved.capS=binarySearchTrue(saved.minS,999,safe,'max');
const candidate={key,fi,minS:saved.minS,capS:saved.capS===undefined?999:saved.capS};
if(!best||candidate.minS<best.minS||(candidate.minS===best.minS&&candidate.capS>best.capS))best=candidate;
}
if(best){
if(scoreMemo)result={min:best.minS};
else if(best.fixed)result={stat:null,min:0,finIdx:best.fi,perPos:null,posLabel:'',label:'',fixedFinisher:true};
else{
const fin=best.fi,finKey=getSkillDriveStat(skills[fin]),variable=[],caps={};
const own=(ci,value)=>damageAt(ci,getSkillDriveStat(skills[ci]),value);
let chipMin=0,chipMax=0,possible=true;
for(let ci=0;ci<combo.length;ci++){
if(ci===fin)continue;
const key=getSkillDriveStat(skills[ci]);
const low=own(ci,key?solverStatMin(key,combo[ci].equip):0);
if(key&&own(ci,999).min>low.min)variable.push(ci);
else{chipMin+=low.min;chipMax+=low.max;}
}
for(const ci of variable){
const lower=solverStatMin(getSkillDriveStat(skills[ci]),combo[ci].equip);
const cap=binarySearchTrue(lower,999,value=>chipMax+own(ci,value).max<hpLow,'max');
if(cap<lower){possible=false;break;}
caps[ci]=cap;const damage=own(ci,cap);chipMin+=damage.min;chipMax+=damage.max;
}
let perPos=null;
if(possible){
const lower=solverStatMin(finKey,combo[fin].equip),cap=hits[fin]>1?binarySearchTrue(lower,999,value=>SolverActionGate.survivesBeforeHit(hits[fin],boosted(own(fin,value),fin).head,hpLow-chipMax),'max'):999;
if(cap>=lower&&boosted(own(fin,cap),fin).min>=hp-chipMin){
const minimum=binarySearchTrue(lower,cap,value=>boosted(own(fin,value),fin).min>=hp-chipMin,'min');
perPos={finFi:fin,fKey:finKey,sFin:minimum,sFinCap:cap,varPos:variable,posCap:caps};
}
}
const name=ci=>(DISPLAY_LANG==='EN'?(combo[ci].en||combo[ci].jp):combo[ci].jp)+(combo[ci].note||'');
let posLabel='';
if(perPos){
const parts=[],capParts=[];
for(const ci of variable)if(caps[ci]<999){parts.push(name(ci)+'('+getStatLabel(getSkillDriveStat(skills[ci]))+')≤'+caps[ci]);capParts.push(name(ci)+caps[ci]);}
let segment=L10+name(fin)+'('+getStatLabel(finKey)+')'+(perPos.sFinCap<999?' '+perPos.sFin+'~'+perPos.sFinCap:'≥'+perPos.sFin);
if(capParts.length)segment+='(@'+capParts.join(',')+')';parts.push(segment);posLabel=parts.join(' · ');
}
result={stat:best.key,min:best.minS,finIdx:best.fi,perPos,posLabel,label:getStatLabel(best.key)+(best.capS<999?' '+best.minS+'~'+best.capS:'≥'+best.minS)+'@'+name(best.fi)};
if(best.capS<999)result.max=best.capS;
}
}
}
}
}
state.requirements.set(reqKey,result);return result;
}
function getSkillDriveStat(sk){
const keys=solverConditionStatKeys(sk);
return keys.length===1?keys[0]:null;
}
function solverConditionStatKeys(sk,atkOnly=false){
return!sk||sk.fixedDmg||atkOnly&&(sk.dmg||sk.el===12||sk.jp==='一閃づき'||sk.at&&sk.at[0]===0)?[]:skillDamageStatReads(sk).slice();
}
function solverConditionActionHitsNonMetal(ci,targets,pathSig,rows){
if(pathSig){
const row=(rows||pathSig.split(';')).find(v=>v.indexOf(ci+':d:')===0);
if(row){
const hexes=row.match(/\b[0-9A-F]{3}\b/g)||[];
return hexes.some(hex=>!isMetalHex(hex));
}
}
return(targets||[]).some(g=>!isMetalHex(g.hex));
}
function solverConditionVariables(combo,assign,targets,pathSig){
const state=_solverDmgCache.search,rows=[],parts=[],pathRows=pathSig?pathSig.split(';'):null;
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci],index=assign[ci];
if(!(action.at>0)||index===undefined)continue;
const sk=lookupSkill(action.jp),keys=sk&&!sk.dmg&&weaponMetaValue(action.equip||sk.equip,'fixedDmg')?[]:solverConditionStatKeys(sk);
if(!keys.length||!solverConditionActionHitsNonMetal(ci,targets,pathSig,pathRows))continue;
const driver=sk.dmg&&solverStatDomain(sk.dmg.st)&&solverStatDomain(sk.dmg.st).sum?sk.dmg.st:null;
const fields=keys.map(key=>[key,solverStatMin(key,action.equip)]);
parts.push(ci+':'+index+':'+fields.map(field=>field.join(':')).join(',')+(driver?':'+driver:''));
rows.push({ci,index,fields,driver});
}
const signature=parts.join('|'),saved=state.variables.get(signature);
if(saved!==undefined)return saved;
const vars=[],seen=new Map();
for(const row of rows){
const{ci,index,driver}=row,domain=driver&&solverStatDomain(driver);
const combined=domain&&!rows.some(other=>other.index===index&&other.driver!==driver&&other.fields.some(([key])=>domain.sum.includes(key)));
for(const[key,floor]of combined?[[driver,domain.min]]:row.fields){
const id=index+':'+key;
if(seen.has(id)){const value=seen.get(id);value.floor=Math.max(value.floor,floor);}
else{const value={index,key,first:ci,floor,...(combined?{keys:domain.sum,ceiling:domain.max}:{})};seen.set(id,value);vars.push(value);}
}
}
state.variables.set(signature,vars);return vars;
}
function cloneSolverConditionParty(party,vars,values,minimum=false){
const out=party.map(c=>({...c,stats:minimum?{...c.stats,...MIN_STATS}:{...c.stats}}));
if(vars)for(let i=0;i<vars.length;i++){
const v=vars[i],stats=out[v.index].stats,fields=solverStatDomain(v.key).sum;
if(fields){
let extra=values[i]-solverStatMin(v.key);
for(const key of fields){const floor=solverStatMin(key),share=Math.min(999-floor,extra);stats[key]=floor+share;extra-=share;}
}else stats[v.key]=values[i];
}
return out;
}
function solverConditionStatUsage(combo,proof,targets){
const byActor=new Map();
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci],index=proof&&proof.assign?proof.assign[ci]:undefined;
if(index===undefined)continue;
const sk=lookupSkill(action.jp),equip=action.equip||solverDefaultEquip(sk);
const result=((proof&&proof.actionResults)||[]).find(value=>value.ci===ci);
const stats=!sk||!(action.at>0)||isSolverNonDamageRemoval(action)||sk.el===12||sk.fixedDmg||weaponMetaValue(equip,'fixedDmg')
||!solverConditionActionHitsNonMetal(ci,targets,proof&&proof.pathSig)
||result&&Array.isArray(result.targets)&&!result.targets.some(target=>!isMetalHex(target.hex))?[]:solverConditionStatKeys(sk);
const combined=stats.length&&proof&&proof.statBounds&&proof.statBounds.find(bound=>bound.index===index&&bound.keys&&sk.dmg&&bound.key===sk.dmg.st);
if(combined)stats.splice(0,stats.length,combined.key);
let entry=byActor.get(index);
if(!entry){entry={index,stats:[],actions:[]};byActor.set(index,entry);}
entry.actions.push({ci,stats,equip});
for(const key of stats)if(!entry.stats.includes(key))entry.stats.push(key);
}
return[...byActor.values()].sort((a,b)=>a.index-b.index);
}
function finalizeSolverConditionProof(combo,targets,hexId,bat,proof,tensionMul,fourceEls){
if(!proof||_solverGoldState&&_solverGoldState.gold&&proof.rating!=='gold')return null;
if(proof.rating==='gold'&&_solverGoldState)_solverGoldState.gold=true;
const out={...proof,party:cloneSolverConditionParty(proof.party)};
const solved=solveSolverConditionBounds(combo,targets,hexId,bat,out,tensionMul,fourceEls);
if(solved)Object.assign(out,solved);
const captured=verifySolverConditionParty(combo,targets,hexId,bat,out.party,out.assign,
tensionMul,fourceEls,out.eggAssign,true);
if(captured&&captured.rating===out.rating&&captured.fallbackKind===out.fallbackKind)out.actionResults=captured.actionResults;
return out;
}
function solveSolverConditionBounds(combo,targets,hexId,bat,proof,tensionMul,fourceEls){
const vars=solverConditionVariables(combo,proof.assign,targets,proof.pathSig);
const trace=[],info={};
const rating=checkSolverDamage(combo,hexId,getMonDB(hexId),targets,tensionMul,fourceEls,info,
proof.assign,proof.eggAssign,proof.party,{trace});
if(rating!==proof.rating||info.fallbackKind!==proof.fallbackKind)return null;
const instances=buildSimInstances(targets),constraints=[],terms=[],termRows=combo.map(()=>new Map());
const cumulative=instances.map(()=>[]);
const fource=findInlineFource(combo),fEls=fource?getFourceEls(fource.jp):fourceEls;
const reference=vars.map(v=>v.keys?getDamageStat(v.key,proof.party[v.index].stats):proof.party[v.index].stats[v.key]);
const term=(ci,hex,on)=>{
const termKey=hex+'|'+!!on,saved=termRows[ci].get(termKey);
if(saved!==undefined)return saved;
const action=combo[ci],sk=lookupSkill(action.jp),ai=proof.assign[ci];
const keys=isMetalHex(hex)?[]:solverConditionStatKeys(sk);
const depends=vars.map((v,i)=>v.index===ai&&(v.keys||[v.key]).some(key=>keys.includes(key))?i:-1).filter(i=>i>=0);
const hits=SolverActionGate.hits(action),mul=(proof.eggAssign||{})[ci]||1;
const lv=proof.party[ai].lv,single=depends.length===1?depends[0]:-1;
const sumVar=single>=0&&vars[single].keys?[{index:0,key:vars[single].key}]:null,actor=sumVar?[proof.party[ai]]:null;
const cache=depends.length>1?new Map():[];
const t={depends,single,cache,read(values,box,upper){
const key=single>=0?(values?values[single]:upper?box[single].hi:box[single].lo)
:depends.length?depends.map(i=>values?values[i]:upper?box[i].hi:box[i].lo).join(','):0;
const known=depends.length>1?cache.get(key):cache[key];
if(known!==undefined)return known;
const stats=sumVar?cloneSolverConditionParty(actor,sumVar,[key])[0].stats:{...proof.party[ai].stats};
if(single>=0&&!sumVar)stats[vars[single].key]=key;
else if(single<0)for(const i of depends)stats[vars[i].key]=values?values[i]:upper?box[i].hi:box[i].lo;
const d=skillDamagePerHit(sk,action,hex,stats,on?fEls:null);
const t=solverActionDamage(sk,hex,on?fEls:null,d,hits,mul,lv);
const result={min:t.min,max:t.max,head:t.head,hitmin:d.min,hitmax:d.max};
if(depends.length>1)cache.set(key,result);else cache[key]=result;
return result;
}};
const index=terms.length;
terms.push(t);termRows[ci].set(termKey,index);return index;
};
const expression=(ids,part,sign=1)=>ids.map(t=>({t,part,sign}));
const add=(expr,op,rhs)=>constraints.push({expr,op,rhs});
const orange=[];
for(const row of trace){
const ci=row.ci,action=combo[ci],sk=lookupSkill(action.jp);
if(SolverActionGate.targetKind(sk)==='S'&&row.targets.length===1){
const selected=row.targets[0];
let candidates=row.alive.slice();
if(isMetalActionSkill(action)&&candidates.some(i=>isMetalHex(instances[i].hex)))
candidates=candidates.filter(i=>isMetalHex(instances[i].hex));
else if(action.soloGroup){
const counts={};
for(const i of candidates)counts[instances[i].groupIdx]=(counts[instances[i].groupIdx]||0)+1;
candidates=candidates.filter(i=>counts[instances[i].groupIdx]===1);
}else if(action.tgtGroup!==undefined)candidates=candidates.filter(i=>instances[i].groupIdx===action.tgtGroup);
for(const other of candidates)if(other!==selected)add([
...expression(cumulative[selected],'min'),...expression(cumulative[other],'min',-1)
],'le',instances[selected].hp-instances[other].hp-(other<selected?1:0));
}
for(const step of row.steps){
if(step.execute)continue;
const i=step.index,inst=instances[i],t=term(ci,inst.hex,row.fourceOn);
const d=terms[t].read(reference);
if(step.killFloor!==undefined)add([{t,part:row.mode==='min'?'min':'max',sign:1}],'ge',step.killFloor);
add([{t,part:d.hitmin>0?'hitmin':'hitmax',sign:1}],d.hitmin>0?'ge':'le',d.hitmin>0?1:0);
if(SolverActionGate.hits(action)>1)
add([...expression(cumulative[i],'max'),{t,part:'head',sign:1}],'le',inst.hpLow-1);
cumulative[i].push(t);
if(proof.rating==='orange'&&ci===combo.length-1){
add(expression(cumulative[i],'max'),'ge',inst.hpLow);
orange.push({expr:expression(cumulative[i],'min'),op:'le',rhs:inst.hp-1});
}else if(step.dead)add(expression(cumulative[i],'min'),'ge',inst.hp);
else add(expression(cumulative[i],'max'),'le',inst.hpLow-1);
}
}
if(orange.length)constraints.push({any:orange});
for(const original of constraints)for(const c of original.any||[original]){
c.directions=new Int8Array(vars.length);
let fixed=0;
for(let xi=c.expr.length-1;xi>=0;xi--){
const x=c.expr[xi],t=terms[x.t];x.term=t;x.upper=(c.op==='ge')===(x.sign>0);
for(const vi of t.depends){
const prior=c.directions[vi];
if(prior!==2)c.directions[vi]=prior&&prior!==x.sign?2:x.sign;
}
if(!t.depends.length){fixed+=x.sign*t.read(reference)[x.part];c.expr.splice(xi,1);}
}
c.rhs-=fixed;
}
const limits=(c,box,point)=>{
if(c.any)return c.any.some(x=>limits(x,box,point));
let value=0;
for(const x of c.expr){
const t=x.term,key=t.single>=0?(point?point[t.single]:x.upper?box[t.single].hi:box[t.single].lo):undefined;
const d=key===undefined?t.read(point,box,x.upper):t.cache[key]===undefined?t.read(point,box,x.upper):t.cache[key];
value+=x.sign*d[x.part];
}
return c.op==='ge'?value>=c.rhs:value<=c.rhs;
};
const propagate=box=>{
let changed=true;
while(changed){
changed=false;
for(const original of constraints){
const active=original.any?original.any.filter(c=>limits(c,box)):limits(original,box)?[original]:[];
if(!active.length)return null;
if(active.length>1)continue;
const c=active[0];
for(let vi=0;vi<vars.length;vi++){
const direction=c.directions[vi];
if(!direction||direction===2)continue;
const lower=(c.op==='ge')===(direction>0),b=box[vi];
if(b.lo===b.hi)continue;
const possible=value=>{
const lo=b.lo,hi=b.hi;b.lo=value;b.hi=value;
const ok=limits(c,box);b.lo=lo;b.hi=hi;return ok;
};
if(lower&&!possible(b.lo)){
const value=binarySearchTrue(b.lo,b.hi,possible,'min');
if(!possible(value))return null;
b.lo=value;changed=true;
}else if(!lower&&!possible(b.hi)){
const value=binarySearchTrue(b.lo,b.hi,possible,'max');
if(value<b.lo)return null;
b.hi=value;changed=true;
}
}
}
}
return box;
};
const partyAt=values=>cloneSolverConditionParty(proof.party,vars,values,true);
const points=new Map(),weights=[];let space=1;
for(const v of vars){weights.push(space);space*=((v.ceiling||999)+1);}
const numericKeys=Number.isSafeInteger(space);
let boundsReplays=0,boundsExhausted=false,boundsRejectStreak=0,boundsSlicing=false,findBudget=SOLVER_CONDITION_BOUNDS_FIND_LIMIT;
const checked=(values,verify=true)=>{
let key;
if(numericKeys){key=0;for(let vi=0;vi<values.length;vi++)key+=values[vi]*weights[vi];}
else key=values.join(',');
let point=points.get(key);
if(point===undefined){point=constraints.every(c=>limits(c,null,values));points.set(key,point);}
if(!verify)return point!==false;
if(point===false||point===null)return null;
if(point!==true)return point;
if(boundsReplays>=SOLVER_CONDITION_BOUNDS_REPLAY_LIMIT){boundsExhausted=true;return null;}
boundsReplays++;
const p=verifySolverConditionParty(combo,targets,hexId,bat,partyAt(values),proof.assign,tensionMul,fourceEls,proof.eggAssign);
point=p&&p.rating===proof.rating&&p.fallbackKind===proof.fallbackKind?p:null;points.set(key,point);
if(point)boundsRejectStreak=0;
else if(!boundsSlicing&&++boundsRejectStreak>SOLVER_CONDITION_BOUNDS_REJECT_STREAK)boundsExhausted=true;
return point;
};
const find=(input,preferred)=>{
if(boundsExhausted)return null;
if(--findBudget<0){boundsExhausted=true;return null;}
const box=propagate(input);if(!box)return null;
const candidate=box.map((b,i)=>Math.max(b.lo,Math.min(b.hi,preferred[i])));
if(checked(candidate))return candidate;
const low=box.map(b=>b.lo);if(checked(low))return low;
let vi=-1,width=0;
box.forEach((b,i)=>{if(b.hi-b.lo>width){vi=i;width=b.hi-b.lo;}});
if(vi<0)return null;
const mid=(box[vi].lo+box[vi].hi)>>1,left=box.map(b=>({...b}));
left[vi].hi=mid;
const found=find(left,preferred);if(found)return found;
const right=box.map(b=>({...b}));right[vi].lo=mid+1;
return find(right,preferred);
};
const root=propagate(vars.map(v=>({lo:v.floor,hi:v.ceiling||999})));
if(!root)return null;
const bounds=[],witnesses=[];
for(let vi=0;vi<vars.length;vi++){
const extreme=upper=>{
let lo=root[vi].lo,hi=root[vi].hi,witness=reference;
while(lo<hi){
const mid=upper?Math.ceil((lo+hi)/2):(lo+hi)>>1;
const box=root.map(b=>({...b}));
if(upper)box[vi].lo=mid;else box[vi].hi=mid;
const found=find(box,reference);
if(found){witness=found;if(upper)lo=mid;else hi=mid;}
else if(upper)hi=mid-1;else lo=mid+1;
}
const box=root.map(b=>({...b}));box[vi]={lo,hi:lo};
witness=find(box,witness);
return witness?{value:lo,witness}:null;
};
const lower=extreme(false),upper=extreme(true);
if(!lower||!upper)return null;
bounds.push({...vars[vi],lo:lower.value,hi:upper.value});
witnesses.push({lo:lower.witness,hi:upper.witness});
}
const chosen=find(root,root.map(b=>b.lo));
if(!chosen)return null;
const verified=checked(chosen);
const conditionalBounds=[],sliceCache=new Map();
const addSlice=(anchor,side)=>{
const values=witnesses[anchor][side].slice();
const target=vars.length===1?0:(anchor+1)%vars.length;
const fixed=vars.map((v,i)=>({variable:i,value:values[i]})).filter(v=>v.variable!==target);
const cacheKey=JSON.stringify([target,fixed]);
if(sliceCache.has(cacheKey)){
sliceCache.get(cacheKey).endpoints.push({variable:anchor,side});return;
}
const allowed=[];
for(let value=bounds[target].lo;value<=bounds[target].hi;value++){
values[target]=value;
if(checked(values,false))allowed.push(value);
}
const toRanges=numbers=>{
const ranges=[];
for(const value of numbers){
const last=ranges[ranges.length-1];
if(last&&last.hi+1===value)last.hi=value;
else ranges.push({lo:value,hi:value});
}
return ranges;
};
let ranges=toRanges(allowed);
if(ranges.some(r=>[r.lo,r.hi].some(value=>{values[target]=value;return!checked(values);})))
ranges=toRanges(allowed.filter(value=>{values[target]=value;return!!checked(values);}));
const entry={fixed,target,ranges,endpoints:[{variable:anchor,side}]};
sliceCache.set(cacheKey,entry);conditionalBounds.push(entry);
};
boundsSlicing=true;
for(let vi=0;vi<vars.length;vi++)for(const side of['lo','hi'])addSlice(vi,side);
if(boundsExhausted)return null;
return{...verified,statBounds:bounds,conditionalBounds};
}
function findVariableConditionProof(combo,targets,hexId,bat,assign,tensionMul,fourceEls,acceptActions,initialResult,scanned=new Set(),goldOnly=false){
if(_solverGoldState&&_solverGoldState.gold)goldOnly=true;
const vars=solverConditionVariables(combo,assign,targets);
if(!vars.length)return null;
const tested=new Map();
if(initialResult)tested.set(vars.map(v=>v.ceiling||999).join(','),null);
let diagnostic={};
const verify=party=>{
const key=vars.map(v=>v.keys?getDamageStat(v.key,party[v.index].stats):party[v.index].stats[v.key]).join(',');
diagnostic={};
if(tested.has(key))return tested.get(key);
const result=verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tensionMul,fourceEls,undefined,!!acceptActions,diagnostic);
const proof=result&&(!acceptActions||acceptActions(result.actionResults))?{...result,party:cloneSolverConditionParty(result.party)}:null;
tested.set(key,proof);return proof;
};
let jointOrange=null;
if(groupTotal(targets)===1&&!isMetalHex(hexId)&&vars.every(v=>v.key==='atk')){
const party=NEUTRAL_PARTY();let possible=true,common=solverStatMin('atk');
for(const v of vars){
let minimum=v.floor;
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci],sk=lookupSkill(action.jp),equip=action.equip||solverDefaultEquip(sk);
if(assign[ci]!==v.index||!(action.at>0)||!solverConditionStatKeys(sk,true).includes('atk')||weaponMetaValue(equip,'fixedDmg'))continue;
const values=new Map();
const positive=value=>{
if(values.has(value))return values.get(value);
party[v.index].stats.atk=value;
const range=skillDamagePerHit(sk,action,hexId,party[v.index].stats,fourceEls);
const result=!!range&&range.min>0;values.set(value,result);return result;
};
if(!positive(999)){possible=false;break;}
if(!positive(minimum))minimum=binarySearchTrue(minimum+1,999,positive,'min');
}
if(!possible)break;
party[v.index].stats.atk=minimum;common=Math.max(common,minimum);
}
if(possible){
const proof=verify(party);
if(proof&&proof.rating==='gold')return proof;
if(proof)jointOrange=proof;
const commonParty=cloneSolverConditionParty(party);
for(const v of vars)commonParty[v.index].stats.atk=common;
const shared=verify(commonParty);
if(shared&&shared.rating==='gold')return shared;
if(shared&&!jointOrange)jointOrange=shared;
}
}
let candidates=vars;
if(vars.length>1){
const out=initialResult||{};
if(!initialResult)checkSolverDamage(combo,hexId,getMonDB(hexId),targets,tensionMul,fourceEls,out,
assign,undefined,NEUTRAL_PARTY());
if(['uncertain','at_hit_count','at_unstable'].includes(out.rejection)&&out.rejectAt>=0){
const ci=out.rejectAt,keys=solverConditionStatKeys(lookupSkill(combo[ci].jp));
candidates=vars.filter(v=>v.index===assign[ci]&&(v.keys||[v.key]).some(key=>keys.includes(key)));
}else if(out.rejection!=='no_egg_damage_goal'&&out.rejection!=='no_fource_damage_goal'&&out.rejection!=='kill_damage')return jointOrange;
}
const mon=getMonDB(hexId),hpLow=mon&&monHpMin(mon.s[0]);
const uniqueHexes=[...new Set(targets.map(t=>t.hex))];
const inlineFource=findInlineFource(combo);
const effectiveFEls=inlineFource?(getFourceEls(inlineFource.jp)||[]):fourceEls;
const eggs=combo.some(x=>x.jp==='おうえん');
const single=!!mon&&targets.length===1&&targets[0].count===1&&targets[0].hex===hexId&&!isMetalHex(hexId)&&!(tensionMul>1)&&!(effectiveFEls&&effectiveFEls.length)&&!eggs&&(!solverBlockRuleEnabled()||!solverFieldBlock([hexId]));
let rows=null;
if(mon&&targets.length===1&&targets[0].count===1&&targets[0].hex===hexId&&!isMetalHex(hexId)
&&!(tensionMul>1)&&!(fourceEls&&fourceEls.length)&&(!solverBlockRuleEnabled()||!solverFieldBlock([hexId]))){
rows=[];
for(let ci=0;ci<combo.length;ci++){
const action=combo[ci],sk=lookupSkill(action.jp);
if(!sk||!(action.at>0)||action.earlyKill||isSolverNonDamageRemoval(action)||sk.el===12||sk.fixedDmg<0
||weaponMetaValue(action.equip,'fixedDmg')||!['S','G','A'].includes(SolverActionGate.targetKind(sk))
||sk.dmg&&Math.min(sk.dmg.b,sk.dmg.m||sk.dmg.b)<sk.dmg.s||(sk.mul||1)<0
||(sk.tmul&&sk.tmul[mon.t]||1)<0||sk.el&&mon.s[sk.el]<0
||solverWeaponMul(sk,action.equip,hexId)<0){rows=null;break;}
const hits=SolverActionGate.hits(action),hit=skillDamagePerHit(sk,action,hexId,EXT_STATS,null);
rows.push({action,sk,hits,hit,damage:solverActionDamage(sk,hexId,null,hit,hits,1,99),
actor:assign[ci],keys:solverConditionStatKeys(sk)});
}
}
for(const v of candidates){
const ceiling=v.ceiling||999,group=[];
for(let ci=0;ci<combo.length;ci++)if(assign[ci]===v.index&&(v.keys||[v.key]).some(key=>solverConditionStatKeys(lookupSkill(combo[ci].jp)).includes(key)))group.push(ci);
const scanKey=JSON.stringify([v.key,v.floor,group,eggs?assign.map(a=>assign.indexOf(a)):null]);
if(scanned.has(scanKey))continue;
let party=NEUTRAL_PARTY();
const changing=[];
if(rows){
let fixedMax=0,possible=true;
for(let ci=0;ci<rows.length;ci++){
const row=rows[ci],changed=row.actor===v.index&&(v.keys||[v.key]).some(key=>row.keys.includes(key));
changing.push(changed);
if(changed)continue;
if(actionAtUnstable(row.action,row.hit.min*row.hits,row.hit.max*row.hits)
||!SolverActionGate.survivesBeforeHit(row.hits,row.damage.head,hpLow-fixedMax)){possible=false;break;}
fixedMax+=Math.floor(row.damage.max||0);
if(ci<rows.length-1&&fixedMax>=hpLow){possible=false;break;}
}
if(!possible)continue;
}
const spans=[];
for(const ci of group){
const sk=lookupSkill(combo[ci].jp),cache=_solverDmgCache.search.readings;
let contexts=cache.get(sk);
if(!contexts){contexts=new Map();cache.set(sk,contexts);}
const key=JSON.stringify([combo[ci].equip||'',v.key,uniqueHexes,effectiveFEls]);
let span=contexts.get(key);
if(!span){span={values:[],checks:[],checkedFrom:ceiling};contexts.set(key,span);}
spans.push(span);
}
let segment=null,checkMonotone=false;
for(let value=v.floor;value<=ceiling;value++){
let monotone=single;
for(let gi=0;gi<group.length;gi++){
const span=spans[gi],checking=checkMonotone&&monotone;
if(checking&&span.checks[v.floor]!==undefined){
if(!span.checks[v.floor])monotone=false;
continue;
}
const ci=group[gi],sk=lookupSkill(combo[ci].jp);
for(let next=checking?v.floor:value,end=checking?span.checkedFrom:value;next<=end;next++){
if(span.values[next]!==undefined)continue;
if(v.keys)party=cloneSolverConditionParty(party,[v],[next]);else party[v.index].stats[v.key]=next;
const reads=[];
for(const hex of uniqueHexes){
if(!getMonDB(hex)||isMetalHex(hex))continue;
reads.push(skillDamagePerHit(sk,combo[ci],hex,party[v.index].stats,null));
if(effectiveFEls&&effectiveFEls.length)reads.push(calcSkillDamageCache(sk,party[v.index].stats,hex,effectiveFEls,solverWeaponMul(sk,combo[ci].equip,hex),actionMetalEff(sk,combo[ci].equip),combo[ci].equip));
}
span.values[next]=reads;
}
if(checking){
span.checks[ceiling]=true;
for(let next=span.checkedFrom-1;next>=v.floor;next--){
let ascending=span.checks[next+1];
if(ascending){
const before=span.values[next],now=span.values[next+1];
for(let k=0;k<now.length;k++)if(!before[k]||!now[k]||!!before[k].none!==!!now[k].none||now[k].min<before[k].min||now[k].max<before[k].max){ascending=false;break;}
}
span.checks[next]=ascending;
}
span.checkedFrom=Math.min(span.checkedFrom,v.floor);
if(!span.checks[v.floor])monotone=false;
}
}
if(checkMonotone&&monotone)break;
checkMonotone=false;
if(v.keys)party=cloneSolverConditionParty(party,[v],[value]);else party[v.index].stats[v.key]=value;
let same=segment!==null;
if(same)for(const span of spans){
const before=span.values[segment],now=span.values[value];
for(let k=0;k<now.length;k++){
const a=before[k],b=now[k];
if(a===b)continue;
if(!a||!b||a.min!==b.min||a.max!==b.max||a.none!==b.none||a.metal!==b.metal||a.metalEff!==b.metalEff
||a.hpMin!==b.hpMin||a.hpMax!==b.hpMax||a.kill!==b.kill||a.evade!==b.evade||a.block!==b.block
||a.pre!==b.pre&&(!a.pre||!b.pre||a.pre.min!==b.pre.min||a.pre.max!==b.pre.max)){same=false;break;}
}
if(!same)break;
}
if(same)continue;
segment=value;
if(rows){
let maximum=0,possible=true;
for(let ci=0;ci<rows.length;ci++){
const row=rows[ci];let hit=row.hit,damage=row.damage;
if(changing[ci]){
hit=spans[group.indexOf(ci)].values[value][0];
damage=solverActionDamage(row.sk,hexId,null,hit,row.hits,1,99);
}
if(actionAtUnstable(row.action,hit.min*row.hits,hit.max*row.hits)
||!SolverActionGate.survivesBeforeHit(row.hits,damage.head,hpLow-maximum)){possible=false;break;}
maximum+=Math.floor(damage.max||0);
if(ci<rows.length-1&&maximum>=hpLow){possible=false;break;}
}
if(!possible||maximum<hpLow)continue;
}
const proof=verify(party);
if(proof&&(!goldOnly||proof.rating==='gold'))return proof;
if(proof&&!jointOrange)jointOrange=proof;
if(single&&(diagnostic.rejection==='earlyclear'||diagnostic.rejection==='at_hit_count'&&diagnostic.rejectAt>=0&&!combo[diagnostic.rejectAt].earlyKill&&!isSolverRandomTargetSkill(lookupSkill(combo[diagnostic.rejectAt].jp))))checkMonotone=true;
}
scanned.add(scanKey);
}
return jointOrange;
}
function verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tensionMul,fourceEls,forcedEggAssign,captureActions=false,diagnostic,evaluatedRating){
if(!combo.length||combo.length>SOLVER_MAX_ACTIONS||!priOrderOK(combo))return null;
if(!assign||assign.length!==combo.length||!party||party.length!==SOLVER_ROUND_SIZE)return null;
if(!solverConditionPartyDomainOK(party))return null;
const locks=combo.map(getSkillClassLock),pri=combo.map(_actionPri);
for(let ci=0;ci<combo.length;ci++){
const actor=assign[ci];
if(!Number.isInteger(actor)||actor<0||actor>=party.length||!solverActorSlotOK(assign,ci,actor,party[actor],locks,pri))return null;
}
if(!solverEarlyStopStructureOK(combo))return null;
if(!solverFinalActionOK(combo))return null;
const mon=getMonDB(hexId),out=diagnostic||{};
const total=targets&&targets.length?groupTotal(targets):1;
const rating=evaluatedRating===undefined?checkSolverDamage(combo,hexId,mon,targets,
tensionMul,fourceEls,out,assign,forcedEggAssign,party,
{captureActions}):evaluatedRating;
if(!rating)return null;
const r1Removal=combo.length>SOLVER_ROUND_SIZE&&!!out.r1Removal;
const cost=solverRoundCost(combo,total,r1Removal);
if(combo.reduce((n,v)=>n+(v.at||0),0)+cost!==bat)return null;
if(rating==='gold'&&evaluatedRating!==undefined&&_solverGoldState)_solverGoldState.gold=true;
return{rating,party,assign:assign.slice(),eggAssign:out.eggAssign||forcedEggAssign||null,
finIdx:out.finIdx,r1Removal,pathSig:out.pathSig||'',
...(out.fallbackKind?{fallbackKind:out.fallbackKind}:{}),
...(out.actionResults?{actionResults:out.actionResults}:{})};
}
function findSolverConditionProof(combo,targets,hexId,bat,req,acceptActions,goldOnly=false,state={}){
if(_solverGoldState&&_solverGoldState.gold)goldOnly=true;
if(state.done){
if(!state.raw||goldOnly&&state.raw.rating!=='gold')return null;
if(state.deferBounds)return state.proof||state.raw;
if(!Object.prototype.hasOwnProperty.call(state,'proof'))state.proof=finalizeSolverConditionProof(combo,targets,hexId,bat,state.raw,state.tension,state.fEls);
return state.proof;
}
if(!targets||!targets.length||!priOrderOK(combo)||combo.length>SOLVER_MAX_ACTIONS||!solverBlockStructureOK(combo,targets))return null;
const total=groupTotal(targets),single=total===1;
const mon=getMonDB(hexId);
if(!mon)return null;
const fin=combo.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0).pop();
const fource=findInlineFource(combo),fEls=fource?getFourceEls(fource.jp):null;
const eggs=combo.filter(v=>v.jp==='おうえん').length;
const tension=single&&eggs?TENSION[Math.min(eggs-1,TENSION.length-1)].mul:1;
let best=null;const initialResults=new Map();
const finish=()=>{
state.done=true;state.raw=best;state.tension=tension;state.fEls=fEls;
if(!best||goldOnly&&best.rating!=='gold')return null;
return state.deferBounds?best:state.proof=finalizeSolverConditionProof(combo,targets,hexId,bat,best,tension,fEls);
};
const accept=(party,assign,diagnostic)=>{
const verified=verifySolverConditionParty(combo,targets,hexId,bat,party,assign,tension,fEls,undefined,!!acceptActions,diagnostic);
const proof=verified&&(!acceptActions||acceptActions(verified.actionResults))?verified:null;
if(proof){
if(proof.rating==='gold'&&_solverGoldState)_solverGoldState.gold=true;
proof.statTotal=party.reduce((n,c)=>n+Object.values(c.stats).reduce((s,v)=>s+v,0),0);
proof.tuned=party.some(c=>Object.values(c.stats).some(v=>v!==999));
if(!best||getRankOrderValue(proof.rating)>getRankOrderValue(best.rating)
||(proof.rating===best.rating&&proof.statTotal<best.statTotal))best=proof;
}
return proof;
};
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
const diagnostic={};accept(NEUTRAL_PARTY(),assign,diagnostic);initialResults.set(assign.join(','),diagnostic);
return best&&best.rating==='gold';
});
if(!best||goldOnly&&best.rating!=='gold'){
const scanned=new Set();
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
const proof=findVariableConditionProof(combo,targets,hexId,bat,assign,tension,fEls,acceptActions,initialResults.get(assign.join(',')),scanned,goldOnly);
if(!proof)return false;
if(!best||proof.rating==='gold')best=proof;
if(proof.rating==='gold'&&_solverGoldState)_solverGoldState.gold=true;
return proof.rating==='gold';
});
}
if(best&&best.rating==='gold'&&!single)return finish();
if(single&&!isMetalHex(hexId)&&fin!==undefined){
const proposed=calcSolverMinStat(combo,hexId,tension,fource)||req;
forEachSolverAssignment(combo,NEUTRAL_PARTY(),assign=>{
if(proposed&&proposed.stat&&proposed.min<=(solverStatDomain(proposed.stat).max||999)){
const vars=[0,1,2,3].map(index=>({index,key:proposed.stat}));
const party=cloneSolverConditionParty(NEUTRAL_PARTY(),vars,vars.map(()=>proposed.min));
accept(party,assign);
}
const pp=proposed&&proposed.perPos;
if(pp&&pp.finFi===fin){
const party=NEUTRAL_PARTY(),bound=new Map();let compatible=true;
const set=(ci,key,value)=>{
const id=assign[ci]+':'+key;
if(bound.has(id)&&bound.get(id)!==value){compatible=false;return;}
bound.set(id,value);party[assign[ci]].stats[key]=value;
};
for(const ci of pp.varPos)set(ci,getSkillDriveStat(lookupSkill(combo[ci].jp)),pp.posCap[ci]);
set(fin,pp.fKey,pp.sFin);
if(compatible)accept(party,assign);
}
if((!best||best.rating!=='gold')&&combo.length<=SOLVER_ROUND_SIZE&&combo.every(v=>v.at>0)){
const party=NEUTRAL_PARTY(),hp80=monHpMin(mon.s[0]);
const drive=ci=>getSkillDriveStat(lookupSkill(combo[ci].jp));
const damage=ci=>{
const d=skillDamagePerHit(lookupSkill(combo[ci].jp),combo[ci],hexId,party[assign[ci]].stats,fEls);
const hits=SolverActionGate.hits(combo[ci]);
return{min:d.min*hits,max:d.max*hits};
};
const chipSum=endpoint=>combo.reduce((n,v,ci)=>ci===fin?n:n+damage(ci)[endpoint],0);
for(let ci=0;ci<combo.length;ci++)if(ci!==fin&&drive(ci))party[assign[ci]].stats[drive(ci)]=solverStatMin(drive(ci),combo[ci].equip);
for(let ci=0;ci<combo.length;ci++){
const key=drive(ci);
if(ci===fin||!key)continue;
const ok=value=>{party[assign[ci]].stats[key]=value;return chipSum('max')<hp80;};
if(ok(solverStatMin(key,combo[ci].equip)))party[assign[ci]].stats[key]=binarySearchTrue(solverStatMin(key,combo[ci].equip),999,ok,'max');
}
const key=drive(fin);
if(key){
const gold=value=>{party[assign[fin]].stats[key]=value;return chipSum('min')+damage(fin).min>=mon.s[0];};
if(gold(999))party[assign[fin]].stats[key]=binarySearchTrue(solverStatMin(key,combo[fin].equip),999,gold,'min');
}
accept(party,assign);
}
return best&&best.rating==='gold'&&best.tuned;
});
}
return finish();
}
function trimGroups(groups,max){
groups=groups.slice();
let total=groups.reduce((s,v)=>s+v,0);
while(total>max){
let changed=false;
for(let g=0;g<groups.length&&total>max;g++){
const excess=total-max;
const amt=excess>=12?4:excess>=9?3:excess>=6?2:1;
const floor=g===0?1:0;
const remove=Math.min(amt,groups[g]-floor);
if(remove>0){groups[g]-=remove;total-=remove;changed=true;}
}
if(!changed)break;
}
return groups;
}
function forEachPoolEntry(rawPool,fn){
for(const e of rawPool){
if(!Array.isArray(e))continue;
if(typeof e[0]==='string')fn(e);
for(const x of e){if(Array.isArray(x)&&typeof x[0]==='string')fn(x);}
}
}
function getEncounterSupportPool(env,mr){
const supportPool=[],seen=new Set();
let denominator=0;
forEachPoolEntry((GROTTO_SUPPORT[env]==null?void 0:GROTTO_SUPPORT[env][mr])||[],e=>{
if(seen.has(e[0]))return;
seen.add(e[0]);denominator=denominator||e[4]||0;
supportPool.push({hex:e[0],min:e[1],max:e[2],weight:e[3]||0,index:supportPool.length});
});
return{supportPool,denominator};
}
function getEncounterModel(env,mr,hex){
const info=(GROTTO_BATTLE[env]==null?void 0:GROTTO_BATTLE[env][mr]),entry=(info==null?void 0:info.m.find(e=>e[0]===hex));
if(!entry)return null;
const isAlone=entry[3]===1;
const{supportPool,denominator}=isAlone?{supportPool:[],denominator:0}:getEncounterSupportPool(env,mr);
const p1=!isAlone&&entry[5]>0?entry[4]/entry[5]:0;
const p2=!isAlone&&entry[7]>0?entry[6]/entry[7]:0;
return{hex,isAlone,max:info.x,mainMin:entry[1],mainMax:entry[2],
supportPool,denominator,branches:[Math.max(0,1-p1-p2),p1,p2]};
}
function enumerateEncounterOutcomes(model){var _ios11,_ios12,_ios13,_ios14;
if(!model)return[];
const{hex,max,mainMin,mainMax,supportPool,denominator,branches}=model;
const outcomes=new Map(),pMain=1/(mainMax-mainMin+1);
const add=(mainRaw,supports,counts,probability)=>{var _ios9,_ios10;
if(!(probability>0))return;
const[M,...remaining]=trimGroups([mainRaw,...counts],max);
const survivors=supports.map((s,i)=>({...s,count:remaining[i]})).filter(s=>s.count>0)
.sort((a,b)=>a.index-b.index);
const kind=['A','B','C'][survivors.length];
const key=kind==='A'?'A_'+M:kind==='B'?'B_'+survivors[0].hex+'_'+M+'_'+survivors[0].count
:'C_'+survivors[0].hex+'_'+survivors[0].count+'_'+survivors[1].hex+'_'+survivors[1].count+'_'+M;
const existing=outcomes.get(key);
if(existing){existing.probability+=probability;return;}
const group=(id,count,isMain)=>({hex:id,count,death:((_ios10=((_ios9=getMonDB(id))==null?void 0:_ios9.s[12]))!=null?_ios10:100),isMain});
const monGroups=[group(hex,M,true),...survivors.map(s=>group(s.hex,s.count,false))];
outcomes.set(key,{key,kind,mainCount:M,supports:survivors,monGroups,
total:monGroups.reduce((n,g)=>n+g.count,0),probability});
};
for(let m=mainMin;m<=mainMax;m++){
add(m,[],[],pMain*branches[0]);
if(!(denominator>0))continue;
if(branches[1]>0)for(const a of supportPool){
const p=pMain*branches[1]*a.weight/denominator/(a.max-a.min+1);
for(let n=a.min;n<=a.max;n++)add(m,[a],[n],p);
}
if(branches[2]>0)for(const a of supportPool)for(const b of supportPool){
const p=pMain*branches[2]*(a.weight/denominator)*(b.weight/denominator)
/((a.max-a.min+1)*(b.max-b.min+1));
for(let na=a.min;na<=a.max;na++)for(let nb=b.min;nb<=b.max;nb++)add(m,[a,b],[na,nb],p);
}
}
return[...outcomes.values()].sort((a,b)=>a.supports.length-b.supports.length
||(((_ios11=(a.supports[0]==null?void 0:a.supports[0].index))!=null?_ios11:0))-(((_ios12=(b.supports[0]==null?void 0:b.supports[0].index))!=null?_ios12:0))
||(((_ios13=(a.supports[1]==null?void 0:a.supports[1].index))!=null?_ios13:0))-(((_ios14=(b.supports[1]==null?void 0:b.supports[1].index))!=null?_ios14:0)));
}
function getMonsterShieldName(hx){
const m=getMonDB(hx);
return getMonsterDisplayName(hx)+(m&&m.s[4]>0?'🛡️':'');
}
function mergeSameSpeciesGroups(groups,keyOf){
const key=keyOf||(g=>g.hex);
const merged=[],offset=[];
(groups||[]).forEach((g,gi)=>{
const count=g.count||1;
const same=merged.find(m=>key(m)===key(g));
if(same){offset.push(same.count);same.count+=count;same.groupIdxs.push(gi);return;}
offset.push(0);
merged.push(Object.assign({},g,{count,groupIdxs:[gi]}));
});
return{merged,offset,of:(hex)=>merged.find(m=>m.hex===hex)||{count:1,groupIdxs:[]}};
}
function mergedSpeciesLabel(group,name){
return(name!==undefined?name:getMonsterShieldName(group.hex))
+((group.count||1)>1?'×'+group.count:'');
}
function solverTraceInstanceNames(initial,targets){
const same=mergeSameSpeciesGroups(targets),seen=new Map();
return initial.map(i=>{
const n=(seen.get(i.groupIdx)||0)+1;seen.set(i.groupIdx,n);
const idxs=same.of(i.hex).groupIdxs;
const group=idxs.length>1?' '+String.fromCharCode(65+idxs.indexOf(i.groupIdx)):'';
return getMonsterShieldName(i.hex)+group+((targets[i.groupIdx].count||1)>1?n:'');
});
}
function getStatLabel(st,compact=false){
const domain=solverStatDomain(st);if(domain&&(!compact||domain.sum))return domain.sum?domain.sum.map(key=>getStatLabel(key)).join('＋'):domain.label;
switch(st){
case'might':return'M';
case'str':return'STR';
case'mending':return'Mend';
case'deft':return'D';
default:return'ATK';
}
}
function renderKathwackPlan(monId,monGroups){
const useJP=DISPLAY_LANG!=='EN';
const useStats=solverUseStatsEnabled();
const name=useJP?'ザラキーマ':'Kathwack';
const groups=(monGroups&&monGroups.length)?monGroups:(monId?[{hex:monId,count:1}]:[]);
const chars=solverKathwackCasters(readCharStatsFromDom(),useStats);
if(!chars.length){window._solverSolvable=false}
const might=Math.max(...chars.map(c=>c.stats.might||0));
const baseAcc=solverKathwackChance(might);
const fmtAcc=v=>(v%1===0)?v+'%':v.toFixed(1)+'%';
let html='<div style="font-size:10px;margin-left:16px;">';
html+=`<span style="color:#ccc;">${name}</span> `;
const accColor=baseAcc>=100?'#4f4':'#0ff';
html+=`<span style="color:${accColor};font-size:9px;">M=${might} → ${fmtAcc(baseAcc)}</span>`;
const shown=mergeSameSpeciesGroups(groups).merged;
const multi=shown.length>1||(shown[0]&&shown[0].count>1);
let wipe=1,anyRes=false;
for(const g of shown){
const m=getMonDB(g.hex);
const res=m.s[12];
const cnt=g.count||1;
const eff=baseAcc*res/100;
wipe*=Math.pow(eff/100,cnt);
if(res<100)anyRes=true;
if(res<100||multi){
const nm=multi?mergedSpeciesLabel(g)+' ':'';
html+=` <span style="color:#f80;font-size:9px;">${nm}×d=${res} → ${fmtAcc(eff)}</span>`;
}
}
if(multi){
html+=` <span style="color:#ff0;font-size:9px;">${L12}≈${(wipe*100)%1===0?(wipe*100)+'%':(wipe*100).toFixed(1)+'%'}</span>`;
}
if(baseAcc<100){
html+=!anyRes
?' <span style="color:#888;font-size:9px;">(100%: M≥799)</span>'
:' <span style="color:#888;font-size:9px;">('+L18+': M≥799)</span>';
}
html+='</div>';
return html;
}
function solverConditionText(value){
return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function buildSolverNeutralConditions(entry,targets,bat,turn2Cost){
const proof=entry.conditionProof;
return{
bat,turn2Cost,multiOnly:!!entry.multiOnly,
proof:{rating:proof.rating,party:proof.party,assign:proof.assign,eggAssign:proof.eggAssign||null,
...(proof.fallbackKind?{fallbackKind:proof.fallbackKind}:{}),
pathSig:proof.pathSig||'',actionResults:proof.actionResults||null,
statBounds:proof.statBounds||null,conditionalBounds:proof.conditionalBounds||null,
usage:solverConditionStatUsage(entry.combo,proof,targets)},
targets:(targets||[]).map(g=>{
const mon=getMonDB(g.hex),hp=mon?mon.s[0]:null;
return{hex:g.hex,name:getMonsterShieldName(g.hex),count:g.count||1,
hp,hpLow:hp===null?null:monHpMin(hp)};
})
};
}
function solverBoundText(lo,hi,key,floor=key?solverStatMin(key):0){
const ceiling=key&&solverStatDomain(key)&&solverStatDomain(key).max||999;
return lo===floor&&hi===ceiling?' '+L78:lo===hi?'='+lo:hi===ceiling?'≥'+lo:' '+lo+'–'+hi;
}
const solverWeaponName=equip=>DISPLAY_LANG==='EN'?(weaponMetaValue(equip,'en')||equip):equip;
function solverConditionValue(proof,index,key,summary){
const bound=proof.statBounds&&proof.statBounds.find(value=>value.index===index&&value.key===key);
return getStatLabel(key,summary)+(bound?solverBoundText(bound.lo,bound.hi,key,bound.floor)
:(summary?'=':':')+(solverStatDomain(key)&&solverStatDomain(key).sum?getDamageStat(key,proof.party[index].stats):proof.party[index].stats[key]));
}
function solverConditionConditionalRows(proof,compact=false){
if(!proof||!proof.statBounds||!proof.conditionalBounds)return[];
const circled=['①','②','③','④'],actor=index=>circled[index]||(index+1)+'.';
const usage=new Map((proof.usage||[]).map(row=>[row.index,row.stats]));
return proof.conditionalBounds.filter(condition=>condition.ranges.length&&condition.fixed.every(fixed=>fixed.variable<condition.target)).map(condition=>{
const premise=condition.fixed.flatMap(fixed=>{
const bound=proof.statBounds[fixed.variable];
return(usage.get(bound.index)||[]).includes(bound.key)?[actor(bound.index)+' '+getStatLabel(bound.key,compact)+'='+fixed.value]:[];
}).join(' ＋ ');
const bound=proof.statBounds[condition.target];
if(!(usage.get(bound.index)||[]).includes(bound.key))return'';
const range=actor(bound.index)+' '+getStatLabel(bound.key,compact)
+condition.ranges.map(value=>solverBoundText(value.lo,value.hi,bound.key,bound.floor)).map((text,index)=>index?text.trimStart():text).join(T(' or ',' 或 ',' または '));
return premise?(compact?premise+' → ':T('When ','當 ','')+premise+T(', then ',' 時，',' のとき、'))+range:range;
}).filter(Boolean);
}
function renderSolverConditionalBounds(proof,compact=false){
const rows=solverConditionConditionalRows(proof,compact);
if(!rows.length)return'';
return'<span data-condition-endpoint-cases="1" style="white-space:nowrap;">'
+rows.map(row=>'<span data-condition-endpoint-case="1">'+solverConditionText(row)+'</span>').join('；')+'</span>';
}
function renderSolverConditionSummary(conditions){
const proof=conditions&&conditions.proof;
if(!proof)return'';
const circled=['①','②','③','④'];
const conditional=renderSolverConditionalBounds(proof,true);
if(conditional)return(proof.statBounds.some(bound=>bound.keys)&&proof.statBounds.some(bound=>bound.lo!==bound.hi)
&&(proof.conditionalBounds||[]).some(condition=>condition.fixed.length)?T('Example pairing: ','搭配例：','組合せ例：'):'')+conditional;
const groups=[];
for(const row of proof.usage||[]){
const values=row.stats.map(key=>solverConditionValue(proof,row.index,key,true)).filter(Boolean);
if(values.length)groups.push((circled[row.index]||(row.index+1)+'.')+' '+solverConditionText(values.join(' + ')));
}
return groups.join(' · ');
}
function solverConditionFullStat(proof,index,key){
const bound=proof.statBounds&&proof.statBounds.find(value=>value.index===index&&value.key===key);
const domain=solverStatDomain(key);
if(domain.sum){
if(bound&&bound.lo===domain.min&&bound.hi===domain.max)return'';
return getStatLabel(key)+(bound?solverBoundText(bound.lo,bound.hi,key,bound.floor):'='+getDamageStat(key,proof.party[index].stats));
}
const lo=proof.statBounds?bound?bound.lo:solverStatMin(key):proof.party[index].stats[key];
const hi=proof.statBounds?bound?bound.hi:999:proof.party[index].stats[key];
return getStatLabel(key)+' '+(lo===hi?lo:lo+'–'+hi);
}
function solverActionStatText(proof,ci){
const index=proof.assign[ci],usage=(proof.usage||[]).find(row=>row.index===index);
const row=usage&&usage.actions.find(action=>action.ci===ci);
if(!row)return'';
const stats=proof.party[index].stats;
return row.stats.map(key=>getStatLabel(key)+' '+(key==='atk'&&proof.useStats?deriveSolverAtk(stats.str,row.equip,stats.atkOverride):solverStatDomain(key)&&solverStatDomain(key).sum?getDamageStat(key,stats):stats[key])).join(' · ');
}
function solverConditionActionTargets(proof,ci){
const result=proof&&proof.actionResults&&proof.actionResults.find(r=>r.ci===ci);
if(result){
const groups=new Map();
for(const t of result.targets){
const key=t.groupIdx+':'+t.outcome;
if(!groups.has(key))groups.set(key,{role:t.groupIdx===0?'M':'S',groupIdx:t.groupIdx,
hex:t.hex,count:0,outcome:t.outcome,indices:[]});
const group=groups.get(key);group.count++;group.indices.push(t.index);
}
return groups.size?[Array.from(groups.values())]:[];
}
const alternatives=[],seen=new Set(),prefix=ci+':d:';
for(const path of((proof&&proof.pathSig)||'').split('>')){
const row=path.split(';').find(r=>r.startsWith(prefix));
if(!row)continue;
const groups=new Map();
for(const target of row.slice(prefix.length).split(',')){
const fields=target.split(':'),role=fields[0],hex=fields[1];
if(fields.length!==5||!/^[MS]$/.test(role)||!/^[0-9A-F]{3}$/.test(hex))continue;
const key=role+':'+hex;
if(!groups.has(key))groups.set(key,{role,hex,count:0});
groups.get(key).count++;
}
const targets=Array.from(groups.values());
const key=JSON.stringify(targets);
if(targets.length&&!seen.has(key)){seen.add(key);alternatives.push(targets);}
}
return alternatives;
}
function renderSolverNeutralDetails(data){
const conditions=data.neutralConditions;
if(!conditions)return'<div style="color:#888;font-size:9px;margin-left:24px;">'+L19+'</div>';
const escape=solverConditionText;
const lines=['<div style="color:#0ff;">'+L60+'</div>',
'<div style="color:#888;">'+L19+'</div>'];
if(conditions.targets.length)lines.push('<div>'+L21
+mergeSameSpeciesGroups(conditions.targets).merged.map(g=>
mergedSpeciesLabel(g,escape(g.name))+(g.hp===null?'':' HP '+g.hpLow+'–'+g.hp)).join(' / ')+'</div>');
if(conditions.proof){
const proof=conditions.proof;
lines.push('<div data-stat-proof="1" style="color:#0ff;">'+L71+' · '+L73+': '+escape(proof.rating)+'</div>');
lines.push('<div style="color:#789;">'+(proof.statBounds
?T('Each stat range below shows its individual limits; values from different ranges cannot be freely combined. Verified pairings are examples with the stated values fixed, not the complete conditions for intermediate values.',
'下列範圍是各能力分別可達的上下界，不能任意配對。搭配例須固定所列數值；它們不是中間數值的完整成立條件。',
'以下は各能力それぞれの上下限で、自由に組み合わせることはできません。組合せ例は記載値を固定した場合の例であり、中間値の全条件ではありません。')
:L72)+'</div>');
for(const index of[0,1,2,3]){
const c=proof.party[index],usage=(proof.usage||[]).find(row=>row.index===index);
const stats=usage?usage.stats.map(key=>solverConditionFullStat(proof,index,key)).filter(Boolean):[];
lines.push('<div data-condition-actor="'+index+'">'+L20+(index+1)+' · Lv'+c.lv+' · '+L75+' '+(index+1)
+(stats.length?' · '+stats.join(' · '):'')+'</div>');
}
const conditional=renderSolverConditionalBounds(proof);
if(conditional)lines.push('<div data-verified-pairings="1" style="color:#0cc;">'+((proof.conditionalBounds||[]).some(condition=>condition.fixed.length)?T('Verified pairings (examples): ','已驗證的搭配例：','検証済みの組合せ例：'):'')+conditional+'</div>');
if(proof.statBounds&&proof.statBounds.length>1)lines.push('<div style="color:#789;">'
+T('Verified example: ','成立數值例：','成立例：')
+proof.statBounds.filter(bound=>(proof.usage||[]).some(row=>row.index===bound.index&&row.stats.includes(bound.key))).map(bound=>L20+(bound.index+1)+' '+getStatLabel(bound.key)+' '+(bound.keys?getDamageStat(bound.key,proof.party[bound.index].stats):proof.party[bound.index].stats[bound.key])).map(escape).join(' · ')+'</div>');
}
const combo=data.combo||[],atSum=combo.reduce((n,v)=>n+(v.at||0),0);
const eggTargets=solverConditionEggTargets(combo,conditions.proof.eggAssign||data.eggAssign,
conditions.proof.assign,conditions.proof.party.length);
lines.push('<div>AT '+atSum+(conditions.turn2Cost===null?'':' + '+conditions.turn2Cost+' ('+L06+')')
+'=Bat. '+conditions.bat+'</div>');
if(conditions.multiOnly)lines.push('<div style="color:#ff0;">'+L68+'</div>');
lines.push('<div style="color:#789;">'+L69+'</div>');
for(let ci=0;ci<combo.length;ci++){
if(ci%SOLVER_ROUND_SIZE===0){
const acting=conditions.proof.assign.slice(ci,ci+SOLVER_ROUND_SIZE);
const defenders=[0,1,2,3].filter(ai=>!acting.includes(ai));
lines.push('<div style="color:#789;">'+(ci?L06:L05)
+(defenders.length?' · '+L34+defenders.map(ai=>L20+(ai+1)).join(', '):'')+'</div>');
}
const v=combo[ci],sk=lookupSkill(v.jp);
const targetOptions=solverConditionActionTargets(conditions.proof,ci);
const area=sk&&(SolverActionGate.targetKind(sk)==='G'||SolverActionGate.targetKind(sk)==='A');
const name=DISPLAY_LANG==='EN'?(v.en||v.jp):v.jp;
const miss=(conditions.proof.actionResults||[]).some(row=>row.ci===ci&&row.miss);
let text=L22+(ci+1)+L23+escape(name)+(miss?' 💨':'')+' · AT '+(v.at||0);
if(conditions.proof)text+=' · '+L20+(conditions.proof.assign[ci]+1);
if(v.jp==='おうえん'&&eggTargets[ci]!==undefined){
const target=eggTargets[ci],beneficiary=combo[target];
text+=' → '+L20+(conditions.proof.assign[target]+1)+' '+escape(DISPLAY_LANG==='EN'?beneficiary.en||beneficiary.jp:beneficiary.jp);
}
if(v.at===0&&findInlineFource([v]))text+=' → '+T('All allies','全員','味方全員');
if(v.at>0){
text+=' · '+(area?T('Hits per enemy','每隻擊數','1体あたりの攻撃回数'):L65)+' '+SolverActionGate.hits(v);
if(area&&targetOptions.length){
const counts=Array.from(new Set(targetOptions.map(ts=>ts.reduce((sum,t)=>sum+t.count,0))));
text+=' · '+T('Enemies hit: ','命中 ','対象数 ')+counts.join(' / ')+T('',' 隻','体');
}
}
const usage=(conditions.proof.usage||[]).find(row=>row.index===conditions.proof.assign[ci]);
const actionUsage=usage&&usage.actions.find(row=>row.ci===ci);
if(actionUsage&&WEAPON_META[actionUsage.equip])text+=' · '+L64+' '+escape(solverWeaponName(actionUsage.equip));
const statText=solverActionStatText(conditions.proof,ci);
if(statText)text+=' · '+escape(statText);
if(data.eggAssign&&data.eggAssign[ci])text+=' · ⊕T'+getTensionLevel(data.eggAssign[ci]);
if(v.earlyKill)text+=' · '+L66;
if(sk&&/^R/.test(sk.target))text+=' · '+L67;
if(targetOptions.length){
const _batch=mergeSameSpeciesGroups(conditions.targets);
const targetBase=(t,whole)=>{
const group=t.groupIdx!==undefined?conditions.targets[t.groupIdx]
:t.role==='M'?conditions.targets[0]:conditions.targets.slice(1).find(g=>g.hex===t.hex);
let name=escape(group&&group.hex===t.hex?group.name:getMonsterShieldName(t.hex));
if(group&&!whole&&t.groupIdx!==undefined&&t.indices){
const fieldOffset=conditions.targets.slice(0,t.groupIdx).reduce((sum,g)=>sum+g.count,0);
const rebase=(_batch.offset[t.groupIdx]||0)-fieldOffset;
name+=' '+t.indices.map(i=>i+rebase+1).join(',');
}
return name;
};
const outcomeTag=t=>t.outcome==='ko'?' '+L32:t.outcome==='possible'?' '+L33
:t.outcome==='removed'?' '+L24:'';
const targetList=ts=>{
const hit=new Map();
for(const t of ts)hit.set(t.hex,(hit.get(t.hex)||0)+t.count);
const parts=ts.map(t=>({hex:t.hex,count:t.count,tag:outcomeTag(t),
base:targetBase(t,hit.get(t.hex)>=_batch.of(t.hex).count)}));
return mergeSameSpeciesGroups(parts,p=>p.base+'\x1f'+p.tag).merged
.map(p=>mergedSpeciesLabel(p,p.base)+p.tag).join(' / ');
};
text+=' → '+targetOptions.map(targetList).join(T(' or ',' 或 ',' または '));
}else if(v.tgtGroup!==undefined&&conditions.targets[v.tgtGroup])text+=' → '+escape(conditions.targets[v.tgtGroup].name);
lines.push('<div data-condition-action="'+ci+'">'+text+'</div>');
}
return'<div data-neutral-conditions="1" style="font-size:9px;color:#aaa;margin-left:24px;border-left:1px solid #555;padding-left:6px;margin-top:2px;">'
+lines.join('')+renderSolverPlanVariantRows(data)+'</div>';
}
function solverPlanIdentityKey(combo,exact=false){
return combo.filter(v=>v.at>0).map(v=>{
const sk=lookupSkill(v.id===undefined?v.jp:v.id),fixed=weaponMetaValue(v.equip||sk.equip,'fixedDmg');
const baseSkillId=fixed&&sk.baseSkillId!==undefined?sk.baseSkillId:sk.id;
if(exact)return baseSkillId;
const baseSkill=fixed&&lookupSkill(baseSkillId);
const action=baseSkill?{...v,id:baseSkillId,jp:baseSkill.jp,needle:false}:v;
const representative=solverBasicSkillOf(action);
return[representative?lookupSkill(representative).id:baseSkillId,v.at,SolverActionGate.hits(v),v.earlyKill?1:0,fixed?0:v.needle?1:0].join('|');
}).sort().join('+');
}
function solverExactSkillKey(combo){
return solverPlanIdentityKey(combo,true);
}
const solverUsesWeaponMultiplier=(combo,hexId)=>combo.some(v=>!v.defend&&solverWeaponMul(lookupSkill(v.jp),v.equip,hexId)>1);
const solverPlanHeadTier=(combo,hexId)=>(combo.some(v=>solverBasicSkillOf(v))?2:0)+(solverUsesWeaponMultiplier(combo,hexId)?1:0)
+(combo.some(v=>weaponMetaValue(v.equip||(lookupSkill(v.jp)||{}).equip,'fixedDmg'))?4:0);
function mergeSolverPlanVariants(entries,hexId){
const byKey=new Map(),rating=e=>e.kill||e.conditionProof&&e.conditionProof.rating;
for(const entry of entries){
const key=solverPlanIdentityKey(entry.combo)+'|'+(entry.fallbackKind||'');
if(!byKey.has(key))byKey.set(key,[]);
byKey.get(key).push(entry);
}
return[...byKey.values()].map(group=>{
let head=group[0];
for(const e of group)if(rating(e)===rating(group[0])&&solverPlanHeadTier(e.combo,hexId)<solverPlanHeadTier(head.combo,hexId))head=e;
if(group.length>1)head.planVariants=group.filter(e=>e!==head);
return head;
});
}
function pickSolverPlanVariants(list,useStats){
const seen=new Map(),out=[];
for(const v of list){
const key=useStats?solverExactSkillKey(v.combo)+'|'+(v.outcomeSig||'')+(v.fallback?'|fallback':'')+'|'+(v.fallbackKind||'')+(v.combo.some(a=>weaponMetaValue(a.equip||(lookupSkill(a.jp)||{}).equip,'fixedDmg'))?'|'+solverComboActionSignature(v.combo):''):v.conditionProof;
const row=seen.get(key);
if(row){row.sameCount++;continue;}
const row2={entry:v,sameCount:1};
seen.set(key,row2);out.push(row2);
}
return out;
}
function renderSolverPlanVariantRows(data){
const rows=data.planVariants||[],skillRows=data.skillVariants||[];
if(!rows.length&&!skillRows.length)return'';
const useJP=DISPLAY_LANG!=='EN';
const name=v=>useJP?v.jp:(v.en||v.jp);
const label=row=>{
const proof=row.neutralConditions?row.neutralConditions.proof:row.battleProof;
return row.combo.map((v,ci)=>{
const miss=proof&&(proof.actionResults||[]).some(result=>result.ci===ci&&result.miss);
const note=(v.note||'').replace(/💨/g,'')+(miss?'💨':'');
return solverConditionText((useJP?v.jp:(v.en||v.jp))+note+(v.tgtGroup!==undefined?'→'+(v.tgtGroup+1):''));
}).join(' + ');
};
const line=v=>{
const note=v.neutralConditions?renderSolverConditionSummary(v.neutralConditions)
:(v.battleProof?solverConditionText(v.battleProof.rating):'');
return'<div style="color:#aaa;">· '+label(v)+(v.fallback?SOLVER_ROW_FALLBACK_TAG[v.fallbackKind||'']:'')
+(v.sameCount>1?' <span style="color:#888;">×'+v.sameCount+'</span>':'')
+(note?' <span style="color:#39C5BB;">'+note+'</span>':'')+'</div>';
};
const expander=(count,show)=>'<div style="color:#39C5BB;cursor:pointer;" onclick="'+show+';this.remove()">· +'
+count+T(' more variants (click to show)',' 個變體（點擊展開）',' 件の変種（クリックで表示）')+'</div>';
const out=[];
if(rows.length){
out.push('<div data-plan-variants="1" style="color:#0ff;margin-top:2px;">'
+T('Merged variants — same skills, different gear / target / buff placement',
'已合併的變體 —— 同一組招式，武器／指名／增益位置不同',
'統合した変種 —— 同じ技構成、武器・指定・補助の位置違い')+'</div>');
const lines=rows.map(line);
out.push(...lines.slice(0,SOLVER_VARIANT_MAX));
if(lines.length>SOLVER_VARIANT_MAX)out.push(expander(lines.length-SOLVER_VARIANT_MAX,'this.nextElementSibling.style.display=\'\'')
+'<div style="display:none;">'+lines.slice(SOLVER_VARIANT_MAX).join('')+'</div>');
}
if(skillRows.length){
out.push('<div data-skill-variants="1" style="color:#0ff;margin-top:2px;">'
+T('Same-AT skills — different skill, same AT; each with its own variants and conditions',
'同 AT 招 —— 招式不同、AT 相同，各自的變體與條件',
'同じ AT の技 —— 技は違うが AT は同じ、各自の変種と条件')+'</div>');
const groups=new Map();
skillRows.forEach((v,i)=>{const key=solverExactSkillKey(v.combo);if(!groups.has(key))groups.set(key,[]);groups.get(key).push([v,i]);});
const shown=(i,row)=>i<SOLVER_VARIANT_MAX?row:'<div style="display:none;">'+row+'</div>';
for(const group of groups.values()){
out.push(shown(group[0][1],'<div style="color:#8cf;">'+group[0][0].combo.filter(a=>a.at>0).map(a=>solverConditionText(name(a))).join(' + ')+'</div>'));
for(const[v,i]of group)out.push(shown(i,line(v)));
}
if(skillRows.length>SOLVER_VARIANT_MAX)out.push(expander(skillRows.length-SOLVER_VARIANT_MAX,
'for(let e=this.previousElementSibling;e&&!e.dataset.skillVariants;e=e.previousElementSibling)e.style.display=\'\''));
}
return out.join('');
}
function renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,_forceKillAll,_prebuiltKmc,_prebuiltKillAll,_deferKillAll,_round2Only=false,_incomplete=false,userDeft){
canRound2=solverAllowsRound2(mapDeft,canRound2);
if(_solverRenderDepth++===0){_solverSearchIncomplete=false;_solverGoldState={gold:false};}
(_solverSearchIncomplete||(_solverSearchIncomplete=!!(_incomplete||(_prebuiltKmc==null?void 0:_prebuiltKmc.incomplete)||(_prebuiltKillAll==null?void 0:_prebuiltKillAll.incomplete))));
try{
window._solverSolvable=null;
if(bat<0)return'';
if(solverBatUnreachable({bat,monGroups,monId,mapDeft,canRound2,userDeft})){window._solverSolvable=false;return solverBatUnreachableResult().html;}
const useStats=solverUseStatsEnabled();
_solverUseStats=useStats;
resetSolverDamageCache(JSON.stringify([useStats,useStats?readCharStatsFromDom():null]));
const T=monGroups.reduce((s,g)=>s+g.count,0);
const realT=groupTotal(monGroups);
const tc2=solverRound2RemovalCost(realT);
if(bat===0){
const allD=solverKathwackCanClear(monGroups);
if(allD){window._solverSolvable=true;return renderKathwackPlan(monId,monGroups);}
window._solverSolvable=false;
return SOLVER_DASH;
}
const _mercyLv=Math.max(...(readCharStatsFromDom().map(c=>c.lv||99)));
const _planMeta=deriveSolverBattlePlan(monGroups,monId,_mercyLv,false);
const{hexId,isMetal,sups,metalSupCount:_metalSupCount}=_planMeta;
const mon=hexId?getMonDB(hexId):null;
const _nonMetalSups=sups.filter(g=>(g.count>0)&&g.hex&&!isMetalHex(g.hex));
const _effDeath=_planMeta.effectiveDeath;
let planType=_planMeta.planType,postAlive=_planMeta.postAlive;
if(_forceKillAll){window._solverFallback=window._solverFallback||planType!=='kill_all';planType='kill_all';postAlive=0;}
const _fallbackKillAll=()=>{
window._solverFallback=true;
if(_deferKillAll&&!_prebuiltKillAll){
window._solverNeedsKillAll='r1';
return'';
}
return renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,true,null,_prebuiltKillAll,_deferKillAll,false,false,userDeft);
};
const _offTargets=monGroups.map(g=>({hex:g.hex,count:g.count,death:_effDeath(g)})),killTargets=T>1?_offTargets:null,_simTargets=T?_offTargets:null;
let excludedPads=null,excludedPadsAfterMercy=null,supPads=null;
if(isMetal&&_nonMetalSups.length>0){
const _currentChars=readCharStatsFromDom();
({excludedPads,excludedPadsAfterMercy,supPads}=
solverMetalSupportPads(monGroups,_nonMetalSups,_effDeath,_currentChars));
}
_solverFieldHexes=monGroups.map(g=>g.hex);
_solverGroupCounts=killTargets?killTargets.map(t=>t.count):null;
_solverFieldTotal=killTargets?killTargets.reduce((s,t)=>s+t.count,0):null;
const _phaseBCountsAll=killTargets?killTargets.map(t=>
isMetalHex(t.hex)?0:(t.count||0)):null;
const _phaseBCountsAfterMercy=killTargets?killTargets.map(t=>
(isMetalHex(t.hex)||t.death>0)?0:(t.count||0)):null;
const _metalSupNeed=(killTargets&&T>1)?_metalSupCount:0;
_solverIssenNeed=_metalSupNeed;
const _metalSupFilter=(cs)=>_metalSupNeed===0?cs
:cs.filter(c=>solverMetalExecutionCount(c)===_metalSupNeed);
const _mercyLevels=[...new Set(readCharStatsFromDom().map(c=>c.lv||99))];
const _walkNow=()=>({isMetal,killTargets,T,planType,postAlive,metalSupNeed:_metalSupNeed,mercyLevels:_mercyLevels});
const _walkOK=rawCombo=>solverCandidateStructureOK(rawCombo,_walkNow());
const _recoverMercy=(combo,walkOrders)=>{
const mercyAt=combo.findIndex(v=>v.jp==='みのがす');
if(!useStats||planType!=='mercy_first'||mercyAt<0||combo.some(v=>v.metalFirst))return null;
const walk=_walkNow();
const chars=readCharStatsFromDom(),seen=new Set();let budget=216,best=null;
const visit=order=>{
for(const trial of solverMercyAlternatives(order,walk)){
const key=solverComboActionSignature(trial);
if(seen.has(key))continue;seen.add(key);
if(budget--<=0){_solverSearchIncomplete=true;return true;}
const eggs=trial.map((v,i)=>v.jp==='おうえん'?i:-1).filter(i=>i>=0);
const eligible=trial.map((v,i)=>solverEggCanBenefit(v,monGroups)?i:-1).filter(i=>i>=0);
forEachSolverAssignment(trial,chars,assign=>{
const allocations=eggs.length?buildSolverEggAssignments(eggs,eligible,(e,t)=>solverEggCanReach(trial,e,t,assign)):[undefined];
for(const allocation of allocations){
if(eggs.length&&!allocation)continue;
const proof=verifySolverConditionParty(trial,killTargets,hexId,bat,chars,assign,1,null,allocation,true);
if(!proof||!solverMercyChipPrefixOK(proof.actionResults))continue;
if(proof.rating==='gold')_solverGoldState.gold=true;
if(!best||getRankOrderValue(proof.rating)>getRankOrderValue(best.best.rating))
best={combo:trial,assign:proof.assign,best:{rating:proof.rating,assign:proof.assign,
eggAssign:proof.eggAssign,finIdx:proof.finIdx,defend:chars.map((_,i)=>i).filter(i=>!assign.includes(i))}};
if(best.best.rating==='gold')return true;
}
return false;
});
if(best&&best.best.rating==='gold')return true;
}
return false;
};
if(!visit(combo))walkOrders(visit);
return best;
};
let combos=[],isRound2=false,triedRound2=false;
const _retryRound2=()=>renderSolverResult(bat,monGroups,monId,mapDeft,canRound2,
planType==='kill_all',null,_prebuiltKillAll,_deferKillAll,true,false,userDeft);
const _emptyResult=anyRated=>{
if(!anyRated&&canRound2&&!triedRound2&&planType!=='kill_mercy_clear')return _retryRound2();
if(planType!=='kill_all')return _fallbackKillAll();
window._solverSolvable=anyRated?true:_solverSearchIncomplete?null:false;
return SOLVER_DASH;
};
const _metalHPs=[];
let _metalCount=0;
for(const g of monGroups){
if(isMetalHex(g.hex)){
const s=(getMonDB(g.hex)||{}).s;
const h=(s&&s[0])?s[0]:999;
for(let i=0;i<(g.count||1);i++){_metalHPs.push(h);_metalCount++;}
}
}
if(isMetal&&_metalCount===0)_metalCount=T;
let _atVariants=null,_atSpaces=null;
if(_metalCount===0){
_atVariants=expandSolverCombos(T);
const r1AT=isSolverATReachable(_atVariants,bat,SOLVER_ROUND_SIZE);
const r2SameAT=canRound2&&isSolverATReachable(_atVariants,bat,SOLVER_MAX_ACTIONS,SOLVER_ROUND_SIZE+1);
const r2DropAT=canRound2&&tc2>0&&isSolverATReachable(_atVariants,bat-tc2,SOLVER_MAX_ACTIONS,SOLVER_ROUND_SIZE+1);
const r2AT=r2SameAT||r2DropAT;
_atSpaces=[];
if(r1AT)_atSpaces.push({target:bat,min:1,max:SOLVER_ROUND_SIZE});
if(r2SameAT)_atSpaces.push({target:bat,min:SOLVER_ROUND_SIZE+1,max:SOLVER_MAX_ACTIONS});
if(r2DropAT)_atSpaces.push({target:bat-tc2,min:SOLVER_ROUND_SIZE+1,max:SOLVER_MAX_ACTIONS});
if(!r1AT&&!r2AT){
window._solverSolvable=_solverSearchIncomplete?null:false;
return SOLVER_DASH;
}
}
if(planType!=='kill_all'&&_metalCount===0){
const _allNeedEight=_atSpaces&&_atSpaces.length&&_atSpaces.every(sp=>
sp.min===SOLVER_ROUND_SIZE+1&&!isSolverATReachable(_atVariants,sp.target,SOLVER_MAX_ACTIONS-1,SOLVER_ROUND_SIZE+1));
if(_allNeedEight){
planType='kill_all';postAlive=0;window._solverFallback=true;
}
}
if(planType==='kill_all'){
if(_deferKillAll&&!_prebuiltKillAll&&!_forceKillAll){
window._solverFallback=true;window._solverNeedsKillAll='r1';return'';
}
const _kaR1=_round2Only?[]:_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r1')
?_prebuiltKillAll.r1
:(isMetal?solveMetalComboOrders(bat,T,SOLVER_ROUND_SIZE,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat,T,SOLVER_ROUND_SIZE,hexId));
combos=_metalSupFilter(_kaR1||[]).filter(_walkOK);
if(combos.length===0&&canRound2){
triedRound2=true;
if(_deferKillAll&&_prebuiltKillAll&&
!Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2a')){
window._solverNeedsKillAll='r2';return'';
}
const r2a=_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2a')
?_prebuiltKillAll.r2a
:(isMetal?solveMetalComboOrders(bat,T,SOLVER_MAX_ACTIONS,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat,T,SOLVER_MAX_ACTIONS,hexId));
const r2b=tc2>0?((_prebuiltKillAll&&Object.prototype.hasOwnProperty.call(_prebuiltKillAll,'r2b'))
?_prebuiltKillAll.r2b
:(isMetal?solveMetalComboOrders(bat-tc2,T,SOLVER_MAX_ACTIONS,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAll):solveBattleCombo(bat-tc2,T,SOLVER_MAX_ACTIONS,hexId))):[];
combos=_metalSupFilter([...r2a,...r2b]).filter(c=>c.length>=SOLVER_ROUND_SIZE+1).filter(_walkOK);
isRound2=combos.length>0;
}
}else if(planType==='mercy_first'){
const r1Dmg=_round2Only?[]:_metalSupFilter(isMetal?solveMetalComboOrders(bat,postAlive,SOLVER_ROUND_SIZE-1,_metalCount,_metalHPs,excludedPads,hexId,supPads,excludedPadsAfterMercy,_phaseBCountsAfterMercy):solveBattleCombo(bat,postAlive,SOLVER_ROUND_SIZE-1));
const _placeMercyWith=place=>c=>{const first=place(c);return _walkOK(first)?first:solverMercyAlternatives(first,_walkNow())[0];};
const _placeMercy=_placeMercyWith(solverMercyFirstPlacement);
combos=r1Dmg.map(_placeMercy).filter(Boolean);
if(combos.length===0&&canRound2){
triedRound2=true;
if(tc2>0){
const s0=_metalSupFilter(isMetal?solveMetalComboOrders(bat-tc2,postAlive,SOLVER_MAX_ACTIONS-1,_metalCount,_metalHPs,excludedPads,hexId,supPads,excludedPadsAfterMercy,_phaseBCountsAfterMercy):solveBattleCombo(bat-tc2,postAlive,SOLVER_MAX_ACTIONS-1))
.filter(c=>c.length>=SOLVER_ROUND_SIZE)
.map(_placeMercy).filter(Boolean);
combos=combos.concat(s0);
}
const s4=_metalSupFilter(isMetal?solveMetalComboOrders(bat,postAlive,SOLVER_MAX_ACTIONS-1,_metalCount,_metalHPs,excludedPads,hexId,supPads,undefined,_phaseBCountsAfterMercy):solveBattleCombo(bat,postAlive,SOLVER_MAX_ACTIONS-1))
.filter(c=>c.length>=SOLVER_ROUND_SIZE+1)
.map(_placeMercyWith(solverMercySecondRoundPlacement)).filter(Boolean);
combos=combos.concat(s4);
isRound2=combos.length>0;
}
}else{
const kmcSpec=makeKmcBuildSpec(bat,T,postAlive,tc2,canRound2,hexId,_metalSupNeed);
const kmcRaw=_prebuiltKmc||buildKmcSerialPayload(kmcSpec);
(_solverSearchIncomplete||(_solverSearchIncomplete=!!kmcRaw.incomplete));
combos=_metalSupFilter(kmcRaw.r1||[]).filter(_walkOK);
if(canRound2){
const r2a=_metalSupFilter(kmcRaw.r2a||[]).filter(_walkOK);
const r2b=tc2>0?_metalSupFilter(kmcRaw.r2b||[]).filter(_walkOK):[];
if(r2a.length+r2b.length>0){combos=combos.concat(r2a,r2b);isRound2=true;}
}
}
if(_metalSupNeed>0&&combos.length){
const _seenN=new Set(),_normN=[];
for(const c of combos){
const nc=solverMetalExecutionsLast(c);
const key=nc.map(v=>v.jp+'|'+(v.at||0)+'|'+(v.equip||'')+'|'+(v.aoeK!==undefined?v.aoeK:'')+'|'+(v.tgtGroup!==undefined?v.tgtGroup:'')+'|'+(v.hits||0)).join('¶');
if(!_seenN.has(key)){_seenN.add(key);_normN.push(nc);}
}
combos=_normN;
}
combos=combos.map(sortComboByPriority);
if(combos.length===0)return _emptyResult(false);
window._solverSolvable=true;
const useJP=(DISPLAY_LANG!=='EN');
const filtered=[];
const fource=(!isMetal&&hexId)?pickBestFource(hexId):null;
const canFilter=mon&&!isMetal&&useStats;
const monEvade=mon?mon.s[3]:0;
const monBlock=solverFieldBlock(monGroups.filter(g=>g.count>0).map(g=>g.hex));
const seen1=new Map();
const _e323Norm=key=>T===1?key.split('\x1e').sort().join('\x1e'):key;
const _e323Key=combo=>_e323Norm(solverWeaponVariantKey(combo));
const _e323Best=(combo,ranks)=>{
const pos=solverSpecialWeaponSlots(combo);
let best=pos.length?0:-1;
for(const i of pos)for(const key of solverGenericCounterpartKeys(combo,i))best=Math.max(best,ranks.get(_e323Norm(key))||0);
return best;
};
const _e323Ranks=new Map();
const _offProofs=new Map(),_offRanks=new Map();
const _offProve=(e,orangeKinds)=>{
const key=JSON.stringify(e.combo);
if(!_offProofs.has(key)){
const one=mon&&T===1&&!isMetal,fo=findInlineFource(e.combo),fEls=fo&&getFourceEls(fo.jp);
const low=e.combo.map(v=>{
const sk=lookupSkill(v.jp);
if(!one||!sk||!(v.at>0)||solverConditionStatKeys(sk).length||solverBlockRuleEnabled()&&solverFieldBlock([hexId])>0)return 0;
const hits=SolverActionGate.hits(v),r=skillDamagePerHit(sk,v,hexId,EXT_STATS,null),n=r.none?0:r.max*hits;
const rF=fEls&&calcSkillDamageCache(sk,EXT_STATS,hexId,fEls,solverWeaponMul(sk,v.equip,hexId),actionMetalEff(sk,v.equip),v.equip);
return Math.min(n,rF?rF.max*hits:n);
}),sum=low.reduce((a,b)=>a+b,0),safe=fi=>!one||fi===undefined||sum-low[fi]<monHpMin(mon.s[0])&&solverKillerFormOK(e.combo[fi],hexId,null);
_x12Kills={c:e.combo,k:new Set()};
const deferBounds=one&&!e.combo.some(isSolverNonDamageRemoval);
const trials=[],initial={combo:e.combo,state:{deferBounds}};
let found={combo:e.combo,proof:null,state:initial.state};
if(safe(e.combo.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0).pop())){trials.push(initial);found.proof=findSolverConditionProof(e.combo,_offTargets,hexId,bat,e.req,undefined,true,initial.state);}
const kills=_x12Kills.k;_x12Kills=null;
if(one){
const gate=makeFinisherGate(e.combo),seen=new Set([key]);
for(let fi=0;fi<e.combo.length&&!(found.proof&&found.proof.rating==='gold');fi++){
const c=e.combo[fi].at>0&&gate(fi)&&safe(fi)?finisherLastOrder(e.combo,fi):null,k=c&&JSON.stringify(c);
if(!c||seen.has(k))continue;
seen.add(k);
const trial={combo:c,state:{deferBounds}};trials.push(trial);
const p=findSolverConditionProof(c,_offTargets,hexId,bat,e.req,undefined,true,trial.state);
if(p&&(!found.proof||getRankOrderValue(p.rating)>getRankOrderValue(found.proof.rating)))found={combo:c,proof:p,state:trial.state};
}
}
for(const alt of found.proof&&found.proof.rating==='gold'?[]:solverMercyAlternatives(e.combo,_walkNow())){
const trial={combo:alt,state:{deferBounds},acceptActions:solverMercyChipPrefixOK};trials.push(trial);
const p=findSolverConditionProof(alt,_offTargets,hexId,bat,e.req,trial.acceptActions,true,trial.state);
if(p&&(!found.proof||getRankOrderValue(p.rating)>getRankOrderValue(found.proof.rating)))found={combo:alt,proof:p,state:trial.state};
if(found.proof&&found.proof.rating==='gold')break;
}
found.kills=kills;_offProofs.set(key,{gold:found,trials});
}
const work=_offProofs.get(key);
if(!orangeKinds||work.gold.proof)return work.gold;
if(!Object.prototype.hasOwnProperty.call(work,'orange')){
work.orange={combo:e.combo,proof:null,kills:work.gold.kills};
for(const trial of work.trials){
const raw=trial.state.raw;
if(!raw||raw.rating!=='orange'||!orangeKinds.has(!!raw.fallbackKind))continue;
const p=findSolverConditionProof(trial.combo,_offTargets,hexId,bat,e.req,trial.acceptActions,false,trial.state);
if(p){work.orange={combo:trial.combo,proof:p,kills:work.gold.kills,state:trial.state};break;}
}
}
return work.orange;
};
const _x12Seen=new Set();
const _x12Of=v=>{
return v.at>0&&!v.needle&&!isMetalExecutionAction(v)&&!(v.equip&&!(WEAPON_META[v.equip]&&WEAPON_META[v.equip].generic))
?getSkillEquipOpts(v.jp,hexId,'multiplier'):[];
};
const _x12Push=(c,i,opts)=>{for(const o of opts){const n=c.slice();n[i]={...c[i],...o};const k=solverWeaponVariantKey(n);if(!_x12Seen.has(k)){_x12Seen.add(k);combos.push(n);}}};
const _x12Add=(c,kills)=>{
if(c.some(v=>WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul))return;
const dmg=c.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0),gate=makeFinisherGate(c);
for(const i of T===1?dmg.filter(gate):c[c.length-1].jp==='みのがす'?kills||dmg:dmg.slice(-1))_x12Push(c,i,_x12Of(c[i]));
};
combos=expandComboEquipVariants(combos,hexId).sort((a,b)=>solverSpecialWeaponSlots(a).length-solverSpecialWeaponSlots(b).length);
for(const combo of combos){
if(!solverNeedleCandidateOK(combo,mon,isMetal))continue;
const _e323Cp=canFilter?_e323Best(combo,_e323Ranks):-1;
if(_e323Cp===2){_e323Ranks.set(_e323Key(combo),2);continue;}
const dmgParts=combo.filter(v=>v.at>0);
if(dmgParts.length===1&&!(lookupSkill(dmgParts[0].jp)||{}).dmg){
const v=dmgParts[0];
const sd=lookupSkill(v.jp);
const statType=((sd&&sd.fixedDmg)?'fix'+sd.fixedDmg:(sd&&sd.el?'el'+sd.el:'atk'))+(solverWeaponMul(lookupSkill(v.jp),v.equip,hexId)>1?'_w11':'');
const _abKey=(v.equip&&(weaponMetaValue(v.equip,'antiBlk')||WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul))?'_'+v.equip:'';
const key=v.at+'_'+statType+_abKey;
const vEv=sd?sd.ev:1;
const vBlk=sd?sd.blk:1;
const curReq=calcSolverMinStat(combo,hexId,1,null);
const curMin=curReq?curReq.min:Infinity;
if(seen1.has(key)){
const prev=seen1.get(key);
let dominated=true;
if(curMin<prev.reqMin)dominated=false;
if(monEvade>0&&vEv===0&&prev.ev===1)dominated=false;
if(monBlock>0&&vBlk===0&&prev.blk===1)dominated=false;
if(dominated){_x12Add(combo);continue;}
const prevIdx=filtered.findIndex(f=>{
const pDmg=f.combo.filter(x=>x.at>0);
return pDmg.length===1&&pDmg[0].jp===prev.jp&&pDmg[0].at===prev.at&&(pDmg[0].equip||'')===prev.equip;
});
if(prevIdx>=0)filtered.splice(prevIdx,1);
}
seen1.set(key,{jp:v.jp,at:v.at,equip:v.equip||'',ev:vEv,blk:vBlk,reqMin:curMin});
}
const _hasPriDmg=combo.some(v=>v.at>0&&_actionPri(v)>0);
const _hasEggGoal=combo.some(v=>solverEggCanBenefit(v,monGroups));
const _hasNonEl=_hasEggGoal&&combo.some(v=>solverEggCanBenefit(v,monGroups)&&!lookupSkill(v.jp).el);
if(canFilter){
_x12Kills={c:combo,k:new Set()};
const _ord=findBestOrderedAssignment(combo,hexId,mon,killTargets,1,null,bat);
const _c1=_ord.combo,baseBest=_ord.best,_kills=_x12Kills.k;_x12Kills=null;
const kill=baseBest.rating;
const _baseRk=getRankOrderValue(kill);
_e323Ranks.set(_e323Key(combo),Math.max(_e323Ranks.get(_e323Key(combo))||0,_baseRk,_e323Cp));
if(_baseRk<2)_x12Add(combo,_kills);
if(kill){
filtered.push({combo:_c1,kill,req:calcSolverMinStat(_c1,hexId),eggAssign:baseBest.eggAssign||null,assign:baseBest.assign,defend:baseBest.defend,finIdx:baseBest.finIdx,...(T===1&&kill!=='gold'?{orderSearch:_ord}:{})});
}else if(solverMercyAlternatives(_c1,_walkNow()).length){
filtered.push({combo:_c1,kill:null,req:calcSolverMinStat(_c1,hexId),mercyPending:true});
}
if(_baseRk<2)for(const sw of solverPriSwapCombos(combo,hexId,combos,!!killTargets)){
const o=findBestOrderedAssignment(sw,hexId,mon,killTargets,1,null,bat),b=o.best;
if(getRankOrderValue(b.rating)>_baseRk)filtered.push({combo:o.combo,kill:b.rating,req:calcSolverMinStat(o.combo,hexId),eggAssign:b.eggAssign||null,assign:b.assign,defend:b.defend,finIdx:b.finIdx,...(T===1&&b.rating!=='gold'?{orderSearch:o}:{})});
}
if(!_hasPriDmg&&_hasEggGoal&&planType!=='kill_mercy_clear'&&dmgParts.length<SOLVER_ROUND_SIZE&&_baseRk<2){
for(const t of TENSION){
if(combo.length+t.eggs>SOLVER_ROUND_SIZE)break;
const prefix=makeEggOnPrefix(t.eggs);
const eggCombo=sortComboByPriority([...prefix,...combo]);
const eggOrd=findBestOrderedAssignment(eggCombo,hexId,mon,killTargets,t.mul,null,bat),eggBest=eggOrd.best;
if(eggBest.rating&&(getRankOrderValue(eggBest.rating)>_baseRk||(eggBest.rating==='orange'&&_baseRk===1))){
const eggReq=calcSolverMinStat(combo,hexId,t.mul);
filtered.push({combo:eggOrd.combo,kill:eggBest.rating,req:eggReq,multiOnly:t.eggs>=2,eggAssign:eggBest.eggAssign,assign:eggBest.assign,defend:eggBest.defend,finIdx:eggBest.finIdx});
}
}
}
if(!_hasPriDmg&&fource&&combo.length<SOLVER_ROUND_SIZE&&_baseRk<2&&_hasNonEl){
const fEls=getFourceEls(fource.jp)||[];
const fCombo=sortComboByPriority([makeFourceAction(fource),...combo]);
const fOrd=findBestOrderedAssignment(fCombo,hexId,mon,killTargets,1,fEls,bat),fBest=fOrd.best;
if(fBest.rating&&(getRankOrderValue(fBest.rating)>_baseRk||(fBest.rating==='orange'&&_baseRk===1))){
const fReq=calcSolverMinStat(combo,hexId,1,fource);
filtered.push({combo:fOrd.combo,kill:fBest.rating,req:fReq,eggAssign:fBest.eggAssign,assign:fBest.assign,defend:fBest.defend,finIdx:fBest.finIdx});
}
}
if(!_hasPriDmg&&fource&&_baseRk<2&&_hasNonEl){
const fEls=getFourceEls(fource.jp)||[];
for(const t of TENSION){
if(combo.length+t.eggs+1>SOLVER_ROUND_SIZE)break;
const eggPrefix=makeEggOnPrefix(t.eggs);
const fourceEntry=makeFourceAction(fource);
const efCombo=sortComboByPriority([...eggPrefix,fourceEntry,...combo]);
const efOrd=findBestOrderedAssignment(efCombo,hexId,mon,killTargets,t.mul,fEls,bat),efBest=efOrd.best;
if(efBest.rating&&(getRankOrderValue(efBest.rating)>_baseRk||(efBest.rating==='orange'&&_baseRk===1))){
const efReq=calcSolverMinStat(combo,hexId,t.mul,fource);
filtered.push({combo:efOrd.combo,kill:efBest.rating,req:efReq,multiOnly:t.eggs>=2,eggAssign:efBest.eggAssign,assign:efBest.assign,defend:efBest.defend,finIdx:efBest.finIdx});
}
}
}
}else if(mon&&T===1&&!isMetal){
const req=calcSolverMinStat(combo,hexId);
_x12Add(combo);
filtered.push({combo:finisherLastOrder(combo,req?req.finIdx:combo.findIndex(v=>WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul)),kill:null,req});
if(!_hasPriDmg&&_hasEggGoal&&planType!=='kill_mercy_clear'&&combo.length<SOLVER_ROUND_SIZE){
for(const t of TENSION){
if(combo.length+t.eggs>SOLVER_ROUND_SIZE)break;
const eggReq=calcSolverMinStat(combo,hexId,t.mul);
if(eggReq&&eggReq.min<=999&&(!req||req.fixedFinisher||eggReq.min<req.min)){
const prefix=makeEggOnPrefix(t.eggs);
filtered.push({combo:sortComboByPriority([...prefix,...finisherLastOrder(combo,eggReq.finIdx)]),kill:null,req:eggReq,multiOnly:t.eggs>=2});
}
}
}
if(!_hasPriDmg&&fource&&combo.length<SOLVER_ROUND_SIZE&&_hasNonEl){
const fReq=calcSolverMinStat(combo,hexId,1,fource);
if(fReq&&fReq.min<=999&&(!req||req.fixedFinisher||fReq.min<req.min)){
const fCombo=sortComboByPriority([makeFourceAction(fource),...finisherLastOrder(combo,fReq.finIdx)]);
filtered.push({combo:fCombo,kill:null,req:fReq});
}
}
if(!_hasPriDmg&&fource&&_hasNonEl){
for(const t of TENSION){
if(combo.length+t.eggs+1>SOLVER_ROUND_SIZE)break;
const efReq=calcSolverMinStat(combo,hexId,t.mul,fource);
if(efReq&&efReq.min<=999&&(!req||req.fixedFinisher||efReq.min<req.min)){
const eggPrefix=makeEggOnPrefix(t.eggs);
const fourceEntry=makeFourceAction(fource);
filtered.push({combo:sortComboByPriority([...eggPrefix,fourceEntry,...finisherLastOrder(combo,efReq.finIdx)]),kill:null,req:efReq,multiOnly:t.eggs>=2});
}
}
}
}else{
let _mCombo=combo,_mBest=useStats&&isMetal?findBestAssignment(combo,hexId,mon,killTargets,1,null,bat):null,_mercyRecovered=false;
if(_mBest&&!_mBest.rating&&killTargets&&killTargets.length&&T>1){
let _alt=metalClearReorder(combo,killTargets,hexId,undefined,bat);
if(!_alt){
_alt=_recoverMercy(combo,visit=>metalClearReorder(combo,killTargets,hexId,
nc=>visit(nc)?{done:true}:null,bat));
_mercyRecovered=!!_alt;
}
if(!_alt)continue;
_mCombo=_alt.combo;_mBest=_alt.best;
}
const _kill=_mBest&&_mBest.rating||(isMetal?'metal':null);
const _mAssign=_mBest&&_mBest.assign||undefined;
const _entry={combo:_mCombo,kill:_kill,req:null,
assign:_mAssign,...(_mercyRecovered?{eggAssign:_mBest.eggAssign,defend:_mBest.defend}:{})};
filtered.push(_entry);
let _offRk=2;
if(!useStats&&(solverMultiPlayerEnabled()||!isMultiTargetOnly(_mCombo))){
const cp=_e323Best(_mCombo,_offRanks),k=_e323Key(_mCombo);
if(cp<2){const p=_offProve(_entry).proof;_offRk=Math.max(cp,p?getRankOrderValue(p.rating):0);}
_offRanks.set(k,Math.max(_offRanks.get(k)||0,_offRk));
}
if(useStats?_kill!=='gold':_offRk<2)_x12Add(combo,useStats?new Set():_offProve(_entry).kills);
}
}
for(const entry of filtered){
if(!entry.multiOnly)entry.multiOnly=isMultiTargetOnly(entry.combo);
}
if(!solverMultiPlayerEnabled()){
for(let i=filtered.length-1;i>=0;i--)if(filtered[i].multiOnly)filtered.splice(i,1);
}
if(canFilter&&hexId&&(killTargets||T===1)){
const _tgN=killTargets?killTargets.length:1;
for(const entry of filtered){
const orderSearch=entry.orderSearch;delete entry.orderSearch;
if(entry.kill==='gold')continue;
const dmgIdx=[],dmgSk=[];
for(let i=0;i<entry.combo.length;i++){
if(entry.combo[i].at>0){dmgIdx.push(i);dmgSk.push(entry.combo[i]);}
}
const canTG=_tgN>=2;
if(dmgSk.length===0||(dmgSk.length<=1&&!canTG))continue;
let bestCombo=entry.combo,bestRating=entry.kill,bestEgg=entry.eggAssign,bestCharAssign=entry.assign,bestDefend=entry.defend;
const adopt=(c,b,r=b.rating)=>{bestCombo=c;bestRating=r;bestEgg=b.eggAssign;bestCharAssign=b.assign;bestDefend=b.defend;};
const mercyOrders=[],tried=[],triedKills=new Map();
const evalCombo=(perm,tgs)=>{
let testCombo=entry.combo.slice();
for(let j=0;j<perm.length;j++){
const tg=tgs?tgs[j]:undefined;
testCombo[dmgIdx[j]]=tg===undefined?perm[j]:Object.assign({},perm[j],{tgtGroup:tg});
}
testCombo=sortComboByPriority(testCombo);
if(planType==='mercy_first')mercyOrders.push(testCombo);
tried.push(testCombo);
const prior=orderSearch&&orderSearch.orders.get(JSON.stringify(testCombo));
let pBest;
if(prior){pBest=prior.best;triedKills.set(testCombo,prior.kills);}
else{
_x12Kills={c:testCombo,k:new Set()};
pBest=findBestAssignment(testCombo,hexId,mon,killTargets,1,null,bat);
triedKills.set(testCombo,_x12Kills.k);_x12Kills=null;
if(orderSearch)orderSearch.orders.set(JSON.stringify(testCombo),{combo:testCombo,best:pBest,kills:triedKills.get(testCombo)});
}
if(getRankOrderValue(pBest.rating)>getRankOrderValue(bestRating)){
adopt(testCombo,pBest);
}
return bestRating==='gold';
};
let done=false;const perms=[];
const noPri=!entry.combo.some(v=>_actionPri(v)!==0);
const sameLock=dmgSk.every(v=>!getSkillClassLock(v));
const batchMode=noPri&&sameLock&&dmgSk.length>1;
const visit=perm=>{
if(_metalSupNeed>0){let seen=false;for(const v of perm){if(isMetalExecutionAction(v))seen=true;else if(seen)return false;}}
perms.push(perm);if(batchMode)return false;return done=evalCombo(perm,null);
};
if(orderSearch&&orderSearch.complete){
const positions=new Map();
for(const v of dmgSk){const key=JSON.stringify(v);if(!positions.has(key))positions.set(key,positions.size);}
for(const prior of orderSearch.orders.values()){tried.push(prior.combo);triedKills.set(prior.combo,prior.kills);}
tried.sort((a,b)=>{
for(const i of dmgIdx){const n=positions.get(JSON.stringify(a[i]))-positions.get(JSON.stringify(b[i]));if(n)return n;}
return 0;
});
}else{
if(!permuteComboSlots(entry.combo,v=>v.at>0,v=>solverWeaponVariantKey([v]),(nc,prev)=>priOrderOK(nc)?{done:visit(dmgIdx.map(i=>nc[i]))}:prev))visit(dmgSk);
if(!perms.length)continue;
}
if(batchMode&&perms.length>1){
const chars=readCharStatsFromDom();
const allIdx=[];for(let ii=0;ii<chars.length;ii++)allIdx.push(ii);
const permCombos=perms.map(perm=>{const tc=entry.combo.slice();for(let j=0;j<perm.length;j++)tc[dmgIdx[j]]=perm[j];return tc;});
if(planType==='mercy_first')for(const tc of permCombos)mercyOrders.push(tc);
for(const tc of permCombos)tried.push(tc);
const permKeys=permCombos.map(tc=>JSON.stringify(tc));
const permBests=[];const killSets=[];const needsEval=[];
for(let pi=0;pi<perms.length;pi++){
const prior=orderSearch&&orderSearch.orders.get(permKeys[pi]);
if(prior){permBests.push(prior.best);killSets.push(prior.kills);triedKills.set(permCombos[pi],prior.kills);needsEval.push(false);}
else{permBests.push(null);killSets.push(new Set());needsEval.push(true);}
}
if(needsEval.some(Boolean)){
const allVisited=!forEachSolverAssignment(entry.combo,chars,(assign)=>{
for(let pi=0;pi<perms.length;pi++){
if(!needsEval[pi])continue;
if(permBests[pi]&&getRankOrderValue(permBests[pi].rating)===2)continue;
_x12Kills={c:permCombos[pi],k:killSets[pi]};
const out={};
const rating=checkSolverDamage(permCombos[pi],hexId,mon,killTargets,1,null,out,assign,undefined,chars);
_x12Kills=null;
if(rating){
const rk=getRankOrderValue(rating);
if(!permBests[pi]||rk>getRankOrderValue(permBests[pi].rating))
permBests[pi]={rating,assign:assign.slice(),eggAssign:out.eggAssign||null,finIdx:out.finIdx,defend:allIdx.filter(ii=>!assign.includes(ii))};
if(rk===2){
if(!_solverGoldState.gold)verifySolverConditionParty(permCombos[pi],killTargets,hexId,bat,chars,assign,1,null,out.eggAssign,false,out,rating);
return true;
}
}
}
return false;
});
for(let pi=0;pi<perms.length;pi++){
if(!needsEval[pi])continue;
triedKills.set(permCombos[pi],killSets[pi]);
if(allVisited||(permBests[pi]&&permBests[pi].rating==='gold')){
const best=permBests[pi]||{rating:null,assign:null,defend:allIdx.slice(),eggAssign:null};
if(orderSearch)orderSearch.orders.set(permKeys[pi],{combo:permCombos[pi],best,kills:killSets[pi]});
}
}
}
for(let pi=0;pi<perms.length;pi++){
const pb=permBests[pi];
if(pb&&getRankOrderValue(pb.rating)>getRankOrderValue(bestRating))adopt(permCombos[pi],pb);
}
done=bestRating==='gold';
}else if(batchMode&&!done){
for(const perm of perms){if(evalCombo(perm,null)){done=true;break;}}
}
if(T>1){
if(!done&&canTG&&!isMetal){
let budget=216;
outer:
for(const perm of perms){
const opts=perm.map(v=>{
const sk=lookupSkill(v.jp);
if(!sk||sk.target!=='S'||v.soloGroup||v.tgtGroup!==undefined)return[undefined];
if(isMetalExecutionAction(v))return[undefined];
const o=[undefined];
for(let g=0;g<_tgN;g++)o.push(g);
return o;
});
if(opts.every(o=>o.length===1))continue;
const slots=perm.map(()=>0);
while(true){
let j=0;
while(j<slots.length&&++slots[j]>=opts[j].length){slots[j]=0;j++;}
if(j>=slots.length)break;
const tgs=slots.map((sv,k)=>opts[k][sv]);
if(evalCombo(perm,tgs))break outer;
if(--budget<=0)break outer;
}
}
}
if(bestRating!=='gold'&&_metalSupNeed===0){
const plan=planAFinisher(entry.combo,hexId,mon,killTargets,entry.combo.length<=SOLVER_ROUND_SIZE?SOLVER_ROUND_SIZE:SOLVER_MAX_ACTIONS,bat);
if(plan){adopt(plan.combo,plan,'gold');if(plan.multiOnly)entry.multiOnly=true;}
}
if(userDeft<mapDeft&&bestRating!=='gold'&&bestCombo.length<=SOLVER_ROUND_SIZE&&_metalSupNeed===0){
const _mercyIdx35=bestCombo.findIndex(v=>v.jp==='みのがす');
if(_mercyIdx35>=0&&killTargets&&killTargets.length>=2){
const _dmgOnly35=bestCombo.filter(v=>v.at>0);
if(_dmgOnly35.length>=2){
const _lastDmg35=_dmgOnly35[_dmgOnly35.length-1];
const _lastSk35=lookupSkill(_lastDmg35.jp);
if(_lastSk35&&_lastSk35.target==='A'
&&_lastSk35.at&&_lastSk35.at.length>=2&&_lastSk35.at[1]===0){
const plan35=planAFinisher(_dmgOnly35,hexId,mon,killTargets,bestCombo.length,bat);
if(plan35){
adopt(plan35.combo,plan35,'gold');
if(plan35.multiOnly)entry.multiOnly=true;
}
if(bestRating!=='gold'){
const _swap35=bestCombo.slice();
_swap35[_mercyIdx35]=ACT_EGG;
const _swBest35=findBestAssignment(_swap35,hexId,mon,killTargets,1,null,bat);
if(getRankOrderValue(_swBest35.rating)>getRankOrderValue(bestRating)){
adopt(_swap35,_swBest35);
}
}
}
}
}
}
}
if(bestRating!=='gold'&&!entry.combo.some(v=>WEAPON_META[v.equip]&&WEAPON_META[v.equip].wmul))
for(const tc of tried){
const dmg=tc.map((v,i)=>v.at>0?i:-1).filter(i=>i>=0);
for(const last of tc[tc.length-1].jp==='みのがす'?triedKills.get(tc):dmg.slice(-1))for(const o of _x12Of(tc[last])){
const n=tc.slice();n[last]={...tc[last],...o};
const b=findBestAssignment(n,hexId,mon,killTargets,1,null,bat);
if(getRankOrderValue(b.rating)>getRankOrderValue(bestRating))adopt(n,b);
}
if(bestRating==='gold')break;
}
if(entry.mercyPending&&getRankOrderValue(bestRating)){
const proof=verifySolverConditionParty(bestCombo,killTargets,hexId,bat,readCharStatsFromDom(),
bestCharAssign,1,null,bestEgg,true);
if(!proof||!solverMercyChipPrefixOK(proof.actionResults))bestRating=null;
else if(proof.rating==='gold')_solverGoldState.gold=true;
}
if(!getRankOrderValue(bestRating)){
const recovered=_recoverMercy(entry.combo,visit=>{for(const order of mercyOrders)if(visit(order))break;});
if(recovered){
adopt(recovered.combo,recovered.best);
}
}
entry.combo=bestCombo;
entry.kill=bestRating;
entry.eggAssign=bestEgg;
entry.assign=bestCharAssign;
entry.defend=bestDefend;
}
}
if(!useStats){
const ranks=new Map(),selected=new Map(),pending=[],goldKinds=new Set();
const order=filtered.map((e,i)=>i).sort((a,b)=>solverSpecialWeaponSlots(filtered[a].combo).length-solverSpecialWeaponSlots(filtered[b].combo).length||b-a);
for(const i of order){
const e=filtered[i],gate=_e323Key(e.combo),counterpart=_e323Best(e.combo,ranks);
if(counterpart===2){ranks.set(gate,2);continue;}
const found=_offProve(e),proof=found.proof,rank=proof?getRankOrderValue(proof.rating):0;
ranks.set(gate,Math.max(ranks.get(gate)||0,rank,counterpart));
if(!proof){pending.push(e);continue;}
if(rank<=counterpart)continue;
selected.set(e,found);goldKinds.add(!!proof.fallbackKind);
}
const orangeKinds=new Set(_solverGoldState.gold?[]:[false,true].filter(kind=>!goldKinds.has(kind)));
if(orangeKinds.size)for(const e of pending){
const counterpart=_e323Best(e.combo,ranks);
if(counterpart===2)continue;
const found=_offProve(e,orangeKinds),proof=found.proof,rank=proof?getRankOrderValue(proof.rating):0,gate=_e323Key(e.combo);
ranks.set(gate,Math.max(ranks.get(gate)||0,rank,counterpart));
if(proof&&rank>counterpart)selected.set(e,found);
}
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i],found=selected.get(e);
if(!found){filtered.splice(i,1);continue;}
const proof=found.proof;
e.combo=found.combo;
e.conditionProof=proof;
if(found.state&&found.state.deferBounds)e.conditionState=found.state;
e.fallbackKind=proof.fallbackKind;
e.assign=proof.assign;e.eggAssign=proof.eggAssign;
e.r1Removal=proof.r1Removal;e.finIdx=proof.finIdx;
e.mainKillCI=e.conditionState?proof.finIdx:solverMainKillCI(proof.actionResults);
e.restClearCI=solverRestClearCI(proof.actionResults);
e.defend=[0,1,2,3].filter(ci=>!proof.assign.includes(ci));
e.kill=null;
}
}else{
const chars=readCharStatsFromDom();
for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i];
if(e.kill==='orange'&&_solverGoldState.gold){filtered.splice(i,1);continue;}
const p=verifySolverConditionParty(e.combo,_offTargets,hexId,bat,chars,e.assign,1,null,e.eggAssign,true);
if(!p){filtered.splice(i,1);continue;}
e.kill=p.rating;e.eggAssign=p.eggAssign;e.r1Removal=p.r1Removal;
e.battleProof=p;e.finIdx=p.finIdx;
e.mainKillCI=solverMainKillCI(p.actionResults);
e.restClearCI=solverRestClearCI(p.actionResults);
e.fallbackKind=p.fallbackKind;
if(p.rating==='gold')_solverGoldState.gold=true;
}
const ranks=new Map(_e323Ranks),drop=new Set();
for(const e of filtered.slice().sort((a,b)=>solverSpecialWeaponSlots(a.combo).length-solverSpecialWeaponSlots(b.combo).length)){
const cp=_e323Best(e.combo,ranks),rank=getRankOrderValue(e.kill),k=_e323Key(e.combo);
ranks.set(k,Math.max(ranks.get(k)||0,rank,cp));
if(rank<=cp)drop.add(e);
}
for(let i=filtered.length-1;i>=0;i--)if(drop.has(filtered[i]))filtered.splice(i,1);
}
const _anyRated=filtered.length>0;
if(_solverGoldState.gold)for(let i=filtered.length-1;i>=0;i--){
const e=filtered[i],rating=useStats?e.kill:e.conditionProof&&e.conditionProof.rating;
if(rating!=='gold')filtered.splice(i,1);
}
{
const _sigOf=(e)=>e.combo.map(v=>v.jp+(v.tgtGroup!==undefined?'>'+v.tgtGroup:'')+(v.soloGroup?'!':'')+(v.equip?'@'+v.equip:'')).join('+')
+'|'+(e.eggAssign?Object.keys(e.eggAssign).sort().map(k=>k+':'+e.eggAssign[k]).join(','):'')+'|'+(e.fallbackKind||'');
const seenSig=new Map();
for(let i=0;i<filtered.length;i++){
const sig=_sigOf(filtered[i]);
if(seenSig.has(sig)){
const j=seenSig.get(sig);
if(getRankOrderValue(filtered[i].kill)>getRankOrderValue(filtered[j].kill))filtered[j]=filtered[i];
filtered.splice(i,1);i--;
}else seenSig.set(sig,i);
}
}
for(const entry of filtered){
entry.canAntiBlk=solverBlockRuleEnabled();
if(entry.fallbackKind||window._solverFallback||planType!=='kill_all'&&!entry.combo.some(v=>v.jp==='みのがす')||isMetal&&_nonMetalSups.some(g=>_effDeath(g)===0))entry.fallback=true;
}
filtered.sort((a,b)=>{
const fallbackDiff=+!!a.fallbackKind-+!!b.fallbackKind;
if(fallbackDiff)return fallbackDiff;
if(!useStats){
const rank=e=>e.conditionProof?getRankOrderValue(e.conditionProof.rating):0;
const diff=rank(b)-rank(a);
if(diff)return diff;
}
if(a.combo.length===1&&b.combo.length===1&&a.req&&b.req&&a.req.stat===b.req.stat){
if(a.req.min!==b.req.min)return a.req.min-b.req.min;
}
const ka=2-getRankOrderValue(a.kill);
const kb=2-getRankOrderValue(b.kill);
if(ka!==kb)return ka-kb;
{
const da=a.combo.filter(v=>v.at>0||v.jp==='みのがす').length;
const db=b.combo.filter(v=>v.at>0||v.jp==='みのがす').length;
if(da!==db)return da-db;
}
{
const ba=a.combo.filter(v=>v.at===0&&v.jp!=='みのがす').length;
const bb=b.combo.filter(v=>v.at===0&&v.jp!=='みのがす').length;
if(ba!==bb)return ba-bb;
}
{
const atA=a.mainKillCI>=0?a.combo[a.mainKillCI].at:0;
const atB=b.mainKillCI>=0?b.combo[b.mainKillCI].at:0;
if(atA!==atB)return atB-atA;
}
const ma=a.multiOnly?1:0;
const mb=b.multiOnly?1:0;
if(ma!==mb)return ma-mb;
return((a.req==null?void 0:a.req.min)||0)-((b.req==null?void 0:b.req.min)||0);
});
{
const statsOn=solverUseStatsEnabled();
const seen=new Set();
for(let i=0;i<filtered.length;i++){
const e=filtered[i];
const actionSig=solverComboActionSignature(e.combo);
let outcomeSig='';
if(statsOn&&_simTargets){
outcomeSig=e.battleProof.pathSig;
}
e.outcomeSig=outcomeSig;
const reqSig=e.req?(e.req.posLabel||e.req.label||''):'';
const sig=[e.kill||'',reqSig,e.r1Removal===undefined?'':+!!e.r1Removal,
JSON.stringify(e.eggAssign||null),JSON.stringify(e.assign||null),JSON.stringify(e.defend||null),
actionSig,outcomeSig,JSON.stringify(e.conditionProof||null)].join('\x1d');
if(seen.has(sig)){filtered.splice(i,1);i--;}
else seen.add(sig);
}
}
if(filtered.length===0)return _emptyResult(_anyRated);
window._solverFallback=filtered.every(e=>e.fallback&&!e.fallbackKind);
const SHOW_INIT=5,SHOW_MAX=30;
const displayList=mergeSolverPlanVariants(filtered,hexId);
const shownList=displayList.slice(0,SHOW_MAX);
const bucketId='sb'+(window._solverBucketId++);
window._solverBuckets=window._solverBuckets||{};
const rowOf=({entry:v,sameCount})=>{
if(v.conditionState){
const state=v.conditionState;
if(!Object.prototype.hasOwnProperty.call(state,'proof'))state.proof=finalizeSolverConditionProof(v.combo,_offTargets,hexId,bat,state.raw,state.tension,state.fEls);
v.conditionProof=state.proof;delete v.conditionState;
}
return{
combo:v.combo,killTargets:_simTargets,
eggAssign:v.eggAssign,assign:v.assign,
defend:v.defend,
...(v.fallback?{fallback:true}:{}),
...(v.fallbackKind?{fallbackKind:v.fallbackKind}:{}),
...(sameCount===undefined?{}:{sameCount}),
outcomeSig:v.outcomeSig||'',battleProof:useStats?v.battleProof:null,
neutralConditions:useStats?null:buildSolverNeutralConditions(v,_simTargets,bat,
v.combo.length>SOLVER_ROUND_SIZE?(v.r1Removal?tc2:0):null)};
};
const renderOne=(e,hidden)=>{
const{combo,kill,eggAssign}=e;
const cid=window._solverComboId++;
window._solverComboMap[cid]=rowOf({entry:e});
if(e.planVariants){
const picked=pickSolverPlanVariants(e.planVariants,useStats),own=solverExactSkillKey(combo);
window._solverComboMap[cid].planVariants=picked.filter(p=>solverExactSkillKey(p.entry.combo)===own).map(rowOf);
window._solverComboMap[cid].skillVariants=picked.filter(p=>solverExactSkillKey(p.entry.combo)!==own).map(rowOf);
}
const proof=useStats?e.battleProof:e.conditionProof;
const parts=combo.map((v,ci)=>{
const name=useJP?v.jp:v.en;
let s='<span style="color:#ccc;">'+name+'</span>';
const miss=proof&&(proof.actionResults||[]).some(row=>row.ci===ci&&row.miss);
const note=(v.note||'').replace(/💨/g,'')+(miss?'💨':'');
if(note)s+='<span style="font-size:9px;">'+note+'</span>';
if(eggAssign&&eggAssign[ci]){
const tLv=getTensionLevel(eggAssign[ci]);
s+='<span style="color:#ff0;font-size:8px;">⊕T'+tLv+'</span>';
}
return s;
});
let tag='';
if(kill==='gold')tag=' <span style="color:#ffd700;font-size:9px;">★</span>';
else if(kill==='orange')tag=' <span style="color:#f80;font-size:9px;">☆</span>';
if(e.fallback)tag+=SOLVER_ROW_FALLBACK_TAG[e.fallbackKind||''];
let comboHtml;
if(isRound2&&parts.length>SOLVER_ROUND_SIZE){
const tc=e.r1Removal?tc2:0;
const transSkill=' <span style="color:#f80;font-weight:bold;font-size:9px;">⮕'+L06+'(+'+tc+')</span> ';
comboHtml=parts.slice(0,SOLVER_ROUND_SIZE).join(' + ')+transSkill+parts.slice(SOLVER_ROUND_SIZE).join(' + ');
}else{
comboHtml=parts.join(' + ');
}
const disp=hidden?'display:none;':'';
const neutralDetails=useStats?'':renderSolverNeutralDetails(window._solverComboMap[cid]);
if(!useStats){
const summary=renderSolverConditionSummary(window._solverComboMap[cid].neutralConditions);
if(summary)tag+=' <span data-neutral-condition-summary="1" style="color:#39C5BB;font-size:9px;">'+summary+'</span>';
}
return'<div class="'+bucketId+'_row" style="'+disp+(!useStats?'white-space:nowrap;':'')+'font-size:10px;margin-left:16px;color:#aaa;cursor:pointer;" onclick="expandCombo('+cid+')">'
+comboHtml+tag+' <span style="color:#555;font-size:8px;">▶'+L07+'</span></div>'
+'<div id="combo_detail_'+cid+'" style="display:none;">'+neutralDetails+'</div>';
};
const blkGate=monBlock>0&&shownList.length>0&&!shownList.some(e=>e.canAntiBlk);
const lines=shownList.map((e,i)=>renderOne(e,blkGate||i>=SHOW_INIT));
const init=Math.min(SHOW_INIT,shownList.length);
window._solverBuckets[bucketId]={shown:blkGate?0:init,total:shownList.length,init,blocked:blkGate};
if(shownList.length>SHOW_INIT){
const remain=shownList.length-SHOW_INIT;
lines.push('<div id="'+bucketId+'_more" style="'+(blkGate?'display:none;':'')+'font-size:9px;margin-left:16px;color:#39C5BB;cursor:pointer;text-decoration:underline;" onclick="showMoreCombos(\''+bucketId+'\')">+'+remain+L09+'</div>');
}
if(blkGate)lines.unshift('<div id="'+bucketId+'_blk" style="font-size:10px;margin-left:16px;color:#08c;cursor:pointer;" onclick="showBlockFallback(\''+bucketId+'\')">'+L17+'</div>');
const shownRound2=shownList.slice(0,SHOW_INIT).some(e=>e.combo.length>SOLVER_ROUND_SIZE);
if(shownRound2)lines.unshift('<div style="font-size:9px;margin-left:16px;color:#f80;">'+L08+'</div>');
return lines.join('');
}catch(e){console.error('[Solver]',e);window._solverSolvable=null;return'<div style="color:#f44;font-size:9px;">⚠ Solver error</div>';}
finally{if(--_solverRenderDepth===0)_solverGoldState=null;}
}
