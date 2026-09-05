// ===== SETTINGS (change these!) =====
const SETTINGS = {
    // World
    gameWidth: 800,
    gameHeight: 600,
    worldWidth: 1200,
    worldHeight: 1050,        // extra height for supply closet at top
    shopTop: 200,             // main shop starts here (closet is above)
    backgroundColour: '#e8dcc8',
    wallColour: 0x8b7355,
    wallThickness: 14,

    // Ferret
    ferretSpeed: 220,
    ferretSize: 18,
    ferretColour: 0xd4a574,
    ferretLength: 30,

    // Granny
    grannySpeed: 90,
    grannySpeedMax: 200,
    grannySpeedPerPoo: 10,
    grannySize: 28,
    grannyColour: 0xcc6699,
    grannyAlertRadius: 250,
    grannyFleeSpeed: 60,      // how fast granny runs from released animals

    // Shop furniture
    shelfColour: 0x6b4226,
    counterColour: 0x8b6914,
    cageColour: 0xbbbbbb,
    cageWallColour: 0x999999,

    // Poo
    pooColour: 0x664422,
    pooSize: 10,
    pooCooldown: 1500,
    pooPoints: 50,

    // Treats
    treatColour: 0xff8844,
    treatSize: 12,
    treatPoints: 10,
    treatsPerPoo: 2,          // collect 2 treats = 1 poo charge
    treatRespawnTime: 8000,   // ms before a collected treat reappears

    // Cage door
    doorOpenTime: 3000,       // ms to hold space to open cage door (3 sec)
    doorColour: 0x777777,
    doorOpenColour: 0x44aa44,

    // Key
    keyColour: 0xffcc00,
    keySize: 14,

    // Animals
    animalSpeed: 40,          // roaming speed inside cage
    animalChaseSpeed: 130,    // speed when chasing granny after release

    // Granny recapture
    grannyShockTime: 3000,    // ms granny panics before she starts recapturing
    grannyRecaptureSpeed: 110, // speed when chasing loose animals
    grannyRecapturePause: 1000, // ms pause after catching each animal

    // Win condition
    poosToWin: 10,

    // Sound (set soundOn to false for silence, or change the volume 0-1)
    soundOn: true,
    soundVolume: 0.6,
};

// ===== ANIMAL TYPES =====
// `sprite` is the texture key; `faces` is which way the artwork points, which
// decides the rotation offset (see rotationFor() below). NB2 picked the facing
// for each one, so it is recorded per animal rather than assumed.
const ANIMAL_TYPES = [
    { name: 'mouse',   colour: 0xccccaa, size: 12, emoji: '🐭', sprite: 'mouse',   faces: 'down' },
    { name: 'hamster', colour: 0xffaa66, size: 14, emoji: '🐹', sprite: 'hamster', faces: 'up'   },
    { name: 'rabbit',  colour: 0xeeeeee, size: 16, emoji: '🐰', sprite: 'rabbit',  faces: 'up'   },
    { name: 'parrot',  colour: 0x44cc44, size: 14, emoji: '🦜', sprite: 'budgie',  faces: 'up'   },
    { name: 'cat',     colour: 0xff8866, size: 18, emoji: '🐱', sprite: 'cat',     faces: 'down' },
    { name: 'turtle',  colour: 0x448844, size: 16, emoji: '🐢', sprite: 'turtle',  faces: 'up'   },
];

// How much bigger than its collision box an animal is drawn.
const ANIMAL_SPRITE_SCALE = 1.7;

