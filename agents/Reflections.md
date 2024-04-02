# Reflections
Some reflections on research challenges:

TL;DR: _we need an alternative to back propagation that supports continual learning from very few examples_

Humans learn from single examples, but back propagation requires large numbers of examples to learn effectively, and is illsuited to **continual learning**. The brain is believed to combine short term learning with the hippocampus and long term learning with the neocortex. How can we mimic that using artificial neural networks?

Individual biological neurons are error prone. This can be compensated through redundancy in the form of distributed representations. Back propagation is effective for predicting statistical distributions, e.g. language models predict the probability distribution over the vocabulary for each position in the sequence. How can this be adapted to work with very small numbers of samples?

In a symbolic representation, we can use explicit counts and make localised decisions according to what is most likely given what we currently know. A neural network could perhaps use limited statistics to commit to local decisions rather than leaving the decisions to the last layer. This points to a more modular approach to language models.

Hebbian learning is bottom up, altering relative connection weights based upon the level of activation. How can this be applied to learning single examples of token sequences? How can this be further extended to support learning generalisations for groups of tokens and their interrelationships?  How can this take advantage of knowledge gained through instruction (rote learning) and through experience (reinforcement learning)?

Our brains are like prediction machines continually comparing the world to our internal predictions and paying attention to discrepancies. How can this be implemented as a model of curiosity driven learning? That suggests a combination of autonomous bottom-up learning and top-down deliberative attention.

## Further details

* Conventional language models essentially compute statistical distributions over the vocabulary for each position in the sequence buffer.  The dimension is compressed from many thousands to a much smaller number such as 512 or 1024, presumably to encourage generalisation as well as to reduce processing costs.

* Transformers model statistical dependencies across positions in the sequence, and I need to understand why the positional embeddings are also needed, as at first glance they seem redundant.

* The tensor *(shape: seq_len, d_model)* passed from the encoder to the decoder is only approximate, and reconstruction of the output relies on models of statistical likelihood in the decoder layers, and as such is liable to convincing hallucinations.

* I need to develop a script to provide large numbers of examples for elementary math, so I can explore how training depends on the size of the dataset for a given model size. My initial experience shows that Transformers struggle with small datasets no matter how many epochs you use. RNNs by contrast are able to quickly learn small datasets, but struggle with longer ones. RNNs also have difficulties with long range attention.

* Retained feedback should in principle allow a smaller model to address longer range dependencies via providing a longer lasting working memory, but also slows learning by diluting the gradient estimates as can be shown by adjusting the blending factor.  I could compensate with a larger initial learning rate.

* I think I know how to integrate and train a sequential reasoner + memory by using reinforcement learning as part of a conventional approach to language models. This may be sufficient for applications with static requirements.

* It would be much more interesting to address continual learning including learning from few examples. This is also likely to require a different approach to the language model.

* The need to divide the input text into fixed length *(seq_len)* blocks is unnatural. Human cognition is sequential, hierarchical and predictive, so it would be well worth considering an approach to encoding and decoding that is closer to what we know about the brain, and which can support continual learning.

* Large language models require many more layers that we see in the brain.  If we liken a DNN feedforward layer to the application of a grammar rule, then the maximum depth of the parse tree determines the minimum number of layers we will need for both encoder and decoder.

* The brain is highly modularised, and presumably this overcomes the limited number of layers observed in the cortex.  A related challenge is how the brain collapses superpositions of states to single states without an intermediate expansion to the vocabulary size as needed in LLMs.  Robust operation of the brain would be at risk if single vocabulary terms were to rely on single error prone neurons.

  * This relates to tokenisation.  The brain understands words as syllables and morphemes, letters and phonemes.  The language model computes probability distributions for the word in a given position. A modularised approach would then allow words to be separately decomposed into probability distributions over their constituent letters and phonemes.

* Back propagation leads to slow learning, but humans are effective in learning from a very few examples. LLMs can temporarily learn from single examples included in the prompt text. How does that work?

* Continual learning using techniques to mitigate task interference, e.g. sparse connections, replay for interleaved learning, weight regularisation, lateral inhibition, specialisation, etc.

* Learning through a combination of observation, instruction and experience. 

  * Learning via observation, seeking patterns that account for examples, leading to progressively higher level descriptions.
  * Instruction as a means to speed learning, e.g. teaching children the digits 0 through 10 and numbers using base 10.  This is explicit knowledge that can be used in deliberative reasoning and compiled into skills via repetitive practice.
  * Learning by experience through trying things out: this can be approached in terms of reinforcement learning, either model-based or model-free.

* Bottom up learning should work well on a few examples, and can be combined with top-down attention to what is currently deemed important. This requires short term episodic memory.  The hippocampus as short term memory with the neocortex as long term memory. The neocortex has been likened to deep neural networks. What does the neocortex use instead of back propagation which itself is biologically implausible?

