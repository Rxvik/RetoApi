const getRandomHue = () => Math.floor(Math.random() * 360);

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
        
        // --- ESTE ES EL CAMBIO (de encodedName a nameEncoded) ---
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
        // --- FIN DEL CAMBIO ---

        if (storeButtons.length > 0 && closeButton) {
          closeButton.insertAdjacentHTML('beforebegin', storeButtons.join(''));
        }
      }

    } catch (err) {
      console.error('Error cargando detalle del juego', err);
      modalBody.innerHTML = `<p>Error cargando detalles del juego.</p>`;
    }
  }

  const collectGames = async ({platformKeywords = [], count = 10, attempts = 6, mode = 'random'}) => {
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
    try {
      const sections = [
        {id: 'list-novedades', name: 'novedades', platformKeywords: ['pc', 'playstation', 'ps5', 'xbox', 'nintendo'] , random: true},
        {id: 'list-pc', name: 'pc', platformKeywords: ['pc']},
        {id: 'list-ps5', name: 'ps5', platformKeywords: ['playstation', 'ps5']},
        {id: 'list-nintendo', name: 'nintendo', platformKeywords: ['nintendo switch', 'nintendo']},
        {id: 'list-xbox', name: 'xbox', platformKeywords: ['xbox']}
      ]

      for (const sec of sections) {
        const el = document.getElementById(sec.id)
        if (!el) continue; 

        const desired = 10 
        const attempts = 8 

        let collected;
        if (sec.random) {
          collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired, attempts})
        } else {
          collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired * 4, attempts, mode: 'quality'})
        }

        if (!collected || collected.length === 0) {
          el.innerHTML = '<p>No se encontraron juegos para esta sección.</p>'
          continue
        }

        let toShow = []
        if (sec.random) {
          for (let i = collected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [collected[i], collected[j]] = [collected[j], collected[i]];
          }
          toShow = collected.slice(0, desired)
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

        el.innerHTML = ''
        toShow.forEach(game => el.appendChild(posterCard(game)))
      }

    } catch (err) {
      console.error(err)
      if (container) {
        container.innerHTML = '<p>No se pudieron cargar los juegos.</p>'
      }
    }
  });

  
  // --- LÓGICA DE ANIMACIÓN DE SCROLL ---
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
  initPage();
  initScrollAnimation(); í

});