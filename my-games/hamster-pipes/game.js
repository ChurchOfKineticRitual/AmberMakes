// ===== SETTINGS (change these!) =====
const SETTINGS = {
    gameWidth: 800,
    gameHeight: 600,
    backgroundColor: '#1a1a2e',

    // Character designer
    coats: [
        { name: 'Golden', color: 0xd4a44c },
        { name: 'White', color: 0xf0e6d3 },
        { name: 'Brown', color: 0x8b5e3c },
        { name: 'Grey', color: 0x9e9e9e },
        { name: 'Cream', color: 0xf5deb3 },
        { name: 'Black', color: 0x3a3a3a },
    ],
    patterns: ['solid', 'spotted', 'striped'],

    // Level 1 — pipe runner
    runSpeed: 3,
    scrollSpeed: 200,
    jumpPower: -360,
    gravity: 800,
    pipeColor: 0x6b6b6b,
    pipeHighlight: 0x8a8a8a,
    pipeDark: 0x4a4a4a,
    seedColor: 0xc8a84e,
    waterColor: 0x4488cc,
    steamColor: 0xcccccc,
    jointColor: 0x555555,
    spawnInterval: 1800,
    seedInterval: 800,
    pipeGap: 120,
};

// ===== HAMSTER (your character) =====
const HAMSTER = {
    name: 'Hammy',
    coat: SETTINGS.coats[0].color,
    coatIndex: 0,
    pattern: 'solid',
    patternIndex: 0,
};

// ===== GAME STATE =====
let gameState = 'designer';
let score = 0;
let designerObjects = [];
let levelObjects = [];
let cursors;
let player;
let obstacles;
let seeds;
let pipeWalls = [];
let spawnTimer = 0;
let seedTimer = 0;
let distanceTravelled = 0;
let levelCompleteShown = false;
let nameText;
let nameString = 'Hammy';
let nameActive = false;
let hamsterPreviewParts = [];
let scene;

// ===== PHASER CONFIG =====
const config = {
    type: Phaser.AUTO,
    width: SETTINGS.gameWidth,
    height: SETTINGS.gameHeight,
    backgroundColor: SETTINGS.backgroundColor,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: { preload, create, update },
};

const game = new Phaser.Game(config);

// ===== DRAW HAMSTER =====
function drawHamster(sc, x, y, scale, parts) {
    // Clear old parts
    parts.forEach(p => p.destroy());
    parts.length = 0;

    const s = scale;
    const coat = HAMSTER.coat;
    const darkerCoat = Phaser.Display.Color.ValueToColor(coat).darken(25).color;
    const lighterCoat = Phaser.Display.Color.ValueToColor(coat).lighten(20).color;

    // Body (main oval — use a wider rectangle)
    const body = sc.add.ellipse(x, y, 40 * s, 30 * s, coat);
    parts.push(body);

    // Pattern
    if (HAMSTER.pattern === 'spotted') {
        const spot1 = sc.add.circle(x - 8 * s, y - 4 * s, 4 * s, lighterCoat);
        const spot2 = sc.add.circle(x + 6 * s, y + 2 * s, 3 * s, lighterCoat);
        const spot3 = sc.add.circle(x + 2 * s, y - 6 * s, 3.5 * s, lighterCoat);
        parts.push(spot1, spot2, spot3);
    } else if (HAMSTER.pattern === 'striped') {
        const stripe = sc.add.rectangle(x, y - 2 * s, 30 * s, 5 * s, darkerCoat);
        parts.push(stripe);
    }

    // Head
    const head = sc.add.circle(x + 18 * s, y - 2 * s, 12 * s, coat);
    parts.push(head);

    // Ears
    const ear1 = sc.add.circle(x + 14 * s, y - 14 * s, 5 * s, darkerCoat);
    const ear2 = sc.add.circle(x + 24 * s, y - 14 * s, 5 * s, darkerCoat);
    const earInner1 = sc.add.circle(x + 14 * s, y - 14 * s, 3 * s, 0xffaaaa);
    const earInner2 = sc.add.circle(x + 24 * s, y - 14 * s, 3 * s, 0xffaaaa);
    parts.push(ear1, ear2, earInner1, earInner2);

    // Eyes
    const eye1 = sc.add.circle(x + 16 * s, y - 4 * s, 2.5 * s, 0x111111);
    const eye2 = sc.add.circle(x + 23 * s, y - 4 * s, 2.5 * s, 0x111111);
    // Eye shine
    const shine1 = sc.add.circle(x + 17 * s, y - 5 * s, 1 * s, 0xffffff);
    const shine2 = sc.add.circle(x + 24 * s, y - 5 * s, 1 * s, 0xffffff);
    parts.push(eye1, eye2, shine1, shine2);

    // Nose
    const nose = sc.add.circle(x + 27 * s, y, 2 * s, 0xff8888);
    parts.push(nose);

    // Cheeks (puffy hamster cheeks!)
    const cheek1 = sc.add.circle(x + 13 * s, y + 3 * s, 5 * s, lighterCoat).setAlpha(0.6);
    const cheek2 = sc.add.circle(x + 25 * s, y + 3 * s, 5 * s, lighterCoat).setAlpha(0.6);
    parts.push(cheek1, cheek2);

    // Feet
    const foot1 = sc.add.ellipse(x - 10 * s, y + 14 * s, 8 * s, 5 * s, darkerCoat);
    const foot2 = sc.add.ellipse(x + 8 * s, y + 14 * s, 8 * s, 5 * s, darkerCoat);
    parts.push(foot1, foot2);

    // Tail
    const tail = sc.add.ellipse(x - 22 * s, y + 2 * s, 10 * s, 4 * s, darkerCoat);
    tail.setAngle(-20);
    parts.push(tail);

    return parts;
}

