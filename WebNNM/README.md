# WebNNM for Browser AI
Existing neural network frameworks, e.g. TensorFlow and ONNX, are huge and hard to use. WebNNM is a lightweight easy to understand high-level framework that dramatically simplifies working with neural networks.

WebNNM uses a simple model format together with a small open source JavaScript library (`webnnm.js`) for use with WebNN, W3C's platform-neutral neural network API for web browsers, with backends for NPUs, GPUs and CPUs. The library compiles models into inference, testing and training graphs. Automated inference is used to determine the shapes of trainable parameters from layer inputs, outputs and non-trainable parameters. The complementary `dataset.js` module provides a parent class for dataset specific classes, and can be used for training and testing models against your chosen dataset. This lends itself to privacy friendly federated learning where the user data never leaves the browser. 

Running neural network models in the browser is well suited to small to medium sized models, such as those used for image classification, and real-time processing of audio and video. Large language models with many billions of parameters will still need to be run in the cloud. WebNN uses `int32` for tensor dimensions and likewise limits the maximum tensor size (in bytes) to 2,147,483,647, equivalent to 1 billion `float16` numbers. For scalable extended reality applications this points to a distributed approach combining the edge and cloud to maximum advantage.

As an introduction, please take a look at the following demos:
* [Inference with dense layers](https://www.w3.org/2026/webnnm/examples/test1.html)
* [Inference with repeated layers](https://www.w3.org/2026/webnnm/examples/test1.1.html)
* [Inference with numeric literals](https://www.w3.org/2026/webnnm/examples/test2.html)
* [Testing against a small dataset](https://www.w3.org/2026/webnnm/examples/test3.html)
* [Training against a small dataset](https://www.w3.org/2026/webnnm/examples/test4.html)

A detailed specification for the `webnnm.js` library is in preparation and will be linked from here.

## Developer Notes
`webnnm.js` is a work in progress. We are extending the library to cover all of the WebNN operators as well as a few others, e.g. to handle skip connections, transformers, and newer operators such as `squaremax` and `softsign`. The library is object-oriented with `NNModel` as the top level class. Models are parsed into instances of `NNBlock`, `NNLayer` and `NNTensor`. These are in turn mapped into a directed acyclic graph (DAG) of nodes using the `NNTopology` and `NNNode` classes.  The latter is the parent class for operator specific subclasses that support tensor data type and shape inference, including automatic casting. `NNTopology` sorts the DAG nodes into execution order, pruning nodes that aren't on a path from an input, parameter or literal to a model output. The `NNEngine` class transpiles the DAG into executable WebNN graphs. The `NNContext` class provides the context for running models in inference mode.

For inference, model parameters are baked into the graph as constants, reducing the time to prepare the next batch. During training a ping/pong approach is used for the parameters and their momentum to keep the tensors in the NPU or GPU, only reading the updated parameters after the final epoch. By default, the implementation uses a variant of the [Refined Lion optimiser](https://www.nature.com/articles/s41598-025-07112-4) which offers faster convergence using less memory than [AdamW](https://optimization.cbe.cornell.edu/index.php?title=AdamW). Our implementation uses the softsign function $f(x) = x / (1 + |x|)$ in place of *arctan*, which isn't supported by WebNN. Softsign is continuous and differentiable everywhere, is faster to compute, and like *arctan*, smooths out the discrete steps of the original Lion optimizer. You can also choose other optimizers: [Stochastic Gradient Descent with Momentum](https://arxiv.org/abs/2602.23444) (SGDM), [Nesterov Accelerated Gradient](https://hengshuaiyao.github.io/papers/nesterov83.pdf) (NAG) and [EvoLved Sign Momentum](https://arxiv.org/abs/2310.05898) (Lion).

<p align="center">
  <img src="../images/update-functions.png" width="80%" alt="comparison of sign, arctan and softsign activation functions">
</p>

The starting point for training models is to pick the initial values for the trainable parameters. This is done using stochastic algorithms selected according to the local activation function. Unfortunately, this may still result in a high initial loss that stubbornly refuses to train nicely. To try and avoid that, the library generates multiple sets of initial parameter values using different random number seeds, and applies metrics to select the most promising set for the training loop. Metrics are computed using a dedicated scouting graph. The metrics include: *Loss*, *Gradient Ratio*, and *Dead Ratio*. The gradient ratio detects vanishing or exploding gradients, whilst the dead ratio detects dead neurons or overconfident layers.

| Metric | What it Measures | What "Good" Looks Like |
|--------|------------------|----------------------------|
| Loss | The immediate error between prediction and ground truth.|"A value consistent with random guessing (e.g., ln(10)≈2.3 for 10-class softmax)."|
|Delta Loss|The change in loss (ΔL) given a change in weights (ΔW).|"Low enough to avoid ""explosions,"" but high enough to show the model is learning."|
|Gradient Ratio|The ratio of gradient magnitudes between the first and last layers.|Close to 1 (indicates signals are flowing through the network without dying).|
|Dead Ratio | The percentage of neurons (usually ReLU) that output 0 for all inputs.|As close to 0% as possible at start.|

The library now keeps track of the sum of the weighted losses to decide when to take a snapshot of the model parameters during training. The iteration over epochs is abandoned when no improvement has been found within a given number of epochs, as set by the `patience` hyper parameter. The weights for each output is set by the `lossWeights` hyper parameter. This allows you to treat some outputs as more important than others in a multimodal model.

The best learning rate schedule depends on the optimizer algorithm. To keep things simple, the library currently implements a warm up phase followed by cosine annealing where the default initial learning rate depends on the optimizer. The only time Slab Decay is a clear winner for SGDM is when you have a very noisy dataset or a model that is prone to sudden instability. Because the LR stays constant on a "slab," the weights have time to stabilize and reach a true equilibrium at that specific "temperature" before moving to the next stage.

|Feature|Lion / Refined Lion|SGDM|Nesterov|
|-------|-------------------|----|--------|
|Typical Max LR|0.0001 (Tiny)|0.1 (Large)|0.1 to 0.5 (Very Large)|
|LR Sensitivity|High (Easy to break)|Medium|Low (Very stable)|
|Best Schedule|Cosine + Warmup|Step / Slab Decay|Cosine Annealing|
|Snapshot Timing|Wait for low LR tail|Anytime val_loss drops|Anytime val_loss drops|
|WebNN Logic|Update lr tensor every epoch|Update lr tensor at "Steps"|Update lr tensor every epoch|

Support for saving and loading binary files with the model and parameters is in development and will be integrated shortly. We also expect to develop supplementary libraries for importing models in other formats, e.g. ONNX and Hugging Face. These libraries will be usable with NodeJS as well as with web pages. One challenge is the potential for decompiling lower level models, such as those using ONNX, to higher level easier to understand models expressed in WebNNM. We also plan work on exporting models to the MLIR format for training models on powerful AI hardware in the cloud in conjunction with the XLA compiler, see the <a href="https://openxla.org">OpenXLA project</a>.

Further out, we hope to apply WebNNM to multimodal models for video and audio as a basis for acccessible virtual worlds, where the phone or laptop's camera and microphone are used to capture the user's facial expressions and project them onto the user's avatar, along with speech to text support for intent-based accessibility, since everyone should be able to choose how they interact with applications according to their personal preferences and capabilities. One person may be happy with a games controller, whilst others may prefer to use their voice to convey higher level intents. Other work is planned on moving beyond back propagation to support continual learning and short term memory, inspired by human cognition.

Back propagation is like trying to learn many complex skills all at the same time, which slows training. We hope to exploit research on speeding up training, especially for small to medium sized models. This includes mixture of experts, curriculum training, progressively growing the network, elastic weight consolidation, lightweight adapters, and experience replay, along with techniques such as layer-wise prediction (*aka* predictive coding) and hebbian training. If you would like to help with this, please get in touch!

## Different Kinds of Neural Networks

Neural networks can be taxonomized in terms of the tasks they are designed to perform.

**Classification Tasks**: These models map their inputs to predefined labels, usually as a probability distribution across the classes. Some models may assign multiple labels, e.g. describing as image as both "cat" and "garden".

**Localization and Spatial Tasks**: These models are often used in computer vision, e.g. _object detection_ to place bounding boxes around each of the faces in a crowd, _semantic segmentation_ to label each pixel in an image, e.g. grass, road, car, sign, building, sky etc., and _instance segmentation_ to distinguish between individual objects of a given type, e.g. Sheep1, Sheep2, Dog1, etc.

**Generative and Sequential Tasks**: These models can use prompts to generate text, images and music etc. Sequence to sequence models are often used to translate from say English to French. The models can involve autoregressive generation for sequences, along with transformers and diffusion algorithms that progressively turn noise into images.

**Predictive and Regression Tasks**: These models output continuous numerical values, e.g. estimating the market value of a house, and various forms of time-series forecasting, as well as estimating counts, e.g. the number of people in a crowd.

**Structural and Embedding Tasks**: These models transform data into a more useful form, e.g. autoencoders that compress data whilst keeping the important parts, and embeddings, e.g. turning words and images into vectors, so that similar things are close together in digital space, something useful for recommendation systems.

**Scene Understanding Tasks**: These models describe, e.g. images or video, either in terms of nodes and labelled arcs between them, or with natural language when given language priors. Related techniques include message passing with graph neural networks, and relational transformers that allow objects to attend to every other object.

**Model Predictive Control Tasks**: These can be used to compute how to fulfill a given intent and execute it, optionally using sensory feedback to adjust the trajectory for driving actuators. The models can be trained using deep reinforcement learning, and may use *world models* to  mentally practice the motion before putting it into practice, like a cat that pauses whilst assessing the risk before making a big jump.

## Different Kinds of Neural Memory

Artificial neural  networks have a variety of different memory mechanisms. Here are just a few of them: The model parameters (weights and biases) are an intrinsic form of memory that are set when the model is trained. Recurrrent neural networks (e.g. LSTM and GRU) have gated memories that allows the network to decide what information to keep and what to discard on each cycle.

Attention based memory uses Transformers to attend to anything in the context window. Retrieval augmented generation searches external sources and pulls relevant information into the context window. The relevance may be determined using vector-based similarity to the query, where each entry in the database is stored with a vector index as a form of embedding.

Associative memories function as a cache with saliency values that are boosted when a memory is selected, and otherwise decay over time. The stronger the salience, the more likely a particular memory will be retrieved compared to others. For language models, associative memory allow the model to keep track of salient information over an extended time period without the need for a long (and expensive) context window. For new memories, their salience can be initialised based upon how surprising they are as determined by a measure of the difference between predicted and actual values.

Another class of memory is based upon manifolds, which can be thought of as locally flat curved surfaces in high dimensional spaces. Instead of the idea of memory as a static address, memory can be modelled as dips and valleys in the surface. The classic version of manifold memory is the continuous attractor neural network (CANN). Recent research has shown the value of updating model weights on fast and slow timescales to better handle noise and drift. One way to implement manifold memory is as an unrolled recurrent network.

## Some Useful Terms:

**Model:** The complete network architecture, including its layers and learned parameters, designed to perform a specific task, e.g., classification.

**Model Layout:** The specific arrangement or structure of layers (e.g., sequential, parallel, residual) within a neural network model, defining the flow of data.

**Layer**: A module or processing unit within the model that performs a specific transformation on its input data. Layers can be divided into sublayers, as a means to modularise the network architecture.

**Repeated Layers**: If you declare the shape option as a list of shapes, e.g. `dense(shapes=[[128],[80],[40]], activation=relu)`, the layer will be repeated with the given shapes. In the example, you get the first dense layer with shape [128], the second with shape [80] and the third with shape [40]. This is especially useful for compound layers.

**Non-sequential Layers**: e.g. *residual networks* with skip connections, *inception networks* that apply in parallel several different types of convolutions with a max-pooling operation, and *U-Net* with encoder-decoder networks as used for image segmentation. Skip connections are essential for networks with many layers as a means to avoid vanishing gradients that inhibit training.

**Tensor:** A multi-dimensional array used to represent data (input, output, parameters) in a neural network. The array items are associated with a data type. WebNN supports the following datatypes: float32, float16, int32, uint32, int8, uint8, int4, and uint4. Training typically benefits from higher precision (like float32) to maintain numerical stability during millions of tiny weight updates, whereas inference can often be "quantized" to lower precision (like int8 or float16) to maximize speed and reduce memory usage without significantly hurting accuracy.

**Type Casting**: WebNNM automatically inserts cast operations when needed to map tensors from a lower to a higher precision data type, e.g. `float16` to `float32`, and warns when the model tries to cast to a lower precision.

**Tensor Layout**: This determines how the tensor's data is arranged in memory, *layout* refers to the specific *ordering of the axes (dimensions)* of the tensor. This dictates how the multi-dimensional data is linearized (flattened) for storage in the computer's one-dimensional memory space.

**Shape:** The dimensions of a tensor, specifying the size of each axis, e.g. [3, 224, 224] for an image. Input tensor shapes typically start with the batch size, then the sequence length (temporal models), followed by the features. For images, features include channels (e.g. RGB colours), height and width. *NCHW* places channels before positional information (generally best for modern GPUs), whilst *NHWC* does the reverse.

**Reshaping**: This is the process of changing the dimensions of a tensor without altering its underlying data or the total number of elements, essentially "reinterpreting" how the data is laid out in memory. It is used to flatten data, for batch prepararation and dimension alignment.

**Operators**: These are mathematical operations applied to the *operands* to compute the output, and subject to operator specific *options*.

**Broadcasting**: This allows operations between tensors of different shapes by virtually "stretching" the smaller tensor to match the dimensions of the larger one without actually copying the data in memory. WebNN supports automatic broadcasting for selected operators, e.g. `add`.

**Inference**: WebNNM propagates data type and shape constraints across the model, so that you only need to specify these explicitly when you want greater control. Note that you do need to specify the data type and shape for the model inputs and outputs.

**Layer normalization**: This is a technique that improves training performance by standardizing the activations of a single layer for each individual sample by calculating the mean and variance across all its features, ensuring that the inputs to the next layer remain within a stable numerical range.

**Max pooling**: This is a downsampling operation that slides a window over an input (like an image) and selects only the maximum value within that window to represent the entire area.

**Non-trainable parameters**: These are static parameters that are given explicitly in the model and not subject to training.

**Hyperparameters:** Configuration settings (e.g. learning rate, number of layers) that are set **before** training and remain constant.

**Transfer Learning**: This is a technique that adapts a model trained for one task for use in a related task. This reduces the training effort compared with training a model for the second task from scratch. This approach essentially freezes the model parameters for lower layers whilst applying gradient descent to update the parameters for the other layers.

**Autoregressive Learning**: This a machine learning technique where a model learns to predict the next piece of data in a sequence based specifically on the pieces that came before it. This avoids the need for labelled data. A related approach is *autoencoding* where the model looks at the whole sequence at once (bidirectional) and fills in blanks in the middle, making it better for sentiment analysis or classification.

**Gradient Descent**: This is an iterative optimization algorithm that calculates the "slope" of the error and adjusts the model's parameters in the opposite direction to find the lowest possible point of the loss function.  Successful training depends on avoiding vanishing or exploding gradients. This can be mitigated through a variety of techniques, e.g. skip connections, layer normalization, adjustment to the learning rate and the choice of tensor initialisation algorithms, e.g. Glorot or He, as appropriate to the activation function. WebNNM uses context-sensitive heuristics for initialising model parameters.

**Momentum**: This is an enhancement to gradient descent that accumulates a moving average of past gradients to help the optimizer accelerate through flat regions and dampen oscillations in steep, narrow valleys.

**Graphs**: These are composed of nodes and arcs. Artificial neural networks form directed acyclic graphs where arcs are tensors, and the nodes are operators, inputs, outputs, trainable parameters, or literals, e.g. explicit numbers. An *inference graph* computes the outputs from the inputs. A *testing graph* computes a measure of the loss, e.g. the difference between the predicted and expected outputs. A *training graph* computes updates to trainable parameters and their momentum. The graph has three stages: the first computes the output from each layer and the overall loss, the second computes the gradients, i.e. partial derivative of the loss with respect to each parameter. The third and final part applies the optimizer algorithm to compute updates to trainable parameters and their momentum.

**Datasets**: These are used for training models are typically split into three subsets: training, validation and testing.  The training subset is used for training. The validation subset is used to tune settings and monitor performance during training, and may be omitted for smaller datasets. The testing subset provides a final, unbiased evaluation of the finished model.

**Epoch**: This represents one full pass of the entire training dataset through the neural network, used to give the model multiple opportunities to learn patterns and minimize error across all available data. Gradient descent usually requires many epochs to converge.

**Overfitting**: This occurs when a model memorizes noise and specific details of the training data rather than learning general patterns, making a separate testing subset essential to objectively measure how well the model performs on new, unseen information.

**Batches**: These are used to divide a dataset into smaller groups to make the training process more memory-efficient and to provide more frequent, stable updates to the model's weights via gradient descent. The WebNNM model syntax omits the batch size, which is given by the inference context for inference, and by the dataset for testing and training.

**Sequence**: This a structured ordering of data points, such as words in a sentence or daily stock prices, used to help a model capture temporal dependencies and context, where the meaning of an element depends on what came before it. The WebNNM model syntax omits the sequence length, which is given by the inference context for inference, and by the dataset for testing and training. Note that for multimodal models, each modality will have its own sequence length, e.g. one for audio and another for video. 


