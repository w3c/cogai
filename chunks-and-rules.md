# Chunks and Rules

*This document describes the syntax and semantics for the chunk graph and rules format. A formal specification is in preparation for publication as a Community Group Report.*

## Table of Contents
- [Introduction](#introduction)
- [Mapping names to RDF](#mapping-names-to-rdf)
- [Chunk Rules](#chunk-rules)
    - [Built-in actions](#built-in-actions)
    - [Iteration over matching chunks](#iteration-over-matching-chunks)
    - [Iteration over properties](#iteration-over-properties)
    - [Operations on comma separated lists](#operations-on-comma-separated-lists)
    - [More complex queries](#more-complex-queries)
- [Statements about statements](#statements-about-statements)
- [Boosting performance](#boosting-performance)
- [Relationship to other rule languages](#relationship-to-other-rule-languages)
    - [Minimalist chunks](#minimalist-chunks)
    - [OPS5](#ops5)
    - [N3](#n3)

## Introduction

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

The chunk ID is optional, and if missing, will be automatically assigned when adding the chunk to a graph. If the graph already has a chunk with the same ID, it will be replaced by this one. You are free to use whitespace as you please, modulo the need for punctuation. String literals apart from URIs must be enclosed in double quote marks.

Numbers are the same as for JSON, i.e. integers or floating point numbers. Dates can be given using a common subset of ISO8601 and are treated as identifiers for read-only chunks of type *iso8601* with properties for the year, month, day etc., e.g.

```
# Albert Einstein's birth date
iso8601 1879-03-14 {
   year 1879
   month 3
   day 14
}
```
which also illustrates the use of single line comments that start with a #.

Names are used for chunk types, chunk IDs, chunk property names and for chunk property values. Names can include the following character classes: letters, digits, period, and hyphen. Names starting with @ are reserved. A special case is the name formed by a single asterisk which is used to match any chunk type. 

Sometimes you just want to indicate that a named relationship applies between two concepts. This can expressed conveniently as follows:

```
John likes Mary
```

which is interpreted as the following chunk:

```
likes {
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

Each rule has one or more conditions and one or more actions. These are all formed from chunks. Each condition specifies which module it matched against, and likewise each rule action specifies which module it effects. The rule actions can either directly update the module buffers, or they can invoke asynchonous operations exposed by the module. These may in turn update the module's buffer, leading to a fresh wave of rule activation. If multiple rules match the current state of the buffers, a selection process will pick one of them for execution. This is a stochastic process that takes into account previous experience.

Here is an example of a rule with one condition and two actions:

```
count {state start; from ?num1; to ?num2}
   => count {state counting},
      increment {@module facts; @do get; number ?num1}
```
The condition matches the goal buffer, as this is the default if you omit the *@module* declaration to name the module. It matches a chunk of type *count*, with a *state* property whose value must be *start*.  The chunk also needs to define the *from* and *to* properties. The condition binds their values to the variables *?num1* and *?num2* respectively. Variables allow you to copy information from rule conditions to rule actions.

The rule's first action updates the goal buffer so that the *state* property takes the value *counting*. This will allow us to trigger a second rule. The second action applies to the *facts* module, and initiates recall of a chunk of type *increment* with a property named *number* with the value given by the *?num1* variable as bound in the condition. The *get* operation directs the facts module to search its graph for a matching chunk and place it in the facts module buffer. This also is a stochastic process that selects from amongst the matching chunks according to statistical weights that indicate the chunk's utility based upon previous experience.

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
   @do get
   number ?num1
}
```

Whilst normally, the condition property must match the buffered chunk property, sometimes you want a rule to apply only if the condition property doesn't match the buffered chunk property. For this you insert tilda (`~`) as a prefix to the condition's property value. You can further test that a property is undefined by using `~` on its own in place of a value. In an action you can use `~` on its own to set a property to be undefined.

In the following rule, the first condition checks that the *from* and *to* properties in the goal buffer are distinct.

```
# count up one at a time
count {@module goal; state counting; from ?num1; to ~?num1},
increment {@module facts; number ?num1; successor ?num3}
   =>
     count {@module goal; @do update; from ?num3},
     increment {@module facts; @do get; number ?num3},
     console {@module output; @do log; value ?num3}
```
For properties whose values are names, numbers or booleans, the values can be matched directly. For ISO8601 dates, the value corresponds to an ID for the iso8601 date chunk, and hence date values are compared in the same way as for names. For values which are comma separated lists, the lists must be the same length and each of their items must match as above.

You can write rules that apply when an action such as retrieving a chunk from memory has failed. To do this place an exclamation mark before the chunk type of the condition chunk, e.g.

```
!present {@module facts; person Mary; room room1}
```

which will match the facts module buffer after a failure to *get* a chunk of type *present* with the corresponding properties. See below for details of response status codes.

Both conditions and actions can use *@id* to bind to a chunk ID.

### Built-in actions

Modules must support the following actions:

* **@do clear** to clear the module's buffer and pop the queue
* **@do update** to directly update the module's buffer
* **@do queue** to push a chunk to the queue for the module's buffer
* **@do get** to recall a chunk with matching type and properties
* **@do put** to save the buffer as a new chunk to the module's graph
* **@do patch** to use the buffer to patch a chunk in the module's graph
* **@do delete** to forget chunks with matching type and properties
* **@do next** to load the next matching chunk in an implementation dependent order
* **@do properties** to iterate over the set of properties in a buffer
* **@for** to iterate over the items in a comma separated list

Apart from *clear*, *update* and *queue*, all actions are asynchronous, and when complete set the buffer status to reflect their outcome. Rules can query the status using *@status*. The value can be *pending*, *okay*, *forbidden*, *nomatch* and *failed*. This is analogous to the hypertext transfer protocol (HTTP) and allows rule engines to work with remote cognitive databases. To relate particular request and response pairs, use *@tag* in the action to pass an identifier to the subsequent asynchronous response where it can be accessed via *@tag* in a rule condition.

Actions can be used in combination with *@id* to specify the chunk ID, e.g. to get a chunk with a given ID. Additional operations are supported for operations over property values that are comma separated lists of items, see below. 

The default action is *@do update*. If the chunk type for the action is the same as the chunk currently held in the buffer, then the effect is to update the properties given in the action, leaving existing properties unchanged. If the chunk type for the action is not the same as the chunk currently held in the buffer, a new chunk is created with the properties given in the action.

Whilst *@do update* allows you to switch to a new goal, sometimes you want rules to propose multiple sub-goals. You can set a sub-goal using *@do queue* which pushes the chunk specified by an action to the queue for the module's buffer. You can use *@priority* to specify the priority as an integer in the range 1 to 10 with 10 the highest priority. The default priority is 5. The buffer is automatically cleared (*@do clear*) when none of the buffers matched in a rule have been updated by that rule. This pops the queue if it is not already empty.

Actions that directly update the buffer do so in the order that the action appears in the rule. In other words, if multiple actions update the same property, the property will have the value set by the last such action.

The *@do get* action copies the chunk into the buffer. Changing the values of properties in the buffer won't alter the graph until you use *@do put* or *@do patch* to save the buffer to the graph. Put creates a new chunk, or completely overwrites an existing one with the same ID as set with *@id*. Patch, by contrast will just overwrite the properties designated in the action.

Applications can define additional operations when initialising a module. This is used in the example demos, e.g. to allow rules to command a robot to move its arm, by passing it the desired position and direction of the robot's hand. Operations can be defined to allow messages to be spoken aloud or to support complex graph algorithms, e.g. for data analytics and machine learning. Applications cannot replace the built-in actions listed above.

NOTE: the goal buffer is automatically cleared after executing a rule's actions if those actions have not updated any of the buffers used in that rule's conditions. This avoids the rule being immediately reapplied, but doesn't preclude other kinds of looping behaviours. Future work will look at how to estimate the utility of individual rules via reinforcement learning, and how much time is anticipated to achieve certain tasks. This will be used to detect looping rulesets and to switch to other tasks.

### Iteration over matching chunks

You can iterate over chunks with a given type and properties with *@do next* in a rule action, which has the effect of loading the next matching chunk into the module's buffer in an implementation dependent sequence. To see how this works consider the following list of towns and the counties they are situated in:

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
The start goal initiates an iteration on the facts module for chunks with type *town* and having *cornwall* for their *county* property. The goal buffer is then set to next.  When the facts buffer is updated with the town chunk, the next rule fires. This invokes an external action to log the town, and instructs the facts module to load the next matching town chunk for the county of Cornwall, taking into account the current chunk in the facts module buffer. The *@more* property is set to *true* in the buffer if there is more to come, and *false* for the last chunk in the iteration.

A more complex example could be used to count chunks matching some given condition. For this you could keep track of the count in the goal buffer, and invoke a ruleset to increment it before continuing with the iteration. To do that you could save the ID of the last matching chunk in the goal and then cite it in the action chunk, e.g.

```
next {prev ?prev}
   =>
     town {@module facts; @do next; @id ?prev; county cornwall}
```
which instructs the facts module to set the buffer to the next town chunk where county is cornwall, following the chunk with the given ID.

Note if you add to, or remove matching chunks during an iteration, then you are not guaranteed to visit all matching chunks.  A further consideration is that chunks are associated with statistical weights reflecting their expected utility based upon past experience. Chunks that are very rarely used may become inaccessible.

### Iteration over properties

You can iterate over each of the properties in a buffer by using *@do properties* in an action for that buffer. The following example first sets the facts buffer to *foo {a 1; c 2}* and then initiates an iteration over all of the buffer's properties that don't begin with '@':

```
run {}
  =>
    foo {@module facts; a 1; c 2}, # set facts buffer to foo {a 1; c 2}
    bar {@module facts; @do properties; step 8; @to goal} # launch iteration
    
# this rule is invoked with the name and value for each property
# note that 'step 8' is copied over from the initiating chunk

bar {step 8; name ?name; value ?value}
  =>
    console {@do log; message ?name, is, ?value},
    bar {@do next}  # to load the next instance from the iteration
```

Each property is mapped to a new chunk with the same type as the action (in this case *bar*). The action's properties are copied over (in this example *step 8*), and *name* and *value* properties are used to pass the property name and value respectively. The *@more* property is given the value *true* unless this is the final chunk in the iteration, in which case *@more* is given the value *false*. By default, the iteration is written to the same module's buffer as designated by the action that initiated it. However, you can designate a different module with the *@to* property. In the example, this is used to direct the iteration to the goal buffer. By setting additional properties in the initiating action, you can ensure that the rules used to process the property name and value are distinct from other such iterations.

### Operations on comma separated lists

You can iterate over the values in a comma separated list with the *@for*. This has the effect of loading the module's buffer with the first item in the list. You can optionally specify the index range with *@from* and *@to*, where the first item in the list has index 0, just like JavaScript.

```
# a chunk in the facts module
person {name Wendy; friends Michael, Suzy, Janet, John}

# after having recalled the person chunk, the
# following rule iterates over the friends
person {@module facts; friends ?friends}
   => item {@module goal; @for ?friends; @from 1; @to 2}
```
which will iterate over Suzy and Janet, updating the module buffer by setting properties for the item's value and its index, e.g. 

```
item {value Suzy; index 1}
```

You can then use *@do next* in an action to load the next item into the buffer. The *@more* property is set to *true* in the buffer if there is more to come, and *false* for the last property in the iteration. Action chunks should use either *@do* or *@for*, but not both. Neither implies *@do update*.

You can append a value to a property using *@push* with the value, and *@to* with the name of the property, e.g.

```
person {name Wendy} => person {@push Emma; @to friends}
```
which will push Emma to the end of the list of friends in the goal buffer. 

```
person {name Wendy} => person {@pop ?friend; @from friends}
```

will pop the last item in the list of friends to the variable *?friend*.

Similarly you can prepend a value to a property using *@unshift* with the value, and *@to* with the name of the property, e.g.

```
person {name Wendy} => person {@unshift Emma; @to friends}
```
will push Emma to the start of the list of friends in the goal buffer. 

```
person {name Wendy} => person {@shift ?friend; @from friends}
```

will pop the first item in the list of friends to the variable *?friend*.

**Note** This uses the same rather confusing terminology as for JavaScript arrays. We could use *append* and *prepend* in place of *push* and *unshift*, but then what names should we use in place of *pop* and *shift*?

Further experience is needed before committing to further built-in capabilities.

### More complex queries

Modules may provide support for more complex queries that are specified as chunks in the module's graph, and either apply an operation to matching chunks, or generate a result set of chunks in the graph and pass this to the module buffer for rules to iterate over. In this manner, chunk rules can have access to complex queries capable of set operations over many chunks, analogous to RDF's SPARQL query language.  The specification of such a chunk query language is left to future work.

## Statements about statements

Beliefs, stories, abductive reasoning and even search query patterns involve the use of statements about statements. How can these be expressed as chunks and what else is needed?

Here is an example from John Sowa's [Architectures for Intelligent Systems](http://www.jfsowa.com/pubs/arch.htm):

<blockquote>
Tom believes that Mary wants to marry a sailor
</blockquote>

This involves talking about things that are only true in some specific context, as well as the means to refer to an unknown person who is a sailor. The latter can be easily handled given the determiner "a" which implies there is someone or something that has certain attributes, i.e. using a name as a variable. The former is a little harder, as we need a way to separate chunks according to the context, so that we don't confuse what's true in general from what's true in a given context.

One approach is use separate graphs for each context. This means that a cognitive module would have a set of graphs, and that we will need a means to refer to them individually. Another approach is to provide a way to indicate which context a given chunk belongs to, and to make the context part of the mechanism for retrieving and updating chunks. This would allow chunks for different contexts to be stored as part of the same graph.

The idea to be explored is to use `@context` as a property that names the context and to use this in rules as a basis for reasoning.  In the above example, we need one variable for the sailor, and another pair of variables for the hypothetical situations implicit in the subordinate clauses.

Here is one possible way to represent the above example:

```
believes s1 {@subject tom; @situation s3}
wants s2 {@context s3; person mary; situation s4}
married s5 {@context s4; @subject mary; @object s6}
for-an s6 {@context s4; isa person; profession sailor}
```
This works with the existing rule language, provided that we assume a default context so that a `@do get` action without `@context` won't match a chunk in a named context other than the default context.

If such contexts are widely used, then the implementation would benefit from a means to index by context for faster retrieval. This should be addressed when re-implementing the rule engine using a discrimination network for mapping module buffers to applicable rules.

In principle, contexts can be chained, e.g. to describe the beliefs of someone in a fictional story or movie, and to indicate when a context is part of several other contexts, i.e. forming a tree of contexts.

## Boosting performance

Forward chaining production rules involve testing the conditions for all of the rules against the current state of working memory. This gets increasingly expensive as the number of rules and the number of facts in working memory increases. It would be impractical to scale to really large memories with very large numbers of rules.

The brain solves this by first applying rules to a comparatively small number of chunk buffers, and second, by compiling rule conditions into a discrimination network *(the Striatum)* whose input is the chunk buffers, and whose output is the set of matching rules. This is followed by a second stage *(the Pallidum)* that selects which rule to use, and a third stage *(the Thalamus)* that applies that rule's actions. This approach was re-invented as the [Rete algorithm](https://en.wikipedia.org/wiki/Rete_algorithm) by Charles Forgy, see below.

n.b. nature also invented the [page rank algorithm](https://en.wikipedia.org/wiki/PageRank) as a basis for ranking memories for recall from the cortex based upon spreading activation from other memories.

## Relationship to other rule languages

This relates chunk rules to a few other rule languages:

### Minimalist chunks

A simpler version of chunks that restricts property values to names on the grounds of greater cognitive plausibility, see [minimalist approach to chunks](minimalist.md). It is an open question whether the minimalist approach will be better suited to machine learning of procedural knowledge.

### OPS5

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

Notation3 (N3) is a rule language for RDF that can be used to express rules based upon first order logic that operate over RDF triples. N3 supports quantifiers (@forAll and @forSome) and variables.

Here is an example:

```
:John :says {:Kurt :knows :Albert.}.

{:Kurt :knows :Albert.} => {:Albert :knows :Kurt.}.
```

The first statement signifies that *John says that Kurt knows Albert*. The second statement is a rule that says that if Kurt knows Albert then we can infer that Albert knows Kurt. 

Here is an example that deduces if someone has an uncle:

```
{
  ?X hasParent ?P .
  ?P hasBrother ?B .
} => {
  ?X hasUncle ?B
}.
```

* [Notation3 (N3): A readable RDF syntax](https://www.w3.org/TeamSubmission/n3/) 28 March 2011
* [Notation3 as the Unifying Logic for the Semantic Web](https://www.researchgate.net/publication/337101990_Notation3_as_the_Unifying_Logic_for_the_Semantic_Web) Dörthe Arndt's Ph.D thesis, 2019.

