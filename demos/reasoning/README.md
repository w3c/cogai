# Reasoning and Plans

Following the Aristotelian tradition, AI researchers have for the most part modelled reasoning by a reduction to logic and deductive inference: *what is provably true given the set of assumptions and inference rules.* Cognitive Science is the experimental study of the organizing principles of the mind, and by contrast with Aristotle, focuses on *what is useful based upon prior knowledge and past experience in the presence of uncertainty.*

Plans describe a sequence of steps that need to be taken in order to achieve the desired goals. One way to express plans is as event driven transitions between states. Such transitions can update information associated with the plan (the mental model of the world) and invoke actions, e.g. to say something. To make plans more manageable, it is convenient to structure them hierarchically into sub-plans.

To generate a plan, you can either use or adapt an existing plan, or you can develop a plan by reasoning about causal relationships in a search for actions that will realise the desired goals. Cognitive agents need to be able to adapt to changing circumstances where an existing plan needs to be revised. One approach to this is to imagine what would happen and evaluate some alternatives to see if they will fulfil the goal we're seeking.

We also need to be able to interpret what we see others doing to infer their goals and plans. This is a form of abductive reasoning.

Further work is needed to identify some scenarios for demos to explore reasoning about plans. In the short term, the dinner demo will be used to illustrate how an existing plan can be used to model the behaviour of cognitive agents representing a customer and a waiter at a restaurant in a stereotypical dialogue about ordering a meal. The dinner plan consists of a sequence of stages that divide into small steps, where rules are used in deciding how respond to what an agent hears. The rules provide for limited flexibility to cope with variations. Future demos will address situations where greater flexibility is needed that exceeds what's possible with the current plan. This will involve the means to apply metacognition and past experience to reason about new situations.

## Informal Reasoning

For an introduction to informal reasoning see [Philip Johnson-Laird](https://www.pnas.org/content/108/50/19862)'s paper on [Mental models and human reasoning](https://www.pnas.org/content/107/43/18243).  He states that we don't rely on the laws of logic or probability - we reason by thinking about what's possible, we reason by seeing what is common to the possibilities.

## Hierarchical State Transition Networks

The dinner demo will use a hierarchical plan expressed as a state transition machine. As you can see below, this extends the chunks rules format with a few new terms, inspired by David Harel’s [statecharts](https://statecharts.github.io/what-is-a-statechart.html). He proposes a model in which states can have sub-states and so forth. 

The following proposes an extension to the rule engine to enable it to keep track of the currently active states and their parent-child relationships. Exiting a parent state automatically exits all of its descendant states. State names are scoped to their parent state and module. For any rule that changes the state, the current state must be identified by the rule condition for that module.

Rules can match an event when the agent is in a given state, e.g. here is a rule that matches the event *foo* when state1.1 is active.

```
foo {@state state1.1} => do something in state 1.1
```
If the module chunk buffer specifies a value for *@state* it will only match rule conditions with that explicit state. If the chunk buffer doesn't define *@state* then the buffer will match any rule that names a currently active state. If an event matches a rule for an active parent state as well as an active child state, the rule for the child state takes precedence. The module buffer's *@state* property is updated to the state for the selected rule.

***Note:** how do we identify and sort the matching rules by their parent-child relationships?*

To change to another peer state:
```
enter {@do goto; @state name} # name is the name of the new state
```

The action type and chunk properties  are used to construct and throw an event at the new state which can be used to initialise the state. In more detail, the module chunk buffer is updated to a chunk with the same type as the action (*enter* in the above example) and the same properties, apart from those starting with @ with the exception of *@state* which is copied explicitly.

***Note:** We can only transition to peer states. Thus the new state will have the same parent state.*

To call a child state:

```
enter {@do call; @state name} # name is the name of the child state
```

The action type and chunk properties are used to construct and throw an event at the child state similarly to `@do goto`.

***Note:** The parent state is identified by the chunk buffer for this module.*

To return from a child state
```
success {@do return; @state name} # name is the state to return from
```
That returns to the parent state and throws the success event at it along with the action's properties that don't start with an @. You can use different events to signal different kinds of failures as appropriate. Note that @state is only needed if more than one state is currently active. Exiting a state also exits its child states and so forth.

***Note:** The parent state is identified from the state we are returning from.*

Sometimes you want to invoke several sub-plans and only continue when they are all done. This is a generalisation of calling a child state.
```
foo {@do call; @state state1.1, state1.2, state1.3; @next state2}
```
The *@next* property is used to name the next state to change to when all of the listed child states have finished.


We also want a way to express a statechart with facts and interpret it. I will leave that to future work as it relates to the challenges of learning behaviour and reasoning about plans.
