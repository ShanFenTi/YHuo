# /lab/ · ReactBits 效果实验室

本地预览页：<http://127.0.0.1:8799/lab/>

把 ReactBits 里筛掉「不建议」之后剩下的 **49 个效果**，按站内视觉与零依赖方式复刻在一个独立页面里。
不接八页外壳、不进导航、`noindex`，只用于站长现场挑效果；确认要哪些之后再往正式页面搬。

## 分组

| 组 | 数量 | 内容 |
|---|---|---|
| 01 全局质感 | 5 | GradualBlur / SquishSwitch / WarmTooltip / ScrubField / ElasticSlider |
| 02 AI 交互 | 4 | ThoughtLine / LatticeLoader / StatusMark / VoicePill |
| 03 首页与相册 | 6 | SplitFlapText / ScrollExpand / HalftoneReveal / ChromaGrid / Masonry / StickerPeel |
| 04 列表与导航 | 7 | SwipeRow / AnimatedList / LineSidebar / GooeyNav / PillNav / Stepper / JellyRadio |
| 05 卡片与文字 | 9 | SpotlightCard / GlareHover / MagicBento / ProfileCard / ShinyText / StarBorder / FoldText / BlurText / SloshGauge |
| 06 主题与背景 | 18 | CRTWarp / FaultyTerminal / Scanner / Dither / LetterGlitch / GlitchText / DecryptedText / GradientASCII / PixelSnow / Aurora / Grainient / Silk / LineWaves / DotGrid / OrbitImages / CircularText / DepthText / ClickSpark |

## 已在线上的同类组件（没有重复做）

CardNav（门屏）、Stack（相册牌堆）、GlideSelect（后台 ⋯ 菜单）、PromptBar（AI 输入条）、
SwipeToast（toast）、HoldButton（危险确认）、SlideCommit（上传确认）、RubberSegment（播放器款式）、
CodeSlots（验证码）、TextType（打字机）、CountUp（统计数字）、ScrollReveal（fx-reveal）、
StaggeredMenu（抽屉级联）。

## 说明

- **零依赖**：没有 React / GSAP / Three.js / hugeicons / motion；全部是 CSS + 原生 JS + Canvas 2D。
- **素材**：照片走 `/api/playlist`，失败回落 `/images/manifest.json`、`denia/manifest.json`、`aemeath/manifest.json`；贴纸用 `assets/dania-chibi/`。
- **主题/背景组是轻量演示**：CRT、终端、扫描、抖动、字符、极光、绸缎等是 Canvas 2D 重绘的近似版，不是原版 shader 的像素级复刻；确定要用再按原版参数细化。
- **性能**：Canvas 演示用 `IntersectionObserver` 只在可见时跑 rAF；离开视口自动停。
- **降级**：窄屏已做 390px 适配；`prefers-reduced-motion` 下关键动画有直接落位兜底（部分演示仍保留静态画面）。
- **不推送**：本目录是本地实验页，未提交、未进 sitemap；确认后再决定哪些搬进八页。

## 本地验证

```bash
node node_modules/wrangler/bin/wrangler.js pages dev . --d1 DB --kv MEDIA --port 8799
```

然后打开 <http://127.0.0.1:8799/lab/>。改 `lab/*` 不需要动 `assets/` 或八页外壳。

## 已搬进正式页面的效果（2026-11-02）

- AI 页：思考态点阵波 + 三行轨迹（LatticeLoader / ThoughtLine 轻量版）、听写胶囊计时（VoicePill）
- 留言板：管理员移动端左滑删除（SwipeRow）
- 课表：提前量/每节时长拖动改值（ScrubField）、开关按压缩放（SquishSwitch）
- 文档阅读层：上下缘渐进模糊（GradualBlur）
- 后台：存储/用量条液面波（SloshGauge）
- 首页：快捷入口指针光斑（SpotlightCard）、问候语高光（ShinyText）

其余效果仍只在本 lab 页，等站长挑完再决定是否继续搬。
