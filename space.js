/**
 * "Contamination" @by Skyla Trousdale 
 * 
 * Environment of at least one site, api's connected to varuables of functions. Start with constants. 
 */


/**
 *  Fetch the API data! 
*/


/* AIR DATA */ 
// update every minute
setInterval(
    updatePollutants,
    60 * 1000 
);

// get pollutants 
const s = "06"; // from station 6
let pollutants = {};
async function updatePollutants() {

    try {

        const response = await fetch(
            "https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=f4eca3bf-5ded-4d3c-a8dc-ed42486498f3&limit=100"
        );

        const data = await response.json();

        pollutants = {};

        data.result.records
            .filter(
                record =>
                    record.stationId === s
            )
            .forEach(record => {

                pollutants[
                    record.pollutant
                ] = Number(
                    record.valeur
                );
            });

        console.log(
            "updated:",
            pollutants
        );

    } catch (error) {

        console.error(
            "pollutant fetch failed:",
            error
        );
    }
}



/**
 *  THREE.JS SIMULATION 
 * */ 
// generic import controls 
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


/* create scene */
const scene = new THREE.Scene();
//scene.fog = new THREE.Fog(0xDAB1DA, 10, 80); // add fog 
//scene.background = new THREE.Color(0xDAB1DA);
//scene.environment = null;


// to see, ambient light 
const light = new THREE.AmbientLight( 0xe6d7ff, 100); // soft white light
//light.distance = 1000; 
scene.add( light );


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

// cam 
let angle = 0;
const radius = 8;
const speed = -0.2; // controls rotation speed
//const clock = new THREE.Clock();



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

controls.enableDamping = true;
//controls.autoRotate= true; 
//controls.rotateSpeed=0.05; 
//camera.lookAt(0,30,0)

// blur 
/*const bokeh = new BokehPass(scene, camera, {
    focus: 20.0,        // distance where image is sharp
    aperture: 0.0005,  // blur strength (smaller = subtle blur)
    maxblur: 0.01      // max blur allowed
  });
  composer.addPass(bokeh);
*/


// load in 
//loadFacade(); 

// particles
const particlesCO = [];
const particlesNO2 = []; 
const particlesSO2 = []; 
const particlesO3 = []; 

const spread = 40; // how far particles spread from center


//loadParticles(); 
generateParticles(particlesCO, 15, 0xffffff);  // particle, levels, color
generateParticles(particlesNO2, 6, 0xFF69B4);

loadFacade();

flocking(particlesCO); 

/* ANIMATE */ 
// get millisectonds 
const d = new Date();
let ms; 

window.requestAnimationFrame(animate);
function animate(time) {
    const d = new Date();
     ms = d.getMilliseconds()/10; 

     updateParticles();
     

  // cam 
    //const delta = clock.getDelta();
    //angle += delta * speed;
    //camera.position.x = radius * Math.cos(angle);
    //  camera.position.z = radius * Math.sin(angle);
    //camera.lookAt(0, 30, 0); // look at center

  renderer.render(scene, camera);

  // controls updating (always)
  controls.update();
  composer.render();
  window.requestAnimationFrame(animate);
  window.addEventListener("resize", onWindowResize);
}

// resize readjust window size function 
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* LOAD IN LIDAR SCAN */ 
async function loadFacade() {
    const loader = new GLTFLoader();

    // facade 
    loader.load("items/house_test/scene.gltf", function(gltf) {
        const facade = gltf.scene; 

        facade.scale.set(1,1,1)
        facade.position.set(0, 0, -10)
        scene.add(facade)
    
    }); 

}


function generateParticles(particles, levels, col) {
    const particleCount = levels;

    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 0] = (Math.random() -0.5)* 10;
        positions[i * 3 + 1] = (Math.random() -0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5)  * 10;
    }

    

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
        size: 0.3,
        color: col
    });

    const particle = new THREE.Points(geometry, material);
    scene.add(particle);
}

function updateParticles(particles) {
   
}



/* FLOCKING FOR PARTICLE SYSTEM (using boids algorithm) */
/** Steps 
 * 1. alignment - 
 * 
 * vars 
 * NUM_ENTITIES = 100
 * MAX_SPEED = 2
 * PERCEPTION_RADIUS = 50
 * SEPARATION_DISTANCE = 25
 * each entity needs a position and a velocity 
 * 
 * // for flockibg 
 * particles.push({
    x: ...,
    y: ...,
    z: ...,
    vx: ...,
    vy: ...,
    vz: ...
});

then animate 
particle.x += particle.vx;
particle.y += particle.vy;
particle.z += particle.vz;
 */

function flocking(particles) {

}

function updateFlocking(particle) {

}

function wrapFlocking(particle) {

}