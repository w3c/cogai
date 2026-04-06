# Immersive Web

Cognitive AI will be an important enabler for immersive presence in extended reality applications. Here is a brief account of a proposed architecture for scalable low-latency virtual worlds using Web technologies and AI:

**Web Transport protocol and API**: UDP based asynchronous messaging for ArrayBuffers that can be handed directly to WebGPU for rendering without the need for parsing. Clients stream their updates to the spatial zone's server, which merges data from different clients and streams it back to all clients in that zone.

**WebGPU**: platform neutral API for hardware acceleration of 3D graphics, providing compute shaders and superior performance compared to WebGL.

**WebXR**: platform neutral API for user interaction devices, e.g. games controllers, 3D headsets, smart glasses - opportunities for extensions for richer support for haptics.

**WebNN**: platform neutral API for hardware acceleration of neural networks. Can be used for inference and training, e.g. personalisation as fine tuning, and privacy friendly federated learning. For training, the WebNNM library can be used needed to generate training graphs as the gradient calculations are not intrinsic to WebNN.

**Scene descriptions**: taxonomy of resources with declarative and procedural components.

**Spatial Indexing**:  using trees and hierarchical bounding boxes to limit computation.

**Spatial sharding**: each server manages a particular spatial zone to limit scene complexity - clients are seamlessly transferred between servers as the clients move around.

**Physics and behavioural modelling**: Clients are responsible for applying this to the resources they own, e.g. motion and collision detection.  Behaviour is modelled in terms of intents with complementary symbolic and neural network systems.

**Accessibility**: users are free to choose how they interact according to their personal preferences and capabilities, using intent-based APIs exposed by digital twins for avatars, agents, devices and processes.

**Edge-AI**: a) multimodal models used with the local camera and microphone to project facial expressions onto avatars and support spoken commands, b) behavioural models that animate avatar pose based upon current intents.

**Authoring frameworks**: low-code solutions using web-based applications and generative AI for 3D models, textures and behaviours, including level-of-detail control.

**Distributed marketplace**: resources for use in virtual worlds, with support for AI-powered search, communities, and different payment models (free, single payment, subscription).

**WebNNM and OpenXLA**: WebNNM is a high-level model format and small javascript library for inference and training using WebNN as the backend. A complementary module is used to generate OpenXLA/MLIR files for scaling on cloud-based TPUs (Google) or Trainium (AWS).


