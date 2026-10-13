// Marbres Chust — galería con filtros, visor de fotos y vídeos, vídeos en carrusel, menú y presupuesto.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BASE = document.documentElement.dataset.base || '';
  const TEL = '34644239980';
  const LOTE = 24;
  const ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';

  // ---------- menú móvil ----------
  const top = $('.top'), mb = $('.menu-btn');
  if (mb) mb.addEventListener('click', () => { const a = top.classList.toggle('abierto'); mb.setAttribute('aria-expanded', a); });

  // ---------- datos de la galería ----------
  let datos = null;
  const cargar = () => datos || (datos = fetch(BASE + 'media.json').then((r) => r.json()).then((j) => {
    j.byId = {};
    j.items = j.items.map(([id, t, cat, w, h, anio, dur]) => (j.byId[id] = { id, video: t === 'v', cat, w, h, anio, dur }));
    return j;
  }));
  const alt = (it, j) => `${j.cats[it.cat].alt}${it.video ? ' (vídeo)' : ''} — trabajo de Marbres Chust${it.anio ? ', ' + it.anio : ''}`;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const src = (it, s) => it.video ? `${BASE}media/v/${it.id}.webp` : `${BASE}media/f/${it.id}-${s}.webp`;

  const tarjeta = (it, j) => {
    const f = document.createElement('figure');
    f.className = 'g';
    const im = it.video
      ? `<img src="${src(it)}" alt="${alt(it, j)}" width="360" height="640" loading="lazy" decoding="async">`
      : `<img src="${src(it, 480)}" srcset="${src(it, 480)} 480w, ${src(it, 960)} 960w" sizes="(max-width: 700px) 50vw, 25vw" alt="${alt(it, j)}" width="${it.w}" height="${it.h}" loading="lazy" decoding="async">`;
    f.innerHTML = `<button type="button" data-id="${it.id}" aria-label="${it.video ? 'Ver vídeo' : 'Ampliar foto'}: ${j.cats[it.cat].nombre}">${im}${it.video ? `<span class="play">${ICON_PLAY}${mmss(it.dur)}</span>` : ''}</button>`;
    return f;
  };

  // ---------- galerías ----------
  $$('[data-galeria]').forEach((sec) => {
    const grid = $('.galeria', sec), btn = $('.mas button', sec), cuenta = $('.cuenta', sec);
    const fijo = sec.dataset.cat || '*';
    let filtro = new URLSearchParams(location.search).get('cat') || fijo;
    let lista = [], mostrados = grid.children.length;
    const filtrar = (j) => j.items.filter((it) => (filtro === '*' || (filtro === 'videos' ? it.video : it.cat === filtro)));
    const pintar = (j, desde) => {
      const frag = document.createDocumentFragment();
      lista.slice(desde, desde + LOTE).forEach((it) => frag.appendChild(tarjeta(it, j)));
      grid.appendChild(frag);
      mostrados = Math.min(lista.length, desde + LOTE);
      const quedan = lista.length - mostrados;
      if (btn) { btn.parentElement.hidden = quedan <= 0; btn.textContent = `Ver más trabajos (quedan ${quedan.toLocaleString('es-ES')})`; }
      if (cuenta) cuenta.textContent = `Mostrando ${mostrados.toLocaleString('es-ES')} de ${lista.length.toLocaleString('es-ES')}`;
    };
    sec._lista = () => lista;
    cargar().then((j) => {
      lista = filtrar(j);
      if (filtro !== fijo) { grid.innerHTML = ''; pintar(j, 0); }
      else { const q = lista.length - mostrados; if (btn) { btn.parentElement.hidden = q <= 0; btn.textContent = `Ver más trabajos (quedan ${q.toLocaleString('es-ES')})`; } if (cuenta) cuenta.textContent = `Mostrando ${mostrados} de ${lista.length.toLocaleString('es-ES')}`; }
      $$('.chip', sec).forEach((c) => c.setAttribute('aria-pressed', c.dataset.f === filtro));
    });
    if (btn) btn.addEventListener('click', () => cargar().then((j) => pintar(j, mostrados)));
    $$('.chip', sec).forEach((c) => c.addEventListener('click', () => cargar().then((j) => {
      filtro = c.dataset.f;
      $$('.chip', sec).forEach((x) => x.setAttribute('aria-pressed', x === c));
      const u = new URL(location.href);
      if (filtro === '*') u.searchParams.delete('cat'); else u.searchParams.set('cat', filtro);
      history.replaceState(null, '', u);
      lista = filtrar(j); grid.innerHTML = ''; pintar(j, 0);
    })));
  });

  // ---------- visor ----------
  let visor, actual = [], pos = 0;
  const crearVisor = () => {
    visor = document.createElement('dialog');
    visor.className = 'visor';
    visor.setAttribute('aria-label', 'Visor de trabajos');
    visor.innerHTML = `<div class="visor-top"><span class="visor-n"></span><button class="visor-btn visor-cerrar" type="button" aria-label="Cerrar"><svg viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.6"/></svg></button></div>
      <div class="visor-media"></div>
      <button class="visor-btn visor-nav visor-prev" type="button" aria-label="Anterior"><svg viewBox="0 0 20 20"><path d="M12.5 4L6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
      <button class="visor-btn visor-nav visor-next" type="button" aria-label="Siguiente"><svg viewBox="0 0 20 20"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
      <p class="visor-pie"></p>`;
    document.body.appendChild(visor);
    $('.visor-cerrar', visor).onclick = () => visor.close();
    $('.visor-prev', visor).onclick = () => ir(-1);
    $('.visor-next', visor).onclick = () => ir(1);
    visor.addEventListener('close', () => { $('.visor-media', visor).innerHTML = ''; document.body.style.overflow = ''; });
    visor.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); });
    let x0 = null;
    visor.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
    visor.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1); x0 = null; });
    visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor-media')) visor.close(); });
  };
  const mostrar = (j) => {
    const it = actual[pos], m = $('.visor-media', visor);
    m.innerHTML = it.video
      ? `<video src="${BASE}media/v/${it.id}.mp4" poster="${src(it)}" controls autoplay muted playsinline loop></video>`
      : `<img src="${src(it, 1600)}" srcset="${src(it, 960)} 960w, ${src(it, 1600)} 1600w" sizes="100vw" alt="${alt(it, j)}">`;
    $('.visor-n', visor).textContent = `${pos + 1} / ${actual.length.toLocaleString('es-ES')}`;
    $('.visor-pie', visor).textContent = `${j.cats[it.cat].nombre}${it.video ? ' · vídeo' : ''}${it.anio ? ' · ' + it.anio : ''}`;
    // precarga la siguiente foto
    const sig = actual[(pos + 1) % actual.length];
    if (sig && !sig.video) { const p = new Image(); p.src = src(sig, 1600); }
  };
  const ir = (d) => cargar().then((j) => { pos = (pos + d + actual.length) % actual.length; mostrar(j); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    cargar().then((j) => {
      const sec = b.closest('[data-galeria]');
      actual = sec && sec._lista && sec._lista().length ? sec._lista() : $$('button[data-id]', b.closest('section') || document).map((x) => j.byId[x.dataset.id]).filter(Boolean);
      pos = Math.max(0, actual.findIndex((it) => it.id === b.dataset.id));
      if (!visor) crearVisor();
      mostrar(j);
      document.body.style.overflow = 'hidden';
      visor.showModal();
    });
  });

  // ---------- vídeos del carrusel: solo se reproducen los visibles ----------
  const vids = $$('.reel video');
  if (vids.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.intersectionRatio > 0.6) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
    }), { threshold: [0, 0.6, 1] });
    vids.forEach((v) => io.observe(v));
  } else vids.forEach((v) => { v.src = v.dataset.src; v.controls = true; });

  // ---------- flechas del carrusel ----------
  $$('[data-reel]').forEach((b) => b.addEventListener('click', () => {
    const r = $('.reel', b.closest('section'));
    const paso = r.firstElementChild ? r.firstElementChild.getBoundingClientRect().width + 12 : 300;
    r.scrollBy({ left: +b.dataset.reel * paso * 2, behavior: 'smooth' });
  }));

  // ---------- aparición suave ----------
  const rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => io2.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));

  // ---------- presupuesto por WhatsApp ----------
  const form = $('#presupuesto');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const txt = `Hola, soy ${d.get('nombre')}. Me gustaría pedir presupuesto para: ${d.get('trabajo')}${d.get('localidad') ? ' en ' + d.get('localidad') : ''}.${d.get('mensaje') ? '\n' + d.get('mensaje') : ''}`;
    window.open(`https://wa.me/${TEL}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  });
})();
