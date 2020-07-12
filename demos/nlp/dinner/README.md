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

One way to represent plans is as a sequence of goals:

```
# plan with info on when it is applicable
plan p1 {purpose dinner; at restaurant, start s1}
dinner-plan s1 {goal greetings; next s2}
dinner-plan s2 {goal find-table; next s3}
dinner-plan s3 {goal review-menu; next s4}
dinner-plan s4 {goal place-order; next s5}
dinner-plan s5 {goal thank-waiter; next s6}
dinner-plan s6 {goal ask-for-bill; next s7}
dinner-plan s7 {goal pay-bill; next s8}
dinner-plan s8 {goal farewells; finished p1}
```
Each goal may have subgoals, e.g. to find a table, indicating that you have a reservation and giving your name, or stating the number of places you need and your preferences for the table location. This can be handled via either a sub-plan or a set of rules that can adapt to the variations. The act of having dinner is a situation associated with a particular context in episodic memory. The reservation, number of people and the table preferences will depend on that context, e.g.

```
# 7pm reservation under the name "Smith" for a party of 2 at the Rose and Crown
dinner {@context c1; where rose-and-crown; party-size 2; reservation smith; time 7pm}
```

### Speech acts

Apart from greetings and farewells, the dialogue consists of requests and responses that deal with each stage of the dinner plan. Negative responses trigger the search for an alternative, e.g. to accept the table the waiter originally suggested, or to pick a different dish if your first choice isn't available. The menu lists different dishes for each course. The demo could involve the customer reading through the menu, or that could be made implicit with the choices already placed into declarative memory. The customer could mentally review the choices to rank them based upon some preferences, and make a random selection if the top choices are equally ranked. This process updates the facts in the declarative memory.

The literature uses terms such as locutionary, illocutionary and perlocutionary, which are rather inscruitable. I prefer the following terms:

* *Assertion* - that something is the case, e.g. apples are a kind of fruit
* *Question* - a request for information, e.g. are you ready to order?
* *Answer* - a response to a question, e.g. yes, I would like tomato soup for starters
* *Command* - an instruction to do something, e.g. to a child: don't chew with your mouth open

Questions can either ask if something is true or not, e.g. can I pay with a credit card, or to ask for further information, e.g. what would you like for starters? Yes/no questions are often answered with additional information on the assumption that for a positive response, that is what the questioner is seeking, or to provide some alternatives when giving a negative response.

A dialogue can be represented as a sequence of speech acts where each utterance refers to the previous one, as well as to the dialogue plan. This allows semantic processing to access the dialogue history and its context in respect to the plan. Each utterance can be modelled in terms of its overt meaning, and other aspects relating to the context and social etiquette.

### Social etiquette and pragmatics

Social etiquette needs to be adhered to during the dialogue. The customer and the waiter are peers in social standing. This should be acknowledged at the start and end of the dialogue, e.g. by adding a "please", through the use of conditional verbs that signify that you realise that a request may be declined, and when answering a yes/no question with "yes please" or "no thanks". In the middle of the dialogue you can be more direct, e.g. "I'll have" rather than "I would like". When declining a request, the waiter apologises and offers an explanation, e.g. "the tables are all reserved" or "the plaice is off" (as in off the menu). The customer should acknowledge the discomfort this brings to the waiter when having to give bad news, e.g. "oh dear" or "that's a pity". The example dialogue goes further, as the customer asks the waiter for advice, which is a way of making the waiter feel to be of greater value in the dialogue. However that isn't needed if the customer already has a second choice in mind.

## Knowledge representation

What is a good enough way to represent statements like *The window tables are all reserved*?  From a logical point of view this is equivalent to:

```
for all x such that table(x) and by-window(x) then reserved(x)
```

One way to do that would be to devise a means for using chunks for expressions in first order logic, but not every English utterance has a natural interpretation in first order logic. A more flexible and perhaps simpler option is to use a chunk representation of English, e.g.

```
verb v1 {word are; subject np1; object np2}
np np1 {noun table, window; det all}
np np2 {adj reserved}
```

If we have a restaurant with a set of tables, some of which are at the window, we can then identify which subset is being referred to from the subject noun phrase. However, we don't need to do that in the dialogue!  The dialogue further implies that if you want a window table, then you will need to reserve one in advance, but that goes well beyond what this particular demo needs to deal with.

A choice of dish for a given course, or a choice of drink could be represented as follows:

```
course {@context c1; starter tomato-soup}
course {@context c1; main plaice}
course {@context c1; main steak-pie}
drink {@context c1; wine red; quantity glass}
```

where @context is used to declare the context in which these particular facts are true, i.e. a particular dinner at a particular restaurant on a particular day.

The next challenge is to identify a way to represent speech acts, their semantics and pragmatics.

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
