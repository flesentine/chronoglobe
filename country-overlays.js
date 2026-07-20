(() => {
  'use strict';

  const originalGlobe = window.Globe;
  if (typeof originalGlobe !== 'function') return;

  const COUNTRY_DATA = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

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
      if (globe.map.getLayer('country-labels')) {
        globe.map.setLayoutProperty('country-labels', 'visibility', showLabels ? 'visible' : 'none');
      }
    };

    const installLayers = () => {
      if (!globe.map || globe.map.getSource('country-boundaries')) {
        applyMode(requestedMode);
        return;
      }

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
            1.7, 'rgba(220,245,255,0.28)',
            4, 'rgba(220,245,255,0.42)',
            8, 'rgba(220,245,255,0.58)'
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

      globe.map.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'country-boundaries',
        minzoom: 2.3,
        maxzoom: 7.2,
        layout: {
          visibility: 'none',
          'symbol-placement': 'point',
          'text-field': [
            'coalesce',
            ['get', 'ADMIN'],
            ['get', 'name'],
            ['get', 'NAME']
          ],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            2.3, 10,
            4.5, 12,
            7, 14
          ],
          'text-font': ['Open Sans Semibold'],
          'text-letter-spacing': 0.04,
          'text-max-width': 8,
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': 'rgba(242,250,255,0.92)',
          'text-halo-color': 'rgba(2,8,18,0.9)',
          'text-halo-width': 1.4,
          'text-halo-blur': 0.5
        }
      });

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
        if (globe._loaded && !globe.map.getSource('country-boundaries')) installLayers();
      });
    }

    return globe;
  };
})();