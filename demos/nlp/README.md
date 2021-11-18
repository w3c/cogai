# Natural Language Processing

Humans are unique amongst all other animals on the Earth in respect to our amazing ability to communicate via language. Speech evolved at least a million years ago, and perhaps even further back in time. By contrast written language is very recent and dates back just a few thousand years. Our brains are similar in many respects to other mammals and primates in particular. This suggests that language must be largely based on existing mechanisms as there simply hasn't been the time to evolve a radical new neural system since we split from other primates.

The approach to be explored treats natural language understanding in terms of a pipeline through successive levels of abstraction:

* Phonological
* Morphological
* Words
* Phrase structure
* Semantics
* Pragmatics

Processing occurs concurrently across all stages, and incrementally, as words are scanned one by one. This seeks to mimic data from gaze tracking when human subjects are reading text. Further evidence comes from the way we are able to complete each other's sentences, and to interrupt and ask clarifying questions before the current speaker finishes a sentence.

Language is highly ambiguous at a syntactic level, yet we understand it with little apparent effort and without backtracking. An exception is so called garden path sentences where something later on reveals that you have misinterpreted what you read earlier causing you to look back. Such cases are very rare as language is usually a co-operative exchange between the speaker and listener, following [Grice's maxims](https://en.wikipedia.org/wiki/Cooperative_principle).

Word senses can be inferred using semantic priming, involving spreading activation and statistics relating to part of speech. This feeds analysis of phrase structure, where simple shift-reduce parsing is high effective, when used in combination with concurrent semantic processing. This constructs a graph denoting the meaning, using processing to resolve the interpretation of nominal groups, prepositional attachment and so forth. Search through alternatives occurs using concurrent asynchronous threads of reasoning. Natural language generation is similar, working in reverse, and using shared statistics.

A [series of demos](#demos) are planned to explore how natural language understanding and generation can be implemented in a way that is cognitively plausible, and to satisfy the following goals:

* A permissive grammar that maps variants in input to the same syntactic graph, or at least minimises the effort for interpreting variations in the syntactic graph that don't alter the meaning.
* To minimise the requirements on working memory and allow incremental parsing
* To offload cognition where possible by using a pipeline that operates in parallel to the cognitive rule engine, and makes use of graph algorithms for disambiguation.
* To make use of statistical information to guide choices, e.g. a bigram HMM for part of speech, in combination with the dialogue history and semantic knowledge
* To clarify how  information is handled at different stages of the pipeline
* To gather statistics from natural language understanding (competence) that can then be applied to natural language generation (performance)
* To incrementally generate the semantic graph concurrently with syntactic processing
* To gather information on previously unknown words and mimic how children learn language

That is rather a lot of goals to fulfil, and the demos will need to focus on just a few initially, and gradually work towards fulfilling the rest of them!

## Different kinds of ambiguity 

Natural language is typically highly ambiguous, although this is usually unnoticed as we are very good at selecting the intended meaning despite many possible parse trees. 

A good backgrounder is Ernest Davis's [notes on ambiguity](https://cs.nyu.edu/faculty/davise/ai/ambiguity.html). He distinguishes the following categories:

* **Lexical ambiguity** where words have multiple meanings, e.g. "book me a flight" vs "pass me that book".
* **Syntactic ambiguity** due to multiple syntactic ways to attach prepositions, conjunctions, and to group a sequence of nouns, e.g. "Sally ate pizza with Wendy", where *with* could in principle attach either to *Sally* or to *pizza*, whilst in "John sent Mary an invitation for dinner on Tuesday ", the two prepositions could in principle attach to the subject, the verb, the object or the other preposition. Davis notes that attachments cannot cross over other attachments, i.e. they behave like properly nested brackets in programming languages.
* **Semantic ambiguity** involving the intended meaning, e.g. "John and Mary are married", which leaves it unclear whether they are married to each other or to someone else. Some names can be used for a specific individual or to a class, e.g. "The dog is barking" refers to a specific dog, whilst "The dog is a domestic animal" refers to the species.
* **Anaphoric ambiguity** references to something mentioned before when there is more than one possible match, e.g. "Sally invited Sarah to visit, and she offered her lunch", where the intention is she = Sally and her = Sarah. The thing referenced may not have been mentioned before, and needs to be interpreted in context, e.g. "I fell ill at the office and they told me to go home and rest".
* **Non-literal speech**, e.g. "The White House today announced ...", meaning the spokesperson for the American President. "It's raining cats and dogs", using a metaphor to indicate heavy rain. Metaphors are common in everyday language.
* **Ellipsis** the omission of words needed for grammatical completion that are understood in context, e.g. "I am alergic to tomatoes. Also fish."

Davis suggests the following techniques for resolving ambiguity:

* **Frequency**, i.e. to pick the most common meaning of a word, either in general, or in context. This seems amenable to spreading activation and concept strengths.
* **Semantic constraints**, e.g. "the bat flew around me" implying the animal rather than a wooden bat.
* **Recency** for resolving anaphora. Davis notes that 85% of the time the referent is the most recent matching object.
* **Parallel structure for anaphora**, e.g. "John met Jim on the street and he invited him to to go to the pub", where he = John and him = Jim.
* **World knowledge**, e.g. "I knocked on the door of the house with red shutters", where you knock on a door to request admittance, and the shutters are on the windows of the house.

Much of the above implies that ambiguities are resolved as part of the process of understanding, which therefore needs to be carried out concurrently with syntactic processing.

Natural language allows some constituents to be moved around without changing the meaning, e.g.

```
John gave Janet a present on Sunday.
On Sunday, John gave Janet a present.
John on Sunday gave Janet a present.
Move the red disc to the right peg.
Move to the right peg the red disc.
I like apples and oranges.
I like oranges and apples.
The sweet red apple
The red sweet apple
```

These examples show that prepositions can be moved around, although it is preferable to place them after the thing to which they attach as progressive refinement of the intended meaning. The order also relates to the focus, i.e. the second example above focuses on what happened on Sunday rather than on John, Janet or the present.

Items in a conjunction may in some cases be order independent. Likewise for a sequence of adjectives.

## Research challenges

This is a summary of challenges to be worked through to realise practical cognitive NLU:

* Design and population of the lexicon, exploiting existing resources such as corpora and machine readable lexical resources such as WordNet.
* Choice of the tag set for part of speech, balancing the requirements for phrase structure parsing and robustness
* Dealing with the awkward cases that inevitably arise in real text, e.g. reported speech, sentence boundaries, ellipsis, idiomatic speech, foreign words, and so forth.
* Part of speech tagging based upon learning from annotated corpora
* Loose parsing that preserves positional information
* Assessing semantic consistency for word sense disambiguation, bindings for pronouns and nominal groups, as well as prepositional attachments

Semantic consistency could be approached from a statistical perspective using collocations, but given that we expect cognitive agents to have a rich understanding of the meaning of utterances, we also need to assess (for example) whether an adjective is meaningful for a given sense of a noun.  That points to the need for work on taxonomic knowledge that licenses such uses, along with how to extend such knowledge as new words or word meanings are encountered. 

Some people claim that taxonomic based NLP is impractical, and point to the success of self-supervised deep learning of language models, based on predicting masked words from a huge corpus of texts. However, this is far away from human-like NLP where agents can explain the meaning of words and reason with them. It is time to prove to such people that human-like cognition is practical, and to show how it can be scaled.

* [Knowledge-based NLP](./knowledge-based-nlp.md)

## Implementation

A simplified shift-reduce parser has been implemented that utilises a queue for syntactic processing and has methods that know about different aspects of syntactic structures.  The grammar is implicit in these methods which assume a small set of part of speech categories - much smaller than the [Stanford parser](https://nlp.stanford.edu/software/lex-parser.shtml). This is possible as the parser delegates much of the work to cognition, and avoids backtracking by committing to the choices that make the most sense at that point in the processing.

As the earlier section shows, to resolve ambiguity in natural language, you need to make sense of the meaning, and to do so concurrently with the syntactic processing. This essentially involves the use of declarative and procedural knowledge in the form of graphs, rules and graph algorithms. The parser can invoke these via directly invoking graph algorithms, e.g. in an unconscious resolution of lexical ambiguity, or through triggering conscious reasoning in respect to anaphora and prepositional attachment. These processes are asynchronous and run concurrently with syntactic processing.

The initial demo was chosen to explore the basic concepts, and future demos will address a larger vocabulary, an expanded grammar, and how statistics, dialogue history and semantic context can contribute to resolving ambiguity. This will be followed by work on [dialogues and natural language generation](../nld/README.md) .

## Demos

* [Towers of Hanoi](toh/README.md)
* [Dinner dialogue](https://www.w3.org/Data/demos/chunks/nlp/dinner/)
* [Shift-Reduce Parsing](https://www.w3.org/Data/demos/chunks/nlp/parsing/)
