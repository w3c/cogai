# Dinner Demo

This is a natural language demo for a dialogue between a customer and a waiter at a restaurant. The demo is based around the following sample dialogue:

<blockquote>
W: Good evening.<br>
C: A table for two please.<br>
W: Certainly. Just here, sir.<br>
C: Could we sit by the window?<br>
W: I'm sorry. The window tables are all reserved.<br>
W: Are you ready to order, sir?<br>
C: Yes. I'll have tomato soup for starters and my wife would like prawn cocktail.<br>
W: One tomato soup and one prawn cocktail. What would you like for the main course?<br>
C: I'll have the plaice and my wife would like the shepherd's pie.<br>
W: I'm afraid the plaice is off.<br>
C: Oh dear. What do you recommend?<br>
W: The steak pie is very good.<br>
C: OK I'll have that.<br>
W: Would you like anything to drink?<br>
C: Yes, a bottle of red wine please.
</blockquote>

The demo involves a separate cognitive agent for the customer and for the waiter, that are executed within a web page, and the dialogue shown as a text chat. The demo combines declarative and procedural knowledge about typical behaviour for having dinner at a restaurant. The natural language is handled word by word, avoiding backtracking, and using concurrent syntactic and semantic processing.

To model the knowledge some mindmaps were prepared as incomplete illustrations of what needs to be represented.

The following diagram describes some of the concepts needed to express a plan for a restaurant dinner.

![dinner plan](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/dinner-plan.png)

The following diagram describes some of the concepts used in the dialogue between the customer and the waiter,

![dialogues](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/dialogues.png)  <!-- .element width="50%" -->

The following diagram describes some of the concepts needed to describe choices of drinks:

![drinks](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/drinks.png)

The following diagram describes some of the concepts needed to describe choices of food:


![food](https://www.w3.org/Data/demos/chunks/nlp/dinner/images/food.png)
