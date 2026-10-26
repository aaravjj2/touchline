// A small match you play on the pitch. Numbers are metres. The manager simulation is not involved.
export const HALF_L = 52.5;
export const HALF_W = 34;
export const GOAL_W = 3.66;
export const MATCH_LENGTH = 240;
export const WIN_GOALS = 3;

const HOME = [
  ['Ellis Ward', 'GK', 1],
  ['Theo Marsh', 'DEF', 3],
  ['Luca Fenwick', 'DEF', 4],
  ['Jonah Reed', 'MID', 8],
  ['Zane Brooks', 'FWD', 14],
];
const AWAY = [
  ['Samir Vale', 'GK', 1],
  ['Noah Mercer', 'DEF', 5],
  ['Idris Bell', 'DEF', 6],
  ['Milo Hart', 'MID', 10],
  ['Oscar Hale', 'FWD', 15],
];

function player(team, name, role, number, x, z) {
  return {
    team, name, role, number, x, z, homeX: x, homeZ: z, yaw: team === 0 ? Math.atan2(1, 0) : Math.atan2(-1, 0),
    speed: 0, stamina: 1, shot: 0, place: 0, state: 'idle', stateUntil: 0, cooldown: 0, human: false, pending: null, dive: 1,
  };
}

function lineup(team, rows) {
  const sign = team === 0 ? 1 : -1;
  const spots = { GK: [[-46, 0]], DEF: [[-24, -12], [-24, 12]], MID: [[-6, 0]], FWD: [[4, 0]] };
  const used = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  return rows.map(([name, role, number]) => {
    const spot = spots[role][used[role]++];
    return player(team, name, role, number, spot[0] * sign, spot[1] * sign);
  });
}

export function createMatch() {
  const players = [...lineup(0, HOME), ...lineup(1, AWAY)];
  const human = players.findIndex(p => p.name === 'Zane Brooks');
  players[human].human = true;
  return {
    players,
    control: human,
    ball: { x: 0, y: 0.18, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null },
    score: [0, 0],
    time: 0,
    phase: 'ready',
    message: '',
    scorer: '',
    lock: 0,
    kickTeam: 0,
    charge: 0,
    lastGoal: 0,
    starter: 'Zane Brooks',
    awayHuman: false,
    controlAway: -1,
    halved: false,
    aim: null,
    aimSpot: null,
    call: '',
    callUntil: 0,
    stats: freshStats(),
    heldKick: false,
    runner: null,
    touchBan: null,
    touchUntil: 0,
    knock: null,
    knockUntil: 0,
    give: null,
    through: null,
    setZ: [0, 0],
  };
}

function freshStats() {
  return [0, 1].map(() => ({ shots: 0, onTarget: 0, saves: 0, passes: 0, possession: 0 }));
}

export function chooseStarter(match, name) {
  if (match.players.some(p => p.team === 0 && p.name === name)) match.starter = name;
}

export function seatFriend(match, on) {
  match.awayHuman = !!on;
}

function attack(team) { return team === 0 ? 1 : -1; }
function ownGoalX(team) { return team === 0 ? -HALF_L : HALF_L; }
function yawTo(dx, dz) { return Math.atan2(dx, dz); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function len(x, z) { return Math.hypot(x, z) || 0.0001; }

function allowSprint(p, sprint, dt) {
  if (sprint && p.stamina > 0.05 && p.speed > 4.8) p.stamina = Math.max(0, p.stamina - dt * 0.22);
  else p.stamina = Math.min(1, p.stamina + dt * 0.1);
  return sprint && p.stamina > 0.05;
}

function steer(p, tx, tz, sprint, dt, matchTime) {
  const dx = tx - p.x;
  const dz = tz - p.z;
  const d = Math.hypot(dx, dz);
  const locked = p.stateUntil > matchTime && (p.state === 'kick' || p.state === 'slide' || p.state === 'dive' || p.state === 'celebrate' || p.state === 'stumble' || p.state === 'head');
  if (locked && p.state !== 'kick') return;
  const running = allowSprint(p, sprint, dt);
  if (d < 0.2) {
    p.speed = Math.max(0, p.speed - 14 * dt);
  } else {
    const top = p.role === 'GK' ? 5.4 : running ? 7.7 : 5.3;
    const ux = dx / d;
    const uz = dz / d;
    const want = Math.min(top, d * 4);
    p.speed += (want - p.speed) * Math.min(1, dt * 8);
    const pace = locked ? p.speed * 0.35 : p.speed;
    p.x += ux * pace * dt;
    p.z += uz * pace * dt;
    const yaw = yawTo(ux, uz);
    const diff = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
    p.yaw += diff * Math.min(1, dt * 12);
  }
  p.x = clamp(p.x, -HALF_L + 1, HALF_L - 1);
  p.z = clamp(p.z, -HALF_W + 1, HALF_W - 1);
  if (p.stateUntil <= matchTime) p.state = p.speed > 6.2 ? 'sprint' : p.speed > 0.45 ? 'jog' : 'idle';
}

function separate(players) {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      let dx = b.x - a.x;
      let dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 0.001;
      if (d >= 0.95) continue;
      const push = (0.95 - d) * 0.5;
      dx /= d;
      dz /= d;
      if (!a.human) { a.x -= dx * push; a.z -= dz * push; }
      if (!b.human) { b.x += dx * push; b.z += dz * push; }
    }
  }
}

function nearest(players, x, z, pred) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    if (pred && !pred(p)) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function placeBallOn(match, p) {
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  match.ball.owner = p;
  match.ball.lastTouch = p;
  match.ball.x = p.x + fx * 0.85;
  match.ball.z = p.z + fz * 0.85;
  match.ball.y = 0.18;
  match.ball.vx = 0;
  match.ball.vy = 0;
  match.ball.vz = 0;
}

