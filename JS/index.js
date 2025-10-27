const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9';
const API_BASE = 'https://api.rawg.io/api/';

const latestGamesContainer = document.querySelector('.products .list');

const init = async () => {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const url = `${API_BASE}games?key=${API_KEY}&dates=${year}-01-01,${today.toISOString().split('T')[0]}&ordering=-released&page_size=3`;
        
        const data = await fetchJSON(url);
        renderGameRow(data.results);
        
    } catch (err) {
        console.error('Error al iniciar:', err);
        latestGamesContainer.innerHTML = '<p>No se pudieron cargar los juegos. Intenta más tarde.</p>';
    }
};

const renderGameRow = (games) => {
    latestGamesContainer.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'row';

    games.forEach(game => {
        row.appendChild(createGameCard(game));
    });

    latestGamesContainer.appendChild(row);
};

const createGameCard = (game) => {
    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl = game.background_image || 'https://via.placeholder.com/400x300?text=No+Imagen';
    const genres = (game.genres || []).map(g => g.name).join(', ');

    card.innerHTML = `
        <div class="image-container">
            <div class="image-2" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;">
                <div class="tag"><div class="text-2">${game.rating || 'N/A'}</div></div>
            </div>
        </div>
        <div class="text-content">
            <div class="title-8">${escapeHTML(game.name)}</div>
            <p class="subtitle">${escapeHTML(genres) || 'Sin géneros'}</p>
        </div>
    `;
    
    return card;
};

const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Error al cargar datos (HTTP ${res.status}): ${url}`);
    }
    return await res.json();
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

document.addEventListener('DOMContentLoaded', init);