// Global constants
// Color palettes

// Calculate grid dimensions based on screen aspect ratio
let BASE_GRID_SIZE = 200;      // Base size for the smallest dimension
let GRID_X, GRID_Y, GRID_Z;      // Actual grid dimensions

const MOVE_INTERVAL = 1;       // Time per move (ms) - fixed at maximum speed
let NUM_SNAKES = 100;           // Number of snakes
let INITIAL_SNAKE_LENGTH = 5;  // Starting segments per snake
let FOOD_COUNT = 100;            // Initial food cubes (sparse)
const cellSize = 10;             // Size of each cell in pixels (fixed)
let bgColor;  // Will be set from the palette in updatePalette()
let FOOD_MAX_AGE = 10000;     // Max lifetime for food in ms (10 seconds)
let currentPalette = 'default';  // Initial palette selection

// Camera control variables
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let camX = 0, camY = 0, camZ = 0;
let rotX, rotY;    // Will be initialized in setup()
const CAM_SPEED = 5;
const ZOOM_SPEED = 0.1;
let zoom = 0.5;  // Start more zoomed in
const MIN_ZOOM = 0.1;  // Maximum zoom out (smaller number = further out)
const MAX_ZOOM = 3.333;  // Maximum zoom in
const ROTATION_SENSITIVITY = 0.005;

// Global variables
let snakes = [];
let foods = [];
let lastMoveTime = 0;
let palette;
let lastFoodSpawnTime = 0;
const FOOD_SPAWN_INTERVAL = 100; // in milliseconds, adjust as desired
const FOOD_SPAWN_COUNT = 3;      // number of food particles to spawn per event
const FOOD_SPAWN_SPREAD = 2;     // spread (in grid cells) around the base cell
let camEye, camCenter, globalFOV, globalAspect;
const DEBUG = false; // Set to true to enable debug logs
let fixedLights = {}; // Fixed light colors to avoid flickering
let motionBlurAmount = 75;  // Value between 0-100 for plane transparency (default 50%)

// Add these global variables at the top with other camera variables
let targetCamParams = {
  centerX: 0,
  centerY: 0,
  centerZ: 0,
  distance: 500,
  lastUpdate: 0
};
let currentCamParams = {
  centerX: 0,
  centerY: 0,
  centerZ: 0,
  distance: 500
};
const CAM_UPDATE_INTERVAL = 1000; // Update target every 1 second
const CAM_SMOOTH_FACTOR = 0.1; // Lower = smoother (0.05 to 0.2 is good range)

// Add new global variables at the top
let gravityStrength = 0;  // -100 to +100
const GRAVITY_UPDATE_INTERVAL = 100;
let lastGravityUpdate = 0;
const FOOD_BIRTH_COUNT = 4;  // Number of food items needed to create a snake

// Add these global variables at the top
let foodVelocities = new Map(); // Store velocities for each food item
const FRICTION = 0.98;  // Damping factor for velocities
const MAX_VELOCITY = 0.5;  // Maximum velocity magnitude

// At the top with other global variables
let snakeStyle = 'cubes';  // New style selector: either 'cubes' or 'dots'

// Add PHI constant for scaling (golden ratio)
const PHI = 1.618;

