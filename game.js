// Constants
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const GRAVITY = 0.5;
const FRICTION = 0.8;
const JUMP_STRENGTH = 12;
const PLAYER_SPEED = 5;

// Game state
let gameState = {
  stage: 0, // 0 = intro, 1-9 = stages, 10 = final stage
  activeSuns: 10,
  currentSun: null,
  environment: "scorched",
  collectedArrows: [],
  playerChoices: [], // Track moral choices for ending determination
  abilities: {
    doubleJump: false,
    timeSlowAbility: false
  }
};

// Game assets
const gameAssets = {
  player: null,
  suns: [],
  arrows: [],
  platforms: [],
  backgrounds: {},
  sprites: {},
  audio: {}
};

const sunData = [
  {
    name: "Pride",
    personality: "Arrogant and dismissive",
    environment: "barren wasteland",
    dialogues: ["My brilliance... extinguished by a mere mortal? Perhaps... we were never meant to rule over all we touched."],
    arrowName: "Arrow of Humility",
    platformStyle: "simple",
    specialChallenge: "basic aiming",
  },
  {
    name: "Greed",
    personality: "Greedy, possessive",
    environment: "scorched ruins of wealthy city",
    dialogues: ["My endless hunger leaves me... with nothing in the end. All I claimed... returns to dust... just as your gleaming treasures will."],
    arrowName: "Arrow of Sacrifice",
    platformStyle: "unstable wealth",
    specialChallenge: "moving platforms",
  },
  {
    name: "Unity & Division",
    personality: "Twin suns, interdependent",
    environment: "split-level light and dark design",
    dialogues: ["Apart, we fall... together, we might have found balance. Remember archer... what divides you ... will ultimately consume you."],
    arrowName: "Arrows of Balance",
    platformStyle: "upward movement, dual sides",
    specialChallenge: "hit both suns in sequence",
    rewardAbility: "doubleJump"
  },
  {
    name: "Denial",
    personality: "Denies damage caused",
    environment: "partially recovered landscapes with burning areas",
    dialogues: ["*whimpers* \"I see it now... too late... the truth I refused to face... reality endures even when we look away.\""],
    arrowName: "Arrow of Truth",
    platformStyle: "double jump challenges",
    specialChallenge: "deceptive platforms",
  },
  {
    name: "Anger",
    personality: "Volatile, aggressive",
    environment: "unstable terrain with erupting geysers",
    dialogues: ["My flames... extinguished. But beware, archer... righteous fury has its place... inaction... is as destructive as my heat."],
    arrowName: "Arrow of Patience",
    platformStyle: "time-limited platforms",
    specialChallenge: "time slow ability",
    environmentChange: "human settlements visible in distance",
    rewardAbility: "timeSlowAbility"
  },
  {
    name: "Deception",
    personality: "Trickster, creates illusions",
    environment: "maze-like forests with false paths",
    dialogues: ["My illusions fade... but others will rise. Truth requires... constant vigilance... how many more lies... will you allow to flourish?"],
    arrowName: "Arrow of Insight",
    platformStyle: "discerning real paths from illusions",
    specialChallenge: "multiple sun images but only one is real",
  },
  {
    name: "Chaos",
    personality: "Disruptive, constantly changing",
    environment: "floating islands with shifting gravity",
    dialogues: ["Even in my defeat... new patterns emerge. The world... will never return... to what it was. Adapt to what comes... or follow me into oblivion."],
    arrowName: "Arrow of Stability",
    platformStyle: "gravity shifts direction periodically",
    specialChallenge: "shooting while gravity shifts",
  },
  {
    name: "Fear",
    personality: "Paranoid, hides in darkness",
    environment: "dark caverns with minimal visibility",
    dialogues: ["The darkness I cast... was nothing... compared to the shadows... you cast upon your own future. Face what comes... with open eyes."],
    arrowName: "Arrow of Courage",
    platformStyle: "navigate using limited light sources",
    specialChallenge: "listen for sun's movements",

  },
  {
    name: "Sorrow",
    personality: "Youngest sun, regretful",
    environment: "beautiful but fragile crystal landscape",
    dialogues: ["I never wished for this power... I only wanted to shine upon this Earth."],
    arrowName: "Arrow of Mercy",
    platformStyle: "most challenging, all previous mechanics",
    specialChallenge: "moral choice - wound rather than destroy",
  
  }
];

// Classes
class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.lastTime = 0;
    this.accumulator = 0;
    this.timeStep = 1000 / 60; // 60 FPS
    this.scenes = {
      intro: new IntroScene(this),
      game: new GameScene(this),
      dialogue: new DialogueScene(this),
      archery: new ArcheryScene(this),
      ending: new EndingScene(this)
    };
    this.currentScene = 'intro';
    this.input = new InputHandler();
    this.camera = new Camera(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.assetLoader = new AssetLoader();
    this.soundManager = new SoundManager();
    this.debug = false;
    console.log('Game constructor called');
  }

  async init() {
    console.log('Game initialization started');
    await this.assetLoader.loadAssets();
    console.log('Assets loaded');
    this.setupGame();
    console.log('Game setup complete');
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  setupGame() {
    this.scenes.intro.setup();
    this.scenes.game.setup();
    this.scenes.dialogue.setup();
    this.scenes.archery.setup();
    this.scenes.ending.setup();
  }

  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    this.accumulator += deltaTime;
    
    while (this.accumulator >= this.timeStep) {
      this.update(this.timeStep);
      this.accumulator -= this.timeStep;
    }
    
    this.render();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    this.scenes[this.currentScene].update(deltaTime);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.scenes[this.currentScene].render(this.ctx);
  }

  changeScene(sceneName) {
    this.currentScene = sceneName;
    this.scenes[sceneName].enter();
  }
}

class InputHandler {
  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDown = false;
    
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
    });
    
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
    
    window.addEventListener('mousemove', e => {
      const rect = document.getElementById('gameCanvas').getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
    });
    
    window.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });
    
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
  }

  isKeyDown(keyCode) {
    return this.keys[keyCode] === true;
  }
}

class Camera {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.target = null;
  }

  follow(entity) {
    this.target = entity;
  }

  update() {
    if (this.target) {
      this.x = this.target.x - this.width / 2;
      this.y = this.target.y - this.height / 2;
    }
  }
}

