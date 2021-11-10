# Common Sense Reasoning

Common sense is needed to support natural language interaction and everyday reasoning.

* [Knowledge-based NLP](knowledge-based-nlp.md)

Common sense reasoning covers a broad range of everyday knowledge including time, space, physical interactions, theory of mind and so forth. This includes causal models, e.g. things fall if they are not supported, and objects can't fit into containers smaller than themselves. Young children learn a lot of this for themselves through play and interacting with others.

Children similarly steadily expand their vocabulary, learning words along with their meaning. New words stimulate System 2 reasoning and updates to the lexicon and taxonomic knowledge. Misunderstandings may occur, be noticed and corrected.

We need to gather a collection of utterances and work on a subset of common sense knowledge sufficient for understanding those utterances. It is not a goal to develop a comprehensive taxonomy of common sense knowledge, and the emphasis is rather on demonstrating human-like understanding, reasoning and learning.

Scaling will be a matter of learning through being taught lessons in the classroom, and through interaction in simulated virtual environments (playgrounds), with humans and other cognitive agents. In principle, agents can be designed to learn faster than humans, without getting tired and losing concentration. Likewise, agents can be designed to interact with many people as a form of crowd-sourcing. Once agents have been well trained they will be trivially easy to clone.

It will be helpful to develop visual tools to support browsing, querying and reasoning, including taxonomic knowledge and the graph models constructed in episodic memory.

According to DARPA:

> The absence of common sense prevents intelligent systems from understanding their world, behaving reasonably in unforeseen situations, communicating naturally with people, and learning from new experiences. Its absence is considered the most significant barrier between the narrowly focused AI applications of today and the more general, human-like AI systems hoped for in the future. Common sense reasoning’s obscure but pervasive nature makes it difficult to articulate and encode.

> The exploration of machine common sense is not a new field. Since the early days of AI, researchers have pursued a variety of efforts to develop logic-based approaches to common sense knowledge and reasoning, as well as means of extracting and collecting commonsense knowledge from the Web. While these efforts have produced useful results, their brittleness and lack of semantic understanding have prevented the creation of a widely applicable common sense capability.

Antoine Bosselut claims:

> * Commonsense knowledge is immeasurably vast, making it impossible to manually enumerate
> * Commonsense knowledge is often implicit, and often can’t be directly extracted from text
> * Commonsense knowledge resources are quite sparse, making them difficult to extend by only learning from examples
   
Yet according to Ernest Davis, children acquire a good grasp of commonsense by the time they are seven. It therefore makes sense to try to mimic human knowledge and reasoning. We need to move beyond lexical models of knowledge and to consider how children generalise from individual examples, and apply this knowledge to make sense of what they read.
   
Susie Loraine claims that typical six year olds have a 2,600 word expressive vocabulary (words they say), and a receptive vocabulary (words they understand) of 20,000–24,000 words.

Given a six year old has lived for just over 2000 days, this implies vocabulary growth of ten or more words a day.  Assuming 10 to 100 common sense facts per word, that amounts to 200,000 to 2,000,000 facts about the world. This compares to ConceptNet with 1.6 million facts interrelating 300,000 nodes. This is a simplification as commonsense involves reasoning as well as facts, and this allows children to generalise from specific examples.
   
How can we partition commonsense knowledge into areas with strong internal dependencies, and weak external dependencies? Can we sort such areas into a dependency graph that gives us an ordering of what needs to be learned before proceeding to other areas? Examples of such areas include social, physical and temporal reasoning.
   
Benchmarks are one way to assess performance, but fail to explain how an agent understands and reasons. That requires a conversational interface that allows understanding to be probed through questions.

## Background resources
<details>
   <summary>Here are a few resources for further reading:</summary>