// Add helper function for slight color shift
function shiftColor(c, amount) {
  let r = red(c) + amount;
  let g = green(c) + amount;
  let b = blue(c) + amount;
  return color(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
}

// Initialize grid dimensions in setup() based on window proportions
function initializeGrid() {
  let aspectRatio = windowWidth / windowHeight;
  if (aspectRatio > 1) {
    // Wider than tall
    GRID_Y = BASE_GRID_SIZE;
    GRID_X = Math.floor(BASE_GRID_SIZE * aspectRatio);
    GRID_Z = Math.floor(BASE_GRID_SIZE * aspectRatio);
  } else {
    // Taller than wide
    GRID_X = BASE_GRID_SIZE;
    GRID_Y = Math.floor(BASE_GRID_SIZE / aspectRatio);
    GRID_Z = BASE_GRID_SIZE;
  }
  if (DEBUG) console.log(`Grid dimensions: ${GRID_X} x ${GRID_Y} x ${GRID_Z}`);
}

function setup() {
  if (DEBUG) console.log('Starting game setup...');
  // Initialize camera rotation angles
  rotX = -PI/6;
  rotY = PI/4;
  
  initializeGrid();
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Choose a random color palette from available palettes in PALETTES.
  currentPalette = random(Object.keys(PALETTES));
  
  // Initialize color palette
  updatePalette();
  if (DEBUG) console.log(`Initialized palette with ${palette.length} colors`);
  updatePaletteDropdown();
  
  // Set up lighting system
  setupLights();
  
  // Initialize snakes
  let snakesPerRow = ceil(sqrt(NUM_SNAKES));
  let spacing = floor(GRID_X / snakesPerRow);
  if (DEBUG) console.log(`Creating ${NUM_SNAKES} snakes, ${snakesPerRow} per row, spacing: ${spacing}`);
  
  for (let i = 0; i < NUM_SNAKES; i++) {
    let row = floor(i / snakesPerRow);
    let col = i % snakesPerRow;
    let pos = createVector(
      (col * spacing + spacing/2) % GRID_X,
      (row * spacing + spacing/2) % GRID_Y,
      floor(random(GRID_Z))
    );
    let dir = random([
      createVector(1,0,0), createVector(-1,0,0),
      createVector(0,1,0), createVector(0,-1,0),
      createVector(0,0,1), createVector(0,0,-1)
    ]);
    if (DEBUG) console.log(`Snake ${i}: pos(${pos.x}, ${pos.y}, ${pos.z}), dir(${dir.x}, ${dir.y}, ${dir.z})`);
    snakes.push(new Snake(pos, dir, random(palette)));
  }
  
  // Spawn initial food
  for (let i = 0; i < FOOD_COUNT; i++) {
    spawnFood();
  }
  if (DEBUG) console.log(`Spawned ${FOOD_COUNT} initial food items`);
  
  lastMoveTime = millis();
  if (DEBUG) console.log('Setup complete');
  blendMode(BLEND);
}

function draw() {
  // Ensure motionBlurAmount stays within 0-100 range
  motionBlurAmount = constrain(motionBlurAmount, 0, 100);
  
  // First, handle the motion blur effect
  push();  // Save the current transformation state
    // Reset the matrix and set up 2D drawing mode
    resetMatrix();
    // In WEBGL mode, translate to top-left corner (since WEBGL uses center as origin)
    translate(-width/2, -height/2);
    // Set up for 2D drawing
    noStroke();
    // Map motionBlurAmount (0-100) to alpha (255-0)
    let alpha = map(motionBlurAmount, 0, 100, 255, 0);
    // Use the current bgColor with calculated alpha
    fill(red(bgColor), green(bgColor), blue(bgColor), alpha);
    // Draw the overlay rectangle to exactly cover the screen
    rect(-width*16, -height*16, width*32, height*32);
  pop();  // Restore the transformation state
  
  // Auto-adjust camera to frame all snakes
  autoAdjustCamera();
  
  // Refresh lights each frame
  setupLights();
  
  // Game update logic
  if (millis() - lastMoveTime > MOVE_INTERVAL) {
    updateGame();
    lastMoveTime = millis();
  }
  
  // Draw game elements
  push();  // Save state before grid translation
    // Center the grid
    translate(-GRID_X * cellSize/2, -GRID_Y * cellSize/2, -GRID_Z * cellSize/2);
    
    // Draw food
    for (let f of foods) {
      push();  // Save state for each food item
        translate(f.pos.x * cellSize, f.pos.y * cellSize, f.pos.z * cellSize);
        if (snakeStyle === 'dots') {
          // Draw food as dots
          stroke(f.col);
          strokeWeight(4);
          point(0, 0);
        } else {
          // Draw food as pyramids
          fill(f.col);
          noStroke();
          let age = millis() - f.birth;
          let factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1);
          let rotXAngle = noise(frameCount/1000 + f.birth) * TWO_PI;
          let rotYAngle = noise(frameCount/1000 + f.birth + 100) * TWO_PI;
          let rotZAngle = noise(frameCount/1000 + f.birth + 200) * TWO_PI;
          rotateX(rotXAngle);
          rotateY(rotYAngle);
          rotateZ(rotZAngle);
          drawPyramid(cellSize * factor);
        }
      pop();  // Restore state after drawing food
    }
    
    // Draw snakes
    for (let s of snakes) {
      s.draw();
    }
  pop();  // Restore state after drawing grid
  
  // Draw debug overlay
  drawDebugInfo();
  
  // Handle food spawning on mouse press
  if (mouseIsPressed) {
    let now = millis();
    if (now - lastFoodSpawnTime > FOOD_SPAWN_INTERVAL) {
      spawnFoodUnderCursor();
      lastFoodSpawnTime = now;
    }
  }
}

function handleCameraMovement() {
  // Get forward vector based on camera rotation
  let forward = createVector(sin(rotY), 0, cos(rotY));
  // Get right vector based on camera rotation
  let right = createVector(cos(rotY), 0, -sin(rotY));
  
  let moveSpeed = CAM_SPEED * (1 - CAM_SMOOTH_FACTOR); // Reduce speed for smoother movement
  
  // WASD movement relative to camera direction
  if (keyIsDown(87)) { // W - forward
    camX += forward.x * moveSpeed;
    camZ += forward.z * moveSpeed;
  }
  if (keyIsDown(83)) { // S - backward
    camX -= forward.x * moveSpeed;
    camZ -= forward.z * moveSpeed;
  }
  if (keyIsDown(65)) { // A - left
    camX -= right.x * moveSpeed;
    camZ -= right.z * moveSpeed;
  }
  if (keyIsDown(68)) { // D - right
    camX += right.x * moveSpeed;
    camZ += right.z * moveSpeed;
  }
  
  // Q/E for vertical movement
  if (keyIsDown(81)) camY -= moveSpeed; // Q
  if (keyIsDown(69)) camY += moveSpeed; // E
}

