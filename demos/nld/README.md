## Natural Language Dialogues and Situational Plans (under consideration)

This demo features a dialogue between three cognitive agents represent a waiter at a restaurant, and two customers who are having dinner together. The language is predictable and the intent is well understood, making this a good scenario for exploring natural language processing, simple dialogues, reasoning about preferences, plans and episodic memories.

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
C:Yes, a bottle of red wine please.
```

From the [English the international language](https://www.english-the-international-language.com/edrst.php) website.

The food and drinks menu and the special dishes for the day could be taken from a real restaurant. The food and drink could be classified with a taxonomy along with a model of the customer's preferences. The choices made by the customer could involve a random element rather than always picking the same things. The above example assumes a husband and wife, and could be extended to include a dialogue between them, as well as allowing for each of them to speak individually to the waiter.

### Implementation ideas

The taxonomy, and the customer preferences could be modelled using chunks. Likewise, for a generic plan for a meal with subplan for the different stages, including variations such as asking fo a window table, or a table by the open fire.

The utterances from the example dialogues can be used to populate the lexicon, and to devise the target chunk graphs corresponding to each utterance. The natural language input processing then corresponds to generating the chunk graph from the word sequence for a give utterance, and the reverse process for natural language generation.

Written language is a very recent phenomena compared to spoken language in respect to the evolution of modern humans. As such, it makes sense to ignore features specific to writing, e.g. upper/lower case and punctuation, and to therefore treat each utterance as a sequence of words independent of such features. Common abbreviations such as "I'll" can be treated as single word that is distinct from the word "ill", given that these have different pronunciations.

The situational context can be used to resolve references, e.g. "sir", "madam", "you", "my", etc. Likewise, the restaurant meal plan includes slots to be filled, e.g. drinks and different courses. The dialogue also needs to take into account what was recently said at both the semantic and linguistic levels.

Natural language processing can be modelled as a series of steps that form a pipeline with feed forward and backward. As an example each word may have lexical entries with multiple parts of speech, that in turn may be associated multiple meanings. The statistically informed guesses for which choices to make will depend on the previous words in the utterance and feedback from semantic processing.  The aim is to do as much work as practical each word at a time, rather than waiting until the end of the utterance, as that would make implausible cognitive demands on short term memory.

Grammatical structure is treated in terms of dependencies, e.g. adjectives on nouns, and different slots for verbs, e.g. subject and object. Word sense ambibiguities are resolved through spreading activation, and likewise for resolution of references, and for prepositional attachment. This corresponds to a cognitive treatment of statistical parsing.

Future demos will look at how to handle previously unseen words and phrases, learning from the context, and by asking questions during a dialogue.
