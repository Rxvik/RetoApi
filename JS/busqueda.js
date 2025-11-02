(function(){
  'use strict';

  const API_BASE = 'https://api.rawg.io/api';
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9';

  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const el = (tag, className, attrs={}) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    }
    return e;
  };
  const params = new URLSearchParams(location.search);
  const hasRawg = !!API_KEY;


  async function fetchFromRAWG({id, slug, q}){
    const base = API_BASE;
    const key = API_KEY;
    const headers = { 'Accept': 'application/json' };

    async function getJson(url){
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }

    // 1) Resolver el juego: por id, por slug o buscar por query
    let game;
    if (id) {
      game = await getJson(`${base}/games/${id}?key=${key}`);
    } else if (slug) {
      game = await getJson(`${base}/games/${slug}?key=${key}`);
    } else if (q) {
      const list = await getJson(`${base}/games?search=${encodeURIComponent(q)}&page_size=1&key=${key}`);
      if (list && list.results && list.results.length) {
        game = await getJson(`${base}/games/${list.results[0].id}?key=${key}`);
      }
    }

    if (!game) return null;

    // 2) Capturas de pantalla
    let gallery = [];
    try {
      const shots = await getJson(`${base}/games/${game.id}/screenshots?page_size=6&key=${key}`);
      gallery = (shots.results||[]).map(s => s.image).filter(Boolean);
    } catch(_e) { /* opcional */ }

    // Adaptar el shape a nuestro render
    return {
      id: game.id,
      slug: game.slug,
      title: game.name,
      release: game.released || '—',
      platforms: (game.platforms||[]).map(p => p.platform && p.platform.name).filter(Boolean),
      genres: (game.genres||[]).map(g => g.name),
      genres_slugs: (game.genres||[]).map(g => g.slug),
      platform_ids: (game.platforms||[]).map(p => p.platform && p.platform.id).filter(Boolean),
      rating: game.rating || game.metacritic/20 || 0,
      ratings_breakdown: (game.ratings||[]),
      ratings_count: game.ratings_count || 0,
      short: game.description_raw ? game.description_raw.split('. ').slice(0,2).join('. ') : (game.tags && game.tags[0] && game.tags[0].name) || '',
      description: game.description_raw || 'Sin descripción disponible.',
      banner: (game.background_image || game.background_image_additional),
      cover: (game.background_image_additional || game.background_image),
      metacritic: game.metacritic || null,
      playtime: game.playtime || null,
      esrb: game.esrb_rating && game.esrb_rating.name || null,
      developers: (game.developers||[]).map(d => d.name),
      publishers: (game.publishers||[]).map(p => p.name),
      tags: (game.tags||[]).map(t => t.name).filter(Boolean),
      website: game.website || null,
      stores: (game.stores||[]).map(s => ({
        name: (s.store && s.store.name) || 'Tienda',
        slug: (s.store && s.store.slug) || '',
        url: s.url || (s.store && s.store.domain ? ('https://' + s.store.domain) : null)
      })),
      gallery,
      reviews: [], 
      platforms_data: game.platforms || [] 
    };
  }

  async function getGameData(){
    const id = params.get('id');
    const slug = params.get('slug');
    const q = params.get('q');

    if (!hasRawg) {
      throw new Error('No hay API key de RAWG configurada.');
    }

    try {
      const data = await fetchFromRAWG({id, slug, q});
      if (data) return data;
    } catch (e) {
      console.error('Error de RAWG:', e);
    }
    return null;
  }

  function renderChips(values){
    if (!values || !values.length) return '—';
    return values.join(', ');
  }

  function escapeHTML(s){
    return (s || "").replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function splitDescriptionIntoParagraphs(text){
    if (!text) return [];
    const t = String(text).replace(/\r\n?/g, '\n').trim();
    if (!t) return [];
    let paras = t.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    if (paras.length > 1) return paras;
    const sentences = t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length <= 3) return [t];
    const grouped = [];
    for (let i = 0; i < sentences.length; i += 3){
      grouped.push(sentences.slice(i, i+3).join(' '));
    }
    return grouped;
  }

  function buildParagraphHTML(paras){
    return paras.map(p => `<p style="margin: 0 0 10px;">${escapeHTML(p)}</p>`).join('');
  }

  function renderDescription(text){
    const host = document.getElementById('game-description');
    if (!host) return;
    const paras = splitDescriptionIntoParagraphs(text);
    if (!paras.length){ host.innerHTML = '<span class="text-muted">Sin descripción disponible.</span>'; return; }

    const MAX_PREVIEW_PARAS = 3;
    const isLong = paras.length > MAX_PREVIEW_PARAS || (paras.join(' ').length > 500);
    if (!isLong){
      host.innerHTML = buildParagraphHTML(paras);
      return;
    }

    const preview = paras.slice(0, MAX_PREVIEW_PARAS);
    const fullHTML = buildParagraphHTML(paras);
    const previewHTML = buildParagraphHTML(preview) + `<button class="desc-toggle" type="button" style="margin-top:6px; font-size:13px; color:#93c5fd; background:none; border:none; padding:0; cursor:pointer;">Ver más</button>`;

    host.innerHTML = previewHTML;
    const btn = host.querySelector('.desc-toggle');
    if (btn){
      let expanded = false;
      btn.addEventListener('click', ()=>{
        expanded = !expanded;
        if (expanded){
          host.innerHTML = fullHTML + `<button class=\"desc-toggle\" type=\"button\" style=\"margin-top:6px; font-size:13px; color:#93c5fd; background:none; border:none; padding:0; cursor:pointer;\">Ver menos</button>`;
        } else {
          host.innerHTML = previewHTML;
        }
        const newBtn = host.querySelector('.desc-toggle');
        if (newBtn) newBtn.addEventListener('click', btn.onclick);
      });
    }
  }

  function renderGalleryRail(container, urls){
    container.innerHTML = '';
    if (!urls || !urls.length) {
      const msg = el('div','text-muted', { text: 'No hay imágenes disponibles.' });
      container.appendChild(msg);
      return;
    }
    urls.forEach((src)=>{
      const card = el('div','card');
      const img = el('img','image-3', { src, alt: 'Captura del juego' });
      card.appendChild(img);
      container.appendChild(card);
    });
  }

  async function fetchSuggestions(gameId){
    try{
      const r = await fetch(`${API_BASE}/games/${gameId}/suggested?page_size=8&key=${API_KEY}`);
      if(!r.ok) return [];
      const j = await r.json();
      return (j.results||[]).map(g => ({
        id: g.id,
        name: g.name,
        image: g.background_image,
        released: g.released,
        rating: g.rating || 0,
        genres_slugs: (g.genres||[]).map(x => x.slug),
        platform_ids: (g.parent_platforms||[]).map(pp => pp.platform && pp.platform.id).filter(Boolean),
        parent_platforms: g.parent_platforms || [],
        platforms: g.platforms || []
      }));
    } catch(_e){ return []; }
  }

  async function fetchSuggestionsByGenres(genresSlugs){
    const slugs = Array.isArray(genresSlugs) ? genresSlugs.filter(Boolean) : [];
    if(!slugs.length) return [];
    try{
      const g = encodeURIComponent(slugs[0]);
      const r = await fetch(`${API_BASE}/games?genres=${g}&ordering=-rating&page_size=10&key=${API_KEY}`);
      if(!r.ok) return [];
      const j = await r.json();
      return (j.results||[]).map(x => ({
        id: x.id,
        name: x.name,
        image: x.background_image,
        released: x.released,
        rating: x.rating || 0,
        genres_slugs: (x.genres||[]).map(g => g.slug),
        platform_ids: (x.parent_platforms||[]).map(pp => pp.platform && pp.platform.id).filter(Boolean),
        parent_platforms: x.parent_platforms || [],
        platforms: x.platforms || []
      }));
    } catch(_e){ return []; }
  }

  async function fetchGameSeries(gameId){
    try{
      const r = await fetch(`${API_BASE}/games/${gameId}/game-series?page_size=10&key=${API_KEY}`);
      if(!r.ok) return [];
      const j = await r.json();
      return (j.results||[]).map(x => ({
        id: x.id,
        name: x.name,
        image: x.background_image,
        released: x.released,
        rating: x.rating || 0,
        genres_slugs: (x.genres||[]).map(g => g.slug),
        platform_ids: (x.parent_platforms||[]).map(pp => pp.platform && pp.platform.id).filter(Boolean),
        parent_platforms: x.parent_platforms || [],
        platforms: x.platforms || []
      }));
    } catch(_e){ return []; }
  }

  async function fetchByPlatformIds(platformsData){
    const ids = (platformsData||[]).map(p => p.platform && p.platform.id).filter(Boolean);
    if(!ids.length) return [];
    try{
      const r = await fetch(`${API_BASE}/games?platforms=${ids.join(',')}&ordering=-rating&page_size=10&key=${API_KEY}`);
      if(!r.ok) return [];
      const j = await r.json();
      return (j.results||[]).map(x => ({
        id: x.id,
        name: x.name,
        image: x.background_image,
        released: x.released,
        rating: x.rating || 0,
        genres_slugs: (x.genres||[]).map(g => g.slug),
        platform_ids: (x.parent_platforms||[]).map(pp => pp.platform && pp.platform.id).filter(Boolean),
        parent_platforms: x.parent_platforms || [],
        platforms: x.platforms || []
      }));
    } catch(_e){ return []; }
  }

  function intersectCount(a=[], b=[]){
    const sb = new Set(b);
    return a.filter(x => sb.has(x)).length;
  }

  function yearFromDateStr(str){
    if(!str) return null;
    const y = parseInt(String(str).slice(0,4), 10);
    return Number.isFinite(y) ? y : null;
  }

  function rankAndFilterSuggestions(baseData, items){
    if(!Array.isArray(items) || !items.length) return [];
    const baseGenres = baseData.genres_slugs || [];
    const basePlatforms = baseData.platform_ids || [];
    const baseYear = yearFromDateStr(baseData.release);
    const seen = new Set();
    const scored = [];
    for (const it of items){
      if (!it || !it.id || seen.has(it.id) || it.id === baseData.id) continue;
      seen.add(it.id);
      const gOverlap = intersectCount(baseGenres, it.genres_slugs||[]);
      const pOverlap = intersectCount(basePlatforms, it.platform_ids||[]);
      const y = yearFromDateStr(it.released);
      const yPenalty = (baseYear && y) ? Math.min(2, Math.abs(baseYear - y) / 6) : 0; 
      const imgBonus = it.image ? 0.2 : -1; 
      const score = gOverlap*3 + pOverlap*1 - yPenalty + imgBonus;
      if (gOverlap >= 1) scored.push({ ...it, _score: score });
    }
    scored.sort((a,b)=> b._score - a._score);
    return scored.slice(0, 12);
  }

  function renderFacts(data){
    const box = document.getElementById('facts-content');
    if(!box) return;
    const items = [];
    if (data.metacritic) items.push(`<li><span>Metacritic</span><strong>${data.metacritic}</strong></li>`);
    if (data.playtime) items.push(`<li><span>Tiempo de juego</span><strong>${data.playtime}h</strong></li>`);
    if (data.esrb) items.push(`<li><span>Clasificación</span><strong>${data.esrb}</strong></li>`);
    if (data.developers && data.developers.length) items.push(`<li><span>Desarrollador</span><strong>${data.developers[0]}</strong></li>`);
    if (data.publishers && data.publishers.length) items.push(`<li><span>Publisher</span><strong>${data.publishers[0]}</strong></li>`);
    if (data.website) items.push(`<li style="border-bottom:none"><a class="store-link" href="${data.website}" target="_blank" rel="noopener">Sitio oficial</a></li>`);
    if (!items.length) {
      box.innerHTML = '<div class="text-muted">Sin datos adicionales.</div>';
      return;
    }
    box.innerHTML = `<ul class="aside-list">${items.join('')}</ul>`;
  }

  function renderRatingsBreakdown(data){
    const card = document.getElementById('ratings-card');
    const box = document.getElementById('ratings-breakdown');
    if (!card || !box) return;
    const items = Array.isArray(data.ratings_breakdown) ? data.ratings_breakdown : [];
    const total = data.ratings_count || 0;
    if (!items.length || total === 0){ card.style.display = 'none'; return; }
    const order = ['exceptional','recommended','meh','skip'];
    const dict = {};
    for (const r of items){ if (!r || !r.title) continue; dict[r.title.toLowerCase()] = r; }
    const rows = [];
    order.forEach(key => {
      const row = dict[key];
      const count = row ? row.count : 0;
      const pct = total ? Math.round((count/total)*100) : 0;
      const label = ({exceptional:'Excelente', recommended:'Bueno', meh:'Regular', skip:'Malo'})[key] || key;
      const cls = `r-${key}`;
      rows.push(`
        <div class="aside-rating-row">
          <div class="aside-rating-label">${label}</div>
          <div class="aside-rating-bar"><span class="aside-rating-fill ${cls}" style="width:${pct}%"></span></div>
          <div style="min-width:36px; font-size:12px; color:#bbb; text-align:right;">${pct}%</div>
        </div>
      `);
    });
    box.innerHTML = rows.join('');
    card.style.display = '';
  }

  function renderTags(data){
    const card = document.getElementById('tags-card');
    const box = document.getElementById('tags-content');
    if (!card || !box) return;
    const tags = Array.isArray(data.tags) ? data.tags.slice(0, 10) : [];
    if (!tags.length){ card.style.display = 'none'; return; }
    box.innerHTML = tags.map(t => `<span class="badge me-1 mb-1">${t}</span>`).join('');
    card.style.display = '';
  }

  function renderStoresButtons(stores){
    const host = document.getElementById('hero-stores');
    if(!host) return;
    host.innerHTML = '';
    const list = (stores||[]).filter(s => s.url);
    if(!list.length){
      host.innerHTML = '<div class="text-muted">No disponible.</div>';
      return;
    }
    list.slice(0,7).forEach(s => {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'btn btn-primary btn-sm';
      a.textContent = s.name;
      host.appendChild(a);
    });
  }

  function renderSuggestionsRail(suggestions){
    const rail = document.getElementById('suggestions-rail');
    if(!rail) return;
    rail.innerHTML = '';
    if(!suggestions.length){
      rail.innerHTML = '<div class="text-muted">Sin sugerencias.</div>';
      return;
    }
    
    suggestions.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card';
      
      const rating = s.rating || 'N/A';
      
      // Obtener lista de plataformas
      let platformsList = '';
      if (s.parent_platforms && s.parent_platforms.length > 0) {
        platformsList = s.parent_platforms
          .map(pp => pp.platform?.name)
          .filter(Boolean)
          .join(', ');
      } else if (s.platforms && s.platforms.length > 0) {
        platformsList = s.platforms
          .map(p => p.platform?.name)
          .filter(Boolean)
          .join(', ');
      } else if (s.platform_ids && s.platform_ids.length > 0) {
        const platformNames = {
          1: 'PC', 4: 'PC', 
          18: 'PS4', 187: 'PS5', 16: 'PS3',
          1: 'Xbox One', 186: 'Xbox Series S/X', 14: 'Xbox 360',
          7: 'Nintendo Switch', 8: 'Nintendo 3DS'
        };
        platformsList = s.platform_ids
          .map(id => platformNames[id])
          .filter(Boolean)
          .join(', ');
      }
      platformsList = platformsList || 'Plataformas no especificadas';
      
      const escapeHTML = (str) => {
        return (str || "").replace(/[&<>\"']/g, m => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[m]));
      };
      
      card.innerHTML = `
        <a href="busqueda.html?id=${s.id}">
          <div class="image-container">
            <img class="image-3" src="${s.image || ''}" alt="${escapeHTML(s.name)}">
            <div class="tag"><div class="text-2">${rating}</div></div>
          </div>
          <div class="text-content">
            <div class="title-8">${escapeHTML(s.name)}</div>
            <p class="subtitle">${escapeHTML(platformsList)}</p>
          </div>
        </a>
      `;
      
      rail.appendChild(card);
    });
  }

  function renderSpecs(data){
    const specsSection = $('#game-specs-section');
    const minWrapper = $('#specs-minimum-wrapper');
    const recWrapper = $('#specs-recommended-wrapper');
    const minBox = $('#specs-minimum');
    const recBox = $('#specs-recommended');

    let hasAny = false;

    if (data.platforms_data && data.platforms_data.length) {
      for (const pf of data.platforms_data) {
        const platformName = pf.platform && pf.platform.name ? pf.platform.name.toLowerCase() : '';
        const platformId = pf.platform && pf.platform.id;
 
        if (platformId !== 4 && !platformName.includes('pc')) {
          continue; // saltar si no es PC
        }
        
        const req = pf.requirements || (pf.platform && pf.platform.requirements);
        if (req) {
          if (req.minimum) {
            minBox.textContent = req.minimum.replace(/<[^>]+>/g, ''); 
            minWrapper.style.display = '';
            hasAny = true;
          }
          if (req.recommended) {
            recBox.textContent = req.recommended.replace(/<[^>]+>/g, '');
            recWrapper.style.display = '';
            hasAny = true;
          }
          if (hasAny) break; 
        }
      }
    }

    if (hasAny) {
      specsSection.style.display = '';
    } else {
      specsSection.style.display = 'none';
    }
  }

  function setStatus(msg, busy=false){
    const s = $('#status');
    if (!s) return;
    s.textContent = msg || '';
    s.style.display = msg ? '' : 'none';
    const hero = $('#game-hero');
    if (hero) hero.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  async function init(){
    if (!params.get('id') && !params.get('slug') && !params.get('q')) {
      window.location.replace('index.html');
      return;
    }
    setStatus('Cargando juego...', true);
    const data = await getGameData();
    if (!data){
      setStatus('No se encontró el juego', false);
      return;
    }

    // Render básico
    $('#game-title').textContent = data.title || '—';
  renderDescription(data.description || '');
    const cover = $('#game-cover');
    if (data.banner) cover.src = data.banner;
    else if (data.cover) cover.src = data.cover;
    cover.alt = `Portada de ${data.title}`;
    const hero = $('#game-hero');
    if (hero) {
      const shots = Array.isArray(data.gallery) ? data.gallery : [];
      const pick = shots.length ? shots[Math.floor(Math.random()*shots.length)] : (data.banner || data.cover || '');
      if (pick) hero.style.backgroundImage = `url('${pick}')`;
    }

    // Rating debajo del título
    const ratingBox = $('#game-rating-box');
    const ratingText = $('#game-rating-text');
    const r = Number(data.rating || 0).toFixed(1);
    if (r && r !== '0.0'){
      ratingText.textContent = r;
      ratingBox.style.display = '';
    } else if (ratingBox) {
      ratingBox.style.display = 'none';
    }

    let formattedDate = data.release || '—';
    if (data.release && data.release !== '—') {
      try {
        const dateObj = new Date(data.release);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          formattedDate = `${day}-${month}-${year}`;
        }
      } catch(e) {
      }
    }
    $('#game-release').textContent = formattedDate;
    $('#game-platforms').textContent = renderChips(data.platforms);
    $('#game-genres').textContent = renderChips(data.genres);

  const galleryRail = document.getElementById('gallery-rail');
  if (galleryRail) renderGalleryRail(galleryRail, data.gallery);

    // Especificaciones del sistema
    renderSpecs(data);

  // Datos rápidos
    renderFacts(data);
  // Opiniones y Etiquetas
    renderRatingsBreakdown(data);
    renderTags(data);
  // Dónde comprar como botones bajo el hero
  renderStoresButtons(data.stores);

    // Sugeridos en ruleta: varias estrategias para garantizar resultados
    let suggestions = await fetchSuggestions(data.id);
    if(!suggestions || !suggestions.length){
      const s1 = await fetchGameSeries(data.id);
      if (s1 && s1.length) suggestions = s1;
    }
    if(!suggestions || !suggestions.length){
      const s2 = await fetchSuggestionsByGenres(data.genres_slugs || []);
      if (s2 && s2.length) suggestions = s2;
    }
    if(!suggestions || !suggestions.length){
      const s3 = await fetchByPlatformIds(data.platforms_data || []);
      if (s3 && s3.length) suggestions = s3;
    }
    suggestions = rankAndFilterSuggestions(data, suggestions||[]);
    renderSuggestionsRail(suggestions||[]);

    setStatus('', false);
  }

  function debounce(fn, wait){ let t; return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), wait); }; }

  function createSuggestBox(){
    let box = document.querySelector('.search-suggestions');
    if (!box){
      box = document.createElement('div');
      box.className = 'search-suggestions';
      box.style.display = 'none';
      document.body.appendChild(box);
    }
    return box;
  }

  function placeBoxUnderInput(box, input){
    try{
      const r = input.getBoundingClientRect();
      box.style.width = Math.max(220, Math.floor(r.width)) + 'px';
      box.style.left = Math.floor(r.left) + 'px';
      box.style.top = Math.floor(r.bottom + 8) + 'px';
    }catch(_e){}
  }

  async function searchGames(q){
    const r = await fetch(`${API_BASE}/games?search=${encodeURIComponent(q)}&page_size=8&key=${API_KEY}`);
    if(!r.ok) return [];
    const j = await r.json();
    return (j.results||[]).map(g=>({ id: g.id, name: g.name, released: g.released, image: g.background_image }));
  }

  function renderSuggestItems(box, results, state){
    if (!results || !results.length){
      box.innerHTML = '<div class="item" style="pointer-events:none"><span class="name">Sin resultados</span></div>';
      return;
    }
    box.innerHTML = '';
    results.forEach((g, idx)=>{
      const item = document.createElement('div');
      item.className = 'item' + (idx === state.activeIndex ? ' active' : '');
      const img = document.createElement('img'); img.className = 'thumb'; img.src = g.image || ''; img.alt = '';
      const meta = document.createElement('div'); meta.className = 'meta';
      const name = document.createElement('div'); name.className = 'name'; name.textContent = g.name || '—';
      const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = g.released ? new Date(g.released).getFullYear() : '';
      meta.appendChild(name); meta.appendChild(sub);
      item.appendChild(img); item.appendChild(meta);
      item.addEventListener('mousedown', (ev)=>{ ev.preventDefault(); window.location.href = `busqueda.html?id=${g.id}`; });
      box.appendChild(item);
    });
  }

  function initTypeahead(){
    const input = document.getElementById('buscador');
    if (!input) return;
    const searchBtn = (input.parentElement && input.parentElement.querySelector('.ic-search')) || document.querySelector('.ic-search');
    const box = createSuggestBox();
    const state = { results: [], activeIndex: -1, open: false };

    function openBox(){ if (!state.results.length) return; placeBoxUnderInput(box, input); box.style.display=''; state.open=true; }
    function closeBox(){ box.style.display='none'; state.open=false; state.activeIndex=-1; }

    const doSearch = debounce(async ()=>{
      const q = (input.value||'').trim();
      if (q.length < 2){ state.results=[]; renderSuggestItems(box, state.results, state); closeBox(); return; }
      try{
        const results = await searchGames(q);
        state.results = results; state.activeIndex = results.length ? 0 : -1;
        renderSuggestItems(box, state.results, state); openBox();
      }catch(_e){ /* ignore */ }
    }, 250);

    input.addEventListener('input', doSearch);
    input.addEventListener('focus', ()=>{ if (state.results.length){ placeBoxUnderInput(box, input); openBox(); } });
    input.addEventListener('keydown', (e)=>{
      if (!state.open && (e.key==='ArrowDown'||e.key==='ArrowUp')) openBox();
      switch(e.key){
        case 'ArrowDown': e.preventDefault(); if (!state.results.length) return; state.activeIndex=(state.activeIndex+1)%state.results.length; renderSuggestItems(box, state.results, state); break;
        case 'ArrowUp': e.preventDefault(); if (!state.results.length) return; state.activeIndex=(state.activeIndex-1+state.results.length)%state.results.length; renderSuggestItems(box, state.results, state); break;
        case 'Enter':
          if (state.open && state.activeIndex>=0 && state.results[state.activeIndex]){ e.preventDefault(); window.location.href = `busqueda.html?id=${state.results[state.activeIndex].id}`; }
          else if ((input.value||'').trim().length){ window.location.href = 'busqueda.html?q=' + encodeURIComponent((input.value||'').trim()); }
          break;
        case 'Escape': closeBox(); break;
      }
    });

    document.addEventListener('click', (ev)=>{ if (ev.target!==input && !box.contains(ev.target)) closeBox(); });
    window.addEventListener('resize', ()=>{ if (state.open) placeBoxUnderInput(box, input); });
    window.addEventListener('scroll', ()=>{ if (state.open) placeBoxUnderInput(box, input); }, { passive: true });

    if (searchBtn){
      searchBtn.addEventListener('click', ()=>{
        const q = (input.value||'').trim();
        if (state.open && state.activeIndex>=0 && state.results[state.activeIndex]) window.location.href = `busqueda.html?id=${state.results[state.activeIndex].id}`;
        else if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ init(); initTypeahead(); });
})();
