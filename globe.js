(() => {
  'use strict';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const DEG = Math.PI / 180;

  function resolveValue(value, fallback) {
    try {
      return typeof value === 'function' ? value() : (value ?? fallback);
    } catch (_) {
      return fallback;
    }
  }

  function latLngVector(lat, lng) {
    const p = lat * DEG;
    const l = lng * DEG;
    const cp = Math.cos(p);
    return { x: cp * Math.cos(l), y: cp * Math.sin(l), z: Math.sin(p) };
  }

  function normalize(v) {
    const m = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / m, y: v.y / m, z: v.z / m };
  }

  function vectorLatLng(v) {
    return {
      lat: Math.asin(clamp(v.z, -1, 1)) / DEG,
      lng: Math.atan2(v.y, v.x) / DEG
    };
  }

  function slerpVector(a, b, t) {
    const dot = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1);
    const omega = Math.acos(dot);
    if (omega < 0.00001) return a;
    const so = Math.sin(omega);
    const p = Math.sin((1 - t) * omega) / so;
    const q = Math.sin(t * omega) / so;
    return normalize({ x: p * a.x + q * b.x, y: p * a.y + q * b.y, z: p * a.z + q * b.z });
  }

  function emptyCollection() {
    return { type: 'FeatureCollection', features: [] };
  }

  function pointCollection(data) {
    return {
      type: 'FeatureCollection',
      features: (data || []).map((d, index) => ({
        type: 'Feature',
        id: index,
        properties: {
          color: String(resolveValue(d.color, '#ffffff')),
          radius: Number(resolveValue(d.radius, 0.4))
        },
        geometry: { type: 'Point', coordinates: [Number(d.lng), Number(d.lat)] }
      }))
    };
  }

  function arcCollection(data) {
    return {
      type: 'FeatureCollection',
      features: (data || []).map((d, index) => {
        const a = latLngVector(d.startLat, d.startLng);
        const b = latLngVector(d.endLat, d.endLng);
        const coordinates = [];
        let previousLng = null;
        let offset = 0;

        for (let i = 0; i <= 128; i++) {
          const ll = vectorLatLng(slerpVector(a, b, i / 128));
          let lng = ll.lng + offset;
          if (previousLng !== null) {
            const delta = lng - previousLng;
            if (delta > 180) { offset -= 360; lng -= 360; }
            else if (delta < -180) { offset += 360; lng += 360; }
          }
          coordinates.push([lng, ll.lat]);
          previousLng = lng;
        }

        return {
          type: 'Feature',
          id: index,
          properties: {},
          geometry: { type: 'LineString', coordinates }
        };
      })
    };
  }

  class TileGlobe {
    constructor(host) {
      this.host = host;
      this.host.innerHTML = '';
      this.host.style.position = 'absolute';
      this.host.style.inset = '0';
      this.host.style.overflow = 'hidden';

      this._points = [];
      this._rings = [];
      this._arcs = [];
      this._loaded = false;
      this._pendingCamera = null;
      this._lastFrame = performance.now();
      this._destroyed = false;

      this._controls = {
        autoRotate: true,
        autoRotateSpeed: 0.45,
        enableDamping: true,
        dampingFactor: 0.08,
        minDistance: 30,
        maxDistance: 1600
      };

      if (!window.maplibregl) {
        this.showError('Map engine could not load. Check the internet connection and refresh.');
        return;
      }

      this.map = new maplibregl.Map({
        container: this.host,
        style: {
          version: 8,
          sources: {
            imagery: {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 19,
              attribution: 'Imagery © Esri and imagery contributors'
            }
          },
          layers: [
            {
              id: 'satellite-imagery',
              type: 'raster',
              source: 'imagery',
              minzoom: 0,
              maxzoom: 24,
              paint: {
                'raster-fade-duration': 140,
                'raster-resampling': 'linear',
                'raster-saturation': 0.03,
                'raster-contrast': 0.06
              }
            }
          ]
        },
        center: [0, 20],
        zoom: 1.1,
        minZoom: 0.7,
        maxZoom: 19,
        pitch: 0,
        maxPitch: 0,
        bearing: 0,
        antialias: true,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: true,
        fadeDuration: 100
      });

      this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      this.map.on('load', () => {
        this._loaded = true;
        this.map.setProjection({ type: 'globe' });
        this.addGameLayers();
        this.syncAllData();
        if (this._pendingCamera) {
          const pending = this._pendingCamera;
          this._pendingCamera = null;
          this.pointOfView(pending.target, pending.duration);
        }
      });

      this.map.on('click', event => {
        if (this.clickHandler) this.clickHandler({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });

      const stopRotation = () => { this._controls.autoRotate = false; };
      this.map.on('dragstart', stopRotation);
      this.map.on('zoomstart', event => { if (event.originalEvent) stopRotation(); });
      this.map.on('mousedown', stopRotation);
      this.map.on('touchstart', stopRotation);

      const badge = document.querySelector('.imagery-badge');
      let badgeTimer = null;
      const showBadge = text => {
        if (!badge) return;
        clearTimeout(badgeTimer);
        badge.textContent = text;
        badge.dataset.mode = 'live';
        badge.classList.add('show');
        badgeTimer = setTimeout(() => badge.classList.remove('show'), 2200);
      };

      this.map.on('zoomend', () => {
        if (this.map.getZoom() >= 5) showBadge('High-resolution imagery');
      });

      this.map.on('error', event => {
        if (event && event.error) console.warn('ChronoGlobe map:', event.error.message || event.error);
      });

      requestAnimationFrame(time => this.frame(time));
    }

    showError(message) {
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;padding:30px;background:#06111f;color:#dff7ff;font:600 16px system-ui;text-align:center;';
      box.textContent = message;
      this.host.appendChild(box);
    }

    addGameLayers() {
      if (!this.map || !this._loaded) return;

      this.map.addSource('history-arcs', { type: 'geojson', data: emptyCollection() });
      this.map.addLayer({
        id: 'history-arcs-line',
        type: 'line',
        source: 'history-arcs',
        paint: {
          'line-color': '#65e9ff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 3.5, 19, 5],
          'line-opacity': 0.9,
          'line-dasharray': [2, 1.5],
          'line-blur': 0.4
        }
      });

      this.map.addSource('history-rings', { type: 'geojson', data: emptyCollection() });
      this.map.addLayer({
        id: 'history-rings-layer',
        type: 'circle',
        source: 'history-rings',
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': ['coalesce', ['get', 'color'], '#ffd166'],
          'circle-stroke-width': 2,
          'circle-opacity': 0.8,
          'circle-stroke-opacity': 0.8
        }
      });

      this.map.addSource('history-points', { type: 'geojson', data: emptyCollection() });
      this.map.addLayer({
        id: 'history-points-layer',
        type: 'circle',
        source: 'history-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 7, 8, 8, 14, 6, 19, 4],
          'circle-color': ['coalesce', ['get', 'color'], '#ffffff'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 0, 1.7, 19, 1],
          'circle-opacity': 0.96,
          'circle-blur': 0.05
        }
      });
    }

    syncAllData() {
      this.updateSource('history-points', pointCollection(this._points));
      this.updateSource('history-rings', pointCollection(this._rings));
      this.updateSource('history-arcs', arcCollection(this._arcs));
    }

    updateSource(id, data) {
      if (!this.map || !this._loaded) return;
      const source = this.map.getSource(id);
      if (source && typeof source.setData === 'function') source.setData(data);
    }

    backgroundColor() { return this; }
    globeImageUrl() { return this; }
    bumpImageUrl() { return this; }
    showAtmosphere() { return this; }
    atmosphereColor() { return this; }
    atmosphereAltitude() { return this; }
    pointLat() { return this; }
    pointLng() { return this; }
    pointAltitude() { return this; }
    pointRadius() { return this; }
    pointColor() { return this; }
    ringLat() { return this; }
    ringLng() { return this; }
    ringColor() { return this; }
    ringMaxRadius() { return this; }
    ringPropagationSpeed() { return this; }
    ringRepeatPeriod() { return this; }
    arcStartLat() { return this; }
    arcStartLng() { return this; }
    arcEndLat() { return this; }
    arcEndLng() { return this; }
    arcColor() { return this; }
    arcAltitudeAutoScale() { return this; }
    arcStroke() { return this; }
    arcDashLength() { return this; }
    arcDashGap() { return this; }
    arcDashAnimateTime() { return this; }

    controls() { return this._controls; }
    onGlobeClick(fn) { this.clickHandler = fn; return this; }

    pointsData(data) {
      if (!arguments.length) return this._points;
      this._points = data || [];
      this.updateSource('history-points', pointCollection(this._points));
      return this;
    }

    ringsData(data) {
      if (!arguments.length) return this._rings;
      this._rings = data || [];
      this.updateSource('history-rings', pointCollection(this._rings));
      return this;
    }

    arcsData(data) {
      if (!arguments.length) return this._arcs;
      this._arcs = data || [];
      this.updateSource('history-arcs', arcCollection(this._arcs));
      return this;
    }

    width() {
      if (this.map) requestAnimationFrame(() => this.map.resize());
      return this;
    }

    height() {
      if (this.map) requestAnimationFrame(() => this.map.resize());
      return this;
    }

    pointOfView(target, duration = 0) {
      if (!this.map || !this._loaded) {
        this._pendingCamera = { target, duration };
        return this;
      }
      const altitude = target.altitude ?? 1;
      const targetZoom = clamp(1.2 / altitude, 0.7, 19);
      const options = {
        center: [target.lng ?? this.map.getCenter().lng, target.lat ?? this.map.getCenter().lat],
        zoom: targetZoom,
        pitch: 0,
        bearing: 0,
        duration: Math.max(0, duration),
        essential: true
      };
      if (duration) this.map.flyTo(options);
      else this.map.jumpTo(options);
      return this;
    }

    zoomBy(factor, duration = 220) {
      if (!this.map) return this;
      const delta = Math.log2(Math.max(0.05, factor)) * 2.0;
      const targetZoom = clamp(this.map.getZoom() + delta, 0.7, 19);
      this.map.easeTo({ zoom: targetZoom, duration, essential: true });
      return this;
    }

    frame(now) {
      if (this._destroyed) return;
      const dt = Math.min(50, now - this._lastFrame);
      this._lastFrame = now;
      if (this.map && this._loaded && this._controls.autoRotate && !this.map.isMoving() && this.map.getZoom() < 3.2) {
        const center = this.map.getCenter();
        this.map.setCenter([center.lng - this._controls.autoRotateSpeed * dt * 0.0038, center.lat]);
      }
      if (this.map && this._loaded && this.map.getLayer('history-rings-layer') && this._rings.length) {
        const phase = (now % 1000) / 1000;
        const base = 10 + phase * 22;
        this.map.setPaintProperty('history-rings-layer', 'circle-radius', base);
        this.map.setPaintProperty('history-rings-layer', 'circle-opacity', 1 - phase);
        this.map.setPaintProperty('history-rings-layer', 'circle-stroke-opacity', 1 - phase);
      }
      requestAnimationFrame(time => this.frame(time));
    }
  }

  window.Globe = () => host => new TileGlobe(host);
})();