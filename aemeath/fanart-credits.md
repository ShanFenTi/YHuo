# 爱弥斯 · 二创图 署名与来源清单

> 收录 14 张同人二创图（`aemeath/fanart/`），随素材包自动同步进相册「爱弥斯 · 二创」（2026-10-14 全量替换为库街区版）。
> 版权归各画师所有；本站为个人粉丝站自用、非商用、不篡改署名。若画师不希望作品被转载，请联系站长删除，会在收到反馈后尽快下架。
> 来源帖均为库街区（kurobbs.com，库洛游戏官方社区）公开帖子；「原帖」直达帖子页，含完整图文与作者主页入口。

| # | 文件 | 画师 | 帖子标题 | 原帖 |
|---|------|------|----------|------|
| 01 | aemeath-fanart-01-roadtrip-21.webp | 寻不到的折翼枯叶蝶 | 启程！公路片续集（二十一） | <https://www.kurobbs.com/mc/post/1514032797927718912> |
| 02 | aemeath-fanart-02-starglow-return.webp | 水悦镜华 | 星炬余温，归来的第一天（女漂同人文） | <https://www.kurobbs.com/mc/post/1534926904867778560> |
| 03 | aemeath-fanart-03-sea-of-stars.webp | 是立恒啊 | 星海无垠 | <https://www.kurobbs.com/mc/post/1534333761906819072> |
| 04 | aemeath-fanart-04-spring-song.webp | 一只小青鱼呀 | 跨越时光的春歌 | <https://www.kurobbs.com/mc/post/1556791813135826944> |
| 05 | aemeath-fanart-05-sweet-pairing.webp | 百梓 | 被偏爱时，风都很甜（爱弥斯x女漂小甜文） | <https://www.kurobbs.com/mc/post/1473180551702487040> |
| 06 | aemeath-fanart-06-refusal.webp | 叶洛曦 | 不要…… | <https://www.kurobbs.com/mc/post/1471597843742302208> |
| 07 | aemeath-fanart-07-no-regrets.webp | 叶洛曦 | 不许反悔哦 | <https://www.kurobbs.com/mc/post/1485377065582014464> |
| 08 | aemeath-fanart-08-roadtrip-09.webp | 寻不到的折翼枯叶蝶 | 启程！公路片续集（九） | <https://www.kurobbs.com/mc/post/1504545975749255168> |
| 09 | aemeath-fanart-09-ai-fanfic.webp | 卷柏哦 | 小爱同人文喵 | <https://www.kurobbs.com/mc/post/1530322456799440896> |
| 10 | aemeath-fanart-10-ghost-diary.webp | 沐之啊 | 爱弥斯同人甜文（微病娇重力向）《电子幽灵的观察日记》 | <https://www.kurobbs.com/mc/post/1471630504414257152> |
| 11 | aemeath-fanart-11-dont-be-sad.webp | 皮卡皮卡金皮卡 | “别·难过~”爱弥斯正片纯享版 | <https://www.kurobbs.com/mc/post/1531455138063585280> |
| 12 | aemeath-fanart-12-little-miracle.webp | bilibili创翼WoW | 【爱弥斯/Aemeath】成为你的小小奇迹✨ | <https://www.kurobbs.com/mc/post/1478396369957588992> |
| 13 | aemeath-fanart-13-wait-for-me.webp | 百梓 | 我不要你在我身后，我要你等我（女漂x爱弥斯） | <https://www.kurobbs.com/mc/post/1501056136071729152> |
| 14 | aemeath-fanart-14-qingxiao-pair.webp | 解兰舟 | 清宵&爱弥斯 | <https://www.kurobbs.com/mc/post/1540121787056594944> |

## 抓取与筛选取舍记录（2026-10-14，替换 safebooru 旧批）

- 渠道：站长指定库街区——Kuro Games 官方社区，二创帖自带画师署名与点赞数据，溯源比图站镜像可靠；safebooru 旧批 14 张同日全量下线（文件、manifest、本地库三处同步替换）。
- 接口：搜索走 POST `api.kurobbs.com/forum/search/v2/join`（keyword=爱弥斯，gameId=3，pageIndex 翻页，匿名 token 留空可用）；图片 CDN `prod-alicdn-community.kurobbs.com` 必须带 `Referer: https://www.kurobbs.com/` 才放行。
- 抓取范围：搜索 586 帖全量 → 357 帖有图 → 按点赞排序人工复筛 24 帖候选 → 缩略拼图 + 存疑图放大目验 → 终选 14 张（点赞 14349~1011）。
- 剔除 10 张：攻略帖 2、表情包帖 1（站长明确不要表情包）、游戏截图感帖 3、点赞垫底帖 4（她是猫 997 / 新春特别篇 910 / 画了爱弥斯 614 / 别哭啦 495）。
- 多图帖一律取首图（与目验缩略图一致）；01 与 08 为同系列漫画《启程！公路片续集》两章，均高赞故双收。
- 转换：原图（最大 3840×2160）经 PIL 统一缩放（长边 ≤1800）转 webp q82，单张 41~357KB，共约 2.7MB。
- 替换：本地 D1 `media` 表「爱弥斯 · 二创」组整组删除后经后台导入接口重灌（≤12/批）。
- 后续加图：站长可在后台「图片」页拖拽上传并选「爱弥斯 · 二创」相册，与包内 14 张共存；也可直接扩 `aemeath/manifest.json`（同名 title 去重，重开后台自动同步）。
