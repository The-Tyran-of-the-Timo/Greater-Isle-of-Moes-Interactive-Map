// to run: python -m http.server
// to open: http://localhost:8000

// -------------------------
// LAYER CONFIGURATION
// -------------------------
const layerConfigs = [
  {
    id: 'parks',
    file: 'data/GIM_Parks.geojson',
    type: 'fill',
    paint: {
      'fill-color': '#4CAF50',
      'fill-opacity': 0.4
    }
  },
  {
    id: 'river',
    file: 'data/GIM_river.geojson',
    type: 'line',
    paint: {
      'line-color': '#1E88E5',
      'line-width': 2
    }
  },
  {
    id: 'poi',
    file: 'data/GIM_POI.geojson',
    type: 'circle',
    paint: {
      'circle-radius': 5,
      'circle-color': '#ff5722'
    },
    labels: true
  },
  {
    id: 'outline',
    file: 'data/GIM_outline_box.geojson',
    type: 'line',
    paint: {
      'line-color': '#000000',
      'line-width': 2
    }
  },
  {
    id: 'elevation',
    file: 'data/GIM_elevation.geojson',
    type: 'fill',
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
  }
];


// -------------------------
// MAP
// -------------------------
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
  center: [-117.3, -50.9],
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
// AUTO CREATE TOGGLE UI
// -------------------------
function createLayerToggle(layerId, label) {

  const menu = document.getElementById('menu');

  const container = document.createElement('div');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;

  checkbox.onchange = () => {
    toggleLayer(layerId, checkbox.checked);
  };

  const text = document.createElement('label');
  text.innerText = ' ' + label;

  container.appendChild(checkbox);
  container.appendChild(text);

  menu.appendChild(container);
}


// -------------------------
// MAIN MAP LOGIC
// -------------------------
map.on('load', async () => {

  try {

    // -------------------------
    // LOAD ALL LAYERS
    // -------------------------
    for (const layer of layerConfigs) {

      const data = await loadJSON(layer.file);

      // SOURCE
      map.addSource(layer.id, {
        type: 'geojson',
        data: data
      });

      // MAIN LAYER
      map.addLayer({
        id: `${layer.id}-layer`,
        type: layer.type,
        source: layer.id,
        paint: layer.paint
      });

      // AUTO TOGGLE
      createLayerToggle(`${layer.id}-layer`, layer.id);

      // OPTIONAL LABELS
      if (layer.labels) {

        map.addLayer({
          id: `${layer.id}-labels`,
          type: 'symbol',
          source: layer.id,
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

        createLayerToggle(`${layer.id}-labels`, `${layer.id} labels`);
      }
    }

    console.log("✅ All layers loaded");


    // -------------------------
    // CLICK POPUPS
    // -------------------------
    map.on('click', (e) => {

      const features = map.queryRenderedFeatures(e.point);

      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties;

      let html = `
        <div style="
          font-family:sans-serif;
          font-size:12px;
          max-width:250px;
        ">
      `;

      for (const key in props) {

        if (key === 'id') continue;

        html += `
          <div style="margin-bottom:4px;">
            <b>${key}:</b> ${props[key]}
          </div>
        `;
      }

      html += '</div>';

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });


    // -------------------------
    // POINTER CURSOR
    // -------------------------
    map.on('mouseenter', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', () => {
      map.getCanvas().style.cursor = '';
    });

  } catch (err) {
    console.error("❌ MAP LOADING ERROR:", err);
  }

});