function release(match, p, dx, dz, speed, loft, kind) {
  const d = len(dx, dz);
  match.ball.owner = null;
  match.ball.lastTouch = p;
  match.ball.vx = dx / d * speed;
  match.ball.vz = dz / d * speed;
  match.ball.vy = loft;
  match.ball.x = p.x + dx / d * 0.9;
  match.ball.z = p.z + dz / d * 0.9;
  match.ball.hot = kind === 'shot';
  match.heldKick = false;
  if (kind === 'pass' || kind === 'through') {
    match.stats[p.team].passes += 1;
    if (kind === 'pass') {
      const reach = Math.min(16, speed * 0.5);
      match.runner = nearest(match.players, p.x + dx / d * reach, p.z + dz / d * reach, q => q.team === p.team && q !== p && q.role !== 'GK' && !q.human);
      if (p.human) {
        const dir = attack(p.team);
        match.give = { player: p, x: clamp(p.x + dir * 14, -40, 40), z: clamp(p.z * 0.35, -12, 12), until: match.time + 2.2 };
      }
    }
  } else match.runner = null;
  p.state = 'kick';
  p.stateUntil = match.time + 0.38;
}

function facing(p) {
  if (p.wish && (p.wish.x || p.wish.z)) {
    const d = len(p.wish.x, p.wish.z);
    return { x: p.wish.x / d, z: p.wish.z / d };
  }
  return { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
}

function passTarget(p, players, through, prefer = null) {
  const face = facing(p);
  const fx = face.x;
  const fz = face.z;
  let best = null;
  let score = -Infinity;
  for (const mate of players) {
    if (mate === p || mate.team !== p.team || mate.role === 'GK') continue;
    const dx = mate.x - p.x + (through ? fx * 8 : 0);
    const dz = mate.z - p.z + (through ? fz * 8 : 0);
    const dist = Math.hypot(dx, dz);
    if (dist < 3 || dist > (through ? 46 : 32)) continue;
    const align = (dx * fx + dz * fz) / dist;
    const value = align * 3 - dist * 0.03 + (mate === prefer ? 5 : 0);
    if (value > score) { score = value; best = { x: mate.x + (through ? fx * 8 : 0), z: mate.z + (through ? fz * 8 : 0), mate }; }
  }
  if (best) return best;
  return { x: p.x + fx * (through ? 18 : 10), z: p.z + fz * (through ? 18 : 10), mate: null };
}

function throughBall(match, p, hopeful = true) {
  const dir = attack(p.team);
  const face = facing(p);
  const fx = face.x;
  const fz = face.z;
  let best = null;
  let bestScore = 0;
  for (const mate of match.players) {
    if (mate === p || mate.team !== p.team || mate.role === 'GK') continue;
    const dx = mate.x - p.x;
    const dz = mate.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4 || dist > 34 || dx * dir < -1) continue;
    const align = (dx * fx + dz * fz) / dist;
    if (align < 0.05) continue;
    for (const ahead of [7, 11, 15]) {
      for (const wide of [0, 4, -4]) {
        const spot = {
          x: clamp(mate.x + dir * ahead, -46, 46),
          z: clamp(mate.z + wide, -HALF_W + 3, HALF_W - 3),
        };
        const pass = Math.hypot(spot.x - p.x, spot.z - p.z);
        if (pass < 8 || pass > 40 || (spot.x - p.x) * dir < 3) continue;
        const mine = Math.hypot(spot.x - mate.x, spot.z - mate.z) / 7.4;
        let theirs = 99;
        for (const o of match.players) {
          if (o.team === p.team) continue;
          theirs = Math.min(theirs, Math.hypot(o.x - spot.x, o.z - spot.z) / 6.8);
        }
        const score = theirs - mine + align;
        if (score > bestScore) {
          bestScore = score;
          best = { mate, x: spot.x, z: spot.z };
        }
      }
    }
  }
  if (best || hopeful === false) return best;
  const x = clamp(p.x + fx * 16, -46, 46);
  const z = clamp(p.z + fz * 16, -HALF_W + 3, HALF_W - 3);
  const mate = nearest(match.players, x, z, q => q.team === p.team && q !== p && q.role !== 'GK');
  return mate ? { mate, x, z } : null;
}

function playThrough(match, p, ball) {
  const pass = Math.hypot(ball.x - p.x, ball.z - p.z);
  release(match, p, ball.x - p.x, ball.z - p.z, clamp(pass * 1.7, 18, 30), 1.35, 'through');
  match.runner = ball.mate;
  match.give = null;
  match.through = { player: ball.mate, x: ball.x, z: ball.z, until: match.time + 2.4 };
  note(match, 'Through to ' + ball.mate.name.split(' ').pop());
}

function crossSpot(p) {
  const side = Math.sign(p.z) || 1;
  return { x: attack(p.team) * 40, z: side * 2.4 };
}

function playCross(match, p) {
  const spot = crossSpot(p);
  const mate = nearest(match.players, spot.x, spot.z, q => q.team === p.team && q !== p && q.role !== 'GK');
  if (!mate) return false;
  const pass = Math.hypot(spot.x - p.x, spot.z - p.z);
  release(match, p, spot.x - p.x, spot.z - p.z, clamp(pass * 1.15, 16, 24), 8.2, 'pass');
  match.give = null;
  match.runner = mate;
  match.through = { player: mate, x: spot.x, z: spot.z, until: match.time + 3, cross: true };
  note(match, 'Cross to ' + mate.name.split(' ').pop());
  return true;
}

function playGround(match, p) {
  const prefer = match.give && match.give.player !== p && match.give.player.team === p.team ? match.give.player : null;
  const spot = passTarget(p, match.players, false, prefer);
  release(match, p, spot.x - p.x, spot.z - p.z, 15, 2.2, 'pass');
  if (spot.mate) note(match, 'Pass to ' + spot.mate.name.split(' ').pop());
}

