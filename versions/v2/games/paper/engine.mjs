import { World, Vec2, Box, Circle } from './vendor/planck-1.5.1.mjs';

export const DT = 1 / 120;
export const LIMIT = 3;
export const ORIGIN = { x: 3, y: 2.1 };
export const MATERIALS = {
  paper: { density: .65, friction: .65, threshold: 4.8 },
  wood: { density: 1.3, friction: .7, threshold: 12 }
};
export const LEVELS = [
  {
    name: '偏心一击',
    hint: '瞄准左侧立柱的上半段，让横梁失去支撑。',
    blocks: [
      ['paper', 19, .8, .42, 1.6], ['paper', 19, 2.42, .42, 1.6],
      ['wood', 22.4, .8, .48, 1.6], ['wood', 22.4, 2.42, .48, 1.6],
      ['wood', 20.7, 3.48, 4.4, .45], ['paper', 19.3, 4.05, .7, .65],
      ['wood', 22.05, 4.05, .7, .65]
    ],
    targets: [[20.8, 4.43]]
  },
  {
    name: '越墙拆顶',
    hint: '抬高弹道越过矮墙，击中上层纸支柱，让两只木偶随屋顶落下。',
    obstacles: [[13, 2.35, 1.1, 4.7]],
    blocks: [
      ['wood', 18.8, 1.3, .5, 2.6], ['wood', 22.2, 1.3, .5, 2.6],
      ['wood', 20.5, 2.86, 4.4, .45],
      ['paper', 19.6, 3.85, .28, 1.5], ['paper', 21.4, 3.85, .28, 1.5],
      ['wood', 20.5, 4.86, 3.8, .45]
    ],
    targets: [[19.65, 5.81], [21.35, 5.81]]
  }
];

const MAX_EVENTS = 128;
const CONTACT_COOLDOWN = .12;

export class Game {
  constructor(level = 0) {
    this.level = level;
    this.world = new World(Vec2(0, -9.8));
    this.items = [];
    this.events = [];
    this.pending = new Map();
    this.contactSpeeds = new WeakMap();
    this.tick = 0;
    this.shots = 0;
    this.state = 'ready';
    this.quiet = 0;
    this.shotAge = 0;
    this.elapsed = 0;
    this.broken = 0;
    this.id = 0;
    this.activeShot = null;
    this.eventSerial = 0;
    this.world.createBody().createFixture(Box(40, .5, Vec2(15, -.5)), { friction: .85 });
    const layout = LEVELS[level];
    this.obstacles = (layout.obstacles || []).map(([x, y, w, h]) => ({ x, y, w, h, material: 'wood' }));
    for (const [material, x, y, w, h] of layout.blocks) this.add('block', x, y, w, h, material);
    for (const [x, y] of layout.targets) this.add('target', x, y, .95, 1.4, 'wood');
    for (const [x, y, w, h] of layout.obstacles || []) this.add('obstacle', x, y, w, h, 'wood', true);

    // Record approach speed before the solver cancels it. Resting support forces
    // must not create impact effects, even when a heavy roof rests on a post.
    this.world.on('pre-solve', contact => {
      const manifold = contact.getWorldManifold(null);
      if (!manifold || !contact.getManifold().pointCount) return;
      const point = manifold.points[0];
      const a = contact.getFixtureA().getBody().getLinearVelocityFromWorldPoint(point);
      const b = contact.getFixtureB().getBody().getLinearVelocityFromWorldPoint(point);
      const approach = Math.max(0, (a.x - b.x) * manifold.normal.x + (a.y - b.y) * manifold.normal.y);
      this.contactSpeeds.set(contact, approach);
    });
    this.world.on('post-solve', (contact, impulse) => {
      const force = Math.max(0, ...impulse.normalImpulses);
      const manifold = contact.getWorldManifold(null);
      const point = manifold?.points[0];
      for (const fixture of [contact.getFixtureA(), contact.getFixtureB()]) {
        const item = fixture.getBody().getUserData();
        if (!item) continue;
        if (item.kind === 'block' && force > MATERIALS[item.material].threshold) {
          this.pending.set(item, Math.max(force, this.pending.get(item) || 0));
        }
        if (!point || force < .65 || (this.contactSpeeds.get(contact) || 0) < .8 ||
            this.elapsed - item.lastContact < CONTACT_COOLDOWN) continue;
        item.lastContact = this.elapsed;
        item.contactPulse = Math.min(1, force / 12);
        // Cosmetic crack intensity is the latest impact, never accumulated damage.
        item.crack = item.kind === 'block' ? Math.min(1, force / MATERIALS[item.material].threshold) : 0;
        item.contactPoint = { x: point.x, y: point.y };
        this.emit({ type: 'impact', id: item.id, kind: item.kind, material: item.material,
          x: point.x, y: point.y, impulse: force, pulse: item.contactPulse, crack: item.crack });
      }
    });
  }

  emit(event) {
    this.events.push({ ...event, tick: this.tick, serial: ++this.eventSerial });
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
  }

