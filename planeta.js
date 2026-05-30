import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/controls/OrbitControls.js';

// ── Escena ──
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Iluminación ──
scene.add(new THREE.AmbientLight(0xaabbcc, 1.8));
const sol = new THREE.DirectionalLight(0xfff5e0, 1.4);
sol.position.set(10, 4, 8);
scene.add(sol);

// ── Planeta ──
const textureLoader = new THREE.TextureLoader();
const geometry = new THREE.SphereGeometry(3, 64, 64);
const material = new THREE.MeshPhongMaterial({
  map:      textureLoader.load('earth.jpg'),
  specular: new THREE.Color(0x111122),
  shininess: 12,
});
const planet = new THREE.Mesh(geometry, material);
planet.scale.set(1, 0.96, 1);
planet.rotation.z = 23.5 * Math.PI / 180;
scene.add(planet);

// ── Atmósfera ──
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(3.18, 64, 64),
  new THREE.MeshPhongMaterial({ color: 0x00ff44, transparent: true, opacity: 0.055, depthWrite: false })
);
scene.add(atmosphere);

// ── Estrellas ──
const starPositions = new Float32Array(1800 * 3);
for (let i = 0; i < starPositions.length; i++) starPositions[i] = Math.random() * 2000 - 1000;
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x44ffaa, size: 0.75 })));

// ── Anillos orbitales ──
const ringMat = new THREE.LineBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.14 });
for (const r of [4.4, 6.2, 8.5]) {
  const pts = [];
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.04) {
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat.clone()));
}

// ── Controles ──
camera.position.z = 9;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.25;
controls.rotateSpeed    = 0.5;
controls.minDistance    = 3.5;
controls.maxDistance    = 20;
controls.enablePan      = false;

// ── Helpers de coordenadas ──
const RADIO = 3;

function latLngAVec3(lat, lng, r = RADIO + 0.06) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// ── Graticule (grilla radar) ──
const gratMat    = new THREE.LineBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.11 });
const ecuadorMat = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.55 });
for (let lat = -60; lat <= 60; lat += 30) {
  const pts = [];
  for (let lng = 0; lng <= 360; lng += 3) pts.push(latLngAVec3(lat, lng, RADIO + 0.02));
  planet.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? ecuadorMat : gratMat));
}
for (let lng = 0; lng < 360; lng += 30) {
  const pts = [];
  for (let lat = -90; lat <= 90; lat += 3) pts.push(latLngAVec3(lat, lng, RADIO + 0.02));
  planet.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratMat));
}

function colorPorMagnitud(mag) {
  if (mag < 2.5) return 0x00ff88;
  if (mag < 4.5) return 0xffdd00;
  if (mag < 6.0) return 0xff6600;
  return 0xff1111;
}

function tamañoPorMagnitud(mag) {
  return Math.max(0.025, mag * 0.018);
}

function buildURL({ minMag, days, dateFrom, dateTo }) {
  const now = new Date();
  const end   = dateTo   || now.toISOString().split('T')[0];
  let   start = dateFrom;
  if (!start) {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    start = d.toISOString().split('T')[0];
  }
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
         `&starttime=${start}&endtime=${end}&minmagnitude=${minMag}&limit=5000&orderby=time`;
}

// ── Estado ──
const markers    = [];
const knownIds   = new Set();
let   alertTimer = null;
let   currentParams = { minMag: 2.5, days: 7, dateFrom: null, dateTo: null };

// ── Limpiar marcadores ──
function clearMarkers() {
  for (const m of markers) {
    planet.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
  markers.length = 0;
}

// ── Cargar terremotos ──
async function cargarTerremotos(params) {
  const loadingMsg = document.getElementById('loading-msg');
  const countMsg   = document.getElementById('count-msg');
  const countEl    = document.getElementById('count');
  const applyBtn   = document.getElementById('apply-btn');

  applyBtn.disabled       = true;
  loadingMsg.style.display = 'block';
  countMsg.style.display   = 'none';
  clearMarkers();

  try {
    const res  = await fetch(buildURL(params));
    const data = await res.json();

    for (const f of data.features) {
      const [lng, lat, depth] = f.geometry.coordinates;
      const mag = f.properties.mag;
      if (!mag || mag < 0) continue;

      knownIds.add(f.id);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(tamañoPorMagnitud(mag), 6, 6),
        new THREE.MeshBasicMaterial({ color: colorPorMagnitud(mag) })
      );
      marker.position.copy(latLngAVec3(lat, lng));
      marker.userData = {
        mag:         mag.toFixed(1),
        lugar:       f.properties.place || 'Ubicación desconocida',
        fecha:       new Date(f.properties.time).toLocaleDateString('es-ES'),
        profundidad: depth != null ? Math.round(depth) + ' km' : '—',
      };
      planet.add(marker);
      markers.push(marker);
    }

    countEl.textContent     = markers.length;
    loadingMsg.style.display = 'none';
    countMsg.style.display   = 'block';
  } catch (e) {
    loadingMsg.textContent = 'Error al cargar datos';
  } finally {
    applyBtn.disabled = false;
  }
}

