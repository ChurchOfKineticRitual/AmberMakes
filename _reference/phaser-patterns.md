# Phaser 3 Patterns Reference

Tested recipes for common game mechanics. All patterns use **coloured rectangles** first — swap in sprites later with `this.load.image()` + `this.add.sprite()`.

Source: [Official Phaser 3 docs](https://docs.phaser.io) and [Making Your First Game](https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game) tutorial.

---

## 1. Platforms (Static Group)

Platforms don't move — use a **static group** so the physics engine optimises them.

```javascript
// In create()
const platforms = this.physics.add.staticGroup();

// Ground — full width, bottom of screen
const ground = this.add.rectangle(400, 584, 800, 32, SETTINGS.groundColour);
platforms.add(ground);
ground.body.updateFromGameObject(); // sync physics body to rectangle

// Floating platforms
function addPlatform(scene, x, y, width) {
    const p = scene.add.rectangle(x, y, width, 16, SETTINGS.platformColour);
    platforms.add(p);
    p.body.updateFromGameObject();
    return p;
}

addPlatform(this, 600, 450, 120);
addPlatform(this, 200, 350, 120);
addPlatform(this, 750, 280, 120);

// IMPORTANT: after adding rectangles to a static group, call updateFromGameObject()
// on each one. Static bodies don't auto-sync with non-sprite game objects.
```

### Why updateFromGameObject()?

`this.add.rectangle()` creates a visual object but the static body defaults to position (0,0) with size (0,0). `updateFromGameObject()` copies the rectangle's position and size into the physics body. Without it, collisions happen at the wrong place. Sprites don't need this — their body syncs automatically from the texture.

---

## 2. Player with Physics

```javascript
// In create()
const player = this.add.rectangle(100, 450, SETTINGS.playerSize, SETTINGS.playerSize, SETTINGS.playerColour);
this.physics.add.existing(player); // adds a dynamic body
player.body.setBounce(0.1);
player.body.setCollideWorldBounds(true);

// Player stands on platforms
this.physics.add.collider(player, platforms);
```

### Movement (in update)

```javascript
function update() {
    if (cursors.left.isDown) {
        player.body.setVelocityX(-SETTINGS.playerSpeed);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(SETTINGS.playerSpeed);
    } else {
        player.body.setVelocityX(0);
    }

    // Jump — only when touching ground
    if (cursors.up.isDown && player.body.touching.down) {
        player.body.setVelocityY(SETTINGS.jumpPower); // negative = up
    }
}
```

---

## 3. Collectibles (Dynamic Group + Overlap)

Use a **dynamic group** for items the player picks up.

```javascript
// In create()
const coins = this.physics.add.group();

// Spawn coins across the level
for (let i = 0; i < 10; i++) {
    const coin = this.add.rectangle(
        70 + i * 75, 0,   // spread across top, fall down
        16, 16,
        SETTINGS.coinColour
    );
    coins.add(coin);
    coin.body.setBounceY(Phaser.Math.FloatBetween(0.3, 0.6));
}

// Coins land on platforms
this.physics.add.collider(coins, platforms);

// Player collects coins (overlap, not collide)
this.physics.add.overlap(player, coins, collectCoin, null, this);

function collectCoin(player, coin) {
    coin.disableBody(true, true); // remove from physics + hide
    score += 10;
    scoreText.setText('Score: ' + score);

    // When all coins collected, respawn them + add danger
    if (coins.countActive(true) === 0) {
        coins.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });
        spawnEnemy(); // increase difficulty
    }
}
```

### disableBody vs destroy

- `disableBody(true, true)` — removes from physics and hides, but keeps the object alive for re-enabling later
- `destroy()` — permanently removes the object. Use for one-off things like explosions.

---

## 4. Enemies (Patrol Movement)

```javascript
// In create()
const enemies = this.physics.add.group();

function spawnEnemy() {
    const x = (player.x < 400)
        ? Phaser.Math.Between(400, 780)
        : Phaser.Math.Between(20, 400);

    const enemy = this.add.rectangle(x, 16, 24, 24, SETTINGS.enemyColour);
    enemies.add(enemy);
    enemy.body.setBounce(1);
    enemy.body.setCollideWorldBounds(true);
    enemy.body.setVelocity(Phaser.Math.Between(-200, 200), 20);
}

this.physics.add.collider(enemies, platforms);

// Enemy hits player = game over
this.physics.add.overlap(player, enemies, hitEnemy, null, this);

function hitEnemy(player, enemy) {
    this.physics.pause();
    player.fillColor = 0xff0000; // flash red
    gameOver = true;
}
```

### Patrol between two points

```javascript
// For an enemy that walks back and forth on a platform:
function createPatroller(scene, x, y, minX, maxX) {
    const e = scene.add.rectangle(x, y, 24, 24, SETTINGS.enemyColour);
    scene.physics.add.existing(e);
    e.body.setAllowGravity(false); // floats on its platform
    e.body.setVelocityX(SETTINGS.enemySpeed);
    e.body.setImmovable(true);

    // Store patrol bounds on the object
    e.patrolMin = minX;
    e.patrolMax = maxX;
    return e;
}

// In update() — reverse direction at patrol bounds
enemies.children.iterate(function (e) {
    if (e.active && e.patrolMin !== undefined) {
        if (e.x <= e.patrolMin) e.body.setVelocityX(SETTINGS.enemySpeed);
        if (e.x >= e.patrolMax) e.body.setVelocityX(-SETTINGS.enemySpeed);
    }
});
```

---

## 5. Camera Follow

For games wider than the screen (scrolling levels):

```javascript
// In create()

// Set world bounds larger than camera
this.physics.world.setBounds(0, 0, 2400, 600);

// Camera follows player smoothly
this.cameras.main.startFollow(player);
this.cameras.main.setBounds(0, 0, 2400, 600);

// Optional: deadzone (player can move this much before camera follows)
this.cameras.main.setDeadzone(200, 100);

// Optional: lerp for smooth catch-up (lower = smoother, 1 = instant)
this.cameras.main.setLerp(0.1, 0.1);
```

---

## 6. Game Over + Restart

```javascript
let gameOver = false;

// In update() — block input when game is over
function update() {
    if (gameOver) return;
    // ... normal movement code
}

// When player dies:
function hitEnemy(player, enemy) {
    this.physics.pause();
    player.fillColor = 0xff0000;
    gameOver = true;

    // Show game over text
    const gameOverText = this.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2,
        'GAME OVER\nPress SPACE to restart',
        { fontSize: '28px', fill: '#ffffff', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5);

    // Listen for restart
    this.input.keyboard.once('keydown-SPACE', () => {
        gameOver = false;
        score = 0;
        this.scene.restart();
    });
}
```

### scene.restart() vs scene.start()

- `this.scene.restart()` — restarts the current scene. All variables declared outside functions (like `score`) must be manually reset.
- `this.scene.start('SceneName')` — switches to a different scene. Use for title screens.

---

## 7. Timer Events (Spawning Waves)

```javascript
// Spawn an enemy every 3 seconds
this.time.addEvent({
    delay: 3000,
    callback: spawnEnemy,
    callbackScope: this,
    loop: true
});

// One-off delayed event
this.time.delayedCall(2000, () => {
    // runs once after 2 seconds
}, [], this);

// Increasing difficulty — reduce delay over time
let spawnDelay = 3000;
function startSpawner(scene) {
    scene.time.addEvent({
        delay: spawnDelay,
        callback: () => {
            spawnEnemy.call(scene);
            spawnDelay = Math.max(800, spawnDelay - 100); // get faster
            startSpawner(scene); // schedule next with new delay
        },
        callbackScope: scene
    });
}
```

---

## 8. Tweens (Juice and Animation)

Tweens animate any property smoothly.

```javascript
// Bobbing collectible
this.tweens.add({
    targets: coin,
    y: coin.y - 10,
    duration: 600,
    yoyo: true,
    repeat: -1, // forever
    ease: 'Sine.easeInOut'
});

// Screen shake on hit
this.cameras.main.shake(200, 0.01);

// Flash a colour then return
this.tweens.add({
    targets: player,
    fillColor: { from: 0xff0000, to: SETTINGS.playerColour },
    duration: 300
});

// Scale up then destroy (explosion feel)
this.tweens.add({
    targets: enemy,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 300,
    onComplete: () => enemy.destroy()
});
```

---

## 9. Sound Effects

```javascript
// In preload()
this.load.audio('jump', 'sounds/highUp.ogg');
this.load.audio('collect', 'sounds/pepSound1.ogg');
this.load.audio('hit', 'sounds/bump.ogg');

// In create() — store references
this.jumpSound = this.sound.add('jump');
this.collectSound = this.sound.add('collect');
this.hitSound = this.sound.add('hit');

// Play when needed
this.jumpSound.play();

// With volume
this.collectSound.play({ volume: 0.5 });
```

The starter-pack sounds are in `starter-pack/sounds/game/` and `starter-pack/sounds/ui/`. Copy them into your game folder before loading.

---

## 10. Procedural Level Generation

For endless or randomised games:

```javascript
// Generate platforms at random positions
function generatePlatforms(scene, count, startX, startY) {
    for (let i = 0; i < count; i++) {
        const x = startX + i * Phaser.Math.Between(100, 200);
        const y = Phaser.Math.Clamp(
            startY + Phaser.Math.Between(-80, 80),
            100, 500 // keep within reachable range
        );
        addPlatform(scene, x, y, Phaser.Math.Between(80, 160));
    }
}

// For endless runners — spawn ahead, remove behind
function update() {
    // ... movement code ...

    // Spawn new platforms ahead of camera
    const camRight = this.cameras.main.scrollX + SETTINGS.gameWidth;
    if (camRight > lastPlatformX - 400) {
        const x = lastPlatformX + Phaser.Math.Between(150, 250);
        const y = Phaser.Math.Between(200, 500);
        addPlatform(this, x, y, Phaser.Math.Between(80, 150));
        lastPlatformX = x;
    }

    // Clean up platforms behind camera
    platforms.children.iterate(function (p) {
        if (p && p.x < this.cameras.main.scrollX - 200) {
            platforms.remove(p, true, true);
        }
    }, this);
}
```

---

## 11. Moving Platforms

```javascript
function createMovingPlatform(scene, x, y, width, minY, maxY, speed) {
    const p = scene.add.rectangle(x, y, width, 16, SETTINGS.platformColour);
    scene.physics.add.existing(p);
    p.body.setAllowGravity(false);
    p.body.setImmovable(true);
    p.body.setVelocityY(speed);

    p.moveMin = minY;
    p.moveMax = maxY;
    return p;
}

// In update() — reverse at bounds
movingPlatforms.forEach(p => {
    if (p.y <= p.moveMin) p.body.setVelocityY(Math.abs(p.body.velocity.y));
    if (p.y >= p.moveMax) p.body.setVelocityY(-Math.abs(p.body.velocity.y));
});

// IMPORTANT: for moving platforms carrying the player, set:
player.body.setMaxVelocityY(800); // prevent falling through fast platforms
```

---

## Quick Reference: Common SETTINGS

```javascript
const SETTINGS = {
    // Player
    playerSpeed: 300,        // horizontal movement
    jumpPower: -450,         // negative = up (gravity is positive)
    playerSize: 32,
    playerColour: 0x00ff88,

    // Physics
    gravity: 600,

    // World
    gameWidth: 800,
    gameHeight: 600,
    backgroundColour: '#1a1a2e',

    // Platforms
    groundColour: 0x444466,
    platformColour: 0x666688,

    // Collectibles
    coinColour: 0xffdd44,
    coinSize: 16,
    coinPoints: 10,

    // Enemies
    enemyColour: 0xff4444,
    enemySize: 24,
    enemySpeed: 100,

    // Camera (for scrolling games)
    worldWidth: 2400,
};
```

---

## Common Mistakes

1. **Rectangles in static groups need `updateFromGameObject()`** — without it the physics body sits at (0,0) with zero size.
2. **Jump check: `player.body.touching.down`** — not `player.body.onFloor()` which only checks world bounds, not platform collisions.
3. **Negative Y = up** — `jumpPower` should be negative (e.g. -450). Gravity pulls down (positive Y).
4. **`collider` vs `overlap`** — collider makes objects bounce off each other. Overlap detects intersection without physical response. Use overlap for collectibles and damage zones.
5. **Group children iteration** — use `group.children.iterate()` not `group.forEach()`. The iterate method is Phaser's safe iterator that handles removals during iteration.
6. **Score reset on restart** — `scene.restart()` re-runs `create()` but doesn't reset variables declared outside functions. Reset `score = 0` and `gameOver = false` before calling restart.
7. **Static body size** — `setScale()` on a static body visual doesn't resize the physics body. Call `.refreshBody()` after scaling sprites, or `updateFromGameObject()` after sizing rectangles.
