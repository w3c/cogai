# Chunks and Rules

*This document describes the syntax and semantics for the chunk graph and rules format. A formal specification is in preparation for publication as a Community Group Report.*

Each chunk is a named typed collection of properties, whose values are names (e.g. for other chunks), numbers, booleans (true or false), ISO8601 dates, string literals or comma separated lists thereof. This can be contrasted with a [minimal appoach](minimalist.md) in which property values are restricted to names.

Here is an example of a chunk where each property is given on a separate line:

```
dog dog1 {
  name "fido"
  age 4
}
```

Which describes a dog named *fido* that is 4 years old. The chunk name, (i.e. its ID) is *dog1*. This uniquely identifies this chunk within the graph it is defined in. You can also use the following syntax with semicolon as punctuation instead of newline e.g.:

```
dog dog1 {name "fido"; age 4}
```

The chunk ID is optional, and if missing, will be automatically assigned when adding the chunk to a graph. If the graph already has a chunk with the same ID, it will be replaced by this one. You are free to use whitespace as you please, modulo the need for punctuation. String literals must be enclosed in double quote marks.

Numbers are the same as for JSON, i.e. integers or floating point numbers. Dates can be given using a common subset of ISO8601 and are translated into a chunk of type *iso8601* with properties for the year, month, day etc., e.g.

```
# Albert Einstein's birth date
iso8601 {
   year 1879
   month 3
   day 14
}
```
which also shows the use of single line comments that start with a #.

Names are used for chunk types, chunk IDs, chunk property names and for chunk property values. Names are formed as a sequence of letter, digit, period, hyphen, forward slash and colon. Names starting with @ are reserved. A special case is the name formed by a single asterisk which is used to match any chunk type.

Sometimes you just want to indicate that named relationship applies between two concepts. This can expressed conveniently as follows:

```
John likes Mary
```

which is interpreted as the following chunk:

```
loves {
  @subject John
  @object Mary
}
```
## Mapping names to RDF

To relate names used in chunks to RDF, you should use @rdfmap. For instance:

```
@rdfmap {
  dog http://example.com/ns/dog
  cat http://example.com/ns/cat
}
```
You can use @base to set a default URI for names that are not explicitly declared in an @rdfmap
```
@rdfmap {
  @base http://example.org/ns/
  dog http://example.com/ns/dog
  cat http://example.com/ns/cat
}
```
which will map *mouse* to http://example.org/ns/mouse.

You can likewise use @prefix for defining URI prefixes, e.g.
```
@prefix p1 {
  ex: http://example.com/ns/
}
@rdfmap {
  @prefix p1
  dog ex:dog
  cat ex:cat
}
```
It may be more convenient to refer to a collection of @rdfmap and @prefix mappings rather than inlining them, e.g.

```
@rdfmap from http://example.org/mappings
```
If there are multiple conflicting definitions, the most recent will override earlier ones.

Note: people familiar with JSON-LD would probably suggest using @context instead of @rdfmap, however, that would be confusing given that the term @context is needed in respect to reasoning in multiple contexts and modelling the theory of mind.

## Chunk Rules

Applications can utilise a low level graph API or a high level rule language. The chunk rule language can be used to access and manipulate chunks held in one or more cognitive modules, where each module has a chunk graph and a chunk buffer that holds a single chunk. These modules are equivalent to different regions in the cerebral  cortex, where the buffer corresponds to the bundle of nerve fibres connecting to that region. The concurrent firing pattern across these fibres encodes the chunk as a semantic pointer in a noisy space with a high number of dimensions.

Each rule has one or more conditions and one or more actions. These are all formed from chunks. Each condition specifies which module it matched against. The rule actions can either directly update the module buffers, or they can invoke asynchonous operations exposed by the module. These may in turn update the module's buffer, leading to a fresh wave of rule activation. If multiple rules match the current state of the buffers, a selection process will pick one of them for execution. This is a stochastic process that takes into account previous experience.

Here is an example of a rule with one condition and two actions:

