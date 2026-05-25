// ===== THE SUBSTITUTE — Stage 1 =====
// A dating-sim mystery in a West Country secondary school.
// Stage 1: Day 1 playable end-to-end. Coloured rectangles, real writing.
// Writing lives in dialogues.js. Engine lives here.

// ===== SETTINGS (tweak these!) =====
const SETTINGS = {
    // Canvas
    width: 720,
    height: 405,

    // Dialogue
    dialogueSpeed: 28,           // ms per character (lower = faster)
    dialogueFontSize: 14,
    narrationFontSize: 13,

    // Stats — start at zero. Threshold gates kick in at 3 and 5.
    startingStats: { rapport: 0, curiosity: 0, discretion: 0 },

    // Calder distortion intensity for Day 1 (0 = invisible-effect, see spec §3.5)
    calderIntensity: 0,

    // Day to start on. 1 = Monday. Bump for testing.
    startDay: 1,

    // Palette — Warm (autumnal sunlight, school, comedy)
    warm: {
        bgDeep:    0x2a1810,  // shadow plum
        bgWarm:    0x6b3d2e,  // brick shadow
        midWarm:   0xc97c4e,  // terracotta
        amber:     0xe8a857,  // sunlight
        highlight: 0xf4e0a8,  // cream
        ink:       0x1a0e08
    },

    // Palette — Cold (dusk, mystery, village)
    cold: {
        bgDeep:    0x0e1419,
        bgWarm:    0x2a3742,
        midWarm:   0x4a5a6a,
        amber:     0x6a5878,
        highlight: 0xb8c4d0,
        ink:       0x0a0e12
    },

    // Character signature colours (from visual spec §3.6)
    characters: {
        player:   { name: "YOU",      colour: 0x4a8a8a },
        michael:  { name: "MICHAEL",  colour: 0xc4642e },  // rust
        loala:    { name: "LOALA",    colour: 0x3e8e6e },  // sage
        nathan:   { name: "NATHAN",   colour: 0x5a6b9e },  // dusty blue
        ronny:    { name: "RONNY",    colour: 0x7a6450 },  // weathered brown
        penny:    { name: "PENNY",    colour: 0xb85a8a },  // heather pink
        eleanor:  { name: "ELEANOR",  colour: 0x8a6ba8 },  // lavender
        calder:   { name: "",         colour: 0x6b6b6b },  // grey, unmemorable
        iris:     { name: "IRIS",     colour: 0x9a8458 }
    }
};

// ===== GAME STATE =====
const SAVE_KEY = 'the-substitute-save';

const GameState = {
    day: SETTINGS.startDay,
    slot: 'morning',                   // morning | lunch | afternoon | afterschool | dayend
    stats: { ...SETTINGS.startingStats },
    palette: 'warm',
    flags: {
        metMichael: false, metLoala: false, metNathan: false,
        metRonny: false, metPenny: false, sawCalder: false,
        hadLunchWithMichael: false,
        playerHasNoticedCalder: false
    },
    timetable: {},                     // { 'day1-lunch': 'michael', ... }

    save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                day: this.day, slot: this.slot, stats: this.stats,
                palette: this.palette, flags: this.flags, timetable: this.timetable
            }));
        } catch (e) { console.warn('Save failed', e); }
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            Object.assign(this, data);
            return true;
        } catch (e) { return false; }
    },

    reset() {
        this.day = SETTINGS.startDay;
        this.slot = 'morning';
        this.stats = { ...SETTINGS.startingStats };
        this.palette = 'warm';
        this.flags = {
            metMichael: false, metLoala: false, metNathan: false,
            metRonny: false, metPenny: false, sawCalder: false,
            hadLunchWithMichael: false,
            playerHasNoticedCalder: false
        };
        this.timetable = {};
    },

    hasSave() {
        return !!localStorage.getItem(SAVE_KEY);
    }
};

// ===== PHASER CONFIG =====
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: SETTINGS.width,
    height: SETTINGS.height,
    backgroundColor: '#1a0e08',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { create, update }
};

