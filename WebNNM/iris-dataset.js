import {AbstractDataset} from "./datasets.js";

export class Dataset extends AbstractDataset {
    // Private properties for data storage
    #features; // list of all samples
    #labels;   // list of labels for all samples
    #featureSize;
    #labelSize;
    #labelNames;    // label to index
    #labelIndices;  // index to label
    
   constructor(data, config) {
        super(config);
        this.#initialize(data);
    }

    // optional config properties:
    //   batchSize: positive integer, default is 20
    //   shuffleOnEpoch: true or false, default is true
    static async create(url, config = {}) {
        async function get(url) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load document: ${response.statusText}`);
            }
            return response.text();
        }
        
        config.url = url;
        
        if (config.batchSize === undefined)
            config.batchSize = 20;
        
        const data = await get(url);
        return new Dataset(data, config);
    }
    
    name () {
        return "IRIS";
    }
    
    #initialize(csvText) {
        const dataset = this;
        function view (cols, rows, limit=10) {
            const parts = dataset.config('url').split('/');
            const fileName  = parts[parts.length-1];
            log(`\nloaded ${fileName}\n {${cols}}`)
            log(`  first few lines:`)
            for (let i = 0; i < limit; ++i) {
                if (i >= rows.length)
                    break;
            
                log('    ' + JSON.stringify(rows[i]));
            }
            log('    ...');
        }
        
        function preprocess(csvText) {
            const lines = csvText.split(/\r\n|\n/);
            const data = [];

            lines.forEach(line => {
                if (line.trim() !== "") {
                    const fields = line.split(',');
                    const row = [];
                    fields.forEach(field => {
                        const trimmed = field.trim();
                        const value = Number(trimmed);
                        row.push(isNaN(value) ? trimmed : value);
                    });
                    data.push(row);
                }
            });

            const cols = data[0];
            const rows = data.slice(1, data.length-1);
        
            view(cols, rows); // log first few lines
        
            return {cols, rows};
        }

        // 1. preprocess the raw CSV data
        
        // Each row has 4 numeric features and 1 species name
        // cols is list of column names from 1st line
        // rows is list of subsequent roles in CSV file
        // there are 150 samples ...
        const {cols, rows} = preprocess(csvText);
        
        // 2. Perform the split logic
        
        const trainingSize = Math.ceil(0.7 * rows.length);  
        const testingSize = rows.length - trainingSize;
        const features = new Array(rows.length);
        const labels = new Array(rows.length);
        const names = new Array(rows.length);
        const FEATURE_SIZE = dataset.#featureSize = cols.length - 1;
        
        for (let i = 0; i < rows.length; ++i) {
            const values = new Float32Array(FEATURE_SIZE);
            
            for (let j = 0; j < FEATURE_SIZE; ++j) {
                values[j] = rows[i][j];
            }
            
            features[i] = values;
            names[i] = rows[i][FEATURE_SIZE];
        }
        
        // determine set of labels, removing duplicates
        const uniqueLabelNames = [...new Set(names)];
        uniqueLabelNames.sort(); // alphabetical sort
        const LABEL_SIZE = dataset.#labelSize = uniqueLabelNames.length;

        // create the label -> index Map
        dataset.#labelNames = {};
        dataset.#labelIndices = new Array(LABEL_SIZE);
        uniqueLabelNames.forEach((name, index) => {
            dataset.#labelNames[name] = index;
            dataset.#labelIndices[index] = name;
        });
        
        for (let i = 0; i < rows.length; ++i) {
            const vector = new Float32Array(LABEL_SIZE); // zeroed by default
            const label = rows[i][FEATURE_SIZE];
            vector[dataset.#labelNames[label]] = 1.0;
            labels[i] = vector;
        }
        
        dataset.#features = features;
        dataset.#labels = labels;
        
        const trainingIndices = new Array(trainingSize);
        
        for (let i = 0; i < trainingSize; ++i) {
            trainingIndices[i] = i;
        }
        
        dataset.indices()[this.subsetRole.TRAINING] = trainingIndices;
        
        const testingIndices = new Array(testingSize);

        for (let i = 0; i < testingSize; ++i) {
            testingIndices[i] = i + trainingSize;
        }
        
        dataset.indices()[this.subsetRole.TESTING] = testingIndices;
        
        log(`dataset has ${dataset.#features.length} samples: ` +
            `allocate ${trainingIndices.length} samples for training, ` +
            `and ${testingIndices.length} for testing`);
    }

    // Implementation for retrieving a sample from the loaded buffers
    getSample(index) {
        // Implementation for AbstractDataset's protected method
        // Logic to extract the specific image (28x28=784 bytes) and the one-hot label (10 bytes)
        // from the main feature/label buffers using ArrayBuffer.slice().
        
        // Placeholder return to avoid error
        return { features: new ArrayBuffer(0), labels: new ArrayBuffer(0) };
    }
    
    // Implementation for assembling a batch, note use of Float32 for data
    assembleBatch(batchSize, batchIndices, model) {
        // Implementation for AbstractDataset's protected method
        // Concrete logic to fetch and format data into the batch structure
        // Fixed batch size, missing samples in the last batch are zeroed
        const FEATURE_SIZE = this.#featureSize;
        const LABEL_SIZE = this.#labelSize;
        let features = new Float32Array(batchSize * FEATURE_SIZE).fill(0);
        let labels = new Float32Array(batchSize * LABEL_SIZE).fill(0);
        
        for (let i = 0; i < batchIndices.length; ++i) {
            const index = batchIndices[i];
            features.set(this.#features[index], i * FEATURE_SIZE);
            labels.set(this.#labels[index], i * LABEL_SIZE);
        }
        
        const name = model.datasetToModel('model'); // map to name used by application's model

        return {
            batchSize: batchSize,
            validCount: batchIndices.length,
            inputs: {
                [name]: {
                    data: features,
                    shape: [batchSize, FEATURE_SIZE]
                }
            },
            outputs: {
                [name]: {
                    data: labels,
                    shape: [batchSize, LABEL_SIZE]
                }
            }
        };
    }

    // Map label to one-hot vector using labels on concrete class
    oneHotVector (label) {
        const vector = new Float32Array(this.#labelSize); // zeroed by default
        vector[this.#labelNames[label]] = 1.0;
        return vector;
    }

    // Map model output to list of names and percentages
    mapOutputToLabels(probabilities) {
        const results = probabilities.map((prob, index) => ({
            name: dataset.#labelIndices[index],
            percentage: (100 * prob).toFixed(3),
        }));
        results.sort((a, b) => b.percentage - a.percentage);
        return results;
    }

}
