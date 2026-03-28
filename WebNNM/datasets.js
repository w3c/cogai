/**
 * Data Management Module for Supervised Learning
 */
 
 
// --- Base Class (AbstractDataset) ---

export class AbstractDataset {
    // Private class fields using the '#' prefix for internal/protected state
    #config;
    #indices;
    #currentBatchIndex = 0;

    constructor(config) {
        // Apply default value for shuffleOnEpoch and merge with provided config
        this.#config = { shuffleOnEpoch: true, ...config };
        
        // Initialize the indices structure using the SubsetRole constants
        const role = this.subsetRole;
        this.#indices = {
            [role.TRAINING]: [],
            [role.VALIDATION]: [],
            [role.TESTING]: [],
            [role.FULL]: [],
        };
                
        // child construct should call initialize() after super()
    }
    
    /** return dataset name (must be implemented by subclass). */
    name() {
        throw new Error('Method name() must be implemented by the subclass.');
    }

    // defines const property for category of dataset subset

    get subsetRole () {
        return {
            TRAINING: 'training',
            VALIDATION: 'validation',
            TESTING: 'testing',
            FULL: 'full', // For datasets that are not split
        };
    }
    
    config (name) {
        return this.#config[name];
    }
    
    indices () {
        return this.#indices;
    }
    
    // --- Abstract Methods (Enforced via error) ---

    // Loads data, populates indices, and applies pre-processing
    // and filling lists of indices for training, validation, etc.
    async initialize() {
        // Enforce implementation in subclasses
        throw new Error('Abstract method initialize() must be implemented by the subclass.');
    }

    // Retrieves the raw data and labels for a specific index or range of indices
    getSample(index) {
        // Enforce implementation in subclasses
        throw new Error('Private method #getSample(index) must be implemented by the subclass.');
    }

    // Returns text view of tensor data in the buffer
    view(buffer, limit = 11) {
        const data = buffer instanceof Float32Array ? buffer : new Float32Array(buffer);
        const preview = Array.from(data.slice(0, limit));
        const formatted = preview.map(n => n.toFixed(3));
        return `[${formatted.join(', ')}${data.length > limit ? ', ...' : ''}]`;
    }

    // Maps a probability tensor output to human-readable results
    mapOutputToLabels(probabilities) {
        // Enforce implementation in subclasses
        throw new Error('Abstract method mapOutputToLabels(probabilities) must be implemented by the subclass.');
    }
    
    // --- Concrete Utility Methods ---
    
    subsetSize(subset) {
        return this.#indices[subset].length;
    }
    
    // Updates the batch size used for iterator methods.
    // Resets the current batch index to 0.
    setBatchSize(size) {
        if (typeof size !== 'number' || size <= 0) {
            throw new Error('Batch size must be a positive integer.');
        }
        this.#config.batchSize = Math.floor(size);
        this.#currentBatchIndex = 0;
    }

    // Fixed batch size with missing samples zeroed in last batch
    // You can set this in the options passed to the constructor
    getBatchSize () {
        return this.#config.batchSize;
    }
    
    // Determines the number of batches in a given split.
    getNumBatches(subset) {
        const totalSamples = this.#indices[subset].length;
        return Math.ceil(totalSamples / this.#config.batchSize);
    }

    // Call before each epoch to prepare for first batch
    prepareBatches(subset = this.subsetRole.TRAINING) {
        // Shuffle training subset if shuffleOnEpoch is enabled in the config
        if (this.#config.shuffleOnEpoch && subset === this.subsetRole.TRAINING) {
            
            const indices = this.#indices[subset];
            let count = indices.length;
            let temp;
            let indexToSwap;

            // While there remain elements to shuffle...
            while (count > 0) {
                // Pick a remaining element uniformly at random
                indexToSwap = Math.floor(Math.random() * count);
                count--;

                // And swap it with the current element (indices[count])
                temp = indices[count];
                indices[count] = indices[indexToSwap];
                indices[indexToSwap] = temp;
            }
        }
        
        // Reset the batch index regardless of whether a shuffle occurred
        this.#currentBatchIndex = 0;
    }
    
    /** Internal method to assemble the batch from indices (must be implemented by subclass). */
    assembleBatch(batchSize, batchIndices, model) {
        throw new Error('Private method #assembleBatch must be implemented by the subclass.');
    }

    // --- Iterator Methods ---

    // Primary interface for getting the next batch of data
    // before each epoc, call this.initBatches(subset) to prepare for 1st batch
    // map is a function that maps names to those used by application's model
    getNextBatch(subset = this.subsetRole.TRAINING, model) {
        const numBatches = this.getNumBatches(subset);
        const batchSize = this.#config.batchSize;
        if (this.#currentBatchIndex >= numBatches) {
            return null; // End of epoch
        }

        const startIdx = this.#currentBatchIndex * batchSize;
        const endIdx = Math.min(
            startIdx + batchSize,
            this.#indices[subset].length,
        );
        const batchIndices = this.#indices[subset].slice(startIdx, endIdx);

        // Call internal private method to assemble the batch
        const batch = this.assembleBatch(batchSize, batchIndices, model);
        this.#currentBatchIndex++;
        return batch;
    }
}
