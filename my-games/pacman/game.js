// ===== SETTINGS (change these!) =====
const SETTINGS = {
    // Grid
    tileSize: 28,
    cols: 28,
    rows: 21,

    // Player
    playerSpeed: 150,
    playerColour: 0xffff00,

    // Ghosts
    ghostSpeed: 120,
    ghostColours: [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852], // red, pink, cyan, orange
    ghostScaredColour: 0x0000ff,
    scaredDuration: 8000,

    // Colours
    wallColour: 0x2121de,
    dotColour: 0xffffff,
    powerDotColour: 0xffffff,
    backgroundColour: '#000000',

    // Scoring
    dotScore: 10,
    powerDotScore: 50,
    ghostScore: 200,
    lives: 3,
};

// Map legend: 1=wall, 0=dot, 2=empty, 3=power dot, 4=ghost house
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
    [1,3,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,3,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,2,1,1,2,1,1,1,1,1,0,1,1,1,1,1,1],
    [2,2,2,2,2,1,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,1,2,2,2,2,2],
    [1,1,1,1,1,1,0,1,1,2,1,1,1,4,4,1,1,1,2,1,1,0,1,1,1,1,1,1],
    [2,2,2,2,2,2,0,2,2,2,1,4,4,4,4,4,4,1,2,2,2,0,2,2,2,2,2,2],
    [1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1],
    [2,2,2,2,2,1,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,1,2,2,2,2,2],
    [1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
    [1,3,0,0,1,1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1,1,0,0,3,1],
    [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GAME_WIDTH = SETTINGS.cols * SETTINGS.tileSize;
const GAME_HEIGHT = (SETTINGS.rows + 2) * SETTINGS.tileSize; // extra rows for score/lives

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: SETTINGS.backgroundColour,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let walls;
let dots;
let powerDots;
let ghosts = [];
let score = 0;
let lives;
let scoreText;
let livesText;
let direction = 'right';
let nextDirection = 'right';
let gameOver = false;
let ghostsScared = false;
let scaredTimer = null;
let totalDots = 0;
let gameOverText;
let winText;
const Y_OFFSET = SETTINGS.tileSize * 2; // offset for score bar

function preload() {}

function create() {
    walls = this.physics.add.staticGroup();
    dots = this.physics.add.staticGroup();
    powerDots = this.physics.add.staticGroup();
    lives = SETTINGS.lives;

    // Build the map
    for (let row = 0; row < SETTINGS.rows; row++) {
        for (let col = 0; col < SETTINGS.cols; col++) {
            const x = col * SETTINGS.tileSize + SETTINGS.tileSize / 2;
            const y = row * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;
            const tile = MAP[row][col];

            if (tile === 1) {
                const wall = this.add.rectangle(x, y, SETTINGS.tileSize, SETTINGS.tileSize, SETTINGS.wallColour);
                walls.add(wall);
                wall.body.setSize(SETTINGS.tileSize, SETTINGS.tileSize);
            } else if (tile === 0) {
                const dot = this.add.circle(x, y, 3, SETTINGS.dotColour);
                dots.add(dot);
                dot.body.setCircle(3);
                dot.body.setOffset(-3, -3);
                totalDots++;
            } else if (tile === 3) {
                const pdot = this.add.circle(x, y, 7, SETTINGS.powerDotColour);
                powerDots.add(pdot);
                pdot.body.setCircle(7);
                pdot.body.setOffset(-7, -7);
                totalDots++;
                // Blink effect
                this.tweens.add({
                    targets: pdot,
                    alpha: 0.2,
                    duration: 400,
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    // Player (Pacman) — starts at row 16, col 13/14 area
    const startCol = 14;
    const startRow = 16;
    const px = startCol * SETTINGS.tileSize + SETTINGS.tileSize / 2;
    const py = startRow * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;
    player = this.add.circle(px, py, SETTINGS.tileSize / 2 - 2, SETTINGS.playerColour);
    this.physics.add.existing(player);
    player.body.setCircle(SETTINGS.tileSize / 2 - 2);
    player.body.setCollideWorldBounds(false);

    // Ghosts — start in/near the ghost house (row 10, cols 12-15)
    const ghostStartPositions = [
        { col: 13, row: 9 },  // above house
        { col: 13, row: 10 }, // in house
        { col: 14, row: 10 }, // in house
        { col: 14, row: 9 },  // above house
    ];

    for (let i = 0; i < 4; i++) {
        const gx = ghostStartPositions[i].col * SETTINGS.tileSize + SETTINGS.tileSize / 2;
        const gy = ghostStartPositions[i].row * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;
        const ghost = this.add.rectangle(gx, gy, SETTINGS.tileSize - 4, SETTINGS.tileSize - 4, SETTINGS.ghostColours[i]);
        this.physics.add.existing(ghost);
        ghost.body.setCollideWorldBounds(false);
        ghost.baseColour = SETTINGS.ghostColours[i];
        ghost.direction = ['left', 'right', 'up', 'down'][i % 4];
        ghost.isScared = false;
        ghosts.push(ghost);
    }

    // Collisions
    this.physics.add.collider(player, walls);
    ghosts.forEach(g => this.physics.add.collider(g, walls));

    // Overlaps
    this.physics.add.overlap(player, dots, eatDot, null, this);
    this.physics.add.overlap(player, powerDots, eatPowerDot, null, this);
    this.physics.add.overlap(player, ghosts, hitGhost, null, this);

    // Controls
    cursors = this.input.keyboard.createCursorKeys();

    // Score & Lives
    scoreText = this.add.text(16, 10, 'SCORE: 0', {
        fontSize: '18px',
        fill: '#ffffff',
        fontFamily: 'monospace'
    });
    livesText = this.add.text(GAME_WIDTH - 16, 10, 'LIVES: ' + lives, {
        fontSize: '18px',
        fill: '#ffff00',
        fontFamily: 'monospace'
    }).setOrigin(1, 0);
}

function update() {
    if (gameOver) return;

    // Queue next direction
    if (cursors.left.isDown) nextDirection = 'left';
    else if (cursors.right.isDown) nextDirection = 'right';
    else if (cursors.up.isDown) nextDirection = 'up';
    else if (cursors.down.isDown) nextDirection = 'down';

    // Snap to grid and change direction
    const tileX = Math.round((player.x - SETTINGS.tileSize / 2) / SETTINGS.tileSize);
    const tileY = Math.round((player.y - SETTINGS.tileSize / 2 - Y_OFFSET) / SETTINGS.tileSize);
    const centerX = tileX * SETTINGS.tileSize + SETTINGS.tileSize / 2;
    const centerY = tileY * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;

    const snapThreshold = 4;
    const nearCenter = Math.abs(player.x - centerX) < snapThreshold && Math.abs(player.y - centerY) < snapThreshold;

    if (nearCenter) {
        // Try next direction first
        if (canMove(tileX, tileY, nextDirection)) {
            direction = nextDirection;
            player.x = centerX;
            player.y = centerY;
        } else if (!canMove(tileX, tileY, direction)) {
            // Can't continue current direction either — stop
            player.body.setVelocity(0, 0);
            player.x = centerX;
            player.y = centerY;
            moveGhosts();
            return;
        }
    }

    // Apply velocity
    const speed = SETTINGS.playerSpeed;
    switch (direction) {
        case 'left':  player.body.setVelocity(-speed, 0); break;
        case 'right': player.body.setVelocity(speed, 0); break;
        case 'up':    player.body.setVelocity(0, -speed); break;
        case 'down':  player.body.setVelocity(0, speed); break;
    }

    // Tunnel wrap-around
    if (player.x < 0) player.x = GAME_WIDTH;
    if (player.x > GAME_WIDTH) player.x = 0;

    // Move ghosts
    moveGhosts();
}

function canMove(tileX, tileY, dir) {
    let nextCol = tileX;
    let nextRow = tileY;
    switch (dir) {
        case 'left':  nextCol--; break;
        case 'right': nextCol++; break;
        case 'up':    nextRow--; break;
        case 'down':  nextRow++; break;
    }
    // Tunnel
    if (nextCol < 0 || nextCol >= SETTINGS.cols) return true;
    if (nextRow < 0 || nextRow >= SETTINGS.rows) return false;
    return MAP[nextRow][nextCol] !== 1;
}

function moveGhosts() {
    ghosts.forEach(ghost => {
        if (!ghost.active) return;

        const tileX = Math.round((ghost.x - SETTINGS.tileSize / 2) / SETTINGS.tileSize);
        const tileY = Math.round((ghost.y - SETTINGS.tileSize / 2 - Y_OFFSET) / SETTINGS.tileSize);
        const centerX = tileX * SETTINGS.tileSize + SETTINGS.tileSize / 2;
        const centerY = tileY * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;

        const snapThreshold = 4;
        const nearCenter = Math.abs(ghost.x - centerX) < snapThreshold && Math.abs(ghost.y - centerY) < snapThreshold;

        if (nearCenter) {
            ghost.x = centerX;
            ghost.y = centerY;

            // Get available directions (not walls, not reverse)
            const dirs = ['left', 'right', 'up', 'down'];
            const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
            const available = dirs.filter(d => {
                if (d === opposite[ghost.direction]) return false;
                return canMove(tileX, tileY, d);
            });

            if (available.length === 0) {
                // Dead end — reverse
                ghost.direction = opposite[ghost.direction];
            } else if (ghost.isScared) {
                // Random movement when scared
                ghost.direction = available[Math.floor(Math.random() * available.length)];
            } else {
                // Simple chase: prefer direction toward player
                const playerTileX = Math.round((player.x - SETTINGS.tileSize / 2) / SETTINGS.tileSize);
                const playerTileY = Math.round((player.y - SETTINGS.tileSize / 2 - Y_OFFSET) / SETTINGS.tileSize);
                const dx = playerTileX - tileX;
                const dy = playerTileY - tileY;

                // Sort by which direction gets closer to player
                available.sort((a, b) => {
                    const scoreA = dirScore(a, dx, dy);
                    const scoreB = dirScore(b, dx, dy);
                    return scoreB - scoreA;
                });

                // 70% chance to pick best direction (adds some randomness)
                ghost.direction = Math.random() < 0.7 ? available[0] : available[Math.floor(Math.random() * available.length)];
            }
        }

        const speed = ghost.isScared ? SETTINGS.ghostSpeed * 0.5 : SETTINGS.ghostSpeed;
        switch (ghost.direction) {
            case 'left':  ghost.body.setVelocity(-speed, 0); break;
            case 'right': ghost.body.setVelocity(speed, 0); break;
            case 'up':    ghost.body.setVelocity(0, -speed); break;
            case 'down':  ghost.body.setVelocity(0, speed); break;
        }

        // Tunnel wrap
        if (ghost.x < 0) ghost.x = GAME_WIDTH;
        if (ghost.x > GAME_WIDTH) ghost.x = 0;
    });
}

function dirScore(dir, dx, dy) {
    switch (dir) {
        case 'left':  return dx < 0 ? Math.abs(dx) : -Math.abs(dx);
        case 'right': return dx > 0 ? Math.abs(dx) : -Math.abs(dx);
        case 'up':    return dy < 0 ? Math.abs(dy) : -Math.abs(dy);
        case 'down':  return dy > 0 ? Math.abs(dy) : -Math.abs(dy);
        default: return 0;
    }
}

function eatDot(player, dot) {
    dot.destroy();
    score += SETTINGS.dotScore;
    scoreText.setText('SCORE: ' + score);
    totalDots--;
    checkWin(this);
}

function eatPowerDot(player, pdot) {
    pdot.destroy();
    score += SETTINGS.powerDotScore;
    scoreText.setText('SCORE: ' + score);
    totalDots--;

    // Scare the ghosts!
    ghostsScared = true;
    ghosts.forEach(g => {
        if (g.active) {
            g.isScared = true;
            g.fillColor = SETTINGS.ghostScaredColour;
        }
    });

    if (scaredTimer) clearTimeout(scaredTimer);
    scaredTimer = setTimeout(() => {
        ghostsScared = false;
        ghosts.forEach(g => {
            if (g.active) {
                g.isScared = false;
                g.fillColor = g.baseColour;
            }
        });
    }, SETTINGS.scaredDuration);

    checkWin(this);
}

function hitGhost(player, ghost) {
    if (ghost.isScared) {
        // Eat the ghost!
        score += SETTINGS.ghostScore;
        scoreText.setText('SCORE: ' + score);
        // Reset ghost to house
        ghost.x = 13 * SETTINGS.tileSize + SETTINGS.tileSize / 2;
        ghost.y = 10 * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;
        ghost.isScared = false;
        ghost.fillColor = ghost.baseColour;
    } else {
        // Lose a life
        lives--;
        livesText.setText('LIVES: ' + lives);

        if (lives <= 0) {
            gameOver = true;
            player.body.setVelocity(0, 0);
            ghosts.forEach(g => g.body.setVelocity(0, 0));
            gameOverText = player.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
                fontSize: '48px',
                fill: '#ff0000',
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            player.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press SPACE to restart', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'monospace'
            }).setOrigin(0.5);
            player.scene.input.keyboard.once('keydown-SPACE', () => {
                if (scaredTimer) clearTimeout(scaredTimer);
                player.scene.scene.restart();
                ghosts = [];
                score = 0;
                gameOver = false;
                direction = 'right';
                nextDirection = 'right';
            });
        } else {
            // Reset player position
            player.x = 14 * SETTINGS.tileSize + SETTINGS.tileSize / 2;
            player.y = 16 * SETTINGS.tileSize + SETTINGS.tileSize / 2 + Y_OFFSET;
            player.body.setVelocity(0, 0);
            direction = 'right';
            nextDirection = 'right';
        }
    }
}

function checkWin(scene) {
    if (totalDots <= 0) {
        gameOver = true;
        player.body.setVelocity(0, 0);
        ghosts.forEach(g => g.body.setVelocity(0, 0));
        const s = scene.scene || scene;
        winText = player.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'YOU WIN!', {
            fontSize: '48px',
            fill: '#00ff00',
            fontFamily: 'monospace',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        player.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press SPACE to restart', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
        player.scene.input.keyboard.once('keydown-SPACE', () => {
            if (scaredTimer) clearTimeout(scaredTimer);
            player.scene.scene.restart();
            ghosts = [];
            score = 0;
            gameOver = false;
            direction = 'right';
            nextDirection = 'right';
        });
    }
}
