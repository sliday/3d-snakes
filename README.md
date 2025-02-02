# 3D Snake Game Simulation

This project is a 3D simulation featuring snake-like agents in a dynamic, grid-based world. Testing o3-mini capabilities.Built with p5.js, it showcases emergent behaviors, detailed collision handling, and a visually diverse aesthetic driven by creative color palettes.

## Overview

The simulation creates an evolving ecosystem where multiple autonomous snakes roam a three-dimensional grid. They grow by consuming food, and their interactions—such as self-collision and snake-to-snake collisions—result in dramatic changes like snake death and food regeneration. Every aspect of the simulation, from movement to collision detection, is designed to keep the experience both visually engaging and intellectually stimulating.

## How It Works

### World & Camera
- **Grid-Based Environment:**  
  The world is represented as a 3D grid with dimensions adapted to your screen's aspect ratio. Each cell in this grid can house either a snake segment or a food item.

- **Dynamic Camera System:**  
  The camera automatically adjusts its position and field of view to ensure that all active snake segments are in view, framing the evolving scene in real time.

### Snake Behavior
- **Structure and Movement:**  
  Each snake is modeled as an ordered list of 3D vectors, representing its body segments. Movement is achieved by adding a new head segment in the current direction and removing the tail, giving the appearance of continuous motion.

- **Growth and Death:**  
  When a snake's head reaches a food item, it grows by duplicating its tail. Collisions, whether self-collisions or collisions with other snakes, lead to the death of the affected snake. Dead snakes convert their segments into food, feeding back into the ecosystem.

- **Collision Handling:**  
  - **Self-Collision:**  
    The snake checks for collisions with its own body (skipping the immediate segment) and terminates if a collision is detected.
  - **Inter-Snake Collision:**  
    - **Head-to-Head Collision:** If two snake heads collide, the snake with the shorter body dies. If their lengths are equal, both snakes are terminated.
    - **Head-to-Body Collision:** If a snake's head contacts another snake's body, the colliding snake dies immediately.

### Food Mechanics
- **Consumption and Regeneration:**  
  Food items are randomly scattered in the grid. When a snake consumes a food item (by moving its head into the cell occupied by the food), the snake grows and that food is removed from play. Immediately after consumption, a new food item is spawned to maintain overall food density.

- **Cluster Detection:**  
  The simulation also monitors for clusters of food items. For instance, when three adjacent food items are detected (based on grid adjacency), these clusters can trigger additional events such as the spontaneous spawning of a new snake.

### Color Palettes & Visuals
- **Diverse Inspirations:**  
  The project features an array of creatively inspired color palettes. Drawing on sources from classical art (Mondrian, Kandinsky) to futuristic styles (Cyberpunk Neon, Synthwave, Vaporwave), the palettes are based on Tailwind CSS colors to ensure a modern and appealing look without relying heavily on green tones.

- **Dynamic Palette Randomization:**  
  A built-in randomization function not only shuffles simulation parameters (like snake count and length) but also randomly selects a new color palette, ensuring fresh and surprising visual dynamics with every reset.

### Parameter Randomization & Control
- **Randomization Constraints:**  
  Parameters such as the number of snakes and the initial snake length are randomized under the constraint that their product remains below a preset threshold. This balance maintains simulation performance and internal consistency.
  
- **User Interaction:**  
  A dedicated "Randomize" button in the control panel triggers a complete re-randomization of simulation parameters, allowing for exploration of new dynamic scenarios on the fly.

## System Architecture Diagram
```mermaid
graph TD;
    A[Start Simulation] --> B[Initialize Grid & Camera];
    B --> C[Load Selected Color Palette];
    C --> D[Spawn Snakes & Food];
    D --> E[Enter Game Loop];
    E --> F[Update Snake Movement & AI];
    E --> G[Process Collisions (Self & Inter-Snake)];
    E --> H[Handle Food Consumption & Spawning];
    E --> I[Adjust Camera & Render Scene];
```

## In Summary

- **Dynamic Environment:**  
  A self-adjusting 3D grid becomes the stage for an interplay of autonomous agents that grow, compete, and perish.

- **Emergent Behavior:**  
  The combination of snake movement, collision handling, and food regeneration creates a rich, emergent ecosystem that evolves unpredictably with each iteration.

- **Visual and Aesthetic Creativity:**  
  A thoughtfully curated set of color palettes—ranging from classic to futuristic—enhances the visual appeal and injects a sense of wonder into every simulation run.

The 3D Snake Game Simulation is not only an entertaining visual experiment—it's also a study in emergent behaviors, procedural animation, and creative system design. Enjoy exploring the vibrant, dynamic world that unfolds with each simulation cycle!