class AssetLoader {
  constructor() {
    this.imagesToLoad = [
      { id: 'player', src: 'assets/images/sprites/player.png' },
      { id: 'background_scorched', src: 'assets/images/scorched.png' },
      // Sun sprites
      { id: 'pride', src: 'assets/images/sprites/suns/pride.png' },
      { id: 'greed', src: 'assets/images/sprites/suns/greed.png' },
      { id: 'unity', src: 'assets/images/sprites/suns/unity.png' },
      { id: 'division', src: 'assets/images/sprites/suns/division.png' },
      { id: 'denial', src: 'assets/images/sprites/suns/denial.png' },
      { id: 'anger', src: 'assets/images/sprites/suns/anger.png' },
      { id: 'deception', src: 'assets/images/sprites/suns/deception.png' },
      { id: 'chaos', src: 'assets/images/sprites/suns/chaos.png' },
      { id: 'fear', src: 'assets/images/sprites/suns/fear.png' },
      { id: 'sorrow', src: 'assets/images/sprites/suns/sorrow.png' },
      // Level backgrounds
      { id: 'bg_level_1', src: 'assets/images/backgrounds/level1.jpg' },
      { id: 'bg_level_2', src: 'assets/images/backgrounds/level2.jpg' },
      { id: 'bg_level_3', src: 'assets/images/backgrounds/level3.jpg' },
      { id: 'bg_level_4', src: 'assets/images/backgrounds/level4.jpg' },
      { id: 'bg_level_5', src: 'assets/images/backgrounds/level5.jpg' },
      { id: 'bg_level_6', src: 'assets/images/backgrounds/level6.jpg' },
      { id: 'bg_level_7', src: 'assets/images/backgrounds/level7.jpg' },
      { id: 'bg_level_8', src: 'assets/images/backgrounds/level8.jpg' },
      { id: 'bg_level_9', src: 'assets/images/backgrounds/level9.jpg' }
    ];
    
    this.audioToLoad = [
      { id: 'bgm_intro', src: 'assets/audio/intro.mp3' },
      { id: 'shoot_arrow', src: 'assets/audio/shoot.mp3' },
    ];
  }

  async loadAssets() {
    console.log('Loading assets...');
    const imagePromises = this.imagesToLoad.map(img => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          gameAssets.sprites[img.id] = image;
          console.log(`Loaded image: ${img.src}`);
          resolve();
        };
        image.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          // Fall back to a placeholder for development
          image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
          gameAssets.sprites[img.id] = image;
          resolve();
        };
        image.src = img.src;
      });
    });

    const audioPromises = this.audioToLoad.map(audio => {
      return new Promise((resolve, reject) => {
        const sound = new Audio();
        sound.oncanplaythrough = () => {
          gameAssets.audio[audio.id] = sound;
          console.log(`Loaded audio: ${audio.src}`);
          resolve();
        };
        sound.onerror = () => {
          console.error(`Failed to load audio: ${audio.src}`);
          resolve();
        };
        sound.src = audio.src;
      });
    });

    await Promise.all([...imagePromises, ...audioPromises]);
    console.log('All assets loaded');
  }
}

class SoundManager {
  constructor() {
    this.currentBgm = null;
    this.sfxVolume = 0.5;
    this.bgmVolume = 0.3;
    this.muted = false;
  }

  playBgm(id) {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
    }
    
    const audio = gameAssets.audio[id];
    if (audio) {
      audio.loop = true;
      audio.volume = this.muted ? 0 : this.bgmVolume;
      audio.play();
      this.currentBgm = audio;
    }
  }

  playSfx(id) {
    const audio = gameAssets.audio[id];
    if (audio) {
      const sound = audio.cloneNode();
      sound.volume = this.muted ? 0 : this.sfxVolume;
      sound.play();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.currentBgm) {
      this.currentBgm.volume = this.muted ? 0 : this.bgmVolume;
    }
  }
}

// Scene classes
class Scene {
  constructor(game) {
    this.game = game;
  }

  setup() {}
  enter() {}
  update(deltaTime) {}
  render(ctx) {}
}

class IntroScene extends Scene {
  constructor(game) {
    super(game);
    this.frames = [];
    this.currentFrame = 0;
    this.frameDelay = 2000; // 3 seconds per frame
    this.timer = 0;
    this.introText = [
      "The TEN SONS transform into suns, filling the sky",
      "JADE EMPEROR watches in horror as the world below begins to scorch",
      "JADE EMPEROR contemplates what must be done",
      "JADE EMPEROR summons HOUYI",
      "HOUYI kneels, accepting his duty with very visible reluctance"
    ];
  }

  setup() {

    this.introText.forEach((text, index) => {
      this.frames.push({
        text,
        render: (ctx) => {
          // Draw background
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
          
          // Draw text
          ctx.fillStyle = 'white';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(text, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        }
      });
    });
  }

  enter() {
    this.currentFrame = 0;
    this.timer = 0;
    this.game.soundManager.playBgm('bgm_intro');
  }

  update(deltaTime) {
    this.timer += deltaTime;
    
    if (this.timer >= this.frameDelay) {
      this.timer = 0;
      this.currentFrame++;
      
      if (this.currentFrame >= this.frames.length) {
        this.game.changeScene('game');
      }
    }
    
    // Skip intro if any key is pressed
    if (Object.values(this.game.input.keys).some(key => key)) {
      this.game.changeScene('game');
    }
  }

  render(ctx) {
    if (this.currentFrame < this.frames.length) {
      this.frames[this.currentFrame].render(ctx);
    }
  }
}

class GameScene extends Scene {
  constructor(game) {
    super(game);
    this.player = null;
    this.platforms = [];
    this.collectibles = [];
    this.enemies = [];
    this.backgroundLayers = [];
    this.currentStage = 0;
  }

  setup() {
    this.player = new Player(100, 300);
    this.loadStage(1); // Start with stage 1 (Pride)
  }

  enter() {
    gameState.stage = this.currentStage;
    this.game.soundManager.playBgm(`bgm_stage_${this.currentStage}`);
  }

  loadStage(stageNumber) {
    if (stageNumber < 1 || stageNumber > 9) return;
    
    this.currentStage = stageNumber;
    
    // Clear previous stage elements
    this.platforms = [];
    this.collectibles = [];
    this.enemies = [];
    
    const stageData = sunData[stageNumber - 1];
    gameState.currentSun = stageData;
    
    // Setting up environment based on stage data
    this.backgroundLayers = this.createBackgroundLayers(stageData.environment);
    
    // Create platforms based on stage difficulty and style
    this.platforms = this.generatePlatforms(stageData.platformStyle);
    
    // Place the arrow collectible above the last reachable platform
    const lastPlatform = this.platforms[this.platforms.length - 1];
    const arrowX = lastPlatform.x + lastPlatform.width / 2 - 15; // Centered on the platform
    const arrowY = lastPlatform.y - 50; // Slightly above the platform
    this.collectibles.push(new Arrow(arrowX, arrowY, stageData.arrowName, stageNumber));
    
    // Create sun enemy
    if (stageData.name === "Unity & Division") {
      // Special case for twin suns
      this.enemies.push(new Sun(GAME_WIDTH - 150, 150, 3, "left"));  // Always use 3 for Unity & Division
      this.enemies.push(new Sun(GAME_WIDTH - 50, 150, 3, "right"));  // Always use 3 for Unity & Division
    } else {
      this.enemies.push(new Sun(GAME_WIDTH - 100, 150, stageNumber));
    }
    
    // Adjust player spawn position to avoid spawning under the first platform
    this.player.x = 100;
    this.player.y = GAME_HEIGHT - 150; // Spawn above the ground
    
    // Update game state
    gameState.stage = stageNumber;
  }

