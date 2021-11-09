# Common Sense Reasoning

Common sense is needed to support natural language interaction and everyday reasoning.

* [Knowledge-based NLP](knowledge-based-nlp.md)

Common sense reasoning covers a broad range of everyday knowledge including time, space, physical interactions, theory of mind and so forth. This includes causal models, e.g. things fall if they are not supported, and objects can't fit into containers smaller than themselves. Young children learn a lot of this for themselves through play and interacting with others.

Children similarly steadily expand their vocabulary, learning words along with their meaning. New words stimulate System 2 reasoning and updates to the lexicon and taxonomic knowledge. Misunderstandings may occur, be noticed and corrected.

We need to gather a collection of utterances and work on a subset of common sense knowledge sufficient for understanding those utterances. It is not a goal to develop a comprehensive taxonomy of common sense knowledge, and the emphasis is rather on demonstrating human-like understanding, reasoning and learning.

Scaling will be a matter of learning by being taught (lessons in the classroom) and interaction (in the playground) with humans and cognitive agents. In principle agents can be designed to learn faster than humans, without getting tired and losing concentration. Likewise, agents can be designed to interact with many people as a form of crowd-sourcing. Once agents have been well trained tehy will be trivially easy to clone.

It will be helpful to develop visual tools to support browsing, querying and reasoning, including taxonomic knowledge and the graph models constructed in episodic memory.

Antoine Bosselut claims:

> * Commonsense knowledge is immeasurably vast, making it impossible to manually enumerate
> * Commonsense knowledge is often implicit, and often can’t be directly extracted from text
> * Commonsense knowledge resources are quite sparse, making them difficult to extend by only learning from examples
   
Yet according to Ernest Davis, children acquire a good grasp of commonsense by the time they are seven. It therefore makes sense to try to mimic human knowledge and reasoning. We need to move beyond lexical models of knowledge and to consider how children generalise from individual examples, and apply this knowledge to make sense of what they read.
   
Susie Loraine claims that typical six year olds have a 2,600 word expressive vocabulary (words they say), and a receptive vocabulary (words they understand) of 20,000–24,000 words.

Given a six year old has lived for just over 2000 days, this implies vocabulary growth of ten or more words a day.  Assuming 10 to 100 common sense facts per word, that amounts to 200,000 to 2,000,000 facts about the world. This compares to ConceptNet with 1.6 million facts interrelating 300,000 nodes. This is a simplification as commonsense involves reasoning as well as facts, and this allows children to generalise from specific examples.
   
How can we partition commonsense knowledge into areas with strong internal dependencies, and weak external dependencies? Can we sort such areas into a dependency graph that gives us an ordering of what needs to be learned before proceeding to other areas? Examples of such areas include social, physical and temporal reasoning.
   
Benchmarks are one way to assess performance, but fail to explain how an agent understands and reasons. That requires a conversational interface that allows understanding to be probed through questions.

## Examples of Commonsense

Commonsense can often be expressed in natural language, e.g.

* things fall down unless supported by something else
* I am younger than my mother and father
* my head is part of my body
* a dog is a kind of mammal
* a thing can't fit into a container smaller than itself
* fragile things often break when they fall and hit the ground
* flowers are parts of plants, and their colour and shape depends on the plant

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
