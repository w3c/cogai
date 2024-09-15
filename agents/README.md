# Human Inspired Cognitive Agents
This describes work in progress on designing, implementing and testing artificial neural networks that mimic human cognition. Datasets and Python code resources will be added to this repository as work proceeds.

Large language models (LLMs) require vast training sets to cover the breadth of everyday knowledge needed for reasoning and prediction of text continuations. This is impractical to replicate on a small budget. The research goal is to demonstrate neural architectures for memory, deliberative reasoning and continual learning. To achieve that the training data is limited to constrained language and semantics as a means to enable effective learning with a modest dataset and model size.

* ***We still have a lot to learn about learning!***
  
A gap of around 3-5 orders of magnitude exists between estimated human language inputs and the inputs to large language models. Children are estimated to have been exposed to between 6 to 60 million words by age 5, and 40 to 400 million words by age 20, whilst LLMs are trained on many trillions of words. A key difference between LLMs and human language acquisition is that human language is grounded to the real world.

See [Bridging the data gap between children and large language models](https://osf.io/qzbgx/download/), 2023, Michael C. Frank

Learning can be viewed as a combination of observation, instruction, experience and reflection. Cognitive agents can benefit from experience in trying to solve problems, guided by step by step examples, rather than relying only on autoregressive training, i.e. masking to predict the next word given only the previous words.  We want to explore this using reinforcement learning, along with some measure of reflective thinking.

The first thought was to look at teaching materials for young children, and to consider the potential for using suitably prompted LLMs to generate training examples that can be supplemented as needed. Unfortunately, the generated examples assume a breadth of knowledge that implies a much larger dataset than is practical for the initial work.  Moreover, the teaching materials make frequent use of pictures and physical manipulation, something far too ambitious for our purposes.

Spatial reasoning and a grasp of everyday physics would involve a richer neural architecture and a large dataset for recognising objects, understanding scenes, and learning spatial manipulation skills. That is something for much better resourced research teams!  We therefore should limit ourselves to text-based semantics, and enabling learning through a combination of memorisation and manipulation.

It should be possible to provide digital worksheets as an alternative to visual perception and reasoning. This would be loosely equivalent to pencil and paper, enabling the cognitive agent to retrieve and augment structured information on the worksheet. Further study is needed to clarify how this could be implemented, e.g. tokenisation and embeddings in respect to input and output for worksheets.

## Sentient AI as the successor to Generative AI

This is to provide some context for work on building blocks for sentient AI.

Generative AI uses prompts to generate text, images, sound and video, etc. after having been trained on vast corpora. In comparison, Sentient AI features continual learning and reasoning, mimicking human cognition to serve as agents that learn from experience and have a degree of self-awareness in respect to their environment, goals and performance. Sentient AI used wisely will boost productivity, providing a solution to the conundrum for the perenial funding gap for healthcare, education, public transport and culture, etc.

Work on natural language used to focus on grammatical rules that describe the regularities of language, e.g. noun phrases with determiners, adjectives and nouns. The focus slowly shifted to statistical models particularly in respect to speech recognition and machine translation.

N-grams are based upon counting occurrences of word patterns within a corpus. They include unigrams for the probability of a given word, e.g. “apples", bigrams for the probability of a given word directly following another one, e.g. “apple” following “red”, and trigrams for the probability of a word given the preceding two words, e.g. “shiny red apples”.

N-grams proved difficult to scale up, and were superseded by work on artificial neural networks, e.g. Recurrent Neural Networks (RNNs) which process text word by word to predict the next word based upon the preceding words. RNNs use hidden vectors to model the context provided by the preceding words. Like N-grams, the network is trained on a text corpora that is split into two parts for training and evaluation.

RNNs are weak when the next word depends on a previous word that occurred many words before. As each word is processed, the context held in the hidden vectors gradually loses information on preceding words.  This weakness was solved by the introduction of the Transformer-based large language models (LLMs). These use an explicit buffer for the context and enables words to pay attention to any of the preceding words in the context. With a deep stack of layers, and training against vast corpora, the networks can capture semantic dependencies, enabling effective responses to text prompts. The context length is tens of thousands of words and rapidly increasing with newer models.

Transformers need a costly initial training phase, followed by fine tuning on the target applications, before being deployed. For sentient AI, we want to enable continual learning, and for this it makes sense to look at progress in the cognitive sciences.  The large context buffers used by Transformers are biologically implausible as is back propagation with gradient descent, so how does the brain manage language understanding and generation?

The insight from RNNs is that hidden vectors are insufficient for modelling the context so the solution is likely to be found in updating the synaptic weights to remember the context. Jonides et al. provide an [informative review of studies on short term memory](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3971378/).  This includes the processes of encoding, maintenance and retrieval. They conclude that short term memory consists of items in the focus of attention along with recently attended representations in long term memory.

This could be modelled by splitting synaptic weights into short and long term components. The short term component is boosted by encoding and retrieval, and otherwise gradually decays. The longer term component uses a slower learning rate. The network layers are similar to RNNs, but use local prediction to obtain the learning signal for updating the weights in place of back propagation. Attention is uses cue-based retrieval. The details still need to  be worked out, and we expect to evaluate the approach using a pre-training phase before an evaluation phase on test data. If all goes well, this will pave the way towards implementing sequential cognition (type 2 processing).

### Continual learning through continual prediction

Conventional AI starts with training a model against a dataset, before evaluation using data set aside for that purpose, and then the application of the model, e.g. for speech recognition or image classification. Sentient AI changes the paradigm to one of continual learning. This uses continual prediction together with local learning in place of back propagation. This can be applied separately to each layer in a stack of layers that deal with progressively higher levels of abstraction. Continual prediction for token sequences uses the context of previous tokens to predict the next token. This prediction can then be compared with the observed token, or for higher layers, the data passed to it from adjacent layers.

Local learning combines the error signal with a modified Hebbian rule for updating the synaptic weights, see e.g. Hebbian-decent ([Melchior and Wiskott, 2019](https://arxiv.org/abs/1905.10585)). Prediction involves attention to the context derived from earlier parts of the sequence. The context is held in associative memory included in each layer. This is a network that when presented with a cue, outputs the data previously given for that cue. This operation is insensitve to small errors in the cue. The synaptic weights can be updated on each presentation of a cue, but we could also use a learning signal to distinguish recall from store operations. The approach should provide for stochastic recall when multiple data samples are stored with the same cue, and likewise for closely similar cues associated with different data samples.  The learning rule can also be designed to differentiate between short and long term memory, using synaptic updates with the corresponding characteristics.

Sentient AI can use combine feed-forward with feed-back from processing the previous token. This allows layers to support both understanding and generation in combination with continual learning. Sequential cognition can then be implemented in terms of transformations that update layer state. Reinforcement learning is based upon an episodic memory that allows for back propagation of rewards across the sequence of transformations.

## Elementary Mathematics as a tractable domain

What seems practical is the way children are tought elementary mathematics, provided we exclude  instructions and exercises that involve diagrams, e.g. graphs and geometry. 

* The knowledge involved is largely standalone
* The teaching guides are available on line
* It involves rote memorisation
* It requires multi-step reasoning
* Examples can be readily generated by a script

See the [UK mathematics curriculum for year 1 to 6](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study) and [US core standards for mathematical proficiency](https://en.wikipedia.org/wiki/Common_Core#Mathematics_standards). We can exclude those parts that involve geometry, graphs and shapes. The agent would need to deal with simplified English, motivating a means to pre-train the language model. 

The starting point involves assertions, questions and answers:

* Numbers with units, tens, hundreds, thousands, etc.
* Counting in ones, twos, threes, fives and tens
* Working out the number that is one more or one less than a given number
* Adding and subtracting single digits
* Adding and subtracting numbers with multiple digits
* Competence with the multiplication table from 1 to 10
* Multiplication and long division

The US system has:

- Grades K-2: Concepts, skills, and problem solving related to addition and subtraction
- Grades 3-5: Concepts, skills, and problem solving related to multiplication and division of whole numbers and fractions
- Grade 6: Ratios and proportional relationships, and early algebraic expressions and equations
- Grade 7: Ratios and proportional relationships, and arithmetic of rational numbers
- Grade 8: Linear algebra and linear functions

Developing skills for elementary mathematics would be a good test of the neural architecture and algorithms, and could be followed by better resourced work on integrating commonsense and everyday reasoning using much larger datasets distilled from LLMs.  Support for richer mathematics would involve extending the tokeniser to support a subset of LaTex expressions. See [MathJax](https://docs.mathjax.org/en/latest/basic/mathjax.html) for rendering in web pages and [writing mathematical expressions](https://en.wikibooks.org/wiki/LaTeX/Mathematics) in GitHub Markdown.

## Neural Modules

A language encoder translates textual input to latent semantics (aka *working memory*). This is manipulated by a sequential reasoner associated with a vector database for explicit memory.  Language output decodes the latent semantics and is triggered by the reasoner.

* Tokenisations as words, symbols and digits
  * Separate digits to avoid an unlimited number of numeric tokens
  * Decoder inserts a space between tokens with a few exceptions
* Language model for encoding and asynchronous decoding
  * Retained feedbackward connections for context sensitivity
  * Using masking and model dropouts for initial training
* Factual knowledge for rote memorisation
  * Using the embedding learned for the language model
  * Create, recall, update and delete, plus iterative queries
* Single step application of the reasoner
  * Using the embedding learned for the language model
  * Simple transformations on the latent semantics
  * Trained via masked input
* Multi-step reasoning
  * Including working with factual knowledge from the memory module and relevant digital worksheets
  * Trained using model-based deep reinforcement learning with a parameterised decision tree and a means to assess progress.  A potential refinement would be to store failed approaches in episodic memory in case they can be successfully applied to different examples.
 
### Language Encoder

This mimics human language processing, which has been shown to be sequential, hierarchical and predictive. Text input is processed sequentially, token by token, using a small sliding window along with relative positional encoding to mimic the resource constraints of the phonological buffer, see [Baddeley and Hitch](https://en.wikipedia.org/wiki/Baddeley%27s_model_of_working_memory) (1974). To enable context sensitive decisions on part of speech, word sense, etc., the transformer layer output is retained and blended with the layer's input for the next step, mimicking human short term memory. This can be contrasted with conventional language models which are strictly feedforward and rely on a fixed context width. During training, the proposed architecture incrementally updates the computed loss, step by step, and initiates back propagation after every sentence.

### Language Decoder

This generates text output sequentially, token by token based upon the latent semantics, updating the latent semantics to indicate progress. Text generation is initiated by the reasoner and is executed asynchronously.

### Explicit Memory

Explicit memory is based upon a vector database whose operations are executed asynchronously, and update the latent semantics held in working memory. Explicit memory can be contrasted with implicit memory provided by the language model parameters. The operations include query, retrieval and update as well as the means to iterate through complex query results. Memories are subject to decay unless boosted, thereby mimicking the characteristics of human memory. This ensures that memories are more likely to be recalled if they have proven useful in the past.

### Sequential Reasoner

The reasoner is implemented as a feedforward network that is conditioned by the current state of working memory. Actions update working memory or initiate external actions, e.g. queries to explicit memory, or text generation. This is functionally equivalent to a production rule system. The reasoner is triggered by significant changes to working memory, e.g. when new input has been processed by the language encoder, or when working memory is updated by recall from explicit memory.

The reasoner is trained through deep reinforcement learning. The details are to be elucidated based upon study of the research literature on reinforcement learning. We envisage a model-based approach that can support reflective reasoning, e.g. to assess progress and decide when to abandon the current approach in favour of a potentially better approach, and how to break tasks down into subtasks, based upon a task taxonomy. In a symbolic system, this could be done using a decision tree with actions that include creating and mutating the rules as part of rule-sets.

## Plan of action

1. Develop a script to generate the dataset for training the language encoder and decoder
2. Implement the tokeniser
3. Implement and test the language encoder and decoder
4. Develop script for the single-step reasoning dataset
5. Implement and test the reasoner
6. Develop script for testing the memory module
7. Implement and test the memory module
8. Implement and test support for digital worksheets
9. Develop the script for multi-step reasoning dataset
10. Implement model-based deep reinforcement learning and test
11. Seek help with writing a paper to report the work

## Dataset for training initial language model

The tokeniser splits lines on line breaks, discarding empty lines. Tokens are specified in terms of regular expressions for words, digits, punctuation (":", ",", ";", ".", "?") and symbols ("+", "-", "*", "/", "=", ">", "<", ...)

An open question is whether to use words or digits for numbers, e.g.  "three hundred and seventy" vs "370".  It is appealing to use words since it is how we say numbers. However, we write them down as digits, and digits are needed for mathematical expressions. It would make sense to cover both.

Children learn about numbers by sorting objects by size, shape and colour, and identifying the number of objects in clusters. A way to mimic that using simple collections of objects with differing characteristics would be helpful and points to a role for taxonomic knowledge. A notion of digital worksheets could provide a basis for sorting and counting objects,

A further challenge is enabling the cognitive agent to represent and manipulate the digits forming large numbers, e.g. units, tens, hundreds and thousands, along with intermediate results and carries. Children are shown how do this visually with pencil and paper. We need digital worksheets as a non-visual alternative for cognitive agents. 

Counting, simple addition and multiplication of single digits, e.g.

> Question: say 130? Answer: one hundred and thirty<br>
> Question: what is one hundred and thirty? Answer: 130<br>
> Question: count up from 1 to 10? Answer: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10<br>
> Question: count up by 10 from 10 to 100? Answer: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100<br>
>
> Assert: 1 + 1 is 2<br>
> Assert: 2 + 2 is 4<br>
> Assert: 3 + 3  is 6<br>
>
> Assert: 100 + 1 is 101<br>
> Assert: 100 + 10 is 110<br>

and:

> Question: what is 1 before 6?  Answer: 5<br>
> Question: what is 2 after 6?  Answer: 8<br>
> Question: what is 1 plus 3? Answer: 4<br>
> Question: what is 2 times 3? Answer: 6<br>

where the keyword at the start indicates whether the text is an assertion, question or answer.  This allows the tokeniser to split the text up and categorise it correctly.  Each question is associated with its answer.  Values can be given as a comma separated list representing a sequence or a set. 

What is needed for the language model to generalise digit sequences to the concept of numbers? How can that be tested?  Should the key word and colon be passed to the model with the aim of it learning the differences between assertions, questions and answers?  How many examples are needed?

How can worked examples be given step by step, e.g. for multi-digit addition?

> To add 5 to 17. 17 has 1 for tens and 7 for units. We start with adding the units. Add 5 to 7 yielding 12.  This more than 10, so we find the remainder after substracting 10, yielding 2 carry 1.  We put 2 as the units for the answer. We move to the tens and add the value carried over from the previous step (i.e. 1). 1 + 1 is 2. We put 2 as the tens for the answer. Combining units tens yields the final answer 22.

That is far from ideal!   We first need to explain how to interpret digit sequences in terms of units, tens, hundreds, thousands, etc.  We need to explain how to treat this as a sequence of columns, single digit additions and carry overs. This is where the idea of worksheets may be helpful, serving in place of pencil and paper.

Microsoft Copilot explains how to break down the addition of 158,764 and 73 step by step as follows:

> Let’s break down the addition of 158,764 and 73 step by step:<br>
> 1. Ones Place Value:<br>
>   Add the ones place digits: 4 + 3 = 7.<br>
>   Write down the 7 in the ones place.<br>
> 2. Tens Place Value:<br>
>   Add the tens place digits: 6 + 7 = 13.<br>
>   Write down the 3 in the tens place and carry over the 1 to the hundreds place.<br>
> 3. Hundreds Place Value:<br>
>   Add the hundreds place digits along with the carried-over value: 8 + 1 + 3 = 12.<br>
>   Write down the 2 in the hundreds place and carry over the 1 to the thousands place.<br>
> 4. Thousands Place Value:<br>
>   Add the thousands place digits along with the carried-over value: 1 + 7 + 1 = 9.<br>
>   Write down the 9 in the thousands place.<br>
> Putting it all together, the sum of 158,764 and 73 is 158,837.

Note that Copilot reports the correct answer but hallucinates along the way! A teacher would spot this and inform the student. We need a means to do the same for the worksheet from the cognitive agent so that it can learn what's expected for each step.

The memory module is used for rote memorisation such as addition of single digits, whilst the worksheets supplement working memory. How can we train the reasoner to use explicit memory and digital worksheets? How can we preload a worksheet, analogous to the teacher handing out printed sheets of paper?  This should cover the use of worked examples as instructions for how to solve the exercises provided on the worksheet.

## Implementation Notes
* See [agent.py](agent.py)


The agent will use a reasoner to update the latent semantics as initialised by the encoder from input text. The reasoner triggers the decoder to generate the text that is most representative of the latent semantics. This means that the decoder doesn't need to worry about autoregressive predictions. That may be wrong, but it would be a simple fix.

A start has been made on implementing a neural cognitive agent with an encoder and decoder. The idea is to pretrain the language model from a set of examples before integrating the reasoner and memory modules. The agent is trained one sample at a time, where each sample corresponds to one line of text in the source file. The tokeniser splits the line into words, and expands integers to their constituent digits.

The conventional approach to Transformer-based language models is to split the input into fixed sized samples, and compute statistical distribution over the vocabulary for each position in the sample. The vector for each position is compressed from the vocabulary size to something much smaller. Each layer progressively transforms the vectors based upon the attention mechanism behind the Transformer model. Transformers should be good enough for learning elementary mathematics given the limited use of language for assertions, questions and answers.

As an interim solution, we assume a fixed sequence length sufficient for the input and output training examples. To avoid limiting the attention span, the encoder retains the output of the Transformer blocks and blends this into the block's input. In principle, this should allow attention to latent semantics associated with previous input, as well as to things placed in working memory by the operations of the reasoner and memory modules. To get training to converge better, it looks like we need a much bigger and more varied dataset. That's the next challenge!

Human language processing has been shown to be sequential, hierarchical and predictive. When you read text you hear an inner voice speaking the words as you read them, This is subject to the constraints of the phonological loop, i.e. one to two seconds. A human-like approach to language encoding would use a small sliding window for the token positions, along with feedback from higher layers to lower layers to enable the context to embrace a longer range. This would be simple to implement if the encoder and decoder were to work in synchrony with respect to the window position. Unfortunately, the encoder and decoder need to work asynchronously so that decoding can be triggered after a period of deliberative reasoning.

This raises the question of how to represent working memory. The decoder needs to compute a probability distribution over the vocabulary for the current position, and we will need a means to initialise and advance the position as tokens are generated. A single vector can represent a super position of orthogonal vectors, but is this sufficient to represent the entire state for a given layer in the model given that conventional language models use one vector for each position?  A modular approach would allow for multiple vectors corresponding to interfaces between different modules.

Human language generation is likely to involve a combination of feedforward, feedbackward and lateral connections. The verb is likely to be selected early on in the generation process even if it won't appear until later in the utterance. Each step in the process clarifies the details, somewhat akin to iterative denoising when generating images from text prompts. We will want to explore this at some stage, but it isn't a high priority. A potentially relevant paper is [PLANNER: Generating Diversified Paragraph via Latent Language Diffusion Model](https://arxiv.org/abs/2306.02531), 2023 Zhang et al.

### Better Learning Algorithms
*Conventional deep learning may not work well for the elementary math domain as the numbers used are from an open ended large set, and will only make sense when the model has learned to do the math! We need to find a learning framework that supports incremental learning with small datasets*

Learning language is based upon learning the hidden parsing and generation rules, and their statistical distributions.  This may involve instruction, e.g. pointing to examples of numbers with different digits.  It may also involve observation and self-guided learning, e.g. where the aim is to predict masked tokens. It may involve supervised learning where an oracle says whether a given attempt is good or bad.

Learning would work faster bottom up looking for regularities, e.g. numbers as digit sequences. This requires defining a learning metric separate from the masking technique used for large language models.  This will involve looking for regularities at progressively higher levels. What kind of network model could support that?  That also relates to learning generalisations across episodes. In principle, bottom up techniques can be made to work better with top down attention.

Does the literature hold clues to relevant ideas that can be readily implemented? One source of inspiration is [A Complementary Learning Systems Approach to Temporal Difference Learning](https://arxiv.org/pdf/1905.02636.pdf), 2019, Sam Blakeman and Denis Mareschal.


***to be continued...***
