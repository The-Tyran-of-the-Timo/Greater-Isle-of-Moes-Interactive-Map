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

    filters: {
      category: ['City', 'Village', 'Peak', 'Structure']
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
// TOGGLE LAYER VISIBILITY
// -------------------------
function toggleLayer(layerId, visible) {
  map.setLayoutProperty(
    layerId,
    'visibility',
    visible ? 'visible' : 'none'
  );
}

// -------------------------
// POI STATE
// -------------------------
const poiState = {
  activeCategories: new Set()
};

// -------------------------
// APPLY POI FILTER
// -------------------------
function applyPOIFilter() {

  const cats = Array.from(poiState.activeCategories);

  if (cats.length === 0) {
    map.setFilter('poi-layer', null);
    return;
  }

  map.setFilter('poi-layer', [
    'in',
    ['get', 'Type'],
    ['literal', cats]
  ]);
}

// -------------------------
// LAYER UI
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
// POI COLLAPSIBLE FILTER MENU
// -------------------------
function createPOIFilterUI(layerConfig) {

  const menu = document.getElementById('menu');

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '10px';

  // HEADER
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '6px';

  const master = document.createElement('input');
  master.type = 'checkbox';
  master.checked = true;

  const label = document.createElement('span');
  label.innerText = 'POI';

  const arrow = document.createElement('button');
  arrow.innerText = '▶';
  arrow.style.border = 'none';
  arrow.style.background = 'none';
  arrow.style.cursor = 'pointer';

  header.appendChild(master);
  header.appendChild(label);
  header.appendChild(arrow);

  wrapper.appendChild(header);

  // SUBMENU
  const submenu = document.createElement('div');
  submenu.style.display = 'none';
  submenu.style.marginLeft = '22px';

  let open = false;

  arrow.onclick = () => {
    open = !open;
    submenu.style.display = open ? 'block' : 'none';
    arrow.innerText = open ? '▼' : '▶';
  };

  // MASTER CONTROL
  master.onchange = () => {

    const enabled = master.checked;

    // toggle entire POI layer
    toggleLayer(
      `${layerConfig.id}-layer`,
      enabled
    );

    poiState.activeCategories.clear();

    submenu.querySelectorAll('input[data-type]').forEach(cb => {

      cb.checked = enabled;

      if (enabled) {
        poiState.activeCategories.add(
          cb.dataset.type
        );
      }

    });

    applyPOIFilter();
  };

  // CATEGORY CHECKBOXES
  for (const cat of layerConfig.filters.category) {

    const row = document.createElement('div');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.type = cat;
    cb.checked = true;

    poiState.activeCategories.add(cat);

    cb.onchange = () => {

      if (cb.checked) {

        // automatically re-enable layer
        toggleLayer(`${layerConfig.id}-layer`, true);

        poiState.activeCategories.add(cat);

      } else {

        poiState.activeCategories.delete(cat);

      }

      applyPOIFilter();

      const total =
        submenu.querySelectorAll('input[data-type]').length;

      const checked =
        submenu.querySelectorAll('input[data-type]:checked').length;

      // layer visible if at least one category active
      master.checked = checked > 0;

      if (checked > 0) {

        toggleLayer(`${layerConfig.id}-layer`, true);
        master.checked = true;

      } else {

        toggleLayer(`${layerConfig.id}-layer`, false);
        master.checked = false;

      }
    };

    const text = document.createElement('label');
    text.innerText = ' ' + cat;

    row.appendChild(cb);
    row.appendChild(text);

    submenu.appendChild(row);
  }

  wrapper.appendChild(submenu);
  menu.appendChild(wrapper);
}

// -------------------------
// MAP LOAD
// -------------------------
map.on('load', async () => {

  try {

    for (const layer of layerConfigs) {

      const data = await loadJSON(layer.source.data);

      map.addSource(layer.id, {
        type: 'geojson',
        data
      });

      map.addLayer({
        id: `${layer.id}-layer`,
        type: layer.type,
        source: layer.id,
        paint: layer.style
      });

      // Layers with custom filters get their own UI
      if (layer.filters) {

        createPOIFilterUI(layer);

      } else {

        createLayerToggle(
          `${layer.id}-layer`,
          layer.id
        );

      }

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
    // POPUPS
    // -------------------------
    map.on('click', (e) => {

      const features = map.queryRenderedFeatures(e.point);
      if (!features.length) return;

      const props = features[0].properties || {};

      let html = `<div style="font-family:sans-serif;font-size:12px;max-width:250px;">`;

      const keys = Object.keys(props);

      if (!keys.length) {
        html += `<i>No attributes available</i>`;
      } else {

        for (const k of keys) {

          const v = props[k];
          if (v === null || v === undefined || v === '') continue;

          html += `<div><b>${k}:</b> ${String(v)}</div>`;
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

// to run: python -m http.server
// to open: http://localhost:8000