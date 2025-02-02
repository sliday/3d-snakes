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
let shouldClearBackground = true;
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
const MAX_ZOOM = 3.0;  // Maximum zoom in
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
let motionBlurAmount = 50;  // Value between 0-100 for plane transparency (default 50%)

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
  if (shouldClearBackground) {
    push();
      // Switch completely to 2D mode
      let renderer = this._renderer;
      renderer.GL.disable(renderer.GL.DEPTH_TEST);
      
      // Draw directly in screen space
      translate(-width/2, -height/2);
      noStroke();
      let fadeColor = color(bgColor);
      fadeColor.setAlpha(255 - (motionBlurAmount * 2.55));
      fill(fadeColor);
      
      // Draw a rectangle covering the entire screen
      beginShape();
      vertex(-width*16, -height*16);
      vertex(width*16, -height*16);
      vertex(width*16, height*16);
      vertex(-width*16, height*16);
      endShape(CLOSE);
      renderer.GL.enable(renderer.GL.DEPTH_TEST);
    pop();
  }
  
  // Auto-adjust camera to frame all snakes
  autoAdjustCamera();
  
  // Refresh lights each frame
  setupLights();
  
  // Game update logic
  if (millis() - lastMoveTime > MOVE_INTERVAL) {
    updateGame();
    lastMoveTime = millis();
  }
  
  // Draw everything
  push();
  // Center the grid
  translate(-GRID_X * cellSize/2, -GRID_Y * cellSize/2, -GRID_Z * cellSize/2);
  
  // Draw food with a shrink effect using a pyramid shape,
  // applying a slow rotation driven by Perlin noise.
  noStroke();
  for (let f of foods) {
    push();
    fill(f.col); // Use the food's assigned color from the palette.
    translate(f.pos.x * cellSize, f.pos.y * cellSize, f.pos.z * cellSize);
    // Compute remaining life factor (1 = full size, 0 = expired)
    let age = millis() - f.birth;
    let factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1);
    // Apply slow rotation using Perlin noise for smooth, random motion.
    let rotXAngle = noise(frameCount/1000 + f.birth) * TWO_PI;
    let rotYAngle = noise(frameCount/1000 + f.birth + 100) * TWO_PI;
    let rotZAngle = noise(frameCount/1000 + f.birth + 200) * TWO_PI;
    rotateX(rotXAngle);
    rotateY(rotYAngle);
    rotateZ(rotZAngle);
    // Draw a pyramid scaled by the remaining life factor.
    drawPyramid(cellSize * factor);
    pop();
  }
  
  // Draw snakes
  for (let s of snakes) {
    s.draw();
  }
  pop();
  
  // Draw debug overlay
  drawDebugInfo();
  
  // Spawn food on click-and-hold: when the mouse is pressed, 
  // spawn food at the cursor's grid cell at a fixed interval.
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
  
  // WASD movement relative to camera direction
  if (keyIsDown(87)) { // W - forward
    camX += forward.x * CAM_SPEED;
    camZ += forward.z * CAM_SPEED;
  }
  if (keyIsDown(83)) { // S - backward
    camX -= forward.x * CAM_SPEED;
    camZ -= forward.z * CAM_SPEED;
  }
  if (keyIsDown(65)) { // A - left
    camX -= right.x * CAM_SPEED;
    camZ -= right.z * CAM_SPEED;
  }
  if (keyIsDown(68)) { // D - right
    camX += right.x * CAM_SPEED;
    camZ += right.z * CAM_SPEED;
  }
  
  // Q/E for vertical movement
  if (keyIsDown(81)) camY -= CAM_SPEED; // Q
  if (keyIsDown(69)) camY += CAM_SPEED; // E
}

