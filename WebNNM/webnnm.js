// WebNNM web browser library for inference and training neural network models
// with WebNN as a platform independent backend using NPUs, GPUs and CPUs

const NN_READABLE = 1;  // used for model outputs
const NN_WRITABLE = 2; // used for model inputs
const NN_READ_WRITE = (NN_READABLE | NN_WRITABLE);

// testing harness interface
export class NNTest {
    constructor (webnn) {
        this.webnn = webnn;
    }
    
    static async create (config) {
        // Check for WebNN API support
        if (!navigator.ml) {
            log("Error: WebNN API is not supported in this browser.");
            return;
        }
        
        try {
            const webnn = await navigator.ml.createContext(config);
            return new NNTest(webnn);
        } catch (e) {
            log("failed to acquire WebNN context");
        }
    }
    
    // create a DAG node for a given operator type
    makeNode (type, name, inputs, attributes={}) {
        return createNode(type, name, inputs, attributes);
    }
}

export class NNModel {
    #webnn;
    #config;
    #engine;
    #dataset;
    #datasetToModel = {}; // maps names of inputs and outputs

    constructor (webnn, config = {}) {
        this.#webnn = webnn;
        this.#config = config;
        this.#engine = new NNEngine(this);
    }
    
        // used to interpret tensor value using it's dataType
    static ML_TYPE_MAP (name) {
        const map = {
            'float32': Float32Array,
            'float16': Float16Array, // Note: Requires browser support for Float16Array
            'int32':   Int32Array,
            'uint32':  Uint32Array,
            'int8':    Int8Array,
            'uint8':   Uint8Array
        };
        
        return map[name];
    }
    
    // factory method for models
    static async create (config) {
        async function checkSupportedDataTypes(webnn) {
            try {
                // Fetch the limits for the context's device (e.g., NPU or GPU)
                const limits = await webnn.opSupportLimits();
                log("  supported datatypes: " + limits.constant.dataTypes);
                log("  max tensor byte length: " + limits.maxTensorByteLength);
            } catch (error) {
                log("\nSorry, couldn't retrieve context info:", error);
            }
        }
        
        // Check for WebNN API support
        if (!navigator.ml) {
            log("Error: WebNN API is not supported in this browser.");
            log("You may be able to enable WebNN by setting a configuration " +
                "flag, then shutting down and restarting the browser:");
            log("Try typing 'chrome://flags' into the location field and then " +
                "search for 'neural'. Change the option from Default to Enabled.")
            return;
        }
        
        try {
            const webnn = await navigator.ml.createContext(config);
            log("\nAcquired WebNN context");
            await checkSupportedDataTypes(webnn);

            const model = new NNModel(webnn, config);
            
            model.#dataset = config.dataset;
            
            if (config.source) {
                model.parse(config.source);
                
                log('\nNeural network model:\n');
                log(model.serialize());
                
                if (model.blocks.size) {
                    model.dag = new NNTopology(model.blocks);
                    let names = [];
                    for (const name in model.dag.params)
                        names.push(name);
                    log(`\nParameter names: ${names.join(', ')}\n`);
                
                    log('Neural network graph in execution order:');
                    log(model.dag.serialize() + '\n');   
                    
                    // for debugging
                    const numGroups = 2;
                    log(`\nDAG Parameter path ratios:`);
                    model.dag.executionList.forEach(node => {
                        if (node.type === 'param') {
                            log(`  ${node.name}: max dist to input ${node.maxDistToInput}` +
                                `, max dist to output ${node.maxDistToOutput}` +
                                `, path ratio = ${(node.maxDistToInput/(node.maxDistToInput+node.maxDistToOutput)).toFixed(3)}`);
                        }
                    });
                }
            } else if (config.url) {
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`Failed to load document: ${response.statusText}`);
                }
                
                model.parse(response.text);
        
                log('\nNeural network model:\n');
                log(model.serialize());
                
                if (model.blocks.size) {
                    model.dag = new NNTopology(model.blocks);
                
                    log('Neural network graph in execution order:');
                    log(model.dag.serialize());
                }
            }
                
