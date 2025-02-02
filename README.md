# 3D Snake Game Simulation

This project is a 3D simulation featuring snake-like agents in a dynamic, grid-based world. Built with p5.js, it showcases emergent behaviors, detailed collision handling, and a visually diverse aesthetic driven by creative color palettes.

![3D Snake Game](https://github.com/user-attachments/assets/404ab9aa-2c5a-4d2b-88e7-f7c88ba95a7d)

## Overview

The simulation creates an evolving ecosystem where multiple autonomous snakes navigate a three-dimensional grid. They grow by consuming food, and their interactions—such as self-collision and snake-to-snake collisions—lead to dramatic outcomes such as snake death and food regeneration. Every aspect of the simulation, from movement to collision detection, is designed to provide a visually engaging and intellectually stimulating experience.

## How It Works

### World & Camera
- **Grid-Based Environment:**  
  The world is represented as a 3D grid with dimensions adapted to your screen's aspect ratio. Each cell in this grid can house either a snake segment or a food item.

- **Dynamic Camera System:**  
  The camera automatically adjusts its position and field of view to keep all active snake segments in view, ensuring a dynamic and evolving scene is always framed in real time.

### Snake Behavior
- **Structure and Movement:**  
  Each snake is modeled as an ordered list of 3D vectors representing its body segments. Movement is achieved by adding a new head segment in the current direction and removing the tail, creating the appearance of continuous motion.

- **Growth and Death:**  
  When a snake's head reaches a food item, it grows by duplicating its tail. Collisions—involving either self-collision or snake-to-snake interactions—result in the affected snake's death. Dead snakes convert their segments into food, which is integrated back into the ecosystem.

- **Collision Handling:**  
  - **Self-Collision:**  
    A snake checks for collisions with its own body (skipping the immediate segment) and terminates if a collision is detected.
  - **Inter-Snake Collision:**  
    - **Head-to-Head Collision:** If two snake heads collide, the snake with the shorter body dies. If their lengths are equal, both snakes are terminated.
    - **Head-to-Body Collision:** If a snake's head contacts another snake's body, the colliding snake dies immediately.

### Food Mechanics
- **Consumption and Regeneration:**  
  Food items are randomly scattered throughout the grid. When a snake consumes a food item by moving its head into the corresponding cell, the snake grows and the food is removed. Immediately after consumption, a new food item spawns to maintain a consistent food density.

- **Cluster Detection:**  
  The simulation monitors for clusters of food. For example, when three adjacent food items are detected (based on grid adjacency), these clusters can trigger additional events such as the spontaneous spawning of a new snake.

### Color Palettes & Visuals
- **Diverse Inspirations:**  
  The simulation features an array of creatively inspired color palettes. Drawing on sources from classical art (Mondrian, Kandinsky) to futuristic styles (Cyberpunk Neon, Synthwave, Vaporwave), these palettes are based on Tailwind CSS colors to ensure a modern look while intentionally minimizing green tones.

- **Dynamic Palette Randomization:**  
  A built-in randomization function not only shuffles simulation parameters (like snake count and initial length) but also selects a new color palette at random, providing fresh visual dynamics with every reset.

### Parameter Randomization & Control
- **Randomization Constraints:**  
  Key parameters such as the number of snakes and their initial length are randomized under the constraint that their product remains below a preset threshold. This helps maintain both the performance and balance of the simulation.
  
- **User Interaction:**  
  A dedicated "Randomize" button in the control panel allows users to trigger a complete re-randomization of simulation parameters, offering new dynamic scenarios on the fly.

## System Architecture Explanation

The simulation follows a structured flow:

1. **Start Simulation:**  
   The simulation begins by initializing core components such as the grid and the camera system.

2. **Grid & Camera Initialization:**  
   Based on the current window's aspect ratio, the 3D grid's dimensions are determined and the camera is set to frame the entire scene appropriately.

3. **Color Palette Setup:**  
   The selected color palette is loaded, ensuring that snake segments, food items, and ambient lighting adhere to a cohesive and visually appealing theme.

4. **Spawning Stage:**  
   Once the grid and palette are set, the simulation spawns snakes and food items within the grid. Each snake is assigned a starting position, direction, and color, while food is distributed randomly.

5. **Game Loop Initiation:**  
   The simulation then enters a continuous game loop, where snake movements are updated, and interactions—such as collisions and food consumption—are processed.

6. **Collision Processing:**  
   During each loop iteration, the system handles collision detection:
   - **Snake Movement & AI:** Snakes navigate the grid autonomously.
   - **Collision Handling:** Both self-collisions and inter-snake collisions are processed, with outcomes such as snake death and conversion into food.
   - **Food Management:** When a snake consumes food, it grows and a new food item is spawned instantly.

7. **Camera Adjustment and Rendering:**  
   Finally, the camera readjusts its position based on the active snake segments, and the scene is rendered accordingly, ensuring a dynamic view of the entire ecosystem.

## In Summary

- **Dynamic Environment:**  
  A self-adjusting 3D grid forms the stage for an interplay of autonomous agents that grow, compete, and perish.

- **Emergent Behavior:**  
  The combination of snake movement, collision handling, and food regeneration creates an ecosystem that evolves unpredictably with each cycle.

- **Visual and Aesthetic Creativity:**  
  A thoughtfully curated set of color palettes—from classic to futuristic—enhances the visual appeal and injects a sense of wonder into every simulation run.

The 3D Snake Game Simulation is not only an entertaining visual experiment; it's also a study in emergent behaviors, procedural animation, and creative system design. Enjoy exploring the vibrant and dynamic world that unfolds with each simulation cycle!