  createBackgroundLayers(environmentType) {
    const layers = [];
    
    const currentLevel = this.currentStage;
    const bgImage = gameAssets.sprites[`bg_level_${currentLevel}`];
    
    if (bgImage) {
      layers.push({
        image: bgImage,
        scrollFactor: 0.1,
        x: 0,
        y: 0
      });
    } else {
      // Fallback to default background if image not found
      console.warn(`Background image for level ${currentLevel} not found, using fallback`);
      layers.push({
        image: gameAssets.sprites.background_scorched,
        scrollFactor: 0.1,
        x: 0,
        y: 0
      });
    }
    
    return layers;
  }

  generatePlatforms(platformStyle) {
    const platforms = [];

    // Base platform (ground)
    platforms.push(new Platform(0, GAME_HEIGHT - 50, GAME_WIDTH, 50));

    // Add platforms based on the style
    switch (platformStyle) {
      case "simple":
        // Easy platforms for early levels
        platforms.push(new Platform(200, 600, 200, 30));
        platforms.push(new Platform(450, 500, 200, 30));
        platforms.push(new Platform(700, 400, 200, 30));
        platforms.push(new Platform(950, 300, 200, 30));
        break;
      case "unstable wealth":
        // Introduce moving platforms
        platforms.push(new MovingPlatform(200, 600, 150, 30, 200, 400, 1));
        platforms.push(new MovingPlatform(500, 500, 150, 30, 500, 350, 1.5));
        platforms.push(new MovingPlatform(800, 400, 150, 30, 800, 250, 2));
        break;
      case "upward movement, dual sides":
        // Smaller platforms with larger gaps
        platforms.push(new Platform(100, 600, 120, 20)); // Left side
        platforms.push(new Platform(300, 520, 120, 20));
        platforms.push(new Platform(500, 440, 120, 20));
        platforms.push(new Platform(700, 360, 120, 20)); // Right side
        platforms.push(new Platform(900, 280, 120, 20));
        break;
      case "double jump challenges":
        // Platforms requiring double jump ability
        platforms.push(new Platform(200, 600, 100, 20));
        platforms.push(new Platform(400, 500, 100, 20));
        platforms.push(new Platform(600, 400, 100, 20));
        platforms.push(new Platform(800, 300, 100, 20));
        platforms.push(new Platform(1000, 200, 100, 20));
        break;
      case "time-limited platforms":
        // Moving platforms with tight timing
        platforms.push(new MovingPlatform(200, 600, 100, 20, 200, 400, 1.5));
        platforms.push(new MovingPlatform(500, 500, 100, 20, 500, 350, 2));
        platforms.push(new MovingPlatform(800, 400, 100, 20, 800, 250, 2.5));
        break;
      case "discerning real paths from illusions":
        // Adjusted platform layout for stage 6
        // Create a clear path with some decoy platforms
        platforms.push(new Platform(200, 600, 150, 30)); // Real platform
        platforms.push(new Platform(400, 500, 150, 30)); // Real platform
        platforms.push(new Platform(600, 400, 150, 30)); // Real platform
        platforms.push(new Platform(800, 300, 150, 30)); // Real platform
        platforms.push(new Platform(1000, 200, 150, 30)); // Real platform
        
        // Add some decoy platforms that look tempting but are too far to reach
        platforms.push(new Platform(300, 550, 100, 20)); // Decoy - too far right
        platforms.push(new Platform(500, 450, 100, 20)); // Decoy - too far right
        platforms.push(new Platform(700, 350, 100, 20)); // Decoy - too far right
        platforms.push(new Platform(900, 250, 100, 20)); // Decoy - too far right
        
        // Add some decoy platforms that look reachable but are too high
        platforms.push(new Platform(250, 450, 100, 20)); // Decoy - too high
        platforms.push(new Platform(450, 350, 100, 20)); // Decoy - too high
        platforms.push(new Platform(650, 250, 100, 20)); // Decoy - too high
        platforms.push(new Platform(850, 150, 100, 20)); // Decoy - too high
        
        //idk what happened i forgot
        const lastPlatform = platforms[4]; // The last real platform
        const arrowX = lastPlatform.x + lastPlatform.width / 2 - 15;
        const arrowY = lastPlatform.y - 50;
        this.collectibles.push(new Arrow(arrowX, arrowY, "Arrow of Insight", 6));
        break;
      case "gravity shifts direction periodically":
        // Platforms with shifting gravity
        platforms.push(new MovingPlatform(200, 600, 100, 20, 200, 400, 1.5));
        platforms.push(new MovingPlatform(500, 500, 100, 20, 500, 350, 2));
        platforms.push(new MovingPlatform(800, 400, 100, 20, 800, 250, 2.5));
        break;
      case "most challenging, all previous mechanics":
        // Combine all mechanics for the final stage
        platforms.push(new MovingPlatform(200, 600, 80, 20, 200, 400, 2));
        platforms.push(new MovingPlatform(400, 500, 80, 20, 400, 300, 2.5));
        platforms.push(new Platform(600, 400, 80, 20));
        platforms.push(new MovingPlatform(800, 300, 80, 20, 800, 200, 3));
        platforms.push(new Platform(1000, 200, 80, 20));
        break;
      default:
        // Default fallback
        platforms.push(new Platform(200, 600, 150, 30));
        platforms.push(new Platform(400, 500, 150, 30));
        platforms.push(new Platform(600, 400, 150, 30));
        platforms.push(new Platform(800, 300, 150, 30));
    }

    for (let i = 1; i < platforms.length; i++) {
      const prev = platforms[i - 1];
      const curr = platforms[i];
      const maxJumpHeight = JUMP_STRENGTH * JUMP_STRENGTH / (2 * GRAVITY);
      const maxJumpDistance = PLAYER_SPEED * (2 * Math.sqrt(2 * maxJumpHeight / GRAVITY));

      if (curr.y - prev.y > maxJumpHeight || Math.abs(curr.x - prev.x) > maxJumpDistance) {
        console.warn("Platform placement exceeds jump physics limits. Adjusting...");
        curr.y = prev.y - maxJumpHeight + 50; //
        curr.x = prev.x + Math.min(maxJumpDistance, curr.x - prev.x); 
      }
    }

    return platforms;
  }

  update(deltaTime) {
    // Update player
    this.player.update(deltaTime, this.platforms, this.game.input);
    
    // Update camera
    this.game.camera.follow(this.player);
    this.game.camera.update();
    
    // Update platforms
    this.platforms.forEach(platform => platform.update(deltaTime));
    
    // Update collectibles and check collection
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];
      collectible.update(deltaTime);
      
