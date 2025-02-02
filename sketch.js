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
const BG_COLOR = [15, 23, 42];  // Tailwind slate-900 for background
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
  console.log(`Grid dimensions: ${GRID_X} x ${GRID_Y} x ${GRID_Z}`);
}

function setup() {
  console.log('Starting game setup...');
  // Initialize camera rotation angles
  rotX = -PI/6;
  rotY = PI/4;
  
  initializeGrid();
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Initialize color palette
  updatePalette();
  console.log(`Initialized palette with ${palette.length} colors`);
  
  // Set up lighting system
  setupLights();
  
  // Initialize snakes
  let snakesPerRow = ceil(sqrt(NUM_SNAKES));
  let spacing = floor(GRID_X / snakesPerRow);
  console.log(`Creating ${NUM_SNAKES} snakes, ${snakesPerRow} per row, spacing: ${spacing}`);
  
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
    console.log(`Snake ${i}: pos(${pos.x}, ${pos.y}, ${pos.z}), dir(${dir.x}, ${dir.y}, ${dir.z})`);
    snakes.push(new Snake(pos, dir, random(palette)));
  }
  
  // Spawn initial food
  for (let i = 0; i < FOOD_COUNT; i++) {
    spawnFood();
  }
  console.log(`Spawned ${FOOD_COUNT} initial food items`);
  
  lastMoveTime = millis();
  console.log('Setup complete');
  blendMode(BLEND);
}

function draw() {
  if (shouldClearBackground) {
    background(...BG_COLOR);
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
  
  // Draw food with shrink effect using a pyramid shape,
  // and apply a slow rotation driven by Perlin noise.
  noStroke();
  for (let f of foods) {
    push();
    fill(34, 197, 94); // Tailwind green-500
    translate(f.pos.x * cellSize, f.pos.y * cellSize, f.pos.z * cellSize);
    // Compute remaining life factor (1 = full size, 0 = expired)
    let age = millis() - f.birth;
    let factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1);
    // Apply slow rotation: 
    // Use Perlin noise (with an offset based on f.birth) for smooth, random motion.
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
    console.log(`Creating snake at (${startPos.x}, ${startPos.y}, ${startPos.z})`);
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
    console.log(`Snake created with ${this.body.length} segments`);
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
    for (let i = 2; i < this.body.length; i++) {
      if (this.body[i].equals(head)) {
        return true;
      }
    }
    return false;
  }
  
  // On self-collision, convert every 2nd voxel (odd-indexed) into food and remove them.
  handleSelfCollision() {
    console.log(`Snake self-collision! Length before: ${this.body.length}`);
    this.die();
  }
  
  // When the snake dies, convert all voxels into food.
  die() {
    console.log(`Snake dying, converting ${this.body.length} segments to food`);
    this.alive = false;
    for (let seg of this.body) {
      spawnFoodAt(seg.x, seg.y, seg.z);
    }
  }
}

// --- AI & Collision Functions ---

