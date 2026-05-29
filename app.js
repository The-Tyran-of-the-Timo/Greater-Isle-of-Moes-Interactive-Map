// to run: python -m http.server
// to open: http://localhost:8000

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm'
      }
    ]
  },
  center: [-117.3, -50.9], // island centre
  zoom: 7
});


// -------------------------
// SAFE GEOJSON LOADER
// -------------------------
async function loadJSON(path) {
  const res = await fetch(path);

  if (!res.ok) {
    throw new Error(`❌ Failed to load ${path} (${res.status})`);
  }

  return res.json();
}

// -------------------------
// TOGGLE FUNCTION
// -------------------------

function toggleLayer(layerId, visible) {
  map.setLayoutProperty(
    layerId,
    'visibility',
    visible ? 'visible' : 'none'
  );
}

// -------------------------
// MAIN MAP LOGIC
// -------------------------
map.on('load', async () => {

  try {

    // -------------------------
    // LOAD DATA
    // -------------------------
    const coords = await loadJSON('data/GIM_coords.geojson');
    const elevation = await loadJSON('data/GIM_elevation.geojson');
    const outline = await loadJSON('data/GIM_outline_box.geojson');
    const parks = await loadJSON('data/GIM_Parks.geojson');
    const poi = await loadJSON('data/GIM_POI.geojson');
    const river = await loadJSON('data/GIM_river.geojson');

    console.log("✅ All files loaded successfully");

    // -------------------------
    // SOURCES
    // -------------------------
    map.addSource('coords', { type: 'geojson', data: coords });
    map.addSource('elevation', { type: 'geojson', data: elevation });
    map.addSource('outline', { type: 'geojson', data: outline });
    map.addSource('parks', { type: 'geojson', data: parks });
    map.addSource('poi', { type: 'geojson', data: poi });
    map.addSource('river', { type: 'geojson', data: river });

    // -------------------------
    // LAYERS
    // -------------------------

    // Outline
    map.addLayer({
      id: 'outline-layer',
      type: 'line',
      source: 'outline',
      paint: {
        'line-color': '#000000',
        'line-width': 2
      }
    });

    // Parks
    map.addLayer({
      id: 'parks-layer',
      type: 'fill',
      source: 'parks',
      paint: {
        'fill-color': '#4CAF50',
        'fill-opacity': 0.4
      }
    });

    // Rivers
    map.addLayer({
      id: 'river-layer',
      type: 'line',
      source: 'river',
      paint: {
        'line-color': '#1E88E5',
        'line-width': 2
      }
    });

    // Elevation
    map.addLayer({
      id: 'elevation-layer',
      type: 'fill',
      source: 'elevation',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#d9f0ff',
          100, '#74c0fc',
          300, '#339af0',
          600, '#1c7ed6'
        ],
        'fill-opacity': 0.5
      }
    });

    // POIs
    map.addLayer({
      id: 'poi-layer',
      type: 'circle',
      source: 'poi',
      paint: {
        'circle-radius': 5,
        'circle-color': '#ff5722'
      }
    });
    map.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: 'poi',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
      }
    });
    // -------------------------
    // INTERACTIVITY (POIs)
    // -------------------------
    map.on('click', (e) => {

      const features = map.queryRenderedFeatures(e.point);

      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties;

      let html = '<div style="font-family:sans-serif; font-size:12px;">';

      for (const key in props) {
        html += `<div><b>${key}:</b> ${props[key]}</div>`;
      }

      html += '</div>';

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    

      html += '</div>';

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    map.on('mouseenter', 'poi-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'poi-layer', () => {
      map.getCanvas().style.cursor = '';
    });

  } catch (err) {
    console.error("❌ MAP LOADING ERROR:", err);
  }

});

// to run: python -m http.server
// to open: http://localhost:8000