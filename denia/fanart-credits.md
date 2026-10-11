# 达妮娅 · 二创图 署名与来源清单

> 收录 12 张同人二创图（`denia/fanart/`），随素材包自动同步进相册「达妮娅 · 二创」（2026-10-11）。
> 版权归各画师所有；本站为个人粉丝站自用、非商用、不篡改署名。若画师不希望作品被转载，请联系站长删除，会在收到反馈后尽快下架。
> 来源帖均为公开图站（yande.re / safebooru.org，后者多为 danbooru 转载镜像）；「原链」为能追溯到的画师原始发布地址。

| # | 文件 | 画师 | 来源帖 | 原链 |
|---|------|------|--------|------|
| 01 | denia-fanart-01-teaparty.webp | ookuma_mai | <https://yande.re/post/show/1262551> | — |
| 02 | denia-fanart-02-carousel.webp | yi_ke_da_cui_tao_tao | <https://yande.re/post/show/1263259> | — |
| 03 | denia-fanart-03-sitting.webp | butyou（butyou\_(mika1412)） | <https://yande.re/post/show/1259359> | — |
| 04 | denia-fanart-04-seifuku.webp | ddcc0123 | <https://yande.re/post/show/1263818> | — |
| 05 | denia-fanart-05-bubble-orb.webp | ttosom | <https://yande.re/post/show/1262859> | — |
| 06 | denia-fanart-06-bubble-leap.webp | Mai_inawa | <https://safebooru.org/index.php?page=post&s=view&id=7147580> | <https://x.com/Mai_inawa/status/2099597438889939319> |
| 07 | denia-fanart-07-memo-doodle.webp | cucumer | <https://safebooru.org/index.php?page=post&s=view&id=7195100> | 小红书（rednote）转载 |
| 08 | denia-fanart-08-wink.webp | airool | <https://safebooru.org/index.php?page=post&s=view&id=7213748> | <https://www.bilibili.com/opus/1256804063323881493> |
| 09 | denia-fanart-09-nightfall.webp | ame（ame\_(2453323719)） | <https://safebooru.org/index.php?page=post&s=view&id=7121727> | Pixiv 149362847 |
| 10 | denia-fanart-10-chibi-duo.webp | Yami（@yami56_u） | <https://safebooru.org/index.php?page=post&s=view&id=7185545> | X/Twitter @yami56_u |
| 11 | denia-fanart-11-blush.webp | 1010（1010\_(wuthering1010)） | <https://safebooru.org/index.php?page=post&s=view&id=7214088> | Pixiv 150614743 |
| 12 | denia-fanart-12-wall-rest.webp | chucky（chucky\_(chucky1000)） | <https://safebooru.org/index.php?page=post&s=view&id=7180580> | Pixiv 150178934 |

## 抓取与筛选取舍记录（2026-10-11）

- 渠道：danbooru / konachan 的 API 被 Cloudflare 挑战拦（curl 403，无头浏览器导航也未自动过），**yande.re 与 safebooru.org 的开放 JSON API + 图片 CDN 走系统代理 curl 直取成功**，全程未动用浏览器 probe。
- 署名依据：yande.re `tag.json?name=<tag>` 查标签类型（type=1 才是画师——`sigrika` 查出是社团、`aemeath`/`luuk_herssen` 也是社团，均未当画师署名）；safebooru 标签类型接口失效，改用帖子内画师样式标签 + `source` 字段原链交叉定名。
- 入选标准：rating:safe、无 AI 标签、分辨率 ≥1400px、风格多样；**剔除了 3 张存疑图**——鸣潮二周年官方群像（带官方 logo，是官图不是二创）、tagme 且疑似官方版本美术的壁纸图、来源不明的透明底渲染图（疑似官方立绘抠图）。
- 转换：原图（PNG/JPG，最大 7680×4320）经 ffmpeg 统一缩放（长边 ≤1800×2400）转 webp q82，单张 130~544KB，共 3.1MB。
- 后续加图：站长可在后台「图片」页拖拽上传并选「达妮娅 · 二创」相册（相册行已随素材包创建），与包内 12 张共存；也可直接扩 `denia/manifest.json`（同名 title 去重，重开后台自动同步）。