      if (this.checkCollision(this.player, collectible)) {
        if (collectible instanceof Arrow) {
          // Collect arrow
          gameState.collectedArrows.push(collectible.arrowType);
          this.game.soundManager.playSfx('collect_arrow');
          
          // check if it's a special arrow that grants ability
          const currentStageData = sunData[this.currentStage - 1];
          if (currentStageData.rewardAbility) {
            gameState.abilities[currentStageData.rewardAbility] = true;
          }
          
          // switch to archery scene to shoot the sun
          this.game.changeScene('archery');
        }
        
        this.collectibles.splice(i, 1);
      }
    }
    
    // Update enemies
    this.enemies.forEach(enemy => enemy.update(deltaTime));
  }

  render(ctx) {
    // Apply camera transform
    ctx.save();
    ctx.translate(-this.game.camera.x, -this.game.camera.y);
    
    // Render background layers (parallax)
    this.backgroundLayers.forEach(layer => {
      ctx.drawImage(
        layer.image, 
        layer.x + this.game.camera.x * layer.scrollFactor, 
        layer.y,
        GAME_WIDTH,
        GAME_HEIGHT
      );
    });
    
    // Render platforms
    this.platforms.forEach(platform => platform.render(ctx));
    
    // Render collectibles
    this.collectibles.forEach(collectible => collectible.render(ctx));
    
    // Render enemies
    this.enemies.forEach(enemy => enemy.render(ctx));
    
    // Render player
    this.player.render(ctx);
    
    ctx.restore();
    
    // UI elements (not affected by camera)
    this.renderUI(ctx);
  }

  renderUI(ctx) {
    // Display current stage
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Stage ${this.currentStage}: ${sunData[this.currentStage - 1].name}`, 20, 30);
    
    // Display abilities
    ctx.font = '16px Arial';
    if (gameState.abilities.doubleJump) {
      ctx.fillText('Double Jump: Available', 20, 60);
    }
    if (gameState.abilities.timeSlowAbility) {
      ctx.fillText('Time Slow: Available', 20, 80);
    }
  }

  checkCollision(objA, objB) {
    return (
      objA.x < objB.x + objB.width &&
      objA.x + objA.width > objB.x &&
      objA.y < objB.y + objB.height &&
      objA.y + objA.height > objB.y
    );
  }
}

class ArcheryScene extends Scene {
  constructor(game) {
    super(game);
    this.sun = null;
    this.bow = {
      x: 100,
      y: GAME_HEIGHT / 2,
      angle: 0
    };
    this.arrow = null;
    this.arrowFired = false;
    this.arrowSpeed = 10;
    this.drawStrength = 0; // For arrow power
    this.isDrawing = false;
    this.maxDrawStrength = 100;
    this.drawRate = 1; // How fast the bow draws
    this.targetReticle = { x: 0, y: 0 };
    this.timeSlowActive = false;
    this.timeSlowFactor = 0.5; // Half speed when time slow is active
    this.timeSlowDuration = 5000; // 5 seconds
    this.timeSlowTimer = 0;
  }

  setup() {
    // Will be initialized when entering the scene
  }

  enter() {
    const stageData = sunData[gameState.stage - 1];
    
    // Create sun based on current stage
    if (stageData.name === "Unity & Division") {
      // Twin suns
      this.suns = [
        new Sun(GAME_WIDTH - 200, GAME_HEIGHT / 2 - 50, 3, "left"),  // Always use 3 for Unity & Division
        new Sun(GAME_WIDTH - 200, GAME_HEIGHT / 2 + 50, 3, "right") // Always use 3 for Unity & Division
      ];
      this.sunsHit = [false, false]; // Track which sun was hit
    } else {
      // Single sun - use the actual stage number
      this.suns = [new Sun(GAME_WIDTH - 200, GAME_HEIGHT / 2, gameState.stage)];
      this.sunsHit = [false];
    }
    
    // Reset arrow state
    this.arrow = null;
    this.arrowFired = false;
    this.drawStrength = 0;
    this.isDrawing = false;
    this.timeSlowActive = false;
    this.timeSlowTimer = 0;
    
    // Play archery scene music
    this.game.soundManager.playBgm('bgm_archery');
  }

  update(deltaTime) {
    // Apply time slow effect if active
    let adjustedDeltaTime = deltaTime;
    if (this.timeSlowActive) {
      adjustedDeltaTime *= this.timeSlowFactor;
      this.timeSlowTimer += deltaTime;
      
      if (this.timeSlowTimer >= this.timeSlowDuration) {
        this.timeSlowActive = false;
      }
    }
    
    // Update bow position based on mouse position
    const mouseY = this.game.input.mousePosition.y;
    this.bow.y = Math.max(50, Math.min(GAME_HEIGHT - 50, mouseY));
    
    // Calculate angle to mouse position
    const dx = this.game.input.mousePosition.x - this.bow.x;
    const dy = this.game.input.mousePosition.y - this.bow.y;
    this.bow.angle = Math.atan2(dy, dx);
    
    // Update target reticle
    this.targetReticle.x = this.game.input.mousePosition.x;
    this.targetReticle.y = this.game.input.mousePosition.y;
    
    // Handle drawing and firing arrow
    if (this.game.input.mouseDown && !this.arrowFired && !this.isDrawing) {
      // Start drawing bow
      this.isDrawing = true;
    }
    
    if (this.isDrawing) {
      // Increase draw strength while mouse is down
      this.drawStrength = Math.min(this.maxDrawStrength, this.drawStrength + this.drawRate * adjustedDeltaTime / 16);
      
      if (!this.game.input.mouseDown) {
        // Fire arrow when mouse is released
        this.arrowFired = true;
        this.isDrawing = false;
        
        // Create arrow with calculated velocity
        const arrowVelocityX = Math.cos(this.bow.angle) * (this.arrowSpeed * (this.drawStrength / this.maxDrawStrength));
        const arrowVelocityY = Math.sin(this.bow.angle) * (this.arrowSpeed * (this.drawStrength / this.maxDrawStrength));
        
        this.arrow = {
          x: this.bow.x + Math.cos(this.bow.angle) * 30,
          y: this.bow.y + Math.sin(this.bow.angle) * 30,
          width: 30,
          height: 5,
          angle: this.bow.angle,
          velocityX: arrowVelocityX,
          velocityY: arrowVelocityY
        };
        
        // Play arrow sound
        this.game.soundManager.playSfx('shoot_arrow');
      }
    }
    
    // Update arrow position if fired
    if (this.arrowFired && this.arrow) {
      this.arrow.x += this.arrow.velocityX;
      this.arrow.y += this.arrow.velocityY;
      
      // Check collision with suns
      this.suns.forEach((sun, index) => {
        if (!this.sunsHit[index] && this.checkCollision(this.arrow, sun)) {
          this.sunsHit[index] = true;
          this.game.soundManager.playSfx('sun_hit');
          
          // Check if all suns have been hit
          if (this.sunsHit.every(hit => hit)) {
            // Show dialogue before proceeding
            this.game.changeScene('dialogue');
          }
        }
      });
      
      // Check if arrow is out of bounds
      if (
        this.arrow.x < 0 || 
        this.arrow.x > GAME_WIDTH || 
        this.arrow.y < 0 || 
        this.arrow.y > GAME_HEIGHT
      ) {
        // Reset arrow if missed
        this.arrowFired = false;
        this.arrow = null;
        this.drawStrength = 0;
      }
    }
    
    // Activate time slow ability if available and pressed
    if (
      gameState.abilities.timeSlowAbility && 
      this.game.input.isKeyDown('Space') && 
      !this.timeSlowActive
    ) {
      this.timeSlowActive = true;
      this.timeSlowTimer = 0;
      this.game.soundManager.playSfx('time_slow');
    }
    
    // Update suns
    this.suns.forEach(sun => sun.update(adjustedDeltaTime));
  }

  render(ctx) {
    // Draw background
    ctx.fillStyle = '#001133'; // Dark sky color
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw suns
    this.suns.forEach(sun => sun.render(ctx));
    
    // Draw bow
    ctx.save();
    ctx.translate(this.bow.x, this.bow.y);
    ctx.rotate(this.bow.angle);
    
    // Draw bow string and handle
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(25, 0);
    ctx.lineTo(0, 20);
    ctx.stroke();
    
    // Draw bow string with tension
    const stringTension = (this.drawStrength / this.maxDrawStrength) * -15;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(stringTension, 0, 0, 20);
    ctx.stroke();
       
    ctx.restore();
    
    // Draw arrow if fired
    if (this.arrow) {
      ctx.save();
      ctx.translate(this.arrow.x, this.arrow.y);
      ctx.rotate(this.arrow.angle);
      ctx.fillStyle = 'white';
      ctx.fillRect(-5, -2, 30, 4);
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(15, -5);
      ctx.lineTo(15, 5);
      ctx.fill();
      ctx.restore();
    }
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Stage ${gameState.stage}: ${sunData[gameState.stage - 1].name}`, 20, 30);
    ctx.fillText(`Arrow: ${sunData[gameState.stage - 1].arrowName}`, 20, 60);
    
    // Draw power meter when drawing bow
    if (this.isDrawing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(50, GAME_HEIGHT - 30, 200, 20);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(50, GAME_HEIGHT - 30, 200 * (this.drawStrength / this.maxDrawStrength), 20);
    }
  }

  checkCollision(objA, objB) {
    return (
      objA.x < objB.x + objB.width &&
      objA.x + objA.width > objB.x &&
      objA.y < objB.y + objB.height &&
      objA.y + objA.height > objB.y
    );
  }
}