let scene;          // global ref to the active Phaser.Scene
let layers = {};    // named container layers (set, characters, ui, dialogue, overlay)
let dialogueRunner = null;

function create() {
    scene = this;

    // Layer containers — drawn in order, lower first
    layers.set        = scene.add.container(0, 0);
    layers.characters = scene.add.container(0, 0);
    layers.ui         = scene.add.container(0, 0);
    layers.hud        = scene.add.container(0, 0);
    layers.dialogue   = scene.add.container(0, 0);
    layers.overlay    = scene.add.container(0, 0);

    showTitle();
}

function update() {
    // Per-frame stuff goes here. Empty for Stage 1.
}

// ===== HELPERS =====
function clearAll() {
    layers.set.removeAll(true);
    layers.characters.removeAll(true);
    layers.ui.removeAll(true);
    layers.hud.removeAll(true);
    layers.dialogue.removeAll(true);
    layers.overlay.removeAll(true);
    dialogueRunner = null;
}

function clearLayer(layer) {
    layers[layer].removeAll(true);
}

function palette() {
    return SETTINGS[GameState.palette];
}

// Make a rectangular button. Returns container.
function makeButton(x, y, w, h, label, onClick, opts = {}) {
    const c = scene.add.container(x, y);
    const fill = opts.fill ?? palette().bgWarm;
    const stroke = opts.stroke ?? palette().amber;
    const textCol = opts.textCol ?? '#f4e0a8';

    const bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(2, stroke);
    bg.setInteractive({ useHandCursor: true });

    const txt = scene.add.text(0, 0, label, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: (opts.fontSize ?? 13) + 'px',
        color: textCol,
        align: 'center',
        wordWrap: { width: w - 16 }
    }).setOrigin(0.5);

    c.add([bg, txt]);

    bg.on('pointerover', () => bg.setFillStyle(palette().midWarm));
    bg.on('pointerout',  () => bg.setFillStyle(fill));
    bg.on('pointerdown', () => { onClick(); });

    return c;
}

