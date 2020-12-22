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

We have a weekly zoom teleconference every Monday at 2pm Paris local time. This is open to all members of the Cognitive AI Community Group. The zoom URL is given on the [member only page for the meeting details](https://lists.w3.org/Archives/Member/internal-cogai/2020Sep/0000.html). To access that page, you will need to log in using your W3C account. Please don't share the Zoom URL on any public media.

## Background materials

* Talks
  * 25 November 2020 - Seminar on Cognitive AI for Centre for Artificial Intelligence, Robotics and Human-Machine Systems, Cardiff University: [slides](https://www.w3.org/2020/CogAI-2020-11-25.pdf), [video](https://www.youtube.com/watch?v=gJiDi3lqwcA&feature=youtu.be)
  * [06 November 2020 - Seminar on Cognitive AI for Knowledge Media Institute, Open University](http://kmi.open.ac.uk/seminars/3552) -  [video](https://github.com/w3c/cogai/blob/master/faq.md) and [slides](https://www.w3.org/2020/CogAI-2020-11-06.pdf)
  * [08 June 2020 - Cognitive AI and the Sentient Web for ISO/TC 211 50th Plenary meeting, WG4 Geospatial Services](https://www.w3.org/2020/sentient-web-20200608.pdf)
* [Chunks format for declarative and procedural knowledge](chunks-and-rules.md)
* [Demonstrators](demos/README.md)
* [Frequently asked questions](faq.md)
* [Longer treatise on Cognitive AI](https://www.w3.org/Data/demos/chunks/chunks.html)
* [Contributing to the Cognitive AI Community Group](Contributing.md)

## Program of work

The initial focus is to describe the aims for a sequence of demonstrators, to collaborate on the scenarios, detailed use cases, and associated datasets, and to identify and discuss questions that arise in this work. We also are working on a formal specification of the chunk data and rules format with a view to its standardisation.

## Positioning relative to existing approaches to AI

Traditional AI focuses on symbolic representations of knowledge and on mathematical logic, e.g. Expert Systems and the Semantic Web. Deep Learning, by contrast, focuses on statistical models implemented as multi-layer neural networks. Both approaches have their weaknesses. Symbolic AI has difficulties with the uncertainties and inconsistencies commonplace in everyday situations. The reliance on manual knowledge engineering is a big bottleneck.  Deep Learning has problems with recognising what’s salient, the need for very large data sets for training, and difficulties with generalisation. Symbolic AI and Deep Learning are associated with siloed communities that typify modern science in which researchers are discouraged from interdisciplinary studies and the breadth of views that that gives.

Cognitive AI attempts to address these weaknesses through mimicking human thought, taking inspiration from over 500 million years of neural evolution and decades of work across the cognitive sciences. This involves the combination of symbolic and statistical approaches using functional models of the human brain, including the cortex, basal ganglia, cerebellum and limbic system. Human memory is modelled in terms of symbolic graphs with embedded statistics reflecting prior knowledge and past experience. Human reasoning is not based upon logic, nor on the laws of probability, but rather on mental models of what is possible, along with the use of metaphors and analogies.

Research challenges include mimicry, emotional intelligence and natural language. Mimicry is key to social interaction, e.g. a baby learning to smile at its mother, and young children learning to speak. Emotional control of cognition determines what is important, and plays a key role in how we learn, reason and act. Natural language is important for both communication and for learning and the means to break free from the manual programming bottleneck.

## Historical context

AI lacks a precise agreed definition, but loosely speaking, it is about replicating intelligent behaviour, including perception, reasoning and action. There are many sub-fields of AI, e.g. logic and formal semantics, artificial neural networks, rule-based approaches including expert systems, statistical approaches including Bayesian networks and Markov chains, and a wide variety of approaches to search, pattern recognition and machine learning. Cognitive AI seeks to exploit work across the cognitive sciences on the organising principles of the human mind.

Chunk rules are a form of *production rules* as introduced by [Allen Newell](https://en.wikipedia.org/wiki/Allen_Newell) in 1973 in his production system theory of human cognition, which he subsequently developed as the [SOAR](https://en.wikipedia.org/wiki/Soar_(cognitive_architecture)) project. [John Anderson](https://www.cmu.edu/dietrich/psychology/people/core-training-faculty/anderson-john.html) published his theory of human associative memory (HAM) in 1973, and inspired by Newell, went on to combine it with a production system to form the *ACT* system in 1976, and developed it further into *ACT-R* in 1993. [ACT-R](http://act-r.psy.cmu.edu/about/) stands for *adaptive control of thought - rational* and has been widely applied to cognitive science experiments as a theory for simulating and understanding human cognition. For more details see <a href="http://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/526FSQUERY.pdf">An Integrated Theory of the Mind</a>. Chunks, in turn, was inspired by ACT-R, and the realisation that the approach could be adapted for general use in artificial intelligence as the combination of graphs, statistics, rules and graph algorithms.

Credit is also due to [Marvin Minsky](https://en.wikipedia.org/wiki/Marvin_Minsky) for his work on frames, metacognition, self-awareness and appreciation of the importance of emotions for controlling cognition, and to [Philip Johnson-Laird](https://en.wikipedia.org/wiki/Philip_Johnson-Laird) for his work on [mental models](https://www.pnas.org/content/107/43/18243) and demonstrating that humans don't reason using logic and probability, but rather by thinking about what is possible. Cognitive AI has a broader scope than ACT-R and seeks to mimic the human brain as a whole at a functional level, inspired by advances across the cognitive sciences. As such, Cognitive AI can be contrasted with approaches that focus on logic and formal semantics. Cognitive AI can likewise be decoupled from the underlying implementation, as the phenomenological requirements are essentially independent of whether they are realised as explicit graphs, vector spaces or pulsed neural networks, see David Marr's [three levels of analysis](https://en.wikipedia.org/wiki/David_Marr_(neuroscientist)#Levels_of_analysis). 

## Cognitive Architecture

The following diagram depicts how cognitive agents can be built as a collection of different building blocks that connect via the cortex. The initial focus of work is on a chunk rule engine inspired by John Anderson's ACT-R. Future work will look at the other building blocks.

![Image of cognitive architecture as a set of modules connected via the cortex](https://www.w3.org/Data/demos/chunks/cogai.png)

**Perception** involves interpreting sensor data in the current context, focusing attention on things of interest, and placing short lived representations in the cortex. **Emotion** is about fast, intuitive assessments of the current situation and potential courses of action. **Cognition** is slower and more deliberate thought, involving sequential execution of rules to carry out particular tasks. Thought can be expressed at many different levels of abstraction. **Action** is about carrying out actions initiated under conscious control, leaving the mind free to work on other things. An example is playing a musical instrument where muscle memory is needed to control your finger placements as thinking explicitly about each finger would be far too slow. 

Zooming in on cognition and the role of the basal ganglia as a sequential rule engine, the architecture looks like:

![Image of cognitive architecture for cognition](https://www.w3.org/Data/demos/chunks/arch.png)

This has been implemented as an open source JavaScript library and used as the basis for an [evolving suite of demos](demos/README.md).

## Long Term Aims

In the long run, the mission of the Cognitive AI Community Group is to enable cognitive agents that:

* Are knowledgeable, general purpose, collaborative, empathic and trustworthy
* Can apply metacognition and past experience to reason about new situations
* Support continuous learning based upon curiosity about the unexpected
* Have an awareness of others in respect to their beliefs, desires and intents
* Are multilingual and can interact with people using their own language

These topics can be divided into areas for study and exploration with an emphasis on identifying use cases and building demonstrators that advance the overall mission. There is plenty to exploit along the way, with many opportunities to spin off practical applications as work proceeds.

p.s. [useful tips on using GitHub for W3C projects](https://w3c.github.io/)
