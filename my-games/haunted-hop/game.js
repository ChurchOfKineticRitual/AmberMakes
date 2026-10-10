// ===== SETTINGS (change these!) =====
const SETTINGS = {
    // Player (a little ghost)
    playerSpeed: 260,
    jumpPower: -520,
    doubleJumpPower: -440,
    maxJumps: 2,            // 2 = double jump (ghosts can float!)
    playerSize: 30,
    playerColour: 0xeeeeff,
    eyeColour: 0x1a1a2e,
    lives: 3,
    hurtTime: 1500,         // how long you flash after getting hit (ms)

    // Physics
    gravity: 900,

    // World
    gameWidth: 800,
    gameHeight: 600,
    backgroundColour: '#140a1f',
    groundColour: 0x2b1d3a,
    platformColour: 0x4a3560,
    moonColour: 0xfff4c2,
    gravestoneColour: 0x5c5c70,

    // Candy
    candyColour: 0xff5ec4,
    candySize: 14,
    candyPoints: 10,

    // Pumpkins (walk back and forth)
    pumpkinColour: 0xff7a00,
    pumpkinSize: 28,
    pumpkinSpeed: 70,

    // Bats (fly back and forth, swooping)
    batColour: 0x9d5cff,
    batSize: 22,
    batSpeed: 110,
    batSwoop: 50,           // how far they dip up and down

    // Stomping (land on an enemy's head)
    stompPoints: 50,
    stompBounce: -380,

    // Haunted house (the goal)
    houseColour: 0x1f1430,
    windowColour: 0xffcc33,
    doorColour: 0x44ff88
};

// ===== LEVEL LAYOUT =====
// Build levels with level-editor.html. Gaps between ground pieces are pits!
const LEVEL = {
    width: 3200,
    ground: [
        { from: 0, to: 700 },
        { from: 800, to: 1400 },
        { from: 1520, to: 2100 },
        { from: 2240, to: 3200 }
    ],
    // Floating platforms (you can jump up through them)
    platforms: [
        { x: 350, y: 470, width: 140 },
        { x: 560, y: 370, width: 120 },
        { x: 1000, y: 460, width: 140 },
        { x: 1220, y: 350, width: 120 },
        { x: 1720, y: 460, width: 140 },
        { x: 1920, y: 360, width: 120 },
        { x: 2110, y: 250, width: 110 },
        { x: 2450, y: 460, width: 140 },
        { x: 2660, y: 360, width: 120 },
        { x: 2860, y: 270, width: 100 }
    ],
    candyRows: [
        { x: 318, y: 440, count: 3 },
        { x: 528, y: 340, count: 3 },
        { x: 968, y: 430, count: 3 },
        { x: 1188, y: 320, count: 3 },
        { x: 1688, y: 430, count: 3 },
        { x: 1888, y: 330, count: 3 },
        { x: 2094, y: 220, count: 2 },
        { x: 2418, y: 430, count: 3 },
        { x: 2628, y: 330, count: 3 },
        { x: 2844, y: 240, count: 2 },
        { x: 150, y: 540, count: 4 },
        { x: 690, y: 480, count: 4, arc: true },
        { x: 1100, y: 540, count: 3 },
        { x: 1400, y: 480, count: 4, arc: true },
        { x: 2110, y: 480, count: 5, arc: true },
        { x: 2550, y: 540, count: 4 }
    ],
    // Pumpkins walk between from and to (y = what they stand on, default ground)
    pumpkins: [
        { from: 450, to: 650 },
        { from: 900, to: 1350 },
        { from: 1600, to: 2050 },
        { from: 2300, to: 2750 },
        { from: 2400, to: 2500, y: 452 }
    ],
    bats: [
        { from: 500, to: 800, y: 280 },
        { from: 1150, to: 1450, y: 260 },
        { from: 1750, to: 2100, y: 300 },
        { from: 2500, to: 2850, y: 240 }
    ],
    gravestones: [300, 620, 1050, 1300, 1650, 2000, 2380, 2720],
    houseX: 3000
};