// Make a labelled character rectangle (full-body, ~48x64 register but bigger for legibility).
function makeCharacterRect(x, y, charId, opts = {}) {
    const c = scene.add.container(x, y);
    const char = SETTINGS.characters[charId];
    const w = opts.w ?? 48;
    const h = opts.h ?? 80;

    const body = scene.add.rectangle(0, 0, w, h, char.colour).setStrokeStyle(1, 0x000000, 0.4);

    // Name tag above
    let tag = null;
    if (char.name && !opts.hideName) {
        tag = scene.add.text(0, -h/2 - 12, char.name, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '10px',
            color: '#' + char.colour.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
    }

    c.add(tag ? [body, tag] : [body]);

    if (opts.onClick) {
        body.setInteractive({ useHandCursor: true });
        body.on('pointerover', () => body.setStrokeStyle(2, 0xffffff));
        body.on('pointerout',  () => body.setStrokeStyle(1, 0x000000, 0.4));
        body.on('pointerdown', () => opts.onClick());
    }

    return c;
}

// Dialogue box at bottom of screen.
function showDialogueBox() {
    clearLayer('dialogue');
    const p = palette();
    const boxH = 110;
    const box = scene.add.rectangle(
        SETTINGS.width / 2,
        SETTINGS.height - boxH / 2 - 8,
        SETTINGS.width - 32,
        boxH,
        p.bgDeep, 0.92
    ).setStrokeStyle(2, p.amber);
    layers.dialogue.add(box);
    return { box, boxH };
}

// Run a sequence of beats. Calls onComplete when done.
function runDialogue(beats, onComplete) {
    let i = 0;
    const { boxH } = showDialogueBox();
    const p = palette();

    const nameTag = scene.add.text(32, SETTINGS.height - boxH - 4, '', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '11px',
        color: '#f4e0a8',
        stroke: '#000', strokeThickness: 3
    });
    const body = scene.add.text(40, SETTINGS.height - boxH + 16, '', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: SETTINGS.dialogueFontSize + 'px',
        color: '#f4e0a8',
        wordWrap: { width: SETTINGS.width - 96 },
        lineSpacing: 4
    });
    const hint = scene.add.text(SETTINGS.width - 32, SETTINGS.height - 16, '▸', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '14px', color: '#e8a857'
    }).setOrigin(1, 1);
    layers.dialogue.add([nameTag, body, hint]);

    // Click-anywhere advance
    const advancer = scene.add.rectangle(
        SETTINGS.width / 2, SETTINGS.height / 2,
        SETTINGS.width, SETTINGS.height, 0x000000, 0.001
    ).setInteractive();
    layers.dialogue.add(advancer);
    scene.children.bringToTop(layers.dialogue);

    let typing = false;
    let typeTimer = null;
    let typeDone = null;
    let currentFullText = '';
    let choiceButtons = [];

    function setCharLabel(charId) {
        if (charId === 'narration' || !charId) {
            nameTag.setText('').setVisible(false);
            body.setColor('#cbb892');
            body.setFontStyle('italic');
        } else {
            const c = SETTINGS.characters[charId];
            nameTag.setText(c.name || '?').setVisible(true);
            nameTag.setColor('#' + (c.colour || 0xf4e0a8).toString(16).padStart(6, '0'));
            body.setColor('#f4e0a8');
            body.setFontStyle('normal');
        }
    }

    function typeOut(text, done) {
        typing = true;
        typeDone = done || null;
        currentFullText = text;
        body.setText('');
        hint.setVisible(false);
        let idx = 0;
        typeTimer = scene.time.addEvent({
            delay: SETTINGS.dialogueSpeed,
            repeat: text.length - 1,
            callback: () => {
                idx++;
                body.setText(text.substring(0, idx));
                if (idx >= text.length) {
                    typing = false;
                    hint.setVisible(true);
                    const d = typeDone;
                    typeDone = null;
                    if (d) d();
                }
            }
        });
    }

    function clearChoices() {
        choiceButtons.forEach(b => b.destroy());
        choiceButtons = [];
    }

    function nextBeat() {
        clearChoices();
        if (i >= beats.length) {
            layers.dialogue.removeAll(true);
            if (onComplete) onComplete();
            return;
        }
        const beat = beats[i++];

        if (beat.setFlag) {
            GameState.flags[beat.setFlag] = beat.value ?? true;
            nextBeat();
            return;
        }

        if (beat.choice) {
            setCharLabel('narration');
            typeOut(beat.choice.prompt, () => {
                const startY = SETTINGS.height - 95;
                beat.choice.options.forEach((opt, idx) => {
                    const btn = makeButton(
                        SETTINGS.width / 2, startY + idx * 26,
                        SETTINGS.width - 80, 22,
                        opt.label,
                        () => {
                            if (opt.stat) {
                                GameState.stats[opt.stat] = (GameState.stats[opt.stat] || 0) + (opt.delta || 1);
                                renderHud();
                            }
                            if (opt.effect) opt.effect();
                            clearChoices();
                            nextBeat();
                        },
                        { fontSize: 11 }
                    );
                    layers.dialogue.add(btn);
                    choiceButtons.push(btn);
                });
                hint.setVisible(false);
            });
            return;
        }

        // Plain line
        setCharLabel(beat.speaker);
        typeOut(beat.text);
    }

    advancer.on('pointerdown', () => {
        if (choiceButtons.length > 0) return;            // wait for choice
        if (typing) {
            // Skip typing — show full text, then fire the typeOut completion
            if (typeTimer) typeTimer.remove();
            body.setText(currentFullText);
            typing = false;
            hint.setVisible(true);
            const d = typeDone;
            typeDone = null;
            if (d) d();
            return;
        }
        nextBeat();
    });

    nextBeat();
}

