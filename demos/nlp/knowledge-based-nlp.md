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

Concepts are based on natural language semantics, and may have fuzzy context dependent meanings. An example is `warm` which is relative to `hot`, `cool` and `cold`, rather than to specific temperatures.  Fuzzy meanings may be related to functions over a set of things and a given thing may be described as `warm` (60%) and `cool` (40%). This is connected to human reasoning based upon consideration of a set of examples.

Reasoning involves graph algorithms and rulesets that act over episodic and semantic memory. In principle, these can be described as services as part of taxonomic graphs and invoked as needed. Decision trees modeled as discrimination networks can be used for efficient selection in any given context.

A small set of examples is needed to provide a proof of concept demonstrator for cognitive natural language understanding. This then needs to be followed by a proof of concept demonstrator for cognitive natural language generation, as understanding and generation are closely coupled.

Further background is given in [Commonsense Reasoning](commonsense.md), a preliminary investigation of how commonsense knowledge and reasoning can be implemented with chunks

# Roadmap

This covers some ideas for working on knowledge-based NLP starting with NLU, which involves the following processing model:

1. Preprocess text to a sequence of lower case words, stripping punctuation and expanding common abbreviations, using the following word, if necessary, for disambiguation. Apostrophes are retained for candidate possessives.
2. Determine the part of speech for the current word using the preceding words and the following word as needed. This uses a small set of rules together with simple statistics, starting from the part of speech tags listed in the lexicon for this word.
3. Use the lexicon to identify the candidate word senses for the current word. Each word sense is also associated with the word stem and lexical attributes, e.g. possessive, number and gender. Note that word stems are associated with patterns that predict morphological regularities (word endings).
4. Use taxonomic and statistical knowledge to rank the candidate word senses, using the preceding words and the episodic record of their meaning.
5. Apply the shift-reduce rules to update the loose syntactic structure for the utterance.
6. When reducing the shift-reduce stack, applying knowledge-based processing to a) noun phrases, b) verbs, c) prepositions and d) conjunctions, as appropriate, to build the model of meaning of the utterance in episodic memory.

It isn't practical to codify knowledge for all of the English language, so we need to start by focusing on a small vocabulary that is sufficient for the utterances we want to include in early demonstrators. This potentially includes:

* English language versions of common sense facts and rules
* Examples for demonstrating common sense reasoning with the form: <statement, question, answer>
* Conversational dialogues such as ordering dinner at a restaurant, see existing demo
* Examples of lessons that teach and assess everyday knowledge and skills

A starting point would be to be to explore how taxonomic knowledge can be used to license usage in language, e.g. which adjectives can be used with given nouns. At the same time, it would be helpful to consider the kinds of graph models that are appropriate for representing the meaning of example utterances, and how this relates to the processing of noun phrases, verbs, prepositions and conjunctions.

Other work relates to evolving the syntactic processing, e.g. text pre-processor, part of speech tagger, lexicon, and shift-reduce parser. It may, for instance, make sense to expand the number of part of speech tags if that would simplify processing.

Plenty of work is needed on NLG and the desire to share knowledge across NLU and NLG.

## Examples

This section considers a small set of example utterances along with the supporting knowledge and reasoning.
