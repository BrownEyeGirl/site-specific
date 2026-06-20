/**
 * 
 * 
 * 
 * CREDITS: 
 * flocking code derived from https://github.com/jackaperkins/boids/blob/master/Boid.pde
 * 
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


/* VISUAL SYSTEM */ 
import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const COUNT = 300; // split into levels, 
const SIZE = 60;
const BOUND_RADIUS = 600;

const friendRadius = 70;
const crowdRadius = 60;
const coheseRadius = 30;
const avoidRadius = 30;

const maxSpeed = 2;

const option_friend = true;
const option_crowd = true;
const option_avoid = true;
const option_noise = true;
const option_cohese = false;

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

  go(boids, avoids) {

    this.increment();
    this.bounce();

    if (this.thinkTimer === 0) {
      this.getFriends(boids);
    }

    this.flock(avoids);

    this.pos.add(this.vel);
  }

  flock(avoids) {

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
    align.multiplyScalar(option_friend ? 1.2 : 0); // toggle align
    avoidDir.multiplyScalar(option_crowd ? 1 : 0); // toggle crowd avoid 
    avoidObjs.multiplyScalar(option_avoid ? 3 : 0); // strong obstacle avoid
    noise.multiplyScalar(option_noise ? 0.1: 0); // toggle noise
    cohese.multiplyScalar(option_cohese ? 1 : 0);   // toggle cohesion

    this.vel.add(align);                            // apply align
    this.vel.add(avoidDir);                         // apply crowd avoid
    this.vel.add(avoidObjs);                        // apply obstacle avoid
    this.vel.add(noise);                            // apply noise
    this.vel.add(cohese);                           // apply cohesion

    if (this.vel.length() > maxSpeed) {             // limit speed
      this.vel.setLength(maxSpeed);
    }
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
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 2000);
camera.position.z = 800;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate= true; 

/* BOIDS */
const boids = [];



/* LOAD IN MODELS */
//loadFacade(); 

/* PARTICLES */



//renderParticles(boids, 0xffff); 
//renderParticles(particlesCO, 0xffff); 



const systems = [
    renderParticles(0xff0000),
    renderParticles(0x00ff00),
    renderParticles(0x0000ff)
];



/* ANIMATE */
function animate() {
  requestAnimationFrame(animate);

  // animate 
 for (const system of systems) {
        updateParticles(
            system.particles,
            system.positions,
            system.geometry
        );
    }
    renderer.render(scene, camera);

}

animate();

/* GENERIC RESIZE WINDOW HELPER */
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});


function renderParticles(col) {

    const particles = [];

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
        size: 8,
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
                (Math.random() - 0.5) * SIZE,
                (Math.random() - 0.5) * SIZE,
                (Math.random() - 0.5) * SIZE
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


function updateParticles(
    particles,
    positions,
    geometry
) {

    for (let i = 0; i < particles.length; i++) {

        const b = particles[i];

        b.go(particles, []);

        positions[i * 3]     = b.pos.x;
        positions[i * 3 + 1] = b.pos.y;
        positions[i * 3 + 2] = b.pos.z;
    }

    geometry.attributes.position.needsUpdate = true;
}



/* LOAD IN LIDAR SCAN */ 
async function loadFacade() {
    const loader = new GLTFLoader();

    // facade 
    loader.load("items/house_test/scene.gltf", function(gltf) {
        const facade = gltf.scene; 

        facade.scale.set(10,10,10)
        facade.position.set(0, 0, -10)
        scene.add(facade)
    
    }); 

}