// ===== SET PAINTERS (each mode paints its backdrop) =====

function paintBackdrop(modeColours) {
    const p = palette();
    clearLayer('set');
    // Floor
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, SETTINGS.height/2, SETTINGS.width, SETTINGS.height, modeColours.floor ?? p.bgWarm));
    // Vignette
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, SETTINGS.height/2, SETTINGS.width, SETTINGS.height, p.bgDeep, 0.18));
}

function paintTitle() {
    paintBackdrop({ floor: palette().bgWarm });
    // Light gradient suggestion — a few horizontal bars
    const p = palette();
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 80, SETTINGS.width, 160, p.midWarm, 0.4));
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 320, SETTINGS.width, 120, p.bgDeep, 0.5));

    const title = scene.add.text(SETTINGS.width/2, 130, 'THE\nSUBSTITUTE', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '48px',
        color: '#f4e0a8',
        align: 'center',
        stroke: '#1a0e08', strokeThickness: 4,
        lineSpacing: -8
    }).setOrigin(0.5);
    layers.ui.add(title);

    const tag = scene.add.text(SETTINGS.width/2, 240,
        'A two-week placement.\nA missing teacher.\nA village that remembers.', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '12px',
        color: '#cbb892',
        align: 'center',
        lineSpacing: 4
    }).setOrigin(0.5);
    layers.ui.add(tag);
}

function paintClassroom() {
    const p = palette();
    paintBackdrop({ floor: p.bgWarm });
    // Blackboard
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 90, 380, 110, 0x1a2818).setStrokeStyle(3, 0x4a3a28));
    // Desks (three rows of small rectangles)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            const x = 130 + col * 110;
            const y = 200 + row * 60;
            layers.set.add(scene.add.rectangle(x, y, 60, 22, p.midWarm, 0.7).setStrokeStyle(1, p.ink, 0.4));
        }
    }
    // Teacher's desk
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 170, 120, 28, p.amber, 0.9).setStrokeStyle(2, p.ink));
}

function paintStaffRoom() {
    const p = palette();
    paintBackdrop({ floor: p.bgWarm });

    // Back wall
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 80, SETTINGS.width, 160, p.bgDeep, 0.6));

    // Pinboard (one notice missing — empty slot)
    const pinX = 140, pinY = 80;
    layers.set.add(scene.add.rectangle(pinX, pinY, 160, 90, p.amber, 0.85).setStrokeStyle(2, p.ink));
    // Notices
    [[pinX-50, pinY-20], [pinX+10, pinY-20], [pinX+50, pinY+10], [pinX-30, pinY+15]].forEach(([nx, ny]) => {
        layers.set.add(scene.add.rectangle(nx, ny, 28, 22, p.highlight, 0.9).setStrokeStyle(1, p.ink));
    });
    // The empty slot — Michael's notices, missing
    layers.set.add(scene.add.rectangle(pinX+30, pinY-18, 28, 22, p.bgDeep, 0.4).setStrokeStyle(1, p.ink, 0.5));

    // Kettle counter
    layers.set.add(scene.add.rectangle(SETTINGS.width - 120, 80, 200, 60, p.midWarm).setStrokeStyle(2, p.ink));
    const kettle = scene.add.rectangle(SETTINGS.width - 80, 75, 22, 32, 0x888888).setStrokeStyle(1, p.ink);
    kettle.setInteractive({ useHandCursor: true });
    kettle.on('pointerdown', () => {
        runDialogue([{ speaker: 'narration', text: "Make tea? Maybe later." }], () => paintStaffRoom());
    });
    layers.set.add(kettle);

    // Eleanor's empty chair — lavender, unmistakable, alone on the right
    const chair = scene.add.rectangle(95, 330, 38, 54, SETTINGS.characters.eleanor.colour, 0.45).setStrokeStyle(2, SETTINGS.characters.eleanor.colour);
    chair.setInteractive({ useHandCursor: true });
    chair.on('pointerover', () => chair.setStrokeStyle(3, 0xffffff));
    chair.on('pointerout', () => chair.setStrokeStyle(2, SETTINGS.characters.eleanor.colour));
    chair.on('pointerdown', () => {
        runDialogue([
            { speaker: 'narration', text: "Her chair. Empty for three weeks." },
            { speaker: 'narration', text: "Someone has been moving it back to exactly the same spot every morning." }
        ], () => paintStaffRoom());
    });
    layers.set.add(chair);

    // Floor seam
    layers.set.add(scene.add.rectangle(SETTINGS.width/2, 165, SETTINGS.width, 2, p.ink, 0.4));
}