```
count {state start; from ?num1; to ?num2}
   => count {state counting}, increment {@module facts; @do recall; number ?num1}
```
The condition matches the goal buffer, as this is the default if you omit the @module declaration to name the module. It matches a chunk of type *count*, with a *state* property whose value must be *start*.  The chunk also needs to define the *from* and *to* properties. The condition binds their values to the variables *?num1* and *?num2* respectively. Variables allow you to copy information from rule conditions to rule actions.

The rule's first action updates the goal buffer so that the *state* property takes the value *counting*. This will allow us to trigger a second rule. The second action applies to the *facts* module, and initiates recall of a chunk of type *increment* with a property named *number* with the value given by the *?num1* variable as bound in the condition. The recall operation directs the facts module to search its graph for a matching chunk and place it in the facts module buffer. This also is a stochastic process that selects from amongst the matching chunks according to statistical weights that indicate the chunk's utility based upon previous experience.

The above rule would work with chunks in the facts graph that indicate the successor to a given number:

```
increment {number 1 successor 2}
increment {number 2 successor 3}
increment {number 3 successor 4}
increment {number 4 successor 5}
increment {number 5 successor 6}
...
```

You can use a comma separated list of chunks for goals and for actions. Alternatively you can write out the chunks in full using their IDs and the @condition and @action properties in the rule chunk. The above rule could be written as follows:

```
count c1 {
   state start
   from ?num1
   to ?num2
}

rule r1 {
   @condition c1
   @action a1, a2
}

count a1 {
   state counting
}

increment a2 {
   @module facts
   @do recall
   number ?num1
}
```

Whilst normally, the condition property must match the buffered chunk property, sometimes you want a rule to apply only if the condition property doesn't match the buffered chunk property. For this you insert tilda (~) as a prefix to the condition's property value. You can further test that a property is undefined by using ~ on its own in place of a value. In the following rule, the second condition checks that the *from* and *to* properties in the goal buffer are distinct.

```
# count up one at a time
count {@module goal; state counting; from ?num1; to ?num2},
count {@module goal; state counting; from ?num1; to ~?num1},
increment {@module facts; number ?num1; successor ?num3}
   =>
     count {@module goal; @do update; from ?num3},
     increment {@module facts; @do recall; number ?num3},
     console {@module output; @do log; value ?num3}
```
For properties whose values are names, numbers or booleans, the values can be matched directly. For ISO8601 dates, the value corresponds to an ID for the iso8601 date chunk, and hence date values are compared in the same way as for names. For values which are comma separated lists, the lists must be the same length and each of their items must match as above.

Both conditions and actions can use *@id* to bind to a chunk ID.

### Built-in actions

Modules must support the following actions:

* **@do recall** to recall a chunk with matching type and properties
* **@do forget** to forget chunks with matching type and properties
* **@do remember** to save the buffered chunk to the module's graph
* **@do next** to load the next matching chunk in an implementation dependent order

These can be used in combination with *@id* to specify the chunk ID, e.g. to recall a chunk with a given ID.

Applications may specify additional operations when initialising a module. This is used in the example demos, e.g. to allow rules to command a robot to move its arm, by passing it the desired position and direction of the robot's hand. Operations can be defined to allow messages to be spoken aloud or to support complex graph algorithms, e.g. for data analytics and machine learning.

### Operations on comma separated lists

You can iterate over the values in a comma separated list with the *@iterate foo* for a property named *foo* in the current chunk. This has the effect of loading the module's buffer with the first item in the list. An item chunk is generated to hold the value, e.g. the value *3.1415926535* is loaded as the following chunk:

```
@item {value 3.1415926535}
```

You can then use *@do step* in an action to load the next item into the buffer. If the buffer holds the last item, then *@last* will be defined with the value true. *@index* and  *@list* are used internally for housekeeping.

Note: if you want to use the buffer for something else, and later resume the iteration, you will need to note the item's ID, e.g. by using *@id ?id* and saving *?id* in the goal. You can then later use an action that combines *@iterate foo* with *@id ?id* to restore where you left off.

