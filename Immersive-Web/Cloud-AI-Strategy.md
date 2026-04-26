# Cloud-Based Pre-Training
The Immersive Web vision calls for edge-based AI to process video, audio and intents to animate 3D avatars in real time. The models will need to be pre-trained on large video datasets. This page gathers recommendations on the technical approaches needed to realise this.

The main idea is to extend WebNNM to generate training and testing graphs in the StableHLO/MLIR format as this allows cloud-native compilers like XLA and Neuron to perform aggressive, silicon-specific optimizations. Unlike traditional eager execution, which suffers from high host-to-device latency, StableHLO enables the compiler to fuse hundreds of operators into single, computationally dense kernels and inject collective communication primitives (like AllReduce) directly into the graph. This global visibility ensures that the cloud's massive bisection bandwidth and HBM (High Bandwidth Memory) are fully saturated, allowing the hardware to treat a distributed cluster of chips as one coherent, high-velocity math engine rather than a collection of disconnected processors.

Pre-training can be managed using a JavaScript application running under node.js with adaptors to compile and execute MLIR, manage the datasets and stream batches to the cluster of AI hardware. The generation of the MLIR files can be arranged via a library module that sits in place of the WebNN *builder* interface. This should enable sharding for efficient distribution across the cluster.

## 1. Core Architecture: The Universal IR Bridge

To support both Google Cloud (GCP) and AWS without maintaining separate CUDA/XLA/Neuron kernels, the library must adopt **StableHLO** (Stable High-Level Operations) as its primary output format.

- **The Path:** `WebNN Builder API` $\rightarrow$ `MLIR (StableHLO Dialect)` $\rightarrow$ `Cloud Runtime`.
- **Google Cloud Integration:** Use the **PJRT (Pluggable Just-in-Time)** runtime. PJRT consumes StableHLO directly and executes it on TPU 8t hardware.
- **AWS Integration:** Use the **Neuron SDK (v2.29+)**. Map the StableHLO graph into the AWS Neuron compiler (`neuron-cc`) to generate **NEFF** binaries for Trainium.

## 2. Distributed Sharding Strategy (GSPMD)

For massive datasets (video/image), a single chip's memory is insufficient. We will utilize the **MLIR `shard` dialect** to implement GSPMD (General Scalable Parallel Model Distribution).

### Sharding Dimensions

| **Data Type**   | **Dimension**    | **Sharding Logic**                               | **Hardware Collective** |
| --------------- | ---------------- | ------------------------------------------------ | ----------------------- |
| **Image**       | Spatial ($H, W$) | Divide 4K images into tiles across 4-8 chips.    | `Halo Exchange`         |
| **Video**       | Temporal ($T$)   | Shard frames across chips; use 3D-Conv overlaps. | `AllToAll`              |
| **Large Batch** | Batch ($B$)      | Standard Data Parallelism for pretraining.       | `AllReduce`             |

### Implementation in MLIR

The generator must inject sharding attributes into the entry-point tensors:

MLIR

```
// Example: Sharding a Video Batch [B, T, H, W, C] across an 8-chip mesh
mhlo.sharding = "{devices=[8,1,1,1,1]0,1,2,3,4,5,6,7}"
```

## 3. High-Throughput Buffering Strategy

To "feed the beast" (TPU 8t / Trainium 3), we must transition from a 2-bank Ping-Pong model to a **Circular $N$-Bank Pipeline ($N \ge 4$)**.

### Key Requirements

1. **Node.js Orchestration:** Use `worker_threads` for parallel data decoding (e.g., FFmpeg for video).
2. **Memory Management:** Use `SharedArrayBuffer` to store tensors. The C++ Addon should use **Zero-Copy DMA** to map these buffers directly into the device's address space.
3. **The "Pre-fetcher" Loop:**
   - **Bank 0-1:** Currently executing on the NPU/TPU.
   - **Bank 2:** Data being uploaded via PCIe/ICI.
   - **Bank 3:** Being populated by Node.js `worker_threads` from the dataset.