// --- Snake Class ---
class Snake {
  constructor(startPos, initialDirection, col) {
    if (DEBUG) console.log(`Creating snake at (${startPos.x}, ${startPos.y}, ${startPos.z})`);
    this.color = col;
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
    
    // Draw current snake body
    noStroke();
    fill(this.color);
    for (let seg of this.body) {
      push();
      translate(seg.x * cellSize, seg.y * cellSize, seg.z * cellSize);
      box(cellSize);
      pop();
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
    // Wrap-around grid boundaries.
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
    // Start checking from index 2 to avoid false positives with neck segment
    for (let i = 2; i < this.body.length; i++) {
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

// AI: Update snake's direction by chasing the food with the lowest effective distance.
// The effective distance is determined by the Manhattan distance divided by (factor + 0.1),
// where factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1), i.e. 1 for fresh food and 0 near expiration.
function updateAISnake(snake) {
  if (foods.length === 0) return;
  let head = snake.body[0];
  
  // Find the closest food using Manhattan distance (no age weighting)
  let closestFood = null;
  let minDistance = Infinity;
  
  for (let f of foods) {
    let d = abs(f.pos.x - head.x) + abs(f.pos.y - head.y) + abs(f.pos.z - head.z);
    if (d < minDistance) {
      minDistance = d;
      closestFood = f;
    }
  }
  
  if (!closestFood) return;
  
  // Calculate direction components to food
  let dx = (closestFood.pos.x - head.x + GRID_X) % GRID_X;
  if (dx > GRID_X/2) dx -= GRID_X;
  let dy = (closestFood.pos.y - head.y + GRID_Y) % GRID_Y;
  if (dy > GRID_Y/2) dy -= GRID_Y;
  let dz = (closestFood.pos.z - head.z + GRID_Z) % GRID_Z;
  if (dz > GRID_Z/2) dz -= GRID_Z;
  
  // Determine primary direction based on largest component
  let currentDir = snake.direction;
  let newDir = currentDir.copy();
  
  // Only change direction if we're not already moving toward the food
  let movingTowardFood = false;
  if (currentDir.x !== 0 && Math.sign(currentDir.x) === Math.sign(dx)) movingTowardFood = true;
  if (currentDir.y !== 0 && Math.sign(currentDir.y) === Math.sign(dy)) movingTowardFood = true;
  if (currentDir.z !== 0 && Math.sign(currentDir.z) === Math.sign(dz)) movingTowardFood = true;
  
  if (!movingTowardFood) {
    // Choose the largest absolute difference that doesn't result in a collision
    let candidates = [];
    if (abs(dx) > 0) candidates.push({dir: createVector(Math.sign(dx), 0, 0), val: abs(dx)});
    if (abs(dy) > 0) candidates.push({dir: createVector(0, Math.sign(dy), 0), val: abs(dy)});
    if (abs(dz) > 0) candidates.push({dir: createVector(0, 0, Math.sign(dz)), val: abs(dz)});
    
    // Sort by largest difference
    candidates.sort((a, b) => b.val - a.val);
    
    // Try each direction until we find one that doesn't cause collision
    for (let candidate of candidates) {
      // Don't reverse direction
      if (candidate.dir.equals(p5.Vector.mult(currentDir, -1))) continue;
      
      // Check if this move would cause collision
      let nextPos = p5.Vector.add(head, candidate.dir);
      nextPos.x = (nextPos.x + GRID_X) % GRID_X;
      nextPos.y = (nextPos.y + GRID_Y) % GRID_Y;
      nextPos.z = (nextPos.z + GRID_Z) % GRID_Z;
      
      let collision = false;
      for (let i = 0; i < snake.body.length - 1; i++) {
        if (snake.body[i].equals(nextPos)) {
          collision = true;
          break;
        }
      }
      
      if (!collision) {
        newDir = candidate.dir;
        break;
      }
    }
  }
  
  snake.setDirection(newDir);
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

// Handle food collision: if a snake's head reaches a food's position, grow the snake and remove the food.
function checkFoodCollision(snake) {
  let head = snake.body[0];
  for (let i = foods.length - 1; i >= 0; i--) {
    let food = foods[i];
    if (head.equals(food.pos)) {
      snake.grow();
      foods.splice(i, 1);
      spawnFood(); // Spawn one new food item after one is eaten.
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
  // Verify food isn't placed where a snake segment already is
  for (let snake of snakes) {
    if (!snake.alive) continue;
    for (let seg of snake.body) {
      if (seg.equals(pos)) {
        // Try spawning again if position is occupied
        return spawnFood();
      }
    }
  }
  foods.push({ pos: pos, birth: millis(), col: palette[0] });
}

// Spawn food at a specific grid cell.
function spawnFoodAt(x, y, z) {
  // Ensure coordinates are integers
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  let pos = createVector(x, y, z);
  // Check if position is already occupied by food
  for (let f of foods) {
    if (f.pos.equals(pos)) {
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
  // Use 6-adjacency (neighbors differ by exactly 1 along one axis)
  let clusters = [];
  let visited = new Array(foods.length).fill(false);
  
  for (let i = 0; i < foods.length; i++) {
    if (visited[i]) continue;
    let cluster = [];
    function dfs(idx) {
      visited[idx] = true;
      cluster.push(idx);
      let f = foods[idx];
      for (let j = 0; j < foods.length; j++) {
        if (!visited[j]) {
          let g = foods[j];
          let dx = abs(f.pos.x - g.pos.x);
          let dy = abs(f.pos.y - g.pos.y);
          let dz = abs(f.pos.z - g.pos.z);
          if ((dx + dy + dz) === 1) { // adjacent on one axis only
            dfs(j);
          }
        }
      }
    }
    dfs(i);
    clusters.push(cluster);
  }
  
  let indicesToRemove = [];
  for (let cluster of clusters) {
    if (cluster.length === 3) {
      // Compute average position of the food cluster
      let sum = createVector(0, 0, 0);
      for (let idx of cluster) {
        sum.add(foods[idx].pos);
      }
      sum.div(cluster.length);
      // Round the center position to grid coordinates.
      let newPos = createVector(Math.round(sum.x), Math.round(sum.y), Math.round(sum.z));
      // Spawn a new 1-cell snake at this position.
      let snake = spawnSnakeAt(newPos);
      snakes.push(snake);
      if (DEBUG) console.log(`Cluster of 3 food turned into a snake at (${newPos.x}, ${newPos.y}, ${newPos.z})`);
      indicesToRemove.push(...cluster);
    }
  }
  
  // Remove the food items that formed a cluster (remove from highest index to lowest)
  indicesToRemove.sort((a, b) => b - a);
  for (let idx of indicesToRemove) {
    foods.splice(idx, 1);
  }
}

// Spawn a 1-cell snake at a given grid position.
function spawnSnakeAt(pos) {
  let dir = random([
    createVector(1, 0, 0), createVector(-1, 0, 0),
    createVector(0, 1, 0), createVector(0, -1, 0),
    createVector(0, 0, 1), createVector(0, 0, -1)
  ]);
  let snake = new Snake(pos, dir, random(palette));
  // Force snake to be 1 cell in length.
  snake.body = [pos.copy()];
  return snake;
}

function updateFoods() {
  let current = millis();
  for (let i = foods.length - 1; i >= 0; i--) {
    if (current - foods[i].birth > FOOD_MAX_AGE) {
      foods.splice(i, 1);
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
  // Our scene is drawn after translating by:
  // translate(-GRID_X * cellSize/2, -GRID_Y * cellSize/2, -GRID_Z * cellSize/2)
  // So compute an offset vector representing that translation.
  let offset = createVector(GRID_X * cellSize / 2, GRID_Y * cellSize / 2, GRID_Z * cellSize / 2);
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  // Loop over alive snakes and convert each snake segment to world coordinates.
  for (let snake of snakes) {
    if (!snake.alive) continue;
    for (let seg of snake.body) {
      // world coordinate = seg * cellSize - offset
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
  
  // If no alive snakes exist, set a default camera.
  if (minX === Infinity) {
    camera(0, 0, 500, 0, 0, 0, 0, 1, 0);
    return;
  }
  
  // Compute the center in world space.
  let centerX = (minX + maxX) / 2;
  let centerY = (minY + maxY) / 2;
  let centerZ = (minZ + maxZ) / 2;
  let centerWorld = createVector(centerX, centerY, centerZ);
  
  // Compute the maximum dimension of the bounding box.
  let dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  let maxDim = max(dx, dy, dz);
  
  // Set a field of view (FOV) for the camera (e.g. PI/3).
  const FOV = PI / 3;
  // Compute the required distance so that half the bounding box fits in view.
  let distance = (maxDim / 2) / tan(FOV / 2) * 1.2;
  
  // Position the camera: offset along the positive Z-axis from the center.
  let eye = centerWorld.copy();
  eye.add(createVector(0, 0, distance));
  
  // Store camera parameters for unprojection.
  camEye = eye.copy();
  camCenter = centerWorld.copy();
  globalFOV = FOV;
  globalAspect = width / height;
  
  camera(eye.x, eye.y, eye.z,
         centerWorld.x, centerWorld.y, centerWorld.z,
         0, 1, 0);
}

// Update simulation parameters from control panel
function updateParams() {
  NUM_SNAKES = parseInt(document.getElementById('numSnakes').value);
  FOOD_COUNT = parseInt(document.getElementById('foodCount').value);
  INITIAL_SNAKE_LENGTH = parseInt(document.getElementById('snakeLength').value);
  FOOD_MAX_AGE = parseInt(document.getElementById('foodMaxAge').value);
  shouldClearBackground = document.getElementById('clearBackground').checked;
  motionBlurAmount = parseInt(document.getElementById('motionBlur').value);
  currentPalette = document.getElementById('colorPalette').value;
  updatePalette();
}

// Restart the simulation with new parameters
function restartSimulation() {
  updateParams();
  // Force clear background on restart
  background(bgColor);
  // Clear existing arrays
  snakes = [];
  foods = [];
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
  // Update background color from the palette's bg property.
  bgColor = PALETTES[currentPalette].bg;
  
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
  // Randomize snake length between 3 and 20.
  let snakeLength = floor(random(3, 21));
  // Maximum number of snakes is floor(10000 / snakeLength)
  let maxSnakes = floor(10000 / snakeLength);
  // Ensure we have at least 10 snakes but no more than maxSnakes
  let numSnakes = floor(random(10, min(maxSnakes + 1, 1000)));

  // Randomize additional parameters.
  let foodCount = floor(random(50, 301));         // Food count between 50 and 300.
  let foodMaxAge = floor(random(5000, 20001));    // Food max age between 5000 and 20000.

  // Randomize palette selection
  let paletteKeys = Object.keys(PALETTES);
  currentPalette = random(paletteKeys);

  if (DEBUG) {
    console.log(`Randomized params: snakes=${numSnakes}, length=${snakeLength}, ` +
                `product=${numSnakes * snakeLength}, foodCount=${foodCount}, ` +
                `palette=${currentPalette}`);
  }

  // Update global simulation parameters.
  NUM_SNAKES = numSnakes;
  INITIAL_SNAKE_LENGTH = snakeLength;
  FOOD_COUNT = foodCount;
  FOOD_MAX_AGE = foodMaxAge;

  // Update control panel UI if available.
  if (document.getElementById('numSnakes'))
    document.getElementById('numSnakes').value = numSnakes;
  if (document.getElementById('snakeLength'))
    document.getElementById('snakeLength').value = snakeLength;
  if (document.getElementById('foodCount'))
    document.getElementById('foodCount').value = foodCount;
  if (document.getElementById('foodMaxAge'))
    document.getElementById('foodMaxAge').value = foodMaxAge;
  if (document.getElementById('colorPalette'))
    document.getElementById('colorPalette').value = currentPalette;

  // Restart simulation with new parameters.
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