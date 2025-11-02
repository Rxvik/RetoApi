const getRandomHue = () => Math.floor(Math.random() * 360);

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
  
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9';
  const API_BASE = 'https://api.rawg.io/api';
  
  const popularContainer = document.getElementById('popular-games-list');
  const sectionTitle = document.querySelector('.products .title-6');
  
  const rotatorCardContainer = document.getElementById('featured-game-card');
  const rotatorRatingsContainer = document.getElementById('featured-game-ratings');
  let rotatorGames = []; 
  let rotatorIndex = 0;
  
  const refreshPopularBtn = document.getElementById('refresh-popular-btn');

  const modalElement = document.getElementById('gameDetailModal');
  const gameModal = new bootstrap.Modal(modalElement);
  const modalTitle = document.getElementById('modal-game-title');
  const modalBody = document.getElementById('modal-game-body');


  const init = async () => {
    loadPopularGames();
    initRotator();

    if (refreshPopularBtn) {
      refreshPopularBtn.addEventListener('click', loadPopularGames);
    }
  };

  const loadPopularGames = async () => {
    if (!popularContainer) return; 

    popularContainer.innerHTML = loaderHTML;
    
    try {
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const url = `${API_BASE}/games?key=${API_KEY}&page=${randomPage}&page_size=5&ordering=-rating`;
      const gamesData = await fetchJSON(url);
      
      sectionTitle.textContent = "Juegos Populares";
      renderRow(gamesData.results, popularContainer); 

    } catch (err) {
      console.error(err);
      popularContainer.innerHTML = "<p>No se pudieron cargar los juegos populares.</p>";
    }
  };

  const initRotator = async () => {
    if (!rotatorCardContainer || !rotatorRatingsContainer) return; 
    try {
      const randomPage = Math.floor(Math.random() * 20) + 1;
      const url = `${API_BASE}/games?key=${API_KEY}&page=${randomPage}&page_size=20&ordering=-rating`;
      const data = await fetchJSON(url);
      rotatorGames = data.results.filter(g => g.background_image); 
      if (rotatorGames.length > 0) {
        showNextGame(); 
        setInterval(showNextGame, 5000); 
      }
    } catch (err) {
      console.error("Error al iniciar el rotador:", err);
      rotatorCardContainer.innerHTML = "<p>Error al cargar juego destacado.</p>";
    }
  };

  const showNextGame = () => {
    if (rotatorGames.length === 0) return;
    const game = rotatorGames[rotatorIndex];
    rotatorCardContainer.classList.add('rotator-fade-out');
    rotatorRatingsContainer.classList.add('rotator-fade-out');
    setTimeout(() => {
      const hue = getRandomHue();
      rotatorCardContainer.style.setProperty('--card-hue', hue);
      rotatorCardContainer.innerHTML = `
        <div class="image-container"><img class="image-3" src="${game.background_image}" alt="${escapeHTML(game.name)}"></div>
        <div class="text-content">
          <div class="title-8">${escapeHTML(game.name)}</div>
          <p class="subtitle">${escapeHTML((game.genres || []).map(g => g.name).slice(0, 3).join(', '))}</p>
        </div>
      `;
      rotatorCardContainer.addEventListener('click', () => showGameModal(game.slug));
      const userRating = game.rating ? game.rating.toFixed(1) : 'N/A';
      const metacriticRating = game.metacritic || 'N/A';
      rotatorRatingsContainer.innerHTML = `
        <div class="rating-box"><div class="rating-label">Rating de Usuarios</div><div class="rating-value">${userRating}</div></div>
        <div class="rating-box"><div class="rating-label">Metacritic</div><div class="rating-value metacritic">${metacriticRating}</div></div>
      `;
      rotatorCardContainer.classList.remove('rotator-fade-out');
      rotatorRatingsContainer.classList.remove('rotator-fade-out');
    }, 300); 
    rotatorIndex = (rotatorIndex + 1) % rotatorGames.length;
  };
  
  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status} al cargar ${url}`);
    return await res.json();
  };

  const renderRow = (games, containerElement) => {
    containerElement.innerHTML = ''; 
    if (!games || games.length === 0) {
      containerElement.innerHTML = "<p>No se encontraron juegos.</p>";
      return;
    }
    games.forEach(game => {
      if (game.background_image) {
        containerElement.appendChild(posterCard(game));
      }
    });
  };

  const posterCard = (game) => {
    const card = document.createElement('div');
    card.className = 'card';
    const hue = getRandomHue();
    card.style.setProperty('--card-hue', hue);
    const genres = (game.genres || []).map(g => g.name).slice(0, 3).join(', ');
    const rating = game.rating || 'N/A';
    card.innerHTML = `
      <div class="image-container">
        <img class="image-3" src="${game.background_image}" alt="${escapeHTML(game.name)}">
        <div class="tag"><div class="text-2">${rating}</div></div>
      </div>
      <div class="text-content">
        <div class="title-8">${escapeHTML(game.name)}</div>
        <p class="subtitle">${escapeHTML(genres)}</p>
      </div>
    `;
    card.addEventListener('click', () => showGameModal(game.slug));
    return card;
  };
  
  const showGameModal = async (gameSlug) => {
    modalTitle.textContent = 'Cargando...';
    modalBody.innerHTML = `
      <div class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>`;
    
    const modalFooter = modalElement.querySelector('.modal-footer');
    if (modalFooter) {
      modalFooter.querySelectorAll('.btn-store').forEach(btn => btn.remove());
    }
    
    gameModal.show();
    try {
      const url = `${API_BASE}/games/${gameSlug}?key=${API_KEY}`;
      const gameDetails = await fetchJSON(url);
      modalTitle.textContent = gameDetails.name;
      modalBody.innerHTML = `
        <img src="${gameDetails.background_image}" class="img-fluid mb-3 modal-game-image" alt="${escapeHTML(gameDetails.name)}">
        <p>${escapeHTML(gameDetails.description_raw)}</p>
      `;
      if (modalFooter) {
        const closeButton = modalFooter.querySelector('button[data-bs-dismiss="modal"]');
        const stores = (gameDetails.stores || []).map(s => (s.store && s.store.name) || s.name).filter(Boolean).map(s => s.toLowerCase());
        const storeButtons = [];
        const nameEncoded = encodeURIComponent(gameDetails.name || '');
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
      console.error(err);
      modalBody.innerHTML = `<p>Error al cargar los detalles del juego.</p>`;
    }
  };

  const escapeHTML = (s) => {
    return (s || "").replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  };

  const initScrollAnimation = () => {
    const sections = document.querySelectorAll('.frame, .section-2, .products, .featured-game-rotator, .container-5');
    
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


  init();
  initScrollAnimation(); 

});