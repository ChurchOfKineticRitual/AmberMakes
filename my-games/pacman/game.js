// ===== SETTINGS (change these!) =====
const SETTINGS = {
    // Grid
    tileSize: 28,
    cols: 28,
    rows: 21,

    // Player
    playerSpeed: 3,    // pixels per frame
    playerColour: 0xffff00,

    // Ghosts
    ghostSpeed: 2,     // pixels per frame
    ghostColours: [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852],
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

const T = SETTINGS.tileSize;
const GAME_WIDTH = SETTINGS.cols * T;
const GAME_HEIGHT = (SETTINGS.rows + 2) * T;
const Y_OFFSET = T * 2;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: SETTINGS.backgroundColour,
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, cursors, scoreText, livesText;
let dotGraphics = [];
let ghosts = [];
let score = 0;
let lives;
let direction = null;      // not moving until first key press
let nextDirection = null;
let gameOver = false;
let ghostsScared = false;
let scaredTimer = null;
let totalDots = 0;

// Convert tile to pixel center
function tileToX(col) { return col * T + T / 2; }
function tileToY(row) { return row * T + T / 2 + Y_OFFSET; }

// Convert pixel to nearest tile
function xToTile(x) { return Math.round((x - T / 2) / T); }
function yToTile(y) { return Math.round((y - T / 2 - Y_OFFSET) / T); }

// Check if a tile is walkable
function isWalkable(col, row) {
    if (col < 0 || col >= SETTINGS.cols) return true; // tunnel
    if (row < 0 || row >= SETTINGS.rows) return false;
    return MAP[row][col] !== 1;
}

// Get next tile in a direction
function nextTile(col, row, dir) {
    switch (dir) {
        case 'left':  return { col: col - 1, row };
        case 'right': return { col: col + 1, row };
        case 'up':    return { col, row: row - 1 };
        case 'down':  return { col, row: row + 1 };
    }
}

function preload() {}

function create() {
    lives = SETTINGS.lives;

    // Draw walls and dots
    for (let row = 0; row < SETTINGS.rows; row++) {
        for (let col = 0; col < SETTINGS.cols; col++) {
            const x = tileToX(col);
            const y = tileToY(row);
            const tile = MAP[row][col];

            if (tile === 1) {
                this.add.rectangle(x, y, T, T, SETTINGS.wallColour);
            } else if (tile === 0) {
                const dot = this.add.circle(x, y, 3, SETTINGS.dotColour);
                dot.tileCol = col;
                dot.tileRow = row;
                dotGraphics.push(dot);
                totalDots++;
            } else if (tile === 3) {
                const pdot = this.add.circle(x, y, 7, SETTINGS.powerDotColour);
                pdot.tileCol = col;
                pdot.tileRow = row;
                pdot.isPower = true;
                dotGraphics.push(pdot);
                totalDots++;
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

    // Player
    player = this.add.circle(tileToX(14), tileToY(16), T / 2 - 2, SETTINGS.playerColour);

    // Ghosts
    const ghostStarts = [
        { col: 13, row: 9 },
        { col: 13, row: 10 },
        { col: 14, row: 10 },
        { col: 14, row: 9 },
    ];
    for (let i = 0; i < 4; i++) {
        const ghost = this.add.rectangle(
            tileToX(ghostStarts[i].col), tileToY(ghostStarts[i].row),
            T - 4, T - 4, SETTINGS.ghostColours[i]
        );
        ghost.baseColour = SETTINGS.ghostColours[i];
        ghost.direction = ['left', 'right', 'up', 'down'][i];
        ghost.isScared = false;
        ghosts.push(ghost);
    }

    // Controls
    cursors = this.input.keyboard.createCursorKeys();

    // HUD
    scoreText = this.add.text(16, 10, 'SCORE: 0', {
        fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
    });
    livesText = this.add.text(GAME_WIDTH - 16, 10, 'LIVES: ' + lives, {
        fontSize: '18px', fill: '#ffff00', fontFamily: 'monospace'
    }).setOrigin(1, 0);
}

function update() {
    if (gameOver) return;

    // Read input
    if (cursors.left.isDown) nextDirection = 'left';
    else if (cursors.right.isDown) nextDirection = 'right';
    else if (cursors.up.isDown) nextDirection = 'up';
    else if (cursors.down.isDown) nextDirection = 'down';

    // Move player
    moveEntity(player, SETTINGS.playerSpeed, true);

    // Move ghosts
    ghosts.forEach(ghost => {
        if (!ghost.active) return;
        moveGhost(ghost);
    });

    // Check dot eating
    checkDots();

    // Check ghost collisions
    checkGhostCollision.call(this);
}

function moveEntity(entity, speed, isPlayer) {
    const col = xToTile(entity.x);
    const row = yToTile(entity.y);
    const cx = tileToX(col);
    const cy = tileToY(row);

    const dir = isPlayer ? direction : entity.direction;
    const queued = isPlayer ? nextDirection : null;

    // At tile center — decide direction
    const atCenter = Math.abs(entity.x - cx) < speed + 1 && Math.abs(entity.y - cy) < speed + 1;

    if (atCenter) {
        // Snap to center
        entity.x = cx;
        entity.y = cy;

        // Try queued direction first (player only)
        if (isPlayer && queued) {
            const nt = nextTile(col, row, queued);
            if (isWalkable(nt.col, nt.row)) {
                direction = queued;
            }
        }

        // Check if current direction is blocked
        const currentDir = isPlayer ? direction : entity.direction;
        if (currentDir) {
            const nt = nextTile(col, row, currentDir);
            if (!isWalkable(nt.col, nt.row)) {
                // Blocked — stop
                return;
            }
        } else {
            return; // no direction set yet
        }
    }

    // Move in current direction
    const currentDir = isPlayer ? direction : entity.direction;
    if (!currentDir) return;

    switch (currentDir) {
        case 'left':  entity.x -= speed; break;
        case 'right': entity.x += speed; break;
        case 'up':    entity.y -= speed; break;
        case 'down':  entity.y += speed; break;
    }

    // Tunnel wrap
    if (entity.x < -T / 2) entity.x = GAME_WIDTH + T / 2;
    if (entity.x > GAME_WIDTH + T / 2) entity.x = -T / 2;
}

function moveGhost(ghost) {
    const col = xToTile(ghost.x);
    const row = yToTile(ghost.y);
    const cx = tileToX(col);
    const cy = tileToY(row);
    const speed = ghost.isScared ? SETTINGS.ghostSpeed * 0.5 : SETTINGS.ghostSpeed;

    const atCenter = Math.abs(ghost.x - cx) < speed + 1 && Math.abs(ghost.y - cy) < speed + 1;

    if (atCenter) {
        ghost.x = cx;
        ghost.y = cy;

        // Pick direction at intersections
        const dirs = ['left', 'right', 'up', 'down'];
        const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
        const available = dirs.filter(d => {
            if (d === opposite[ghost.direction]) return false;
            const nt = nextTile(col, row, d);
            return isWalkable(nt.col, nt.row);
        });

        if (available.length === 0) {
            ghost.direction = opposite[ghost.direction];
        } else if (ghost.isScared) {
            ghost.direction = available[Math.floor(Math.random() * available.length)];
        } else {
            // Chase player
            const pcol = xToTile(player.x);
            const prow = yToTile(player.y);
            const dx = pcol - col;
            const dy = prow - row;

            available.sort((a, b) => dirScore(b, dx, dy) - dirScore(a, dx, dy));
            ghost.direction = Math.random() < 0.7 ? available[0] : available[Math.floor(Math.random() * available.length)];
        }

        // Check if new direction is walkable
        const nt = nextTile(col, row, ghost.direction);
        if (!isWalkable(nt.col, nt.row)) return;
    }

    // Move
    switch (ghost.direction) {
        case 'left':  ghost.x -= speed; break;
        case 'right': ghost.x += speed; break;
        case 'up':    ghost.y -= speed; break;
        case 'down':  ghost.y += speed; break;
    }

    // Tunnel wrap
    if (ghost.x < -T / 2) ghost.x = GAME_WIDTH + T / 2;
    if (ghost.x > GAME_WIDTH + T / 2) ghost.x = -T / 2;
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

function checkDots() {
    const col = xToTile(player.x);
    const row = yToTile(player.y);

    for (let i = dotGraphics.length - 1; i >= 0; i--) {
        const dot = dotGraphics[i];
        if (dot.tileCol === col && dot.tileRow === row) {
            if (dot.isPower) {
                score += SETTINGS.powerDotScore;
                activateScaredMode();
            } else {
                score += SETTINGS.dotScore;
            }
            dot.destroy();
            dotGraphics.splice(i, 1);
            totalDots--;
            scoreText.setText('SCORE: ' + score);

            if (totalDots <= 0) winGame();
        }
    }
}

function activateScaredMode() {
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
}

function checkGhostCollision() {
    const px = player.x, py = player.y;
    const hitDist = T * 0.7;

    for (const ghost of ghosts) {
        if (!ghost.active) continue;
        const dist = Math.abs(px - ghost.x) + Math.abs(py - ghost.y);
        if (dist < hitDist) {
            if (ghost.isScared) {
                // Eat ghost
                score += SETTINGS.ghostScore;
                scoreText.setText('SCORE: ' + score);
                ghost.x = tileToX(13);
                ghost.y = tileToY(10);
                ghost.isScared = false;
                ghost.fillColor = ghost.baseColour;
            } else {
                loseLife.call(this);
                return;
            }
        }
    }
}

function loseLife() {
    lives--;
    livesText.setText('LIVES: ' + lives);

    if (lives <= 0) {
        gameOver = true;
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
            fontSize: '48px', fill: '#ff0000', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press SPACE to restart', {
            fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.input.keyboard.once('keydown-SPACE', () => {
            if (scaredTimer) clearTimeout(scaredTimer);
            ghosts = [];
            dotGraphics = [];
            score = 0;
            gameOver = false;
            direction = null;
            nextDirection = null;
            totalDots = 0;
            this.scene.restart();
        });
    } else {
        // Reset positions
        player.x = tileToX(14);
        player.y = tileToY(16);
        direction = null;
        nextDirection = null;
        ghosts[0].x = tileToX(13); ghosts[0].y = tileToY(9);
        ghosts[1].x = tileToX(13); ghosts[1].y = tileToY(10);
        ghosts[2].x = tileToX(14); ghosts[2].y = tileToY(10);
        ghosts[3].x = tileToX(14); ghosts[3].y = tileToY(9);
    }
}

function winGame() {
    gameOver = true;
    const scene = game.scene.scenes[0];
    scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'YOU WIN!', {
        fontSize: '48px', fill: '#00ff00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press SPACE to restart', {
        fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);
    scene.input.keyboard.once('keydown-SPACE', () => {
        if (scaredTimer) clearTimeout(scaredTimer);
        ghosts = [];
        dotGraphics = [];
        score = 0;
        gameOver = false;
        direction = null;
        nextDirection = null;
        totalDots = 0;
        scene.scene.restart();
    });
}
