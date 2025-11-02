const getRandomHue = () => Math.floor(Math.random() * 360);

// --- 1. HTML DEL LOADER ---
const loaderHTML = `
<div class="loader-container">
  <div class="wrapper">
    <div class="circle"></div>
    <div class="circle"></div>
    <div class="circle"></div>
    <div class="shadow"></div>
    <div class="shadow"></div>
    <div class="shadow"></div>
  </div>
</div>`;

// --- 2. LÓGICA DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAHXOnzpazOGRkSwuD9JGmU-jGw2TKcgXA",
  authDomain: "retoapi-ff801.firebaseapp.com",
  projectId: "retoapi-ff801",
  storageBucket: "retoapi-ff801.firebasestorage.app",
  messagingSenderId: "650992142854",
  appId: "1:650992142854:web:ddf60d1f3d0ea540c79187",
  measurementId: "G-0ZJQRJTF86"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const authContainer = document.getElementById('auth-container');

const showLoginUI = () => {
  authContainer.innerHTML = `<button id="btn-google-login" class="header-login-btn btn-glitch" data-text="Iniciar sesión con Google">Iniciar sesión con Google</button>`;
  document.getElementById('btn-google-login').addEventListener('click', login);
};

const showLogoutUI = (user) => {
  const profilePic = user.photoURL || ''; 
  authContainer.innerHTML = `
    <div class="user-info-header">
      <div class="header-avatar">
        <img src="${profilePic}" 
             alt="Avatar de ${user.displayName}" 
             onerror="this.src='assets/imagenes/LogoXH.png'; this.alt='Avatar';" />
      </div>
      <div class="header-username">${user.displayName}</div>
      <button id="btn-logout" class="header-logout-btn">Cerrar Sesión</button>
    </div>`;
  document.getElementById('btn-logout').addEventListener('click', logout);
};

const login = () => {
  auth.signInWithPopup(provider);
};

const logout = () => {
  auth.signOut();
};

auth.onAuthStateChanged((user) => {
  if (user) {
    showLogoutUI(user);
  } else {
    showLoginUI();
  }
});


