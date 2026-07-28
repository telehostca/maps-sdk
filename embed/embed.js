/*! TeleHost Maps embed widget — https://maps.telehost.net
 *  Uso:
 *    <div id="mapa" style="height:400px"></div>
 *    <script src="https://maps.telehost.net/embed.js"></script>
 *    <script>TeleHostMap.create('mapa',{center:[-70.20,8.62],zoom:14,marker:true,popup:'Mi tienda'});</script>
 */
(function () {
  var BASE = (function () {
    try { return new URL(document.currentScript.src).origin; } catch (e) { return 'https://maps.telehost.net'; }
  })();
  // el estado del cargador va en window: si la pagina incluye embed.js dos veces,
  // cada closure tendria su propio flag y se cargaria maplibre dos veces
  var W = window;
  W.__thMaps = W.__thMaps || { loading: false, queue: [], failed: null };
  function ensure(cb, onErr) {
    var S = W.__thMaps;
    if (W.maplibregl) return cb();
    if (S.failed) return onErr(S.failed);
    S.queue.push({ ok: cb, err: onErr });
    if (S.loading) return; S.loading = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = BASE + '/vendor/maplibre-gl.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = BASE + '/vendor/maplibre-gl.js';
    js.onload = function () { S.queue.splice(0).forEach(function (f) { f.ok(); }); };
    // sin esto, un 404/CSP/adblock dejaba la Promise colgada para siempre
    js.onerror = function () {
      S.loading = false;
      S.failed = new Error('TeleHostMap: no se pudo cargar maplibre-gl.js desde ' + BASE);
      S.queue.splice(0).forEach(function (f) { f.err(S.failed); });
    };
    document.head.appendChild(js);
  }
  function styleUrl(s) {
    if (s === 'sat' || s === 'satellite' || s === 'hybrid') return BASE + '/styles/hybrid/style.json';
    if (s === 'satellite-puro') return BASE + '/styles/satellite/style.json';
    if (s === 'liberty') return BASE + '/styles/liberty/style.json';
    return BASE + '/styles/telehost/style.json'; // default: estilo de marca
  }
  // Paises: la fuente de verdad es GET /api/biz/config/countries; lo de abajo
  // es solo el FALLBACK para que el widget nunca dependa de ese endpoint.
  // La deteccion usa la linea de frontera real VE/CO, no el centro mas cercano.
  var PAISES = {
    "default": 've',
    paises: [
      { cc: 've', bbox: [-73.4, 0.6, -59.8, 12.3] },
      { cc: 'co', bbox: [-79.1, -4.3, -66.8, 13.5] }
    ],
    frontera_ve_co: { puntos: [[12.2,-71.30],[11.0,-72.05],[10.0,-72.55],[9.3,-73.00],[8.5,-72.65],
      [8.0,-72.45],[7.8,-72.35],[7.4,-72.05],[7.0,-71.60],[6.8,-71.20],[6.5,-70.20],[6.3,-68.50],
      [6.15,-67.85],[4.0,-67.85],[2.5,-67.30],[1.2,-66.85]] }
  };
  try {
    fetch(BASE + '/api/biz/config/countries').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.paises && d.frontera_ve_co) PAISES = d; })
      .catch(function () {});
  } catch (e) {}
  function lonFrontera(lat) {
    var P = PAISES.frontera_ve_co.puntos;
    if (lat >= P[0][0]) return P[0][1];
    if (lat <= P[P.length - 1][0]) return P[P.length - 1][1];
    for (var i = 0; i < P.length - 1; i++) {
      var la1 = P[i][0], lo1 = P[i][1], la2 = P[i + 1][0], lo2 = P[i + 1][1];
      if (lat <= la1 && lat >= la2) return lo1 + ((la1 - lat) / (la1 - la2)) * (lo2 - lo1);
    }
    return P[Math.floor(P.length / 2)][1];
  }
  function countryFor(lng, lat) {
    var dentro = PAISES.paises.filter(function (p) {
      return lng >= p.bbox[0] && lng <= p.bbox[2] && lat >= p.bbox[1] && lat <= p.bbox[3];
    });
    if (dentro.length === 1) return dentro[0].cc;
    if (dentro.length > 1) return lng > lonFrontera(lat) ? 've' : 'co';
    return PAISES['default'];
  }
  function asJson(r) { if (!r.ok) throw new Error('TeleHostMap: HTTP ' + r.status); return r.json(); }
  var TeleHostMap = {
    base: BASE,
    countryFor: countryFor,
    /** Crea un mapa. Devuelve una Promise con la instancia MapLibre. */
    create: function (target, opts) {
      opts = opts || {};
      return new Promise(function (resolve, reject) {
        var el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) return reject(new Error('TeleHostMap: contenedor no encontrado: ' + target));
        ensure(function () {
          try {
            var center = opts.center || [-70.2072, 8.6231];
            var map = new maplibregl.Map({
              container: el, style: styleUrl(opts.style),
              center: center, zoom: opts.zoom != null ? opts.zoom : 13,
              attributionControl: false,
              interactive: opts.interactive !== false
            });
            map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap · Esri · TeleHost Maps' }));
            if (opts.controls !== false) map.addControl(new maplibregl.NavigationControl());
            if (opts.geolocate) map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }));
            if (opts.marker) {
              var at = Array.isArray(opts.marker) ? opts.marker : center;
              var m = new maplibregl.Marker({ color: '#FB3A0A' }).setLngLat(at);
              // setHTML a proposito: `popup` es contenido del propio sitio que embebe
              if (opts.popup) m.setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(opts.popup));
              m.addTo(map); if (opts.popup) m.togglePopup();
              map._thMarker = m;
            }
            map.on('error', function (e) { if (e && e.error) console.warn('[TeleHostMap]', e.error.message || e.error); });
            map.on('load', function () { if (opts.onReady) opts.onReady(map); resolve(map); });
          } catch (e) { reject(e); }
        }, reject);
      });
    },
    /** Libera el mapa y su marcador (llamar antes de quitar el contenedor del DOM). */
    destroy: function (map) {
      if (!map) return;
      try { if (map._thMarker) map._thMarker.remove(); map.remove(); } catch (e) {}
    },
    /** Geocoding: texto -> resultados [{display_name,lat,lon,...}] */
    geocode: function (query, o) {
      o = o || {};
      var u = BASE + '/geocode/search?format=jsonv2&countrycodes=' + (o.countries || 've,co') +
        '&accept-language=es&limit=' + (o.limit != null ? o.limit : 6) + '&q=' + encodeURIComponent(query);
      return fetch(u).then(asJson);
    },
    /** Reverse: coord -> dirección */
    reverse: function (lat, lon) {
      return fetch(BASE + '/geocode/reverse?format=jsonv2&accept-language=es&lat=' + lat + '&lon=' + lon).then(asJson);
    },
    /** Ruta entre 2 puntos [lng,lat]. country: 've'|'co' (default auto por bbox). */
    route: function (from, to, country) {
      var cc = country || countryFor(from[0], from[1]);
      var u = BASE + '/route/' + cc + '/route/v1/driving/' + from[0] + ',' + from[1] + ';' + to[0] + ',' + to[1] + '?overview=full&geometries=geojson';
      return fetch(u).then(asJson);
    }
  };
  window.TeleHostMap = TeleHostMap;
})();