// ===== MODES =====

function showTitle() {
    GameState.palette = 'warm';
    clearAll();
    paintTitle();

    const hasSave = GameState.hasSave();
    const btnY = SETTINGS.height - 80;

    if (hasSave) {
        layers.ui.add(makeButton(SETTINGS.width/2 - 90, btnY, 160, 32, 'BEGIN', () => {
            GameState.reset();
            GameState.save();
            startDay();
        }));
        layers.ui.add(makeButton(SETTINGS.width/2 + 90, btnY, 160, 32, 'CONTINUE', () => {
            GameState.load();
            resumeFromSave();
        }));
    } else {
        layers.ui.add(makeButton(SETTINGS.width/2, btnY, 200, 36, 'BEGIN', () => {
            GameState.reset();
            GameState.save();
            startDay();
        }, { fontSize: 14 }));
    }
}

function startDay() {
    GameState.slot = 'morning';
    GameState.save();
    showDayCard(`DAY ${GameState.day}`, dayName(GameState.day), () => showMorning());
}

function resumeFromSave() {
    // Drop the player back at the current slot's entry point
    switch (GameState.slot) {
        case 'morning':       showMorning(); break;
        case 'lunch':         showLunch(); break;
        case 'afternoon':     showAfternoon(); break;
        case 'afterschool':   showAfterSchool(); break;
        case 'dayend':        showDayEnd(); break;
        case 'staffroom':     showStaffRoom(); break;
        default:              startDay();
    }
}

function dayName(d) {
    return ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'][d-1] || '—';
}

function showDayCard(top, bottom, onDone) {
    clearAll();
    paintBackdrop({ floor: palette().bgDeep });

    const t = scene.add.text(SETTINGS.width/2, SETTINGS.height/2 - 24, top, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '36px',
        color: '#f4e0a8'
    }).setOrigin(0.5).setAlpha(0);

    const b = scene.add.text(SETTINGS.width/2, SETTINGS.height/2 + 20, bottom, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '20px',
        color: '#e8a857'
    }).setOrigin(0.5).setAlpha(0);

    layers.ui.add([t, b]);

    scene.tweens.add({ targets: [t, b], alpha: 1, duration: 600, ease: 'Sine.easeInOut' });
    scene.time.delayedCall(2200, () => {
        scene.tweens.add({
            targets: [t, b], alpha: 0, duration: 500,
            onComplete: () => onDone && onDone()
        });
    });
}

function showMorning() {
    GameState.slot = 'morning';
    GameState.save();
    clearAll();
    paintClassroom();
    addHud();

    runDialogue(DIALOGUES.day1.morning, () => {
        // Lesson plays out
        runDialogue(DIALOGUES.day1.classroom, () => {
            GameState.slot = 'staffroom';
            GameState.save();
            showStaffRoom();
        });
    });
}

