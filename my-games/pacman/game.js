// ===== SETTINGS (change these!) =====
const SETTINGS = {
    playerSpeed: 300,
    gravity: 600,
    jumpPower: -450,
    playerSize: 32,
    playerColour: 0x00ff88,
    groundColour: 0x444466,
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

let player;
let ground;
let cursors;
let score = 0;
let scoreText;

function preload() {
    // Nothing to load — using coloured rectangles!
}

function create() {
    // Ground
    ground = this.add.rectangle(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight - 16,
        SETTINGS.gameWidth, 32,
        SETTINGS.groundColour
    );
    this.physics.add.existing(ground, true); // true = static

    // Player
    player = this.add.rectangle(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight - 100,
        SETTINGS.playerSize, SETTINGS.playerSize,
        SETTINGS.playerColour
    );
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // Player stands on ground
    this.physics.add.collider(player, ground);

    // Controls
    cursors = this.input.keyboard.createCursorKeys();

    // Score
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '18px',
        fill: '#ffffff',
        fontFamily: 'monospace'
    });
}

function update() {
    // Left/right movement
    if (cursors.left.isDown) {
        player.body.setVelocityX(-SETTINGS.playerSpeed);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(SETTINGS.playerSpeed);
    } else {
        player.body.setVelocityX(0);
    }

    // Jump (only when touching the ground)
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
        player.body.setVelocityY(SETTINGS.jumpPower);
    }
}
