// to run: python -m http.server
// to open: http://localhost:8000

// -------------------------
// LAYER CONFIGURATION
// -------------------------
const layerConfigs = [
  {
    id: 'parks',
    source: { type: 'geojson', data: 'data/GIM_Parks.geojson' },
    type: 'fill',
    style: {
      'fill-color': '#4CAF50',
      'fill-opacity': 0.4
    },
    popupFields: ['name', 'type', 'description'],
    labelField: 'name'
  },

  {
    id: 'river',
    source: { type: 'geojson', data: 'data/GIM_river.geojson' },
    type: 'line',
    style: {
      'line-color': '#1E88E5',
      'line-width': 2
    },
    popupFields: ['name', 'length'],
    labelField: 'name'
  },

  // -------------------------
  // POI (UPDATED: FILTER SUPPORT)
  // -------------------------
  {
    id: 'poi',
    source: { type: 'geojson', data: 'data/GIM_POI.geojson' },
    type: 'circle',
    style: {
      'circle-radius': 5,
      'circle-color': '#ff5722'
    },
    popupFields: ['name', 'Description', 'Type'],
    labelField: 'name',

    // ✅ NEW: sub-category system
    filters: {
      category: ['City', 'Village', 'Peak','Structure']
    }
  },

  {
    id: 'outline',
    source: { type: 'geojson', data: 'data/GIM_outline_box.geojson' },
    type: 'line',
    style: {
      'line-color': '#000000',
      'line-width': 2
    },
    popupFields: [],
    labelField: null
  },

  {
    id: 'elevation',
    source: { type: 'geojson', data: 'data/GIM_elevation.geojson' },
    type: 'fill',
    style: {
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
    },
    popupFields: ['height'],
    labelField: null
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
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'osm', type: 'raster', source: 'osm' }
    ]
  },
  center: [-117.3, -50.9],
  zoom: 7
});


// -------------------------
// LOAD GEOJSON
// -------------------------
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`❌ Failed to load ${path}`);
  return res.json();
}


// -------------------------
// TOGGLE LAYER
// -------------------------
function toggleLayer(layerId, visible) {
  map.setLayoutProperty(
    layerId,
    'visibility',
    visible ? 'visible' : 'none'
  );
}


// -------------------------
// POI FILTER FUNCTION
// -------------------------
function setPOIFilter(category) {

  if (!category) {
    map.setFilter('poi-layer', null);
    return;
  }

  map.setFilter('poi-layer', [
    'all',
    ['has', 'Type'],  // ensures field exists
    [
      '==',
      ['to-string', ['get', 'Type']],
      String(category)
    ]
  ]);
}


// -------------------------
// AUTO UI
// -------------------------
function createLayerToggle(layerId, label) {
  const menu = document.getElementById('menu');

  const container = document.createElement('div');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;

  checkbox.onchange = () => toggleLayer(layerId, checkbox.checked);

  const text = document.createElement('label');
  text.innerText = ' ' + label;

  container.appendChild(checkbox);
  container.appendChild(text);

  menu.appendChild(container);
}


// -------------------------
// POI FILTER UI
// -------------------------
function createPOIFilterUI(layerConfig) {

  const menu = document.getElementById('menu');

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '10px';

  const title = document.createElement('div');
  title.innerHTML = '<b>POI Filter</b>';
  wrapper.appendChild(title);

  // ALL
  const allBtn = document.createElement('button');
  allBtn.innerText = 'All';
  allBtn.onclick = () => setPOIFilter(null);
  wrapper.appendChild(allBtn);

  wrapper.appendChild(document.createElement('br'));

  for (const cat of layerConfig.filters.category) {

    const btn = document.createElement('button');
    btn.innerText = cat;

    btn.onclick = () => setPOIFilter(cat);

    wrapper.appendChild(btn);
  }

  menu.appendChild(wrapper);
}


// -------------------------
// MAP LOAD
// -------------------------
map.on('load', async () => {

  try {

    for (const layer of layerConfigs) {

      const data = await loadJSON(layer.source.data);

      // SOURCE
      map.addSource(layer.id, {
        type: 'geojson',
        data
      });

      // MAIN LAYER
      map.addLayer({
        id: `${layer.id}-layer`,
        type: layer.type,
        source: layer.id,
        paint: layer.style
      });

      createLayerToggle(`${layer.id}-layer`, layer.id);

      // POI FILTER UI (ONLY FOR POI)
      if (layer.id === 'poi' && layer.filters) {
        createPOIFilterUI(layer);
      }

      // LABELS
      if (layer.labelField) {

        map.addLayer({
          id: `${layer.id}-labels`,
          type: 'symbol',
          source: layer.id,
          layout: {
            'text-field': ['get', layer.labelField],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        });
      }
    }

    console.log("✅ All layers loaded");


    // -------------------------
    // POPUPS (UNCHANGED SAFE VERSION)
    // -------------------------
    map.on('click', (e) => {

      const features = map.queryRenderedFeatures(e.point);

      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties || {};

      let html = `<div style="font-family:sans-serif;font-size:12px;max-width:250px;">`;

      const keys = Object.keys(props);

      if (!keys.length) {
        html += `<i>No attributes available</i>`;
      } else {

        for (const key of keys) {

          const value = props[key];

          if (value === null || value === undefined || value === '') continue;

          html += `
            <div style="margin-bottom:4px;">
              <b>${key}:</b> ${String(value)}
            </div>
          `;
        }
      }

      html += `</div>`;

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

  } catch (err) {
    console.error("❌ MAP ERROR:", err);
  }

});