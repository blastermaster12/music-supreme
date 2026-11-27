const $ = id => document.getElementById(id);

const audio = $('audio');

let tracks = [];
let current = -1;
let liked = new Set();
let shuffle = false;
let repeat = 0;
let activeTab = 'all';
let toastTimer;
let searchTimer;
let onlineResults = [];
let discoverResults = [];

function toast(message) {
  const el = $('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2300);
}

function fmt(n) {
  if (!Number.isFinite(n)) return '0:00';

  return Math.floor(n / 60) + ':' +
    String(Math.floor(n % 60)).padStart(2, '0');
}

function persist() {
  try {
    localStorage.setItem('ms_liked', JSON.stringify([...liked]));
  } catch (e) {}
}

function loadLikes() {
  try {
    liked = new Set(
      JSON.parse(localStorage.getItem('ms_liked') || '[]')
    );
  } catch (e) {
    liked = new Set();
  }
}

function toggleLike(track) {
  if (liked.has(track.id)) {
    liked.delete(track.id);
  } else {
    liked.add(track.id);
  }

  persist();
  renderAll();
  updatePlayer();
}

function createSongRow(track, onPlay) {
  const row = document.createElement('div');
  row.className = 'song-row';

  const art = document.createElement('div');
  art.className = 'song-art';

  if (track.artwork) {
    const img = document.createElement('img');
    img.src = track.artwork;
    img.alt = '';
    img.loading = 'lazy';
    art.appendChild(img);
  } else {
    art.textContent = '♫';
  }

  const meta = document.createElement('div');
  meta.className = 'song-meta';

  const title = document.createElement('b');
  title.textContent = track.name;

  const artist = document.createElement('small');
  artist.textContent =
    track.artist + (track.online ? ' • Online preview' : '');

  meta.append(title, artist);

  const like = document.createElement('button');
  like.textContent = liked.has(track.id) ? '♥' : '♡';

  like.onclick = event => {
    event.stopPropagation();
    toggleLike(track);
  };

  const play = document.createElement('button');
  play.textContent = '▶';
  play.onclick = onPlay;

  row.append(art, meta, like, play);

  return row;
}

function renderSongList(element, list, emptyMessage) {
  if (!element) return;

  element.innerHTML = '';

  if (!list.length) {
    element.className = 'song-list empty-state';
    element.textContent = emptyMessage;
    return;
  }

  element.className = 'song-list';

  list.forEach(track => {
    element.appendChild(
      createSongRow(track, () => playTrack(track))
    );
  });
}

function renderAll() {
  renderSongList(
    $('quickPicks'),
    tracks.slice(0, 6),
    'Add music from your phone to start listening.'
  );

  const libraryTracks = activeTab === 'liked'
    ? tracks.filter(t => liked.has(t.id))
    : tracks;

  renderSongList(
    $('libraryList'),
    libraryTracks,
    activeTab === 'liked'
      ? 'No liked songs yet.'
      : 'Your library is empty.'
  );

  runLocalSearch();
}

function runLocalSearch() {
  const input = $('searchInput');
  if (!input) return;

  const q = input.value.trim().toLowerCase();

  if (!q) {
    renderSongList(
      $('searchResults'),
      [],
      'Search songs, artists or albums.'
    );
    return;
  }

  const local = tracks.filter(t =>
    (t.name + ' ' + t.artist).toLowerCase().includes(q)
  );

  renderSongList(
    $('searchResults'),
    [...local, ...onlineResults],
    'No matching songs found.'
  );
}

async function searchOnline(query, target = 'search') {
  const status = target === 'discover'
    ? $('discoverStatus')
    : $('searchStatus');

  const container = target === 'discover'
    ? $('discoverList')
    : $('searchResults');

  if (!query.trim()) return;

  if (status) {
    status.textContent = 'Searching worldwide music...';
  }

  try {
    const country = $('countrySelect')?.value || 'IN';

    const url = new URL('https://itunes.apple.com/search');

    url.searchParams.set('term', query);
    url.searchParams.set('media', 'music');
    url.searchParams.set('entity', 'song');
    url.searchParams.set('limit', '35');
    url.searchParams.set('country', country);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Search unavailable');
    }

    const data = await response.json();

    const results = (data.results || [])
      .filter(item => item.previewUrl)
      .map(item => ({
        id: 'online_' + item.trackId,
        name: item.trackName || 'Unknown song',
        artist: item.artistName || 'Unknown artist',
        album: item.collectionName || '',
        artwork: (item.artworkUrl100 || '')
          .replace('100x100', '500x500'),
        url: item.previewUrl,
        online: true
      }));

    if (target === 'discover') {
      discoverResults = results;
    } else {
      onlineResults = results;
    }

    renderSongList(
      container,
      results,
      'No playable previews found for this search.'
    );

    if (status) {
      status.textContent = results.length
        ? results.length + ' playable previews found.'
        : 'No playable previews found. Try another search or country.';
    }

  } catch (error) {
    if (status) {
      status.textContent =
        'Could not load music. Check your internet connection.';
    }

    if (container) container.innerHTML = '';

    toast('Online search failed');
  }
}

