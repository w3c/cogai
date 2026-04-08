# Testing Strategy

WebNN supports a large suite of operators. The WebNNM library includes DAG nodes classes specific to each operator, with support for back propagation, shape and type inference.  We are working on a web page that functions as a test harness using a script that iteratively checks each operator using small WebNN graphs to compute the output of applying the operator, and to compute the gradient:

* Generic checks on shape and type inference, using meta-data from the [WebNN specification](https://www.w3.org/TR/webnn/).
* Operator specific test code for the operator's edge cases using appropriate test data.
* Generic test on the implementation of analytic gradients in the node's `backprop` method.

WebNN operators have one or more operands, and zero or more options. In most cases, each operand is a tensor, and dispatching the WebNN graph applies the operator to the operands, placing the result in the output tensor.

For an operator like `add`, the first operand $x$ is the output from the previous layer. The second operand $b$ is the bias vector. The result is $y = x + b$. If $b$ is a smaller tensor than $x$, it will be automatically broadcasted to the same shape as $x$. The gradient for the bias is the sum of the upstream gradients across all broadcasted dimensions:

$$\frac{\partial L}{\partial b} = \sum_{\text{broadcasted axes}} \frac{\partial L}{\partial y}$$

We can test the WebNNM `AddNode` implementation by randomly initialising $x$ and $b$, and using $x-\epsilon$ for the first sample $x+\epsilon$ for the second, where $\epsilon$ is small. The test graph computes the output $y$ and the analytic gradient $g$ from $x$ and $b$. The results can be used to measure the actual gradient for comparison with the gradient computed using the WebNN sub-graph provided by `AddNode.backprop`.

```
async function computeAddGradientWithBatching() {
    // 1. Initialize WebNN context and builder
    const context = await navigator.ml.createContext();
    const builder = new MLGraphBuilder(context);

    // 2. Define shapes and parameters
    const batchSize = 2;
    const featureSize = 1; // Keeping it to 1 feature for simplicity
    const epsilon = 1e-4;

    const xShape = [batchSize, featureSize];
    const bShape = [featureSize]; // Will be broadcasted

    // 3. Build the graph: y = x + b
    const xOperand = builder.input('x', { dataType: 'float32', shape: xShape });
    const bOperand = builder.input('b', { dataType: 'float32', shape: bShape });
    const yOperand = builder.add(xOperand, bOperand);

    const graph = await builder.build({ y: yOperand });

    // 4. Prepare the test data
    const xBase = 5.0; // The value of x we are evaluating the gradient at
    const bValue = 2.0;

    // Batch 0: x + epsilon
    // Batch 1: x - epsilon
    const xData = new Float32Array([
        xBase + epsilon, 
        xBase - epsilon  
    ]);
    const bData = new Float32Array([bValue]);
    const yData = new Float32Array(batchSize * featureSize);

    // 5. Create tensors and dispatch
    const xTensor = await context.createTensor({ dataType: 'float32', shape: xShape, writable: true });
    const bTensor = await context.createTensor({ dataType: 'float32', shape: bShape, writable: true });
    const yTensor = await context.createTensor({ dataType: 'float32', shape: xShape, readable: true });

    context.writeTensor(xTensor, xData);
    context.writeTensor(bTensor, bData);

    await context.dispatch(graph, { 'x': xTensor, 'b': bTensor }, { 'y': yTensor });

    // 6. Read back the results
    await context.readTensor(yTensor, yData);

    // 7. Calculate Output and Gradients
    const yPlus = yData[0];
    const yMinus = yData[1];

    // The actual output at xBase is the average of the perturbed outputs
    // (or you could just compute it analytically as xBase + bValue)
    const output = (yPlus + yMinus) / 2;

    // Finite difference gradient approximation: (f(x+h) - f(x-h)) / 2h
    const gradX = (yPlus - yMinus) / (2 * epsilon);

    console.log(`Base Input (x): ${xBase}`);
    console.log(`Bias (b): ${bValue}`);
    console.log(`Outputs: [y_plus: ${yPlus.toFixed(5)}, y_minus: ${yMinus.toFixed(5)}]`);
    console.log(`Calculated Output (y): ${output.toFixed(5)}`);
    console.log(`Measured Gradient (dy/dx): ${gradX.toFixed(5)}`); 
    
    // For the add operator, the analytical gradient is 1.0
    // So gradX should be extremely close to 1.0
}

computeAddGradientWithBatching();
```

The `matmul` operator is similar, except its second operand is the weights matrix $w$. We can therefore generalise the above code to build the graph for a generic operator given its operands and options, using random initialisation for the operands. The rest of the code remains the same.  We then need to utilise WebNNM to extend the graph to also compute and output the analytic gradient for comparison with the measured gradient.