class DialogueScene extends Scene {
  constructor(game) {
    super(game);
    this.dialogues = [];
    this.currentDialogueIndex = 0;
    this.textSpeed = 30; // ms per character
    this.displayedText = "";
    this.textTimer = 0;
    this.isTextComplete = false;
  }

  enter() {
    const stageData = sunData[gameState.stage - 1];
    this.dialogues = stageData.dialogues.length > 0 ? 
                    stageData.dialogues : 
                    ["The sun shimmers and fades as your arrow finds its mark."];
    
    this.currentDialogueIndex = 0;
    this.displayedText = "";
    this.textTimer = 0;
    this.isTextComplete = false;
  }

  update(deltaTime) {
    if (this.currentDialogueIndex >= this.dialogues.length) {
      // Special case for final stage (Sorrow)
      if (gameState.stage === 9) {
        this.showMoralChoice();
      } else {
        // Move to next stage or end game if all stages completed
        if (gameState.stage < 9) {
          this.game.scenes.game.loadStage(gameState.stage + 1);
          this.game.changeScene('game');
        } else {
          this.game.changeScene('ending');
        }
      }
      return;
    }

    // Text typing effect
    if (!this.isTextComplete) {
      this.textTimer += deltaTime;
      const currentDialogue = this.dialogues[this.currentDialogueIndex];
      const charactersToShow = Math.floor(this.textTimer / this.textSpeed);
      
      if (charactersToShow < currentDialogue.length) {
        this.displayedText = currentDialogue.substring(0, charactersToShow);
      } else {
        this.displayedText = currentDialogue;
        this.isTextComplete = true;
      }
    }
    
    // Advance dialogue on click
    if (this.isTextComplete && this.game.input.mouseDown) {
      this.currentDialogueIndex++;
      this.displayedText = "";
      this.textTimer = 0;
      this.isTextComplete = false;
    }
  }

  render(ctx) {
    // Draw background with dimming effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Render dialogue box
    ctx.fillStyle = 'rgba(50, 50, 70, 0.8)';
    ctx.fillRect(100, GAME_HEIGHT - 200, GAME_WIDTH - 200, 150);
    
    // Render border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, GAME_HEIGHT - 200, GAME_WIDTH - 200, 150);
    
    // Render text
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    this.wrapText(ctx, this.displayedText, 120, GAME_HEIGHT - 170, GAME_WIDTH - 240, 25);
    
    // Show prompt to continue when text is complete
    if (this.isTextComplete) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + Math.sin(Date.now() / 300) * 0.5) + ')';
      ctx.font = '16px Arial';
      ctx.fillText('Click to continue...', GAME_WIDTH - 230, GAME_HEIGHT - 70);
    }
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, y);
  }

  showMoralChoice() {
    // Create moral choice UI
    const choices = [
      { text: "Destroy the Sun of Sorrow completely", value: "destroy" },
      { text: "Wound the Sun of Sorrow, allowing it to remain as a gentler sun", value: "spare" }
    ];
    
    // Create an overlay for the choices
    const choiceOverlay = document.createElement('div');
    choiceOverlay.style.position = 'fixed';
    choiceOverlay.style.top = '0';
    choiceOverlay.style.left = '0';
    choiceOverlay.style.width = '100%';
    choiceOverlay.style.height = '100%';
    choiceOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    choiceOverlay.style.display = 'flex';
    choiceOverlay.style.flexDirection = 'column';
    choiceOverlay.style.justifyContent = 'center';
    choiceOverlay.style.alignItems = 'center';
    choiceOverlay.style.zIndex = '9999';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Choose Your Path';
    title.style.color = 'white';
    title.style.marginBottom = '20px';
    title.style.fontSize = '24px';
    choiceOverlay.appendChild(title);
    
    // Add context
    const context = document.createElement('p');
    context.textContent = 'The Sun of Sorrow looks upon you with resigned acceptance. What will you do?';
    context.style.color = 'white';
    context.style.marginBottom = '40px';
    context.style.maxWidth = '600px';
    context.style.textAlign = 'center';
    context.style.fontSize = '18px';
    choiceOverlay.appendChild(context);
    
    // Add buttons for each choice
    choices.forEach(choice => {
      const button = document.createElement('button');
      button.textContent = choice.text;
      button.style.padding = '15px 30px';
      button.style.marginBottom = '15px';
      button.style.fontSize = '16px';
      button.style.width = '400px';
      button.style.backgroundColor = '#444';
      button.style.border = '2px solid #666';
      button.style.color = 'white';
      button.style.cursor = 'pointer';
      button.style.position = 'relative';
      button.style.zIndex = '10000';
      
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#666';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#444';
      });
      
      button.addEventListener('click', () => {
        gameState.playerChoices.push(choice.value);
        document.body.removeChild(choiceOverlay);
        
        if (choice.value === "spare") {
          gameState.activeSuns = 2; // One remains (the Sun of Sorrow)
        } else {
          gameState.activeSuns = 1; // Only one sun remains (the player's favored sun)
        }
        
        this.game.changeScene('ending');
      });
      
      choiceOverlay.appendChild(button);
    });
    
    document.body.appendChild(choiceOverlay);
  }
}

