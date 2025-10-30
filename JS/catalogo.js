document.addEventListener('DOMContentLoaded', () => {
  // API key y base URL de RAWG 
  const API_KEY = 'f8600f270c5a46cbbd3ee5e3324530c9'
  const API_BASE = 'https://api.rawg.io/api'

  const container = document.querySelector('.products.products--catalog .list');
  if (!container) return; // Si no existe el contenedor, salir silenciosamente.

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

  // Esta Funcion sirve para mostrar los juegos que jalamos de la API
  const posterCard = (game) => {
    const card = document.createElement('div')
    card.className = 'card'

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

    // Almacenar el id para usarlo despues para el modal
    card.dataset.gameId = game.id
    card.addEventListener('click', (e) => {
      if (e.target && (e.target.tagName === 'A' || e.target.closest('.btn-store'))) return
      showGameModal(game.id, game.name)
    })

    return card;
  }

  
  const showGameModal = async (gameId, fallbackName) => {
    // Crear overlay y modal base
    const overlay = document.createElement('div')
    overlay.className = 'game-modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'game-modal'

    // Contenido inicial (spinner/texto mientras se carga)
    modal.innerHTML = `
      <div class="modal-left"><div class="modal-image-placeholder">Cargando imagen...</div></div>
      <div class="modal-right"><div class="modal-loading">Cargando detalles...</div></div>
      <button class="modal-close" aria-label="Cerrar">❌</button>
    `;

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // Cerrar modal al clicar overlay o botón
    const close = () => { overlay.remove(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); })
    modal.querySelector('.modal-close').addEventListener('click', close)

    // Obtenemos detalles del juego desde la API
    try {
      const url = `${API_BASE}/games/${gameId}?key=${API_KEY}`
      const data = await fetchJSON(url)

      // Imagen del Juego
      const imgSrc = data.background_image || data.background_image_additional || ''
      const left = modal.querySelector('.modal-left')
      left.innerHTML = `<img src="${imgSrc}" alt="${escapeHTML(data.name || fallbackName || '')}" class="modal-image">`

      // Información del Juego: título, sinopsis, plataformas y calificación
      const platforms = (data.platforms || []).map(p => (p.platform && p.platform.name) || p.name).filter(Boolean).join(', ')
      const rating = data.rating || 'N/A'
      const synopsis = data.description_raw || (data.description ? data.description.replace(/<[^>]+>/g, '') : 'Sin descripción.')

      // Estos botones solo aparecen si el juego esta en la tienda 
      const stores = (data.stores || []).map(s => (s.store && s.store.name) || s.name).filter(Boolean).map(s => s.toLowerCase())

      const storeButtons = [];
      const nameEncoded = encodeURIComponent(data.name || fallbackName || '')
      if (stores.some(s => s.includes('steam'))) {
        storeButtons.push(`<a class="btn-store" target="_blank" rel="noopener" href="https://store.steampowered.com/search/?term=${nameEncoded}">Ver en Steam</a>`)
      }
      if (stores.some(s => s.includes('epic'))) {
        storeButtons.push(`<a class="btn-store" target="_blank" rel="noopener" href="https://www.epicgames.com/store/es-ES/browse?q=${nameEncoded}">Ver en Epic Games</a>`)
      }
      if (stores.some(s => s.includes('microsoft') || s.includes('xbox'))) {
        storeButtons.push(`<a class="btn-store" target="_blank" rel="noopener" href="https://www.microsoft.com/search?q=${nameEncoded}">Ver en Microsoft Store</a>`)
      }

      const rightHtml = `
        <h2 class="modal-title">${escapeHTML(data.name || fallbackName || '')}</h2>
        <p class="modal-synopsis">${escapeHTML(synopsis)}</p>
        <p class="modal-meta"><strong> 🖥️🎮Plataformas:</strong> ${escapeHTML(platforms || 'No disponible')}</p>
        <p class="modal-meta"><strong> ⭐ Calificación:</strong> ${escapeHTML(String(rating))}</p>
        <div class="modal-actions">${storeButtons.join('')}</div>
      `;

      const right = modal.querySelector('.modal-right')
      right.innerHTML = rightHtml

    } catch (err) {
      console.error('Error cargando detalle del juego', err)
      const right = modal.querySelector('.modal-right')
      right.innerHTML = `<p>Error cargando detalles del juego.</p>`
    }
  }


  const collectGames = async ({platformKeywords = [], count = 10, attempts = 6, mode = 'random'}) => {
    const collected = []
    // géneros permitidos
    const allowedGenreKeywords = ['adventure', 'action', 'rpg', 'role-playing', 'role playing', 'sports', 'sport']
    const fromDate = '2020-01-01'
    const toDate = new Date().toISOString().split('T')[0]

    
    for (let attempt = 0; attempt < attempts && collected.length < count; attempt++) {
      const randomPage = Math.floor(Math.random() * 15) + 1 // Va eligiendo los juegos desde la pagina 1 hasta la 15

      // Construcción de parámetros diferentes según modo
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

      // Filtrado por plataforma y géneros
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

        // En modo 'quality' garantizamos fecha >= fromDate
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

  (async () => {
    try {
      // Definición de cada sección del catálogo: id del DOM y keywords para plataforma
      const sections = [
        {id: 'list-novedades', name: 'novedades', platformKeywords: ['pc', 'playstation', 'ps5', 'xbox', 'nintendo'] , random: true},
        {id: 'list-pc', name: 'pc', platformKeywords: ['pc']},
        {id: 'list-ps5', name: 'ps5', platformKeywords: ['playstation', 'ps5']},
        {id: 'list-nintendo', name: 'nintendo', platformKeywords: ['nintendo switch', 'nintendo']},
        {id: 'list-xbox', name: 'xbox', platformKeywords: ['xbox']}
      ]

      for (const sec of sections) {
        const el = document.getElementById(sec.id)
        if (!el) continue; // si no existe el contenedor, pasar al siguiente

        const desired = 10 // objetivo por fila
        const attempts = 8 // cuántas páginas muestrear para intentar completar la lista

        let collected;
        if (sec.random) {
          // Novedades en modo aleatorio
          collected = await collectGames({platformKeywords: sec.platformKeywords, count: desired, attempts})
        } else {
          // Filas por plataforma: pedir más resultados en 'quality'
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
          // Ordenar por rating desc, luego por cantidad de votos/reviews, luego por fecha
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
      container.innerHTML = '<p>No se pudieron cargar los juegos.</p>'
    }
  })()
})