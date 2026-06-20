/**
 * "CONTAMINATION" By Skyla Trousdale 
 * 
 * 
 * CREDITS: 
 * flocking code derived from https://github.com/jackaperkins/boids/blob/master/Boid.pde
 * daisy: https://sketchfab.com/3d-models/flower-0a0f5b4e595940649ea3cabeb7a4b1e1
 * clover: https://sketchfab.com/3d-models/low-poly-shrub-or-grass-clover-acb337dd8f5e41beba654111e3f2475a
 * lily: https://sketchfab.com/3d-models/low-poly-flowers-96a8320dd0e24ab8b2e7d2712eb66b64
 * sunflower: https://sketchfab.com/3d-models/sunflower-low-poly-0615fb09b7cd424d99d89f7c6e35eec3#download
 * 
 */




/* AIR DATA */ 
// update every minute
// get pollutants 
const s = "06"; // from station 6
let pollutants = {O3: 0,SO2: 0,NO2: 0,"PM2.5": 0}; // some default standards 
let lastPollutants = {O3: 0,SO2: 0,NO2: 0,"PM2.5": 0};  // some default standards 
const inflation = 50; //how much the pollutants are scaled 

setInterval(
    updatePollutants,
    60 * 100
);



/* VISUAL SYSTEM */ 
import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'

// effects
import { AnaglyphEffect } from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/effects/AnaglyphEffect.js';

// perlin noise 
import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise";


const COUNT = 100; // split into levels, 
const SIZE = 60;
const BOUND_RADIUS = 300;

const friendRadius = 30;;
const crowdRadius = 30;
const coheseRadius = 20;
const avoidRadius = 90;

let maxSpeed = 1.25;

const option_friend = true;
const option_crowd = true;
const option_avoid = true;
const option_noise = true;
const option_cohese = true;

// avoid mouse
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const mouseWorld = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);


/* BOID CLASS */
class Boid {
   // constructs boid with x,y,z
  constructor(x, y, z) {

    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3(
      Math.random() - 0.5 * SIZE,
      Math.random() - 0.5 * SIZE,
      Math.random() - 0.5 * SIZE, 
    );

    this.friends = [];
    this.thinkTimer = Math.floor(Math.random() * 10);
  }

  go(boids, avoids, mouse) {

    this.increment();
    this.bounce();

    if (this.thinkTimer === 0) {
      this.getFriends(boids);
    }

    this.flock(avoids, mouse);

    this.pos.add(this.vel);
  }

  flock(avoids, mouse) {

    const align = this.getAverageDir(); // match neighbors direction
    const avoidDir = this.getAvoidDir(); // avoid crowding
    const avoidObjs = this.getAvoidAvoids(avoids);  // avoid obstacles
    const noise = new THREE.Vector3(
      Math.random() * 2 -1,
      Math.random() * 2 -1,
      Math.random() * 2 -1,
    ); // random motion

    const cohese = this.getCohesion(); // move toward group

    // (these only occur if the variable option is declared true at the top)
    align.multiplyScalar(option_friend ? 0.2 : 0); // toggle align
    avoidDir.multiplyScalar(option_crowd ? 0.5 : 0); // toggle crowd avoid 
    avoidObjs.multiplyScalar(option_avoid ? 3 : 0); // strong obstacle avoid
    noise.multiplyScalar(option_noise ? 0: 0); // toggle noise
    cohese.multiplyScalar(option_cohese ? 0.2 : 0);   // toggle cohesion

    this.vel.add(align);                            // apply align
    this.vel.add(avoidDir);                         // apply crowd avoid
    this.vel.add(avoidObjs);                        // apply obstacle avoid
    this.vel.add(noise);                            // apply noise
    this.vel.add(cohese);                           // apply cohesion

    if (this.vel.length() > maxSpeed) {             // limit speed
      this.vel.setLength(maxSpeed);
    }

    const mouseForce = this.getMouseForce(mouse);

    mouseForce.multiplyScalar(0.5);

    this.vel.add(mouseForce);

    const centerForce = this.getCenterForce();

    this.vel.add(centerForce);
    
}

  /* FRIENDS */
  getFriends(boids) {

    const nearby = [];

    for (const b of boids) {

      if (b === this) continue;

      const dx = b.pos.x - this.pos.x;
      const dy = b.pos.y - this.pos.y;

      if (Math.abs(dx) < friendRadius && Math.abs(dy) < friendRadius) {
        nearby.push(b);
      }
    }

    this.friends = nearby;
  }

