## Natural Language Dialogues and Situational Plans (under consideration)

This demo features a dialogue between three cognitive agents that represent a waiter at a restaurant, and two customers who are having dinner together, e.g. husband and wife. The language is predictable and the intent is well understood, making this a good scenario for exploring natural language processing, simple dialogues, reasoning about preferences, plans and episodic memories.

Natural language is processed a word at a time, and mapped to a chunk graph that represents the meaning. This involves a lexicon of words, a simplified treatment of parts of speech and gramatical categories, and the use of spreading activation for word sense disambiguation, and bindings for prepositional phrases and pronouns etc.

Here is an example dialogue involving a waiter and customer:

```
W: Good evening.
C: A table for two please.
W: Certainly. Just here, sir.
C: Could we sit by the window?
W: I'm sorry. The window tables are all reserved.
W: Are you ready to order, sir?
C: Yes. I'll have tomato soup for starters and my wife would like prawn cocktail.
W: One tomato soup and one prawn cocktail. What would you like for main course?
C: I'll have the plaice and my wife would like the shepherd's pie.
W: I'm afraid the plaice is off.
C: Oh dear. What do you recommend?
W: The steak pie is very good.
C: OK I'll have that.
W: Would you like anything to drink?
C: Yes, a bottle of red wine please.
```

*From the [English, the international language](https://www.english-the-international-language.com/edrst.php) website.*

The food and drinks menu and the special dishes for the day could be taken from a real restaurant. The food and drink could be classified with a taxonomy along with a model of the customer's preferences. The choices made by the customer could involve a random element rather than always picking the same things. The above example assumes a husband and wife, and could be extended to include a dialogue between them, as well as allowing for each of them to speak individually to the waiter.

This demo could exploit the Web Speech API to use speech synthesis for the waiter and customer. Ideally, a series of pictures would be displayed to show what's going on, e.g. a photo of a waiter welcoming you to the restaurant, asking you for an order, the menu, the plate of food when it arrives and the bill at the end. Note that the agent playing the role of the customer will have to read the menu and construct a mental model of it.

A log of goals and rule execution would be shown, however, it isn't yet clear how to show the natural language processing pipeline in operation.

## Blocks World

A second idea is to use natural language to communicate with a cognitive agent that controls a robot in a blocks world, e.g. “Put the yellow disc on the green triangle. Move the green triangle next to the red square. Where is the yellow disc?”. This is a more restricted environment and would be simpler as an initial demo. This demo would re-use the robot arm developed for the smart factory demo, and 

### Implementation ideas

Natural language processing is an important challenge for Cognitive AI.  An open question is to what extent natural language utilises the processing pipeline for perception as opposed to the rule engine of cognition. A synthesis of the two in collaboration seems like a good solution to explore. The pipeline can be envisaged as a chain of communicating agents that have different responsibilities, and together advance the processing one word at a time, with the ability to kick off deliberative reasoning via the rule engine.

As an example, it may not be possible to select the correct part of speech for a word until the next word is processed, and this may be influenced by the choice of word sense based upon the semantic context. The agents thus need some limited working memory to allow for deferred decisions. However, agents should avoid complex search algorithms, apart from utilising what's practical in terms of graph algorithms executed in the cortex.

The taxonomy, and the customer preferences could be modelled using chunks. Likewise, for a generic plan for a meal with subplan for the different stages, including variations such as asking for a window table, or a table by the open fire.

The utterances from the example dialogues can be used to populate the lexicon, and to devise the target chunk graphs corresponding to each utterance. The natural language input processing then corresponds to generating the chunk graph from the word sequence for a given utterance, and vice versa for natural language generation.

Written language is a very recent phenomena compared to spoken language in respect to the evolution of modern humans. As such, it makes sense to ignore features specific to writing, e.g. upper/lower case and punctuation, and to therefore treat each utterance as a sequence of words independent of such features.

Common abbreviations such as "I'll" can be treated as a single word that is distinct from the word "ill", given that these have different pronunciations. However, subsequent processing may be easier if the abbreviation is first expanded to its constituent parts, in this case "I will".

The situational context can be used to resolve references, e.g. "sir", "madam", "you", "my", etc. Likewise, the restaurant meal plan includes slots to be filled, e.g. drinks and different courses. The dialogue also needs to take into account what was recently said at both the semantic and linguistic levels.

Natural language processing can be modelled as a series of stages that form a pipeline with feed forward and backward between successive stages. As an example, each word may have lexical entries with multiple parts of speech, that in turn may be associated with multiple meanings. The statistically informed guesses for which choices to make at any point in the processing will depend on the previous words in the utterance and feedback from semantic processing.  The aim is to do as much work as practical each word at a time, rather than waiting until the end of the utterance, as that would make implausible cognitive demands on short term memory.

Linguistic centred approaches like [HPSG](https://en.wikipedia.org/wiki/Head-driven_phrase_structure_grammar) emphasise rich lexical information as a way to describe constraints between word classes. By contrast, the cognitive approach used in this demo focuses on rich semantic information expressed as chunks, and the use of semantic processing ranging over static knowledge as well as dynamic knowledge relating to the current situation, using a combination of graph rules and graph algorithms.

Grammatical structure is treated in terms of dependencies, e.g. adjectives on nouns, and different slots for verbs, e.g. subject and object. Word sense ambiguities are resolved through spreading activation, and likewise for resolution of references, and for prepositional attachment. This corresponds to a cognitive treatment of statistical parsing, where the statistics are expressed at a sub-symbolic level.

Traditional approaches to statistical parsing involve the need for training against very large datasets. By comparison humans are able to learn from relatively few examples. This demo will take a pragmatic approach as a starting point for further work. Future demos will look at how to handle previously unseen words and phrases, in terms of learning from the context, and by asking questions during a dialogue.
