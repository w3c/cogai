# Contributing to the Cognitive AI Community Group

The Cognitive AI Community Group will focus on practical considerations for building AI systems, inspired by what we've learned about the human mind and behaviour. This includes collaborating on defining and agreeing the details for a set of use cases and their implementation as Web-based demonstrators. If you are more interested in discussing philosophy or ethical policies for the application of AI, there are other groups that are better suited for such discussions.

This is a quick guide to getting started with contributing to the Cognitive AI Community Group. You are invited to contribute whether you have lots of time available or only have a little time to contribute occassionally. Participation is free of charge and open to all. We plan to use email and GitHub, and potentially other means, e.g. Google docs, teleconferences, twitter and blog posts. To get write access to markdown documents etc. please send your GitHub ID to Dave Raggett &lt;dsr@w3.org&gt;. Your starting point should be to introduce yourself on the group's mailing list, to explain your interest, and the areas that you would most like to contribute to (see below).

The W3C Cognitive AI Community Group seeks to demonstrate the potential of Cognitive AI through:

* Collaboration on defining scenarios, detailed use cases, requirements and datasets for use in demonstrators
* Work on open source implementations and scaling experiments
* Work on identifying application areas, e.g.
  * Helping non-programmers to work with data
  * Cognitive agents in support of customer services
  * Smart chatbots for personal healthcare
  * Autonomous vehicles
  * Smart manufacturing
* Outreach to explain the huge opportunities for Cognitive AI

## Scenarios and use cases for demonstrators

Demonstrators are invaluable for exploring technical challenges area by area. You can help by proposing scenarios and helping to refine the details for each use case, along with associated data sets. We are, for example, looking for use cases to explore machine learning for declarative and procedural knowledge. What kind of demonstrators would allow us to do show case that?

One avenue of study would be to look at inducing knowledge graphs from a sequence of examples. This would involve a facts graph that contains the set of examples and a separate rules graph that contains sets of rules for use in reasoning inductively about the examples. The demonstrator might further involve some specialised graph algorithms, e.g. for covariance analysis. For fully or weakly supervised machine learning, all or just some of the examples could be annotated as being valid or invalid examples of the concepts to be learned. The demo would then randomly divide the examples into a training set and an evaluation set. For unsupervised learning, the idea is to find parsimonious ways to describe the examples, e.g. through constructing a taxonomy. The demo could be implemented as a web page that loads the respective graphs and displays some measure of progress over successive learning cycles.

Your help is needed to first of all select a scenario, and to then identify how to create the sequence of examples.  One possibility for the above would be to learn a taxonomy of animals or plants based upon their characteristics. Can we find something else that involves richer knowledge graph, e.g. describing personal relationships? Can we also look for scenarios where the data is noisy, as a way to show how statistical considerations can overcome the presence of noise in the data.

In respect to learning procedural knowledge, the idea is to use heuristics to propose new rules or to update existing rules, and to then try them out to see whether this leads to success of failure.  Reinforcement learning provides a means to back propagate this along the sequence of rules used to provide estimates of each rule's utility in respect to the given task. This could involve a simulated environment in which the rules are applied to. This could be something abstract such as learning how to do simple algebra (something explored by work with ACT-R), or it could be something physical, such a simulated world with objects that can be moved and interacted with.  What scenarios can you come up with?

## Open source implementations and scaling experiments

## Identifying application areas

## Outreach to explain the opportunities