class EndingScene extends Scene {
  constructor(game) {
    super(game);
    this.endingTexts = {
      harsh: [
        "The skies clear as the last sun falls. Only one remains - barely enough to sustain life.",
        "The Jade Emperor looks upon your work with mixed feelings.",
        "The world is no longer scorched, but winter grips many lands.",
        "You are celebrated as a hero, but also feared for your power.",
        "Some believe you went too far. The balance seems... precarious."
      ],
      balanced: [
        "With the Sun of Sorrow wounded but alive, a gentler light shines upon the Earth.",
        "The Jade Emperor nods with approval at your wisdom.",
        "Life flourishes in the newfound balance between sun and shade.",
        "Your name becomes synonymous with mercy and judgment in equal measure.",
        "Future generations will speak of Houyi who understood that some destruction gives way to creation."
      ]
    };
    this.currentTextIndex = 0;
    this.textSpeed = 30;
    this.displayedText = "";
    this.textTimer = 0;
    this.fadeValue = 0;
    this.isFadingIn = true;
  }
  
  setup() {
    // Nothing to set up initially
  }
  
  enter() {
    this.currentTextIndex = 0;
    this.displayedText = "";
    this.textTimer = 0;
    this.isTextComplete = false;
    this.fadeValue = 0;
    this.isFadingIn = true;
    
    // Play ending music
    this.game.soundManager.playBgm('bgm_ending');
  }
  
  update(deltaTime) {
    // Handle fading
    if (this.isFadingIn) {
      this.fadeValue = Math.min(1, this.fadeValue + 0.005 * deltaTime / 16);
      if (this.fadeValue >= 1) {
        this.isFadingIn = false;
      }
    }
    
    // Determine which ending based on player choices
    const endingType = gameState.activeSuns === 1 ? 'harsh' : 'balanced';
    const endingTexts = this.endingTexts[endingType];
    
    // Text typing effect
    if (!this.isTextComplete) {
      this.textTimer += deltaTime;
      const currentText = endingTexts[this.currentTextIndex];
      const charactersToShow = Math.floor(this.textTimer / this.textSpeed);
      
      if (charactersToShow < currentText.length) {
        this.displayedText = currentText.substring(0, charactersToShow);
      } else {
        this.displayedText = currentText;
        this.isTextComplete = true;
      }
    }
    
    // Advance text on click
    if (this.isTextComplete && this.game.input.mouseDown) {
      this.currentTextIndex++;
      
      if (this.currentTextIndex >= endingTexts.length) {
        // Show credits or restart
        this.showCredits();
      } else {
        this.displayedText = "";
        this.textTimer = 0;
        this.isTextComplete = false;
        this.isFadingIn = true;
        this.fadeValue = 0;
      }
    }
  }
  
  render(ctx) {
    // Determine background based on ending
    const endingType = gameState.activeSuns === 1 ? 'harsh' : 'balanced';
    
    // Draw background
    let bgColor;
    if (endingType === 'harsh') {
      bgColor = 'rgba(80, 100, 130, 1)'; // Colder, harsher blue
    } else {
      bgColor = 'rgba(120, 150, 180, 1)'; // Warmer, more balanced blue
    }
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw sun(s) based on ending
    if (endingType === 'harsh') {
      // Draw one distant sun
      ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2, 100, 40, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw two suns - one normal, one diminished
      ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2 - 80, 100, 40, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 180, 120, 0.6)';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2 + 80, 120, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw text with fade effect
    ctx.fillStyle = `rgba(255, 255, 255, ${this.fadeValue})`;
    ctx.font = '20px Arial';
    this.wrapText(ctx, this.displayedText, 100, 250, GAME_WIDTH - 200, 30);
    
    // Show prompt to continue when text is complete
    if (this.isTextComplete) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + Math.sin(Date.now() / 300) * 0.5) + ')';
      ctx.font = '16px Arial';
      ctx.fillText('Click to continue...', GAME_WIDTH - 200, GAME_HEIGHT - 50);
    }
  }
  
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, y);
  }

  showCredits() {
    // Implementation of showing credits
  }
}