            return model;
        } catch (e) {
            log(e);
        }
    }
    
    webnn () {
        return this.#webnn;
    }
    
    inputs () {
        return this.dag.inputs;
    }
    
    input (name) {
        return this.dag.inputs[name];
    }
    
    outputs () {
        return this.dag.outputs;
    }
    
    params () {
        return this.dag.params;
    }
    
    // dataset may use different input/output names 
    // this allows applications to declare the mapping
    // e.g. audio -> model
    datasetToModel (name) {
        return this.#datasetToModel[name] ?? name;
    }
    
    setDatasetToModel (map) {
        this.#datasetToModel = map;
    }
    
    // list of input blocks
    inputBlocks () {
        let blocks = [];
        for (const name in this.blocks) {
            const block = this.blocks[name];
            if (block && block.input()) {
                blocks.push(block);
            }
        }
        return blocks;
    } 

    // list of output blocks
    outputBlocks () {
        let blocks = [];
        for (const name in this.blocks) {
            const block = this.blocks[name];
            if (block && block.output()) {
                blocks.push(block);
            }
        }
        return blocks;
    }
    
    // inference context object for model's inputs and outputs
    async createContext () {
        return NNContext.create(this);
    }

    async getTensor(name, descriptor, tensors) {
        function sameShape(a, b) {
            if (a.length !== b.length)
                return false;
                
            const length = a.length;
                
            for (let i = 0; i < length; ++i) {
                if(a[i] !== b[i])
                    return false;
            }
            
            return true;
        }
        
        const webnn = this.#webnn
        let tensor = tensors[name];
        
        if (tensor) {
            if (! (tensor.dataType === descriptor.dataType &&
                    sameShape(tensor.shape, descriptor.shape) &&
                    tensor.readable === descriptor.readable &&
                    tensor.writable === descriptor.writable)
            ) {
                tensor.destroy();
                tensor = await webnn.createTensor(descriptor);
            }
        } else {
            tensor = await webnn.createTensor(descriptor);
        }
        
        if (tensors) tensors[name] = tensor;
        return tensor;
    }
    
    // helper for model.scout and model.test
    // updates inputs and outputs as name->MLTensor
    async prepareTestInputs (batch, batchSize, inputs, outputs, scouting = false) {
        const model = this;
        const webnn = model.#webnn;
        
        function prefix (name) {
            const parts = name.split(':');
            return parts[0];
        }
        
        // add validCount to inputs for actual number of samples in batch
        const validCount = batch.validCount; // actual number of samples
        const descriptor = {dataType: 'int32', shape: [], readable: false,  writable: true};
        const tensor = await webnn.createTensor(descriptor);
        webnn.writeTensor(tensor, new Int32Array([validCount]));
        inputs['validCount'] = tensor;
        
        // add scouting metrics to outputs if needed
        if (scouting) {
            const descriptor = {dataType: 'float32', shape: [], readable: true,  writable: false};
            outputs['metric:gradRatio'] = await webnn.createTensor(descriptor);            
            outputs['metric:deadRatio'] = await webnn.createTensor(descriptor);           
        }

        // get tensor for sample model inputs, then write them
        for (const key in model.dag.inputs) {
            // prepare tensor for model input
            const node = model.dag.inputs[key];
            const descriptor = node.descriptor(batchSize);
            const blockName = prefix(key);
            
            if (!batch.inputs[blockName])
                throw new Error(`dataset lacks data for ${blockName}`);
                
            const tensor = await webnn.createTensor(descriptor);
            webnn.writeTensor(tensor, batch.inputs[blockName].data);
            inputs[key] = tensor;
        }
        
        // add model params as inputs
        for (const key in model.dag.params) {
            const param = model.dag.params[key]; // ParamNode
            const descriptor = param.descriptor(batchSize);
            const tensor = await webnn.createTensor(descriptor);
            webnn.writeTensor(tensor, param.buffer);
            inputs[key] = tensor;
        }
        
        // get tensors for expected model outputs, then write them
        for (const key in model.dag.outputs) {
            const blockName = prefix(key);
            const lossName = blockName + ':loss';
            const expectedName = blockName + ':expected';

            // prepare tensor reading back the batch loss
            const node = model.dag.outputs[key];
            
            // copy descriptor for model output
            let expectedDescriptor = {...node.descriptor(batchSize)};
            let lossDescriptor = {...expectedDescriptor};
            lossDescriptor.shape = [];  // it is a scalar output
            
            // update flags as this will an input to the graph
            expectedDescriptor.readable = false;
            expectedDescriptor.writable = true;
            
            let tensor = await webnn.createTensor(lossDescriptor);
            outputs[lossName] = tensor;
            
            if (!batch.inputs[blockName])
                throw new Error(`dataset lacks data for ${blockName}`);
                
            tensor = await webnn.createTensor(expectedDescriptor);
            inputs[expectedName] = tensor;
            webnn.writeTensor(tensor, batch.outputs[blockName].data);
        }
    }
    
    // helper for model.scout()
    calculateHealthScore(m) {
        let score = 0;
        // Penalty for vanishing/exploding gradients (ideal ratio is ~1.0)
        const logGrad = Math.abs(Math.log10(m.gradRatio + 1e-9));
        score -= logGrad * 10; 

        // Penalty for dead neurons (0% is best)
        score -= (m.deadRatio * 100);

        // Find highest initial loss
        let highestLoss = 0;
        for (const blockName in m.losses) {
            const loss = m.losses[blockName];
            if (loss > highestLoss)
                highestLoss = loss 
        }
        
        // Reward for lower initial loss (within reason)
        
        score -= highestLoss; 

        return score;
    }

    // helper for model.scout()
    captureWeights() {
        const snapshot = {};
        for (const [name, param] of Object.entries(this.dag.params)) {
            // Clone the current buffer (assuming param.data is the ArrayBuffer/TypedArray)
            snapshot[name] = new param.buffer.constructor(param.buffer);
        }
        return snapshot;
    }

    // helper for model.scout()
    restoreWeights(snapshot) {
        for (const [name, data] of Object.entries(snapshot)) {
            this.dag.params[name].buffer.set(data);
        }
    }

    // helper for reading back scalar value from tensor
    async readScalar (tensor) {
        const model = this;
        const webnn = model.#webnn;
        const loss = await webnn.readTensor(tensor);  
        const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
        const array = new DataType(loss);
        return array[0];
    }
    
    // Run the WebNN inference graph on the application supplied inputs
    // The model config overrides the model in respect to the
    // values for batch size and sequence length used for inference
    async run (context) {
        const model = this;
        const webnn = model.#webnn;
        let batchSize = 1;
        
        if (context && context.batchSize)
            batchSize = context.batchSize;
        
        const graph = await model.#engine.inferenceGraph(batchSize);
                        
        let inputs = context.inputs();  // no params since built as WebNN constants
        let outputs = context.outputs();
        
        await webnn.dispatch(graph, inputs, outputs);
    }
    
    // Run WebNN testing graph on dataset passed on start up
    // Batched testing where last batch is usually smaller
    // Allow for models with multiple inputs and outputs
    async test (subset) {
        const model = this;
        const dataset = model.#dataset;
        subset = subset ?? dataset.subsetRole.TESTING;
        const testing = (subset === dataset.subsetRole.TESTING);
        const webnn = model.#webnn;
        const testingSampleCount = dataset.subsetSize(subset);
        
        // nothing to test if no data!
        if (testingSampleCount === 0)
            return;
                    
        function prefix (name) {
            const parts = name.split(':');
            return parts[0];
        }
        
        let averageLosses = {};
        let numberOfSamples = 0;
        
        // prepare evaluation epoch as iterator over batches
        dataset.prepareBatches(subset);
        const batchCount = dataset.getNumBatches(subset);
        const batchSize = dataset.getBatchSize(); // fixed for all batches      
        const graph = await model.#engine.testingGraph(batchSize);
        const inputs = {}, outputs = {};
        
        if (testing)
            log(`\nTesting against ${dataset.name()} dataset: ${testingSampleCount} test samples`);
        else
            log(`\nValidation: ${testingSampleCount} samples`);

        for (let i = 0; i < batchCount; ++i) {
            const testBatch = dataset.getNextBatch(subset, model);
            const validCount = testBatch.validCount; // actual number of samples
            
            // initialise inputs and outputs excluding metrics
            await this.prepareTestInputs (testBatch, batchSize, inputs, outputs, false);
            
            await webnn.dispatch(graph, inputs, outputs);
            
            if (testing)
                log(`  processed batch ${i+1}, size ${batchSize}, actual ${validCount}`);

            // readback the loss for each model output
            for (const key in model.dag.outputs) {
                const node = model.dag.outputs[key];
                const blockName = prefix(key);
                const name = blockName + ':loss';
                const tensor = outputs[name]
                const loss = await this.readScalar(tensor);
        
                if (averageLosses[name] === undefined)
                    averageLosses[name] = validCount * loss;
                else
                    averageLosses[name] += validCount * loss;
            }
            
            numberOfSamples += validCount;
        }
        
        for (const name in averageLosses) {
            const loss = averageLosses[name]
            const blockName = name.split(':')[0];
            log(`  ${blockName}: average loss per sample = ${loss/numberOfSamples}`);
        }           
    }
 
    /**
     * Searches for the best initialization seed by evaluating gradients and activations.
     * @param {NNDataset} dataset - The dataset to pull a pilot batch from.
     * @param {number} numSeeds - How many random initializations to test.
     * @returns {Promise<Object>} The metrics of the winning seed.
     */
    async scout (dataset, numSeeds = 5) {
        const model = this;
        const webnn = model.#webnn;
        const batchSize = 16; // Small batch for speed
        let bestScore = -Infinity;
        let bestWeights = null;
        let winningMetrics = null;
        
        const originalBatchSize = dataset.getBatchSize(); // save batch size
        dataset.setBatchSize(batchSize);  // small for efficient scouting (e.g., 16)
        const graph = await this.#engine.scoutingGraph(batchSize);

        // Prepare a pilot batch
        const subset = dataset.subsetRole.TRAINING;
        dataset.prepareBatches(subset);
        const pilotBatch = dataset.getNextBatch(subset, this);
        const inputs = {}, outputs = {};

        for (let i = 0; i < numSeeds; i++) {
            // Randomize parameters with a new seed
            // We use i as the seed for reproducibility
            this.dag.randomizeParams(i);
            
            // initialise inputs and outputs including metrics
            await this.prepareTestInputs (pilotBatch, batchSize, inputs, outputs, true);

            // Run the scouting graph
            await webnn.dispatch(graph, inputs, outputs);
            
            // Read back metrics
            const losses = {};
            for (const key in model.dag.outputs) {
                const blockName = key.split(':')[0];
                losses[blockName] = await this.readScalar(outputs[blockName + ':loss']);
            }
            
            const deadRatio = await this.readScalar(outputs['metric:deadRatio']);
            const gradRatio = await this.readScalar(outputs['metric:gradRatio']);
            const metrics = {losses:losses, deadRatio:deadRatio, gradRatio:gradRatio};
        
            // Calculate a "Health Score" (Higher is better)
            // We penalize dead neurons and vanishing gradients
            const score = this.calculateHealthScore(metrics);
            
            let lossData = [];
            for (const blockName in losses)
                lossData.push(blockName+':loss=' + losses[blockName].toFixed(4));
            
            const lossInfo = lossData.join(', ');
        
            //log(`Seed ${i}: Score=${score.toFixed(2)}, ${lossInfo}, GradRatio=${gradRatio.toFixed(4)}, Dead=${(deadRatio*100).toFixed(1)}%`);

            if (score > bestScore) {
                bestScore = score;
                winningMetrics = metrics;
                // 5. Save a snapshot of these "winning" weights
                bestWeights = this.captureWeights();
            }
        }

        // Apply the best weights found back to the model
        this.restoreWeights(bestWeights);
        
        // Restore batch size prior to training loop
        dataset.setBatchSize(originalBatchSize);
        
        log(`Selected best initialization with score: ${bestScore.toFixed(2)}`);
    
        return winningMetrics;
    }

    // Run WebNN training graph on dataset passed on start up
    // Batched testing where last batch is usually smaller
    // Allows for models with multiple inputs and outputs
    async train (hyperParams) {
        const model = this;
        const dataset = model.#dataset;
        const subset = dataset.subsetRole.TRAINING;
        const webnn = model.#webnn;
        const inputBanks = new Array(2);
        const outputBanks = new Array(2);
        const algorithm = (hyperParams.optimizer ?? 'rlion').toLowerCase();
        
        // report average loss per sample after every batch and each epoch
        let averageLosses = {};
        let numberOfSamples = 0;
        let bestLoss = Infinity;  // validation loss if applicable
        let bestEpoch = 0;
        
        // default hyper parameters
        const defaults = {
            epochs: 20,            // maximum number of epochs
            seeds: 100,            // number of seed initialisations to scout
            patience: 500,         // max number of epochs to continue after minium
            warmupEpochs: 0,       // 0 to auto-calculate based on total epochs
            lossWeights: {},       // to weight outputs when computing epochLoss
            scaling: 'auto',       // else 'on' or 'off' for gradients
            clipping: 'auto',      // else 'on' or 'off' for global norm
            scale: 1000,           // initial gradient scaling factor
            growthInterval: 1000,  // number of batches before increasing scale
        }
        
        // set default loss weights for each output
        for (const key in model.dag.outputs) {
            const name = key.split(':')[0];
            defaults.lossWeights[name] = 1.0;
        }
        
        // now set optimiser specific defaults
        switch (algorithm) {
            case 'lion':
                defaults.lr = 0.0001, defaults.beta1 = 0.9, defaults.weightDecay = 0.01;
                break;
            case 'rlion':
                defaults.lr = 0.0005, defaults.beta1 = 0.9, defaults.beta2 = 0.99,
                defaults.alpha = 10.0, defaults.weightDecay = 0.01;
                break;
            case 'nesterov':
                defaults.lr = 0.01, defaults.mu = 0.9, defaults.weightDecay = 0.0001;
                break;
            case 'sgdm':
                defaults.lr = 0.001, defaults.momentumFactor = 0.9, defaults.weightDecay = 0.0001
                break;
            default: {
                const message = `Unsupported training optimizer: '${algorithm}'\n` +
                `Available algorithms are: 'lyon', 'rlion', 'sgdm', 'nesterov'`;
                throw new Error(message);
            }
        }
        
        hyperParams = { ...defaults, ...hyperParams }; // user values override defaults
        
        const epochs = hyperParams.epochs;
        const validationSize = dataset.subsetSize(dataset.subsetRole.VALIDATION);
        let patience = hyperParams.patience;
        
        // --- Synchronization for CPU/GPU Pipelining ---
        
        // Track whether each bankIndex is currently free to be written to.
        // Both bankIndexs start as 'true' so the first two iterations resolve immediately.
        const bankIndexReady = [true, true]; 
        
        // Track pending Promise resolvers if the CPU is waiting for a bankIndex.
        const bankIndexResolvers = [null, null];

        // Pause CPU until requested bankIndex (0 or 1) is ready for input
        function isReadyForInput(bankIndex) {
            if (bankIndexReady[bankIndex]) {
                // The bankIndex is free (e.g., first loop iteration, or GPU finished early).
                // Mark it as busy and resolve immediately.
                bankIndexReady[bankIndex] = false;
                return Promise.resolve();
            }
            
            // bankIndex is still busy, so return a promise and store its resolver
            // so that setReadyForInput can call it later.
            return new Promise(resolve => {
                bankIndexResolvers[bankIndex] = resolve;
            });
        }

        // Called when NPU/GPU no longer needs this bankIndex (0 or 1)
        function setReadyForInput(bankIndex) {
            if (bankIndexResolvers[bankIndex]) {
                // The CPU was already waiting for this bankIndex. 
                // Resolve the stored promise to unblock the CPU loop.
                const resolve = bankIndexResolvers[bankIndex];
                bankIndexResolvers[bankIndex] = null; // Clear the resolver
                resolve();
            } else {
                // The GPU finished before the CPU even asked for this bankIndex again.
                // Simply mark it as ready for the future.
                bankIndexReady[bankIndex] = true;
            }
        }
                
        // Pass the dataset and the number of seeds to test.
        if (hyperParams.seeds > 0) {
            log(`\nScouting for best initialization from ${hyperParams.seeds} seeds`);
            await model.scout(dataset, hyperParams.seeds);
        }
    
        // prepare evaluation epoch as iterator over batches
        dataset.prepareBatches(subset);
        const batchCount = dataset.getNumBatches(subset);
        const batchSize = dataset.getBatchSize(); // fixed for all batches
        const trainingSampleCount = dataset.subsetSize(subset);
        const graph = await model.#engine.trainingGraph(batchSize, hyperParams);

        // Calculate Steps for the LR Schedule ---
        const totalSteps = epochs * batchCount;
        const warmupEpochs = hyperParams.warmupEpochs || Math.max(1, Math.floor(epochs * 0.05));
        const warmupSteps = warmupEpochs * batchCount;

        log(`\nTraining against ${dataset.name()} dataset: ${trainingSampleCount} training samples for ${epochs} epochs`);
        log(`showing average loss per sample:`);

        let bankIndex = 0; // used to switch bankIndexs on odd/even batches
        inputBanks[0] = {}; inputBanks[1] = {};
        outputBanks[0] = {}; outputBanks[1] = {};
        
        function prefix (name) {
            const parts = name.split(':');
            return parts[0];
        }
        
        async function assignTensors (name, descriptor) {
            inputBanks[0][name] = await webnn.createTensor(descriptor);
            outputBanks[0][name] = await webnn.createTensor(descriptor);
            inputBanks[1][name] = outputBanks[0][name];
            outputBanks[1][name] = inputBanks[0][name];
        }
        
        function setParamValue (node) {
            let tensor = inputBanks[0][node.name];
            webnn.writeTensor(tensor, node.buffer);
        }
        
        function zeroMomentum (name, dataType, size) {
            const tensor = inputBanks[0][name];
            const DataType = NNModel.ML_TYPE_MAP(dataType);
            webnn.writeTensor(tensor, new DataType(size));
        }
                
        // create input tensors for model inputs (aka features)
        // add these to both input bankIndexs
        for (const key in model.dag.inputs) {
            const node = model.dag.inputs[key];
            const descriptor = node.descriptor(batchSize);
            inputBanks[0][node.name] = await webnn.createTensor(descriptor);
            inputBanks[1][node.name] = await webnn.createTensor(descriptor);
        }
        
        // prepare input tensors for expected outputs
        // prepare output tensors for batch losses, add to bankIndexs
        for (const key in model.dag.outputs) {
            const node = model.dag.outputs[key];
            const expectedDesc = node.descriptor(batchSize);
            const lossDesc = {...expectedDesc}; // an output
            lossDesc.shape = []; // make it a scalar
            expectedDesc.readable = false; // make it an input
            expectedDesc.writable = true;
            let name = prefix(key) + ':expected';
            inputBanks[0][name] = await webnn.createTensor(expectedDesc);
            inputBanks[1][name] = await webnn.createTensor(expectedDesc);
            name = prefix(key) + ':loss';
            outputBanks[0][name] = await webnn.createTensor(lossDesc);
            outputBanks[1][name] = await webnn.createTensor(lossDesc);
        }
        
        // prepare read/write tensors for params+momentum 
        for (const key in model.dag.params) {
            const param = model.dag.params[key];
            const descriptor = param.descriptor(batchSize);
            descriptor.readable = descriptor.writable = true;
            await assignTensors(key, descriptor);       // a parameter
            await assignTensors(key + '_m', descriptor); // its momentum
            setParamValue(param);
            zeroMomentum(key + '_m', descriptor.dataType, param.size(descriptor.shape));
        }  
        
        // assign tensor for the actual number of samples in each batch
        const validDesc = {dataType: 'int32', shape: [], readable: false,  writable: true};
        inputBanks[0]['validCount'] = await webnn.createTensor(validDesc);
        inputBanks[1]['validCount'] = await webnn.createTensor(validDesc);
        
        // assign tensor for learning rate - will be dynamically managed
        const lrDesc = {dataType: 'float32', shape: [], readable: false,  writable: true};
        inputBanks[0]['lr'] = await webnn.createTensor(lrDesc);
        inputBanks[1]['lr'] = await webnn.createTensor(lrDesc);;
        
        // dummy output tensor used to determine when training graph has been executed
        const syncDesc = {dataType: 'float32', shape: [], readable: true,  writable: false};
        outputBanks[0]['sync'] = await webnn.createTensor(syncDesc);
        outputBanks[1]['sync'] = await webnn.createTensor(syncDesc);
        
        // iterate through training epochs
        for (let epoch = 1; epoch <= epochs && --patience > 0; ++ epoch) {
            let averageLosses = {};
            let epochSamples = 0;
            let epochLoss = 0;

            // iterate through batches for this epoch
            for (let batchIndex = 0; batchIndex < batchCount; ++batchIndex) {
                bankIndex = batchIndex & 1;

                const batch = dataset.getNextBatch(subset, model);// last batch has zeros for missing samples
                const validCount = batch.validCount; // actual number of samples
                
                const inputs = inputBanks[bankIndex];
                const outputs = outputBanks[bankIndex];
                
                // Returns a promise that resolved by bankIndexNowReadyForInput(bankIndex)
                // Note: this resolves immediately on the first call
                await isReadyForInput(bankIndex);
                
                // Calculate scheduled LR for this specific step
                const currentStep = (epoch - 1) * batchCount + batchIndex + 1;
                let currentLR;
                
                if (currentStep <= warmupSteps) {
                    // Phase 1: Linear Warmup (from 0 to max_lr)
                    currentLR = hyperParams.lr * (currentStep / warmupSteps);
                } else {
                    // Phase 2: Cosine Annealing (from max_lr down to ~0)
                    const progress = (currentStep - warmupSteps) / (totalSteps - warmupSteps);
                    currentLR = hyperParams.lr * 0.5 * (1 + Math.cos(Math.PI * progress));
                }
                
                // write learning rate
                webnn.writeTensor(inputs['lr'], new Float32Array([currentLR]));
                
                // write the valid count
                webnn.writeTensor(inputs['validCount'], new Int32Array([validCount]));
           
                // get tensor for sample model inputs, then write them
                for (const key in model.dag.inputs) {
                    // prepare tensor for model input
                    const node = model.dag.inputs[key];
                    const descriptor = node.descriptor(batchSize);
                    const blockName = prefix(key);
                    const name = blockName + ':input';
                
                    if (!batch.inputs[blockName])
                        throw new Error(`dataset lacks data for ${blockName}`);
                    
                    const tensor = await model.getTensor(name, descriptor, inputs);
                    webnn.writeTensor(tensor, batch.inputs[blockName].data);
                }
            
                // copy in features and labels for this batch
                
                for (const key in model.dag.outputs) {
                    const blockName = prefix(key);
                    const lossName = blockName + ':loss';
                    const expectedName = blockName + ':expected';

                    // prepare tensor reading back the batch loss
                    const node = model.dag.outputs[key];
                
                    // copy descriptor for model output
                    let expectedDescriptor = {...node.descriptor(batchSize)};
                    let lossDescriptor = {...expectedDescriptor};
                
                    // update descriptor flags as 'expected' is an input
                    expectedDescriptor.readable = false;
                    expectedDescriptor.writable = true;
                
                    lossDescriptor.shape = [];  // scalar value
                    let tensor = await model.getTensor(lossName, lossDescriptor, outputs);
                
                    if (!batch.inputs[blockName])
                        throw new Error(`dataset lacks data for ${blockName}`);
                    
                    tensor = await model.getTensor(expectedName, expectedDescriptor, inputs);
                    webnn.writeTensor(tensor, batch.outputs[blockName].data, inputs);
                }

                // dispatch returns immediately without a promise!
                webnn.dispatch(graph, inputs, outputs);
                
                // reading a tensor returns a promise that is
                // resolved once the graph has been executed
                // we read 'sync' to implement the 'then' logic
                
                webnn.readTensor(outputs['sync']).then(async () => {
                    //log(`    processed batch ${i+1}, size ${batchSize}`);

                    // readback the batch loss for each model output
                    for (const key in model.dag.outputs) {
                        const node = model.dag.outputs[key];
                        const blockName = prefix(key);
                        const name = blockName + ':loss';
                        const tensor = outputs[name];
                        const loss = await webnn.readTensor(tensor);  
                        const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
                        const array = new DataType(loss);
                            
                        if (averageLosses[name] === undefined)
                            averageLosses[name] = validCount * array[0];
                        else
                            averageLosses[name] += validCount * array[0];
                        
                        //log(`    Batch ${i+1}, bankIndex ${bankIndex}, ${blockName}:loss = ${array[0]}`);
                    }
            
                    epochSamples += validCount;
                
                    // only on last batch in each epoch
                    if (batchIndex === batchCount - 1) {
                        let totalBatchLoss = 0;
                    
                        // periodically report progress
                        if (epochs < 100 || epoch % 50 === 0 || epoch === 1) {
                            // perform validation pass if applicable
                            if (validationSize > 0)
                                model.test(dataset.subsetRole.VALIDATION);
            
                            for (const name in averageLosses) {
                                const lossValue = averageLosses[name]
                                const blockName = name.split(':')[0];
                                totalBatchLoss += lossValue * hyperParams.lossWeights[blockName];
                                if (patience > 0)
                                    log(`  Epoch ${epoch}, ${blockName}:loss = ${lossValue/epochSamples}`);
                            }
                            
                            epochLoss += (totalBatchLoss * validCount);
                            
                            if (epochs >= 100 && epochLoss < bestLoss) {
                                // read back params
                                for (const key in model.dag.params) {
                                    const param = model.dag.params[key];
                                    const tensor = outputBanks[bankIndex][key]
                                    param.buffer = await webnn.readTensor(tensor);
                                }
                                bestLoss = epochLoss;
                                bestEpoch = epoch;
                                patience = hyperParams.patience;
                            }
                        }
                    
                        if (epoch === epochs) {
                            if (epochLoss < bestLoss) {
                                 // read back params after finishing training
                                for (const key in model.dag.params) {
                                    const param = model.dag.params[key];
                                    const tensor = outputBanks[bankIndex][key]
                                    param.buffer = await webnn.readTensor(tensor);
                                }
                                bestEpoch = epoch;
                            }
        
                            log(`best params from epoch ${bestEpoch}`);
                        }
                    }
                    
                    setReadyForInput(bankIndex);
                }).catch((error) => {
                    setReadyForInput(bankIndex);
                    throw error;
                });
            } 
                    
            dataset.prepareBatches(subset); // prepare for next epoch           
        }
        
        // epoch loop finished
        if (patience <= 0)
            log(`best params from epoch ${bestEpoch}`);
    }
 
    // convenience function for displaying typed array
    view (buffer, limit = 11) {
        function dataType (buffer) {
            if (buffer instanceof Float32Array)
                return Float32Array;
                
            if (buffer instanceof Float16Array)
                return Float16Array;
                
            if (buffer instanceof Int32Array)
                return Int32Array;
                
            if (buffer instanceof Uint32Array)
                return Uint32Array;
                
            if (buffer instanceof Int8Array)
                return Int8Array;
                
            if (buffer instanceof Uint8Array)
                return Uint8Array;
                
            return Float32Array; // default
        }
        
        const isFloat = (arr) => arr?.constructor?.name?.startsWith('Float');
        
        const DataType = dataType(buffer);
        const data = new DataType(buffer);
        const preview = Array.from(data.slice(0, limit));
        const formatted = isFloat(buffer) ? preview.map(n => n.toFixed(3)) : preview;
        return `[${formatted.join(', ')}${data.length > limit ? ', ...' : ''}]`;
    }

    parse (source) {
        const model = this;
        const blocks = new Map();
    
        // Split into individual statements by semicolon
        const statements = source.split(';').map(s => s.trim()).filter(s => s.length > 0);

        statements.forEach((statement, index) => {
            // Validate the top-level structure: blockName:propertyName value
            const stmtRegex = /^(\w+):(\w+)\s+([\s\S]+)$/;
            const match = statement.match(stmtRegex);

            if (!match) {
                throw new Error(`[Syntax Error] Malformed statement at item ${index + 1}: "${statement}". Expected format: "block:property value;"`);
            }

            const [_, blockName, propName, value] = match;

            if (!blocks.has(blockName)) {
                blocks.set(blockName, new NNBlock(blockName));
            }

            const block = blocks.get(blockName);

            if (propName === 'layers') {
                block.layers = parseLayers(value, blockName);
            } else if (propName === 'input' || propName === 'output') {
                try {
                    block.properties.set(propName, new NNTensor(value));
                } catch (e) {
                    throw new Error(`[Syntax Error] Block "${blockName}": Invalid tensor definition "${value}". ${e.message}`);
                }
            } else {
                // Validates generic properties
                const validProps = ['layers', 'input', 'output', 'name', 'loss'];
                
                if (!validProps.includes(propName)) {
                    throw new Error(`Unknown property "${propName}" in block "${blockName}". Valid properties are: ${validProps.join(', ')}`);
                }
                
                block.properties.set(propName, value.trim());
            }
        });
        
        model.blocks = blocks;

        // Nested helper to validate layer sequences
        function parseLayers (layersInput, blockName) {
            let layers = [];
    
            // Split by comma ONLY if not inside [] OR (), preventing
            // splitting "dense(shape=[128], activation=relu)" into two items
            //const layerStrings = layersInput.split(/,(?![^\[\(]*[\]\)])/).map(l => l.trim());
            
            // Split by comma ONLY if not inside [] OR (), allowing for inner nested brackets
            const layerStrings = layersInput.split(/,(?!(?:[^\[\]\(\)]|\[[^\[\]]*\]|\([^()]*\))*[\]\)])/).map(l => l.trim());

            for (const str of layerStrings) {
                if (str === "") continue;
                const layer = parseLayer(str);
                if (!layer) {
                    throw new Error(`[Syntax Error] Block "${blockName}": Malformed layer definition "${str}".`);
                }
                layers.push(layer);
            }
            return layers;
        }
        
        // Helper to validate individual layer syntax
        function parseLayer (input) {
            const match = input.match(/^(\w+)\((.*)\)$/);
            if (!match) return null;

            const [_, name, innerContent] = match;

            // IMPROVED: Split by comma, but ignore commas inside any number of nested brackets
            const parts = [];
            let currentPart = "";
            let depth = 0;
            for (let char of innerContent) {
                if (char === '[' || char === '(') depth++;
                else if (char === ']' || char === ')') depth--;
        
                if (char === ',' && depth === 0) {
                    parts.push(currentPart.trim());
                    currentPart = "";
                } else {
                    currentPart += char;
                }
            }
            if (currentPart) parts.push(currentPart.trim());

            const operands = [];
            const options = new Map();

            parts.forEach(part => {
                if (part.includes('=')) {
                    const index = part.indexOf('=');
                    const key = part.substring(0, index).trim();
                    const value = part.substring(index + 1).trim();
                    const n = Number(value);
                    options.set(key, isNaN(n) || value === "" ? value : n);
                } else if (part.length > 0) {
                    const n = Number(part);
                    operands.push(isNaN(n) || part === "" ? part : n);
                }
            });
    
            // Process single shape: [3, 224, 224]
            const shape = options.get('shape');
            if (shape && typeof shape === 'string') {
                options.set('shape', shape.match(/\d+/g).map(Number));
            }

            // Process multiple shapes: [[128], [80], [40]]
            const shapes = options.get('shapes');
            if (shapes && typeof shapes === 'string') {
                // IMPROVED: Matches each individual inner array [ ... ]
                const nestedArrays = shapes.match(/\[[\d,\s]+\]/g);
                if (nestedArrays) {
                    const parsedShapes = nestedArrays.map(s => s.match(/\d+/g).map(Number));
                    options.set('shapes', parsedShapes);
                }
            }

            return new NNLayer(name, operands, options);
        }
    }
      
    serialize () {
        const model = this;
        let text = "";
        for (const block of model.blocks.values()) {
            text += block.serialize();
        }
        return text;
    }
}

