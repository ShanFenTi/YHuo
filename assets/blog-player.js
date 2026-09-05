// YHuo 悬浮音乐播放器（博客款）——由原 index.html 第三段内联脚本原样提取
    // 悬浮音乐播放器逻辑（博客款，源码 博客动画源码/08-音乐播放器.js 适配）：
    // 去 00 设置核心依赖（卡片尺寸固定默认档）、去 Astro 路由钩子；初始化由设置回调触发
    (() => {
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    };

    const initPlayer = (root) => {
      if (root.dataset.ready === 'true') return;
      root.dataset.ready = 'true';

      const panel = root.querySelector('[data-music-panel]');
      const toggle = root.querySelector('[data-music-toggle]');
      const closeButton = root.querySelector('[data-music-close]');
      const audio = root.querySelector('[data-music-audio]');
      const playButton = root.querySelector('[data-music-play]');
      const prevButton = root.querySelector('[data-music-prev]');
      const nextButton = root.querySelector('[data-music-next]');
      const muteButton = root.querySelector('[data-music-mute]');
      const shuffleButton = root.querySelector('[data-music-shuffle]');
      const repeatButton = root.querySelector('[data-music-repeat]');
      const favoriteButton = root.querySelector('[data-music-favorite]');
      const retryButton = root.querySelector('[data-music-retry]');
      const progress = root.querySelector('[data-music-progress]');
      const currentTime = root.querySelector('[data-music-current-time]');
      const duration = root.querySelector('[data-music-duration]');
      const title = root.querySelector('[data-music-title]');
      const artist = root.querySelector('[data-music-artist]');
      const status = root.querySelector('[data-music-status]');
      const count = root.querySelector('[data-music-count]');
      const list = root.querySelector('[data-music-list]');
      const cover = root.querySelector('[data-music-cover]');
      const dockCover = root.querySelector('[data-music-dock-cover]');
      const storageKey = 'yhuoBlogPlayer'; // 站内曲库一份歌单，键不再跟歌单 ID 走

      if (
        !panel || !toggle || !audio || !playButton || !prevButton || !nextButton ||
        !muteButton || !progress || !list || !title || !artist || !status
      ) return;

      let tracks = [];
      let currentIndex = 0;
      let loadedIndex = -1;
      let wantsPlayback = false;
      let playGeneration = 0;
      let skipScheduled = false;
      let skipTimer = 0;
      let failedTracks = new Set();
      let fetchController = null;
      const viewportMargin = 8;
      const panelGap = 12;
      let panelWasDragged = false;
      let panelPositionFrame = 0;
      let panelResetTimer = 0;
      const morphDuration = 380;
      const morphEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
      const morph = {
        animation: null,
        contentAnimations: [],
        toggleAnimation: null,
        shell: null,
        generation: 0,
        desiredOpen: false,
        restoreFocus: false,
      };
      root.dataset.musicMorphState = root.classList.contains('is-open') ? 'open' : 'closed';

      const saved = (() => {
        try {
          return JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch {
          return {};
        }
      })();

      // 播放模式:单一枚举 normal | shuffle | repeat-one,互斥且只持久化一个 mode;
      // 兼容旧版本保存的 shuffle/repeatOne 两个布尔值
      let mode =
        saved.mode === 'shuffle' || saved.mode === 'repeat-one'
          ? saved.mode
          : saved.shuffle
            ? 'shuffle'
            : saved.repeatOne
              ? 'repeat-one'
              : 'normal';
      const favorites = new Set(
        Array.isArray(saved.favorites)
          ? saved.favorites.filter((value) => typeof value === 'string').slice(0, 250)
          : [],
      );

      audio.volume = Number.isFinite(saved.volume)
        ? Math.min(1, Math.max(0, saved.volume))
        : 0.72;
      audio.muted = Boolean(saved.muted);
      audio.loop = mode === 'repeat-one';
      root.classList.toggle('is-muted', audio.muted);
      shuffleButton?.setAttribute('aria-pressed', String(mode === 'shuffle'));
      repeatButton?.setAttribute('aria-pressed', String(mode === 'repeat-one'));

      const persist = () => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              index: currentIndex,
              volume: audio.volume,
              muted: audio.muted,
              mode,
              favorites: [...favorites],
            }),
          );
        } catch {
        }
      };

      const safeUrl = (value) => {
        if (!value) return '';
        try {
          const parsed = new URL(String(value), window.location.href);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'blob:') return '';
          if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
            parsed.protocol = 'https:';
          }
          return parsed.toString();
        } catch {
          return '';
        }
      };

      const cleanText = (value, fallback) => {
        const text = String(value || '').trim().replace(/\s+/g, ' ');
        return (text || fallback).slice(0, 180);
      };

      const setStatus = (message) => {
        status.textContent = message;
      };

      const setControlsDisabled = (disabled) => {
        [
          playButton,
          prevButton,
          nextButton,
          muteButton,
          shuffleButton,
          repeatButton,
          favoriteButton,
        ].forEach((button) => {
          if (!button) return;
          button.disabled = disabled;
        });
      };

      // 手机(<=859px)播放器是整宽底部 sheet:位置由 CSS 决定,不参与 JS 定位与拖动。
      // 桌面与平板保持既有浮动面板行为(冻结基线)。
      const sheetLayout = () => window.matchMedia('(max-width: 859px)').matches;

      const resetPanelPosition = () => {
        for (const property of ['position', 'left', 'top', 'right', 'bottom', 'transform-origin']) {
          panel.style.removeProperty(property);
        }
        delete panel.dataset.placement;
      };

      const clamp = (value, minimum, maximum) =>
        Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

      const setPanelPosition = (left, top, rect = panel.getBoundingClientRect()) => {
        const maxLeft = window.innerWidth - rect.width - viewportMargin;
        const maxTop = window.innerHeight - rect.height - viewportMargin;
        panel.style.position = 'fixed';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${clamp(left, viewportMargin, maxLeft)}px`;
        panel.style.top = `${clamp(top, viewportMargin, maxTop)}px`;
      };

      const positionPanel = (anchorToToggle = !panelWasDragged) => {
        if (!root.classList.contains('is-open')) return;

        // 手机是整宽底部 sheet:定位完全交给 CSS,任何内联 left/top 都会破坏 sheet 形态。
        // 这里主动清掉历史内联值(例如从桌面宽度切到手机宽度后残留的拖动坐标)。
        if (sheetLayout()) {
          resetPanelPosition();
          return;
        }

        panel.style.position = 'fixed';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        if (!anchorToToggle) {
          const rect = panel.getBoundingClientRect();
          setPanelPosition(rect.left, rect.top, rect);
          return;
        }

        // Neutral coordinates prevent an old panel drag from affecting measurement.
        panel.style.left = '0px';
        panel.style.top = '0px';
        const panelRect = panel.getBoundingClientRect();
        const toggleRect = toggle.getBoundingClientRect();
        const roomAbove = toggleRect.top - panelGap - viewportMargin;
        const roomBelow = window.innerHeight - toggleRect.bottom - panelGap - viewportMargin;
        const placeAbove = roomAbove >= panelRect.height || roomAbove >= roomBelow;
        const alignLeft = toggleRect.left + toggleRect.width / 2 <= window.innerWidth / 2;
        const left = alignLeft ? toggleRect.left : toggleRect.right - panelRect.width;
        const top = placeAbove
          ? toggleRect.top - panelGap - panelRect.height
          : toggleRect.bottom + panelGap;

        panel.dataset.placement = placeAbove ? 'above' : 'below';
        panel.style.transformOrigin = `${alignLeft ? 'left' : 'right'} ${placeAbove ? 'bottom' : 'top'}`;
        setPanelPosition(left, top, panelRect);
      };

      const schedulePanelPosition = (anchorToToggle = !panelWasDragged) => {
        window.cancelAnimationFrame(panelPositionFrame);
        panelPositionFrame = window.requestAnimationFrame(() => {
          panelPositionFrame = 0;
          positionPanel(anchorToToggle);
        });
      };

      const constrainDockToViewport = () => {
        if (!root.style.left && !root.style.top) return;
        const rect = root.getBoundingClientRect();
        root.style.left = `${clamp(
          rect.left,
          viewportMargin,
          window.innerWidth - rect.width - viewportMargin,
        )}px`;
        root.style.top = `${clamp(
          rect.top,
          viewportMargin,
          window.innerHeight - rect.height - viewportMargin,
        )}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
      };

      const setPanelAccessibility = (open) => {
        panel.setAttribute('aria-hidden', String(!open));
        if (open) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
      };

      const updateToggleAccessibility = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? '收起音乐播放器' : '打开音乐播放器');
        toggle.title = open ? '收起音乐' : '音乐';
      };

      const cancelMorphAnimations = () => {
        morph.animation?.cancel();
        morph.contentAnimations.forEach((animation) => animation.cancel());
        morph.toggleAnimation?.cancel();
        morph.animation = null;
        morph.contentAnimations = [];
        morph.toggleAnimation = null;
        morph.shell?.remove();
        morph.shell = null;
      };

      const validRect = (rect) =>
        rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) &&
        rect.width > 0 && rect.height > 0;

      const rectFrame = (rect, radius) => ({
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: radius,
      });

      const createMorphShell = (rect, radius) => {
        const shell = document.createElement('div');
        shell.className = 'music-player__morph-shell';
        shell.dataset.musicMorphShell = '';
        Object.assign(shell.style, rectFrame(rect, radius));
        shell.dataset.startLeft = String(rect.left);
        shell.dataset.startTop = String(rect.top);
        shell.dataset.startWidth = String(rect.width);
        shell.dataset.startHeight = String(rect.height);
        document.body.append(shell);
        morph.shell = shell;
        return shell;
      };

      const captureMorphVisual = () => {
        if (!morph.shell?.isConnected) return null;
        const rect = morph.shell.getBoundingClientRect();
        if (!validRect(rect)) return null;
        return {
          rect,
          radius: getComputedStyle(morph.shell).borderRadius || '50%',
        };
      };

      const animatePanelContent = (opening) => {
        const keyframes = opening
          ? [
              { opacity: 0, translate: '0 0.3rem', offset: 0 },
              { opacity: 0, translate: '0 0.3rem', offset: 0.35 },
              { opacity: 1, translate: '0 0', offset: 1 },
            ]
          : [
              { opacity: 1, translate: '0 0' },
              { opacity: 0, translate: '0 0.2rem' },
            ];
        const options = opening
          ? { duration: morphDuration, easing: morphEasing, fill: 'both' }
          : { duration: 120, easing: 'ease-out', fill: 'both' };
        morph.contentAnimations = [...panel.children].map((element) =>
          element.animate(keyframes, options),
        );
      };

      const finishMorph = (open, generation) => {
        if (generation !== morph.generation) return;
        cancelMorphAnimations();
        root.classList.toggle('is-open', open);
        root.dataset.musicMorphState = open ? 'open' : 'closed';
        setPanelAccessibility(open);
        updateToggleAccessibility(open);
        if (open) {
          scrollActiveTrack();
          closeButton?.focus({ preventScroll: true });
        } else {
          panelWasDragged = false;
          panelResetTimer = window.setTimeout(() => {
            if (!root.classList.contains('is-open')) resetPanelPosition();
          }, 20);
          if (morph.restoreFocus) toggle.focus({ preventScroll: true });
        }
      };

      const settleOpenState = (open, restoreFocus = false) => {
        window.clearTimeout(panelResetTimer);
        window.cancelAnimationFrame(panelPositionFrame);
        panelPositionFrame = 0;
        morph.generation += 1;
        morph.desiredOpen = open;
        morph.restoreFocus = restoreFocus;
        cancelMorphAnimations();
        root.classList.toggle('is-open', open);
        root.dataset.musicMorphState = open ? 'open' : 'closed';
        setPanelAccessibility(open);
        updateToggleAccessibility(open);
        if (open) {
          panelWasDragged = false;
          positionPanel(true);
          window.requestAnimationFrame(() => {
            positionPanel(true);
            scrollActiveTrack();
            closeButton?.focus({ preventScroll: true });
          });
        } else {
          panelWasDragged = false;
          panelResetTimer = window.setTimeout(() => {
            if (!root.classList.contains('is-open')) resetPanelPosition();
          }, 20);
          if (restoreFocus) toggle.focus({ preventScroll: true });
        }
      };

      const canMorph = () =>
        typeof document.documentElement.animate === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const startOpenMorph = () => {
        window.clearTimeout(panelResetTimer);
        const interrupted = captureMorphVisual();
        morph.generation += 1;
        const generation = morph.generation;
        morph.desiredOpen = true;
        morph.restoreFocus = false;
        cancelMorphAnimations();
        root.dataset.musicMorphState = 'opening';
        updateToggleAccessibility(true);
        root.classList.add('is-open');
        setPanelAccessibility(false);
        panelWasDragged = false;
        positionPanel(true);
        const toggleRect = toggle.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        if (!validRect(toggleRect) || !validRect(panelRect)) {
          settleOpenState(true);
          return;
        }
        const panelRadius = getComputedStyle(panel).borderRadius || '1.8rem';
        const startRect = interrupted?.rect ?? toggleRect;
        const startRadius = interrupted?.radius ?? '50%';
        const shell = createMorphShell(startRect, startRadius);
        shell.dataset.endLeft = String(panelRect.left);
        shell.dataset.endTop = String(panelRect.top);
        shell.dataset.endWidth = String(panelRect.width);
        shell.dataset.endHeight = String(panelRect.height);
        animatePanelContent(true);
        morph.animation = shell.animate(
          [rectFrame(startRect, startRadius), rectFrame(panelRect, panelRadius)],
          { duration: morphDuration, easing: morphEasing, fill: 'both' },
        );
        morph.animation.finished
          .then(() => finishMorph(true, generation))
          .catch(() => {});
      };

      const startCloseMorph = (restoreFocus = false) => {
        window.clearTimeout(panelResetTimer);
        const interrupted = captureMorphVisual();
        morph.generation += 1;
        const generation = morph.generation;
        morph.desiredOpen = false;
        morph.restoreFocus = restoreFocus;
        cancelMorphAnimations();
        const panelRect = panel.getBoundingClientRect();
        const toggleRect = toggle.getBoundingClientRect();
        if (!validRect(panelRect) || !validRect(toggleRect)) {
          settleOpenState(false, restoreFocus);
          return;
        }
        root.dataset.musicMorphState = 'closing';
        updateToggleAccessibility(false);
        setPanelAccessibility(false);
        const panelRadius = getComputedStyle(panel).borderRadius || '1.8rem';
        const startRect = interrupted?.rect ?? panelRect;
        const startRadius = interrupted?.radius ?? panelRadius;
        const shell = createMorphShell(startRect, startRadius);
        shell.dataset.endLeft = String(toggleRect.left);
        shell.dataset.endTop = String(toggleRect.top);
        shell.dataset.endWidth = String(toggleRect.width);
        shell.dataset.endHeight = String(toggleRect.height);
        animatePanelContent(false);
        morph.toggleAnimation = toggle.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: 0.7 },
            { opacity: 1, offset: 1 },
          ],
          { duration: morphDuration, easing: morphEasing, fill: 'both' },
        );
        morph.animation = shell.animate(
          [rectFrame(startRect, startRadius), rectFrame(toggleRect, '50%')],
          { duration: morphDuration, easing: morphEasing, fill: 'both' },
        );
        morph.animation.finished
          .then(() => finishMorph(false, generation))
          .catch(() => {});
      };

      const setOpen = (open, restoreFocus = false) => {
        const state = root.dataset.musicMorphState;
        if (open && (state === 'open' || state === 'opening')) return;
        if (!open && (state === 'closed' || state === 'closing')) return;
        // 移动端与设置/抽屉/灯箱互斥;桌面仅登记,并存行为保持冻结基线
        if (open) window.__blogOverlayCoordinator?.request('music');
        else window.__blogOverlayCoordinator?.release('music');
        if (!canMorph()) {
          settleOpenState(open, restoreFocus);
          return;
        }
        if (open) startOpenMorph();
        else startCloseMorph(restoreFocus);
      };

      // 注册关闭器:其他浮层打开时由协调器收起播放器
      window.__blogOverlayCoordinator?.register('music', () => {
        if (root.classList.contains('is-open')) setOpen(false, false);
      });

      const panelResizeObserver = new ResizeObserver(() => {
        if (root.classList.contains('is-open') && !root.classList.contains('is-dragging')) {
          schedulePanelPosition(!panelWasDragged);
        }
      });
      panelResizeObserver.observe(panel);

      const settleInterruptedMorph = () => {
        const state = root.dataset.musicMorphState;
        if (state !== 'opening' && state !== 'closing') return;
        settleOpenState(morph.desiredOpen, false);
      };

      window.addEventListener('resize', () => {
        settleInterruptedMorph();
        constrainDockToViewport();
        if (root.classList.contains('is-open')) schedulePanelPosition(!panelWasDragged);
      });

      const updateCover = (image, source) => {
        if (!image) return;
        if (!source) {
          image.hidden = true;
          image.removeAttribute('src');
          return;
        }
        image.hidden = false;
        image.src = source;
      };

      cover?.addEventListener('error', () => { cover.hidden = true; });
      dockCover?.addEventListener('error', () => { dockCover.hidden = true; });

      const updateMediaSession = (track) => {
        if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'YHuo 音乐',
            artwork: track.cover
              ? [{ src: track.cover, sizes: '300x300', type: 'image/jpeg' }]
              : [],
          });
        } catch {
        }
      };

      const getTrackKey = (track) => `${track.title}\u0000${track.artist}\u0000${track.url}`;

      const updateFavoriteState = () => {
        if (!favoriteButton || !tracks.length) return;
        const active = favorites.has(getTrackKey(tracks[currentIndex]));
        favoriteButton.classList.toggle('is-favorite', active);
        favoriteButton.setAttribute('aria-pressed', String(active));
        favoriteButton.setAttribute('aria-label', active ? '取消收藏当前歌曲' : '收藏当前歌曲');
        favoriteButton.title = active ? '取消收藏' : '收藏';
      };

      const scrollActiveTrack = () => {
        const activeButton = list.querySelector(`[data-track-index="${currentIndex}"]`);
        activeButton?.scrollIntoView({ block: 'nearest' });
      };

      const updateActiveTrack = () => {
        list.querySelectorAll('[data-track-index]').forEach((button) => {
          const active = Number(button.dataset.trackIndex) === currentIndex;
          button.setAttribute('aria-current', String(active));
        });
      };

      const showTrack = (index) => {
        if (!tracks.length) return;
        currentIndex = ((index % tracks.length) + tracks.length) % tracks.length;
        const track = tracks[currentIndex];
        title.textContent = track.title;
        artist.textContent = track.artist;
        updateCover(cover, track.cover);
        updateCover(dockCover, track.cover);
        updateActiveTrack();
        updateFavoriteState();
        if (count) count.textContent = `${currentIndex + 1}/${tracks.length}`;
        if (root.classList.contains('is-open')) window.requestAnimationFrame(scrollActiveTrack);
        updateMediaSession(track);
        persist();
      };

      const resetTimeline = () => {
        progress.value = '0';
        progress.style.setProperty('--music-progress', '0%');
        progress.parentElement?.style.setProperty('--music-progress', '0%');
        progress.disabled = true;
        progress.setAttribute('aria-valuetext', '0:00 / 0:00');
        if (currentTime) currentTime.textContent = '0:00';
        if (duration) duration.textContent = '0:00';
      };

      const loadCurrentAudio = () => {
        if (!tracks.length) return false;
        if (loadedIndex === currentIndex && audio.src) return true;
        loadedIndex = currentIndex;
        resetTimeline();
        audio.src = tracks[currentIndex].url;
        audio.load();
        return true;
      };

      const scheduleSkip = () => {
        if (skipScheduled || !wantsPlayback || !tracks.length) return;
        skipScheduled = true;
        failedTracks.add(currentIndex);
        root.classList.remove('is-playing', 'is-loading');

        if (failedTracks.size >= tracks.length) {
          wantsPlayback = false;
          setStatus('歌单中的曲目暂时都无法播放');
          skipScheduled = false;
          return;
        }

        let next = currentIndex;
        do {
          next = (next + 1) % tracks.length;
        } while (failedTracks.has(next) && next !== currentIndex);

        setStatus('这首暂不可播，已为你切换下一首');
        skipTimer = window.setTimeout(() => {
          skipTimer = 0;
          skipScheduled = false;
          selectTrack(next, true, false);
        }, 420);
      };

      const playCurrent = async () => {
        if (!loadCurrentAudio()) return;
        const generation = ++playGeneration;
        wantsPlayback = true;
        root.classList.add('is-loading');
        setStatus('正在缓冲…');
        try {
          await audio.play();
        } catch (error) {
          if (generation !== playGeneration || error?.name === 'AbortError') return;
          root.classList.remove('is-loading');
          if (error?.name === 'NotAllowedError') {
            wantsPlayback = false;
            setStatus('浏览器阻止了播放，请再点一次');
            return;
          }
          scheduleSkip();
        }
      };

      function selectTrack(index, shouldPlay, userInitiated = true) {
        if (!tracks.length) return;
        if (userInitiated && skipTimer) {
          window.clearTimeout(skipTimer);
          skipTimer = 0;
          skipScheduled = false;
        }
        if (userInitiated) failedTracks.delete(((index % tracks.length) + tracks.length) % tracks.length);
        const changed = currentIndex !== ((index % tracks.length) + tracks.length) % tracks.length;
        if (changed) {
          playGeneration += 1;
          if (!audio.paused) audio.pause();
        }
        showTrack(index);
        if (changed) {
          loadedIndex = -1;
          audio.removeAttribute('src');
          audio.load();
          resetTimeline();
        }
        if (shouldPlay) playCurrent();
        else setStatus('准备就绪');
      }

      const getAdjacentIndex = (direction) => {
        if (mode !== 'shuffle' || tracks.length < 2) return currentIndex + direction;
        let candidate = currentIndex;
        for (let attempts = 0; attempts < tracks.length * 2 && candidate === currentIndex; attempts += 1) {
          candidate = Math.floor(Math.random() * tracks.length);
        }
        return candidate === currentIndex ? currentIndex + direction : candidate;
      };

      const renderTracks = () => {
        list.replaceChildren();
        const fragment = document.createDocumentFragment();
        tracks.forEach((track, index) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          const artwork = track.cover
            ? document.createElement('img')
            : document.createElement('span');
          const copy = document.createElement('span');
          const trackTitle = document.createElement('strong');
          const trackArtist = document.createElement('small');
          const trackPosition = document.createElement('span');

          button.type = 'button';
          button.className = 'music-player__track-button';
          button.dataset.trackIndex = String(index);
          button.setAttribute('aria-label', `播放 ${track.title} - ${track.artist}`);
          button.setAttribute('aria-current', String(index === currentIndex));
          if (artwork instanceof HTMLImageElement) {
            artwork.className = 'music-player__track-art';
            artwork.src = track.cover;
            artwork.alt = '';
            artwork.loading = 'lazy';
            artwork.referrerPolicy = 'no-referrer';
          } else {
            artwork.className = 'music-player__track-number';
            artwork.textContent = String(index + 1).padStart(2, '0');
          }
          copy.className = 'music-player__track-copy';
          trackTitle.textContent = track.title;
          trackArtist.textContent = track.artist;
          trackPosition.className = 'music-player__track-position';
          trackPosition.textContent = String(index + 1).padStart(2, '0');
          copy.append(trackTitle, trackArtist);
          button.append(artwork, copy, trackPosition);
          item.append(button);
          fragment.append(item);
        });
        list.append(fragment);
      };

      // 站内曲库加载：与迷你播放条同一份数据（window.__siteMusicTracks 由主脚本暴露，
      // 后台曲库 + music/ 静态目录合并去重后的 tracks 快照）；曲库尚未就绪时轮询等待，不接网易云 API
      const loadPlaylist = async () => {
        fetchController = new AbortController(); // 10 秒超时上限经 signal 生效（轮询循环里检查 aborted 提前退出）
        const timeout = window.setTimeout(() => fetchController.abort(), 10000);
        setControlsDisabled(true);
        retryButton?.setAttribute('hidden', '');
        count.textContent = '加载中';
        setStatus('正在读取曲库…');
        list.innerHTML = '<li class="music-player__empty">正在读取站内曲库…</li>';
        const grab = () => {
          const get = window.__siteMusicTracks;
          const arr = typeof get === 'function' ? get() : null;
          return Array.isArray(arr) ? arr : null;
        };
        try {
          let siteTracks = grab();
          for (let waited = 0; !siteTracks && waited < 8000; waited += 300) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            if (fetchController.signal.aborted) return;
            siteTracks = grab();
          }
          if (fetchController.signal.aborted) return;
          if (!siteTracks) throw new Error('曲目库不可用');
          tracks = siteTracks
            .map((item) => {
              const raw = String(item.name || '').replace(/\.[a-z0-9]+$/i, '');
              const sep = raw.indexOf(' - ');
              return {
                title: cleanText(sep > -1 ? raw.slice(0, sep) : raw, '未知歌曲'),
                artist: cleanText(sep > -1 ? raw.slice(sep + 3) : '站内曲库', '站内曲库'),
                cover: safeUrl(item.cover),
                url: safeUrl(item.url || item.src), // 迷你播放条的曲目字段是 src
              };
            })
            .filter((track) => track.url);
          if (!tracks.length) throw new Error('曲目库为空');
          const requestedIndex = Number(saved.index);
          currentIndex = Number.isInteger(requestedIndex)
            ? Math.min(tracks.length - 1, Math.max(0, requestedIndex))
            : 0;
          loadedIndex = -1;
          failedTracks = new Set();
          renderTracks();
          showTrack(currentIndex);
          setControlsDisabled(false);
          setStatus('准备就绪');
        } catch (error) {
          if (error?.name === 'AbortError') setStatus('曲库读取超时');
          else setStatus('曲库暂时无法加载');
          title.textContent = '稍后再试';
          artist.textContent = '曲库还没就绪或为空';
          count.textContent = '0/0';
          list.innerHTML = '<li class="music-player__empty">站内曲库还没加载出来，稍后点「重新加载」。</li>';
          retryButton?.removeAttribute('hidden');
        } finally {
          window.clearTimeout(timeout);
        }
      };

      // ---- 面板拖动:按住 header 空白区拖动(按钮/链接不参与)----
      const header = root.querySelector('.music-player__header');
      let dragState = null;

      // 手机上播放器是底部 sheet,不应要求用户拖动面板(文档 5.7)。
      // 判定用能力查询而非纯宽度:平板与桌面(hover + fine 指针)继续保留拖动。
      const dragDisabled = () =>
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        window.matchMedia('(max-width: 859px)').matches;

      if (header) {
        header.addEventListener('pointerdown', (event) => {
          // is-open 加在根元素 root 上(见 setOpen),勿用 panel.classList
          if (!root.classList.contains('is-open')) return;
          if (dragDisabled()) return;
          if (event.target.closest('button, a, .music-player__header-actions')) return;
          const rect = panel.getBoundingClientRect();
          dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: rect.left,
            originY: rect.top,
            moved: false,
          };
          try {
            header.setPointerCapture(event.pointerId);
          } catch {
            // 指针已失效时忽略,后续 move/up 通过 pointerId 匹配天然失效
          }
        });

        header.addEventListener('pointermove', (event) => {
          if (!dragState || dragState.pointerId !== event.pointerId) return;
          const dx = event.clientX - dragState.startX;
          const dy = event.clientY - dragState.startY;
          if (!dragState.moved && Math.hypot(dx, dy) < 6) return; // 位移过小视为点按
          if (!dragState.moved) {
            dragState.moved = true;
            panelWasDragged = true;
            root.classList.add('is-dragging');
          }
          const rect = panel.getBoundingClientRect();
          setPanelPosition(dragState.originX + dx, dragState.originY + dy, rect);
        });

        const endDrag = (event) => {
          if (!dragState || dragState.pointerId !== event.pointerId) return;
          const moved = dragState.moved;
          dragState = null;
          root.classList.remove('is-dragging');
          if (moved) positionPanel(false);
        };
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);
      }

      // ---- 悬浮球拖动:toggle 按住可拖动(位移 <6px 视为点按,正常开关面板) ----
      const toggleDrag = {
        pointerId: null,
        startX: 0,
        startY: 0,
        originLeft: 0,
        originTop: 0,
        moved: false,
        suppressClick: false,
      };

      toggle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const rect = root.getBoundingClientRect();
        // 起点直接用当前视口坐标(left/top);
        // 不要用 innerWidth - rect.right(那是右边距,会把手柄基准错放到左上角附近)
        toggleDrag.pointerId = event.pointerId;
        toggleDrag.startX = event.clientX;
        toggleDrag.startY = event.clientY;
        toggleDrag.originLeft = rect.left;
        toggleDrag.originTop = rect.top;
        toggleDrag.moved = false;
        // 每次新的拖动开始时复位,pointercancel 吞掉的状态不会遗留到下次点击
        toggleDrag.suppressClick = false;
        try {
          toggle.setPointerCapture?.(event.pointerId);
        } catch {
          // 指针已失效时忽略
        }
      });

      toggle.addEventListener('pointermove', (event) => {
        if (toggleDrag.pointerId !== event.pointerId) return;
        const dx = event.clientX - toggleDrag.startX;
        const dy = event.clientY - toggleDrag.startY;
        if (!toggleDrag.moved && Math.hypot(dx, dy) < 6) return;
        if (!toggleDrag.moved) {
          toggleDrag.moved = true;
          toggleDrag.suppressClick = true;
          root.classList.add('is-dragging');
        }
        const left = Math.min(
          Math.max(toggleDrag.originLeft + dx, 8),
          window.innerWidth - 52,
        );
        const top = Math.min(
          Math.max(toggleDrag.originTop + dy, 8),
          window.innerHeight - 52,
        );
        root.style.left = `${left}px`;
        root.style.top = `${top}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
      });

      const endToggleDrag = (event) => {
        if (toggleDrag.pointerId !== event.pointerId) return;
        toggleDrag.pointerId = null;
        root.classList.remove('is-dragging');
      };
      toggle.addEventListener('pointerup', endToggleDrag);
      toggle.addEventListener('pointercancel', endToggleDrag);

      toggle.addEventListener('dragstart', (event) => event.preventDefault());

      toggle.addEventListener('click', () => {
        // 刚拖动过:跳过本次 click,不误触发开关面板
        if (toggleDrag.suppressClick) {
          toggleDrag.suppressClick = false;
          return;
        }
        setOpen(!morph.desiredOpen);
      });

      closeButton?.addEventListener('click', () => {
        setOpen(false, true);
      });

      document.addEventListener('pointerdown', (event) => {
        if (root.classList.contains('is-open') && !root.contains(event.target)) setOpen(false);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root.classList.contains('is-open')) {
          setOpen(false, true);
        }
      });

      playButton.addEventListener('click', () => {
        if (audio.paused) playCurrent();
        else {
          playGeneration += 1;
          wantsPlayback = false;
          audio.pause();
        }
      });

      prevButton.addEventListener('click', () => {
        const keepPlaying = wantsPlayback && !audio.paused;
        selectTrack(getAdjacentIndex(-1), keepPlaying);
      });

      nextButton.addEventListener('click', () => {
        const keepPlaying = wantsPlayback && !audio.paused;
        selectTrack(getAdjacentIndex(1), keepPlaying);
      });

      panel.addEventListener('wheel', (event) => {
        if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
        const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? list.clientHeight
            : 1;
        list.scrollTop += event.deltaY * scale;
        event.preventDefault();
      }, { passive: false });

      muteButton.addEventListener('click', () => {
        audio.muted = !audio.muted;
      });

      // 模式互斥:选中一种自动取消另一种(单一枚举,不出现同时选中)
      const syncModeButtons = () => {
        shuffleButton?.setAttribute('aria-pressed', String(mode === 'shuffle'));
        shuffleButton.title = mode === 'shuffle' ? '关闭随机播放' : '随机播放';
        repeatButton?.setAttribute('aria-pressed', String(mode === 'repeat-one'));
        repeatButton.title = mode === 'repeat-one' ? '关闭单曲循环' : '单曲循环';
      };

      shuffleButton?.addEventListener('click', () => {
        mode = mode === 'shuffle' ? 'normal' : 'shuffle';
        audio.loop = mode === 'repeat-one';
        syncModeButtons();
        persist();
      });

      repeatButton?.addEventListener('click', () => {
        mode = mode === 'repeat-one' ? 'normal' : 'repeat-one';
        audio.loop = mode === 'repeat-one';
        syncModeButtons();
        persist();
      });

      favoriteButton?.addEventListener('click', () => {
        if (!tracks.length) return;
        const key = getTrackKey(tracks[currentIndex]);
        if (favorites.has(key)) favorites.delete(key);
        else favorites.add(key);
        updateFavoriteState();
        persist();
      });

      retryButton?.addEventListener('click', loadPlaylist);

      list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-track-index]');
        if (!button || !list.contains(button)) return;
        selectTrack(Number(button.dataset.trackIndex), true);
      });

      progress.addEventListener('input', () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const ratio = Number(progress.value) / 1000;
        progress.style.setProperty('--music-progress', `${ratio * 100}%`);
        progress.parentElement?.style.setProperty('--music-progress', `${ratio * 100}%`);
        audio.currentTime = ratio * audio.duration;
        progress.setAttribute(
          'aria-valuetext',
          `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`,
        );
      });

      audio.addEventListener('loadstart', () => {
        if (wantsPlayback) {
          root.classList.add('is-loading');
          setStatus('正在缓冲…');
        }
      });

      audio.addEventListener('playing', () => {
        wantsPlayback = true;
        root.classList.remove('is-loading');
        root.classList.add('is-playing');
        playButton.setAttribute('aria-label', '暂停');
        playButton.title = '暂停';
        setStatus('正在播放');
      });

      audio.addEventListener('pause', () => {
        root.classList.remove('is-playing', 'is-loading');
        playButton.setAttribute('aria-label', '播放');
        playButton.title = '播放';
        if (!wantsPlayback && audio.currentTime > 0 && !audio.ended) setStatus('已暂停');
      });

      audio.addEventListener('waiting', () => {
        if (wantsPlayback) {
          root.classList.add('is-loading');
          setStatus('网络缓冲中…');
        }
      });

      audio.addEventListener('loadedmetadata', () => {
        progress.disabled = !Number.isFinite(audio.duration);
        if (duration) duration.textContent = formatTime(audio.duration);
        progress.setAttribute(
          'aria-valuetext',
          `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`,
        );
      });

      audio.addEventListener('timeupdate', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const ratio = audio.currentTime / audio.duration;
          progress.value = String(Math.round(ratio * 1000));
          progress.style.setProperty('--music-progress', `${ratio * 100}%`);
          progress.parentElement?.style.setProperty('--music-progress', `${ratio * 100}%`);
          if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
          if (duration) duration.textContent = formatTime(audio.duration);
          progress.setAttribute(
            'aria-valuetext',
            `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`,
          );
        }
      });

      audio.addEventListener('ended', () => {
        selectTrack(mode === 'repeat-one' ? currentIndex : getAdjacentIndex(1), true, false);
      });
      audio.addEventListener('error', scheduleSkip);
      audio.addEventListener('volumechange', () => {
        root.classList.toggle('is-muted', audio.muted || audio.volume === 0);
        muteButton.setAttribute('aria-label', audio.muted ? '恢复声音' : '静音');
        muteButton.title = audio.muted ? '恢复声音' : '静音';
        persist();
      });

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', playCurrent);
          navigator.mediaSession.setActionHandler('pause', () => {
            playGeneration += 1;
            wantsPlayback = false;
            audio.pause();
          });
          navigator.mediaSession.setActionHandler('previoustrack', () => selectTrack(getAdjacentIndex(-1), true));
          navigator.mediaSession.setActionHandler('nexttrack', () => selectTrack(getAdjacentIndex(1), true));
        } catch {
        }
      }

      loadPlaylist();
    };

    // 本站接入：没有 00 设置核心与卡片尺寸档位（统一默认尺寸）；
    // DOM 常驻但默认 display:none，后台切到"悬浮播放器"后由 /api/settings 回调调 __initBlogPlayer 拉起
    window.__initBlogPlayer = function () {
      document.querySelectorAll('[data-music-player]').forEach((root) => {
        initPlayer(root);
      });
    };
    // 兜底：head 缓存已标 blog 模式但设置接口失败时，5 秒后直接拉起（读站内曲库），避免两个播放器都不出现
    setTimeout(function () {
      if (document.documentElement.classList.contains('using-blog-player')) window.__initBlogPlayer();
    }, 5000);
  })();