## 4. MLIR Generation: Guided Requirements

To generate efficient training and testing graphs, the library's "Cloud-Mapper" needs the following metadata from the WebNN high-level calls:

- **Device Mesh Topology:** The logical grid of chips (e.g., $1 \times 8$ or $2 \times 4 \times 2$). This guides the `grid_axes` attributes in the MLIR.
- **Optimizer State Mapping:** MLIR needs to know which tensors are "Stateful" (Weights/Moments) vs. "Transient" (Activations) to optimize HBM (High Bandwidth Memory) allocation.
- **In-Place Operation Hints:** Explicitly flag operations like `ReLU` or `Dropout` that can be fused "in-place" to save memory bandwidth.
- **Precision Policy:** Define the "Mixed Precision" strategy. High-end cloud chips prefer **BFloat16** or **FP8** for training; MLIR should reflect these casts to maximize FLOPS.

## 5. Summary of Platform Optimizations

### Google Cloud (TPU 8t)

- **Scalability:** Target the **9,600-chip Superpod** topology.
- **Feature:** Use the **ICI (Inter-Chip Interconnect)** for low-latency weight synchronization.

### Amazon Web Services (Trainium 3)

- **Scalability:** Leverage **EFA (Elastic Fabric Adapter)** for multi-node training.
- **Feature:** Use **NKI (Neuron Kernel Interface)** hints in MLIR for custom fused kernels (e.g., FlashAttention-3) if the standard StableHLO lowering is suboptimal.

### Recommendation

Proceed with building a **C++ Node.js Native Addon** that links against `libpjrt` (for Google) and `libnrt` (for AWS). Focus the development on an **MLIR Emitter** that handles **GSPMD attributes** automatically based on the user's batch size and hardware count.

To effectively bridge the WebNN library to the cloud, the Node.js C++ addon must act as a Thin Orchestrator. Its primary job is to keep the CPU out of the way of the hardware.

The structure below uses N-API (via node-addon-api) and targets PJRT (the industry-standard C API for XLA) and the Neuron Runtime (for AWS).

Conceptual C++ Header: CloudBridge.h
This header defines the interface between the JavaScript WebNN logic and the cloud hardware runtimes.

```C++
#include <napi.h>
#include <vector>
#include <memory>
#include <string>

// Forward declarations for Cloud AI Runtimes
struct PJRT_Api;
struct nrt_context; // AWS Neuron Runtime context

/**
 * @brief CloudBridge: A Node.js wrap for high-performance AI accelerators.
 * Handles MLIR compilation, sharding, and N-bank asynchronous buffering.
 */
class CloudBridge : public Napi::ObjectWrap<CloudBridge> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    CloudBridge(const Napi::CallbackInfo& info);

    // --- Core API ---
    
    /**
     * @brief Compiles a StableHLO MLIR string for the target cloud device.
     * Includes sharding metadata provided by the JS generator.
     */
    Napi::Value Compile(const Napi::CallbackInfo& info);

    /**
     * @brief Executes a compiled graph.
     * Uses the "N-bank" circular buffer index for zero-copy execution.
     */
    Napi::Value ExecuteAsync(const Napi::CallbackInfo& info);

    /**
     * @brief Maps a Node.js SharedArrayBuffer to Device HBM.
     */
    Napi::Value RegisterBuffer(const Napi::CallbackInfo& info);

private:
    // --- Hardware Orchestration ---
    enum class Backend { GOOGLE_TPU, AWS_TRAINIUM };
    Backend active_backend_;

    // Google PJRT Handles
    const PJRT_Api* pjrt_api_ = nullptr;
    void* pjrt_client_ = nullptr;

    // AWS Neuron Handles
    nrt_context* nrt_ctx_ = nullptr;

    // --- N-Bank Management ---
    struct DeviceBank {
        void* device_ptr;      // Hardware address
        size_t size;
        bool is_busy;          // Fence/Semaphore for async sync
    };
    
    // Banks are organized per input/output tensor
    std::vector<std::vector<DeviceBank>> tensor_banks_;
    uint32_t current_bank_idx_ = 0;
    uint32_t total_banks_ = 4; // Default N=4 for cloud

    // --- Internal Methods ---
    void InitializePJRT();
    void InitializeNeuron();
    void ApplySharding(const std::string& mlir_text, const Napi::Object& sharding_meta);
};
```
## Implementation Strategies for the Bridge