function updateGame() {
  const aliveCount = snakes.filter(s => s.alive).length;
  console.log(`Update cycle: ${aliveCount} snakes alive, ${foods.length} food items`);
  
  // Update each snake: determine direction, move, check for food, and self-collision.
  snakes.forEach((snake, index) => {
    if (!snake.alive) return;
    updateAISnake(snake);
    snake.move();
    checkFoodCollision(snake);
    if (snake.checkSelfCollision()) {
      console.log(`Snake ${index} detected self-collision`);
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
  
  // Find the food with minimum effective distance (distance weighted by age/freshness)
  let closestFood = null;
  let bestEffectiveDistance = Infinity;
  let closestRealDistance = Infinity;
  
  for (let f of foods) {
    let d = abs(f.pos.x - head.x) + abs(f.pos.y - head.y) + abs(f.pos.z - head.z);
    let age = millis() - f.birth;
    // Freshness factor: 1 for new food, 0 when it reaches FOOD_MAX_AGE
    let factor = constrain(map(age, 0, FOOD_MAX_AGE, 1, 0), 0, 1);
    // Effective distance: lower is better.
    let effectiveDistance = d / (factor + 0.1); // adding a small epsilon to avoid division by zero.
    if (effectiveDistance < bestEffectiveDistance) {
      bestEffectiveDistance = effectiveDistance;
      closestFood = f;
      closestRealDistance = d;
    }
  }
  
  if (!closestFood) return;
  
  // Evaluate candidate moves (6 cardinal directions)
  let candidates = [
    createVector(1, 0, 0),
    createVector(-1, 0, 0),
    createVector(0, 1, 0),
    createVector(0, -1, 0),
    createVector(0, 0, 1),
    createVector(0, 0, -1)
  ];
  
  let bestCandidateDist = Infinity;
  let bestDir = snake.direction.copy();
  
  for (let cand of candidates) {
    // Avoid direct reversal
    if (cand.equals(p5.Vector.mult(snake.direction, -1))) continue;
    
    let candidateHead = p5.Vector.add(head, cand);
    candidateHead.x = (candidateHead.x + GRID_X) % GRID_X;
    candidateHead.y = (candidateHead.y + GRID_Y) % GRID_Y;
    candidateHead.z = (candidateHead.z + GRID_Z) % GRID_Z;
    
    // Check for immediate self-collision
    let collision = false;
    for (let i = 0; i < snake.body.length - 1; i++) {
      if (snake.body[i].equals(candidateHead)) {
        collision = true;
        break;
      }
    }
    if (collision) continue;
    
    let candDist = abs(closestFood.pos.x - candidateHead.x) +
                   abs(closestFood.pos.y - candidateHead.y) +
                   abs(closestFood.pos.z - candidateHead.z);
    if (candDist < bestCandidateDist) {
      bestCandidateDist = candDist;
      bestDir = cand.copy();
    }
  }
  snake.setDirection(bestDir);
  
  // Debug logging
  console.log(`Snake targeting food at (${closestFood.pos.x}, ${closestFood.pos.y}, ${closestFood.pos.z}), real dist: ${closestRealDistance}, effective: ${bestEffectiveDistance.toFixed(2)}`);
}

// Process collisions between snakes.
// If two snakes collide head-to-head, the smaller snake dies.
// If the snakes are equal in length, both die.
// If a snake's head hits another snake's body, the colliding snake dies.
function processCollisions() {
  for (let i = 0; i < snakes.length; i++) {
    for (let j = i + 1; j < snakes.length; j++) {
      if (!snakes[i].alive || !snakes[j].alive) continue;
      
      // Get heads and bodies
      let headA = snakes[i].body[0];
      let headB = snakes[j].body[0];
      
      // Check head-to-head collision (slither.io style)
      if (headA.equals(headB)) {
        console.log(`Head-to-head collision between snakes ${i} and ${j}`);
        if (snakes[i].body.length < snakes[j].body.length) {
          snakes[i].die();
        } else if (snakes[i].body.length > snakes[j].body.length) {
          snakes[j].die();
        } else {
          // If equal length, both die (slither.io logic)
          snakes[i].die();
          snakes[j].die();
        }
        continue;
      }
      
      // Check head-to-body collisions (slither.io style)
      // Snake A's head hitting Snake B's body
      for (let k = 1; k < snakes[j].body.length; k++) {
        if (headA.equals(snakes[j].body[k])) {
          console.log(`Snake ${i}'s head hit snake ${j}'s body`);
          snakes[i].die();
          break;
        }
      }
      
      // Snake B's head hitting Snake A's body
      for (let k = 1; k < snakes[i].body.length; k++) {
        if (headB.equals(snakes[i].body[k])) {
          console.log(`Snake ${j}'s head hit snake ${i}'s body`);
          snakes[j].die();
          break;
        }
      }
    }
  }
}

// Modified food collision to match slither.io behavior
function checkFoodCollision(snake) {
  let head = snake.body[0];
  for (let i = foods.length - 1; i >= 0; i--) {
    let f = foods[i];
    if (head.equals(f.pos)) {
      console.log(`Snake ate food at (${f.pos.x}, ${f.pos.y}, ${f.pos.z}), length: ${snake.body.length}`);
      foods.splice(i, 1);
      snake.grow();
      // Spawn new food immediately to maintain food density
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
  foods.push({ pos: pos, birth: millis() });
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
  foods.push({ pos: pos, birth: millis() });
}

function drawDebugInfo() {
  // Switch to 2D mode for text
  push();
  camera();
  noLights();
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text(`FPS: ${frameRate().toFixed(1)}`, 10, 10);
  text(`Snakes Alive: ${snakes.filter(s => s.alive).length}`, 10, 30);
  text(`Food Count: ${foods.length}`, 10, 50);
  text('\nControls:\nWASD: Move in camera direction\nQ/E: Up/Down\nDrag: Look around\nMouse Wheel: Zoom', 10, 70);
  text(`Zoom: ${(zoom * 100).toFixed(0)}%`, 10, 150);
  pop();
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
  // Ambient light for base illumination
  ambientLight(50);
  
  const gridHalfX = GRID_X * cellSize / 2;
  const gridHalfY = GRID_Y * cellSize / 2;
  const gridHalfZ = GRID_Z * cellSize / 2;
  const lightIntensity = 255;
  
  // Position lights on each face of the grid cube
  // Front and Back
  for (let x = -gridHalfX; x <= gridHalfX; x += gridHalfX * 2) {
    for (let y = -gridHalfY; y <= gridHalfY; y += gridHalfY * 2) {
      pointLight(lightIntensity, lightIntensity, lightIntensity, x, y, -gridHalfZ);
      pointLight(lightIntensity, lightIntensity, lightIntensity, x, y, gridHalfZ);
    }
  }
  
  // Left and Right
  for (let y = -gridHalfY; y <= gridHalfY; y += gridHalfY * 2) {
    for (let z = -gridHalfZ; z <= gridHalfZ; z += gridHalfZ * 2) {
      pointLight(lightIntensity, lightIntensity, lightIntensity, -gridHalfX, y, z);
      pointLight(lightIntensity, lightIntensity, lightIntensity, gridHalfX, y, z);
    }
  }
  
  // Top and Bottom
  for (let x = -gridHalfX; x <= gridHalfX; x += gridHalfX * 2) {
    for (let z = -gridHalfZ; z <= gridHalfZ; z += gridHalfZ * 2) {
      pointLight(lightIntensity, lightIntensity, lightIntensity, x, -gridHalfY, z);
      pointLight(lightIntensity, lightIntensity, lightIntensity, x, gridHalfY, z);
    }
  }
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
      console.log(`Cluster of 3 food turned into a snake at (${newPos.x}, ${newPos.y}, ${newPos.z})`);
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
  currentPalette = document.getElementById('colorPalette').value;
  updatePalette();
}

// Restart the simulation with new parameters
function restartSimulation() {
  updateParams();
  // Force clear background on restart
  background(...BG_COLOR);
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
}

// Spawn multiple food particles at grid cells determined by perspective.
function spawnFoodUnderCursor() {
  // Define a plane in world space where food should appear.
  // Here we choose a plane with z = CLICK_PLANE_WORLD_Z,
  // where CLICK_PLANE_WORLD_Z is set closer to the camera than the grid center.
  let CLICK_PLANE_WORLD_Z = 0.4 * GRID_Z * cellSize; // adjust the factor if needed
  
  // Compute normalized device coordinates (NDC) from mouse position.
  let ndcX = (mouseX / width) * 2 - 1;
  let ndcY = 1 - (mouseY / height) * 2;
  
  // Compute the ray direction in camera space.
  // Assuming the camera looks along -z (as set in autoAdjustCamera).
  let rayDir = createVector(ndcX * tan(globalFOV / 2) * globalAspect, ndcY * tan(globalFOV / 2), -1);
  rayDir.normalize();
  
  // Ray: R(t) = camEye + t * rayDir.
  // Solve for t such that R(t).z = CLICK_PLANE_WORLD_Z.
  let t = (CLICK_PLANE_WORLD_Z - camEye.z) / rayDir.z;
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