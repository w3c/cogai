# WebNNM for Browser AI
Existing neural network frameworks, e.g. TensorFlow and ONNX, are huge and hard to use. WebNNM is a lightweight easy to understand framework that dramatically simplifies working with neural networks.

WebNNM uses a simple model format together with a small open source JavaScript library (`webnnm.js`) for use with WebNN, W3C's platform neutral web browser neural network API with backends for NPUs, GPUs and CPUs. Automated inference is used to determine the shapes of trainable parameters from layer inputs, outputs and non-trainable parameters. The `webnnm.js` library compiles models into inference, testing and training graphs. The complementary `dataset.js` module provides a parent class for dataset specific classes and can be used for training and testing models against your chosen dataset. This lends itself to privacy friendly federated learning where the user data never leaves the browser. 

Running neural network models in the browser is well suited to small to medium sized models, such as those used for image classification, and real-time processing of audio and video. Large language models with many billions of parameters will still need to be run in the cloud. WebNN uses `int32` for tensor dimensions and limits the maximum tensor size (in bytes) to 2,147,483,647, equivalent to 1 billion `float16` numbers. For scalable extended reality applications this points to a distributed approach combining the edge and cloud to maximum advantage.

As an introduction, please take a look at the following demos:
* Inference with dense layers
* Inference with numeric literals
* Testing against a small dataset
* Training against a small dataset

A detailed specification for the `webnnm.js` library is in preparation and will be linked from here.

## Developer Notes
`webnnm.js` is a work in progress. We are extending the library to cover all of the WebNN operators as well as a few others, e.g. to handle skip connections, transformers, and newer operators such as `squaremax`. The library is object-oriented with `NNModel` as the top level class. Models are parsed into instances of `NNBlock`, `NNLayer` and `NNTensor`. These are in turn mapped into a directed acyclic graph of nodes using the `NNTopology` and `NNNode` classes.  The latter is the parent class for operator specific subclasses that support shape inference and transpiling into executable WebNN graphs under control of the `NNEngine` class. The `NNContext` class provides the context for running models in inference mode.

Support for saving and loading binary files with the model and parameters is in development and will be integrated shortly. We also expect to develop supplementary libraries for importing models in other formats, e.g. ONNX. These libraries will be usable with NodeJS as well as with web pages. One challenge is the potential for decompiling lower level models, such as those using ONNX, to higher level easier to understand models expressed in WebNNM.

Further out, we hope to apply WebNNM to multimodal models for video and audio as a basis for acccessible virtual worlds, where the phone or laptop's camera and microphone are used to capture the user's facial expressions and project them onto the user's avatar, along with speech to text support for intent-based accessibility, since everyone should be able to choose how they interact with applications according to their personal preferences and capabilities. Other work is planned on moving beyond back propagation to support continual learning and short term memory, inspired by human cognition. If you would like to help with this, please get in touch!
