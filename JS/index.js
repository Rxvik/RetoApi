document.addEventListener('DOMContentLoaded', () => {
  const apiKey = 'f8600f270c5a46cbbd3ee5e3324530c9';

  const gamesListContainer = document.querySelector('.products .list');

  gamesListContainer.innerHTML = ''; 

  const today = new Date();
  const year = today.getFullYear();
  const url = `https://api.rawg.io/api/games?key=${apiKey}&dates=${year}-01-01,${today.toISOString().split('T')[0]}&ordering=-released&page_size=3`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(data.results); 

      const row = document.createElement('div');
      row.className = 'row'; 

      data.results.forEach(game => {

        const gameCard = document.createElement('div');
        gameCard.className = 'card'; 
        gameCard.innerHTML = `
          <div class="image-container">
            <div class="image-2" style="background-image: url('${game.background_image}'); background-size: cover; background-position: center;">
              <div class="tag"><div class="text-2">${game.rating}</div></div>
              </div>
          </div>
          <div class="text-content">
            <div class="title-8">${game.name}</div>
            <p class="subtitle">${game.genres.map(g => g.name).join(', ')}</p>
          </div>
        `;
        row.appendChild(gameCard);
      });

      gamesListContainer.appendChild(row);
    })
    .catch(error => {
      console.error('Error al obtener los juegos:', error);
      gamesListContainer.innerHTML = '<p>No se pudieron cargar los juegos. Intenta más tarde.</p>';
    });
});