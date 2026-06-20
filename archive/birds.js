import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// for visual effects 
import { UnrealBloomPass } from 'https://unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js";
import { HorizontalBlurShader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/VerticalBlurShader.js";
import { GodraysPass } from "https://unpkg.com/three-good-godrays@0.8.1/build/three-good-godrays.esm.js";
// for background
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/loaders/RGBELoader.js';

// for trees/ perlin noise 
import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise";

// for blur 
import { BokehPass } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from 'https://unpkg.com/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three/examples/jsm/postprocessing/RenderPass.js';




// ===============================
// SETTINGS
// ===============================

const PARTICLE_COUNT = 40;
const BOUND_SIZE = 30;

const MAX_SPEED = 0.05;
const PERCEPTION_RADIUS = 2;

const ALIGNMENT_WEIGHT = 0.01;
const COHESION_WEIGHT = 0.02;
const SEPARATION_WEIGHT = 0.02;

const scene = new THREE.Scene();


// ===============================
// BOID DATA
// ===============================

const boids = [];

const positions = new Float32Array(
    PARTICLE_COUNT * 3
);


// ===============================
// CREATE BOIDS
// ===============================

for (let i = 0; i < PARTICLE_COUNT; i++) {

    const x =
        (Math.random() - 0.5) *
        BOUND_SIZE;

    const y =
        (Math.random() - 0.5) *
        BOUND_SIZE;

    const z =
        (Math.random() - 0.5) *
        BOUND_SIZE;

    boids.push({
        x,
        y,
        z,

        vx:
            (Math.random() - 0.5) *
            MAX_SPEED,

        vy:
            (Math.random() - 0.5) *
            MAX_SPEED,

        vz:
            (Math.random() - 0.5) *
            MAX_SPEED
    });

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
}

// camera 
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.x = 8;
camera.position.y = 34;
camera.position.z = 8;
scene.add(camera); // more camera stuff later after control initialized


//RENDER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
document.body.appendChild(renderer.domElement);

renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;


// CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);


// EFFECT COMPOSER 
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// ===============================
// THREE.JS PARTICLES
// ===============================

const geometry =
    new THREE.BufferGeometry();

geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
        positions,
        3
    )
);

const material =
    new THREE.PointsMaterial({

        color: 0xffffff,
        size: 0.3
    });

const points =
    new THREE.Points(
        geometry,
        material
    );

scene.add(points);


// ===============================
// UPDATE SINGLE BOID
// ===============================

function updateBoid(boid) {

    let alignX = Math.random();
    let alignY = Math.random();
    let alignZ = Math.random();

    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;

    let separateX = 0;
    let separateY = 0;
    let separateZ = 0;

    let count = 0;

    for (const other of boids) {
        if (other === boid)
            continue;

        const dx =
            other.x - boid.x;

        const dy =
            other.y - boid.y;

        const dz =
            other.z - boid.z;

        const dist =
            Math.sqrt(
                dx * dx +
                dy * dy +
                dz * dz
            );

        if (
            dist >
            PERCEPTION_RADIUS
        ) continue;

        count++;

        // Alignment
        alignX += other.vx;
        alignY += other.vy;
        alignZ += other.vz;

        // Cohesion
        centerX += other.x;
        centerY += other.y;
        centerZ += other.z;

        // Separation
        if (dist > 0) {

            separateX -= dx / dist;
            separateY -= dy / dist;
            separateZ -= dz / dist;
        }
    }

    if (count > 0) {

        // Alignment

        alignX /= count;
        alignY /= count;
        alignZ /= count;

        boid.vx +=
            alignX *
            ALIGNMENT_WEIGHT;

        boid.vy +=
            alignY *
            ALIGNMENT_WEIGHT;

        boid.vz +=
            alignZ *
            ALIGNMENT_WEIGHT;

        // Cohesion

        centerX /= count;
        centerY /= count;
        centerZ /= count;

        boid.vx +=
            (centerX - boid.x) *
            COHESION_WEIGHT;

        boid.vy +=
            (centerY - boid.y) *
            COHESION_WEIGHT;

        boid.vz +=
            (centerZ - boid.z) *
            COHESION_WEIGHT;

        // Separation

        boid.vx +=
            separateX *
            SEPARATION_WEIGHT;

        boid.vy +=
            separateY *
            SEPARATION_WEIGHT;

        boid.vz +=
            separateZ *
            SEPARATION_WEIGHT;
    }

    // Limit speed

    const speed =
        Math.sqrt(
            boid.vx * boid.vx +
            boid.vy * boid.vy +
            boid.vz * boid.vz
        );

    if (speed > MAX_SPEED) {

        boid.vx =
            (boid.vx / speed) *
            MAX_SPEED;

        boid.vy =
            (boid.vy / speed) *
            MAX_SPEED;

        boid.vz =
            (boid.vz / speed) *
            MAX_SPEED;
    }

    // Move

    boid.x += boid.vx;
    boid.y += boid.vy;
    boid.z += boid.vz;

    // Wrap boundaries

    const half =
        BOUND_SIZE / 2;

    if (boid.x > half)
        boid.x = -half;

    if (boid.x < -half)
        boid.x = half;

    if (boid.y > half)
        boid.y = -half;

    if (boid.y < -half)
        boid.y = half;

    if (boid.z > half)
        boid.z = -half;

    if (boid.z < -half)
        boid.z = half;
}


// ===============================
// ANIMATION LOOP
// ===============================

function animate() {

    requestAnimationFrame(
        animate
    );

    const positions =
        geometry.attributes
            .position.array;

    for (
        let i = 0;
        i < boids.length;
        i++
    ) {

        const boid =
            boids[i];

        updateBoid(boid);

        positions[
            i * 3 + 0
        ] = boid.x;

        positions[
            i * 3 + 1
        ] = boid.y;

        positions[
            i * 3 + 2
        ] = boid.z;
    }

    geometry.attributes
        .position.needsUpdate =
        true;

    renderer.render(
        scene,
        camera
    );
}

animate();