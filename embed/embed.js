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
  var loading = false, queue = [];
  function ensure(cb) {
    if (window.maplibregl) return cb();
    queue.push(cb);
    if (loading) return; loading = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = BASE + '/vendor/maplibre-gl.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = BASE + '/vendor/maplibre-gl.js';
    js.onload = function () { queue.splice(0).forEach(function (f) { f(); }); };
    document.head.appendChild(js);
  }
  function styleUrl(s) {
    if (s === 'sat' || s === 'satellite' || s === 'hybrid') return BASE + '/styles/hybrid/style.json';
    if (s === 'satellite-puro') return BASE + '/styles/satellite/style.json';
    return BASE + '/styles/liberty/style.json';
  }
  var TeleHostMap = {
    base: BASE,
    /** Crea un mapa. Devuelve una Promise con la instancia MapLibre. */
    create: function (target, opts) {
      opts = opts || {};
      var el = typeof target === 'string' ? document.getElementById(target) : target;
      return new Promise(function (resolve) {
        ensure(function () {
          var center = opts.center || [-70.2072, 8.6231];
          var map = new maplibregl.Map({
            container: el, style: styleUrl(opts.style),
            center: center, zoom: opts.zoom || 13,
            attributionControl: false,
            interactive: opts.interactive !== false
          });
          map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap · Esri · TeleHost Maps' }));
          if (opts.controls !== false) map.addControl(new maplibregl.NavigationControl());
          if (opts.geolocate) map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }));
          if (opts.marker) {
            var at = Array.isArray(opts.marker) ? opts.marker : center;
            var m = new maplibregl.Marker({ color: '#FB3A0A' }).setLngLat(at);
            if (opts.popup) m.setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(opts.popup));
            m.addTo(map); if (opts.popup) m.togglePopup();
            map._thMarker = m;
          }
          map.on('load', function () { if (opts.onReady) opts.onReady(map); resolve(map); });
        });
      });
    },
    /** Geocoding: texto -> resultados [{display_name,lat,lon,...}] */
    geocode: function (query, o) {
      o = o || {};
      var u = BASE + '/geocode/search?format=jsonv2&countrycodes=' + (o.countries || 've,co') +
        '&accept-language=es&limit=' + (o.limit || 6) + '&q=' + encodeURIComponent(query);
      return fetch(u).then(function (r) { return r.json(); });
    },
    /** Reverse: coord -> dirección */
    reverse: function (lat, lon) {
      return fetch(BASE + '/geocode/reverse?format=jsonv2&accept-language=es&lat=' + lat + '&lon=' + lon).then(function (r) { return r.json(); });
    },
    /** Ruta entre 2 puntos [lng,lat]. country: 've'|'co' (default auto por bbox). */
    route: function (from, to, country) {
      var cc = country || (from[0] <= -70 && from[1] <= 8 || from[0] < -73 ? 'co' : 've');
      var u = BASE + '/route/' + cc + '/route/v1/driving/' + from[0] + ',' + from[1] + ';' + to[0] + ',' + to[1] + '?overview=full&geometries=geojson';
      return fetch(u).then(function (r) { return r.json(); });
    }
  };
  window.TeleHostMap = TeleHostMap;
})();
