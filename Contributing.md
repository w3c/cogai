# Contributing to the Cognitive AI Community Group

The Cognitive AI Community Group will focus on practical considerations for building AI systems, inspired by what we've learned about the human mind and behaviour. This includes collaborating on defining and agreeing the details for a set of use cases and their implementation as Web-based demonstrators. If you are more interested in discussing philosophy or ethical policies for the application of AI, there are other groups that are better suited for such discussions.

This is a quick guide to getting started with contributing to the Cognitive AI Community Group. You are invited to contribute whether you have lots of time available or only have a little time to contribute occassionally. Participation is free of charge and open to all. We plan to use email and GitHub, and potentially other means, e.g. Google docs, teleconferences, twitter and blog posts. To get write access to markdown documents etc. please send your GitHub ID to Dave Raggett &lt;dsr@w3.org&gt;. Your starting point should be to introduce yourself on the group's mailing list, to explain your interest, and the areas that you would most like to contribute to (see below).

The W3C Cognitive AI Community Group seeks to demonstrate the potential of Cognitive AI through:

* Collaboration on defining scenarios, detailed use cases, requirements and datasets for use in demonstrators
* Work on open source implementations and scaling experiments
* Work on identifying and analysing application areas, e.g.
  * Helping non-programmers to work with data
  * Cognitive agents in support of customer services
  * Smart chatbots for personal healthcare
  * Assistants for detecting and responding to cyberattacks
  * Teaching assistants for self-paced online learning
  * Autonomous vehicles
  * Smart manufacturing
* Outreach to explain the huge opportunities for Cognitive AI

## Scenarios and use cases for demonstrators

Demonstrators are invaluable for exploring technical challenges area by area. You can help by proposing scenarios and helping to refine the details for each use case, along with associated data sets. We are, for example, looking for use cases to explore machine learning for declarative and procedural knowledge. What kind of demonstrators would allow us to do show case that?

One avenue of study would be to look at inducing knowledge graphs from a sequence of examples. This would involve a facts graph that contains the set of examples and a separate rules graph that contains sets of rules for use in reasoning inductively about the examples. The demonstrator might further involve some specialised graph algorithms, e.g. for covariance analysis. For fully or weakly supervised machine learning, all or just some of the examples respectively could be annotated as being valid or invalid examples of the concepts to be learned. The demo would then randomly divide the examples into a training set and an evaluation set. For unsupervised learning, the idea is to find parsimonious ways to describe the examples, e.g. through constructing a taxonomy. The demo could be implemented as a web page that loads the respective graphs and displays some measure of progress over successive learning cycles.

Your help is needed to first of all select a scenario, and to then identify how to create the sequence of examples.  One possibility for the above would be to learn a taxonomy of animals or plants based upon their characteristics. Can we find something else that involves a richer knowledge graph, e.g. describing personal relationships? Can we also look for scenarios where the data is noisy, as a way to show how statistical considerations can overcome the presence of noise in the data.

In respect to learning procedural knowledge, the idea is to use heuristics to propose new rules or to update existing rules, and to then try them out to see whether this leads to success or failure.  Reinforcement learning provides a means to back propagate this along the sequence of rules in order to provide estimates of each rule's utility in respect to the given task. This could involve a simulated environment that the rules are applied to. This could be something abstract such as learning how to do simple algebra (something explored by work with ACT-R), or it could be something physical, such a simulated world with objects that can be moved around and interacted with.  What scenarios can you come up with?

## Open source implementations and scaling experiments

To be able to convince a wide audience, we aim to provide Web based demos that people can run in their Web browsers, along with open source components for people to download and try out for themselves. The initial components are written in JavaScript and include a library for chunks and rules, an HTTP server for running demos on your own computer with NodeJS, and a set of demos that we hope to add to with your help. The autonomous driving demo, for example, includes a chunk graph of 637 KB (derived from an OSM XML file of 3.1 MB), that is downloaded and used within a web page as a local database.

Further work is anticipated to add support for remote cognitive databases that are accessed via HTTPS or Web Sockets, using NodeJS. Simple memory based graphs can readily scale to perhaps hundreds of MB, but to go further, it is likely that we will need to develop a database implementation using memory mapped files of up to a hundred GB or so. To go even further, we can look forward to databases distributed across server farms, along with hardware redundancy for resilient operation. We're looking for help with developing high performance large scale open source cognitive databases!

## Identifying and analysing application areas

In parallel with work on the technical challenges, we want to study opportunities for applications of Cognitive AI, including:

 * Helping non-programmers to work with data
 * Cognitive agents in support of customer services
 * Smart chatbots for personal healthcare
 * Autonomous vehicles
 * Smart manufacturing
 
This will involve looking at industry forecasts to evaluate the potential market demand, and to understand the role that Cognitive AI could play. As an example, consider the huge demand for helping non-programmers to work with data directly rather than having to involve the IT department.
 
> In its latest report, Gartner, for example, states low-code application platforms will be responsible for more than 65 percent of all app dev activity by 2024. In the same way, Forrester expects the low-code market to represent $21B in spending by 2022. 

See: https://www.outsystems.com/blog/low-code-development-market.html

In principle, Cognitive AI based agents could act as smart collaborators, that can take the initiative and figure out how to solve problems on behalf of their users, with the combination of graphical user interfaces (including VR and AR) and spoken or written natural language dialogues. In some cases the results would be available pretty much immediately, in others, where more extensive computation is needed, the user would be notified when the results are ready.  Cognitive agents could also be instructed to provide reports at regular intervals, e.g. daily, weekly or monthly.

Cognitive agents could likewise be applied to customer support, perhaps as a point of first contact, and passing the customer onto human agents when needed.  To better understand this opportunity, we will need to take a look at existing work on applying chatbots, and identifying where smarter agents could overcome the weaknesses with existing solutions. Cognitive agents have a further opportunity for personal healthcare, and minimising the need to pass sensitive personal data to the cloud.

For autonomous driving, cognitive agents that can reason and learn from experience have an obvious role, taking the place of a human driver. Autonomous driving further provides a rich opportunity for looking at ways to improve computer vision and scene understanding, that moves beyond the limitations of today's deep learning solutions.

Smart manufacturing is another exciting opportunity for exploiting cognitive agents across the factory floor, supply chain and the enterprise as a whole. This includes cyber-physical control of manufacturing machinery, and flexible adaptive planning that optimises the use of expensive assets in the face of the complication of bespoke products, disruptions to the supply chain and the need to take machinery out of operation for predictive maintenance.

Your help is sought for exploring application areas in more detail, and identifying the best prospects for early adoption of Cognitive AI solutions. This will involve a dialogue between the people focusing on the technical challenges and those who are focused on business and other opportunties for exploiting Cognitive AI.

## Outreach to explain the opportunities

If you are more of an evangelist, then you could be of great value for helping us to reach out to a wide community of potential adopters of Cognitive AI solutions through multiple channels, e.g. tweets, blog posts, and appearances at conferences. Technical people are not always the best when it comes to explaining things to a non-technical audience, so if you are skilled at making complex ideas easy to understand, we have an opportunity for you!
