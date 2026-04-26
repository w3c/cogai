# Architecture and Training Strategy for an Immersive Presence Model

Immersive Web applications will allow users to meet in virtual worlds, using their device's camera and microphone to project their facial movements onto their avatar, whilst using spoken commands as intents to drive the avatar's full body movements.  Users press a button when they are commanding intents. When the button is released, their facial movements during speech are seen and their voice is heard by other users. The aproach involves edge and cloud-based AI. An AI model running in the web browser interprets video, audio and other information captured via WebXR. Complex intents are processed by cloud based Agentic AI that maps them to the lower level commands the edge-AI model can accept. 3D rendering uses Gaussian Splats together with Web Transport for streaming state changes via the server to other clients.

## Executive Summary

This report outlines the architecture and training strategy for a browser-based, multimodal neural network designed for immersive WebXR applications. The system acts as a high-fidelity "Digital Twin" pipeline, bridging raw sensor data (camera, microphone) and real-time 3D synthesis. It leverages **Liquid Neural Networks (LNNs)** to manage the continuous-time dynamics and variable frame rates inherent to web environments, alongside **3D Gaussian Splatting (3DGS)** for full-body rendering.

The architecture relies on a hybrid Edge/Cloud system, utilizing Cloud-based Agentic AI for parsing complex intents and an Edge-AI model for executing lower-level kinematics and real-time facial mirroring.

| **State**                  | **User Action** | **Active Pipeline**                                          | **Latent Logic & Rendering**                                 |
| -------------------------- | --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Command (Intent Mode)**  | Button Down     | Cloud Agentic AI $\rightarrow$ Edge LNN Body Controller      | Face remains in an "idle" or "concentrated" state. The body executes commanded actions (e.g., walk, interact). |
| **Presence (Speech Mode)** | Button Released | Edge Mic/Camera $\rightarrow$ Phoneme-to-LipSync & Prosody-to-Gesture | Face directly mirrors user via camera. The body performs natural micro-gestures driven by speech audio. |

## 1. Interaction Paradigm: The State Machine

The user interaction is governed by a push-to-command mechanic, requiring the model to seamlessly transition between two distinct states. This is managed by a Transition Blending Layer within the LNN, using an alpha-blend of hidden states, such as $(1-t)H_{intent} + tH_{speech}$, to prevent visual popping.

## 2. Staged Transfer Learning Pipeline

To handle the complexity of translating 2D pixels and audio into a 3D semantic space, the training strategy progresses from coarse spatial resolution to fine-grained, user-specific personalization.

### Phase 1: The Kinetic Foundation (Vision & Flow)

Before learning human specifics, the model establishes a baseline for temporal continuity.

- **Goal:** Initialize the LNN hidden states to understand momentum and visual flow, making it resilient to variable web frame rates.
- **Method:** Self-supervised video prediction using general video datasets (e.g., Kinetics-700). The LNN backbone learns to predict subsequent frames, establishing a baseline for continuous motion.

### Phase 2: Phonetic-Facial Synchronization

The face requires the highest precision for social presence, requiring tight coupling between visual input, audio features, and 3DGS parameters.

- **Goal:** Map audio and video to 3D Head synthesis and infill occluded areas.
- **Method:** Utilize an audio encoder (like Wav2Vec2) and map embeddings to the Residual Gaussian offsets ($\Delta\mu$, $\Delta\alpha$) of a base head model.
- **Infilling:** Train a spatial transformer to predict the unseen back-of-head splats based on facial landmarks and symmetry priors.

### Phase 3: Intent-Action Mapping (The Kinematic Body)

This phase decouples the user's physical pose from their avatar's commanded pose during "Intent Mode."

- **Goal:** Text/Intent-to-Motion generation.
- **Method:** Train an Action-Conditioned LNN on motion capture datasets (e.g., AMASS). The model learns to generate sequences of 3DGS centroids for the full body based on Lower-Level Commands (LLCs) received from the Cloud Agentic AI.

### Phase 4: Co-Speech Gesture Layer

To prevent the avatar from appearing static during "Presence Mode," the model must generate natural body language tied to speech.

- **Goal:** Audio-to-Gesture generation.
- **Method:** Train the model on datasets linking body expression, audio, and text (e.g., BEAT dataset). The LNN learns to generate rhythmic swaying and hand emphasis driven by the prosody (pitch and tempo) of the microphone input.

### Phase 5: The Digital Tailor (Clothing & Physics)

Clothing introduces a non-rigid deformation layer that operates independently of underlying body kinematics.

- **Goal:** Non-rigid deformation transfer for digital garments.
- **Method:** Treat clothing as Attribute-Conditioned Splats. By freezing the body kinematics, transfer learning is used to train a physics-aware layer that offsets clothing splats based on the underlying body acceleration calculated by the LNN.

### Phase 6: Rapid Personalization (MAML)

The final stage bridges the gap between the trained "Generic Human" model and the specific user in a matter of seconds.

- **Goal:** Instantaneous user adaptation directly in the browser.
- **Method:** During offline meta-training, the model learns an initialization weight set, $\theta_{init}$, using Model-Agnostic Meta-Learning (MAML). In the browser, the user records a brief calibration video. Using WebGPU compute shaders, the MAML algorithm runs a few gradient steps to update the average weights to match the user's specific geometry and textures.

## 3. WebXR Implementation Considerations

To ensure the model runs efficiently on edge hardware within a browser environment, several specific optimizations are required:

- **Splat Pruning & Frustum Culling:** Gaussian Splatting is highly memory-intensive. The system must implement dynamic pruning—rendering high-density splats only where the user's attention is focused (e.g., the face) and simplifying geometry outside the immediate field of view.
- **WebGPU Quantization:** While LNNs are computationally efficient at inference, the ODE solvers require precision. Utilizing Float16 quantization on WebGPU balances rendering speed with mathematical accuracy.
- **Latency Masking:** Cloud-based Agentic AI parsing introduces network latency (typically 100-300ms). The LNN's predictive capabilities should be utilized to initiate localized "weight-shifting" animations the moment the command button is pressed, masking the delay before the parsed LLC arrives from the cloud.
