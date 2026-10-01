// GET /admin → 管理后台单页（首次使用显示初始化表单，未登录显示登录表单）
// 黑白主题（浅色/深色可切换，本地记住）；页面只是壳，所有数据操作都要过 /api/admin/* 的会话校验
import { html } from '../lib/util.js';
//
// 页面结构（2026-10-01 拆分）：本文件只剩 HTML 模板 + 头部主题预应用小脚本；
// CSS/JS 在 assets/admin.css 与 assets/admin.js（改后台样式/脚本直接改那两个文件，
// 正则按普通写法单反斜杠即可——历史上的坑 18「模板里内联正则必须双写」随拆分消灭）。
// 模板仍受模板字面量语法约束：markup 里禁止出现反引号与 ${（出现即改变求值结果或直接报错）。
// 资产指纹：外链带 ?v=__V__ 占位符，onRequestGet 按 CF_PAGES_COMMIT_SHA 前 8 位逐请求替换
//（/admin 有专属函数路由、不经过 functions/[[path]].js 的边缘改写，故就地注入；配合
// _headers 的 /assets/* immutable 一年实现「部署即换新」）。
const PAGE = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>YHuo 管理后台</title>
<script>
try { document.documentElement.setAttribute('data-theme', localStorage.getItem('adminTheme') || 'light'); } catch (e) {}
</script>
<link rel="stylesheet" href="/assets/admin.css?v=__V__">
</head>
<body>
<div class="gate-wrap" id="gateWrap">
  <div class="card" id="setupCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">首次使用：创建超级管理员账号。这个账号只创建这一次，请记好用户名和密码。</p>
    <div class="field"><label for="setupUser">用户名</label><input type="text" id="setupUser" autocomplete="username"></div>
    <div class="field"><label for="setupPass">密码</label><input type="password" id="setupPass" placeholder="至少 6 位" autocomplete="new-password"></div>
    <div class="field"><label for="setupPass2">确认密码</label><input type="password" id="setupPass2" placeholder="再输入一遍密码" autocomplete="new-password"></div>
    <button id="setupBtn" class="btn-block">创建并进入后台</button>
    <div class="msg" id="setupMsg"></div>
  </div>

  <div class="card" id="loginCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">请登录管理后台。</p>
    <div class="field"><label for="loginUser">用户名</label><input type="text" id="loginUser" autocomplete="username"></div>
    <div class="field"><label for="loginPass">密码</label><input type="password" id="loginPass" autocomplete="current-password"></div>
    <!-- 管理员 2FA：开启后密码通过还要输邮箱验证码（此行默认隐藏，needCode 时出现） -->
    <input type="text" id="loginCode" placeholder="6 位邮箱验证码" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="display:none">
    <button id="loginBtn" class="btn-block">登录</button>
    <!-- 忘记密码：管理员邮箱验证码重置（未绑邮箱/未启用邮件服务时隐藏，由前端拉 /api/settings 判断） -->
    <button id="adminForgotBtn" class="ghost btn-block" type="button" style="margin-top:8px;display:none">忘记密码？</button>
    <div class="msg" id="loginMsg"></div>
  </div>

  <div class="card" id="adminResetCard" hidden>
    <p class="gate-title">重置密码</p>
    <p class="hint">通过绑定的管理员邮箱重置密码。</p>
    <div class="field"><label for="arEmail">管理员邮箱</label><input type="text" id="arEmail" autocomplete="email"></div>
    <div class="field"><label for="arCode">验证码</label>
      <div style="display:flex;gap:8px">
        <input type="text" id="arCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" style="flex:1" autocomplete="one-time-code">
        <button id="arSendBtn" class="ghost" type="button">发送验证码</button>
      </div>
    </div>
    <div class="field"><label for="arNewPass">新密码</label><input type="password" id="arNewPass" placeholder="至少 6 位" autocomplete="new-password"></div>
    <button id="arSubmitBtn" class="btn-block">重置密码</button>
    <button id="arBackBtn" class="ghost btn-block" type="button" style="margin-top:8px">返回登录</button>
    <div class="msg" id="arMsg"></div>
  </div>

  <div class="card" id="neterrCard" hidden>
    <p class="gate-title">YHuo 管理后台</p>
    <p class="hint">无法连接服务器。你的网络访问 Cloudflare 可能不稳定，请稍候点击重试（或检查代理/VPN）。</p>
    <button id="retryBtn" class="btn-block">重试</button>
    <div class="msg" id="netMsg"></div>
  </div>
</div>

