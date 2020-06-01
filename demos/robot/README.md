# Cognitive AI for realtime control of smart factories

* https://www.w3.org/Data/demos/chunks/robot/

This demo was developed for the 2020 [Summer school on AI for Industry 4.0](https://ci.mines-stetienne.fr/ai4industry/2020/). It simulates a bottling plant with a robot, two conveyor belts, filling and capping stations and boxes that hold up to six bottles. The factory is controlled by a cognitive agent that exchanges messages with the various items of machinery. You can see a log of the activity as it happens. The facts graph illustrates how chunks can be used for an ontology, and future work would use this to validate the rules, e.g. to check that actions don't pass wrong values, to check that actions only use declared methods, and to check that action responses are handled correctly.

The actions are implemented by passing the action chunk and variable bindings to the factory machinery. Some actions take place immediately and have no response. Others, e.g. *full {@do wait; thing belt1}*, wait for some condition to become true and then signal that by setting the goal buffer to a chunk that another rule can match to take the appropriate following actions. 

For the *@do wait* actions, the chunk type is used for the kind of condition, and reflected back with the response chunk. The information passed with the action, and returned with the response is up to the implementation of that condition type. The demo uses this for the following conditions:

* *space* when the required space becomes available at the start of a conveyor belt
* *full* when an item reaches the end of the conveyor belt
* *filled* when a bottle has been filled
* *capped* when a bottle has been capped
* *packingSpace* when a box is available at the start of the second belt and has a space free for a bottle
* *boxFull* when the box at the start of the second belt is now full

Note that when the *@do wait* action is executed the condition may already be true, in which case the response is returned immediately, otherwise the response is returned in the future when the condition becomes true. 

The demo involves the following actions that have no responses:

* *start* to start a conveyor belt moving
* *stop* to stop a conveyor belt moving
* *fill* to start filling a bottle
* *cap* to fit a cap to a bottle
* *grasp* to instruct the robot to grasp a bottle at the current location
* *release* to instruct the robot to release the bottle it is holding
* *shipBox* to ship the box at the end of the second conveyor belt

The *@do move* action instructs the robot to move, supplying the target x and y coordinates for the robot's hand relative to the location of the robot's base. The *gap* property is used to specify the target gap between the robot's finger and thumb. The *angle* property specifies the target angle of the robot's hand. Note that the demo uses the coordinate system for the HTML CANVAS element, i.e. the origin is the upper left corner of the view, with x increasing the right, and y increasing down the screen. The *step* property is used to identify the current step, and is included in the *after* chunk for the response when the motion has completed.

The robot has an upper arm and a forearm. The angles joints at the start of each are computed from the target position and angle of the robot's hand. There are two solutions for the arm angles for any given position, and the robot picks one of them. If the target position is out of reach, the calculation fails and the arm will be flat along the x axis.

Animation is based on the HTML window.requestAnimationFrame method which calls the function passed to it with a high precision time stamp. This timestamp is used by each item of machinery to compute its current state. The conveyor belts move at constant speed. The robot arm is more sophisticated and starts slowly then accelerates to a maximum speed and slows down as it approaches its target position. This is based upon the cosine function in the range 0 to PI. The sound effects are played when each item of machinery are in operation. The corresponding audio contexts are created when the user clicks the start button.

## Comments

Actions pass information from one rule to the next via updates to the module buffers. This depends on the action, e.g. *move* just passes the current step, whilst *packingSpace* provides the location for packing the next bottle. The demo uses the goal buffer and module. However, the rules could be extended to pass additional information via the buffer for the facts module rather than relying on the operations to pass all the information via the goal buffer.

The demo could be extended to make the objects more explicit, e.g. bottles and boxes.  One way to do this would be to introduce a *grasped* wait condition that returns an identifier for the bottle grasped by the robot. Likewise, *packingSpace* could be extended to provide an identifier for the box. The robot's current state could be held in a chunk in the facts module and queried using *@do recall*. Note that the current location for objects representing bottles and boxes is not held by them, as that would incur the cost for updating them dynamically as they move. Their location is instead tracked by the things that hold them, e.g. the conveyor belt, robot arm and the boxes. This relates to what has been called the [frame problem](https://en.wikipedia.org/wiki/Frame_problem).

A more sophisticated demo would thus include rich declarative information about things. This could then be used for planning how to handle new situations. *facts.chk* provides a sketch of an ontology that in principle could be used for validating facts and rules to check that:

* actions don't pass wrong values,
* actions only use declared methods, and
* action responses are handled correctly

The sketch also highlights the idea of being able to use shared definitions for properties, methods etc. where appropriate, and otherwise to provide specific definitions that include the name for the property, method, etc.  It also hints at the potential difficulty of maintaining meaningful names in a large graph, and the need to look at possible ways to contextualise names. One means to do this is to use *@context* to divide graphs into a number of nestable contexts. This is also needed to express knowledge about hypothetical situations, counterfactuals, stories and reported speech, for example, to be able to express the idea that John believes Michael to be in love with Sarah.
