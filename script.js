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
  const pillars = document.querySelector('.pillars');
  const updateHeroZoom = () => {
    if (!maison) return;
    const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.78)));
    const nextProgress = Math.max(0, Math.min(1, (window.scrollY - window.innerHeight * 0.38) / Math.max(1, window.innerHeight * 0.42)));
    maison.style.setProperty('--hero-zoom', progress.toFixed(3));
    document.documentElement.style.setProperty('--hero-exit', progress.toFixed(3));
    pillars?.style.setProperty('--next-zoom', nextProgress.toFixed(3));
  };
  window.addEventListener('scroll', updateHeroZoom, { passive:true });
  updateHeroZoom();
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
    document.querySelectorAll('.maison video').forEach(v => {
      const startAt = v.classList.contains('mz-ambient-video') ? 3.8 : 0;
      const playVideo = () => {
        try {
          if (startAt && Number.isFinite(v.duration) && v.duration > startAt + 0.5) {
            v.currentTime = startAt;
          }
          v.play().catch(()=>{});
        } catch {}
      };
      try {
        v.load();
        if (v.readyState >= 1) playVideo();
        else v.addEventListener('loadedmetadata', playVideo, { once:true });
      } catch {}
    });
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
  const resStage = document.getElementById('resStage');
  const resViewport = document.getElementById('resViewport');
  const resProgressLabel = document.getElementById('resProgressLabel');
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileResidenceView = matchMedia('(max-width: 960px)');
  let resMaxX = 0;
  let resRaf = 0;

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const visibleResidences = () => items.filter(it => !it.classList.contains('hidden'));

  function setResidenceLabel(index, total){
    if (!resProgressLabel) return;
    const safeTotal = Math.max(total, 0);
    const safeIndex = safeTotal ? clamp(index, 0, safeTotal - 1) + 1 : 0;
    resProgressLabel.textContent = `${String(safeIndex).padStart(2,'0')} / ${String(safeTotal).padStart(2,'0')}`;
  }

  function measureResidenceStage(){
    if (!resStage || !resViewport || !list) return;
    const css = getComputedStyle(resViewport);
    const pad = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight);
    const visibleWidth = Math.max(1, resViewport.clientWidth - pad);
    resMaxX = Math.max(0, list.scrollWidth - visibleWidth);
    const shouldPin = !mobileResidenceView.matches && !prefersReducedMotion.matches && visibleResidences().length > 1;
    const scrollDistance = Math.max(window.innerHeight * .9, resMaxX * .52);
    resStage.style.setProperty('--res-shift', shouldPin ? `${scrollDistance}px` : '0px');
    if (!shouldPin) list.style.setProperty('--res-x', '0px');
    updateResidenceStage();
  }

  function paintResidenceDepth(){
    if (!resViewport) return;
    const visible = visibleResidences();
    const center = resViewport.getBoundingClientRect().left + resViewport.clientWidth / 2;
    let activeIndex = 0;
    let activeFocus = -1;

    items.forEach(it => {
      if (!visible.includes(it)) {
        it.style.setProperty('--item-focus', '0');
        it.classList.remove('active');
        return;
      }
      const rect = it.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const distance = Math.abs(center - itemCenter);
      const focus = clamp(1 - distance / Math.max(360, resViewport.clientWidth * .58));
      const eased = Math.pow(focus, .7);
      it.style.setProperty('--item-focus', eased.toFixed(3));
      if (eased > activeFocus) {
        activeFocus = eased;
        activeIndex = visible.indexOf(it);
      }
    });

    visible.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
    setResidenceLabel(activeIndex, visible.length);
  }

  function updateResidenceStage(){
    if (!resStage || !resViewport || !list) return;
    resRaf = 0;
    const visible = visibleResidences();
    const shouldPin = !mobileResidenceView.matches && !prefersReducedMotion.matches && visible.length > 1;
    let progress = 0;

    if (shouldPin) {
      const stageRect = resStage.getBoundingClientRect();
      const scrollable = Math.max(1, resStage.offsetHeight - window.innerHeight);
      progress = clamp(-stageRect.top / scrollable);
      list.style.setProperty('--res-x', `${progress * resMaxX}px`);
    } else {
      const horizontalMax = Math.max(1, resViewport.scrollWidth - resViewport.clientWidth);
      progress = clamp(resViewport.scrollLeft / horizontalMax);
      list.style.setProperty('--res-x', '0px');
    }

    resStage.style.setProperty('--res-progress', progress.toFixed(4));
    paintResidenceDepth();
  }

  function scheduleResidenceStage(){
    if (resRaf) return;
    resRaf = requestAnimationFrame(updateResidenceStage);
  }

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
    requestAnimationFrame(measureResidenceStage);
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
    requestAnimationFrame(measureResidenceStage);
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
  window.addEventListener('scroll', scheduleResidenceStage, { passive:true });
  window.addEventListener('resize', measureResidenceStage);
  resViewport?.addEventListener('scroll', scheduleResidenceStage, { passive:true });
  mobileResidenceView.addEventListener?.('change', measureResidenceStage);
  prefersReducedMotion.addEventListener?.('change', measureResidenceStage);
  requestAnimationFrame(measureResidenceStage);

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
    urban: { name: 'Urban · Manila', price: 290 },
    urbanCompleto: { name: 'Urban Completo · Doble jacuzzi', price: 340 },
    palace: { name: 'Palace · Sector Manila', price: 310 },
    parque: { name: 'Parque · Frente al Parque del Poblado', price: 380 },
    rosanegra: { name: 'Rosa Negra · Casa con piscina', price: 850 },
    sens1: { name: 'Sens 1 · Suite romántica', price: 195 },
    suiteManila: { name: 'Suite Manila · Jacuzzi privado', price: 195 },
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

  /* ---------- Map barrio · guía concierge (Restaurantes · Vida nocturna · Para caminar) ---------- */
  // Listas de vida nocturna compartidas entre barrios vecinos
  const NOCHE_POBLADO = ['La House','Hi I\'m SCI Club','Bellaco','Vintrash','La Oculta','Envy Rooftop','Perro Negro','Salón Amador','Sonorama','Dulcinea','Mad Radio','Gusto Night Club','Bolívar','La Chula','Mirror Club','Club Libido','Dancefree','Ginkgo','Seven Inn','Attic Club'];
  const NOCHE_LA70 = ['Jennylao Discoteca','La Logia','El Blue','Acuario Bar','Cien Fuegos','Tíbiri Bar','La Deriva','El Tibiri Tábara','Discoteca Palmahía','Sky Center','Queens Bar','El Callejón del Gato'];

  const PLACES = {
    'El Poblado': {
      restaurantes: ['Gabo.mde','Cannario Rooftop','Mondongo\'s','Tamagotchi Ramen Bar','Krudo','Sambombi Bistró','Test Kitchen','Pergamino'],
      noche: [...NOCHE_POBLADO, 'Alambique'],
      caminar: ['Cerro El Volador']
    },
    'Provenza': {
      restaurantes: ['Restaurante Provenza','La Pampa Parrilla Argentina','Burdo','Carmen','XO','Don Diablo','Mamba Negra','Hija Mía','OCI.Mde'],
      noche: [...NOCHE_POBLADO, 'Room 237'],
      caminar: ['Cuida Tu Look']
    },
    'Laureles': {
      restaurantes: ['Romero Artesanal Cuisine','Mundo Verde','Full Árabe','Curry Lounge','Keba y Pyta','Mamá Panda','Velvet','Alambique Street'],
      noche: [...NOCHE_LA70],
      caminar: ['Primer Parque','Mercado La América']
    },
    'Envigado': {
      restaurantes: ['Gabo.mde','Palogrande','La Pampa Parrilla Argentina','Pigasus','Oci.Mde','Lindo Lanzhou','El Arte','La Matriarca'],
      noche: ['Oye Bonita','Fonda La Chismosa','La Rufina','Social Club Rooftop','Distrito 20','Mora Castilla'],
      caminar: ['Parque Principal','Librería Palinuro']
    },
    'Astorga': {
      restaurantes: ['Al Alma','Elcielo'],
      noche: ['X.O. Bar'],
      caminar: ['Parque Lleras']
    },
    'La 70': {
      restaurantes: ['La Tienda de la 70','Mondongo\'s','Parrilla Barbecue 70','Ópera Pizzería','The Grill Station Burger'],
      noche: [...NOCHE_LA70],
      caminar: []
    }
  };

  const CAT_META = {
    restaurantes: { label:'Restaurantes', icon:'🍽' },
    noche:        { label:'Vida nocturna', icon:'🌙' },
    caminar:      { label:'Para caminar', icon:'🚶' }
  };
  const mapsUrl = (name, barrio) =>
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${name} ${barrio} Medellín`);

  const mapBarrio = document.getElementById('mapBarrio');
  const mapPlaces = document.getElementById('mapPlaces');
  const pins = document.querySelectorAll('.map-pins .pin');

  function renderBarrio(name) {
    const data = PLACES[name];
    if (!data) {
      mapBarrio.textContent = 'Pasa el cursor por un barrio';
      mapPlaces.innerHTML = '<em>Cada barrio, su propio carácter. Elige uno y te mostramos dónde comer, salir y caminar — con su ubicación en mapa.</em>';
      return;
    }
    mapBarrio.textContent = name;
    mapPlaces.innerHTML = ['restaurantes','noche','caminar']
      .filter(cat => data[cat] && data[cat].length)
      .map(cat => {
        const m = CAT_META[cat];
        const items = data[cat].map(place => `
          <a class="map-place" href="${mapsUrl(place, name)}" target="_blank" rel="noopener noreferrer">
            <span class="mp-name">${place}</span>
            <span class="mp-go" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
          </a>`).join('');
        return `
          <div class="map-cat">
            <span class="map-cat-h">${m.icon} ${m.label} <i>· ${data[cat].length}</i></span>
            <div class="map-cat-list">${items}</div>
          </div>`;
      }).join('');
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

  /* ---------- Footer lead capture → WhatsApp ---------- */
  const leadForm = document.getElementById('leadForm');
  const leadDone = document.getElementById('leadDone');
  leadForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(leadForm);
    const nombre   = (fd.get('nombre')   || '').toString().trim();
    const correo   = (fd.get('correo')   || '').toString().trim();
    const telefono = (fd.get('telefono') || '').toString().trim();

    const msg = [
      '*Asesoría de estadía — Luxury Apartments*',
      '',
      'Hola, aún no decido mi alojamiento. Me gustaría que un asesor me ayude a elegir la residencia ideal y a planear mi estadía en Medellín.',
      '',
      `Nombre: ${nombre}`,
      `Correo: ${correo}`,
      `WhatsApp: ${telefono}`,
      '',
      '—',
      'Enviado desde luxuryapartments.co'
    ].join('\n');

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');

    leadDone?.classList.add('show');
    leadForm.reset();
    setTimeout(() => leadDone?.classList.remove('show'), 9000);
  });

  /* ---------- Footer · arco que se dibuja al entrar en vista ---------- */
  const footCta = document.querySelector('.foot-cta');
  if (footCta) io.observe(footCta);

  /* ---------- Cierre · reel de video (autoplay + toggle de sonido) ---------- */
  const reelVideo = document.getElementById('reelVideo');
  const reelSound = document.getElementById('reelSound');
  if (reelVideo) {
    const playReel = () => { try { reelVideo.play?.().catch(()=>{}); } catch {} };
    if (reelVideo.readyState >= 2) playReel();
    else reelVideo.addEventListener('loadeddata', playReel, { once:true });
  }
  reelSound?.addEventListener('click', () => {
    if (!reelVideo) return;
    reelVideo.muted = !reelVideo.muted;
    const on = !reelVideo.muted;
    reelSound.classList.toggle('on', on);
    reelSound.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
    if (on) { try { reelVideo.play?.().catch(()=>{}); } catch {} }
  });

})();
