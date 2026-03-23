# WebNNM for Browser AI
Existing neural network frameworks, e.g. TensorFlow and ONNX, are huge and hard to use. WebNNM is a lightweight easy to understand framework that dramatically simplifies working with neural networks.

WebNNM uses a simple model format together with a small open source JavaScript library (`webnnm.js`) for use with WebNN, W3C's platform-neutral neural network API for web browsers, with backends for NPUs, GPUs and CPUs. The library compiles models into inference, testing and training graphs. Automated inference is used to determine the shapes of trainable parameters from layer inputs, outputs and non-trainable parameters. The complementary `dataset.js` module provides a parent class for dataset specific classes, and can be used for training and testing models against your chosen dataset. This lends itself to privacy friendly federated learning where the user data never leaves the browser. 

Running neural network models in the browser is well suited to small to medium sized models, such as those used for image classification, and real-time processing of audio and video. Large language models with many billions of parameters will still need to be run in the cloud. WebNN uses `int32` for tensor dimensions and likewise limits the maximum tensor size (in bytes) to 2,147,483,647, equivalent to 1 billion `float16` numbers. For scalable extended reality applications this points to a distributed approach combining the edge and cloud to maximum advantage.

As an introduction, please take a look at the following demos:
* [Inference with dense layers](https://www.w3.org/2026/webnnm/examples/test1.html)
* [Inference with numeric literals](https://www.w3.org/2026/webnnm/examples/test2.html)
* [Testing against a small dataset](https://www.w3.org/2026/webnnm/examples/test3.html)
* [Training against a small dataset](https://www.w3.org/2026/webnnm/examples/test4.html)

A detailed specification for the `webnnm.js` library is in preparation and will be linked from here.

## Developer Notes
`webnnm.js` is a work in progress. We are extending the library to cover all of the WebNN operators as well as a few others, e.g. to handle skip connections, transformers, and newer operators such as `squaremax`. The library is object-oriented with `NNModel` as the top level class. Models are parsed into instances of `NNBlock`, `NNLayer` and `NNTensor`. These are in turn mapped into a directed acyclic graph of nodes using the `NNTopology` and `NNNode` classes.  The latter is the parent class for operator specific subclasses that support shape inference and transpiling into executable WebNN graphs under control of the `NNEngine` class. `NNTopology` sorts the DAG nodes into execution order, pruning nodes that aren't on a path from an input, parameter or numeric literal to a model output. `NNContext` class provides the context for running models in inference mode.

For inference, model parameters are baked into the graph as constants, reducing the time to prepare the next batch. During training a ping/pong approach is used for the parameters and their momentum to keep the tensors in the NPU or GPU, only reading the updated parameters after the final epoch. The implementation uses the [Refined Lyon optimiser](https://www.nature.com/articles/s41598-025-07112-4) which offers faster convergence using less memory than [AdamW](https://optimization.cbe.cornell.edu/index.php?title=AdamW).  

Support for saving and loading binary files with the model and parameters is in development and will be integrated shortly. We also expect to develop supplementary libraries for importing models in other formats, e.g. ONNX and Hugging Face. These libraries will be usable with NodeJS as well as with web pages. One challenge is the potential for decompiling lower level models, such as those using ONNX, to higher level easier to understand models expressed in WebNNM.

Further out, we hope to apply WebNNM to multimodal models for video and audio as a basis for acccessible virtual worlds, where the phone or laptop's camera and microphone are used to capture the user's facial expressions and project them onto the user's avatar, along with speech to text support for intent-based accessibility, since everyone should be able to choose how they interact with applications according to their personal preferences and capabilities. One person may be happy with a games controller, whilst others may prefer to use their voice to convey higher level intents. Other work is planned on moving beyond back propagation to support continual learning and short term memory, inspired by human cognition.

Back propagation is like trying to learn complex skills all at the same time, which slows training. We hope to exploit research on speeding up training, especially for small to medium sized models. This includes mixture of experts, curriculum training, progressively growing the network, elastic weight consolidation, lightweight adapters, and experience replay, along with techniques such as layer-wise prediction (*aka* predictive coding) and hebbian training. If you would like to help with this, please get in touch!

## Some useful terms:

**Model:** The complete network architecture, including its layers and learned weights, designed to perform a specific task, e.g., classification.

**Model Layout:** The specific arrangement or structure of layers (e.g., sequential, parallel, residual) within a neural network model, defining the flow of data.

**Layer**: A module or processing unit within the model that performs a specific transformation on its input data. Layers can be divided into sublayers, as a means to modularise the network architecture.

**Non-sequential Layers**: e.g. *residual networks* with skip connections, *inception networks* that apply in parallel several different types of convolutions with a max-pooling operation, *U-Net* with encoder-decoder networks as used for image segmentation, *dense networks* which connect *every layer to every other layer* in a feed-forward fashion.

**Tensor:** A multi-dimensional array used to represent data (input, output, weights) in a neural network.

**Tensor Layout**: how the tensor's data is arranged in memory, *layout* refers to the specific *ordering of the axes (dimensions)* of the tensor. This dictates how the multi-dimensional data is linearized (flattened) for storage in the computer's one-dimensional memory space.

**Shape:** The dimensions of a tensor, specifying the size of each axis, e.g. [3, 224, 224] for an image.

**Operators**: mathematical operations applied to the *operands* to compute the output, and subject to operator specific *options*.

**Non-trainable parameters**: static parameters that are given explicitly in the model and not subject to training.

**Hyperparameters:** Configuration settings (e.g. learning rate, number of layers) that are set **before** training and remain constant.
