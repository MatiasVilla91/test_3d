
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.130.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.130.0/examples/jsm/controls/OrbitControls.js';
import * as THREE from '/absolute/path/to/three.module.js'; // Ruta absoluta

// Configuración de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Crear una esfera (el planeta)
const geometry = new THREE.SphereGeometry(5, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xbff-1550 });
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Posicionar la cámara
camera.position.z = 9;

// Crear OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Configurar los controles
controls.enableDamping = true; // Suavizar los movimientos de la cámara
controls.dampingFactor = 0.25; // Factor de suavizado (0 = sin suavizado, 1 = máximo suavizado)
controls.rotateSpeed = 0.35; // Velocidad de rotación de la cámara

// Detener el control de rotación automática
controls.autoRotate = false;

// Limitar el ángulo de inclinación vertical de la cámara
controls.maxPolarAngle = Math.PI / 2; // 90 grados

// Limitar la distancia mínima y máxima de la cámara
controls.minDistance = 5; // Distancia mínima a la cámara
controls.maxDistance = 20; // Distancia máxima a la cámara

// Animación del planeta
function animate() {
  requestAnimationFrame(animate);
  planet.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
