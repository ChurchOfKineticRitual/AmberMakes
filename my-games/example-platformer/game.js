// ===== SETTINGS (change these!) =====
const SETTINGS = {
    playerSpeed: 300,
    jumpPower: -500,
    gravity: 700,
    playerSize: 30,
    playerColour: 0x00ff88,
    groundColour: 0x444466,
    platformColour: 0x666688,
    coinColour: 0xffdd44,
    coinSize: 14,
    coinPoints: 10,
    enemyColour: 0xff4455,
    enemySize: 22,
    enemySpeed: 80,
    backgroundColour: '#1a1a2e',
    gameWidth: 800,
    gameHeight: 600
};

// ===== GAME CONFIG =====
const config = {
    type: Phaser.AUTO,
    width: SETTINGS.gameWidth,
    height: SETTINGS.gameHeight,
    backgroundColor: SETTINGS.backgroundColour,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: SETTINGS.gravity },
            debug: false
        }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ===== GAME STATE =====
let player;
let platforms;
let coins;
let enemies;
let cursors;
let score = 0;
let scoreText;
let gameOver = false;

// ===== PRELOAD =====
function preload() {
    // No assets to load — coloured rectangles only!
}

// ===== CREATE =====
function create() {
    // --- Platforms (static group) ---
    platforms = this.physics.add.staticGroup();

    // Ground — full width bar at bottom
    const ground = this.add.rectangle(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight - 16,
        SETTINGS.gameWidth, 32,
        SETTINGS.groundColour
    );
    platforms.add(ground);
    ground.body.updateFromGameObject();

    // Floating platforms
    addPlatform(this, 600, 450, 130);
    addPlatform(this, 150, 380, 130);
    addPlatform(this, 400, 300, 130);
    addPlatform(this, 680, 220, 130);
    addPlatform(this, 250, 180, 130);

    // --- Player ---
    player = this.add.rectangle(
        100, SETTINGS.gameHeight - 80,
        SETTINGS.playerSize, SETTINGS.playerSize,
        SETTINGS.playerColour
    );
    this.physics.add.existing(player);
    player.body.setBounce(0.1);
    player.body.setCollideWorldBounds(true);

    // --- Coins (dynamic group) ---
    coins = this.physics.add.group();
    spawnCoins(this);

    // --- Enemies ---
    enemies = this.physics.add.group();
    createPatroller(this, 550, 430, 530, 670);
    createPatroller(this, 370, 280, 340, 460);

    // --- Score ---
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '18px',
        fill: '#ffffff',
        fontFamily: 'monospace'
    });

    // --- Controls ---
    cursors = this.input.keyboard.createCursorKeys();

    // --- Collisions ---
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(coins, platforms);
    this.physics.add.collider(enemies, platforms);

    // Player collects coins (overlap — no bounce)
    this.physics.add.overlap(player, coins, collectCoin, null, this);

    // Enemy hits player (overlap — triggers game over)
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
}

// ===== UPDATE (runs every frame) =====
function update() {
    if (gameOver) return;

    // Left / right
    if (cursors.left.isDown) {
        player.body.setVelocityX(-SETTINGS.playerSpeed);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(SETTINGS.playerSpeed);
    } else {
        player.body.setVelocityX(0);
    }

    // Jump — only when standing on something
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
        player.body.setVelocityY(SETTINGS.jumpPower);
    }

    // Patrol enemies — reverse at bounds
    enemies.children.iterate(function (e) {
        if (e && e.active && e.patrolMin !== undefined) {
            if (e.x <= e.patrolMin) e.body.setVelocityX(SETTINGS.enemySpeed);
            if (e.x >= e.patrolMax) e.body.setVelocityX(-SETTINGS.enemySpeed);
        }
    });
}

// ===== HELPERS =====

function addPlatform(scene, x, y, width) {
    const p = scene.add.rectangle(x, y, width, 16, SETTINGS.platformColour);
    platforms.add(p);
    p.body.updateFromGameObject();
    return p;
}

function spawnCoins(scene) {
    // Place a coin above each floating platform
    const positions = [
        { x: 600, y: 420 },
        { x: 150, y: 350 },
        { x: 400, y: 270 },
        { x: 680, y: 190 },
        { x: 250, y: 150 }
    ];
    positions.forEach(pos => {
        const coin = scene.add.rectangle(
            pos.x, pos.y,
            SETTINGS.coinSize, SETTINGS.coinSize,
            SETTINGS.coinColour
        );
        coins.add(coin);
        coin.body.setAllowGravity(false);

        // Bobbing tween for juice
        scene.tweens.add({
            targets: coin,
            y: pos.y - 8,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    });
}

function createPatroller(scene, x, y, minX, maxX) {
    const e = scene.add.rectangle(x, y, SETTINGS.enemySize, SETTINGS.enemySize, SETTINGS.enemyColour);
    enemies.add(e);
    e.body.setAllowGravity(false);
    e.body.setImmovable(true);
    e.body.setVelocityX(SETTINGS.enemySpeed);
    e.patrolMin = minX;
    e.patrolMax = maxX;
    return e;
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += SETTINGS.coinPoints;
    scoreText.setText('Score: ' + score);

    // All coins collected — respawn them
    if (coins.countActive(true) === 0) {
        coins.children.iterate(function (child) {
            child.enableBody(true, child.x, child.y - 30, true, true);
        });
    }
}

function hitEnemy(player, enemy) {
    this.physics.pause();
    player.fillColor = 0xff0000;
    gameOver = true;

    // Show game over message
    this.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2,
        'GAME OVER\nPress SPACE to restart',
        { fontSize: '28px', fill: '#ffffff', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5);

    // Restart on space
    this.input.keyboard.once('keydown-SPACE', () => {
        score = 0;
        gameOver = false;
        this.scene.restart();
    });
}
