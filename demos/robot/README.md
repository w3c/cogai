# Cognitive AI for realtime control of smart factories

* https://www.w3.org/Data/demos/chunks/robot/

This demo was developed for the 2020 [Summer school on AI for Industry 4.0](https://ci.mines-stetienne.fr/ai4industry/2020/). It simulates a bottling plant with a robot, two conveyor belts, filling and capping stations and boxes that hold up to six bottles. The factory is controlled by a cognitive agent that exchanges messages with the various items of machinery. You can see a log of the activity as it happens. The facts graph illustrates how chunks can be used for an ontology, and future work would use this to validate the rules, e.g. to check that actions don't pass wrong values, to check that actions only use declared methods, and to check that action responses are handled correctly.

The actions are implemented by passing the action chunk and variable bindings to the factory machinery. Some actions take place immediately and have no response. Others, e.g. **full {@do wait; thing belt1}**, wait for something to become true and then signal that by setting the goal buffer to a chunk that another rule can match to take the appropriate following actions. 