// Class for transpiling DAG to executable WebNN graphs
// for inference, testing and training. It also supports
// a cache of WebNN graphs by mode and batch size
class NNEngine {
    #graphCache;
    
    constructor (model, dag) {
        this.model = model;
        this.#graphCache = {}; // cache of prebuilt graphs
    }
    
    cachedGraph (mode, batchSize) {
        const key = `${mode}-${batchSize}`;
        return this.#graphCache[key];
    }
    
    cacheGraph (graph, mode, batchSize) {
        log(`${mode} graph compiled for batch size ${batchSize}`)
        const key = `${mode}-${batchSize}`;
        return this.#graphCache[key] = graph;
    }
    
    // compute batch loss according to activation layer
    // node must be a model output node in the DAG
    computeLoss (builder, builderOutput, node, gradients, operands, validCount, batchSize) {
        const activation = node.inputs[0];  // e.g., SoftmaxNode
        const blockName = node.name.split(':')[0];
        const expectedName = blockName+':expected';
        const lossName = blockName+':loss'; 
        
        let descriptor = {...node.descriptor(batchSize)};
        descriptor.readable = false;
        descriptor.writable = true;
        const expected = builder.input(expectedName, descriptor)
        const prediction = operands[activation.name];
        
        // Prepare mask based on sample indices (batch dimension)
        const batchIndicesData = new Int32Array(batchSize);
        for (let i = 0; i < batchSize; i++) batchIndicesData[i] = i;

        // 1. Create a 1D tensor of indices for each sample in the batch
        const batchIndices = builder.constant(
            { shape: [batchSize], dataType: 'int32' }, 
            batchIndicesData
        );

        // 2. Reshape indices to [batchSize, 1, 1...] so they broadcast to the prediction shape
        const rank = descriptor.shape.length;
        const broadcastShape = new Array(rank).fill(1);
        broadcastShape[0] = batchSize;
        const reshapedIndices = builder.reshape(batchIndices, broadcastShape);

        // 3. Compare indices to validCount to create the boolean mask
        const booleanMask = builder.lesser(reshapedIndices, validCount);
        const mask = builder.cast(booleanMask, 'float32');
        
        // Delegate to the activation node to get both the scalar and the gradient
        const {batchLoss, lossGradient} = activation.buildLoss(builder,
                                            prediction, expected, mask, validCount);
        
        // 1. Save the scalar for monitoring
        builderOutput[lossName] = batchLoss;

        // 2. Seed the gradients dictionary for backprop
        if (gradients) {
            gradients[node.name] = lossGradient;
        }
    }
    
    // helper for scoutingGraph to assess parameter space
    buildGradientNorm(builder, gradTensor) {
        // L2 Norm: sqrt(sum(grad^2))
        const squared = builder.pow(gradTensor, builder.constant(gradTensor.dataType, 2.0));
        const axes = Array.from({ length: gradTensor.shape.length }, (_, i) => i);
        const sumSq = builder.reduceSum(squared, { axes });
        return builder.sqrt(sumSq);
    }

    // helper for monitoring the activation of the deepest hidden layer, i.e.
    // closest to the output, as that is where signal death is most apparent,
    // but note that some graphs may have multiple outputs
    findDeepestActivation(executionList) {
        const activations = executionList.filter(node => node.isActivation());
        return activations.length > 0 ? activations[activations.length - 1] : null;
    }
    
    // helper to assess vanishing gradients when neurons have flatlined
    buildSaturationMetric(builder, activations, monitorNode) {
        // Delegate to the specific node implementation
        return monitorNode.buildSaturationMetric(builder, activations);
    }

    // used to assess potential starting points for training from a random pool
    // compute metrics sensitive to dead neurons and vanishing or exploding gradients
    async scoutingGraph(batchSize) {
        // ... standard builder setup ...
        const builder = new MLGraphBuilder(this.model.webnn());
        const executionList = this.model.dag.executionList;
        const operands = {};
        const gradients = {};
        const builderOutput = {};

        // passes in the number of valid samples for this batch
        // used to mask invalid samples as part of WebNN graph
        const validCount = builder.input('validCount', {
            dataType:'int32', shape:[], readable:false, writable:true,
        })

        // 1. Run Forward Pass
        for (const node of executionList) {
            operands[node.name] = node.type === 'param' 
                ? builder.input(node.name, node.descriptor(batchSize))
                : node.build(builder, operands, batchSize);
        
            // Loss calculation as standard
            if (node.type === 'output') {
                this.computeLoss(builder, builderOutput, node, gradients, operands, validCount, batchSize);
            }
        }

        // 2. Run Backward Pass
        const context = { builder, batchSize, operands, gradients };
        for (let i = executionList.length; i > 0; --i) {
            executionList[i-1].backprop(context);
        }

        // 3. Dynamic Metric Extraction
        const paramKeys = Object.keys(this.model.dag.params);
        const firstGrad = gradients[paramKeys[0]];
        const lastGrad = gradients[paramKeys[paramKeys.length - 1]];

        // Metric A: Gradient Ratio
        builderOutput['metric:gradRatio'] = builder.div(
            this.buildGradientNorm(builder, firstGrad),
            this.buildGradientNorm(builder, lastGrad)
        );

        // Metric B: Activation Saturation
        const monitorNode = this.findDeepestActivation(executionList);
        if (monitorNode) {
            builderOutput['metric:deadRatio'] = this.buildSaturationMetric(
                builder, 
                operands[monitorNode.name], 
                monitorNode
            );
        } else {
            // Fallback if no activation found
            builderOutput['metric:deadRatio'] = builder.constant('float32', 0.0);
        }

        return await builder.build(builderOutput);
    }

    async inferenceGraph (batchSize =  1) {
        let graph = this.cachedGraph('inference', batchSize);
        if (graph) return graph;
        
        const webnn = this.model.webnn(0);
        const builder = new MLGraphBuilder(webnn);
        const executionList = this.model.dag.executionList;
        const operands = {}; // name -> MLOperand for node's output
        const builderOutput = {}; // output name -> MLOperand
        
        // scan through nodes in forward order of execution
        for (const node of executionList) {
            operands[node.name] = node.build(builder, operands, batchSize);
            if (node.type === 'output') builderOutput[node.name] = operands[node.name];
        }

        graph = await builder.build(builderOutput);
        return this.cacheGraph(graph, 'inference', batchSize);
    }
    
    async testingGraph (batchSize) {
        let graph = this.cachedGraph ('testing', batchSize);
        if (graph) return graph;
        
        const webnn = this.model.webnn(0);
        const builder = new MLGraphBuilder(webnn);
        const executionList = this.model.dag.executionList;
        const operands = {}; // name -> MLOperand for node's output
        const builderOutput = {}; // output name -> MLOperand
        const gradients = {}; // required by this.computeLoss
        
        // passes in the number of valid samples for this batch
        // used to mask invalid samples as part of WebNN graph
        const validCount = builder.input('validCount', {
            dataType:'int32', shape:[], readable:false, writable:true,
        })
        
        // scan through nodes in forward order of execution
        for (const node of executionList) {
            operands[node.name] = node.type === 'param' 
                ? builder.input(node.name, node.descriptor(batchSize))
                : node.build(builder, operands, batchSize);
            
            if (node.type === 'output') {
                this.computeLoss(builder, builderOutput, node, gradients, operands, validCount, batchSize);
            }
        }

        graph = await builder.build(builderOutput);
        return this.cacheGraph(graph, 'testing', batchSize);
    }
    
    async trainingGraph (batchSize, hyperParams) {
        let graph = this.cachedGraph('training', batchSize);
        if (graph) return graph;
        
        const webnn = this.model.webnn(0);
        const builder = new MLGraphBuilder(webnn);
        const executionList = this.model.dag.executionList; // Fixed typo here
        const operands = {}; 
        const builderOutput = {}; 
        const gradients = {}; // Initialize gradients object
        const constantCache = new Map();
        const algorithm = (hyperParams.optimizer ?? 'rlion').toLowerCase();
            
        // optimizer defaults are set by model.train()
        
        const optimizers = {
            'rlion': this.applyRefinedLyon,
            'lion':  this.applyLyon,
            'nag':   this.applyNesterov,
            'sgdm':  this.applySGDMomentum
        };

        const lr = builder.input('lr', { dataType:'float32', shape:[],
            readable:true, writable:true
        });
        
        builderOutput['sync'] = builder.identity(lr); // crutch for double buffering

        const validCount = builder.input('validCount', {
            dataType:'int32', shape:[], readable:true, writable:true,
        });

        // prepare bucket constants for learning rates
        const bucketValues = [0.0, 0.1, 0.5, 0.9, 1.0];
        const bucketConstants = bucketValues.map(val => 
            builder.constant({dataType: 'float32', shape: []}, new Float32Array([val]))
        );
        
        const frozen = hyperParams.freeze !== undefined;

        // Forward pass & compute losses/gradients
        for (const node of executionList) {
            operands[node.name] = node.type === 'param'
              ?  builder.input(node.name, node.descriptor(batchSize))
              : operands[node.name] = node.build(builder, operands, batchSize);
            
            if (node.type === 'output') {
                this.computeLoss(builder, builderOutput, node, gradients, operands, validCount, batchSize);
            }
        }
        
        // Reverse pass for back propagation
        const context = { builder, batchSize, operands, gradients };
        for (let i = executionList.length; i > 0; --i) {
            const node = executionList[i-1];
            node.backprop(context);
        }
        
        // Apply selected optimiser algorithm to compute updates
        // Loop through params using gradients from the reverse pass
        
        // Iterate over all trainable parameters in the model
        for (const paramName in this.model.dag.params) {
            const param = this.model.dag.params[paramName]; // param Node
            const dataType = param.dataType;
            const shape = param.shape();
            let lrm = bucketConstants[bucketValues.length - 1]; // defined as one
            
            if (param.lrm !== undefined) {
                const value = param.lrm;
                if (typeof value !== 'number' || value <= 0)
                    throw new Error(`Learning rate multiplier '${value}' for parameter ${param.name} is not a positive number!`);
                    
                if (this.constantCache.has(value)) {
                    lrm = this.constantCache.get(value);
                } else {
                    lrm = builder.constant({dataType: 'float32', shape: []}, new Float32Array([param.lrm]));
                    this.constantCache.set(value, lrm);
                }
            } else if (frozen) {
                // compute path ratio for this param
                const r = param.maxDistToInput/(param.maxDistToInput + param.maxDistToOutput);
                const r0 = hyperParams.freeze;
                const ideal = Math.max(0.0, Math.sin(0.5 * Math.PI * (r - r0) / (1 - r0)));
            
                const bucketIndex = bucketValues.reduce((prev, curr, idx) =>
                    Math.abs(curr - ideal) < Math.abs(bucketValues[prev] - ideal) ? idx : prev, 0
                );
            
                lrm = bucketConstants[bucketIndex];
            }
            
            // The backprop loop should have populated gradients[paramName]
            const gradient = gradients[paramName];
            
            //if (!gradient) continue; // Skip non-trainable or unused params

            // Get the current weight operand from the forward pass
            const currentWeight = operands[paramName];

            // Create an input for the momentum buffer. 
            // NNEngine needs to allocate and manage these momentum 
            // buffers just like it manages the weight buffers!
            const momentumName = `${paramName}_m`;
            const currentMomentum = builder.input(momentumName, {
                dataType: dataType, 
                shape: shape
            });

            // Compute the updated values
            const { nextWeight, nextMomentum } = optimizers[algorithm].call(this, builder, 
                currentWeight, gradient, currentMomentum, lr, lrm, dataType, hyperParams);

            // Add them to the graph's output dictionary
            builderOutput[`${paramName}`] = nextWeight;
            builderOutput[`${momentumName}`] = nextMomentum;
        }
        
        graph = await builder.build(builderOutput);
        return this.cacheGraph(graph, 'training', batchSize);
    }
    