  /** 
   * RULES 
   * 1. alignment 
   * 2. collision 
   * 3. 
  */
  
  getAverageDir() {
    const sum = new THREE.Vector3(); // sum of directions 

    for (const o of this.friends) {

      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < friendRadius) {

        const copy = o.vel.clone().normalize().divideScalar(d);
        sum.add(copy);
      }
    }
    return sum;
  }

  getAvoidDir() {
    const steer = new THREE.Vector3();
    for (const o of this.friends) {
      const d = this.pos.distanceTo(o.pos);
      if (d > 0 && d < crowdRadius) {

        const diff = this.pos.clone().sub(o.pos);
        diff.normalize().divideScalar(d);

        steer.add(diff);
      }
    }
    return steer;
  }

  getMouseForce(mouse){

    const dir = mouse.clone()
        .sub(this.pos);


    const dist = dir.length();


    if(dist < 100){

        dir.normalize();

        // push away
        return dir.negate()
            .multiplyScalar(
                100/dist
            );
    }
    return new THREE.Vector3();
}

getAvoidAvoids(avoids) {
    const steer = new THREE.Vector3();

    for (const o of avoids) {
      const d = this.pos.distanceTo(o.pos);

      if (d > 0 && d < avoidRadius) {
        const diff = this.pos.clone().sub(o.pos); // diff = this position - other position
        diff.normalize().divideScalar(d);

        steer.add(diff); 
      }
    }
    return steer;
  }


  getCohesion() {
    const sum = new THREE.Vector3();
    let count = 0;

    for (const o of this.friends) {

      const d = this.pos.distanceTo(o.pos);

      if (d > 0 && d < coheseRadius) {
        sum.add(o.pos);
        count++;
      }
    }

    if (count === 0) return new THREE.Vector3();

    sum.divideScalar(count);

    return sum.sub(this.pos).multiplyScalar(0.05);
  }

  getCenterForce() {
    return this.pos.clone()
        .negate()          // vector toward center
        .multiplyScalar(0.0002);
}

/* WORLD */
bounce() {

  const dist = this.pos.length();
  if (dist > BOUND_RADIUS) {

    // normal vector from center
    const normal = this.pos.clone().normalize();

    // push back inside boundary
    this.pos.copy(normal.multiplyScalar(BOUND_RADIUS));

    // reflect velocity: v - 2(v·n)n
    const dot = this.vel.dot(normal);

    this.vel.sub(normal.multiplyScalar(2 * dot));

    // optional damping so it doesn't jitter forever
    this.vel.multiplyScalar(0.9);
  }
}
  increment() {
    this.thinkTimer = (this.thinkTimer + 1) % 5;
  }
}

/* SCENE IN THREE.JS */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000080);


/* AMBIENT LIGHT FOR THE FLOWER FIELD */ 
const directionalLight = new THREE.DirectionalLight(0xFFD1DC, 10);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 2000);
camera.position.z = 300;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
//controls.autoRotate= true; 

controls.minDistance = 10;   // How close you can zoom in
controls.maxDistance = 800;  // How far you can zoom out

/* EFFECTS */ 
let anaglyph = new AnaglyphEffect( renderer );
anaglyph.setSize( window.innerWidth, window.innerHeight );

// Configure stereo parameters for physically-correct rendering
// eyeSep: interpupillary distance (default 0.064m / 64mm for humans)
// planeDistance: distance to the zero-parallax plane (objects here appear at screen depth)
anaglyph.eyeSep = 0.2;
anaglyph.planeDistance = 24; // Match camera distance to origin for zero parallax at scene center


/* LOAD IN MODELS */
loadFacade(); 


/** FLOWERS
 * breakdown: 
 * italian -> 750, lily (model has 4),  188 generated
 * british/irish -> 375, shamrock (model has 12), 31 generated
 * french can -> 225, daisy (3 flowers per model), 75 generated
 * polish/ukraine -> 150
 * 
 * flowers function form : link, amount, size
 */
const flowers = []; 

createWildFlowers("flowers/lily.glb", 188, 130); // italian
createWildFlowers("flowers/clover.glb", 31, 90); // british/irish
createWildFlowers("flowers/daisy.glb", 75, 0.4); // french can 
createWildFlowers("flowers/sunflower.glb", 150, 37);  // polish/ukrain


/* LOAD IN PARTICLES */
const systems = [
    renderParticles(lastPollutants["O3"], 0xFFFFFF, 1), // function form: pollutant, color, size
    renderParticles(lastPollutants["SO2"], 0xFFFF, 3),
    renderParticles(lastPollutants["NO2"], 0xFFFF, 2), 
    renderParticles(lastPollutants["PM2.5"], 0xfff, 1.5)
];


