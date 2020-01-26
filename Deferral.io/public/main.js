/*******************************************************
    PROGRAMME	  :	Deferral.IO Client
    
    OUTLINE		  :	This Javascript file handles the main
                  clientside processing for the game. It
                  sends/receives data from the server,
                  handles the game engine/physics and
                  renders everything to an HTML5 canvas.
 
    PROGRAMMER	:	Amiel Nurja & Salik Chodhary
    
    DATE		    :	June 7, 2019
 ******************************************************/

let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies;

let engine,
  world,
  w = 75,
  p,
  img;

let socket = io.connect('http://192.168.2.30:8080') // Change this to server IP

let players = [],
  netBullets = [],
  items = [];

let item,
  xItem,
  yItem,
  c = 0;

let forceMult = 0.000002;
let rest = false;
let inventory = [];
let ammo = [0, 0];
let activeItem = 0;
let offset = -100;
let sWidth = 10648,
  sHeight = 5328;
let stormTime = 0,
  stormStatus = '',
  stormDamage = 2,
  stormCount = 0,
  stormStop = false,
  stormRadius = 0;
let skin;
let deathMessages = new Array('Deferred to geomatics...', 'DoNt FoRgEt To ThAnK mR. GoOsE', 'Omae wa mou shindeiru.', 'nothing personnel kid', 'f#@%', 'Seneca wants to know your location', 'such death. very wow. much bad.');
let place;
let rejected = false,
  gameStart = false;
let deathMessage, deathIndex = Math.floor((Math.random() * deathMessages.length));
let queueTimer = 31;
let isTyping = false,
  chat = [],
  currentChat = '';
let firing = false;
let handle;

function setup() {
  handle = sessionStorage.handle;
  skin = color(241, 194, 125);
  createCanvas(innerWidth, innerHeight);
  img = loadImage('map.png');

  let x = sWidth;
  let y = sHeight;
  stormRadius = Math.sqrt(x * x + y * y) - offset;

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  pistol = new SemiAuto();

  socket.emit('startup', {
    handle: handle
  });

  dataReceiver();
}

setInterval(() => {
  if (p != undefined) {
    let center = createVector(sWidth / 2, sHeight / 2);
    let pos = createVector(p.body.position.x, p.body.position.y);
    let dist = p5.Vector.dist(center, pos);
    if (dist * 2 > stormRadius) {
      p.health -= stormDamage;
    }
  }

}, 1000);

function draw() {
  if (p != undefined) {
    if (!p.isDead && !rejected && gameStart) {
      fill(0, 0, 255);
      background(51);
      push(); // Anythinig drawn relative to player goes here
      translate((width / 2 - p.body.position.x), (height / 2 - p.body.position.y));
      image(img, 0, 0);
      for (let i = netBullets.length - 1; i >= 0; i--) {
        push();
        netBullets[i].update();
        netBullets[i].draw();
        netBullets[i].networkOnly(i);
        pop();
      }
      drawEnemies();

      if (!(activeItem + 1 > inventory.length)) {
        if (inventory[activeItem].gun != null) inventory[activeItem].gun.update();
      }

      updateItems();
      p.update();
      p.show();
      if (firing && inventory[activeItem].gun.coolDown == inventory[activeItem].gun.fireRate) inventory[activeItem].gun.shoot();
      drawStorm();
      pop();
      drawHUD();
      if (!rest) {
        rest = true;
        Matter.Events.on(engine, 'collisionStart', function (event) {
          let bodyA = event.pairs[0].bodyA;
          let bodyB = event.pairs[0].bodyB;
          let num;

          if (bodyA.label == 'Bullet') num = bodyA.id;
          else num = bodyB.id;

          for (let i = 0; i < netBullets.length; i++) {

            if (netBullets[i].body.id == num) {
              socket.emit('bulletHit', {
                id: num,
                invIndex: netBullets[i].invIndex
              });
              p.health -= netBullets[i].damage;
              netBullets.splice(i, 1);
              rest = false;
            }

          }
        });
      }
      Engine.update(engine);
    } else if (p.isDead) {
      let prefix;
      deathMessage = deathMessages[deathIndex];
      if (place == 3) prefix = 'rd';
      else if (place == 2) prefix = 'nd';
      else if (place == 1) prefix = 'st';
      else prefix = 'th'
      background(0);
      textAlign(CENTER);
      fill(255, 0, 0);
      textSize(48);
      text('Deferral.IO Game Over', width / 2, height / 10);
      textSize(24);
      textSize(36);
      if (place == 1) text('This game had nothing related to Waterloo, but you have been admitted to CS', width / 2, height / 2);
      else text(deathMessage, width / 2, height / 2);
      textSize(24);
      text('You placed ' + place + prefix, width / 2, height / 2 + 50);
    } else if (rejected) {
      background(0);
      textSize(48);
      textAlign(CENTER);
      fill(255, 0, 0);
      text('Deferral.IO game is in progress!', width / 2, height / 2);
    } else {
      background(0);
      textSize(48);
      textAlign(CENTER);
      fill(255, 0, 0);
      text('Deferral.IO Queuing Lobby', width / 2, height / 10);
      text('Waiting for other players to join the lobby... ' + players.length + ' / 20', width / 2, height / 2);
      if (queueTimer < 31) {
        text('Queue time: ' + queueTimer + ' seconds remaining', width / 2, height / 2 + 50);
      }
    }
  }
  drawChat();
}