function playLoft(match, p) {
  const prefer = match.give && match.give.player !== p && match.give.player.team === p.team ? match.give.player : null;
  const spot = passTarget(p, match.players, false, prefer);
  release(match, p, spot.x - p.x, spot.z - p.z, 16, 6.4, 'pass');
  if (spot.mate) note(match, 'Lofted to ' + spot.mate.name.split(' ').pop());
}

function chasePass(match, p, dt) {
  const ball = match.ball;
  const run = match.through && match.through.player === p && match.time < match.through.until;
  if (run && match.through.cross) {
    const near = Math.hypot(ball.x - match.through.x, ball.z - match.through.z) < 8;
    steer(p, near ? ball.x : match.through.x, near ? ball.z : match.through.z, true, dt, match.time);
    return;
  }
  const toSpot = run && (ball.x - p.x) * attack(p.team) < 1;
  steer(p, toSpot ? match.through.x : ball.x, toSpot ? match.through.z : ball.z, true, dt, match.time);
}

function head(match, p) {
  const dir = attack(p.team);
  const aimZ = clamp(match.ball.z * 0.22, -2.6, 2.6);
  const dx = dir * HALF_L - p.x;
  const dz = aimZ - p.z;
  release(match, p, dx, dz, 15.5, 1.5, 'shot');
  p.state = 'head';
  p.stateUntil = match.time + 0.45;
  match.through = null;
  match.runner = null;
  match.stats[p.team].shots += 1;
  if (Math.abs(aimZ) < GOAL_W) match.stats[p.team].onTarget += 1;
  note(match, p.name.split(' ').pop() + ' heads it');
}

function layOn(match, p) {
  const run = match.give;
  if (!run || run.returned || run.player === p || run.player.team !== p.team || match.time >= run.until) return null;
  const mate = run.player;
  const dir = attack(mate.team);
  let best = null;
  let bestScore = 0;
  for (const ahead of [2.4, 4.2]) {
    for (const wide of [0, 5, -5]) {
      const spot = { x: mate.x + dir * ahead, z: mate.z + wide };
      const pass = Math.hypot(spot.x - p.x, spot.z - p.z);
      if (pass < 4 || pass > 26 || (spot.x - p.x) * dir < 0.4) continue;
      const mine = Math.hypot(spot.x - mate.x, spot.z - mate.z) / 7.2;
      let theirs = 99;
      for (const o of match.players) {
        if (o.team === p.team) continue;
        theirs = Math.min(theirs, Math.hypot(o.x - spot.x, o.z - spot.z) / 7.2);
      }
      const score = theirs - mine;
      if (score > bestScore) { bestScore = score; best = spot; }
    }
  }
  if (!best) return null;
  return { x: clamp(best.x, -44, 44), z: clamp(best.z, -HALF_W + 2, HALF_W - 2), mate };
}

function note(match, text) {
  match.call = text;
  match.callUntil = match.time + 1.8;
}

function shoot(match, p, power, aim = 0) {
  const dir = attack(p.team);
  const goalZ = clamp(aim * 3.1, -3.15, 3.15);
  const dx = dir * HALF_L - p.x;
  const dz = goalZ - p.z;
  const on = Math.abs(goalZ) < GOAL_W;
  release(match, p, dx, dz, 16 + power * 16, 2.2 + power * 3.2, 'shot');
  match.stats[p.team].shots += 1;
  if (on) match.stats[p.team].onTarget += 1;
  note(match, p.name + (on ? ' shoots' : ' shoots wide'));
}

function shoulder(match, p) {
  const owner = match.ball.owner;
  if (!owner || owner === p || owner.team === p.team || p.cooldown > match.time) return;
  const toBall = Math.hypot(match.ball.x - p.x, match.ball.z - p.z);
  const toBody = Math.hypot(owner.x - p.x, owner.z - p.z);
  if (owner.speed < 4.6 && toBall > toBody + 0.12) return;
  if (toBall > 1.2) return;
  const dir = attack(p.team);
  match.touchBan = owner;
  match.touchUntil = match.time + 0.45;
  match.ball.owner = null;
  match.ball.lastTouch = p;
  match.ball.hot = false;
  match.ball.x = p.x + dir * 0.85;
  match.ball.z = p.z;
  match.ball.y = 0.26;
  match.ball.vx = dir * 3.4;
  match.ball.vz = 0;
  match.ball.vy = 0.35;
  match.knock = p;
  match.knockUntil = match.time + 0.75;
  match.runner = null;
  p.cooldown = match.time + 0.85;
  offBalance(match, owner);
  note(match, p.name.split(' ').pop() + ' wins it');
}

function offBalance(match, p) {
  p.state = 'stumble';
  p.stateUntil = match.time + 0.6;
  p.speed = Math.min(p.speed, 1.4);
  p.cooldown = Math.max(p.cooldown, match.time + 0.6);
}

function lurch(p, dt) {
  const ux = Math.sin(p.yaw);
  const uz = Math.cos(p.yaw);
  p.speed = Math.max(0, p.speed - 4 * dt);
  p.x = clamp(p.x + ux * p.speed * dt, -HALF_L + 1, HALF_L - 1);
  p.z = clamp(p.z + uz * p.speed * dt, -HALF_W + 1, HALF_W - 1);
}

function slide(match, p) {
  if (p.cooldown > match.time || p.role === 'GK') return;
  p.state = 'slide';
  p.stateUntil = match.time + 0.48;
  p.cooldown = match.time + 1.1;
  const owner = match.ball.owner;
  const d = Math.hypot(match.ball.x - p.x, match.ball.z - p.z);
  if (d < 1.7 && owner && owner !== p) {
    const fromBody = Math.hypot(p.x - owner.x, p.z - owner.z);
    const tucked = owner.speed < 4.6 && d > fromBody + 0.05;
    if (!tucked) {
      const side = Math.cos(p.yaw) > 0 ? 1 : -1;
      match.touchBan = owner;
      match.touchUntil = match.time + 0.4;
      match.ball.owner = null;
      match.ball.lastTouch = p;
      match.ball.vx = Math.sin(p.yaw) * 7;
      match.ball.vz = Math.cos(p.yaw) * 4 + side;
      match.ball.vy = 1.2;
      offBalance(match, owner);
    }
  }
}