// ===== GAME CONFIG =====
const config = {
    type: Phaser.AUTO,
    width: SETTINGS.gameWidth,
    height: SETTINGS.gameHeight,
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

// ===== GAME STATE =====
let ferret, granny;
let walls, furniture;
let treats, poos;
let cursors, spaceKey;
let score = 0;
let pooCount = 0;
let treatsEaten = 0;          // running total of treats collected
let pooCharges = 0;           // available poos (earned by eating treats)
let scoreText, pooText, itemText;
let gameOver = false;
let lastPooTime = 0;
let grannyCurrentSpeed;

// Cage system
let cages = [];             // { walls, door, animal, doorBody, bounds, open }
let ferretCage;             // the cage ferret starts in
let ferretEscaped = false;
let doorProgress = 0;       // 0-1 progress on opening current door
let doorProgressBar;        // graphics object for progress indicator
let activeDoor = null;      // which door we're pushing

// Key + supply closet
let keyItem;
let hasKey = false;
let supplyDoor;             // the locked door to supply closet
let supplyDoorBody;
let releaseButton;
let animalsReleased = false;
let grannyFleeing = false;
let grannyRecapturing = false;
let grannyShockStart = 0;       // timestamp when animals were released
let grannyRecapturePauseUntil = 0; // timestamp when granny can move again after catching

// Released animals group
let releasedAnimals;

// ===== PRELOAD =====
function preload() {
    this.load.image('ferret', 'sprites/ferret.png');
    this.load.image('granny-idle', 'sprites/granny-idle.png');
    this.load.image('granny-suspicious', 'sprites/granny-suspicious.png');
    this.load.image('granny-chasing', 'sprites/granny-chasing.png');
    this.load.image('granny-panic', 'sprites/granny-panic.png');
    // Caged animals
    this.load.image('mouse', 'sprites/mouse.png');
    this.load.image('hamster', 'sprites/hamster.png');
    this.load.image('rabbit', 'sprites/rabbit.png');
    this.load.image('budgie', 'sprites/budgie.png');
    this.load.image('cat', 'sprites/cat.png');
    this.load.image('turtle', 'sprites/turtle.png');
    // Items and furniture
    this.load.image('treat', 'sprites/treat.png');
    this.load.image('poo', 'sprites/poo.png');
    this.load.image('key', 'sprites/key.png');
    this.load.image('release-button', 'sprites/release-button.png');
    this.load.image('cage-door', 'sprites/cage-door.png');
    // Sounds (Kenney, CC0). Two formats because Safari will not play ogg —
    // Phaser picks whichever the browser supports.
    this.load.audio('sfx-treat', ['sounds/pepSound1.ogg', 'sounds/pepSound1.mp3']);
    this.load.audio('sfx-poo',   ['sounds/highUp.ogg',    'sounds/highUp.mp3']);
    this.load.audio('sfx-caught',['sounds/bump.ogg',      'sounds/bump.mp3']);
    this.load.audio('sfx-door',  ['sounds/pepSound2.ogg', 'sounds/pepSound2.mp3']);
}

// ===== SPRITE HELPERS =====
//
// setDisplaySize() works by writing scaleX/scaleY, so after it runs an image's
// scale is NOT 1 — it is whatever was needed to hit that size. Any tween that
// animates scale therefore has to start from that value. Tweening to a literal
// 1.2 would snap the image to 1.2x its FILE size instead, which is how the
// first sprite pass ended up with giant treats. fitSprite() records the base
// scale on the object so tweens can multiply it.

function fitSprite(obj, w, h) {
    obj.setDisplaySize(w, h);
    obj.baseScaleX = obj.scaleX;
    obj.baseScaleY = obj.scaleY;
    return obj;
}

// Size by width, keeping the artwork's own aspect ratio (nothing gets squashed).
function fitSpriteWidth(obj, w) {
    return fitSprite(obj, w, w * (obj.height / obj.width));
}

// Size so the LONGEST side is `n`, keeping aspect. Used for the animals, whose
// sprites range from tall-and-thin (budgie) to nearly square (turtle).
function fitSpriteLongest(obj, n) {
    const scale = n / Math.max(obj.width, obj.height);
    return fitSprite(obj, obj.width * scale, obj.height * scale);
}

// One place to play a sound, so SETTINGS.soundOn and soundVolume actually
// govern all of them. `vol` is a per-sound balance on top of the master.
function playSfx(scene, key, vol) {
    if (!SETTINGS.soundOn) return;
    scene.sound.play(key, { volume: SETTINGS.soundVolume * (vol === undefined ? 1 : vol) });
}

// Phaser's atan2 gives 0 for EAST, so artwork has to be rotated onto that.
// Sprite drawn facing UP  -> +PI/2.  Facing DOWN -> -PI/2.
function facingOffset(faces) {
    return faces === 'up' ? Math.PI / 2 : -Math.PI / 2;
}

// ===== CREATE =====
function create() {
    this.physics.world.setBounds(0, 0, SETTINGS.worldWidth, SETTINGS.worldHeight);

    // --- Floor tiles ---
    const floorGraphics = this.add.graphics();
    // Main shop floor
    floorGraphics.fillStyle(0xe0d4be, 1);
    floorGraphics.fillRect(0, SETTINGS.shopTop, SETTINGS.worldWidth, SETTINGS.worldHeight - SETTINGS.shopTop);
    // Supply closet floor (darker)
    floorGraphics.fillStyle(0xc0b8a0, 1);
    floorGraphics.fillRect(0, 0, 350, SETTINGS.shopTop);
    // Tile grid
    floorGraphics.lineStyle(1, 0xd4c8b0, 0.3);
    for (let x = 0; x <= SETTINGS.worldWidth; x += 48) {
        floorGraphics.lineBetween(x, 0, x, SETTINGS.worldHeight);
    }
    for (let y = 0; y <= SETTINGS.worldHeight; y += 48) {
        floorGraphics.lineBetween(0, y, SETTINGS.worldWidth, y);
    }

    // --- Static groups ---
    walls = this.physics.add.staticGroup();
    furniture = this.physics.add.staticGroup();

    // --- Build the shop ---
    buildWalls(this);
    buildSupplyCloset(this);
    buildShopFurniture(this);
    buildCages(this);

    // --- Key on front edge of cashier desk (ferret can reach it) ---
    // Desk is at (1000, shopTop+90, 200x60), so front edge is at y = shopTop+90+30+2
    const keyX = 1020;
    const keyY = SETTINGS.shopTop + 90 + 34;  // just below the desk's front edge
    keyItem = fitSpriteWidth(this.add.image(keyX, keyY, 'key'), SETTINGS.keySize * 1.8);
    this.physics.add.existing(keyItem, true);
    keyItem.body.updateFromGameObject();
    keyItem.setDepth(3);
    // Key sparkle
    this.tweens.add({
        targets: keyItem,
        alpha: 0.5,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    // Label
    this.add.text(keyX, keyY - 14, '🔑', { fontSize: '12px' }).setOrigin(0.5).setDepth(3);

    // --- Treats ---
    treats = this.physics.add.staticGroup();
    spawnTreats(this);

    // --- Poos ---
    poos = this.add.group();

    // --- Released animals group ---
    releasedAnimals = this.physics.add.group();

    // --- Ferret (starts inside its cage) ---
    ferret = this.add.image(
        ferretCage.bounds.x, ferretCage.bounds.y, 'ferret'
    );
    ferret.setDisplaySize(SETTINGS.ferretSize * 1.5, SETTINGS.ferretLength * 1.5);
    this.physics.add.existing(ferret);
    ferret.body.setCollideWorldBounds(true);
    ferret.body.setSize(SETTINGS.ferretLength - 4, SETTINGS.ferretSize - 4);
    ferret.setDepth(5);

    // --- Granny ---
    granny = this.add.image(900, SETTINGS.shopTop + 140, 'granny-idle');
    granny.setDisplaySize(SETTINGS.grannySize * 2, SETTINGS.grannySize * 2);
    this.physics.add.existing(granny);
    granny.body.setCollideWorldBounds(true);
    granny.body.setSize(SETTINGS.grannySize, SETTINGS.grannySize);
    grannyCurrentSpeed = SETTINGS.grannySpeed;
    granny.setDepth(5);

    // --- Labels ---
    addShopLabels(this);

    // --- Progress bar (hidden until needed) ---
    doorProgressBar = this.add.graphics().setDepth(50);

    // --- HUD ---
    scoreText = this.add.text(16, 16, 'Treats: 0', {
        fontSize: '16px', fill: '#333333', fontFamily: 'monospace',
        backgroundColor: '#ffffffaa', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(100);

    pooText = this.add.text(16, 44, 'Poo: 💩×0  (eat treats!)', {
        fontSize: '16px', fill: '#664422', fontFamily: 'monospace',
        backgroundColor: '#ffffffaa', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(100);

    itemText = this.add.text(16, 72, '', {
        fontSize: '16px', fill: '#cc8800', fontFamily: 'monospace',
        backgroundColor: '#ffffffaa', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(100);

    this.grannyMoodText = this.add.text(SETTINGS.gameWidth - 16, 16, 'Granny: 😴 Dozing', {
        fontSize: '14px', fill: '#cc6699', fontFamily: 'monospace',
        backgroundColor: '#ffffffaa', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    // --- Controls ---
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // --- Collisions ---
    this.physics.add.collider(ferret, walls);
    this.physics.add.collider(ferret, furniture);
    this.physics.add.collider(granny, walls);
    this.physics.add.collider(granny, furniture);
    this.physics.add.collider(releasedAnimals, walls);
    this.physics.add.collider(releasedAnimals, furniture);
    this.physics.add.overlap(ferret, treats, collectTreat, null, this);
    this.physics.add.overlap(ferret, granny, caughtByGranny, null, this);

    // Key pickup
    this.physics.add.overlap(ferret, keyItem, pickUpKey, null, this);

    // --- Camera ---
    this.cameras.main.startFollow(ferret, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, SETTINGS.worldWidth, SETTINGS.worldHeight);

    // --- Opening instructions ---
    const instructions = this.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight - 40,
        'Hold SPACE to open cage door  |  Arrows: move  |  Tap SPACE: poo',
        { fontSize: '12px', fill: '#666666', fontFamily: 'monospace',
          backgroundColor: '#ffffffcc', padding: { x: 8, y: 4 } }
    ).setScrollFactor(0).setDepth(100).setOrigin(0.5);
    this.tweens.add({ targets: instructions, alpha: 0, delay: 5000, duration: 1000 });
}

// ===== UPDATE =====
function update(time, delta) {
    if (gameOver) return;

    // --- Ferret movement ---
    let vx = 0, vy = 0;
    if (cursors.left.isDown) vx = -1;
    else if (cursors.right.isDown) vx = 1;
    if (cursors.up.isDown) vy = -1;
    else if (cursors.down.isDown) vy = 1;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    ferret.body.setVelocity(vx * SETTINGS.ferretSpeed, vy * SETTINGS.ferretSpeed);
    if (vx !== 0 || vy !== 0) ferret.rotation = Math.atan2(vy, vx) + Math.PI / 2;

    // --- Door opening (hold space) ---
    updateDoorOpening(this, time, delta);

    // --- Poo (tap space when not near a door, requires charges) ---
    if (!activeDoor && ferretEscaped &&
        Phaser.Input.Keyboard.JustDown(spaceKey) && time > lastPooTime + SETTINGS.pooCooldown) {
        if (pooCharges > 0) {
            dropPoo(this, time);
        }
    }

    // --- Supply closet door (unlock with key) ---
    if (hasKey && supplyDoor && !supplyDoor.destroyed) {
        const distToDoor = Phaser.Math.Distance.Between(ferret.x, ferret.y, supplyDoor.x, supplyDoor.y);
        if (distToDoor < 50) {
            openSupplyDoor(this);
        }
    }

    // --- Release button ---
    if (releaseButton && !animalsReleased) {
        const distToButton = Phaser.Math.Distance.Between(ferret.x, ferret.y, releaseButton.x, releaseButton.y);
        if (distToButton < 40) {
            releaseAllAnimals(this);
        }
    }

    // --- Granny AI ---
    if (ferretEscaped) {
        updateGranny(this);
    }

    // --- Cage animals roaming ---
    updateCageAnimals(this);

    // --- Released animals chase granny ---
    if (animalsReleased) {
        updateReleasedAnimals(this);
    }

    // --- Win check ---
    if (pooCount >= SETTINGS.poosToWin) {
        winGame(this);
    }
}

// ===== SHOP BUILDING =====

function buildWalls(scene) {
    const w = SETTINGS.worldWidth;
    const h = SETTINGS.worldHeight;
    const t = SETTINGS.wallThickness;
    const top = SETTINGS.shopTop;

    // Supply closet is 350px wide (x: 0 to 350)
    // Door gap in the shop top wall: x 200 to 260 (60px wide, inside closet footprint)
    // Walking through the gap goes UP into the closet interior

    // Shop top wall: left segment + gap + right segment
    addWall(scene, 100, top + t / 2, 200, t);             // x:0–200
    addWall(scene, 730, top + t / 2, 940, t);             // x:260–1200

    // Bottom wall
    addWall(scene, w / 2, h - t / 2, w, t);
    // Left wall (full height — covers closet + shop)
    addWall(scene, t / 2, h / 2, t, h);
    // Right wall
    addWall(scene, w - t / 2, (top + h) / 2, t, h - top);

    // Supply closet walls
    addWall(scene, 175, t / 2, 350, t);                   // closet top wall (x:0–350)
    addWall(scene, 350, top / 2, t, top);                  // closet right wall (stops at shop top wall)
}

function buildSupplyCloset(scene) {
    // Locked door — sits in the gap at x: 200–260
    const doorX = 230;  // centre of the 60px gap
    supplyDoor = scene.add.rectangle(doorX, SETTINGS.shopTop + 7, 60, SETTINGS.wallThickness, 0x884422);
    supplyDoor.setDepth(4);
    // Physics body for the door (blocks passage)
    supplyDoorBody = scene.add.rectangle(doorX, SETTINGS.shopTop + 7, 60, SETTINGS.wallThickness, 0x884422);
    supplyDoorBody.setAlpha(0);
    furniture.add(supplyDoorBody);
    supplyDoorBody.body.updateFromGameObject();

    // "LOCKED" label
    scene.add.text(doorX, SETTINGS.shopTop - 8, '🔒', { fontSize: '12px' }).setOrigin(0.5).setDepth(5);

    // Release button inside closet
    releaseButton = fitSprite(scene.add.image(150, 80, 'release-button'), 44, 44);
    releaseButton.setDepth(3);
    scene.add.text(150, 108, 'RELEASE', {
        fontSize: '8px', fill: '#ffffff', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5).setDepth(4);

    // Button pulsing — multiplies the fitted scale, never replaces it
    scene.tweens.add({
        targets: releaseButton,
        scaleX: releaseButton.baseScaleX * 1.1,
        scaleY: releaseButton.baseScaleY * 1.1,
        duration: 800, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

function buildShopFurniture(scene) {
    const top = SETTINGS.shopTop;

    // === CASHIER DESK (top-right) ===
    addFurniture(scene, 1000, top + 90, 200, 60, SETTINGS.counterColour);

    // === SHELVES — matching the drawing layout ===
    // Top row: 2 shelves
    addFurniture(scene, 350, top + 180, 200, 80, SETTINGS.shelfColour);
    addFurniture(scene, 720, top + 180, 200, 80, SETTINGS.shelfColour);

    // Middle row: 1 shelf left, 1 centre, 1 right
    addFurniture(scene, 250, top + 400, 160, 100, SETTINGS.shelfColour);
    addFurniture(scene, 600, top + 400, 200, 100, SETTINGS.shelfColour);
    addFurniture(scene, 980, top + 400, 180, 100, SETTINGS.shelfColour);
}

function addWall(scene, x, y, width, height) {
    const wall = scene.add.rectangle(x, y, width, height, SETTINGS.wallColour);
    walls.add(wall);
    wall.body.updateFromGameObject();
    return wall;
}

function addFurniture(scene, x, y, width, height, colour) {
    const f = scene.add.rectangle(x, y, width, height, colour);
    f.setStrokeStyle(2, 0x00000033);
    furniture.add(f);
    f.body.updateFromGameObject();
    f.setDepth(1);
    return f;
}

// ===== CAGES =====

function buildCages(scene) {
    const top = SETTINGS.shopTop;
    const shopBottom = SETTINGS.worldHeight;

    // --- Bottom row of cages (6 cages along the bottom) ---
    const cageY = shopBottom - 80;
    const cageW = 120;
    const cageH = 80;
    const startX = 200;
    const gap = 30;

    for (let i = 0; i < 6; i++) {
        const cx = startX + i * (cageW + gap);
        const animalType = ANIMAL_TYPES[i % ANIMAL_TYPES.length];
        const cage = createCage(scene, cx, cageY, cageW, cageH, animalType, 'top');
        cages.push(cage);
    }

    // --- Ferret cage (left wall, larger) ---
    ferretCage = createCage(scene, 70, top + 550, 90, 130, null, 'right');
    ferretCage.isFerretCage = true;
    cages.push(ferretCage);
}

function createCage(scene, x, y, w, h, animalType, doorSide) {
    const cage = {
        bounds: { x, y, w, h },
        walls: [],
        door: null,
        doorBody: null,
        animal: null,
        animalType: animalType,
        open: false,
        doorSide: doorSide
    };

    const wallT = 6;
    const col = SETTINGS.cageWallColour;

    // Build cage walls (3 sides + door on one side)
    if (doorSide === 'top') {
        // Bottom wall
        cage.walls.push(addWall(scene, x, y + h / 2 - wallT / 2, w, wallT));
        // Left wall
        cage.walls.push(addWall(scene, x - w / 2 + wallT / 2, y, wallT, h));
        // Right wall
        cage.walls.push(addWall(scene, x + w / 2 - wallT / 2, y, wallT, h));
        // Door (top side)
        cage.door = fitSprite(scene.add.image(x, y - h / 2 + wallT / 2, 'cage-door'), w - wallT * 2, wallT + 2);
        cage.door.setDepth(4);
        cage.doorBody = addWall(scene, x, y - h / 2 + wallT / 2, w - wallT * 2, wallT + 2);
    } else if (doorSide === 'right') {
        // Top wall
        cage.walls.push(addWall(scene, x, y - h / 2 + wallT / 2, w, wallT));
        // Bottom wall
        cage.walls.push(addWall(scene, x, y + h / 2 - wallT / 2, w, wallT));
        // Left wall
        cage.walls.push(addWall(scene, x - w / 2 + wallT / 2, y, wallT, h));
        // Door (right side)
        cage.door = fitSprite(scene.add.image(x + w / 2 - wallT / 2, y, 'cage-door'), h - wallT * 2, wallT + 2);
        cage.door.setRotation(Math.PI / 2);   // stand the gate up in the opening
        cage.door.setDepth(4);
        cage.doorBody = addWall(scene, x + w / 2 - wallT / 2, y, wallT + 2, h - wallT * 2);
    }

    // Cage background tint
    const bg = scene.add.rectangle(x, y, w - wallT * 2, h - wallT * 2, 0xf5f0e8);
    bg.setAlpha(0.5);

    // Animal inside (if not ferret cage)
    if (animalType) {
        const animal = fitSpriteLongest(
            scene.add.image(x, y, animalType.sprite),
            animalType.size * ANIMAL_SPRITE_SCALE
        );
        animal.setDepth(2);
        animal.animalType = animalType;
        animal.faceOffset = facingOffset(animalType.faces);
        animal.cageBounds = { x, y, w: w - 20, h: h - 20 };
        animal.wanderTime = 0;
        cage.animal = animal;

        // Emoji label
        scene.add.text(x, y - h / 2 - 10, animalType.emoji, { fontSize: '14px' }).setOrigin(0.5).setDepth(3);
    }

    return cage;
}

function openCageDoor(scene, cage) {
    if (cage.open) return;
    cage.open = true;
    playSfx(scene, 'sfx-door', 0.7);

    // Remove door physics body
    if (cage.doorBody) {
        cage.doorBody.destroy();
        cage.doorBody = null;
    }

    // Animate door opening (fade + slide)
    if (cage.door) {
        scene.tweens.add({
            targets: cage.door,
            alpha: 0.2,
            scaleX: cage.door.baseScaleX * 0.3,
            scaleY: cage.door.baseScaleY,
            duration: 300,
            ease: 'Power2'
        });
        // Images tint; only Rectangles have fillColor.
        cage.door.setTint(SETTINGS.doorOpenColour);
    }

    // Mark ferret as escaped if this is the ferret cage
    if (cage.isFerretCage) {
        ferretEscaped = true;
    }
}

function releaseAllAnimals(scene) {
    if (animalsReleased) return;
    animalsReleased = true;

    // Flash the button
    scene.cameras.main.flash(300, 255, 100, 100);

    // Open all cage doors and release animals
    cages.forEach(cage => {
        openCageDoor(scene, cage);

        if (cage.animal) {
            // Give the animal physics and release it
            scene.physics.add.existing(cage.animal);
            cage.animal.body.setCollideWorldBounds(true);
            // Body is left at the sprite's on-screen size. Don't call
            // body.setSize(animalType.size, ...) here: Arcade multiplies what
            // you pass by the sprite's scale, and these sprites are scaled DOWN
            // from a 64px texture, so that shrinks the body to ~4px and the
            // animals walk through the shop walls.
            cage.animal.released = true;
            cage.animal.setDepth(5);
            releasedAnimals.add(cage.animal);
        }
    });

    // Update HUD
    scene.grannyMoodText.setText('Granny: 😱 ANIMALS LOOSE!');
    grannyFleeing = true;
    grannyShockStart = scene.time.now;
}

// ===== DOOR OPENING MECHANIC =====

function updateDoorOpening(scene, time, delta) {
    doorProgressBar.clear();

    // Find nearest closed door
    let nearestDoor = null;
    let nearestDist = 50; // interaction range

    cages.forEach(cage => {
        if (cage.open || !cage.doorBody) return;
        // Skip non-ferret cages until ferret has escaped (and doesn't have key/button)
        if (!cage.isFerretCage && !ferretEscaped) return;

        const dx = cage.doorSide === 'right'
            ? cage.bounds.x + cage.bounds.w / 2
            : cage.bounds.x;
        const dy = cage.doorSide === 'top'
            ? cage.bounds.y - cage.bounds.h / 2
            : cage.bounds.y;

        const dist = Phaser.Math.Distance.Between(ferret.x, ferret.y, dx, dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestDoor = cage;
        }
    });

    // If space is held and near a door, fill progress
    if (spaceKey.isDown && nearestDoor) {
        if (activeDoor !== nearestDoor) {
            activeDoor = nearestDoor;
            doorProgress = 0;
        }

        doorProgress += delta / SETTINGS.doorOpenTime;

        // Draw progress bar above ferret
        const barWidth = 40;
        const barHeight = 6;
        const bx = ferret.x - barWidth / 2;
        const by = ferret.y - 25;

        // Background
        doorProgressBar.fillStyle(0x000000, 0.4);
        doorProgressBar.fillRect(bx, by, barWidth, barHeight);
        // Fill
        doorProgressBar.fillStyle(0x44cc44, 1);
        doorProgressBar.fillRect(bx, by, barWidth * Math.min(1, doorProgress), barHeight);
        // Border
        doorProgressBar.lineStyle(1, 0x333333, 0.8);
        doorProgressBar.strokeRect(bx, by, barWidth, barHeight);

        if (doorProgress >= 1) {
            openCageDoor(scene, nearestDoor);
            doorProgress = 0;
            activeDoor = null;
        }
    } else {
        // Released space — reset progress
        if (activeDoor) {
            doorProgress = Math.max(0, doorProgress - delta / 500); // drains faster than it fills
            if (doorProgress <= 0) {
                activeDoor = null;
                doorProgress = 0;
            } else {
                // Still showing draining bar
                const barWidth = 40;
                const barHeight = 6;
                const bx = ferret.x - barWidth / 2;
                const by = ferret.y - 25;
                doorProgressBar.fillStyle(0x000000, 0.4);
                doorProgressBar.fillRect(bx, by, barWidth, barHeight);
                doorProgressBar.fillStyle(0xccaa44, 1);
                doorProgressBar.fillRect(bx, by, barWidth * doorProgress, barHeight);
                doorProgressBar.lineStyle(1, 0x333333, 0.8);
                doorProgressBar.strokeRect(bx, by, barWidth, barHeight);
            }
        }
    }
}

// ===== KEY + SUPPLY DOOR =====

function pickUpKey(ferretObj, key) {
    if (hasKey) return;
    hasKey = true;
    key.setVisible(false);
    key.body.enable = false;
    itemText.setText('🔑 Got the key!');
}

function openSupplyDoor(scene) {
    if (!supplyDoor || supplyDoor.destroyed) return;

    hasKey = false;
    itemText.setText('🔓 Door unlocked!');

    // Remove door physics
    if (supplyDoorBody) {
        furniture.remove(supplyDoorBody);
        supplyDoorBody.destroy();
        supplyDoorBody = null;
    }

    // Animate door opening
    scene.tweens.add({
        targets: supplyDoor,
        alpha: 0,
        scaleX: 0.1,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
            supplyDoor.destroy();
            supplyDoor = { destroyed: true };
        }
    });

    // Brief text hint
    scene.time.delayedCall(1500, () => {
        itemText.setText('');
    });
}

// ===== TREATS =====

function spawnTreats(scene) {
    const top = SETTINGS.shopTop;
    const treatPositions = [
        // Between top shelves
        { x: 535, y: top + 180 },
        // Around left shelf row
        { x: 150, y: top + 300 }, { x: 350, y: top + 300 },
        // Between middle shelves
        { x: 430, y: top + 400 }, { x: 800, y: top + 400 },
        // Open areas
        { x: 500, y: top + 550 }, { x: 300, y: top + 500 },
        { x: 850, y: top + 300 }, { x: 1100, y: top + 250 },
        // Near cages (risky — close to bottom wall)
        { x: 300, y: top + 650 }, { x: 600, y: top + 650 },
        // Near counter (very risky — granny territory)
        { x: 900, y: top + 50 }, { x: 1100, y: top + 130 },
        // Supply closet entrance area
        { x: 400, y: top + 50 },
    ];

    treatPositions.forEach(pos => {
        const treat = fitSpriteWidth(
            scene.add.image(pos.x, pos.y, 'treat'),
            SETTINGS.treatSize * 1.8
        );
        treats.add(treat);
        treat.body.updateFromGameObject();
        treat.setDepth(0);

        // Gentle pulse — multiplies the fitted scale, never replaces it
        scene.tweens.add({
            targets: treat,
            scaleX: treat.baseScaleX * 1.2,
            scaleY: treat.baseScaleY * 1.2,
            duration: 800, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Phaser.Math.Between(0, 500)
        });
    });
}

function collectTreat(ferretObj, treat) {
    if (!treat.visible) return; // already collected
    // Safe removal for rectangles in static groups
    treat.body.enable = false;
    treat.setVisible(false);
    treat.setActive(false);
    score += SETTINGS.treatPoints;
    treatsEaten++;
    playSfx(this, 'sfx-treat', 0.5);   // quieter: this one fires a lot

    // Respawn this treat after a delay
    this.time.delayedCall(SETTINGS.treatRespawnTime, () => {
        if (!gameOver) {
            treat.setVisible(true);
            treat.setActive(true);
            treat.body.enable = true;
            // Flash briefly to show it's back
            treat.setAlpha(0);
            this.tweens.add({ targets: treat, alpha: 1, duration: 300 });
        }
    });

    // Every N treats = 1 poo charge
    if (treatsEaten % SETTINGS.treatsPerPoo === 0) {
        pooCharges++;
        pooText.setText('Poo: 💩×' + pooCharges + '  (' + pooCount + '/' + SETTINGS.poosToWin + ' dropped)');
    } else {
        const remaining = SETTINGS.treatsPerPoo - (treatsEaten % SETTINGS.treatsPerPoo);
        pooText.setText('Poo: 💩×' + pooCharges + '  (' + remaining + ' more treat' + (remaining > 1 ? 's' : '') + ')');
    }

    scoreText.setText('Treats: ' + treatsEaten);
}

// ===== POO MECHANIC =====

function dropPoo(scene, time) {
    lastPooTime = time;
    pooCharges--;

    const poo = fitSpriteWidth(
        scene.add.image(ferret.x, ferret.y, 'poo'),
        SETTINGS.pooSize * 2.2
    );
    poo.setDepth(0);
    poos.add(poo);

    // Pop in from small — both ends of the tween are relative to the fitted scale
    poo.setScale(poo.baseScaleX * 0.3, poo.baseScaleY * 0.3);
    scene.tweens.add({
        targets: poo,
        scaleX: poo.baseScaleX, scaleY: poo.baseScaleY,
        duration: 200, ease: 'Back.easeOut'
    });

    playSfx(scene, 'sfx-poo', 0.8);
    pooCount++;
    score += SETTINGS.pooPoints;
    scoreText.setText('Treats: ' + treatsEaten);

    if (pooCharges > 0) {
        pooText.setText('Poo: 💩×' + pooCharges + '  (' + pooCount + '/' + SETTINGS.poosToWin + ' dropped)');
    } else {
        const remaining = SETTINGS.treatsPerPoo - (treatsEaten % SETTINGS.treatsPerPoo || SETTINGS.treatsPerPoo);
        pooText.setText('Poo: 💩×0  (' + pooCount + '/' + SETTINGS.poosToWin + ' — eat more!)');
    }

    grannyCurrentSpeed = Math.min(
        SETTINGS.grannySpeedMax,
        SETTINGS.grannySpeed + pooCount * SETTINGS.grannySpeedPerPoo
    );
}

// ===== ANIMAL AI =====

function updateCageAnimals(scene) {
    cages.forEach(cage => {
        if (!cage.animal || cage.animal.released) return;

        const a = cage.animal;
        const b = a.cageBounds;

        // Simple wander inside cage bounds
        if (scene.time.now > a.wanderTime) {
            const tx = b.x + Phaser.Math.Between(-b.w / 3, b.w / 3);
            const ty = b.y + Phaser.Math.Between(-b.h / 3, b.h / 3);
            const angle = Phaser.Math.Angle.Between(a.x, a.y, tx, ty);
            a.rotation = angle + a.faceOffset;

            // Move toward target
            scene.tweens.add({
                targets: a,
                x: tx, y: ty,
                duration: Phaser.Math.Between(800, 2000),
                ease: 'Sine.easeInOut'
            });

            a.wanderTime = scene.time.now + Phaser.Math.Between(1500, 4000);
        }
    });
}

function updateReleasedAnimals(scene) {
    releasedAnimals.children.iterate(animal => {
        if (!animal || !animal.active) return;

        // Chase granny!
        const angle = Phaser.Math.Angle.Between(animal.x, animal.y, granny.x, granny.y);
        animal.rotation = angle + animal.faceOffset;
        animal.body.setVelocity(
            Math.cos(angle) * SETTINGS.animalChaseSpeed,
            Math.sin(angle) * SETTINGS.animalChaseSpeed
        );
    });
}

// ===== GRANNY AI =====

function updateGranny(scene) {
    const dist = Phaser.Math.Distance.Between(ferret.x, ferret.y, granny.x, granny.y);

    if (grannyFleeing || grannyRecapturing) {
        const now = scene.time.now;

        // Phase 1: Shock — granny flees in panic
        if (grannyFleeing && now - grannyShockStart < SETTINGS.grannyShockTime) {
            granny.setTexture('granny-panic');
            let nearestAnimal = null;
            let nearestDist = Infinity;
            releasedAnimals.children.iterate(animal => {
                if (!animal || !animal.active) return;
                const d = Phaser.Math.Distance.Between(granny.x, granny.y, animal.x, animal.y);
                if (d < nearestDist) { nearestDist = d; nearestAnimal = animal; }
            });
            if (nearestAnimal) {
                const angle = Phaser.Math.Angle.Between(nearestAnimal.x, nearestAnimal.y, granny.x, granny.y);
                granny.body.setVelocity(Math.cos(angle) * SETTINGS.grannySpeedMax, Math.sin(angle) * SETTINGS.grannySpeedMax);
                granny.rotation = angle - Math.PI / 2;
            }
            scene.grannyMoodText.setText('Granny: 😱 HELP!');
            return;
        }

        // Phase 2: Recapture — granny recovers and starts catching animals
        granny.setTexture('granny-chasing');
        if (grannyFleeing && !grannyRecapturing) {
            grannyFleeing = false;
            grannyRecapturing = true;
            scene.grannyMoodText.setText('Granny: 😤 Right, come here!');
        }

        // Paused after catching an animal
        if (now < grannyRecapturePauseUntil) {
            granny.body.setVelocity(0, 0);
            return;
        }

        // Find nearest active released animal
        let target = null;
        let targetDist = Infinity;
        releasedAnimals.children.iterate(animal => {
            if (!animal || !animal.active) return;
            const d = Phaser.Math.Distance.Between(granny.x, granny.y, animal.x, animal.y);
            if (d < targetDist) { targetDist = d; target = animal; }
        });

        if (target) {
            // Chase it
            const angle = Phaser.Math.Angle.Between(granny.x, granny.y, target.x, target.y);
            granny.body.setVelocity(
                Math.cos(angle) * SETTINGS.grannyRecaptureSpeed,
                Math.sin(angle) * SETTINGS.grannyRecaptureSpeed
            );
            granny.rotation = angle - Math.PI / 2;
            scene.grannyMoodText.setText('Granny: 😤 Catching animals!');

            // Caught it!
            if (targetDist < 30) {
                target.body.setVelocity(0, 0);
                target.setActive(false);
                target.setVisible(false);
                target.body.enable = false;
                grannyRecapturePauseUntil = now + SETTINGS.grannyRecapturePause;
                scene.grannyMoodText.setText('Granny: 😤 Got one!');
            }
        } else {
            // All animals recaptured — back to normal
            grannyRecapturing = false;
            grannyFleeing = false;
            scene.grannyMoodText.setText('Granny: 😠 Now where\'s that ferret...');
        }

        // Granny still catches you if you touch her during recapture
        return;
    }

    let speed = grannyCurrentSpeed;
    let moodText;

    if (pooCount === 0 && dist > SETTINGS.grannyAlertRadius) {
        speed = 30;
        moodText = 'Granny: 💤 Idle';
        granny.setTexture('granny-idle');
        granny.clearTint();
        if (!granny.wanderTime || scene.time.now > granny.wanderTime) {
            granny.body.setVelocity(
                Phaser.Math.Between(-30, 30),
                Phaser.Math.Between(-30, 30)
            );
            granny.wanderTime = scene.time.now + Phaser.Math.Between(1000, 3000);
        }
    } else if (dist > SETTINGS.grannyAlertRadius * 1.5 && pooCount < 3) {
        moodText = 'Granny: 🤨 Suspicious';
        granny.setTexture('granny-suspicious');
        granny.clearTint();
        moveGrannyToward(ferret.x, ferret.y, speed * 0.5);
    } else {
        moodText = pooCount >= 5 ? 'Granny: 😡 FURIOUS' : 'Granny: 😠 Chasing!';
        granny.setTexture('granny-chasing');
        // Tint redder as anger builds
        const angerRatio = Math.min(1, pooCount / SETTINGS.poosToWin);
        if (angerRatio > 0.3) {
            const tintR = 0xff;
            const tintG = Math.floor(0xff * (1 - angerRatio * 0.6));
            const tintB = Math.floor(0xff * (1 - angerRatio * 0.6));
            granny.setTint((tintR << 16) | (tintG << 8) | tintB);
        } else {
            granny.clearTint();
        }
        moveGrannyToward(ferret.x, ferret.y, speed);
    }

    scene.grannyMoodText.setText(moodText);
}

function moveGrannyToward(targetX, targetY, speed) {
    const angle = Phaser.Math.Angle.Between(granny.x, granny.y, targetX, targetY);
    granny.body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );
    granny.rotation = angle - Math.PI / 2;
}

// ===== LABELS =====

function addShopLabels(scene) {
    const top = SETTINGS.shopTop;
    const labelStyle = { fontSize: '9px', fill: '#ffffff', fontFamily: 'monospace', align: 'center' };

    scene.add.text(1000, top + 80, 'CASHIER', labelStyle).setOrigin(0.5);
    scene.add.text(350, top + 170, 'PET FOOD', labelStyle).setOrigin(0.5);
    scene.add.text(720, top + 170, 'TOYS', labelStyle).setOrigin(0.5);
    scene.add.text(150, top / 2, 'SUPPLY\nCLOSET', { ...labelStyle, align: 'center' }).setOrigin(0.5);
    scene.add.text(SETTINGS.worldWidth / 2, top + 15, "GRANNY'S PET SHOP", {
        fontSize: '14px', fill: '#5a4a3a', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
}

// ===== GAME OVER / WIN =====

function caughtByGranny(ferretObj, grannyObj) {
    if (gameOver) return;

    this.physics.pause();
    gameOver = true;
    playSfx(this, 'sfx-caught', 1);
    ferret.setTint(0xff0000);
    this.cameras.main.shake(300, 0.01);

    this.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2,
        'CAUGHT!\nGranny got you!\n\nPoos: ' + pooCount + '  Score: ' + score +
        '\n\nPress SPACE to try again',
        { fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace',
          align: 'center', backgroundColor: '#000000cc', padding: { x: 20, y: 16 } }
    ).setScrollFactor(0).setDepth(200).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => {
        resetState();
        this.scene.restart();
    });
}

function winGame(scene) {
    if (gameOver) return;
    scene.physics.pause();
    gameOver = true;
    scene.cameras.main.flash(500, 255, 220, 100);

    scene.add.text(
        SETTINGS.gameWidth / 2, SETTINGS.gameHeight / 2,
        'YOU WIN!\n\nThe shop is absolutely RUINED!\nPoos: ' + pooCount + '  Score: ' + score +
        '\n\nPress SPACE to play again',
        { fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace',
          align: 'center', backgroundColor: '#000000cc', padding: { x: 20, y: 16 } }
    ).setScrollFactor(0).setDepth(200).setOrigin(0.5);

    scene.input.keyboard.once('keydown-SPACE', () => {
        resetState();
        scene.scene.restart();
    });
}

function resetState() {
    score = 0;
    pooCount = 0;
    treatsEaten = 0;
    pooCharges = 0;
    gameOver = false;
    grannyCurrentSpeed = SETTINGS.grannySpeed;
    hasKey = false;
    ferretEscaped = false;
    animalsReleased = false;
    grannyFleeing = false;
    grannyRecapturing = false;
    grannyShockStart = 0;
    grannyRecapturePauseUntil = 0;
    doorProgress = 0;
    activeDoor = null;
    lastPooTime = 0;
    cages = [];
    ferretCage = null;
}
