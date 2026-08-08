(function () {
  'use strict';

  const video = document.querySelector('.immersive-video');
  const immersive = document.querySelector('.immersive-experience');
  const backdrop = document.querySelector('.video-backdrop');

  if (!video || !immersive || !backdrop) return;

  const VIDEO_SRC = video.dataset.src || 'videos/video-completo.mp4';
  const MAX_RATE = 12;
  const MIN_ACTIVE_RATE = 0.2;
  const DRIFT_CORRECT = 0.35;
  const END_OFFSET = 0.04;

  const isTouch =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    'ontouchstart' in window;

  let duration = 0;
  let isReady = false;
  let lastProgress = 0;
  let lastFrameTime = 0;
  let idleFrames = 0;
  let isUnlocked = false;

  video.pause();
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.disablePictureInPicture = true;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getEndTime() {
    return Math.max(0, duration - END_OFFSET);
  }

  function getScrollRange() {
    return Math.max(1, immersive.offsetHeight - window.innerHeight);
  }

  function getProgress() {
    const rect = immersive.getBoundingClientRect();
    return clamp(-rect.top / getScrollRange(), 0, 1);
  }

  function updateBackdrop() {
    const rect = immersive.getBoundingClientRect();
    backdrop.style.visibility = rect.bottom > 0 && rect.top < window.innerHeight
      ? 'visible'
      : 'hidden';
  }

  function snapTo(time) {
    const next = clamp(time, 0, getEndTime());
    if (Math.abs(video.currentTime - next) < 0.01) return;

    try {
      if (!isTouch && typeof video.fastSeek === 'function') {
        video.fastSeek(next);
      } else {
        video.currentTime = next;
      }
    } catch (error) {
      /* iOS pode rejeitar seek antes do desbloqueio */
    }
  }

  function stopAt(time) {
    video.pause();
    video.playbackRate = 1;
    snapTo(time);
  }

  function playAtRate(rate) {
    const signed = clamp(rate, -MAX_RATE, MAX_RATE);

    if (Math.abs(signed) < MIN_ACTIVE_RATE) {
      return false;
    }

    if (signed < 0) {
      video.playbackRate = signed;

      if (video.playbackRate >= 0) {
        snapTo(video.currentTime + signed * 0.032);
        return false;
      }
    } else {
      video.playbackRate = signed;
    }

    if (video.paused) {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {
          video.pause();
        });
      }
    }

    return true;
  }

  function scrubTo(targetTime) {
    const next = clamp(targetTime, 0, getEndTime());

    if (Math.abs(video.currentTime - next) < 0.016) return;

    try {
      video.currentTime = next;
    } catch (error) {
      /* ignorar seek rejeitado */
    }
  }

  function tickTouch() {
    requestAnimationFrame(tickTouch);

    if (!isReady) return;

    const progress = getProgress();
    const targetTime = clamp(progress * duration, 0, getEndTime());

    updateBackdrop();
    scrubTo(targetTime);
    lastProgress = progress;
  }

  function tickDesktop(now) {
    requestAnimationFrame(tickDesktop);

    if (!isReady) return;

    if (!lastFrameTime) {
      lastFrameTime = now;
      lastProgress = getProgress();
      return;
    }

    const dt = (now - lastFrameTime) / 1000;
    if (dt <= 0) return;

    const progress = getProgress();
    const targetTime = clamp(progress * duration, 0, getEndTime());
    const progressVelocity = (progress - lastProgress) / dt;
    let rate = progressVelocity * duration;
    const drift = targetTime - video.currentTime;

    lastFrameTime = now;
    lastProgress = progress;
    updateBackdrop();

    if (progress <= 0.001 && rate <= 0) {
      idleFrames = 0;
      stopAt(0);
      return;
    }

    if (progress >= 0.999 && rate >= 0) {
      idleFrames = 0;
      stopAt(getEndTime());
      return;
    }

    if (Math.abs(drift) > 1.2) {
      idleFrames = 0;
      stopAt(targetTime);
      return;
    }

    if (Math.abs(rate) > 0.05) {
      idleFrames = 0;

      if (Math.abs(drift) > DRIFT_CORRECT) {
        rate += drift * 3;
      }

      if (playAtRate(rate)) {
        return;
      }
    } else if (Math.abs(drift) > 0.04) {
      idleFrames = 0;
      rate = drift > 0 ? MIN_ACTIVE_RATE : -MIN_ACTIVE_RATE;

      if (playAtRate(rate)) {
        return;
      }
    }

    idleFrames += 1;

    if (idleFrames > 2) {
      video.pause();
      video.playbackRate = 1;

      if (Math.abs(drift) > 0.04) {
        snapTo(targetTime);
      }
    }
  }

  function waitForVideoReady() {
    return new Promise(function (resolve, reject) {
      function onReady() {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
        }
      }

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }

      video.addEventListener('loadedmetadata', onReady, { once: true });
      video.addEventListener('canplay', onReady, { once: true });
      video.addEventListener('error', function () {
        reject(new Error('Falha ao carregar vídeo'));
      }, { once: true });
    });
  }

  function unlockVideo() {
    if (isUnlocked) return;
    isUnlocked = true;

    video.muted = true;

    const promise = video.play();
    if (promise && typeof promise.then === 'function') {
      promise
        .then(function () {
          video.pause();
          snapTo(getProgress() * duration);
        })
        .catch(function () {
          /* scrub por currentTime funciona mesmo sem play */
        });
    }
  }

  function initScroll() {
    video.addEventListener('ended', function () {
      stopAt(getEndTime());
    });

    window.addEventListener('resize', updateBackdrop, { passive: true });

    document.addEventListener('touchstart', unlockVideo, { once: true, passive: true });
    document.addEventListener('click', unlockVideo, { once: true });
    document.addEventListener('scroll', unlockVideo, { once: true, passive: true });

    updateBackdrop();
    snapTo(0);

    if (isTouch) {
      requestAnimationFrame(tickTouch);
    } else {
      requestAnimationFrame(tickDesktop);
    }
  }

  function loadVideo() {
    video.src = VIDEO_SRC;
    video.preload = 'auto';
    video.load();

    return waitForVideoReady()
      .then(function () {
        duration = video.duration;

        if (!duration || Number.isNaN(duration)) {
          throw new Error('Duração do vídeo inválida');
        }

        snapTo(0);
        isReady = true;
        initScroll();
      })
      .catch(function (error) {
        console.error('[video-scroll]', error);
      });
  }

  loadVideo();

  window.addEventListener('beforeunload', function () {
    video.pause();
  });
})();
