# Starter Pack

Free assets from [Kenney.nl](https://kenney.nl) — all CC0 (public domain), no attribution needed.

## Sprites

### platformer/
- **characters/** — walk, jump, climb, idle poses (8 sprites)
- **tiles/** — ground, platforms, decorations, hazards (65 tiles)
- **items/** — coins, gems, keys, stars, hearts (18 items)

### space/
- **ships/** — 3 player ship designs in 4 colours + 4 UFOs (16 sprites)
- **enemies/** — 5 enemy shapes in 4 colours (20 sprites)
- **lasers/** — blue and red laser bolts (8 sprites)
- **meteors/** — brown and grey, big to tiny (20 sprites)
- **powerups/** — shields, bolts, stars, pills in 4 colours (32 sprites)
- **effects/** — fire animation frames + star effects (13 sprites)

### animals/
30 cute round animals — bear, penguin, cat, dog, frog, owl, panda, etc.

### ui/
Buttons (rectangle, round, square), sliders, checkmarks (23 sprites). Blue theme.

### collectibles/
40 coin variants — different colours and sizes. Works with any game type.

## Sounds

### ui/
Clicks, confirmations, close sounds, drops, bongs (9 files, OGG format)

### game/
Lasers, power-up chimes, pitch sweeps, landing/bump impacts (11 files, OGG format)

## Using in a Game

Copy what you need into your game's sprites/ folder:
```
cp ../../starter-pack/sprites/animals/penguin.png sprites/
```

Load in Phaser:
```javascript
// in preload
this.load.image('penguin', 'sprites/penguin.png');
this.load.audio('jump', '../../starter-pack/sounds/game/highUp.ogg');

// in create
this.add.image(400, 300, 'penguin');
```