    // implements the original Lion optimizer (Evolved Sign Momentum)
    applyLyon(builder, weight, gradient, momentum, lr, lrm, dataType, hyperParams) {
        const { beta1, weightDecay } = hyperParams;
        
        // Create scalars for the math
        const beta1Op = builder.constant(dataType, beta1);
        const oneMinusBeta1Op = builder.constant(dataType, 1 - beta1);
        const wdOp = builder.constant(dataType, weightDecay);

        // 1. Update Momentum: m_next = beta1 * m + (1 - beta1) * grad
        const term1 = builder.mul(beta1Op, momentum);
        const term2 = builder.mul(oneMinusBeta1Op, gradient);
        const nextMomentum = builder.add(term1, term2);

        // 2. Compute Update Direction: sign(m_next) * sign(grad)
        const signM = builder.sign(nextMomentum);
        const signGrad = builder.sign(gradient);
        const lyonUpdate = signM;

        // 3. Apply Weight Decay: update + (weightDecay * weight)
        const decayTerm = builder.mul(wdOp, weight);
        const finalUpdate = builder.add(lyonUpdate, decayTerm);

        // 4. Update Weights: w_next = weight - (lr * finalUpdate)
        const step = builder.mul(builder.mul(lr, lrm), finalUpdate);
        const nextWeight = builder.sub(weight, step);

        return { nextWeight, nextMomentum };
    }

    // Refined Lion using a Softsign as WebNN doesn't support builder.atan()
    // so we instead use f(x) = (alpha * x) / (1 + abs(alpha * x))
    applyRefinedLyon(builder, weight, gradient, momentum, lr, lrm, dataType, hyperParams) {
        const { beta1, beta2, alpha, weightDecay } = hyperParams;
        
        // Constants
        const beta1Op = builder.constant(dataType, beta1);
        const oneMinusBeta1Op = builder.constant(dataType, 1 - beta1);
        const beta2Op = builder.constant(dataType, beta2);
        const oneMinusBeta2Op = builder.constant(dataType, 1 - beta2);
        const alphaOp = builder.constant(dataType, alpha);
        const wdOp = builder.constant(dataType, weightDecay);
        const oneOp = builder.constant(dataType, 1.0);

        // 1. Interpolate for current update (c_t): beta1 * m_{t-1} + (1 - beta1) * g_t
        const c_t = builder.add(
            builder.mul(beta1Op, momentum),
            builder.mul(oneMinusBeta1Op, gradient)
        );

        // 2. Continuous Update Step (Softsign Approximation)
        // Replacing (2 * pi) * atan(alpha * c_t) with (alpha * c_t) / (1 + |alpha * c_t|)
        const alpha_ct = builder.mul(alphaOp, c_t);
        const refinedUpdate = builder.div(
            alpha_ct,
            builder.add(oneOp, builder.abs(alpha_ct))
        );

        // 3. Apply Decoupled Weight Decay
        const decayTerm = builder.mul(wdOp, weight);
        const totalUpdate = builder.add(refinedUpdate, decayTerm);

        // 4. Update Weights: w_t = w_{t-1} - lr * totalUpdate
        const nextWeight = builder.sub(weight, builder.mul(builder.mul(lr, lrm), totalUpdate));

        // 5. Update Stored Momentum for next step (m_t): beta2 * m_{t-1} + (1 - beta2) * g_t
        const nextMomentum = builder.add(
            builder.mul(beta2Op, momentum),
            builder.mul(oneMinusBeta2Op, gradient)
        );

        return { nextWeight, nextMomentum };
    }

    // Nesterov Accelerated Gradient (NAG)
    applyNesterov(builder, weight, gradient, momentum, lr, lrm, dataType, hyperParams) {
        const { mu, weightDecay } = hyperParams;
        
        // Create scalars for the graph operations
        const muOp = builder.constant(dataType, mu);
        const wdOp = builder.constant(dataType, weightDecay);

        // 1. (Optional) Apply Decoupled Weight Decay
        let finalGrad = gradient;
        if (weightDecay > 0) {
            const decayTerm = builder.mul(wdOp, weight);
            finalGrad = builder.add(gradient, decayTerm);
        }

        // 2. Update Momentum (Velocity): v_next = (mu * v) + grad
        const nextMomentum = builder.add(
            builder.mul(muOp, momentum),
            finalGrad
        );

        // 3. Compute the NAG Update: grad + (mu * v_next)
        // This is the "look-ahead" term reformulated for the current gradient
        const nagUpdate = builder.add(
            finalGrad,
            builder.mul(muOp, nextMomentum)
        );

        // 4. Update Weights: w_next = w - (lr * nagUpdate)
        const step = builder.mul(builder.mul(lr, lrm), nagUpdate);
        const nextWeight = builder.sub(weight, step);

        return { nextWeight, nextMomentum };
    }

    // Stochastic Gradient Descent with Momentum (SGDM)
    applySGDMomentum(builder, weight, gradient, momentum, lr, lrm, dataType, hyperParams) {
        const { momentumFactor, weightDecay } = hyperParams;
        
        // Create constants
        const muOp = builder.constant(dataType, momentumFactor);
        const wdOp = builder.constant(dataType, weightDecay);

        // 1. Apply Decoupled Weight Decay
        let finalGradient = gradient;
        if (weightDecay > 0) {
            const decayTerm = builder.mul(wdOp, weight);
            finalGradient = builder.add(gradient, decayTerm);
        }

        // 2. Update Momentum: m_next = (momentumFactor * m) + grad
        const nextMomentum = builder.add(
            builder.mul(muOp, momentum),
            finalGradient
        );

        // 3. Update Weights: w_next = weight - (lr * m_next)
        const step = builder.mul(builder.mul(lr, lrm), nextMomentum);
        const nextWeight = builder.sub(weight, step);

        return { nextWeight, nextMomentum };
    }
}
    
// Class for managing inference graph's inputs and outputs
class NNContext {
    #model = undefined;
    #inputs = {};   // name -> MLTensor
    #outputs = {};  // name -> MLTensor
    #batchSize = 1; // inference batch size
    
    constructor (model) {
        this.#model = model;
    }
    
    async #init() {
        const model = this.#model;
        const webnn = model.webnn();
        
        // construct webnn dispatch outputs
        
