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
* Work on identifying application areas, e.g.
  * Helping non-programmers to work with data
  * Cognitive agents in support of customer services 
  * Smart chatbots for personal healthcare
  * Assistants for detecting and responding to cyberattacks
  * Autonomous vehicles
  * Smart manufacturing
* Outreach to explain the huge opportunities for Cognitive AI
* Participation is open to all, free of charge: [join group](https://www.w3.org/community/cogai/join)

We anticipate using GitHub for documents, issue tracking and open source components. We have a [public mailing list](https://lists.w3.org/Archives/Public/public-cogai/), and an [IRC channel](https://www.w3.org/wiki/IRC) **#cogai**.

## Background materials

* [Introduction to Cognitive AI](https://www.w3.org/Data/demos/chunks/chunks-20200110.pdf)
* [Introduction to chunks and rules](https://www.w3.org/Data/demos/chunks/chunks-20200110.pdf)
* [Longer treatise on Cognitive AI](https://www.w3.org/Data/demos/chunks/chunks.html)
* [Contributing to the Cognitive AI Community Group](Contributing.md)

## Program of work

The initial focus is to describe the aims for a sequence of demonstrators, to collaborate on the scenarios, detailed use cases, and associated datasets, and to identify and discuss questions that arise in this work.

## Cognitive Architecture

The following diagram depicts how cognitive agents can be built as a collection of different building blocks that connect via the cortex. The initial focus of work is on a chunk rule engine inspired by John Anderson's ACT-R. Future work will look at the other building blocks.

![Image of cognitive architecture as a set of modules connected via the cortex](https://www.w3.org/Data/demos/chunks/cogarch.jpg)

Perception involves interpreting sensor data, focusing attention on things of interest, and placing short lived representations in the cortex. Feelings is about fast, intuitive assessments of the current situation and potential courses of action. Thought is slower and more deliberate, involving sequential execution of rules to carry out particular tasks. Thought can be expressed at many different levels of abstraction. Action is about carrying out actions initiated under conscious control, leaving the mind free to work on other things. An example is playing a musical instrument where muscle memory is needed to control your finger placements as thinking explicitly about each finger would be far too slow. 

p.s. [useful tips on using GitHub for W3C projects](https://w3c.github.io/)
