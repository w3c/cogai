# Minimalist approach to chunks

This is an analysis of what a minimalist approach to chunks would involve, and is thus the most biologically plausible design when it comes to realisation as pulsed neural networks. The minimalist approach can also serve as a baseline when considering additional features that provide greater convenience for manual development of declarative and procedural knowledge. If knowledge is acquired through machine learning rather than manual development, then such additional features may actually act as a complication rather than a benefit!

A minimalist specification for chunks is that a chunk is a typed set of properties whose values are names that reference other chunks.  In other words we dispense with numbers, booleans, string literals, dates and lists as built-in data types for values.  All of these can be instead modelled as chunks:

* Lists as a sequence of chunks with a property for the list item and anothe property for the successor chunk
* Booleans as chunks that denote true or false
* Numbers as a sequence of chunks where each chunk has a single digit and a successor chunk
* String literals as a similar sequence of characters
* Dates as a chunk with properties for the year, month, day, etc. which in turn are modelled as for numbers

Rules can be modelled as a rule chunk that names a chunk for the conditions and another for the actions. The properties for those chunks name the condition chunks and the action chunks respectively. Without the means to use lists in conditions, we need a means to write rules that apply when a given property differs between the conditiion and the target chunk.

The facts for the counting demo can be rewritten without numbers as a data type:

```
increment {number one; successor two}
increment {number two; successor three}
increment {number three; successor four}
...
```

The demo has three rules, one to start counting, a second to proceed one digit at a time, and a third rule to determine when to stop counting. For the second rule, we could use "~" as a prefix to signal that the property must not match the target value, e.g.

```
# prepare to count up
count {@module goal; start ?num; state start} =>
	count {@module goal; state counting},
	increment {@module facts; @do recall; number ?num},
	console {@module output; @do log; value ?num}

# count up one at a time
count {@module goal; state counting; start ?num1; end ?num2},
count {@module goal; state counting; start ?num1; end ~?num1}
increment {@module facts; number ?num1; successor ?num3} =>
	count {@module goal; @do update; start ?num3},
	increment {@module facts; @do recall; number ?num3},
	console {@module output; @do log; value ?num3}

# stop after last one
count {@module goal; start ?num; end ?num; state counting} =>
	count {@module goal; @do update; state stop}
```
Another possible approach would be to have a means to signal that a condition must not match the target chunk, e.g. with an exclamation mark as a prefix on the condition's type name:

```
# count up one at a time
count {@module goal; state counting; start ?num1; end ?num2},
!count {@module goal; state counting; start ?num1; end ?num1}
increment {@module facts; number ?num1; successor ?num3} =>
	count {@module goal; @do update; start ?num3},
	increment {@module facts; @do recall; number ?num3},
	console {@module output; @do log; value ?num3}
```


Sometimes we want to express rules in terms of operations on sets. One example is a smart home scenario, where we want to distinguish the case where a single named person is in a room as opposed to the case where several people are in the room including that named person.

We could perhaps use a chunk to describe which room each person is in, e.g.

```
location {person Janet; room room1}
location {person John; room room1}
location {person Sue; room room2}
...
```

This makes it easy to write a condition that tests that a given person is in the room, but we also need a means to test if they are the only person in the room. We could mark that in a chunk for the room, e.g.

```
room room1 {occupancy one}
```
And update the occupancy whenever someone enters or leaves the room.  We can then write a rule that applies when Janet is in the room by herself e.g.

```
location {person Janet; room room1}, room room1 {occupancy one} => *some appropriate actions*
```
The following rule will not be matched when Janet is in the room with someone else: 

```
location {person Janet; room room1},
!location {person ~Janet; room room1} => *some actions *
```
It involves a double negative through a condition that matches someone other than Janet, and the requirement that that condition should fail.

Some possible set operations to consider:

* the case where one set is a subset of another set
* the case where the intersection of two sets is not the empty set
* the case where two sets are disjoint
* the case where two sets are the same

We could choose to model sets with the *includes* chunk, e.g.

```
includes {set setA; person Janet}
includes {set setA; person John}
includes {set setB; person John]
includes {set setB; person Mary}
```
This makes it easy to write a rule for people who are in both sets:

```
includes {set setA; person ?person}, includes {set setB; person ?person}
```

and for people in one set but not the other:
```
includes {set setA; person ?person}, includes {set setB; person ~?person}
```
More complex operations could be implemented as graph algorithms and involved from a rule action, without the need to enrich the rule language itself.

The cognitive architecture limits module buffers to a single chunk. If you want to perform operations over multiple chunks, one approach is to specify the query that selects the set of chunks and ask the module to apply the operation to all of the chunks that match the query.  The query and the operation can be specified by constructing a graph of chunks in the module by writing each of the chunks that it is composed from, one by one. A related approach is for the query to generate the results as a sequence that you can then iterate over with simple rules.  The query would return the first chunk for the sequence.

## Iterating over matching chunks

A simpler means to interate over chunks with a given type and properties is to use *@do next* in a rule action, which has the effect of loading the next matching chunk into the module's buffer in an implementation dependent sequence. To see how this works consider the following list of towns and the counties they are situated in:

```
town ascot {county berkshire}
town earley {county berkshire}
town newbury {county berkshire}
town newquay {county cornwall}
town truro {county cornwall}
town penzance {county cornwall}
town bath {county somerset}
town wells { county somerset}
town yeovil {county somerset}
```

We could list which towns are in Cornwall by setting a start goal to trigger the following ruleset:

```
start {}
  => town {@module facts; @do recall; county cornwall}, next {}
next {}, town {@module facts; town ?town} 
  => action {@do log; message ?town}, town {@module facts; @do next; county cornwall}
```
The start goal initiates a recall on the facts module for chunks with type *town* and having *cornwall* for their *county* property. The goal buffer is then set to next.  When the facts buffer is updated with the town chunk, the next rule fires. This invokes an external action to log the town, and instructs the facts module to load the next matching town chunk for the county of Cornwall, taking into account the current chunk in the facts module buffer.

A more complex example could be used to count chunks matching some given condition. For this you could keep track of the count in the goal buffer, and invoke a ruleset to increment it before continuing with the iteration. To do that you could save the ID of the last matching chunk in the goal and then cite it in the action chunk, e.g.

```
next {prev ?prev} => town {@module facts; @do next; @id ?prev; county cornwall}
```
Which exploits the chunk ID as a reference to find the next matching chunk and load it into the facts buffer.

## Summary

A minimalist version of chunks is practical that limits property values to names. There is a need to indicate that a condition property must not match the property in the target chunk and a means to indicate that a condition must fail to match. The built-in actions include *recall* to retrieve a chunk from a module to its buffer, *remember* to save a chunk to a module from its buffer, and *next* to iterate through matching chunks as explained above.  Applications can register additional actions as needed, e.g. to operate a robot's arm or turn on a light.

A wider set of data types for property values would be convenient for manual development of declarative and procedural knowledge, but this introduces the challenge of deciding just what features are needed to be built into the rule language and what should be left as module specific operations. One avenue for exploration is to allow lists in the chunks format, and to expand these out as chunk sequences in respect to the operation of the modules and rule engine.