// Game Entity Classes
class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocityX = 0;
    this.velocityY = 0;
  }
  
  update(deltaTime) {
    this.x += this.velocityX;
    this.y += this.velocityY;
  }
  
  render(ctx) {
    // Debug rendering
    ctx.strokeStyle = 'red';
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, 40, 60);
    this.isGrounded = false;
    this.isJumping = false;
    this.canDoubleJump = false;
    this.jumpCount = 0;
    this.direction = 1; // 1 right, -1 left
    this.sprite = gameAssets.sprites.player;
    this.currentAnimationFrame = 0;
    this.animationTimer = 0;
    this.state = 'idle'; // idle, running, jumping, falling
    this.spriteScale = 2; // Scale the 30x28 sprite to 60x56
  }
  
  update(deltaTime, platforms, input) {
    // Apply gravity
    this.velocityY += GRAVITY;
    
    // Horizontal movement
    this.velocityX = 0;
    
    if (input.isKeyDown('ArrowLeft')) {
      this.velocityX = -PLAYER_SPEED;
      this.direction = -1;
      this.state = 'running';
    }
    else if (input.isKeyDown('ArrowRight')) {
      this.velocityX = PLAYER_SPEED;
      this.direction = 1;
      this.state = 'running';
    }
    else {
      this.state = this.isGrounded ? 'idle' : this.state;
    }
    
    // Jump logic
    if (input.isKeyDown('ArrowUp') || input.isKeyDown('Space')) {
      // Initial jump
      if (this.isGrounded && !this.isJumping) {
        this.velocityY = -JUMP_STRENGTH;
        this.isGrounded = false;
        this.isJumping = true;
        this.jumpCount = 1;
        this.state = 'jumping';
      }
      // Double jump if ability is unlocked
      else if (!this.isGrounded && this.isJumping && 
              gameState.abilities.doubleJump && 
              this.jumpCount === 1 && 
              input.isKeyDown('ArrowUp')) {
        this.velocityY = -JUMP_STRENGTH * 0.8;
        this.jumpCount = 2;
      }
    }
    
    // Release jump key resets jump state
    if (!input.isKeyDown('ArrowUp') && !input.isKeyDown('Space')) {
      this.isJumping = false;
    }
    
    // Apply friction to horizontal movement
    this.velocityX *= FRICTION;
    
    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    // Platform collision
    this.isGrounded = false;
    platforms.forEach(platform => {
      if (this.checkCollision(platform)) {
        this.resolveCollision(platform);
      }
    });
    
    // Ensure player stays within the new screen boundaries
    this.x = Math.max(0, Math.min(this.x, GAME_WIDTH - this.width));
    this.y = Math.max(0, Math.min(this.y, GAME_HEIGHT - this.height));
    
    // Update animation
    this.updateAnimation(deltaTime);
    
    // Update player state based on vertical velocity
    if (this.velocityY > 1) {
      this.state = 'falling';
    }
    else if (this.velocityY < -1) {
      this.state = 'jumping';
    }
    else if (this.isGrounded && Math.abs(this.velocityX) < 0.5) {
      this.state = 'idle';
    }
  }
  
  checkCollision(platform) {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    );
  }
  
  resolveCollision(platform) {
    // Get overlap amounts
    const overlapLeft = this.x + this.width - platform.x;
    const overlapRight = platform.x + platform.width - this.x;
    const overlapTop = this.y + this.height - platform.y;
    const overlapBottom = platform.y + platform.height - this.y;
    
    // Find the smallest overlap
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    
    // Resolve collision based on smallest overlap
    if (minOverlap === overlapTop && this.velocityY >= 0) {
      // Landing on top of platform
      this.y = platform.y - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    }
    else if (minOverlap === overlapBottom && this.velocityY <= 0) {
      // Hitting bottom of platform
      this.y = platform.y + platform.height;
      this.velocityY = 0;
    }
    else if (minOverlap === overlapLeft && this.velocityX > 0) {
      // Hitting left side of platform
      this.x = platform.x - this.width;
      this.velocityX = 0;
    }
    else if (minOverlap === overlapRight && this.velocityX < 0) {
      // Hitting right side of platform
      this.x = platform.x + platform.width;
      this.velocityX = 0;
    }
  }
  
  updateAnimation(deltaTime) {
    // Update animation frame
    this.animationTimer += deltaTime;
    
    let frameRate = 125; // ms per frame
    
    if (this.state === 'running') {
      frameRate = 100;
    }
    else if (this.state === 'jumping' || this.state === 'falling') {
      frameRate = 200;
    }
    
    if (this.animationTimer >= frameRate) {
      this.currentAnimationFrame = (this.currentAnimationFrame + 1) % 4; // 4 frames per animation
      this.animationTimer = 0;
    }
  }
  
  render(ctx) {
    if (this.sprite) {
      ctx.save();
      
      // Calculate dimensions maintaining aspect ratio
      const scaledWidth = 30 * this.spriteScale;
      const scaledHeight = 28 * this.spriteScale;
      
      // Center the sprite within the entity's bounds
      const offsetX = (this.width - scaledWidth) / 2;
      const offsetY = (this.height - scaledHeight) / 2;
      
      // Flip the sprite if facing left
      if (this.direction < 0) {
        ctx.scale(-1, 1);
        ctx.translate(-this.x - this.width, this.y);
      } else {
        ctx.translate(this.x, this.y);
      }
      
      // Draw the sprite scaled up while maintaining aspect ratio
      ctx.drawImage(
        this.sprite,
        0, 0, 30, 28, // Source rectangle (full sprite)
        offsetX, offsetY, scaledWidth, scaledHeight // Destination rectangle (scaled with aspect ratio)
      );
      
      ctx.restore();
    } else {
      // Fallback rendering if sprite not loaded
      ctx.fillStyle = '#4488AA';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Draw eyes in direction player is facing
      ctx.fillStyle = 'white';
      if (this.direction > 0) {
        ctx.fillRect(this.x + this.width - 15, this.y + 15, 5, 5);
      } else {
        ctx.fillRect(this.x + 10, this.y + 15, 5, 5);
      }
    }
  }
}

class Platform extends Entity {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.type = 'normal';
    this.color = '#553322';
  }
  
  render(ctx) {
    // Draw main platform body with gradient
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, '#664433');
    gradient.addColorStop(0.5, '#553322');
    gradient.addColorStop(1, '#442211');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Add top surface highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(this.x, this.y, this.width, 2);
    
    // Add subtle edge highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width, this.y);
    ctx.stroke();
    
    // Add stone texture pattern
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines with varying lengths
    for (let i = 0; i < this.width; i += 15) {
      const lineLength = 5 + Math.random() * 10;
      const startY = this.y + Math.random() * (this.height - lineLength);
      ctx.beginPath();
      ctx.moveTo(this.x + i, startY);
      ctx.lineTo(this.x + i, startY + lineLength);
      ctx.stroke();
    }
    
    // Horizontal lines with varying lengths
    for (let i = 0; i < this.height; i += 10) {
      const lineLength = 10 + Math.random() * 20;
      const startX = this.x + Math.random() * (this.width - lineLength);
      ctx.beginPath();
      ctx.moveTo(startX, this.y + i);
      ctx.lineTo(startX + lineLength, this.y + i);
      ctx.stroke();
    }
    
    // Add subtle cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const startX = this.x + Math.random() * this.width;
      const startY = this.y + Math.random() * this.height;
      const endX = startX + (Math.random() - 0.5) * 20;
      const endY = startY + (Math.random() - 0.5) * 20;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }
}

class MovingPlatform extends Platform {
  constructor(x, y, width, height, startX, endX, speed) {
    super(x, y, width, height);
    this.startX = startX;
    this.endX = endX;
    this.speed = speed;
    this.direction = 1;
    this.type = 'moving';
    this.color = '#664433';
    this.highlightColor = '#775544';
    this.shadowColor = '#553322';
    
    // Add glow effect for moving platforms
    this.glowIntensity = 0;
    this.glowDirection = 1;
  }
  