function keyReleased() {
  if (keyCode == ENTER) {
    isTyping = !isTyping;
    if (isTyping == false && currentChat.length > 0) {
      socket.emit('chat', handle + ': ' + currentChat);
      currentChat = '';
    }
  }
  if (gameStart) {
    if (!isTyping) {
      if (key == 'w' || key == 'W') p.vel.y = 0;
      if (key == 'a' || key == 'A') p.vel.x = 0;
      if (key == 's' || key == 'S') p.vel.y = 0;
      if (key == 'd' || key == 'D') p.vel.x = 0;
    }
  }
  return false;
}

function mouseClicked() {
  if (gameStart) {
    let dropItem;
    for (let i = 0; i < inventory.length; i++) { //if click on item drop it under player

      if (inventory[i].IsItemClicked()) {
        dropItem = inventory[i];
        dropItem.pos.x = p.body.position.x;
        dropItem.pos.y = p.body.position.y;
        dropItem.r = 50;
        socket.emit('addItem', {
          x: dropItem.pos.x,
          y: dropItem.pos.y,
          type: dropItem.type,
          r: dropItem.r
        });
        inventory.splice(i, 1);
        items.push(dropItem);
        return;
      }
    }

    if (!(activeItem + 1 > inventory.length)) {
      if (inventory[activeItem].gun != null)
        if (inventory[activeItem].gun.magCount != 0 && !p.isReloading) {
          if (inventory[activeItem].type != 'ar') {
            inventory[activeItem].gun.shoot();
          }
        }
        else inventory[activeItem].gun.reload();

      else if (inventory[activeItem].type == 'bandage') {
        p.heal(15, activeItem);
      } else if (inventory[activeItem].type == 'medkit') {
        p.heal(100, activeItem);
      }

      sleep(100).then(() => { });
    }
  }
}

function mousePressed() {
  if (!(activeItem + 1 > inventory.length)) {
    if (inventory[activeItem].gun != null)
      if (inventory[activeItem].gun.magCount != 0 && !p.isReloading) {
        if (inventory[activeItem].type == 'ar') {
          firing = true;
        } else firing = false;
      }
  }
}

function mouseReleased() {
  firing = false;
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
}

function dataReceiver() {
  socket.on('spawnPlayer', function (data) {
    p = new Player(data.x, data.y);
  });
  socket.on('position', function (data) {
    players = data;
  });

  socket.on('itemStartup', function (data) {
    for (let i = 0; i < data.length; i++) {
      let item = new Item(data[i].x, data[i].y, data[i].type);
      items.push(item);
    }
  });
  socket.on('removeItem', function (data) {
    items.splice(data, 1);
  });

  socket.on('addItem', function (data) {
    let addItem = new Item(data.x, data.y, data.type);
    items.push(addItem);
  });

  socket.on('id', function (data) {
    p.body.id = data;
  });

  socket.on('bullet', function (data) {
    let b = new Bullet(data.x, data.y, data.dmg, data.speed, data.life, data.angle, false, data.id);
    b.invIndex = data.invIndex;
    netBullets.push(b);
  });

  socket.on('bulletHit', function (data) {
    let cont = true;
    for (let i = 0; i < netBullets.length; i++) {
      if (data.id == netBullets[i].body.id) {
        netBullets.splice(i, 1);
        cont = false;
        break;
      }
    }
    if (cont) {
      for (let i = 0; i < inventory[data.invIndex].gun.bullets.length; i++) {
        if (data.id == inventory[data.invIndex].gun.bullets[i].body.id) {
          inventory[data.invIndex].gun.bullets.splice(i, 1);
          break;
        }
      }
    }
  });

  socket.on('stormTime', function (data) {
    stormTime = data;
    updateStorm();
  });

  socket.on('gameOver', function (data) {
    p.health = data;
  });

  socket.on('rejected', function (data) {
    rejected = data;
  });

  socket.on('queue', function (data) {
    queueTimer = data;
  });

  socket.on('gameStart', function (data) {
    gameStart = data;
  });

  socket.on('chatUpdate', function (data) {
    chat.push(data);
    if (chat.length > 5) chat.splice(0, 1);
  });

}