  add(kind, x, y, w, h, material = 'paper', isStatic = false) {
    const item = { id: ++this.id, kind, material, w, h, start: { x, y }, down: false,
      tiltTime: 0, body: null, broken: false, static: isStatic, lastContact: -Infinity,
      contactPulse: 0, crack: 0, contactPoint: null };
    const body = this.world.createBody({ type: isStatic ? 'static' : 'dynamic',
      position: Vec2(x, y), linearDamping: .045, angularDamping: .08, bullet: kind === 'shot' });
    body.setUserData(item);
    body.createFixture(kind === 'shot' ? Circle(w / 2) : Box(w / 2, h / 2), {
      density: kind === 'shot' ? 4 : MATERIALS[material].density,
      friction: kind === 'shot' ? .6 : MATERIALS[material].friction, restitution: .04
    });
    item.body = body;
    this.items.push(item);
    return item;
  }

  start() { if (this.state === 'ready') this.state = 'aim'; }
  pause() {
    if (['aim', 'flight'].includes(this.state)) {
      this.resumeState = this.state;
      this.state = 'paused';
    }
  }
  resume() { if (this.state === 'paused') this.state = this.resumeState; }

  launch(angle, power) {
    if (this.state !== 'aim' || this.shots >= LIMIT || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
    angle = Math.max(12, Math.min(75, angle));
    power = Math.max(15, Math.min(100, power));
    const speed = 8 + power * .24;
    const radians = angle * Math.PI / 180;
    const item = this.add('shot', ORIGIN.x, ORIGIN.y, .56, .56);
    item.body.setLinearVelocity(Vec2(Math.cos(radians) * speed, Math.sin(radians) * speed));
    this.activeShot = item;
    this.shots++;
    this.shotAge = 0;
    this.quiet = 0;
    this.state = 'flight';
    return true;
  }

  step() {
    if (!['aim', 'flight'].includes(this.state)) return;
    this.tick++;
    this.elapsed += DT;
    for (const item of this.items) {
      item.contactPulse = Math.max(0, item.contactPulse - DT * 3.5);
      item.crack = Math.max(0, item.crack - DT * .65);
      if (item.kind !== 'shot' || !item.body) continue;
      let grounded = false;
      for (let edge = item.body.getContactList(); edge; edge = edge.next) {
        // Only the untagged ground gets rolling resistance. A wall contact
        // must retain ordinary damping, including while the shot rebounds.
        if (edge.contact.isTouching() && edge.other.isStatic() && !edge.other.getUserData()) {
          grounded = true;
          break;
        }
      }
      item.body.setLinearDamping(grounded ? .8 : .045);
      item.body.setAngularDamping(grounded ? 1.2 : .08);
    }
    this.world.step(DT, 10, 4);
    for (const [item, impulse] of this.pending) {
      if (item.broken) continue;
      item.broken = true;
      const position = item.body.getPosition();
      this.emit({ type: 'break', id: item.id, x: position.x, y: position.y, impulse,
        material: item.material, w: item.w, h: item.h, angle: item.body.getAngle() });
      this.world.destroyBody(item.body);
      item.body = null;
      this.broken++;
    }
    this.pending.clear();
    for (const item of this.items) {
      if (!item.body) continue;
      const position = item.body.getPosition();
      if (item.kind === 'target' && !item.down) {
        const angle = Math.abs(Math.atan2(Math.sin(item.body.getAngle()), Math.cos(item.body.getAngle())));
        const fallen = angle > .85 || position.y < item.start.y - .8 || Math.abs(position.x - item.start.x) > 1.1;
        item.tiltTime = fallen ? item.tiltTime + DT : 0;
        if (item.tiltTime > .22) {
          item.down = true;
          this.emit({ type: 'down', id: item.id });
        }
      }
      if (item.kind === 'shot' && (position.x > 37 || position.x < -5 || position.y < -4)) {
        this.world.destroyBody(item.body);
        item.body = null;
      }
    }
    if (this.state === 'flight') {
      this.shotAge += DT;
      const moving = this.items.some(item => item.body && !item.static &&
        (item.body.getLinearVelocity().length() > .12 ||
         Math.abs(item.body.getAngularVelocity()) > (item.kind === 'shot' ? .12 / (item.w / 2) : .14)));
      this.quiet = moving ? 0 : this.quiet + DT;
      if (this.quiet > .85 && this.shotAge > 1.2) {
        if (this.items.filter(item => item.kind === 'target').every(item => item.down)) this.state = 'won';
        else if (this.shots >= LIMIT) this.state = 'lost';
        else this.state = 'aim';
      }
      if (this.shotAge > 60) this.state = 'timeout';
    }
  }

  snapshot() {
    return { state: this.state, shots: this.shots, tick: this.tick, broken: this.broken,
      bodies: this.items.filter(item => item.body).length,
      items: this.items.map(item => ({ id: item.id, kind: item.kind, down: item.down,
        broken: item.broken, static: item.static, x: item.body?.getPosition().x,
        y: item.body?.getPosition().y, a: item.body?.getAngle(), w: item.body?.getAngularVelocity(),
        contactPulse: item.contactPulse, crack: item.crack, contactPoint: item.contactPoint })) };
  }
}
