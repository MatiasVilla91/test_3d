import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/controls/OrbitControls.js';

// Configuración de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cargar la textura
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('1366_2000.jpg');

// Crear una esfera (el planeta)
const geometry = new THREE.SphereGeometry(3, 32, 32);
const material = new THREE.MeshBasicMaterial({ map: texture }); // Usar 'map' en lugar de 'texture'
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Cargar la textura para el anillo
//const ringTexture = new THREE.TextureLoader().load('anilloColor.jpg');

// Crear el material con la textura
//const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide });

// Crear un anillo (anillo geométrico)
//const ringGeometry = new THREE.RingGeometry(4, 5, 64); // Parámetros: radio interior, radio exterior, segmentos
//const ring = new THREE.Mesh(ringGeometry, ringMaterial);
//scene.add(ring);

// Rotar el anillo para que esté a 75°
//ring.rotation.x = Math.PI / 180 * 75; // Convertir 75 grados a radianes y rotar en el eje x

// Añadir el anillo como hijo del planeta para que rote junto con él
//planet.add(ring);

// Posicionar la cámara
camera.position.z = 9;

// Crear OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Configurar los controles
controls.enableDamping = true; // Suavizar los movimientos de la cámara
controls.dampingFactor = 0.25; // Factor de suavizado (0 = sin suavizado, 1 = máximo suavizado)
controls.rotateSpeed = 0.35; // Velocidad de rotación de la cámara

// Detener el control de rotación automática
//controls.autoRotate = false;

// Limitar el ángulo de inclinación vertical de la cámara
controls.maxPolarAngle = Math.PI / 2; // 90 grados

// Limitar la distancia mínima y máxima de la cámara
controls.minDistance = 4; // Distancia mínima a la cámara
controls.maxDistance = 20; // Distancia máxima a la cámara

// Crear la geometría de las estrellas
const particleCount = 1000; // Cantidad de partículas
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

// Distribuir las partículas aleatoriamente en un cubo alrededor de la escena
for (let i = 0; i < particleCount; i++) {
    const x = Math.random() * 2000 - 1000; // Rango en x: -1000 a 1000
    const y = Math.random() * 2000 - 1000; // Rango en y: -1000 a 1000
    const z = Math.random() * 2000 - 1000; // Rango en z: -1000 a 1000

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Crear el material de las estrellas
const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff, // Color de las estrellas
    size: 1, // Tamaño de las estrellas
});

// Crear el sistema de partículas
const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);



// Cargar la textura para las lunas
const moonTexture = new THREE.TextureLoader().load('textura2.png');
// Crear el material con la textura
const moonMaterial = new THREE.MeshBasicMaterial({ map: moonTexture });
// Crear las lunas con la nueva textura
const moonGeometry = new THREE.SphereGeometry(1, 32, 32);
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
const moon2 = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon, moon2);

// Posicionar las lunas en órbita alrededor del planeta
const orbitRadius = -6; // Radio de la órbita de la luna
let moonOrbitSpeed = 0.80; // Velocidad de la órbita de la luna

// Animar la órbita de las lunas
function animateMoonOrbit() {
  requestAnimationFrame(animateMoonOrbit);

  // Calcular la posición de las lunas en la órbita circular
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


/* ESTO FUNCIONA CUANDO EL MOUSE PASA SOBRE LA LUNA
// Agregar detector de eventos al renderizador
renderer.domElement.addEventListener('mousemove', onMouseMove);

// Función para manejar el movimiento del mouse
function onMouseMove(event) {
  // Normalizar las coordenadas del mouse (-1 to +1)
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Configurar un rayo desde la posición de la cámara
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Verificar intersecciones con la luna
  const intersectsMoon = raycaster.intersectObject(moon);
  //Para la Luna2
  const intersectsMoon2 = raycaster.intersectObject(moon2);

  // Si el mouse está sobre alguna de las lunas
  if (intersectsMoon.length > 0 || intersectsMoon2.length > 0) {
  // Detener la animación de ambas lunas
  moonOrbitSpeed = 0; 

     // Mostrar el cartelito
    document.getElementById("popup").style.display = "block";
  } else {
    // Si el mouse no está sobre ninguna luna, continuar la animación
    moonOrbitSpeed = 0.80;

    // Ocultar el cartelito
    document.getElementById("popup").style.display = "none";
  }
}
*/
/*ESTO FUNCIONA CUANDO SE HACE CLICK SOBRE LA LUNA*/
// Agregar detector de eventos al renderizador
renderer.domElement.addEventListener('click', onClick);

// Función para manejar el clic del mouse
function onClick(event) {
    // Normalizar las coordenadas del mouse (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Configurar un rayo desde la posición de la cámara
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Verificar intersecciones con la luna
    const intersectsMoon = raycaster.intersectObject(moon);
    const intersectsMoon2 = raycaster.intersectObject(moon2);

    // Si el mouse hace clic en alguna de las lunas
    if (intersectsMoon.length > 0 || intersectsMoon2.length > 0) {
        // Detener la animación de ambas lunas
        moonOrbitSpeed = 0;

        // Mostrar el cartelito
        document.getElementById("popup").style.display = "block";
    }
}



// Animación del planeta
function animate() {
  requestAnimationFrame(animate);
  planet.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