function drawEnemies() {
  for (let i = players.length - 1; i >= 0; i--) {
    let id = players[i].id;
    if (id !== socket.id) {
      fill(skin);
      ellipse(players[i].x, players[i].y, w);
      fill(255);
      textAlign(CENTER);
      textSize(10);
      text(players[i].handle, players[i].x, players[i].y + (w / 2 + 15));
      fill(skin);
      if (players[i].holdType == 'ar' || players[i].holdType == 'semiauto') {
        push();
        if (players[i].holdType == 'ar') fill(12, 100, 255);
        else fill(255, 100, 12);
        translate(players[i].x, players[i].y);
        rotate(players[i].ang);
        ellipse(0 + w - 10, 0, 60, 5);
        fill(skin);
        ellipse(w / 2, 2, w / 3);
        ellipse(w / 2 + 30, -2, w / 3);
        pop();
      } else if (players[i].holdType == 'bandage' || players[i].holdType == 'medkit') {
        push();
        translate(players[i].x, players[i].y);
        rotate(players[i].ang + (PI / 4));
        fill(skin);
        ellipse(w / 2, 0, w / 3);
        rotate(-PI / 2);
        ellipse(w / 2, 0, w / 3);
        fill(255)
        ellipse(w / 2 + 5, 5, w / 3 - 5);
        pop();
      } else {
        push();
        fill(skin);
        translate(players[i].x, players[i].y);
        rotate(players[i].ang + (PI / 4));
        ellipse(w / 2, 0, w / 3);
        rotate(-PI / 2);
        ellipse(w / 2, 0, w / 3);
        pop();
      }
    }

  }
}

function keyPressed() {
  if (gameStart && !isTyping) {
    if (p != undefined) {
      if (!p.isReloading) {
        if (key == '1') activeItem = 0;
        if (key == '2') activeItem = 1;
        if (key == '3') activeItem = 2;
        if (key == '4') activeItem = 3;
        if (key == 'r' || key == 'R') {
          if (!(activeItem + 1 > inventory.length)) {
            if (inventory[activeItem].gun != null) inventory[activeItem].gun.reload();
          }
        }
      }
    }
  }
  if (isTyping) {
    if (currentChat.length < 40 && keyCode != DELETE && keyCode != ENTER && keyCode != BACKSPACE && keyCode != SHIFT && keyCode != TAB && keyCode != CONTROL) currentChat += key;
    if (keyCode == BACKSPACE) currentChat = currentChat.slice(0, currentChat.length - 1);
  }
}


function drawHUD() {
  //Health bar
  let h, c;
  textAlign(LEFT);
  fill(51, 190);
  rect(width / 4, height - 100, width / 2, 50, 5);
  c = map(p.health, 0, 100, 0, 255);
  fill(255 - c, c, 0, 190);

  if (p.health > 0) {
    h = map(p.health, 0, 100, width / 4, width / 4 + width / 2);
    rect(width / 4, height - 100, h - width / 4, 50, 5);
  }

  // Magazine Info
  if (!(activeItem + 1 > inventory.length)) {
    if (inventory[activeItem].type == 'ar' || inventory[activeItem].type == 'semiauto') {
      fill(41);
      textSize(36);
      let num;
      if (inventory[activeItem].type == 'semiauto') num = ammo[0];
      if (inventory[activeItem].type == 'ar') num = ammo[1];
      text('Clip: ' + inventory[activeItem].gun.magCount + ' / ' + num, 10, height - 60);
      if (p.isReloading) {
        textSize(24);
        text('Reloading...', 20, height - 30);
      }
    } else if (inventory[activeItem].type == 'medkit' || inventory[activeItem].type == 'bandage') {
      if (p.isReloading) {
        fill(41);
        textSize(24);
        text('Healing...', 20, height - 30);
      }
    }
  }

  // On top of item
  for (let i = 0; i < items.length; i++) {
    if (items[i].PlayerOnTop(p)) {
      textSize(24);
      fill(255, 0, 0);

      if (inventory.length == 4 && items[i].type != 'arAmmo' && items[i].type != 'pistolAmmo') text('INVENTORY FULL!', width / 2 - 50, 150);
      else text('Press F to add ' + items[i].type.toUpperCase() + ' to your inventory', width / 2 - 200, 30);
    }
  }

  // Inventory
  fill(57);
  rect(10, 70, 400, 80, 10);

  for (let i = 0; i < inventory.length; i++) {
    inventory[i].pos.x = 50 + (i * 100);
    inventory[i].pos.y = 110;

    if (inventory[i].type == 'ar') {
      fill(12, 100, 255);
      ellipse(inventory[i].pos.x, inventory[i].pos.y, inventory[i].r);
    } else if (inventory[i].type == 'semiauto') {
      fill(255, 100, 12);
      ellipse(inventory[i].pos.x, inventory[i].pos.y, inventory[i].r);
    } else if (inventory[i].type == 'bandage') {
      fill(255);
      textSize(24);
      text('+', inventory[i].pos.x - 8, inventory[i].pos.y);

      text('+', inventory[i].pos.x - 23, inventory[i].pos.y + 15);
      text('+', inventory[i].pos.x + 7, inventory[i].pos.y + 15);
    } else if (inventory[i].type == 'medkit') {
      fill(255, 0, 0);
      textSize(50);
      text('+', inventory[i].pos.x - 15, inventory[i].pos.y + 15);
    }

    if (activeItem == i) {
      fill(255, 255, 0, 123);
      ellipse(inventory[i].pos.x, inventory[i].pos.y, inventory[i].r + 10);
    }
  }

  // Ammo
  fill(255, 255, 0);
  textSize(16);
  text('Semi Auto ammo: ' + ammo[0], 15, 180);
  fill(0, 0, 255);
  text('AR ammo: ' + ammo[1], 15, 200);

  // Storm
  fill(255, 0, 255);
  textSize(36);
  text(stormStatus, width / 4, height - 110);

}

