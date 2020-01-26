/*******************************************************
    PROGRAMME	  :	Deferral.IO Server
    
    OUTLINE		  :	This Javascript file mainly handles the
                  data transmission between clients. It
                  opens a port on the local network and
                  allows users to connect and obtain the
                  necessary files to play the game. It also
                  handles the setup of items/players.
 
    PROGRAMMER	:	Amiel Nurja & Salik Chodhary
    
    DATE		    :	June 7, 2019
 ******************************************************/
let express = require('express');
let socket = require('socket.io');
let app = express();
let players = [];
let items = [];
let itemList = new Array('ar', 'semiauto', 'arAmmo', 'semiAmmo', 'bandage', 'medkit');
let itemType;
let idCount = 0;
let queueTime = 31;
let stormTime = 90;
let stormUpdating = false,
  stormStop = false;
let xArray = [];
yArray = [];
let width = 10648,
  height = 5328;
let spawnX = [0, width, width / 2, width - (width / 4), width / 4],
  spawnY = [0, height, height / 2, height - (height / 4), height / 4];
let running = false;
let playerQuantity = 10; // Change this number to 1 to immediately start the queue
let server = app.listen(8080, function () {

  console.log('STARTUP >> Server listening on port 8080.');
  let xItem, yItem;
  for (let j = 0; j < 100; j++) { //create new items
    let flag;
    do {
      let dx, dy, distance;
      flag = false;
      xItem = Math.floor((Math.random() * width) + 1);
      yItem = Math.floor((Math.random() * height) + 1);
      for (let i = 0; i < xArray.length; i++) {
        dx = xArray[i] - xItem;
        dy = yArray[i] - yItem;
        distance = Math.sqrt((dx * dx) + (dy * dy));
        if (distance < 200) {
          flag = true;
        }
      }
    } while (flag);

    xArray[j] = xItem;
    yArray[j] = yItem;
    itemType = Math.floor((Math.random() * itemList.length));
    items[j] = new Item(xItem, yItem, itemList[itemType]);
  }
});

app.use(express.static('public'));

let io = socket(server);

setInterval(heartbeat, 5);
setInterval(timer, 1000);

function heartbeat() {
  io.sockets.emit('position', players);
}

function timer() {
  if (queueTime > 0) {

    if (players.length >= playerQuantity) {
      queueTime--;
      io.sockets.emit('queue', queueTime);
      if (queueTime == 0) {
        io.sockets.emit('gameStart', true);
        running = true;
      }
    } else {
      queueTime = 31;
      io.sockets.emit('queue', queueTime);
    }
  } else {
    if (!stormUpdating && !stormStop) {
      stormTime--;
      io.sockets.emit('stormTime', stormTime);
    }
  }
}

io.on('connection', function (socket) {

  socket.on('startup', function (data) {
    if (!running && players.length < 20) {
      let randX = Math.floor((Math.random() * spawnX.length));
      let randY = Math.floor((Math.random() * spawnY.length));
      let x = spawnX[randX];
      let y = spawnY[randY];
      let p = new Player(socket.id, x, y, 0, null, data.handle);
      players.push(p);
      console.log('CONNECT >> ' + socket.id + ' has connected');
      socket.emit('spawnPlayer', {
        x: x,
        y: y
      })
      socket.emit('id', ++idCount);
      socket.emit('itemStartup', items);
    } else {
      socket.emit('rejected', true);
    }
  });

  socket.on('update', function (data) {
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        players[i].x = data.x;
        players[i].y = data.y;
        players[i].ang = data.ang;
        players[i].holdType = data.holding;
      }
    }
  });

  socket.on('itemUpdate', function (data) {
    let i = data.count;
    socket.broadcast.emit('itemUpdate', {
      x: data.x,
      y: data.y,
      i: i
    });
  });

  socket.on('removeItem', function (data) {
    socket.broadcast.emit('removeItem', data);
    items.splice(data, 1);
  });

  socket.on('addItem', function (data) {
    let newItem;
    socket.broadcast.emit('addItem', data);
    newItem = new Item(data.x, data.y, data.type);
    items.push(newItem);
  });

  socket.on('disconnect', function () {
    console.log('DISCONNECT >> ' + socket.id + ' has disconnected.');
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        players.splice(i, 1);
        break;
      }
    }
  });

  socket.on('bullet', function (data) {
    let b = new Bullet(data.x, data.y, data.dmg, data.speed, data.life, data.angle, data.length, data.id, data.invIndex);
    socket.broadcast.emit('bullet', b);
  });

  socket.on('bulletHit', function (data) {
    socket.broadcast.emit('bulletHit', data);
  });

  socket.on('stormStop', function (data) {
    if (stormStop == false) stormStop = data;
  });

  socket.on('stormIsMoving', function (data) {
    if (stormUpdating == false) {
      stormUpdating = data;
      stormTime = 60;
    }
  });

  socket.on('stormIsNotMoving', function (data) {
    if (stormUpdating == true) stormUpdating = data;
  });

  socket.on('playerDeath', function (data) {
    for (let i = 0; i < players.length; i++) {
      if (players[i].id == socket.id) {
        players.splice(i, 1);
        if (players.length == 1) {
          console.log('GAMEOVER >> Game is over. Please restart the server.');
          socket.broadcast.emit('gameOver', 0);
        }
        break;
      }
    }
  });

  socket.on('chat', function (data) {
    io.sockets.emit('chatUpdate', data);
  });

});


class Player {
  constructor(id, x, y, ang, holdType, handle) {
    this.id = id;
    this.handle = handle;
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.holdType = holdType;
  }
}

class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
  }
}

class Bullet {
  constructor(x, y, dmg, speed, life, angle, length, id, invIndex) {
    this.x = x;
    this.y = y;
    this.dmg = dmg;
    this.speed = speed;
    this.life = life;
    this.angle = angle;
    this.length = length;
    this.id = id;
    this.invIndex = invIndex
  }
}