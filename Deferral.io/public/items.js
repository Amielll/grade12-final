class Item {
  constructor(x, y, type) {
    this.pos = createVector(x, y);
    this.r = 50; //change to diameter
    this.type = type;
    this.num = 0;
    this.gun = null;
    if (this.type == 'semiauto') {
      this.gun = new SemiAuto(8, 1.4, false, 1, 11);
    } else if (this.type == 'ar') {
      this.gun = new AssaultRifle(20, 2.5, true, 10, 9);
    } else if (this.type == 'bandage') {
      this.num = 3;
    }
  }

  show() {
    if (this.type == 'ar') {
      fill(12, 100, 255);
      ellipse(this.pos.x, this.pos.y, this.r);
    } else if (this.type == 'semiauto') {
      fill(255, 100, 12);
      ellipse(this.pos.x, this.pos.y, this.r);
    } else if (this.type == 'arAmmo') {
      fill(12, 100, 255);
      rect(this.pos.x, this.pos.y, 50, 50);
    } else if (this.type == 'semiAmmo') {
      fill(255, 100, 12);
      rect(this.pos.x, this.pos.y, 50, 50);
    } else if (this.type == 'bandage') {
      fill(255);
      textSize(24);
      text('+', this.pos.x, this.pos.y);
      text('+', this.pos.x - 20, this.pos.y + 20);
      text('+', this.pos.x + 20, this.pos.y + 20);
    } else if (this.type == 'medkit') {
      fill(255, 0, 0);
      textSize(50);
      text('+', this.pos.x, this.pos.y);
    }
  }

  PlayerOnTop(playa) {
    let vec = createVector(playa.body.position.x, playa.body.position.y);
    let distance = p5.Vector.dist(this.pos, vec);
    if (distance < ((w + this.r) / 2)) {
      return true;
    }
    return false;
  }

  IsItemClicked() {
    let distX,
      distY,
      dist;
    distX = mouseX - this.pos.x;
    distY = mouseY - this.pos.y;
    dist = Math.sqrt((distX * distX) + (distY * distY));
    if (dist <= this.r / 2) return true;
    return false;
  }
}