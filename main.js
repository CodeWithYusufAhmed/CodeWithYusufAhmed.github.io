/* MD. Yusuf Ahmed — v3. One deferred module: kinetic headline, reveals, easter eggs.
   If this file never runs, the site is complete without it — that's the contract. */

document.documentElement.classList.add('js');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

/* ---------- kinetic hero quote ---------- */
const quote = document.getElementById('kinetic');
const chars = [];

function splitNode(node, into) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const word of child.textContent.split(/(\s+)/)) {
        if (!word) continue;
        if (/^\s+$/.test(word)) { frag.append(' '); continue; }
        const w = document.createElement('span');
        w.style.whiteSpace = 'nowrap';
        w.style.display = 'inline-block';
        for (const ch of word) {
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = ch;
          s.style.setProperty('--i', chars.length);
          chars.push(s);
          w.append(s);
        }
        frag.append(w);
      }
      child.replaceWith(frag);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitNode(child, into);
    }
  }
}

function lockWidths() {
  const widths = chars.map((s) => s.getBoundingClientRect().width);
  chars.forEach((s, i) => { s.style.width = widths[i] + 'px'; s.style.textAlign = 'center'; });
}

let centers = [];      // per-char document coordinates
function cacheCenters() {
  centers = chars.map((s) => {
    const r = s.getBoundingClientRect();
    return [r.left + r.width / 2 + scrollX, r.top + r.height / 2 + scrollY];
  });
}

function initKinetic() {
  const hero = quote.closest('.hero');
  const BASE = 420, SWELL = 330, RADIUS = 130;
  const cur = new Float32Array(chars.length).fill(BASE);
  const tgt = new Float32Array(chars.length).fill(BASE);
  let mx = -1e4, my = -1e4, raf = 0, heroVisible = true;

  const frame = () => {
    raf = 0;
    let busy = false;
    for (let i = 0; i < chars.length; i++) {
      const dx = centers[i][0] - scrollX - mx;
      const dy = centers[i][1] - scrollY - my;
      const d = Math.hypot(dx, dy);
      tgt[i] = d < RADIUS * 2.4 ? BASE + SWELL * Math.exp(-(d * d) / (RADIUS * RADIUS)) : BASE;
      const delta = tgt[i] - cur[i];
      if (Math.abs(delta) > 0.5) {
        cur[i] += delta * 0.16;
        chars[i].style.fontWeight = Math.round(cur[i]);
        busy = true;
      }
    }
    if (busy && heroVisible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && heroVisible && !document.hidden) raf = requestAnimationFrame(frame); };

  hero.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; wake(); }, { passive: true });
  hero.addEventListener('mouseleave', () => { mx = -1e4; my = -1e4; wake(); }, { passive: true });
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (!heroVisible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else wake();
  });

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      chars.forEach((s) => { s.style.width = ''; s.style.fontWeight = ''; });
      cur.fill(BASE); tgt.fill(BASE);
      lockWidths(); cacheCenters();
    }, 160);
  }, { passive: true });
}

/* The quote is the LCP element: it must stay untouched static text until after
   first paint. Desktop only, the first pointer movement over the hero wakes it —
   split into characters, settle in, then weights follow the cursor. Touch devices
   keep the static quote and spend zero extra work on it. */
if (quote && !reduced && finePointer) {
  quote.closest('.hero').addEventListener('mousemove', () => {
    document.fonts.ready.then(() => {
      try {
        const label = quote.textContent;
        const wrap = document.createElement('span');
        wrap.setAttribute('aria-hidden', 'true');
        wrap.append(...quote.childNodes);
        splitNode(wrap, chars);
        const sr = document.createElement('span');
        sr.textContent = label;
        sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
        quote.append(sr, wrap);
        quote.classList.add('split', 'animate-chars');
        lockWidths();
        cacheCenters();
        initKinetic();
      } catch { /* static quote remains — nothing lost */ }
    });
  }, { once: true, passive: true });
}

/* ---------- fade-and-rise reveals ---------- */
const revealEls = document.querySelectorAll('.reveal');
if (reduced || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((e, i) => {
        e.target.style.setProperty('--rd', Math.min(i * 60, 300) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));
}

/* ---------- beyond slideshow ----------
   No-JS baseline is a swipeable scroll-snap gallery with every caption visible.
   JS adds dots, arrows, and gentle autoplay that yields to the visitor. */
const shell = document.querySelector('.slideshow');
if (shell && 'IntersectionObserver' in window) {
  const scroller = shell.querySelector('.slides');
  const slides = [...scroller.children];
  const ui = shell.querySelector('.ss-ui');
  const dotsWrap = shell.querySelector('.ss-dots');
  let index = 0, timer = 0, hovering = false, onScreen = true, stopped = reduced;

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ss-dot';
    b.setAttribute('aria-label', `Go to photo ${i + 1}`);
    b.addEventListener('click', () => { go(i); halt(); });
    dotsWrap.append(b);
    return b;
  });
  if (ui) ui.hidden = false;

  const setActive = (i) => {
    index = i;
    dots.forEach((d, j) => d.setAttribute('aria-current', j === i ? 'true' : 'false'));
  };
  const go = (i) => {
    i = (i + slides.length) % slides.length;
    scroller.scrollTo({ left: i * scroller.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    setActive(i);
  };
  const halt = () => { stopped = true; clearInterval(timer); };

  shell.querySelectorAll('.ss-btn').forEach((btn) =>
    btn.addEventListener('click', () => { go(index + Number(btn.dataset.dir)); halt(); }));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(slides.indexOf(e.target)); });
  }, { root: scroller, threshold: 0.6 });
  slides.forEach((s) => io.observe(s));

  shell.addEventListener('pointerenter', () => { hovering = true; }, { passive: true });
  shell.addEventListener('pointerleave', () => { hovering = false; }, { passive: true });
  shell.addEventListener('touchstart', halt, { passive: true });
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(shell);

  setActive(0);
  if (!stopped) timer = setInterval(() => {
    if (!hovering && onScreen && !document.hidden) go(index + 1);
  }, 5200);
}

/* ---------- Pulse Deck demo: plays while on screen ----------
   Muted + looping. Starts when the card scrolls into view, pauses off-screen
   to spare batteries. If the visitor presses pause, their choice wins. */
const demo = document.querySelector('video[data-autoplay]');
if (demo && 'IntersectionObserver' in window) {
  let userPaused = false, ioPausing = false;
  demo.addEventListener('pause', () => {
    if (ioPausing) { ioPausing = false; return; } // that was us, not the visitor
    if (!demo.ended) userPaused = true;
  });
  demo.addEventListener('play', () => { userPaused = false; });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!userPaused) demo.play().catch(() => {}); }
    else if (!demo.paused) { ioPausing = true; demo.pause(); }
  }, { threshold: 0.3 }).observe(demo);
}

/* ---------- easter eggs (original text only) ---------- */
console.log(
  '%c~/yusuf $%c hello, curious one. the site you are inspecting is pure static — view source, it all fits.\n%cpsst: type  t e e m o  anywhere on the page.',
  'color:#64ffda;font-family:monospace', 'color:#ccd6f6', 'color:#8892b0'
);

let buf = '';
addEventListener('keydown', (e) => {
  if (!e.key || e.target.closest('input,textarea,select')) return;
  buf = (buf + e.key.toLowerCase()).slice(-5);
  if (buf === 'teemo') {
    buf = '';
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.append(t);
    }
    t.textContent = '🍄 Found me! “How I met Teemo” was where the videos began — the stories live at @yusufahmed now.';
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove('show'), 4600);
  }
});
