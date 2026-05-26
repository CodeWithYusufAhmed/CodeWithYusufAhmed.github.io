/* =========================================================
   Yusuf Ahmed — Portfolio interactivity
   Vanilla JS, no dependencies.
   ========================================================= */

(() => {
  'use strict';

  // ----- Cache DOM nodes -----
  const root         = document.documentElement;
  const progressBar  = document.getElementById('scrollProgress');
  const nav          = document.getElementById('nav');
  const navList      = document.getElementById('navList');
  const navToggle    = document.getElementById('navToggle');
  const navLinks     = document.querySelectorAll('.nav__link');
  const themeToggle  = document.getElementById('themeToggle');
  const backToTop    = document.getElementById('backToTop');
  const typewriterEl = document.getElementById('typewriter');
  const yearEl       = document.getElementById('year');

  const sections = ['home', 'about', 'education', 'experience', 'hobbies', 'connect']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  // ----- Year in footer -----
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ----- Theme (persisted) -----
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }
  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // ----- Mobile nav -----
  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navList.classList.contains('is-open')) {
        navList.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // ----- Back-to-top -----
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ----- Scroll handler (rAF-throttled) -----
  const updateProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct   = total > 0 ? (window.scrollY / total) * 100 : 0;
    progressBar.style.width = pct + '%';
  };

  const updateNavState = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 10);

    const probe = window.scrollY + 120;
    let currentId = sections[0] ? sections[0].id : '';
    for (const s of sections) {
      if (s.offsetTop <= probe) currentId = s.id;
    }
    navLinks.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + currentId);
    });
  };

  const updateBackToTop = () => {
    backToTop.classList.toggle('is-visible', window.scrollY > 500);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      updateNavState();
      updateBackToTop();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // ----- Reveal on scroll -----
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  // ----- Typewriter -----
  const quote = 'A kid with a million dreams and a centillion ideas to endeavor.';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const startTypewriter = () => {
    if (reduceMotion) {
      typewriterEl.textContent = quote;
      return;
    }
    let i = 0;
    const speed = 45;
    const tick = () => {
      typewriterEl.textContent = quote.slice(0, i);
      if (i < quote.length) {
        i++;
        setTimeout(tick, speed);
      }
    };
    setTimeout(tick, 500);
  };
  window.addEventListener('load', startTypewriter);

  // ----- Initial paint -----
  updateProgress();
  updateNavState();
  updateBackToTop();
})();
