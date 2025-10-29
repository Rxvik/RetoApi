document.addEventListener('DOMContentLoaded', () => {
  
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9';
  const API_BASE = 'https://api.rawg.io/api';
  
  const rowsContainer = document.querySelector('.products .list');
  const sectionTitle = document.querySelector('.products .title-6');

  const init = async () => {
    try {
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const url = `${API_BASE}/games?key=${API_KEY}&page=${randomPage}&page_size=20&ordering=-rating`;
      const gamesData = await fetchJSON(url);
      
      sectionTitle.textContent = "Juegos Populares";
      renderRow(gamesData.results);

    } catch (err) {
      rowsContainer.innerHTML = "<p>No se pudieron cargar los juegos.</p>";
    }
  };

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

    card.addEventListener('click', () => openDetail(game.slug));
    return card;
  };
  
  const openDetail = (gameSlug) => {
    window.location.href = `detalle.html?slug=${gameSlug}`;
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