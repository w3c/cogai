# Testing Strategy

WebNN supports a large suite of operators. The WebNNM library includes DAG nodes classes specific to each operator, with support for back propagation, shape and type inference.  We are working on a web page that functions as a test harness using a script that iteratively checks each operator as follows:

* Generic checks on shape and type inference, using meta-data from the [WebNN specification](https://www.w3.org/TR/webnn/).
* Operator specific test code for the operator's edge cases using appropriate test data.
* Generic test on the implementation of analytic gradients in the node's `backprop` method.

The harness builds small WebNN graphs to support these tests to compute the output of applying the operator, and to compute the gradient.
