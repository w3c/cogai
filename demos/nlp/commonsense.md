# Common Sense Reasoning

Common sense is needed to support natural language interaction and everyday reasoning.

* [Knowledge-based NLP](knowledge-based-nlp.md)

Common sense reasoning covers a broad range of everyday knowledge including time, space, physical interactions, theory of mind and so forth. This includes causal models, e.g. things fall if they are not supported, and objects can't fit into containers smaller than themselves. Young children learn a lot of this for themselves through play and interacting with others.

Children similarly steadily expand their vocabulary, learning words along with their meaning. New words stimulate System 2 reasoning and updates to the lexicon and taxonomic knowledge. Misunderstandings may occur, be noticed and corrected.

We need to gather a collection of utterances and work on a subset of common sense knowledge sufficient for understanding those utterances. It is not a goal to develop a comprehensive taxonomy of common sense knowledge, and the emphasis is rather on demonstrating human-like understanding, reasoning and learning. Nonetheless, it will be helpful to develop visual tools to support browsing, querying and reasoning, including taxonomic knowledge and the graph models constructed in episodic memory.

Antoine Bosselut claims:

> * Commonsense knowledge is immeasurably vast, making it impossible to manually enumerate
> * Commonsense knowledge is often implicit, and often can’t be directly extracted from text
> * Commonsense knowledge resources are quite sparse, making them difficult to extend by only learning from examples
   
Yet according to Ernest Davis, children acquire a good grasp of commonsense by the time they are seven. It therefore makes sense to try to mimic human knowledge and reasoning. We need to move beyond lexical models of knowledge and to consider how children generalise from individual examples, and apply this knowledge to make sense of what they read.
   
Susie Loraine claims that typical six year olds have a 2,600 word expressive vocabulary (words they say), and a receptive vocabulary (words they understand) of 20,000–24,000 words.

Given a six year old has lived for just over 2000 days, this implies vocabulary growth of ten or more words a day.  Assuming 10 to 100 common sense facts per word, that amounts to 200,000 to 2,000,000 facts about the world. This compares to ConceptNet with 1.6 million facts interrelating 300,000 nodes. This is a simplification as commonsense involves reasoning as well as facts, and this allows children to generalise from specific examples.
   
How can we partition commonsense knowledge into areas with strong internal dependencies, and weak external dependencies? Can we sort such areas into a dependency graph that gives us an ordering of what needs to be learned before proceeding to other areas? Examples of such areas include social, physical and temporal reasoning.
   
Benchmarks are one way to assess performance, but fail to explain how an agent understands and reasons. That requires a conversational interface that allows understanding to be probed through questions.
