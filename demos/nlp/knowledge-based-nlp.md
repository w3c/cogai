# Knowledge-based NLP

This is a summary of the ideas and work plan for realising knowledge-based natural language processing with links to existing work.

Natural language understanding involves mapping words into a graph model for the meaning of an utterance. The amount and kinds of reasoning involved depends on the context and the agent's current goals. We can distinguish between System 1 (decision trees and analogical reasoning) versus System 2 (slower sequential rule-based reasoning).

Common sense reasoning covers a broad range of everyday knowledge including time, space, physical interactions, theory of mind and so forth. This includes causal models, e.g. things fall if they are not supported, and objects can't fit into containers smaller than themselves. Young children learn a lot of this for themselves through play and interacting with others.

Children similarly steadily expand their vocabulary, learning words along with their meaning. New words stimulate System 2 reasoning and updates to the lexicon and taxonomic knowledge. Misunderstandings may occur, be noticed and need to be corrected.

We need to gather a collection of utterances and work on a subset of common sense knowledge sufficient for understanding those utterances. It is not a goal to develop a comprehensive taxonomy of common sense knowledge, and the emphasis is rather on demonstrating human-like understanding, reasoning and learning. Nonetheless, it will be helpful to develop visual tools to support browsing, querying and reasoning.

## Background resources

Here are a few resources for further reading:

* [Wikipedia article on common sense reasoning](https://en.m.wikipedia.org/wiki/Commonsense_reasoning), which they defined as a human-like ability to make presumptions about the type and essence of ordinary situations humans encounter every day. These assumptions include judgments about the nature of physical objects, taxonomic properties, and peoples' intentions. A device that exhibits commonsense reasoning might be capable of drawing conclusions that are similar to humans' folk psychology (humans' innate ability to reason about people's behavior and intentions) and naive physics (humans' natural understanding of the physical world).
* [WordNet](https://wordnet.princeton.edu) which is a lexicon that includes a limited taxonomy of word senses.
* [COCA](https://www.english-corpora.org/coca/), a corpus of contemporary American English including word stems and part of speech tags
* [BNC](http://www.natcorp.ox.ac.uk), a corpus of contemporary British English including word stems and part of speech tags
* [Linguistics in the age of AI](https://direct.mit.edu/books/book/5042/Linguistics-for-the-Age-of-AI) by Marjorie McShane and Sergei Nirenburg, Cognitive Science Department at Rensselaer Polytechnic Institute.
* [ConceptNet](https://en.m.wikipedia.org/wiki/ConceptNet) is a [crowd sourced semantic network](https://github.com/commonsense/conceptnet) now hosted on GitHub.
* [NLP Progress repository](http://nlpprogress.com/english/common_sense.html), including the Winograd Schema Challenge, a dataset for common sense reasoning. It lists questions that require the resolution of anaphora: the system must identify the antecedent of an ambiguous pronoun in a statement. Models are evaluated based on accuracy. Here is an example:

    *The trophy doesn’t fit in the suitcase because it is too big.*<br>
What is too big? Answer 0: the trophy. Answer 1: the suitcase

* [Bloom's taxonomy for educational goals](https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/), this has the potential for use in distinguishing different kinds of knowledge and cognitive processes. 

    ![Bloom's taxonomy](https://cdn.vanderbilt.edu/vu-wp0/wp-content/uploads/sites/59/2019/03/27124326/Blooms-Taxonomy.jpg)<br>
        *Courtesy of Vanderbilt University Center for Teaching*

    A revised taxonomy uses the following terms for six cognitive processes: remember, understand, apply, analyse, evaluate and create. The authors further provide a taxonomy of the types of knowledge used in cognition: factual, conceptual, procedural, and metacognitive. See Mary Forrehand's [guide to the revised edition](https://cft.vanderbilt.edu/wp-content/uploads/sites/59/BloomsTaxonomy-mary-forehand.pdf).