// ===== SCENE FUNCTIONS =====
function preload() {
    // No assets yet — all colored shapes
}

function create() {
    scene = this;
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown', handleKeyDown);
    showDesigner(this);
}

function update() {
    if (gameState === 'level1') {
        updateLevel1(this);
    }
}

// ===== CHARACTER DESIGNER =====
function showDesigner(sc) {
    gameState = 'designer';
    clearObjects(designerObjects);
    clearObjects(levelObjects);

    // Disable gravity for designer
    sc.physics.world.gravity.y = 0;

    // Title
    const title = sc.add.text(400, 30, 'CREATE YOUR HAMSTER', {
        fontSize: '28px', fill: '#ffffff', fontFamily: 'Arial',
        fontStyle: 'bold',
    }).setOrigin(0.5);
    designerObjects.push(title);

    // --- Hamster preview ---
    hamsterPreviewParts = [];
    drawHamster(sc, 400, 200, 3, hamsterPreviewParts);
    hamsterPreviewParts.forEach(p => designerObjects.push(p));

    // --- Name input ---
    const nameLabel = sc.add.text(400, 295, 'NAME:', {
        fontSize: '16px', fill: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);
    designerObjects.push(nameLabel);

    const nameBox = sc.add.rectangle(400, 325, 200, 36, 0x222244).setStrokeStyle(2, 0x4444aa);
    designerObjects.push(nameBox);

    nameText = sc.add.text(400, 325, nameString, {
        fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5);
    designerObjects.push(nameText);

    // Click name box to activate
    nameBox.setInteractive();
    nameBox.on('pointerdown', () => {
        nameActive = true;
        nameBox.setStrokeStyle(2, 0x8888ff);
    });

    // Blinking cursor
    const cursorBlink = sc.add.rectangle(0, 325, 2, 20, 0xffffff);
    cursorBlink.setVisible(false);
    designerObjects.push(cursorBlink);
    sc.time.addEvent({
        delay: 500, loop: true,
        callback: () => {
            if (nameActive) {
                cursorBlink.setVisible(!cursorBlink.visible);
                cursorBlink.x = nameText.x + nameText.width / 2 + 4;
            } else {
                cursorBlink.setVisible(false);
            }
        },
    });

    // Click elsewhere to deactivate name
    sc.input.on('pointerdown', (pointer) => {
        const bounds = nameBox.getBounds();
        if (!bounds.contains(pointer.x, pointer.y)) {
            nameActive = false;
            nameBox.setStrokeStyle(2, 0x4444aa);
        }
    });

    // --- Coat color picker ---
    const coatLabel = sc.add.text(400, 370, 'COAT', {
        fontSize: '16px', fill: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);
    designerObjects.push(coatLabel);

    const coatStartX = 400 - (SETTINGS.coats.length * 50) / 2 + 25;
    SETTINGS.coats.forEach((c, i) => {
        const swatch = sc.add.circle(coatStartX + i * 50, 405, 18, c.color);
        swatch.setStrokeStyle(3, HAMSTER.coatIndex === i ? 0xffffff : 0x333333);
        swatch.setInteractive();
        swatch.on('pointerdown', () => {
            HAMSTER.coat = c.color;
            HAMSTER.coatIndex = i;
            refreshDesigner(sc);
        });
        designerObjects.push(swatch);

        const label = sc.add.text(coatStartX + i * 50, 430, c.name, {
            fontSize: '10px', fill: '#888888', fontFamily: 'Arial',
        }).setOrigin(0.5);
        designerObjects.push(label);
    });

    // --- Pattern picker ---
    const patLabel = sc.add.text(400, 460, 'PATTERN', {
        fontSize: '16px', fill: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);
    designerObjects.push(patLabel);

    const patStartX = 400 - (SETTINGS.patterns.length * 100) / 2 + 50;
    SETTINGS.patterns.forEach((p, i) => {
        const btn = sc.add.rectangle(patStartX + i * 100, 495, 80, 32, 0x222244);
        btn.setStrokeStyle(2, HAMSTER.patternIndex === i ? 0xffffff : 0x444444);
        btn.setInteractive();

        const txt = sc.add.text(patStartX + i * 100, 495, p.toUpperCase(), {
            fontSize: '14px', fill: '#cccccc', fontFamily: 'Arial',
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            HAMSTER.pattern = p;
            HAMSTER.patternIndex = i;
            refreshDesigner(sc);
        });

        designerObjects.push(btn, txt);
    });

    // --- GO button ---
    const goBtn = sc.add.rectangle(400, 555, 140, 44, 0x22aa44).setStrokeStyle(2, 0x44cc66);
    goBtn.setInteractive();
    const goText = sc.add.text(400, 555, 'GO!', {
        fontSize: '24px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    goBtn.on('pointerover', () => goBtn.setFillStyle(0x33bb55));
    goBtn.on('pointerout', () => goBtn.setFillStyle(0x22aa44));
    goBtn.on('pointerdown', () => {
        HAMSTER.name = nameString || 'Hammy';
        startLevel1(sc);
    });

    designerObjects.push(goBtn, goText);
}

function refreshDesigner(sc) {
    // Rebuild the whole designer to update selections
    clearObjects(designerObjects);
    hamsterPreviewParts = [];
    showDesigner(sc);
}

function handleKeyDown(event) {
    if (gameState === 'designer' && nameActive) {
        if (event.key === 'Backspace') {
            nameString = nameString.slice(0, -1);
            nameText.setText(nameString);
        } else if (event.key === 'Enter') {
            nameActive = false;
        } else if (event.key.length === 1 && nameString.length < 12) {
            nameString += event.key;
            nameText.setText(nameString);
        }
        event.stopPropagation();
    }

    // Restart from level complete or game over
    if ((gameState === 'levelComplete' || gameState === 'gameOver') && event.key === ' ') {
        if (gameState === 'levelComplete') {
            // For now, go back to designer (level 2 coming later)
            showDesigner(scene);
        } else {
            startLevel1(scene);
        }
    }
}

// ===== LEVEL 1: SIDE-SCROLLING PIPE RUNNER =====
function startLevel1(sc) {
    gameState = 'level1';
    score = 0;
    distanceTravelled = 0;
    spawnTimer = 0;
    seedTimer = 0;
    levelCompleteShown = false;

    clearObjects(designerObjects);
    clearObjects(levelObjects);

    // Enable gravity for platforming
    sc.physics.world.gravity.y = SETTINGS.gravity;

    // --- Pipe walls (top and bottom) ---
    const topPipe = sc.add.rectangle(400, 40, 800, 80, SETTINGS.pipeColor);
    sc.physics.add.existing(topPipe, true);
    levelObjects.push(topPipe);

    const topHighlight = sc.add.rectangle(400, 78, 800, 6, SETTINGS.pipeHighlight);
    levelObjects.push(topHighlight);

    const bottomPipe = sc.add.rectangle(400, 560, 800, 80, SETTINGS.pipeColor);
    sc.physics.add.existing(bottomPipe, true);
    levelObjects.push(bottomPipe);

    const bottomHighlight = sc.add.rectangle(400, 522, 800, 6, SETTINGS.pipeHighlight);
    levelObjects.push(bottomHighlight);

    // Pipe rivets (decorative)
    for (let rx = 50; rx < 800; rx += 100) {
        const r1 = sc.add.circle(rx, 20, 4, SETTINGS.pipeDark);
        const r2 = sc.add.circle(rx, 580, 4, SETTINGS.pipeDark);
        levelObjects.push(r1, r2);
    }

    // --- Background pipe details ---
    for (let bx = 0; bx < 800; bx += 200) {
        const joint = sc.add.rectangle(bx, 300, 12, SETTINGS.pipeGap + 80, SETTINGS.jointColor).setAlpha(0.2);
        levelObjects.push(joint);
    }

    // --- Player hamster ---
    // Create a physics body for the hamster
    player = sc.add.rectangle(120, 300, 30, 24, HAMSTER.coat);
    sc.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setBounce(0.1);
    levelObjects.push(player);

    // Hamster face on the player rect
    const pEye = sc.add.circle(130, 294, 2, 0x111111);
    const pNose = sc.add.circle(136, 300, 1.5, 0xff8888);
    const pEar = sc.add.circle(118, 288, 4, Phaser.Display.Color.ValueToColor(HAMSTER.coat).darken(25).color);
    levelObjects.push(pEye, pNose, pEar);
    player.faceParts = [pEye, pNose, pEar];

    // Pattern on player
    if (HAMSTER.pattern === 'spotted') {
        const ps1 = sc.add.circle(112, 298, 3, Phaser.Display.Color.ValueToColor(HAMSTER.coat).lighten(20).color);
        levelObjects.push(ps1);
        player.faceParts.push(ps1);
    } else if (HAMSTER.pattern === 'striped') {
        const pst = sc.add.rectangle(120, 296, 20, 3, Phaser.Display.Color.ValueToColor(HAMSTER.coat).darken(25).color);
        levelObjects.push(pst);
        player.faceParts.push(pst);
    }

    // Collisions with pipe walls
    sc.physics.add.collider(player, topPipe);
    sc.physics.add.collider(player, bottomPipe);

    // --- Obstacles group ---
    obstacles = sc.physics.add.group();
    levelObjects.push(obstacles);

    // --- Seeds group ---
    seeds = sc.physics.add.group();
    levelObjects.push(seeds);

    // Seed collection
    sc.physics.add.overlap(player, seeds, collectSeed, null, sc);

    // Obstacle hit
    sc.physics.add.overlap(player, obstacles, hitObstacle, null, sc);

    // --- HUD ---
    const nameHud = sc.add.text(16, 8, HAMSTER.name, {
        fontSize: '16px', fill: '#ffcc00', fontFamily: 'Arial', fontStyle: 'bold',
    });
    levelObjects.push(nameHud);

    player.scoreText = sc.add.text(784, 8, 'Seeds: 0', {
        fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(1, 0);
    levelObjects.push(player.scoreText);

    player.distText = sc.add.text(400, 8, '0m', {
        fontSize: '16px', fill: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    levelObjects.push(player.distText);
}

function updateLevel1(sc) {
    if (levelCompleteShown) return;

    // --- Player controls ---
    if (cursors.up.isDown || cursors.space.isDown) {
        player.body.setVelocityY(SETTINGS.jumpPower);
    }
    if (cursors.down.isDown) {
        player.body.setVelocityY(200);
    }

    // Update face parts to follow player
    if (player.faceParts) {
        const dx = player.x - 120;
        const dy = player.y - 300;
        // Reposition face relative to player body
        player.faceParts[0].setPosition(player.x + 10, player.y - 6); // eye
        player.faceParts[1].setPosition(player.x + 16, player.y);     // nose
        player.faceParts[2].setPosition(player.x - 2, player.y - 12); // ear
        if (player.faceParts[3]) {
            // pattern element
            if (HAMSTER.pattern === 'spotted') {
                player.faceParts[3].setPosition(player.x - 8, player.y - 2);
            } else if (HAMSTER.pattern === 'striped') {
                player.faceParts[3].setPosition(player.x, player.y - 4);
            }
        }
    }

    // --- Distance tracking ---
    distanceTravelled += SETTINGS.scrollSpeed * sc.game.loop.delta / 1000;
    player.distText.setText(Math.floor(distanceTravelled / 10) + 'm');

    // --- Level complete at 500m ---
    if (distanceTravelled / 10 >= 500) {
        showLevelComplete(sc);
        return;
    }

    // --- Spawn obstacles ---
    spawnTimer += sc.game.loop.delta;
    if (spawnTimer > SETTINGS.spawnInterval) {
        spawnTimer = 0;
        spawnObstacle(sc);
    }

    // --- Spawn seeds ---
    seedTimer += sc.game.loop.delta;
    if (seedTimer > SETTINGS.seedInterval) {
        seedTimer = 0;
        spawnSeed(sc);
    }

    // --- Move obstacles and seeds left ---
    obstacles.getChildren().forEach(ob => {
        ob.x -= SETTINGS.scrollSpeed * sc.game.loop.delta / 1000;
        if (ob.x < -50) ob.destroy();
    });

    seeds.getChildren().forEach(s => {
        s.x -= SETTINGS.scrollSpeed * sc.game.loop.delta / 1000;
        if (s.x < -50) s.destroy();
    });
}

function spawnObstacle(sc) {
    const types = ['water', 'joint', 'steam'];
    const type = types[Math.floor(Math.random() * types.length)];
    const yMin = 100;
    const yMax = 500;

    let ob;
    if (type === 'water') {
        // Water drip from top
        const y = 90;
        ob = sc.add.rectangle(820, y, 8, 30, SETTINGS.waterColor);
        sc.physics.add.existing(ob);
        ob.body.setVelocityY(150);
        ob.body.setAllowGravity(false);
        obstacles.add(ob);
    } else if (type === 'joint') {
        // Pipe joint on floor — jump over it
        ob = sc.add.rectangle(820, 505, 40, 30, SETTINGS.jointColor);
        sc.physics.add.existing(ob);
        ob.body.setAllowGravity(false);
        ob.body.setImmovable(true);
        obstacles.add(ob);
    } else if (type === 'steam') {
        // Steam vent — a wider area in the middle
        const y = 150 + Math.random() * 300;
        ob = sc.add.rectangle(820, y, 20, 50, SETTINGS.steamColor).setAlpha(0.5);
        sc.physics.add.existing(ob);
        ob.body.setAllowGravity(false);
        obstacles.add(ob);

        // Animate steam puff
        sc.tweens.add({
            targets: ob,
            alpha: 0.2,
            scaleX: 1.5,
            duration: 600,
            yoyo: true,
            repeat: -1,
        });
    }
}

function spawnSeed(sc) {
    const y = 120 + Math.random() * 380;
    const seed = sc.add.circle(820, y, 6, SETTINGS.seedColor);
    sc.physics.add.existing(seed);
    seed.body.setAllowGravity(false);
    seeds.add(seed);

    // Little shine
    const shine = sc.add.circle(820 + 2, y - 2, 2, 0xffeeaa);
    levelObjects.push(shine);
    sc.tweens.add({
        targets: shine,
        x: '-=' + SETTINGS.scrollSpeed * 5,
        duration: 5000,
        onComplete: () => shine.destroy(),
    });
}

function collectSeed(playerObj, seed) {
    seed.destroy();
    score++;
    player.scoreText.setText('Seeds: ' + score);

    // Little pop effect
    const pop = scene.add.circle(seed.x, seed.y, 10, SETTINGS.seedColor).setAlpha(0.5);
    levelObjects.push(pop);
    scene.tweens.add({
        targets: pop,
        scaleX: 2, scaleY: 2, alpha: 0,
        duration: 300,
        onComplete: () => pop.destroy(),
    });
}

function hitObstacle(playerObj, obstacle) {
    if (player.invincible) return;

    // Flash the player and lose some score
    player.invincible = true;
    score = Math.max(0, score - 3);
    player.scoreText.setText('Seeds: ' + score);

    // Red flash
    player.setFillStyle(0xff0000);
    scene.time.delayedCall(100, () => {
        player.setFillStyle(HAMSTER.coat);
        scene.time.delayedCall(100, () => {
            player.setFillStyle(0xff0000);
            scene.time.delayedCall(100, () => {
                player.setFillStyle(HAMSTER.coat);
                player.invincible = false;
            });
        });
    });

    obstacle.destroy();
}

function showLevelComplete(sc) {
    levelCompleteShown = true;

    // Darken
    const overlay = sc.add.rectangle(400, 300, 800, 600, 0x000000).setAlpha(0.6);
    levelObjects.push(overlay);

    const completeText = sc.add.text(400, 200, 'PIPE CLEARED!', {
        fontSize: '36px', fill: '#44ff88', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    levelObjects.push(completeText);

    const nameDisp = sc.add.text(400, 260, HAMSTER.name + ' collected ' + score + ' seeds!', {
        fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5);
    levelObjects.push(nameDisp);

    const distDisp = sc.add.text(400, 300, 'Distance: ' + Math.floor(distanceTravelled / 10) + 'm', {
        fontSize: '18px', fill: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);
    levelObjects.push(distDisp);

    const restart = sc.add.text(400, 380, 'Press SPACE to continue', {
        fontSize: '16px', fill: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5);
    levelObjects.push(restart);

    // Pulse the continue text
    sc.tweens.add({
        targets: restart,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
    });
}

// ===== UTILITIES =====
function clearObjects(arr) {
    arr.forEach(obj => {
        if (obj && obj.destroy) {
            if (obj.getChildren) {
                // It's a group
                obj.clear(true, true);
            }
            obj.destroy();
        }
    });
    arr.length = 0;
}
