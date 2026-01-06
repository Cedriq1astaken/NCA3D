class NCA {
    constructor(modelUrl, size = 16, channels = 16, fireRate = 0.6) {
        this.size = size;
        this.channels = channels;
        this.fireRate = fireRate;
        this.state = this.createSeed();
        this.session = null;
        this.ready = this.loadModel(modelUrl);
    }
    

    async loadModel(url) {
        try {
            this.session = await ort.InferenceSession.create(url);
            console.log("NCA model loaded successfully!");
            console.log("Input names:", this.session.inputNames);
            console.log("Output names:", this.session.outputNames);
        } catch (e) {
            console.error("Failed to load model:", e);
        }
    }

    createSeed() {
        const total = this.size * this.size * this.size * this.channels;
        const state = new Float32Array(total);
        const center = Math.floor(this.size / 2)
        const idx = this._getIndex(center, center, center);
        for (let c = 3; c < this.channels; c++){
            state[idx + c] = 1.0
        }
        return state
    }


    _getIndex(z, y, x) {
        return  this.channels * (z * this.size * this.size + y * this.size + x);
    }

    async step() {
        if (!this.session) return this.state;

        const numVoxels = this.size ** 3;

        const inputData = new Float32Array(this.state.length);
        for (let i = 0; i < numVoxels; i++) {
            for (let c = 0; c < this.channels; c++) {
                inputData[c * numVoxels + i] = this.state[i * this.channels + c];
            }
        }

        const inputTensor = new ort.Tensor('float32', inputData, [1, this.channels, this.size, this.size, this.size]);
        const feeds = { [this.session.inputNames[0]]: inputTensor };

        const results = await this.session.run(feeds);
        const output = results["mul_1"].data; 

        for (let i = 0; i < numVoxels; i++) {
            for (let c = 0; c < this.channels; c++) {
                this.state[i * this.channels + c] = output[c * numVoxels + i];
            }
        }

        return this.state;
    }

    damage(start, direction, radius = 2) {
        const [sx, sy, sz] = start;
        let [vx, vy, vz] = direction;

        const mag = Math.hypot(vx, vy, vz) || 1;
        vx /= mag;
        vy /= mag;
        vz /= mag;


        let t = 0;

        while (true) {
            const cx = sx + vx * t;
            const cy = sy + vy * t;
            const cz = sz + vz * t;

            if (
                cx < 0 || cy < 0 || cz < 0 ||
                cx >= this.size || cy >=  this.size || cz >=  this.size
            ) break;

            for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
                for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
                    for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z++) {

                        if (
                            x < 0 || y < 0 || z < 0 ||
                            x >=  this.size || y >=  this.size || z >=  this.size
                        ) continue;

                        const d = Math.hypot(x - cx, y - cy, z - cz);
                        if (d <= radius) {
                            let idx = this._getIndex(z, y, x) 
                            for (let i =0; i < 4; i++)
                                this.state[idx + i] = 0.0 ;
                        }
                    }
                }
            }

            t += 1; 
        }
    }

    grow(x, y, z){

        for(let i = 0; i < 2; i++){
            for(let j = 0; j <  2; j++){
                for(let k = 0; k < 2; k++){
                    for (let c = 3; c < this.channels; c++){
                        let ci = Math.min(Math.max(x + i, 0), 15);
                        let cj = Math.min(Math.max(y + j, 0), 15);
                        let ck = Math.min(Math.max(z + k, 0), 15);
                        this.state[this._getIndex(ci, cj, ck) + c] = 1.0
                    }
                }
            }
        }

    }



    applyAliveMask(state) {
        const aliveThreshold = 0.05; 
        const masked = new Float32Array(state.length);

        for (let z = 0; z < this.size; z++) {
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    const idx = this._getIndex(z, y, x);
                    
                    let hasAliveNeighbor = false;
                    // Check 3x3x3 neighborhood (Max Pool)
                    neighborhood:
                    for (let dz = -1; dz <= 1; dz++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const nz = z + dz, ny = y + dy, nx = x + dx;
                                if (nz >= 0 && nz < this.size && ny >= 0 && ny < this.size && nx >= 0 && nx < this.size) {
                                    // Channel 3 is Alpha
                                    if (state[this._getIndex(nz, ny, nx) + 3] > aliveThreshold) {
                                        hasAliveNeighbor = true;
                                        break neighborhood;
                                    }
                                }
                            }
                        }
                    }

                    if (hasAliveNeighbor) {
                        for (let c = 0; c < this.channels; c++) {
                            masked[idx + c] = state[idx + c];
                        }
                    }

                }
            }
        }
        return masked;
    }
}
