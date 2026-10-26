import * as THREE from '../../dist/vendor/three.module.js';
import { HALF_L, HALF_W, GOAL_W } from './match.js';

function pitchTexture() {
  const width = 1024;
  const height = 662;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  for (let i = 0; i < 14; i++) {
    g.fillStyle = i % 2 ? '#1b7a48' : '#16693d';
    g.fillRect((width / 14) * i, 0, width / 14 + 1, height);
  }
  g.strokeStyle = '#e7f3ea';
  g.lineWidth = 3;
  const x = (metres) => ((metres + HALF_L) / (HALF_L * 2)) * width;
  const y = (metres) => ((metres + HALF_W) / (HALF_W * 2)) * height;
  g.strokeRect(x(-HALF_L), y(-HALF_W), x(HALF_L) - x(-HALF_L), y(HALF_W) - y(-HALF_W));
  g.beginPath();
  g.moveTo(x(0), y(-HALF_W));
  g.lineTo(x(0), y(HALF_W));
  g.stroke();
  g.beginPath();
  g.arc(x(0), y(0), (9.15 / (HALF_L * 2)) * width, 0, Math.PI * 2);
  g.stroke();
  for (const side of [-1, 1]) {
    const box = 16.5;
    const six = 5.5;
    g.strokeRect(x(side * HALF_L - side * box), y(-20.16), side * (x(side * HALF_L) - x(side * HALF_L - side * box)), y(20.16) - y(-20.16));
    g.strokeRect(x(side * HALF_L - side * six), y(-9.16), side * (x(side * HALF_L) - x(side * HALF_L - side * six)), y(9.16) - y(-9.16));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function goal(scene, side) {
  const x = side * HALF_L;
  const post = new THREE.MeshStandardMaterial({ color: '#f4f7f2', roughness: 0.4, metalness: 0.15 });
  const pole = (z) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.44, 10), post);
    mesh.position.set(x, 1.22, z);
    mesh.castShadow = true;
    return mesh;
  };
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, GOAL_W * 2, 10), post);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(x, 2.44, 0);
  bar.castShadow = true;
  scene.add(pole(-GOAL_W), pole(GOAL_W), bar);
  const net = new THREE.LineBasicMaterial({ color: '#d5ddd6', transparent: true, opacity: 0.45 });
  const points = [];
  for (let i = 0; i <= 8; i++) {
    const z = -GOAL_W + (GOAL_W * 2 * i) / 8;
    points.push(x, 0.05, z, x - side * 1.8, 0.7, z * 0.82);
    points.push(x, 2.44, z, x - side * 1.5, 2, z * 0.7);
  }
  for (let i = 0; i <= 5; i++) {
    const y = (2.44 * i) / 5;
    points.push(x, y, -GOAL_W, x, y, GOAL_W);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.LineSegments(geometry, net));
}

function stands(scene) {
  const concrete = new THREE.MeshStandardMaterial({ color: '#243140', roughness: 0.9 });
  const seat = new THREE.MeshStandardMaterial({ color: '#31475a', roughness: 1 });
  for (const z of [-48, 48]) {
    const bowl = new THREE.Mesh(new THREE.BoxGeometry(120, 7, 10), concrete);
    bowl.position.set(0, 2.2, z);
    bowl.rotation.x = z > 0 ? 0.18 : -0.18;
    scene.add(bowl);
    const seats = new THREE.Mesh(new THREE.BoxGeometry(116, 4.5, 6), seat);
    seats.position.set(0, 4.2, z > 0 ? 50 : -50);
    scene.add(seats);
  }
  const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.7, 0.4), new THREE.MeshStandardMaterial({ roughness: 1 }), 160);
  const dummy = new THREE.Object3D();
  const colours = ['#c6e86a', '#d7dee6', '#8ea0b0', '#1c3a2e', '#f6f3ec'].map(c => new THREE.Color(c));
  let n = 0;
  for (const side of [-50, 50]) {
    for (let i = 0; i < 40; i++) {
      for (let row = 0; row < 2; row++) {
        dummy.position.set(-48 + i * 2.5, 3.4 + row * 0.7, side + (side > 0 ? row * 0.5 : -row * 0.5));
        dummy.updateMatrix();
        crowd.setMatrixAt(n, dummy.matrix);
        crowd.setColorAt(n, colours[(i + row) % colours.length]);
        n += 1;
      }
    }
  }
  crowd.instanceColor.needsUpdate = true;
  scene.add(crowd);
}

export function createStadium() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10161c');
  scene.fog = new THREE.Fog('#10161c', 48, 150);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(HALF_L * 2, HALF_W * 2), new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(140, 96), new THREE.MeshStandardMaterial({ color: '#143626', roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  scene.add(apron);
  stands(scene);
  goal(scene, 1);
  goal(scene, -1);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#f6f3ec', emissive: '#f6f3ec', emissiveIntensity: 0.7 });
  for (const [x, z] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 14, 8), new THREE.MeshStandardMaterial({ color: '#1c2833' }));
    pole.position.set(x, 7, z);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.8), lampMat);
    lamp.position.set(x, 14, z);
    scene.add(pole, lamp);
  }
  scene.add(new THREE.HemisphereLight('#d7e6f5', '#1d4a3c', 0.85));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.35);
  sun.position.set(-28, 36, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
  camera.position.set(-18, 11, 0);
  return { scene, camera };
}
