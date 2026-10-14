# 爱弥斯素材来源记录（2026-10-14）

「爱弥斯 · 星海轻歌」主题（aemeath）素材包全部来自鸣潮 BWIKI（wiki.biligame.com/wutheringwaves，
官方游戏素材的玩家维基转载，来源页面均有「官方素材版权归广州库洛科技所有」声明），官方组共 6 张：

| 文件 | 来源文件页 | 原始尺寸 |
| --- | --- | --- |
| aemeath-official-01-splash.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_立绘.png | 2048×2032 |
| aemeath-official-02-treasure1.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_珍贵之物_01.png | 1024×1024 |
| aemeath-official-03-treasure2.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_珍贵之物_02.png | 1024×1024 |
| aemeath-official-04-treasure3.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_珍贵之物_03.png | 1024×1024 |
| aemeath-official-05-avatar.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_头像.png | 256×256 |
| aemeath-official-06-home.webp | https://wiki.biligame.com/wutheringwaves/文件:角色_爱弥斯_首页.png | 366×731 |

处理：透明边裁剪（PIL getbbox）+ 长边钳制（立绘 1800、珍贵之物/首页 1400、头像 512），
长边缩放 LANCZOS，转 webp quality=82（与 denia 素材包同口径）。

看板娘立绘 `assets/aemeath-chibi/aemeath-full.webp`（1800×1785）同源自官方全身立绘。

二创组 14 张已全量替换为库街区版（2026-10-14 追）：kurobbs.com 搜索接口 586 帖筛得，
逐张画师署名与原帖链接见 aemeath/fanart-credits.md（safebooru 旧批同日下线）。
官方 PV 已收录（2026-10-14 追）：B 站鸣潮官方账号（mid 1955897084，官方认证 role=3）
《鸣潮》共鸣者「爱弥斯」PV | 祝福 合集 P1【中】版（BV1EAFTzeEfY，aid 116001630852241，
cid 35777743234，270s），非登录最高清晰度 360P h264+aac 单文件 17MB（<25MiB 上限免压缩），
直取 CDN MP4 入 video/aemeath-pv.mp4 并同步 video/playlist.json；aemeath 前缀经
THEME_VIDEO_RE 自动归组首页轮播。形象与 PV 版权归库洛游戏（Kuro Games），个人粉丝站自用。