function showStaffRoom() {
    clearAll();
    paintStaffRoom();
    addHud();

    // Place colleagues in the room. Spread out so name tags don't collide.
    const placements = {
        michael: [180, 230],
        loala:   [275, 250],
        nathan:  [380, 230],
        ronny:   [475, 250],
        penny:   [565, 230],
        calder:  [665, 130]    // back corner — small, unlabeled
    };

    const meetFlags = {
        michael: 'metMichael', loala: 'metLoala', nathan: 'metNathan',
        ronny: 'metRonny', penny: 'metPenny', calder: 'sawCalder'
    };

    Object.entries(placements).forEach(([charId, [x, y]]) => {
        const isCalder = charId === 'calder';
        const rect = makeCharacterRect(x, y, charId, {
            w: isCalder ? 28 : 42,
            h: isCalder ? 52 : 70,
            hideName: isCalder,
            onClick: () => {
                const intros = DIALOGUES.day1.staffroom_intros[charId];
                if (intros) {
                    runDialogue(intros, () => {
                        GameState.flags[meetFlags[charId]] = true;
                        GameState.save();
                        checkLunchReady();
                    });
                }
            }
        });
        if (isCalder) rect.setAlpha(0.85);
        layers.characters.add(rect);
    });

    // Prompt
    const allMet = ['metMichael','metLoala','metNathan','metRonny','metPenny']
        .every(f => GameState.flags[f]);
    const prompt = allMet
        ? "You've met everyone. Lunch is next — Michael wanted to show you round."
        : "Click each colleague to introduce yourself.";
    const promptText = scene.add.text(SETTINGS.width/2, SETTINGS.height - 40, prompt, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '11px',
        color: '#cbb892',
        align: 'center'
    }).setOrigin(0.5);
    layers.ui.add(promptText);

    if (allMet) {
        layers.ui.add(makeButton(SETTINGS.width/2, SETTINGS.height - 18, 180, 22,
            'CONTINUE TO LUNCH ▸', () => {
                GameState.slot = 'lunch';
                GameState.save();
                showLunch();
            }, { fontSize: 11 }));
    }
}

function checkLunchReady() {
    showStaffRoom();
}

function showLunch() {
    clearAll();
    paintStaffRoom();
    addHud();

    // Michael front and centre
    layers.characters.add(makeCharacterRect(SETTINGS.width/2 - 80, 240, 'michael', { w: 48, h: 80 }));
    layers.characters.add(makeCharacterRect(SETTINGS.width/2 + 80, 240, 'player', { w: 48, h: 80 }));

    runDialogue(DIALOGUES.day1.lunch_michael, () => {
        GameState.flags.hadLunchWithMichael = true;
        GameState.timetable[`day${GameState.day}-lunch`] = 'michael';
        GameState.slot = 'afternoon';
        GameState.save();
        showAfternoon();
    });
}

function showAfternoon() {
    GameState.slot = 'afternoon';
    GameState.save();
    clearAll();
    paintClassroom();
    addHud();

    runDialogue(DIALOGUES.day1.afternoon, () => {
        GameState.slot = 'afterschool';
        GameState.save();
        showAfterSchool();
    });
}

function showAfterSchool() {
    clearAll();
    paintStaffRoom();
    addHud();

    const title = scene.add.text(SETTINGS.width/2, 30, 'AFTER SCHOOL', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '16px',
        color: '#e8a857'
    }).setOrigin(0.5);
    layers.ui.add(title);

    const sub = scene.add.text(SETTINGS.width/2, 50, 'Who do you find?', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '11px',
        color: '#cbb892'
    }).setOrigin(0.5);
    layers.ui.add(sub);

    // Routine: Penny is unavailable after school. Spec §4 says her routine never includes after-school.
    const options = [
        { id: 'michael', available: true,  hint: 'Still at his desk' },
        { id: 'loala',   available: true,  hint: 'Out on the field' },
        { id: 'nathan',  available: true,  hint: 'Science prep room' },
        { id: 'ronny',   available: true,  hint: 'Mopping the corridor' },
        { id: 'penny',   available: false, hint: 'Left at 3:15 (Monday routine)' }
    ];

    options.forEach((opt, idx) => {
        const y = 100 + idx * 50;
        const char = SETTINGS.characters[opt.id];

        const rect = scene.add.rectangle(SETTINGS.width/2 - 120, y, 32, 40, char.colour, opt.available ? 1 : 0.3)
            .setStrokeStyle(2, opt.available ? char.colour : 0x444444);
        layers.ui.add(rect);

        const name = scene.add.text(SETTINGS.width/2 - 90, y - 8, char.name, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '12px',
            color: opt.available ? '#f4e0a8' : '#666666'
        }).setOrigin(0, 0.5);
        layers.ui.add(name);

        const hint = scene.add.text(SETTINGS.width/2 - 90, y + 8, opt.hint, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '10px',
            color: opt.available ? '#cbb892' : '#555555'
        }).setOrigin(0, 0.5);
        layers.ui.add(hint);

        if (opt.available) {
            const btn = makeButton(SETTINGS.width/2 + 140, y, 100, 28,
                'VISIT ▸',
                () => playAfterSchool(opt.id),
                { fontSize: 11 });
            layers.ui.add(btn);
        } else {
            const txt = scene.add.text(SETTINGS.width/2 + 140, y, '— UNAVAILABLE —', {
                fontFamily: 'Departure Mono, ui-monospace, monospace',
                fontSize: '10px',
                color: '#555555'
            }).setOrigin(0.5);
            layers.ui.add(txt);
        }
    });
}