* How can bottom-up learning work in the absence of a top-down signal?  You start by storing the first example, and then adapt as you observe further examples, looking for generalisations and specialisations.

  * Hebbian learning boosts connection weights according to their importance to the current sample.  Normalisation is required to avoid run-away weights. This might be achieved via lateral inhibition. A big enough change to remember single examples is likely to impair memory of older examples. How could a slow learning rate could be used alongside a fast learning rate?
  * Generalisation as a means to account for multiple examples. This can be implemented using explicit memory for recent examples and a combined representation for older ones. Explicit memory allows for replay as a means to boost learning. Clusters in embedding spaces provide evidence for generalisation based upon similar meanings.
  * Specialisation is needed to compensate for over generalisation which can occur with small numbers of examples.
  * Chart parsing as an analogy where we label sequences of tokens by their most likely role, e.g. a sequence of digits as a number. 
  * We need to accumulate sufficient statistics to merit the introduction of a new chart label.
  * We may want to split or merge labels as the accumulating evidence suggests.
  * How can this be implemented as a neural network?

* Shift-Reduce parsing as a source of inspiration. This involves working memory and a means to insert and remove entries as the input tokens are processed sequentially. The parser decides on the best action in every step. Working memory includes access to a few preceding and following tokens, as well as the stack that holds intermediate results.

  * This could use a small window that is moved over the input sequence. The stack could be implemented in Python code with operations over it. The rules could be implemented as a feedforward network, trained via back propagation and reinforcement learning.
  * The essence of neural networks is to compute statistical distributions. How can that be applied to intermediate results for a shift-reduce inspired parser?

* Language generation: what is the equivalent of shift-reduce parsing? 

  * A rule engine operates over working memory with goals and data to progressively elucidate the details, and emit tokens in the correct order. You might start with a goal to determine the verb, then move on to the subject, and the object.  At a higher level, you might want to manage the communication intent in respect to goals for successive sentences.
  * How can this be implemented in a neural network using statistical distributions rather than symbols?

* **Sequence memory**: watching a drama series, I noted that when resuming watching after taking a break, I recognized the subtitled text I had seen before the break. I wouldn't have been able to  recall it, but clearly remembered having seen that text earlier. This ability fades with a longer interval, but can be strengthened if you repeatedly watch the same drama series.

This implies that we somehow store and later recognise temporal sequences. This ability relates to how we learn patterns from one or more examples.  Some tokens in the sequence stand out, e.g. "question" and "answer" in my training examples.   I think that these tokens are recognised on their own right, perhaps based upon when we last saw them or perhaps due to a measure of how much meaning they carry.  Digits carry less meaning, and we learn to treat groups of digits as numbers.

  * How do we store and recognise temporal sequences?
  * How do we compute a measure of significance?
  * How do we use distributed representations tolerant of error prone neurons?
  * How do we learn to group tokens and associated them with a label (e.g. number)?

Recursive Neural Networks (RNNs) could be part of the solution, but can they recognise examples that have only be presented once?  How can they make this less likely the longer the interval since the sequence was last presented? Can RNNs support hierarchical patterns akin to chart parsers? What other kinds of neural networks could serve these purposes?  

