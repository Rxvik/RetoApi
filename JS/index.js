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
  authContainer.innerHTML = `<button id="btn-google-login" class="header-login-btn">Iniciar sesión con Google</button>`;
  document.getElementById('btn-google-login').addEventListener('click', login);
};

const showLogoutUI = (user) => {
  authContainer.innerHTML = `
    <div class="user-info-header">
      <div class="header-avatar">
        <img src="${user.photoURL}" alt="Avatar de ${user.displayName}" />
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
  
  const rowsContainer = document.querySelector('.products .list');
  const sectionTitle = document.querySelector('.products .title-6');

  // Las referencias al video fueron eliminadas
  
  const modalElement = document.getElementById('gameDetailModal');
  const gameModal = new bootstrap.Modal(modalElement);
  const modalTitle = document.getElementById('modal-game-title');
  const modalBody = document.getElementById('modal-game-body');


  const init = async () => {
    try {
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const url = `${API_BASE}/games?key=${API_KEY}&page=${randomPage}&page_size=5&ordering=-rating`;
      const gamesData = await fetchJSON(url);
      
      sectionTitle.textContent = "Juegos Populares";

      // La lógica para cargar el video fue eliminada
      
      renderRow(gamesData.results);

    } catch (err) {
      console.error(err);
      rowsContainer.innerHTML = "<p>No se pudieron cargar los juegos.</p>";
    }
  };

  // La función loadHeroVideo fue eliminada

  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status} al cargar ${url}`);
    return await res.json();
  };

  const renderRow = (games) => {
    rowsContainer.innerHTML = ''; 

    if (!games || games.length === 0) {
      return;
    }
    
    games.forEach(game => {
      if (game.background_image) {
        rowsContainer.appendChild(posterCard(game));
      }
    });
  };

  const posterCard = (game) => {
    const card = document.createElement('div');
    card.className = 'card';
    
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
    
    // Limpiamos botones de tiendas anteriores (por si acaso)
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

      // --- INICIO: Bloque de botones de tiendas ---
      if (modalFooter) {
        // 2. Buscamos el botón de "Cerrar" para insertar antes de él
        const closeButton = modalFooter.querySelector('button[data-bs-dismiss="modal"]');
        
        // 3. Obtenemos la info de las tiendas desde la API
        const stores = (gameDetails.stores || []).map(s => (s.store && s.store.name) || s.name).filter(Boolean).map(s => s.toLowerCase());
        const storeButtons = [];
        const nameEncoded = encodeURIComponent(gameDetails.name || '');

        // 4. Creamos los botones (usando clases de Bootstrap 'btn')
        if (stores.some(s => s.includes('steam'))) {
          storeButtons.push(`<a class="btn btn-primary btn-store" target="_blank" rel="noopener" href="https://store.steampowered.com/search/?term=${nameEncoded}">Ver en Steam</a>`);
        }
        if (stores.some(s => s.includes('epic'))) {
          storeButtons.push(`<a class="btn btn-success btn-store" target="_blank" rel="noopener" href="https://www.epicgames.com/store/es-ES/browse?q=${nameEncoded}">Ver en Epic</a>`);
        }
        if (stores.some(s => s.includes('microsoft') || s.includes('xbox'))) {
          storeButtons.push(`<a class="btn btn-info btn-store" target="_blank" rel="noopener" href="https://www.microsoft.com/search?q=${nameEncoded}">Ver en Microsoft</a>`);
        }

        // 5. Insertamos los botones nuevos en el footer
        if (storeButtons.length > 0 && closeButton) {
          // Insertamos cada botón (como HTML) antes del botón de cerrar
          closeButton.insertAdjacentHTML('beforebegin', storeButtons.join(''));
        }
      }
      // --- FIN: Bloque de botones de tiendas ---

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

  init();

});