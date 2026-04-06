# Immersive Presence

To be immersed in an extended reality environment is fun, but much better yet is to share that environment with others. Your device's camera and microphone can be used to project your facial expressions and voice on to your chosen avatar, including who you are looking at. You may be slouched on a sofa in your living room, but your avatar is shown moving around and gesturing, guided by your intents as conveyed with a games controller, spoken commands or other means at your disposal. This can be implemented using real-time AI models running in the browser. This page discusses how such models can be developed and implemented with WebNNM. The aim is a multimodal model that processes video and audio together for greater robustness through cross attention, along with another model that manages your avatar's pose and movements.

## Facial Expressions and Spoken Commands

### Audio Processing

A common approach is to use Web Audio to apply the Fast Fourier Transform (FFT) to overlapping frames of audio samples at 16KHz (typically 20–30ms long with a 10ms step), and apply Mel filter banks before feeding the data into a neural network. This maps audio into an image processing task. A lower latency approach is to apply a neural network directly to audio samples after a lightweight preprocessing step to condition the data. This removes any possible DC offset (mean removal) and normalizes the volume. The first few layers in the neural network rapidly reduce the amount of data. [SincNet](https://www.semanticscholar.org/reader/18a3ee0c4378d8d1e962e4668888978818f74628) is a proven approach based upon parameterized band-pass filters, with a low parameter count that is well suited to running in the browser. For implementation details, see the [SincNet GitHub project](https://github.com/mravanelli/SincNet). During training data augmentation uses small random temporal shifts to ensure the model is insenstive to phase shifts. You can also add in noise and background sounds as well as applying slight pitch shifts and other transforms that mimic low-quality lap-top microphones. Training on existing datasets could be followed by fine tuning for extended reality applications and to tailor models to individual users.

### Video Processing

The goal is to analyze the video in real-time to project the user's facial expressions onto the chosen avatar as rendered in 3D. To avoid jitter, the model needs to consider a sequence of video frames rather than processing each frame separately. The approach we are taking to training the model starts by fitting a generic face model and then warping it in 3D + time to match the current expression. The resulting projected 2D image is then compared to the original image to compute a perceptual loss that drives machine learning through back propagation and gradient descent. That requires end-to-end differentiability, in other words, each step along the way to computing the loss must itself be differentiable.

To be physically plausible, we need constraints on sparsity, left/right symmetry and time:

* **Sparsity Constraints**: Humans don't usually move every facial muscle at once. Adding an $L_1$ penalty to the coefficients encourages the model to use only the most relevant blend shapes.
* **Symmetry Constraints**: Forcing left/right coefficients to behave similarly unless the input image suggests otherwise.
* **Temporal constraints**: Avoids jitter by ensuring smooth continuity across video frames.

A 3D model of the face divides into a set of vertices that delineate triangular patches. Each vertex is associated with 3D position vector, a normal vector and UV coordinates for texture mapping.  Facial expressions can be modelled as small changes to the vertices and their normals, (*aka* differentiable warping). The loss function also needs to penalize sharp differences between neigbouring vertices to ensure that the "skin" stays smooth, and deforms like real skin rather than stretching like rubber. The set of constraints is commonly referred to as "geometric priors".

**Note**: one approach is to handle 3D rendering entirely within the neural network model. An encoder transforms video frames to latent representations, whilst a decoder does the reverse. We train the model using a combination of encoder and decoder. This is all very well, but at present, it is not well suited to managing complex scenes in real-time. A more practical approach encodes video frames to latent representations and decodes them to displacements to the face model's vertices and normals. These can then be streamed to the server, mixed with streams from other clients, and streamed back to all clients via Web Transport for dispatch to WebGPU.

## Staged Transfer Learning

Transfer learning is a technique that adapts a model trained for one task to a related but different task. This reduces the training effort compared with training a model for the second task from scratch. This approach essentially freezes the model parameters for lower layers whilst applying gradient descent to update the parameters for the other layers. 

**Stage 1**: Learn image processing basics, e.g. using a classification task that learns to distinguish objects from the background.

**Stage 2**: Learn a generic latent space for all human faces via training a generic 3D model for all human faces with neutral expressions. This model outputs the face parameters and texture maps for each individual based upon a large dataset of images of people's heads in different poses. The dataset says which images are for the same person. A refinement is to dynamically generate texture maps as this can capture complex effects like skin wrinkling and blood flow (blushing) that a static texture can't.

**Stage 3**: Learn vertex/normal deltas and temporal weights for smoothly changing facial expressions across a large population of users, using priors that encourage distinct basis shapes as latent representations. This doesn't need labels for facial expressions.

**Stage 4**: Personalize the model to each user, discovering their characteristic mannerisms.

Each stage freezes the model parameters that are carried forward from the previous model and adds new layers for additional capabilities. The first three stages require considerable computational effort and can be done in the cloud on powerful AI hardware using existing datasets. The last stage utilizes MAML (Model-Agnostic Meta-Learning) to learn a new user's characteristics very quickly in the browser as a background task on data captured from the browser. The data is divided into training and evaluation subsets for limited rounds of gradient descent with aggressive freezing of most parameters to speed learning.

## Intent-Based Behaviours

This maps hierarchical intents to movements, e.g. running, walking, gesturing, picking things up, etc. inspired by the human cortico-cerebellar circuit. The model is learned from a weakly labelled dataset of videos. Autoregressive training is used to learn a basis set of movements, e.g. how a human-like avatar's skeleton moves when walking. This basis set is associated with intents from the labels.

The development strategy is similar to that for facial expressions, using an encoder that maps the video frames to latent representations and a decoder that does the reverse, incorporating 3D modelling for the human body, and a perceptual loss function that compared the predicted video frames with the actual frames. We use a generic 3D model for the body, and output parameters and texture maps, that can be used to render to a 2D projection. Clothing crumples as the limbs move, necessitating dynamic texture maps. The models can be trained using a similar staged transfer learning process. This will only work for basic intents due to the paucity of training data for higher level intents. That gap can be filled using symbolic approaches, e.g. based upon Chunks & Rules.