  update(deltaTime) {
    // Move platform back and forth
    this.x += this.speed * this.direction;
    
    // Change direction at endpoints
    if (this.x <= this.startX) {
      this.x = this.startX;
      this.direction = 1;
    } 
    else if (this.x >= this.endX) {
      this.x = this.endX;
      this.direction = -1;
    }
    
    // Update glow effect
    this.glowIntensity += this.glowDirection * 0.02;
    if (this.glowIntensity >= 0.3) {
      this.glowIntensity = 0.3;
      this.glowDirection = -1;
    } else if (this.glowIntensity <= 0) {
      this.glowIntensity = 0;
      this.glowDirection = 1;
    }
  }
  
  render(ctx) {
    // Draw glow effect
    ctx.shadowColor = `rgba(255, 200, 100, ${this.glowIntensity})`;
    ctx.shadowBlur = 15;
    
    // Call parent render method
    super.render(ctx);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

class Sun extends Entity {
  constructor(x, y, sunType, twinType = null) {
    super(x, y, 80, 80);
    this.sunType = sunType;
    this.twinType = twinType; // for Unity & Division sun
    this.radius = 40;
    this.originalY = y;
    this.bobAmount = 20;
    this.bobSpeed = 0.002;
    this.rotation = 0;
    this.rotationSpeed = 0.001;
    this.rays = [];
    this.generateRays();
    
    // Get the appropriate sprite based on sun type
    // Direct mapping of stage numbers to sun sprites
    switch (sunType) {
      case 1:
        this.sprite = gameAssets.sprites['pride'];
        break;
      case 2:
        this.sprite = gameAssets.sprites['greed'];
        break;
      case 3:
        this.sprite = gameAssets.sprites[twinType === 'left' ? 'unity' : 'division'];
        break;
      case 4:
        this.sprite = gameAssets.sprites['denial'];
        break;
      case 5:
        this.sprite = gameAssets.sprites['anger'];
        break;
      case 6:
        this.sprite = gameAssets.sprites['deception'];
        break;
      case 7:
        this.sprite = gameAssets.sprites['chaos'];
        break;
      case 8:
        this.sprite = gameAssets.sprites['fear'];
        break;
      case 9:
        this.sprite = gameAssets.sprites['sorrow'];
        break;
      default:
        console.error(`Invalid sun type: ${sunType}`);
        this.sprite = gameAssets.sprites['pride'];
    }
    
    // If this is a special twin sun, adjust size
    if (twinType) {
      this.radius = 30;
      this.width = 60;
      this.height = 60;
    }
    
    // For moving sun patterns
    this.patternTimer = 0;
    
    // Set specific behavior based on sun type
    switch (sunType) {
      case 3: // Unity & Division - orbiting pattern
        this.patternType = 'orbit';
        this.orbitSpeed = twinType === 'left' ? 0.001 : -0.001;
        this.orbitRadius = 50;
        this.orbitCenterX = GAME_WIDTH - 200;
        this.orbitCenterY = GAME_HEIGHT / 2;
        break;
      case 5: // Anger - erratic movement
        this.patternType = 'erratic';
        this.erraticTimer = 0;
        this.targetX = x;
        this.targetY = y;
        break;
      case 6: // Deception - creates illusions
        this.patternType = 'illusion';
        this.isReal = true; // This is the real sun
        this.illusions = [];
        this.illusionTimer = 0;
        this.illusionInterval = 2000; // Create new illusions every 2 seconds
        this.maxIllusions = 3; // Maximum number of illusions to maintain
        break;
      case 7: // Chaos - random teleportation
        this.patternType = 'teleport';
        this.teleportTimer = 0;
        this.teleportInterval = 3000; // teleport every 3 seconds
        break;
      case 8: // Fear - hides in darkness
        this.patternType = 'hide';
        this.visibility = 1.0;
        this.hideTimer = 0;
        break;
      default:
        this.patternType = 'bob';
    }
  }
  
  generateRays() {
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const length = this.radius * 0.5 + Math.random() * this.radius * 0.3;
      this.rays.push({
        angle,
        length,
        speedMod: 0.5 + Math.random() * 1.5
      });
    }
  }
  
  update(deltaTime) {
    this.patternTimer += deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;
    
    // Update based on pattern type
    switch (this.patternType) {
      case 'bob':
        // Simple bobbing motion
        this.y = this.originalY + Math.sin(this.patternTimer * this.bobSpeed) * this.bobAmount;
        break;
      case 'orbit':
        // Orbiting motion for twin suns
        const orbitAngle = this.orbitSpeed * this.patternTimer;
        this.x = this.orbitCenterX + Math.cos(orbitAngle) * this.orbitRadius;
        this.y = this.orbitCenterY + Math.sin(orbitAngle) * this.orbitRadius;
        break;
      case 'erratic':
        // Erratic movement for Anger sun
        this.erraticTimer += deltaTime;
        if (this.erraticTimer > 1000) {
          this.targetX = GAME_WIDTH - 300 + Math.random() * 200;
          this.targetY = 100 + Math.random() * 200;
          this.erraticTimer = 0;
        }
        // Move toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          this.x += dx * 0.05;
          this.y += dy * 0.05;
        }
        break;
      case 'teleport':
        // Random teleportation for Chaos sun
        this.teleportTimer += deltaTime;
        if (this.teleportTimer > this.teleportInterval) {
          this.x = GAME_WIDTH - 300 + Math.random() * 200;
          this.y = 100 + Math.random() * 200;
          this.teleportTimer = 0;
        }
        break;
      case 'hide':
        // Hiding behavior for Fear sun
        this.hideTimer += deltaTime;
        if (this.hideTimer > 2000) {
          this.visibility = Math.max(0.2, Math.random());
          this.hideTimer = 0;
          // Also slightly move position when hiding
          this.x = GAME_WIDTH - 300 + Math.random() * 200;
          this.y = 100 + Math.random() * 200;
        }
        break;
    }
    
    // Update ray animations
    this.rays.forEach(ray => {
      ray.angle += 0.0005 * ray.speedMod * deltaTime;
    });
  }

  render(ctx) {
    if (this.sprite) {
      ctx.save();
      
      // Set transparency for hiding effect
      if (this.patternType === 'hide') {
        ctx.globalAlpha = this.visibility;
      }
      
      // Translate to sun position and rotate
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(this.rotation);
      
      // Draw the sprite
      ctx.drawImage(
        this.sprite,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      
      // Draw rays
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
      ctx.lineWidth = 2;
      this.rays.forEach(ray => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(ray.angle) * ray.length,
          Math.sin(ray.angle) * ray.length
        );
        ctx.stroke();
      });
      
      ctx.restore();
    } else {
      // Fallback rendering if sprite not loaded
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

class Arrow extends Entity {
  constructor(x, y, arrowType, stageNumber) {
    super(x, y, 30, 5);
    this.arrowType = arrowType;
    this.stageNumber = stageNumber;
  }

  update(deltaTime) {
    
  }

  render(ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
