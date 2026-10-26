import * as THREE from '../../dist/vendor/three.module.js';

const SKIN = ['#c68b65', '#e2b38d', '#77503b', '#ad7453', '#d6a17c', '#654431'];
const HAIR = ['#211b19', '#51382a', '#9d7148', '#15171c'];

function hash(value) {
  let n = 2166136261;
  for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0 });
}

function capsule(radius, length, colour) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material(colour));
  mesh.castShadow = true;
  mesh.position.y = -(length * 0.5 + radius);
  return mesh;
}

function numberPlate(number, ink) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = ink;
  g.font = '700 84px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(number), 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  plate.position.set(0, 0.02, -0.14);
  plate.rotation.y = Math.PI;
  return plate;
}

export function createAthlete(player) {
  const id = hash(player.name);
  const skin = SKIN[id % SKIN.length];
  const hairTone = HAIR[id % HAIR.length];
  const home = player.team === 0;
  const keeper = player.role === 'GK';
  const shirt = keeper ? (home ? '#f3a54e' : '#7eb6e0') : (home ? '#c6e86a' : '#d7dee6');
  const shorts = home ? '#17221f' : '#1c2833';
  const sock = shirt;
  const boot = id % 2 ? '#e7efe1' : '#c4552a';
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.96;
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.2), material(shorts));
  pelvis.castShadow = true;
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.22), material(shirt));
  chest.position.y = 0.28;
  chest.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), material(skin));
  head.position.y = 0.66;
  head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), material(hairTone));
  hair.position.y = 0.7;
  hair.scale.y = id % 3 === 0 ? 0.7 : 1;
  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 0.46, 0);
    shoulder.add(capsule(0.055, 0.22, shirt));
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    elbow.add(capsule(0.048, 0.2, skin));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(keeper ? 0.07 : 0.045, 8, 6), material(keeper ? '#f6f3ec' : skin));
    hand.position.y = -0.32;
    elbow.add(hand);
    shoulder.add(elbow);
    shoulder.userData.elbow = elbow;
    return shoulder;
  };
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.02, 0);
    hip.add(capsule(0.075, 0.32, shorts));
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    knee.add(capsule(0.06, 0.3, sock));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), material(boot));
    foot.position.set(0, -0.46, 0.04);
    knee.add(foot);
    hip.add(knee);
    hip.userData.knee = knee;
    return hip;
  };
  const armL = arm(-1);
  const armR = arm(1);
  const legL = leg(-1);
  const legR = leg(1);
  const eye = (x) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), material('#2a211c'));
    mesh.position.set(x, 0.68, 0.12);
    return mesh;
  };
  chest.add(numberPlate(player.number, home ? '#17221f' : '#10161c'));
  torso.add(chest, head, hair, eye(-0.05), eye(0.05), armL, armR);
  hips.add(pelvis, torso, legL, legR);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24), new THREE.MeshBasicMaterial({ color: '#c6e86a', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  root.add(hips, ring);
  return { root, hips, torso, armL, armR, legL, legR, ring };
}

export function poseAthlete(view, player, time) {
  const moving = player.speed > 0.45 && player.state !== 'slide' && player.state !== 'dive' && player.state !== 'stumble' && player.state !== 'head';
  const phase = time * (player.speed > 6 ? 13 : 9) + player.number;
  const tired = (player.stamina ?? 1) < 0.25;
  const swing = moving ? Math.sin(phase) * (tired ? 0.4 : 0.75) : Math.sin(time * 1.6 + player.number) * 0.04;
  view.root.position.set(player.x, 0, player.z);
  view.root.rotation.y = player.yaw;
  view.hips.rotation.set(0, 0, 0);
  view.hips.position.y = 0.96 + (moving ? Math.abs(Math.sin(phase)) * 0.05 : 0);
  view.torso.rotation.set(moving ? 0.14 : 0, 0, 0);
  view.legL.rotation.set(swing, 0, 0);
  view.legR.rotation.set(-swing, 0, 0);
  view.legL.userData.knee.rotation.x = moving ? Math.max(0, Math.sin(phase)) * 0.7 : 0.05;
  view.legR.userData.knee.rotation.x = moving ? Math.max(0, Math.sin(phase + Math.PI)) * 0.7 : 0.05;
  view.armL.rotation.set(-swing * 0.7, 0, 0.45);
  view.armR.rotation.set(swing * 0.7, 0, -0.45);
  view.armL.userData.elbow.rotation.x = moving ? 0.4 : 0.15;
  view.armR.userData.elbow.rotation.x = moving ? 0.4 : 0.15;
  if (player.state === 'head') {
    view.hips.position.y = 1.14;
    view.torso.rotation.x = -0.9;
    view.armL.rotation.set(-0.4, 0, 0.35);
    view.armR.rotation.set(-0.4, 0, -0.35);
  }
  if (player.state === 'kick') {
    const t = 1 - Math.max(0, Math.min(1, (player.stateUntil - time) / 0.38));
    view.legR.rotation.x = -1.2 * Math.sin(t * Math.PI);
    view.torso.rotation.x = -0.12;
  }
  if (player.state === 'stumble') {
    view.hips.position.y = 0.78;
    view.torso.rotation.x = 0.85;
    view.armL.rotation.set(0.2, 0, 1.15);
    view.armR.rotation.set(-0.1, 0, -0.55);
    view.legL.rotation.x = 0.65;
    view.legR.rotation.x = -0.25;
    view.legL.userData.knee.rotation.x = 0.9;
  }
  if (player.state === 'slide') {
    view.hips.rotation.z = 1.05;
    view.hips.position.y = 0.42;
    view.legR.rotation.x = -1.15;
    view.torso.rotation.x = 0.4;
  }
  if (player.state === 'dive') {
    view.hips.rotation.z = 1.25 * (player.dive || 1);
    view.hips.position.y = 0.48;
    view.armL.rotation.z = 1.4;
    view.armR.rotation.z = -1.4;
  }
  if (player.state === 'celebrate') {
    view.hips.position.y = 0.96 + Math.abs(Math.sin(time * 8)) * 0.22;
    view.armL.rotation.z = 2.3;
    view.armR.rotation.z = -2.3;
    view.torso.rotation.x = -0.1;
  }
  view.ring.visible = !!player.human;
}
