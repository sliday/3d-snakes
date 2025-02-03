// Global constants
// Color palettes

// Calculate grid dimensions based on screen aspect ratio
let BASE_GRID_SIZE = 200;      // Base size for the smallest dimension
let GRID_X, GRID_Y, GRID_Z;    // Actual grid dimensions

const MOVE_INTERVAL = 1;       // Time per move (ms) - fixed at maximum speed
let NUM_SNAKES = 100;          // Number of snakes
let INITIAL_SNAKE_LENGTH = 5;  // Starting segments per snake
let FOOD_COUNT = 100;          // Initial food cubes (sparse)
const cellSize = 11;         // Size of each cell in pixels (fixed)
let bgColor;                 // Will be set from the palette in updatePalette()
let FOOD_MAX_AGE = 10000;      // Max lifetime for food in ms (10 seconds)
let currentPalette = 'default';  // Initial palette selection

// Camera control variables
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let camX = 0, camY = 0, camZ = 0;
let rotX, rotY;              // Will be initialized in setup()
const CAM_SPEED = 5;
const ZOOM_SPEED = 0.1;
let zoom = 0.125;              // Start more zoomed in
const MIN_ZOOM = 0.1;        // Maximum zoom out (smaller number = further out)
const MAX_ZOOM = 3.333;      // Maximum zoom in
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
const DEBUG = true;  // Set to true to enable debug logs
let fixedLights = {}; // Fixed light colors to avoid flickering
let motionBlurAmount = 75;  // Value between 0-100 for plane transparency (default 50%)

// Camera smoothing and target parameters
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
const CAM_UPDATE_INTERVAL = 16;    // Update target more frequently (roughly 60fps)
const CAM_SMOOTH_FACTOR = 0.05;    // Make movement smoother (was 0.1)
const MIN_CAMERA_DISTANCE = 100;    // Increased from 5
const MAX_CAMERA_DISTANCE = 2000;   // Add maximum distance
const CAMERA_PADDING = 1.5;         // Reduced from 2.0 for tighter framing
const MIN_BOUNDING_SIZE = 100;      // Reduced from 200 for closer view
const NEAR_CLIP = 1;                // Changed from -100000
const FAR_CLIP = 10000;             // Reduced from 100000

// Gravity and food birth
let gravityStrength = 0;  // -100 to +100
const GRAVITY_UPDATE_INTERVAL = 100;
let lastGravityUpdate = 0;

// Food velocity support for movement
let foodVelocities = new Map(); // Store velocities for each food item
const FRICTION = 0.98;  // Damping factor for velocities
const MAX_VELOCITY = 0.5;  // Maximum velocity magnitude

// Style selector and hunting mode for snakes
let snakeStyle = 'cubes';  // New style selector: either 'cubes' or 'dots'
let HUNTING_MODE_ENABLED = true;  // Enable hunting mode for snakes

// PHI constant for scaling (golden ratio)
const PHI = 1.618;

// Add these constants at the top with other constants
const SPAWN_CUBE_SIZE = 2;  // Size of cube needed to spawn snake
const SPAWN_MIN_FOOD = 9;   // Minimum food items needed in cube to spawn snake
const EDGE_AVOIDANCE_DISTANCE = 3;  // How far from edge snakes try to stay

// Add new variable for clear frame option
let clearFrameEnabled = true;  // Default to true

// Add this constant near other constants
const SELF_COLLISION_OFFSET = 4;  // Skip the first few segments (tweak as needed)