        for (const output of Object.values(model.outputs())) {
            const tensor = await webnn.createTensor(output.descriptor(this.#batchSize))
            this.#outputs[output.name] = tensor;
        }
    }
    
    // class constructors are synchronous, so
    // use static creation method as workaround
    static async create(model) {
        const context = new NNContext(model);
        await context.#init(); 
        return context;
    }
    
    // default input
    firstInputName () {
        for (const name in this.#model.dag.inputs)
            return name;
    }
    
    // default output
    firstOutputName () {
        for (const name in this.#model.dag.outputs)
            return name;
    }
    
    setBatchSize (batchSize) {
        this.#batchSize = batchSize;
    }
    
    inputs () {
        return this.#inputs; // name -> MLTensor
    }
    
    outputs () {
        return this.#outputs; // name -> MLTensor
    }
        
    // return data array for named input (if permitted by tensor's descriptor)
    async input (name) {
        name = name ?? this.firstInputName();
        const webnn = this.#model.webnn();
        const tensor = this.#inputs[name];
        const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
        const buffer = await webnn.readTensor(tensor);
        return new DataType(buffer);
    }
    
    // return data array for named output
    async output (name) {
        name = name ?? this.firstOutputName();
        const webnn = this.#model.webnn();
        const tensor = this.#outputs[name];
        const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
        const buffer = await webnn.readTensor(tensor);
        return new DataType(buffer);
    }
    
    #matchingDescriptor(tensor, descriptor) {
        // tensor is instance of MLTensor, check that
        // it is compatible with given descriptor
        
        function sameShape(shape1, shape2) {
            if (shape1.length !== shape2.length)
                return false;
                
            for (let i = 0; i < shape1.length; ++i) {
                if (shape1[i] !== shape2[i])
                    return false;
            }
            
            return true;
        }
        
        return (
            tensor.dataType === descriptor.dataType &&
            sameShape(tensor.shape, descriptor.shape) &&
            tensor.readable === descriptor.readable &&
            tensor.writable === descriptor.writable
        );
    }
    
    // randomize named input tensor, where name defaults to 'model' 
    // reusing previously assigned WebNN tensor if practical
    async randomize (...args) {
        // randomize(-1, 1) for 'model' input
        // randomize('audio', -1, 1) for audio input
        let name = this.firstInputName(), min = -1, max = 1;
    
        if (args.length >= 3) {
            name = args[0];
            min = args[1];
            max = args[2];
        } else if (args.length === 2) {
            min = args[0];
            max = args[1];
        } else if (args.length === 1) {
            name = args[0];
        }
        
        const webnn = this.#model.webnn();
        const input = this.#model.input(name); // e.g. 'input1', 'audio' or 'video'
        const descriptor = input.descriptor(this.#batchSize);
        const size = input.size(descriptor.shape);

        // can we reuse the previously assigned tensor?
        
        let tensor = this.#inputs[name];
        
        if (tensor === undefined) {
            tensor = await webnn.createTensor(descriptor);
            this.#inputs[name] = tensor;
        } else if (! this.#matchingDescriptor(tensor, descriptor)) {
            tensor.destroy();
            tensor = await webnn.createTensor(descriptor);
            this.#inputs[name] = tensor;
        }
        
        const DataType = NNModel.ML_TYPE_MAP(input.dataType);
        
        // randomize data with min <= value < max

        const data = new DataType(size);
        const range = max - min;
        
        for (let i = 0; i < size; i++) {
            // truncated when casting to integer data types
            data[i] = (Math.random() * range) + min;
        }
        
        webnn.writeTensor(tensor, data);
        return data;
    }
    
    // initialise named input tensor with given data array
    // reusing previously assigned WebNN tensor if practical
    async setData (...args) {
        // setData(data) for 'model' input
        // setData('audio', data) for 'data input
        
        let name = this.firstInputName(), data = undefined;
    
        if (args.length === 2) {
            name = args[0];
            data = args[1];
        } else if (args.length === 1) {
            data = args[0];
        } else if (args.length === 0) {
            throw new Error('call to setData without any data');
        }
        
        const webnn = this.#model.webnn();
        const input = this.#model.input(name);
        const descriptor = input.descriptor(this.#batchSize);
        const size = input.size(descriptor.shape);

        // check that we have the expected number of data values
        // for given batch size, sequence length and feature size
        
        // deal with numeric literals
        if (!isNaN(data)) {
            const buffer = input.createBuffer(size);
            buffer.fill(data);
            data = buffer;
        } else {
            const DataType = NNModel.ML_TYPE_MAP(input.dataType);
            data = new DataType(data);
        }
        
        if (size !== data.length)
            throw new Error(`setData: data doesn't have same length as ${name}`);

        // can we reuse the previously assigned tensor?
        
        let tensor = this.#inputs[name];
        
        if (tensor === undefined) {
            tensor = await webnn.createTensor(descriptor);
            this.#inputs[name] = tensor;
        } else if (! this.#matchingDescriptor(tensor, descriptor)) {
            tensor.destroy();
            tensor = await webnn.createTensor(descriptor);
        }
        
        webnn.writeTensor(tensor, data);
        return data;
    }
}

class NNBlock {
    constructor(name) {
        this.name = name;
        this.properties = new Map(); // Stores input, output, loss, etc.
        this.layers = [];            // Array of NNLayer objects
    }
    
    input () {
        return this.properties.get('input');  // instance of NNTensor
    }
  
    output () {
        return this.properties.get('output'); // instance of NNTensor
    }
  
    serialize () {
        let text = "";
        let properties = this.properties;
        let layers = this.layers;
        for (const [key, value] of properties) {
            if (key === 'input' || key === 'output')
                text += `${this.name}:${key} ${value.serialize()};\n`;
            else
                text += `${this.name}:${key} ${value};\n`;
        }
        if (layers) {
            text += `${this.name}:layers\n`;
            for (let i = 0; i < layers.length; ++i) {
                const terminator = (i < layers.length - 1 ? ',' : ';') + '\n';
                text += '   ' + layers[i].serialize() + terminator;
            }
        }
        return text;
    }
}

class NNLayer {
    constructor(opName, args = [], options) {
        this.opName = opName; // e.g., 'matmul' or 'dense'
        this.args = args;     // positional operands
        this.options = options; // e.g., { shape: [128], activation: 'relu' }
        this.name = options.name || null;
    }
    
    // return clone of self with given shape and shallow copy of options
    clone (shape) {
        const clone = new NNLayer(this.opName, [...this.args], new Map(this.options))
        clone.options.set('shape', shape);
        clone.options.delete('shapes');
        return clone;
    }
    
    serialize () {
        const opName = this.opName;
        const args = this.args;
        const options = this.options;
        let opts = '';
        
        function serializeOptions (options) {
            let text = '', i = 1, length = options.size;
            for (const [key, value] of options) {
                if (value !== undefined && Array.isArray(value)) {
                    text += `${key}=${JSON.stringify(value)}${i++ < length ? ', ' : ''}`;
                } else {
                    text += `${key}=${value}${i++ < length ? ', ' : ''}`;
                }
            }
            return text;
        }
        
        if (options.size)
            opts = (args.length > 0 ? ' ' : '') + serializeOptions(options);
            
        return `${opName}(${args}${opts})`;
    }
}

// used for parsing block's input and output properties e.g. "float16 shape=[10,128]"
class NNTensor {
    constructor (inputString) {
        const regex = /^(?:(?<dataType>\w+)\s+)?shape\s*=\s*\[(?<shape>[\d,\s]+)\]$/;
        const match = inputString.trim().match(regex);

        if (!match)
            throw new Error(`Failed to parse tensor: ${inputString}`);

        const { dataType, _, shape } = match.groups;
        this.dataType = dataType;
        this.shape = shape
            .split(',')
            .map(dim => parseInt(dim.trim(), 10))
            .filter(n => !isNaN(n)); // Safety check for trailing commas;
    }

    serialize () {
        if (this.dataType)
            return `${this.dataType} shape=[${this.shape}]`;
        
        return `shape=[${this.shape}]`;
    }
}

// Helper for unique naming of parameters (e.g., w -> w1, w2)
class SymbolTable {
    constructor() {
        this.counts = new Map();
    }
    // Generates w1, w2, etc.
    gensym(name) {
        const count = (this.counts.get(name) || 0) + 1;
        this.counts.set(name, count);
        return `${name}${count}`;
    }
}

// construct a directed acyclic graph of NNNode objects
// along with a topological sort into execution order,
// applying shape inference in both directions, and rules
// of thumb for info for initialising weights and biases

class NNTopology {
    #dirty = true;   // execution list is missing or out of date
    
    constructor(blocks) {
        this.blocks = blocks; 
        this.nodeHistory = [];
        this.namedNodes = new Map();
        this.symbols = new SymbolTable();
        this.inputs = {};
        this.outputs = {};
        this.params = {};

        // Find entry blocks (blocks that have an 'input' property)
        const entryBlocks = Array.from(this.blocks.values())
            .filter(b => b.properties.has('input'));

        if (entryBlocks.length === 0) throw new Error("No input blocks found.");

        for (const block of entryBlocks) {
            const inputDesc = block.properties.get('input');
            const inputNode = createNode('input', block.name + ':input',
                [], {shape: inputDesc.shape, dataType: inputDesc.dataType});
            
            this.inputs[inputNode.name] = inputNode;
            this.registerNode(inputNode);
            const lastNode = this.expandBlock(block.name, inputNode);
            
            if (block.properties.has('output')) {
                const outputDesc = block.properties.get('output');
                const outputNode = createNode('output', block.name + ':output',
                    [lastNode],
                    {shape: outputDesc.shape, dataType: outputDesc.dataType});
                this.outputs[outputNode.name] = outputNode;
                this.registerNode(outputNode);
            }
        }

        this.executionList = this.getExecutionOrder(this.nodeHistory);
        this.nodeOutputs = this.getOutputs();
        this.resolveTensorMetadata();  // tensor shapes and datatypes
        this.randomizeParams();
    }
        
    getOutputs () {
        const outputs = {};
        for (const node of this.executionList) {
            for (const input of node.inputs) {
                let list = outputs[input.name];
                if (list === undefined) outputs[input.name] = list = [];
                list.push(node);
            }
        }
        return outputs;
    }
    
    #createPRNG(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    
    // Rule of thumb to set initialisation info for weights and
    // bias based upon the associated activation operation.
    // Will need tweaking for different kinds of dense layers!
    randomizeParams (seed = null) {
        const rng = (seed !== null) ? this.#createPRNG(seed) : Math.random;
        
        for (const node of this.executionList) {
            node.initialize(rng);
        }
    }
    
    
    // generate instance of CastNode, append it to
    // execution list, and mark it as dirty
    // this is called when examining node datatypes,
    // an operand is found to have a different type
    insertCastNode (operandNode, dataType) {
        const cast = 'cast';
        const typeNode = createNode('string', dataType, [], {});
        const nodeName = this.symbols.gensym(cast);
        const shape = operandNode.attributes.shape;
        const castNode = createNode(cast, nodeName, [operandNode, typeNode], {shape:shape})
        castNode.dataType = dataType;
        this.executionList.push(typeNode, castNode);
        this.#dirty = true;
        return castNode;
    }

    // propagate tensor shapes and datatypes across DAG
    // one iteration should be sufficient in most cases
    resolveTensorMetadata(iterations = 1) {
        let queue = [];
        
        for (let i = 0; i < iterations; i++) {
            // Forward pass: Inputs -> Outputs
            queue.push(Object.values(this.inputs));

            while (queue.length > 0) {
                const nodes = queue.pop();
                
                if (nodes) {
                    nodes.forEach(node => {
                        node.resolveForward();
                        const dependents = this.nodeOutputs[node.name];
                        if (dependents) queue.push(dependents)
                    });
                }
            }

            // Backward pass: Outputs -> Inputs
            queue.push(Object.values(this.outputs));
            
            while (queue.length > 0) {
                const nodes = queue.pop();
                nodes.forEach(node => {
                    node.resolveBackward();
                    const inputs = node.inputs;
                    if (inputs && inputs.length > 0) queue.push(inputs);
                });
            }
        }
        
        // insert cast operations where needed
        
        for (const node of [...this.executionList]) {
            if (!node.inputs || node.type === 'cast')
                continue;
            
            const expectedType = node.dataType;
            
            if (expectedType) {
                for (let i = 0; i < node.inputs.length; i++) {
                    const inputNode = node.inputs[i];
                    const inputType = inputNode.dataType;
                    const inputPrec = TYPE_PRECEDENCE_MAP[inputType] || 0;
                    const targetPrec = TYPE_PRECEDENCE_MAP[expectedType] || 0;

                    // Safety Check: Only cast if moving up the precedence chain
                    if (inputPrec < targetPrec) {
                        const castNode = this.insertCastNode(inputNode, expectedType);
                        node.inputs[i] = castNode;
                    } else if (inputPrec > targetPrec) {
                        this.warn(`### node ${node.name}: input ${inputNode.name} (${inputType}) ` +
                                  `has higher precedence than expected (${expectedType}). Manual cast may be required.`);
                    }
                }
            }
        }
               
        // re-sort execution list if any cast nodes were inserted
        // and recompute node dependencies
        if (this.#dirty) {
            this.executionList = this.getExecutionOrder(this.executionList);
            this.nodeOutputs = this.getOutputs();
        }
    }
    
    expandBlock(blockName, currentInput, macroOptions = new Map()) {
        const block = this.blocks.get(blockName);
        let lastNode = currentInput;
        const lastLayer = block.layers[block.layers.length - 1];
        const dataTypes = new Set(['float32','float16','int32','uint32',
                                    'int8','uint8','int4','uint4']);

        // first scan for layers that want to be repeated
        // these set shapes to a list of shapes where the
        // cloned layers as assigned shape from the list
        // so that you can define a narrow waist
        
        let layers = [...block.layers];  // make a working copy
        
        for (let i = 0; i < layers.length; ++i) {
            const layer = layers[i];
            let shapes = layer.options.get('shapes') ?? [];
            
            if (shapes.length > 0) {
                layers.splice(i, 1); // remove current layer
                // and replace it with clones with the desired shape
                for (let j = 0; j < shapes.length; ++j) {
                    layers.splice(i++, 0, layer.clone(shapes[j]));
                }                
            }
        }
        
        // and now translate the layer into the DAG
        for (const layer of layers) {
            // --- Macro Expansion ---
            if (this.blocks.has(layer.opName)) {
                const nestedOptions = new Map([...macroOptions, ...layer.options]);
                lastNode = this.expandBlock(layer.opName, lastNode, nestedOptions);
                continue;
            }

            // --- Specialized Ops ---
            if (layer.opName === 'residual') {
                const skip = layer.options.get('skip');
                const skipNode = !isNaN(skip) 
                    ? this.nodeHistory[this.nodeHistory.length - 1 - parseInt(skip)]
                    : this.namedNodes.get(skip);

                const resName = this.symbols.gensym('res');
                const resNode = createNode('add', resName, [lastNode, skipNode], layer.options);
                this.registerNode(resNode);
                lastNode = resNode;
                continue;
            }
            
            // --- Standard Operators ---
            
            // Macro binding for options
            let opType = layer.opName;
            let options = new Map(layer.options);
            
            if (layer === lastLayer) {
                for (const [option, value] of macroOptions) {
                    if (option === opType) {
                        opType = value;
                    } else {
                        options.set(option, value);
                    }
                }
            }
                        
            // Collect Operands
            // Input 0 is always the 'flow' (the output of the previous node)
            const inputs = [lastNode];

            // 2. Handle Parameters (w, b, etc.)
            // We use the symbol table to ensure 'w' becomes 'w1', 'w2', etc.
            layer.args.forEach(argName => {
                if (typeof argName === 'number') {
                    const numberNode = createNode('number', argName, [], {});
                    this.registerNode(numberNode);
                    inputs.push(numberNode);
                } else if (dataTypes.has(argName)) {
                    const stringNode = createNode('string', argName, [], {});
                    this.registerNode(stringNode);
                    inputs.push(stringNode);
                } else {
                    const uniqueParamName = this.symbols.gensym(argName);
                    const paramNode = createNode('param', uniqueParamName, [], {});
                    this.params[uniqueParamName] = paramNode;
                    this.registerNode(paramNode);
                    inputs.push(paramNode);
                }
            });

            // 3. Create Operation Node with Unique Name
            // If the user provided a 'name' in options, use it; otherwise, gensym the opType.
            const nodeName = layer.options.get('name') || this.symbols.gensym(opType);
            const newNode = createNode(opType, nodeName, inputs, Object.fromEntries(options));
            this.registerNode(newNode);
            lastNode = newNode; // This node becomes the input for the next layer
        }
        return lastNode;
    }

    registerNode(node) {
        this.nodeHistory.push(node);
        if (node.name) this.namedNodes.set(node.name, node);
        let name = node.attributes.name;
        if (name) this.namedNodes.set(name, node);
    }
    
    // annotate each node with a) maximum path length to an
    // 'input' node and b) maximum distance to an 'output' node
    measureDistances(nodes) {
        const parents = {};
        const inputs = [];
        const outputs = [];
        
        // Initialisation & Strict Type Filtering
        nodes.forEach(node => {
            node.maxDistToInput = -Infinity;
            node.maxDistToOutput = -Infinity; // Added initialization
            
            // Build adjacency map for forward traversal (maps node to its children)
            if (node.inputs) {
                node.inputs.forEach(upstreamNode => {
                    if (!parents[upstreamNode.name]) parents[upstreamNode.name] = [];
                    parents[upstreamNode.name].push(node);
                });
            }

            // Only nodes explicitly typed as 'input' or 'output'
            if (node.type === 'input') {
                node.maxDistToInput = 0;
                inputs.push(node);
            }
            
            if (node.type === 'output') {
                node.maxDistToOutput = 0; // Output nodes are 0 distance from an output
                outputs.push(node);
            }
        });
        
        // --- Max Path Calculations (Memoized DFS) ---
        
        // 1. Max path FROM 'input' nodes
        const maxInputMemo = new Map();
        const getMaxPathToInput = (currentNode) => {
            if (currentNode.type === 'input') return 0;
            if (maxInputMemo.has(currentNode)) return maxInputMemo.get(currentNode);
            
            let currentMax = -Infinity;
            const upstreamNodes = currentNode.inputs || [];
            
            upstreamNodes.forEach(upstream => {
                const upstreamMax = getMaxPathToInput(upstream);
                if (upstreamMax !== -Infinity) {
                    currentMax = Math.max(currentMax, upstreamMax + 1);
                }
            });
            
            maxInputMemo.set(currentNode, currentMax);
            currentNode.maxDistToInput = currentMax;
            return currentMax;
        };

        // 2. Max path TO 'output' nodes
        const maxOutputMemo = new Map();
        const getMaxPathToOutput = (currentNode) => {
            if (currentNode.type === 'output') return 0;
            if (maxOutputMemo.has(currentNode)) return maxOutputMemo.get(currentNode);
            
            let currentMax = -Infinity;
            const downstreamNodes = parents[currentNode.name] || []; // Look forward to children
            
            downstreamNodes.forEach(downstream => {
                const downstreamMax = getMaxPathToOutput(downstream);
                if (downstreamMax !== -Infinity) {
                    currentMax = Math.max(currentMax, downstreamMax + 1);
                }
            });
            
            maxOutputMemo.set(currentNode, currentMax);
            currentNode.maxDistToOutput = currentMax;
            return currentMax;
        };
        
        // Ensure every node gets annotated with both max paths
        nodes.forEach(node => {
            const maxIn = getMaxPathToInput(node);
            getMaxPathToOutput(node); // Call this to ensure annotation happens
        });
        
        // copy path lengths from operator to its parameter nodes
        // also copy operator's learning rate multiplier override
        nodes.forEach(node => {
            if (node.type === 'param') {
                const parent = parents[node.name][0];
                node.maxDistToInput = parent.maxDistToInput;
                node.maxDistToOutput = parent.maxDistToOutput;
                node.lrm = parent.attributes.lrm;
            }
        });
    }
             
    // Return list of nodes in execution order after pruning
    // nodes that aren't on a path from an Input, Parameter,
    // or Numeric Literal node to a designated output node
    getExecutionOrder(nodes) {
        const targets = Object.values(this.outputs);
        if (targets.length === 0) {
            return [];
        }

        const sources = nodes.filter(n => n.inputs.length === 0);

        const reachableFromSources = new Set();
        const forwardStack = [...sources];
        sources.forEach(s => reachableFromSources.add(s));

        const successors = new Map();
        nodes.forEach(n => successors.set(n.name, []));
        nodes.forEach(n => {
            n.inputs.forEach(input => {
                if (successors.has(input.name)) {
                    successors.get(input.name).push(n);
                }
            });
        });

        while (forwardStack.length > 0) {
            const u = forwardStack.pop();
            for (const v of (successors.get(u.name) || [])) {
                if (!reachableFromSources.has(v)) {
                    reachableFromSources.add(v);
                    forwardStack.push(v);
                }
            }
        }

        const canReachTargets = new Set();
        const backwardStack = [...targets];
        targets.forEach(t => canReachTargets.add(t));

        while (backwardStack.length > 0) {
            const v = backwardStack.pop();
            for (const u of v.inputs) {
                if (!canReachTargets.has(u)) {
                    canReachTargets.add(u);
                    backwardStack.push(u);
                }
            }
        }

        const prunedNodes = new Set(
            [...reachableFromSources].filter(n => canReachTargets.has(n))
        );

        const inDegree = new Map();
        const adj = new Map();
    
        for (const node of prunedNodes) {
            inDegree.set(node.name, 0);
            adj.set(node.name, []);
        }

        for (const node of prunedNodes) {
            for (const inputNode of node.inputs) {
                if (prunedNodes.has(inputNode)) {
                    adj.get(inputNode.name).push(node);
                    inDegree.set(node.name, (inDegree.get(node.name) || 0) + 1);
                }
            }
        }

        const queue = [];
        for (const node of prunedNodes) {
            if ((inDegree.get(node.name) || 0) === 0) {
                queue.push(node);
            }
        }

        const executionList = [];
        while (queue.length > 0) {
            const u = queue.shift();
            executionList.push(u);

            for (const v of (adj.get(u.name) || [])) {
                inDegree.set(v.name, inDegree.get(v.name) - 1);
                if (inDegree.get(v.name) === 0) {
                    queue.push(v);
                }
            }
        }

        if (executionList.length !== prunedNodes.size) {
            throw new Error("Cycle detected in the neural network topology during sort.");
        }

        this.#dirty = false;
        this.measureDistances(executionList);
        return executionList;
    }
    
    serialize() {
        let lines = [];
        
        this.executionList.forEach(node => {
            lines.push(node.serialize());
        });
        
        return lines.join('\n');
    }
}


// Base class for DAG nodes for use in a directed acyclic graph as
// an intermediate between the representation of the model syntax
// and WebNN graphs. Nodes include input, output, constant, number,
// matmul, softmax, etc. All higher level operators are expanded
// into WebNN operators to simplify building WebNN graphs. NNode
// subclasses provide operator specific support for shape inference
// and gradient computation for back propagation. NNNode doesn't
// hold the batch size as this depends on the usage and is dealt
// with when building the WebNN graph, see the NNTopology class.

class NNNode {
    constructor(name, type, inputs = [], attributes = {}) {
        this.name = name;  // unique in DAG, e.g. 'matmul3'
        this.type = type;  // named type, e.g. 'matmul'
        this.inputs = inputs;      // Array of NNode instances
        this.attributes = attributes; // including operator options
        this.operator = this.type; // map type to WebNN operator name
        this.dataType = attributes.dataType || null;
        this.broadcast = false;  // does operator support broadcast?
        this.preserveShape = true;  // does operator change the shape?
    }

    createBuffer (size) {
        const DataType = NNModel.ML_TYPE_MAP(this.dataType);
        return this.buffer = new DataType(size);
    }
    
    // compute number of items in tensor
    size (shape) {
        if (shape === undefined)
            shape = this.attributes.shape;
            
        let count = 1.0;
        
        for (let i = 0; i < shape.length; ++i) {
            count *= shape[i];
        }
        
        return count;
    }
    
    isActivation () {
        return false;
    }

    // nothing to do except for activation nodes
    initialize (rng) {
    }

    descriptor (batchSize) {
        return {
            dataType: this.dataType,
            shape: this.shape(batchSize),
            readable: false,
            writable: true,
        };
    }
    
    shape (batchSize) {
        const sequenceLength = this.attributes.sequenceLength; // only defined for recurrent networks
        let shape = [...this.attributes.shape];
        
        if (sequenceLength !== undefined)
            shape.unshift(sequenceLength);
        
        if (batchSize !== undefined)
            shape.unshift(batchSize);

        return shape;
    }

    compatible (shape1, shape2) {
        if (shape1 === undefined || shape2 === undefined)
            return true;
            
        if (shape1.length !== shape2.length)
            return false;
            
        for (let i = 0; i < shape1.length; ++i) {
            if (shape1[i] !== shape2[i])
                return false;
        }
        
        return true;
    }
    
    // return MLIR syntax for node's shape and data type
    MLIRType() {
        const featureShape = this.attributes.shape; // e.g., [224, 224, 3]
        const prefix = ["?"]; // Every node has a batch dimension
    
        // If this node belongs to a block with a sequence, add it
        if (this.attributes.sequenceLength) {
            prefix.push("?"); // Sequence is also dynamic in MLIR
        }
        const dataType = this.dataType; // e.g., "float32" -> "f32"
    
        // MLIR mapping: float32 -> f32, int32 -> i32
        const mlirDtype = dataType.replace("float", "f").replace("int", "i");

        // Prepend "?" for Batch (and optionally Sequence)
        const mlirShape = [...prefix, ...featureShape].join("x");

        return `tensor<${mlirShape}x${mlirDtype}>`;
        // Result: "tensor<?x224x224x3xf32>"
    }

    // Broadcasts an array of shapes into a single resulting shape.
    // shapes is an array of shape arrays (e.g. [[10, 1], [1, 5]])
    // Returns an array of integers for the broadcasted shape.
    // Only suitable for use with Element-wise operators!!!

    broadcastShapes(shapes) {
        if (!shapes || shapes.length === 0) return [];

        return shapes.reduce((shapeA, shapeB) => {
            if (!shapeA && !shapeB)
                return null;
                
            const lA = shapeA ? shapeA.length : 0;
            const lB = shapeB ? shapeB.length : 0;
            const maxLen = Math.max(lA, lB);
            const result = new Array(maxLen);

            for (let i = 0; i < maxLen; i++) {
                const dimA = i < lA ? shapeA[lA - 1 - i] : 1;
                const dimB = i < lB ? shapeB[lB - 1 - i] : 1;

                if (dimA === dimB) {
                    // Matches (e.g., 224 === 224, or "N" === "N")
                    result[maxLen - 1 - i] = dimA;
                } else if (dimA === 1) {
                    // dimB wins (could be a number or a string "N")
                    result[maxLen - 1 - i] = dimB;
                } else if (dimB === 1) {
                    // dimA wins
                    result[maxLen - 1 - i] = dimA;
                } else {
                    // Real conflict: (e.g., "N" vs "M", or 224 vs 128)
                    throw new Error(
                        `Incompatible symbolic shapes: [${shapeA}] and [${shapeB}] at index ${i}`
                    );
                }
            }
            return result;
        });
    }
        
    warn (message) {
        log(message);
    }
    
    // NOTE: for operators that change the number of dimensions, e.g. reduceSum,
    // squeeze and unsqueeze, we can't use `broadcastShapes` and need operator
    // specific code to compute the new shape, for this override `resolveShape()`
    
    resolveShape () {
        if (this.broadcast) {
            // Extract shapes from parent nodes
            const inputShapes = this.inputs.map(input => input.attributes.shape ?? null);
            if (this.inputs.length > 0) {
                // If one input is a scalar (NumberNode), broadcastShapes handles it fine
                this.attributes.shape = this.broadcastShapes(inputShapes);
            }
        }
    }

    resolveForward () {
        // SHAPE RESOLUTION default method
        this.resolveShape();  // overridden for reduceSum, squeeze and unsqueeze

        // TYPE RESOLUTION
        if (this.attributes.dataType) {
            // User explicitly set a type (e.g., "float16" for a specific layer)
            this.dataType = this.attributes.dataType;
        } else if (this.inputs.length > 0) {
            // Fallback to LUB inference from parents
            const inputTypes = this.inputs.map(input => input.dataType);
            this.dataType = getLUB(inputTypes);
        } else {
            // Root node with no explicit type defaults to float32
            this.dataType = this.dataType || "float32";
        }

        log(`[Forward] ${this.name} resolved to ${this.dataType}`);
    }

    resolveBackward() {
        if (this.inputs.length === 0) return;

        const inputTypes = this.inputs.map(input => input.dataType);
        const requiredType = getLUB(inputTypes);

        // Only attempt to "upgrade" the type if the user hasn't locked it
        if (this.attributes.dataType) {
            // If user locked it to FLOAT16 but children need FLOAT32:
            if (TYPE_PRECEDENCE_MAP[requiredType] > TYPE_PRECEDENCE_MAP[this.dataType]) {
                this.warn(`Node ${this.name} is locked to ${this.dataType}, but consumers require ${requiredType}. A Cast will be required.`);
            }
        } else if (TYPE_PRECEDENCE_MAP[requiredType] > TYPE_PRECEDENCE_MAP[this.dataType]) {
            log(`[Backward] Upgrading inferred ${this.name} to ${requiredType}`);
            this.dataType = requiredType;
        }
        
        if (this.dataType) {
            for (const input of this.inputs) {
                if (input.dataType === null) {
                    input.dataType = this.dataType;
                }
            }
        }
        
        // if shape is preserved, propagate shape to 1st operand
        const shape = this.attributes.shape;
        
        if (shape && this.preserveShape) {
            const input = this.inputs[0]; // 1st operand
            const s1 = input.attributes.shape;
            
            if (s1) {
                if (incompatible(s1, shape)) {
                    let valid = false;
                    
                    if (this.broadcast)
                        valid = isBroadcastable(s1, shape);
                        
                    if (!valid)
                        this.warn(`### operation ${this.name} cannot broadcast to [${shape}]`);
                }
            } else {
                input.attributes.shape = [...this.attributes.shape];
            }
        }
    }

    args (operands) {
       const inputs = this.inputs; // array of names for NNNode
       return inputs.map(node => operands[node.name]); 
    }
    
    options () {
        return this.options
            ? this.options.map(name => this.attributes[name])
            : undefined;
    }

    // Helper to calculate ratio of elements matching a boolean condition.
    calculateRatio(builder, booleanMask, totalSize) {
        const dataType = 'float32';
        const count = builder.reduceSum(builder.cast(booleanMask, dataType));
        return builder.div(count, builder.constant(dataType, totalSize));
    }
    
    // Abstract methods to be implemented by subclasses

    // subclasses can override this default implementation
    // builder is instance of MLNNTopology
    // nodes is map: name -> MLOperand
    // args is list of MLOperands for operation's operands
    build(builder, operands, batchSize) { 
        const opname = this.operator ? this.operator : this.type;    
        return builder[opname](...this.args(operands), this.options());
    }
    
    buildSaturationMetric(builder, activations) {
        // Default: return 0.0 if not an activation or if no logic defined
        return builder.constant('float32', 0.0);
    }

    buildLoss (builder, prediction, expected, mask, validCount) {
        this.warn(`### missing 'buildLoss' implementation for ${this.type}`);
    }
    
    // nodes that leave the shape unchanged
    keepShape (shape) {
        let s1 = this.attributes['shape'];
        
        if (!this.compatible(s1, shape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);
            
        if (s1 === undefined && shape !== undefined)
            return shape;
            
        return this.attributes['shape'];
    }
    
    // operators with two operands, e.g. 'add'
    simpleOpsShape (shape) {
        // apply checks to data types for operands and result
        let t1 = this.inputs[0].attributes.dataType;
        let t2 = this.inputs[1].attributes.dataType;
        let t3 = this.attributes.dataType
        
        if (t1) {
            if (t3) {
                if (t3 !== t1)
                    this.warn(`### operation ${this.name} has an inconsistent data type`);
            } else {
                this.attributes.dataType = t1;
            }
            
            if (t2) {
                if (t1 !== t2)
                    this.warn(`### operation ${this.name} has an inconsistent data type`);
            } else {
                this.inputs[1].attributes.dataType = t1;
            }
        }
    
        // Simple broadcasting logic (NEEDS CHECKING)
        const s1 = this.inputs[0].attributes.shape;
        const s2 = this.inputs[1].attributes.shape;
        const s3 = this.attributes.shape;

        if (incompatible(s1, shape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);

        let outputShape;
        
        if (s2) {
            outputShape = s1.length >= s2.length 
                ? [...s1] : [...s2];
        } else {
            outputShape = [...s1];
        }
        
        if (incompatible(s2, outputShape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);
            
        return outputShape
    }
    
    tensorRank () {
        const shape = this.attributes.shape;
        
        if (!Array.isArray(shape))
            throw new Error("Shape must be an array.");

        return shape.length;
    }
    
    accumulateGradient (context, input, newGrad) {
        const gradients = context.gradients;
        const inputName = input.name;
        
        if (gradients[inputName]) {
            gradients[inputName] = context.builder.add(gradients[inputName], newGrad);
        } else {
            gradients[inputName] = newGrad;
        }
    }
    
    // Called during graph construction to eagerly prepare tensors
    prepare() {
        this.dataType = this.inferDataType();
        this.shape = this.resolveForwards();
    }

    // Resolves the datatype, explicit definitions override inferred types
    inferDataType() {
        if (this.dataType) return this.dataType;
        
        // Default inference: inherit from the first input operand
        if (this.inputs && this.inputs.length > 0 && this.inputs[0].dataType) {
            return this.inputs[0].dataType;
        }
        
        // Fallback per WebNN spec defaults
        return 'float32'; 
    }

    // retrieves this layer's output and gradient to compute
    // and save gradients for this layer's parameters and input
    // saving the latter under the names of the input nodes
    // context has {builder, operands, gradients, batchSize}
    backprop(context) { 
        this.warn(`backprop: missing implementation for ${this.type}`);
    }
    
    serialize () {
        let attrs = [];
        for (name in this.attributes) {
            const value = this.attributes[name];
            if (value !== undefined) {
                if (Array.isArray(value))
                    attrs.push(`${name}=[${value}]`);
                else
                    attrs.push(`${name}=${value}`);
            }
        }
        if (!this.attributes.dataType && this.dataType)
            attrs.push(`dataType=${this.dataType}`);

        if (['input', 'param'].includes(this.type))
            return `   ${this.type}(${attrs.join(', ')})`;
        
        const inputNames = this.inputs.map(i => i.name || i.type);
        const description = (inputNames.concat(attrs)).join(', ');
        return `   ${this.type}(${description})}`;
    }
}

class UnaryNode extends NNNode {
    inferDataType() {
        return this.dataType || this.inputs[0].dataType;
    }

    resolveForwards() {
        // Shape matches input shape exactly
        return [...this.inputs[0].shape];
    }
}

class BinaryNode extends NNNode {
    inferDataType() {
        // Binary ops require matching data types in WebNN
        return this.dataType || this.inputs[0].dataType; 
    }

    resolveForwards() {
        return broadcastShapes(this.inputs[0].shape, this.inputs[1].shape);
    }
}

// model input
class InputNode extends NNNode {
    descriptor (batchSize) {
        return {
            dataType: this.dataType,
            shape: this.shape(batchSize),
            readable: false,
            writable: true,
        };
    }
    
    fill (n) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        buffer.fill(n);
        
        return buffer;
    }
    
    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // nothing to do
    }
    
    build(builder, operands, batchSize) {
        return builder.input(this.name, this.descriptor(batchSize));
    }
}

// model output
class OutputNode extends NNNode {
    descriptor (batchSize) {
        return {
            dataType: this.dataType,
            shape: this.shape(batchSize),
            readable: true,
            writable: false,
        };
    }
    
    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // assumes output gradient is already in gradients
        // copy gradient to the preceding operation node
        const gradients = context.gradients;
        const gradient = gradients[this.name];
        this.inputs.forEach(node => {
            this.accumulateGradient(context, node, gradient);
        });
    }
    
    build (builder, operands, batchSize) {
        const operand = this.inputs[0];
        return operands[operand.name];
    }
}

// model parameters, e.g. weights and biases
class ParamNode extends NNNode {
    descriptor (batchSize) {
        return {
            dataType: this.dataType,
            shape: this.shape(batchSize),
            readable: false,
            writable: true,
        };
    }
    
    
    // uniform distribution in range min to max
    randomize (min, max, rng = Math.random) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        const range = max - min;
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (rng() * range) + min;
        }
        
        return buffer;
    }
    
    // truncated normal distribution using Box-Muller transform
    // limit is number of standard deviations to truncate at
    truncatedNormalDistribution (mean = 0, stdDev = 1, limit = 2, rng = Math.random) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        const bound = limit * stdDev;

        for (let i = 0; i < size; i += 2) {
            let x;
            while (true) {
                const u1 = rng();
                const u2 = rng();
                const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                x = z0 * stdDev + mean;
                if (x >= mean - bound && x <= mean + bound) break; // within limits
            }
            buffer[i] = x;
        }
        
        this.buffer = buffer; 
    }

    // uniform distribution in range -r to +r
    uniformDistribution (r, rng = Math.random) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (rng() * 2 * r) - r;
        }
        
