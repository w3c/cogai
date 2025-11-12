# Neural Network Model (NNM) File Format

**Existing neural network frameworks, e.g. TensorFlow, are huge and hard to use.  We want to introduce a lightweight easy to understand framework that dramatically simplifies working with neural networks.** 

The aim is to devise a simple file format together with a small JavaScript library for use with [WebNN](https://www.w3.org/TR/webnn/), W3C's platform neutral web browser neural network API with backends for NPUs, GPUs and CPUs. Automated inference is used to determine the shapes of trainable parameters from layer inputs, outputs and non-trainable parameters.

A further consideration is to enable training models as WebNN is designed for inference not training.  Our solution is to transform a high level model into an inverse model designed to support training as an inference process.  This involves automatic differentiation for the operators provided by WebNN and computational graphs based upon them. NNM will define additional operators for user convenience for common operations, e.g. *residual* which mixes in the block's input, and *dense* which multiplies the input by a tensor, adds a bias, and applies an activation function.

------

Some useful terms:

**Model:** The complete network architecture, including its layers and learned weights, designed to perform a specific task (e.g., classification).

**Model Layout:** The specific arrangement or structure of layers (e.g., sequential, parallel, residual) within a neural network model, defining the flow of data.

**Layer**: A module or processing unit within the model that performs a specific transformation on its input data. Layers can be divided into sublayers, as a means to modularise the network architecture.

**Non-sequential Layers**: e.g. *residual networks* with skip connections, *inception networks* that apply in parallel several different types of convolutions with a max-pooling operation, *U-Net* with encoder-decoder networks as used for image segmentation, *dense networks* which connect *every layer to every other layer* in a feed-forward fashion.

**Tensor:** A multi-dimensional array used to represent data (input, output, weights) in a neural network.

**Tensor Layout**: how the tensor's data is arranged in memory, *layout* refers to the specific *ordering of the axes (dimensions)* of the tensor. This dictates how the multi-dimensional data is linearized (flattened) for storage in the computer's one-dimensional memory space.

**Shape:** The dimensions of a tensor, specifying the size of each axis, e.g. [3, 224, 224] for an image.

**Operators**: mathematical operations applied to the *operands* to compute the output, and subject to operator specific *options*.

**Non-trainable parameters**: static parameters that are given explicitly in the model and not subject to training.

**Hyperparameters:** Configuration settings (e.g. learning rate, number of layers) that are set **before** training and remain constant.

------

It would be too challenging to address all requirements at once, so it is preferable to work on simple networks to start with, and incrementally add greater flexibility only when we have more experience and the need for such capabilities.

The file format needs to support several requirements:

* Tensor datatypes and shapes for inputs, outputs and intermediate results
* Literal parameters that fixed in place in the model
* Using type/shape inference to minimise what's required, defaulting to float32
* Automatic support for mapping vectors of size N to a shape [N, 1] for use of WebNN operators like Matmul.
* A predefined set of operators taken from WebNN
* Defining the computational graph in sufficient detail for running WebNN
* Likewise for the means to support back propagation of gradients for training
* Simple notation with good abstractions in terms of operations, blocks and layers
* Training is often done using batches for greater efficiency
* The means to load training data and model parameters efficiently from binary files, knowing the endianess, alignment and padding requirements

Layers often involve multiple operations, e.g. matrix multiplication, addition, and activation function. We thus need a way to name a layer and provide named parameters for its instantiation. The layer is itself defined in terms of a computational graph with input, output, operations and parameters, e.g. the input and output shapes.

Transformers are relatively complex and may be considered in terms of sub-layers rather than direct mapping to the operator graph. This suggests the value of a means to define a layer in terms of other layers rather than an operator graph.

* One syntactic choice is whether to use brackets or names for scopes, i.e. `name:` as a prefix. We take the latter approach below.

* If each layer specifies the shape of its output, we only need to define the shape of the first layer's input, as the rest can be inferred, e.g. the layer input shape is the same as the output from the previous layer.
* Having inferred the input and output shape for each operation, we can deduce the shape of model parameters, e.g. the width, height of a matrix used in a dense layer is [outputSize, inputSize], assuming a batch size of 1.
* Given the batch size we can infer the shape for the input and output for training purposes. Does the batch size alters the shape of the model parameters? We assume a batch size of 1 for the initial work and will add support for explicit batch sizes in following work.

#### Application to a perceptron with single hidden layer

We can refine the ideas using a perceptron with an input layer and an output layer. The input layer performs a linear transformation on the input and then applies a non-linear activation function like ReLU. The linear transformation involves a matrix multiplication followed by the addition of a bias vector.

The output layer applies a further linear transformation followed by an activation, e.g., **`sigmoid`** for binary classification, **`softmax`** for multi-class classification, or no activation for regression.

Before worrying about the syntax, it seems better to consider the object model, e.g. using classes: `NNModel`, `NNBlock`, `NNLayer` and `NNTensor`. These have the following properties:

* **NNModel**: layers, data, batch size, ...
  the neural network model and its hyperparameters
* **NNBlock**: name, params, layers
  prototype for a named sequence of NNLayer objects
* **NNLayer**: name, arguments, inputs, output 
  instantiation of NNBlock or a built-in operator
* **NNTensor**: name?, datatype, shape, value, input, outputs
  a tensor used for input, output or intermediate result

WebNN expects tensors to have attributes: *usage* ('read' or 'write'), *readable* (bool), *writable* (bool). These are not used for WebNN constants. The attributes are easy to set for tensors serving as inputs or outputs to the model as a whole.  Model parameters are treated as inputs.  For recurrent networks, we need to treat hidden state as input and output.  The network is unrolled for a given number of time steps, and the hidden state carried over between successive invocations of the time window.

Tensors for intermediate results don't need to be named.  When defining a WebNN graph using JavaScript, each operation is a defined by method call on the `builder` object. Its return value is a tensor that can be used as an argument for another operator. The `NNOperator` object has properties for the operator's output and inputs (aka its *arguments*). These are also useful for `NNTensor` for the `NNOperator` objects that use it as an input or output, as this makes it easier to traverse the graph.

`NNLayer` needs to determine's the graph's input, output and model parameters. As a directed acyclic graph, the inputs and outputs can be readily determined from scanning the operations. A simplifying assumption is for each graph to have a single input and output, where the other inputs are treated as model parameters. 

The model as a whole needs to be consistent in respect to the tensor shapes. This is requires propagating shapes as constraints from the input and output.  As an example, consider a matrix used in a dense layer to transform an input vector to an output vector. The number of columns must be the same as the number of elements in the output vector, whilst the number of rows must be the same as the number of elements in the input vector. This generalises to higher rank inputs and outputs, see the [WebNN definition](https://www.w3.org/TR/webnn/#api-mlgraphbuilder-matmul).

The shape of a layer's output must be implied by its parameters. The shape of the layer's input is the shape of the tensor output by the preceding layer. This supports the use of dense layers to define a narrow waist as basis for encouraging generalisations in the latent space. A layer method propagates the shape from the layer's input and output to check for inconsistencies, and to identify the shapes for model parameters. For this we need to be able to distinguish unknown shape information as part of a unification algorithm.

Note that such inference won't succeed in all cases. A `matmul` followed by another `matmul` introduces a free variable for the tensor shape for the intermedate result. The parser should detect this and warn the user.  A work around is to split the layer into two, so that the intermediate shape can be explicitly specified.

#### How to get going on this?

It makes sense to first develop a parser as a means to initialise the layer objects along with the computational graph. We can then develop some layer methods acting on the graph.

```
model:input shape=[784,1];
model:output shape=[10,1];
model:layers 
	dense(shape=[128], activation=relu),
	dense(shape=[10], activation=softmax);
dense:layers
	matmul(w),
	add(b),
	activation();
```

Here `name:layers` introduces a named sequence of layers, listed from start to finish. Each layer has a name and a set of parameters in brackets. These can be named, e.g. *activation* in `activation=relu`, or unnamed for operands in the order defined for the layer type. The *add* operation, for example, takes a single operand in addition to the input from the previous layer. In the above, `b` introduces a model parameter for a bias vector.

This syntax allows new layer types (e.g. *dense*)  to be defined as a sequence of  layers. Some parameters have predefined meanings, e.g. *shape* which refers to the shape of the tensor output by the sequence. Others are matched by name, thus *activation* acts as a macro, so that the operation is set when the layer is instantiated. Terms which are not predefined, nor set in the layer parameters, are interpreted as the name of model parameters, e.g. `w` and `b`  in the above example. We distinguish fixed parameters from trainable parameters.

Skip or residual connections, e.g. *residual* in the following example, mix in the named sequence's input. An optional parameter can be used to scale the input prior to it being added to the output of the preceding layer.

```
# residual block as a component in ResNet
resblock:layers
	conv2d(),
	batchNorm(),
	relu(),
	conv2d(),
	residual(), # add the block's input for a residual connection
	relu();
```

This example lacks the parameters needed for detailed control, e.g. for the 2D convolution operator. WebNN defines operands and options for each operator. The *conv2d* operator has 3 operands: input, filter and bias, plus several options: padding, strides, dilations, groups, inputLayout, and filterLayout. The layout options take named layouts, e.g. 'nchw' and 'ohwi'. Bias is a 1D tensor. Padding, strides and dilations are lists of numbers. The NNM library would need to know the WebNN operators, their operands and options, as well as their constraints on shapes.

The WebNN spec defines how to calculate the output shape from the input shape for `matmul`. However, we want to infer the shape of trainable parameters rather than being required to provide them explicitly. We need algorithms for propagating shape constraints from each layer's input and output, according to its non-trainable parameters.  We will have to devise these algorithms ourselves using the forward algorithm in the WebNN spec as a reference.  When taken together with the need for automatic differentiation algorithms, it could rapidly become rather daunting!   We should focus on developing these incrementally, gradually expanding the set of operators and their options.

Some models may require branching sequences of layers to process different data in parallel, or the same data in different ways. A way to describe this is to use operators that take operands for other layers, as a means to combine data output by different sequences of layers. This would further allow for models where the output of one sequence of layers is used to feed multiple follow on sequences.  When a layer is cited as an operand, this signifies a connection, in contrast to instantiating a named sequence serving as a prototype.

#### Next steps

1. implement model parser and serializer
2. see how far we can get with running simple examples on WebNN
3. add an algorithm to compute the shapes for trainable parameters
4. start to explore how to generate the training graph for simple examples
5. work on loading training and testing data

The 2 layer perceptron example above has `W` and `b` as parameters for each layer.  We could start by giving their shapes explicitly before working out how to infer them.