// Helper function for slight color shift
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
  rotX = -PI / 6;
  rotY = PI / 4;

  initializeGrid();
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Set proper blending mode and enable depth test
  blendMode(BLEND);
  setAttributes({
    alpha: true,
    depth: true,
    stencil: false,
    antialias: true
  });

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
      (col * spacing + spacing / 2) % GRID_X,
      (row * spacing + spacing / 2) % GRID_Y,
      floor(random(GRID_Z))
    );
    let dir = random([
      createVector(1, 0, 0), createVector(-1, 0, 0),
      createVector(0, 1, 0), createVector(0, -1, 0),
      createVector(0, 0, 1), createVector(0, 0, -1)
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

  // Add event listener for clear frame checkbox
  document.getElementById('clearFrame').addEventListener('change', (e) => {
    clearFrameEnabled = e.target.checked;
    if (clearFrameEnabled) {
      // Clear the screen when enabling clear frame
      clear();
      background(bgColor);
    }
  });
}

function draw() {
  if (clearFrameEnabled) {
    clear();
    background(bgColor);
  }
  
  // Set proper GL state for this frame
  push();
  ambientLight(80);
  directionalLight(255, 255, 255, 0, 1, 0);
  
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
  translate(-GRID_X * cellSize / 2, -GRID_Y * cellSize / 2, -GRID_Z * cellSize / 2);

  // Draw food
  for (let f of foods) {
    push();
    translate(f.pos.x * cellSize, f.pos.y * cellSize, f.pos.z * cellSize);
    if (snakeStyle === 'dots') {
      stroke(f.col);
      strokeWeight(4);
      point(0, 0);
    } else {
      fill(f.col);
      noStroke();
      let age = millis() - f.birth;
      let factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1);
      let rotXAngle = noise(frameCount / 1000 + f.birth) * TWO_PI;
      let rotYAngle = noise(frameCount / 1000 + f.birth + 100) * TWO_PI;
      let rotZAngle = noise(frameCount / 1000 + f.birth + 200) * TWO_PI;
      rotateX(rotXAngle);
      rotateY(rotYAngle);
      rotateZ(rotZAngle);
      drawPyramid(cellSize * factor);
    }
    pop();
  }

  // Draw snakes
  for (let s of snakes) {
    s.draw();
  }

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
  
  pop();
}

function handleCameraMovement() {
  let forward = createVector(sin(rotY), 0, cos(rotY));
  let right = createVector(cos(rotY), 0, -sin(rotY));

  let moveSpeed = CAM_SPEED * (1 - CAM_SMOOTH_FACTOR);

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

  if (keyIsDown(81)) camY -= moveSpeed; // Q
  if (keyIsDown(69)) camY += moveSpeed; // E
}