// --- Snake Class ---
class Snake {
  constructor(startPos, initialDirection, col) {
    if (DEBUG) console.log(`Creating snake at (${startPos.x}, ${startPos.y}, ${startPos.z})`);
    this.col = col;
    // Pick two dot colors: foreground uses the snake's base color,
    // background is chosen from the current palette (excluding the base color)
    this.dotForeground = this.col;
    let available = palette.filter(c => c !== this.col);
    this.dotBackground = available.length > 0 ? random(available) : this.col;
    this.body = [];
    this.direction = initialDirection.copy();
    this.pendingDirection = initialDirection.copy();
    this.alive = true;
    // Initialize snake with INITIAL_SNAKE_LENGTH segments.
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      let seg = startPos.copy();
      seg.sub(p5.Vector.mult(this.direction, i));
      this.body.push(seg);
    }
    if (DEBUG) console.log(`Snake created with ${this.body.length} segments`);
  }
  
  // Draw the snake (each body segment as a box).
  draw() {
    if (!this.alive) return;
    
    for (let seg of this.body) {
      if (snakeStyle === 'dots') {
        push();
        // Place the segment correctly in world space
        translate(seg.x * cellSize, seg.y * cellSize, seg.z * cellSize);

        // Draw second dot with the snake's background color
        let offset = (cellSize * 0.33) / PHI;
        stroke(this.dotBackground);
        point(offset, offset);
                
        // Draw first dot using the snake's foreground color
        stroke(this.dotForeground);
        strokeWeight(8 / PHI);
        point(0, 0);
        pop();
      } else {
        push();
        translate(seg.x * cellSize, seg.y * cellSize, seg.z * cellSize);
        fill(this.col);
        noStroke(); // Ensure no stroke is applied in Cubes mode.
        box(cellSize * 1.1);
        pop();
      }
    }
  }
  
  // Set snake's direction, avoiding direct reversal.
  setDirection(newDir) {
    // Allow the new direction only if it is not directly opposite.
    if (!newDir.equals(p5.Vector.mult(this.direction, -1))) {
      this.pendingDirection = newDir.copy();
    }
  }
  
  // Move snake: apply pending direction, add new head, and remove tail.
  move() {
    this.direction = this.pendingDirection.copy();
    let head = this.body[0].copy();
    head.add(this.direction);
    // Wrap-around grid boundaries
    head.x = (head.x + GRID_X) % GRID_X;
    head.y = (head.y + GRID_Y) % GRID_Y;
    head.z = (head.z + GRID_Z) % GRID_Z;
    this.body.unshift(head);
    this.body.pop();
  }
  
  // Grow snake by duplicating the tail segment.
  grow() {
    let tail = this.body[this.body.length - 1].copy();
    this.body.push(tail);
  }
  
  // Check if snake's head collides with any body segment (starting from index 1).
  checkSelfCollision() {
    let head = this.body[0];
    // Start checking from index 4 to give more room for tight turns
    for (let i = 4; i < this.body.length; i++) {
      if (equalWithWrapping(head, this.body[i])) {
        if (DEBUG) console.log(`Snake self-collision at segment ${i}`);
        return true;
      }
    }
    return false;
  }
  
  // On self-collision, convert every 2nd voxel (odd-indexed) into food and remove them.
  handleSelfCollision() {
    if (DEBUG) console.log(`Snake self-collision! Length before: ${this.body.length}`);
    this.die();
  }
  
  // When the snake dies, convert all voxels into food.
  die() {
    if (DEBUG) console.log(`Snake dying, converting ${this.body.length} segments to food`);
    this.alive = false;
    for (let seg of this.body) {
      spawnFoodAt(seg.x, seg.y, seg.z);
    }
  }
}

// --- AI & Collision Functions ---

function updateGame() {
  const aliveCount = snakes.filter(s => s.alive).length;
  if (DEBUG) console.log(`Update cycle: ${aliveCount} snakes alive, ${foods.length} food items`);
  
  // Update gravity effects
  updateGravityEffects();
  
  // Update each snake: determine direction, move, check for food, and self-collision.
  snakes.forEach((snake, index) => {
    if (!snake.alive) return;
    updateAISnake(snake);
    snake.move();
    checkFoodCollision(snake);
    if (snake.checkSelfCollision()) {
      if (DEBUG) console.log(`Snake ${index} detected self-collision`);
      snake.handleSelfCollision();
    }
  });

  // Process collisions between snakes
  processCollisions();
  
  // Check for clusters of 3 food blocks to spawn new snakes.
  checkFoodClusters();
  
  // Remove expired food items (food that has lived past its lifetime)
  updateFoods();
}

// AI: Update snake's direction using classic snake game logic
function updateAISnake(snake) {
  if (foods.length === 0) return;
  let head = snake.body[0];
  
  // Find closest food using grid distance (no wrapping)
  let closestFood = null;
  let minDistance = Infinity;
  
  for (let food of foods) {
    // Calculate direct grid distance
    let dx = Math.abs(food.pos.x - head.x);
    let dy = Math.abs(food.pos.y - head.y);
    let dz = Math.abs(food.pos.z - head.z);
    let distance = dx + dy + dz;  // Manhattan distance
    
    if (distance < minDistance) {
      minDistance = distance;
      closestFood = food;
    }
  }
  
  if (!closestFood) return;
  
  // Current direction vector components
  let currentDirX = snake.direction.x;
  let currentDirY = snake.direction.y;
  let currentDirZ = snake.direction.z;
  
  // Calculate direction to food
  let dx = closestFood.pos.x - head.x;
  let dy = closestFood.pos.y - head.y;
  let dz = closestFood.pos.z - head.z;
  
  // Prioritize current direction if it leads to food
  if ((dx > 0 && currentDirX > 0) || (dx < 0 && currentDirX < 0) ||
      (dy > 0 && currentDirY > 0) || (dy < 0 && currentDirY < 0) ||
      (dz > 0 && currentDirZ > 0) || (dz < 0 && currentDirZ < 0)) {
    return; // Keep current direction
  }
  
  // Try to move along the axis with largest distance first
  let newDir = createVector(0, 0, 0);
  
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz)) {
    newDir.x = Math.sign(dx);
  } else if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= Math.abs(dz)) {
    newDir.y = Math.sign(dy);
  } else {
    newDir.z = Math.sign(dz);
  }
  
  // Only change direction if the new direction is safe
  if (isSafeMove(snake, newDir)) {
    snake.setDirection(newDir);
  }
}