function carryBall(match, p, dt) {
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  const lead = 0.7 + Math.min(0.9, p.speed * 0.1);
  let tx = p.x + fx * lead;
  let tz = p.z + fz * lead;
  if (p.speed < 4.6) {
    let threat = null;
    let threatD = 3.4;
    for (const o of match.players) {
      if (o.team === p.team) continue;
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < threatD) { threat = o; threatD = d; }
    }
    if (threat) {
      const dx = p.x - threat.x;
      const dz = p.z - threat.z;
      const d = Math.hypot(dx, dz) || 1;
      tx = p.x + dx / d * 0.62;
      tz = p.z + dz / d * 0.62;
    }
  }
  const ease = Math.min(1, dt * 26);
  match.ball.owner = p;
  match.ball.lastTouch = p;
  match.ball.x += (tx - match.ball.x) * ease;
  match.ball.z += (tz - match.ball.z) * ease;
  match.ball.y = 0.18 + (p.speed > 1.2 ? Math.abs(Math.sin(match.time * 11)) * 0.05 : 0);
  match.ball.vx = 0;
  match.ball.vy = 0;
  match.ball.vz = 0;
}

function offer(p, match, dt) {
  const ball = match.ball;
  const dir = attack(p.team);
  const mates = match.players.filter(q => q.team === p.team && !q.human && q.role !== 'GK' && q !== ball.owner).sort((a, b) => a.homeZ - b.homeZ);
  const index = Math.max(0, mates.indexOf(p));
  const ahead = match.heldKick ? 4 : 14;
  const wide = match.heldKick ? 16 : 14;
  const slots = [
    { x: ball.x + dir * ahead, z: -wide },
    { x: ball.x + dir * (ahead + 3), z: wide },
    { x: ball.x + dir * (ahead * 0.65), z: clamp(-ball.z * 0.4, -8, 8) },
  ];
  const slot = slots[Math.min(index, slots.length - 1)];
  steer(p, clamp(slot.x, -42, 42), clamp(slot.z, -HALF_W + 2, HALF_W - 2), !match.heldKick && index === 1, dt, match.time);
}

function comeFor(match, p) {
  const ball = match.ball;
  const run = match.through;
  const cross = run && run.cross && run.player && run.player.team !== p.team && match.time < run.until;
  if (!cross || ball.owner || ball.hot) return null;
  const own = ownGoalX(p.team);
  if (Math.abs(run.x - own) > 18 || (run.x - own) * attack(p.team) < 1) return null;
  const line = p.team === 0 ? -46 : 46;
  const off = attack(p.team) * 8;
  const near = Math.hypot(ball.x - p.x, ball.z - p.z) < 14 && ball.y > 0.4;
  const tx = near ? ball.x : run.x;
  const tz = near ? ball.z : run.z;
  return {
    x: clamp(tx, Math.min(line, line + off), Math.max(line, line + off)),
    z: clamp(tz, -6.5, 6.5),
    sprint: true,
  };
}

function desired(p, match, chaser, marker) {
  const ball = match.ball;
  const goalside = -attack(p.team);
  if (p.role === 'GK') {
    const come = comeFor(match, p);
    if (come) return come;
    const line = p.team === 0 ? -46 : 46;
    const set = match.setZ[p.team];
    return { x: line, z: clamp(set, -4.6, 4.6), sprint: Math.abs(set - p.z) > 0.7 };
  }
  if (p === chaser) {
    const owned = ball.owner && ball.owner.team !== p.team;
    return { x: ball.x + (owned ? goalside * 0.5 : 0), z: ball.z, sprint: true };
  }
  if (p === marker) {
    const side = ball.z >= 0 ? -1 : 1;
    return {
      x: clamp(ball.x + goalside * 6.5, -44, 44),
      z: clamp(ball.z + side * 8, -HALF_W + 2, HALF_W - 2),
      sprint: Math.hypot(ball.x - p.x, ball.z - p.z) > 12,
    };
  }
  const far = Math.abs(p.homeZ) > 2 ? Math.sign(p.homeZ) : (ball.z > 0 ? -1 : 1);
  return { x: clamp(ball.x + goalside * 11, -44, 44), z: far * 15, sprint: false };
}

function closestTwo(players, x, z, pred) {
  let first = null;
  let second = null;
  let firstD = Infinity;
  let secondD = Infinity;
  for (const p of players) {
    if (!pred(p)) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < firstD) { second = first; secondD = firstD; first = p; firstD = d; }
    else if (d < secondD) { second = p; secondD = d; }
  }
  return [first, second];
}

