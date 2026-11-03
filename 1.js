let DISPLAY_LANG,_L;
function setDisplayLang(lang){DISPLAY_LANG=lang;_L=(lang==='EN')?0:(lang==='JP')?2:1;}
setDisplayLang('EN');
function T(en,tw,jp=tw){const a=[en,tw,jp];a.toString=a.valueOf=function(){return this[_L];};return a;}
function byId(id){return document.getElementById(id);}
function groupTotal(g){return g.reduce((n,x)=>n+(x.count||1),0);}
const A01=T('Please choose at least one condition.','請至少輸入一個搜尋條件！','少なくとも1つの条件を入力してください。');
const A02=T('Unexpected error during search. See Console (Google Chrome F12) for details.','搜尋過程中發生意外錯誤，已安全中斷。詳情請見 Console (Google Chrome F12)。','検索中にエラーが発生しました。詳細は Console (Google Chrome F12) を確認してください。');
const A03=T('Sorry! Quickload search is not available for chest monsters.','非常抱歉！寶箱怪只能搜體感。','宝箱モンスターは体感検索のみ対応しています。');
const A05=T('Sorry! Searching for this item is currently unavailable.','非常抱歉！這個物品的搜尋功能暫未開通。','このアイテムの検索機能は現在未実装です。');
const A06=T('No output! Please perform a search first.','目前沒有搜尋結果可以匯出！請先執行一次搜索。','出力する結果がありません！先に検索を実行してください。');
const A07=T('❌ Output error!\\n\\nReason:','❌ 匯出失敗！\\n\\n錯誤原因：','❌ 出力に失敗しました！\\n\\n原因：');
const A08=T('No valid maps in this Seed range when filtering by location.','在勾選「排除無位置地圖」的情況下，您輸入的 Seed 範圍內沒有合法地圖！','場所候補フィルター有効時、この Seed 範囲に該当する地図はありません！');
const A09=T('Invalid Location. Valid range: 01–96 (hex), digits 0–9 and A–F only.','無效的位置値。有效範圍：01–96（十六進制），僅限 0–9 及 A–F。','無効な場所コードです。有効な入力範囲：01–96（16進数）、0–9 および A–F のみ。');
const A10=T('Invalid Seed. Valid range: 0000–7FFF (hex), digits 0–9 and A–F only.','無效的 Seed 値。有效範圍：0000–7FFF（十六進制），僅限 0–9 及 A–F。','無効な Seed です。有効な入力範囲：0000–7FFF（16進数）、0–9 および A–F のみ。');
const A11=T('"Only Monster" cannot be paired with ONLY (1-enemy) / No-enemy / 15x15 / Multi-special together.','「指定 ONLY 怪物」不可與 ONLY(任何怪)／敵無／15x15／複數特殊層 一起選擇。','「オンリーモンスター」は オンリー／敵無／15x15／複数の特殊フロア と併用できません。')
const A12=T('Multibug search does not support Bug Terrain conditions.','Multibug 搜尋不支援 Bug地形。','マルチバグ検索はネタ地形に対応しておりません。')
const A13=T('Fastest Map Search does not support this option.','最短地圖搜尋不支援此選項。','最短地図検索はこの選択肢に対応しておりません。')
const A14=T('Fastest Map Search requires at least one of: Depth, Lv, Sp.Floor (ElistOfs), ONLY Monster, Location, or Boss.','最短地圖搜尋需至少填寫以下其中一項：樓層深度、Lv、特殊樓層 (ElistOfs)、指定 ONLY 怪物、位置、Boss。','最短地図検索では、深さ・Lv・特殊フロア (ElistOfs)・オンリーモンスター・場所・ボス のうち、少なくとも 1 つの入力が必要です。')
const A15=T('This is a Fastest / Slowest search mode. Please press the main "Search" button to run it.','這是「最短／最長」搜尋模式，請按主搜尋鈕「Search」執行。','これは「最短／最長」検索モードです。メインの「Search」ボタンで実行してください。')
const A16=T('Fastest Floor requires Sp.Floor (ElistOfs), ONLY Monster, or Depth as the cutoff floor.','最短樓層需以 特殊樓層 (ElistOfs)／指定 ONLY 怪物／樓層深度 其中之一作為截止樓層。','最短フロアでは、特殊フロア (ElistOfs)／オンリーモンスター／深さ のいずれかを到達フロアとして指定してください。')
const B01=T('Progress:','搜尋進度:','Progress:');
const B02=T('Rank','掃描 Rank','Rank');
const B03=T('Found','個');
const B04=T('','找到 ','');
const B05=T('Stopped','已停止','STOP');
const B06=T('','掃描完成，共找到','合計');
const B07=T('Conditions conflict. All searches skipped.','因條件衝突，已略過所有搜尋','条件が矛盾しているため、全ての検索をスキップしました。');
const B08=T('Unable to match this Rank. Skipped.','此條件組合不可能在所選 Rank 出現，已略過','この条件は選択した Rank では不可能です。スキップしました。');
const C01=T('Name','地圖名稱','地図名');
const C02=T('Type','地形');
const C03=T('SMR','怪物等級','敵ランク');
const C04=T('Depth','樓層數','深さ');
const C05=T('Location & BQ','位置與 BQ','場所 & Base値');
const C06=T('AT value','AT 判定値');
const C07=T('AT Ptn','地圖法','地図法');
const C08=T('Chests:','寶箱:','宝箱:');
const C09=T('No Chest','無寶箱','箱無し');
const C10=T('Size','地圖大小','サイズ');
const C11=T('Stairs','樓梯','階段');
const C12=T('Monster','怪物','モンスター');
const C13=T('Chests','寶箱數','宝箱の数');
const C14=T('(Tap the chest to see Chest Timer)','(點圖看 Chest Timer)','(クリックで中断技の秒数を見る)');
const C15=T('Chest','寶箱','宝箱');
const C16=T('None','無','なし');
const C17=T('Seed must be a hex value from 0000 to 7FFF','Seed 必須是 0000~7FFF 的十六進位値','Seed は 0000～7FFF の16進数で入力してください');
const C18=T('Invalid Seed/Rank','無效的 Seed/Rank 組合','無効な Seed/Rank の組み合わせ');
const C19=T('No Location','無符合條件的位置','場所候補なし');
const C20=T('Fastest','最快達成','最短');
const C21=T(' steps not found','步內未發現','回まで該当なし');
const C22=T('(AT to hit the drop)','(掉寶所需 AT 消費量)','(ドロップまで消費するAT)');
const C23=T('(AT on Battle Start)','(戰鬥初始 AT)','(ATの初期位置)');
const C24=T('RNG Sequence','亂數序列','乱数の序列');
const C25=T('Drop','掉寶','落');
const C26=T('Auto','秘傳書','盗');
const D01=T('Floor','地板','床');
const D02=T('Wall','牆壁','壁');
const D03=T('Corridor','走廊','通路');
const D04=T('Door','門');
const D05=T('Upstairs','上樓梯','上り階段');
const D06=T('Downstairs','下樓梯','下り階段');
const F01=T('Search all Ranks','掃描所有 Rank','全てのRankを検索');
const F03=T('Maps with Flag0','僅搜含 Flag0 的地圖','「敵無・無無無判定→有」のみ');
const F04=T('Depth↑','樓層↑','深さ↑');
const G01=T('🚀 Control Panel','🚀 控制台','🚀 コントロール パネル');
const G03=T('Prefix','前綴','地図名1');
const G04=T('Suffix','後綴','地図名2');
const G05=T('Locale','中間名','地図名3');
const G06=T('Location','位置','場所');
const G09=T('FloorMR','FloorMR','ﾌﾛｱ敵ﾗﾝｸ');
const G10=T('Depth','樓層深度','深さ');
const G11=T('Bug Terrain/Fastest','Bug地形／最短','ネタ／最短');
const G12=T('Sp.Floor (ElistOfs)','特殊樓層 (ElistOfs)','特殊フロア (ElistOfs)');
const G13=T('ONLY Monster','指定 ONLY 怪物','オンリーモンスター');
const G14=T('Seed Range (Hex)','Seed 範圍 (Hex)','Seed 範囲 (Hex)');
const G15=T('4-player multiplay bug','4人連線異變','4人マルチによるバグ');
const G16=T('B3/B4/B9 Solo･Party / Combo / 3rd Chest (B13:S3)','B3/B4/B9 即開･一人旅 / 體感 / 整列箱 (B13:S整列)','B3/B4/B9 即開･一人旅 / 体感 / 整列箱 (B13:S整列)');
const G17=T('Free Search','自由搜尋','フリー検索');
const G18=T('Deftness','靈巧','きようさ');
const G19=T('Zoom','魯拉','ﾙｰﾗ');
const G20=T('Pattern','掉寶Pattern','ﾄﾞﾛｯﾌﾟﾊﾟﾀｰﾝ');
const G21=T('Max Steps','最大步數','最大ｽﾃｯﾌﾟ');
const G22=T('E.Group','敵組','敵ｸﾞﾙｰﾌﾟ');
const G23=T('Support②','跟班②','お供②');
const G24=T('Support③','跟班③','お供③');
const G25=T('Thief\'s Theory User Lv','盜賊秘傳書 持有者 Lv','とうぞくの秘伝書 所持者 Lv');
const G26=T('Map Deftness','地圖靈巧値','地図きようさ');
const GBQ=T('Base Quality','BQ','Base値');
const H00=T('Chest Timer Search','中斷技 搜尋','中断技 検索');
const H01=T('QL','即一人旅');
const H02=T('Combo','體感','体感');
const H03=T('3rd','整列箱');
const H04=T('Map Method (AT) Search','地圖法 (AT) 搜尋','地図法 (AT) 検索');
const H05=T('Steps','步數','ｽﾃｯﾌﾟ');
const H06=T('Bat.','戰','戦');
const H07=T('Multibug','Multibug','マルチバグ');
const H08=T('📥 TXT Output','📥 匯出TXT','📥 TXT出力');
const H09=T('Chest Timer','馬拉松工具','マラソンツール');
const J01=T('Click to preview','點擊直接預覽此地圖','クリックでプレビュー');
const J02=T('Waiting for searching...','等待執行搜尋...','検索待ち中...');
const K01=T('🗺️ Ultimate Search Help','🗺️ Ultimate Search 說明','🗺️ Ultimate Searchの使い方');
const K02=T('🗺️ Chest Timer Search Help','🗺️ 中斷技搜尋說明','🗺️ 中断技検索の使い方');
const K03=T('🗺️ Map Method (AT) Search Help','🗺️ 地圖法 (AT) 搜尋說明','🗺️ 地図法 (AT) 検索の使い方');
const L01=T('Strength','力','ちから');
const L02=T('M.Might','攻擊魔力','攻撃魔力');
const L03=T('Agility','速度','すばやさ');
const L04=T('M.Mend','回復魔力');
const L05=T('Turn 1','第 1 回合','1ターン目');
const L06=T('Turn 2','第 2 回合','2ターン目');
const L07=T('Details','詳情','詳細');
const L08=T('⚠ 2T (5–8 moves) AT +n/2 or +0 when entering Turn-2','⚠ 2T (5-8 招) 進入第 2 回合時 AT +n/2 或 +0','⚠ 2T (5～8手) 2ターン目に突入するとき AT +n/2 または +0');
const L09=T(' more ▾',' 個組合 ▾','件をさらに表示 ▾');
const L10=T('Finisher','收尾','とどめ');
const L12=T('Wiped out','全滅');
const L17=T('No 100% anti-block combo — click to calculate alternatives','沒有可完全防止盾格擋的組合，點擊計算替代方案','盾ガードを完全に防げる組み合わせがありません — クリックして代替案を計算');
const L18=T('max','最大');
const L19=T('Neutral conditions do not use the current character panel.','中立條件不使用目前角色面板。','中立条件では現在のキャラのステータスを使用しません。');
const L20=T('Character ','角色','キャラ');
const L21=T('On field: ','場上：','場にいる敵：');
const L22=T('Move ','第');
const L23=T(' ','招 ','手 ');
const L24=T(' removed by Mercy',' 被 Mercy 移除',' みのがすで離脱');
const L25=T('Ineffective','無效','無効');
const L27=T(' → Remaining: ',' → 剩餘：',' → 残り：');
const L28=T('✓Cleared','✓清場','✓クリア');
const L30=T('(Fource active)','(Fource 啟動)','（フォース発動）');
const L32=T('💀Guaranteed KO','💀確殺','💀確実に倒す');
const L33=T('⚠Possible KO','⚠可能殺','⚠乱数で倒す');
const L34=T('Defend: ','防禦：','防御：');
const L36=T('①KO 1 main monster ②Mercy','①幹掉1隻主怪 ②Mercy','①メインを1体倒す ②みのがす');
const L37=T('①KO main monster ②Mercy','①幹掉主怪 ②Mercy','①メインを倒す ②みのがす');
const L38=T('①KO main monster ②Mercy ③KO the rest','①幹掉主怪 ②Mercy ③清場','①メインを倒す ②みのがす ③全滅');
const L39=T('①Mercy ②KO main monster','①Mercy ②幹掉主怪','①みのがす ②メインを倒す');
const L40=T('Enemies ','敵怪 ','敵 ');
const L41=T(' recommended combos',' 推薦組合',' おすすめの組み合わせ');
const L42=T('▸ Click an AT value to view recommended combos for that enemy pattern','▸ 點 AT 値査看該 pattern 的推薦組合','▸ AT値をクリックすると、その敵パターンのおすすめ組み合わせを表示');
const L43=T('Solver calculating…','Solver 計算中…');
const L44=T('Flee','逃跑','にげる');
const L45=T('(No corresponding formation for this case)','（此情形無對應形態）','（この条件に対応する編成なし）');
const L46=T('YES','是','はい');
const L47=T('NO','否','いいえ');
const L48=T('Vocation','職業');
const L60=T('Conditions','成立條件','成立条件');
const L64=T('Equipment','裝備','装備');
const L65=T('Hits','擊數','ヒット数');
const L66=T('Early-stop variant: KO on the last listed hit.','早停形態：必須在所列最後一擊擊殺。','早期終了形態：記載の最終ヒットで倒すこと。');
const L67=T('Random-target skill: exactly one enemy must remain when used.','隨機指向招：出手當下必須只剩一隻怪。','ランダム対象技：使用時の生存敵は1体のみ。');
const L68=T('Multiplayer required','需要多人模式','マルチプレイ必須');
const L69=T('Keep the listed equipment, hits and action order.','須遵守所列裝備、擊數與出手順序。','記載の装備・ヒット数・行動順を守ること。');
const L71=T('Verified stat combination','已驗證的能力値組合','検証済みステータスの組合せ');
const L72=T('Use these values together, at Lv99 and in the listed agility order (vocation restrictions disabled). This is a verified example, not independent minimum thresholds.','以下數値須整組配合，Lv99，依所列速度順序出手（未套職業限制）。這是已驗證的可行範例，不是各項互相獨立的最低門檻。','以下の値を組み合わせ、Lv99・記載の素早さ順で使用（職業制限なし）。検証済みの一例であり、各値が独立した最低閾値ではありません。');
const L73=T('Verified result','驗證結果','検証結果');
const L75=T('Agility rank','速度順','素早さ順位');
const L78=T('No requirement','無要求','不要');
const STR_SOLO=T('Solo','一人旅');
const STR_PARTY=T('Party','即開');
const STR_BOTH=T('Solo+Party','即+一人旅');
const TKB1_1=T('Nipple (Inaccessible chest)','乳首','乳首 (取れない宝箱)');
const TKB2_1=T('Chamber','イケない通路');
const TKB2_2=T('Chamber (Multi-floor)','イケない通路 (多層樓)','イケない通路 (複数階層)');
const TKB2_3=T('Chamber (Same floor, multiple)','イケない通路 (同層多個)','イケない通路 (同じフロアに複数)');
const TKB1_2=T('Nipple+Chamber','チラリズム','チラリズム (イケない乳首)');
const TKB1_3=T('Chestless','無寶箱樓層','箱無しフロア');
const TKB3_0=T('Wall-Embedded Stair','被牆壁封死的樓梯','壁に埋まった階段');
const TKB3_1=T('Ghost Stair','幽靈樓梯','ゴースト階段');
const TKB3_2=T('Softlock','危険？ハマるフロア');
const TKB4_1=T('Fastest Map','最短地圖','最短地図');
const TKB4_2=T('Fastest Map (Detail)','最短地圖 (詳細版)','最短地図 (詳細版)');
const TKB4_3=T('Fastest Floor','最短樓層','最短フロア');
const TKB4_4=T('Fastest Floor (Detail)','最短樓層 (詳細版)','最短フロア (詳細版)');
const TKB4_5=T('Slowest Map','最長地圖','最長地図');
const TKB4_6=T('Slowest Map (Detail)','最長地圖 (詳細版)','最長地図 (詳細版)');
const TKB4_7=T('Max Floor Tiles','最大樓層格子數','マス目最大 (フロア)');
const TKB4_8=T('Min Floor Tiles','最小樓層格子數','マス目最小 (フロア)');
const TKB4_9=T('Max Floor Walk Dist','最大樓層行走距離','マス目最長 (1階分の走行距離)');
const TKB4_10=T('Max Chamber Area (Floor)','單層最大イケない通路面積','イケない通路 最大面積 (フロア)');
const TKB4_11=T('Max Ghost Stairs (Floor)','單層最多幽靈樓梯','ゴースト階段 最多 (フロア)');
const EL_M=T('Multi-Special-Floor','複數特殊層','複数の特殊フロア');
const EL_P=T('Partially No-enemy','部分敵無');
const EL_4=T('4-enemy','敵減 4 種');
const EL_3=T('3-enemy','敵減 3 種');
const EL_2=T('2-enemy','敵減 2 種');
const EL_1=T('ONLY (1-enemy)','ONLY (任何怪)','オンリー');
const EL_0=T('No-enemy','敵無');
const EL_NP=T(" (No Pandora's Box)"," (Pandora's Box 消失)"," (パンドラボックス消失)");
const EL_NM=T(" (No Mimic)"," (Mimic 消失)"," (ミミック消失)");
const EL_NC=T(" (No Cannibox)"," (Cannibox 消失)"," (ひとくいばこ消失)");
const EL_ONLY=T(' only','オンリー');
const EL_NORMAL=T('Normal','一般','通常');
const AT_O=[
['R2',T('2 Rare','連續 2 個稀有','レア×2'),[[1,2]]],
['R2_3',T('2 Rare (N/N+3)','連續 2 個稀有 (N/N+3)','レア×2 (チカラめし)'),[[1,4]]],
['R2_5',T('2 Rare (N/N+5)','連續 2 個稀有 (N/N+5)','レア×2 (N/N+5)'),[[1,6]]],
['R2_7',T('2 Rare (N/N+7)','連續 2 個稀有 (N/N+7)','レア×2 (N/N+7)'),[[1,8]]],
['R3',T('3 Rare','連續 3 個稀有','レア×3'),[[1,2,3]]],
['R4',T('4 Rare','連續 4 個稀有','レア×4'),[[1,2,3,4]]],
['R5',T('5 Rare','連續 5 個稀有','レア×5'),[[1,2,3,4,5]]],
['4_in_6',T('4 in 6 Rare','6 個中 4 個稀有','レア×4 (6連続)'),[[1,2,3,6],[1,2,5,6],[1,4,5,6]]],
['3_in_7',T('3 in 7 Rare','7 個中 3 個稀有','レア×3 (7連続)'),[[1,2,5],[1,2,7],[1,4,5],[1,4,7],[1,6,7]]],
['N2',T('2 Normal','連續 2 個通常','通常×2'),[[2,4]],1],
['N3',T('3 Normal','連續 3 個通常','通常×3'),[[2,4,6]],1],
['N4',T('4 Normal','連續 4 個通常','通常×4'),[[2,4,6,8]],1],
['N5',T('5 Normal','連續 5 個通常','通常×5'),[[2,4,6,8,10]],1],
['4_in_10',T('4 in 10 Normal','10 個中 4 個通常','通常×4 (10連続)'),[[2,4,6,10],[2,4,8,10],[2,6,8,10]],1],
['3_in_10',T('3 in 10 Normal','10 個中 3 個通常','通常×3 (10連続)'),[[2,4,8],[2,4,10],[2,6,8],[2,6,10],[2,8,10]],1]];
const AT_PAT=Object.fromEntries(AT_O.map(([k],i)=>[k,i+1]));
const i18nDict={
'F01':F01,'F03':F03,'F04':F04,
'G01':G01,'G03':G03,'G04':G04,'G05':G05,'G06':G06,'C02':C02,'C03':C03,'G09':G09,'G10':G10,'G11':G11,'G12':G12,'G13':G13,'G14':G14,'G15':G15,
'G16':G16,'G17':G17,'G18':G18,'G19':G19,'G20':G20,'G21':G21,'G22':G22,'G23':G23,'G24':G24,'G25':G25,'GBQ':GBQ,
'H00':H00,'H01':H01,'H02':H02,'H03':H03,'H04':H04,'H07':H07,'H08':H08,'H09':H09,
'K01':K01,'K02':K02,'K03':K03,
'TKB1_1':TKB1_1,'TKB1_2':TKB1_2,'TKB1_3':TKB1_3,'TKB2_1':TKB2_1,'TKB2_2':TKB2_2,'TKB2_3':TKB2_3,'TKB3_0':TKB3_0,'TKB3_1':TKB3_1,'TKB3_2':TKB3_2,'TKB4_1':TKB4_1,'TKB4_2':TKB4_2,'TKB4_3':TKB4_3,'TKB4_4':TKB4_4,'TKB4_5':TKB4_5,'TKB4_6':TKB4_6,'TKB4_7':TKB4_7,'TKB4_8':TKB4_8,'TKB4_9':TKB4_9,'TKB4_10':TKB4_10,'TKB4_11':TKB4_11,
'EL_M':EL_M,'EL_P':EL_P,'EL_4':EL_4,'EL_3':EL_3,'EL_2':EL_2,'EL_1':EL_1,'EL_0':EL_0,
'L01':L01,'L02':L02,'L03':L03,'L04':L04,'L48':L48,
};
const OG={og1:T('Materials','素材/消耗品'),ogS:T('B9F Items','B9F物品','B9Fアイテム'),og2:T('Rare Equipment','限定裝備/大富豪','限定装備/大富豪'),og3:T('Cursed Equipment','詛咒裝備','呪い装備'),og4:T('Other Equipment','其他裝備','その他の装備'),og5:T('Chest Monsters','寶箱怪','宝箱モンスター')};
const b3fThreeItems=["Mini medal","Sage's elixir","Iron nails","Hephaestus' flame"];
const MAP_RANK=[0x02,0x38,0x3D,0x4C,0x51,0x65,0x79,0x8D,0xA1,0xB5,0xC9,0xDD];
const CHEST_RANK={10:'S',9:'A',8:'B',7:'C',6:'D',5:'E',4:'F',3:'G',2:'H',1:'I'};
const ENV_OPTS=[T('Caves','洞窟'),T('Ruins','遺跡'),T('Ice','冰','氷'),T('Water','水'),T('Fire','火山')];
const ENV_NAMES=Object.fromEntries(ENV_OPTS.map((o,i)=>[i+1,[o[0],o[2]]]));
const BOSS_NAMES={
1:['Equinox','馬','黒竜丸'],2:['Nemean','爪','ハヌマーン'],3:['Shogum','髭','スライムジェネラル'],4:['Trauminator','機','Sキラーマシン'],
5:['Elusid','教','イデアラゴン'],6:['Sir Sanguinus','血','ブラッドナイト'],7:['Atlas','巨','アトラス'],8:['Hammibal','猪','怪力軍曹イボイノス'],
9:['Fowleye','鳥','邪眼皇帝アウルート'],10:['Excalipurr','猫','魔剣神レパルド'],11:['Tyrannosaurus Wrecks','滅','破壊神フォロボス'],12:['Greygnarl','竜','グレイナル']
};
const PREFIX_NAMES={
1:['Clay','はかなき'],2:['Rock','ちいさな'],3:['Granite','うす暗き'],4:['Basalt','ゆらめく'],
5:['Graphite','ざわめく'],6:['Iron','ねむれる'],7:['Copper','怒れる'],8:['Bronze','呪われし'],
9:['Steel','放たれし'],10:['Silver','けだかき'],11:['Gold','わななく'],12:['Platinum','残された'],
13:['Ruby','見えざる'],14:['Emerald','あらぶる'],15:['Sapphire','とどろく'],16:['Diamond','大いなる']
};
const SUFFIX_NAMES={
1:['Joy','花'],2:['Bliss','岩'],3:['Glee','風'],4:['Doubt','空'],
5:['Woe','獣'],6:['Dolour','夢'],7:['Regret','影'],8:['Bane','大地'],
9:['Fear','運命'],10:['Dread','魂'],11:['Hurt','闇'],12:['Gloom','光'],
13:['Doom','魔神'],14:['Evil','星々'],15:['Ruin','悪霊'],16:['Death','神々']
};
const LOCALE_NAMES={
1:['Cave','洞くつ'],2:['Tunnel','地下道'],3:['Mine','坑道'],4:['Crevasse','雪道'],
5:['Marsh','沼地'],6:['Lair','アジト'],7:['Icepit','氷穴'],8:['Lake','地底湖'],
9:['Crater','火口'],10:['Path','道'],11:['Snowhall','雪原'],12:['Moor','湿原'],
13:['Dungeon','牢ごく'],14:['Crypt','墓場'],15:['Nest','巣'],16:['Ruins','遺跡'],
17:['Tundra','凍土'],18:['Waterway','水脈'],19:['World','世界'],20:['Abyss','奈落'],
21:['Maze','迷宮'],22:['Glacier','氷河'],23:['Chasm','眠る地'],24:['Void','じごく']
};
const LOCALE_INDEX=new Uint8Array([1,2,1,1,1,3,3,4,5,3,6,6,7,8,9,10,10,11,12,13,14,14,14,14,14,15,16,17,18,15,19,19,19,19,19,20,21,22,23,24]);
const TableA=new Uint8Array([1,30,0,0,2,40,0,0,3,10,0,0,4,10,0,0,5,10,0,0]);
const TableB=new Uint8Array([2,55,2,4,56,75,4,6,76,100,6,10,101,120,8,12,121,140,10,14,141,180,10,16,181,200,11,16,201,220,12,16,221,248,14,16]);
const TableC=new Uint8Array([2,55,1,3,56,75,2,4,76,100,3,5,101,140,4,6,141,180,5,7,181,200,6,9,201,220,8,9,221,248,9,9]);
const TableD=new Uint8Array([2,60,1,3,61,80,2,5,81,100,3,7,101,120,4,7,121,140,5,9,141,160,6,9,161,180,7,10,181,200,8,12,201,248,1,12]);
const TableE=new Uint8Array([1,100,2,100,3,75,4,75,5,50,6,50,7,30,8,20,9,20,10,20,11,10,12,10]);
const TableF=new Uint8Array([1,1,2,0,2,1,2,0,3,1,3,0,4,1,4,0,5,2,5,0,6,2,6,0,7,3,7,0,8,3,8,0,9,4,9,0,10,5,9,0,11,1,10,0,12,4,10,0]);
const TableG=new Uint8Array([2,3,1,2,4,5,1,3,6,7,1,4,8,9,2,5,10,11,2,6,12,13,3,7,14,15,4,8,16,16,6,8]);
const TableH=new Uint8Array([1,2,1,5,3,4,4,8,5,6,7,12,7,8,7,16,9,9,12,16]);
const TableI=new Uint8Array([1,3,1,6,4,6,4,9,7,9,7,12,10,12,10,16]);
const TableO=new Uint8Array([0,14,28,41,55,71,88,108,125,141,162]);
const TableP=new Uint8Array([10,10,5,10,10,8,5,8,10,10,2,8,2,2,8,8,10,2,10,10,10,10,8,8,10,2,2,2,10,10,10,10,10,10,10,1,10,10,5,2,2,5,15,15,12,10,15,12,2,5,5,1,1,1,1,5,15,10,15,1,1,1,1,1,1,10,10,1,12,1,15,10,15,15,15,10,6,1,1,10,1,10,1,1,1,1,1,1,10,10,10,10,10,15,6,2,2,15,1,1,1,1,1,1,1,1,1,1,5,13,13,10,15,15,15,5,1,1,1,1,1,1,1,1,1,10,10,10,10,10,15,10,10,8,1,1,1,1,1,1,1,15,10,10,10,15,10,8,5,5,1,1,1,1,1,1,1,1,1,1,1,1]);
const TableQ=new Uint8Array([12,14,16,15,7,18,28,23,27,0,29,13,30,31,32,33,34,35,36,22,19,1,7,46,37,38,39,40,140,41,11,42,7,2,43,44,45,49,8,50,51,139,52,53,11,8,16,3,54,47,48,76,55,56,57,139,24,58,16,59,60,61,62,63,64,65,66,67,11,68,20,139,21,69,8,70,71,72,73,74,75,11,77,78,79,80,81,82,139,83,84,85,17,4,25,86,87,11,88,89,90,91,92,93,94,95,96,97,98,99,100,17,5,11,9,10,101,102,103,104,105,106,107,108,109,110,111,112,6,17,11,9,113,114,115,116,117,118,119,120,121,122,123,9,124,17,125,26,10,126,127,128,129,130,131,132,133,134,135,136,137,138]);
const TableR=[
["125G","125G"],["268G","268G"],["450G","450G"],["670G","670G"],["880G","880G"],["1500G","1500G"],["3000G","3000G"],
["Gleeban groat","グビアナどうか"],["Gleeban guinea","グビアナぎんか"],["Gleeban gold piece","グビアナきんか"],["Gold bar","きんかい"],
["Mini medal","ちいさなメダル"],["Medicinal herb","やくそう"],["Strong medicine","上やくそう"],["Evac-u-bell","おもいでのすず"],
["Holy water","せいすい"],["Magic water","まほうのせいすい"],["Sage's elixir","けんじゃのせいすい"],["Antidotal herb","どくけしそう"],
["Strong antidote","上どくけしそう"],["Narspicious","あやかしそう"],["Mystifying mixture","おかしなくすり"],["Superior medicine","いやしそう"],
["Moonwort bulb","まんげつそう"],["Panacea","ばんのうぐすり"],["Perfect panacea","超ばんのうぐすり"],["Yggdrasil leaf","せかいじゅのは"],
["Chimaera wing","キメラのつばさ"],["Oaken club","こんぼう"],["Pop socks","ニーソックス"],["Silver bracelets","ぎんのリスト"],
["Bunny tail","うさぎのおまもり"],["Royal soil","まりょくの土"],["Lava lump","ようがんのカケラ"],["Angel bell","天使のすず"],
["Silver platter","シルバートレイ"],["Fisticup","げんこつダケ"],["Iron nails","てつのクギ"],["Gold ring","きんのゆびわ"],
["Gold bracer","きんのプレスレット"],["Iron mask","てっかめん"],["Toad oil","ガマのあぶら"],["Fisticup","げんこつダケ"],
["Iron ore","てっこうせき"],["Slime shield","スライムトレイ"],["Corundum","ルビーのげんせき"],["Rockbomb shard","ばくだん石"],
["Flintstone","つけもの石"],["Mirrorstone","かがみ石"],["Resurrock","命の石"],["Strength ring","ちからのゆびわ"],
["Agility ring","はやてのリング"],["Manky mud","どくどくヘドロ"],["Nectar","花のみつ"],["Sorcerer's stone","ひらめきのジュエル"],
["Glombolero","ふしぎなボレロ"],["Saint's ashes","せいじゃのはい"],["Malicite","うらみのほうじゅ"],["Hephaestus' flame","ヘパイトスのひだね"],
["Muscle belt","あらくれベルト"],["Maid outfit","メイド服"],["Thug boots","あらくれブーツ"],["Thug's mug","あらくれマスク"],
["Maid's mop","ヘッドドレス"],["Toughie trousers","あらくれズボン"],["Finessence","ぶどうエキス"],["Aggressence","とうこんエキス"],
["Dangerous bustier","あぶないビスチェ"],["Brouhaha boomstick","まてきの杖"],["Hephaestus' flame","ヘパイトスのひだね"],["Astral plume","天使のはね"],
["Densinium","ヘビーメタル"],["Riotous wristbands","ぶしんのリスト"],["Fingerless gloves","オープンフィンガー"],["Mythril ore","ミスリルこうせき"],
["Veteran's gloves","古強者のグローブ"],["Fuddle bow","ゆうわくの弓"],["Oh-no bow","じごくの弓"],["Blessed boots","しんかんのブーツ"],
["Skull ring","ドクロのゆびわ"],["Hela's hammer","まじんのかなづち"],["Hades' helm","サタンヘルム"],["Demon whip","あくまのムチ"],
["Saint's ashes","せいじゃのはい"],["Densinium","ヘビーメタル"],["Lucida shard","ほしのカケラ"],["Depressing shoes","しわよせのくつ"],
["Unhappy hat","しわよせのぼうし"],["Veteran's armour","古強者のよろい"],["Spellspadrilles","だいまどうシューズ"],["Veteran's boots","古強者のブーツ"],
["Combat boots","ぶしんのブーツ"],["She-mage shoes","まじょのブーツ"],["Trinity tights","しんかんのタイツ"],["Ruinous shield","はめつの盾"],
["Divine dress","さとりのワンピース"],["Skull helm","ドクロのかぶと"],["Matador's gloves","マタドールグラブ"],["Pandora's box","パンドラボックス"],
["Enchanted stone","せいれいせき"],["Mythril ore","ミスリルこうせき"],["Hero spear","えいゆうのやり"],["Pruning knife","こがらしのダガー"],
["Wyrmwand","ドラゴンの杖"],["Wizardly whip","カルベロビュート"],["Beast claws","まじゅうのツメ"],["Attribeauty","風林火山"],
["Heavy hatchet","ふんさいのおおなた"],["Megaton hammer","メガトンハンマー"],["Pentarang","ペンタグラム"],["Pandora's box","パンドラボックス"],
["Astral plume","天使のはね"],["Ethereal stone","げんませき"],["Reckless necklace","しにがみの首かざり"],["Orichalcum","オリハルコン"],
["Metal slime sword","メタスラの剣"],["Metal slime spear","メタスラのやり"],["Metal slime shield","メタスラの盾"],["Metal slime armour","メタスラよろい"],
["Metal slime helm","メタスラヘルム"],["Metal slime gauntlets","メタスラのこて"],["Metal slime sollerets","メタスラブーツ"],["Pandora's box","パンドラボックス"],
["Reset stone","リサイクルストーン"],["Evac-u-bell","おもいでのすず"],["Sainted soma","天使のソーマ"],["Orichalcum","オリハルコン"],
["Stardust sword","ほしくずのつるぎ"],["Poker","きしんのまそう"],["Deft dagger","サウザンドダガー"],["Bright staff","ひかりの杖"],
["Gringham whip","グリンガムのムチ"],["Knockout rod","しゅらのこん"],["Dragonlord claws","竜王のツメ"],["Critical fan","ひっさつのおうぎ"],
["Bad axe","グレートアックス"],["Groundbreaker","大地くだき"],["Meteorang","メテオエッジ"],["Angel's bow","天使の弓"],
["Mimic","ミミック"],["Cannibox","ひとくいばこ"]
];
function debounce(fn,ms){let timer;return function(...args){clearTimeout(timer);timer=setTimeout(()=>fn.apply(this,args),ms);};}
function lcg(seed){return(Math.imul(seed,1103515245)+12345)>>>0;}
function atFromRng(rng){return(rng>>>16)&0x7FFF;}
function row4(t,rows,v,dft){for(let i=0;i<rows;i++){const b=i*4;if(v>=t[b]&&v<=t[b+1])return[t[b+2],t[b+3]];}return dft;}
function rowsHit(t,rows,lo,hi,v){for(let k=lo;k<=hi;k++){const[a,b]=row4(t,rows,k,NO_ROW);if(v>=a&&v<=b)return true;}return false;}
const NO_ROW=[1,0];
function selectChestItem(rank,roll){
const start=TableO[rank-1],end=TableO[rank];
let weight=0;
for(let i=start;i<end;i++){
weight+=TableP[i];
if(roll<weight)return TableR[TableQ[i]];
}
return null;
}
const STAIR_REJECT_SHAPE=new Uint8Array(256);
for(const v of[46,58,139,142,163,171,174,184,186,226,232,234])STAIR_REJECT_SHAPE[v]=1;
const FLOOR_CACHE_MAX=256;
const floorSizeBucket=(index1)=>index1>12?3:index1>8?2:index1>4?1:0;
const floorChestClass=(index1)=>index1<=2?0:index1===3?1:2;
class GrottoDetail{
constructor(){
this.di=[];
for(let i=0;i<16;i++)this.di[i]=new Uint8Array(1336);
this._details=new Uint8Array(20);
this._details2=new Uint8Array(20);
this._seed=0;
this.MapSeed=0;
this.MapRank=0;
this.MapLocale=0;
this.isStairOverflow=new Array(16).fill(false);
this.trackOverflow=false;
this.multibug_offset=0;
this.force_16_floors=false;
}
_readI32(floor,offset){
const d=this.di[floor];
return d[offset]|(d[offset+1]<<8)|(d[offset+2]<<16)|(d[offset+3]<<24);
}
_writeI32(floor,offset,val){
const d=this.di[floor];
d[offset]=val&0xFF;
d[offset+1]=(val>>>8)&0xFF;
d[offset+2]=(val>>>16)&0xFF;
d[offset+3]=(val>>>24)&0xFF;
}
gRNG(){
const s=(Math.imul(this._seed,1103515245)+12345)|0;
this._seed=s;
return(s>>>16)&0x7FFF;
}
gRNGDiv(div){
return this.gRNG()%div;
}
gRNGRange(v1,v2){
if(v1===v2)return v1;
const r=this.gRNG();
const num=(v2|0)-(v1|0)+1;
return num===0?v1:((v1+r%num)>>>0);
}
getItemRank(value1,value2){
const num=Math.fround(this.gRNG()-1);
return(Math.fround(((value2|0)-(value1|0)+1)*num/32767)>>>0)+value1;
}
seek1(table,tableSize){
const random=this.gRNGDiv(100);
let num=0;
for(let i=0;i<tableSize;i++){
num+=table[i*4+1];
if(random<num)return table[i*4];
}
return 0;
}
seek2(table,value,tableSize){
const r=row4(table,tableSize,value,null);
return r?this.seek3(r[0],r[1]):0;
}
seek3(val1,val2){
const r=this.gRNG();
const num=val2-val1+1;
return num===0?val1:(val1+r%num);
}
seek4(table1,table2,roopCount){
const r=row4(table1,roopCount,this.MapRank,null);
if(!r)return 0;
let num1=0;
for(let i2=r[0];i2<=r[1];i2++)
num1+=table2[(i2-1)*2+1];
const num2=this.gRNG()%num1;
let num3=0;
for(let i3=r[0];i3<=r[1];i3++){
num3+=table2[(i3-1)*2+1];
if(num2<num3)return i3;
}
return 0;
}
routineRandom(value){
return(Math.fround(this.gRNG()-1)*value/32767)>>>0;
}
routine1(floor,address,value1,value2){
if(value2>0)this.di[floor].fill(value1&0xFF,address,address+value2);
}
setValue(floor,address,v1,v2,v3,v4){
const d=this.di[floor];
d[address]=v1;d[address+1]=v2;d[address+2]=v3;d[address+3]=v4;
}
routineA(floor,address,value1,value2){
const d=this.di[floor];
const num1=d[address+3]+1-d[address+1];
if(num1<7||d[address+4]!==0)return false;
const random=this.gRNGRange(0,num1-7);
const num2=d[address+1]+random+3;
for(let i=d[address];i<d[address+2]+1;i++)
d[(num2<<4)+i+792]=3;
this.setValue(floor,value2,d[address],num2,d[address+2],num2);
this.setValue(floor,value1,d[address],num2+1,d[address+2],d[address+3]);
d[value1+4]=0;d[value1+5]=0;
d[address+3]=num2-1;
d[address+4]=1;
this._writeI32(floor,value2+4,address);
this._writeI32(floor,value2+8,value1);
d[value2+12]=1;
return true;
}
routineE(floor,address,value1,value2){
const d=this.di[floor];
const num1=d[address+2]+1-d[address];
if(num1<7||d[address+5]!==0)return false;
const random=this.gRNGRange(0,num1-7);
const num2=d[address]+random+3;
for(let i=d[address+1];i<d[address+3]+1;i++)
d[(i<<4)+num2+792]=3;
this.setValue(floor,value2,num2,d[address+1],num2,d[address+3]);
this.setValue(floor,value1,num2+1,d[address+1],d[address+2],d[address+3]);
d[value1+4]=0;d[value1+5]=0;
d[address+2]=num2-1;
d[address+5]=1;
this._writeI32(floor,value2+4,address);
this._writeI32(floor,value2+8,value1);
d[value2+12]=2;
return true;
}
routineB(floor,address){
const d=this.di[floor];
const num=d[21];
d[21]++;d[22]++;
if((this.gRNG()&1)!==0){
this.routineF(floor,address);
this.routineF(floor,num*12+24);
}else{
this.routineF(floor,num*12+24);
this.routineF(floor,address);
}
}
routineF(floor,address){
const d=this.di[floor];
if(d[21]>=15)return;
const useA=d[address+5]!==0?true:d[address+4]!==0?false:(this.gRNG()&1)===0;
const split=useA?this.routineA(floor,address,d[21]*12+24,(d[22]<<4)+216):this.routineE(floor,address,d[21]*12+24,(d[22]<<4)+216);
if(split)this.routineB(floor,address);
}
routineC(floor,address1,address2){
const d=this.di[floor];
if(d[address1+2]+1-d[address1]<3||d[address1+3]+1-d[address1+1]<3)
return false;
const num1=d[address1],num2=d[address1+1],num3=d[address1+2],num4=d[address1+3];
let random1,random2,random3,random4;
if(this.gRNGRange(0,1)!==0){
random1=this.gRNGRange(num1,num1+((num3-num1+1)/3|0));
random2=this.gRNGRange(num2,num2+((num4-num2+1)/3|0));
}else{
random1=this.gRNGRange(num1+1,num1+((num3-num1+1)/3|0));
random2=this.gRNGRange(num2+1,num2+((num4-num2+1)/3|0));
}
if(this.gRNGRange(0,1)!==0){
random3=this.gRNGRange(num1+((num3-num1+1)/3|0)*2,num3);
random4=this.gRNGRange(num2+((num4-num2+1)/3|0)*2,num4);
}else{
random3=this.gRNGRange(num1+((num3-num1+1)/3|0)*2,num3-1);
random4=this.gRNGRange(num2+((num4-num2+1)/3|0)*2,num4-1);
}
this.setValue(floor,address2,random1,random2,random3,random4);
for(let i=4;i<20;i++)d[address2+i]=0;
this._writeI32(floor,address1+8,address2);
for(let y=random2;y<=random4;y++)
for(let x=random1;x<=random3;x++)
d[x+(y<<4)+792]=0;
this.routineD(floor,address2);
return true;
}
routineD(floor,address){
const d=this.di[floor];
const num1=d[address],num2=d[address+2];
if(num1===0||d[address+1]===0)return false;
if(num2===0||d[address+3]===0)return false;
if(num2-num1+1<5){
d[address+12]=this.gRNGRange(num1,num2);
d[address+13]=d[address+1];
d[address+16]=this.gRNGRange(d[address],d[address+2]);
d[address+17]=d[address+3];
d[(d[address+13]<<4)+792+d[address+12]]=8;
d[(d[address+17]<<4)+792+d[address+16]]=8;
}else{
const num3=num1+((num2-num1+1)/2|0)-1;
d[address+12]=this.gRNGRange(num1,num3);
d[address+13]=d[address+1];
d[address+14]=this.gRNGRange(num3+1,d[address+2]);
d[address+15]=d[address+1];
d[address+16]=this.gRNGRange(d[address],num3);
d[address+17]=d[address+3];
d[address+18]=this.gRNGRange(num3+1,d[address+2]);
d[address+19]=d[address+3];
d[(d[address+13]<<4)+792+d[address+12]]=8;
d[(d[address+15]<<4)+792+d[address+14]]=8;
d[(d[address+17]<<4)+792+d[address+16]]=8;
d[(d[address+19]<<4)+792+d[address+18]]=8;
}
if(d[address+3]-d[address+1]+1<5){
d[address+4]=d[address];
d[address+5]=this.gRNGRange(d[address+1],d[address+3]);
d[address+8]=d[address+2];
d[address+9]=this.gRNGRange(d[address+1],d[address+3]);
d[(d[address+5]<<4)+792+d[address+4]]=8;
d[(d[address+9]<<4)+792+d[address+8]]=8;
}else{
const num4=d[address+1];
const num5=num4+((d[address+3]+1-num4)/2|0)-1;
d[address+4]=d[address];
d[address+5]=this.gRNGRange(d[address+1],num5);
d[address+6]=d[address];
d[address+7]=this.gRNGRange(num5+1,d[address+3]);
d[address+8]=d[address+2];
d[address+9]=this.gRNGRange(d[address+1],num5);
d[address+10]=d[address+2];
d[address+11]=this.gRNGRange(num5+1,d[address+3]);
d[(d[address+5]<<4)+792+d[address+4]]=8;
d[(d[address+7]<<4)+792+d[address+6]]=8;
d[(d[address+9]<<4)+792+d[address+8]]=8;
d[(d[address+11]<<4)+792+d[address+10]]=8;
}
return true;
}
generateFloorMap(floor,address){
const d=this.di[floor];
const index1=this._readI32(floor,address+8);
const num1=((d[index1+2]-d[index1]+1)/2)|0;
const num2=((d[index1+3]-d[index1+1]+1)/2)|0;
let num3=0;
if(d[1]===0&&this.gRNGRange(0,15)===0)
num3=1;
let num4,num5,num6,num7;
if(num3===0){
num4=d[address+3]-d[index1+3];
num5=d[index1]-d[address];
num6=d[address+2]-d[index1+2];
num7=d[index1+1]-d[address+1];
}else{
num4=d[3]-d[index1+3]-1;
num5=d[index1]-1;
num6=d[2]-d[index1+2]-1;
num7=d[index1+1]-1;
d[1]=1;
}
for(let i3=d[index1];i3<=d[index1+2];i3++){
const num8=d[i3+(d[index1+1]<<4)+792];
if(num8===1||num8===3)continue;
if(this.gRNGRange(0,1)===0){
if(num8!==8){
const above=d[i3+((d[index1+1]-1)<<4)+792];
if(above===1||above===8)continue;
const random1=this.gRNGRange(0,num2);
const num9=i3-1;
for(let i4=0;i4<random1&&
d[i3+((d[index1+1]+i4)<<4)+792]!==8&&
d[i3+((d[index1+1]+i4+1)<<4)+792]!==1&&(
d[((d[index1+1]+i4)<<4)+i3+1+792]===1||
d[((d[index1+1]+i4+1)<<4)+i3+1+792]!==1)&&(
d[((d[index1+1]+i4)<<4)+num9+792]===1||
d[num9+((d[index1+1]+i4+1)<<4)+792]!==1);
i4++)
d[i3+((d[index1+1]+i4)<<4)+792]=1;
}
}else{
const random2=this.gRNGRange(0,num7);
for(let i5=0;i5<random2;i5++){
const idx=i3+((d[index1+1]-1-i5)<<4)+792;
if(d[idx]!==8)d[idx]=0;
}
}
}
for(let i7=d[index1];i7<=d[index1+2];i7++){
const num10=d[i7+(d[index1+3]<<4)+792];
if(num10===1||num10===3)continue;
if(this.gRNGRange(0,1)!==0){
const random=this.gRNGRange(0,num4);
for(let i8=0;i8<random;i8++)
if(d[i7+((d[index1+3]+i8+1)<<4)+792]!==8)
d[i7+((d[index1+3]+i8+1)<<4)+792]=0;
}else{
if(num10!==8){
const below=d[i7+((d[index1+3]+1)<<4)+792];
if(below===1||below===8)continue;
const random3=this.gRNGRange(0,num2);
const num11=i7-1;
for(let i9=0;i9<random3&&
d[i7+((d[index1+3]-i9)<<4)+792]!==8&&
d[i7+((d[index1+3]-i9-1)<<4)+792]!==1&&(
d[((d[index1+3]-i9)<<4)+i7+1+792]===1||
d[((d[index1+3]-i9-1)<<4)+i7+1+792]!==1)&&(
d[num11+((d[index1+3]-i9)<<4)+792]===1||
d[num11+((d[index1+3]-i9-1)<<4)+792]!==1);
i9++)
d[i7+((d[index1+3]-i9)<<4)+792]=1;
}
}
}
for(let i10=d[index1+1];i10<=d[index1+3];i10++){
const num12=d[(i10<<4)+792+d[index1]];
if(num12===1||num12===3)continue;
if(this.gRNGRange(0,1)!==0){
const random=this.gRNGRange(0,num5);
for(let i11=0;i11<random;i11++)
if(d[(i10<<4)+792+d[index1]-1-i11]!==8)
d[(i10<<4)+792+d[index1]-1-i11]=0;
}else{
if(num12!==8){
const left=d[(i10<<4)+792+d[index1]-1];
if(left===1||left===8)continue;
const random4=this.gRNGRange(0,num1);
const num13=i10-1;
for(let i12=0;i12<random4&&
d[i12+(i10<<4)+d[index1]+792]!==8&&
d[i12+(i10<<4)+d[index1]+792+1]!==1&&(
d[i12+((i10+1)<<4)+d[index1]+792]===1||
d[i12+((i10+1)<<4)+d[index1]+792+1]!==1)&&(
d[i12+(num13<<4)+d[index1]+792]===1||
d[i12+(num13<<4)+d[index1]+792+1]!==1);
i12++)
d[i12+(i10<<4)+d[index1]+792]=1;
}
}
}
for(let i13=d[index1+1];i13<=d[index1+3];i13++){
const num14=d[(i13<<4)+792+d[index1+2]];
if(num14===1||num14===3)continue;
if(this.gRNGRange(0,1)!==0){
const random=this.gRNGRange(0,num6);
for(let i14=0;i14<random;i14++)
if(d[i14+(i13<<4)+d[index1+2]+792+1]!==8)
d[i14+(i13<<4)+d[index1+2]+792+1]=0;
}else{
if(num14!==8){
const right=d[d[index1+1]+(i13<<4)+792+1];
if(right===1||right===8)continue;
const random5=this.gRNGRange(0,num1);
const num15=i13-1;
for(let i15=0;i15<random5&&
d[(i13<<4)+792+d[index1+2]-i15]!==8&&
d[(i13<<4)+792+d[index1+2]-i15-1]!==1&&(
d[((i13+1)<<4)+792+d[index1+2]-i15]===1||
d[((i13+1)<<4)+792+d[index1+2]-i15-1]!==1)&&(
d[(num15<<4)+792+d[index1+2]-i15]===1||
d[(num15<<4)+792+d[index1+2]-i15-1]!==1);
i15++)
d[(i13<<4)+792+d[index1+2]-i15]=1;
}
}
}
}
routineI(floor,value1,value2,value3){
const d=this.di[floor];
const num1=d[value1+(value2<<4)+792];
if(num1===1||num1===3)return 255;
const num2=d[value1+((value2-1)<<4)+792];
const num3=d[value1+((value2-1)<<4)+792-1];
const num4=d[value1+((value2-1)<<4)+792+1];
const num5=d[value1+(value2<<4)+792+1];
const num6=d[value1+((value2+1)<<4)+792+1];
const num7=d[value1+((value2+1)<<4)+792];
const num8=d[value1+((value2+1)<<4)+792-1];
const num9=d[value1+(value2<<4)+792-1];
if(num1!==0&&num1!==2&&((num1+252)&255)>4)return value3;
if(num3===1||num3===3)value3|=128;else value3&=127;
if(num4===1||num4===3)value3|=32;else value3&=223;
if(num6===1||num6===3)value3|=8;else value3&=247;
if(num8===1||num8===3)value3|=2;else value3&=253;
if(num2===1||num2===3)value3|=224;else value3&=191;
if(num5===1||num5===3)value3|=56;else value3&=239;
if(num7===1||num7===3)value3|=14;else value3&=251;
if(num9===1||num9===3)value3|=131;else value3&=254;
return value3;
}
routineG(floor,address){
const d=this.di[floor];
const address3=address;
const split=d[address3+12];
if(split!==1&&split!==2)return 1;
const parentAddr=this._readI32(floor,address3+4);
const address1=this._readI32(floor,parentAddr+8);
const siblingAddr=this._readI32(floor,address3+8);
const address2=this._readI32(floor,siblingAddr+8);
const draw=(v1,v2)=>this.routineH(floor,address1,v1,address2,v2,address3,this.gRNGRange(0,7)===0?1:0);
if(split===1){draw(16,12);draw(18,12);draw(16,14);draw(18,14);}
else{draw(8,4);draw(10,4);draw(8,6);draw(10,6);}
return 1;
}
routineH(floor,address1,value1,address2,value2,address3,value3){
const d=this.di[floor];
const index1=address3;
const num1=d[address1+value1];
const num2=d[address1+value1+1];
const num3=d[address2+value2];
const num4=d[address2+value2+1];
if(num1===0||num2===0||num3===0||num4===0)return false;
const drawExt=(start,step,isHoriz,fixedCoord)=>{
for(let i=start+step;i>=0&&i<16;i+=step){
const idx=isHoriz?(i+(fixedCoord<<4)+792):((i<<4)+792+fixedCoord);
const v=d[idx];
if(v===1||v===3)continue;
for(let j=start+step;j!==i;j+=step){
const fillIdx=isHoriz?(j+(fixedCoord<<4)+792):((j<<4)+792+fixedCoord);
d[fillIdx]=2;
}
break;
}
};
if(d[address3+12]===1){
for(let i=num2+1;i<d[index1+1]+1;i++)
d[(i<<4)+792+num1]=2;
for(let i=num4-1;i>d[index1+1];i--)
d[(i<<4)+792+num3]=2;
if(num1<num3)
for(let i=num1;i<num3+1;i++)
d[i+(d[index1+1]<<4)+792]=2;
else if(num1>num3)
for(let i=num3;i<num1+1;i++)
d[i+(d[index1+1]<<4)+792]=2;
if(value3===0)return true;
if(num1<num3){
drawExt(num3,1,true,d[index1+1]);
drawExt(num1,-1,true,d[index1+1]);
}else{
drawExt(num1,1,true,d[index1+1]);
drawExt(num3,-1,true,d[index1+1]);
}
}else if(d[address3+12]===2){
for(let i=num1+1;i<d[index1]+1;i++)
d[i+(num2<<4)+792]=2;
for(let i=num3-1;i>d[index1];i--)
d[i+(num4<<4)+792]=2;
if(num2<num4)
for(let i=num2;i<num4+1;i++)
d[(i<<4)+792+d[index1]]=2;
else if(num2>num4)
for(let i=num4;i<num2+1;i++)
d[(i<<4)+792+d[index1]]=2;
if(value3===0)return true;
if(num2<num4){
drawExt(num4,1,false,d[index1]);
drawExt(num2,-1,false,d[index1]);
}else{
drawExt(num2,1,false,d[index1]);
drawExt(num4,-1,false,d[index1]);
}
}
return true;
}
routineJ(floor){
const d=this.di[floor];
let num1=0,num2=0;
let random1=0,random2=0;
let random3,random4,random5;
while(true){
random3=this.gRNGRange(0,d[23]-1);
const idx1=random3*20+472;
random4=this.gRNGRange(d[idx1],d[idx1+2]);
random5=this.gRNGRange(d[idx1+1],d[idx1+3]);
if(num2<100){
const n3=d[((random5-1)<<4)+random4+792];
const n4=d[((random5+1)<<4)+random4+792];
const n5=d[(random5<<4)+792+random4-1];
const n6=d[(random5<<4)+792+random4+1];
const w7=(n3===1||n3===3)?1:0;
const w8=(n4===1||n4===3)?1:0;
const w9=(n5===1||n5===3)?1:0;
const w10=(n6===1||n6===3)?1:0;
if((w7||w8)&&(w9||w10)){num2++;continue;}
const ri=this.routineI(floor,random4,random5,0)&255;
if(STAIR_REJECT_SHAPE[ri]===1){num2++;continue;}
}
d[random4+(random5<<4)+792]=4;
d[4]=random4;d[5]=random5;
if(num2>=100){num1=0;num2=0;if(this.trackOverflow)this.isStairOverflow[floor]=true;}
random1=random4;random2=random5;let num13=random3;
do{
const random6=this.gRNGRange(0,d[23]-1);
if(random6===(random3&255)&&(num1&255)<25){
num1++;
}else{
const idx2=random6*20+472;
random1=this.gRNGRange(d[idx2],d[idx2+2]);
num13=random6;
random2=this.gRNGRange(d[idx2+1],d[idx2+3]);
}
}while((random3&255)===num13&&random1===(random4&0xFFFF)&&random2===(random5&0xFFFF));
const n14=d[random1+((random2-1)<<4)+792];
const n15=d[random1+((random2+1)<<4)+792];
const n16=d[random1+(random2<<4)+792-1];
const n17=d[random1+(random2<<4)+792+1];
const w18=(n14===1||n14===3)?1:0;
const w19=(n15===1||n15===3)?1:0;
const w20=(n16===1||n16===3)?1:0;
const w21=(n17===1||n17===3)?1:0;
if((w18||w19)&&(w20||w21)){num2++;}
else break;
}
d[random1+(random2<<4)+792]=5;
d[6]=random1;d[7]=random2;
}
routineK(floor){
const d=this.di[floor];
const random1=this.gRNGRange(1,3);
d[8]=random1;
let num1=0,num2=0;
do{
const idx=this.gRNGRange(0,d[23]-1)*20+472;
const random2=this.gRNGRange(d[idx],d[idx+2]);
const random3=this.gRNGRange(d[idx+1],d[idx+3]);
const num3=d[random2+((random3&255)<<4)+792];
if(num1<100&&(d[0]===3||d[0]===1)){
num1++;
}else if(num3===6||num3===4||num3===5){
num1++;
}else{
d[random2+((random3&255)<<4)+792]=6;
d[num2*2+13]=random2;
d[num2*2+14]=random3;
num2++;
}
}while(num2<(random1&255));
return 1;
}
calculateDetail(skipMapGen=false){
for(let i=0;i<16;i++)this.di[i].fill(0);
if(this._floorSlot)this._floorSlot.fill(null);
this._details.fill(0);
this._details2.fill(0);
if(this.trackOverflow)this.isStairOverflow.fill(false);
if(this.MapRank<2||this.MapRank>248)return;
this._seed=this.MapSeed;
if(this.multibug_offset===1){this._seed=lcg(this._seed);}
for(let i=0;i<12;i++)this.gRNGDiv(100);
this._details[3]=this.seek1(TableA,5);
this._details[1]=this.seek2(TableB,this.MapRank,9);
if(this.force_16_floors){this._details[1]=16;}
this._details[2]=this.seek2(TableC,this.MapRank,8);
this._details[0]=this.seek4(TableD,TableE,9);
for(let i=0;i<12;i++)
this._details[i+1+7]=this.seek3(TableF[i*4+1],TableF[i*4+2]);
this._details[5]=this.seek2(TableH,this._details[2],5);
this._details[6]=this.seek2(TableI,this._details[0],4);
this._details[7]=this.seek2(TableG,this._details[1],8);
const num1=Math.max(1,Math.min(99,(this._details[0]+this._details[1]+this._details[2]-4)*3+(this.gRNGDiv(11)-5)));
this._details[4]=num1;
this.MapLocale=LOCALE_INDEX[(this._details[7]-1)*5+this._details[3]-1];
for(let i=1;i<this._details[1]+1;i++){
let num9;
if(i>12)num9=16;
else if(i>8)num9=(this.MapSeed+i)%3+14;
else if(i>4)num9=(this.MapSeed+i)%4+12;
else num9=(this.MapSeed+i)%5+10;
this.di[i-1][2]=num9;
this.di[i-1][3]=num9;
}
if(!skipMapGen){
this.createDungeonDetail();
}
}
generateFloorLayout(floor,index1){
const d=this.di[floor];
d[0]=index1;
d[8]=0;
this._seed=(this.MapSeed+index1)>>>0;
this.routine1(floor,792,1,256);
d[21]=1;d[22]=0;d[23]=0;d[1]=0;
this.setValue(floor,24,1,1,d[2]-2,d[3]-2);
d[28]=0;d[29]=0;
this.routineF(floor,24);
for(let i2=0;i2<d[21];i2++)if(this.routineC(floor,i2*12+24,d[23]*20+472))d[23]++;
for(let i3=0;i3<d[21];i3++)this.generateFloorMap(floor,i3*12+24);
for(let i4=0;i4<d[22];i4++)this.routineG(floor,(i4<<4)+216);
for(let i5=0;i5<d[2];i5++){
d[i5+792]=1;
d[((d[3]-1)<<4)+i5+792]=1;
}
for(let i6=0;i6<d[3];i6++){
d[(i6<<4)+792]=1;
d[(i6<<4)+792+d[2]-1]=1;
}
const track=this.trackOverflow,before=this.isStairOverflow[floor];
this.trackOverflow=true;this.isStairOverflow[floor]=false;
this.routineJ(floor);
const overflow=this.isStairOverflow[floor];
this.trackOverflow=track;this.isStairOverflow[floor]=track?overflow:before;
return{bytes:d.slice(),seed:this._seed,overflow,derived:[null,null,null]};
}
createDungeonDetail(){
const cache=this._floorCache||(this._floorCache=new Map());
const slots=this._floorSlot||(this._floorSlot=new Array(16).fill(null));
for(let index1=1;index1<this._details[1]+1;index1++){
const floor=index1-1;
const d=this.di[floor];
const key=((this.MapSeed+index1)>>>0)*4+floorSizeBucket(index1);
let layout=cache.get(key);
if(layout){
d.set(layout.bytes);
d[0]=index1;
this._seed=layout.seed;
if(this.trackOverflow&&layout.overflow)this.isStairOverflow[floor]=true;
}else{
layout=this.generateFloorLayout(floor,index1);
cache.set(key,layout);
if(cache.size>FLOOR_CACHE_MAX)cache.delete(cache.keys().next().value);
}
if(d[0]<=2)d[8]=0;
else this.routineK(floor);
const cls=floorChestClass(index1);
slots[floor]=layout.derived[cls]||(layout.derived[cls]={});
}
for(let i12=2;i12<this._details[1];i12++){
const d=this.di[i12];
this._seed=(this.MapSeed+i12+1)>>>0;
for(let i13=0;i13<d[8]<<1;i13++)this.gRNG();
const num=this._details[2]+(i12/4|0);
for(let i14=0;i14<d[8];i14++){
d[i14+9]=this.getItemRank(TableF[(num-1)*4+1],TableF[(num-1)*4+2]);
this._details2[d[i14+9]-1]++;
}
}
}
get floorCount(){return this._details[1];}
get monsterRank(){return this._details[2];}
get mapTypeName(){return ENV_NAMES[this._details[3]]?ENV_NAMES[this._details[3]][0]:"Unknown";}
get mapTypeNameJP(){return ENV_NAMES[this._details[3]]?ENV_NAMES[this._details[3]][1]:"不明";}
get bossName(){return BOSS_NAMES[this._details[0]]?BOSS_NAMES[this._details[0]][0]:"Unknown";}
get bossNameJP(){return BOSS_NAMES[this._details[0]]?BOSS_NAMES[this._details[0]][2]:"不明";}
get mapName(){
if(this.MapRank<2||this.MapRank>248)return"Unknown";
const p=PREFIX_NAMES[this._details[5]][0];
const s=SUFFIX_NAMES[this._details[6]][0];
const l=LOCALE_NAMES[this.MapLocale][0];
return`${p} ${l} of ${s} Lv.${this._details[4]}`;
}
get mapNameJP(){
if(this.MapRank<2||this.MapRank>248)return"Unknown";
const p=PREFIX_NAMES[this._details[5]][1];
const s=SUFFIX_NAMES[this._details[6]][1];
const l=LOCALE_NAMES[this.MapLocale][1];
return`${p}${s}の${l}Lv${this._details[4]}`;
}
getFloorWidth(f){return this.di[f][2];}
getFloorHeight(f){return this.di[f][3];}
getUpStair(f){return{x:this.di[f][4],y:this.di[f][5]};}
getDownStair(f){return{x:this.di[f][6],y:this.di[f][7]};}
getBoxCount(f){return this.di[f][8];}
getBoxInfo(f,i){
const d=this.di[f];
return{rank:d[9+i],x:d[i*2+13],y:d[i*2+14]};
}
getFloorMap(f){
const w=this.getFloorWidth(f),h=this.getFloorHeight(f);
const map=[];
for(let y=0;y<h;y++){
map[y]=[];
for(let x=0;x<w;x++)
map[y][x]=this.di[f][x+(y<<4)+792];
}
return map;
}
getBoxItem(floor,boxIndex,second){
this._seed=(this.di[floor][0]+this.MapSeed+second)>>>0;
for(let i1=0;i1<this.di[floor][8];i1++){
const num1=this.routineRandom(100);
if(i1===boxIndex){
const item=selectChestItem(this.di[floor][i1+9],num1);
if(item!==null)return[item[0],item[1]];
}
}
return[null,null];
}
getFloorItemNames(floor,second){
const d=this.di[floor];
const boxCount=d[8];
this._seed=(d[0]+this.MapSeed+second)>>>0;
const names=[];
for(let i1=0;i1<boxCount;i1++){
const num1=this.routineRandom(100);
const item=selectChestItem(d[i1+9],num1);
names.push(item===null?null:item[0]);
}
return names;
}
getMapBoxCounts(){
let counts={},total=0;
for(let i=0;i<10;i++){
counts[i+1]=this._details2[i];
total+=this._details2[i];
}
return{counts,total};
}
}
const MONSTER_DB={
"008":{t:9,en:"Lost Soul",jp:"さまようたましい",g:20,s:[62,32,32,0,0,100,100,100,100,100,100,200,50,12,70],d:[15,8,34,64]},
"00B":{t:4,en:"Mushroom Mage",jp:"マージマタンゴ",g:16,s:[67,50,56,0,0,125,100,100,100,100,100,125,100,13,56],d:["Belle cap",8,36,8]},
"00E":{t:2,en:"Purrestidigitator",jp:"ベンガルクーン",g:16,s:[96,84,110,0,0,100,125,100,100,125,100,100,50,23,102],d:["Kitty litter",8,"Stolos' staff",256]},
"012":{t:0,en:"Sootheslime",jp:"ベホイムスライム",g:20,s:[138,113,125,2,0,100,100,100,100,100,200,75,100,30,105],d:[12,8,"Slimedrop",8]},
"013":{t:0,en:"Cureslime",jp:"ベホマスライム",g:16,s:[165,158,172,0,0,100,100,100,100,100,150,75,50,38,143],d:["Slimedrop",16,24,64]},
"015":{t:6,en:"Robo-robin",jp:"アイアンクック",g:16,s:[75,100,210,2,0,75,75,100,150,100,100,100,0,24,113],d:[43,16,"Handrills",128]},
"01B":{t:0,en:"Liquid Metal Slime",jp:"はぐれメタル",g:16,s:[8,100,256,4,0,100,100,100,100,100,100,100,0,29,179],d:[51,32,86,128]},
"022":{t:5,en:"Dread Admiral",jp:"しびれあげは",g:16,s:[76,75,76,2,0,100,100,75,100,100,200,100,100,15,80],d:["Butterfly wing",8,"Coagulant",64]},
"026":{t:11,en:"Cannibox",jp:"ひとくいばこ",g:16,s:[187,140,108,0,0,125,100,125,100,100,100,125,0,15,140],d:[11,16,39,128]},
"027":{t:11,en:"Mimic",jp:"ミミック",g:12,s:[627,256,218,0,0,100,100,125,100,100,100,100,0,27,173],d:[11,16,"Gold rosary",64]},
"028":{t:11,en:"Pandora's Box",jp:"パンドラボックス",g:20,s:[868,623,623,2,0,100,50,150,100,100,50,150,0,80,407],d:[11,8,10,128]},
"02A":{t:5,en:"Raving Lunatick",jp:"メーダロード",g:16,s:[85,86,100,2,0,100,100,100,75,100,75,150,100,19,90],d:["Thorn whip",32,19,64]},
"02C":{t:11,en:"Goodybag",jp:"おどるほうせき",g:16,s:[126,115,130,8,0,100,100,125,100,100,125,125,75,30,146],d:["Brighten rock",16,"Pink pearl",64]},
"02E":{t:9,en:"Hell Niño",jp:"ヒートギズモ",g:16,s:[125,115,145,2,0,50,150,100,100,75,100,200,50,33,117],d:["Coagulant",32,"Flame shield",128]},
"02F":{t:9,en:"Freezing Fog",jp:"フロストギズモ",g:16,s:[126,126,156,2,0,150,50,100,100,100,50,200,25,35,162],d:["Ice crystal",16,17,64]},
"031":{t:12,en:"Grim Grinner",jp:"ダークホビット",g:16,s:[110,115,176,0,8,100,75,150,100,100,75,150,75,29,110],d:["Cautery sword",64,"Magic shield",64]},
"034":{t:5,en:"Sluggernaut",jp:"スーパーテンツク",g:20,s:[118,96,123,2,0,75,125,75,100,100,150,100,75,29,124],d:["Cloak of evasion",32,"Starlet sandals",128]},
"035":{t:5,en:"Sluggerslaught",jp:"ラストテンツク",g:16,s:[468,324,324,2,0,100,100,100,125,50,100,125,50,66,246],d:["Heavy handwear",64,"Bardic boots",128]},
"036":{t:8,en:"Pink Sanguini",jp:"ピンクモーモン",g:16,s:[85,85,92,4,0,125,100,100,100,100,125,125,100,18,104],d:[23,16,53,32]},
"037":{t:8,en:"Genie Sanguini",jp:"マポレーナ",g:12,s:[155,89,155,2,0,100,100,100,100,100,200,50,25,33,162],d:["Prayer ring",64,56,128]},
"03B":{t:4,en:"Scourgette",jp:"ブラックベジター",g:20,s:[96,90,98,0,0,150,100,100,100,100,75,150,50,23,81],d:[46,32,"Long spear",128]},
"03D":{t:10,en:"Salamarauder",jp:"かいぞくウーパー",g:20,s:[80,75,67,0,4,125,100,100,100,100,125,125,75,15,70],d:["Emerald moss",16,"Iron shield",64]},
"03E":{t:10,en:"Axolhotl",jp:"ウパパロン",g:12,s:[92,90,100,0,8,75,125,100,100,100,125,125,75,21,83],d:["Iron helmet",32,"Cautery sword",64]},
"040":{t:11,en:"Bagma",jp:"ようがんピロー",g:16,s:[120,120,120,0,0,50,200,100,100,100,100,150,50,32,120],d:[33,16,"Softwort",64]},
"04C":{t:0,en:"Metal Medley",jp:"メタルブラザーズ",g:20,s:[6,70,256,4,0,100,100,100,100,100,100,100,0,29,135],d:["Slimedrop",8,74,128]},
"04D":{t:0,en:"Gem Jamboree",jp:"ゴールデントーテム",g:20,s:[5,208,512,2,0,100,100,100,100,100,100,100,0,55,296],d:[9,16,10,256]},
"051":{t:5,en:"Giddy Gastropog",jp:"メダパニつむり",g:16,s:[90,104,140,0,0,100,125,100,100,100,100,100,100,24,50],d:[41,8,30,64]},
"052":{t:5,en:"Gloomy Gastropog",jp:"ダークデンデン",g:16,s:[144,133,210,0,0,100,50,100,100,100,50,200,50,34,144],d:[41,8,"Spiked armour",256]},
"053":{t:11,en:"Earthenwarrior",jp:"はにわナイト",g:16,s:[55,58,65,0,4,100,100,200,100,75,125,125,100,12,48],d:["Scale shield",32,"Soldier's sword",64]},
"056":{t:7,en:"Skeleton Soldier",jp:"死霊の騎士",g:32,s:[146,136,160,0,0,125,75,100,100,125,100,150,50,30,126],d:["Chain mail",32,"Platinum sword",64]},
"057":{t:7,en:"Dark Skeleton",jp:"影の騎士",g:24,s:[186,153,194,0,0,125,50,100,100,100,50,200,50,35,155],d:["Evencloth",32,"Smart suit",128]},
"059":{t:1,en:"Diethon",jp:"ヘルバイパー",g:16,s:[109,104,108,0,0,100,125,100,100,125,100,100,75,23,102],d:["Snakeskin",8,"Wing of bat",16]},
"05A":{t:1,en:"Sail Serpent",jp:"オーシャンナーガ",g:20,s:[148,144,143,0,0,100,150,100,100,100,125,100,100,32,125],d:["Snakeskin",8,"Snakeskin whip",128]},
"05D":{t:3,en:"Belisha Beakon",jp:"アカイライ",g:12,s:[136,146,143,0,0,150,50,50,100,100,100,150,50,37,167],d:["Crimson coral",32,"Red tights",128]},
"05E":{t:7,en:"Lesionnaire",jp:"がいこつ兵",g:20,s:[99,106,115,0,0,125,75,100,100,100,75,200,50,22,99],d:["Gold rosary",16,"Iron cuirass",64]},
"05F":{t:7,en:"Deadcurion",jp:"しにがみ兵",g:20,s:[112,115,117,0,0,200,50,100,100,100,50,200,0,26,98],d:[40,64,"Battle fork",128]},
"060":{t:7,en:"Stenchurion",jp:"ゾンビナイト",g:16,s:[160,148,175,0,0,150,50,100,100,100,50,200,0,34,136],d:[52,8,"Partisan",128]},
"062":{t:11,en:"Teaky Mask",jp:"トーテムキラー",g:16,s:[98,111,131,0,0,150,75,150,100,75,100,100,50,28,114],d:["Hardwood headwear",16,"Ice shield",256]},
"063":{t:2,en:"Bewarewolf",jp:"リカント",g:12,s:[87,83,89,0,0,100,100,100,125,100,100,100,75,16,77],d:["Magic beast hide",16,"Iron claws",64]},
"065":{t:2,en:"Scarewolf",jp:"リカントマムル",g:16,s:[102,94,105,0,0,100,75,100,125,100,100,100,75,19,87],d:["Magic beast hide",8,"Sacred claws",64]},
"067":{t:7,en:"Toxic Zombie",jp:"どくどくゾンビ",g:16,s:[150,82,35,0,0,150,50,100,100,100,100,200,50,17,32],d:[52,16,"Boomer briefs",64]},
"068":{t:7,en:"Ghoul",jp:"グール",g:8,s:[162,112,65,0,0,150,50,125,100,100,75,200,75,26,90],d:[52,16,"Tough guy tattoo",64]},
"06A":{t:10,en:"Spinchilla",jp:"うずしおキング",g:16,s:[126,88,78,8,0,125,75,100,100,100,125,125,50,17,96],d:["Seashell",16,"Crimson coral",32]},
"06B":{t:9,en:"Whirly Girly",jp:"レッドサイクロン",g:20,s:[144,120,150,8,0,100,125,50,100,100,150,100,50,30,131],d:[51,32,"Pretty betsy",256]},
"06D":{t:7,en:"Mummy",jp:"マミー",g:8,s:[138,112,80,0,0,125,75,100,100,100,75,200,50,23,66],d:["Grubby bandage",8,57,256]},
"06E":{t:7,en:"Blood Mummy",jp:"ブラッドマミー",g:16,s:[166,138,135,0,0,150,75,75,100,100,75,150,50,31,67],d:["Grubby bandage",8,57,128]},
"070":{t:1,en:"Wyrtoise",jp:"ガメゴンロード",g:16,s:[215,171,240,0,0,50,150,100,50,100,100,100,75,37,103],d:["Tortoiseshell",8,"Dragon scale",32]},
"072":{t:2,en:"Rampage",jp:"ゴートドン",g:12,s:[100,80,80,0,0,125,75,100,100,125,100,100,75,16,60],d:["Lambswool",8,"Magic beast horn",64]},
"074":{t:11,en:"Rockbomb",jp:"ばくだん岩",g:20,s:[100,100,156,0,0,100,100,125,100,75,100,125,50,25,76],d:[46,8,58,128]},
"076":{t:11,en:"Bomboulder",jp:"メガザルロック",g:16,s:[146,78,180,0,0,75,100,150,100,75,100,150,50,32,100],d:[46,16,"Yggdrasil dew",128]},
"077":{t:11,en:"Restless Armour",jp:"さまようよろい",g:16,s:[100,95,97,0,8,100,100,125,100,100,100,100,50,17,63],d:["Iron broadsword",64,"Iron armour",128]},
"078":{t:11,en:"Infernal Armour",jp:"じごくのよろい",g:16,s:[125,135,130,0,8,75,125,100,100,100,75,125,50,27,102],d:["Cautery sword",64,"Silver mail",128]},
"079":{t:11,en:"Lethal Armour",jp:"キラーアーマー",g:16,s:[194,158,210,0,8,75,75,150,100,100,75,150,50,35,117],d:["Magic armour",128,"Seed of defence",256]},
"07B":{t:0,en:"Metal Slime Knight",jp:"メタルライダー",g:16,s:[46,82,140,0,4,50,50,50,50,100,200,100,50,18,80],d:["Light shield",64,"Iron helmet",128]},
"07C":{t:2,en:"Swinoceros",jp:"突げきホーン",g:20,s:[120,105,121,0,0,100,75,100,75,100,200,100,75,24,91],d:["Magic beast horn",8,"Cowpat",32]},
"07D":{t:2,en:"Splatterhorn",jp:"ライノキング",g:16,s:[134,120,164,0,0,50,125,100,75,100,150,100,50,29,118],d:["Magic beast horn",16,"Magic beast hide",32]},
"07F":{t:9,en:"Admirer",jp:"ジェリーマン",g:16,s:[120,102,85,0,0,125,125,100,100,75,100,100,50,22,75],d:[33,32,45,64]},
"080":{t:9,en:"Live Lava",jp:"マグマロン",g:12,s:[165,140,186,0,0,50,150,100,100,100,100,100,50,33,124],d:[33,16,"Magma staff",128]},
"082":{t:2,en:"Big Badboon",jp:"バブーン",g:12,s:[147,106,74,0,0,100,125,100,100,100,100,100,75,19,62],d:["Magic beast hide",8,50,128]},
"083":{t:2,en:"Brainy Badboon",jp:"ヒババンゴ",g:12,s:[150,120,99,0,0,75,125,100,100,100,200,100,50,26,95],d:["Magic beast hide",32,"Raging ruby",32]},
"084":{t:12,en:"Magus",jp:"まじゅつし",g:12,s:[58,48,38,0,0,100,100,100,100,100,100,150,50,12,70],d:["Wizard's staff",64,16,128]},
"086":{t:12,en:"Sorcerer",jp:"ようじゅつし",g:16,s:[99,94,114,0,0,100,75,125,100,125,100,150,50,26,114],d:["Magical robes",32,"Seed of magic",256]},
"087":{t:1,en:"Mandrake Major",jp:"リザードマン",g:16,s:[107,98,107,0,4,100,125,100,100,100,100,100,100,23,87],d:["Dragon scale",16,"Heavy armour",128]},
"088":{t:1,en:"Mandrake Marauder",jp:"りゅう兵士",g:20,s:[172,132,198,0,4,75,100,100,150,150,100,100,50,34,144],d:["Dragon scale",16,"Bandit blade",128]},
"089":{t:1,en:"Mandrake Marshal",jp:"シュプリンガー",g:16,s:[222,163,212,2,4,100,50,100,50,150,150,100,100,36,152],d:["Dragon scale",64,"Dragonsbane",128]},
"08B":{t:4,en:"Treevil",jp:"ウドラー",g:12,s:[111,101,101,2,0,150,100,75,100,75,100,100,50,24,99],d:[22,16,"Coagulant",64]},
"08C":{t:3,en:"Chimaera",jp:"キメラ",g:8,s:[75,70,72,2,0,75,125,100,100,100,100,125,75,14,86],d:[27,8,"Flurry feather",32]},
"08D":{t:3,en:"Hocus Chimaera",jp:"メイジキメラ",g:16,s:[80,80,80,2,0,75,125,100,100,100,100,100,75,18,86],d:[27,16,"Prayer ring",128]},
"08F":{t:11,en:"Raving Reaper",jp:"アサシンドール",g:16,s:[134,135,134,0,0,125,100,100,100,50,50,150,0,28,119],d:["Thief's turban",64,"Assassin's dagger",128]},
"092":{t:2,en:"Badja",jp:"ブラックタヌー",g:16,s:[105,98,101,2,4,100,100,100,100,150,100,150,100,23,104],d:["Magic beast hide",8,"Special medicine",64]},
"094":{t:12,en:"Corrupt Carter",jp:"エビルチャリオット",g:20,s:[155,138,200,0,0,100,100,100,150,100,100,150,50,33,147],d:[43,32,"Handrills",64]},
"095":{t:10,en:"Mortoad",jp:"ガマキャノン",g:16,s:[140,80,70,0,0,75,125,100,100,100,125,125,100,16,48],d:[41,8,52,32]},
"096":{t:2,en:"Expload",jp:"デザートタンク",g:16,s:[142,102,116,0,0,75,100,100,150,100,100,100,75,22,64],d:[41,8,"Bow tie",64]},
"097":{t:2,en:"Blastoad",jp:"キャノンキング",g:16,s:[356,163,160,0,0,50,100,100,150,100,100,100,50,35,101],d:[41,8,24,64]},
"099":{t:3,en:"Peckerel",jp:"アサシンエミュー",g:20,s:[107,107,107,2,0,100,125,75,100,100,100,100,50,25,107],d:[19,16,"Poison needle",64]},
"09D":{t:10,en:"Knocktopus",jp:"ニードルオクト",g:16,s:[75,68,60,0,0,125,75,100,100,100,125,125,100,14,51],d:["Magic beast horn",16,"Crimson coral",32]},
"09E":{t:6,en:"Shocktopus",jp:"オクトスパイカー",g:20,s:[75,85,156,0,0,75,75,100,150,100,100,100,150,21,90],d:["Magic beast horn",16,37,32]},
"09F":{t:8,en:"Manguini",jp:"アーゴンデビル",g:16,s:[108,112,114,4,0,100,100,100,125,100,75,150,50,23,117],d:["Wing of bat",8,"Terrible tattoo",32]},
"0A0":{t:8,en:"Bloody Manguini",jp:"ブラッドアーゴン",g:20,s:[154,133,148,2,0,75,100,150,100,100,75,150,0,12,139],d:["Wing of bat",8,"Terrible tattoo",16]},
"0A2":{t:8,en:"Great Gruffon",jp:"ビッグボック",g:16,s:[150,120,120,0,0,125,50,100,150,100,75,125,50,28,70],d:["Wing of bat",8,"Fur poncho",64]},
"0A3":{t:8,en:"Gramarye Gruffon",jp:"アロダイタス",g:16,s:[215,150,125,0,0,100,100,100,150,100,50,100,50,30,76],d:["Wing of bat",16,"Safety shoes",64]},
"0A4":{t:2,en:"Trigertaur",jp:"タイガーランス",g:16,s:[100,98,100,2,0,100,125,100,100,100,100,100,50,20,85],d:["Magic beast hide",8,"Holy lance",128]},
"0A5":{t:2,en:"White Trigertaur",jp:"ホワイトランサー",g:20,s:[128,130,135,2,0,125,75,75,100,100,100,100,0,2,116],d:["Horse manure",16,"Seed of deftness",256]},
"0A6":{t:2,en:"Sick Trigertaur",jp:"キマライガー",g:16,s:[480,208,222,2,0,100,50,150,50,100,50,150,0,40,156],d:["Horse manure",16,"Partisan",128]},
"0A7":{t:8,en:"Moosifer",jp:"アンクルホーン",g:16,s:[156,140,155,0,0,50,100,150,100,100,50,150,50,31,133],d:["Magic beast hide",16,"Seed of life",256]},
"0A8":{t:8,en:"Barbatos",jp:"ヘルバトラー",g:16,s:[355,199,255,0,0,50,150,100,100,100,100,100,50,40,178],d:["Terrible tattoo",16,"Raging bull helm",128]},
"0A9":{t:1,en:"Green Dragon",jp:"グリーンドラゴン",g:20,s:[245,178,208,0,0,100,100,100,100,150,100,150,50,34,109],d:["Emerald moss",16,"Dragon scale",16]},
"0AA":{t:1,en:"Red Dragon",jp:"レッドドラゴン",g:16,s:[325,198,230,0,0,50,50,100,100,100,100,200,0,38,121],d:["Dragon scale",16,"Dragon claws",128]},
"0AB":{t:1,en:"Rashaverak",jp:"アンドレアル",g:16,s:[1124,707,604,0,0,50,100,150,100,100,100,100,0,98,98],d:["Dragon scale",8,"Brighten rock",64]},
"0AC":{t:11,en:"Living Statue",jp:"うごくせきぞう",g:16,s:[236,155,200,0,0,100,100,125,100,75,100,100,50,31,99],d:[47,16,49,128]},
"0AE":{t:1,en:"Drakularge",jp:"ギガントヒルズ",g:16,s:[286,160,175,0,0,100,100,100,150,100,100,100,50,32,106],d:["Dragon scale",16,10,256]},
"0AF":{t:1,en:"Drakulard",jp:"ギガントドラゴン",g:20,s:[520,203,203,0,0,100,150,50,100,50,100,150,50,40,112],d:["Dragon scale",16,71,128]},
"0B0":{t:1,en:"Drakulord",jp:"ドラゴン・ウー",g:16,s:[1414,725,404,0,0,50,150,100,100,50,100,150,0,40,286],d:["Dragon scale",8,"Dragon claws",64]},
"0B1":{t:6,en:"Hunter Mech",jp:"メタルハンター",g:16,s:[95,95,110,2,0,75,75,100,200,100,100,100,0,20,100],d:[43,32,"Hunter's bow",64]},
"0B2":{t:6,en:"Killing Machine",jp:"キラーマシン",g:16,s:[182,155,216,2,0,75,100,100,125,100,100,150,0,35,164],d:[37,16,"Seed of agility",256]},
"0B3":{t:0,en:"King Slime",jp:"キングスライム",g:16,s:[245,136,95,0,0,100,100,100,100,100,200,50,50,22,75],d:["Slimedrop",8,"Slime crown",256]},
"0B4":{t:0,en:"King Cureslime",jp:"スライムベホマズン",g:20,s:[256,216,235,0,0,100,100,100,100,100,150,50,0,56,101],d:["Slimedrop",64,"Slime crown",128]},
"0B5":{t:0,en:"Metal King Slime",jp:"メタルキング",g:16,s:[16,318,512,4,0,100,100,100,100,100,100,100,0,29,349],d:["Slime crown",128,114,256]},
"0B6":{t:9,en:"Cumulus Rex",jp:"くもの大王",g:28,s:[252,140,151,4,0,150,100,50,50,100,100,150,50,33,134],d:["Thunderball",16,"Lightning staff",128]},
"0B7":{t:9,en:"Cumulus Vex",jp:"ヘルクラウダー",g:16,s:[268,169,246,4,0,100,100,50,50,50,100,200,0,37,161],d:["Thunderball",16,"Seed of sorcery",256]},
"0B8":{t:0,en:"Darkonium Slime",jp:"スライムマデュラ",g:20,s:[420,400,500,2,0,0,0,0,0,0,0,0,0,22,403],d:["Slimedrop",32,"Thinking cap",128]},
"0B9":{t:0,en:"Gem Slime",jp:"ゴールデンスライム",g:20,s:[20,455,512,4,0,100,100,100,100,100,100,100,0,40,456],d:[10,128,114,256]},
"0BA":{t:11,en:"Stone Golem",jp:"ストーンマン",g:16,s:[156,104,130,0,0,100,100,200,100,75,100,100,50,19,55],d:[47,16,49,128]},
"0BB":{t:11,en:"Gold Golem",jp:"ゴールドマン",g:16,s:[250,136,130,0,0,100,75,125,100,100,125,100,50,24,77],d:[38,32,9,256]},
"0BC":{t:11,en:"Golem",jp:"ゴーレム",g:12,s:[300,175,210,0,0,75,50,150,100,100,100,150,0,33,99],d:[47,16,74,128]},
"0BD":{t:2,en:"Drackal",jp:"ストロングアニマル",g:20,s:[230,148,123,0,0,100,125,100,100,100,150,100,50,27,87],d:["Lambswool",16,"Platinum ore",128]},
"0BE":{t:2,en:"Drastic Drackal",jp:"ヘルジャッカル",g:16,s:[225,165,164,0,0,150,50,100,100,100,50,150,75,12,124],d:[32,16,"Raging ruby",64]},
"0C0":{t:11,en:"Harmour",jp:"デビルアーマー",g:16,s:[145,135,180,0,4,100,100,100,50,150,100,150,50,31,108],d:["Silver mail",64,40,128]},
"0C1":{t:11,en:"Bad Karmour",jp:"てっこうまじん",g:16,s:[188,161,262,0,4,50,100,50,50,150,100,150,50,37,98],d:[43,16,81,128]},
"0C2":{t:11,en:"Alarmour",jp:"サタンメイル",g:16,s:[454,454,612,0,4,100,100,50,50,150,50,150,50,77,109],d:[40,64,94,256]},
"0C3":{t:7,en:"Fright Knight",jp:"ナイトリッチ",g:16,s:[226,161,206,0,25,125,50,100,100,100,50,200,0,36,130],d:["Sword breaker",64,"Dark shield",256]},
"0C4":{t:7,en:"Night Knight",jp:"ナイトキング",g:16,s:[256,186,225,0,25,150,50,100,100,100,50,200,0,39,169],d:["Dark shield",64,96,256]},
"0C5":{t:3,en:"Terrorhawk",jp:"マッドファルコン",g:20,s:[146,128,160,2,0,100,150,100,100,100,150,100,50,32,140],d:[33,32,"Fowl fan",64]},
"0C6":{t:3,en:"Prism Peacock",jp:"にじくじゃく",g:16,s:[246,171,234,2,0,50,125,100,100,100,150,50,0,39,177],d:["Lunaria",32,"Tint-tastic tutu",256]},
"0C7":{t:3,en:"Bird of Terrordise",jp:"れんごくまちょう",g:20,s:[648,514,528,2,0,50,150,100,100,100,100,100,50,52,285],d:["Fowl fan",64,"Flame shield",128]},
"0C8":{t:11,en:"Mad Moai",jp:"ビッグモアイ",g:16,s:[125,100,125,0,0,100,100,200,100,75,100,100,0,6,9],d:[32,16,47,128]},
"0C9":{t:11,en:"Mega Moai",jp:"ゴードンヘッド",g:16,s:[180,162,235,0,0,75,100,150,100,100,100,150,0,10,88],d:[48,32,"Tough guy tattoo",128]},
"0CA":{t:8,en:"Sculptrice",jp:"ヘルビースト",g:16,s:[145,145,144,0,0,100,100,125,100,75,100,200,50,29,89],d:["Galvanised geta",64,56,128]},
"0CB":{t:11,en:"Sculpture Vulture",jp:"リビングスタチュー",g:20,s:[153,140,190,0,0,50,150,150,100,100,100,100,50,31,110],d:[20,32,49,128]},
"0CC":{t:8,en:"Aggrosculpture",jp:"ウィングデビル",g:16,s:[220,150,220,2,0,100,100,100,100,100,100,100,50,37,153],d:[38,32,79,256]},
"0CD":{t:7,en:"Wight Priest",jp:"デスプリースト",g:16,s:[126,108,136,0,0,150,50,100,100,150,100,200,0,28,125],d:["Gold rosary",32,"Ascetic robe",128]},
"0CE":{t:7,en:"Wight King",jp:"ワイトキング",g:16,s:[186,143,196,0,0,150,50,100,100,100,50,200,0,36,149],d:["Priestess's pinafore",128,"Seed of therapeusis",256]},
"0CF":{t:10,en:"Claw Hammer",jp:"ヘルマリーン",g:16,s:[98,108,90,0,0,125,50,100,200,100,100,100,75,20,90],d:["Magic beast horn",16,"Tough guy tattoo",128]},
"0D0":{t:10,en:"Power Hammer",jp:"サンドシャーク",g:16,s:[110,85,105,0,0,100,125,100,100,100,100,100,75,22,100],d:["Glass frit",32,"Kitty litter",64]},
"0D4":{t:8,en:"Python Priest",jp:"スネークロード",g:16,s:[136,120,160,0,0,100,100,100,150,100,50,150,50,32,130],d:["Watermaul wand",64,"Fizzle-retardant suit",128]},
"0D5":{t:8,en:"Cobra Cardinal",jp:"じごくのメンドーサ",g:20,s:[236,163,198,0,0,100,100,100,150,50,50,200,0,39,160],d:["Fizzle-retardant blouse",128,"Elfin elixir",256]},
"0D6":{t:2,en:"Tantamount",jp:"れんごく天馬",g:24,s:[1056,358,388,2,0,50,150,100,75,100,100,100,0,66,338],d:["Horse manure",16,"Friendly fan",256]},
"0D7":{t:2,en:"Godsteed",jp:"レジェンドホース",g:20,s:[686,575,566,2,0,100,100,100,100,100,150,50,50,10,415],d:["Horse manure",8,"Friendly fan",256]},
"0D9":{t:8,en:"Cyclops",jp:"サイクロプス",g:16,s:[355,170,150,0,0,100,50,100,150,100,100,150,50,32,75],d:[28,16,"Fur vest",128]},
"0DA":{t:8,en:"Gigantes",jp:"ギガンテス",g:12,s:[640,212,190,0,0,100,50,100,150,100,100,100,1,30,115],d:[50,64,"Ace of clubs",128]},
"0DC":{t:8,en:"Troll",jp:"トロル",g:8,s:[413,158,70,0,0,100,100,100,125,75,100,150,50,32,60],d:[28,8,"Seed of strength",256]},
"0DD":{t:8,en:"Boss Troll",jp:"ボストロール",g:16,s:[496,186,86,0,0,100,100,100,100,100,50,150,50,36,95],d:[28,16,"Boomer briefs",64]},
"0DE":{t:8,en:"Great Troll",jp:"トロルキング",g:16,s:[768,220,132,0,0,100,100,100,100,50,50,200,50,40,107],d:["Special medicine",32,"Marauder's maul",128]},
"0DF":{t:9,en:"Magmalice",jp:"ようがんまじん",g:16,s:[200,158,225,0,0,50,150,100,100,75,100,150,0,34,105],d:[33,16,58,128]},
"0E0":{t:9,en:"Firn Fiend",jp:"ひょうがまじん",g:16,s:[365,195,268,0,0,200,50,100,100,50,100,150,0,40,104],d:["Ice crystal",16,123,256]},
"0E2":{t:0,en:"Slionheart",jp:"ゴッドライダー",g:16,s:[825,506,512,0,4,100,100,100,75,100,150,100,0,98,336],d:["Falcon blade",128,"Pallium Regale",256]},
"0E4":{t:6,en:"AU-1000",jp:"ゴールドマジンガ",g:20,s:[996,567,798,4,0,100,100,100,100,100,200,75,0,99,124],d:[10,128,107,256]},
"0E5":{t:6,en:"Void Droid",jp:"ファイナルウェポン",g:20,s:[1325,575,625,2,0,75,75,75,200,75,100,100,0,99,348],d:[74,32,"Brawling byrnie",128]},
"0E6":{t:2,en:"Alphyn",jp:"キマイラロード",g:16,s:[1246,525,556,0,0,75,75,150,75,100,150,100,0,98,436],d:[48,32,82,64]},
"0E7":{t:2,en:"Vermil Lion",jp:"じごくのヌエ",g:16,s:[1378,564,626,2,0,50,100,100,100,100,50,150,0,99,455],d:[105,128,95,128]},
"0E8":{t:9,en:"Shivery Shrubbery",jp:"デビルスノー",g:16,s:[81,96,99,25,0,150,50,100,100,100,75,150,75,8,102],d:["Ice crystal",32,20,64]},
"0E9":{t:3,en:"Apeckalypse",jp:"ランドンクイナ",g:16,s:[130,118,118,2,0,125,75,100,100,100,100,100,75,27,121],d:[52,32,"Assassin's dagger",128]},
"0EB":{t:1,en:"Wonder Wyrtle",jp:"ガメゴンレジェンド",g:20,s:[1040,606,720,0,0,50,150,100,50,100,150,100,0,42,52],d:["Tortoiseshell",8,"Dragon shield",64]},
"0EC":{t:9,en:"Geothaum",jp:"あんこくまじん",g:16,s:[708,708,668,0,0,100,100,100,100,50,50,200,0,98,72],d:[47,16,"Evencloth",32]},
"0ED":{t:3,en:"Cosmic Chimaera",jp:"スターキメラ",g:16,s:[516,378,396,4,0,100,100,100,100,100,200,50,50,77,275],d:["Brighten rock",8,85,128]},
"0EE":{t:8,en:"Master Moosifer",jp:"デスカイザー",g:16,s:[1056,684,648,0,0,50,125,100,100,100,75,150,0,99,308],d:["Magic beast hide",8,"Raging ruby",128]},
"0EF":{t:11,en:"Freaky Tiki",jp:"まおうのかめん",g:16,s:[596,442,498,8,0,75,75,150,75,75,75,150,75,77,245],d:["Terrible tattoo",32,"Boss shield",128]},
"0F0":{t:1,en:"Mandrake Monarch",jp:"まかいファイター",g:20,s:[735,486,496,0,4,75,75,150,100,100,75,125,50,77,250],d:["Dragon scale",16,"Veteran's helm",128]},
"0F1":{t:9,en:"Cumulus Hex",jp:"ヘルミラージュ",g:16,s:[796,462,472,2,0,150,100,50,50,50,100,150,0,88,282],d:["Mistick",32,"Flowing dress",64]},
"0F2":{t:0,en:"Platinum King Jewel",jp:"プラチナキング",g:16,s:[20,356,546,2,0,100,100,100,100,100,100,100,0,29,505],d:["Platinum ore",8,"Seed of skill",256]},
"0F3":{t:11,en:"Charmour",jp:"マジックアーマー",g:20,s:[220,171,270,0,0,75,75,50,50,200,75,100,50,38,134],d:["Magic armour",32,"Halberd",128]},
"0F4":{t:7,en:"Blight Knight",jp:"ヴァルハラー",g:16,s:[965,695,598,0,25,150,50,100,100,100,50,150,0,99,298],d:[96,64,"Veteran's helm",128]},
"0F5":{t:11,en:"Moai Minstrel",jp:"クラウンヘッド",g:16,s:[518,368,567,0,0,100,100,125,100,75,100,100,0,66,206],d:[20,32,"Witch's hat",64]},
"0F6":{t:2,en:"Grrrgoyle",jp:"ホラービースト",g:16,s:[636,538,598,0,0,100,100,150,100,50,100,100,50,88,255],d:[49,32,57,256]},
"0F7":{t:7,en:"Wight Emperor",jp:"ロードコープス",g:16,s:[488,465,455,0,0,150,50,100,100,100,50,200,0,77,242],d:["Mitre",64,"Surplice",128]},
"0F8":{t:8,en:"Boogie Manguini",jp:"イエローサタン",g:16,s:[488,402,478,4,0,100,100,100,75,125,75,125,50,77,393],d:["Wing of bat",8,"Lunaria",64]},
"0F9":{t:11,en:"Barriearthenwarrior",jp:"ちていのばんにん",g:20,s:[512,432,596,0,4,100,100,150,100,50,100,100,0,77,239],d:[32,16,"Warrior's sword",128]},
"0FA":{t:11,en:"Grim Reaper",jp:"メフィストフェレス",g:20,s:[596,476,448,2,0,100,50,100,100,100,50,200,0,77,383],d:["Minister's mittens",64,78,128]},
"0FB":{t:2,en:"Bling Badger",jp:"ゴールドタヌ",g:16,s:[445,394,495,0,0,100,100,100,75,150,150,50,50,88,315],d:["Magic beast hide",8,26,128]},
"0FC":{t:12,en:"Flamin' Drayman",jp:"じごくぐるま",g:16,s:[480,416,452,0,0,50,150,100,100,100,100,150,50,66,229],d:[46,32,58,64]},
"0FD":{t:10,en:"Hammer Horror",jp:"ダークマリーン",g:16,s:[874,586,586,2,0,100,100,100,150,100,50,150,0,10,375],d:["Heavy handwear",32,"Cobra claws",128]},
"0FE":{t:8,en:"Boa Bishop",jp:"ビュアール",g:12,s:[633,309,296,0,0,125,75,100,125,100,75,75,50,40,264],d:["Wizard's hat",64,"Wizard's robe",256]},
"0FF":{t:10,en:"Handsome Crab",jp:"ガニラス",g:12,s:[121,68,195,0,0,150,50,100,100,100,100,100,100,33,56],d:[49,32,"Deadly nightblade",128]},
"101":{t:10,en:"Crabber Dabber Doo",jp:"じごくのハサミ",g:16,s:[112,115,121,0,0,125,100,125,100,50,100,100,100,24,78],d:["Seashell",16,"Poison moth knife",64]},
"102":{t:10,en:"King Crab",jp:"キラークラブ",g:16,s:[270,181,235,0,0,100,75,100,125,50,100,100,75,38,158],d:["Sleeping hibiscus",16,"Poison moth knife",128]},
"103":{t:12,en:"Icikiller",jp:"アイスビックル",g:16,s:[140,140,144,4,0,150,50,100,100,100,100,100,50,32,136],d:["Scale armour",16,"Crow's claws",64]},
"104":{t:10,en:"Riptide",jp:"オーシャンクロー",g:20,s:[102,102,105,2,0,100,100,100,100,125,100,125,0,5,105],d:["Dragon scale",32,"Razor claws",64]},
"105":{t:12,en:"Claws",jp:"クローハンズ",g:16,s:[206,153,198,4,0,100,50,50,100,125,100,150,0,7,178],d:["Sacred claws",64,"Dragon mail",128]},
"106":{t:10,en:"Seasaur",jp:"ギャオース",g:12,s:[304,180,192,0,0,50,50,100,125,100,100,150,50,34,101],d:["Dragon scale",16,"Magic beast horn",64]},
"107":{t:10,en:"Abyss Diver",jp:"ヘルダイバー",g:16,s:[600,200,220,0,0,50,50,100,150,100,100,150,75,38,126],d:["Dragon scale",32,"Watermaul wand",128]},
"108":{t:10,en:"Seavern",jp:"シーバーン",g:12,s:[1127,686,546,0,0,50,50,100,150,100,100,150,50,60,126],d:[56,32,"Cobra fan",64]},
"109":{t:8,en:"Terror Troll",jp:"ダークトロル",g:16,s:[1176,454,263,0,0,100,100,100,100,50,50,200,50,66,84],d:[32,16,"Roguess's robes",128]},
"10C":{t:0,en:"Prime Slime",jp:"デンガー",g:12,s:[914,445,375,0,4,100,100,100,50,100,150,100,50,88,432],d:["Valkyrie sword",64,"Falcon blade",128]},
"141":{t:2,en:"Octagoon",jp:"アイアンブルドー",g:20,s:[522,420,516,0,0,75,75,75,75,75,200,100,0,66,129],d:["Magic beast hide",8,"Platinum ore",32]},
"143":{t:8,en:"Cannibelle",jp:"ヘルヴィーナス",g:16,s:[468,396,396,0,0,100,50,100,150,100,50,150,0,66,228],d:["Spangled dress",32,"Fencing frock",128]},
"144":{t:9,en:"Scarlet Fever",jp:"エビルフレイム",g:16,s:[743,429,478,4,0,50,150,100,100,100,100,150,0,88,319],d:[33,16,"Fire blade",128]},
"145":{t:9,en:"Uncommon Cold",jp:"マッドブリザード",g:20,s:[907,528,487,4,0,150,50,100,100,100,100,150,0,42,356],d:["Ice crystal",32,"Icicle dirk",128]},
"147":{t:10,en:"Stale Whale",jp:"だいおうクジラ",g:16,s:[1244,584,496,0,0,100,100,100,150,100,100,100,50,88,106],d:["Glass frit",16,"Trident",64]},
"148":{t:10,en:"Pale Whale",jp:"オーシャンボーン",g:20,s:[1456,748,586,2,0,100,100,100,100,100,150,50,0,20,79],d:[22,16,"Wizard's hat",128]},
"149":{t:5,en:"Widow's Pique",jp:"デスタランチュラ",g:20,s:[955,595,625,0,0,50,100,150,100,100,100,150,50,99,302],d:["Tangleweb",8,"Rogue's robes",128]},
"14A":{t:5,en:"Cyber Spider",jp:"ボーンスパイダ",g:16,s:[596,478,488,0,0,125,125,125,125,75,125,125,50,88,255],d:["Tangleweb",8,"Handrills",128]},
"14B":{t:8,en:"Slugly Betsy",jp:"うみうしひめ",g:16,s:[1477,404,236,0,0,150,50,100,100,50,150,100,0,60,170],d:["Watermaul wand",64,"Nomadic deel",128]},
"14D":{t:2,en:"Hell's Gatekeeper",jp:"ヘルガーディアン",g:20,s:[996,535,645,0,4,100,100,100,150,100,75,150,50,98,115],d:[81,64,80,128]},
"14E":{t:2,en:"Wishmaster",jp:"ギリメカラ",g:12,s:[663,513,563,0,0,100,150,100,100,50,50,150,50,77,96],d:[71,32,"Holy femail",128]},
"025":{t:8,en:"Jinkster",jp:"ひとつめピエロ",s:[60,50,60,2,0,100,100,100,100,100,100,125,100,14,78],d:[17,32,"Pointy hat",64]},
"032":{t:12,en:"Gum Shield",jp:"ビッグフェイス",s:[80,80,101,0,4,100,100,100,100,100,100,125,75,18,81],d:["Light shield",64,"Iron broadsword",128]},
"04B":{t:0,en:"Slime Stack",jp:"スライムタワー",s:[177,93,68,0,0,100,100,100,125,100,200,100,50,14,102],d:["Slimedrop",8,"Slime earrings",32]},
"054":{t:11,en:"Brrearthenwarrior",jp:"ふゆしょうぐん",s:[125,125,135,0,4,150,50,100,100,75,100,100,50,27,105],d:["Ice crystal",32,"Ice shield",256]},
"05C":{t:3,en:"Weaken Beakon",jp:"デッドペッカー",s:[78,72,90,0,0,100,150,75,100,125,100,100,75,19,88],d:["Flurry feather",16,"Crow's claws",128]},
"064":{t:2,en:"Tearwolf",jp:"キラーリカント",s:[136,121,125,0,0,100,75,100,125,100,100,100,50,27,112],d:["Magic beast hide",8,"Cloak of evasion",64]},
"08A":{t:4,en:"Treeface",jp:"じんめんじゅ",s:[95,83,78,2,0,125,100,100,100,100,100,100,100,18,63],d:[14,32,20,64]},
"0AD":{t:11,en:"Stone Guardian",jp:"だいまじん",s:[255,160,255,0,0,75,75,150,100,100,75,100,0,11,102],d:[49,64,123,256]},
"100":{t:5,en:"Crabid",jp:"ぐんたいガニ",s:[72,72,83,0,0,100,100,100,100,100,150,150,100,16,15],d:["Tortoiseshell",16,"Crimson coral",64]},
};
const G_VALUES={
1:[0,116,132,128,128,144,132,140,124,128,124,132,140],
2:[0,124,120,116,132,136,128,136,140,136,128,128,136],
3:[0,108,132,116,148,128,128,128,128,136,120,120,116],
4:[0,140,132,132,128,140,144,124,128,136,128,124,124],
5:[0,128,128,112,128,128,132,128,136,140,136,140,136]
};
function matchesOnlyMonFloor(env,floorMR,name){return MONSTER_DB[ONLY_MONSTERS[env][floorMR]].en===name;}
const SPAWN_DB={
1:{
1:[["00B",6555],["00E",13108],["022",0],["026"],["027"],["028"],["082",26215],["08C",19662]],
2:[["026"],["027"],["028"],["036",6555],["03B",19662],["063",0],["087",26215],["0BD",13108]],
3:[["026"],["027"],["028"],["034",13108],["083",6555],["08B",26215],["099",0],["101",19662]],
4:[["026"],["027"],["028"],["076",0],["07C",13108],["080",19662],["0AE",26215],["0D9",6555]],
5:[["026"],["027"],["028"],["052",13108],["07D",6555],["0B6",19662],["0C5",0],["0DD",26215]],
6:[["026"],["027"],["028"],["02F",26215],["089",0],["097",6555],["0A9",19662],["105",13108]],
7:[["026"],["027"],["028"],["04D",16385],["089",25747],["0B4",0],["0B7",18725],["0D5",8193]],
8:[["026"],["027"],["028"],["037",0],["0C6",25818],["0F5",5959],["102",18867],["109",11917]],
9:[["026"],["027"],["028"],["035",13903],["0AF",26811],["0ED",0],["109",20853],["14E",6952]],
10:[["026"],["027"],["028"],["0B5",31555],["0ED",16992],["0F1",0],["147",8497],["14E",24273]],
11:[["026"],["027"],["028"],["035",21846],["0D7",7647],["0E2",0],["0ED",26215],["147",15293]],
12:[["026"],["027"],["028"],["0D7",20481],["0E2",14337],["0EB",0],["0F1",26625],["149",7169]],
},
2:{
1:[["026"],["027"],["028"],["053",19662],["077",0],["084",13108],["096",26215],["0BA",6555]],
2:[["026"],["027"],["028"],["02A",6555],["09F",26215],["0A4",19662],["0C8",13108],["0DC",0]],
3:[["026"],["027"],["028"],["040",11917],["04C",10427],["0A3",22343],["0B1",0]],
4:[["026"],["027"],["028"],["034",13108],["062",6555],["086",26215],["08F",19662],["0AC",0]],
5:[["026"],["027"],["028"],["062",13108],["094",19662],["0B2",6555],["0CB",0],["0DD",26215]],
6:[["026"],["027"],["028"],["097",13108],["0A6",26215],["0BC",0],["0D5",19662],["105",6555]],
7:[["01B",0],["026"],["027"],["028"],["0B8",5700],["0DE",12823],["105",22796],["141",1426]],
8:[["026"],["027"],["028"],["035",18725],["04D",29648],["0A8",23406],["0B8",0],["141",10924]],
9:[["026"],["027"],["028"],["035",28836],["0B8",15730],["0C2",6555],["0EF",0],["141",19662]],
10:[["026"],["027"],["028"],["04D",31555],["0C2",24273],["0EF",16992],["0FE",0],["14A",8497]],
11:[["026"],["027"],["028"],["0B9",4856],["0E6",0],["0EF",24273],["0FE",7283],["14A",15778]],
12:[["026"],["027"],["028"],["0E4",0],["0E5",7283],["0E6",14565],["0F2",20026],["14A",21846]],
},
3:{
1:[["008",0],["026"],["027"],["028"],["067",16385],["06A",24577],["06D",8193]],
2:[["012",26215],["026"],["027"],["028"],["05F",0],["065",6555],["072",13108],["0CA",19662]],
3:[["026"],["027"],["028"],["068",13108],["06D",6555],["0A5",0],["0E8",26215],["0E9",19662]],
4:[["026"],["027"],["028"],["056",19662],["079",13108],["0A2",6555],["0A5",0],["0D9",26215]],
5:[["026"],["027"],["028"],["031",13108],["0BE",0],["0CC",26215],["0D9",19662],["103",6555]],
6:[["026"],["027"],["028"],["0B2",19662],["0B7",26215],["0C1",6555],["0CC",13108],["103",0]],
7:[["026"],["027"],["028"],["02F",26215],["0B7",19662],["0C1",6555],["0CE",0],["0DE",13108]],
8:[["026"],["027"],["028"],["05D",26811],["0C4",13903],["0E0",20853],["0F3",0],["143",6952]],
9:[["026"],["027"],["028"],["0B8",13903],["0E0",26811],["0F7",6952],["0FA",0],["143",20853]],
10:[["026"],["027"],["028"],["0B9",31130],["0F6",0],["0F7",21300],["0FA",11470]],
11:[["026"],["027"],["028"],["0EC",8823],["0F6",17645],["0FA",25207],["145",0]],
12:[["026"],["027"],["028"],["0EC",17040],["0F4",0],["0F8",24904],["145",9176]],
},
4:{
1:[["026"],["027"],["028"],["03D",19662],["05E",0],["09D",6555],["0CF",26215],["104",13108]],
2:[["026"],["027"],["028"],["051",26215],["095",19662],["09E",13108],["0B3",6555],["0D4",0]],
3:[["026"],["027"],["028"],["059",19662],["06E",6555],["0A2",13108],["0CD",0],["104",26215]],
4:[["013",6555],["026"],["027"],["028"],["05A",0],["0A0",13108],["0FF",26215],["106",19662]],
5:[["026"],["027"],["028"],["057",26215],["060",6555],["070",19662],["0B4",13108],["107",0]],
6:[["026"],["027"],["028"],["057",6555],["0A8",26215],["0A9",0],["0B4",19662],["102",13108]],
7:[["026"],["027"],["028"],["037",26215],["0A8",19662],["0AF",0],["0DA",13108],["102",6555]],
8:[["026"],["027"],["028"],["0B5",16385],["0DA",25747],["0F3",18725],["0F5",8193],["14B",0]],
9:[["026"],["027"],["028"],["0F0",6952],["0F3",26811],["0F5",20853],["0F8",0],["14B",13903]],
10:[["026"],["027"],["028"],["0F0",20481],["0F8",14337],["0FB",0],["10C",7169],["14B",26625]],
11:[["026"],["027"],["028"],["0B0",7169],["0F8",26625],["0FB",14337],["0FD",0],["10C",20481]],
12:[["026"],["027"],["028"],["0B0",18725],["0FD",11704],["108",3512],["10C",25747],["148",0]],
},
5:{
1:[["026"],["027"],["028"],["03E",6555],["074",26215],["07B",0],["07F",13108],["0C8",19662]],
2:[["026"],["027"],["028"],["086",19662],["087",26215],["08D",0],["0BB",6555],["0D0",13108]],
3:[["015",6555],["026"],["027"],["028"],["02C",19662],["078",26215],["08C",0],["0DC",13108]],
4:[["01B",15820],["026"],["027"],["028"],["040",0],["078",7911],["0A7",24859],["0B1",16950]],
5:[["026"],["027"],["028"],["080",0],["088",19662],["092",26215],["0A7",6555],["0C9",13108]],
6:[["026"],["027"],["028"],["02E",19662],["06B",6555],["0B2",0],["0C0",26215],["0DF",13108]],
7:[["026"],["027"],["028"],["0AA",19662],["0C0",13108],["0C3",0],["0C6",6555],["0DF",26215]],
8:[["026"],["027"],["028"],["0C3",13903],["0D5",26811],["0D6",6952],["0DA",20853],["0FC",0]],
9:[["026"],["027"],["028"],["0B5",30428],["0D6",23406],["0F9",0],["0FC",16385],["109",8193]],
10:[["026"],["027"],["028"],["0C7",0],["0F9",15820],["0FC",29379],["109",22599],["144",7911]],
11:[["026"],["027"],["028"],["0AB",7169],["0C7",14337],["0F9",26625],["144",20481],["14D",0]],
12:[["026"],["027"],["028"],["0AB",18725],["0C7",25747],["0E7",8193],["0EE",0],["14D",11704]],
},
};
const ONLY_MONSTERS={};
for(const[env,floors]of Object.entries(SPAWN_DB)){
const only=ONLY_MONSTERS[env]=[''];
for(const[mr,rows]of Object.entries(floors)){
const regular=rows.filter(row=>row.length>1).sort((a,b)=>a[1]-b[1]);
regular.forEach((row,i)=>{row[2]=i+1<regular.length?regular[i+1][1]-1:32767;});
only[mr]=regular.reduce((hex,row)=>!hex||parseInt(row[0],16)<parseInt(hex,16)?row[0]:hex,'');
}
}
const _elistWtL=new Uint8Array(256);
const _elistWtU=new Uint8Array(256);
function floorMRAt(baseMR,f){return Math.min(12,baseMR+(f>>2));}
function getSpawnList(envType,floorMR){return(SPAWN_DB[envType]&&SPAWN_DB[envType][floorMR])||[];}
function getMonsterDisplayName(hx){
const m=MONSTER_DB[hx];
return m?(DISPLAY_LANG==='EN'?m.en:m.jp):hx;
}
function elistTileStats(d){
const width=d[2];
const height=d[3];
let W=0,X=0;
let wtCount=0;
for(let y=0;y<height;y++){
const yBase=(y<<4)+792;
const yPrevBase=yBase-16;
for(let x=0;x<width;x++){
if(d[x+yBase]!==1&&d[x+yBase]!==3){
W++;
const L=(x>0&&d[(x-1)+yBase]!==1&&d[(x-1)+yBase]!==3)?1:0;
const U=(y>0&&d[x+yPrevBase]!==1&&d[x+yPrevBase]!==3)?1:0;
X+=(L+U);
_elistWtL[wtCount]=L;
_elistWtU[wtCount]=U;
wtCount++;
}
}
}
const C=4128-(W*16+X*8);
let A,B,D;
if(C>=0){
A=4896+(W*16)+(X*8);
B=X;
D=0;
}else{
A=9016;
B=(9016-4896-(W*16))>>3;
D=0;
let B_pool=B;
for(let i=0;i<wtCount;i++){
if(B_pool<=0){
D++;
}else{
if(_elistWtL[i])B_pool--;
if(_elistWtU[i]&&B_pool>0)B_pool--;
}
}
}
return{A,B,D};
}
function getFloorElistInfo(engine,f){
const envType=engine._details[3];
const baseMR=engine._details[2];
let floorMR=floorMRAt(baseMR,f);
const gArr=G_VALUES[envType];
const G=gArr?gArr[floorMR]:0;
const omArr=ONLY_MONSTERS[envType];
const onlyMonId=omArr?omArr[floorMR]:"";
const onlyMon=onlyMonId&&MONSTER_DB[onlyMonId]?getMonsterDisplayName(onlyMonId):"Unknown";
const strOnly=EL_ONLY;
const slot=engine._floorSlot&&engine._floorSlot[f];
const tiles=slot?(slot.elist||(slot.elist=elistTileStats(engine.di[f]))):elistTileStats(engine.di[f]);
const{A,B,D}=tiles;
const isIce10_12=(envType===3&&floorMR>=10&&floorMR<=12);
const isRuins3=(envType===2&&floorMR===3);
const isIce1=(envType===3&&floorMR===1);
const F=(isIce10_12||isRuins3||isIce1)?7:8;
const ElistOfs=A+4+(B*8)+(D*4)+(F*20)+(F*8)+G;
const val=ElistOfs;
let state=null;
if(val<=0x2B30){
if(D!==0)state=EL_P;
}else if(val>=0x2B34){
const isExc1=isIce10_12||isRuins3;
const isExc2=(envType===2&&floorMR===7)||(envType===5&&(floorMR===3||floorMR===4))||(envType===3&&floorMR===2)||(envType===4&&floorMR===4);
const isExc4=isIce1;
const isExc5=(envType===1&&floorMR===1);
const EL_diff=Math.floor((val-0x2B34)/20);
switch(EL_diff){
case 0:state=(isExc1||isExc4)?(D!==0?EL_P:null):EL_4;break;
case 1:state=EL_3;break;
case 2:state=isExc5?EL_3+EL_NP:EL_2;break;
case 3:state=isExc5?EL_3+EL_NM:`${onlyMon}${strOnly}`;break;
case 4:state=isExc5?EL_3+EL_NC:(isExc4||isExc2?`${onlyMon}${strOnly}${EL_NP}`:EL_0);break;
case 5:state=isExc5?EL_2+EL_NC:(isExc4||isExc2?`${onlyMon}${strOnly}${EL_NM}`:EL_0+EL_NP);break;
case 6:state=(isExc4||isExc2||isExc5)?`${onlyMon}${strOnly}${EL_NC}`:EL_0+EL_NM;break;
default:state=EL_0+EL_NC;break;
}
}
if(state!==null)state=String(state);
return{hex:ElistOfs.toString(16).toUpperCase(),state:state,dValue:D};
}
function classifyElistState(st){
st=''+st;
if(st.includes(''+EL_0)&&!st.includes(''+EL_P))return{kind:'none'};
if(EL_ONLY.some(s=>st.includes(s)))return{kind:'only'};
if(st.includes(''+EL_4))return{kind:'reduced',count:4};
if(st.includes(''+EL_3))return{kind:'reduced',count:3};
if(st.includes(''+EL_2))return{kind:'reduced',count:2};
if(st.includes(''+EL_P))return{kind:'partial'};
return{kind:'normal'};
}
const _anom_visited=new Uint8Array(256);
const _anom_queue=new Uint16Array(256);
const DIR_X=new Int8Array([0,0,-1,1,1,1,-1,-1]);
const DIR_Y=new Int8Array([-1,1,0,0,1,-1,1,-1]);
const DIR_W=new Float64Array([1,1,1,1,1.5,1.5,1.5,1.5]);
const isMainWalkable=(tile)=>tile!==1&&tile!==3;
const isIsoWalkable=(tile)=>tile===0||tile===2||tile===8;
function scanGhostStairs(di,out){
const width=di[2],height=di[3];
const upX=di[4],upY=di[5],downX=di[6],downY=di[7];
let count=0;
for(let y=0;y<height;y++){
const yOfs=(y<<4)+792;
for(let x=0;x<width;x++){
const tile=di[yOfs+x];
if(tile!==4&&tile!==5)continue;
if((x===upX&&y===upY)||(x===downX&&y===downY))continue;
count++;
if(out)out.push(`(${x},${y})`);
}
}
return count;
}
function runBFS(startX,startY,width,height,di,isValidTile){
let qHead=0,qTail=0;
const startIdx=(startY<<4)|startX;
_anom_visited[startIdx]=1;
_anom_queue[qTail++]=startIdx;
let regionSize=0;
while(qHead<qTail){
const curr=_anom_queue[qHead++];
regionSize++;
const cx=curr&0xF;
const cy=curr>>4;
for(let i=0;i<4;i++){
const nx=cx+DIR_X[i];
const ny=cy+DIR_Y[i];
if(nx>=0&&nx<width&&ny>=0&&ny<height){
const nIdx=(ny<<4)|nx;
if(!_anom_visited[nIdx]){
const tile=di[nIdx+792];
if(isValidTile(tile)){
_anom_visited[nIdx]=1;
_anom_queue[qTail++]=nIdx;
}
}
}
}
}
return regionSize;
}
function getFloorAnomalies(engine,f,skipIsoScan=false){
const di=engine.di[f];
const slot=engine._floorSlot&&engine._floorSlot[f],known=slot&&slot.anomalies;
if(known&&(skipIsoScan||known.isolatedRegions))return{
hasChamber:!skipIsoScan&&known.isolatedRegions.length>0,
hasInaccessibleChest:known.hasInaccessibleChest,hasInaccessibleStair:known.hasInaccessibleStair,
isolatedRegions:skipIsoScan?[]:known.isolatedRegions.slice(),totalChests:known.totalChests
};
const width=di[2];
const height=di[3];
const upX=di[4],upY=di[5];
const downX=di[6],downY=di[7];
const boxes=di[8];
if(known)_anom_visited.set(known.visited);
else{
_anom_visited.fill(0,0,height<<4);
runBFS(upX,upY,width,height,di,isMainWalkable);
}
let hasInaccessibleChest=known?known.hasInaccessibleChest:false;
if(!known)for(let b=0;b<boxes;b++){
if(!_anom_visited[(di[b*2+14]<<4)|di[b*2+13]]){
hasInaccessibleChest=true;
break;
}
}
const hasInaccessibleStair=known?known.hasInaccessibleStair:!_anom_visited[(downY<<4)|downX];
const isolatedRegions=[];
if(!skipIsoScan){
for(let y=0;y<height;y++){
const yShift=y<<4;
for(let x=0;x<width;x++){
const idx=yShift|x;
if(!_anom_visited[idx]){
if(isIsoWalkable(di[idx+792])){
const regionSize=runBFS(x,y,width,height,di,isIsoWalkable);
isolatedRegions.push(regionSize);
}
}
}
}
}
const hasChamber=isolatedRegions.length>0;
if(slot){
const cached=known||(slot.anomalies={hasInaccessibleChest,hasInaccessibleStair,totalChests:boxes});
if(skipIsoScan)cached.visited=_anom_visited.slice();
else{cached.isolatedRegions=isolatedRegions.slice();delete cached.visited;}
}
return{hasChamber,hasInaccessibleChest,hasInaccessibleStair,isolatedRegions,totalChests:boxes};
}
const USP_STRIDE=18;
const _uspDIST=new Float64Array(USP_STRIDE*USP_STRIDE);
const _uspWALK=new Uint8Array(USP_STRIDE*USP_STRIDE);
const _uspOFS=new Int32Array(8);
for(let k=0;k<8;k++)_uspOFS[k]=DIR_Y[k]*USP_STRIDE+DIR_X[k];
const _uspHC=new Float64Array(4096);
const _uspHN=new Int32Array(4096);
let _uspHS=0,_uspPC=0;
function pushAstarNode(c,n){
let i=_uspHS++;_uspHC[i]=c;_uspHN[i]=n;
while(i>0){
const p=(i-1)>>1;if(_uspHC[p]<=_uspHC[i])break;
let t=_uspHC[p];_uspHC[p]=_uspHC[i];_uspHC[i]=t;
t=_uspHN[p];_uspHN[p]=_uspHN[i];_uspHN[i]=t;i=p;
}
}
function popAstarNode(){
const nd=_uspHN[0];_uspPC=_uspHC[0];const last=--_uspHS;
if(last>0){
_uspHC[0]=_uspHC[last];_uspHN[0]=_uspHN[last];let i=0;
for(;;){
const l=2*i+1,r=2*i+2;let m=i;
if(l<_uspHS&&_uspHC[l]<_uspHC[m])m=l;
if(r<_uspHS&&_uspHC[r]<_uspHC[m])m=r;
if(m===i)break;
let t=_uspHC[m];_uspHC[m]=_uspHC[i];_uspHC[i]=t;
t=_uspHN[m];_uspHN[m]=_uspHN[i];_uspHN[i]=t;i=m;
}
}
return nd;
}
function calcPointWalkCost(eng,f,sx,sy,gx,gy){
const di=eng.di[f];
const W=di[2],H=di[3];
if(W<=0||H<=0)return null;
if(sx===gx&&sy===gy)return 0;
if(sx<0||sx>=W||sy<0||sy>=H||gx<0||gx>=W||gy<0||gy>=H)return null;
const S=USP_STRIDE,dist=_uspDIST,slot=eng._floorSlot&&eng._floorSlot[f];
let paths=slot&&slot.paths;
const walk=paths?paths.walk:_uspWALK;
if(!paths){
walk.fill(0);
for(let y=0;y<H;y++){
const row=(y<<4)+792,base=(y+1)*S+1;
for(let x=0;x<W;x++)walk[base+x]=isMainWalkable(di[row+x])?1:0;
}
if(slot)paths=slot.paths={walk:walk.slice(),costs:new Map()};
}
const tx=gx+1,ty=gy+1,goal=ty*S+tx,s=(sy+1)*S+sx+1;
const key=paths&&(walk[s]&&walk[goal]&&s>goal?goal+','+s:s+','+goal);
if(paths&&paths.costs.has(key))return paths.costs.get(key);
dist.fill(Infinity);
const h=(n)=>{const dx=Math.abs(n%S-tx),dy=Math.abs((n/S|0)-ty);return dx>dy?dx+0.5*dy:dy+0.5*dx;};
dist[s]=0;_uspHS=0;pushAstarNode(h(s),s);
while(_uspHS>0){
const nd=popAstarNode();const co=dist[nd];
if(_uspPC-h(nd)>co)continue;
if(nd===goal){if(paths)paths.costs.set(key,co);return co;}
for(let k=0;k<8;k++){
const ni=nd+_uspOFS[k];
if(!walk[ni])continue;
if(k>=4&&(!walk[nd+DIR_X[k]]||!walk[nd+DIR_Y[k]*S]))continue;
const nc=co+DIR_W[k];
if(nc<dist[ni]){dist[ni]=nc;pushAstarNode(nc+h(ni),ni);}
}
}
if(paths)paths.costs.set(key,null);
return null;
}
function calcFloorWalkCost(eng,f){
const di=eng.di[f];
return calcPointWalkCost(eng,f,di[4],di[5],di[6],di[7]);
}
function calcWalkCostUpToFloor(eng,upTo){
let sum=0;
for(let f=0;f<upTo;f++){
const c=calcFloorWalkCost(eng,f);
if(c===null)return null;
sum+=c;
}
return sum;
}
const listVisitOrders=(n)=>n===2?[[0,1],[1,0]]:[Array.from({length:n},(_,i)=>i)];
function calcSameFloorChestChainCost(eng,floor,boxes){
const sum=calcWalkCostUpToFloor(eng,floor);
if(sum===null)return null;
const d=eng.di[floor];
const n=boxes.length;
const px=[d[4]],py=[d[5]];
for(const b of boxes){px.push(d[b*2+13]);py.push(d[b*2+14]);}
const dist=[];
for(let i=0;i<=n;i++){
dist[i]=[];
for(let j=1;j<=n;j++)dist[i][j]=(i===j)?0:calcPointWalkCost(eng,floor,px[i],py[i],px[j],py[j]);
}
let best=null;
const walk=(rest,cur,cost)=>{
if(best!==null&&cost>=best)return;
if(rest.length===0){best=cost;return;}
for(let k=0;k<rest.length;k++){
const leg=dist[cur][rest[k]];
if(leg===null)continue;
walk(rest.slice(0,k).concat(rest.slice(k+1)),rest[k],cost+leg);
}
};
walk(boxes.map((_,i)=>i+1),0,0);
return best===null?null:sum+best;
}
function calcCrossFloorLegCost(eng,f,x,y,g,gx,gy){
if(f===g)return calcPointWalkCost(eng,f,x,y,gx,gy);
const df=eng.di[f],dg=eng.di[g];
let a,b;
if(g===f+1){a=calcPointWalkCost(eng,f,x,y,df[6],df[7]);b=(a===null)?null:calcPointWalkCost(eng,g,dg[4],dg[5],gx,gy);}
else{a=calcPointWalkCost(eng,f,x,y,df[4],df[5]);b=(a===null)?null:calcPointWalkCost(eng,g,dg[6],dg[7],gx,gy);}
return b===null?null:a+b;
}
function calcCrossFloorChestRouteCost(eng,wpFloor,wpIdx,targets){
const prefix=calcWalkCostUpToFloor(eng,wpFloor);
if(prefix===null)return null;
const d=eng.di[wpFloor];
const wpPts=wpIdx.map(b=>[d[b*2+13],d[b*2+14]]);
const orders=listVisitOrders(wpPts.length);
let bestWp=null,bestTotal=null;
for(const ord of orders){
let cx=d[4],cy=d[5],wpCost=0,ok=true;
for(const oi of ord){
const c=calcPointWalkCost(eng,wpFloor,cx,cy,wpPts[oi][0],wpPts[oi][1]);
if(c===null){ok=false;break;}
wpCost+=c;cx=wpPts[oi][0];cy=wpPts[oi][1];
}
if(!ok)continue;
const tOrders=listVisitOrders(targets.length);
let segBest=null;
for(const tOrd of tOrders){
let f=wpFloor,x=cx,y=cy,seg=0,tOk=true;
for(const ti of tOrd){
const t=targets[ti];
const c=calcCrossFloorLegCost(eng,f,x,y,t.g,t.gx,t.gy);
if(c===null){tOk=false;break;}
seg+=c;f=t.g;x=t.gx;y=t.gy;
}
if(tOk&&(segBest===null||seg<segBest))segBest=seg;
}
if(segBest===null)continue;
const total=wpCost+segBest;
if(bestWp===null||wpCost<bestWp||(wpCost===bestWp&&total<bestTotal)){bestWp=wpCost;bestTotal=total;}
}
return bestTotal===null?null:prefix+bestTotal;
}
