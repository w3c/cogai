# Mimicking human memory, learning and forgetting
Human-like AI agents will depend on engineering the means to mimick human memory, learning and forgetting. Human memory is quite different from computer memory. Computer memory is very reliable, and accessed in terms of digital values (e.g. 64 bytes) stored at numeric
memory addresses. Human memory by contrast is associative and accessed via cues. It seeks to provide the most relevant information based upon past experience and prior knowledge. It that respect, it is related to Web search engines that seek to provide relevant matches to search queries, as the given key words may appear in millions of web pages.

There are different kinds of memory, e.g. current information you are working on (working memory), memories of past events (episodic memory), general knowledge about the world (semantic memory), remembering how to dance the rumba (muscle memory). Memory can be considered in terms of stages: encoding, consolidation, storage and retrieval. Encoding and consolidation is about how you initially represent information and subsequently relate it to what you know already.

Different kinds of memories are stored in different parts of the brain, e.g. people's faces, the sound of their names, and facts about their lives. Memory retrieval involves the use of cues to selectively recall relevant memories, including the means to integrate information from different parts of the brain. When retrieving memories of past situations, we try to understand what happened, and to fill in the gaps in our recollection based upon what is likely.

Memory is associated with priming and interference. Priming occurs when the retrieval of one memory makes it easier to retrieve another. Conversely, interference occurs when a memory primes multiple other memories instead of just the ones that are useful or relevant to the current situation. Interference makes it harder to retrieve the correct memory, and can be modelled in terms of stochastic recall between competing memories.

Work on integrating symbolic and sub-symbolic information combines chunk graphs with statistical parameters. These are used to model forgetting as a process of decaying chunk strengths, priming through spreading activation, and stochastic recall as a basis for modelling interference. Activation boosts chunk strengths subject to the spacing effect in which repetitions have less effect when they are closer together, as this lessens the likelihood that the memory will have continued value further out into the future. Ultimately, any such framework needs to be explainable in terms of neural models of computation, and the demands on memory throughout an animal's life.

In part, this involves a balance between short term and long term needs. Some knowledge is transitory, dealing with the current situation, whilst other knowledge has lasting value. Seasonal knowledge allows animals to adapt their behaviour to match the changing seasons of the year. Such knowledge lies dormant for many months until that season comes again. The forgetting curve involves exponential decay, and a decay rate suitable for short term knowledge would make long term knowledge inaccessible, given extended periods of disuse.

This challenge can be met by adjusting the decay rate based upon an estimate of the long term utility of memories. A low cost mechanism for this is to make the half-life for decay proportional to the summation of the boost each chunk gets when it is updated or recalled.  The boost takes the spacing effect into account, so that closely spaced accesses have less effect. From a neurological perspective, there are a number of different processes acting on different timescales, including neurotransmitters and neural plasticity.

For more information, you are recommended to look at the web-based [tutorial and demo for mimicking human memory](https://www.w3.org/Data/demos/chunks/memory/).

Further work is planned on:

* Modelling the encoding and consolidation processs in terms of existing knowledge expressed as chunk graphs, chunk rules and graph algorithms
* Investigating human memory in relation to the recall of sets and ordered sequences, and the effects of spreading activation
* Exploring efficient solutions for recalling memories distributed across multiple cognitive databases, to mimic the role of the anterior temporal lobe for semantic integration
* Exploring approaches for dealing with statistical correlations at an early stage of concept formation for thematic knowledge, i.e. before chunk properties are created to represent relationships between concepts. This involves managing statistics across episodic memory for co-occurrence (which things are commonly found together) and for temporal sequences (which things commonly follow other things) suggestive of potential causal relationships
* Mechanisms for specialised kinds of memories, e.g. visual and aural, in respect to geospatial memory, and recognition of musical pieces