// ── Alertas ──
async function checkAlerts() {
  const minMag = parseFloat(document.getElementById('alert-mag').value);
  const now    = new Date();
  const past   = new Date(now - 30 * 60 * 1000);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
              `&starttime=${past.toISOString()}&endtime=${now.toISOString()}` +
              `&minmagnitude=${minMag}&limit=10&orderby=time`;
  try {
    const res    = await fetch(url);
    const data   = await res.json();
    const nuevos = data.features.filter(f => !knownIds.has(f.id));
    if (nuevos.length > 0) {
      nuevos.forEach(f => knownIds.add(f.id));
      const f = nuevos[0];
      mostrarAlerta(
        `M${f.properties.mag.toFixed(1)} — ${f.properties.place || 'Ubicación desconocida'}`,
        new Date(f.properties.time).toLocaleString('es-ES')
      );
    }
  } catch (e) {}
}

function mostrarAlerta(titulo, fecha) {
  document.getElementById('alert-title').textContent = '⚠ Nuevo sismo detectado';
  document.getElementById('alert-body').textContent  = `${titulo} · ${fecha}`;
  document.getElementById('alert-notif').style.display = 'flex';
  if (Notification.permission === 'granted') {
    new Notification('⚠ Nuevo sismo', { body: titulo });
  }
}

// ── Controles del panel ──
document.getElementById('panel-toggle').addEventListener('click', () => {
  document.getElementById('panel').classList.add('hidden');
});
document.getElementById('panel-open').addEventListener('click', () => {
  document.getElementById('panel').classList.remove('hidden');
});

const magSlider = document.getElementById('mag-min');
const magVal    = document.getElementById('mag-val');
magSlider.addEventListener('input', () => {
  magVal.textContent    = magSlider.value;
  currentParams.minMag  = parseFloat(magSlider.value);
});

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.days;
    const customDates = document.getElementById('custom-dates');
    if (v === 'custom') {
      customDates.style.display = 'flex';
      currentParams.days = null;
    } else {
      customDates.style.display = 'none';
      currentParams.days     = parseInt(v);
      currentParams.dateFrom = null;
      currentParams.dateTo   = null;
    }
  });
});

// Valores por defecto para fechas personalizadas
const hoy = new Date();
const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 7);
document.getElementById('date-to').value   = hoy.toISOString().split('T')[0];
document.getElementById('date-from').value = hace7.toISOString().split('T')[0];

document.getElementById('date-from').addEventListener('change', e => { currentParams.dateFrom = e.target.value; });
document.getElementById('date-to').addEventListener('change',   e => { currentParams.dateTo   = e.target.value; });

document.getElementById('apply-btn').addEventListener('click', () => {
  cargarTerremotos(currentParams);
});

document.getElementById('alert-toggle').addEventListener('change', e => {
  const activo = e.target.checked;
  document.getElementById('alert-status').textContent = activo ? 'Activo — revisando cada 5 min' : 'Inactivo';
  if (activo) {
    if (Notification.permission === 'default') Notification.requestPermission();
    checkAlerts();
    alertTimer = setInterval(checkAlerts, 5 * 60 * 1000);
  } else {
    clearInterval(alertTimer);
    alertTimer = null;
  }
});

document.getElementById('alert-close').addEventListener('click', () => {
  document.getElementById('alert-notif').style.display = 'none';
});

// ── Hover en marcadores ──
const raycasterEq = new THREE.Raycaster();
const mouseEq     = new THREE.Vector2();
const infoEl      = document.getElementById('eq-info');