function think(match, dt) {
  const ball = match.ball;
  const [homeChase, homeSupport] = closestTwo(match.players, ball.x, ball.z, p => p.team === 0 && !p.human && p.role !== 'GK');
  const [awayChase, awaySupport] = closestTwo(match.players, ball.x, ball.z, p => p.team === 1 && !p.human && p.role !== 'GK');
  for (const p of match.players) {
    if (p.human || p.state === 'celebrate') continue;
    if (p.state === 'stumble' && p.stateUntil > match.time) {
      lurch(p, dt);
      continue;
    }
    if (ball.owner !== p) p.held = 0;
    const chaser = p.team === 0 ? homeChase : awayChase;
    const marker = p.team === 0 ? homeSupport : awaySupport;
    if (match.give && match.give.player === p && match.time < match.give.until && ball.owner !== p) {
      const played = !ball.owner && ball.lastTouch && ball.lastTouch !== p && ball.lastTouch.team === p.team;
      steer(p, played ? ball.x : match.give.x, played ? ball.z : match.give.z, true, dt, match.time);
      continue;
    }
    if (p === match.knock && !ball.owner && match.time < match.knockUntil) {
      steer(p, ball.x, ball.z, true, dt, match.time);
      continue;
    }
    if (p === match.runner && !ball.owner) {
      chasePass(match, p, dt);
      continue;
    }
    if (ball.owner === p) {
      p.held = (p.held || 0) + dt;
      const goalX = attack(p.team) * HALF_L;
      const distGoal = Math.abs(goalX - p.x);
      const marked = match.players.some(o => o.team !== p.team && Math.hypot(o.x - p.x, o.z - p.z) < 1.35);
      const ready = p.held > 0.18;
      const back = layOn(match, p);
      if (back) {
        release(match, p, back.x - p.x, back.z - p.z, 13, 1.1, 'pass');
        match.give.returned = true;
        match.give.until = Math.max(match.give.until, match.time + 1.2);
        match.runner = back.mate;
        match.knock = back.mate;
        match.knockUntil = match.time + 1.1;
        note(match, 'Back to ' + back.mate.name.split(' ').pop());
      } else if (p.role === 'GK') {
        const mate = nearest(match.players, p.x + attack(p.team) * 20, 0, q => q.team === p.team && q.role !== 'GK');
        if (mate) release(match, p, mate.x - p.x, mate.z - p.z, 18, 5, 'pass');
      } else if (ready && distGoal < 16 && Math.abs(p.z) < 11) shoot(match, p, 0.7);
      else if (ready && marked && distGoal > 16) {
        const opened = throughBall(match, p, false);
        if (opened) playThrough(match, p, opened);
        else {
          const spot = passTarget(p, match.players, false);
          release(match, p, spot.x - p.x, spot.z - p.z, 15, 2.4, 'pass');
          if (spot.mate) note(match, 'Pass to ' + spot.mate.name.split(' ').pop());
        }
      } else steer(p, p.x + attack(p.team) * 8, clamp(p.z * 0.6, -10, 10), distGoal > 24, dt, match.time);
    } else if (ball.owner && ball.owner.team === p.team && p.role !== 'GK') {
      offer(p, match, dt);
    } else {
      const spot = desired(p, match, chaser, marker);
      steer(p, spot.x, spot.z, spot.sprint, dt, match.time);
      if (p === chaser && match.lock <= 0 && ball.owner && ball.owner.team !== p.team && Math.hypot(ball.x - p.x, ball.z - p.z) < 1.5) slide(match, p);
      if (p.role === 'GK') {
        const incoming = (p.team === 0 ? ball.vx < -6 : ball.vx > 6) && Math.abs(ball.x - ownGoalX(p.team)) < 14;
        const crossing = match.through && match.through.cross && match.time < match.through.until;
        if (!crossing && !comeFor(match, p) && incoming && Math.abs(Math.abs(ball.x) - HALF_L) < 8 && p.stateUntil <= match.time) {
          p.state = 'dive';
          p.dive = ball.z >= p.z ? 1 : -1;
          p.stateUntil = match.time + 0.7;
        }
      }
    }
  }
}

const PADS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], sprint: ['ShiftLeft'], pass: ['KeyJ'], through: ['KeyK'], shoot: ['KeyL'], slide: ['KeyC'], switch: ['Tab'], arrows: true },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], sprint: ['ShiftRight'], pass: ['KeyN'], through: ['KeyM'], shoot: ['Semicolon'], slide: ['Period'], switch: ['Enter'], arrows: false },
];

function held(input, codes) { return codes.some(code => input.down.has(code)); }
function hit(input, codes) { return codes.some(code => input.pressed.has(code)); }
function letGo(input, codes) { return codes.some(code => input.released.has(code)); }

function containSpot(match, p) {
  const owner = match.ball.owner;
  if (!owner || owner.team === p.team) return null;
  const gap = Math.hypot(owner.x - p.x, owner.z - p.z);
  if (gap > 7) return null;
  const dir = attack(p.team);
  if ((p.x - owner.x) * dir > 0.5) return null;
  const shade = Math.abs(owner.z) > 4 ? -Math.sign(owner.z) : 1;
  return {
    x: clamp(owner.x - dir * 1.85, -HALF_L + 1, HALF_L - 1),
    z: clamp(owner.z + shade * 1.15, -HALF_W + 1, HALF_W - 1),
  };
}

