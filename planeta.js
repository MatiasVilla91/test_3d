import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/controls/OrbitControls.js';

// Configuración de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Crear una esfera (el planeta)
const geometry = new THREE.SphereGeometry(3, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Cambiado a color rojo
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Crear un anillo (anillo geométrico)
const ringGeometry = new THREE.RingGeometry(4, 5, 64); // Parámetros: radio interior, radio exterior, segmentos
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }); // Color blanco para el anillo
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
scene.add(ring);

// Rotar el anillo para que esté a 75°
ring.rotation.x = Math.PI / 180 * 75; // Convertir 75 grados a radianes y rotar en el eje x

// Añadir el anillo como hijo del planeta para que rote junto con él
planet.add(ring);


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

// Crear una luna
const moonGeometry = new THREE.SphereGeometry(1, 32, 32);
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa }); // Color gris para la luna
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
const moon2 = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon, moon2);

// Posicionar la luna en órbita alrededor del planeta
const orbitRadius = 6; // Radio de la órbita de la luna
const moonOrbitSpeed = 0.80; // Velocidad de la órbita de la luna

// Animar la órbita de la luna
function animateMoonOrbit() {
  requestAnimationFrame(animateMoonOrbit);

  // Calcular la posición de la luna en la órbita circular
  const time = Date.now() * 0.001; // Convertir el tiempo a segundos
  const x = Math.cos(time * moonOrbitSpeed) * orbitRadius;
  const z = Math.sin(time * moonOrbitSpeed) * orbitRadius;
  
  // Posicionar la luna
  moon.position.set(x, 0, z);
  moon2.position.set(z, 4, x);

  // Actualizar la posición de la cámara
  controls.update();

  // Renderizar la escena
  renderer.render(scene, camera);
}

// Llamar a la función de animación de la órbita de la luna
animateMoonOrbit();

// Animación del planeta
function animate() {
  requestAnimationFrame(animate);
  planet.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