// --- Snake Class ---
class Snake {
  constructor(startPos, initialDirection, col) {
    if (DEBUG) console.log(`Creating snake at (${startPos.x}, ${startPos.y}, ${startPos.z})`);
    this.col = col;
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

  // Draw the snake (each body segment as a box or dot).
  draw() {
    if (!this.alive) return;
    
    push();
    let segmentsToDraw = this.body;
    if (snakeStyle === 'dots') {
      // Only sort if transparency is needed
      segmentsToDraw = [...this.body].sort((a, b) => {
        let dA = dist(a.x * cellSize, a.y * cellSize, a.z * cellSize, 
                      camEye.x, camEye.y, camEye.z);
        let dB = dist(b.x * cellSize, b.y * cellSize, b.z * cellSize, 
                      camEye.x, camEye.y, camEye.z);
        return dB - dA;
      });
    }

    // Draw the (sorted or unsorted) segments
    for (let seg of segmentsToDraw) {
      push();
      translate(seg.x * cellSize, seg.y * cellSize, seg.z * cellSize);
      if (snakeStyle === 'dots') {
        // Get the actual world position after grid offset translation
        let gridOffset = createVector(
          GRID_X * cellSize / 2,
          GRID_Y * cellSize / 2,
          GRID_Z * cellSize / 2
        );
        
        // Calculate true world position including grid offset
        let worldPos = createVector(
          seg.x * cellSize - gridOffset.x,
          seg.y * cellSize - gridOffset.y,
          seg.z * cellSize - gridOffset.z
        );
        
        // Calculate distance from camera to actual world position
        let d = p5.Vector.dist(worldPos, camEye);
        
        // Define constants for dot size scaling (tweak as desired)
        const MAX_DOT_SIZE = 12; // pixels when very close
        const MIN_DOT_SIZE = 2;  // pixels when far away
        
        // Compute the dot size based on distance
        let dotSize = map(d, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, MAX_DOT_SIZE, MIN_DOT_SIZE, true);
        
        // Draw the dot using the computed dotSize
        stroke(this.dotForeground);
        strokeWeight(dotSize);
        point(0, 0);
      } else {
        fill(this.col);
        noStroke();
        ambientMaterial(this.col);  // For consistent lighting
        box(cellSize * 1.1);
      }
      pop();
    }
    pop();
  }

  // Set snake's direction, avoiding direct reversal.
  setDirection(newDir) {
    if (!newDir.equals(p5.Vector.mult(this.direction, -1))) {
      this.pendingDirection = newDir.copy();
    }
  }

  // Move snake: apply pending direction, add new head, and remove tail.
  move() {
    this.direction = this.pendingDirection.copy();
    let head = this.body[0].copy();
    head.add(this.direction);
    
    // Check if new position would be at edge
    if (head.x <= 0 || head.x >= GRID_X - 1 || 
        head.y <= 0 || head.y >= GRID_Y - 1 || 
        head.z <= 0 || head.z >= GRID_Z - 1) {
      if (DEBUG) console.log('Snake hit edge, dying');
      this.die();
      return;
    }
    
    // Only update position if snake is still alive
    if (this.alive) {
      this.body.unshift(head);
      this.body.pop();
    }
  }

  // Grow snake by duplicating the tail segment.
  grow() {
    let tail = this.body[this.body.length - 1].copy();
    this.body.push(tail);
  }

  // Improved self-collision check
  checkSelfCollision() {
    let head = this.body[0];
    // Iterate from the offset index to avoid false positives from segments too near the head
    for (let i = SELF_COLLISION_OFFSET; i < this.body.length; i++) {
      // Direct coordinate comparison (no wrapping needed)
      if (head.x === this.body[i].x &&
          head.y === this.body[i].y &&
          head.z === this.body[i].z) {
        if (DEBUG) {
          console.log(`Snake self-collision detected at segment ${i}`);
        }
        return true;
      }
    }
    return false;
  }

  // On self-collision, convert every block of the snake into food.
  handleSelfCollision() {
    if (DEBUG) console.log(`Snake self-collision! Length before: ${this.body.length}`);
    this.die();
  }

  // When the snake dies, convert every segment into a food item.
  die() {
    if (DEBUG) console.log(`Snake dying, converting ${this.body.length} segments to food`);
    if (this.alive) {  // Only convert to food if not already dead
      const segments = [...this.body];
      for (let segment of segments) {
        if (DEBUG) console.log(`Converting segment at (${segment.x}, ${segment.y}, ${segment.z}) to food`);
        // Add birth time and animation properties to food from dead snake
        spawnFoodAt(segment.x, segment.y, segment.z, this.col, true);
      }
      this.alive = false;
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

  // Remove expired food items (food that has lived past its lifetime)
  updateFoods();
}

// Add this helper function to get all available directions except the reverse
function getAvailableDirections(currentDir) {
  let dirs = [
    createVector(1,0,0), createVector(-1,0,0),
    createVector(0,1,0), createVector(0,-1,0),
    createVector(0,0,1), createVector(0,0,-1)
  ];
  // Remove the reverse of current direction
  return dirs.filter(d => !d.equals(p5.Vector.mult(currentDir, -1)));
}

// Add this helper to check if a position will lead to being trapped
function checkForTrappedPath(snake, pos, depth = 3) {
  if (depth === 0) return false;
  
  // Check all possible next moves from this position
  let availableMoves = 0;
  let dirs = getAvailableDirections(snake.direction);
  
  for (let dir of dirs) {
    let nextPos = p5.Vector.add(pos, dir);
    nextPos.x = (nextPos.x + GRID_X) % GRID_X;
    nextPos.y = (nextPos.y + GRID_Y) % GRID_Y;
    nextPos.z = (nextPos.z + GRID_Z) % GRID_Z;
    
    // Check if this move is free
    let isFree = true;
    for (let seg of snake.body) {
      if (equalWithWrapping(nextPos, seg)) {
        isFree = false;
        break;
      }
    }
    
    if (isFree) {
      availableMoves++;
      // Recursively check if this path leads to being trapped
      if (!checkForTrappedPath(snake, nextPos, depth - 1)) {
        return false; // Found at least one good path
      }
    }
  }
  
  return availableMoves === 0; // Return true if no moves available
}

// Update the updateAISnake function to include edge avoidance
function updateAISnake(snake) {
  const head = snake.body[0];
  
  // First check if we're too close to any edge
  const nearEdge = (
    head.x <= EDGE_AVOIDANCE_DISTANCE || head.x >= GRID_X - EDGE_AVOIDANCE_DISTANCE ||
    head.y <= EDGE_AVOIDANCE_DISTANCE || head.y >= GRID_Y - EDGE_AVOIDANCE_DISTANCE ||
    head.z <= EDGE_AVOIDANCE_DISTANCE || head.z >= GRID_Z - EDGE_AVOIDANCE_DISTANCE
  );

  if (nearEdge) {
    // Calculate center of grid
    const centerX = Math.floor(GRID_X / 2);
    const centerY = Math.floor(GRID_Y / 2);
    const centerZ = Math.floor(GRID_Z / 2);
    
    // Determine which direction to move towards center
    let newDir = createVector(0, 0, 0);
    
    if (head.x <= EDGE_AVOIDANCE_DISTANCE) newDir.x = 1;
    else if (head.x >= GRID_X - EDGE_AVOIDANCE_DISTANCE) newDir.x = -1;
    else if (head.y <= EDGE_AVOIDANCE_DISTANCE) newDir.y = 1;
    else if (head.y >= GRID_Y - EDGE_AVOIDANCE_DISTANCE) newDir.y = -1;
    else if (head.z <= EDGE_AVOIDANCE_DISTANCE) newDir.z = 1;
    else if (head.z >= GRID_Z - EDGE_AVOIDANCE_DISTANCE) newDir.z = -1;
    
    // Only change direction if it's safe
    if (isSafeMove(snake, newDir)) {
      snake.setDirection(newDir);
      return;
    }
    
    // If direct move to safety isn't possible, try alternative directions
    let availableDirs = getAvailableDirections(snake.direction)
      .filter(dir => isSafeMove(snake, dir));
    
    if (availableDirs.length > 0) {
      snake.setDirection(random(availableDirs));
      return;
    }
  }

  // If not near edge, continue with existing behavior
  if (foods.length === 0) return;

  let closestFood = null;
  let minDistance = Infinity;

  for (let food of foods) {
    let dx = Math.abs(food.pos.x - head.x);
    let dy = Math.abs(food.pos.y - head.y);
    let dz = Math.abs(food.pos.z - head.z);
    let distance = dx + dy + dz;

    if (distance < minDistance) {
      minDistance = distance;
      closestFood = food;
    }
  }

  if (!closestFood) return;

  let currentDirX = snake.direction.x;
  let currentDirY = snake.direction.y;
  let currentDirZ = snake.direction.z;

  let dx = closestFood.pos.x - head.x;
  let dy = closestFood.pos.y - head.y;
  let dz = closestFood.pos.z - head.z;

  if ((dx > 0 && currentDirX > 0) || (dx < 0 && currentDirX < 0) ||
      (dy > 0 && currentDirY > 0) || (dy < 0 && currentDirY < 0) ||
      (dz > 0 && currentDirZ > 0) || (dz < 0 && currentDirZ < 0)) {
    return;
  }

  let newDir = createVector(0, 0, 0);
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz)) {
    newDir.x = Math.sign(dx);
  } else if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= Math.abs(dz)) {
    newDir.y = Math.sign(dy);
  } else {
    newDir.z = Math.sign(dz);
  }

