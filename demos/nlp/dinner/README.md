# Dinner Demo

This is a natural language demo for a dialogue between a customer and a waiter at a restaurant. The demo is based around the following sample dialogue:

<blockquote>
W: Good evening.<br>
C: A table for one please.<br>
W: Certainly. Just here?<br>
C: Could I sit by the window?<br>
W: I'm sorry. The window tables are all reserved.<br>
W: Are you ready to order?<br>
C: Yes. I'll have tomato soup for starters.<br>
W: A tomato soup. What would you like for the main course?<br>
C: I'll have the plaice.<br>
W: I'm afraid the plaice is off.<br>
C: Oh dear. What do you recommend?<br>
W: The steak pie is very good.<br>
C: OK I'll have that.<br>
W: Would you like anything to drink?<br>
C: Yes, a glass of red wine please.
</blockquote>

*Adapted from the [English, the international language](https://www.english-the-international-language.com/edrst.php) website.*

The demo involves separate cognitive agents for the customer and for the waiter, that run within a web page, and the dialogue shown as a text chat. The demo combines declarative and procedural knowledge about typical behaviour for having dinner at a restaurant. The natural language is handled word by word, avoiding backtracking, and using concurrent syntactic and semantic processing. The dialogue text is preprocessed to replace "I'll" with "I will" and "I'm" with "I am", etc., before being coerced to lower case, stripping out punctuation and splitting into an array of words. This mimics hearing as compared to reading, along with common abbreviations.

Each agent takes its turn to speak, mapping a model of its communication intent into text, and when listening, mapping the text it hears back into an internal model of the meaning. The communication intent is determined by the current state of execution of the dinner plan. This corresponds to:

1. Greetings and welcome
2. Finding a table
3. Reviewing the menu
4. Placing an order
5. Thanking the waiter
6. Asking for the bill
7. Paying the bill
8. Farewells and please come again

Each step supports sub-plans with variations, e.g. when a window table or a specific dish is unavailable. In principle, a random number generator could be used to select between the variations when executing the dinner plan. The plan is based upon a causal model, and future work could explore how an agent can revise the plan to suit changing circumstances.

## Syntactic Processing

Each word is mapped to a word sense and part of speech. In most cases in the demo, this is unambiguous, where the lexicon provides multiple possibilities, a graph algorithm is invoked to find the one that best fits the context.

A shift-reduce parser is used to process the syntactic structure of an utterance. This uses a queue as a working memory, together with functions that deal with common structures, e.g. noun phrases consisting of a determiner, adjectives and nouns. Queue entries are reduced when building the chunks that describe the word dependencies in the utterance. Syntactic Processing goes hand in hand with semantic processing, e.g. resolving the meaning of a noun phrase when it is completed. Verbs may have multiple slots as well as the subject and object. These are filled by prepositional phrases. 

Prepositions can in principle attach to the subject, the verb, the object or another preposition. The syntactic processor identifiers potential attachment points for evaluation by the semantic processor via queueing goals that trigger rules to invoke graph algorithms. Each choice is given a score, and the best choice is found asynchronously as the thread for each choice completes and reports back to the syntactic processor.

The semantic interpretation is built incrementally as the utterance is processed, culiminating in queuing a goal to decide what action to take.

## Semantic Processing

This can take two forms: the first is the direct invocation of graph algorithms, e.g. to select the best word sense in the current context. The second is where the rule engine is invoked by queuing a goal. The rules this triggers can access and update declarative knowledge, as well as invoking graph algorithms that are designed for natural language understanding or natural language generation.

## Natural Language Generation

Each cognitive agent will have a communication intent based upon the current state of the dinner plan according to that agent. This intent is mapped progressively into a syntactic structure and then into a sequence of words to be spoken.

## Declarative Knowledge

To model the knowledge some mindmaps were prepared as incomplete illustrations of what needs to be represented.

The following diagram describes some of the concepts needed to express a plan for a restaurant dinner.

![dinner plan](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/dinner-plan.png)

The following diagram describes some of the concepts used in the dialogue between the customer and the waiter,

![dialogies](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/dialogues.png)

The following diagram describes some of the concepts needed to describe choices of drinks:

![drinks](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/drinks.png)

The following diagram describes some of the concepts needed to describe choices of food:

![food](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/food.png)
