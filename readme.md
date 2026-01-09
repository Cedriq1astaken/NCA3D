# Growing Neural Cellular Automata

Implementation of the Growing Neural Cellular Automata in 3 dimensions inspired by this paper: https://distill.pub/2020/growing-ca/

## Overview

This project extends the concept of Growing Neural Cellular Automata into three dimensions, creating an interactive 3D visualization where cells can grow, regenerate, and maintain persistent structures through learned rules. The neural network learns to grow a target 3D shape from a single seed cell, mimicking biological growth processes found in nature.

The cellular automata uses local rules where each cell observes its neighbors and updates its state accordingly. Through training, the system learns stable patterns that can self-organize into complex 3D structures, regenerate when damaged, and persist over time.

## Screenshots

### Growing Structure
![Growing Structure](screenshots/growing.gif)
*The cellular automata growing from a single seed cell into the target 3D structure*

### Regeneration Demo
![Regeneration](screenshots/regeneration.gif)
*Demonstration of the system's ability to regenerate after partial destruction*

### Interactive 3D View
![3D Visualization](screenshots/3d_view.gif)
*Interactive Three.js visualization showing the cellular automata in real-time*

## Features

- **Persistence**: The grown structures maintain their form over time through stable learned rules
- **Regeneration**: Damaged or partially destroyed structures can repair themselves and regrow to the target shape
- **3D Visualization**: Interactive Three.js rendering allowing rotation, zoom, and real-time observation
- **Real-time Simulation**: Watch the cellular automata evolve step-by-step in your browser

## Live Demo

Check out the live website: [https://cedriq1astaken.github.io/NCA3D/](https://cedriq1astaken.github.io/NCA3D/)

## Built With

- **HTML5** - Structure and layout
- **CSS3** - Styling and responsive design
- **JavaScript** - Core cellular automata logic and interactivity
- **Three.js** - 3D rendering and visualization
- **Python** - Training scripts and model development

## How It Works

The cellular automata operates on a 3D grid where each cell contains multiple channels of information (similar to RGB in images, but extended). At each step:

1. Each cell perceives its local neighborhood using 3D convolution
2. The perception is fed through a small neural network
3. The network outputs updates to the cell's state
4. Cells update synchronously across the grid

The neural network is trained to:
- Grow the target shape from a single seed cell
- Maintain the shape once grown (persistence)
- Repair damage and regrow missing parts (regeneration)

## Getting Started

Simply visit the website at [https://cedriq1astaken.github.io/NCA3D/](https://cedriq1astaken.github.io/NCA3D/) to start exploring!

## Inspiration

This project is inspired by the groundbreaking work in the Distill publication ["Growing Neural Cellular Automata"](https://distill.pub/2020/growing-ca/) by Alexander Mordvintsev, Ettore Randazzo, Eyvind Niklasson, and Michael Levin. The original work demonstrated 2D cellular automata; this project extends those concepts into three dimensions.
The implementation is based on Quentin Wach's blog post, which provided a clear 2D implementation. This project extends that work into three dimensions by:

Adapting the perception mechanism from 2D convolutions to 3D (considering all 26 neighbors in a cubic grid)
Extending the state representation to work with voxel-based 3D structures
Modifying the training process to handle volumetric targets instead of flat images
Implementing 3D visualization using Three.js to render the cellular automata in real-time


## Contact

GitHub: [@cedriq1astaken](https://github.com/cedriq1astaken)

Project Link: [https://github.com/cedriq1astaken/NCA3D](https://github.com/cedriq1astaken/NCA3D)

## 3D Models
Target 3D models used in this project are sourced from VoxBox Store - a collection of voxel art models.

## Acknowledgments

- Original Growing Neural Cellular Automata paper and team at Google Research
- Three.js community for excellent 3D rendering tools
- The broader cellular automata and artificial life research community