  if (isSafeMove(snake, newDir)) {
    snake.setDirection(newDir);
  }
}

// Update the isSafeMove function to consider edges
function isSafeMove(snake, dir) {
  let head = snake.body[0];
  let nextPos = p5.Vector.add(head, dir);
  
  // Check if move would hit edge
  if (nextPos.x <= 0 || nextPos.x >= GRID_X - 1 || 
      nextPos.y <= 0 || nextPos.y >= GRID_Y - 1 || 
      nextPos.z <= 0 || nextPos.z >= GRID_Z - 1) {
    return false;
  }

  // Rest of existing collision checks
  for (let i = 0; i < snake.body.length - 1; i++) {
    if (nextPos.x === snake.body[i].x &&
        nextPos.y === snake.body[i].y &&
        nextPos.z === snake.body[i].z) {
      return false;
    }
  }

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

// Process collisions between snakes (slither.io style)
// Checks head-to-head and head-to-body collisions.
// In a collision, the snake that loses (or both if equal) calls die()
// so that each block becomes food.
function processCollisions() {
  for (let i = 0; i < snakes.length; i++) {
    let snakeA = snakes[i];
    if (!snakeA.alive) continue;

    for (let j = i + 1; j < snakes.length; j++) {
      let snakeB = snakes[j];
      if (!snakeB.alive) continue;

      let headA = snakeA.body[0];
      let headB = snakeB.body[0];

      if (equalWithWrapping(headA, headB)) {
        if (snakeA.body.length < snakeB.body.length) {
          if (snakeA.alive) snakeA.die();
        } else if (snakeA.body.length > snakeB.body.length) {
          if (snakeB.alive) snakeB.die();
        } else {
          if (snakeA.alive) snakeA.die();
          if (snakeB.alive) snakeB.die();
        }
        continue;
      }

      for (let k = 1; k < snakeB.body.length; k++) {
        if (equalWithWrapping(headA, snakeB.body[k])) {
          if (snakeA.alive) snakeA.die();
          break;
        }
      }

      for (let k = 1; k < snakeA.body.length; k++) {
        if (equalWithWrapping(headB, snakeA.body[k])) {
          if (snakeB.alive) snakeB.die();
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
    if (head.x === food.pos.x &&
      head.y === food.pos.y &&
      head.z === food.pos.z) {
      snake.grow();
      removeFoodItem(food);
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

  let foodItem = { pos: pos, birth: millis(), col: palette[0] };
  foods.push(foodItem);
  foodVelocities.set(foodItem, createVector(0, 0, 0));
}

// Spawn food at a specific grid cell.
function spawnFoodAt(x, y, z, foodColor = null, force = false) {
  if (DEBUG) console.log(`Attempting to spawn food at (${x}, ${y}, ${z})`);
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  x = (x + GRID_X) % GRID_X;
  y = (y + GRID_Y) % GRID_Y;
  z = (z + GRID_Z) % GRID_Z;
  let pos = createVector(x, y, z);

  let food = {
    pos: pos,
    birth: millis(),
    col: foodColor || random(palette)
  };

  if (!force) {
    for (let f of foods) {
      if (equalWithWrapping(f.pos, pos)) {
        if (DEBUG) console.log(`Food already exists at (${x}, ${y}, ${z}), skipping`);
        return;
      }
    }
  }
  foods.push(food);
  foodVelocities.set(food, createVector(0, 0, 0));
  if (DEBUG) console.log(`Successfully spawned food at (${x}, ${y}, ${z})`);
}

function drawDebugInfo() {
  // Debug text disabled.
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initializeGrid();
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
  zoom = constrain(zoom + event.delta * ZOOM_SPEED * 0.001, MIN_ZOOM, MAX_ZOOM);
  return false;
}

function setupLights() {
  ambientLight(80);
  directionalLight(red(fixedLights.main), green(fixedLights.main), blue(fixedLights.main),
    sin(rotY), sin(rotX), -cos(rotY) * cos(rotX));
  directionalLight(red(fixedLights.front), green(fixedLights.front), blue(fixedLights.front),
    -cos(rotY), sin(rotX), -sin(rotY) * cos(rotX));
  directionalLight(red(fixedLights.back), green(fixedLights.back), blue(fixedLights.back),
    cos(rotY), sin(rotX), sin(rotY) * cos(rotX));
  directionalLight(red(fixedLights.top), green(fixedLights.top), blue(fixedLights.top),
    0, 1, 0);
  directionalLight(red(fixedLights.bottom), green(fixedLights.bottom), blue(fixedLights.bottom),
    0, -1, 0);
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
    let deltaX = (mouseX - lastMouseX) * ROTATION_SENSITIVITY;
    let deltaY = (mouseY - lastMouseY) * ROTATION_SENSITIVITY;
    rotY += deltaX;
    rotX = constrain(rotX - deltaY, -PI / 2, PI / 2);
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
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
function drawPyramid(s) {
  let apex = createVector(0, -s / 2, 0);
  let v1 = createVector(s / 2, s / 2, s / 2);
  let v2 = createVector(s / 2, s / 2, -s / 2);
  let v3 = createVector(-s / 2, s / 2, -s / 2);
  let v4 = createVector(-s / 2, s / 2, s / 2);

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

  beginShape();
  vertex(v1.x, v1.y, v1.z);
  vertex(v2.x, v2.y, v2.z);
  vertex(v3.x, v3.y, v3.z);
  vertex(v4.x, v4.y, v4.z);
  endShape(CLOSE);
}

// Auto-adjust camera: computes the bounding box of all alive snake segments
// and smoothly adjusts the camera to keep the entire scene in view.
function autoAdjustCamera() {
  let now = millis();

  // Update target position more frequently
  if (now - targetCamParams.lastUpdate > CAM_UPDATE_INTERVAL) {
    updateTargetCameraParams();
    targetCamParams.lastUpdate = now;
  }

  // Apply smooth damping to camera movement
  let smoothFactor = CAM_SMOOTH_FACTOR * (deltaTime / 16); // Frame-rate independent smoothing
  
  currentCamParams.centerX = lerp(currentCamParams.centerX, targetCamParams.centerX, smoothFactor);
  currentCamParams.centerY = lerp(currentCamParams.centerY, targetCamParams.centerY, smoothFactor);
  currentCamParams.centerZ = lerp(currentCamParams.centerZ, targetCamParams.centerZ, smoothFactor);
  currentCamParams.distance = lerp(currentCamParams.distance, targetCamParams.distance, smoothFactor);

  let centerWorld = createVector(
    currentCamParams.centerX,
    currentCamParams.centerY,
    currentCamParams.centerZ
  );

  const FOV = PI / 3;
  let eye = centerWorld.copy();
  eye.add(createVector(
    sin(rotY) * currentCamParams.distance * cos(rotX),
    -sin(rotX) * currentCamParams.distance,
    cos(rotY) * currentCamParams.distance * cos(rotX)
  ));

  camEye = eye.copy();
  camCenter = centerWorld.copy();
  globalFOV = FOV;
  globalAspect = width / height;

  perspective(FOV, width/height, NEAR_CLIP, FAR_CLIP);
  
  camera(eye.x, eye.y, eye.z,
    centerWorld.x, centerWorld.y, centerWorld.z,
    0, 1, 0);

  // Ensure camera distance stays within bounds
  currentCamParams.distance = constrain(
    currentCamParams.distance,
    MIN_CAMERA_DISTANCE,
    MAX_CAMERA_DISTANCE
  );
}

// Update simulation parameters from control panel.
function updateParams() {
  NUM_SNAKES = parseInt(document.getElementById('numSnakes').value);
  FOOD_COUNT = parseInt(document.getElementById('foodCount').value);
  INITIAL_SNAKE_LENGTH = parseInt(document.getElementById('snakeLength').value);
  FOOD_MAX_AGE = parseInt(document.getElementById('foodMaxAge').value);
  currentPalette = document.getElementById('colorPalette').value;
  gravityStrength = parseInt(document.getElementById('gravityStrength').value);
  snakeStyle = document.getElementById('snakeStyle').value;
  updatePalette();
  clearFrameEnabled = document.getElementById('clearFrame').checked;
}

// Restart the simulation with new parameters.
function restartSimulation() {
  updateParams();
  // Clear the canvas properly
  clear();
  background(bgColor);
  
  snakes = [];
  foods = [];
  foodVelocities.clear();
  camX = 0;
  camY = 0;
  camZ = 0;
  rotX = -PI/6;
  rotY = PI/4;
  zoom = 0.5;
  initializeGrid();
  
  // Create initial snakes in a grid pattern
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
      createVector(1,0,0), createVector(-1,0,0),
      createVector(0,1,0), createVector(0,-1,0),
      createVector(0,0,1), createVector(0,0,-1)
    ]);
    snakes.push(new Snake(pos, dir, random(palette)));
  }
  
  // Spawn initial food
  for (let i = 0; i < FOOD_COUNT; i++) {
    spawnFood();
  }
  lastMoveTime = millis();
}

// Toggle control panel visibility.
function togglePanel() {
  const content = document.querySelector('.panel-content');
  const icon = document.querySelector('.toggle-icon');
  content.classList.toggle('expanded');
  icon.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
}

// Update the color palette array from the selected palette.
function updatePalette() {
  palette = PALETTES[currentPalette].colors.map(c => color(c));
  bgColor = PALETTES[currentPalette].bg;

  let motionBlurColor = color(red(bgColor), green(bgColor), blue(bgColor));

  fixedLights.main = color(255, 255, 255);
  fixedLights.front = random(palette);
  fixedLights.back = random(palette);
  fixedLights.top = random(palette);
  fixedLights.bottom = random(palette);
}

// Populate the color palette dropdown with available palettes from PALETTES.
function updatePaletteDropdown() {
  let select = document.getElementById('colorPalette');
  if (select) {
    select.innerHTML = '';
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
  let planeDistance = 1000;

  let planePoint = p5.Vector.add(
    camEye,
    p5.Vector.mult(p5.Vector.sub(camCenter, camEye).normalize(), planeDistance)
  );

  let ndcX = (mouseX / width) * 2 - 1;
  let ndcY = 1 - (mouseY / height) * 2;

  let rayDir = createVector(ndcX * tan(globalFOV / 2) * globalAspect, ndcY * tan(globalFOV / 2), -1);
  rayDir.normalize();

  let planeNormal = p5.Vector.sub(camCenter, camEye).normalize();
  let t = p5.Vector.dot(p5.Vector.sub(planePoint, camEye), planeNormal) /
    p5.Vector.dot(rayDir, planeNormal);

  let intersect = p5.Vector.add(camEye, p5.Vector.mult(rayDir, t));

  let baseX = Math.floor((intersect.x + GRID_X * cellSize / 2) / cellSize);
  let baseY = Math.floor((intersect.y + GRID_Y * cellSize / 2) / cellSize);
  let baseZ = Math.floor((intersect.z + GRID_Z * cellSize / 2) / cellSize);

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

window.addEventListener('load', function () {
  let btnRandomize = document.getElementById('btnRandomize');
  if (btnRandomize) {
    btnRandomize.addEventListener('click', randomizeParams);
  }
});

// Helper function to properly check position equality with grid wrapping
function equalWithWrapping(posA, posB) {
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

  let center = createVector(
    Math.floor(GRID_X / 2),
    Math.floor(GRID_Y / 2),
    Math.floor(GRID_Z / 2)
  );
  let pull = gravityStrength > 0;

  for (let i = foods.length - 1; i >= 0; i--) {
    let food = foods[i];
    let pos = food.pos;

    if (!pull) {
      if (pos.x <= 1 || pos.x >= GRID_X - 2 ||
        pos.y <= 1 || pos.y >= GRID_Y - 2 ||
        pos.z <= 1 || pos.z >= GRID_Z - 2) {
        food.pos = createVector(
          center.x + floor(random(-2, 3)),
          center.y + floor(random(-2, 3)),
          center.z + floor(random(-2, 3))
        );
        food.birth = millis();
        continue;
      }
    }

    let dx = pos.x - center.x;
    let dy = pos.y - center.y;
    let dz = pos.z - center.z;

    let maxDist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    let newPos = pos.copy();

    if (Math.abs(dx) === maxDist) {
      newPos.x += (dx > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    } else if (Math.abs(dy) === maxDist) {
      newPos.y += (dy > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    } else {
      newPos.z += (dz > 0 ? (pull ? -1 : 1) : (pull ? 1 : -1));
    }

    newPos.x = constrain(newPos.x, 0, GRID_X - 1);
    newPos.y = constrain(newPos.y, 0, GRID_Y - 1);
    newPos.z = constrain(newPos.z, 0, GRID_Z - 1);

    if (isPositionFree(newPos)) {
      food.pos = newPos;
    }
  }
}

// Helper function to check if a position is free
function isPositionFree(pos) {
  for (let food of foods) {
    if (equalWithWrapping(pos, food.pos)) {
      return false;
    }
  }

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

function keyPressed() {
  if (key === 's' || key === 'S') {
    let timestamp = year() + nf(month(), 2) + nf(day(), 2) + "_" +
      nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
    saveCanvas('snakes3d_' + timestamp, 'png');
    return false;
  }
}

// Replace the old checkFoodClusters() with this new implementation
function checkFoodClusters() {
  // Create a 3D grid to track food positions
  let foodGrid = {};
  
  // Map all food to grid positions
  for (let food of foods) {
    let key = `${food.pos.x},${food.pos.y},${food.pos.z}`;
    foodGrid[key] = food;
  }
  
  // Check each possible 3x3x3 cube in the grid
  for (let x = 0; x < GRID_X - SPAWN_CUBE_SIZE + 1; x++) {
    for (let y = 0; y < GRID_Y - SPAWN_CUBE_SIZE + 1; y++) {
      for (let z = 0; z < GRID_Z - SPAWN_CUBE_SIZE + 1; z++) {
        let cubeFood = [];
        
        // Count food in this 3x3x3 cube
        for (let dx = 0; dx < SPAWN_CUBE_SIZE; dx++) {
          for (let dy = 0; dy < SPAWN_CUBE_SIZE; dy++) {
            for (let dz = 0; dz < SPAWN_CUBE_SIZE; dz++) {
              let key = `${x + dx},${y + dy},${z + dz}`;
              if (foodGrid[key]) {
                cubeFood.push(foodGrid[key]);
              }
            }
          }
        }
        
        // If we found enough food items in the cube
        if (cubeFood.length >= SPAWN_MIN_FOOD) {
          // Calculate center position for new snake
          let center = createVector(
            x + Math.floor(SPAWN_CUBE_SIZE/2),
            y + Math.floor(SPAWN_CUBE_SIZE/2),
            z + Math.floor(SPAWN_CUBE_SIZE/2)
          );
          
          // Create new snake with length 3
          let dir = random([
            createVector(1,0,0), createVector(-1,0,0),
            createVector(0,1,0), createVector(0,-1,0),
            createVector(0,0,1), createVector(0,0,-1)
          ]);
          
          let newSnake = new Snake(center, dir, random(palette));
          newSnake.body = []; // Clear default body
          
          // Add 3 segments in the opposite direction of movement
          for (let i = 0; i < 3; i++) {
            let pos = center.copy();
            pos.sub(p5.Vector.mult(dir, i));
            newSnake.body.push(pos);
          }
          
          snakes.push(newSnake);
          
          // Remove used food
          for (let food of cubeFood) {
            removeFoodItem(food);
          }
          
          // Only spawn one snake per update to prevent chain reactions
          return;
        }
      }
    }
  }
}

// Update the updateTargetCameraParams function to reduce jitter
function updateTargetCameraParams() {
  let offset = createVector(GRID_X * cellSize / 2, GRID_Y * cellSize / 2, GRID_Z * cellSize / 2);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let centerOfMass = createVector(0, 0, 0);
  let totalMass = 0;

  let hasAliveSnakes = false;
  let aliveCount = 0;

  // Calculate center of mass and bounds
  for (let snake of snakes) {
    if (!snake.alive) continue;
    hasAliveSnakes = true;
    aliveCount++;
    
    for (let seg of snake.body) {
      let wx = seg.x * cellSize - offset.x;
      let wy = seg.y * cellSize - offset.y;
      let wz = seg.z * cellSize - offset.z;
      
      // Add to center of mass
      centerOfMass.add(createVector(wx, wy, wz));
      totalMass++;
      
      // Update bounds
      minX = min(minX, wx);
      minY = min(minY, wy);
      minZ = min(minZ, wz);
      maxX = max(maxX, wx);
      maxY = max(maxY, wy);
      maxZ = max(maxZ, wz);
    }
  }

  if (!hasAliveSnakes) {
    targetCamParams.centerX = 0;
    targetCamParams.centerY = 0;
    targetCamParams.centerZ = 0;
    targetCamParams.distance = MIN_CAMERA_DISTANCE;
    return;
  }

  // Use center of mass for more stable camera targeting
  centerOfMass.div(totalMass);
  
  // Ensure minimum bounding box size
  let size = max(MIN_BOUNDING_SIZE, 
                 maxX - minX,
                 maxY - minY,
                 maxZ - minZ);
  
  // Set target to center of mass
  targetCamParams.centerX = centerOfMass.x;
  targetCamParams.centerY = centerOfMass.y;
  targetCamParams.centerZ = centerOfMass.z;

  // Calculate camera distance based on bounding sphere with clamping
  const FOV = PI / 3;
  let idealDistance = (size * CAMERA_PADDING) / (2 * tan(FOV / 2));
  targetCamParams.distance = constrain(
    idealDistance,
    MIN_CAMERA_DISTANCE,
    MAX_CAMERA_DISTANCE
  );
}