function controlHuman(match, input, dt, index, pad) {
  const p = match.players[index];
  if (!p || p.state === 'celebrate') return;
  p.wish = null;
  let mx = 0;
  let mz = 0;
  const homeAlone = pad.arrows && !match.awayHuman;
  if (held(input, pad.up) || (homeAlone && held(input, ['ArrowUp']))) mx += 1;
  if (held(input, pad.down) || (homeAlone && held(input, ['ArrowDown']))) mx -= 1;
  if (held(input, pad.right) || (homeAlone && held(input, ['ArrowRight']))) mz += 1;
  if (held(input, pad.left) || (homeAlone && held(input, ['ArrowLeft']))) mz -= 1;
  const sprint = held(input, pad.sprint) || (homeAlone && held(input, ['ShiftRight']));
  if (p.state === 'stumble' && p.stateUntil > match.time) {
    lurch(p, dt);
    return;
  }
  const contain = !sprint && (mx || mz) ? containSpot(match, p) : null;
  if (contain) {
    if (match.give && match.give.player === p) match.give = null;
    const owner = match.ball.owner;
    const dx = contain.x - p.x;
    const dz = contain.z - p.z;
    const d = Math.hypot(dx, dz);
    const dir = attack(p.team);
    const tooClose = (p.x - contain.x) * dir > 0;
    const step = Math.min(d, (tooClose ? 9 : 6) * dt);
    if (d > 0.04) {
      p.x += dx / d * step;
      p.z += dz / d * step;
      p.yaw = yawTo(owner.x - p.x, owner.z - p.z);
    }
    p.speed = 3.4;
    p.state = 'jog';
    p.x = clamp(p.x, -HALF_L + 1, HALF_L - 1);
    p.z = clamp(p.z, -HALF_W + 1, HALF_W - 1);
  } else if (mx || mz) {
    if (match.give && match.give.player === p) match.give = null;
    const d = len(mx, mz);
    steer(p, p.x + mx / d * 6, p.z + mz / d * 6, sprint, dt, match.time);
  } else if (match.runner === p && !match.ball.owner) {
    chasePass(match, p, dt);
  } else if (match.give && match.give.player === p && match.time < match.give.until) {
    const ball = match.ball;
    const played = !ball.owner && ball.lastTouch && ball.lastTouch !== p && ball.lastTouch.team === p.team;
    steer(p, played ? ball.x : match.give.x, played ? ball.z : match.give.z, true, dt, match.time);
  } else steer(p, p.x, p.z, false, dt, match.time);
  if (mx || mz) p.wish = { x: mx, z: mz };
  if (sprint && (mx || mz)) shoulder(match, p);

  if (hit(input, pad.switch)) {
    const marked = (match.runner && match.runner.team === p.team && match.runner !== p && !match.runner.human) ? match.runner
      : (match.knock && match.knock.team === p.team && match.knock !== p && !match.knock.human && match.time < match.knockUntil) ? match.knock
      : null;
    const next = marked || nearest(match.players, match.ball.x, match.ball.z, q => q.team === p.team && !q.human && q.role !== 'GK');
    if (next) {
      p.human = false;
      next.human = true;
      if (p.team === 0) match.control = match.players.indexOf(next);
      else match.controlAway = match.players.indexOf(next);
    }
  }
  const me = match.players[p.team === 0 ? match.control : match.controlAway];
  if (!me) return;
  if (match.ball.owner === me) {
    if (held(input, pad.shoot)) {
      me.shot = Math.min(1, me.shot + dt * 2.2);
      if (mz) me.place = mz;
      match.aimSpot = { x: attack(me.team) * (HALF_L - 0.5), z: clamp((mz || me.place) * 3.1, -3.15, 3.15) };
    }
    if (hit(input, pad.through)) {
      const ball = throughBall(match, me);
      if (ball) playThrough(match, me, ball);
      me.shot = 0;
      me.passing = 0;
    } else if (letGo(input, pad.pass)) {
      const heldFor = me.passing || 0;
      me.passing = 0;
      const crossed = heldFor > 0.14 && Math.abs(me.z) > 11 && playCross(match, me);
      if (!crossed && heldFor > 0.14) playLoft(match, me);
      else if (!crossed) playGround(match, me);
      me.shot = 0;
    } else if (held(input, pad.pass)) {
      me.passing = (me.passing || 0) + dt;
      me.shot = 0;
    } else if (letGo(input, pad.shoot)) {
      if (mz) me.place = mz;
      shoot(match, me, Math.max(0.35, me.shot), me.place || 0);
      me.shot = 0;
    }
  } else if (hit(input, pad.slide)) slide(match, me);
  if (!held(input, pad.shoot)) me.shot = 0;
  if (!held(input, pad.pass)) me.passing = 0;
  if (me.team === 0) match.charge = me.shot;
}

function firstTouch(match, p) {
  const wish = p.wish;
  if (!wish || p.role === 'GK') return false;
  const d = len(wish.x, wish.z);
  p.yaw = yawTo(wish.x / d, wish.z / d);
  if (p.speed > 4.2) {
    knockOn(match, p);
    return true;
  }
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  match.ball.owner = p;
  match.ball.lastTouch = p;
  match.ball.hot = false;
  match.ball.x = p.x + fx * 1.15;
  match.ball.z = p.z + fz * 1.15;
  match.ball.y = 0.2;
  match.ball.vx = 0;
  match.ball.vy = 0;
  match.ball.vz = 0;
  match.knock = null;
  match.knockUntil = 0;
  match.runner = null;
  const dir = attack(p.team);
  const word = Math.abs(wish.x) >= Math.abs(wish.z) ? (wish.x * dir > 0 ? 'takes it on' : 'checks back') : 'takes it wide';
  note(match, p.name.split(' ').pop() + ' ' + word);
  return true;
}

function knockOn(match, p) {
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  match.ball.owner = null;
  match.ball.lastTouch = p;
  match.ball.hot = false;
  match.ball.x = p.x + fx * 1.35;
  match.ball.z = p.z + fz * 1.35;
  match.ball.y = 0.32;
  match.ball.vx = fx * 4.4;
  match.ball.vz = fz * 4.4;
  match.ball.vy = 0.7;
  match.knock = p;
  match.knockUntil = match.time + 0.7;
  match.runner = null;
  note(match, p.name.split(' ').pop() + ' knocks it on');
}

