/* Dr. Aaron T. McGee site | Leo Operations */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const hasG = typeof gsap !== 'undefined';
  if (hasG && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  const TZ = 'America/Chicago';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- nav height var ---------- */
  const nav = $('.nav');
  const setNavH = () => document.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
  setNavH(); addEventListener('resize', setNavH);

  /* ---------- face-aware framing ---------- */
  // focal.json: name -> [x0,y0,x1,y1,faceH] normalized. Keeps every face (with headroom) inside its crop.
  let FOCAL = {};
  const keyOf = src => (src || '').split('/').pop().replace(/\.(jpe?g|webp|png)$/, '').replace(/-s$/, '');
  function fit(img) {
    const b = FOCAL[keyOf(img.currentSrc || img.src)]; if (!b || !img.naturalWidth) return;
    const cw = img.clientWidth, ch = img.clientHeight; if (!cw || !ch) return;
    const nw = img.naturalWidth, nh = img.naturalHeight, s = Math.max(cw / nw, ch / nh);
    const dw = nw * s, dh = nh * s, ox = dw - cw, oy = dh - ch;
    let [x0, y0, x1, y1, fh, mx0, my0, mx1, my1] = b;
    // group too wide for this crop: frame the main face instead of the whole group
    if (mx0 !== undefined && (x1 - x0) * dw > cw * .92) { x0 = mx0; y0 = my0; x1 = mx1; y1 = my1; fh = my1 - my0; }
    let px = 50, py = 50, offY = 0;
    if (ox > 1) { const fx = (x0 + x1) / 2 * dw; px = clamp((fx - cw / 2) / ox, 0, 1) * 100; }
    if (oy > 1) {
      const top = Math.max(0, y0 - fh * .7) * dh, bot = Math.min(1, y1 + fh * .35) * dh;
      let off = Math.max((y0 + y1) / 2 * dh - ch * .4, bot - ch);
      off = Math.min(off, top);                           // head always wins over chin
      offY = clamp(off, 0, oy); py = offY / oy * 100;
    }
    img.style.objectPosition = `${px.toFixed(1)}% ${py.toFixed(1)}%`;
    img.style.transformOrigin = `${((x0 + x1) / 2 * 100).toFixed(0)}% ${(Math.max(0, y0 - fh * .35) * 100).toFixed(0)}%`;
    // how far this image may drift upward without cutting the head
    const headPx = Math.max(0, y0 - fh * .35) * dh - offY;
    const bottomSlack = (oy - offY) + (1 - y0) * dh * .06;
    img._amp = Math.max(0, Math.min(26, headPx - 4, bottomSlack));
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => fit(e.target))) : null;
  fetch('assets/data/focal.json').then(r => r.json()).then(d => {
    FOCAL = d;
    $$('img[data-fit]').forEach(img => { const go = () => fit(img); img.complete ? go() : img.addEventListener('load', go, { once: true }); ro?.observe(img); });
  }).catch(() => {});

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasG) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const goTo = target => { if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 }); else $(target)?.scrollIntoView({ behavior: 'smooth' }); };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault(); closeDrawer(); goTo(id);
    if (a.dataset.topic) pickTag(a.dataset.topic);
  }));

  /* ---------- nav ---------- */
  const menu = $('.nav__menu'), drawer = $('.drawer'), bar = $('.progress i');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * .9 && !drawer.classList.contains('is-open'));
    lastY = y;
    bar.style.transform = `scaleX(${y / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function closeDrawer() { drawer.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); drawer.setAttribute('aria-hidden', 'true'); }
  menu.addEventListener('click', () => { const open = !drawer.classList.contains('is-open'); drawer.classList.toggle('is-open', open); menu.setAttribute('aria-expanded', String(open)); drawer.setAttribute('aria-hidden', String(!open)); });
  const links = $$('.nav__links a');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('is-on', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const s = $(l.getAttribute('href')); if (s) io.observe(s); });

  /* ---------- cursor ---------- */
  const cur = $('.cursor'), curLabel = $('.cursor__label');
  let mx = innerWidth / 2, my = innerHeight / 2;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  if (fine && cur) {
    let cx = mx, cy = my;
    (function loop() { cx += (mx - cx) * .22; cy += (my - cy) * .22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(el => { el.addEventListener('mouseenter', () => { curLabel.textContent = el.dataset.cursor; cur.classList.add('is-label'); }); el.addEventListener('mouseleave', () => cur.classList.remove('is-label')); });
    $$('a:not([data-cursor]),button,.pillar,[data-yt-open]').forEach(el => { el.addEventListener('mouseenter', () => cur.classList.add('is-hover')); el.addEventListener('mouseleave', () => cur.classList.remove('is-hover')); });
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
    $$('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`; });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
  }

  /* ---------- hero: liquid gold silk ---------- */
  const hero = $('.hero'), silk = $('.hero__silk');
  if (silk) {
    const ctx = silk.getContext('2d'); let W, H, t = 0, vis = true, raf;
    const size = () => { const r = Math.min(devicePixelRatio || 1, 2); W = silk.clientWidth; H = silk.clientHeight; silk.width = W * r; silk.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !reduce) draw(); }).observe(silk);
    const LINES = 26;
    function draw() {
      if (!vis) return cancelAnimationFrame(raf);
      t += .0045; ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      const hx = (mx / innerWidth - .5), hy = (my / innerHeight - .5);
      for (let i = 0; i < LINES; i++) {
        const k = i / LINES, base = H * (.48 + k * .5);
        const g = ctx.createLinearGradient(0, 0, W, 0);
        const a = .05 + .14 * Math.sin(k * Math.PI);
        g.addColorStop(0, `rgba(233,185,73,0)`); g.addColorStop(.35, `rgba(246,215,124,${a})`); g.addColorStop(.65, `rgba(87,199,143,${a * .6})`); g.addColorStop(1, `rgba(233,185,73,0)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const nx = x / W;
          const y = base + Math.sin(nx * 3.2 + t * 2 + k * 2.6) * (40 + k * 60) + Math.sin(nx * 7.1 - t * 1.4 + k * 5) * 18 + Math.cos(nx * 1.4 + t + hx * 2) * 30 * hy - (1 - Math.abs(nx - .58) * 2) * 60;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    if (!reduce) draw();
  }

  /* ---------- hero: parallax depth + spotlight ---------- */
  const layers = $$('.hero [data-depth]');
  const spot = $('.hero__spot'), backlight = $('.hero__backlight');
  $$('.hero__namefilm').forEach(v => { new IntersectionObserver(([e]) => e.isIntersecting && !reduce ? v.play().catch(() => {}) : v.pause()).observe(v); });
  const hfilm = $('.hero__film'); if (hfilm) { if (reduce) hfilm.removeAttribute('autoplay'); new IntersectionObserver(([e]) => e.isIntersecting && !reduce ? hfilm.play().catch(() => {}) : hfilm.pause()).observe(hfilm); }
  if (fine && !reduce && hasG) {
    const setters = layers.map(l => ({ d: +l.dataset.depth, x: gsap.quickTo(l, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(l, 'y', { duration: 1.2, ease: 'power3' }) }));
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      setters.forEach(s => { s.x(-nx * 40 * s.d); s.y(-ny * 24 * s.d); });
      if (spot) { spot.style.setProperty('--mx', (e.clientX - r.left) + 'px'); spot.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      if (backlight) { backlight.style.setProperty('--bx', (60 + nx * 10) + '%'); backlight.style.setProperty('--by', (34 + ny * 8) + '%'); }
    });
  }

  /* ---------- live clock + hill sprints schedule ---------- */
  const partsIn = d => { const o = {}; new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d).forEach(p => o[p.type] = +p.value || p.value); return o; };
  const tzOffset = d => { const p = partsIn(d); return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000; };
  const chicagoTime = (y, m, day, h, min) => { const g = new Date(Date.UTC(y, m, day, h, min)); return new Date(g.getTime() - tzOffset(g) * 60000); };
  function nextSession(now = new Date()) {
    const p = partsIn(now);
    for (let k = 0; k < 3; k++) {
      const y = p.year + Math.floor((p.month - 1 + k) / 12), m = (p.month - 1 + k) % 12;
      const d1 = 1 + ((6 - new Date(Date.UTC(y, m, 1)).getUTCDay() + 7) % 7);
      for (const day of [d1, d1 + 14]) { const start = chicagoTime(y, m, day, 6, 30), end = new Date(start.getTime() + 45 * 60000); if (end > now) return { start, end }; }
    }
  }
  const fmt = (d, o) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...o }).format(d);
  const clockEl = $('[data-clock]'), shortEl = $('[data-next-short]'), longEl = $('[data-next-long]');
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const pad = n => String(n).padStart(2, '0');
  let sess = nextSession();
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = fmt(now, { hour: 'numeric', minute: '2-digit' }) + ' CT';
    if (!sess || sess.end < now) sess = nextSession(now);
    const live = sess.start <= now;
    if (shortEl) shortEl.textContent = live ? 'Live now on Capitol Hill' : fmt(sess.start, { weekday: 'short', month: 'short', day: 'numeric' }) + ', 6:30 AM';
    if (longEl) longEl.textContent = live ? 'Happening right now. Come to the hill.' : fmt(sess.start, { weekday: 'long', month: 'long', day: 'numeric' }) + ', 6:30 a.m. CT';
    let diff = Math.max(0, sess.start - now) / 1000;
    const d = Math.floor(diff / 86400); diff -= d * 86400; const h = Math.floor(diff / 3600); diff -= h * 3600; const m = Math.floor(diff / 60); const s = Math.floor(diff - m * 60);
    if (cd.d) { cd.d.textContent = pad(d); cd.h.textContent = pad(h); cd.m.textContent = pad(m); cd.s.textContent = pad(s); }
  }
  tick(); setInterval(tick, 1000);
  $('[data-ics]')?.addEventListener('click', () => {
    const z = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dr Aaron McGee//Hill Sprints//EN', 'BEGIN:VEVENT', 'UID:hill-' + z(sess.start) + '@draaronmcgee', 'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(sess.start), 'DTEND:' + z(sess.end), 'SUMMARY:Hill Sprints and Devotions with Coach A', 'LOCATION:Tennessee State Capitol\\, 600 Charlotte Ave\\, Nashville\\, TN 37243', 'DESCRIPTION:Faster. Stronger. Together. Park at the base on James Robertson Parkway or at the top off Charlotte Pike. Check @coachacontent for the lineup.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'hill-sprints-and-devotions.ics'; a.click();
  });
  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- role roller ---------- */
  const roles = $$('.roller span'); let ri = 0;
  if (roles.length) { roles[0].classList.add('is-on'); setInterval(() => { const prev = roles[ri]; prev.classList.remove('is-on'); prev.classList.add('is-off'); setTimeout(() => prev.classList.remove('is-off'), 900); ri = (ri + 1) % roles.length; roles[ri].classList.add('is-on'); }, 2600); }

  /* ---------- pillars ---------- */
  const pillars = $$('.pillar'); const act = p => pillars.forEach(x => x.classList.toggle('is-active', x === p));
  if (pillars.length) { act(pillars[0]); pillars.forEach(p => { p.addEventListener('mouseenter', () => fine && act(p)); p.addEventListener('click', () => act(p)); p.addEventListener('focus', () => act(p)); }); }

  /* ---------- film ---------- */
  const film = $('[data-film]');
  if (film) {
    const v = $('video', film), btn = $('.film__play', film);
    const load = () => { if (!v.getAttribute('src')) v.src = v.dataset.src; };
    new IntersectionObserver(([e]) => { if (e.isIntersecting) { load(); if (!film.classList.contains('is-playing')) v.play().catch(() => {}); } else v.pause(); }, { threshold: .2 }).observe(film);
    const start = () => { load(); v.currentTime = 0; v.muted = false; v.loop = false; v.controls = true; film.classList.add('is-playing'); cur?.classList.remove('is-label'); v.play(); };
    btn.addEventListener('click', e => { e.stopPropagation(); start(); });
    film.addEventListener('click', () => { if (!film.classList.contains('is-playing')) start(); });
    v.addEventListener('ended', () => { film.classList.remove('is-playing'); v.muted = true; v.loop = true; v.controls = false; v.play().catch(() => {}); });
  }

  /* ---------- youtube lite + modal ---------- */
  const modal = $('[data-modal]'), mframe = $('.modal__frame');
  const ytSrc = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  $$('.yt[data-yt]').forEach(el => el.addEventListener('click', () => { if ($('iframe', el)) return; el.insertAdjacentHTML('beforeend', `<iframe src="${ytSrc(el.dataset.yt)}" title="${el.dataset.title}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`); cur?.classList.remove('is-label'); }));
  const openModal = id => { mframe.innerHTML = `<iframe src="${ytSrc(id)}" title="Fatherhood Is Dope episode" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; modal.hidden = false; lenis?.stop(); };
  const closeModal = () => { modal.hidden = true; mframe.innerHTML = ''; lenis?.start(); };
  $$('[data-yt-open]').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('click', () => openModal(el.dataset.ytOpen)); el.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(el.dataset.ytOpen); }); });
  $('.modal__x')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!modal.hidden) closeModal(); closeDrawer(); } });

  /* ---------- stage hover peek ---------- */
  const peek = $('.stages__peek'), peekImg = $('.stages__peek img');
  if (fine && peek) {
    let px = 0, py = 0, on = false;
    $$('.stages__list li').forEach(li => { li.addEventListener('mouseenter', () => { peekImg.src = li.dataset.img; peek.classList.add('is-on'); on = true; }); li.addEventListener('mouseleave', () => { peek.classList.remove('is-on'); on = false; }); });
    (function loop() { px += (mx + 150 - px) * .15; py += (my - py) * .15; peek.style.left = px + 'px'; peek.style.top = py + 'px'; requestAnimationFrame(loop); })();
  }

  /* ---------- instagram wall ---------- */
  const wall = $('[data-wall]');
  fetch('assets/data/wall.json').then(r => r.json()).then(items => {
    [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)].forEach((row, k) => {
      const el = document.createElement('div'); el.className = 'wall__row';
      const html = row.map(p => `<a href="${p.u}" target="_blank" rel="noopener" data-cursor="Open"><img src="${p.i}" alt="${p.a.replace(/"/g, '&quot;')}" loading="lazy"></a>`).join('');
      el.innerHTML = html + html.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
      wall.appendChild(el);
      if (fine) $$('a', el).forEach(a => { a.addEventListener('mouseenter', () => { curLabel.textContent = 'Open'; cur.classList.add('is-label'); }); a.addEventListener('mouseleave', () => cur.classList.remove('is-label')); });
      if (hasG && !reduce) { const dist = () => el.scrollWidth / 2; gsap.fromTo(el, { x: () => k ? -dist() * .5 : 0 }, { x: () => k ? 0 : -dist() * .5, ease: 'none', scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: .6, invalidateOnRefresh: true } }); }
    });
    if (hasG) ScrollTrigger.refresh();
  }).catch(() => {});

  /* ---------- booking form ---------- */
  const tags = $$('.tag');
  function pickTag(t) { tags.forEach(c => c.classList.toggle('is-on', c.textContent.trim() === t)); }
  tags.forEach(c => c.addEventListener('click', () => { c.classList.toggle('is-on'); if (!tags.some(x => x.classList.contains('is-on'))) c.classList.add('is-on'); }));
  $('[data-form]')?.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target; let ok = true;
    ['name', 'email'].forEach(n => { const i = f[n]; const bad = !i.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle('is-bad', bad); if (bad) ok = false; });
    if (!ok) return;
    const topics = tags.filter(c => c.classList.contains('is-on')).map(c => c.textContent.trim()).join(', ');
    const body = `Hi Dr. McGee,\n\nInterested in: ${topics}\n\n${f.msg.value}\n\n${f.name.value}${f.org.value ? '\n' + f.org.value : ''}\n${f.email.value}`;
    location.href = `mailto:hello@journey2legacy.com?subject=${encodeURIComponent('Inquiry: ' + topics)}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- split words ---------- */
  $$('.split').forEach(el => {
    const walk = node => [...node.childNodes].forEach(n => { if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) frag.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); } }); n.replaceWith(frag); } else walk(n); });
    walk(el);
  });

  /* ---------- headline word split ---------- */
  if (!reduce) $$('.h2').forEach(h => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) frag.append(w); else { const o = document.createElement('span'); o.className = 'wm'; const i = document.createElement('span'); i.className = 'wi'; i.textContent = w; o.append(i); frag.append(o); } }); n.replaceWith(frag); }
      else if (n.nodeType === 1) walk(n);
    });
    walk(h); h.classList.add('is-split');
  });

  /* ---------- burst particles ---------- */
  const burst = $('.doctor__burst');
  if (burst) burst.innerHTML = Array.from({ length: 28 }, () => '<i></i>').join('');

  /* ---------- draw-on paths: measure ---------- */
  $$('.draw').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) {} });

  /* ---------- loader + intro ---------- */
  const loader = $('.loader'), lbar = $('.loader__bar i'), num = $('.loader__n');
  const crit = [$('.hero__man img')].filter(Boolean);
  let done = 0; const total = crit.length || 1;
  const prog = () => { const p = Math.round(done / total * 100); lbar.style.width = p + '%'; num.textContent = String(p).padStart(3, '0'); };
  crit.forEach(i => { if (i.complete) done++; else { i.addEventListener('load', () => { done++; prog(); }, { once: true }); i.addEventListener('error', () => { done++; prog(); }, { once: true }); } });
  prog();
  const t0 = performance.now();
  const ready = new Promise(res => { const chk = () => ((done >= total && document.fonts?.status !== 'loading') || performance.now() - t0 > 4000) ? res() : setTimeout(chk, 60); chk(); });
  ready.then(() => setTimeout(intro, Math.max(0, 1100 - (performance.now() - t0))));

  function intro() {
    lbar.style.width = '100%'; num.textContent = '100';
    if (!hasG || reduce) { loader.remove(); setupScroll(); return; }
    const tl = gsap.timeline();
    tl.to('.loader__seal', { scale: .4, opacity: 0, rotate: 120, duration: .7, ease: 'power3.in' })
      .to('.loader__bar,.loader__n', { opacity: 0, duration: .3 }, '<')
      .to(loader, { clipPath: 'circle(0% at 58% 30%)', duration: 1.1, ease: 'expo.inOut' }, '-=.15')
      .add(() => loader.remove())
      .from('.hero__layer--name .hn b', { yPercent: 120, opacity: 0, stagger: .06, duration: 1.3, ease: 'expo.out' }, '-=.75')
      .from('.hero__medal', { scale: .3, opacity: 0, rotate: -160, duration: 1.8, ease: 'expo.out' }, '-=1.15')
      .from('.hero__man', { clipPath: 'inset(100% -20% 0% -20%)', y: 80, duration: 1.6, ease: 'expo.out' }, '-=1.6')
      .from('.hero__film', { opacity: 0, duration: 2.4 }, '<')
      .from('.hero__rays', { opacity: 0, duration: 2 }, '<')
      .from('.hero__left > *', { y: 26, opacity: 0, stagger: .07, duration: .9, ease: 'power3.out' }, '-=1.1')
      .from('.hero__chips .chip', { x: 40, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out' }, '<.1')
      .from('.hud', { yPercent: 100, duration: .9, ease: 'expo.out' }, '<.2')
      .add(setupScroll, '-=.6');
  }

  /* ---------- scroll choreography ---------- */
  function setupScroll() {
    if (!hasG || typeof ScrollTrigger === 'undefined') return;
    const desk = matchMedia('(min-width: 901px)').matches;

    // hero exit: name splits around him, halo spins away, he steps forward
    if (!reduce) {
      const ht = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      ht.to('.hero__layer--name .hn--l', { xPercent: -30, ease: 'none' }, 0)
        .to('.hero__layer--name .hn--r', { xPercent: 36, ease: 'none' }, 0)
        .to('.hero__man', { scale: 1.08, yPercent: 6, ease: 'none', transformOrigin: '50% 30%' }, 0)
        .to('.hero__ui', { y: -60, opacity: 0, ease: 'none' }, 0);
    }

    // marquee velocity
    const mt = $('.marquee__track'), kt = $('.kinetic__track'); let vel = 0, mxp = 0, kx = 0;
    ScrollTrigger.create({ onUpdate: s => vel = s.getVelocity() / 300 });
    gsap.ticker.add(() => {
      const v = 1 + Math.abs(vel); vel *= .92;
      if (mt) { mxp -= v; const h = mt.scrollWidth / 2; if (-mxp > h) mxp += h; mt.style.transform = `translate3d(${mxp}px,0,0)`; }
      if (kt) { kx -= v * 1.3; const h = kt.scrollWidth / 2; if (-kx > h) kx += h; kt.style.transform = `translate3d(${kx}px,0,0)`; }
    });

    // manifesto words + counters + rings
    gsap.to('.manifesto .w', { opacity: 1, stagger: .02, ease: 'none', scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: true } });
    $$('.stat').forEach(st => {
      const el = $('[data-count]', st), ring = $('.ring__v', st), end = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: 0 };
      ScrollTrigger.create({ trigger: st, start: 'top 88%', once: true, onEnter: () => {
        gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => el.textContent = o.v.toFixed(dec) });
        gsap.to(ring, { strokeDashoffset: 339.3 * (1 - +ring.dataset.ring), duration: 2.2, ease: 'power3.out' });
      } });
    });

    // MR -> DR
    const dtl = gsap.timeline({ scrollTrigger: { trigger: '.doctor', start: 'top top', end: 'bottom bottom', scrub: .6 } });
    dtl.fromTo('.doctor__mr', { scale: 1.15, opacity: .2 }, { scale: 1, opacity: 1, duration: .8 })
      .to('.doctor__strike', { scaleX: 1, duration: .6, ease: 'power2.inOut' })
      .to('.doctor__mr', { opacity: 0, scale: .9, filter: 'blur(10px)', duration: .5 }, '+=.15')
      .fromTo('.doctor__dr', { opacity: 0, y: -120, scale: 1.3 }, { opacity: 1, y: 0, scale: 1, duration: .7, ease: 'back.out(1.6)' }, '<.1')
      .fromTo('.doctor__seal', { opacity: 0, scale: 2.4, rotate: -90 }, { opacity: 1, scale: 1, rotate: 0, duration: .5, ease: 'power4.in' })
      .add(() => {}, '+=0')
      .fromTo('.doctor__burst i', { x: 0, y: 0, opacity: 1 }, { x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-220, 220), opacity: 0, duration: .9, ease: 'power3.out', stagger: .004 }, '-=.02')
      .fromTo('.doctor__photo', { opacity: 0, y: 80, rotate: -16 }, { opacity: 1, y: 0, rotate: -6, duration: .6 }, '-=.6')
      .fromTo('.doctor__copy', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .6 }, '-=.4')
      .to({}, { duration: .6 });

    // generic reveals
    $$('.sechead .eyebrow, .sechead__sub, .offer, .stages__list li, .gantt__row, .coach__creds > div, .eps li, .links a, .hillcard, .countdown, .passport__head').forEach(el => {
      gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    // image curtain reveals + face-anchored parallax
    $$('.cs, .fp, .civic__img, .pod__cover').forEach(el => {
      gsap.from(el, { clipPath: 'inset(0 0 100% 0 round 22px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      const im = $('img', el); if (im && !reduce) { im.style.scale = '1.06'; ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: s => { im.style.translate = `0 ${(-(im._amp || 0) * s.progress).toFixed(1)}px`; } }); }
    });
    // BLE bg + footer drift + film zoom
    gsap.fromTo('.ble__bg', { xPercent: 0 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '.ble', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.foot__name', { xPercent: 8 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.film__frame', { scale: .86, ease: 'none', scrollTrigger: { trigger: '.film', start: 'top bottom', end: 'center center', scrub: true } });

    // hats: float, orbit on scroll, tilt with mouse
    const hats = $$('.hat');
    hats.forEach((h, i) => {
      gsap.to(h, { y: '+=18', rotate: i % 2 ? 4 : -4, duration: 2.6 + i * .5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.fromTo(h, { rotateY: -35 + i * 20, yPercent: 40 + i * 10, opacity: 0 }, { rotateY: 15 - i * 15, yPercent: -10 - i * 6, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.hats', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    if (fine) $('.hats')?.addEventListener('mousemove', e => { const r = e.currentTarget.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5; hats.forEach((h, i) => gsap.to(h, { x: nx * (30 + i * 16), rotateX: -ny * 18, duration: .8, ease: 'power3' })); });

    // hill trace + runner
    const trace = $('.hill__trace'), runner = $('.hill__runner');
    if (trace) {
      const L = trace.getTotalLength(); const o = { p: 0 };
      gsap.to(o, { p: 1, ease: 'none', scrollTrigger: { trigger: '.hillcard', start: 'top 85%', end: 'bottom 35%', scrub: .8 }, onUpdate: () => {
        trace.style.strokeDashoffset = L * (1 - o.p); const pt = trace.getPointAtLength(L * o.p); runner.setAttribute('cx', pt.x); runner.setAttribute('cy', pt.y);
        $$('.hill__rep').forEach((r, i) => r.style.opacity = o.p > (i + .6) / 6.4 ? 1 : .25);
      } });
    }
    // skyline draw
    const sky = $('.skyline__line');
    if (sky) gsap.to(sky, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.civic', start: 'top 90%', end: 'top 25%', scrub: 1, onLeave: () => $('.civic').classList.add('is-lit'), onUpdate: s => s.progress > .8 && $('.civic').classList.add('is-lit') } });

    // headlines rise word by word
    $$('.h2.is-split').forEach(h => { if (h.closest('.doctor')) return; gsap.from($$('.wi', h), { yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: h, start: 'top 88%', once: true } }); });

    // magazine opens
    if ($('.mag')) {
      const mtl = gsap.timeline({ scrollTrigger: { trigger: '.mag', start: 'top top', end: 'bottom bottom', scrub: .8 } });
      mtl.fromTo('.mag__book', { xPercent: -25, rotateX: 10, scale: .92 }, { xPercent: 0, rotateX: 0, scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
        .to('.mag__leaf', { rotateY: -180, duration: 1, ease: 'power2.inOut' }, 0)
        .to('.mag__copy', { opacity: 1, duration: .3 }, .75)
        .to({}, { duration: .35 });
    }
    // press rail drifts with scroll
    if ($('.pgrid')) gsap.from('.pgrid .press__card', { y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.pgrid', start: 'top 82%', once: true } });
    // passport polaroids land, then stamps thunk
    if ($('.passport')) {
      const pt = gsap.timeline({ scrollTrigger: { trigger: '.passport__grid', start: 'top 80%', once: true } });
      pt.from('.pol', { y: 160, rotate: i => [-18, 14, -10, 16][i], opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .12 })
        .from('.stamp', { scale: 2.6, opacity: 0, duration: .45, ease: 'power4.in', stagger: .14 }, '-=.5');
    }
    // years-at-the-table bars
    $$('.gantt__bar').forEach((b, i) => gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.out', delay: i * .08, scrollTrigger: { trigger: '.gantt', start: 'top 80%', once: true } }));
    // family photos fan out, signature writes itself
    if ($('.family__photos')) {
      gsap.timeline({ scrollTrigger: { trigger: '.family__photos', start: 'top 85%', end: 'center 45%', scrub: .8 } })
        .from('.fp--b', { xPercent: -60, yPercent: 20, rotate: -12, ease: 'none' }, 0)
        .from('.fp--c', { xPercent: -50, yPercent: -40, rotate: 10, ease: 'none' }, 0)
        .from('.fp--a', { rotate: -5, scale: .94, ease: 'none' }, 0);
      ScrollTrigger.create({ trigger: '.sig', start: 'top 85%', once: true, onEnter: () => $('.sig').classList.add('is-on') });
    }
    // give: twin marquees + floating hat
    const grows = $$('.give__row'); let gx = 0;
    if (grows.length) gsap.ticker.add(() => { gx += .6 + Math.abs(vel) * .6; grows.forEach((r, i) => { const h = r.scrollWidth / 2; const x = gx % h; r.style.transform = `translate3d(${i ? x - h : -x}px,0,0)`; }); });
    if ($('.give__hat')) { gsap.to('.give__hat', { y: 18, rotate: 6, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 }); gsap.fromTo('.give__hat', { rotateY: -40 }, { rotateY: 30, ease: 'none', scrollTrigger: { trigger: '.give', start: 'top bottom', end: 'bottom top', scrub: 1 } }); }

    // story horizontal pin + connecting line
    ScrollTrigger.matchMedia({
      '(min-width: 821px)': () => {
        const track = $('.story__track'), pbar = $('.story__progress i'), path = $('.story__path'), svgEl = $('.story__line'), chaps = $$('.chap');
        const build = () => {
          const tr = track.getBoundingClientRect(); svgEl.setAttribute('viewBox', `0 0 ${track.scrollWidth} ${track.offsetHeight}`);
          const pts = chaps.map(c => { const n = $('.chap__node', c).getBoundingClientRect(); return [n.left - tr.left + 7, n.top - tr.top + 7]; });
          let d = `M0 ${pts[0][1]}`; pts.forEach(([x, y], i) => { d += i ? ` C${pts[i - 1][0] + 80} ${y - 28} ${x - 80} ${y + 28} ${x} ${y}` : ` L${x} ${y}`; });
          path.setAttribute('d', d); const L = path.getTotalLength(); path.style.strokeDasharray = L; path.dataset.len = L;
        };
        build();
        const dist = () => track.scrollWidth - innerWidth + 40;
        const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.story', pin: '.story__pin', refreshPriority: 1, start: 'top top', end: () => '+=' + dist(), scrub: .8, invalidateOnRefresh: true, onRefresh: build, onUpdate: s => {
          pbar.style.width = (s.progress * 100) + '%';
          path.style.strokeDashoffset = (+path.dataset.len) * (1 - Math.min(1, s.progress * 1.08 + .08));
          const edge = innerWidth * .7; chaps.forEach(c => c.classList.toggle('is-lit', c.getBoundingClientRect().left < edge));
        } } });
        return () => tw.kill();
      },
      '(max-width: 820px)': () => { $$('.chap').forEach(c => c.classList.add('is-lit')); }
    });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
    addEventListener('load', () => ScrollTrigger.refresh());
    setTimeout(() => ScrollTrigger.refresh(), 1200);
  }
})();
