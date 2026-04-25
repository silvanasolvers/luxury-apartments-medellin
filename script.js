/* ============================================
   LUXURY APARTMENTS — Interaction layer
   ============================================ */

(() => {
  'use strict';

  /* ---------- Nav scrolled ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burger');
  const mobile = document.getElementById('mobile');
  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobile.classList.toggle('open');
  });
  mobile?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open'); mobile.classList.remove('open');
  }));

  /* ---------- Portal loader — silent arch reveal ---------- */
  const portal = document.getElementById('portal');
  const PORTAL_HOLD = 3200; // 2.2s draw + .5s breath + exit

  function runPortal() {
    if (!portal) return Promise.resolve();
    return new Promise(resolve => {
      setTimeout(() => {
        portal.classList.add('fading');
        setTimeout(() => {
          document.body.classList.remove('loading');
          portal.style.display = 'none';
          resolve();
        }, 900);
      }, PORTAL_HOLD);
    });
  }

  /* ---------- Maison reveals ---------- */
  function runMaisonReveals() {
    document.querySelectorAll('.maison .mzr').forEach(el => {
      // trigger reflow then add .in so transition applies with --d delay
      requestAnimationFrame(() => el.classList.add('in'));
    });
  }

  /* ---------- Arched frame gentle parallax (subtle, not 3D) ---------- */
  const mzFrame = document.getElementById('mzFrame');
  const maison = document.getElementById('hero');
  if (mzFrame && maison && !matchMedia('(pointer: coarse)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    maison.addEventListener('mousemove', (e) => {
      const r = maison.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) / r.width;
      ty = (e.clientY - r.top - r.height / 2) / r.height;
    });
    maison.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
    const loop = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      mzFrame.style.translate = `${cx * 10}px ${cy * 8}px`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- Kick off ---------- */
  runPortal();
  // Trigger reveals right after the portal exits (independent of promise chain)
  setTimeout(runMaisonReveals, PORTAL_HOLD + 950);
  // Force video load + play (some browsers need explicit nudge after dom setup)
  setTimeout(() => {
    const v = document.querySelector('.mz-video');
    if (v) { try { v.load(); v.play().catch(()=>{}); } catch {} }
  }, 100);

  /* ---------- Live clock (Medellín) ---------- */
  const fmtClock = () => {
    try {
      return new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'America/Bogota' });
    } catch { return '—'; }
  };
  const heroClock = document.getElementById('heroClock');
  const footClock = document.getElementById('footClock');
  const tick = () => {
    if (heroClock) heroClock.textContent = fmtClock();
    if (footClock) footClock.textContent = fmtClock() + ' · hora local';
  };
  tick(); setInterval(tick, 20000);

  /* ---------- Background parallax ---------- */
  const bgLines = document.getElementById('bgLines');
  const onBgScroll = () => {
    if (bgLines) bgLines.style.transform = `translateY(${-window.scrollY * 0.15}px)`;
  };
  window.addEventListener('scroll', onBgScroll, { passive:true });
  onBgScroll();

  /* ---------- Filters (residences) ---------- */
  const filterState = { barrio: 'all', guests: 0 };
  const sortState = 'featured';
  const list = document.getElementById('resList');
  const items = [...document.querySelectorAll('.res-item')];
  const resCount = document.getElementById('resCount');
  const resEmpty = document.getElementById('resEmpty');

  function applyFilters(){
    let visible = 0;
    items.forEach(it => {
      const barrio = it.dataset.barrio;
      const guests = parseInt(it.dataset.guests, 10);
      let ok = true;
      if (filterState.barrio !== 'all' && barrio !== filterState.barrio) ok = false;
      if (filterState.guests > 0 && guests < filterState.guests) ok = false;
      it.classList.toggle('hidden', !ok);
      if (ok) visible++;
    });
    if (resCount) resCount.textContent = visible;
    if (resEmpty) resEmpty.classList.toggle('show', visible === 0);
  }

  function applySort(val){
    const visible = items.filter(it => !it.classList.contains('hidden'));
    const sorters = {
      'price-asc': (a,b) => parseInt(a.dataset.price) - parseInt(b.dataset.price),
      'price-desc': (a,b) => parseInt(b.dataset.price) - parseInt(a.dataset.price),
      'size': (a,b) => parseInt(b.dataset.size) - parseInt(a.dataset.size),
      'rating': (a,b) => parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating),
      'featured': (a,b) => items.indexOf(a) - items.indexOf(b)
    };
    visible.sort(sorters[val] || sorters.featured).forEach(el => list.appendChild(el));
    // keep hidden at end
    items.filter(it => it.classList.contains('hidden')).forEach(el => list.appendChild(el));
    if (resEmpty) list.appendChild(resEmpty);
  }

  document.querySelectorAll('.fc').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.filter;
      document.querySelectorAll(`.fc[data-filter="${key}"]`).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      filterState[key] = key === 'guests' ? parseInt(b.dataset.val, 10) : b.dataset.val;
      applyFilters();
    });
  });

  document.getElementById('sortBy')?.addEventListener('change', (e) => applySort(e.target.value));

  document.getElementById('resReset')?.addEventListener('click', () => {
    filterState.barrio = 'all'; filterState.guests = 0;
    document.querySelectorAll('.fc').forEach(b => {
      const key = b.dataset.filter;
      const val = b.dataset.val;
      b.classList.toggle('active', (key === 'barrio' && val === 'all') || (key === 'guests' && val === '0'));
    });
    applyFilters();
  });

  applyFilters();

  /* ---------- Expand details + gallery swap + fav ---------- */
  document.querySelectorAll('[data-more]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.res-item');
      const detail = item?.querySelector('.ri-detail');
      const open = detail?.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.innerHTML = open ? 'Ocultar detalles <em>↓</em>' : 'Ver todos los detalles <em>↓</em>';
    });
  });

  document.querySelectorAll('.ri-thumbs img').forEach(img => {
    img.addEventListener('click', () => {
      const main = img.closest('.ri-gallery')?.querySelector('.ri-main img');
      if (!main) return;
      const tmp = main.src;
      main.src = img.src;
      img.src = tmp;
    });
  });

  document.querySelectorAll('.ri-fav').forEach(f => {
    f.addEventListener('click', () => {
      const on = f.classList.toggle('fav');
      f.textContent = on ? '♥' : '♡';
    });
  });

  /* ---------- Book CTAs (prefill form + dock) ---------- */
  const resDataMap = {
    suite301: { name: 'Suite 301 · El Poblado', price: 225 },
    suite302: { name: 'Suite 302 · El Poblado', price: 275 },
    suite303: { name: 'Suite 303 · El Poblado', price: 255 },
    suite360: { name: 'Suite 360° · El Poblado', price: 320 },
    suite401: { name: 'Suite 401 · El Poblado', price: 265 },
    manila: { name: 'Manila · Sector Manila', price: 290 },
    palace: { name: 'Palace · Sector Manila', price: 310 },
    parque: { name: 'Parque · Frente al Parque del Poblado', price: 380 },
    rosanegra: { name: 'Rosa Negra · Casa con piscina', price: 850 },
    sens1: { name: 'Sens 1 · Suite romántica', price: 195 },
    sens2: { name: 'Sens 2 · Suite romántica', price: 195 }
  };

  const dock = document.getElementById('dock');
  const dockName = document.getElementById('dockName');
  function selectResidence(key) {
    const data = resDataMap[key]; if (!data) return;
    const selEl = document.getElementById('selResidencia');
    if (selEl) selEl.value = key;
    if (dock && dockName) { dockName.textContent = data.name; dock.classList.add('show'); }
    if (typeof sumRender === 'function') sumRender();
  }
  document.querySelectorAll('[data-book]').forEach(b => {
    b.addEventListener('click', () => selectResidence(b.dataset.book));
  });
  document.querySelectorAll('[data-quick]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      selectResidence(b.dataset.quick);
      document.getElementById('reservar')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });

  /* ---------- Map barrio ---------- */
  const PLACES = {
    'El Poblado': [
      { kind:'Café', name:'Pergamino',       walk:'7 min',  desc:'Origen cafetero curado, flat white impecable.' },
      { kind:'Cena', name:'Carmen',          walk:'10 min', desc:'Cocina de autor colombiana, reserva con una semana.' },
      { kind:'Bar',  name:'Alambique',       walk:'12 min', desc:'Cocktails de alquimia en un jardín discreto.' },
      { kind:'Aire', name:'Cerro El Volador',walk:'15 min', desc:'Mirador de la ciudad al atardecer.' }
    ],
    'Provenza': [
      { kind:'Café', name:'Hija Mía',   walk:'2 min',  desc:'Bowls, panes y cafés en patio abierto.' },
      { kind:'Cena', name:'OCI.Mde',    walk:'5 min',  desc:'Cocina de mercado, carta que cambia cada semana.' },
      { kind:'Bar',  name:'Room 237',   walk:'8 min',  desc:'Tragos obsesivos, vinilos, capacidad 30.' },
      { kind:'Shop', name:'Cuida Tu Look', walk:'6 min', desc:'Diseño local de autor, sin turismo.' }
    ],
    'Laureles': [
      { kind:'Café', name:'Velvet',          walk:'4 min',  desc:'Tostador local, pastelería casera.' },
      { kind:'Cena', name:'Alambique Street',walk:'9 min',  desc:'Parrilla abierta con influencias japonesas.' },
      { kind:'Aire', name:'Primer Parque',   walk:'3 min',  desc:'Plaza arbolada para caminar de mañana.' },
      { kind:'Mercado', name:'La América',   walk:'12 min', desc:'Mercado tradicional, frutas imposibles.' }
    ],
    'Envigado': [
      { kind:'Café', name:'El Arte',          walk:'5 min',  desc:'Casona colonial, café de montaña.' },
      { kind:'Cena', name:'La Matriarca',     walk:'10 min', desc:'Cocina paisa de la vieja escuela.' },
      { kind:'Aire', name:'Parque Principal', walk:'6 min',  desc:'El corazón del pueblo de Envigado.' },
      { kind:'Libro', name:'Librería Palinuro', walk:'8 min', desc:'Librería independiente con catálogo curado.' }
    ],
    'Astorga': [
      { kind:'Café', name:'Al Alma',       walk:'3 min',  desc:'Ventanales, plantas, café de especialidad.' },
      { kind:'Cena', name:'Elcielo',       walk:'10 min', desc:'Cocina experiencial, estrellas Michelin.' },
      { kind:'Bar',  name:'X.O. Bar',      walk:'7 min',  desc:'Whiskies raros en ambiente discreto.' },
      { kind:'Aire', name:'Parque Lleras', walk:'5 min',  desc:'El epicentro social del barrio.' }
    ]
  };

  const mapBarrio = document.getElementById('mapBarrio');
  const mapPlaces = document.getElementById('mapPlaces');
  const pins = document.querySelectorAll('.map-pins .pin');

  function renderBarrio(name) {
    const places = PLACES[name];
    if (!places) {
      mapBarrio.textContent = 'Pasa el cursor por un barrio';
      mapPlaces.innerHTML = '<em>Cada residencia vive en un barrio distinto. Elige uno y te mostramos los lugares que recorremos.</em>';
      return;
    }
    mapBarrio.textContent = name;
    mapPlaces.innerHTML = places.map(p => `
      <div class="map-place">
        <span class="map-place-kind">${p.kind}</span>
        <span class="map-place-name">${p.name}</span>
        <span class="map-place-walk">${p.walk}</span>
        <span class="map-place-desc">${p.desc}</span>
      </div>`).join('');
  }
  pins.forEach(p => {
    p.addEventListener('mouseenter', () => {
      pins.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      renderBarrio(p.dataset.barrio);
    });
    p.addEventListener('click', () => {
      pins.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      renderBarrio(p.dataset.barrio);
    });
  });

  /* ---------- Reveals (IntersectionObserver) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.2 });

  /* ---------- Summary + Calendar refs (defined first, used by drawCal) ---------- */
  const sel = document.getElementById('selResidencia');
  const sumRes = document.getElementById('sumRes');
  const sumIn = document.getElementById('sumIn');
  const sumOut = document.getElementById('sumOut');
  const sumNights = document.getElementById('sumNights');
  const sumGuests = document.getElementById('sumGuests');
  const sumTotal = document.getElementById('sumTotal');
  const guestCount = document.getElementById('guestCount');

  function sumRender(){
    const opt = sel?.selectedOptions?.[0];
    const price = opt?.dataset?.price ? parseInt(opt.dataset.price, 10) : 0;
    if (sumRes) sumRes.textContent = opt?.textContent?.trim() && opt.value ? opt.textContent.split(' · ').slice(0,2).join(' · ') : '— Elige una residencia —';
    if (sumIn) sumIn.textContent = fmt(pIn);
    if (sumOut) sumOut.textContent = fmt(pOut);
    const n = pIn && pOut ? Math.round((pOut - pIn) / 86400000) : 0;
    if (sumNights) sumNights.textContent = n;
    if (sumGuests) sumGuests.textContent = guestCount?.textContent || '2';
    if (sumTotal) sumTotal.textContent = 'US$ ' + (n * price).toLocaleString('en-US');
  }

  /* ---------- Calendar ---------- */
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DOW = ['L','M','X','J','V','S','D'];
  let anchor = new Date(); anchor.setDate(1);
  let pIn = null, pOut = null;

  const sameDay = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const fmt = d => d ? `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()].slice(0,3)}` : '—';

  const drawMonth = (container, date) => {
    container.innerHTML = '';
    DOW.forEach(d => { const el = document.createElement('div'); el.className='cal2-dow'; el.textContent=d; container.appendChild(el); });
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(y, m+1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0;i<offset;i++){ const e = document.createElement('div'); e.className='cal2-day empty'; container.appendChild(e); }
    for (let d=1; d<=days; d++){
      const dt = new Date(y,m,d);
      const el = document.createElement('button');
      el.type='button'; el.className='cal2-day'; el.textContent=d;
      if (dt < today) el.classList.add('disabled');
      if (sameDay(dt, today)) el.classList.add('today');
      if (pIn && sameDay(dt, pIn)) el.classList.add('start');
      if (pOut && sameDay(dt, pOut)) el.classList.add('end');
      if (pIn && pOut && dt > pIn && dt < pOut) el.classList.add('in-range');
      el.addEventListener('click', () => onPick(dt));
      container.appendChild(el);
    }
  };
  const drawCal = () => {
    const first = new Date(anchor);
    const second = new Date(anchor.getFullYear(), anchor.getMonth()+1, 1);
    document.getElementById('calT1').textContent = `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    document.getElementById('calT2').textContent = `${MONTHS[second.getMonth()]} ${second.getFullYear()}`;
    drawMonth(document.getElementById('calM1'), first);
    drawMonth(document.getElementById('calM2'), second);
    updateHint();
    sumRender();
  };
  const updateHint = () => {
    const h = document.getElementById('calHint');
    if (!h) return;
    if (!pIn) h.textContent = 'Selecciona la fecha de llegada';
    else if (!pOut) h.textContent = `Llegada ${fmt(pIn)} — ahora elige la salida`;
    else {
      const n = Math.round((pOut - pIn) / 86400000);
      h.textContent = `${fmt(pIn)} → ${fmt(pOut)} · ${n} ${n===1?'noche':'noches'}`;
    }
    // update hero qsearch labels
    const qIn = document.getElementById('qsInLabel');
    const qOut = document.getElementById('qsOutLabel');
    if (qIn) qIn.textContent = pIn ? fmt(pIn) : '—';
    if (qOut) qOut.textContent = pOut ? fmt(pOut) : '—';
  };
  function onPick(dt){
    if (!pIn || (pIn && pOut)) { pIn = dt; pOut = null; }
    else if (dt > pIn) { pOut = dt; }
    else { pIn = dt; pOut = null; }
    drawCal();
  }

  document.getElementById('calPrev')?.addEventListener('click', () => { anchor = new Date(anchor.getFullYear(), anchor.getMonth()-1, 1); drawCal(); });
  document.getElementById('calNext')?.addEventListener('click', () => { anchor = new Date(anchor.getFullYear(), anchor.getMonth()+1, 1); drawCal(); });

  // hero quick search → scroll to calendar & reserve
  const qsSubmit = document.querySelector('.qs-submit');
  ['qsIn','qsOut','qsGuests'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('reservar')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });

  // hero guests quick ++
  const qsGuestsLabel = document.getElementById('qsGuestsLabel');
  const syncQsGuests = () => { if (qsGuestsLabel && guestCount) qsGuestsLabel.textContent = guestCount.textContent; };
  syncQsGuests();

  drawCal();

  /* ---------- Summary wiring ---------- */
  sel?.addEventListener('change', sumRender);
  document.querySelectorAll('[data-g]').forEach(b => {
    b.addEventListener('click', () => {
      const d = parseInt(b.dataset.g, 10);
      let v = parseInt(guestCount.textContent, 10) + d;
      v = Math.max(1, Math.min(8, v));
      guestCount.textContent = v;
      syncQsGuests();
      sumRender();
    });
  });

  /* ---------- Form submit → WhatsApp ---------- */
  const WHATSAPP_NUMBER = '573113064578';
  const form = document.getElementById('bookForm');
  const done = document.getElementById('bookDone');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const opt = sel?.selectedOptions?.[0];
    const residencia = (opt?.value && opt?.textContent?.trim()) || 'Por confirmar';
    const nombre   = (fd.get('nombre')  || '—').toString().trim() || '—';
    const correo   = (fd.get('correo')  || '—').toString().trim() || '—';
    const telefono = (fd.get('phone')   || '—').toString().trim() || '—';
    const fuente   = (fd.get('source')  || '—').toString().trim() || '—';
    const mensaje  = (fd.get('mensaje') || '').toString().trim() || '—';
    const huespedes = guestCount?.textContent || '2';
    const llegada = pIn ? fmt(pIn) : 'Por confirmar';
    const salida  = pOut ? fmt(pOut) : 'Por confirmar';
    const noches  = (pIn && pOut) ? Math.round((pOut - pIn) / 86400000) : 0;
    const total   = sumTotal?.textContent || 'Por confirmar';

    const msg = [
      '*Nueva solicitud — Luxury Apartments*',
      '',
      '*Residencia*',
      residencia,
      '',
      '*Fechas*',
      `Llegada: ${llegada}`,
      `Salida:  ${salida}`,
      `Noches:  ${noches}`,
      `Huéspedes: ${huespedes}`,
      `Total estimado: ${total}`,
      '',
      '*Contacto*',
      `Nombre: ${nombre}`,
      `Correo: ${correo}`,
      `WhatsApp: ${telefono}`,
      `Cómo nos conoció: ${fuente}`,
      '',
      '*Mensaje adicional*',
      mensaje,
      '',
      '—',
      'Enviado desde luxuryapartments.co'
    ].join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');

    done?.classList.add('show');
    form.reset();
    pIn = null; pOut = null; guestCount.textContent = '2';
    if (typeof syncQsGuests === 'function') syncQsGuests();
    drawCal();
    setTimeout(() => done?.classList.remove('show'), 8000);
  });

})();