Use *@do push* to push a chunk derived from this action to the end of the current sequence. Likewise *@do pop* will pop the end of the current sequence to the buffer. Similarly *@do unshift* and *@do shift* for the start of the sequence. This uses the same terminology as for JavaScript arrays.

In principle, we could build-in more complex operations, e.g. concatenating a sequence bound by a variable to the current sequence. If the variable is bound to a single item, this is the same a a push. Likewise we could insert the chunk derived from this action prior to the current item in the sequence. However, further experience is needed before any commitment to add these to the specification.

### More complex queries

Modules may provide support for more complex queries that are specified as chunks in the module's graph, and either apply an operation to matching chunks, or generate a result set of chunks in the graph and pass this to the module buffer for rules to iterate over. In this manner, chunk rules can have access to complex queries capable of set operations over many chunks, analogous to RDF's SPARQL query language.  The specification of such a chunk query language is left to future work.

### Boosting performance

Forward chaining production rules involve testing the conditions for all of the rule against the current state of working memory. This gets increasingly expensive as the number of rules and the number of facts in working memory increases. It would be impractical to scale to really large memories with very large numbers of rules.

The brain solves this by first applying rules to a comparatively small number of chunk buffers, and second, by compiling rule conditions into a discrimination network whose input is the chunk buffers, and whose output is the set of matching rules. This is followed be a second stage that selects which rule to use, and a third stage that applies that rule's actions. This approach was re-invented as the [Rete algorithm](https://en.wikipedia.org/wiki/Rete_algorithm) by Charles Forgy, see below.

n.b. nature also invented the page rank algorithm as a basis for ranking memories for recall from the cortex based upon spreading activation from other memories.

### Relationship to other rule languages

This relates chunk rules to a few other rule languages:

#### Minimalist chunks

A simpler version of chunks that restricts property values to names on the grounds of greater cognitive plausibility, see [minimalist approach to chunks](minimalist.md). It is an open question whether the minimalist approach will be better suited to machine learning of procedural knowledge.

#### OPS5

OPS5 is a forward chaining rule language developed by Charles Forgy, using his Rete algorithm for efficient application of rules. 

Here is an example:

```
(p find-colored-block
    (goal                       ; If there is a goal
        ^status active          ; which is active
        ^type find              ; to find
        ^object block           ; a block
        ^color <z>)             ; of a cetain color
    (block                      ; And there is a block
        ^color <z>              ; of that color
        ^name <block>)
    -->
    (make result                ; Then make an element
        ^pointer <block>)       ; to point to the block
    (modify 1                   ; And change the goal
        ^status satisfied))     ; marking it satisfied
```
* See [OPS5 User's Manual](https://apps.dtic.mil/dtic/tr/fulltext/u2/a106558.pdf), Charles Forgy, 1981

#### N3

Notation3 (N3) is a rule language for RDF that can be used to express rules based upon first order logic that operate ove RDF triples. N3 supports quantifiers (@forAll and @forSome) and variables.

Here is an example:

```
:John :says {:Kurt :knows :Albert.}.

{:Kurt :knows :Albert.} => {:Albert :knows :Kurt.}.
```

The first statement signifies that *John says that Kurt knows Albert*. The second statement is a rules that says that if Kurt knows Albert then we can infer that Albert knows Kurt. 

Here is an example that deduces if someone is someone else's uncle:

```
{ ?X hasParent ?P .
  ?P hasBrother ?B .
} => {
  ?X hasUncle ?B }.
```

* [Notation3 (N3): A readable RDF syntax](https://www.w3.org/TeamSubmission/n3/) 28 March 2011
* [Notation3 as the Unifying Logic for the Semantic Web](https://www.researchgate.net/publication/337101990_Notation3_as_the_Unifying_Logic_for_the_Semantic_Web) Dörthe Arndt'S Ph.D thesis, 2019.

