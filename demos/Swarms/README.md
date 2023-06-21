# Swarms for multi-agent coordination
A swarm is a useful way of thinking about a collection of agents that need to work together to fulfill joint goals.  The swarm can be composed from a mix of mobile and static agents of varying capabilities. Agents coordinate via asynchronous message exchange at a level of abstraction decoupled from the underlying data formats and communication technologies.  This involves one to one messaging as well as topic based one to many message distribution.  A further means of communication is via the environment (stigmergy) e.g. via depositing artificial pheromones. Swarm simulation provides a low cost way to explore different algorithms in advance of real world deployment. Cognitive models based upon chunks & rules can be used for low-code development.

* [Talk at ETSI IoT Week, 2023](https://www.w3.org/2023/07-Raggett-SimSwarm.pdf)

One use case is for managing a distribution warehouse where robot forklifts are used to transfer pallets from incoming to outgoing trucks using warehouse racking for buffering. An orthographic web-based demo is being developed as a proof of concept

* [SimSwarm: warehouse](https://www.w3.org/Data/demos/chunks/warehouse/)

## Route Planning

One of the challenges is to plan routes for the robot forklifts. This prompted work on web-based demos for different approaches:

* [A-star algorithm over a grid](https://www.w3.org/Data/demos/chunks/warehouse/search/)
* [Ant swarm over a grid](https://www.w3.org/Data/demos/chunks/warehouse/ants/)
* [Ant foraging with pheromones and scent](https://www.w3.org/Data/demos/foraging/)

The first link features the use of the A-star algorithm over a grid. The code maintains a prioritised queue of cells for exploration. The queue length is bounded to constrain the beam-width. The second link uses stochastic movement of a swarm of ants to map out the grid in respect to the minimum distance from the route's origin.  The third link features animated ants, two kinds of pheromone, plus the option of scent for the food sources.

Work is now underway on a different approach based upon defining lanes and junctions, together with give way rules. This constrains robot forklifts to move along predefined paths rather than being free to move anywhere in the warehouse.

## Centralised vs Decentralised Control

In centralised control, the swarm coordinator allocates tasks, tracks where everything is, and computes routes for mobile agents. Messages are exchanged between the swarm coordinator and swarm participants on a one to one basis. This approach is perhaps simpler in respect to monitoring and control, but is subject to a single point of failure.

With decentralised control, tasks are allocated in a distributed way.
1. request for service
2. offers of service
3. requester makes a choice and notifies winning bid

Offers can specify a future time, e.g. when a given forklift expects to finish its current job.  This approach uses topic based message distribution, enabling service providers to listen on topics pertinent to the services the agents can provide. Messages can be limited to agents within a the same region or within a given distance.

## Semantic fusion as a distributed process of perception

Swarms can function as a hive mind.  One example is where agents sense their local environment and share information across the swarm in a distributed process of perception as semantic fusion.  This could use Lidar point clouds together with neural gas algorithms, or image processing across video frames for scene segmentation, object recognition and depth perception. The result is a shared semantic model of the environment that can in turn be used to improve recognition performance.

