(function () {
  'use strict';

  const video = document.querySelector('.immersive-video');
  const immersive = document.querySelector('.immersive-experience');
  const backdrop = document.querySelector('.video-backdrop');

  if (!video || !immersive || !backdrop) return;

  const VIDEO_SRC = video.dataset.src || 'videos/tour-scroll.mp4';
  /* Mantém folga do último frame para nunca entrar em `ended` */
  const END_EPS = 0.05;

  let duration = 0;
  let endTime = 0;
  let isReady = false;
  let isUnlocked = false;
  let immersiveTop = 0;
  let scrollRange = 1;
  let targetTime = 0;
  let rafId = 0;
  let seeking = false;

  video.pause();
  video.muted = true;
  video.loop = false;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.disablePictureInPicture = true;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cacheMetrics() {
    immersiveTop = immersive.offsetTop;
    scrollRange = Math.max(1, immersive.offsetHeight - window.innerHeight);
  }

  function progressFromScroll() {
    return clamp((window.scrollY - immersiveTop) / scrollRange, 0, 1);
  }

  function updateTarget() {
    targetTime = clamp(progressFromScroll() * endTime, 0, endTime);
  }

  function updateBackdrop() {
    const viewportBottom = window.scrollY + window.innerHeight;
    const immersiveBottom = immersiveTop + immersive.offsetHeight;
    const visible =
      immersiveBottom > window.scrollY && immersiveTop < viewportBottom;
    backdrop.style.visibility = visible ? 'visible' : 'hidden';
  }

  function applySeek() {
    if (!isReady || seeking) return;

    const next = targetTime;
    const delta = Math.abs(video.currentTime - next);

    if (delta < 0.02) return;

    seeking = true;

    try {
      if (video.ended) {
        video.pause();
      }
      video.currentTime = next;
    } catch (error) {
      seeking = false;
    }
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!isReady) return;

    updateTarget();
    updateBackdrop();
    applySeek();
  }

  function unlockVideo() {
    if (isUnlocked) return;
    isUnlocked = true;
    video.muted = true;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(function () {
          video.pause();
          updateTarget();
          applySeek();
        })
        .catch(function () {
          /* scrub ainda funciona sem play */
        });
    }
  }

  function onScroll() {
    unlockVideo();
    updateTarget();
  }

  function waitForMetadata() {
    return new Promise(function (resolve, reject) {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }

      video.addEventListener('loadedmetadata', function () {
        resolve();
      }, { once: true });

      video.addEventListener('error', function () {
        reject(new Error('Falha ao carregar vídeo'));
      }, { once: true });
    });
  }

  function init() {
    cacheMetrics();
    updateTarget();
    updateBackdrop();

    video.addEventListener('seeking', function () {
      seeking = true;
    });

    video.addEventListener('seeked', function () {
      seeking = false;
      /* Aplica o alvo mais recente após cada seek (ida e volta fluidos) */
      applySeek();
    });

    video.addEventListener('ended', function () {
      video.pause();
      targetTime = endTime;
      seeking = false;
      try {
        video.currentTime = endTime;
      } catch (error) {
        /* ignore */
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(
      'resize',
      function () {
        cacheMetrics();
        updateTarget();
        updateBackdrop();
      },
      { passive: true }
    );

    document.addEventListener('touchstart', unlockVideo, {
      once: true,
      passive: true,
    });
    document.addEventListener('click', unlockVideo, { once: true });

    rafId = requestAnimationFrame(tick);
  }

  video.src = VIDEO_SRC;
  video.load();

  waitForMetadata()
    .then(function () {
      duration = video.duration;
      if (!duration || Number.isNaN(duration)) {
        throw new Error('Duração do vídeo inválida');
      }

      endTime = Math.max(0, duration - END_EPS);
      isReady = true;
      init();
    })
    .catch(function (error) {
      console.error('[video-scroll]', error);
    });

  window.addEventListener('beforeunload', function () {
    video.pause();
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