window.addEventListener("mousemove", (event)=>{

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;


    raycaster.setFromCamera(mouse, camera);


    // intersect with Z=0 plane
    raycaster.ray.intersectPlane(
        plane,
        mouseWorld
    );

});

/* ANIMATE */
const radius = 50;
let angle = 0;

function animate() {
  requestAnimationFrame(animate);

  //zoomOut(); 

  // camera
  angle += 0.005;

  camera.position.x = Math.cos(angle) * radius;
  camera.position.y = Math.sin(angle) * radius;
  camera.lookAt(0,0,0)

  // animate 
 for (const system of systems) {
    updateParticles(system);
  }


    renderer.render(scene, camera);
    // anaglyph (replace renderer)
    anaglyph.render( scene, camera );

}

/* INTERVAL, zoom out every 5 minutes (not in use)  */ 

animate();

/* GENERIC RESIZE WINDOW HELPER */
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});


/* INITIALLY GENERATE PARTICLES */ 
function renderParticles(levels, col, weight) {

    const particles = []; // creates a new function specific collectin of particles 

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(levels * 3);

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
        size: weight,
        color: col
    });

    const points = new THREE.Points(
        geometry,
        material
    );

    scene.add(points);

    for (let i = 0; i < COUNT; i++) {

        particles.push(
            new Boid(
                (Math.random() - 0.5) ,
                (Math.random() - 0.5) ,
                (Math.random() - 0.5) 
            )
        );
    }

    return {
        particles,
        positions,
        geometry,
        material,
        points
    };
}


/* UPDATE PARTICLE SYSTEM */ 
function updateParticles(
    system
) {
    const particles = system.particles;
    const positions = system.positions;
    const geometry = system.geometry;

    // get particles neightbors, traj, etc and assign new position 
    for (let i = 0; i < particles.length; i++) {
        const b = particles[i];

        b.go(particles, [], mouseWorld);

        positions[i * 3]     = b.pos.x;
        positions[i * 3 + 1] = b.pos.y;
        positions[i * 3 + 2] = b.pos.z;
    }

    geometry.attributes.position.needsUpdate = true;
}


/* ADD PARTICLE IF AMOUNT CHANGES */ 
function addParticles(system, count) {

    for (let i = 0; i < count; i++) {
        system.particles.push(
            new Boid(
                (Math.random() - 0.5) * SIZE,
                (Math.random() - 0.5) * SIZE,
                (Math.random() - 0.5) * SIZE
            )
        );
    }

    const newPositions = new Float32Array(
        system.particles.length * 3
    );

    newPositions.set(system.positions);
    system.positions = newPositions;

    system.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            system.positions,
            3
        )
    );
}


/* REMOVE PARTICLES */ 
function removeParticles(system, count) {

    // Don't remove more than exist
    count = Math.min(count, system.particles.length);

    // Remove from the end
    system.particles.splice(
        system.particles.length - count,
        count
    );

    // Create smaller position buffer
    const newPositions = new Float32Array(
        system.particles.length * 3
    );

    system.positions = newPositions;

    system.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            system.positions,
            3
        )
    );
}


/* LOAD IN LIDAR SCAN */ 
async function loadFacade() {
    const loader = new GLTFLoader();

    // facade 
    loader.load("lidar_316_bridgeSt.gltf", function(gltf) {
        const facade = gltf.scene; 

        facade.scale.set(40,40,40)
        facade.position.set(0, -100, -40)
        scene.add(facade)
        
    
    }); 

}

/* LOAD IN LIDAR SCAN */ 
 function loadFacadePoints() {
    const loader = new GLTFLoader();

    // facade 
    loader.load("items/316_Bridge_St_PointGLB/316_Bridge_St_Point_Scan_08_58_02.gltf", function(gltf) {
        const facade = gltf.scene; 

        facade.scale.set(10,10,10)
        facade.position.set(200, 0, -100)
         facade.rotation.x = Math.PI / 2;

        scene.add(facade)
        
    
    }); 

}

