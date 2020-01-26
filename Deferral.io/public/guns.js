class Gun {
  constructor(magSize, reloadTime, auto, fireRate, damage) {
    this.magSize = magSize;
    this.magCount = magSize;
    this.reloadTime = reloadTime;
    this.auto = auto;
    this.fireRate = fireRate;
    this.damage = damage;
    this.coolDown = this.fireRate;
    this.bullets = [];
    this.invIndex;
    this.bulletCount = 0;
  }

  shoot() {
    if (this.magCount != 0) {
      this.coolDown = 0;
      let x = p.body.position.x + ((w / 2) + 30) * Math.cos(p.ang);
      let y = p.body.position.y + ((w / 2) + 30) * Math.sin(p.ang);
      let num = Number('' + p.body.id + pistol.bulletCount); // unique bullet ID for collision
      let b = new Bullet(x, y, this.damage, 500, 100, p.ang, true, num, this.invIndex);
      this.bullets.push(b);
      this.bulletCount++;
      this.magCount--;
    } else if (firing) firing = false;
  }

  update() {
    for (let i = 0; i < this.bullets.length; i++) {
      if (this.bullets[i].life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      this.bullets[i].update();
      this.bullets[i].draw();
    }
    if (this.bullets.length == 0) this.bulletCount = 0;
    if (this.coolDown < this.fireRate) this.coolDown++;
  }
}

class SemiAuto extends Gun {
  constructor(magSize, reloadTime, auto, fireRate, spread) {
    super(magSize, reloadTime, auto, fireRate, spread);
  }

  reload() {
    if (ammo[0] == 0 || this.magSize == this.magCount) return;
    p.isReloading = true;
    textSize(24);
    sleep(this.reloadTime * 500).then(() => {
      for (let i = this.magCount; i < this.magSize; i++) {
        if (ammo[0] == 0) {
          p.isReloading = false;
          break;
        }
        ammo[0]--;
        this.magCount++;
      }
      p.isReloading = false;
    });
  }

}

class AssaultRifle extends Gun {
  constructor(magSize, reloadTime, auto, fireRate, spread) {
    super(magSize, reloadTime, auto, fireRate, spread);
  }
  reload() {
    if (ammo[1] == 0 || this.magSize == this.magCount) return;
    p.isReloading = true;
    textSize(24);
    sleep(this.reloadTime * 500).then(() => {
      for (let i = this.magCount; i < this.magSize; i++) {
        if (ammo[1] == 0) {
          p.isReloading = false;
          break;
        }
        ammo[1]--;
        this.magCount++;
      }
      p.isReloading = false;
    });
  }

}

class Bullet {
  constructor(x, y, dmg, speed, life, angle, isClient, num, index) {
    this.damage = dmg;
    this.speed = speed;
    this.life = life;
    this.angle = angle;
    this.bulletLength = 20;
    this.body = Matter.Bodies.rectangle(x + 5, y + 5, 0.1, 10);
    this.body.id = num;
    this.body.label = 'Bullet';
    Matter.Body.setMass(this.body, 0.001);
    if (isClient) {
      socket.emit('bullet', {
        x: this.body.position.x,
        y: this.body.position.y,
        dmg: this.damage,
        speed: this.speed,
        life: this.life,
        angle: this.angle,
        length: this.bulletLength,
        id: this.body.id,
        invIndex: index
      });
    }

    World.add(world, this.body);
    Matter.Body.applyForce(this.body, {
      x: +5,
      y: y + 5
    }, {
        x: (w / 2) * Math.cos(this.angle) * forceMult,
        y: (w / 2) * Math.sin(this.angle) * forceMult
      });
  }

  update() {
    this.life--;
  }

  draw() {
    let endPointX = this.body.position.x + (Math.cos(this.angle) * this.bulletLength);
    let endPointY = this.body.position.y + (Math.sin(this.angle) * this.bulletLength);
    push();
    stroke(255);
    strokeWeight(1.25);
    line(this.body.position.x, this.body.position.y, endPointX, endPointY);
    pop();
  }

  networkOnly(a) {
    if (this.life <= 0) netBullets.splice(a, 1);
  }
}