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

二创组（画师署名）本轮未收录：BWIKI 无爱弥斯二创区，yande.re/safebooru 的新角色标签
存量需另行确认（达妮娅抓取方法论见 denia/fanart-credits.md，可直接复用）。
官方 PV 视频本轮未收录：视频体积大（25MiB 上限），待站长选定源后再入 video/ 目录。
