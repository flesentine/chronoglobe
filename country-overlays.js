(() => {
  'use strict';

  const originalGlobe = window.Globe;
  if (typeof originalGlobe !== 'function') return;

  const LOCAL_COUNTRY_DATA = 'data/country-boundaries.geojson';
  const FALLBACK_COUNTRY_DATA = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
  const REFERENCE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
  let countryDataPromise = null;
  let countryDataState = 'idle';
  let countryDataSource = null;
  let countryDataError = null;

  const diagnostics = Object.freeze({
    getStatus: () => Object.freeze({
      state: countryDataState,
      source: countryDataSource,
      error: countryDataError ? String(countryDataError.message || countryDataError) : null,
      localUrl: LOCAL_COUNTRY_DATA,
      fallbackUrl: FALLBACK_COUNTRY_DATA
    })
  });
  window.ChronoMapAids = diagnostics;

  async function fetchCountryData() {
    if (countryDataPromise) return countryDataPromise;
    countryDataState = 'loading';
    countryDataPromise = (async () => {
      let lastError = null;
      for (const url of [LOCAL_COUNTRY_DATA, FALLBACK_COUNTRY_DATA]) {
        try {
          const response = await fetch(url, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const data = await response.json();
          if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length < 170) {
            throw new Error('Country boundary GeoJSON failed integrity checks');
          }
          countryDataState = 'ready';
          countryDataSource = url === LOCAL_COUNTRY_DATA ? 'local' : 'remote-fallback';
          countryDataError = null;
          return data;
        } catch (error) {
          lastError = error;
          console.warn(`ChronoGlobe could not load country boundaries from ${url}`, error);
        }
      }
      countryDataState = 'unavailable';
      countryDataSource = null;
      countryDataError = lastError || new Error('No country boundary source was available');
      throw countryDataError;
    })();
    return countryDataPromise;
  }

  window.Globe = () => host => {
    const globe = originalGlobe()(host);
    let requestedMode = 'medium';
    let installing = false;

    const setBadge = (message, isError = false) => {
      const badge = document.querySelector('.imagery-badge');
      if (!badge) return;
      badge.textContent = message || '';
      badge.classList.toggle('show', Boolean(message));
      badge.classList.toggle('overlay-error', isError);
    };

    const applyMode = mode => {
      requestedMode = mode || 'medium';
      if (!globe.map || !globe._loaded) return;
      const showBorders = requestedMode === 'easy' || requestedMode === 'medium';
      const showLabels = requestedMode === 'easy';
      if (globe.map.getLayer('country-borders')) globe.map.setLayoutProperty('country-borders', 'visibility', showBorders ? 'visible' : 'none');
      if (globe.map.getLayer('country-reference-labels')) globe.map.setLayoutProperty('country-reference-labels', 'visibility', showLabels ? 'visible' : 'none');
    };

    const installLayers = async () => {
      if (!globe.map || installing || countryDataState === 'unavailable') return;
      installing = true;
      try {
        if (!globe.map.getSource('country-boundaries')) {
          const countryData = await fetchCountryData();
          if (!globe.map || globe.map.getSource('country-boundaries')) return;
          globe.map.addSource('country-boundaries', { type: 'geojson', data: countryData, generateId: true });
          globe.map.addLayer({
            id: 'country-borders',
            type: 'line',
            source: 'country-boundaries',
            minzoom: 1.7,
            maxzoom: 11,
            layout: { visibility: 'visible' },
            paint: {
              'line-color': ['interpolate', ['linear'], ['zoom'], 1.7, 'rgba(220,245,255,0.26)', 4, 'rgba(220,245,255,0.40)', 8, 'rgba(220,245,255,0.56)'],
              'line-width': ['interpolate', ['linear'], ['zoom'], 1.7, 0.45, 5, 0.8, 9, 1.15],
              'line-blur': 0.15
            }
          });
        }

        if (!globe.map.getSource('country-reference')) {
          globe.map.addSource('country-reference', {
            type: 'raster',
            tiles: [REFERENCE_TILES],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 16,
            attribution: 'Reference boundaries and places © Esri'
          });
          globe.map.addLayer({
            id: 'country-reference-labels',
            type: 'raster',
            source: 'country-reference',
            minzoom: 2.1,
            maxzoom: 9.5,
            layout: { visibility: 'none' },
            paint: {
              'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2.1, 0.62, 4.5, 0.78, 8.5, 0.68],
              'raster-fade-duration': 120
            }
          });
        }

        setBadge('', false);
        applyMode(requestedMode);
      } catch (error) {
        console.warn('ChronoGlobe map aids could not be installed', error);
        setBadge('Map aids unavailable — gameplay still works', true);
      } finally {
        installing = false;
      }
    };

    globe.setMapAidMode = mode => {
      applyMode(mode);
      return globe;
    };

    if (globe.map) {
      globe.map.on('error', event => {
        const message = String(event?.error?.message || '');
        if (message.includes('country-boundaries') || message.includes('World_Boundaries_and_Places') || message.includes('geojson')) {
          console.warn('ChronoGlobe map-aid resource failed', event.error);
          setBadge('Map aids unavailable — gameplay still works', true);
        }
      });
      if (globe._loaded) installLayers();
      else globe.map.on('load', installLayers);
      globe.map.on('styledata', () => {
        if (countryDataState !== 'unavailable' && globe._loaded && (!globe.map.getSource('country-boundaries') || !globe.map.getSource('country-reference'))) installLayers();
      });
    }

    return globe;
  };
})();