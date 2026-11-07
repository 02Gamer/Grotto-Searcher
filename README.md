# DQ9 Grotto Searcher

A powerful Grotto search tool created by using Claude and Gemini.

Based on reverse-engineered database, dq9tmap101.exe's ElistOfs logic, and some edge cases fixed by TKG and Claude.

Improvements from legacy DQ9 Grotto search tools
- Fixed misjudgments (such as misjudging Single Monster Floor into No-enemy Floor, etc.) by fixing ElistOfs logic by TKG
- Fundamentally fixed Softlock (危険？ハマる地図 in Japanese, floor Seed 0x5BC7)'s wrong display of stairs & chests by referring Yab's DQ9 Tool's result then fixing reverse-engineered database by Claude
- Deciphered Multibug phenomenon and implemented Multibug special floor searching by Claude and Gemini

For details, please see help documents & Disclaimer inside the tool.

# Available Search Functions

Overall
- You can manually type "?id=RRSSSS" to specify a map
- For example: https://dqix.github.io/Grotto-Searcher/?id=797854 for jumping to Silver Marsh of Bane Lv.58

Ultimate search
- Grotto Name, Level
- Terrain Type, SMR (B1 Monster Rank), Depth, Boss
- Location, Base Quality
- Chest amount in each Chest rank
- Nipple Map (inaccessible chest), Chamber Map (inaccessible area), Softlock, etc.
- Fastest Map Search (from entrance to Boss floor)
- Fastest Floor Search (from entrance to Specified/Bugged floor)
- Wandering Monster bugged floor status (ElistOfs)
- Single monster floor (Only Monsters)
- 4-player Multiplay Bug (Multibug)
- CPU Benchmark (💻)

Chest Timer related search
- Quickload B3/B4/B9 same item x2 (QL)
- Quickload + 3rd Chest same item (Combo)
- 3rd Chest same item x2 (3rd)
- (New!) Dropdown List: PPAP(5s,9s) & Fastest Chest-map Search (D/5D/9D) support
- Free Search (up to 3 chests)
- Chest Timer Marathon Tool (supports both Japanese and English)

Map Method (AT) search
- AT search (AT) List all map Seeds of selected item drop pattern
- AT search (M) List all map Seeds for specific Whistle-summoned monster
- AT search (Detail) Enter map Seed to calculate Battle Skill Combo (Solver) for Map Method Item Drop (WIP)

# In-tool Documents

Ultimate Search
- Grotto mechanics

Chest Timer Search
- Basic knowledge of Chest Timer, Quickload and PPAP

Map Method (AT) Search
- Map Method mechanics

All other languages are AI translated from Traditional Chinese version and manually fixed by the tool author (WIP).

# Requirements

iOS 12.2+ / Android 5+ / Windows 7+ / Any other OS which can run:

Chrome 73+ / Firefox 63+ / Safari 12.1+

(Dropped iOS 10.3-12.1 / Edge 18 support. Android 4.4 needs a standalone Chrome)

Classic Web Worker is available online.

Locally running source code / standalone versions only support single thread.

CPU Benchmark (2026.06.30 renewal)
- iPhone 12 Pro Max: 20.48s
- iPhone 16 Pro: 11.22s
- i5-5200U: 37.15s
- i9-12900KF: 3.34s
- R9-9950X3D: 1.98s

# ドラクエ9 宝の地図検索ツール セレシア版

過去最強だった「ドラゴンクエストIX 星空の守り人」の宝の地図検索ツール「dq9tmap101.exe」（作者：43氏）の「敵無・敵減・オンリー」の誤判定等を修正し、さらに検索機能を拡張して「場所・Base値」「ネタ・最短」「中断即開・PPAP・一人旅・体感・整列箱＆それらの最短」「地図法アイテムドロップ」の検索にも対応できるようにしたものです。

修正したバグ・不具合
- 「敵無・敵減・オンリー」の誤判定：「敵無→オンリー／敵減」、「オンリー→敵減」、「無無無→オンリー／敵減／敵無」等 (メカニズム解明:TKG氏)
- 「危険？ハマる地図」該当フロアの階段・宝箱位置の間違い (メカニズム解明: Claude Opus 4.6)

# 検索できるもの

全般
- URLの後に「?id=RRSSSS」を付けば、特定の地図を表示できる
- 例えば https://dqix.github.io/Grotto-Searcher/?id=B50E5C で「見えざる魔神の地図Lv87(通称:まさゆきの地図)」を直接に表示可能

Ultimate search
- 地図名、Lv、地形、敵ランク (B1F)、深さ (階層数)、BOSS、各ランクの宝箱の数
- 場所コード (全150種、暗記推奨)、Base値
- 乳首地図、イケない通路、危険？ハマるフロア など
- マス目検索 (最短地図、最短フロア(オンリー最短はコレ)など)
- 特殊フロア (敵無、敵減、オンリーなど)、特定モンスターのオンリー
- 4人マルチによるバグ (マルチバグ)
- CPUベンチマーク (💻)

中断技 (アイテム地図) 検索
- B3F/B4F/B9F 即開・一人旅 同じアイテムx2 (即一人旅)
- 「即開→整列箱」の体感 同じアイテムx2 (体感)
- 隣接フロアの整列箱 同じアイテムx2 (整列箱)
- (New!) PPAP (5s,9s)・最短検索対応
- Free Search (3つの宝箱まで)
- マラソンツール (日本語・英語両対応)

地図法 (AT) 検索
- パターン別 (AT) 全 Seed 検索
- パターン別＋モンスター別 (M) 全 Seed 検索
- 戦闘手順検索 (DETAIL) (工事中)
