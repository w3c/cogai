# Reasoning and Plans

* See also [Common Sense Reasoning](../nlp/commonsense.md)

Following the Aristotelian tradition, AI researchers have for the most part modelled reasoning by a reduction to logic and deductive inference: *what is provably true given the set of assumptions and inference rules.* Cognitive Science is the experimental study of the organizing principles of the mind, and by contrast with logic, focuses on *what has proved useful based upon prior knowledge and past experience in the presence of uncertainty.*

Plans describe a sequence of steps that need to be taken in order to achieve the desired goals. One way to express plans is as event driven transitions between states. Such transitions can update information associated with the plan (the mental model of the world) and invoke actions, e.g. to say something. To make plans more manageable, it is convenient to structure them hierarchically into sub-plans.

To generate a plan, you can either use or adapt an existing plan, or you can develop a plan by reasoning about causal relationships in a search for actions that will realise the desired goals. Cognitive agents need to be able to adapt to changing circumstances where an existing plan needs to be revised. One approach to this is to imagine what would happen and evaluate some alternatives to see if they will fulfil the goal we're seeking.

We also need to be able to interpret what we see others doing to infer their goals and plans. This is a form of abductive reasoning.

Further work is needed to identify some scenarios for demos to explore reasoning about plans. In the short term, the dinner demo will be used to illustrate how an existing plan can be used to model the behaviour of cognitive agents representing a customer and a waiter at a restaurant in a stereotypical dialogue about ordering a meal. The [dinner demo](https://www.w3.org/Data/demos/chunks/nlp/dinner/) plan consists of a sequence of stages that divide into small tasks, where rules are used in deciding how to respond to what an agent hears. The rules provide for limited flexibility to cope with variations.

Each task is associated with rules that progress the task and determine when to switch to the next task.  Tasks are expected to play an important role when it comes to reinforcement learning of rules. Tasks are associated with modules, and there can be zero, one or more active tasks for each module.

Future demos will address situations where greater flexibility is needed that exceeds what's possible with the current plan. This will involve the means to apply metacognition and past experience to reason about new situations.

## Concurrent Tasks

The `@task` property is used to name a task. If a rule condition names a task and the chunk buffer does not, the task from the condition must match one of the active tasks for that module. 

When a rule update action sets the task, this updates the module's chunk buffer as well as adding the task to the module's set of active tasks. Before that happens, the rule's conditions are scanned to find which task the rule is associated with. That task is removed from the module's set of active tasks. In principle, a rule's conditions may have more than one condition for the same module. The old task is determined by the first condition for the given module that identifies the task.

**Notes**: this is a bit of a hack, but is more convenient than having to explicitly name the old task, either through an `@do` operation to switch tasks, or through special properties such as `@enter` and `@exit`.  This will be something to review when we have further experience.

The chunk rules support for tasks is in part inspired by inspired by David Harel’s [statecharts](https://statecharts.github.io/what-is-a-statechart.html). He proposes a model in which states can have sub-states. A state can launch multiple sub-states and wait for them all to complete. Statecharts are not a direct fit to chunk rules, so inevitably tasks work a little differently.

I have yet to implement support for:

* **sub-tasks** with a means to invoke a sub-task and to return when done to the parent task
* **waiting on tasks** with a means to queue a chunk to the module buffer to signal when one or more tasks have all finished

## Informal Reasoning

For an introduction to informal reasoning see [Philip Johnson-Laird](https://www.pnas.org/content/108/50/19862)'s paper on [Mental models and human reasoning](https://www.pnas.org/content/107/43/18243).  He states that we don't rely on the laws of logic or probability - we reason by thinking about what's possible, we reason by seeing what is common to the possibilities.

## Plausible reasoning with imperfect knowledge

Commonsense reasoning needs to be able answer such questions as:

* What is the meaning of this utterance?
* Why did the person say this utterance?
* What is happening, and why?
* What is likely to happen next?
* How can I achieve my desired outcome?
* How can I avoid or minimise undesired outcomes?
* What are good ways to solve this problem?

Plausible reasoning can be used to identify likely outcomes using causal knowledge and informed guesses. It can also be applied in reverse to identify the most likely causes for a given situation. The kind of reasoning varies, e.g. reasoning about people's motivation vs qualitative reasoning about physical systems. Knowledge can be compiled into rules of thumb for easy application (System 1), but need to be related to explanations in terms of deeper knowledge (System 2).

### Qualitative Reasoning

Qualitative reasoning models physical systems symbolically rather than using continuous numeric properties, for instance, replacing a numeric quantity by symbols denoting whether the quantity is increasing, decreasing or constant. Such abstraction leads to ambiguity, producing multiple answers in place of a single answer. Changes can be propagated across causal connections. Phase transitions can be modelled in terms of named phases, e.g. solid, liquid and gas. An example is a kettle left to boil on a stove. The temperature of the kettle remains at the boiling point until all of the liquid has boiled away, at which point the temperature rises rapidly, risking damage to the kettle. If the heat source is removed at any point, the temperature will gradually fall to the ambient temperature.

To explore this in more detail, let's consider the case of a kettle filled with cold water and placed upon a stove.

1. The stove acts as a source of heat. This warms the water increasing its temperative gradually
2. When the temperature reaches the boiling point it stops rising, and the water starts to boil away
3. As the water boils, the water level in the kettle falls
4. When the level falls to zero, the temperature of the kettle rises rapidly
5. The kettle risks being damaged unless it is removed from the heat

The challenge is to find a way to express this in terms of facts and rules, that can be used to predict how the system behaves over time. The kettle could be modelled as a chunk with properties for the water level, its temperature, and heat source.  The property values are given symbolically together with a symbol denoting their rate of change *(decreasing, constant, increasing)*. In principle, we could also have modifiers such as *slowly* and *rapidly*. To model the evolving state, we define a new chunk for each state. This is linked to from the previous state, and there may be multiple successors to represent multiple possibilities.

Each such link describes a simplified model of a physical process. This is expressed declaratively to enable reasoning forward and backward in time. Links can be annotated to express the assumptions behind them. This typically relate to inequalities for property values, e.g. the temperature is less than the boiling point.

*to do - expand this into a collection of chunks and explain how forward reasoning is applied to the evolving state of the system*
