(function () {
  // Reveal on scroll
  var revealTargets = document.querySelectorAll('.reveal');
  if (revealTargets.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (entry.isIntersecting) {
          setTimeout(function () {
            entry.target.classList.add('is-visible');
          }, (index % 4) * 90);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // Barra de progresso de scroll
  var progressBar = document.getElementById('scroll-progress');
  var rafId1 = null;

  function updateProgress() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) {
      progressBar.style.width = progress + '%';
    }
  }

  function scheduleProgress() {
    if (rafId1 !== null) return;
    rafId1 = requestAnimationFrame(function () {
      rafId1 = null;
      updateProgress();
    });
  }

  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  updateProgress();

  // Parallax sutil nas imagens de imóvel (baseado em scroll)
  var propertyImages = document.querySelectorAll('.property-image-wrap img');
  var rafId2 = null;

  function updateParallax() {
    propertyImages.forEach(function (img) {
      var rect = img.parentElement.getBoundingClientRect();
      var viewportCenter = window.innerHeight / 2;
      var elementCenter = rect.top + rect.height / 2;
      var distance = (elementCenter - viewportCenter) / window.innerHeight;
      var offset = distance * 20;
      img.style.transform = 'translateY(' + offset + 'px) scale(1.1)';
    });
  }

  function scheduleParallax() {
    if (rafId2 !== null) return;
    rafId2 = requestAnimationFrame(function () {
      rafId2 = null;
      updateParallax();
    });
  }

  if (propertyImages.length > 0) {
    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', scheduleParallax);
    updateParallax();
  }

  // Scroll suave nos links do menu
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
