/**
 * 
 * 
 * 
 * CREDITS: 
 * flocking code derived from https://github.com/jackaperkins/boids/blob/master/Boid.pde
 * 
 */


/* TITLE */ 
// 1. Create the new element (e.g., a paragraph)
const txt = document.createElement('p');

// 2. Add text content safely (prevents HTML injection)
txt.textContent = 'Contamination';
txt.textContent = 'Contamination';

txt.style.position = 'relative'
txt.style.color = 'white'


// 3. Append the element to the body
document.body.appendChild(txt);



/* AIR DATA */ 
// update every minute
// get pollutants 
const s = "06"; // from station 6
let pollutants = {O3: 0,SO2: 0,NO2: 0,"PM2.5": 0}; // some default standards 
let lastPollutants = {O3: 0,SO2: 0,NO2: 0,"PM2.5": 0};  // some default standards 
const inflation = 30; //how much the pollutants are scaled 

setInterval(
    updatePollutants,
    60 * 10
);




/* VISUAL SYSTEM */ 
import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const COUNT = 200; // split into levels, 
const SIZE = 60;
const BOUND_RADIUS = 200;

const friendRadius = 20;;
const crowdRadius = 20;
const coheseRadius = 2;
const avoidRadius = 60;

let maxSpeed = 2;

const option_friend = true;
const option_crowd = true;
const option_avoid = true;
const option_noise = true;
const option_cohese = true;



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

  flock(avoids, m) {

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
    noise.multiplyScalar(option_noise ? 0.25: 0); // toggle noise
    cohese.multiplyScalar(option_cohese ? 0.2 : 0);   // toggle cohesion

    this.vel.add(align);                            // apply align
    this.vel.add(avoidDir);                         // apply crowd avoid
    this.vel.add(avoidObjs);                        // apply obstacle avoid
    this.vel.add(noise);                            // apply noise
    this.vel.add(cohese);                           // apply cohesion

    if (this.vel.length() > maxSpeed) {             // limit speed
      this.vel.setLength(maxSpeed);
    }

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
        .multiplyScalar(0.0005);
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
camera.position.z = 300;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate= true; 


/* LOAD IN MODELS */
loadFacade(); 


/* LOAD IN PARTICLES */
const systems = [
    // O3

    renderParticles(lastPollutants["O3"], 0xFFFFFF, 1),
    renderParticles(lastPollutants["SO2"], 0xFFFF, 3),
    renderParticles(lastPollutants["NO2"], 0xFFFF, 1), 
    renderParticles(lastPollutants["PM2.5"], 0xfff, 1)
];



/* ANIMATE */
const radius = 50;
let angle = 0;

function animate() {
  requestAnimationFrame(animate);

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

}

animate();

/* GENERIC RESIZE WINDOW HELPER */
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});


function renderParticles(levels, col, weight) {

    const particles = [];

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

    for (let i = 0; i < particles.length; i++) {

        const b = particles[i];

        b.go(particles, []);

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
    loader.load("items/lidar_316_bridgeSt.gltf", function(gltf) {
        const facade = gltf.scene; 

        facade.scale.set(20,20,20)
        facade.position.set(0, -100, -40)
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

