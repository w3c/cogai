# Knowledge-based NLP

This is a summary of the ideas and work plan for realising knowledge-based natural language processing with links to existing work.

Natural language understanding involves mapping words into a graph model for the meaning of an utterance. The amount and kinds of reasoning involved depends on the context and the agent's current goals. We can distinguish between **System 1** (decision trees and analogical reasoning) and **System 2** (slower sequential rule-based reasoning).

Common sense reasoning covers a broad range of everyday knowledge including time, space, physical interactions, theory of mind and so forth. This includes causal models, e.g. things fall if they are not supported, and objects can't fit into containers smaller than themselves. Young children learn a lot of this for themselves through play and interacting with others.

Children similarly steadily expand their vocabulary, learning words along with their meaning. New words stimulate System 2 reasoning and updates to the lexicon and taxonomic knowledge. Misunderstandings may occur, be noticed and corrected.

We need to gather a collection of utterances and work on a subset of common sense knowledge sufficient for understanding those utterances. It is not a goal to develop a comprehensive taxonomy of common sense knowledge, and the emphasis is rather on demonstrating human-like understanding, reasoning and learning. Nonetheless, it will be helpful to develop visual tools to support browsing, querying and reasoning, including taxonomic knowledge and the graph models constructed in episodic memory.

People are generally quick to resolve semantic ambiguities in utterances. 

* What meaning does this word have in this utterance?
* What is the meaning of this pronoun or noun phrase?
* How does this preposition bind to the phrase structure?

This points to the need for efficient processing to identify (say) whether an adjective is consistent with a particular meaning of the associated noun. In principle, a purely knowledge based approach can be combined with statistical approaches based upon word colocations and a model of attention, e.g. verbs and nouns.

Verbs map to actions or relationships with a flexible set of arguments that are filled by noun phrases and prepositions. The mapping further depends on the focus of the utterance, e.g. *Mary bought the book* vs *The book was bought by Mary*. The tense is mapped to temporal annotations, which may refer to another event or interval, e.g. *John was doing the washing up when Mary rang the door bell*, which describes an activity that was ongoing when another event occurred.

Pronouns and noun phrases either introduce or refer to thing(s). This involves a search through episodic memory that holds the representation of the meaning. Search can also occur through the phrase structure, looking for potential antecedents, e.g. *Susan was looking for her door key*, where *her* refers to *Susan*.

Taxonomic knowledge licenses the use of related words, e.g. "red flowers", given that flowers come in different colours. This can be used to select the most likely meaning of a word that has multiple possible meanings. The processing is incremental, i.e. word by word, and may involve progressive refinement as further evidence is observed.

Concepts are based on natural language semantics, and may have fuzzy context dependent meanings. An example is `warm` which is relative to `hot` and `cold`, rather than to specific temperatures.  Fuzzy meanings may be related to functions over a set of things and a given thing may be described as `warm` (60%) and `cold` (40%). This is connected to human reasoning based upon consideration of a set of examples.

Reasoning involves graph algorithms and rulesets that act over episodic and semantic memory. In principle, these can be described as services as part of taxonomic graphs and invoked as needed. Decision trees modeled as discrimination networks can be used for efficient selection in any given context.

A small set of examples is needed to provide a proof of concept demonstrator for cognitive natural language understanding. This then needs to be followed by a proof of concept demonstrator for cognitive natural language generation, as understanding and generation are closely coupled.

## Background resources
<details>
   <summary>Here are a few resources for further reading:</summary>