// ===== GAME CONFIG =====
const config = {
    type: Phaser.AUTO,
    parent: 'game',
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
const GROUND_TOP = SETTINGS.gameHeight - 32;

let player;
let eyes;
let platforms;
let candies;
let enemies;
let door;
let cursors;
let scoreText;
let livesText;
let score;
let lives;
let gameOver;
let jumpsUsed;
let facing;
let invincibleUntil;
let safeX;
let standingOn;

// ===== PRELOAD =====
function preload() {
    // No assets to load — coloured rectangles only!
}

// ===== CREATE =====
function create() {
    // Reset everything (this runs again on restart)
    score = 0;
    lives = SETTINGS.lives;
    gameOver = false;
    jumpsUsed = 0;
    facing = 1;
    invincibleUntil = 0;

    this.physics.world.setBounds(0, 0, LEVEL.width, SETTINGS.gameHeight, true, true, false, false);

    // --- Night sky ---
    for (let i = 0; i < 70; i++) {
        const size = Phaser.Math.Between(1, 3);
        this.add.rectangle(
            Phaser.Math.Between(0, SETTINGS.gameWidth + LEVEL.width * 0.2), Phaser.Math.Between(0, 380),
            size, size, 0xffffff
        ).setAlpha(Phaser.Math.FloatBetween(0.3, 0.9)).setScrollFactor(0.2);
    }
    this.add.circle(620, 110, 45, SETTINGS.moonColour).setScrollFactor(0.1);

    // --- Gravestones ---
    LEVEL.gravestones.forEach(x => {
        this.add.rectangle(x, GROUND_TOP - 18, 22, 36, SETTINGS.gravestoneColour);
    });

    // --- Haunted house ---
    const hx = LEVEL.houseX;
    this.add.triangle(hx, GROUND_TOP - 250, 0, 100, 150, 0, 300, 100, SETTINGS.houseColour);
    this.add.rectangle(hx, GROUND_TOP - 100, 260, 200, SETTINGS.houseColour);
    this.add.rectangle(hx - 70, GROUND_TOP - 140, 36, 36, SETTINGS.windowColour);
    this.add.rectangle(hx + 70, GROUND_TOP - 140, 36, 36, SETTINGS.windowColour);
    door = this.add.rectangle(hx, GROUND_TOP - 40, 50, 80, SETTINGS.doorColour);
    this.physics.add.existing(door, true);
    this.tweens.add({
        targets: door,
        alpha: 0.6,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // --- Ground and platforms (static group) ---
    platforms = this.physics.add.staticGroup();
    LEVEL.ground.forEach(g => {
        const piece = this.add.rectangle(
            (g.from + g.to) / 2, SETTINGS.gameHeight - 16,
            g.to - g.from, 32,
            SETTINGS.groundColour
        );
        platforms.add(piece);
        piece.body.updateFromGameObject();
    });
    LEVEL.platforms.forEach(p => {
        const plat = this.add.rectangle(p.x, p.y, p.width, 16, SETTINGS.platformColour);
        platforms.add(plat);
        plat.body.updateFromGameObject();
        plat.oneWay = true;
    });

    // --- Candy ---
    candies = this.physics.add.group();
    LEVEL.candyRows.forEach(r => addCandyRow(this, r.x, r.y, r.count, r.arc));

    // --- Enemies ---
    enemies = this.physics.add.group();
    LEVEL.pumpkins.forEach(p => {
        const surface = p.y || GROUND_TOP;
        addPatroller(this, p.from, p.to, surface - SETTINGS.pumpkinSize / 2,
            SETTINGS.pumpkinSize, SETTINGS.pumpkinColour, SETTINGS.pumpkinSpeed);
    });
    LEVEL.bats.forEach(b => {
        const bat = addPatroller(this, b.from, b.to, b.y,
            SETTINGS.batSize, SETTINGS.batColour, SETTINGS.batSpeed);
        this.tweens.add({
            targets: bat,
            y: b.y + SETTINGS.batSwoop,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    });

    // --- Player (a little ghost) ---
    player = this.add.rectangle(80, GROUND_TOP - 60, SETTINGS.playerSize, SETTINGS.playerSize, SETTINGS.playerColour);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setMaxVelocityY(800);
    safeX = player.x;
    standingOn = null;

    eyes = [
        this.add.rectangle(0, 0, 6, 8, SETTINGS.eyeColour),
        this.add.rectangle(0, 0, 6, 8, SETTINGS.eyeColour)
    ];
    placeEyes();

    // --- Camera follows the ghost ---
    this.cameras.main.setBounds(0, 0, LEVEL.width, SETTINGS.gameHeight);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // --- HUD ---
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(10);
    livesText = this.add.text(16, 40, '', {
        fontSize: '18px', fill: '#ff5e7a', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(10);
    updateLives();

    const hint = this.add.text(SETTINGS.gameWidth / 2, 90,
        'ARROWS to move   SPACE to jump\nJump again in the air to float higher!', {
            fontSize: '16px', fill: '#ffcc33', fontFamily: 'monospace', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 1000 });

    // --- Controls ---
    cursors = this.input.keyboard.createCursorKeys();

    // --- Collisions ---
    // Floating platforms are one-way: you only land on them from above
    this.physics.add.collider(player, platforms, function (p, plat) {
        if (p.body.touching.down) standingOn = plat; // remembered for pit respawns
    }, function (p, plat) {
        if (!plat.oneWay) return true;
        return p.body.velocity.y >= 0 && p.body.bottom <= plat.body.top + 16;
    }, this);
    this.physics.add.overlap(player, candies, collectCandy, null, this);
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, door, reachDoor, null, this);
}

// ===== UPDATE (runs every frame) =====
function update() {
    if (gameOver) return;

    const onGround = player.body.touching.down || player.body.blocked.down;
    if (onGround) {
        jumpsUsed = 0;
        safeX = player.x;
    }

    // Left / right
    if (cursors.left.isDown) {
        player.body.setVelocityX(-SETTINGS.playerSpeed);
        facing = -1;
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(SETTINGS.playerSpeed);
        facing = 1;
    } else {
        player.body.setVelocityX(0);
    }

    // Jump — press again in the air for a double jump
    const upPressed = Phaser.Input.Keyboard.JustDown(cursors.up);
    const spacePressed = Phaser.Input.Keyboard.JustDown(cursors.space);
    if (upPressed || spacePressed) {
        if (onGround) {
            player.body.setVelocityY(SETTINGS.jumpPower);
            jumpsUsed = 1;
        } else {
            if (jumpsUsed === 0) jumpsUsed = 1; // walked off a ledge
            if (jumpsUsed < SETTINGS.maxJumps) {
                player.body.setVelocityY(SETTINGS.doubleJumpPower);
                jumpsUsed++;
            }
        }
    }

    // Let go of jump early for a smaller hop
    const upReleased = Phaser.Input.Keyboard.JustUp(cursors.up);
    const spaceReleased = Phaser.Input.Keyboard.JustUp(cursors.space);
    if ((upReleased || spaceReleased) && player.body.velocity.y < 0) {
        player.body.setVelocityY(player.body.velocity.y * 0.5);
    }

    // Enemies turn around at the ends of their patrol
    enemies.getChildren().forEach(function (e) {
        if (!e.active) return;
        if (e.x <= e.patrolMin) e.body.setVelocityX(e.speed);
        if (e.x >= e.patrolMax) e.body.setVelocityX(-e.speed);
    });

    // Fell down a pit
    if (player.y > SETTINGS.gameHeight + 50) {
        fallInPit(this);
    }

    placeEyes();
}

// ===== HELPERS =====

function placeEyes() {
    // Read the body (not player.x) so the eyes don't lag a frame behind
    const cx = player.body.center.x + facing * 4;
    const cy = player.body.center.y - 4;
    eyes[0].setPosition(cx - 6, cy);
    eyes[1].setPosition(cx + 6, cy);
}

function addCandyRow(scene, x, y, count, arc) {
    for (let i = 0; i < count; i++) {
        const lift = (arc && count > 1) ? Math.sin(Math.PI * i / (count - 1)) * 40 : 0;
        const cy = y - lift;
        const candy = scene.add.rectangle(x + i * 32, cy, SETTINGS.candySize, SETTINGS.candySize, SETTINGS.candyColour);
        candies.add(candy);
        candy.body.setAllowGravity(false);

        scene.tweens.add({
            targets: candy,
            y: cy - 6,
            duration: 600,
            delay: i * 80,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}

function addPatroller(scene, minX, maxX, y, size, colour, speed) {
    const e = scene.add.rectangle(minX, y, size, size, colour);
    enemies.add(e);
    e.body.setAllowGravity(false);
    e.body.setImmovable(true);
    e.body.setVelocityX(speed);
    e.patrolMin = minX;
    e.patrolMax = maxX;
    e.speed = speed;
    return e;
}

function addScore(points) {
    score += points;
    scoreText.setText('Score: ' + score);
}

function updateLives() {
    livesText.setText('Lives: ' + '♥'.repeat(Math.max(lives, 0)));
}

function popText(scene, x, y, message) {
    const t = scene.add.text(x, y, message, {
        fontSize: '16px', fill: '#ffcc33', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(10);
    scene.tweens.add({
        targets: t,
        y: y - 40,
        alpha: 0,
        duration: 700,
        onComplete: () => t.destroy()
    });
}

function collectCandy(player, candy) {
    // A Rectangle in a physics group has a body, but it is not an Arcade
    // Sprite — disableBody() does not exist on it. Do it by hand.
    candy.body.enable = false;
    candy.setActive(false);
    this.tweens.killTweensOf(candy);
    this.tweens.add({
        targets: candy,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 200,
        onComplete: () => candy.destroy()
    });
    addScore(SETTINGS.candyPoints);
}

function hitEnemy(player, enemy) {
    if (gameOver || !enemy.active) return;

    // Landing on its head squashes it
    if (player.body.velocity.y > 0 && player.body.bottom <= enemy.body.top + 12) {
        squashEnemy(this, enemy);
        return;
    }

    if (this.time.now < invincibleUntil) return;
    loseLife(this);
    if (!gameOver) player.body.setVelocityY(-250);
}

function squashEnemy(scene, enemy) {
    enemy.body.enable = false;
    enemy.setActive(false);
    scene.tweens.killTweensOf(enemy);
    scene.tweens.add({
        targets: enemy,
        scaleY: 0.2,
        alpha: 0,
        duration: 250,
        onComplete: () => enemy.destroy()
    });
    player.body.setVelocityY(SETTINGS.stompBounce);
    jumpsUsed = 1;
    addScore(SETTINGS.stompPoints);
    popText(scene, enemy.x, enemy.y - 20, '+' + SETTINGS.stompPoints);
}

function fallInPit(scene) {
    loseLife(scene);
    if (gameOver) return;
    // Back on whatever you last stood on, a little way in from the edge
    if (standingOn) {
        const b = standingOn.body;
        player.body.reset(Phaser.Math.Clamp(safeX, b.left + 30, b.right - 30), b.top - 40);
    } else {
        player.body.reset(80, GROUND_TOP - 60);
    }
}

function loseLife(scene) {
    lives--;
    updateLives();
    scene.cameras.main.shake(200, 0.01);

    if (lives <= 0) {
        player.fillColor = 0xff3344;
        endGame(scene, 'GAME OVER', '#ff5e7a');
        return;
    }

    // Flash for a bit — enemies can't hurt you while you flash
    invincibleUntil = scene.time.now + SETTINGS.hurtTime;
    scene.tweens.add({
        targets: [player, eyes[0], eyes[1]],
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: Math.floor(SETTINGS.hurtTime / 200) - 1,
        onComplete: () => {
            player.setAlpha(1);
            eyes.forEach(e => e.setAlpha(1));
        }
    });
}

function reachDoor() {
    if (gameOver) return;
    endGame(this, 'YOU ESCAPED!', '#44ff88');
}

function endGame(scene, message, colour) {
    gameOver = true;
    scene.physics.pause();

    scene.add.rectangle(SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2, 500, 200, 0x000000, 0.75)
        .setScrollFactor(0).setDepth(19);
    scene.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2,
        message + '\nScore: ' + score + '\n\nPress SPACE to play again',
        { fontSize: '28px', fill: colour, fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    // Short pause so a held jump key doesn't restart straight away
    scene.time.delayedCall(500, () => {
        scene.input.keyboard.once('keydown-SPACE', () => scene.scene.restart());
    });
}
