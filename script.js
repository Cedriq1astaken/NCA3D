import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

let path = "./models/chicken/chicken_model.ort";
let size = 16;
let channels = 16;
let y_index = 0;
const voxelSize = 0.08;
let gnca = new NCA(path, size, channels);
let automata = gnca;
let instancedMesh;
const dummy = new THREE.Object3D();
const colorHelper = new THREE.Color();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// -------------------- PARAMETERS --------------------
const wire_size = 1.3;
let playing = false;
let frameCount = 0;
const frameSkip = 5; 
const w = window.innerWidth;
const h = window.innerHeight;
const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 10;


// -------------------- SCENE SETUP --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE3EFE8);

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    canvas: document.getElementById('canvas'),
});
renderer.setSize(w, h);

// -------------------- WIREFRAME --------------------
const geometry = new THREE.BoxGeometry(wire_size, wire_size, wire_size);
const edges = new THREE.EdgesGeometry(geometry);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x808080 });
const wireframeCube = new THREE.LineSegments(edges, lineMaterial);
scene.add(wireframeCube);

// -------------------- INSTANCED MESH --------------------
const voxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
const voxelMaterial = new THREE.MeshBasicMaterial();
const maxVoxels = size * size * size;
instancedMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, maxVoxels);

instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
wireframeCube.add(instancedMesh);

const boundsMaterial = new THREE.MeshBasicMaterial({ 
    visible: false  
});
const boundsCube = new THREE.Mesh(geometry, boundsMaterial);
wireframeCube.add(boundsCube);
// -------------------- UPDATE VISUALS --------------------

function updateVisuals() {
    if (!instancedMesh) return;
    const state = automata.state;
    const N = size; // 16
    const offset = (size / 2) * voxelSize;
    let visibleCount = 0;

    for (let z = 0; z < N; z++) {
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {

                const idx = (z * N * N + y * N + x) * channels;
                const alpha = state[idx + 3];
                const instanceIdx = z * N * N + y * N + x;

                if (alpha > 0.1) {
                    dummy.position.set(
                        (y - size / 2) * voxelSize,
                        (x - size / 2) * voxelSize, 
                        (z - size / 2) * voxelSize
                    );
                    dummy.scale.set(1, 1, 1);
                    

                    const r = Math.max(0, Math.min(1, state[idx + 0]));
                    const g = Math.max(0, Math.min(1, state[idx + 1]));
                    const b = Math.max(0, Math.min(1, state[idx + 2]));
                    colorHelper.setRGB(r, g, b);

                    instancedMesh.setColorAt(instanceIdx, colorHelper);
                    visibleCount++;
                } else {
                    dummy.scale.set(0, 0, 0);
                }

                dummy.updateMatrix();
                instancedMesh.setMatrixAt(instanceIdx, dummy.matrix);
            }
        }
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
}


// -------------------- CONTROLS --------------------

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
 
window.addEventListener('mousemove', onMouseMove, false);

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('wheel', (e)=>{
    y_index = Math.floor(Math.min(Math.max(0, y_index + e.deltaY/20), 15));
})

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        playing = !playing;
        console.log('Playing:', playing);
    }
});


document.addEventListener("mousedown", (e) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(boundsCube);
    const hits = intersects[0];

    let ramp = (x, inMin, inMax, outMin, outMax) =>{
        return outMin + (x - inMin) * (outMax - outMin) / (inMax - inMin);
    }
    if(intersects.length > 0){
        const coords = hits.point;
        let x = coords.x;
        let y = coords.y;
        let z = coords.z;
        const n = wire_size/2;
        const theta = wireframeCube.rotation.y;
        const cosA = Math.cos(theta);
        const sinA = Math.sin(theta);

        const xOriginal = x;
        x = xOriginal * cosA - z * sinA;
        z = xOriginal * sinA + z * cosA;  
        y = y;

        x = ramp(x, -n, n, 0, size);
        y = ramp(y, -n, n, 0, size);
        z = ramp(z, -n, n, 0, size);

        x = Math.floor(x);
        y = Math.floor(y);
        z = 15 - Math.floor(z);

        const direction = [
            0,
            sinA,
            cosA
        ]
        if(e.button === 0){
            console.log("p")

            gnca.damage([y, x, z], direction, 4)
        }
        
        else if(e.button === 2){
            console.log("s")
            gnca.grow(0, 0, 0);
            gnca.grow(15, 0, 0);
            gnca.grow(0, 15, 0);
            gnca.grow(15, 15, 0);
        }
    }
})

function findVoxel(point, direction){
    [x, y, z] = point;
    [vx, vy, vz] = direction;

    let t = 0;
    
    while(true){
        const cx = x + vx * t;
        const cy = y + vy * t;
        const cz = z + vz * t;

        
        if (
            cx < 0 || cy < 0 || cz < 0 ||
            cx >= this.size || cy >=  this.size || cz >=  this.size
        ) break;

        if (Math.floor(cy) == y_index){
            return [cx, cy, cz];
        }
    }
}

// -------------------- MAIN LOOP --------------------
function animate() {
    requestAnimationFrame(animate);
    
    if (playing) {
        frameCount++;
        if (frameCount % frameSkip === 0) {
            automata.step();
            updateVisuals();
        }
    }
    
    wireframeCube.rotation.y += 0.001
    renderer.render(scene, camera);
    console.log(y_index)
}

// -------------------- WINDOW RESIZE --------------------
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

// -------------------- START --------------------
animate();
updateVisuals();