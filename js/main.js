(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.header-nav');
  const backdrop = document.querySelector('.nav-backdrop');
  const links = document.querySelectorAll('.nav-list a');

  if (!toggle || !nav) return;

  function setNavOpen(isOpen) {
    nav.classList.toggle('is-open', isOpen);
    document.body.classList.toggle('is-nav-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  }

  toggle.addEventListener('click', function () {
    setNavOpen(!nav.classList.contains('is-open'));
  });

  if (backdrop) {
    backdrop.addEventListener('click', function () {
      setNavOpen(false);
    });
  }

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      setNavOpen(false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setNavOpen(false);
    }
  });
})();

document.addEventListener('DOMContentLoaded', function () {
  const grid = document.querySelector('.property-grid');

  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.property-card'));

    function parsePrice(card) {
      const priceEl = card.querySelector('[data-field="price"]');
      if (!priceEl) return 0;
      return parseInt(priceEl.textContent.replace(/\D/g, ''), 10) || 0;
    }

    cards
      .sort(function (a, b) {
        return parsePrice(a) - parsePrice(b);
      })
      .forEach(function (card, index) {
        card.dataset.propertyId = String(index + 1).padStart(2, '0');
        grid.appendChild(card);
      });
  }

  const revealTargets = document.querySelectorAll('#informacoes .property-card, #informacoes .listings-catalog, #informacoes .editorial-caption');
  revealTargets.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, index) {
      if (entry.isIntersecting) {
        setTimeout(function () {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  revealTargets.forEach(function (el) {
    observer.observe(el);
  });
});