function playAfterSchool(charId) {
    clearAll();
    paintStaffRoom();
    addHud();

    layers.characters.add(makeCharacterRect(SETTINGS.width/2 - 80, 220, charId, { w: 56, h: 88 }));
    layers.characters.add(makeCharacterRect(SETTINGS.width/2 + 80, 220, 'player', { w: 56, h: 88 }));

    const beats = DIALOGUES.day1.afterschool[charId];
    runDialogue(beats, () => {
        GameState.timetable[`day${GameState.day}-afterschool`] = charId;
        GameState.slot = 'dayend';
        GameState.save();
        showDayEnd();
    });
}

function showDayEnd() {
    clearAll();
    paintBackdrop({ floor: palette().bgDeep });
    addHud();

    runDialogue(DIALOGUES.day1.dayEnd, () => {
        // Tick to next day
        GameState.day++;
        GameState.slot = 'morning';
        GameState.save();
        showDayCard(`DAY ${GameState.day}`, dayName(GameState.day), () => {
            showEndOfDemo();
        });
    });
}

function showEndOfDemo() {
    clearAll();
    paintBackdrop({ floor: palette().bgDeep });

    const t = scene.add.text(SETTINGS.width/2, SETTINGS.height/2 - 40, 'END OF STAGE 1', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '24px',
        color: '#f4e0a8'
    }).setOrigin(0.5);
    layers.ui.add(t);

    const sub = scene.add.text(SETTINGS.width/2, SETTINGS.height/2, 'Day 1 complete.\nWeek 1 awaits.', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '13px',
        color: '#cbb892',
        align: 'center',
        lineSpacing: 4
    }).setOrigin(0.5);
    layers.ui.add(sub);

    layers.ui.add(makeButton(SETTINGS.width/2, SETTINGS.height/2 + 80, 200, 32,
        'BACK TO TITLE', () => showTitle()));
}

// ===== HUD (stats bar + timetable toggle) =====
function addHud() {
    renderHud();
}

function renderHud() {
    if (!layers.hud) return;
    layers.hud.removeAll(true);
    const hudY = 14;

    // Stat pips: R / C / D
    const stats = [
        { key: 'rapport',    label: 'R', col: '#c4642e' },
        { key: 'curiosity',  label: 'C', col: '#5a6b9e' },
        { key: 'discretion', label: 'D', col: '#7a6450' }
    ];

    stats.forEach((s, idx) => {
        const x = 16 + idx * 80;
        const label = scene.add.text(x, hudY, `${s.label} ${GameState.stats[s.key]}`, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '11px',
            color: s.col,
            stroke: '#000', strokeThickness: 2
        });
        layers.hud.add(label);
    });

    // Day indicator
    const dayLabel = scene.add.text(SETTINGS.width - 16, hudY,
        `DAY ${GameState.day} · ${dayName(GameState.day)}`, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '11px',
        color: '#cbb892',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0);
    layers.hud.add(dayLabel);

    // Timetable toggle button
    const tbBtn = makeButton(SETTINGS.width - 60, SETTINGS.height - 16, 100, 22,
        'TIMETABLE', () => showTimetable(), { fontSize: 10 });
    layers.hud.add(tbBtn);
}

