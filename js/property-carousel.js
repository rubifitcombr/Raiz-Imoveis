(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.property-card__carousel').forEach(function (carousel) {
      var media = carousel.closest('.property-card__media');
      var slides = carousel.querySelectorAll('.property-card__slide');
      var dots = media ? media.querySelectorAll('.property-card__dot') : [];
      if (!slides.length) return;

      var activeIndex = 0;
      var isDragging = false;
      var startX = 0;
      var scrollStart = 0;
      var moved = false;

      function setActive(index) {
        activeIndex = Math.max(0, Math.min(index, slides.length - 1));
        dots.forEach(function (dot, i) {
          var isActive = i === activeIndex;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-selected', String(isActive));
        });
      }

      function syncFromScroll() {
        var width = carousel.offsetWidth || 1;
        setActive(Math.round(carousel.scrollLeft / width));
      }

      function goTo(index) {
        var slide = slides[index];
        if (!slide) return;
        carousel.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
        setActive(index);
      }

      carousel.addEventListener('scroll', function () {
        if (!isDragging) syncFromScroll();
      }, { passive: true });

      dots.forEach(function (dot, index) {
        dot.addEventListener('click', function () {
          goTo(index);
        });
      });

      carousel.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        isDragging = true;
        moved = false;
        startX = event.clientX;
        scrollStart = carousel.scrollLeft;
        carousel.classList.add('is-dragging');
        if (carousel.setPointerCapture) {
          carousel.setPointerCapture(event.pointerId);
        }
      });

      carousel.addEventListener('pointermove', function (event) {
        if (!isDragging) return;
        var delta = event.clientX - startX;
        if (Math.abs(delta) > 4) moved = true;
        carousel.scrollLeft = scrollStart - delta;
      });

      function endDrag(event) {
        if (!isDragging) return;
        isDragging = false;
        carousel.classList.remove('is-dragging');
        if (carousel.releasePointerCapture && event.pointerId !== undefined) {
          try {
            carousel.releasePointerCapture(event.pointerId);
          } catch (error) {
            /* ignore */
          }
        }
        syncFromScroll();
        var width = carousel.offsetWidth || 1;
        var target = Math.round(carousel.scrollLeft / width);
        goTo(target);
      }

      carousel.addEventListener('pointerup', endDrag);
      carousel.addEventListener('pointercancel', endDrag);
      carousel.addEventListener('pointerleave', function (event) {
        if (isDragging) endDrag(event);
      });

      carousel.addEventListener('click', function (event) {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);

      setActive(0);
    });
  });
})();
