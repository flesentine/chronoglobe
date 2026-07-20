(() => {
  'use strict';

  const originalGlobe = window.Globe;
  if (typeof originalGlobe !== 'function') return;

  const COUNTRY_DATA = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
  const REFERENCE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  window.Globe = () => host => {
    const globe = originalGlobe()(host);
    let requestedMode = 'medium';

    const applyMode = mode => {
      requestedMode = mode || 'medium';
      if (!globe.map || !globe._loaded) return;

      const showBorders = requestedMode === 'easy' || requestedMode === 'medium';
      const showLabels = requestedMode === 'easy';

      if (globe.map.getLayer('country-borders')) {
        globe.map.setLayoutProperty('country-borders', 'visibility', showBorders ? 'visible' : 'none');
      }
      if (globe.map.getLayer('country-reference-labels')) {
        globe.map.setLayoutProperty('country-reference-labels', 'visibility', showLabels ? 'visible' : 'none');
      }
    };

    const installLayers = () => {
      if (!globe.map) return;

      if (!globe.map.getSource('country-boundaries')) {
        globe.map.addSource('country-boundaries', {
          type: 'geojson',
          data: COUNTRY_DATA,
          generateId: true
        });

        globe.map.addLayer({
          id: 'country-borders',
          type: 'line',
          source: 'country-boundaries',
          minzoom: 1.7,
          maxzoom: 11,
          layout: { visibility: 'visible' },
          paint: {
            'line-color': [
              'interpolate', ['linear'], ['zoom'],
              1.7, 'rgba(220,245,255,0.26)',
              4, 'rgba(220,245,255,0.40)',
              8, 'rgba(220,245,255,0.56)'
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              1.7, 0.45,
              5, 0.8,
              9, 1.15
            ],
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
            'raster-opacity': [
              'interpolate', ['linear'], ['zoom'],
              2.1, 0.62,
              4.5, 0.78,
              8.5, 0.68
            ],
            'raster-fade-duration': 120
          }
        });
      }

      applyMode(requestedMode);
    };

    globe.setMapAidMode = mode => {
      applyMode(mode);
      return globe;
    };

    if (globe.map) {
      if (globe._loaded) installLayers();
      else globe.map.on('load', installLayers);
      globe.map.on('styledata', () => {
        if (globe._loaded && (!globe.map.getSource('country-boundaries') || !globe.map.getSource('country-reference'))) {
          installLayers();
        }
      });
    }

    return globe;
  };
})();