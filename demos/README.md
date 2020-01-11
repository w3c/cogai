# Demonstrators

This page documents plans for developing a sequence of demonstrators that focus on different technical challenges, and together highlight the potential for Cognitive AI. 

## Counting

* https://www.w3.org/Data/demos/chunks/counting/

This demo is borrowed from a tutorial for the popular Cognitive Science architecture [ACT-R](http://act-r.psy.cmu.edu/). The demo serves as an introduction to chunks and rules.

It generates a sequence of digits by counting up from an start value and ends with a finish value. This is done using three rules. One to commence the counting task, a second rule to advance to the next digit, and a third rule to terminate the task after reaching the target value. The demo recalls chunks from the facts module that give the successor digit, e.g. 5 comes after 4.

An extended version of this demo could be developed to count beyond 9 with further rules and facts that support tens, hundreds and thousands etc.

## Simple Decision Trees

* https://www.w3.org/Data/demos/chunks/decision-tree/

This demo is borrowed from an old tutorial for ID3, and decides whether the weather is suitable for playing a game of golf. The weather conditions are randomly generated. The demo just uses the rules module with a decision tree implemented as a succession of rules. A future demo will cover machine learning of decision trees from examples.

## Autonomous Driving (under construction)

* https://www.w3.org/Data/demos/chunks/driving/

This demo simulates driving a car across a town. The map data was exported from Open Street Maps to an XML file, and converted into a file in the chunks format. The map is modelled as points with latitude and longitude, and paths as a sequence of points that denote a road or footpath. The A* algorithm is used to find a route between any two points.

Vision is modelled in terms of the position of the car in the lane and the change of direction of the road at a gaze point ahead of the car. Road signs and upcoming junctions trigger alerts. The cognitive agent controls the car in terms of braking or acceleration, signalling at junctions, and switching the steering mode  between lane following, and traversing a junction.  Steering and braking/accelerating are devolved to real-time control loops mimicking the cortico cerebellar circuit.
