# Demonstrators

This page documents plans for developing a sequence of demonstrators that focus on different technical challenges, and together highlight the potential for Cognitive AI. The demos should be based upon cognitively plausible techniques involving graph data, graph rules and graph algorithms. Further demos will seek to apply these techniques to specific application areas.

## [Counting](counting/README.md)

* https://www.w3.org/Data/demos/chunks/counting/

This demo is borrowed from a tutorial for the popular Cognitive Science architecture [ACT-R](http://act-r.psy.cmu.edu/). The demo serves as an introduction to chunks and rules.

It generates a sequence of digits by counting up from an start value and ends with a finish value. This is done using three rules. One to commence the counting task, a second rule to advance to the next digit, and a third rule to terminate the task after reaching the target value. The demo recalls chunks from the facts module that give the successor digit, e.g. 5 comes after 4. The demo starts by injecting a chunk into the goal buffer to trigger the task.

An extended version of this demo could be developed to count beyond 9 with further rules and facts that support tens, hundreds and thousands etc.

## [Simple Decision Trees](decision-tree/README.md)

* https://www.w3.org/Data/demos/chunks/decision-tree/

This demo is borrowed from an old tutorial for ID3, and decides whether the weather is suitable for playing a game of golf. The weather conditions are randomly generated. The demo just uses the rules module with a decision tree implemented as a succession of rules. A future demo will cover machine learning of decision trees from examples. This will be followed by a suite of demos exploring machine learning of declararive and procedural knowledge, including the use of imagination/planning, case-based reasoning, and hierarchical reinforcement learning.

## [Autonomous Driving](driving/README.md) (under construction)

* https://www.w3.org/Data/demos/chunks/driving/

This demo simulates driving a car across a town, as a task familiar to most of us. The map data was exported from Open Street Maps to an XML file, and converted into a file in the chunks format. The map is modelled as points with latitude and longitude, and paths as a sequence of points that denote a road or footpath. The A* algorithm is used to find a route between any two points.

Vision is modelled in terms of the position of the car in the lane and the change of direction of the road at a gaze point ahead of the car. Road signs and upcoming junctions trigger alerts. The cognitive agent controls the car in terms of braking or acceleration, signalling at junctions, and switching the steering mode  between lane following, and traversing a junction.  Steering and braking/accelerating are devolved to real-time control loops mimicking the cortico cerebellar circuit.

An extended version of this demo could include multiple road users, including pedestrians, cyclists and other cars, each simulated by a separate cognitive agent. This could be further combined with work on learning from experience and reasoning about how to handle new situations.

## [Natural Language Dialogues and Situational Plans](nld/README.md) (under consideration)

This demo features a dialogue between three cognitive agents that model a waiter at a restaurant, and two visitors who are having dinner together. The language is predictable and the intent is well understood, making this a good scenario for exploring natural language processing, simple dialogues, reasoning about preferences, plans and episodic memories.

Natural language is processed a word at a time, and mapped to a chunk graph that represents the meaning. This involves a lexicon of words, a simplified treatment of parts of speech and gramatical categories, and the use of spreading activation for word sense disambiguation, and bindings for prepositional phrases and pronouns etc.

## Further Demos

These are at a very early stage of consideration, and need work on selecting the scenarios, detailed use cases, and associated datasets.

### Learning from examples

This will be a series of demos focusing on techniques for learning knowledge graphs and decision trees from potentially noisy examples, using strongly supervised, weakly supervised, and unsupervised learning algorithms based on metrics for parsimonious representations. Humans are able to learn from small numbers of examples in contrast to today’s deep learning techniques. This is possible through effective use of statistics and prior knowledge. We're looking for help with surveying the literature for relevant algorithms and datasets. Here are just a few pointers:

* [Tour of machine learning algorithms](https://machinelearningmastery.com/a-tour-of-machine-learning-algorithms/), including regression, instance-based, regularisation, decision-trees, bayesian, clustering, association rule learning, artificial neural networks, deep learning, dimensionality reduction, ensemble and other machine learning algorithms.
* [CHREST](http://chrest.info/chrest.html) (Chunk Hierarchy and REtrieval STructures) is a symbolic cognitive architecture which treats long term memory as a discrimination network that sorts and stores chunks. This is also very relevant to demos exploring stimulus-response as a basis for feelings and emotions.
* [Automatic taxonomy construction](https://en.wikipedia.org/wiki/Automatic_taxonomy_construction) from a corpus of examples.
* [Quinlan's ID3 algorithm](https://hunch.net/~coms-4771/quinlan.pdf) describes a means to inductively learn decision trees from examples.
* [Covariance analysis](http://www.biostathandbook.com/ancova.html) provides a means to test for statistical significance of correlations in datasets.
* [One-shot learning](https://en.wikipedia.org/wiki/One-shot_learning) aims to learn information about object categories from one, or only a few, training samples/images.
* [Taxonomy vs Ontology: Machine learning breakthroughs](https://www.dataversity.net/taxonomy-vs-ontology-machine-learning-breakthroughs/) - a brief introduction.
* [Knowledge Graph Refinement](http://semantic-web-journal.net/system/files/swj1167.pdf) - a survey of approaches and evaluation methods.

### Learning Rulesets for Tasks

This focuses on hierarchical reinforcement learning, and will explore techniques for applying heuristics to propose/revise rules along with a stochastic temperature parameter controlling the level of caution in making changes.  A further demo would look at the potential for using reinforcement learning when imagining carrying out some sequence of actions.

### Different Kinds of Reasoning

A suite of demos exploring different kinds of reasoning, e.g. deductive, inductive, abductive, causal, reasoning from multiple perspectives, reasoning about stories, and so forth.

### Feelings and Emotions

One or more demos that explore how feelings can be processed via a feed forward network that models fast and instinctive emotional classifications involving the limbic system, and how these interact with thought using the separate cortico basal-ganglia circuit. The [anterior cingulate cortex](https://en.wikipedia.org/wiki/Anterior_cingulate_cortex) is a component of the limbic system that supports higher-level functions, such as attention allocation, reward anticipation, decision-making, ethics and morality, impulse control (e.g. performance monitoring and error detection), and emotion.

### Social Interaction and Theory of Mind

A multi-agent demo that explores how agents can represent and reason with models of themselves and other agents. A further demo would build on that to explore what is involved in supporting empathy, compassion and emotional intelligence.

### Using Natural Language to Teach Everyday skills

Demos that explore the potential for using natural language for teaching and evaluating everyday skills (also known as "commonsense". These would build upon the progress made in the other demos, e.g. work on natural language, machine learning and attention allocation.

### Evolutionary Approaches to Visual Perception

Humans are able to recognise foreground objects and their structure from just a few examples, despite wide variations in orientation, size, backgrounds and lighting conditions. In addition, we're able to understand scenes using a combination of a wide angle low resolution sensor and a narrow angle high resolution sensor, necessitating saccades as the eye swivels to scan areas of interest. The means to replicate these capabilities will be explored via evolutionary approaches using progressively more complex scenes to refine neural networks and control systems.

### Acquisition of Muscle Memory

The cortico cerebellar circuit supports real-time control over many muscles using sensory relayed via the cortex as a means of carrying out actions devolved to it by the cortico basal ganglia circuit. A series of demos will explore the potential for acquisition of [muscle memory](https://en.wikipedia.org/wiki/Muscle_memory) in terms of a hierarchy of automata, and the progressive reduction of the need for conscious attention and control through successive repetitions of each action.
