# Demonstrators

This page documents plans for developing a sequence of demonstrators that focus on different technical challenges, and together highlight the potential for Cognitive AI. 

## Counting

* https://www.w3.org/Data/demos/chunks/counting/

This demo is borrowed from a tutorial for the popular Cognitive Science architecture [ACT-R](http://act-r.psy.cmu.edu/). The demo serves as an introduction to chunks and rules.

It generates a sequence of digits by counting up from an start value and ends with a finish value. This is done using three rules. One to commence the counting task, a second rule to advance to the next digit, and a third rule to terminate the task after reaching the target value. The demo recalls chunks from the facts module that give the successor digit, e.g. 5 comes after 4.

An extended version of this demo could be developed to count beyond 9 with further rules and facts that support tens, hundreds and thousands etc.

## Simple Decision Trees

* https://www.w3.org/Data/demos/chunks/decision-tree/

This demo is borrowed from an old tutorial for ID3, and decides whether the weather is suitable for playing a game of golf. The weather conditions are randomly generated. The demo just uses the rules module with a decision tree implemented as a succession of rules. A future demo will cover machine learning of decision trees from examples. This will be followed by a suite of demos exploring machine learning of declararive and procedural knowledge, including the use of imagination/planning, case-based reasoning, and hierarchical reinforcement learning.

## Autonomous Driving (under construction)

* https://www.w3.org/Data/demos/chunks/driving/

This demo simulates driving a car across a town, as a task familiar to most of us. The map data was exported from Open Street Maps to an XML file, and converted into a file in the chunks format. The map is modelled as points with latitude and longitude, and paths as a sequence of points that denote a road or footpath. The A* algorithm is used to find a route between any two points.

Vision is modelled in terms of the position of the car in the lane and the change of direction of the road at a gaze point ahead of the car. Road signs and upcoming junctions trigger alerts. The cognitive agent controls the car in terms of braking or acceleration, signalling at junctions, and switching the steering mode  between lane following, and traversing a junction.  Steering and braking/accelerating are devolved to real-time control loops mimicking the cortico cerebellar circuit.

An extended version of this demo could include multiple road users, including pedestrians, cyclists and other cars, each simulated by a separate cognitive agent. This could be further combined with work on learning from experience and reasoning about how to handle new situations.

## Natural Language Dialogues and Situational Plans (under consideration)

This demo features a dialogue between three cognitive agents represent a waiter at a restaurant, and two visitors who are having dinner together. The language is predictable and the intent is well understood, making this a good scenario for exploring natural language processing, simple dialogues, reasoning about preferences, plans and episodic memories.

Natural language is processed a word at a time, and mapped to a chunk graph that represents the meaning. This involves a lexicon of words, a simplified treatment of parts of speech and gramatical categories, and the use of spreading activation for word sense disambiguation, and bindings for prepositional phrases and pronouns etc.

## Further Demos

These are at a very early stage of consideration, and need work on selecting the scenarios, detailed use cases, and associated datasets.

### Learning from examples

This focuses on techniques for learning knowledge graphs from potentially noisy examples, using fully supervised, weakly supervised or unsupervised learning algorithms.  A further demo would look at the potential for using reinforcement learning when imagining carrying out some sequence of actions.

### Learning Rulesets for Tasks

This focuses on hierarchical reinforcement learning, and will explore techniques for applying heuristics to propose/revise rules along with a stochastic temperature controlling the level of caution in making changes.

### Different Kinds of Reasoning

A suite of demos exploring different kinds of reasoning, e.g. inductive, abductive, causal, and so forth.

### Social Interaction and Theory of Mind

A multi-agent demo that explores how agents can represent and reason with models of themselves and other agents.

### Feelings and Emotions

One or more demos that explore how feelings can be processed via a feed forward network that models fast and instinctive emotional classifications and how these interact with thought using the separate cortico basal-ganglia circuit.

### Using Natural Language to Teach Everyday skills

Demos that explore the potential for using natural language for teaching and evaluating everyday skills (also known as "commonsense".
