// WebNNM web browser library for inference and training neural network models
// with WebNN as a platform independent backend using NPUs, GPUs and CPUs

const NN_READABLE = 1;  // used for model outputs
const NN_WRITABLE = 2; // used for model inputs
const NN_READ_WRITE = (NN_READABLE | NN_WRITABLE);

export class NNModel {
    #webnn;
    #config;
    #engine;
    #dataset;
    #datasetToModel = {}; // maps names of inputs and outputs
    #graphCache = {}; // cache of prepared models

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
                
                    log('Neural network graph in execution order:');
                    log(model.dag.serialize());
                    
                    let names = [];
                    for (const name in model.dag.params)
                        names.push(name);
                    log(`\nParameter names: ${names.join(', ')}`);
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
    async test () {
        const model = this;
        const dataset = model.#dataset;
        const subset = dataset.subsetRole.TESTING;
        const webnn = model.#webnn;
        
        function prefix (name) {
            const parts = name.split(':');
            return parts[0];
        }
        
        let averageLosses = {};
        let numberOfSamples = 0;
        
        log(`\nTesting against ${dataset.name()} dataset:`);

        // prepare evaluation epoch as iterator over batches
        dataset.prepareBatches(subset);
        const batchCount = dataset.getNumBatches(subset);
        const batchSize = dataset.getBatchSize(); // fixed for all batches
        const graph = await model.#engine.testingGraph(batchSize);
        const inputs = {}, outputs = {};
        
        for (let i = 0; i < batchCount; ++i) {
            const batch = dataset.getNextBatch(subset, model);
            // last batch has zeros for missing samples
            const validCount = batch.validCount; // actual number of samples
            
            // get tensor for sample model inputs, then write them
            for (const key in model.dag.inputs) {
                // prepare tensor for model input
                const node = model.dag.inputs[key];
                const descriptor = node.descriptor(batchSize);
                const blockName = prefix(key);
                const name = blockName + ':input';
                
                if (!batch.inputs[blockName])
                    throw new Error(`dataset lacks data for ${blockName}`);
                    
                const tensor = await webnn.createTensor(descriptor);
                webnn.writeTensor(tensor, batch.inputs[blockName].data);
                inputs[name] = tensor;
            }
            
            {
                // update tensor with the actual number of samples in each batch
                const descriptor = {dataType: 'int32', shape: [], readable: false,  writable: true};
                const tensor = await webnn.createTensor(descriptor);
                webnn.writeTensor(tensor, new Int32Array([validCount]));
                inputs['validCount'] = tensor;
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
            
            await webnn.dispatch(graph, inputs, outputs);
            log(`  processed batch ${i+1}, size ${batchSize}, actual ${validCount}`);

            // readback the loss for each model output
            for (const key in model.dag.outputs) {
                const node = model.dag.outputs[key];
                const blockName = prefix(key);
                const name = blockName + ':loss';
                const tensor = outputs[name]
                const loss = await webnn.readTensor(tensor);  
                const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
                const array = new DataType(loss);
        
                if (averageLosses[name] === undefined)
                    averageLosses[name] = validCount * array[0];
                else
                    averageLosses[name] += validCount * array[0];
            }
            
            numberOfSamples += validCount;
        } 
        
        for (const name in averageLosses) {
            const loss = averageLosses[name]
            const blockName = name.split(':')[0];
            log(`  ${blockName}: average loss per sample = ${loss/numberOfSamples}`);
        }           
    }
 
    // Run WebNN training graph on dataset passed on start up
    // Batched testing where last batch is usually smaller
    // Allow for models with multiple inputs and outputs
    // #### Revise to match changes to model.test() ####
    async train (hyperparams) {
        const model = this;
        const dataset = model.#dataset;
        const subset = dataset.subsetRole.TESTING;
        const webnn = model.#webnn;
        const inputBanks = new Array(2);
        const outputBanks = new Array(2);
        
        // report average loss per sample after every batch and each epoch
        let averageLosses = {};
        let numberOfSamples = 0;
        
        if (hyperparams === undefined) {
            hyperparams = {
                lr: 0.001,
                beta1: 0.9,
                weightDecay: 0.01,
                epochs: 20
            }
        }
        
        const epochs = hyperparams.epochs ?? 20;
        
        // prepare evaluation epoch as iterator over batches
        dataset.prepareBatches(subset);
        const batchCount = dataset.getNumBatches(subset);
        const batchSize = dataset.getBatchSize(); // fixed for all batches
        const graph = await model.#engine.trainingGraph(batchSize, hyperparams);

       log(`\nTraining against ${dataset.name()} dataset: average loss per sample`);

        let bank = 0; // used to switch banks on odd/even batches
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
        // add these to both input banks
        for (const key in model.dag.inputs) {
            const node = model.dag.inputs[key];
            const descriptor = node.descriptor(batchSize);
            const tensor = await webnn.createTensor(descriptor);
            inputBanks[0][node.name] = inputBanks[1][node.name] = tensor;
        }
        
        // prepare input tensors for expected outputs
        // prepare output tensors for batch losses, add to banks
        for (const key in model.dag.outputs) {
            const node = model.dag.outputs[key];
            const expectedDescriptor = node.descriptor(batchSize);
            const lossDescriptor = {...expectedDescriptor}; // an output
            lossDescriptor.shape = []; // make it a scalar
            expectedDescriptor.readable = false; // make it an input
            expectedDescriptor.writable = true;
            let name = prefix(key) + ':expected';
            let tensor = await webnn.createTensor(lossDescriptor);
            inputBanks[0][name] =  inputBanks[1][name] = tensor;
            name = prefix(key) + ':loss';
            tensor = await webnn.createTensor(expectedDescriptor);
            outputBanks[0][name] =  outputBanks[1][name] = tensor;
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
        const descriptor = {dataType: 'int32', shape: [], readable: false,  writable: true};
        const tensor = await webnn.createTensor(descriptor);
        inputBanks[0]['validCount'] = inputBanks[1]['validCount'] = tensor;
            
        // iterate through training epochs
        for (let epoch = 1; epoch <= epochs; ++ epoch) {
            let averageLosses = {};
            let numberOfSamples = 0;

            // iterate through batches for this epoch
            for (let i = 0; i < batchCount; ++i) {
                bank = i&1;

                const batch = dataset.getNextBatch(subset, model);// last batch has zeros for missing samples
                const validCount = batch.validCount; // actual number of samples
                
                const inputs = inputBanks[bank];
                const outputs = outputBanks[bank];
                
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

                await webnn.dispatch(graph, inputs, outputs);
                //log(`    processed batch ${i+1}, size ${batchSize}`);

                // readback the batch loss for each model output
                for (const key in model.dag.outputs) {
                    const node = model.dag.outputs[key];
                    const blockName = prefix(key);
                    const name = blockName + ':loss';
                    const tensor = outputs[name]
                    const loss = await webnn.readTensor(tensor);  
                    const DataType = NNModel.ML_TYPE_MAP(tensor.dataType);
                    const array = new DataType(loss);
                            
                    if (averageLosses[name] === undefined)
                        averageLosses[name] = validCount * array[0];
                    else
                        averageLosses[name] += validCount * array[0];
                        
                    //log(`    Batch ${i+1}, bank ${bank}, ${blockName}:loss = ${array[0]}`);
               }
            
                numberOfSamples += validCount;
            } 
        
            for (const name in averageLosses) {
                const loss = averageLosses[name]
                const blockName = name.split(':')[0];
                log(`  Epoch ${epoch}, ${blockName}:loss = ${loss/numberOfSamples}`);
            }
            
            dataset.prepareBatches(subset); // prepare for next epoch           
        }
        
        // read back params after finishing training
        for (const key in model.dag.params) {
            const param = model.dag.params[key];
            const tensor = outputBanks[bank][key]
            param.buffer = await webnn.readTensor(tensor);
        }       
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
        function parseLayers(layersInput, blockName) {
            let layers = [];
    
            // Split by comma ONLY if not inside [] OR (), preventing
            // splitting "dense(shape=[128], activation=relu)" into two items
            const layerStrings = layersInput.split(/,(?![^\[\(]*[\]\)])/).map(l => l.trim());

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
        function parseLayer(input) {
            const match = input.match(/^(\w+)\((.*)\)$/);
            if (!match) return null;

            const [_, name, innerContent] = match;

            // Split by comma, but ONLY if the comma is not inside square brackets [ ]
            // This uses a "negative lookahead" to ensure we don't split [128, 64]
            const parts = innerContent.split(/,(?![^\[]*\])/).map(p => p.trim());

            const operands = [];
            const options = new Map();

            // Categorize each part
            parts.forEach(part => {
                if (part.includes('=')) {
                    const [key, value] = part.split('=');
                    const n = Number(value);
                    options.set(key.trim(), isNaN(value) ? value.trim() : n);
                } else if (part.length > 0) {
                    const n = Number(part);
                    operands.push(isNaN(part) ? part : n);
                }
            });
            
            const shape = options.get('shape');
            
            if (shape)
                options.set('shape', shape.match(/-?\d+/g).map(Number));

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
        log(`  ${mode} graph compiled for batch size ${batchSize}`)
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
            operands[node.name] = node.build(builder, operands, batchSize);
            
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
                
        const validCount = builder.input('validCount', {
            dataType:'int32', shape:[], readable:true, writable:true,
        });

        // Forward pass & compute losses/gradients
        for (const node of executionList) {
            operands[node.name] = node.type === 'constant'
              ?  builder.input(node.name, node.descriptor(batchSize))
              : operands[node.name] = node.build(builder, operands, batchSize);
            
            if (node.type === 'output') {
                this.computeLoss(builder, builderOutput, node, gradients, operands, validCount, batchSize);
            }
        }
        
        // Reverse iteration for back propagation
        const context = { builder, batchSize, operands, gradients };
        for (let i = executionList.length; i > 0; --i) {
            const node = executionList[i-1];
            node.backprop(context);
        }
        
        // Apply Refined Lyon optimiser to compute updates
        // Loop through this.model.dag.params here and apply Lyon logic
        // using the gradients[paramName] populated by the reverse loop
        
        // Iterate over all trainable parameters in the model
        for (const paramName in this.model.dag.params) {
            const param = this.model.dag.params[paramName]; // param Node
            const dataType = param.dataType();
            const shape = param.shape();

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
            const { nextWeight, nextMomentum } = this.applyRefinedLyon(
                builder, 
                currentWeight, 
                gradient, 
                currentMomentum,
                dataType,
                hyperParams
            );

            // Add them to the graph's output dictionary
            builderOutput[`${paramName}`] = nextWeight;
            builderOutput[`${momentumName}`] = nextMomentum;
        }
        
        graph = await builder.build(builderOutput);
        return this.cacheGraph(graph, 'training', batchSize);
    }
    
    /**
     * Applies the Refined Lyon optimizer mathematically.
     * @param {MLGraphBuilder} builder 
     * @param {MLOperand} weight - The current weight/bias tensor
     * @param {MLOperand} gradient - The gradient for this weight/bias
     * @param {MLOperand} momentum - The current momentum buffer
     * @param {Object} hyperParams - lr, beta1, weightDecay
     * @param {string} dataType - weight's actual datatype
     * @returns {Object} { nextWeight, nextMomentum }
     */
    applyRefinedLyon(builder, weight, gradient, momentum, dataType, hyperParams) {
        const { lr = 0.001, beta1 = 0.9, weightDecay = 0.01 } = hyperParams;

        // Create scalars for the math
        const beta1Op = builder.constant(dataType, beta1);
        const oneMinusBeta1Op = builder.constant(dataType, 1 - beta1);
        const lrOp = builder.constant(dataType, lr);
        const wdOp = builder.constant(dataType, weightDecay);

        // 1. Update Momentum: m_next = beta1 * m + (1 - beta1) * grad
        const term1 = builder.mul(beta1Op, momentum);
        const term2 = builder.mul(oneMinusBeta1Op, gradient);
        const nextMomentum = builder.add(term1, term2);

        // 2. Compute Update Direction: sign(m_next) * sign(grad)
        const signM = builder.sign(nextMomentum);
        const signGrad = builder.sign(gradient);
        const lyonUpdate = signM;
        //const lyonUpdate = builder.mul(signM, signGrad);

        // 3. Apply Weight Decay: update + (weightDecay * weight)
        const decayTerm = builder.mul(wdOp, weight);
        const finalUpdate = builder.add(lyonUpdate, decayTerm);

        // 4. Update Weights: w_next = weight - (lr * finalUpdate)
        const step = builder.mul(lrOp, finalUpdate);
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
        
        const DataType = NNModel.ML_TYPE_MAP(input.dataType());
        
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
            const DataType = NNModel.ML_TYPE_MAP(input.dataType());
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
    
    serialize () {
        const opName = this.opName;
        const args = this.args;
        const options = this.options;
        let opts = '';
        
        function serializeOptions (options) {
            let text = '', i = 1, length = options.size;
            for (const [key, value] of options) {
                if (value !== undefined && Array.isArray(value))
                    text += `${key}=[${value}]${i++ < length ? ', ' : ''}`;
                else
                    text += `${key}=${value}${i++ < length ? ', ' : ''}`;
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
        const regex = /^(?:(?<dtype>\w+)\s+)?shape\s*=\s*\[(?<shape>[\d,\s]+)\]$/;
        const match = inputString.trim().match(regex);

        if (!match)
            throw new Error(`Failed to parse tensor: ${inputString}`);

        const { dtype, _, shape } = match.groups;
        this.dataType = dtype;
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
        this.applyShapeInference();
        this.applyInitHeuristics();
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
    
    // Rule of thumb to set initialisation info for weights and
    // bias based upon the associated activation operation.
    // Will need tweaking for different kinds of dense layers!
    applyInitHeuristics () {
        function fan (shape) {
            return shape.length ? shape[shape.length - 1] : 1;
        }
        
        function applyHeuristics(dag, node) {
            const  addNode = node.inputs[0];
            if (addNode) {
                const matmulNode = addNode.inputs[0];
                const biasNode = addNode.inputs[1];
                if (matmulNode && biasNode &&
                    matmulNode.type === 'matmul' &&
                    biasNode.type === 'constant') {
                    const weightsNode = matmulNode.inputs[1];
                    if (weightsNode && weightsNode.type === 'constant') {
                        const outputShape = matmulNode.attributes.shape;
                        const inputShape = matmulNode.inputs[0].attributes.shape;
                        if (node.type === 'softmax') {
                            const r = Math.sqrt(6.0/(fan(inputShape) + fan(outputShape)));
                            weightsNode.attributes.init = 'glorot';
                            weightsNode.uniformDistribution(r);
                            biasNode.attributes.bias = 0.1;
                            biasNode.fill(biasNode.attributes.bias);
                            
                        } else if (node.type === 'relu') {
                            const r = Math.sqrt(6.0/fan(inputShape));
                            weightsNode.attributes.init = 'he';
                            weightsNode.uniformDistribution(r);
                            biasNode.attributes.bias = 0.0;
                            biasNode.fill(biasNode.attributes.bias);
                        }
                    }
                }
            }
        }
        
        for (const node of this.executionList) {
            if (node.type === 'softmax' || node.type === 'relu') {
                applyHeuristics(this, node);
            }
        }
    }

    // one iteration should be sufficient in most cases
    applyShapeInference(iterations = 2) {
        let queue = [];
        
        for (let i = 0; i < iterations; i++) {
        
            // Backward pass: Outputs -> Inputs
            queue.push([undefined, Object.values(this.outputs)]);
            
            while (queue.length > 0) {
                const [shape, nodes] = queue.pop();
                nodes.forEach(node => {
                    // each node input may have a different shape
                    // so this returns a list of [shape, nodes]
                    const inputs = node.reverseShapeInference(shape);
                    if (inputs && inputs.length > 0) queue.push(...inputs);
                });
            }
            
            // Forward pass: Inputs -> Outputs
            queue.push([undefined, Object.values(this.inputs)]);

            while (queue.length > 0) {
                const [shape, nodes] = queue.pop();
                
                if (nodes) {
                    nodes.forEach(node => {
                        // each node has only one output, which may
                        // be used as the input for multiple nodes
                        const dependents = this.nodeOutputs[node.name];
                        const shape2 = node.forwardShapeInference(shape);
                        if (dependents) queue.push([shape2, dependents])
                    });
                }
            }
        }
    }
    
    expandBlock(blockName, currentInput, macroOptions = new Map()) {
        const block = this.blocks.get(blockName);
        let lastNode = currentInput;
        const lastLayer = block.layers[block.layers.length - 1];

        for (const layer of block.layers) {
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
                const resNode = createNode('add', resName, [lastNode, skipNode], {});
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
                } else {
                    const uniqueParamName = this.symbols.gensym(argName);
                    const paramNode = createNode('constant', uniqueParamName, [], {});
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

    getExecutionOrder(outputs) {
        const nodes = Array.isArray(outputs) ? outputs : [outputs];
        const state = new Map();
        const sorted = [];

        const visit = (node) => {
            if (!node || state.get(node) === 2) return;
            if (state.get(node) === 1) throw new Error(`Cycle involving ${node.name}`);
            state.set(node, 1);
            node.inputs.forEach(visit);
            state.set(node, 2);
            sorted.push(node);
        };

        nodes.forEach(visit);
        return sorted;
    }

    serialize() {
        let lines = [];
        
        this.executionList.forEach(node => {
            lines.push(node.serialize());
        });
        
        return lines.join('\n');
    }
}

// class to compile WebNN graphs from instance of NNTopology
// you can use it for inference, testing and training graphs
class NNCompiler {
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
        this.broadcast = false;  // does operator support broadcast?
        this.preserveShape = true;  // does operator change the shape?
    }

    dataType () {
        return this.attributes.dataType ?? (this.inferredDataType ?? 'float32');
    }
    
    createBuffer (size) {
        const DataType = NNModel.ML_TYPE_MAP(this.dataType());
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
        
    warn(message) {
        log(message);
    }

    // propagate shape from an output to this node
    // this deals with nodes that don't change shape
    reverseShapeInference(shape) {
        if (this.type === 'relu')
            console.log('relu');
    
        const outShape = this.attributes.shape;
        
        if (!this.compatible(shape, outShape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);
            
        if (shape !== undefined && outShape === undefined)
            this.attributes.shape = [...shape];
        
        if (!this.preserveShape)
            shape = undefined;
        
        if (shape === undefined && outShape !== undefined)
            shape = outShape;
            
        if (this.type === 'matmul') {
            const s1 = this.inputs[0].attributes.shape;
            const s2 = this.inputs[1].attributes.shape;
            const s3 = this.attributes['shape'];
            
            if (s1 && s2) {
                return [
                    [s1, [this.inputs[0]]],
                    [s2, [this.inputs[1]]]
                ];
            }
        }
        
        return [[shape, this.inputs]];
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

    // Abstract methods to be implemented by subclasses

    // subclasses should override this default implementation
    // builder is instance of MLNNTopology
    // nodes is map: name -> MLOperand
    // args is list of MLOperands for operation's operands
    build(builder, operands, batchSize) { 
        const opname = this.operator ? this.operator : this.type;    
        return builder[opname](...this.args(operands), this.options());
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
            this.compatible(s1, shape) = shape;
            
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

        if (!this.compatible(s1, shape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);

        let outputShape;
        
        if (s2) {
            outputShape = s1.length >= s2.length 
                ? [...s1] : [...s2];
        } else {
            outputShape = [...s1];
        }
        
        if (!this.compatible(s2, outputShape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);
            
        return outputShape
    }
    
    tensorRank () {
        const shape = this.attributes.shape;
        
        if (!Array.isArray(shape))
            throw new Error("Shape must be an array.");

        return shape.length + 1;
    }
    
    accumulateGradient (context, input, newGrad) {
        const gradients = context.gradients;
        const name = input.name;
        
        if (gradients[name]) {
            gradients[name] = context.builder.add(gradients[name], newGrad);
        } else {
            gradients[name] = newGrad;
        }
    }
    
    // for operators that don't change the shape
    forwardShapeInference(shape) {
        this.warn(`forwardShapeInference: missing implementation for ${this.type}`);
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

        if (['input', 'constant'].includes(this.type))
            return `   ${this.type}(${attrs.join(', ')})`;
        
        const inputNames = this.inputs.map(i => i.name || i.type);
        const description = (inputNames.concat(attrs)).join(', ');
        return `   ${this.type}(${description})}`;
    }
}

// model input
class InputNode extends NNNode {
    descriptor (batchSize) {
        return {
            dataType: this.dataType(),
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
    
    forwardShapeInference (shape) {
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
            dataType: this.dataType(),
            shape: this.shape(batchSize),
            readable: true,
            writable: false,
        };
    }
    
    forwardShapeInference (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // assumes output gradient is already in gradients
        // copy gradient to the preceding operation node
        const gradients = context.gradients;
        const gradient = gradients[this.name];
        this.inputs.forEach(node => {gradients[node.name] = gradient});
    }
    
    build (builder, operands, batchSize) {
        const operand = this.inputs[0];
        return operands[operand.name];
    }
}

// model parameters, e.g. weights and biases
class ConstantNode extends NNNode {
    descriptor (batchSize) {
        return {
            dataType: this.dataType(),
            shape: this.shape(batchSize),
            readable: false,
            writable: true,
        };
    }
    
    randomize (min, max) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        const range = max - min;
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (Math.random() * range) + min;
        }
        
        return buffer;
    }

    uniformDistribution (r) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (Math.random() * 2 * r) - r;
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

    tensorRank () {
        const shape = this.attributes.shape;
        
        if (!Array.isArray(shape))
            throw new Error("Shape must be an array.");
            
        return shape.length;
    }

    forwardShapeInference (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // nothing to do here
    }
    
    build (builder, results, batchSize) {
        return builder.constant(this.descriptor(), this.buffer);
    }
}

// numeric literals
class NumberNode extends NNNode {
    randomize (min, max) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
        const range = max - min;
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (Math.random() * range) + min;
        }
        
        return buffer;
    }

    uniformDistribution (r) {
        const size = this.size(this.attributes.shape);
        const buffer = this.createBuffer(size);
    
        for (let i = 0; i < size; i++) {
            buffer[i] = (Math.random() * 2 * r) - r;
        }
        
        return buffer;       
    }

    shape (batchSize) {
        return [...this.attributes.shape];
    }

    tensorRank () {
        const shape = this.attributes.shape;
        
        if (!Array.isArray(shape))
            throw new Error("Shape must be an array.");
            
        return shape.length;
    }

    forwardShapeInference (shape) {
        return this.keepShape(shape);
    }
    
    backprop (context) { 
        // nothing to do here
    }
    build (builder, results, batchSize) {
        return builder.constant(this.dataType(), this.name);
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

    forwardShapeInference(shape) {
        const s1 = this.inputs[0].attributes.shape;
        const s2 = this.inputs[1].attributes.shape;
        const s3 = this.attributes['shape'];
        
        if (!this.compatible(s1, shape))
            this.warn(`### operation ${this.name} has an inconsistent shape`);
    
        if (s1 && s2 && s3 && (s2[0] !== s1[0] || s2[1] !== s3[0]))
            this.warn(`operation ${this.name} has an inconsistent shape`);
    
        if (s1 !== undefined && s2 === undefined && s3 !== undefined)
            this.inputs[1].attributes.shape = [s1[0], s3[0]];
        
        return s3;
    }
    
    backprop(context) {
        const builder = context.builder;
        const operands = context.operands;
        const gradients = context.gradients;
        const gradient = gradients[this.name];  // gradient of layer's output
        
        const dY = gradients[this.name];
        if (!dY) return;

        const a = this.inputs[0];
        const b = this.inputs[1];
        
        const A = operands[a.name];
        const B = operands[b.name];
     
        // Helper to generate a permutation array that swaps only the last two dimensions
        // e.g., for 3D tensor [0, 1, 2] -> [0, 2, 1]
        const getTransposePermutation = (rank) => {
            const perm = Array.from({ length: rank }, (_, i) => i);
            if (rank >= 2) {
                [perm[rank - 2], perm[rank - 1]] = [perm[rank - 1], perm[rank - 2]];
            }
            return perm;
        };

        const transposedB = builder.transpose(B, { 
            permutation: getTransposePermutation(b.tensorRank()) 
        });
        const transposedA = builder.transpose(A, { 
            permutation: getTransposePermutation(a.tensorRank()) 
        });

        // dA = dY * B^T
        const dA = builder.matmul(dY, transposedB);
        // dB = A^T * dY
        const dB = builder.matmul(transposedA, dY);

        this.accumulateGradient(context, a, dA);
        this.accumulateGradient(context, b, dB);
        gradients[a.name] = dA;
        gradients[b.name] = dB;  
    }

    build(builder, operands, batchSize) {
        return builder.matmul(...this.args(operands));
    }
}

class AddNode extends NNNode {
    constructor (...args) {
        super (...args);
        this.broadcast = true;
    }
    
    forwardShapeInference (shape) {
        return this.simpleOpsShape(shape);
    }

    backprop(context) { 
        const builder = context.builder;
        const batchSize = context.batchSize;
        const gradients = context.gradients;
    
        // dY is the gradient of this layer's output
        const dY = gradients[this.name];
        if (!dY) return; // Dead branch or not required

        const a = this.inputs[0];
        const b = this.inputs[1];
    
        // The shape of dY matches the output shape of this AddNode
        const outputShape = this.shape(batchSize);

        // Reduce the incoming gradient to match the original shapes of inputs 'a' and 'b'
        // If no broadcasting happened, your broadcastReduce function safely returns dY
        const gradA = broadcastReduce(builder, dY, outputShape, a.shape(batchSize));
        const gradB = broadcastReduce(builder, dY, outputShape, b.shape(batchSize));

        // Safely accumulate the properly shaped gradients
        this.accumulateGradient(context, a, gradA);
        this.accumulateGradient(context, b, gradB);
    
        // Update the gradients dictionary for the next layers down
        gradients[a.name] = gradA;
        gradients[b.name] = gradB;
    }
    
    build(builder, operands, batchSize) {
        return builder.add(...this.args(operands));
    }
}

class PowNode extends NNNode {
    constructor (...args) {
        super (...args);
        this.broadcast = true;
    }
    
    forwardShapeInference (shape) {
        return this.simpleOpsShape(shape);
    }
    
    backprop (context) {
        const builder = context.builder;
        const operands = context.operands;
        const gradients = context.gradients;
        
        const dY = gradients[this.name];
        if (!dY) return;
        
        const a = this.inputs[0];
        const b = this.inputs[1];
    
        const A = operands[aName];
        const B = operands[bName];
    
        // We reuse the forward output A^B to save operations when computing dB
        const Y = operands[this.name]; 

        // --- 1. Compute Gradient for Base (A) ---
        // Create a scalar constant '1' of the appropriate type (assuming float32 here)
        const oneBuffer = new Float32Array([1]);
        const oneConstant = builder.constant({type: 'float32', shape: []}, oneBuffer);

        // B - 1
        const B_minus_1 = builder.sub(B, oneConstant);
        // A^(B - 1)
        const A_pow_B_minus_1 = builder.pow(A, B_minus_1);
        // B * A^(B - 1)
        const B_mul_A_pow = builder.mul(B, A_pow_B_minus_1);
        // dA = dY * (B * A^(B - 1))
        const dA = builder.mul(dY, B_mul_A_pow);

        this.accumulateGradient(gradients, aName, dA);

        // --- 2. Compute Gradient for Exponent (B) ---
        // WebNN's `log` operator computes the natural logarithm (base e)
        const lnA = builder.log(A);
        // ln(A) * Y
        const lnA_mul_Y = builder.mul(lnA, Y);
        // dB = dY * (ln(A) * Y)
        const dB = builder.mul(dY, lnA_mul_Y);

        this.accumulateGradient(context, b, dB);
        
        // Handle broadcasting: if shapes differ, reduce sum the gradient across broadcasted dims
        gradients[a.name] = broadcastReduce(builder, dA, dA.shape(batchSize), a.shape(batchSize));
        gradients[a.name] = broadcastReduce(builder, dB, dB.shape(batchSize), b.shape(batchSize));
    }

    build(builder, operands, batchSize) {
        return builder.pow(...this.args(operands));
    }
}

class ReluNode extends NNNode {
    shape(batchSize) { return this.inputs[0].shape(batchSize); }
    
    build(builder, operands, batchSize)
    {
        return builder.relu(...this.args(operands));
    }

    forwardShapeInference (shape) {
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
        const dataType = this.dataType();
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
    
    // Softmax does not change the shape of the tensor
    // so rely on parent's implementation for shape()

    forwardShapeInference (shape) {
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
    
    build (builder, operands, batchSize) {
        const shape = this.shape(batchSize);
        const axis = shape.length - 1;
        return builder[this.type](...this.args(operands), axis, this.options);
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
}

const NODE_CLASSES = {
    'input': InputNode,
    'output': OutputNode,
    'constant': ConstantNode,
    'number': NumberNode,
    'matmul': MatMulNode,
    'add': AddNode,
    'pow': PowNode,
    'relu': ReluNode,
    'softmax': SoftmaxNode,
    // ... add all other operators here
};

/**
 * Creates a new instance of a subclass of NNNode based upon the type.
 * @param {string} node type
 * @param {string} name - uniquely identifies the node in the graph
 * @param {[NNNode]} inputs - the nodes acting as inputs to this node
 * @param {Map} attributes - map of name to number or string for operator options
 */
 
function createNode(type, name, inputs, attributes={}) {
    const NodeClass = NODE_CLASSES[type] || NNode; // Fallback to base
    const node = new NodeClass(name, type, inputs, attributes);
    node.type = type;
    node.attributes['name'] = name;
    return node;
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