<div class="shell" id="appShell" hidden>
  <aside class="sidenav">
    <div class="brand"><h1>管理界面</h1></div>
    <nav class="sidenav-links" id="drawerNav">
      <button data-type="overview" title="概览"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg><span>概览</span></button>
      <button data-type="music" title="音乐"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>音乐</span></button>
      <button data-type="video" title="视频"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg><span>视频</span></button>
      <button data-type="image" title="图片"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>图片</span></button>
      <button data-type="notes" title="随笔"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg><span>随笔</span></button>
      <button data-type="accounts" data-super-nav title="账号（用户与管理员）"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>账号</span></button>
      <button data-type="appearance" data-super-nav title="外观"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none"/></svg><span>外观</span></button>
      <button data-type="ai" data-super-nav title="AI 设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><path d="M9 4h6"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 17h6"/></svg><span>AI</span></button>
      <button data-type="email" data-super-nav title="邮件"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>邮件</span></button>
      <button data-type="me" title="我的"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></button>
      <button data-type="status" title="状态"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 1 8-8"/><path d="M12 12l3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M20 12a8 8 0 0 0-8-8"/></svg><span>状态</span></button>
    </nav>
  </aside>

  <div class="main-col">
    <header class="admin-header" id="adminHeader">
      <div class="header-pill">
        <button id="menuBtn" class="action-btn menu-btn" title="菜单">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div class="mark" id="brandMark" title="我的"><span id="brandMono">YH</span><img id="brandAvatarImg" hidden alt=""></div>
        <nav class="site-nav pill-nav" id="sideNav" aria-label="后台导航">
          <button data-type="overview">概览</button>
          <button data-type="music">音乐</button>
          <button data-type="video">视频</button>
          <button data-type="image">图片</button>
          <button data-type="notes">随笔</button>
          <button data-type="accounts" data-super-nav>账号</button>
          <button data-type="appearance" data-super-nav>外观</button>
          <button data-type="ai" data-super-nav>AI</button>
          <button data-type="email" data-super-nav>邮件</button>
          <button data-type="me">我的</button>
          <button data-type="status">状态</button>
        </nav>
        <div class="header-actions">
          <a class="action-btn" href="/" target="_blank" rel="noopener" title="回前台">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h5v-7h4v7h5V9.5"/></svg>
          </a>
          <button id="themeBtn" class="action-btn" title="切换浅色/深色">
            <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
          </button>
          <button id="logoutBtn" class="action-btn" title="退出登录">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
          </button>
        </div>
      </div>
    </header>

    <main class="content">
      <div id="overviewPanel">
        <div class="page-head"><div><h2>概览</h2><p class="ph-desc">站点内容总量、访问趋势与 AI / 邮件用量一览。</p></div></div>
        <div class="stats" id="stats">
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div><div class="num" id="statMusic">0</div><div class="lbl">音乐</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16"/></svg></div><div><div class="num" id="statVideo">0</div><div class="lbl">视频</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div><div><div class="num" id="statImage">0</div><div class="lbl">图片</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="num" id="statUsers">0</div><div class="lbl">注册用户</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="num" id="statVisits">0</div><div class="lbl">总访问量（历史累计）</div></div></div>
          <div class="stat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div><div><div class="num" id="statToday">0</div><div class="lbl">今日访问</div></div></div>
          <div class="stat" style="justify-content:center"><div><div class="num" id="statUptime" style="font-size:15px;white-space:nowrap;font-variant-numeric:tabular-nums;text-align:center">0</div><div class="lbl" style="font-size:11px;text-align:center">网站运行</div></div></div>
        </div>
        <div class="card" id="visitCard">
          <div class="visit-head">
            <strong>访问趋势</strong>
            <span class="meta2" id="visitSumm"></span>
            <span class="spacer"></span>
            <button type="button" class="ghost range-btn" data-range="14">近 14 天</button>
            <button type="button" class="ghost range-btn" data-range="30">近 30 天</button>
            <button type="button" class="ghost range-btn vbar active" data-view="bar" title="柱状图" aria-label="切换为柱状图"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20V10M12 20V4M18 20v-8M3 20h18"/></svg></button>
            <button type="button" class="ghost range-btn vdonut" data-view="donut" title="环形图" aria-label="切换为环形图"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8" stroke-dasharray="1.6 4"/></svg></button>
          </div>
          <div id="visitChart"></div>
          <p class="hint" id="visitHint" style="margin:10px 0 0" hidden>按天明细从上线开始积累，之前累积的总访问量没有逐日记录。</p>
        </div>
        <div class="card" id="aiUsageCard">
          <div class="visit-head">
            <strong>AI 用量</strong>
            <span class="meta2" id="aiUsageSumm"></span>
          </div>
          <div id="aiUsageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
        </div>
        <div class="card" id="todayMsgCard">
          <div class="visit-head">
            <strong>今日留言</strong>
            <span class="meta2" id="todayMsgSumm"></span>
            <span class="spacer"></span>
            <button type="button" class="ghost" id="aiMsgSummaryBtn" title="拉取今天全部留言，让默认模型总结一段氛围与待办">AI 总结今日</button>
          </div>
          <div id="todayMsgBody" class="meta2" style="line-height:1.7">加载中…</div>
          <div id="aiMsgSummaryOut" hidden style="margin-top:10px;border-top:1px dashed var(--border);padding-top:10px;white-space:pre-wrap;line-height:1.7;font-size:13px;"></div>
        </div>
        <div class="card" id="mailUsageCard">
          <div class="visit-head">
            <strong>邮件统计</strong>
            <span class="meta2" id="mailUsageSumm"></span>
          </div>
          <div id="mailUsageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
        </div>
      </div>

      <div id="mediaPanel" hidden>
    <div class="page-head">
      <div><h2 id="mediaPhTitle">音乐管理</h2><p class="ph-desc" id="mediaPhDesc">站内曲库：前台迷你播放条与悬浮播放器的数据源。</p></div>
    </div>
    <div class="upload-row" id="uploadRow">
      <input type="file" id="fileInput" multiple>
      <div class="ur-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg></div>
      <button type="button" class="ghost file-pick-btn" id="filePickBtn">点击选择文件</button>
      <p class="upload-hint" id="uploadHint">支持一次选多个文件，也可以把文件或整个文件夹拖进来；与已有内容同名的自动跳过；单文件上限 24MB。</p>
    </div>
    <p class="file-pick-info" id="filePickInfo"></p>
    <div class="upload-actions">
      <input type="text" id="titleInput" placeholder="显示名称（可选，仅单个文件时生效）">
      <label class="meta2" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:none" title="图片页生效：超 500KB 的图片上传前本地压到长边 1920（WebP），省 KV 配额；压缩失败自动回落原图">
        <input type="checkbox" id="imgCompressToggle" style="margin:0"> 大图自动压缩
      </label>
      <button id="uploadBtn">上传</button>
    </div>
    <div class="video-mode-bar" id="videoModeBar" hidden>
      <span class="meta2">首页视频播放</span>
      <button type="button" class="ghost vm-chip" data-m="seq">顺序循环</button>
      <button type="button" class="ghost vm-chip" data-m="single">单视频循环</button>
      <button type="button" class="ghost vm-chip" data-m="random">随机播放</button>
      <span class="vm-single" id="vmSingleText"></span>
    </div>
    <div class="progress" id="progress"><i id="progressBar"></i></div>
    <div class="queue-info" id="queueInfo"></div>
    <div class="image-shell" id="imageShell" hidden>
      <aside class="album-side" id="albumSide">
        <div class="album-side-head">相册</div>
        <div class="album-side-list" id="albumSideList"></div>
        <button class="ghost album-side-new" id="albumSideNewBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>新建相册</button>
        <p class="album-side-hint">把图片拖到相册名上即可归类；勾选后点相册名可批量移入。点 ⋯ 重命名或解散（解散不删图）。</p>
      </aside>
      <div class="album-main">
        <div class="storage-line">
          <span id="storageText">存储用量统计中…</span>
          <div class="storage-bar" id="storageBar"><i></i></div>
        </div>
        <div class="list-tools">
          <input type="checkbox" id="selAll">
          <label for="selAll">全选</label>
          <span class="search-box">
            <span class="sb-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
            <input type="text" id="searchInput" placeholder="搜索文件名…">
            <button type="button" class="sb-clear" data-for="searchInput" title="清空搜索" aria-label="清空搜索"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
          </span>
          <button id="batchDelBtn" class="danger" hidden>删除所选</button>
        </div>
        <ul class="list" id="list"></ul>
        <div class="empty-state" id="empty" hidden>
          <span class="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></span>
          <span class="es-title">还没有内容</span>
          <span class="es-hint">先上传一个文件吧；也可以拖动条目调整顺序。</span>
        </div>
      </div>
    </div>
  </div>

  <div id="notesPanel" hidden>
    <div class="page-head"><div><h2>随笔管理</h2><p class="ph-desc">前台 /notes/ 时间线的内容源；保存后访客刷新即生效。</p></div></div>
    <div class="card" style="margin-bottom:16px">
      <p class="appear-label2" style="margin-top:0" id="noteFormTitle">新增随笔（日期自动取当天）</p>
      <div class="field" style="max-width:280px"><label for="noteMood">天气 / 时段（可空）</label>
        <input type="text" id="noteMood" placeholder="如 晴 / 雨 / 夜" maxlength="12">
      </div>
      <div class="field" style="margin-top:12px"><label for="noteText">正文</label>
        <textarea id="noteText" rows="4" placeholder="1~2000 字；支持迷你 Markdown：**粗** *斜* 行内码 [链接](url) > 引用，前台按它渲染"></textarea>
      </div>
      <div class="bgset-row" style="margin-top:10px">
        <button id="noteSaveBtn" type="button">保存</button>
        <button id="noteCancelEditBtn" class="ghost" type="button" hidden>取消编辑</button>
        <button id="notePolishBtn" class="ghost" type="button" title="让默认模型把正文润色一遍，先预览再决定是否应用">AI 润色</button>
        <span class="meta2" id="noteFormMsg"></span>
      </div>
      <!-- 润色预览：结果先落这里，正文原样不动（防丢稿），「应用」才写回 textarea -->
      <div id="notePolishBox" hidden style="margin-top:10px;border:1px dashed var(--border);border-radius:10px;padding:10px 12px;">
        <div class="bgset-row" style="margin:0 0 8px">
          <strong style="font-size:13px">润色预览</strong>
          <span class="meta2" id="notePolishMeta"></span>
          <span class="spacer"></span>
          <button id="notePolishApply" type="button">应用到正文</button>
          <button id="notePolishDiscard" class="ghost" type="button">放弃</button>
        </div>
        <textarea id="notePolishText" rows="4" readonly style="width:100%"></textarea>
      </div>
    </div>
    <div class="card">
      <div class="visit-head"><strong>全部随笔</strong><span class="meta2" id="notesSumm"></span></div>
      <div class="bgset-row" style="margin-top:8px">
        <button id="notesImportBtn" class="ghost" type="button">从静态清单导入</button>
        <span class="meta2">把 notes/notes.json 里的存量随笔导入数据库（日期与正文完全相同的自动跳过）；导入后前台以数据库为准。</span>
      </div>
      <div id="notesList" style="margin-top:10px"></div>
    </div>
  </div>

  <div id="accountsPanel" hidden>
    <div class="page-head"><div><h2>用户与管理员</h2><p class="ph-desc">上方管理前台注册用户（封禁 / 删除 / 授权为管理员），下方是管理员账号列表（重置密码 / 禁用 / 移除）。管理员只从「授权」产生：密码沿用其前台密码，本人立即可登后台；移除管理员不影响其前台账号。超级管理员唯一（首建账号），没有升为超管的操作。</p></div></div>
    <div class="section-card">
      <p class="section-title">前台用户</p>
      <div class="list-tools" style="margin-top:12px">
        <span class="search-box">
          <span class="sb-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input type="text" id="userSearch" placeholder="搜索用户名…">
          <button type="button" class="sb-clear" data-for="userSearch" title="清空搜索" aria-label="清空搜索"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </span>
        <button class="ghost" id="userSortBtn" title="切换排序">注册时间：新→旧</button>
      </div>
      <ul class="list" id="userList"></ul>
      <div class="empty-state" id="userEmpty" hidden>
        <span class="es-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <span class="es-title">还没有用户</span>
        <span class="es-hint">有访客在前台注册后会出现在这里。</span>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">管理员账号列表</p>
      <p class="section-sub">超级管理员只有首建的那一个（站长本人）；其余管理员均由上方用户列表「授权」产生，此处可重置密码、禁用或移除。</p>
      <div id="admListWrap"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
    </div>
  </div>

  <div id="appearancePanel" hidden>
    <div class="page-head"><div><h2>外观设置</h2><p class="ph-desc">全站默认外观：访客自己在主页没改过时才会采用；改过的以访客本地选择为准。</p></div></div>
    <div class="section-card">
      <p class="section-title">默认主题色</p>
      <div class="accent-row" id="accentRow" style="margin-top:12px"></div>
    </div>
    <div class="section-card">
      <p class="section-title">默认背景图</p>
      <div class="bgset-row" style="margin-top:12px">
        <img id="bgPreview" class="bg-preview" hidden alt="当前默认背景">
        <span id="bgNone" class="meta2">未设置（使用网站自带背景）</span>
        <input type="file" id="bgFileInput" accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.bmp" hidden>
        <button id="bgUploadBtn2" class="ghost">上传背景图</button>
        <button id="bgClearBtn2" class="danger">清除</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">默认背景模糊</p>
      <div class="bgset-row" style="margin-top:12px">
        <input type="range" id="bgBlurAdmin" min="0" max="30" value="0" style="max-width:220px">
        <span class="meta2" id="bgBlurAdminVal">未设置（访客不模糊）</span>
        <button id="bgBlurSaveBtn" class="ghost">保存模糊度</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">主页寄语</p>
      <p class="section-sub">保存多条后前台随机显示其一；全部删除则恢复每日一言。</p>
      <div id="quoteRows"></div>
      <div class="bgset-row" style="margin-top:10px">
        <button id="quoteAddBtn" class="ghost" type="button">添加一条</button>
        <button id="quoteSaveBtn" class="ghost" type="button">保存寄语</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">功能开关</p>
      <p class="section-sub">关闭的界面前台直接隐藏，保存后访客下次进页面生效。AI 界面跟随「AI」页的全局启用开关，不在这里控制。</p>
      <div id="flagRows"></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="flagSaveBtn" class="ghost" type="button">保存功能开关</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">底部音乐播放器</p>
      <p class="section-sub">两种款式共用站内曲库，保存后访客下次进页面生效。</p>
      <div class="seg" style="margin-top:2px">
        <button id="playerModeMini" class="ghost player-mode-btn" type="button">迷你播放条（原版）</button>
        <button id="playerModeBlog" class="ghost player-mode-btn" type="button">悬浮播放器（博客款）</button>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="playerSaveBtn" class="ghost" type="button">保存播放器设置</button>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">备份</p>
      <div class="bgset-row" style="margin-top:12px">
        <button id="exportBtn" class="ghost">导出媒体清单备份（JSON）</button>
        <span class="meta2">含全部媒体条目与访问地址；KV 里的文件本体请自行下载保存。</span>
      </div>
    </div>
  </div>

  <div id="aiPanel" hidden>
    <div class="page-head"><div><h2>AI 服务</h2><p class="ph-desc">配置模型供应商、API Key 与模型列表；前台 AI 助手经服务端代理调用，Key 永不下发到浏览器。</p></div></div>
    <p class="appear-label2" style="margin-top:0">模型供应商</p>
    <div class="ai-mgr">
      <aside class="ai-mgr-side">
        <div class="ai-mgr-group">自定义供应商</div>
        <div id="aiProvList"></div>
        <button id="aiAddBtn" class="ai-mgr-add" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>添加供应商</button>
      </aside>
      <div class="ai-mgr-main" id="aiProvDetail" hidden>
        <div class="ai-mgr-head">
          <strong id="aiProvName" hidden></strong>
          <input type="text" id="aiProvNameInput" hidden maxlength="30" placeholder="供应商名称（如 deepseek）" style="max-width:240px;margin:0">
          <button id="aiRenameBtn" class="icon-mini" type="button" title="重命名"></button>
          <span id="aiProvState" class="ai-pill-on">已启用</span>
          <button id="aiToggleProvBtn" class="ghost" type="button">禁用</button>
          <span class="ai-mgr-flex"></span>
          <button id="aiDelProvBtn" class="icon-mini" type="button" title="删除供应商"></button>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label for="aiBaseUrl">Base URL</label>
            <input type="text" id="aiBaseUrl" placeholder="https://api.deepseek.com（留空用所选格式的官方默认）">
          </div>
          <div class="field"><label>API 格式</label><span id="aiProtocol" class="ai-drop-full"></span></div>
        </div>
        <div class="field" style="margin-top:14px"><label for="aiApiKey">API Key</label>
          <div class="ai-key-wrap">
            <input type="password" id="aiApiKey" autocomplete="new-password" placeholder="sk-…">
            <button id="aiKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
          </div>
          <span class="sub" id="aiKeyHint">未设置</span>
        </div>
        <div class="field" style="margin-top:14px"><label for="aiPrompt">系统提示词（AI 人设，可选，≤2000 字）</label>
          <textarea id="aiPrompt" rows="3" maxlength="2000" placeholder="例如：回答简洁友好，默认用中文。"></textarea>
        </div>
        <p class="ai-mgr-label">模型列表</p>
        <div id="aiModelRows"></div>
        <div class="ai-mgr-addmodel" id="aiAddModelWrap">
          <input type="text" id="aiNewModelInput" list="aiModelList" maxlength="100" placeholder="输入模型名（如 deepseek-v4-flash）">
          <datalist id="aiModelList"></datalist>
          <span id="aiNewModelTag" class="ai-mr-tag" title="模型类型标签（前台菜单里显示）"></span>
          <button id="aiAddModelOk" class="ghost" type="button">确定</button>
          <button id="aiAddModelCancel" class="ghost" type="button">取消</button>
        </div>
        <div class="bgset-row" style="margin-top:10px">
          <button id="aiAddModelBtn" class="ghost" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>添加模型</button>
          <button id="aiFetchModelsBtn" class="ghost" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>自动获取</button>
          <span class="meta2" id="aiModelHint">自动获取会请求该供应商的 /models 接口</span>
        </div>
        <div class="bgset-row" style="margin-top:18px">
          <button id="aiSaveBtn" type="button">保存供应商</button>
          <button id="aiTestBtn" class="ghost" type="button">测试连接</button>
          <span class="meta2" id="aiTestResult"></span>
        </div>
      </div>
      <div class="ai-mgr-empty" id="aiProvEmpty">从左侧选择一个供应商，或点"添加供应商"。</div>
    </div>
    <div class="section-card" style="margin-top:18px">
      <p class="section-title">全局开关</p>
      <div class="bgset-row" style="margin-top:10px">
        <button id="aiToggleBtn" class="ghost">停用 AI</button>
        <span class="meta2" id="aiStateText">状态读取中…</span>
      </div>
    </div>
  </div>

  <div id="emailPanel" hidden>
    <div class="page-head">
      <div><h2>邮件服务</h2><p class="ph-desc">注册邮箱验证 / 找回密码 / 登录二次验证与课表提醒邮件都在这里配置。</p></div>
      <div class="ph-actions" data-superonly>
        <span class="meta2" id="emailStateText">状态读取中…</span>
        <button id="emailToggleBtn" class="ghost" type="button">停用</button>
        <button id="emailSaveBtn" type="button">保存配置</button>
      </div>
    </div>
    <div class="section-card" data-superonly>
      <p class="section-title">服务配置</p>
      <p class="section-sub">服务商都走 HTTP API（Cloudflare Workers 原生支持）；API Key 保存后不再回显，编辑留空即保留原值。</p>
      <div class="form-grid">
        <div class="field"><label>服务商</label><span id="emailProviderDrop" class="ai-drop-full"></span></div>
        <div class="field"><label for="emailFrom">发件地址</label><input type="text" id="emailFrom" placeholder="noreply@yourdomain.com"><span class="sub">需在服务商侧完成发件人验证。</span></div>
        <div class="field field-full"><label for="emailApiKey">API Key</label>
          <div class="ai-key-wrap">
            <input type="password" id="emailApiKey" autocomplete="new-password" placeholder="re_…（Resend）/ xkeysib-…（Brevo）">
            <button id="emailKeyEye" class="icon-mini ai-key-eye" type="button" title="显示/隐藏"></button>
          </div>
          <span class="sub" id="emailKeyHint">未设置</span>
        </div>
        <div class="field field-full"><label for="emailOwnerInput">站长邮箱</label>
          <input type="text" id="emailOwnerInput" placeholder="you@example.com">
          <span class="sub">「仅站长使用」模式下唯一能收验证码的地址，填你注册 Resend 的邮箱；清空后点「保存配置」即移除，「仅站长使用」会自动关闭。</span>
        </div>
      </div>
      <div class="bgset-row" style="margin-top:14px">
        <button id="emailAdminOnlyBtn" class="ghost" type="button">开启"仅站长使用"</button>
        <span class="meta2" id="emailAdminOnlyText">关闭：所有用户可用邮箱功能</span>
      </div>
    </div>
    <div class="section-card" data-superonly>
      <p class="section-title">测试发送</p>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label for="emailTestTo">收件邮箱</label><input type="text" id="emailTestTo" placeholder="you@example.com"></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="emailTestBtn" class="ghost" type="button">发送测试邮件</button>
      </div>
    </div>
    <div class="section-card" data-superonly>
      <p class="section-title">自定义邮件</p>
      <p class="section-sub">给任意邮箱发任意内容（纯文本，支持换行，≤5000 字）。</p>
      <div class="form-grid">
        <div class="field"><label for="emailCustomTo">收件邮箱</label><input type="text" id="emailCustomTo" placeholder="to@example.com"></div>
        <div class="field"><label for="emailCustomSubject">邮件主题</label><input type="text" id="emailCustomSubject" placeholder="主题"></div>
        <div class="field field-full"><label for="emailCustomText">邮件正文</label><textarea id="emailCustomText" rows="5" placeholder="正文（纯文本，支持换行）"></textarea></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="emailCustomBtn" type="button">发送</button>
        <span class="meta2" id="emailCustomMsg"></span>
      </div>
    </div>
    <div class="section-card">
      <p class="section-title">课表提醒定时任务</p>
      <p class="section-sub">用户课表的每日早报 / 重点课课前提醒。Pages Functions 不支持定时触发，需要外部 cron 每 5 分钟访问下面的 URL——推荐 cron-job.org（免费）：注册后新建任务，地址填下面的 URL，执行间隔选「每 5 分钟」。</p>
      <div class="field" data-superonly>
        <label for="schedTickUrl">Tick 地址（首次查看自动生成密钥）</label>
        <div class="bgset-row">
          <input type="text" id="schedTickUrl" readonly style="flex:1;min-width:220px;max-width:520px">
          <button id="schedTickCopyBtn" class="ghost" type="button">复制</button>
        </div>
      </div>
      <p class="meta2" id="schedTickLast" style="margin-top:8px" data-superonly></p>
      <div class="bgset-row" style="margin-top:8px" data-superonly>
        <button id="schedTickRegenBtn" class="ghost" type="button">重新生成密钥</button>
        <button id="schedTickRunBtn" class="ghost" type="button">立即执行一次</button>
        <span class="meta2" id="schedTickMsg"></span>
      </div>
      <div class="field" data-superonly style="margin-top:16px;max-width:560px">
        <label for="schedHoliInput">节假日表（命中的日期整天停发课表提醒；每日备份不受影响）</label>
        <textarea id="schedHoliInput" rows="3" placeholder="留空 = 内置默认（元旦/春节/清明/五一/端午/中秋/国庆）；写 none = 不停发；示例：10-01~10-07，2027-02-05~2027-02-11"></textarea>
        <div class="bgset-row" style="margin-top:8px">
          <button id="schedHoliSaveBtn" class="ghost" type="button">保存节假日表</button>
          <span class="meta2" id="schedHoliMsg"></span>
        </div>
        <span class="sub" id="schedHoliEff"></span>
      </div>
      <div class="field" style="margin-top:18px;max-width:420px">
        <label for="schedTestTo">发送测试提醒（收件邮箱留空 = 站长邮箱）</label>
        <div class="bgset-row">
          <input type="text" id="schedTestTo" placeholder="留空 = 站长邮箱" style="flex:1;min-width:200px">
          <button id="schedTestBtn" class="ghost" type="button">发送</button>
        </div>
        <span class="sub" id="schedTestMsg"></span>
      </div>
      <p class="meta2" style="margin-top:10px">按真实课表算出「今天该发什么」，立即发送早报 / 课前提醒样式的【测试】邮件（不用等真实到点，不影响防重发记录）。收件人须是绑定了已验证邮箱且启用过课表的账号；仅站长模式下只能发到站长邮箱。</p>
    </div>
  </div>

  <div id="mePanel" hidden>
    <div class="page-head"><div><h2>我的</h2><p class="ph-desc">管理员资料、头像与账号安全。</p></div></div>
    <div class="card me-card">
      <div class="me-left">
        <div class="me-avatar" id="meAvatar"><span id="meAvatarMono">YH</span><img id="meAvatarImg" hidden alt="管理员头像"></div>
        <div class="me-avatar-btns">
          <button id="meAvatarUploadBtn" class="ghost">更换头像</button>
          <button id="meAvatarRemoveBtn" class="danger" hidden>移除头像</button>
        </div>
      </div>
      <div class="me-info">
        <p class="me-name" id="meName">—</p>
        <p class="meta2" id="meMeta"></p>
        <p class="meta2">每个管理员各自上传头像（2026-09-30 起按人一份，不再共用站长形象）；JPG/PNG/GIF/WebP，≤2MB，保存在站点 KV。站长换头像会同步留言板「站长留言」的官方形象。</p>
      </div>
      <input type="file" id="meAvatarInput" accept=".jpg,.jpeg,.png,.gif,.webp" hidden>
    </div>
    <div class="card" id="meEmailCard" style="margin-top:16px" data-superonly hidden>
      <p class="appear-label2" style="margin-top:0">管理员邮箱</p>
      <p class="meta2" style="margin-bottom:12px">绑定后可用邮箱验证码重置后台密码。</p>
      <div class="bgset-row" id="meEmailBoundRow" hidden>
        <span class="meta2" id="meEmailText"></span>
        <button id="meEmailRemoveBtn" class="danger" type="button">解绑</button>
      </div>
      <div id="meEmailFormRow">
        <div class="form-grid" style="max-width:660px">
          <div class="field"><label for="meEmailInput">管理员邮箱</label>
            <div class="bgset-row" style="flex-wrap:nowrap">
              <input type="text" id="meEmailInput" placeholder="you@example.com" style="flex:1;min-width:160px">
              <button id="meEmailSendBtn" class="ghost" type="button" style="flex:none">发送验证码</button>
            </div>
          </div>
          <div class="field"><label for="meEmailCode">邮箱验证码</label>
            <div class="bgset-row" style="flex-wrap:nowrap">
              <input type="text" id="meEmailCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" style="flex:1;min-width:130px">
              <button id="meEmailVerifyBtn" type="button" style="flex:none">验证并绑定</button>
            </div>
          </div>
        </div>
        <p class="meta2" id="meEmailMsg" style="margin:10px 0 0"></p>
      </div>
    </div>
    <div class="card" id="meSecCard" style="margin-top:16px">
      <p class="appear-label2" style="margin-top:0">安全 · SECURITY</p>

      <p class="appear-label2">修改密码</p>
      <div class="form-grid" style="max-width:640px">
        <div class="field"><label for="mePwdOld">当前密码</label><input type="password" id="mePwdOld" autocomplete="current-password"></div>
        <div class="field"><label for="mePwdNew">新密码</label><input type="password" id="mePwdNew" placeholder="6-100 位" autocomplete="new-password"></div>
      </div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="mePwdBtn" type="button">修改密码</button>
      </div>
      <p class="meta2" id="mePwdMsg" style="margin:8px 0 0">改密后其他设备会被退出登录，当前设备保持不变。</p>

      <p class="appear-label2" data-superonly>登录二次验证（邮箱验证码）</p>
      <div class="switch-row" data-superonly>
        <span class="switch"><input type="checkbox" id="me2faOn"><span class="sw-track"></span><span class="sw-thumb"></span></span>
        <span class="meta2">登录时向绑定的管理员邮箱发送验证码</span>
      </div>
      <p class="meta2" id="me2faMsg" style="margin:8px 0 0" data-superonly></p>

      <p class="appear-label2">登录设备</p>
      <div id="meSessions"></div>
      <div class="bgset-row" style="margin-top:8px">
        <button id="meRevokeBtn" class="danger" type="button">退出其他设备</button>
      </div>

      <p class="appear-label2">最近登录（成功与失败，最多 10 条）</p>
      <div id="meLogins"></div>
    </div>
  </div>
  <div id="statusPanel" hidden>
    <div class="page-head"><div><h2>状态</h2><p class="ph-desc">存储空间、邮件额度、数据备份与前端错误监控。</p></div></div>
    <div class="card" id="stStorageCard">
      <div class="visit-head"><strong>存储空间</strong><span class="meta2" id="stStorageSumm"></span></div>
      <div id="stStorageBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
    </div>
    <div class="card" id="stMailCard">
      <div class="visit-head"><strong>邮件发送额度</strong><span class="meta2" id="stMailSumm"></span></div>
      <div id="stMailBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
    </div>
    <div class="card" id="stBackupCard" data-superonly>
      <div class="visit-head"><strong>数据备份</strong><span class="meta2" id="stBackupSumm"></span></div>
      <div id="stBackupBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="stBackupNowBtn" class="ghost" type="button">立即备份</button>
        <span class="meta2" id="stBackupTip"></span>
      </div>
      <p class="meta2" style="margin:8px 0 0">每日自动备份到 KV，保留最近 7 份（随课表提醒的定时任务每天顺带执行）。</p>
    </div>
    <div class="card" id="stRumCard">
      <div class="visit-head"><strong>前端错误</strong><span class="meta2" id="stRumSumm"></span></div>
      <div id="stRumBody"><div class="sk-row"><span class="sk sk-dot"></span><span class="sk-lines"><span class="sk sk-l1"></span><span class="sk sk-l2"></span></span></div></div>
      <div class="bgset-row" style="margin-top:12px">
        <button id="stRumClearBtn" class="ghost" type="button">清空</button>
        <span class="meta2" id="stRumTip"></span>
      </div>
      <p class="meta2" style="margin:8px 0 0">前台脚本报错自动上报（JS 异常 / 未处理的 Promise 拒绝 / 资源加载失败），保留最近 200 条，悬停错误行可看完整调用栈。</p>
    </div>
  </div>
    </main>
  </div>