function claimLoose(match) {
  if (match.ball.owner || match.phase !== 'play') return;
  if (match.knock && match.time >= match.knockUntil) match.knock = null;
  const speed = Math.hypot(match.ball.vx, match.ball.vz);
  let best = null;
  let bestD = Infinity;
  for (const p of match.players) {
    if (match.lock > 0 && p.team !== match.kickTeam) continue;
    if (p === match.touchBan && match.time < match.touchUntil) continue;
    if (match.knock && match.time < match.knockUntil && p !== match.knock) continue;
    if (p.role === 'GK' && match.ball.hot) {
      const passing = p.team === 1 ? match.ball.x > p.x - 0.5 : match.ball.x < p.x + 0.5;
      if (!passing || Math.abs(match.ball.z - p.z) > 1.45 || match.ball.y > 2.05) continue;
    }
    const cross = match.through && match.through.cross && match.time < match.through.until;
    const headHeight = match.ball.y > 1.05 && match.ball.y < 2.5;
    const canHead = cross && headHeight && p.role !== 'GK' && (p === match.through.player || (match.ball.lastTouch && p.team !== match.ball.lastTouch.team));
    const canCatch = p.role === 'GK' && cross && match.ball.y > 0.9;
    if (p.role !== 'GK' && match.ball.y > 1.8 && !canHead) continue;
    const d = Math.hypot(p.x - match.ball.x, p.z - match.ball.z);
    const reach = p.role === 'GK' ? (canCatch ? 1.8 : match.ball.hot ? 1.6 : 1.35) : canHead ? 1.5 : 1.05;
    if (d < reach && d < bestD && (canHead || canCatch || speed < 13 || p.role === 'GK' || p.state === 'slide')) {
      best = p;
      bestD = d;
    }
  }
  if (best) {
    const cross = match.through && match.through.cross && match.ball.y > 1.05 && match.ball.y < 2.5 && best.role !== 'GK';
    if (cross) {
      head(match, best);
      return;
    }
    if (best.role === 'GK' && match.ball.hot && match.ball.lastTouch && match.ball.lastTouch.team !== best.team) {
      match.stats[best.team].saves += 1;
      note(match, 'Saved · ' + best.name);
    } else if (best.role === 'GK' && match.through && match.through.cross) {
      note(match, 'Claimed · ' + best.name);
    }
    match.ball.hot = false;
    match.runner = null;
    const onto = match.through && match.through.player === best;
    match.through = null;
    if (best.human && best.wish && match.knock !== best && firstTouch(match, best)) return;
    if (match.knock === best || onto) {
      match.knock = null;
      match.knockUntil = 0;
      placeBallOn(match, best);
    } else if (best.role !== 'GK' && best.speed > 4.2 && !layOn(match, best) && !(match.give && match.give.player === best && match.ball.lastTouch && match.ball.lastTouch.team === best.team)) knockOn(match, best);
    else placeBallOn(match, best);
  }
}

function bouncePosts(ball) {
  for (const side of [-1, 1]) {
    for (const z of [-GOAL_W, GOAL_W]) {
      const px = side * HALF_L;
      const dx = ball.x - px;
      const dz = ball.z - z;
      const d = Math.hypot(dx, dz);
      if (d < 0.34 && ball.y < 2.5) {
        ball.x = px + dx / (d || 1) * 0.34;
        ball.z = z + dz / (d || 1) * 0.34;
        ball.vx *= -0.45;
        ball.vz *= -0.45;
      }
    }
    if (Math.abs(ball.x - side * HALF_L) < 0.4 && Math.abs(ball.z) < GOAL_W && ball.y > 2.2 && ball.y < 2.7) {
      ball.vy *= -0.4;
      ball.y = 2.15;
    }
  }
}

function stepBall(match, dt) {
  const ball = match.ball;
  if (ball.owner) {
    carryBall(match, ball.owner, dt);
    return;
  }
  ball.vy -= 14 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  const drag = ball.y > 0.25 ? 0.35 : 1.35;
  const keep = Math.max(0, 1 - drag * dt);
  ball.vx *= keep;
  ball.vz *= keep;
  if (ball.y < 0.18) {
    ball.y = 0.18;
    ball.vy *= -0.32;
    if (Math.abs(ball.vy) < 0.7) ball.vy = 0;
  }
  bouncePosts(ball);
}

function scored(match, team) {
  match.score[team] += 1;
  match.lastGoal = team;
  match.phase = 'goal';
  match.lock = 2.1;
  const by = match.ball.lastTouch;
  match.scorer = by ? by.name : '';
  match.message = 'Goal';
  match.ball.owner = null;
  match.ball.vx = 0;
  match.ball.vz = 0;
  match.ball.vy = 0;
  for (const p of match.players) {
    if (p.team === team) {
      p.state = 'celebrate';
      p.stateUntil = match.time + 2;
    }
  }
}

function restart(match, kicking) {
  match.phase = 'play';
  match.message = '';
  match.kickTeam = kicking;
  match.ball.x = 0;
  match.ball.y = 0.18;
  match.ball.z = 0;
  match.ball.vx = 0;
  match.ball.vy = 0;
  match.ball.vz = 0;
  match.ball.owner = null;
  match.lock = 0.7;
  match.heldKick = true;
  match.runner = null;
  match.knock = null;
  match.knockUntil = 0;
  match.give = null;
  match.through = null;
  match.setZ = [0, 0];
  for (const p of match.players) {
    p.x = p.homeX;
    p.z = p.homeZ;
    p.speed = 0;
    p.state = 'idle';
    p.stateUntil = 0;
    p.pending = null;
    p.yaw = yawTo(attack(p.team), 0);
  }
  const kicker = match.players.find(p => p.team === kicking && p.human && p.role !== 'GK')
    || match.players.find(p => p.team === kicking && p.role === 'FWD');
  if (kicker) {
    kicker.x = -attack(kicking) * 0.85;
    kicker.z = 0;
    kicker.yaw = yawTo(attack(kicking), 0);
    placeBallOn(match, kicker);
    note(match, 'Kick off · ' + kicker.name);
  }
}

function holdLine(match) {
  if (!match.heldKick) return;
  for (const p of match.players) {
    if (p.team === match.kickTeam) continue;
    if (p.team === 0) p.x = Math.min(p.x, -8);
    else p.x = Math.max(p.x, 8);
  }
  const ball = match.ball;
  if (ball.owner && ball.owner.team === match.kickTeam) {
    const played = match.kickTeam === 0 ? ball.x > 1.6 : ball.x < -1.6;
    if (played) match.heldKick = false;
  }
}
function hand(match, team, x, z, label, keeper) {
  const taker = keeper
    ? match.players.find(p => p.team === team && p.role === 'GK')
    : nearest(match.players, x, z, p => p.team === team && p.role !== 'GK');
  if (!taker) return;
  taker.x = clamp(x - attack(team) * 0.9, -HALF_L + 1, HALF_L - 1);
  taker.z = clamp(z, -HALF_W + 1, HALF_W - 1);
  taker.yaw = yawTo(attack(team), 0);
  taker.speed = 0;
  match.ball.hot = false;
  match.ball.vx = 0;
  match.ball.vy = 0;
  match.ball.vz = 0;
  match.ball.owner = null;
  placeBallOn(match, taker);
  match.lock = 0.4;
  match.kickTeam = team;
  match.through = null;
  match.runner = null;
  if (match.players.some(p => p.human && p.team === team)) {
    for (const q of match.players) if (q.team === team) q.human = false;
    taker.human = true;
    if (team === 0) match.control = match.players.indexOf(taker);
    else match.controlAway = match.players.indexOf(taker);
  }
  note(match, label + ' · ' + taker.name);
}

