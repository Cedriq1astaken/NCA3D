import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

let path = "./models/chicken/chicken_model.ort";
let size = 16;
let channels = 16;
let targetY = 0;
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
let lastTime = performance.now();
let fps = 0;

// -------------------- SCENE SETUP --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE4FDE1);

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
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x90CF8E });
const wireframeCube = new THREE.LineSegments(edges, lineMaterial);
scene.add(wireframeCube);

// -------------------- INSTANCED MESH --------------------
const voxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
const voxelMaterial = new THREE.MeshBasicMaterial();
const maxVoxels = size * size * size;
instancedMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, maxVoxels);

instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
wireframeCube.add(instancedMesh);

const hoverGeom = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
const hoverMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
});

const hoverVoxel = new THREE.Mesh(hoverGeom, hoverMat);
hoverVoxel.visible = false;
wireframeCube.add(hoverVoxel);


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
                        (y - size / 2 + 0.5) * voxelSize,
                        (x - size / 2 + 0.5) * voxelSize, 
                        (z - size / 2 + 0.5) * voxelSize
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

window.addEventListener('mousemove', (e) => {
    e.preventDefault();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObject(boundsCube);
    
    if (!intersects.length) {
        hoverVoxel.visible = false;
        return;
    }

    const intersect = intersects[0];
    const localPoint = intersect.point.clone();
    
    wireframeCube.worldToLocal(localPoint);

    const x = Math.floor( ((localPoint.x + (wire_size/2)) / wire_size) * size );
    const y = Math.floor( ((localPoint.y + (wire_size/2)) / wire_size) * size );
    const z = Math.floor( ((localPoint.z + (wire_size/2)) / wire_size) * size );

    const rayDir = raycaster.ray.direction.clone();
    const inverseRotation = new THREE.Quaternion();
    wireframeCube.getWorldQuaternion(inverseRotation).invert();
    rayDir.applyQuaternion(inverseRotation);

    const voxel = findVoxel([x, y, z], [rayDir.x, rayDir.y, rayDir.z]);

    if (!voxel) {
        hoverVoxel.visible = false;
        return;
    }

    const [vx, vy, vz] = voxel;

    hoverVoxel.visible = true;
    hoverVoxel.position.set(
        (vx - size / 2 + 0.5) * voxelSize,
        (vy - size / 2 + 0.5) * voxelSize,
        (vz - size / 2 + 0.5) * voxelSize
    );
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('wheel', (e)=>{
    e.preventDefault();
    targetY = Math.floor(Math.min(Math.max(0, targetY + e.deltaY/50), 15));
})

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        document.getElementById("start").innerText = (document.getElementById("start").innerText == "START") ? "STOP" : "START";
        playing = !playing;
        console.log('Playing:', playing);
    }
    if (e.key === "ArrowLeft")
        wireframeCube.rotation.y -= 0.02;
    if (e.key == "ArrowRight")
        wireframeCube.rotation.y += 0.02;
});
document.getElementById("start").addEventListener('click', () =>{
    document.getElementById("start").innerText = (document.getElementById("start").innerText == "START") ? "STOP" : "START";
    playing = !playing;
    console.log('Playing:', playing);
})

document.addEventListener("mousedown", (e) => {
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObject(boundsCube);
    
    if (!intersects.length) {
        hoverVoxel.visible = false;
        return;
    }

    const intersect = intersects[0];
    const localPoint = intersect.point.clone();
    
    wireframeCube.worldToLocal(localPoint);

    const x = Math.floor( ((localPoint.x + (wire_size/2)) / wire_size) * size );
    const y = Math.floor( ((localPoint.y + (wire_size/2)) / wire_size) * size );
    const z = Math.floor( ((localPoint.z + (wire_size/2)) / wire_size) * size );

    const rayDir = raycaster.ray.direction.clone();
    const inverseRotation = new THREE.Quaternion();
    wireframeCube.getWorldQuaternion(inverseRotation).invert();
    rayDir.applyQuaternion(inverseRotation);

    const voxel = findVoxel([x, y, z], [rayDir.x, rayDir.y, rayDir.z]);

    if (e.button === 0) {
        gnca.damage([y, x, z], [rayDir.y, rayDir.x, rayDir.z], 4);
    }

    else if (e.button === 2) {
        if (voxel) gnca.grow(y, x, z);
    }
});

function findVoxel(point, direction) {
    let [x, y, z] = point;
    let [vx, vy, vz] = direction;
    
    const mag = Math.hypot(vx, vy, vz) || 1;
    vx /= mag;
    vy /= mag;
    vz /= mag;
    
    let t = 0;
    const stepSize = 0.1; 
    while(true){
        const cx = x + vx * t;
        const cy = y + vy * t;
        const cz = z + vz * t;
        
        if (
            cx < 0 || cy < 0 || cz < 0 ||
            cx >= size || cy >= size || cz >= size
        ) break;
        
        if (Math.floor(cy) === targetY) {
            return [Math.floor(cx), Math.floor(cy), Math.floor(cz)];
        }
        
        t += stepSize;
    }
    
    return null;
}

// -------------------- MAIN LOOP --------------------
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = now - lastTime;
    const currentFPS = 1000 / delta;
    fps = fps * 0.9 + currentFPS * 0.1; // smoothing
    lastTime = now;

    if (playing) {
        frameCount++;
        if (frameCount % frameSkip === 0) {
            automata.step();
            updateVisuals();
            document.getElementById("fps").textContent = `FPS: ${fps.toFixed(0)}`; 
            document.getElementById("step").textContent = `STEP: ${frameCount}`;
        }
    }
    
    wireframeCube.rotation.y += 0.001
    renderer.render(scene, camera);
    console.log(targetY)
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