function playTrack(track) {
  if (!track || !track.url) {
    toast('Track unavailable');
    return;
  }

  let index = tracks.findIndex(t => t.id === track.id);

  if (index === -1) {
    tracks.push(track);
    index = tracks.length - 1;
  }

  current = index;

  audio.src = track.url;
  audio.load();

  audio.play()
    .then(() => toast('Now playing'))
    .catch(() => toast('Unable to play this track'));

  updatePlayer();
  renderAll();
}

function updatePlayer() {
  if (current < 0 || !tracks[current]) return;

  const track = tracks[current];

  $('miniPlayer')?.classList.remove('hidden');

  $('miniTitle').textContent = track.name;
  $('miniArtist').textContent = track.artist;

  $('playerTitle').textContent = track.name;
  $('playerArtist').textContent = track.artist;

  $('likeBtn').textContent =
    liked.has(track.id) ? '♥' : '♡';

  $('miniPlay').textContent = audio.paused ? '▶' : 'Ⅱ';
  $('playBtn').textContent = audio.paused ? '▶' : 'Ⅱ';

  $('miniArt').innerHTML = '';
  $('playerArt').innerHTML = '';

  if (track.artwork) {
    const mini = document.createElement('img');
    mini.src = track.artwork;

    $('miniArt').appendChild(mini);

    const large = document.createElement('img');
    large.src = track.artwork;

    $('playerArt').appendChild(large);
  } else {
    $('miniArt').textContent = '♫';
    $('playerArt').textContent = '♫';
  }

  $('queueLabel').textContent =
    track.online ? 'ONLINE PREVIEW' : 'LOCAL MUSIC';
}

function togglePlay() {
  if (current < 0) {
    if (tracks.length) {
      playTrack(tracks[0]);
    } else {
      toast('Search or import music first');
    }
    return;
  }

  if (audio.paused) {
    audio.play().catch(() => toast('Unable to play'));
  } else {
    audio.pause();
  }
}

function next() {
  if (!tracks.length) return;

  let index;

  if (shuffle && tracks.length > 1) {
    do {
      index = Math.floor(Math.random() * tracks.length);
    } while (index === current);
  } else {
    index = (current + 1) % tracks.length;
  }

  playTrack(tracks[index]);
}

function prev() {
  if (!tracks.length) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  playTrack(
    tracks[(current - 1 + tracks.length) % tracks.length]
  );
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.id === id);
  });

  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.page === id);
  });
}

/* ADD MUSIC */

$('pickMusic').onclick = () => {
  $('fileInput').click();
};

/* IMPORT LOCAL MUSIC */

$('fileInput').onchange = event => {
  const files = [...event.target.files];

  files.forEach(file => {
    const id = [
      file.name,
      file.size,
      file.lastModified
    ].join('_');

    if (!tracks.some(t => t.id === id)) {
      tracks.push({
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        artist: 'On this device',
        url: URL.createObjectURL(file),
        online: false
      });
    }
  });

  renderAll();

  toast(files.length + ' file(s) added');

  event.target.value = '';
};