function showTimetable() {
    const p = palette();

    // Modal layer — full overlay
    clearLayer('overlay');
    const dim = scene.add.rectangle(SETTINGS.width/2, SETTINGS.height/2,
        SETTINGS.width, SETTINGS.height, 0x000000, 0.7).setInteractive();
    layers.overlay.add(dim);

    const w = 560, h = 320;
    const panel = scene.add.rectangle(SETTINGS.width/2, SETTINGS.height/2, w, h, p.highlight, 0.97)
        .setStrokeStyle(3, p.ink);
    layers.overlay.add(panel);

    const title = scene.add.text(SETTINGS.width/2, SETTINGS.height/2 - h/2 + 20, 'TIMETABLE', {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '18px',
        color: '#1a0e08'
    }).setOrigin(0.5);
    layers.overlay.add(title);

    // 5-day grid
    const days = ['MON','TUE','WED','THU','FRI'];
    const slots = ['MORN','LUNCH','AFTER'];
    const gridX = SETTINGS.width/2 - 200;
    const gridY = SETTINGS.height/2 - 90;
    const cellW = 80, cellH = 36;

    days.forEach((d, di) => {
        const hdr = scene.add.text(gridX + di * cellW + cellW/2, gridY - 14, d, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '11px',
            color: '#1a0e08'
        }).setOrigin(0.5);
        layers.overlay.add(hdr);
    });

    slots.forEach((s, si) => {
        const lbl = scene.add.text(gridX - 36, gridY + si * cellH + cellH/2, s, {
            fontFamily: 'Departure Mono, ui-monospace, monospace',
            fontSize: '10px',
            color: '#1a0e08'
        }).setOrigin(0.5);
        layers.overlay.add(lbl);

        days.forEach((d, di) => {
            const dayN = di + 1;
            const cell = scene.add.rectangle(
                gridX + di * cellW + cellW/2,
                gridY + si * cellH + cellH/2,
                cellW - 4, cellH - 4,
                dayN === GameState.day ? p.amber : 0xeed7a8, 0.7
            ).setStrokeStyle(1, p.ink);
            layers.overlay.add(cell);

            // Fill in if used
            const slotKeys = { 0: null, 1: 'lunch', 2: 'afterschool' };
            const slotKey = slotKeys[si];
            if (slotKey) {
                const who = GameState.timetable[`day${dayN}-${slotKey}`];
                if (who) {
                    const char = SETTINGS.characters[who];
                    const dot = scene.add.rectangle(
                        gridX + di * cellW + cellW/2,
                        gridY + si * cellH + cellH/2,
                        14, 14, char.colour
                    ).setStrokeStyle(1, p.ink);
                    layers.overlay.add(dot);
                }
            }
        });
    });

    // Stats summary
    const statY = SETTINGS.height/2 + 90;
    const statText = scene.add.text(SETTINGS.width/2, statY,
        `RAPPORT ${GameState.stats.rapport}    CURIOSITY ${GameState.stats.curiosity}    DISCRETION ${GameState.stats.discretion}`, {
        fontFamily: 'Departure Mono, ui-monospace, monospace',
        fontSize: '12px',
        color: '#1a0e08'
    }).setOrigin(0.5);
    layers.overlay.add(statText);

    const closeBtn = makeButton(SETTINGS.width/2, SETTINGS.height/2 + h/2 - 24, 120, 26,
        'CLOSE', () => clearLayer('overlay'), { fontSize: 11 });
    layers.overlay.add(closeBtn);
}

// ===== BOOT =====
const game = new Phaser.Game(config);