* [Wikipedia article on common sense reasoning](https://en.m.wikipedia.org/wiki/Commonsense_reasoning), which they defined as a human-like ability to make presumptions about the type and essence of ordinary situations humans encounter every day. These assumptions include judgments about the nature of physical objects, taxonomic properties, and peoples' intentions. A device that exhibits commonsense reasoning might be capable of drawing conclusions that are similar to humans' folk psychology (humans' innate ability to reason about people's behavior and intentions) and naive physics (humans' natural understanding of the physical world).
* [ACL 2020 Commonsense Tutorial](https://homes.cs.washington.edu/~msap/acl2020-commonsense/) which provides a survey of work on applying language models such as BERT and GPT-3 to commonsense, noting that language models mostly pick up lexical cues, and that no model actually solves commonsense reasoning to date. Language models lack an understanding of some of the most basic physical properties of the world. 
* [WebChild](http://gerard.demelo.org/papers/csk-webchild.pdf), automatically constructed commonsense knowledgebase extracted by crawling web text collections, using semisupervised learning to classify word senses according to WordNet senses.
* [ATOMIC](https://arxiv.org/abs/1811.00146) knowledgebase describing cause and effect of everyday situations. ATOMIC focuses on inferential knowledge organized as typed if-then relations with variables (e.g., "if X pays Y a compliment, then Y will likely return the compliment").
* [WordNet](https://wordnet.princeton.edu) which is a lexicon that includes a limited taxonomy of word senses.
* [COCA](https://www.english-corpora.org/coca/), a corpus of contemporary American English including word stems and part of speech tags
* [BNC](http://www.natcorp.ox.ac.uk), a corpus of contemporary British English including word stems and part of speech tags
* [Linguistics in the age of AI](https://direct.mit.edu/books/book/5042/Linguistics-for-the-Age-of-AI) by Marjorie McShane and Sergei Nirenburg, Cognitive Science Department at Rensselaer Polytechnic Institute.
* [ConceptNet](https://en.m.wikipedia.org/wiki/ConceptNet) is a [crowd sourced semantic network](https://github.com/commonsense/conceptnet) now hosted on GitHub. [ConceptNet5](https://github.com/commonsense/conceptnet5) is multilingual and based on [34 relationships](https://github.com/commonsense/conceptnet5/wiki/Relations).
* [NLP Progress repository](http://nlpprogress.com/english/common_sense.html), including the Winograd Schema Challenge, a dataset for common sense reasoning. It lists questions that require the resolution of anaphora: the system must identify the antecedent of an ambiguous pronoun in a statement. Models are evaluated based on accuracy. Here is an example:

    *The trophy doesn’t fit in the suitcase because it is too big.*<br>
What is too big? Answer 0: the trophy. Answer 1: the suitcase

* [Bloom's taxonomy for educational goals](https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/), this has the potential for use in distinguishing different kinds of knowledge and cognitive processes.  A revised taxonomy uses the following terms for six cognitive processes: remember, understand, apply, analyse, evaluate and create. The authors further provide a taxonomy of the types of knowledge used in cognition: factual, conceptual, procedural, and metacognitive. See Mary Forrehand's [guide to the revised edition](https://cft.vanderbilt.edu/wp-content/uploads/sites/59/BloomsTaxonomy-mary-forehand.pdf).

    <p align="center"><img alt="Bloom's taxonomy" src="https://cdn.vanderbilt.edu/vu-wp0/wp-content/uploads/sites/59/2019/03/27124326/Blooms-Taxonomy.jpg" width="70%"><br>
   <em>Courtesy of Vanderbilt University Center for Teaching</em></p>

Antoine Bosselut claims:

> * Commonsense knowledge is immeasurably vast, making it impossible to manually enumerate
> * Commonsense knowledge is often implicit, and often can’t be directly extracted from text
> * Commonsense knowledge resources are quite sparse, making them difficult to extend by only learning from examples
   
Yet according to Ernest Davis, children acquire a good grasp of commonsense by the time they are seven. It therefore makes sense to try to mimic human knowledge and reasoning. We need to move beyond lexical models of knowledge and to consider how children generalise from individual examples, and apply this knowledge to make sense of what they read.
   
How can we partition commonsense knowledge into areas with strong internal dependencies, and weak external dependencies? Can we sort such areas into a dependency graph that gives us an ordering of what needs to be learned before proceeding to other areas? Examples of such areas include social, physical and temporal reasoning.
   
Benchmarks are one way to assess performance, but fail to explain how an agent understands and reasons. That requires a conversational interface that allows understanding to be probed through questions.
</details>

# Examples

This section considers a small set of example utterances along with the supporting knowledge and reasoning.
