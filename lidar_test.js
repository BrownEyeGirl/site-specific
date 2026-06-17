import * as THREE from 'three';

// 1. Initialize Scene, Camera, and Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Example lidar mock array: [[x, y, z, r, g, b], ...]
const lidarData = [
    [0, 0, 0, 1, 0, 0],
    [1, 2, -3, 0, 1, 0],
    // ...millions of points parsed from your scan
];

const count = lidarData.length;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);

// 2. Populate Float32Arrays for the GPU
lidarData.forEach((point, i) => {
    positions[i * 3]     = point[0]; // X
    positions[i * 3 + 1] = point[1]; // Y
    positions[i * 3 + 2] = point[2]; // Z

    colors[i * 3]     = point[3]; // R
    colors[i * 3 + 1] = point[4]; // G
    colors[i * 3 + 2] = point[5]; // B
});

// 3. Bind arrays to BufferGeometry attributes
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// 4. Create Material enabling vertex colors
const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,     // Instructs Three.js to look at the color attribute
    sizeAttenuation: true   // Points shrink as they get further away
});

// 5. Instanciate Points and add to scene
const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

camera.position.z = 5;

// 6. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
