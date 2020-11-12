# Frequently Asked Questions for Cognitive AI

This is a compilation of questions that have been asked after talks on Cognitive AI or through the public mailing list. Feel free to propose further questions via email to public-cogai@w3.org

- [How does Cognitive AI relate to Cognitive Computing?](#how-does-cognitive-ai-relate-to-cognitive-computing)
- [Is Cognitive AI a comprehensive model of the brain?](#is-cognitive-ai-a-comprehensive-model-of-the-brain)
- [How does Cognitive AI relate to other approaches to AI?](#how-does-cognitive-ai-relate-to-other-approaches-to-ai)
- [What is the type in each chunk?](#what-is-the-type-in-each-chunk)
- [How does Cognitive AI cope with uncertainty in input?](#how-does-cognitive-ai-cope-with-uncertainty-in-input)
- [How does Cognitive AI learn from examples?](#how-does-cognitive-ai-learn-from-examples)
- [How are rules learned in Cognitive AI?](#how-are-rules-learned-in-cognitive-ai)
- [How can Cognitive AI reason about contexts?](#how-can-cognitive-ai-reason-about-contexts)
- [How does Cognitive AI compare to Computational Linguistics and to BERT in respect to NLP?](#how-does-cognitive-ai-compare-to-computational-linguistics-and-to-bert-in-respect-to-nlp)
- [How can large data sets be processed if buffers hold single chunks?](#how-can-large-data-sets-be-processed-if-buffers-hold-single-chunks)
- [Are there any benchmarks for Cognitive AI?](#are-there-any-benchmarks-for-cognitive-ai)
- [How can performance be scaled up?](#how-can-performance-be-scaled-up)
- [How mature is Cognitive AI?](#how-mature-is-cognitive-ai)
- [If Cognitive AI mimics human thought, does it make the same kinds of mistakes as humans?](#if-cognitive-ai-mimics-human-thought-does-it-make-the-same-kinds-of-mistakes-as-humans)
- [Will Cognitive AI put people out of work?](#will-cognitive-ai-put-people-out-of-work)
- [Is there a course on Cognitive AI?](#is-there-a-course-on-cognitive-ai)
- [How can I get involved?](#how-can-i-get-involved)


## How does Cognitive AI relate to Cognitive Computing?

The term Cognitive Computing has been popularised by IBM in respect to their cognitive computer system, "Watson". They define Cognitive Computing as systems that learn at scale, reason with purpose and interact with humans naturally. It is a mixture of computer science and cognitive science – that is, the understanding of the human brain and how it works. By means of self-teaching algorithms that use data mining, visual recognition, and natural language processing, the computer is able to solve problems and thereby optimize human processes. Quoted from Peter Sommer's 2017 blog post on [Artificial Intelligence, Machine Learning and Cognitive Computing](https://www.ibm.com/blogs/nordic-msp/artificial-intelligence-machine-learning-cognitive-computing/).

Cognitive AI aims to mimic human memory, reasoning and learning, inspired by advances in the cognitive sciences and over 500 million years of neural evolution. This involves a mix of symbolic and sub-symbolic approaches, i.e. graphs, statistics, rules and graph algorithms. We can mimic the brain at a functional level using conventional computer technology rather than explicitly using artificial neurons. Whilst both terms Cognitive AI and Cognitive Computing overlap in meaning, the emphasis in Cognitive AI is on functionally modelling human thought as a means to realise practical systems for artificial intelligence.

## Is Cognitive AI a comprehensive model of the brain?

No, Cognitive AI is not trying to model the brain completely, as for one thing, the brain is very complex and there is lots more to learn. Instead, the idea is to exploit progress in the cognitive sciences to mimic key capabilities, e.g. memory, reasoning and learning, and to refine this over time from further advances in the cognitive sciences. Given this, Cognitive AI only needs to model the functional characteristics of major systems from a computational perspective, rather than trying to emulate the brain at the level of individual nerve cells and synapses.

## How does Cognitive AI relate to other approaches to AI?

Good old fashioned AI (e.g. expert systems and the semantic web) is based upon symbolic representations, but not statistics. Deep Learning embodies statistics, but not symbols, where statistics act as a weak surrogate for semantics. Cognitive AI embodies both symbols and statistics with explicit representation of semantics, and furthermore seeks inspiration from across the disciplines of the cognitive sciences, as there is a lot to gain from over 500 million years of neural evolution.

Old fashioned AI requires manual development of knowledge which acts as a straitjacket when it comes to scaling up. In addition, it has difficulties with uncertainties and inconsistencies. Deep Learning has been very successful, and is good for scaling, but learns very slowly compared to humans, requiring  large training sets, and suffers from a lack of explainability, a lack of understanding of salience, a lack of generality and an inability to support higher level reasoning. Cognitive AI, by contrast, seeks to mimic human abilities, using prior knowledge and past experience to speed learning, symbolic representations for reasoning and explanations, and metacognition for generality.

The different approaches to AI are largely complementary. Deep Learning is useful for processing raw sensory data, e.g. images, video and speech. Symbolic AI is useful for agreements on interoperability where communities need standard vocabularies and models for conducting business. In the long run, the boundaries between the different approaches are likely to blur, for instance, a new generation of Deep Learning that more closely mimics human perception for its generality. The blending of symbols and statistics will be needed for machine learning for scaling up AI systems in the transition to general purpose AI.

## What is the type in each chunk?

The notion of the chunk type is a loose one and provides a way to name a collection of chunks that have something in common. It may be the case that all such chunks must satisfy some ontological constraint, on the other hand, it could be an informal grouping. This corresponds to the distinction between an intensional definition and an extensional definition. Inductive reasoning provides a way to learn models that describe regularities across members of groups.

## How does Cognitive AI cope with uncertainty in input?

This came up in respect to control of robots, where there may be uncertainty in the robot's position, or something unexpected that obstructs the path of a robot's arm. When people reach out to pick up a mug of coffee, the action is initiated by cognition (the cortico-basal ganglia circuit) and delegated to the cortico-cerebellar circuit. The cognitive command involves an appoximate position of the coffee mug. The cerebellum refines this estimate as the arm moves, using information from the visual cortex for the hand and the mug. The decision to grab the mug is conscious, but the actual movement is automatic and under control of the densely packed neural circuitry in the cerebellum. This circuitry learns from experience, e.g. when learning to ride a bicycle, you are initially wobbling all over the place, but soon learn to ride smoothly without apparent conscious effort.

Robots can mimic the brain using computer vision. Objects can be recognised and located through a camera and neural network. The way this is trained, e.g. using a variety of lighting conditions can help to improve the robustness and accuracy of the perceptual models placed in the cortex. These in turn can be used to correct errors in the data for the robot's position, and to replan movements to avoid obstructions. A robot can be designed to use a camera to guide its movement, and to use dead reckoning as a fallback. If something unexpected happens, cognition can be invoked to adapt and replan the command. Most robots are designed to be rigid for accurate positioning. The rigidity means heavier arms and more power to move them around. The cognitive approach to robot control is promising for lightweight robots whose arms flex a little under stress. This means a longer battery life for mobile robots and a lower manufacturing cost.

## How does Cognitive AI learn from examples?

This is essentially explanation based, i.e. where the cognitive agent seeks to explain new examples, and in the process to update its models as needed. Humans are prediction machines that pay attention to novelty to improve their predictions. This allows for continuous  learning throughout one's lifetime. One challenge is to balance what is learned from the current example without distorting what has been learned from past examples. In the brain, the Hippocampus has a major role in learning and memory with a focus on recent events, whilst the Cortex takes a longer term perspective.

## How are rules learned in Cognitive AI?

Rule sets can be acquired in two ways: through manual development or through hierarchical reinforcement learning. The latter involves heuristics for proposing new rules or updates to existing rules. The success or failure of a rule set on a given task can then be used to update the expected utility of a particular rule for that task.  Task repetition then propagates these corrections back through the chain of rules used to execute that task. Case based reasoning, including reasoning by analogy and metacognition can be used to break tasks into sub-tasks and to make better use of prior knowledge and past experience, avoiding the need to learn from scratch. The chunks rule language includes native support for segregating rules by tasks.

## How can Cognitive AI reason about contexts?

Beliefs, stories, reported speech, examples in lessons, abductive reasoning and even search query patterns involve the use of statements about statements. Moreover, a common need is to be able to able to express things that are true in a specific context rather than holding generally. The solution is to use named contexts in both chunks and rules for reasoning about contexts. For example, you can define a context to record what is true for a particular episode/situation, e.g. when visiting a restaurant for lunch, you sat by the window, you had soup for starters followed by mushroom risotto for the main course. A sequence of episodes can be then modelled as relationships between contexts, and used for inductive learning. Another usage is to describe the beliefs of people in a novel or TV drama, e.g. Jane believes that John lied to her about where he was last night. This is important in respect to being able to implement a [theory of mind](https://en.wikipedia.org/wiki/Theory_of_mind).

## How does Cognitive AI compare to Computational Linguistics and to BERT in respect to NLP?

Both Computational Linguistics, and approaches based upon Deep Learning, avoid directly modelling semantics, and instead rely on statistics across large numbers of text samples as a weak surrogate. This relies on the idea that words with related meanings are frequently found together. For Cognitive AI, natural language is considered as a series of layers, for example, a layer with the sequence of words, the next layer with the corresponding syntactic phrase structure, and a further layer with the semantic representation. Each of these layers can be expressed with chunks, so the process of natural language understanding or generation becomes a matter of mapping between the chunks at different layers. Other layers deal with phonology and morphology.

In Computational Linguistics, the focus is on finding the syntactic parse trees for a given utterance. Natural language is highly ambiguous from a syntactic perspective, with many possible parse trees. Using large statistics across many training samples, a statistical parser can guess at which possible parse trees are more likely than others. This involves techniques like beam search with probabilistic context free grammars (PCFG). For more details, see e.g. Christopher Manning's [lectures on statistical parsing](https://nlp.stanford.edu/courses/lsa354/) (Stanford University).

Google BERT approaches natural language from the perspective of Deep Learning with artificial neural networks. It was originally trained using all of the English language Wikipedia and the Brown corpus.  BERT uses neural networks (Transformer models) that can deal with long range correlations between words, both before and after a given word in an utterance. The networks involve hundreds of millions of parameters, and the consequent need for vast training sets. Whilst BERT doesn't directly model semantics, it can nonetheless be applied to a range of tasks such as finding documents relating to a given query, document classification, and sentiment analysis.

Cognitive AI, by contrast seeks to mimic what is known about how people process language. We seemingly effortlessly deal with ambiguity despite tightly constrained working memory. Human languages are complex, yet easily picked up by young children. This shows that humans are able to master language without the vast statistics needed by approaches like BERT. The approach adopted for Cognitive AI is to process text incrementally, one word at a time, concurrently with the syntactic phrase structure and the associated semantics. Priming effects can be modelled in terms of spreading activation at both the syntactic and semantic layers. The likely meaning of a word is thus influenced by the words that precede it.

Pronouns usually refer to something introduced earlier in the utterance. However, the correct binding of a pronoun to its referent may depend on the words that occur following the pronoun. This can be addressed by associating the pronoun with a superposition of states that is resolved upon encountering subsequent words that constrain the likely meaning. A similar process is used to resolve the bindings of prepositions in terms of concurrent asynchronous search at both the syntactic and semantic layers, using continuation based threaded execution. The syntactic phrase structure is generated through simple robust shift-reduce parsing. The mapping between syntax and semantics is accounted for using paired if-then rules at the syntactic and semantic layers, with shared statistics for natural language understanding and generation. The ability to learn language involves generalisation from examples and figuring out which generalisations are useful given subsequent experience.

## How can large data sets be processed if buffers hold single chunks?

The rule engine for the cortico-basal ganglia circuit operates on module buffers that hold single chunks corresponding to the concurrent firing patterns of bundles of nerves connecting to particular cortical regions. The rule engine directly supports queries for single chunks according to its identifier or its property values, along with the means to iterate over matching chunks, or over the properties of the chunk in a module buffer.

Modules may provide support for more complex queries that are specified as chunks in the module's graph, and either apply an operation to matching chunks, or generate a result set of chunks in the graph and pass this to the module buffer for rules to iterate over. In this manner, chunk rules can have access to complex queries capable of set operations over many chunks, analogous to RDF's SPARQL query language. The specification of such a chunk query language is left to future work, and could build upon existing work on [representing SPARQL queries directly in RDF](https://www.w3.org/Data/demos/chunks/patterns.html).

A further opportunity would be to explore queries and rules where the conditions are expressed in terms of augmented transition networks (ATNs), which loosely speaking are analogous to RDF's SHACL graph constraint language. ATNs were developed in the 1970's for use with natural language and lend themselves to simple graphical representations. This has potential for rules that apply transformations to sets of sub-graphs rather than individual chunks, and could build upon existing work on the [RDF shape rules language](https://www.w3.org/WoT/demos/shrl/test.html) (SHRL).

There are further opportunities for exploiting efficient graph algorithms such as Levinson and Ellis's solution for searching a lattice of graphs in logarithmic time, see John Sowa's [summary of graph algorithms](http://www.jfsowa.com/pubs/arch.htm). A further consideration is how to support distributed graph algorithms across multiple cognitive modules that may be remote from one another. This relates to work by Sharon Thompson-Schill on a hub and spoke model for how the anterior temporal lobe integrates unimodal information from different cortical regions.

n.b. nature also invented the [page rank algorithm](https://en.wikipedia.org/wiki/PageRank) as a basis for ranking memories for recall from the cortex based upon spreading activation from other memories.

## Are there any benchmarks for Cognitive AI?

Not as yet. These could be qualitative benchmarks that demonstrate particular capabilities, or quantitive benchmarks in respect to performance. Benchmarks are related to roadmaps, and play a role in prioritising research and development goals.

## How can performance be scaled up?

Cortical operations on graph databases can be executed in parallel. The cortico-basal ganglia circuit corresponds to a sequential rule engine. Simple implementations slow down with increasing number of facts and rules. It would be impractically slow if the rules were to operate directly on a large database. The solution is to have the rules operate on a relatively small number of cortical buffers that each hold a single chunk, and to compile rule conditions into a discrimination network that efficiently maps the buffer states to the set of rules with matching conditions. This is analogous to Charles Forgy's [Rete algorithm](https://en.wikipedia.org/wiki/Rete_algorithm) which can be further accelerated with massively parallel hardware using GPUs, see [Peters 2014](https://www.semanticscholar.org/paper/Scaling-Parallel-Rule-Based-Reasoning-Peters-Brink/b7634bf30d60fef3d8b04929d570ff949221e5ee). The next step is to determine the best matching rule, and then to execute its actions. This is a stochastic process influenced by past experience. In the human brain it is thought that the discrimination network corresponds to the Striatum, the rule selection stage to the Pallidum, and rule execution to the Thalamus. The cycle of rule execution is estimated to be approximately 50 milliseconds.  Cortical operations are executed asynchronously and can take considerably longer.

## How mature is Cognitive AI?

On the one hand, there has been decades of work in the cognitive sciences, e.g. on cognitive architectures such as [ACT-R](http://act-r.psy.cmu.edu/about/). On the other hand, most of that work has focused on research goals specific to particular disciplines. Cognitive AI seeks to build upon the insights gained over the decades in the cognitive sciences, and to apply it to AI.  This is relatively new and consequently still immature, but rapid progress is possible through incremental work on an expanding suite of capabilities.  See the discussion of the roadmap in the GitHub pages for the W3C Cognitive AI Community Group.

## If Cognitive AI mimics human thought, does it make the same kinds of mistakes as humans?

Yes, and just like people, this is a matter of training. A well trained cognitive agent will do well with respect to the tasks it was designed for. Unlike people, trained cognitive agents can be trivially cloned as needed! Systems based upon logical deduction and formal semantics offer mathematic proof given assumptions and inference rules, but are intolerant of inconsistencies and unable to exploit the statistics of past experience. Cognitive AI, inspired by human reasoning, and a combination of graphs and statistics, focuses on what is useful based upon prior knowledge and past experience in the face of uncertainty and inconsistency.

## Will Cognitive AI put people out of work?

In principle, Cognitive AI could be developed to replace both white collar and blue collar jobs. Taken to the extreme, this could cause massive unemployment with much of the population reliant on government welfare. Companies could evade the need by goverments to raise taxes by relocating to different jurisdictions. The economy would risk collapse as fewer and fewer people are able to pay for goods and services. To avoid this dystopian future, successful societies will need to introduce policies and regulations that focus on applying Cognitive AI for human computer collaboration, to boost creativity and productivity, and enable new kinds of products and services. By mimicking the brain, including empathy and the theory of mind, we can be assured that Cognitive AI reflects human values to avoid the risks of unintended consequences. This is very promising in relation to the likelihood of falling population numbers by the end of the century and the desire to preserve and enhance the quality of life as humankind moves to a sustainable approach to natural resources and enriching the natural environment. Used wisely, Cognitive AI can give us a bright future!

## Is there a course on Cognitive AI?

There are plenty of courses on Cognitive Science and its associated disciplines, but none as yet for Cognitive AI as described in these pages. Your help would be welcome for developing one. For now, there are the talks, the introductory materials on GitHub, and the web-based demos, including a test suite and a sandbox for editing and executing chunks and rules in a web browser, along with local storage.

## How can I get involved?

Please join the W3C Cognitive AI Community Group where your help will be welcomed. Participation is open to all, free of charge: [join group](https://www.w3.org/community/cogai/join).