Supervised learning can be applied to parsing natural language, e.g. [Parsing Natural Scenes and Natural Language with Recursive Neural Networks](https://www-nlp.stanford.edu/pubs/SocherLinNgManning_ICML2011.pdf), 2011, Socher et al. Self-guided learning is used for Transformer-based language models, but the approach is slow and requires large models and vast datasets.

* ***We exhibit curiousity and attention to the unexpected. To put it differently, we learn to predict sequences and direct attention when the prediction fails.***

A sequence could be recognised via a neural state machine that updates the internal state as it processes each item in the sequence.  A form of self-organising map could support generalisations via forming clusters in an embedding space. If the state is treated as a superposition, the state could represent generalisations as substates. This suggests looking at work on self-organising maps and how they might be combined with sequences.

We could envisage an architecture with several state machines connected in series to process progressively higher levels of abstractions. Each state machine passes a tensor to the following state machine. This might work for lazy parsing that splits the input into non-overlapping sequences, for instance, noun phrase, verb phrase, prepositional phrase, etc. What shape would the tensor need, and how can it be interpreted?

Natural language involves non-adjacent dependencies, e.g. between a verb and a prepositional phrase, or between an indefinite pronoun and the thing it refers to. This suggests the need for working memory as distinct from sequence memory. Deliberative reasoning and explicit memory would allow for longer range attention.

##### Sequence Learning Machine
* [Compositional generalization through meta sequence-to-sequence learning](https://arxiv.org/abs/1906.05381), 2019, Brendan M. Lake.  Combines RNNs with an Attention based queries on external memory, and what he refers to as meta-training. However, it seems that this is far from learning from very few examples.

Is sequence learning really sequence to sequence learning?  We want to learn to predict the next token based upon the previous tokens in the sequence and our memory of previous sequences. The prediction is essentially remembering a previously seen sequence with the same preceding tokens.

We could use random numbers to label the states. Each state is initialised with the current input token. If we've seen this state before, and depending on whether the input token matches the prediction, we either strengthen the prediction or merge in a new prediction.  We can use forgetting parameters so that predictions are weakened if they are wrong and boosted if they are right. The initial strength for a new prediction is strong.

The initial state provides weak predictions for the first token, e.g. that all tokens are equally likely. As experience is gained, this settles down into the probability distribution for initial tokens. When a sequence is finished, we need to reset the state to the initial state. This involves a means to signal the start, middle or end of the sequence. We also signal whether this is an unexpected sequence or a familiar one.

* Input:  token, prediction, position, hidden state
* Output: prediction, position, hidden state, familiarity

Sequences can be associated with identifiers corresponding to a hash function over the items that form the sequence, where the hash function is chosen to be sensitive to permutations of the items. This approach enables the sequence to be recognised and associated with parameters, e.g. its strength and semantics. This approach breaks down when the items are noisy.

Sequence recognition could be extended to support generalisations via clustering tokens in an embedding space and using a similarity metric for evaluating predictions. 

* How is the embedding learned?

Related approaches include Kohonen self-organising maps (SOM) and word2vec. SOMs map their input to their output based upon a similarity metric operating on properties associated with the input. Word2vec and similar algorithms map words to points in an n-dimensional space. You can either try to predict a word based upon nearby words *(cbow)* or vice versa *(skipgram)*. The former is good for common words and the latter is good for rare words.

We are looking for an incremental learning algorithm that can work with limited statistics, and provide guidance for managing abstract classes, e.g. operators and digits, as well as when adjacent items should be treated as a collection, e.g. adjacent digits forming a number.

How do we recognise that different sequences correspond to the same pattern? In other words, which yield the same sequence after transformations that replace tokens with abstract classes where appropriate. This points to algorithms that transform an input sequence to an output sequence. Learning is based upon seeking to explain differences between prediction and observation.

There is a risk that the learning algorithm simply discards differences, e.g. mapping all sequences to a single symbol. What kind of inductive bias can produce models that provide an effective basis for reasoning? This involves some notion of grounding understanding in respect to the tasks to be learned.

Existing work on induction of grammar focuses on learning from a large number of examples. We need an approach that makes informed decisions based upon just a few examples, proposing and refining hypotheses as new data suggests.

* How to support different kinds of generalisations?

One kind of generalisation is where the next token belongs to a common class, e.g. *digits* as in:

> add 123 to 4

where the next token after "add" is a digit that is likely to be followed by other digits, which together signal a *number*.  In this example, *add* predicts a number, *to* then another number.

Another generalisation deals with the previous token, e.g.

> subtract 4 from 128

where "subtract" appears in place of "add", and is likewise followed by a digit. We can interpret this class as an *operator*.

* How to support abstract tokens that span multiple lower-level tokens?

An example is *number* that predicts a sequence of *digit* which itself predicts a token in the range 0 to 9. We therefore need to support multiple levels of description.   We want to learn abstract tokens, e.g. *nouns* and *adjectives* as generalisations of individual tokens, and *noun phrases* as an abstract class of tokens that span multiple tokens.

Could this work using a pipeline for successive state machines, where each machine generates a sequence for input to the next state machine?  Without a stack, the pipeline length would need to be at least equal to the maximum depth of the abstract parse tree.

* How to support co-dependencies between abstract tokens?

An even more ambitious goal is to learn the co-dependencies of abstract tokens, e.g. semantic constraints on which noun phrases can appear as the subject of a given verb.  That would involve an attention mechanism, as a preposition (for instance) may be some distance from its verb.

An even more ambitious goal is to learn the co-dependencies of abstract tokens, e.g. semantic constraints on which noun phrases can appear as the subject of a given verb.  That would involve an attention mechanism plus some form of working memory, as a preposition (for instance) may be separated from its verb.

* How could the pipeline be integrated with working memory for long range attention?
* How does the pipeline support reasoning and language generation?

Reasoning operates on the latent semantics in working memory. How does the sequence learning pipeline translate language to a representation of latent semantics (language encoding)?  Language generation works off latent semantics, and learns from the language encoder, how does that work?

##### Memory Consolidation

A further challenge is how to consolidate short term memories into long term memories.  The short term learning mechanism will push out older memories in favour of recent experience.  We would like a means to use short term memory to train long term memory.  A less interesting possibility would be to run the long term and short term systems independently in parallel, but this would preclude long term learning from just a few examples.   Animals are very much able to retain strong memories from single examples when appropriate, e.g. life threatening events.
