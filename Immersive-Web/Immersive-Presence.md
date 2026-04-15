# Immersive Presence

To be immersed in an extended reality environment is fun, but much better yet is to share that environment with others. Your device's camera and microphone can be used to project your facial expressions and voice on to your chosen avatar, including who you are looking at. You may be slouched on a sofa in your living room, but your avatar is shown moving around and gesturing, guided by your intents as conveyed with a games controller, spoken commands or other means at your disposal. This can be implemented using real-time AI models running in the browser. This page discusses how such models can be developed and implemented with WebNNM. The aim is a multimodal model that processes video and audio together for greater robustness through cross attention, along with another model that manages your avatar's pose and movements.

## Facial Expressions and Spoken Commands

### Audio Processing

A common approach is to use Web Audio to apply the Fast Fourier Transform (FFT) to overlapping frames of audio samples at 16KHz (typically 20–30ms long with a 10ms step), and apply Mel filter banks before feeding the data into a neural network. This maps audio into an image processing task. A lower latency approach is to apply a neural network directly to audio samples after a lightweight preprocessing step to condition the data, removing the DC offset (mean removal) and normalizing the volume. The first few layers in the neural network rapidly reduce the amount of data. [SincNet](https://www.semanticscholar.org/reader/18a3ee0c4378d8d1e962e4668888978818f74628) is a proven approach based upon parameterized band-pass filters, with a low parameter count that is well suited to running in the browser. For implementation details, see the [SincNet GitHub project](https://github.com/mravanelli/SincNet). During training data augmentation uses small random temporal shifts to ensure the model is insensitive to phase shifts. You can also add in noise and background sounds as well as applying slight pitch shifts and other transforms that mimic low-quality lap-top microphones. Training on existing datasets could be followed by fine tuning for extended reality applications and to tailor models to individual users.

### Video Processing

The goal is to analyze the video in real-time to project the user's facial expressions and gaze onto the chosen avatar as rendered in 3D. To reduce computational costs, a preprocessing step locates the face in the frame, then clips and scales it. To avoid jitter, the model needs to consider a sequence of video frames rather than processing each frame separately. The approach we are taking to training the model starts by fitting a generic face model and then warping it in 3D + time to match the current expression. The resulting projected 2D image is then compared to the original image to compute a perceptual loss that drives machine learning through back propagation and gradient descent. That requires end-to-end differentiability, in other words, each step along the way to computing the loss must itself be differentiable.

To be physically plausible, we need constraints on sparsity, left/right symmetry and time:

* **Sparsity Constraints**: Humans don't usually move every facial muscle at once. Adding an $L_1$ penalty to the coefficients encourages the model to use only the most relevant blend shapes.
* **Symmetry Constraints**: Forcing left/right coefficients to behave similarly unless the input image suggests otherwise.
* **Temporal constraints**: Avoids jitter by ensuring smooth continuity across video frames.

A 3D model of the face has a set of vertices that delineate triangular patches. Each vertex is associated with a 3D position vector, a normal vector and UV coordinates for interpolated texture mapping.  Facial expressions can be modelled as small changes to the vertices and their normals, (*aka* differentiable warping). The loss function also needs to penalize sharp differences between neigbouring vertices to ensure that the "skin" stays smooth, and deforms like real skin rather than stretching like rubber. The set of constraints is commonly referred to as "geometric priors".

**Note**: one approach is to handle 3D rendering entirely within the neural network model. An encoder transforms video frames to latent representations, whilst a decoder does the reverse. This is all very well, but at present, it is not well suited to managing complex scenes in real-time. A more practical approach encodes video frames to latent representations and decodes them to displacements to the face model's vertices and normals. These can then be streamed to the server, mixed with streams from other clients, and streamed back to all clients via Web Transport for zero-copy dispatch to WebGPU.

## Staged Transfer Learning

Transfer learning is a technique that adapts a model trained for one task for use in a related task. This reduces the training effort compared with training a model for the second task from scratch. This approach essentially freezes the model parameters for lower layers whilst applying gradient descent to update the parameters for the other layers. 

**Stage 1**: Learn image processing basics, e.g. using a classification task that learns to distinguish objects from the background.

**Stage 2**: Learn a generic latent space for all human faces via training a generic 3D model for all human faces with neutral expressions. This model outputs the face parameters and texture maps for each individual based upon a large dataset of images of people's heads in different poses. The dataset says which images are for the same person. A refinement is to dynamically generate texture maps as this can capture complex effects like skin wrinkling and blood flow (blushing) that a static texture can't.

**Stage 3**: Learn model parameters for vertex/normal deltas and temporal weights for smoothly changing facial expressions across a large population of users, using priors that encourage distinct basis shapes as latent representations. This doesn't need labels for facial expressions.

**Stage 4**: Personalize the model to each user, discovering their characteristic mannerisms.

Each stage freezes the model parameters that are carried forward from the previous model and adds new layers for additional capabilities. The first three stages require considerable computational effort and can be done in the cloud on powerful AI hardware using existing datasets. The last stage utilizes MAML (Model-Agnostic Meta-Learning) to learn a new user's characteristics very quickly in the browser as a background task on data captured from the browser. The data is divided into training and evaluation subsets for limited rounds of gradient descent with aggressive freezing of most parameters to speed learning.

## Further Considerations for Training

The frame rates for rendering 3D models in Web browsers dynamically depend on the computational load and the speed of the device the browser is running on. This requires a flexible approach to modelling how facial gestures and body pose change over time.  Conventional recurrent neural networks assume a fixed time interval, making them unsuitable. The solution is to instead use *liquid neural networks* (LNNs) which use numerical approximations to differential equations for smooth functions over time. Liquid neural networks can be combined with spatial models for the mesh used to skin an avatar along with the bones that form its skeleton.

The *analysis by synthesis* approach requires a differentiable loss function. Traditional graphics pipelines (e.g. WebGPU) are not differentiable, because deciding if a pixel is inside or outside a triangle is a hard, discrete step. The work around is to replace the step function by a smooth differentiable function (akin to the difference between the *sign* and *softsign* functions). The forward chain in the training graph then looks like:

1. **AI model output**: quaternions (continuous, differentiable)
2. **Linear Blend Skinning**: multiplication and addition (differentiable)
3. **Camera Projection**: matrix multiplication (differentiable)
4. **Soft Rasterization**: each pixel is assigned a probability for being in a given triangle (differentiable)
5. **Loss Calculation**: from comparing predicted and expected images for a given point in time (differentiable)

The approach requires the AI model to mask out the background. The loss function needs to allow for mis-alignment during training, and may consider the silhouette, semantic features and textures. As such it will make sense to use a weighted sum over functions that pay attention to different aspects as part of a staged transfer learning process.

Training is computationally expensive, and will need to be carried out in the cloud with powerful AI accelerators.  WebNNM can be used to export models to the StableHLO MLIR dialect with that in mind.

## Intent-Based Behaviours

This maps hierarchical intents to movements, e.g. running, walking, turning, gesturing, picking things up, etc. inspired by the human cortico-cerebellar circuit. The model is learned from a weakly labelled dataset of videos. Autoregressive training is used to learn a basis set of movements, e.g. how a human-like avatar's skeleton moves when walking. This basis set is associated with intents from the labels. This generates bone positions for a sequence of key frames, leaving WebGPU to interpolate between frames. Note that this requires a means to map intents to tensors that can be used to condition the model.

The development strategy is similar to that for facial expressions, using an encoder that maps the video frames to latent representations and a decoder that does the reverse, incorporating 3D modelling for the human body, and a perceptual loss function that compares the predicted video frames with the actual frames. It uses a generic 3D model for the body, and outputs parameters and texture maps, that are used to render to a 2D projection. Clothing crumples as the limbs move, necessitating dynamic texture maps. The models can be trained using a similar staged transfer learning process. This will only work for basic intents due to the paucity of training data for higher level intents. That gap can be filled using symbolic approaches, e.g. based upon Chunks & Rules for repetitive behaviour, together with Agentic-AI (LLMs) for high-level reasoning that takes place on a longer time scale.

### Physics

Clients are responsible for modelling physics for the resources they own. This includes collision detection so that your avatar doesn't walk through solid walls or other avatars. WebGPU compute shaders can be used to speed calculations, e.g. tracking the distance of the avatar from the wall and signalling this to the AI model so that it stops in time. A hierarchy of intents will allow your avatar to plan actions, e.g. to walk from one room to another, in terms of lower level intents that the local AI model can deal with, including signalling when higher level reasoning is required. The intents are mapped into tensors, e.g. a 128-dimensional embedding for text-based commands, and fixed-range vectors for continuous inputs.

### Interaction Loop

The avatars use a hierarchical AI structure: The LLN handles the "muscle memory", e.g. walking, balancing, obstacle avoidance. Higher level behaviour handles the "logic". If the avatar is walking forward but a wall is in the way, it will slow down and signal "I am stuck". The high-level AI then takes over to decide what to do, e.g. planning a new route. The LLN has a multi-stream input including:

* **Intent**: Instead of a discrete command like "Move to (X,Y)," this is a high-frequency stream. If the user is using a joystick, the LNN sees the acceleration of the stick, allowing it to translate a sudden jerk into a panicked stumble or a sharp turn.
* **Avatar State** (proprioception): This includes current joint angles, velocity, and "momentum." The LNN uses this to ensure that if a "Stop" intent arrives while the avatar is sprinting, the model calculates the necessary deceleration steps (the "slide") automatically.
* **Proximity/Collision Warnings**: This is akin to "whiskers", allowing the LNN to perceive the distance to nearby objects, and treat an incoming collision as a "repulsive force" in its movement equations, allowing the avatar to naturally veer away from a wall.
* **Time**: the time the LLN uses to compute its outputs. This can be supplemented by a scaling factor that speeds up or slows down time.

The LLN output updates the avatar's state, including its position and rate of change. It can also signal when a smooth solution can't be found, as a way to request higher level cognition. This happens when the LLN's prediction for the next state deviates significantly from sensory information on the actual state, and conveys contextual information in the form of a high dimensional vector. Note that if the intent passed to the LLN changes, the LLN seeks a smooth transition rather than an unnatural abrupt change.

