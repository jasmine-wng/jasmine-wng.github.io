const TILE_COUNT = [4, 6, 8][Math.floor(Math.random() * 3)];
const FOCUS_RADIUS = 120;
const NUM_FLOWS = 70;
const INTERACTIVE_IDX = Math.floor(Math.random() * TILE_COUNT);

const grid = document.getElementById('grid');
grid.classList.add(`count-${TILE_COUNT}`);

for (let i = 0; i < TILE_COUNT; i++) {
  const tile = document.createElement('div');
  tile.className = 'tile' + (i === INTERACTIVE_IDX ? ' interactive' : '');
  tile.id = `tile-${i}`;

  grid.appendChild(tile);
}

function makeSketch(containerId, isInteractive) {
  return function (p) {
    let flows = [];
    let smoothX, smoothY;
    let t = 0;

    let roamX, roamY;
    let roamTargetX, roamTargetY;
    let roamTimer = 0;
    let roamInterval = 180;

    p.setup = function () {
      const container = document.getElementById(containerId);
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      const cnv = p.createCanvas(w, h);
      cnv.parent(containerId);

      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.background(30, 8, 96);

      smoothX = w / 2;
      smoothY = h / 2;
      roamX = w / 2;
      roamY = h / 2;
      roamTargetX = p.random(w);
      roamTargetY = p.random(h);

      for (let i = 0; i < NUM_FLOWS; i++) {
        flows.push(new FlowBundle(p));
      }

      drawInitialMosaic(p);
    };

    p.draw = function () {
      t += 0.004;

      if (isInteractive) {
        const container = document.getElementById(containerId);
        const rect = container.getBoundingClientRect();
        const mx = mouseGlobalX - rect.left;
        const my = mouseGlobalY - rect.top;
        smoothX = p.lerp(smoothX, mx, 0.04);
        smoothY = p.lerp(smoothY, my, 0.04);
      } else {
        roamTimer++;
        if (roamTimer > roamInterval) {
          roamTimer = 0;
          roamInterval = p.random(120, 300);
          roamTargetX = p.random(p.width * 0.1, p.width * 0.9);
          roamTargetY = p.random(p.height * 0.1, p.height * 0.9);
        }
        roamX = p.lerp(roamX, roamTargetX, 0.012);
        roamY = p.lerp(roamY, roamTargetY, 0.012);
        smoothX = roamX;
        smoothY = roamY;
      }

      for (let f of flows) {
        f.update(t);
        f.display(smoothX, smoothY, p);
      }
    };

    p.windowResized = function () {
      const container = document.getElementById(containerId);
      p.resizeCanvas(container.offsetWidth, container.offsetHeight);
      p.background(30, 8, 96);
      drawInitialMosaic(p);
    };

    function drawInitialMosaic(p) {
      p.noStroke();
      let tileSize = 70;
      for (let x = 0; x < p.width; x += tileSize) {
        for (let y = 0; y < p.height; y += tileSize) {
          let h = p.random(360);
          let sat = p.random(8, 38);
          let bri = p.random(72, 96);
          let a = p.random(18, 55);
          let w = tileSize + p.random(-4, 4);
          let h2 = tileSize + p.random(-4, 4);
          p.fill(h, sat, bri, a);
          let blur = p.random(40, 80);
          p.drawingContext.filter = `blur(${blur}px)`;
          p.rect(x + p.random(-3, 3), y + p.random(-3, 3), w, h2);
        }
      }
      p.drawingContext.filter = 'none';
    }
  };
}

let mouseGlobalX = 0;
let mouseGlobalY = 0;
document.addEventListener('mousemove', e => {
  mouseGlobalX = e.clientX;
  mouseGlobalY = e.clientY;
});

class FlowBundle {
  constructor(p) {
    this.p = p;
    this.init();
  }

  init() {
    const p = this.p;
    this.seedX = p.random(p.width * 0.05, p.width * 0.95);
    this.seedY = p.random(p.height * 0.05, p.height * 0.95);
    this.driftAngle = p.random(p.TWO_PI);
    this.driftSpeed = p.random(0.001, 0.004);
    this.driftRadius = p.random(20, 80);
    this.hue = p.random(360);
    this.hueOffset = p.random(50);
    this.lineCount = p.floor(p.random(12, 28));
    this.spread = p.random(8, 35);
    this.noiseOffX = p.random(1000);
    this.noiseOffY = p.random(1000);
  }