</div>

<footer>文件存放在 Cloudflare KV（单文件上限 24MB）；删除与禁用操作即时生效，请谨慎确认。</footer>

<div class="toast" id="toast"></div>

<div class="modal" id="askModal" hidden>
  <div class="modal-backdrop" id="askBackdrop"></div>
  <div class="modal-body ask-modal-body">
    <div class="modal-head"><strong id="askTitle"></strong></div>
    <p class="ask-msg" id="askMsg"></p>
    <input type="text" id="askInput" hidden>
    <div class="ask-btns">
      <button id="askCancel" class="ghost">取消</button>
      <button id="askOk">确定</button>
    </div>
  </div>
</div>

<div class="modal" id="previewModal" hidden>
  <div class="modal-backdrop" id="previewBackdrop"></div>
  <div class="modal-body">
    <div class="modal-head">
      <strong id="previewTitle"></strong>
      <button id="previewClose" class="ghost">关闭</button>
    </div>
    <div id="previewContent"></div>
  </div>
</div>

<script src="/assets/admin.js?v=__V__"></script>
</body>
</html>`;

export async function onRequestGet({ env }) {
  // 版本号与 functions/[[path]].js 同源同口径：部署 commit 前 8 位，缺失/本地回落 'dev'。
  // split/join 替换两处 __V__ 占位符（css + js）
  const v = String((env && env.CF_PAGES_COMMIT_SHA) || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 8) || 'dev';
  return html(PAGE.split('__V__').join(v));
}
