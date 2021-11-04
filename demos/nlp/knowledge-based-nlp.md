# Knowledge-based NLP

This is a summary of the ideas and work plan for realising knowledge-based natural language processing with links to existing work.

## Background resources

Here are a few resources for further reading:

* [Wikipedia article on common sense reasoning](https://en.m.wikipedia.org/wiki/Commonsense_reasoning)
* [WordNet](https://wordnet.princeton.edu) which is a lexicon that includes a limited taxonomy of word senses.
* [COCA](https://www.english-corpora.org/coca/), a corpus of contemporary American English including word stems and part of speech tags
* [BNC](http://www.natcorp.ox.ac.uk), a corpus of contemporary British English including word stems and part of speech tags
* [NLP Progress repository](http://nlpprogress.com/english/common_sense.html), including the Winograd Schema Challenge, a dataset for common sense reasoning. It lists questions that require the resolution of anaphora: the system must identify the antecedent of an ambiguous pronoun in a statement. Models are evaluated based on accuracy. Here is an example:

*The trophy doesn’t fit in the suitcase because it is too big.*<br>
What is too big? Answer 0: the trophy. Answer 1: the suitcase

* [Bloom's taxonomy for educational goals](https://cft.vanderbilt.edu/guides-sub-pages/blooms-taxonomy/), this has the potential for use in distinguishing different kinds of knowledge and cognitive processes. 

![Bloom's taxonomy](https://cdn.vanderbilt.edu/vu-wp0/wp-content/uploads/sites/59/2019/03/27124326/Blooms-Taxonomy.jpg)<br>
courtesy of Vanderbilt University Center for Teaching.

A revised taxonomy uses the following terms for six cognitive processes: remember, understand, apply, analyse, evaluate and create. The authors further provide a taxomomy of the types of knowledge used in cognition: factual, conceptual, procedural, and metacognitive. See May Forrehand's [guide to the revised edition](https://cft.vanderbilt.edu/wp-content/uploads/sites/59/BloomsTaxonomy-mary-forehand.pdf).
