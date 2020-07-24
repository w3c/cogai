# Reasoning and Plans

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

**Note**: this is a bit of a hack, but is more convenient than having to explicitly name the old task, either through an `@do` operation to switch tasks, or through special properties such as `@enter` and `@exit`.  This will be something to review when we have further experience.


```
The chunks support for tasks is in part inspired by inspired by David Harel’s [statecharts](https://statecharts.github.io/what-is-a-statechart.html). He proposes a model in which states can have child-states. A state can launch multiple child states and wait for them all to complete. Statecharts are not a direct fit to chunk rules, so tasks work a little differently.
```

## Informal Reasoning

For an introduction to informal reasoning see [Philip Johnson-Laird](https://www.pnas.org/content/108/50/19862)'s paper on [Mental models and human reasoning](https://www.pnas.org/content/107/43/18243).  He states that we don't rely on the laws of logic or probability - we reason by thinking about what's possible, we reason by seeing what is common to the possibilities.