// Helper function to check if a move is safe
function isSafeMove(snake, dir) {
  let head = snake.body[0];
  let nextPos = p5.Vector.add(head, dir);
  
  // Check collision with own body (except tail which will move)
  for (let i = 0; i < snake.body.length - 1; i++) {
    if (nextPos.x === snake.body[i].x && 
        nextPos.y === snake.body[i].y && 
        nextPos.z === snake.body[i].z) {
      return false;
    }
  }
  
  // Check collision with other snakes
  for (let otherSnake of snakes) {
    if (!otherSnake.alive || otherSnake === snake) continue;
    for (let seg of otherSnake.body) {
      if (nextPos.x === seg.x && 
          nextPos.y === seg.y && 
          nextPos.z === seg.z) {
        return false;
      }
    }
  }
  
  return true;
}

// Process collisions between snakes.
// If two snakes collide head-to-head, the smaller snake dies.
// If the snakes are equal in length, both die.
// If a snake's head hits another snake's body, the colliding snake dies.
function processCollisions() {
  for (let i = 0; i < snakes.length; i++) {
    for (let j = i + 1; j < snakes.length; j++) {
      if (!snakes[i].alive || !snakes[j].alive) continue;
      
      let headA = snakes[i].body[0];
      let headB = snakes[j].body[0];
      
      // Head-to-head collision with proper grid wrapping
      if (equalWithWrapping(headA, headB)) {
        if (DEBUG) console.log(`Head-to-head collision between snakes ${i} and ${j}`);
        if (snakes[i].body.length < snakes[j].body.length) {
          snakes[i].die();
        } else if (snakes[i].body.length > snakes[j].body.length) {
          snakes[j].die();
        } else {
          // If equal length, both die
          snakes[i].die();
          snakes[j].die();
        }
        continue;
      }
      
      // Check if snake i's head hits any segment of snake j
      for (let k = 1; k < snakes[j].body.length; k++) {
        if (equalWithWrapping(headA, snakes[j].body[k])) {
          if (DEBUG) console.log(`Snake ${i}'s head hit snake ${j}'s body`);
          snakes[i].die();
          break;
        }
      }
      
      // Check if snake j's head hits any segment of snake i
      for (let k = 1; k < snakes[i].body.length; k++) {
        if (equalWithWrapping(headB, snakes[i].body[k])) {
          if (DEBUG) console.log(`Snake ${j}'s head hit snake ${i}'s body`);
          snakes[j].die();
          break;
        }
      }
    }
  }
}

// Simplify food collision to basic 2D snake game style
function checkFoodCollision(snake) {
  let head = snake.body[0];
  for (let i = foods.length - 1; i >= 0; i--) {
    let food = foods[i];
    // Simple position comparison without wrapping
    if (head.x === food.pos.x && 
        head.y === food.pos.y && 
        head.z === food.pos.z) {
      snake.grow();
      removeFoodItem(food);
      // Spawn new food at random location
      spawnFood();
      break;
    }
  }
}

// Spawn food at a random grid cell.
function spawnFood() {
  let pos = createVector(
    Math.floor(random(GRID_X)),
    Math.floor(random(GRID_Y)),
    Math.floor(random(GRID_Z))
  );
  
  // Initialize with zero velocity
  let foodItem = { pos: pos, birth: millis(), col: palette[0] };
  foods.push(foodItem);
  foodVelocities.set(foodItem, createVector(0, 0, 0));
}

// Spawn food at a specific grid cell.
function spawnFoodAt(x, y, z) {
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  // Ensure coordinates wrap around grid
  x = (x + GRID_X) % GRID_X;
  y = (y + GRID_Y) % GRID_Y;
  z = (z + GRID_Z) % GRID_Z;
  let pos = createVector(x, y, z);
  
  // Check if position is already occupied by food
  for (let f of foods) {
    if (equalWithWrapping(f.pos, pos)) {
      return; // Don't spawn duplicate food
    }
  }
  foods.push({ pos: pos, birth: millis(), col: palette[0] });
}

function drawDebugInfo() {
  // Debug text disabled.
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recalculate grid dimensions based on new window size
  initializeGrid();
  // Reset camera parameters to adjust to new window size
  targetCamParams = {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    distance: 500,
    lastUpdate: 0
  };
  currentCamParams = {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    distance: 500
  };
}

function mouseWheel(event) {
  // event.delta is positive when scrolling down/away, negative when scrolling up/toward
  zoom = constrain(zoom + event.delta * ZOOM_SPEED * 0.001, MIN_ZOOM, MAX_ZOOM);
  return false; // Prevent default scrolling
}