### 1. The MLIR "Sharding Injector"

When the JS library generates the MLIR, it doesn't always know the specific physical hardware layout. The `Compile` method in this bridge should take a JSON object from Node.js (e.g., `{ batch_shards: 8, spatial_mesh: [2, 2] }`) and use the **MLIR C-API** to programmatically add the `mhlo.sharding` attributes to the StableHLO module before passing it to the compiler.

### 2. Handling the "N-Bank" in C++

To implement the $N$-bank strategy, the C++ code should maintain a queue of **Fences** (Synchronization primitives).

- **ExecuteAsync:** This should return a `Napi::Promise`.
- **The Worker Thread:** The C++ addon should spawn a non-blocking background thread (using `napi_create_async_work`). This thread waits for the hardware signal (e.g., a TPU interrupt) and then resolves the JS Promise.
- **Buffer Locking:** While `bank[i]` is being used by the TPU, the C++ bridge must throw an error if Node.js tries to write to it, ensuring data integrity.

### 3. Shared Memory (Zero-Copy)

For the best performance on AWS and Google:

- **GCP (PJRT):** Use `PjRtClient::CreateViewOfBuffer`. This allows the TPU to treat a slice of the Node.js process memory as a hardware buffer, bypassing the `memcpy` entirely.
- **AWS (Neuron):** Use `nrt_mem_map`. This maps a user-space pointer directly to the NeuronCore's DMA engine.

### 4. Comparison of Backend Hooks

| **Feature**      | **Google Cloud (PJRT)** | **AWS (Neuron)**     |
| ---------------- | ----------------------- | -------------------- |
| **Header**       | `pjrt_c_api.h`          | `nrt_user.h`         |
| **Primary Call** | `PJRT_Client_Compile`   | `nrt_load_model`     |
| **Buffer Type**  | `PjRtBuffer`            | `nrt_buffer_t`       |
| **Interconnect** | ICI (Inter-Chip)        | EFA (Elastic Fabric) |

To effectively bridge the WebNN library to the cloud, the Node.js C++ addon must act as a **Thin Orchestrator**. Its primary job is to keep the CPU out of the way of the hardware.

The structure below uses **N-API** (via `node-addon-api`) and targets **PJRT** (the industry-standard C API for XLA) and the **Neuron Runtime** (for AWS).

------

## Conceptual C++ Header: `CloudBridge.h`

This header defines the interface between the JavaScript WebNN logic and the cloud hardware runtimes.

C++