        this.buffer = buffer;       
    }

    fill (n) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        buffer.fill(n);
        
        this.buffer = buffer;
    }
    
    shape (batchSize) {
        return [...this.attributes.shape];
    }

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // nothing to do here
    }
    
    build (builder, operands, batchSize) {
        return builder.constant(this.descriptor(), this.buffer);
    }
}

// numeric literals - using explicitly given or inferred data type
class NumberNode extends NNNode {
    constructor(name, type, inputs = [], attributes = {}) {
        super(name, type, inputs, attributes);
        this.value = name;
        this.dataType = attributes.dataType ?? null;
        this.attributes.shape = []; // Scalars are rank-0
    }

    descriptor(batchSize) {
        // If the user didn't specify a type, default to float32 (JS standard)
        // unless influenced by a parent node (advanced inference).
        return {
            dataType: this.fixedType || 'float32',
            shape: this.options.shape || []
        };
    }
    
    shape (batchSize) {
        return [...this.attributes.shape];
    }

    resolveForward () {
    }
    
    resolveBackward() {
        // 1. Find what the consumers require (from NNNode base or topology)
        // If this.dataType was already set by a consumer during backward propagation
        if (!this.dataType) return;

        const value = parseFloat(this.value);
        const isInteger = Number.isInteger(value);

        // 2. Perform compatibility check
        if (this.dataType.startsWith('int') || this.dataType.startsWith('uint')) {
            if (!isInteger) {
                throw new Error(
                    `Type Error: Numeric literal "${this.value}" is not an integer, ` +
                    `but is being used in an operation requiring ${this.dataType}".`
                );
            }
        }
    
        // Note: integer values can usually be represented with floats
        log(`[Backward] resolved literal ${this.name} as ${this.dataType}`);
    }
    
    backprop (context) { 
        // nothing to do here
    }
    build (builder, operands, batchSize) {
        return builder.constant(this.dataType, this.name);
    }
}

// string literals - used by cast operator for target datatype
class StringNode extends NNNode {
    shape (batchSize) {
        return [...this.attributes.shape];
    }

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // nothing to do here
    }
    
    build (builder, operands, batchSize) {
        return this.name;  // e.g. 'float16'
    }
}

// used to cast to a given datatype e.g. float16
class CastNode extends NNNode {
    shape (batchSize) {
        return [...this.attributes.shape];
    }
    
    descriptor(batchSize) {
        const desc = this.inputs[0].descriptor(batchSize);
        return { ...desc, dataType: this.dataType };
    }

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop(context) {
        const { builder, gradients } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const inputDesc = this.inputs[0].descriptor(context.batchSize);
        
        // Only propagate gradients for float types
        if (['float32', 'float16'].includes(inputDesc.dataType)) {
             const inputGrad = builder.cast(grad, inputDesc.dataType);
             this.accumulateGradient(context, this.inputs[0], inputGrad);
        }
    }
    
    build (builder, operands, batchSize) {
        return builder.cast(...this.args(operands));
    }
}

class ClampNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs);
        this.minValue = options.minValue;
        this.maxValue = options.maxValue;
    }

    shape (batchSize) {
        return [...this.attributes.shape];
    }

    descriptor(batchSize) {
        return this.inputs[0].descriptor(batchSize);
    }

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    build(builder, operands, batchSize) {
        const x = operands[this.inputs[0].name];
        const options = {};
        if (this.minValue !== undefined) options.minValue = this.minValue;
        if (this.maxValue !== undefined) options.maxValue = this.maxValue;
        return builder.clamp(x, options);
    }

    backprop(context) {
        const { builder, gradients, operands } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const x = operands[this.inputs[0].name];
        let mask = builder.constant({ dataType: 'float32', shape: [] }, new Float32Array([1.0]));

        if (this.minValue !== undefined) {
            const minTensor = builder.constant({dataType: 'float32', shape: []}, new Float32Array([this.minValue]));
            mask = builder.mul(mask, builder.cast(builder.greaterOrEqual(x, minTensor), 'float32'));
        }
        if (this.maxValue !== undefined) {
            const maxTensor = builder.constant({dataType: 'float32', shape: []}, new Float32Array([this.maxValue]));
            mask = builder.mul(mask, builder.cast(builder.lesserOrEqual(x, maxTensor), 'float32'));
        }

        const inputGrad = builder.mul(grad, mask);
        
        if (gradients[this.inputs[0].name]) {
            gradients[this.inputs[0].name] = builder.add(gradients[this.inputs[0].name], inputGrad);
        } else {
            gradients[this.inputs[0].name] = inputGrad;
        }
    }
}

class ConcatNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs); // array of input nodes
        this.axis = options.axis ?? 0;
        this.preserveShape = false;
    }

    descriptor(batchSize) {
        const descs = this.inputs.map(inp => inp.descriptor(batchSize));
        const outShape = [...descs[0].shape];
        outShape[this.axis] = descs.reduce((sum, desc) => sum + desc.shape[this.axis], 0);
        return { dataType: descs[0].dataType, shape: outShape, readable: false, writable: false };
    }

    build(builder, operands, batchSize) {
        const inputs = this.inputs.map(inp => operands[inp.name]);
        return builder.concat(inputs, this.axis);
    }

    backprop(context) {
        const { builder, gradients } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        // Determine split sizes dynamically based on inputs
        const splits = this.inputs.map(inp => inp.descriptor(context.batchSize).shape[this.axis]);
        const splitGrads = builder.split(grad, splits, { axis: this.axis });

        for (let i = 0; i < this.inputs.length; i++) {
            const inputName = this.inputs[i].name;
            const inputGrad = splitGrads[i];
            if (gradients[inputName]) {
                gradients[inputName] = builder.add(gradients[inputName], inputGrad);
            } else {
                gradients[inputName] = inputGrad;
            }
        }
    }
}

class ArgMaxNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs);
        this.axes = options.axes;
        this.preserveShape = false;
        this.keepDimensions = options.keepDimensions ?? false;
    }

    descriptor(batchSize) {
        const inputDesc = this.inputs[0].descriptor(batchSize);
        let outShape = [];
        if (this.keepDimensions) {
            outShape = inputDesc.shape.map((dim, i) => this.axes.includes(i) ? 1 : dim);
        } else {
            outShape = inputDesc.shape.filter((_, i) => !this.axes.includes(i));
        }
        return { dataType: 'int32', shape: outShape, readable: false, writable: false };
    }

    build(builder, operands, batchSize) {
        const x = operands[this.inputs[0].name];
        return builder.argMax(x, { axes: this.axes, keepDimensions: this.keepDimensions });
    }

    backprop(context) {
        // Non-differentiable: We halt the gradient chain here.
    }
}

class ArgMinNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs);
        this.axes = options.axes;
        this.preserveShape = false;
        this.keepDimensions = options.keepDimensions ?? false;
    }

    descriptor(batchSize) {
        const inputDesc = this.inputs[0].descriptor(batchSize);
        let outShape = [];
        if (this.keepDimensions) {
            outShape = inputDesc.shape.map((dim, i) => this.axes.includes(i) ? 1 : dim);
        } else {
            outShape = inputDesc.shape.filter((_, i) => !this.axes.includes(i));
        }
        return { dataType: 'int32', shape: outShape, readable: false, writable: false };
    }

    build(builder, operands, batchSize) {
        const x = operands[this.inputs[0].name];
        return builder.argMin(x, { axes: this.axes, keepDimensions: this.keepDimensions });
    }

    backprop(context) {
        // Non-differentiable: We halt the gradient chain here.
    }
}

class CumulativeSumNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs);
        this.axis = options.axis;
        this.exclusive = options.exclusive ?? false;
        this.reversed = options.reversed ?? false;
    }

    descriptor(batchSize) {
        return this.inputs[0].descriptor(batchSize);
    }

    build(builder, operands, batchSize) {
        const x = operands[this.inputs[0].name];
        return builder.cumulativeSum(x, this.axis, { 
            exclusive: this.exclusive, 
            reversed: this.reversed 
        });
    }

    backprop(context) {
        const { builder, gradients } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        // Reverse the cumulative sum for the gradient
        const inputGrad = builder.cumulativeSum(grad, this.axis, {
            exclusive: this.exclusive,
            reversed: !this.reversed
        });

        if (gradients[this.inputs[0].name]) {
            gradients[this.inputs[0].name] = builder.add(gradients[this.inputs[0].name], inputGrad);
        } else {
            gradients[this.inputs[0].name] = inputGrad;
        }
    }
}

class BatchNormalizationNode extends NNNode {
    constructor(name, inputs, options = {}) {
        super(name, inputs); // inputs[0]=input, [1]=mean, [2]=var, [3]=scale(opt), [4]=bias(opt)
        this.axis = options.axis ?? 1;
        this.broadcast = true;
        this.epsilon = options.epsilon ?? 1e-5;
    }

    descriptor(batchSize) {
        return this.inputs[0].descriptor(batchSize);
    }

    build(builder, operands, batchSize) {
        const input = operands[this.inputs[0].name];
        const mean = operands[this.inputs[1].name];
        const variance = operands[this.inputs[2].name];
        const options = { epsilon: this.epsilon, axis: this.axis };
        
        if (this.inputs[3]) options.scale = operands[this.inputs[3].name];
        if (this.inputs[4]) options.bias = operands[this.inputs[4].name];

        return builder.batchNormalization(input, mean, variance, options);
    }

    backprop(context) {
        const { builder, gradients, operands, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const x = operands[this.inputs[0].name];
        const variance = operands[this.inputs[2].name];
        const scale = this.inputs[3] ? operands[this.inputs[3].name] : null;
        
        const epsTensor = builder.constant({dataType: 'float32', shape: []}, new Float32Array([this.epsilon]));
        const stdDev = builder.sqrt(builder.add(variance, epsTensor));
        
        // 1. Gradients w.r.t input (dL/dx)
        let gradX = builder.div(grad, stdDev);
        if (scale) gradX = builder.mul(gradX, scale);

        if (gradients[this.inputs[0].name]) {
            gradients[this.inputs[0].name] = builder.add(gradients[this.inputs[0].name], gradX);
        } else {
            gradients[this.inputs[0].name] = gradX;
        }

        // 2. Gradients w.r.t Scale and Bias
        const axes = this.inputs[0].descriptor(batchSize).shape.map((_, i) => i).filter(i => i !== this.axis);

        if (this.inputs[3]) { // scale gradient
            const mean = operands[this.inputs[1].name];
            const xNorm = builder.div(builder.sub(x, mean), stdDev);
            const gradScale = builder.reduceSum(builder.mul(grad, xNorm), { axes, keepDimensions: false });
            
            if (gradients[this.inputs[3].name]) {
                gradients[this.inputs[3].name] = builder.add(gradients[this.inputs[3].name], gradScale);
            } else gradients[this.inputs[3].name] = gradScale;
        }

        if (this.inputs[4]) { // bias gradient
            const gradBias = builder.reduceSum(grad, { axes, keepDimensions: false });
            if (gradients[this.inputs[4].name]) {
                gradients[this.inputs[4].name] = builder.add(gradients[this.inputs[4].name], gradBias);
            } else gradients[this.inputs[4].name] = gradBias;
        }
    }
}

class MatMulNode extends NNNode {
    constructor (...args) {
        super (...args);
        this.preserveShape = false;
    }
    
    shape(batchSize) {
        const a = this.inputs[0].shape(batchSize);
        const b = this.inputs[1].shape(batchSize);
        // Basic 2D logic: [M, K] x [K, N] -> [M, N]
        return [a[0], b[1]];
    }

    resolveBackward () {
        super.resolveBackward(); // to handle data type
        
        // now deal with shape consistency
        const s1 = this.inputs[0].attributes.shape;
        const s2 = this.inputs[1].attributes.shape;
        const s3 = this.attributes.shape;
        const shape = [s1[0], s3[0]]; // expected param shape
        
        if (s2) {
            if (incompatible(s2, shape)) {
                let valid = false;
                
                if (this.broadcast)
                    valid = isBroadcastable(s1, shape);
                    
                if (!valid)
                    this.warn(`### operation ${this.name} cannot broadcast to [${shape}]`);
            } else {
                this.warn(`### operation ${this.name} has an inconsistent shape, expecting ${shape}`);
            }
        } else {
            this.inputs[1].attributes.shape = [s1[0], s3[0]];        
        }
    }
    
    backprop(context) {
        const builder = context.builder;
        const batchSize = context.batchSize;
        const operands = context.operands;
        const gradients = context.gradients;
        const gradient = gradients[this.name];  // gradient of layer's output
        
        const dY = gradients[this.name];
        if (!dY) return;

        const a = this.inputs[0];
        const b = this.inputs[1];
        
        const A = operands[a.name];
        const B = operands[b.name];
        const rankA = a.shape(batchSize).length;
        const rankB = b.shape(batchSize).length;
     
        // Helper to generate a permutation array that swaps only the last two dimensions
        // e.g., for 3D tensor [0, 1, 2] -> [0, 2, 1]
        const getTransposePermutation = (rank) => {
            const perm = Array.from({ length: rank }, (_, i) => i);
            if (rank >= 2) {
                [perm[rank - 2], perm[rank - 1]] = [perm[rank - 1], perm[rank - 2]];
            }
            return perm;
        };

        const transposedB = builder.transpose(B, { permutation: getTransposePermutation(rankB) });
        const transposedA = builder.transpose(A, { permutation: getTransposePermutation(rankA) });
        
        // dA = dY * B^T
        let dA = builder.matmul(dY, transposedB);
        // dB = A^T * dY
        let dB = builder.matmul(transposedA, dY);
        
        // Reduce broadcasted gradients back to original operand shapes
        dA = broadcastReduce(builder, dA, dA.shape, a.shape(batchSize), batchSize);
        dB = broadcastReduce(builder, dB, dB.shape, b.shape(batchSize), batchSize);

        this.accumulateGradient(context, a, dA);
        this.accumulateGradient(context, b, dB);
    }

    build(builder, operands, batchSize) {
        return builder.matmul(...this.args(operands));
    }
}

// Parent class for element-wise mathematical binary nodes.
// Provides shared shape inference and utility for accumulating gradients.

class ElementWiseMathNode extends NNNode {
    constructor(name, type, inputs, options) {
        super(name, type, inputs, options);
        this.broadcast = true;
    }

    // Typical broadcast shape inference 
    descriptor(batchSize) {
        const descA = this.inputs[0].descriptor(batchSize);
        const descB = this.inputs[1].descriptor(batchSize);
        return {
            dataType: descA.dataType, 
            shape: this.broadcastShapes([descA.shape, descB.shape])
        };
    }

    resolveBackward () {
        super.resolveBackward(); // handle data type
        
        // now deal with shape consistency
        const s1 = this.inputs[0].attributes.shape;
        const s2 = this.inputs[1].attributes.shape;
        const shape = this.attributes.shape;
        
        // bias should have same shape as this node
        if (s2) {
            if (incompatible(s2, shape)) {
                let valid = false;
                
                if (this.broadcast)
                    valid = isBroadcastable(s1, shape);
                    
                if (!valid)
                    this.warn(`### operation ${this.name} cannot broadcast to [${shape}]`);
            } else {
                this.warn(`### operation ${this.name} has an inconsistent shape, expecting ${shape}`);
            }
        } else {
            this.inputs[1].attributes.shape = [...shape];
        }
    }

    // Standardised build that handles automatic casting
    build(builder, operands, batchSize) {
        const desc = this.descriptor(batchSize);
        const targetType = desc.dataType;

        let opA = operands[this.inputs[0].name];
        let opB = operands[this.inputs[1].name];

        // Cast Operand A if necessary
        if (this.inputs[0].descriptor(batchSize).dataType !== targetType) {
            opA = builder.cast(opA, targetType);
        }

        // Cast Operand B if necessary
        if (this.inputs[1].descriptor(batchSize).dataType !== targetType) {
            opB = builder.cast(opB, targetType);
        }

        // Call the internal implementation (e.g., _doBuild) 
        // which now receives guaranteed matching types
        return this._doBuild(builder, opA, opB);
    }
    
    // Helper to reduce gradients if the forward pass involved shape broadcasting
    reduceGradient(builder, grad, inputNode, batchSize) {
        const gradShape = this.descriptor(batchSize).shape;
        const inputShape = inputNode.descriptor(batchSize).shape;
        return broadcastReduce(builder, grad, gradShape, inputShape, batchSize);
    }
}


// Parent class for binary element-wise logical nodes
class ElementWiseLogicalNode extends ElementWiseMathNode {
    descriptor(batchSize) {
        const descA = this.inputs[0].descriptor(batchSize);
        const descB = this.inputs[1].descriptor(batchSize);
        return {
            dataType: 'uint8', // WebNN logical operators generally yield boolean/uint8 
            shape: this.broadcastShapes(descA.shape, descB.shape)
        };
    }

    backprop(context) {
        // Logical comparisons are non-differentiable. No gradients are passed down.
    }
}

// Parent class for unary element-wise logical nodes
class UnaryLogicalNode extends NNNode {
    descriptor(batchSize) {
        const desc = this.inputs[0].descriptor(batchSize);
        return {
            dataType: 'uint8', 
            shape: desc.shape
        };
    }