function setupLights() {
  // Use fixed ambient and directional light (do not re-randomize each frame)
  ambientLight(80);
  
  // Main directional light from camera direction using fixed main light color.
  directionalLight(red(fixedLights.main), green(fixedLights.main), blue(fixedLights.main),
                   sin(rotY), sin(rotX), -cos(rotY)*cos(rotX));
  
  // Supporting directional lights using fixed colors.
  directionalLight(red(fixedLights.front), green(fixedLights.front), blue(fixedLights.front),
                   -cos(rotY), sin(rotX), -sin(rotY)*cos(rotX));
  directionalLight(red(fixedLights.back), green(fixedLights.back), blue(fixedLights.back),
                   cos(rotY), sin(rotX), sin(rotY)*cos(rotX));
  directionalLight(red(fixedLights.top), green(fixedLights.top), blue(fixedLights.top),
                    0, 1, 0);    // Light from above
  directionalLight(red(fixedLights.bottom), green(fixedLights.bottom), blue(fixedLights.bottom),
                    0, -1, 0); // Light from below
}

function mousePressed() {
  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseReleased() {
  isDragging = false;
}

function mouseDragged() {
  if (isDragging) {
    // Calculate the change in mouse position
    let deltaX = (mouseX - lastMouseX) * ROTATION_SENSITIVITY;
    let deltaY = (mouseY - lastMouseY) * ROTATION_SENSITIVITY;
    
    // Update rotation angles
    rotY += deltaX;
    rotX = constrain(rotX - deltaY, -PI/2, PI/2);
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

// Check if there are clusters of 3 contiguous food items.
// If a cluster of exactly 3 food items is found, remove them
// and spawn a 1-cell snake at the average grid position of the cluster.
function checkFoodClusters() {
  let clusters = [];
  let visited = new Array(foods.length).fill(false);
  
  // Find clusters of adjacent food items
  for (let i = 0; i < foods.length; i++) {
    if (visited[i]) continue;
    
    let cluster = [];
    let toCheck = [i];
    visited[i] = true;
    
    while (toCheck.length > 0) {
      let current = toCheck.pop();
      cluster.push(current);
      
      // Check all neighboring cells (26 neighbors in 3D)
      for (let j = 0; j < foods.length; j++) {
        if (visited[j]) continue;
        
        let dx = Math.abs(foods[current].pos.x - foods[j].pos.x);
        if (dx > 1 && dx < GRID_X - 1) continue;
        
        let dy = Math.abs(foods[current].pos.y - foods[j].pos.y);
        if (dy > 1 && dy < GRID_Y - 1) continue;
        
        let dz = Math.abs(foods[current].pos.z - foods[j].pos.z);
        if (dz > 1 && dz < GRID_Z - 1) continue;
        
        // If food items are adjacent (including diagonally)
        if (dx <= 1 || dx >= GRID_X - 1) {
          if (dy <= 1 || dy >= GRID_Y - 1) {
            if (dz <= 1 || dz >= GRID_Z - 1) {
              toCheck.push(j);
              visited[j] = true;
            }
          }
        }
      }
    }
    
    if (cluster.length >= FOOD_BIRTH_COUNT) {
      clusters.push(cluster);
    }
  }
  
  // Process valid clusters
  let indicesToRemove = [];
  for (let cluster of clusters) {
    // Calculate average position
    let sum = createVector(0, 0, 0);
    for (let idx of cluster) {
      sum.add(foods[idx].pos);
    }
    sum.div(cluster.length);
    
    // Round to nearest grid position
    let newPos = createVector(
      Math.round(sum.x),
      Math.round(sum.y),
      Math.round(sum.z)
    );
    
    // Spawn new snake
    let snake = spawnSnakeAt(newPos);
    snakes.push(snake);
    
    if (DEBUG) console.log(`Cluster of ${cluster.length} food turned into a snake at (${newPos.x}, ${newPos.y}, ${newPos.z})`);
    indicesToRemove.push(...cluster);
  }
  
  // Remove used food items
  indicesToRemove.sort((a, b) => b - a);
  for (let idx of indicesToRemove) {
    foods.splice(idx, 1);
  }
}

// Spawn a 1-cell snake at a given grid position.
function spawnSnakeAt(pos) {
  // Ensure starting position wraps around grid
  pos.x = (pos.x + GRID_X) % GRID_X;
  pos.y = (pos.y + GRID_Y) % GRID_Y;
  pos.z = (pos.z + GRID_Z) % GRID_Z;
  
  let dir = random([
    createVector(1, 0, 0), createVector(-1, 0, 0),
    createVector(0, 1, 0), createVector(0, -1, 0),
    createVector(0, 0, 1), createVector(0, 0, -1)
  ]);
  let snake = new Snake(pos, dir, random(palette));
  snake.body = [pos.copy()];
  return snake;
}

function updateFoods() {
  let now = millis();
  for (let i = foods.length - 1; i >= 0; i--) {
    if (now - foods[i].birth > FOOD_MAX_AGE) {
      removeFoodItem(foods[i]);
    }
  }
}

// Draw a simple square pyramid centered at the origin.
// The pyramid has an apex and a square base.
function drawPyramid(s) {
  // Define vertices for a square pyramid.
  // We'll position the apex at (0, -s/2, 0) and the base centered at (0, s/2, 0).
  let apex = createVector(0, -s/2, 0);
  let v1 = createVector(s/2, s/2, s/2);
  let v2 = createVector(s/2, s/2, -s/2);
  let v3 = createVector(-s/2, s/2, -s/2);
  let v4 = createVector(-s/2, s/2, s/2);
  
  // Draw four triangular side faces.
  beginShape(TRIANGLES);
  vertex(apex.x, apex.y, apex.z);
  vertex(v1.x, v1.y, v1.z);
  vertex(v2.x, v2.y, v2.z);
  endShape(CLOSE);
  
  beginShape(TRIANGLES);
  vertex(apex.x, apex.y, apex.z);
  vertex(v2.x, v2.y, v2.z);
  vertex(v3.x, v3.y, v3.z);
  endShape(CLOSE);
  
  beginShape(TRIANGLES);
  vertex(apex.x, apex.y, apex.z);
  vertex(v3.x, v3.y, v3.z);
  vertex(v4.x, v4.y, v4.z);
  endShape(CLOSE);
  
  beginShape(TRIANGLES);
  vertex(apex.x, apex.y, apex.z);
  vertex(v4.x, v4.y, v4.z);
  vertex(v1.x, v1.y, v1.z);
  endShape(CLOSE);
  
  // Draw the base (a quadrilateral).
  beginShape();
  vertex(v1.x, v1.y, v1.z);
  vertex(v2.x, v2.y, v2.z);
  vertex(v3.x, v3.y, v3.z);
  vertex(v4.x, v4.y, v4.z);
  endShape(CLOSE);
}

// Auto-adjust camera: computes the bounding box of all alive snake segments
// based on their world coordinates (after applying the scene translation) 
// and sets the camera so that the entire scene is in view.
function autoAdjustCamera() {
  let now = millis();
  
  // Update target parameters periodically
  if (now - targetCamParams.lastUpdate > CAM_UPDATE_INTERVAL) {
    updateTargetCameraParams();
    targetCamParams.lastUpdate = now;
  }
  
  // Smoothly interpolate current parameters
  currentCamParams.centerX += (targetCamParams.centerX - currentCamParams.centerX) * CAM_SMOOTH_FACTOR;
  currentCamParams.centerY += (targetCamParams.centerY - currentCamParams.centerY) * CAM_SMOOTH_FACTOR;
  currentCamParams.centerZ += (targetCamParams.centerZ - currentCamParams.centerZ) * CAM_SMOOTH_FACTOR;
  currentCamParams.distance += (targetCamParams.distance - currentCamParams.distance) * CAM_SMOOTH_FACTOR;
  
  // Apply camera transform
  let centerWorld = createVector(
    currentCamParams.centerX,
    currentCamParams.centerY,
    currentCamParams.centerZ
  );
  
  // Calculate camera position
  const FOV = PI / 3;
  let eye = centerWorld.copy();
  eye.add(createVector(0, 0, currentCamParams.distance));
  
  // Store camera parameters for unprojection
  camEye = eye.copy();
  camCenter = centerWorld.copy();
  globalFOV = FOV;
  globalAspect = width / height;
  
  camera(eye.x, eye.y, eye.z,
         centerWorld.x, centerWorld.y, centerWorld.z,
         0, 1, 0);
}

// New function to calculate target camera parameters
function updateTargetCameraParams() {
  // Calculate bounding box of all alive snakes
  let offset = createVector(GRID_X * cellSize / 2, GRID_Y * cellSize / 2, GRID_Z * cellSize / 2);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  let hasAliveSnakes = false;
  
  for (let snake of snakes) {
    if (!snake.alive) continue;
    hasAliveSnakes = true;
    for (let seg of snake.body) {
      let wx = seg.x * cellSize - offset.x;
      let wy = seg.y * cellSize - offset.y;
      let wz = seg.z * cellSize - offset.z;
      minX = min(minX, wx);
      minY = min(minY, wy);
      minZ = min(minZ, wz);
      maxX = max(maxX, wx);
      maxY = max(maxY, wy);
      maxZ = max(maxZ, wz);
    }
  }
  
  // If no alive snakes, use default values
  if (!hasAliveSnakes) {
    targetCamParams.centerX = 0;
    targetCamParams.centerY = 0;
    targetCamParams.centerZ = 0;
    targetCamParams.distance = 500;
    return;
  }
  
  // Calculate center point
  targetCamParams.centerX = (minX + maxX) / 2;
  targetCamParams.centerY = (minY + maxY) / 2;
  targetCamParams.centerZ = (minZ + maxZ) / 2;
  
  // Calculate required distance to fit all snakes
  let dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  let maxDim = max(dx, dy, dz);
  
  // Add some padding
  const FOV = PI / 3;
  targetCamParams.distance = (maxDim / 2) / tan(FOV / 2) * 1.2;
  
  // Add minimum distance to prevent camera from getting too close
  targetCamParams.distance = max(targetCamParams.distance, 200);
}

// Update simulation parameters from control panel
function updateParams() {
  NUM_SNAKES = parseInt(document.getElementById('numSnakes').value);
  FOOD_COUNT = parseInt(document.getElementById('foodCount').value);
  INITIAL_SNAKE_LENGTH = parseInt(document.getElementById('snakeLength').value);
  FOOD_MAX_AGE = parseInt(document.getElementById('foodMaxAge').value);
  motionBlurAmount = parseFloat(document.getElementById('motionBlur').value);
  currentPalette = document.getElementById('colorPalette').value;
  gravityStrength = parseInt(document.getElementById('gravityStrength').value);
  snakeStyle = document.getElementById('snakeStyle').value;
  updatePalette();
}

// Restart the simulation with new parameters
function restartSimulation() {
  updateParams();
  // Force clear background on restart
  background(red(bgColor), green(bgColor), blue(bgColor), 255); // Full clear on restart
  // Clear existing arrays
  snakes = [];
  foods = [];
  foodVelocities.clear();  // Clear all velocities
  // Reset camera position
  camX = 0;
  camY = 0;
  camZ = 0;
  // Reset camera rotation
  rotX = -PI/6;
  rotY = PI/4;
  zoom = 0.5;  // Reset to initial zoomed in value
  // Reinitialize grid
  initializeGrid();
  // Create new snakes
  let snakesPerRow = ceil(sqrt(NUM_SNAKES));
  let spacing = floor(GRID_X / snakesPerRow);
  for (let i = 0; i < NUM_SNAKES; i++) {
    let row = floor(i / snakesPerRow);
    let col = i % snakesPerRow;
    let pos = createVector(
      (col * spacing + spacing/2) % GRID_X,
      (row * spacing + spacing/2) % GRID_Y,
      floor(random(GRID_Z))
    );
    let dir = random([
      createVector(1, 0, 0), createVector(-1, 0, 0),
      createVector(0, 1, 0), createVector(0, -1, 0),
      createVector(0, 0, 1), createVector(0, 0, -1)
    ]);
    snakes.push(new Snake(pos, dir, random(palette)));
  }
  // Spawn initial food
  for (let i = 0; i < FOOD_COUNT; i++) {
    spawnFood();
  }
  lastMoveTime = millis();
}

// Toggle control panel visibility
function togglePanel() {
  const content = document.querySelector('.panel-content');
  const icon = document.querySelector('.toggle-icon');
  content.classList.toggle('expanded');
  icon.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
}

// Update the color palette array from the selected palette
function updatePalette() {
  palette = PALETTES[currentPalette].colors.map(c => color(c));
  // Update background color from the palette's bg property, but only store it
  // Don't apply it directly to avoid jumpy background
  bgColor = PALETTES[currentPalette].bg;
  
  // Create a semi-transparent version of bgColor for motion blur
  let motionBlurColor = color(red(bgColor), green(bgColor), blue(bgColor));
  
  // Precompute fixed light colors (choose once per palette update)
  fixedLights.main  = color(255, 255, 255); // Main directional light (white)
  fixedLights.front = random(palette);
  fixedLights.back  = random(palette);
  fixedLights.top   = random(palette);
  fixedLights.bottom= random(palette);
}

// Populate the color palette dropdown with available palettes from PALETTES
function updatePaletteDropdown() {
  let select = document.getElementById('colorPalette');
  if (select) {
    // Clear out any existing options.
    select.innerHTML = '';
    // Iterate through all palettes defined in PALETTES.
    for (let key in PALETTES) {
      if (PALETTES.hasOwnProperty(key)) {
        let option = document.createElement('option');
        option.value = key;
        option.textContent = PALETTES[key].name;
        if (key === currentPalette) {
          option.selected = true;
        }
        select.appendChild(option);
      }
    }
  }
}

// Spawn multiple food particles at grid cells determined by perspective.
function spawnFoodUnderCursor() {
  // Place the plane at a fixed distance in front of the camera
  let planeDistance = 1000; // Distance from camera to plane
  
  // Get plane point in front of camera
  let planePoint = p5.Vector.add(
    camEye,
    p5.Vector.mult(p5.Vector.sub(camCenter, camEye).normalize(), planeDistance)
  );
  
  // Compute normalized device coordinates (NDC) from mouse position.
  let ndcX = (mouseX / width) * 2 - 1;
  let ndcY = 1 - (mouseY / height) * 2;
  
  // Compute the ray direction in camera space.
  let rayDir = createVector(ndcX * tan(globalFOV / 2) * globalAspect, ndcY * tan(globalFOV / 2), -1);
  rayDir.normalize();
  
  // Calculate intersection with plane
  let planeNormal = p5.Vector.sub(camCenter, camEye).normalize();
  let t = p5.Vector.dot(p5.Vector.sub(planePoint, camEye), planeNormal) / 
         p5.Vector.dot(rayDir, planeNormal);
  
  let intersect = p5.Vector.add(camEye, p5.Vector.mult(rayDir, t));
  
  // Convert the intersection point to grid indices.
  let baseX = Math.floor((intersect.x + GRID_X * cellSize / 2) / cellSize);
  let baseY = Math.floor((intersect.y + GRID_Y * cellSize / 2) / cellSize);
  let baseZ = Math.floor((intersect.z + GRID_Z * cellSize / 2) / cellSize);
  
  // Spawn several food particles with small random offsets around the base cell.
  for (let i = 0; i < FOOD_SPAWN_COUNT; i++) {
    let offsetX = floor(random(-FOOD_SPAWN_SPREAD, FOOD_SPAWN_SPREAD + 1));
    let offsetY = floor(random(-FOOD_SPAWN_SPREAD, FOOD_SPAWN_SPREAD + 1));
    let offsetZ = floor(random(-FOOD_SPAWN_SPREAD, FOOD_SPAWN_SPREAD + 1));
    let gridX = constrain(baseX + offsetX, 0, GRID_X - 1);
    let gridY = constrain(baseY + offsetY, 0, GRID_Y - 1);
    let gridZ = constrain(baseZ + offsetZ, 0, GRID_Z - 1);
    spawnFoodAt(gridX, gridY, gridZ);
  }
}

// Randomize simulation parameters while ensuring (NUM_SNAKES * INITIAL_SNAKE_LENGTH < 10000)
function randomizeParams() {
  document.getElementById('numSnakes').value = Math.floor(random(50, 200));
  document.getElementById('foodCount').value = Math.floor(random(50, 200));
  document.getElementById('snakeLength').value = Math.floor(random(3, 10));
  document.getElementById('foodMaxAge').value = Math.floor(random(5000, 15000));
  document.getElementById('gravityStrength').value = random([-1, 0, 1]);
  
  let palettes = document.getElementById('colorPalette').options;
  let randomIndex = Math.floor(random(palettes.length));
  document.getElementById('colorPalette').selectedIndex = randomIndex;
  
  updateParams();
  restartSimulation();
}

// Attach randomize button event listener after page load.
window.addEventListener('load', function() {
  let btnRandomize = document.getElementById('btnRandomize');
  if (btnRandomize) {
    btnRandomize.addEventListener('click', randomizeParams);
  }
});

// Add new helper function to properly check position equality with grid wrapping
function equalWithWrapping(posA, posB) {
  // Check if positions are equal considering grid wrapping
  return (
    ((posA.x + GRID_X) % GRID_X === (posB.x + GRID_X) % GRID_X) &&
    ((posA.y + GRID_Y) % GRID_Y === (posB.y + GRID_Y) % GRID_Y) &&
    ((posA.z + GRID_Z) % GRID_Z === (posB.z + GRID_Z) % GRID_Z)
  );
}

// Update gravity effects with better center respawn
function updateGravityEffects() {
  if (gravityStrength === 0) return;
  
  let now = millis();
  if (now - lastGravityUpdate < GRAVITY_UPDATE_INTERVAL) return;
  lastGravityUpdate = now;
  
  // Calculate center of the volume
  let center = createVector(
    Math.floor(GRID_X/2), 
    Math.floor(GRID_Y/2), 
    Math.floor(GRID_Z/2)
  );
  let pull = gravityStrength > 0;  // true = pull to center, false = push to edges
  
  // Process each food item
  for (let i = foods.length - 1; i >= 0; i--) {
    let food = foods[i];
    let pos = food.pos;
    
    // Check if food is at or near the edge when pushing
    if (!pull) {
      if (pos.x <= 1 || pos.x >= GRID_X - 2 ||
          pos.y <= 1 || pos.y >= GRID_Y - 2 ||
          pos.z <= 1 || pos.z >= GRID_Z - 2) {
        // Respawn at center with small random offset
        food.pos = createVector(
          center.x + floor(random(-2, 3)),
          center.y + floor(random(-2, 3)),
          center.z + floor(random(-2, 3))
        );
        // Reset birth time to prevent immediate expiration
        food.birth = millis();
        continue;
      }
    }
    
    // Move food towards or away from center
    let dx = pos.x - center.x;
    let dy = pos.y - center.y;
    let dz = pos.z - center.z;
    
    // Find the largest distance component
    let maxDist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    let newPos = pos.copy();
    
    if (Math.abs(dx) === maxDist) {
      newPos.x += (dx > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    } else if (Math.abs(dy) === maxDist) {
      newPos.y += (dy > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    } else {
      newPos.z += (dz > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    }
    
    // Ensure position stays within grid bounds
    newPos.x = constrain(newPos.x, 0, GRID_X - 1);
    newPos.y = constrain(newPos.y, 0, GRID_Y - 1);
    newPos.z = constrain(newPos.z, 0, GRID_Z - 1);
    
    // Apply move if position is free
    if (isPositionFree(newPos)) {
      food.pos = newPos;
    }
  }
}

// Helper function to check if a position is free
function isPositionFree(pos) {
  // Check collision with other food
  for (let food of foods) {
    if (equalWithWrapping(pos, food.pos)) {
      return false;
    }
  }
  
  // Check collision with snakes
  for (let snake of snakes) {
    if (!snake.alive) continue;
    for (let seg of snake.body) {
      if (equalWithWrapping(pos, seg)) {
        return false;
      }
    }
  }
  
  return true;
}

// Clean up velocities when food is removed
function removeFoodItem(food) {
  let index = foods.indexOf(food);
  if (index > -1) {
    foods.splice(index, 1);
    foodVelocities.delete(food);
  }
}

// Add near the top with other event handlers
function keyPressed() {
  if (key === 's' || key === 'S') {
    // Get current date/time for filename
    let timestamp = year() + nf(month(), 2) + nf(day(), 2) + "_" + 
                   nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
    // Save the canvas
    saveCanvas('snakes3d_' + timestamp, 'png');
    return false; // Prevent default behavior
  }
} 