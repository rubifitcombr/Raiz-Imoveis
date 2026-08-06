(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const video = document.querySelector('.immersive-video');
  const immersive = document.querySelector('.immersive-experience');
  const backdrop = document.querySelector('.video-backdrop');

  if (!video || !immersive || !backdrop) return;

  const VIDEO_SRC = video.dataset.src || '/videos/video-completo.mp4';
  const LERP_SPEED = 14;
  const TIME_EPSILON = 0.004;

  let objectUrl = null;
  let duration = 0;
  let targetTime = 0;
  let renderedTime = 0;
  let rafId = null;
  let scrollTriggerInstance = null;
  let isReady = false;

  video.pause();

  video.addEventListener('play', function () {
    video.pause();
  });

  function clampTime(time) {
    return Math.max(0, Math.min(duration, time));
  }

  function applyVideoTime(time) {
    if (!isReady) return;
    const next = clampTime(time);
    if (Math.abs(video.currentTime - next) > TIME_EPSILON) {
      video.currentTime = next;
    }
    renderedTime = next;
  }

  function stopRenderLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function renderFrame(timestamp) {
    rafId = requestAnimationFrame(renderFrame);

    if (!isReady) return;

    const delta = Math.min((renderFrame.lastTs ? timestamp - renderFrame.lastTs : 16) / 1000, 0.05);
    renderFrame.lastTs = timestamp;

    const factor = 1 - Math.exp(-LERP_SPEED * delta);
    const diff = targetTime - renderedTime;

    if (Math.abs(diff) <= TIME_EPSILON) {
      if (Math.abs(video.currentTime - targetTime) > TIME_EPSILON) {
        applyVideoTime(targetTime);
      }
      stopRenderLoop();
      return;
    }

    applyVideoTime(renderedTime + diff * factor);
  }

  function startRenderLoop() {
    if (rafId === null) {
      renderFrame.lastTs = 0;
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  function setTargetFromProgress(progress) {
    targetTime = clampTime(progress * duration);
    startRenderLoop();
  }

  function waitForVideoReady() {
    return new Promise(function (resolve) {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }

      function onReady() {
        video.removeEventListener('canplaythrough', onReady);
        video.removeEventListener('loadeddata', onReady);
        resolve();
      }

      video.addEventListener('canplaythrough', onReady, { once: true });
      video.addEventListener('loadeddata', onReady, { once: true });
    });
  }

  function waitForSeek(time) {
    return new Promise(function (resolve) {
      function onSeeked() {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }

      video.addEventListener('seeked', onSeeked, { once: true });
      video.currentTime = time;
    });
  }

  function initScrollTrigger() {
    if (scrollTriggerInstance) return;

    scrollTriggerInstance = ScrollTrigger.create({
      trigger: immersive,
      start: 'top top',
      end: function () {
        return '+=' + (immersive.offsetHeight - window.innerHeight);
      },
      pin: true,
      scrub: false,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        setTargetFromProgress(self.progress);
      },
      onEnter: function () {
        backdrop.style.visibility = 'visible';
      },
      onEnterBack: function () {
        backdrop.style.visibility = 'visible';
      },
      onLeave: function () {
        backdrop.style.visibility = 'hidden';
      },
      onLeaveBack: function () {
        backdrop.style.visibility = 'hidden';
      }
    });

    ScrollTrigger.refresh();
  }

  function loadVideoBlob() {
    return fetch(VIDEO_SRC)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Falha ao carregar vídeo: ' + response.status);
        }
        return response.blob();
      })
      .then(function (blob) {
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        return waitForVideoReady();
      })
      .then(function () {
        duration = video.duration;
        if (!duration || Number.isNaN(duration)) {
          throw new Error('Duração do vídeo inválida');
        }
        return waitForSeek(0);
      })
      .then(function () {
        video.pause();
        targetTime = 0;
        renderedTime = 0;
        isReady = true;
        initScrollTrigger();
      })
      .catch(function (error) {
        console.error('[video-scroll]', error);
      });
  }

  loadVideoBlob();

  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });

  window.addEventListener('beforeunload', function () {
    stopRenderLoop();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  });
})();