/* BOTTOM NAVIGATION */

document.querySelectorAll('.nav-item').forEach(button => {
  button.onclick = () => {
    showPage(button.dataset.page);
  };
});

/* PROFILE */

$('profileBtn').onclick = () => {
  showPage('profilePage');
};

/* PLAYER BUTTONS */

$('miniPlay').onclick = togglePlay;

$('openPlayer').onclick = () => {
  $('playerOverlay').classList.remove('hidden');
};

$('closePlayer').onclick = () => {
  $('playerOverlay').classList.add('hidden');
};

$('playBtn').onclick = togglePlay;
$('prevBtn').onclick = prev;
$('nextBtn').onclick = next;

/* SHUFFLE */

$('shuffleBtn').onclick = () => {
  shuffle = !shuffle;

  $('shuffleBtn').style.opacity =
    shuffle ? '1' : '.5';

  toast(shuffle ? 'Shuffle on' : 'Shuffle off');
};

/* REPEAT */

$('repeatBtn').onclick = () => {
  repeat = (repeat + 1) % 3;

  $('repeatBtn').textContent =
    repeat === 1 ? '↻1' : '↻';

  toast([
    'Repeat off',
    'Repeat one',
    'Repeat all'
  ][repeat]);
};

/* LIKE */

$('likeBtn').onclick = () => {
  if (current >= 0) {
    toggleLike(tracks[current]);
  }
};

/* SEEK BAR */

$('seekBar').oninput = event => {
  if (Number.isFinite(audio.duration)) {
    audio.currentTime =
      audio.duration * event.target.value / 100;
  }
};

audio.ontimeupdate = () => {
  if (Number.isFinite(audio.duration)) {
    $('seekBar').value =
      audio.currentTime / audio.duration * 100;

    $('currentTime').textContent = fmt(audio.currentTime);
    $('duration').textContent = fmt(audio.duration);
  }
};

audio.onplay = updatePlayer;
audio.onpause = updatePlayer;

/* TRACK ENDED */

audio.onended = () => {
  if (repeat === 1) {
    audio.currentTime = 0;
    audio.play();
  } else if (current < tracks.length - 1 || repeat === 2) {
    next();
  } else {
    updatePlayer();
  }
};

/* SEARCH */

$('searchInput').oninput = () => {
  clearTimeout(searchTimer);

  const query = $('searchInput').value.trim();

  onlineResults = [];

  runLocalSearch();

  if (query.length < 2) {
    $('searchStatus').textContent = 'Search worldwide music.';
    return;
  }

  searchTimer = setTimeout(() => {
    searchOnline(query);
  }, 650);
};

/* COUNTRY SELECT */

$('countrySelect').onchange = () => {
  const query = $('searchInput').value.trim();

  if (query.length >= 2) {
    searchOnline(query);
  }
};

/* LIBRARY TABS */

document.querySelectorAll('.tab').forEach(button => {
  button.onclick = () => {
    activeTab = button.dataset.tab;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });

    renderAll();
  };
});

/* DISCOVER CATEGORIES */

document.querySelectorAll('[data-query]').forEach(button => {
  button.onclick = () => {
    const query = button.dataset.query;

    showPage('discoverPage');
    searchOnline(query, 'discover');
  };
});

/* PLAYER SWIPE */

let startY = 0;

$('playerOverlay').addEventListener('touchstart', event => {
  startY = event.touches[0].clientY;
}, { passive: true });

$('playerOverlay').addEventListener('touchend', event => {
  const difference =
    event.changedTouches[0].clientY - startY;

  if (Math.abs(difference) > 70) {
    if (difference < 0) {
      next();
    } else {
      prev();
    }
  }
}, { passive: true });

/* INITIALIZE */

loadLikes();
renderAll();

toast('MUSIC SUPREME ready!');
