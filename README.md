# W3C Cognitive AI Community Group
This repository is for work by the [W3C Cognitive AI Community Group](https://www.w3.org/community/cogai/).

According to [wikipedia](https://en.wikipedia.org/wiki/Cognitive_science):

<blockquote>
Cognitive science is the interdisciplinary, scientific study of the mind and its processes. It examines the nature, the tasks, and the functions of cognition. Cognitive scientists study intelligence and behavior, with a focus on how nervous systems represent, process, and transform information.
</blockquote>

Cognitive AI can be defined as AI based upon insights from the cognitive sciences, including cognitive neuroscience, and cognitive sociology.  To put it another way, the brain has evolved over hundreds of millions of years, and we would do well to borrow from nature when it comes to building AI systems.

The W3C Cognitive AI Community Group seeks to demonstrate the potential of Cognitive AI through:

* Collaboration on defining use cases, requirements and datasets for use in demonstrators
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
* Participation is open to all, free of charge: [join group](https://www.w3.org/community/cogai/join)

We are using GitHub for documents, issue tracking and open source components. We have a [public mailing list](https://lists.w3.org/Archives/Public/public-cogai/), and an [IRC channel](https://www.w3.org/wiki/IRC) **#cogai**.

## Background materials

* [Cognitive AI and the Sentient Web](https://www.w3.org/2020/sentient-web-20200608.pdf)
* [Chunks format for declarative and procedural knowledge](chunks-and-rules.md)
* [Demonstrators](demos/README.md)
* [Longer treatise on Cognitive AI](https://www.w3.org/Data/demos/chunks/chunks.html)
* [Contributing to the Cognitive AI Community Group](Contributing.md)

## Program of work

The initial focus is to describe the aims for a sequence of demonstrators, to collaborate on the scenarios, detailed use cases, and associated datasets, and to identify and discuss questions that arise in this work. We also are working on a formal specification of the chunk data and rules format with a view to its standardisation.

## Technical Aims

To enable cognitive agents that:

* Are general purpose, collaborative, empathic and trustworthy
* Can apply metacognition and past experience to reason about new situations
* Support continuous learning based upon curiousity about the unexpected 
* Have a level of self awareness in respect to current state, goals and actions
* Have an awareness of others in respect to their beliefs, desires and intents

## Historical context

Chunk rules are a form of *production rules* as introduced by [Allen Newell](https://en.wikipedia.org/wiki/Allen_Newell) in 1973 in his production system theory of human cognition, which he subsequently developed as the [SOAR](https://en.wikipedia.org/wiki/Soar_(cognitive_architecture)) project. [John Anderson](https://www.cmu.edu/dietrich/psychology/people/core-training-faculty/anderson-john.html) published his theory of human associative memory (HAM) in 1973, and inspired by Newell, went on to combine it with a production system to form the *ACT* system in 1976, and developed it further into *ACT-R* in 1993. [ACT-R](http://act-r.psy.cmu.edu/about/) stands for *adaptive control of thought - rational* and has been widely applied to cognitive science experiments as a theory for simulating and understanding human cognition. For more details see <a href="http://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/526FSQUERY.pdf">An Integrated Theory of the Mind</a>. Chunks, in turn, was inspired by ACT-R, and the realisation that the approach could be adapted for general use in artificial intelligence as the combination of graphs, statistics, rules and graph algorithms. Credit is also due to [Marvin Minsky](https://en.wikipedia.org/wiki/Marvin_Minsky) for his work on frames, metacognition, self-awareness and appreciation of the importance of emotions for controlling cognition. Cognitive AI has a broader scope than ACT-R and seeks to mimic the human brain as a whole at a functional level, inspired by advances across the cognitive sciences. As such, Cognitive AI can be contrasted with approaches that focus on logic and formal semantics.

## Cognitive Architecture

The following diagram depicts how cognitive agents can be built as a collection of different building blocks that connect via the cortex. The initial focus of work is on a chunk rule engine inspired by John Anderson's ACT-R. Future work will look at the other building blocks.

![Image of cognitive architecture as a set of modules connected via the cortex](https://www.w3.org/Data/demos/chunks/cogai.png)

**Perception** involves interpreting sensor data in the current context, focusing attention on things of interest, and placing short lived representations in the cortex. **Emotion** is about fast, intuitive assessments of the current situation and potential courses of action. **Cognition** is slower and more deliberate thought, involving sequential execution of rules to carry out particular tasks. Thought can be expressed at many different levels of abstraction. **Action** is about carrying out actions initiated under conscious control, leaving the mind free to work on other things. An example is playing a musical instrument where muscle memory is needed to control your finger placements as thinking explicitly about each finger would be far too slow. 

Zooming in on cognition and the role of the basal ganglia as a sequential rule engine, the architecture looks like:

![Image of cognitive architecture for cognition](https://www.w3.org/Data/demos/chunks/arch.png)

This has been implemented as an open source JavaScript library and used as the basis for an [evolving suite of demos](demos/README.md).

p.s. [useful tips on using GitHub for W3C projects](https://w3c.github.io/)
