async function searchOnline(query, target = 'search') {
  const status = target === 'discover'
    ? $('discoverStatus')
    : $('searchStatus');

  const container = target === 'discover'
    ? $('discoverList')
    : $('searchResults');

  if (!query.trim()) return;

  status.textContent = 'Searching free music...';

  try {
    const safeQuery = query.replace(/["\\]/g, ' ').trim();

    const api = new URL(
      'https://archive.org/advancedsearch.php'
    );

    api.searchParams.set(
      'q',
      `mediatype:audio AND collection:opensource_audio AND (title:"${safeQuery}" OR creator:"${safeQuery}")`
    );

    api.searchParams.append('fl[]', 'identifier');
    api.searchParams.append('fl[]', 'title');
    api.searchParams.append('fl[]', 'creator');
    api.searchParams.set('rows', '25');
    api.searchParams.set('page', '1');
    api.searchParams.set('output', 'json');

    const response = await fetch(api);

    if (!response.ok) {
      throw new Error('Music search failed');
    }

    const data = await response.json();

    const docs = data.response?.docs || [];

    const results = await Promise.all(
      docs.map(async item => {
        try {
          const metaResponse = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`
          );

          if (!metaResponse.ok) return null;

          const metadata = await metaResponse.json();

          const license = metadata.metadata?.licenseurl || '';

          if (
            license &&
            !/creativecommons.org|publicdomain/i.test(license)
          ) {
            return null;
          }

          const files = metadata.files || [];

          const audioFile = files.find(file =>
            /\.(mp3|ogg|flac)$/i.test(file.name || '') &&
            !file.name.includes('__ia_thumb')
          );

          if (!audioFile) return null;

          return {
            id: 'archive_' + item.identifier,
            name: item.title || 'Unknown track',
            artist: item.creator || 'Independent Artist',
            artwork: '',
            url:
              'https://archive.org/download/' +
              encodeURIComponent(item.identifier) +
              '/' +
              audioFile.name.split('/').map(encodeURIComponent).join('/'),
            online: true
          };

        } catch (error) {
          return null;
        }
      })
    );

    const playable = results.filter(Boolean);

    if (target === 'discover') {
      discoverResults = playable;
    } else {
      onlineResults = playable;
    }

    renderSongList(
      container,
      playable,
      'No playable music found. Try another search.'
    );

    status.textContent = playable.length
      ? playable.length + ' free audio tracks found.'
      : 'No playable tracks found. Try another search.';

  } catch (error) {
    status.textContent = 'Music loading failed. Check internet.';
    container.innerHTML = '';
    toast('Music search failed');
  }
}
