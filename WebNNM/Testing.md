# Testing Strategy

WebNN supports a large suite of operators. The WebNNM library includes DAG nodes classes specific to each operator, with support for back propagation, shape and type inference.  We are working on a web page that functions as a test harness using a script that iteratively checks each operator using small WebNN graphs to compute the output of applying the operator, and to compute the gradient:

* Generic checks on shape and type inference, using meta-data from the [WebNN specification](https://www.w3.org/TR/webnn/).
* Operator specific test code for the operator's edge cases using appropriate test data.
* Generic test on the implementation of analytic gradients in the node's `backprop` method.

WebNN operators have one or more operands, and zero or more options. In most cases, each operand is a tensor, and dispatching the WebNN graph applies the operator to the operands, placing the result in the output tensor.

For an operator like `add`, the first operand $x$ is the output from the previous layer. The second operand $b$ is the bias vector. The result is $y = x + b$. If $b$ is a smaller tensor than $x$, it will be automatically broadcasted to the same shape as $x$. The gradient for the bias is the sum of the upstream gradients across all broadcasted dimensions:

$$\frac{\partial L}{\partial b} = \sum_{\text{broadcasted axes}} \frac{\partial L}{\partial y}$$

To test the library's implementation of `backprop` we need to measure the gradient for a small change to each parameter value. For this first try after adding $\epsilon$ and then try after subtracting $\epsilon$, looping over the parameter's tensor size, where $\epsilon$ is a small number e.g. 0.0001.

The `matmul` operator is similar to `add`, except its second operand is the weights matrix $w$. This requires a feature shape like `[2]` or `[3]`. We should arrange for the weights to have a shape like `[2,3]`, which protects against symmetry blindness.

We can then generalise the  code to build the graph for a generic operator given its operands and options, using random initialisation for the operands. The rest of the code remains the same.  We then need to utilise WebNNM to extend the graph to also compute and output the analytic gradient for comparison with the measured gradient for each element in the model parameter.

Some WebNN operators, e.g. `softmax` have only one operand. The test metadata thus needs to specify the number of operands and their shapes as well as any options to apply. Additional attributes include whether the operator preserves the shape of its first operand, and whether it supports broadcasting for its second operand.  We also need the shape of the output so we can test the `resolveForward` and `resolveBackward` methods.

