# Autonomous Driving (under construction)

* https://www.w3.org/Data/demos/chunks/driving/

This demo simulates driving a car across a town, as a task familiar to most of us. The map data was exported from Open Street Maps to an XML file, and converted into a file in the chunks format. The map is modelled as points with latitude and longitude, and paths as a sequence of points that denote a road or footpath. The A* algorithm is used to find a route between any two points.

Vision is modelled in terms of the position of the car in the lane and the change of direction of the road at a gaze point ahead of the car. Road signs and upcoming junctions trigger alerts. The cognitive agent controls the car in terms of braking or acceleration, signalling at junctions, and switching the steering mode between lane following, and traversing a junction. Steering and braking/accelerating are devolved to real-time control loops mimicking the cortico cerebellar circuit.

An extended version of this demo could include multiple road users, including pedestrians, cyclists and other cars, each simulated by a separate cognitive agent. This could be further combined with work on learning from experience and reasoning about how to handle new situations.

## Files

* osm.js

This is a JavaScript file that can be used with NodeJS to map the XML file exported by Open Street Maps into a chunks file.

* rules.chk

A collection of rules expressed as chunks that handle different kinds of visual alert, e.g. searching for a route, approaching a junction, stopping at the junction itself, and cruising away following turning at a junction.
