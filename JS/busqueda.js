(function(){
  'use strict';

  // Configuración RAWG integrada (alinea con catalogo.js)
  const API_BASE = 'https://api.rawg.io/api';
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9';

  // Utilidades
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
      short: game.description_raw ? game.description_raw.split('. ').slice(0,2).join('. ') : (game.tags && game.tags[0] && game.tags[0].name) || '',
      description: game.description_raw || 'Sin descripción disponible.',
      banner: (game.background_image || game.background_image_additional),
      cover: (game.background_image_additional || game.background_image),
      metacritic: game.metacritic || null,
      playtime: game.playtime || null,
      esrb: game.esrb_rating && game.esrb_rating.name || null,
      developers: (game.developers||[]).map(d => d.name),
      publishers: (game.publishers||[]).map(p => p.name),
      website: game.website || null,
      stores: (game.stores||[]).map(s => ({
        name: (s.store && s.store.name) || 'Tienda',
        slug: (s.store && s.store.slug) || '',
        url: s.url || (s.store && s.store.domain ? ('https://' + s.store.domain) : null)
      })),
      gallery,
      reviews: [], // RAWG no tiene reseñas públicas fáciles; dejaremos vacío
      platforms_data: game.platforms || [] // Guardar plataformas completas para specs
    };
  }

  async function getGameData(){
    const id = params.get('id');
    const slug = params.get('slug');
    // Por defecto, si no se especifica nada, usar el ejemplo "gears of war 3"
    const q = params.get('q') || (!id && !slug ? 'gears of war 3' : null);

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

  // Fallback 1: por géneros (usar slugs correctos)
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

  // Fallback 2: juegos de la misma serie
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

  // Fallback 3: por plataformas (IDs), juegos mejor valorados
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
      const yPenalty = (baseYear && y) ? Math.min(2, Math.abs(baseYear - y) / 6) : 0; // small penalty for far years
      const imgBonus = it.image ? 0.2 : -1; // penalize items without image
      const score = gOverlap*3 + pOverlap*1 - yPenalty + imgBonus;
      // Require at least some genre overlap to consider it "related"
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
      
      // Escapar HTML para seguridad
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
    // RAWG devuelve requisitos en game.platforms[].requirements
    // Típicamente: {minimum: "texto", recommended: "texto"}
    const specsSection = $('#game-specs-section');
    const minWrapper = $('#specs-minimum-wrapper');
    const recWrapper = $('#specs-recommended-wrapper');
    const minBox = $('#specs-minimum');
    const recBox = $('#specs-recommended');

    let hasAny = false;

    if (data.platforms_data && data.platforms_data.length) {
      // Buscar específicamente plataforma PC (id: 4 es PC en RAWG)
      // También podemos verificar por nombre si contiene 'PC'
      for (const pf of data.platforms_data) {
        const platformName = pf.platform && pf.platform.name ? pf.platform.name.toLowerCase() : '';
        const platformId = pf.platform && pf.platform.id;
        
        // Filtrar solo PC (id 4 o nombre que contenga 'pc')
        if (platformId !== 4 && !platformName.includes('pc')) {
          continue; // saltar si no es PC
        }
        
        const req = pf.requirements || (pf.platform && pf.platform.requirements);
        if (req) {
          if (req.minimum) {
            minBox.textContent = req.minimum.replace(/<[^>]+>/g, ''); // strip HTML
            minWrapper.style.display = '';
            hasAny = true;
          }
          if (req.recommended) {
            recBox.textContent = req.recommended.replace(/<[^>]+>/g, '');
            recWrapper.style.display = '';
            hasAny = true;
          }
          if (hasAny) break; // solo mostrar de una plataforma (primera con datos de PC)
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
    setStatus('Cargando juego...', true);
    const data = await getGameData();
    if (!data){
      setStatus('No se encontró el juego', false);
      return;
    }

    // Render básico
    $('#game-title').textContent = data.title || '—';
    $('#game-description').textContent = data.description || '';
    const cover = $('#game-cover');
    // Cover: usar la imagen del banner (fondo principal) para mantener consistencia
    if (data.banner) cover.src = data.banner;
    else if (data.cover) cover.src = data.cover;
    cover.alt = `Portada de ${data.title}`;
    const hero = $('#game-hero');
    // Banner: elegir aleatoriamente una screenshot si hay; si no, usar banner de respaldo
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

    // Chips
    // Formatear fecha a dd-mm-año
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
        // si falla, mantener el formato original
      }
    }
    $('#game-release').textContent = formattedDate;
    $('#game-platforms').textContent = renderChips(data.platforms);
    $('#game-genres').textContent = renderChips(data.genres);

  // Galería en ruleta (estilo productos)
  const galleryRail = document.getElementById('gallery-rail');
  if (galleryRail) renderGalleryRail(galleryRail, data.gallery);

    // Especificaciones del sistema
    renderSpecs(data);

  // Datos rápidos
    renderFacts(data);
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

  document.addEventListener('DOMContentLoaded', init);
})();
