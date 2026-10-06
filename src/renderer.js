// renderer.js — three.js 3D cube. The cube is always re-coloured from the
// logical model after every turn, so the picture can never drift.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { COLOR, DIRS, MOVE_DEF, worldNormal } from './cube.js';

const COLOR_INT = {};
for (const k of Object.keys(COLOR)) COLOR_INT[k] = new THREE.Color(COLOR[k]).getHex();
const INTERNAL = 0x0e0e12;
const SPACING = 1.02;

function key(p) {
  return p[0] + ',' + p[1] + ',' + p[2];
}

export class CubeRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(4.4, 4.8, 6.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 22;
    this.controls.rotateSpeed = 0.9;

    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.5);
    d1.position.set(6, 10, 8);
    this.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.6);
    d2.position.set(-7, -6, -8);
    this.scene.add(d2);
    const d3 = new THREE.DirectionalLight(0xffffff, 0.4);
    d3.position.set(-6, 8, -8);
    this.scene.add(d3);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.slots = [];
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const mats = [];
          for (let d = 0; d < 6; d++)
            mats.push(new THREE.MeshLambertMaterial({ color: INTERNAL, emissive: 0x000000 }));
          const mesh = new THREE.Mesh(geo, mats);
          mesh.position.set(x * SPACING, y * SPACING, z * SPACING);
          const basePos = mesh.position.clone();
          this.group.add(mesh);
          this.slots.push({ slot: [x, y, z], mesh, basePos, mats, moving: false });
        }

    this.busy = false;
    this._raf = requestAnimationFrame(() => this.loop());
    this._resizeObs = new ResizeObserver(() => this.resize());
    this._resizeObs.observe(container);
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth || 300);
    const h = Math.max(1, this.container.clientHeight || 300);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // updateStyle = true: keep the canvas CSS size locked to the container so
    // high-DPI displays (devicePixelRatio > 1) cannot overflow it.
    this.renderer.setSize(w, h, true);
  }

  loop() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this.loop());
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._resizeObs.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode)
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }

  // Re-colour every cubie from a logical Cube.
  sync(cube) {
    const bySlot = new Map();
    for (const c of cube.cubies) bySlot.set(key(c.p), c);
    for (const s of this.slots) {
      const cubie = bySlot.get(key(s.slot));
      for (let d = 0; d < 6; d++) {
        let col = INTERNAL;
        if (cubie) {
          const n = DIRS[d];
          const onFace = s.slot[0] * n[0] + s.slot[1] * n[1] + s.slot[2] * n[2] === 1;
          if (onFace) {
            for (let ld = 0; ld < 6; ld++) {
              if (!cubie.s[ld]) continue;
              const w = worldNormal(cubie, ld);
              if (w[0] === n[0] && w[1] === n[1] && w[2] === n[2]) {
                col = COLOR_INT[cubie.s[ld]];
                break;
              }
            }
          }
        }
        s.mats[d].color.setHex(col);
      }
    }
  }

  setHighlight(move) {
    for (const s of this.slots) {
      const on = move && MOVE_DEF[move.base].layers.includes(s.slot[MOVE_DEF[move.base].axis]);
      for (const m of s.mats) m.emissive.setHex(on ? 0x2a2a1a : 0x000000);
    }
  }

  clearHighlight() {
    this.setHighlight(null);
  }

  // Animate a single move, then commit it to the logical cube.
  animateMove(cube, move, duration = 260) {
    return new Promise((resolve) => {
      const def = MOVE_DEF[move.base];
      const angle = def.d * move.amount * (Math.PI / 2);
      const axis = new THREE.Vector3(def.axis === 0 ? 1 : 0, def.axis === 1 ? 1 : 0, def.axis === 2 ? 1 : 0);
      const moving = this.slots.filter((s) => def.layers.includes(s.slot[def.axis]));
      for (const s of moving) s.moving = true;
      this.setHighlight(move);
      const start = performance.now();
      const q = new THREE.Quaternion();

      const finish = () => {
        for (const s of this.slots) {
          s.mesh.position.copy(s.basePos);
          s.mesh.quaternion.identity();
        }
        cube.applyMove(move);
        this.sync(cube);
        for (const s of moving) s.moving = false;
        resolve();
      };

      if (duration <= 0) return finish();

      const tick = (now) => {
        let t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const a = angle * e;
        q.setFromAxisAngle(axis, a);
        for (const s of moving) {
          s.mesh.position.copy(s.basePos).applyQuaternion(q);
          s.mesh.quaternion.copy(q);
        }
        if (t < 1) requestAnimationFrame(tick);
        else finish();
      };
      requestAnimationFrame(tick);
    });
  }

  async animateMoves(cube, moves, { duration = 260, onStep = null, shouldStop = null } = {}) {
    for (let i = 0; i < moves.length; i++) {
      if (shouldStop && shouldStop()) return false;
      if (onStep) onStep(i);
      await this.animateMove(cube, moves[i], duration);
    }
    return true;
  }
}