```
#include <napi.h>
#include <vector>
#include <memory>
#include <string>

// Forward declarations for Cloud AI Runtimes
struct PJRT_Api;
struct nrt_context; // AWS Neuron Runtime context

/**
 * @brief CloudBridge: A Node.js wrap for high-performance AI accelerators.
 * Handles MLIR compilation, sharding, and N-bank asynchronous buffering.
 */
class CloudBridge : public Napi::ObjectWrap<CloudBridge> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    CloudBridge(const Napi::CallbackInfo& info);

    // --- Core API ---
    
    /**
     * @brief Compiles a StableHLO MLIR string for the target cloud device.
     * Includes sharding metadata provided by the JS generator.
     */
    Napi::Value Compile(const Napi::CallbackInfo& info);

    /**
     * @brief Executes a compiled graph.
     * Uses the "N-bank" circular buffer index for zero-copy execution.
     */
    Napi::Value ExecuteAsync(const Napi::CallbackInfo& info);

    /**
     * @brief Maps a Node.js SharedArrayBuffer to Device HBM.
     */
    Napi::Value RegisterBuffer(const Napi::CallbackInfo& info);

private:
    // --- Hardware Orchestration ---
    enum class Backend { GOOGLE_TPU, AWS_TRAINIUM };
    Backend active_backend_;

    // Google PJRT Handles
    const PJRT_Api* pjrt_api_ = nullptr;
    void* pjrt_client_ = nullptr;

    // AWS Neuron Handles
    nrt_context* nrt_ctx_ = nullptr;

    // --- N-Bank Management ---
    struct DeviceBank {
        void* device_ptr;      // Hardware address
        size_t size;
        bool is_busy;          // Fence/Semaphore for async sync
    };
    
    // Banks are organized per input/output tensor
    std::vector<std::vector<DeviceBank>> tensor_banks_;
    uint32_t current_bank_idx_ = 0;
    uint32_t total_banks_ = 4; // Default N=4 for cloud

    // --- Internal Methods ---
    void InitializePJRT();
    void InitializeNeuron();
    void ApplySharding(const std::string& mlir_text, const Napi::Object& sharding_meta);
};
```

------

## Implementation Strategies for the Bridge

### 1. The MLIR "Sharding Injector"

When the JS library generates the MLIR, it doesn't always know the specific physical hardware layout. The `Compile` method in this bridge should take a JSON object from Node.js (e.g., `{ batch_shards: 8, spatial_mesh: [2, 2] }`) and use the **MLIR C-API** to programmatically add the `mhlo.sharding` attributes to the StableHLO module before passing it to the compiler.

### 2. Handling the "N-Bank" in C++

To implement the $N$-bank strategy, the C++ code should maintain a queue of **Fences** (Synchronization primitives).

- **ExecuteAsync:** This should return a `Napi::Promise`.
- **The Worker Thread:** The C++ addon should spawn a non-blocking background thread (using `napi_create_async_work`). This thread waits for the hardware signal (e.g., a TPU interrupt) and then resolves the JS Promise.
- **Buffer Locking:** While `bank[i]` is being used by the TPU, the C++ bridge must throw an error if Node.js tries to write to it, ensuring data integrity.

### 3. Shared Memory (Zero-Copy)

For the best performance on AWS and Google:

- **GCP (PJRT):** Use `PjRtClient::CreateViewOfBuffer`. This allows the TPU to treat a slice of the Node.js process memory as a hardware buffer, bypassing the `memcpy` entirely.
- **AWS (Neuron):** Use `nrt_mem_map`. This maps a user-space pointer directly to the NeuronCore's DMA engine.

### 4. Comparison of Backend Hooks

| **Feature**      | **Google Cloud (PJRT)** | **AWS (Neuron)**     |
| ---------------- | ----------------------- | -------------------- |
| **Header**       | `pjrt_c_api.h`          | `nrt_user.h`         |
| **Primary Call** | `PJRT_Client_Compile`   | `nrt_load_model`     |
| **Buffer Type**  | `PjRtBuffer`            | `nrt_buffer_t`       |
| **Interconnect** | ICI (Inter-Chip)        | EFA (Elastic Fabric) |

------

## Final Recommendation on MLIR Generation

To guide the generation of the MLIR for **pretraining**, ensure the JS generator includes:

1. **Gradient Accumulation Loops:** If the batch is extremely large, don't shard it physically across 1,000 chips; instead, generate MLIR that performs 4 "micro-batch" steps and 1 "all-reduce" sync. This is significantly more memory-efficient.
2. **XLA Fusing Hints:** Use the `fusable` attribute in the MLIR operations. This tells the cloud compiler that the `WebNN.matmul` + `WebNN.add` + `WebNN.relu` should be collapsed into a single high-speed fused kernel on the TPU/Trainium.
