# Dinner Demo

This is a natural language demo for a dialogue between a customer and a waiter at a restaurant. The demo is based around the following sample dialogue:

<blockquote>
W: Good evening.<br>
C: A table for one please.<br>
W: Certainly. Just here?<br>
C: Could I sit by the window?<br>
W: I'm sorry. The window tables are all reserved.<br>
C: This table will be fine.<br>
W: Are you ready to order?<br>
C: Yes. I'll have tomato soup for starters.<br>
W: A tomato soup. What would you like for the main course?<br>
C: I'll have the plaice.<br>
W: I'm afraid the plaice is off.<br>
C: Oh dear. What do you recommend?<br>
W: The steak pie is very good.<br>
C: OK I'll have that.<br>
W: Would you like anything to drink?<br>
C: Yes, a glass of red wine.<br>
W: Is that all?<br>
C: Yes, thanks.
</blockquote>

*Adapted from the [Just Good English](https://justgoodenglish.com/eating-out/) website.*

The demo involves separate cognitive agents for the customer and for the waiter, that run within a web page, where the dialogue is shown as a text chat. The demo combines declarative and procedural knowledge about typical behaviour for having dinner at a restaurant. The natural language is handled word by word, avoiding backtracking, and using concurrent syntactic and semantic processing. The dialogue text is preprocessed to replace "I'll" with "I will" and "I'm" with "I am", etc., before being coerced to lower case, stripping out punctuation and splitting into an array of words. This mimics hearing as compared to reading, along with common abbreviations.

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

Apart from greetings and farewells, the dialogue consists of requests and responses that deal with each stage of the dinner plan. Negative responses trigger the search for an alternative, e.g. to accept the table the waiter originally suggested, or to pick a different dish if your first choice isn't available. The menu lists different dishes for each course. The demo could involve the customer reading through the menu, or that could be made implicit with the choices already placed into declarative memory. The customer could mentally review the choices to rank them based upon some preferences, and make a random selection if the top choices are equally ranked. This process updates the facts in the declarative memory. The act of having dinner is a situation associated with a particular context in episodic memory.

Social etiquette needs to be adhered to during the dialogue. The customer and the waiter are peers in social standing. This should be acknowledged at the start and end of the dialogue, e.g. by adding a "please", through the use of conditional verbs that signify that you realise that a request may be declined, and through the addition of "thanks" to a yes/no question. In the middle of the dialogue you can be more direct, e.g. "I'll have" rather than "I would like". When declining a request, the waiter apologises and offers an explanation, e.g. "the tables are all reserved" or "the plaice is off" (as in off the menu). The customer should acknowledge the discomfort this brings to the waiter when having to give bad news, e.g. "oh dear" or "that's a pity". The example dialogue goes further, as the customer asks the waiter for advice, which is a way of making the waiter feel to be of greater value in the dialogue. However that isn't needed if the customer already has a second choice in mind.

## Syntactic Processing

Each word is mapped to a word sense and part of speech. In most cases in the demo, this is unambiguous, where the lexicon provides multiple possibilities, a graph algorithm is invoked to find the one that best fits the context.

A shift-reduce parser is used to process the syntactic structure of an utterance. This uses a queue as a working memory, together with functions that deal with common structures, e.g. noun phrases consisting of a determiner, adjectives and nouns. Queue entries are reduced when building the chunks that describe the word dependencies in the utterance. Syntactic Processing goes hand in hand with semantic processing, e.g. resolving the meaning of a noun phrase when it is completed. Verbs may have multiple slots as well as the subject and object. These are filled by prepositional phrases. 

Prepositions can in principle attach to the subject, the verb, the object or another preposition. The syntactic processor identifies potential attachment points for evaluation by the semantic processor via queueing goals that trigger rules to invoke graph algorithms. Each choice is given a score, and the best choice is found asynchronously as the thread for each choice completes and reports back to the syntactic processor.

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