* [DARPA Machine Common Sense (MCS) Program](https://www.darpa.mil/program/machine-common-sense) which seeks to address the challenge of machine common sense by pursuing two broad strategies. Both envision machine common sense as a computational service, or as machine commonsense services. The first strategy aims to create a service that learns from experience, like a child, to construct computational models that mimic the core domains of child cognition for objects (intuitive physics), agents (intentional actors), and places (spatial navigation). The second strategy seeks to develop a service that learns from reading the Web, like a research librarian, to construct a commonsense knowledge repository capable of answering natural language and image-based questions about commonsense phenomena.
* [Wikipedia article on common sense reasoning](https://en.m.wikipedia.org/wiki/Commonsense_reasoning), which they defined as a human-like ability to make presumptions about the type and essence of ordinary situations humans encounter every day. These assumptions include judgments about the nature of physical objects, taxonomic properties, and peoples' intentions. A device that exhibits commonsense reasoning might be capable of drawing conclusions that are similar to humans' folk psychology (humans' innate ability to reason about people's behavior and intentions) and naive physics (humans' natural understanding of the physical world).
* [ACL 2020 Commonsense Tutorial](https://homes.cs.washington.edu/~msap/acl2020-commonsense/) which provides a survey of work on applying language models such as BERT and GPT-3 to commonsense, noting that language models mostly pick up lexical cues, and that no model actually solves commonsense reasoning to date. Language models lack an understanding of some of the most basic physical properties of the world. 
* [WebChild](http://gerard.demelo.org/papers/csk-webchild.pdf), automatically constructed commonsense knowledgebase extracted by crawling web text collections, using semisupervised learning to classify word senses according to WordNet senses.
* [ATOMIC](https://arxiv.org/abs/1811.00146) knowledgebase describing cause and effect of everyday situations. ATOMIC focuses on inferential knowledge organized as typed if-then relations with variables (e.g., "if X pays Y a compliment, then Y will likely return the compliment").
* [WordNet](https://wordnet.princeton.edu) which is a lexicon that includes a limited taxonomy of word senses.
* [COCA](https://www.english-corpora.org/coca/), a corpus of contemporary American English including word stems and part of speech tags
* [BNC](http://www.natcorp.ox.ac.uk), a corpus of contemporary British English including word stems and part of speech tags
* [Linguistics in the age of AI](https://direct.mit.edu/books/book/5042/Linguistics-for-the-Age-of-AI) by Marjorie McShane and Sergei Nirenburg, Cognitive Science Department at Rensselaer Polytechnic Institute.
* [ConceptNet](https://en.m.wikipedia.org/wiki/ConceptNet) is a [crowd sourced semantic network](https://github.com/commonsense/conceptnet) now hosted on GitHub. [ConceptNet5](https://github.com/commonsense/conceptnet5) is multilingual and based on [34 relationships](https://github.com/commonsense/conceptnet5/wiki/Relations).
* [Event2Mind](https://github.com/uwnlp/event2mind), a crowdsourced corpus of 25,000 event phrases covering a diverse range of everyday events and situations. The training and test data are given as comma separated values.
* [Dimensions of Commonsense Knowledge](https://arxiv.org/abs/2101.04640), a survey of popular commonsense sources and consolidation into 13 knowledge dimensions and a large combined graph CSKG (a 1GB tab separated value file).
* [NLP Progress repository](http://nlpprogress.com/english/common_sense.html), including the Winograd Schema Challenge, a dataset for common sense reasoning. It lists questions that require the resolution of anaphora: the system must identify the antecedent of an ambiguous pronoun in a statement. Models are evaluated based on accuracy. Here is an example:

    *The trophy doesn’t fit in the suitcase because it is too big.*<br>
What is too big? Answer 0: the trophy. Answer 1: the suitcase

* [Bloom's taxonomy for educational goals](https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/), this has the potential for use in distinguishing different kinds of knowledge and cognitive processes.  A revised taxonomy uses the following terms for six cognitive processes: remember, understand, apply, analyse, evaluate and create. The authors further provide a taxonomy of the types of knowledge used in cognition: factual, conceptual, procedural, and metacognitive. See Mary Forrehand's [guide to the revised edition](https://cft.vanderbilt.edu/wp-content/uploads/sites/59/BloomsTaxonomy-mary-forehand.pdf).

    <p align="center"><img alt="Bloom's taxonomy" src="https://cdn.vanderbilt.edu/vu-wp0/wp-content/uploads/sites/59/2019/03/27124326/Blooms-Taxonomy.jpg" width="70%"><br>
   <em>Courtesy of Vanderbilt University Center for Teaching</em></p>
</details>

## Examples of Commonsense

Commonsense can often be expressed in natural language, e.g.

* things fall down unless supported by something else
* I am younger than my mother and father
* my head is part of my body
* a dog is a kind of mammal
* a thing can't fit into a container smaller than itself
* fragile things often break when they fall and hit the ground
* flowers are parts of plants, and their colour and shape depends on the plant
* pushing something will cause it to move unless it is fixed in place

These often involve constrained variables, e.g. "I" is a person, and describe static or causal relationships, involving additional knowledge. In many cases, commonsense rules can be modelled as chunk graphs, and interpreted using graph algorithms. This raises the challenge for how commonsense is used in natural language processing and everyday reasoning, along with how it is learned and indexed.

## Dimensions of Commonsense

Many researchers express commonsense in terms of a relatively small set of relationships, e.g. [Ilievski et al.](https://arxiv.org/pdf/2101.04640.pdf) categorise relations into some 13 dimensions. The following is illustrative and not intended to be complete:

* similarity, e.g. similar-to, same-as
* distinctness, e.g. opposite-of, distinct-from
* taxonomic, e.g. is-a, kind-of, manner-of
* part-whole, e.g. part-of
* properties, e.g. colour, size, weight, texture, made-of
* cardinality, e.g. most mammals have 4 legs
* spatial, e.g. at-location, near-to, above, below, distance, area, volume
* temporal, e.g. interval, point-in-time, now, day, night
* ranges, e.g. small, medium, large, very small, slightly small
* comparative, e.g. smaller, larger, softer, louder
* causal, predicting direct consequences of some event/action
* pre- and post-conditions for actions

The set of relationships is open-ended and domain dependent, relying on graph algorithms for their interpretation. The meaning of terms is grounded in the interaction of communicating agents, e.g. if I bring some red balloons to your birthday party, I can be confident that you will agree that they are red rather than some other colour.