/* UPDATE POLLUTANTS */ 
async function updatePollutants() {
    lastPollutants = { ...pollutants };

   // maxSpeed = (Math.random()+0.7)*1.5


    try {
        const response = await fetch(
            "https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=f4eca3bf-5ded-4d3c-a8dc-ed42486498f3&limit=100"
        );

        const data = await response.json();


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

          /*console.log(
              "updated:",
              pollutants
          );
*/
          console.log(
            "last pollutants", 
            lastPollutants,
            "pollutants", 
            pollutants
          )

    } catch (error) {

        console.error(
            "pollutant fetch failed:",
            error
        );
    }

    /* UPDATE PARTICLES */ 

    // check O3 levels
    if(pollutants["O3"] != lastPollutants["O3"]) {
      if(pollutants["O3"] > lastPollutants["O3"]) { 
        addParticles(systems[0], (Math.abs(lastPollutants["O3"] - pollutants["O3"])*inflation)) 
        console.log((Math.abs(lastPollutants["O3"] - pollutants["O3"])*inflation) + " o3 particles added. ")
      }
      else {
        removeParticles(systems[0], (Math.abs(lastPollutants["O3"] - pollutants["O3"])*inflation)) 
        console.log((Math.abs(lastPollutants["O3"] - pollutants["O3"])*inflation) + " o3 particles removed. ")
      }
    }

    // check SO2 levels
    if(pollutants["SO2"] != lastPollutants["SO2"]) {
      if(pollutants["SO2"] > lastPollutants["SO2"]) { 
        addParticles(systems[1], (Math.abs(lastPollutants["SO2"] - pollutants["SO2"])*inflation)) 
        console.log((Math.abs(lastPollutants["SO2"] - pollutants["SO2"])*inflation) + " SO2 particles added. ")
      }
      else {
        removeParticles(systems[1], (Math.abs(lastPollutants["SO2"] - pollutants["SO2"])*inflation)) 
        console.log((Math.abs(lastPollutants["SO2"] - pollutants["SO2"])*inflation) + " SO2 particles removed. ")
      }
    }


    // check NO2 levels
    if(pollutants["NO2"] != lastPollutants["NO2"]) {
      if(pollutants["NO2"] > lastPollutants["NO2"]) { 
        addParticles(systems[2], (Math.abs(lastPollutants["NO2"] - pollutants["NO2"])*inflation)) 
        console.log((Math.abs(lastPollutants["NO2"] - pollutants["NO2"])*inflation) + " NO2 particles added. ")
      }
      else {
        removeParticles(systems[2], (Math.abs(lastPollutants["NO2"] - pollutants["NO2"])*inflation)) 
        console.log((Math.abs(lastPollutants["NO2"] - pollutants["NO2"])*inflation) + " NO2 particles removed. ")
      }
    }

    // check PM2.5 levels
    if(pollutants["PM2.5"] != lastPollutants["PM2.5"] ) {
      if(9999 > pollutants["PM2.5"] > lastPollutants["PM2.5"] > -9999) { 
        addParticles(systems[3], (Math.abs(lastPollutants["PM2.5"] - pollutants["PM2.5"])*inflation)) 
        console.log((Math.abs(lastPollutants["PM2.5"] - pollutants["PM2.5"])*inflation) + " PM2.5 particles added. ")
      }

      else if(pollutants["PM2.5"] > lastPollutants["PM2.5"]) {
        removeParticles(systems[3], (Math.abs(lastPollutants["PM2.5"] - pollutants["PM2.5"])*inflation)) 
        console.log((Math.abs(lastPollutants["PM2.5"] - pollutants["PM2.5"])*inflation) + " NO2 particles removed. ")
      }

    }

    
}



function zoomOut() {
  camera.position.setLength(200); 
}


/* PERLIN NOISE FOR FLOWERS */ 
async function createWildFlowers(url, c, s) {
  const noise2D = createNoise2D(); // generate the perlin noise

const loader = new GLTFLoader(); // loader for all of the gltf files 

loader.load(url, function(gltf) {

const baseFlower = gltf.scene;
baseFlower.scale.set(1, 1, 1);

const size = 400;
const half = size / 2;

// increase this for density
const count = c;

for (let i = 0; i < count; i++) {

  // 🎯 square distribution
  const x = (Math.random() - 0.5) * size;
  const z = (Math.random() - 0.5) * size;

  // noise filter (controls clustering)
  const n = noise2D(x * 0.03, z * 0.03);

  if (n > 0.1) { // lower threshold = more flowers, dont generate if on the car
    const flower = baseFlower.clone(true); // 

    flower.position.set(x-30, -110, z+180);

    // variation (makes it look natural)
    //const s = 15 + Math.random() * 10;
    flower.scale.set(s, s, s);

    flower.rotation.y = Math.random() * Math.PI * 2;

    scene.add(flower);
    flowers.push(flower);
  }
}
}); 

}