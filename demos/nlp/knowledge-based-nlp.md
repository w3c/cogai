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

Taxonomic knowledge licenses the use of related words, e.g. "red flowers", given that flowers come in different colours. This can be used to select the most likely meaning of a word that has multiple possible meanings. The processing is incremental, i.e. word by word, and may involve progressive refinement as further evidence is observed. Semantic priming biases the selection of meanings based upon the preceding episodic context. In principle, this can be implemented using spreading activation.

Concepts are based on natural language semantics, and may have fuzzy context dependent meanings. An example is `warm` which is relative to `hot`, `cool` and `cold`, rather than to specific temperatures.  Fuzzy meanings may be related to functions over a set of things and a given thing may be described as `warm` (60%) and `cold` (40%). This is connected to human reasoning based upon consideration of a set of examples.

Reasoning involves graph algorithms and rulesets that act over episodic and semantic memory. In principle, these can be described as services as part of taxonomic graphs and invoked as needed. Decision trees modeled as discrimination networks can be used for efficient selection in any given context.

A small set of examples is needed to provide a proof of concept demonstrator for cognitive natural language understanding. This then needs to be followed by a proof of concept demonstrator for cognitive natural language generation, as understanding and generation are closely coupled.

Further background is given in [Commonsense Reasoning](commonsense.md), a preliminary investigation of how commonsense knowledge and reasoning can be implemented with chunks

# Examples

This section considers a small set of example utterances along with the supporting knowledge and reasoning.