  update(t) {
    const p = this.p;
    this.driftAngle += this.driftSpeed;
    this.cx = this.seedX + p.cos(this.driftAngle) * this.driftRadius;
    this.cy = this.seedY + p.sin(this.driftAngle * 0.7) * this.driftRadius * 0.6;
  }

  display(fx, fy, p) {
    const t_val = this.driftAngle;

    let nx = p.noise(this.noiseOffX + t_val * 0.5) * 2 - 1;
    let ny = p.noise(this.noiseOffY + t_val * 0.5) * 2 - 1;
    let nx2 = p.noise(this.noiseOffX + t_val * 0.5 + 7) * 2 - 1;
    let ny2 = p.noise(this.noiseOffY + t_val * 0.5 + 7) * 2 - 1;

    let spineLen = p.random(p.width * 0.5, p.width * 1.2);

    let ax = this.cx + nx * spineLen * 0.6;
    let ay = this.cy + ny * spineLen * 0.6;
    let bx = this.cx + nx2 * spineLen * 0.6;
    let by = this.cy + ny2 * spineLen * 0.6;

    let angle = p.atan2(by - ay, bx - ax);
    let perp = angle + p.HALF_PI;
    let bow1 = p.noise(this.noiseOffX + t_val + 10) * 2 - 1;
    let bow2 = p.noise(this.noiseOffY + t_val + 10) * 2 - 1;

    let cp1x = p.lerp(ax, bx, 0.3) + p.cos(perp) * bow1 * spineLen * 0.65;
    let cp1y = p.lerp(ay, by, 0.3) + p.sin(perp) * bow1 * spineLen * 0.65;
    let cp2x = p.lerp(ax, bx, 0.7) + p.cos(perp) * bow2 * spineLen * 0.55;
    let cp2y = p.lerp(ay, by, 0.7) + p.sin(perp) * bow2 * spineLen * 0.55;

    for (let i = 0; i < this.lineCount; i++) {
      let offset = p.map(i, 0, this.lineCount - 1, -this.spread, this.spread);
      let jitter = p.random(-4, 4);

      let oax = ax + p.cos(perp) * (offset + jitter);
      let oay = ay + p.sin(perp) * (offset + jitter);
      let obx = bx + p.cos(perp) * (offset + jitter * 0.5);
      let oby = by + p.sin(perp) * (offset + jitter * 0.5);
      let ocp1x = cp1x + p.cos(perp) * offset * 0.75;
      let ocp1y = cp1y + p.sin(perp) * offset * 0.75;
      let ocp2x = cp2x + p.cos(perp) * offset * 0.75;
      let ocp2y = cp2y + p.sin(perp) * offset * 0.75;

      let focusSum = 0;
      let samples = 5;
      for (let s = 0; s < samples; s++) {
        let st = s / (samples - 1);
        let px = p.bezierPoint(oax, ocp1x, ocp2x, obx, st);
        let py = p.bezierPoint(oay, ocp1y, ocp2y, oby, st);
        let d = p.dist(px, py, fx, fy);
        focusSum += 1 - smoothstep(FOCUS_RADIUS * 0.4, FOCUS_RADIUS * 1.6, d);
      }
      let focus = focusSum / samples;

      let h = (this.hue + this.hueOffset * p.sin(i * 0.5 + t_val) + 360) % 360;
      let sat = p.lerp(5, 25, focus);
      let bri = p.lerp(90, 70, focus);
      let a = p.lerp(4, 28, focus);
      let w = p.lerp(0.15, 0.9, focus);

      p.stroke(h, sat, bri, a);
      p.strokeWeight(w);
      p.noFill();
      p.beginShape();
      p.vertex(oax, oay);
      p.bezierVertex(ocp1x, ocp1y, ocp2x, ocp2y, obx, oby);
      p.endShape();
    }
  }
}

function smoothstep(edge0, edge1, x) {
  let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

for (let i = 0; i < TILE_COUNT; i++) {
  new p5(makeSketch(`tile-${i}`, i === INTERACTIVE_IDX));
}