function updateItems() {
  let flag = true;
  for (let i = 0; i < items.length; i++) { //check if player is in contact with item and add to inventory if it is
    if (items[i].PlayerOnTop(p) && keyIsDown(70)) {

      if (items[i].type == 'semiAmmo' || items[i].type == 'arAmmo') {
        if (items[i].type == 'semiAmmo') ammo[0] += 20;
        else if (items[i].type == 'arAmmo') ammo[1] += 20;
        items.splice(i, 1);
        socket.emit('removeItem', i);
      } else {
        if (inventory.length < 4) {
          if (items[i].type == 'ar' || items[i].type == 'semiauto' || items[i].type == 'medkit') {
            inventory.push(items[i]);
            if (items[i].type == 'ar' || items[i].type == 'semiauto') items[i].gun.invIndex = inventory.length - 1;
            if (inventory.length == 1) activeItem = 0;
          } else if (items[i].type == 'bandage') {
            for (let j = 0; j < inventory.length; j++) { // Bandages should stack up to 9
              if (inventory[j].type == 'bandage') {
                if (inventory[j].num <= 6) {
                  inventory[j].num += 3;
                  flag = false; // Don't add new item to inv. if we added to stack
                }
              }
            }
            if (flag) inventory.push(items[i]);
          }
          items.splice(i, 1);
          socket.emit('removeItem', i);
        }

      }

    }
  }
  for (let i = 0; i < items.length; i++) {
    items[i].show();
  }
}

async function updateStorm() {
  if (stormTime == 0) {
    socket.emit('stormIsMoving', true);
    stormStatus = 'The storm is closing in!';
    await advanceStorm();
    socket.emit('stormIsNotMoving', false);
    stormDamage *= 2;
    if (++stormCount == 4) {
      stormStop = true;
      socket.emit('stormStop', stormStop);
      stormStatus = 'The storm won\'t close any further!'
    }
  } else {
    let m, s;
    let mins = Math.floor(stormTime / 60);
    let secs = stormTime - (mins * 60);
    if (mins < 10) m = '' + mins;
    else m = '' + mins;
    if (secs < 10) s = '' + 0 + secs;
    else s = '' + secs;
    stormStatus = 'Storm closes in:   ' + m + ':' + s;
  }
}

async function advanceStorm() {
  for (let i = 0; i < 250; i++) {
    await sleep(10);
    offset += 10;
  }
}

function drawStorm() {
  let weight = 10000;
  fill(255, 0);
  stroke(255, 0, 0, 100);
  strokeWeight(weight);
  let x = sWidth;
  let y = sHeight;
  stormRadius = Math.sqrt(x * x + y * y) - offset;
  ellipseMode(CENTER);
  ellipse(x / 2, y / 2, stormRadius + weight);
}


function drawChat() {
  let inc = 1;
  textSize(20);
  textAlign(LEFT);
  fill(41);
  for (let i = 0; i < chat.length; i++) {
    text(chat[i], width / 2 + 500, height - 200 + inc++ * 20);
  }
  fill(255, 0, 0);
  text(currentChat, width / 2 + 500, height - 200 + inc * 20);
}


function sleep(ms) { // Use for any async delays
  return new Promise(resolve => setTimeout(resolve, ms));
}