// --- 3. LÓGICA DE LA PÁGINA DE CATÁLOGO ---
document.addEventListener('DOMContentLoaded', () => {
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9'
  const API_BASE = 'https://api.rawg.io/api'

  const container = document.querySelector('.products.products--catalog .list');

  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`)
    return await res.json()
  };

  const escapeHTML = (s) => {
    return (s || "").replace(/[&<>\"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]))
  }

  const posterCard = (game) => {
    const card = document.createElement('div')
    card.className = 'card'

    const hue = getRandomHue();
    card.style.setProperty('--card-hue', hue);

    const rating = game.rating || 'N/A'
    const platformsList = (game.platforms || []).map(p => (p.platform && p.platform.name) || p.name).filter(Boolean).join(', ')

    card.innerHTML = `
      <div class="image-container">
        <img class="image-3" src="${game.background_image || ''}" alt="${escapeHTML(game.name)}">
        <div class="tag"><div class="text-2">${rating}</div></div>
      </div>
      <div class="text-content">
        <div class="title-8">${escapeHTML(game.name)}</div>
        <p class="subtitle">${escapeHTML(platformsList)}</p>
      </div>
    `

    card.dataset.gameId = game.id
    card.tabIndex = 0
    const openIfAllowed = (e) => {
      if (e && e.type === 'click') {
        if (e.target && (e.target.tagName === 'A' || e.target.closest('.btn-store'))) return;
        showGameModal(game.id, game.name)
      } else if (e && e.type === 'keydown') {
        if (e.key === 'Enter' || e.key === ' ') {
          showGameModal(game.id, game.name)
        }
      }
    }
    card.addEventListener('click', openIfAllowed)
    card.addEventListener('keydown', openIfAllowed)

    return card;
  }

  
  const showGameModal = async (gameId, fallbackName) => {
    const modalElement = document.getElementById('gameDetailModal');
    if (!modalElement) {
      console.warn('Bootstrap modal element not found');
      return;
    }

    const bsModal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('modal-game-title');
    const modalBody = document.getElementById('modal-game-body');
    const modalFooter = modalElement.querySelector('.modal-footer');

    modalTitle.textContent = 'Cargando...';
    modalBody.innerHTML = `
      <div class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>`;
      
    if (modalFooter) {
      modalFooter.querySelectorAll('.btn-store').forEach(btn => btn.remove());
    }

    bsModal.show();

    try {
      const url = `${API_BASE}/games/${gameId}?key=${API_KEY}`;
      const data = await fetchJSON(url);

      const imgSrc = data.background_image || data.background_image_additional || '';
      const synopsis = data.description_raw || (data.description ? data.description.replace(/<[^>]+>/g, '') : 'Sin descripción.');
      
      modalTitle.textContent = data.name || fallbackName || '';
      modalBody.innerHTML = `
        <img src="${imgSrc}" class="img-fluid mb-3 modal-game-image" alt="${escapeHTML(data.name || fallbackName || '')}">
        <p>${escapeHTML(synopsis)}</p>
      `;

      if (modalFooter) {
        const closeButton = modalFooter.querySelector('button[data-bs-dismiss="modal"]');
        
        const stores = (data.stores || []).map(s => (s.store && s.store.name) || s.name).filter(Boolean).map(s => s.toLowerCase());
        const storeButtons = [];
        
        const nameEncoded = encodeURIComponent(data.name || fallbackName || '');

        if (stores.some(s => s.includes('steam'))) {
          storeButtons.push(`<a class="btn btn-primary btn-store" target="_blank" rel="noopener" href="https://store.steampowered.com/search/?term=${nameEncoded}">Ver en Steam</a>`);
        }
        if (stores.some(s => s.includes('epic'))) {
          storeButtons.push(`<a class="btn btn-success btn-store" target="_blank" rel="noopener" href="https://www.epicgames.com/store/es-ES/browse?q=${nameEncoded}">Ver en Epic</a>`);
        }
        if (stores.some(s => s.includes('microsoft') || s.includes('xbox'))) {
          storeButtons.push(`<a class="btn btn-info btn-store" target="_blank" rel="noopener" href="https://www.microsoft.com/search?q=${nameEncoded}">Ver en Microsoft</a>`);
        }

        if (storeButtons.length > 0 && closeButton) {
          closeButton.insertAdjacentHTML('beforebegin', storeButtons.join(''));
        }
      }

    } catch (err) {
      console.error('Error cargando detalle del juego', err);
      modalBody.innerHTML = `<p>Error cargando detalles del juego.</p>`;
    }
  }

  const collectGames = async ({platformKeywords = [], count = 9, attempts = 6, mode = 'random'}) => {
    const collected = []
    const allowedGenreKeywords = ['adventure', 'action', 'rpg', 'role-playing', 'role playing', 'sports', 'sport']
    const fromDate = '2020-01-01'
    const toDate = new Date().toISOString().split('T')[0]

    
    for (let attempt = 0; attempt < attempts && collected.length < count; attempt++) {
      const randomPage = Math.floor(Math.random() * 15) + 1 
      const baseParams = mode === 'quality'
        ? `&page=${randomPage}&page_size=40&dates=${fromDate},${toDate}&ordering=-rating`
        : `&page=${randomPage}&page_size=40&ordering=-released`

      const url = `${API_BASE}/games?key=${API_KEY}${baseParams}`
      let data;
      try {
        data = await fetchJSON(url)
      } catch (e) {
        console.warn('Error fetching page', e)
        continue
      }

      const matches = (data.results || []).filter(game => {
        const names = (game.platforms || []).map(p => (p.platform && p.platform.name) || p.name).filter(Boolean)
        const platformOk = names.some(n => {
          const nl = n.toLowerCase()
          return platformKeywords.some(k => nl.includes(k))
        });
        if (!platformOk) return false

        const genreNames = (game.genres || []).map(g => g.name).filter(Boolean);
        if (genreNames.length === 0) return false

        const genresAllAllowed = genreNames.every(gn => {
          const gl = gn.toLowerCase()
          return allowedGenreKeywords.some(k => gl.includes(k))
        });
        if (!genresAllAllowed) return false;

        if (mode === 'quality') {
          if (!game.released) return false;
          const released = game.released.split('T')[0]
          if (released < fromDate) return false;
        }

        return true;
      });

      matches.forEach(m => {
        if (collected.length >= count) return
        if (!collected.find(c => c.id === m.id)) collected.push(m)
      })
    }

    return collected;
  };

  const initPage = (async () => {
    const sections = [
      {id: 'list-novedades', name: 'novedades', platformKeywords: ['pc', 'playstation', 'ps5', 'xbox', 'nintendo'] , random: true},
      {id: 'list-pc', name: 'pc', platformKeywords: ['pc']},
      {id: 'list-ps5', name: 'ps5', platformKeywords: ['playstation', 'ps5']},
      {id: 'list-nintendo', name: 'nintendo', platformKeywords: ['nintendo switch', 'nintendo']},
      {id: 'list-xbox', name: 'xbox', platformKeywords: ['xbox']}
    ]

    // --- CORRECCIÓN IMPORTANTE ---
    // Movemos el try/catch DENTRO del bucle
    for (const sec of sections) {
      const el = document.getElementById(sec.id)
      if (!el) continue; 
      
      try {
        // 1. Poner el loader
        el.innerHTML = loaderHTML;

        const desired = 9 
        const attempts = 8 

        let collected;
        if (sec.random) {
          if (sec.id === 'list-novedades' || sec.name === 'novedades') {
            collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired * 4, attempts, mode: 'quality'})
          } else {
            collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired, attempts})
          }
        } else {
          collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired * 4, attempts, mode: 'quality'})
        }

        if (!collected || collected.length === 0) {
          el.innerHTML = '<p>No se encontraron juegos para esta sección.</p>'
          continue
        }

        let toShow = []
        if (sec.random) {
          if (sec.id === 'list-novedades' || sec.name === 'novedades') {
            collected.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            toShow = collected.slice(0, desired);
          } else {
            for (let i = collected.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [collected[i], collected[j]] = [collected[j], collected[i]];
            }
            toShow = collected.slice(0, desired)
          }
        } else {
          collected.sort((a, b) => {
            const ra = a.rating || 0; const rb = b.rating || 0
            if (rb !== ra) return rb - ra
            const ca = a.ratings_count || a.reviews_count || 0
            const cb = b.ratings_count || b.reviews_count || 0
            if (cb !== ca) return cb - ca
            const da = a.released || ''; const db = b.released || ''
            return db.localeCompare(da)
          });

          const top = collected.slice(0, Math.min(collected.length, 30))
          for (let i = top.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [top[i], top[j]] = [top[j], top[i]];
          }
          toShow = top.slice(0, desired)
        }

        // 2. Limpiar el loader y mostrar tarjetas
        el.innerHTML = ''
        toShow.forEach(game => el.appendChild(posterCard(game)))
      
      } catch (err) {
        // Si esta sección falla, muestra un error y continúa con la siguiente
        console.error(`Error cargando la sección ${sec.id}:`, err);
        if (el) {
          el.innerHTML = `<p>Error al cargar la sección ${sec.name}.</p>`;
        }
      }
    } // Fin del bucle for
  });
  
  // --- 4. LÓGICA DE ANIMACIÓN DE SCROLL ---
  const initScrollAnimation = () => {
    const sections = document.querySelectorAll('.section-catalogo-user, .form-catalogo, .products, .container-5');
    
    const observerOptions = {
      root: null, 
      rootMargin: '0px',
      threshold: 0.01 
    };

    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-is-visible'); 
          observer.unobserve(entry.target); 
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach(section => {
      observer.observe(section);
    });
  };
  
  // --- 5. LÓGICA DE TYPEAHEAD (BÚSQUEDA) ---
  // (Tu código de typeahead/búsqueda va aquí, sin cambios)
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
      box.style.width = Math.max(420, Math.floor(r.width)) + 'px';
      box.style.left = Math.floor(r.left) + 'px';
      box.style.top = Math.floor(r.bottom + 8) + 'px';
    }catch(_e){}
  }

  async function searchGames(q){
    const url = `${API_BASE}/games?search=${encodeURIComponent(q)}&page_size=8&key=${API_KEY}`;
    try{
      const res = await fetch(url);
      if (!res.ok) return [];
      const j = await res.json();
      return (j.results||[]).map(g=>({ id: g.id, name: g.name, released: g.released, image: g.background_image }));
    }catch(_e){ return []; }
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
    const searchBtn = (input.parentElement && (input.parentElement.querySelector('.ic-search') || input.parentElement.querySelector('.input__button__shadow')))
                      || document.querySelector('.ic-search')
                      || document.querySelector('.input__button__shadow');
    const box = createSuggestBox();
    const state = { results: [], activeIndex: -1, open: false };

    function openBox(){ if (!state.results.length) return; placeBoxUnderInput(box, input); box.style.display=''; state.open=true; }
    function closeBox(){ box.style.display='none'; state.open=false; state.activeIndex=-1; }

    const doSearch = debounce(async ()=>{
      const q = (input.value||'').trim();
      if (q.length < 2){ state.results=[]; renderSuggestItems(box, state.results, state); closeBox(); return; }
      const results = await searchGames(q);
      state.results = results; state.activeIndex = results.length ? 0 : -1;
      renderSuggestItems(box, state.results, state); openBox();
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

  // --- 6. INICIALIZACIÓN ---
  initPage();
  initScrollAnimation();
  initTypeahead();

});