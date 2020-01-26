class Player {
  constructor(x, y) {
    this.body = Bodies.circle(x, y, w / 2);
    this.vel = {
      x: 0,
      y: 0
    };
    this.health = 100;
    this.dx;
    this.dy;
    this.ang;
    this.isReloading = false;
    this.body.friction = 1;
    this.isDead = false;
    World.add(world, this.body);
  }

  update() {
    this.vel.x = 0;
    this.vel.y = 0;
    if (keyIsDown(87)) this.vel.y += -5;
    if (keyIsDown(65)) this.vel.x += -5;
    if (keyIsDown(83)) this.vel.y += 5;
    if (keyIsDown(68)) this.vel.x += 5;
    if (this.isReloading) {
      this.vel.x *= 0.05;
      this.vel.y *= 0.05;
    }
    if (!focused) { // Built in p5 bool
      this.vel.x = 0;
      this.vel.y = 0;
    }
    this.dx = mouseX - width / 2;
    this.dy = mouseY - height / 2;
    this.ang = atan2(this.dy, this.dx);
    Matter.Body.setVelocity(this.body, this.vel);

    let holdType;

    if (activeItem + 1 > inventory.length) holdType = '';
    else holdType = inventory[activeItem].type;

    if (this.health <= 0 && !this.isDead) {
      place = players.length;
      socket.emit('playerDeath', 0);
      console.log('dIE GAY BOWSER!');
      this.isDead = true;
    }

    socket.emit('update', {
      x: this.body.position.x,
      y: this.body.position.y,
      ang: this.ang,
      holding: holdType
    });

  }

  show() {
    fill(skin);
    ellipseMode(CENTER);
    ellipse(this.body.position.x, this.body.position.y, w);
    fill(255);
    textAlign(CENTER);
    textSize(10);
    text(handle, this.body.position.x, this.body.position.y + (w / 2 + 15));
    fill(skin);
    if (!(activeItem + 1 > inventory.length)) {
      if (inventory[activeItem].type == 'ar' || inventory[activeItem].type == 'semiauto') {
        push();
        if (inventory[activeItem].type == 'ar') fill(12, 100, 255);
        else fill(255, 100, 12);
        translate(this.body.position.x, this.body.position.y);
        rotate(this.ang);
        ellipse(0 + w - 10, 0, 60, 5);
        fill(skin);
        ellipse(w / 2, 2, w / 3);
        ellipse(w / 2 + 30, -2, w / 3);
        pop();
      } else if (inventory[activeItem].type == 'bandage' || inventory[activeItem].type == 'medkit') {
        push();
        translate(this.body.position.x, this.body.position.y);
        rotate(this.ang + (PI / 4));
        ellipse(w / 2, 0, w / 3);
        rotate(-PI / 2);
        ellipse(w / 2, 0, w / 3);
        fill(255)
        ellipse(w / 2 + 5, 5, w / 3 - 5);
        pop();
      }
    } else {
      push();
      translate(this.body.position.x, this.body.position.y);
      rotate(this.ang + (PI / 4));
      ellipse(w / 2, 0, w / 3);
      rotate(-PI / 2);
      ellipse(w / 2, 0, w / 3);
      pop();
    }
  }

  heal(h, slot) {
    let delay, amount;
    if (this.health == 100) return;
    this.isReloading = true;
    if (h == 15) {
      if (this.health < 85) amount = 15;
      else amount = 100 - this.health;
      delay = 3000;
    } else {
      delay = 10000;
      amount = 100 - this.health;
    }
    sleep(delay).then(() => {
      this.health += amount;
      this.isReloading = false;
      if (delay == 3000) {
        inventory[slot].num--;
        if (inventory[slot].num == 0) inventory.splice(slot, 1);
      } else inventory.splice(slot, 1);
    });
  }
}