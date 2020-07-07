# Minimalist approach to chunks

This is an analysis of what a minimalist approach to chunks would involve, and is thus the most biologically plausible design when it comes to realisation as pulsed neural networks. The minimalist approach can also serve as a baseline when considering additional features that provide greater convenience for manual development of declarative and procedural knowledge. If knowledge is acquired through machine learning rather than manual development, then such additional features may actually act as a complication rather than a benefit!

A minimalist specification for chunks is that a chunk is a typed set of properties whose values are names that reference other chunks.  In other words we dispense with numbers, booleans, string literals, dates and lists as built-in data types for values.  All of these can be instead modelled as chunks:

* Lists as a sequence of chunks with a property for the list item and the @next property for the successor chunk
* Booleans as chunks that denote true or false
* Numbers as a sequence of chunks where each chunk has a single digit and a successor chunk, or as a chunk with properties for units, tens, hundreds and so forth
* String literals as a list of chunks that denote individual characters
* Dates as a chunk with properties for the year, month, day, etc. which in turn are modelled as for numbers

Rules can be modelled as a rule chunk that names a chunk for the list of conditions and another for the list of actions (see above). We also need a means to express conditions and actions that apply in the following cases:

* the usual case where the condition chunk's property must be the same as in the buffer
* use ~ as a prefix for the condition's value when it must be different from the buffer
* use ~ on its own in place of the condition's value to test that a property is undefined
* use ~ on its own in an action when you want to undefine a property
* use ! before a condition when you want the rule to apply when the condition does not

The facts for the counting demo can be rewritten without numbers as a data type:

```
increment {number one; successor two}
increment {number two; successor three}
increment {number three; successor four}
...
```

The demo has three rules, one to start counting, a second to proceed one digit at a time, and a third rule to determine when to stop counting. For the second rule, we use "~" as a prefix to signal that the property must not match the target value, e.g.

```
# prepare to count up
count {@module goal; from ?num1; to ?num2; state start}
   =>
     count {@module goal; @do update; state counting},
     increment {@module facts; @do get; number ?num1},
     console {@module output; @do log; value ?num1}

# count up one at a time
count {@module goal; from ?num1; to ~?num1; state counting},
increment {@module facts; number ?num1; successor ?num2}
   =>
     count {@module goal; @do update; from ?num2},
     increment {@module facts; @do get; number ?num2},
     console {@module output; @do log; value ?num2}

# stop after last one
count {@module goal; from ?num; to ?num; state counting}
   =>
     count {@module goal; @do update; state stop}
```

Note: you could also express the counting facts as follows:

```
number one {successor two}
number two {successor three}
number three {successor four}
...
```

The second rule above would then become:

```
# count up one at a time
count {@module goal; from ?num1; to ~?num1; state counting},
number {@module facts; @id ?num1; successor ?num2}
   =>
     count {@module goal; @do update; from ?num2},
     number {@module facts; @do get; @id ?num2},
     console {@module output; @do log; value ?num2}
```
where the `@id` property is used to bind to the buffered chunk's ID.

## Operations on sets of chunks

Whilst the limitation of buffers to single chunks may seem like a drawback when it comes to working with collections of facts, this is easily overcome. The rule language provides direct support for iterating over chunks with a given type and matching properties. Beyond that, modules can support a variety of graph algorithms which can be invoked from rule actions.

For RDF, the SPARQL query language provides for powerful queries over RDF triples. This includes the ability to carry out set operations over collections of triples. In principle, similar queries can be expressed using chunks and interpreted by a graph algorithm exposed by the module. The query can be pre-built or constructed dynamically, one chunk at a time. It could further express an operation to be performed over selected chunks. A further possibility is store the results as a set of chunks for iteration using rules. Whilst SPARQL operates over sets of triples, a further idea is to use chunks to describe transition networks that operate over sets of matching sub-graphs, analogous to SHACL.

## Iterating over matching chunks

A simpler means to iterate over chunks with a given type and properties is to use *@do next* in a rule action, which has the effect of loading the next matching chunk into the module's buffer in an implementation dependent sequence. To see how this works consider the following list of towns and the counties they are situated in:

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
   => 
     town {@module facts; @do next; county cornwall},
     next {}
     
next {}, town {@module facts; @id ?town; @more true} 
   => 
     console {@do log; message ?town},
     town {@module facts; @do next}
next {}, town {@module facts; @id ?town; @more false} 
   => 
     console {@do log; message ?town},
     console {@do log; message "That's all!"},
     town {@module facts; @do clear}
```
The start goal initiates an iteration on the facts module for chunks with type *town* and having *cornwall* for their *county* property. The goal buffer is then set to next.  When the facts buffer is updated with the town chunk, the next rule fires. This invokes an external action to log the town, and instructs the facts module to load the next matching town chunk for the county of Cornwall, taking into account the current chunk in the facts module buffer. The *@more* property is set to *true* in the buffer when there another chunk to follow, and *false* for the last chunk in the iteration.

A more complex example could be used to count chunks matching some given condition. For this you could keep track of the count in the goal buffer, and invoke a ruleset to increment it before continuing with the iteration. To do that you could save the ID of the last matching chunk in the goal and then cite it in the action chunk, e.g.

```
next {prev ?prev}
   =>
     town {@module facts; @do next; @id ?prev; county cornwall}
```
which instructs the facts module to set the buffer to the next town chunk where county is cornwall, following the chunk with the given ID.

Note if you add to, or remove matching chunks during an iteration, then you are not guaranteed to visit all matching chunks.  A further consideration is that chunks are associated with statistical weights reflecting their expected utility based upon past experience. Chunks that are very rarely used may become inaccessible.

## Summary

A minimalist version of chunks is practical that limits property values to names. There is support for testing that a property is not a given name, and to test when a property is undefined, and to set a property to be undefined. The built-in actions include *update* to directly update a buffer, *clear* to clear a buffer, *get* to retrieve a chunk from a module to its buffer, *put* to save a chunk to a module from its buffer, *delete* to expunge matching chunks, and *next* to iterate through matching chunks as explained above.  Applications can register additional actions as needed, e.g. to operate a robot's arm or turn on a light, or to perform complex queries analogous to SPARQL.

A wider set of data types for property values would be convenient for manual development of declarative and procedural knowledge, but this introduces the challenge of deciding just what features are needed to be built into the rule language and what should be left as module specific operations. See [chunks and rules](chunks-and-rules.md).