renderer.domElement.addEventListener('mousemove', (e) => {
  mouseEq.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseEq.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycasterEq.setFromCamera(mouseEq, camera);
  const hits = raycasterEq.intersectObjects(markers);

  if (hits.length > 0) {
    const { mag, lugar, fecha, profundidad } = hits[0].object.userData;
    infoEl.innerHTML   = `<strong>M${mag}</strong> — ${lugar}<br><small>${fecha} · Prof: ${profundidad}</small>`;
    infoEl.style.display = 'block';
    infoEl.style.left  = (e.clientX + 16) + 'px';
    infoEl.style.top   = (e.clientY - 16) + 'px';
    renderer.domElement.style.cursor = 'crosshair';
  } else {
    infoEl.style.display = 'none';
    renderer.domElement.style.cursor = 'grab';
  }
});

renderer.domElement.addEventListener('touchstart', () => {
  infoEl.style.display = 'none';
}, { passive: true });

// ── Vientos ──
const windArrows = [];

const WIND_GRID = (() => {
  const pts = [];
  for (let lat = -75; lat <= 75; lat += 30)
    for (let lng = -165; lng <= 165; lng += 30)
      pts.push({ lat, lng });
  return pts;
})();

function windColor(speed) {
  if (speed <  5) return 0x44ddff;
  if (speed < 10) return 0x88ffaa;
  if (speed < 20) return 0xffdd00;
  if (speed < 30) return 0xff6600;
  return 0xff2222;
}

function clearWindArrows() {
  for (const a of windArrows) {
    planet.remove(a);
    a.line.geometry.dispose();  a.line.material.dispose();
    a.cone.geometry.dispose();  a.cone.material.dispose();
  }
  windArrows.length = 0;
}

function createWindArrows(data) {
  clearWindArrows();
  for (const { lat, lng, speed, direction } of data) {
    if (speed < 0.5) continue;

    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    const r     = RADIO + 0.15;

    const origin = new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );

    // Tangente norte y tangente este en espacio local del planeta
    const N = new THREE.Vector3(
       Math.cos(phi) * Math.cos(theta),
       Math.sin(phi),
      -Math.cos(phi) * Math.sin(theta)
    );
    const E = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));

    // Dirección meteorológica "from" → convertir a "to"
    const toRad = ((direction + 180) % 360) * Math.PI / 180;
    const dir   = new THREE.Vector3()
      .addScaledVector(N, Math.cos(toRad))
      .addScaledVector(E, Math.sin(toRad))
      .normalize();

    const len   = Math.min(0.6, Math.max(0.15, speed * 0.022));
    const color = windColor(speed);

    const arrow = new THREE.ArrowHelper(dir, origin, len, color, len * 0.38, len * 0.22);
    arrow.line.material.transparent = true;  arrow.line.material.opacity = 0.72;
    arrow.cone.material.transparent = true;  arrow.cone.material.opacity = 0.72;
    planet.add(arrow);
    windArrows.push(arrow);
  }
}

async function cargarVientos() {
  const statusEl = document.getElementById('wind-status');
  statusEl.textContent = 'Cargando...';

  const lats = WIND_GRID.map(p => p.lat).join(',');
  const lngs = WIND_GRID.map(p => p.lng).join(',');

  try {
    const res  = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
      `&current=wind_speed_10m,wind_direction_10m`
    );
    const data = await res.json();
    const arr  = Array.isArray(data) ? data : [data];

    createWindArrows(arr.map((d, i) => ({
      lat:       WIND_GRID[i].lat,
      lng:       WIND_GRID[i].lng,
      speed:     d.current?.wind_speed_10m     ?? 0,
      direction: d.current?.wind_direction_10m ?? 0,
    })));

    statusEl.textContent = `Activo · ${arr.length} puntos`;
  } catch (e) {
    statusEl.textContent = 'Error al cargar';
  }
}

document.getElementById('wind-toggle').addEventListener('change', e => {
  const legend = document.getElementById('wind-legend');
  if (e.target.checked) {
    legend.style.display = 'block';
    cargarVientos();
  } else {
    legend.style.display = 'none';
    clearWindArrows();
    document.getElementById('wind-status').textContent = 'Inactivo';
  }
});

// ── Animate ──
function animate() {
  requestAnimationFrame(animate);

  if (markers.length > 0) {
    const factor = camera.position.length() / 9;
    for (let i = 0; i < markers.length; i++) markers[i].scale.setScalar(factor);
  }

  planet.rotation.y += 0.0015;

  controls.update();
  renderer.render(scene, camera);
}

// ── Init ──
cargarTerremotos(currentParams);
animate();