    backprop(context) {
        // Non-differentiable
    }
}

class AddNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.add(opA, opB);
    }
    
    backprop(context) {
        const { builder, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        // c = a + b
        // da = dc, db = dc
        if (this.inputs[0].type !== 'constant') {
            let da = this.reduceGradient(builder, grad, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        
        if (this.inputs[1].type !== 'constant') {
            let db = this.reduceGradient(builder, grad, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class SubNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.sub(opA, opB);
    }
    
    backprop(context) {
        const { builder, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        // c = a - b 
        // da = dc, db = -dc
        if (this.inputs[0].type !== 'constant') {
            let da = this.reduceGradient(builder, grad, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        if (this.inputs[1].type !== 'constant') {
            let db = builder.neg(grad);
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class MulNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.mul(opA, opB);
    }
    
    backprop(context) {
        const { builder, operands, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const a = operands[this.inputs[0].name];
        const b = operands[this.inputs[1].name];

        // c = a * b
        // da = dc * b, db = dc * a
        if (this.inputs[0].type !== 'constant') {
            let da = builder.mul(grad, b);
            da = this.reduceGradient(builder, da, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        if (this.inputs[1].type !== 'constant') {
            let db = builder.mul(grad, a);
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class DivNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.div(opA, opB);
    }

    backprop(context) {
        const { builder, operands, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const a = operands[this.inputs[0].name];
        const b = operands[this.inputs[1].name];

        // c = a / b
        // da = dc / b
        if (this.inputs[0].type !== 'constant') {
            let da = builder.div(grad, b);
            da = this.reduceGradient(builder, da, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        
        // db = dc * (-a / b^2)
        if (this.inputs[1].type !== 'constant') {
            const negA = builder.neg(a);
            const bSquared = builder.mul(b, b);
            const negADivBSquared = builder.div(negA, bSquared);
            let db = builder.mul(grad, negADivBSquared);
            
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class MaxNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.max(opA, opB);
    }

    backprop(context) {
        const { builder, operands, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const a = operands[this.inputs[0].name];
        const b = operands[this.inputs[1].name];

        // Route gradient to the larger value. If equal, generally routed to 'a'.
        const maskA = builder.cast(builder.greaterOrEqual(a, b), grad.dataType);
        const maskB = builder.cast(builder.lesser(a, b), grad.dataType);

        if (this.inputs[0].type !== 'constant') {
            let da = builder.mul(grad, maskA);
            da = this.reduceGradient(builder, da, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        if (this.inputs[1].type !== 'constant') {
            let db = builder.mul(grad, maskB);
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class MinNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.min(opA, opB);
    }

    backprop(context) {
        const { builder, operands, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const a = operands[this.inputs[0].name];
        const b = operands[this.inputs[1].name];

        // Route gradient to the smaller value
        const maskA = builder.cast(builder.lesserOrEqual(a, b), grad.dataType);
        const maskB = builder.cast(builder.greater(a, b), grad.dataType);

        if (this.inputs[0].type !== 'constant') {
            let da = builder.mul(grad, maskA);
            da = this.reduceGradient(builder, da, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }
        if (this.inputs[1].type !== 'constant') {
            let db = builder.mul(grad, maskB);
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class PowNode extends ElementWiseMathNode {
    _doBuild(builder, opA, opB) {
        return builder.pow(opA, opB);
    }

    backprop(context) {
        const { builder, operands, gradients, batchSize } = context;
        const grad = gradients[this.name];
        if (!grad) return;

        const a = operands[this.inputs[0].name];
        const b = operands[this.inputs[1].name];

        // da = dc * (b * a^(b - 1))
        if (this.inputs[0].type !== 'constant') {
            // We can calculate a^(b-1) as (a^b / a)
            const output = builder.pow(a, b);
            const derivA = builder.mul(b, builder.div(output, a));
            let da = builder.mul(grad, derivA);
            
            da = this.reduceGradient(builder, da, this.inputs[0], batchSize);
            this.accumulateGradient(context, this.inputs[0], da);
        }

        // db = dc * (a^b * ln(a))
        if (this.inputs[1].type !== 'constant') {
            const output = builder.pow(a, b);
            const lnA = builder.log(a);
            const derivB = builder.mul(output, lnA);
            let db = builder.mul(grad, derivB);
            
            db = this.reduceGradient(builder, db, this.inputs[1], batchSize);
            this.accumulateGradient(context, this.inputs[1], db);
        }
    }
}

class EqualNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.equal(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class NotEqualNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.notEqual(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class GreaterNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.greater(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class GreaterOrEqualNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.greaterOrEqual(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LesserNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.lesser(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LesserOrEqualNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.lesserOrEqual(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LogicalAndNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.logicalAnd(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LogicalOrNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.logicalOr(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LogicalXorNode extends ElementWiseLogicalNode {
    build(builder, operands) { return builder.logicalXor(operands[this.inputs[0].name], operands[this.inputs[1].name]); }
}

class LogicalNotNode extends UnaryLogicalNode {
    build(builder, operands) { return builder.logicalNot(operands[this.inputs[0].name]); }
}

class IsNanNode extends UnaryLogicalNode {
    // WebNN often maps this to logicalIsNan or isNan depending on the specific API binding
    build(builder, operands) { return builder.logicalIsNan(operands[this.inputs[0].name]); }
}

class IsInfiniteNode extends UnaryLogicalNode {
    build(builder, operands) { return builder.logicalIsInfinite(operands[this.inputs[0].name]); }
}

class ReluNode extends NNNode {
    shape(batchSize) { return this.inputs[0].shape(batchSize); }
    
    build(builder, operands, batchSize)
    {
        return builder.relu(...this.args(operands));
    }

    // Saturated when the value is less than or equal to zero (the "dead neuron" state)
    buildSaturationMetric(builder, activations) {
        const totalSize = activations.shape.reduce((a, b) => a * b, 1);
        const isDead = builder.lesserOrEqual(activations, builder.constant('float32', 0.0));
        return this.calculateRatio(builder, isDead, totalSize);
    }

    isActivation () {
        return true;
    }

    // used to initialise params
    initialize (rng) {
        // weightAlg: 'he', biasValue: 0.01
        function fan (shape) {
            return shape.length ? shape[shape.length - 1] : 1;
        }
        
        const  addNode = this.inputs[0];
        if (addNode) {
            const matmulNode = addNode.inputs[0];
            const biasNode = addNode.inputs[1];
            if (matmulNode && biasNode &&
                matmulNode.type === 'matmul' &&
                biasNode.type === 'param') {
                const weightsNode = matmulNode.inputs[1];
                if (weightsNode && weightsNode.type === 'param') {
                    const outputShape = matmulNode.attributes.shape;
                    const inputShape = matmulNode.inputs[0].attributes.shape;
                    const r = Math.sqrt(6.0/fan(inputShape));
                    weightsNode.attributes.init = 'he';
                    weightsNode.uniformDistribution(r, rng);
                    biasNode.attributes.bias = 0.01;
                    biasNode.fill(biasNode.attributes.bias);
                }
            }
        }
    }

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) {
        const builder = context.builder;
        const operands = context.operands;
        const gradients = context.gradients;
        
        const dY = gradients[this.name];
        if (!dY) return;
        
        const X = this.inputs[0];
        
        // Create a zero scalar of the appropriate type to compare against
        const dataType = this.dataType;
        const DataType = NNModel.ML_TYPE_MAP(dataType);
        const zeroBuffer = new DataType([0]); // Adjust based on this node's data type
        const zeroConstant = builder.constant({dataType: dataType, shape: []}, zeroBuffer);

        // Create a boolean mask where X > 0
        const condition = builder.greater(operands[X.name], zeroConstant);
    
        // Cast the boolean mask back to float to multiply with the gradient
        const floatMask = builder.cast(condition, 'float32'); 
    
        // dX = dY * mask
        const dX = builder.mul(dY, floatMask);

        this.accumulateGradient(context, X, dX);
        gradients[X.name] = dX;
    }
}

class SoftmaxNode extends NNNode {
    constructor (...args) {
        super (...args);
    }
    
    build (builder, operands, batchSize) {
        const shape = this.shape(batchSize);
        const axis = shape.length - 1;
        return builder[this.type](...this.args(operands), axis, this.options);
    }

    // SoftMax is saturated if the probability distribution becomes too "peaky"
    // (one class dominates) or too "flat" (maximum uncertainty). A common metric
    // for SoftMax saturation is measuring if the highest probability is near 1.0
    buildSaturationMetric (builder, activations) {
        const totalSize = activations.shape.reduce((a, b) => a * b, 1);
        // Find the max probability per sample
        const maxProb = builder.reduceMax(activations, { axes: [1], keepDimensions: true });
        // Saturated if the max probability is > 0.95 (highly confident/peaky)
        const isSaturated = builder.greaterOrEqual(maxProb, builder.constant('float32', 0.95));
        return this.calculateRatio(builder, isSaturated, totalSize);
    }

    buildLoss (builder, prediction, expected, mask, validCount) {
        // --- 1. Compute Scalar Monitoring Loss (Cross Entropy) ---
        const epsilon = builder.constant({dataType: 'float32',
                                            shape: [1]}, new Float32Array([1e-7]));
        const safePrediction = builder.add(prediction, epsilon);
        const logPrediction = builder.log(safePrediction);
        const product = builder.mul(expected, logPrediction);
        const maskedProduct = builder.mul(mask, product);
        
        // To get the mean loss, divide by validCount, not just sum it
        const sum = builder.reduceSum(maskedProduct);
        const validCountFloat = builder.cast(validCount, 'float32');
        const meanLoss = builder.div(builder.neg(sum), validCountFloat);

        // --- 2. Compute Loss Gradient Tensor ---
        // Derivative of Softmax + CrossEntropy is: (Prediction - Expected)
        let lossGradient = builder.sub(prediction, expected);
        
        // Apply the mask to the gradient so invalid samples don't affect weights
        lossGradient = builder.mul(lossGradient, mask);

        // Scale the gradient by 1/N to match the Mean Loss calculation
        lossGradient = builder.div(lossGradient, validCountFloat);

        // use meanLoss for reporting and gradient for back propagation
        return { batchLoss: meanLoss, lossGradient: lossGradient };
    }

    isActivation () {
        return true;
    }

    // used to initialise params
    initialize (rng) {
        // weightAlg: 'he', biasValue: 0.01
        function fan (shape) {
            return shape.length ? shape[shape.length - 1] : 1;
        }
        
        const  addNode = this.inputs[0];
        if (addNode) {
            const matmulNode = addNode.inputs[0];
            const biasNode = addNode.inputs[1];
            if (matmulNode && biasNode &&
                matmulNode.type === 'matmul' &&
                biasNode.type === 'param') {
                const weightsNode = matmulNode.inputs[1];
                if (weightsNode && weightsNode.type === 'param') {
                    const outputShape = matmulNode.attributes.shape;
                    const inputShape = matmulNode.inputs[0].attributes.shape;
                    const r = Math.sqrt(6.0/(fan(inputShape) + fan(outputShape)));
                    weightsNode.attributes.init = 'glorot';
                    weightsNode.truncatedNormalDistribution(0, r, 2, rng);
                    biasNode.attributes.bias = 0.0;
                    biasNode.fill(biasNode.attributes.bias);
                }
            }
        }
    }

    // Softmax does not change the shape of the tensor
    // so rely on parent's implementation for shape()

    resolveForwards (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) {
        const builder = context.builder;
        const operands = context.operands;
        const gradients = context.gradients;
        const gradient = gradients[this.name];  // gradient of layer's output
        
        const dY = gradients[this.name];
        if (!dY) return;
        
        const x = this.inputs[0];
        const Y = operands[this.name]; // We need the forward OUTPUT for softmax backprop

        // Get the axis over which softmax was applied, defaults to the last axis)
        const shape = this.shape(context.batchSize);
        const axis = this.attributes.axis ?? shape.length - 1;
        // WebNN reduceSum needs positive axes usually, depending on polyfill strictness.
        // If you need to convert -1 to the actual axis index, do it here.

        // 1. dY * Y (Element-wise multiplication)
        const dY_mul_Y = builder.mul(dY, Y);

        // 2. Sum along the softmax axis, keeping dimensions so it broadcasts correctly when subtracting
        const sum_dY_mul_Y = builder.reduceSum(dY_mul_Y, { 
            axes: [axis], 
            keepDimensions: true 
        });

        // 3. dY - sum(dY * Y)
        const diff = builder.sub(dY, sum_dY_mul_Y);

        // 4. dX = Y * (dY - sum(dY * Y))
        const dX = builder.mul(Y, diff);

        this.accumulateGradient(context, x, dX);
        gradients[x.name] = dX;
    }    
}

const NODE_CLASSES = {
    'input': InputNode, 'output': OutputNode, 'param': ParamNode,
    'number': NumberNode, 'string': StringNode,
    'cast': CastNode, 'clamp': ClampNode, 'concat': ConcatNode,
    'argMax': ArgMaxNode, 'argMin': ArgMinNode,
    'cumulativeSum': CumulativeSumNode, 'batchNorm': BatchNormalizationNode,
    'matmul': MatMulNode,
    'add': AddNode, 'sub': SubNode, 'mul': MulNode, 'div': DivNode,
    'max': MaxNode, 'min': MinNode, 'pow': PowNode,
    'equal': EqualNode, 'notEqual': NotEqualNode, 'greater': GreaterNode,
    'greaterOrEqual': GreaterOrEqualNode, 'lesser': LesserNode,
    'lesserOrEqual': LesserOrEqualNode, 'logicalNot': LogicalNotNode,
    'logicalAnd': LogicalAndNode, 'logicalOr': LogicalOrNode,
    'logicalXor': LogicalXorNode, 'isNaN': IsNanNode, 'isInfinite': IsInfiniteNode,
    'relu': ReluNode,
    'softmax': SoftmaxNode,
    // ... add all other operators here
};

// test if two shapes are different
function incompatible (shape1, shape2) {
    if (shape1 === undefined || shape2 === undefined)
        return false; // unknown as yet
        
    if (shape1.length !== shape2.length)
        return true; // different rank
        
    for (let i = 0; i < shape1.length; ++i) {
        if (shape1[i] !== shape2[i])
            return true; // different dimension size
    }
    
    return false;
}

/**
 * Creates a new instance of a subclass of NNNode based upon the type.
 * @param {string} node type
 * @param {string} name - uniquely identifies the node in the graph
 * @param {[NNNode]} inputs - the nodes acting as inputs to this node
 * @param {Map} attributes - map of name to number or string for operator options
 */
 
function createNode(type, name, inputs, attributes={}) {
    const NodeClass = NODE_CLASSES[type]; // exception if unregistered type!!!
    const node = new NodeClass(name, type, inputs, attributes);
    node.type = type;
    node.attributes['name'] = name;
    return node;
}

// Information used for data type inference and casting

const TYPE_PRECEDENCE_MAP = {
    'float32': 10,
    'float16': 9,
    'int32': 8,
    'uint32': 7,
    'int8': 2,
    'uint8': 1
};

// Reverse map to get data type name back from a number
const TYPE_NAME_MAP = Object.fromEntries(
  Object.entries(TYPE_PRECEDENCE_MAP).map(([name, value]) => [value, name])
);

function getLUB(dataTypes) {
    // 1. Filter out null/undefined (uncommitted types)
    const validTypes = dataTypes.filter(type => type !== null && type !== undefined);

    // 2. If no inputs have a type yet (e.g., Add(Number, Number)), default to float32
    if (validTypes.length === 0) {
        return "float32";
    }

    // 3. Map valid types to precedence
    const values = validTypes.map(type => {
        const p = TYPE_PRECEDENCE_MAP[type];
        if (p === undefined) throw new Error(`Unknown DataType: ${type}`);
        return p;
    });

    // 4. Return the highest precedence among valid types
    const maxPrecedence = Math.max(...values);
    return TYPE_NAME_MAP[maxPrecedence];
}

// Reconciles types with an added "Promotion Bridge" rule:
// If Int and Float are mixed, promote to at least Float32 
// to prevent massive precision loss.

function reconcileTypes(typeA, typeB) {
    const isFloat = (type) => type.startsWith("float") || type.startsWith("complex");
  
    const aFloat = isFloat(typeA);
    const bFloat = isFloat(typeB);

    // If mixing types (e.g., int64 and float16), promote to float32
    if (aFloat !== bFloat) {
        return getLUB([typeA, typeB, "float32"]);
    }

    return getLUB([typeA, typeB]);
}


// Helper to verify if inputShape can be broadcast to outputShape
function isBroadcastable(inputShape, outputShape) {
    const inLen = inputShape.length;
    const outLen = outputShape.length;

    // WebNN broadcasting typically requires input rank <= output rank
    if (inLen > outLen) return false;

    // Check dimensions from right to left
    for (let i = 1; i <= inLen; i++) {
        const inDim = inputShape[inLen - i];
        const outDim = outputShape[outLen - i];

        // Dimension is valid if it matches OR if input is 1 (stretched)
        if (inDim !== outDim && inDim !== 1) {
            return false;
        }
    }
    return true;
}

// Utility function for WebNN broadcast rules
function broadcastShapes(shapeA, shapeB) {
    const rankA = shapeA.length;
    const rankB = shapeB.length;
    const maxRank = Math.max(rankA, rankB);
    const result = new Array(maxRank);
    
    for (let i = 0; i < maxRank; i++) {
        const dimA = i < rankA ? shapeA[rankA - 1 - i] : 1;
        const dimB = i < rankB ? shapeB[rankB - 1 - i] : 1;
        
        if (dimA !== dimB && dimA !== 1 && dimB !== 1) {
            throw new Error(`Incompatible broadcast shapes: [${shapeA}] and [${shapeB}]`);
        }
        result[maxRank - 1 - i] = Math.max(dimA, dimB);
    }
    return result;
}

/**
 * Reduces the gradient tensor to match the shape of the original input.
 * @param {MLNNTopology} builder - The WebNN builder instance.
 * @param {MLOperand} grad - The upstream gradient operand.
 * @param {number[]} inputShape - The shape of the original input tensor.
 * @returns {MLOperand} The reduced gradient.
 */
  
function broadcastReduce(builder, grad, gradShape, inputShape, batchSize) {
    // 1. If shapes already match, no work needed
    if (JSON.stringify(gradShape) === JSON.stringify(inputShape))
        return grad;

    const axes = [];
    const diff = gradShape.length - inputShape.length;

    // 2. Identify leading dimensions (Rank expansion)
    // e.g., Input [3, 4] broadcasted to [2, 5, 3, 4]. Axes 0 and 1 were added.
    for (let i = 0; i < diff; i++) {
        axes.push(i);
    }

    // 3. Identify size-1 dimensions (Dimension stretching)
    // e.g., Input [5, 1] broadcasted to [5, 10]. Axis 1 was stretched.
    for (let i = 0; i < inputShape.length; i++) {
        if (inputShape[i] === 1 && gradShape[i + diff] > 1)
            axes.push(i + diff);
    }

    if (axes.length === 0)
        return grad;

    // 4. Reduce sum across the identified axes
    // We keepDimensions: true initially to make the final reshape more predictable
    let reducedGrad = builder.reduceSum(grad, {axes, keepDimensions: true});

    // 5. Final Reshape
    // Even with keepDimensions, we might have extra leading 1s from the rank expansion.
    // Reshaping to the exact inputShape is the safest way to return the correct operand.
    return builder.reshape(reducedGrad, inputShape);
}