function outOfPlay(match) {
  const ball = match.ball;
  const homeGoal = ball.x > HALF_L && Math.abs(ball.z) < GOAL_W && ball.y < 2.44;
  const awayGoal = ball.x < -HALF_L && Math.abs(ball.z) < GOAL_W && ball.y < 2.44;
  if (homeGoal || awayGoal) {
    scored(match, homeGoal ? 0 : 1);
    return;
  }
  if (Math.abs(ball.x) > HALF_L + 0.4) {
    const defending = ball.x > 0 ? 1 : 0;
    const byDefence = ball.lastTouch && ball.lastTouch.team === defending;
    if (byDefence) {
      const end = ball.x > 0 ? 1 : -1;
      const side = ball.z >= 0 ? 1 : -1;
      hand(match, 1 - defending, end * (HALF_L - 1), side * (HALF_W - 1), 'Corner', false);
    } else hand(match, defending, defending === 0 ? -46 : 46, 0, 'Goal kick', true);
    return;
  }
  if (Math.abs(ball.z) > HALF_W) {
    const team = ball.lastTouch ? 1 - ball.lastTouch.team : 0;
    hand(match, team, clamp(ball.x, -HALF_L + 2, HALF_L - 2), Math.sign(ball.z) * (HALF_W - 1), 'Throw-in', false);
  }
}

function readShot(match, dt) {
  for (const team of [0, 1]) {
    const charging = match.aimSpot && match.ball.owner && match.ball.owner.team !== team;
    const want = charging ? match.aimSpot.z : clamp(match.ball.z * 0.42, -4.4, 4.4);
    const rate = charging ? 2.4 : 5;
    match.setZ[team] += (want - match.setZ[team]) * Math.min(1, dt * rate);
  }
}

export function updateMatch(match, dt, input) {
  if (match.phase === 'ready' || match.phase === 'full' || match.phase === 'half') return match;
  dt = Math.min(dt, 0.05);
  match.time += dt;
  if (match.lock > 0) match.lock -= dt;
  if (match.phase === 'goal') {
    stepBall(match, dt);
    for (const p of match.players) {
      if (p.state === 'celebrate') p.speed = 0;
    }
    if (match.lock <= 0) {
      if (match.score[0] >= WIN_GOALS || match.score[1] >= WIN_GOALS || match.time >= MATCH_LENGTH) {
        match.phase = 'full';
        match.message = 'Full time';
      } else restart(match, 1 - match.lastGoal);
    }
    return match;
  }
  if (!match.halved && match.time >= MATCH_LENGTH / 2) {
    match.halved = true;
    match.phase = 'half';
    match.message = 'Half time';
    for (const p of match.players) p.stamina = 1;
    return match;
  }
  if (match.time >= MATCH_LENGTH) {
    match.phase = 'full';
    match.message = 'Full time';
    match.ball.owner = null;
    return match;
  }
  if (match.give && match.time >= match.give.until) match.give = null;
  if (match.through && match.time >= match.through.until) match.through = null;
  match.aim = null;
  match.aimSpot = null;
  const holder = match.ball.owner ? match.ball.owner.team : match.ball.lastTouch ? match.ball.lastTouch.team : -1;
  if (holder === 0 || holder === 1) match.stats[holder].possession += dt;
  controlHuman(match, input, dt, match.control, PADS[0]);
  if (match.awayHuman && match.controlAway >= 0) controlHuman(match, input, dt, match.controlAway, PADS[1]);
  readShot(match, dt);
  think(match, dt);
  holdLine(match);
  separate(match.players);
  stepBall(match, dt);
  claimLoose(match);
  const owner = match.ball.owner;
  if (owner?.human && owner.passing > 0.14 && Math.abs(owner.z) > 11) match.aim = crossSpot(owner);
  else if (owner?.human) match.aim = passTarget(owner, match.players, false);
  else if (match.through && match.time < match.through.until && !match.ball.owner) match.aim = { x: match.through.x, z: match.through.z };
  else if (match.give && match.time < match.give.until) {
    const side = match.give.player.team;
    const who = match.knock && match.time < match.knockUntil && match.knock.team === side && !match.knock.human ? match.knock
      : match.runner && match.runner.team === side && !match.runner.human ? match.runner : null;
    if (who) match.aim = { x: who.x, z: who.z };
  }
  if (!match.ball.owner) outOfPlay(match);
  return match;
}

export function kickoff(match) {
  match.phase = 'play';
  match.time = 0;
  match.score = [0, 0];
  match.message = '';
  match.halved = false;
  match.call = '';
  match.callUntil = 0;
  match.stats = freshStats();
  for (const p of match.players) {
    p.human = false;
    p.stamina = 1;
    p.shot = 0;
  }
  const human = match.players.find(p => p.team === 0 && p.name === match.starter) || match.players.find(p => p.name === 'Zane Brooks');
  human.human = true;
  match.control = match.players.indexOf(human);
  if (match.awayHuman) {
    const away = match.players.find(p => p.team === 1 && p.role === 'FWD');
    away.human = true;
    match.controlAway = match.players.indexOf(away);
  } else match.controlAway = -1;
  restart(match, 0);
  match.lock = 0.4;
}
