const TILE_SIZE=22;
const COLORS={
0:'#f5f0e0',
2:'#e8e0c8',
4:'#4c4',
5:'#f44',
6:'#ffd700',
8:'#ccd8c0'
};
const WALL_COLOR='#000';
let mapData=null;
let activeFloor=0;
function calculate(){
const seedStr=uiVal('seed').trim();
const seed=parseInt(seedStr,16);
const rank=parseInt(uiVal('rank'));
if(isNaN(seed)||seed<0||seed>0x7FFF||!/^[0-9a-fA-F]{1,4}$/.test(seedStr)){
mapData=null;
renderResult(C17);
return;
}
if(mapData&&mapData.floorCount>0&&mapData.MapSeed===seed&&mapData.MapRank===rank){
switchFloor(0);
return;
}
const nextMap=new GrottoDetail();
nextMap.MapSeed=seed;
nextMap.MapRank=rank;
nextMap.calculateDetail();
mapData=nextMap;
activeFloor=0;
renderResult();
}
const MAP_DROP_SLOTS=Array.from({length:5},(_,bk)=>({gIdx:0,bk,rareThreshold:dropATThreshold(DEFAULT_RARE_RATE),normalThreshold:dropATThreshold(DEFAULT_NORMAL_RATE)}));
function calcR2N2(seed){
const result={r2:-1,r2_3:-1,n2:-1};
let rng=seed>>>0;
for(let start=1;start<=400;start++){
const{rareHits,normHits}=simulateDropSlots(rng,MAP_DROP_SLOTS,false);
if(result.r2===-1&&siMatchesPattern(rareHits,SI_PATTERN_INDICES.R2))result.r2=start;
if(result.r2_3===-1&&siMatchesPattern(rareHits,SI_PATTERN_INDICES.R2_3))result.r2_3=start;
if(result.n2===-1&&siMatchesPattern(normHits,SI_PATTERN_INDICES.N2))result.n2=start;
if(result.r2!==-1&&result.r2_3!==-1&&result.n2!==-1)break;
rng=lcg(rng);
}
return result;
}
function renderResult(errorMessage=C18){
const el=byId('map_summary');
const hasMap=!!(mapData&&mapData.floorCount>0);
byId('map_box_label').textContent=hasMap?C08:'';
for(const id of['map_box_label','map_box_total'])byId(id).style.display=hasMap?'':'none';
if(!hasMap){
el.innerHTML='<div class="error" data-i18n="'+(errorMessage===C17?'C17':'C18')+'">'+errorMessage+'</div>';
byId('map_box_counts').innerHTML='';
byId('map_box_total').textContent='';
byId('map_floors').innerHTML='';
return;
}
const seedHex=hex4(mapData.MapSeed);
const rStr=hex2(mapData.MapRank);
const locData=calcLocations(mapData.MapSeed,rStr);
let locHtmlString='';
if(locData.outputOrder.length>0){
const locStrings=locData.outputOrder.map(item=>{
if(item.timer===QUEST015)return`<span style="color:#F88;">${hex2(item.location)} (Quest)</span>`;
const bqs=Array.from(locData.seenLocations[item.location]);
return`${hex2(item.location)} (${formatRanges(bqs)})`;
});
locHtmlString=locStrings.join('<br>');
}else{
locHtmlString=C19;
}
const atValues=[35,36,37].map(i=>atFromRng(advanceATRng(mapData.MapSeed,i)));
const atHtmlString=`[35] ${atValues[0]}<br>[36] ${atValues[1]}<br>[37] ${atValues[2]}`;
const rn=calcR2N2(mapData.MapSeed);
const fmtRN=v=>v===-1?`<span style="color:#555;">—</span>`:`<span style="color:#0f0;">${v}</span>`;
const rnHtml=`<span style="color:#f88;">[R2] ${fmtRN(rn.r2)}</span><br><span style="color:#f88;">[+3] ${fmtRN(rn.r2_3)}</span><br><span style="color:#8cf;">[N2] ${fmtRN(rn.n2)}</span>`;
const wSum=calcWalkCostUpToFloor(mapData,mapData.floorCount);
const wHtml=wSum!==null?`<span style="color:#ffc90e;">${fmtStep(wSum)}</span>`:`<span style="color:#555;">—</span>`;
const boxData=mapData.getMapBoxCounts();
const boxCounts=boxData.counts;
const totalBoxes=boxData.total;
let boxCountHtmlArr=[];
for(let r=10;r>=1;r--){
if(boxCounts[r]>0){
boxCountHtmlArr.push(`<span style="margin-right:5px;display:inline-flex;align-items:center;gap:3px;font-size:12px;"><span class="rank-${CHEST_RANK[r]}" style="color:#000;font-size:9px;font-weight:700;width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;border-radius:2px;">${CHEST_RANK[r]}</span><span style="color:#fff;font-weight:500;">${boxCounts[r]}</span></span>`);
}
}
let boxString=boxCountHtmlArr.length>0?boxCountHtmlArr.join(''):'<span style="color:#888;">'+C09+'</span>';
const nm=(l,a,b)=>`<span style="display:inline-flex;align-items:flex-start;"><span>${l}:&nbsp;</span><strong style="line-height:1.4;"><span style="display:block;color:#ffd700">${a}</span><span style="display:block;color:#ffd700">${b}</span></strong></span>`;
const col=(l,c,ta,h)=>`<span style="display:inline-block;vertical-align:top;border-left:1px dashed #4a4a8a;padding-left:10px;margin-left:4px;">${l}:
<strong style="display:block;${c}font-family:monospace;font-size:12px;margin-top:2px;${ta}">${h}</strong>
</span>`;
let html=`<div class="info-bar">
<span>Rank: <strong>${rStr}</strong></span>
<span>Seed: <strong>${seedHex}</strong></span>
${nm(C01,mapData.mapName,mapData.mapNameJP)}
${nm(C02,mapData.mapTypeName,mapData.mapTypeNameJP)}
<span>${C03}: <strong>${mapData.monsterRank}</strong></span>
<span>${C04}: <strong>${mapData.floorCount}</strong></span>
${nm('Boss',mapData.bossName,mapData.bossNameJP)}

${col(C05,'color:#0ff;','',locHtmlString)}
${col(C06,'color:#4c4;','text-align:left;',atHtmlString)}
${col(C07,'','text-align:left;',rnHtml)}
${col('A*','','text-align:left;',wHtml)}
</div>
`;
el.innerHTML=html;
byId('map_box_counts').innerHTML=boxString;
byId('map_box_total').textContent=`📦 ${totalBoxes}`;
html='<div class="floor-tabs">';
const ELIST_TAB_COLORS={none:'#c0c0c0',only:'#FFC90E',reduced:'#B5E61D',partial:'#00A2E8'};
for(let i=0;i<mapData.floorCount;i++){
let tabStyle='';
const einfo=getFloorElistInfo(mapData,i);
if(einfo.state){
const c=ELIST_TAB_COLORS[classifyElistState(einfo.state).kind]||null;
if(c)tabStyle=` style="background:${c};color:#000;border-color:${c}"`;
}
html+=`<div class="floor-tab${i===activeFloor?' active':''}"${tabStyle} onclick="switchFloor(${i})">B${i+1}F</div>`;
}
html+='</div>';
html+='<div class="floor-content" id="floor-content"></div>';
byId('map_floors').innerHTML=html;
renderFloor(activeFloor);
}
function switchFloor(f){
activeFloor=f;
document.querySelectorAll('.floor-tab').forEach((t,i)=>t.classList.toggle('active',i===f));
renderFloor(f);
}
function getCanvasTilePoint(canvas,event){
const rect=canvas.getBoundingClientRect();
const point=event.touches&&event.touches[0]||event.changedTouches&&event.changedTouches[0]||event;
return{
x:Math.floor((point.clientX-rect.left)/TILE_SIZE),
y:Math.floor((point.clientY-rect.top)/TILE_SIZE),
};
}
function renderFloor(f){
const container=byId('floor-content');
const w=mapData.getFloorWidth(f);
const h=mapData.getFloorHeight(f);
const map=mapData.getFloorMap(f);
const up=mapData.getUpStair(f);
const down=mapData.getDownStair(f);
const boxCount=mapData.getBoxCount(f);
const canvasW=w*TILE_SIZE;
const canvasH=h*TILE_SIZE;
let infoHtml='<div class="floor-info">';
infoHtml+=`<h3>B${f+1}F</h3>`;
infoHtml+='<table>';
infoHtml+=`<tr><td>${C10}</td><td>${w} × ${h}</td></tr>`;
infoHtml+=`<tr><td>${C11}</td><td>▲ (${up.x}, ${up.y})　${f<mapData.floorCount-1?'▼':'Boss'} (${down.x}, ${down.y})</td></tr>`;
const elistInfo=getFloorElistInfo(mapData,f);
let stateHtml=elistInfo.state?` <span style="background:#f4c;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:6px;white-space:nowrap;">${elistInfo.state}</span>`:'';
let dHtml=makeDBadge(elistInfo.dValue);
infoHtml+=`<tr><td>ElistOfs</td><td style="font-family:monospace;color:#4c4;">${elistInfo.hex}${stateHtml}${dHtml}</td></tr>`;
const envType=mapData._details[3];
let floorMR=floorMRAt(mapData._details[2],f);
const spawnList=getSpawnList(envType,floorMR);
const normals=spawnList.filter(e=>e.length===3);
const stCls=classifyElistState(elistInfo.state||'');
let grayFrom=normals.length;
if(stCls.kind==='reduced')grayFrom=stCls.count;
else if(stCls.kind==='none')grayFrom=0;
const onlyMonId=(ONLY_MONSTERS[envType]&&ONLY_MONSTERS[envType][floorMR])||'';
const isOnlyMode=(stCls.kind==='only');
let monsterSpans=normals.map((entry,i)=>{
if(!MONSTER_DB[entry[0]])return'';
const name=getMonsterDisplayName(entry[0]);
const isGray=isOnlyMode?(entry[0]!==onlyMonId):(i>=grayFrom);
const bg=isGray?'#1a1a2e':'#2a2a4a';
const fg=isGray?'#555':'#ddd';
return`<span class="mon-pill" style="color:${fg};background:${bg};">${name}</span>`;
}).filter(Boolean);
if(monsterSpans.length>0){
infoHtml+=`<tr><td>${C12}</td><td class="mon-td">${monsterSpans.join('')}</td></tr>`;
}
if(boxCount>0){
infoHtml+=`<tr><td>${C13}</td><td>${boxCount} <font color=#666>${C14}</font></td></tr>`;
for(let i=0;i<boxCount;i++){
const box=mapData.getBoxInfo(f,i);
const rn=CHEST_RANK[box.rank]||box.rank;
const[dispSolo,dispParty,dispPpap]=[1,2,4].map(s=>mapData.getBoxItem(f,i,s)[DISPLAY_LANG!=='EN'?1:0]||'?');
infoHtml+=`<tr><td>${C15} ${i+1}</td><td>
<div class="chest-row"><span class="chest-rank rank-${rn}">Rank ${rn}</span> (${box.x}, ${box.y})</div>
<div class="chest-item"><span class="chest-item-solo">Item (${STR_SOLO}): ${dispSolo}</span></div>
<div class="chest-item"><span class="chest-item-party">Item (${STR_PARTY}): ${dispParty}</span></div>
<div class="chest-item"><span class="chest-item-ppap">Item (PPAP): ${dispPpap}</span></div>
</td></tr>`;
}
}else{
infoHtml+=`<tr><td>${C15}</td><td>${C16}</td></tr>`;
}
infoHtml+='</table>';
infoHtml+='</div>';
container.innerHTML=`<div class="map-container"><canvas id="mapCanvas" width="${canvasW}" height="${canvasH}" title=""></canvas><div id="coordDisplay" style="position:absolute;bottom:4px;right:8px;font-size:11px;color:#aaa;font-family:monospace;pointer-events:none"></div></div>${infoHtml}`;
document.querySelector('.map-container').style.position='relative';
const mapCanvas=byId('mapCanvas');
const showMapCoordinate=(e)=>{
const{x:mx,y:my}=getCanvasTilePoint(mapCanvas,e);
const coordEl=byId('coordDisplay');
if(mx>=0&&mx<w&&my>=0&&my<h){
const tNames={0:D01,1:D02,2:D03,3:D02,4:C11,5:C11,6:C15,8:D04};
const tile=map[my][mx];
let label=tNames[tile]||`tile:${tile}`;
if(mx===up.x&&my===up.y)label=D05+'▲';
if(mx===down.x&&my===down.y)label=(f<mapData.floorCount-1)?D06+'▼':'Boss▼';
coordEl.textContent=`(${mx},${my}) ${label}`;
mapCanvas.style.cursor=boxPositions.has(mx+','+my)?'pointer':'default';
}else{
coordEl.textContent='';
mapCanvas.style.cursor='default';
}
};
mapCanvas.addEventListener('mousemove',showMapCoordinate);
mapCanvas.addEventListener('touchstart',showMapCoordinate,{passive:true});
mapCanvas.addEventListener('touchmove',showMapCoordinate,{passive:true});
const boxPositions=new Map();
for(let i=0;i<boxCount;i++){
const b=mapData.getBoxInfo(f,i);
boxPositions.set(b.x+','+b.y,{num:i+1,rank:b.rank});
}
mapCanvas.addEventListener('click',(e)=>{
const{x:mx,y:my}=getCanvasTilePoint(mapCanvas,e);
if(boxPositions&&boxPositions.has(mx+','+my)){
const boxObj=boxPositions.get(mx+','+my);
showChestTimer(f,boxObj.num-1,mx,my);
}
});
const canvas=byId('mapCanvas');
const ctx=canvas.getContext('2d');
ctx.fillStyle='#000';
ctx.fillRect(0,0,canvasW,canvasH);
for(let y=0;y<h;y++){
for(let x=0;x<w;x++){
let tile=map[y][x];
const px=x*TILE_SIZE;
const py=y*TILE_SIZE;
const isUpStair=(x===up.x&&y===up.y);
const isDownStair=(x===down.x&&y===down.y);
const boxObj=boxPositions.get(x+','+y)||null;
const isBox=!!boxObj;
let displayTile=tile;
if(isUpStair)displayTile=4;
else if(isDownStair)displayTile=5;
else if(isBox)displayTile=6;
else if(tile===4||tile===5||tile===6)displayTile=0;
if(displayTile===1||displayTile===3){
ctx.fillStyle=WALL_COLOR;
ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
}else{
ctx.fillStyle=COLORS[displayTile]||COLORS[0];
ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
ctx.strokeStyle='rgba(0,0,0,0.25)';
ctx.strokeRect(px+0.5,py+0.5,TILE_SIZE-1,TILE_SIZE-1);
}
ctx.textAlign='center';
ctx.textBaseline='middle';
if(isUpStair||isDownStair){
ctx.fillStyle='#000';
ctx.font='bold 12px sans-serif';
ctx.fillText(isUpStair?'▲':'▼',px+TILE_SIZE/2,py+TILE_SIZE/2);
}else if(isBox){
const chestLabel=(CHEST_RANK[boxObj.rank]||'?')+boxObj.num;
ctx.save();
ctx.fillStyle='#000';
ctx.font='11px sans-serif';
ctx.translate(px+TILE_SIZE/2,py+TILE_SIZE/2);
ctx.scale(1,1.35);
ctx.fillText(chestLabel,0,0);
ctx.restore();
}
}
}
ctx.fillStyle='rgba(0,0,0,0.3)';
ctx.font='9px monospace';
ctx.textAlign='center';
ctx.textBaseline='top';
for(let x=0;x<w;x++)ctx.fillText(x,x*TILE_SIZE+TILE_SIZE/2,2);
ctx.textBaseline='middle';
ctx.textAlign='left';
for(let y=0;y<h;y++)ctx.fillText(y,2,y*TILE_SIZE+TILE_SIZE/2);
}
function showChestTimer(floorIndex,boxIndex,x,y){
const modal=byId('chestModal');
const title=byId('chestModalTitle');
const body=byId('chestModalBody');
const boxInfo=mapData.getBoxInfo(floorIndex,boxIndex);
const rn=CHEST_RANK[boxInfo.rank]||boxInfo.rank;
title.textContent=`B${floorIndex+1}F ${C15} ${boxIndex+1} (Rank ${rn}) @ (${x}, ${y})`;
let results=[];
let currentStart=0;
let[currentItemEN,currentItemJP]=mapData.getBoxItem(floorIndex,boxIndex,0);
for(let s=1;s<=255;s++){
let[itemEN,itemJP]=mapData.getBoxItem(floorIndex,boxIndex,s);
if(itemEN!==currentItemEN){
results.push({start:currentStart,end:s-1,itemEN:currentItemEN,itemJP:currentItemJP});
currentStart=s;
currentItemEN=itemEN;
currentItemJP=itemJP;
}
}
results.push({start:currentStart,end:255,itemEN:currentItemEN,itemJP:currentItemJP});
let htmlEN='';
let htmlJP='';
results.forEach(res=>{
const rangeStr=res.start===res.end?(res.start+CHEST_TIMER_OFFSET).toString().padStart(3,'0'):`${(res.start+CHEST_TIMER_OFFSET).toString().padStart(3,'0')} ~ ${(res.end+CHEST_TIMER_OFFSET).toString().padStart(3,'0')}`;
const isHighlight=(res.start<=2&&res.end>=1);
const rowStyle=isHighlight?'background: rgba(255, 215, 0, 0.15);border-left: 3px solid #ffd700;padding-left: 8px;':'';
const textStyle=isHighlight?'color: #ffd700;font-weight: bold;':'';
const renderRow=item=>`<div class="timer-row" style="${rowStyle}">
<span class="timer-range" style="${textStyle}">${rangeStr}</span>
<span class="timer-item" style="${textStyle}">${item}</span>
</div>`;
htmlEN+=renderRow(res.itemEN);
htmlJP+=renderRow(res.itemJP);
});
body.style.padding='0';
body.style.overflowY='hidden';
body.style.display='flex';
body.style.flexDirection='column';
body.innerHTML=`<div class="modal-tabs"></div>
<div style="padding: 12px 16px;overflow-y: auto;flex: 1;">
<div id="ctListEN">${htmlEN}</div>
<div id="ctListJP">${htmlJP}</div>
</div>
`;
modal.style.display='flex';
switchTab('chest',DISPLAY_LANG!=='EN'?'JP':'EN');
}
const DW_L={
TW:{
name:md=>md.jp,mainFmt:md=>`${md.jp} (${md.en})`,
drop:l=>'掉'+l,book:(b,l)=>'書'+b+l,
tag:['主怪','跟班1','跟班2'],single:'單隻',
corr:n=>`→ 對照上表「${n===1?'1組':n+'組'}」表頭列`,
jr:(a,b)=>`判定 ${a}–${b}`,eq5:'＝上表 5 欄',no:'上表未列',
anchor:'Pattern 錨點（＝判定 1 的 AT 步數）：',
more:m=>`（共 ${m} 個，僅列前 12）`,
nf:'AT 38～2037 步內找不到符合的 Pattern 錨點',
bad:'Seed 需為 1～4 位十六進位',
hits:'命中：',leg:'R＝稀有命中　xN＝通常命中　xx＝落空',sep:'、',
nomon:'此 地形×FloorMR 組合無可選主怪。'
},
EN:{
name:md=>md.en,mainFmt:md=>md.en,
drop:l=>l?'D-'+l:'D',book:(b,l)=>'B'+b+l,
tag:['Main','Sup1','Sup2'],single:'Single',
corr:n=>`→ matches the "(${n===1?'1G':n+'G'})" header row above`,
jr:(a,b)=>`Judg. ${a}–${b}`,eq5:'= 5 cols above',no:'not in table',
anchor:'Pattern anchors (AT step of judgment 1): ',
more:m=>` (${m} total, first 12 shown)`,
nf:'No matching pattern anchor within AT steps 38–2037',
bad:'Seed must be 1–4 hex digits',
hits:'Hits: ',leg:'R = rare hit / xN = normal hit / xx = miss',sep:', ',
nomon:'No selectable main monster for this terrain × FloorMR.'
},
JP:{
name:md=>md.jp,mainFmt:md=>md.jp,
drop:l=>'落'+l,book:(b,l)=>'盗'+b+l,
tag:['メイン','お供1','お供2'],single:'単体',
corr:n=>`→ 上表「${n===1?'1ｸﾞﾙｰﾌﾟ':n+'ｸﾞﾙｰﾌﾟ'}」の見出し行に対応`,
jr:(a,b)=>`判定 ${a}–${b}`,eq5:'＝上表の5欄',no:'上表対象外',
anchor:'パターン錨点（＝判定1のATステップ）：',
more:m=>`（全 ${m} 件、先頭12件のみ表示）`,
nf:'AT 38～2037 の範囲に一致する錨点なし',
bad:'Seed は16進数 1～4 桁で入力',
hits:'命中：',leg:'R＝レア成立　xN＝通常成立　xx＝不成立',sep:'、',
nomon:'この地形×FloorMRでは選択可能なモンスターがいません。'
}
};
const DW_CLSC={cr:'#f88',ct:'#39C5BB',cy:'#ffd700',cp:'#c8c',ck:'#cc8'};
const _dwSel={TW:0,EN:0,JP:0};
const _dwTmr={};
function dwSupPool(envType,floorMR){return getEncounterSupportPool(envType,floorMR).supportPool.map(s=>s.hex);}
function dwInit(){
['TW','EN','JP'].forEach((L,li)=>{
const patSel=byId('dw_pat_'+L);
const langIndex=[1,0,2][li];
const envSel=byId('dw_env_'+L);
if(envSel)envSel.querySelectorAll('option').forEach((o,i)=>{if(ENV_OPTS[i])o.textContent=ENV_OPTS[i][langIndex];});
if(patSel){
patSel.innerHTML='<option value="none">----</option>';
appendPatternOptions(patSel,langIndex);
}
dwUpd(L);
});
}
function dwUpd(L){
const $=id=>byId(id+'_'+L);
const envEl=$('dw_env');
if(!envEl)return;
_dwSel[L]=0;
const envType=parseInt(envEl.value,10);
const floorMR=parseInt($('dw_mr').value,10);
const X=DW_L[L];
const monSel=$('dw_mon');
monSel.innerHTML='';
const spawnList=getSpawnList(envType,floorMR);
if(spawnList.length)appendSpawnMonsterOptions(monSel,spawnList,X.mainFmt);
const pool=dwSupPool(envType,floorMR);
['dw_sup1','dw_sup2'].forEach(id=>{
const sel=$(id);
if(!sel)return;
sel.innerHTML='<option value="">—</option>';
for(const hx of pool){
const md=MONSTER_DB[hx];
const opt=document.createElement('option');
opt.value=hx;
opt.textContent=md?X.name(md):hx;
sel.appendChild(opt);
}
});
dwRender(L);
}
function dwChanged(L){_dwSel[L]=0;dwRender(L);}
function dwRenderDeb(L){_dwSel[L]=0;clearTimeout(_dwTmr[L]);_dwTmr[L]=setTimeout(()=>dwRender(L),200);}
function dwSelStep(L,i){_dwSel[L]=i;dwRender(L);}
function dwRender(L){
const $=id=>byId(id+'_'+L);
const out=$('dw_out');
if(!out)return;
const X=DW_L[L];
const monHex=$('dw_mon').value;
if(!monHex){out.innerHTML=`<span style="color:#888;font-size:11px">${X.nomon}</span>`;return;}
const nameOf=hx=>{const md=MONSTER_DB[hx];return md?X.name(md):'?';};
const groups=[{name:nameOf(monHex),color:'#fff',tag:X.tag[0]}];
const s1=$('dw_sup1').value;
const s2=$('dw_sup2').value;
if(s1)groups.push({name:nameOf(s1),color:'#a8f',tag:X.tag[1]});
if(s2)groups.push({name:nameOf(s2),color:'#8cf',tag:X.tag[2]});
const n=groups.length;
const LET=['A','B','C'];
const BOOK_CLS=['','ct','cy','cp','ck'];
const slots=[];
forEachDropSlot(n,[1,1,1,1],(g,bk)=>{slots.push({lbl:bk?X.book(bk,n>1?LET[g]:''):X.drop(n>1?LET[g]:''),cls:bk?BOOK_CLS[bk]:'cr',g});});
const seedStr=($('dw_seed')?$('dw_seed').value:'').trim();
const patKey=$('dw_pat')?$('dw_pat').value:'none';
let scanHtml='',st=null;
if(seedStr&&patKey&&patKey!=='none'){
if(!/^[0-9A-Fa-f]{1,4}$/.test(seedStr)){
scanHtml=`<div style="color:#f66;font-size:11px;margin-bottom:4px">${X.bad}</div>`;
}else{
const seed=parseInt(seedStr,16)>>>0;
const rr=parseInt($('dw_rr').value,10);
const nr=parseInt($('dw_nr').value,10);
const lv=Math.min(99,Math.max(1,parseInt($('dw_lv').value,10)||99));
const tLvs=[lv,lv,lv,lv];
const evidence=scanDropPatternStarts(seed,patKey,buildDropSlots(n,rr,nr,tLvs),38,2037,60);
const matches=evidence.map(item=>item.start);
if(!matches.length){
scanHtml=`<div style="color:#f80;font-size:11px;margin-bottom:4px">${X.nf}</div>`;
}else{
const sel=Math.min(_dwSel[L],matches.length-1);
_dwSel[L]=sel;
const seq=evidence[sel].simulation.seq;
st=[];
let si=-1;
for(const e of seq){
if(e.type.indexOf('(R)')>=0){si++;st[si]=e.red?'R':'x';}
else if(e.red&&st[si]==='x')st[si]='N';
}
const chips=matches.slice(0,12).map((s,i)=>
`<span onclick="dwSelStep('${L}',${i})" style="cursor:pointer;padding:0 5px;border:1px solid ${i===sel?'#0f0':'#555'};border-radius:3px;color:${i===sel?'#0f0':'#aaa'};margin:0 3px 2px 0;display:inline-block">${s}</span>`).join('');
const moreTxt=matches.length>12?`<span style="color:#666;font-size:10px">${X.more(matches.length)}</span>`:'';
scanHtml=`<div style="font-size:11px;margin-bottom:4px;color:#0ca">${X.anchor}${chips}${moreTxt}</div>`;
}
}
}
let html=scanHtml+'<div style="margin-bottom:6px;font-size:12px">'+
groups.map((gr,i)=>`<span style="color:#0ff">${n>1?LET[i]:X.single}</span>＝<span style="color:${gr.color}">${gr.name}</span><span style="color:#666;font-size:10px">(${gr.tag})</span>`).join('　')+
`　<span style="color:#888;font-size:11px">${X.corr(n)}</span></div>`;
html+='<table class="h3t sm ctr" style="margin-bottom:4px">';
for(let r=0;r*5<slots.length;r++){
html+='<tr><td class="bg" style="width:18%">'+X.jr(r*5+1,r*5+5)+(
r===0?`<br><span style="color:#0ca;font-size:10px">${X.eq5}</span>`:`<br><span style="color:#666;font-size:10px">${X.no}</span>`)+'</td>';
for(let c=0;c<5;c++){
const s=slots[r*5+c];
let stat='',bg='';
if(st){
const v=st[r*5+c];
if(v==='R'){stat='<br><span class="cr b">R</span>';bg=';background:#2a0a0a';}
else if(v==='N'){stat='<br><span class="cc b">xN</span>';bg=';background:#0a2020';}
else stat='<br><span class="cx">xx</span>';
}
html+=`<td style="padding:4px${bg}"><span class="${s.cls} b">${s.lbl}</span><br><span style="color:${groups[s.g].color};font-size:11px">${groups[s.g].name}</span>${stat}</td>`;
}
html+='</tr>';
}
html+='</table>';
if(st){
const hitR=[],hitN=[];
st.forEach((v,i)=>{if(v==='R')hitR.push(i);else if(v==='N')hitN.push(i);});
const fmt=i=>`<span style="color:${DW_CLSC[slots[i].cls]};font-weight:bold">${slots[i].lbl}</span>·<span style="color:${groups[slots[i].g].color}">${groups[slots[i].g].name}</span>`;
html+=`<div style="font-size:11px;margin-bottom:2px"><span style="color:#0ca">${X.hits}</span><span style="color:#f88;font-weight:bold">R </span>${hitR.length?hitR.map(fmt).join(X.sep):'—'}　<span style="color:#ccc;font-weight:bold">N </span>${hitN.length?hitN.map(fmt).join(X.sep):'—'}<span style="color:#555;font-size:10px">　${X.leg}</span></div>`;
}
out.innerHTML=html;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dwInit);
else setTimeout(dwInit,0);
const MODAL_TAB_LABELS={TW:'繁體中文',EN:'English',JP:'日本語',SP:'SP'};
const MODAL_CONFIGS={
chest:{id:'chestModal',prefix:'ct',langs:['EN','JP']},
disclaimer:{id:'disclaimerModal',prefix:'disc',langs:['TW','EN','JP']},
h1:{id:'h1Modal',prefix:'h1',langs:['TW','EN','JP']},
h2:{id:'h2Modal',prefix:'h2',langs:['TW','EN','JP','SP']},
h3:{id:'h3Modal',prefix:'h3',langs:['TW','EN','JP']},
};
function switchTab(configKey,lang){
const config=MODAL_CONFIGS[configKey];
const bar=byId(config.id).querySelector('.modal-tabs');
if(!bar.firstChild)bar.innerHTML=config.langs.map(key=>`<div id="${config.prefix}Tab${key}" class="modal-lang-tab${key==='SP'?' modal-lang-tab-compact':''}" onclick="switchTab('${configKey}', '${key}')">${MODAL_TAB_LABELS[key]}</div>`).join('');
config.langs.forEach(key=>{
byId(config.prefix+'Tab'+key).classList.toggle('active',key===lang);
byId(config.prefix+'List'+key).hidden=key!==lang;
});
}
function openModal(configKey){
byId(MODAL_CONFIGS[configKey].id).style.display='flex';
switchTab(configKey,['TW','EN','JP'].includes(DISPLAY_LANG)?DISPLAY_LANG:'TW');
}
function closeConfiguredModal(configKey){
byId(MODAL_CONFIGS[configKey].id).style.display='none';
}
window.addEventListener('DOMContentLoaded',()=>{
const schedule=window.requestIdleCallback?(fn)=>window.requestIdleCallback(fn,{timeout:200}):(fn)=>setTimeout(fn,16);
let next=0;
const step=deadline=>{
const started=performance.now();
do{
next+=16;
if(advanceBqCountFeasibility(next))return;
}while(performance.now()-started<4&&(!deadline||deadline.timeRemaining()>1));
schedule(step);
};
schedule(step);
});
window.addEventListener('DOMContentLoaded',()=>{
function populateDropdownObj(selectId,dataObj,nameIdx1,nameIdx2){
let selectElement=byId(selectId);
if(!selectElement)return;
Object.keys(dataObj).forEach(key=>{
let item=dataObj[key];
let option=document.createElement("option");
option.value=key;
option.text=`${item[nameIdx1]} ${item[nameIdx2]}`;
selectElement.appendChild(option);
});
}
MAP_RANK.forEach(r=>{const h=hex2(r),d=r===0xDD;byId('rank').add(new Option(h,'0x'+h,d,d));byId('mrt_inRank').add(new Option(h,h,d,d));});
populateDropdownObj('cond_prefix',PREFIX_NAMES,0,1);
populateDropdownObj('cond_suffix',SUFFIX_NAMES,0,1);
populateDropdownObj('cond_locale',LOCALE_NAMES,0,1);
populateDropdownObj('cond_env',ENV_NAMES,0,1);
populateDropdownObj('cond_boss',BOSS_NAMES,0,2);
const boxRow=document.querySelector('.chest-count-row');
for(let r=10;r>=1;r--)boxRow.insertAdjacentHTML('beforeend',`<label>${CHEST_RANK[r]} <input type="number" id="cond_box_${CHEST_RANK[r]}" min="0" max="40" class="cbox-in"></label>`);
const anomOpts=o=>Object.entries(o).map(([k,v])=>`<option value="${k}" data-i18n="${v.i18n}"></option>`).join('');
byId('cond_anomaly').insertAdjacentHTML('beforeend',anomOpts(ANOM_RULE)+'<option disabled>─────</option>'+anomOpts(USP_FAST_MODES));
let topIds=["0B5","01B","0B9"];
let seenIds=new Set(topIds);
let envOrder=[1,2,3,4,5];
let sel=byId('cond_only_mon');
if(sel){
const createOpt=(id)=>{
let opt=document.createElement('option');
let data=MONSTER_DB[id];
opt.value=data.en;
opt.textContent=`${data.en} ${data.jp}`;
return opt;
};
const addSep=()=>{
let s=document.createElement('option');
s.disabled=true;
s.textContent="──────────";
sel.appendChild(s);
};
topIds.forEach(id=>sel.appendChild(createOpt(id)));
addSep();
envOrder.forEach((env,idx)=>{
let added=false;
ONLY_MONSTERS[env].forEach(id=>{
if(id&&!seenIds.has(id)){
seenIds.add(id);
sel.appendChild(createOpt(id));
added=true;
}
});
if(added&&idx<envOrder.length-1)addSep();
});
}
initItemI18n();
switchUILang(DISPLAY_LANG);
const srDiv=byId('searchResults');
if(srDiv&&srDiv.children.length<=1)srDiv.innerHTML='<div style="color:#666;font-size:13px;text-align:center;margin-top:20px;">'+J02+'</div>';
const seedInput=byId('seed');
const rankSelect=byId('rank');
if(seedInput){
seedInput.addEventListener('keydown',(e)=>{
if(e.key==='Enter')calculate();
});
}
if(rankSelect){
rankSelect.addEventListener('change',()=>{
if(mapData)calculate();
});
}
function initFreeSearchUI(){
const container=byId('fs_container');
if(!container)return;
let floorOpts=`<option value="0">---</option>`;
for(let i=3;i<=16;i++)floorOpts+=`<option value="${i}">B${i}F</option>`;
let boxOpts=`
<option value="-1">---</option>
<option value="0">1</option>
<option value="1">2</option>
<option value="2">3${T('rd','(整列)')}</option>
<option value="3">${T('Non-3','非整列')}</option>
`;
let rankOpts=`<option value="0">---</option>`;
for(let r=10;r>=1;r--)rankOpts+=`<option value="${r}">${CHEST_RANK[r]}</option>`;
window.updateFSItems=function(groupId,preserveSelection=false){
let rankSelect=byId(`fs_r_${groupId}`);
let itemSelect=byId(`fs_i_${groupId}`);
if(!rankSelect||!itemSelect)return;
let currentVal=preserveSelection?itemSelect.value:"ANY";
let r=parseInt(rankSelect.value,10);
let itemOpts=`<option value="ANY">---</option>`;
let seen=new Set();
let hasSpecial=false;
const inRank=v=>r===0||getChestRanksForItems(expandItemGroup(v)).includes(r);
[["Sainted soma"],["Ethereal stone"],["Millionaire",T('Millionaire','大富豪')],["Attribeauty"],
["Metasla",T('Metal Slime Equips','金屬史萊姆裝備','メタスラ装備')],["S weapon",T('S Weapon','S武器')]].forEach(([v,label])=>{
if(!inRank(v))return;
itemOpts+=`<option value="${v}">${label||getDispItem(v)}</option>`;
seen.add(v);
hasSpecial=true;
});
if(hasSpecial)itemOpts+=`<option disabled>──────</option>`;
let validItems=[];
if(r===0){
TableR.forEach(p=>{if(!seen.has(p[0])){seen.add(p[0]);validItems.push(p[0]);}});
}else{
let startIdx=TableO[r-1];
let endIdx=(TableO[r]!==undefined)?TableO[r]:TableQ.length;
for(let i=startIdx;i<endIdx;i++){
let itemName=TableR[TableQ[i]][0];
if(!seen.has(itemName)){seen.add(itemName);validItems.push(itemName);}
}
}
validItems.forEach(en=>{itemOpts+=`<option value="${en}">${getDispItem(en)}</option>`;});
itemSelect.innerHTML=itemOpts;
itemSelect.value=[...itemSelect.options].some(o=>!o.disabled&&o.value===currentVal)?currentVal:"ANY";
};
let rows='';
for(let i=1;i<=3;i++){
rows+=`
<div style="display:flex;gap:2px;align-items:center;">
<span style="color:#0ff;font-size:10px;width:10px;text-align:center;">${i}</span>
<select id="fs_f_${i}" class="fs-ctl" style="width:45px;">${floorOpts}</select>
<select id="fs_b_${i}" class="fs-ctl" style="width:50px;">${boxOpts}</select>
<select id="fs_r_${i}" onchange="updateFSItems(${i})" class="fs-ctl" style="width:40px;">${rankOpts}</select>
<select id="fs_i_${i}" class="fs-ctl" style="flex:1;width:50px;text-overflow:ellipsis;"></select>
<input type="number" id="fs_t_${i}" value="7" min="5" placeholder="sec" class="fs-ctl" style="width:35px;text-align:center;">
</div>`;
}
container.innerHTML=rows;
for(let i=1;i<=3;i++){
updateFSItems(i);
}
}
initFreeSearchUI();
initSeedInspectorUI();
initCPUBenchmark();
const urlParams=new URLSearchParams(window.location.search);
const urlId=urlParams.get('id');
if(urlId&&/^[0-9A-Fa-f]{6}$/.test(urlId)){
const urlRank=urlId.substring(0,2).toUpperCase();
const urlSeed=urlId.substring(2,6).toUpperCase();
const rankEl=byId('rank');
const seedEl=byId('seed');
const rankVal='0x'+urlRank;
if([...rankEl.options].some(o=>o.value===rankVal)){
rankEl.value=rankVal;
seedEl.value=urlSeed;
}
}
calculate();
});
let isModalDragging=false;
const allModalIds=Object.values(MODAL_CONFIGS).map(config=>config.id);
window.addEventListener(window.PointerEvent?'pointerdown':'mousedown',(e)=>{
if(allModalIds.includes(e.target.id)){isModalDragging=false;}
else{isModalDragging=true;}
});
window.addEventListener(window.PointerEvent?'pointerup':'mouseup',(e)=>{
const target=document.elementFromPoint(e.clientX,e.clientY);
if(!isModalDragging&&target&&allModalIds.includes(target.id)){target.style.display='none';}
isModalDragging=false;
});
function exportSearchResults(){
try{
const items=document.querySelectorAll('#searchGrid .search-result-item');
if(items.length===0){
alert(A06);
return;
}
let txtContent="RANK,SEED,"+T('Result','搜尋結果','検索結果')+"\n";
const envNames=new Set(Object.values(ENV_NAMES).flat().map(n=>n.toLowerCase()));
const keepLine=line=>{
if(/Lv\.?\s*\d+/i.test(line))return false;
if(envNames.has(line.toLowerCase()))return false;
return true;
};
const tagLines=row=>{
const c=row.cloneNode(true);
c.removeChild(c.firstChild);
c.querySelectorAll('br').forEach(br=>br.replaceWith('\0'));
return c.textContent.split('\0').map(t=>t.replace(/[ \t\n\r\f]+/g,' ').trim()).filter(t=>t!=="");
};
let seedRows=[];
const flushSeedRows=()=>{
seedRows.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
for(const r of seedRows)txtContent+=r[2];
seedRows=[];
};
items.forEach(item=>{
if(item.classList.contains('srs')){
const seed=+item.dataset.seed,lines=[...item.querySelectorAll('.srs-lines > span')];
for(const b of item.querySelectorAll('.srs-ranks button')){
const rank=b.textContent,fc=+b.dataset.fc,row=b.parentNode.classList.contains('srs-rr')?b.parentNode:null;
const text=[...(row?tagLines(row):[]),...lines.filter(s=>+s.dataset.f<fc).map(s=>s.textContent.trim())].filter(keepLine).join(" / ");
seedRows.push([MAP_RANK.indexOf(parseInt(rank,16)),seed,`${rank},${hex4(seed)},${text}${b.dataset.hasD==="true"?",D":""}\n`]);
}
return;
}
flushSeedRows();
let lines=item.innerText.split('\n').map(s=>s.trim()).filter(s=>s!=="");
if(lines.length===0)return;
let firstLine=lines[0];
let seed="";
let rank="--";
let seedMatch=firstLine.match(/^([0-9A-F]{4})/i);
if(seedMatch)seed=seedMatch[1].toUpperCase();
let rankMatch=firstLine.match(/\(Rank\s*([0-9A-F]{2})\)/i);
if(rankMatch)rank=rankMatch[1].toUpperCase();
let resultLines=lines.slice(1).filter(keepLine);
let resultText=resultLines.join(" / ");
if(/^(B3F|B4F|B9F|B10F)\s+(Solo|Party|一人旅|即開)/i.test(resultText)||/^B\d+F\s+[⑤⑨]\s*x/.test(resultText)){
const itemName=item.closest('#searchGrid, #atSearchGrid').dataset.searchItem;
if(itemName)resultText=`${getDispItem(itemName)} ${resultText}`;
}
txtContent+=`${rank},${seed},${resultText}${item.dataset.hasD==="true"?",D":""}\n`;
});
flushSeedRows();
const blob=new Blob([txtContent],{type:'text/plain;charset=utf-8'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
const legacyIOS=/iP(?:hone|ad|od).*OS 12[_\.]/.test(navigator.userAgent);
if(legacyIOS||!('download'in a)){a.target='_blank';a.rel='noopener';}
else a.download=`DQ9_Search_Results_${new Date().getTime()}.txt`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(()=>URL.revokeObjectURL(url),60000);
}catch(error){
alert(A07+error.message);
console.error("匯出錯誤詳細資訊：",error);
}
}
