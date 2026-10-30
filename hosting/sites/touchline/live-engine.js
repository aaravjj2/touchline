import * as legacy from './engine.js';
import {LiveWorld,LIVE_VERSION,TICKS_PER_MINUTE} from './live-world.js';
export * from './engine.js';
export const VERSION=LIVE_VERSION;
export const isLive=m=>[LIVE_VERSION,'2.1.0'].includes(m?.state?.engineVersion);
export function createMatch(options={}){
 const m=legacy.createMatch(options);m.version=LIVE_VERSION;m.state.version=LIVE_VERSION;m.state.engineVersion=LIVE_VERSION;
 m.state.rosters=[m.state.lineup.map(legacy.player),legacy.defaultLineup('4-3-3').map(id=>({...legacy.player(id),id:'away:'+id}))];
 const world=new LiveWorld(m.state);world.energy=m.state.lineup.map(id=>m.state.fitness[id]).concat(Array(11).fill(100));world.writeState();
 m.initial=legacy.copy(m.state);m.frames=[legacy.copy(m.state)];return m;
}
export function commitWorld(match,world){
 const previous=match.state.minute;world.writeState(match.state);const s=match.state;
 if(previous<45&&s.minute>=45){world.emit('half',0,'Half-time. Review your plan, then resume.');s.events=legacy.copy(world.events);}
 if(s.finished&&!s.events.some(e=>e.type==='full')){world.emit('full',0,'Full-time.');s.events=legacy.copy(world.events);}
 if(match.frames.at(-1)?.minute===s.minute)match.frames[match.frames.length-1]=legacy.copy(s);else match.frames.push(legacy.copy(s));
 return match;
}
export function step(match){if(!isLive(match))return legacy.step(match);if(match.state.finished)return match;
 const w=new LiveWorld(match.state),end=Math.min(90*TICKS_PER_MINUTE,(Math.floor(w.ticks/TICKS_PER_MINUTE)+1)*TICKS_PER_MINUTE);
 while(w.ticks<end)w.fixed();return commitWorld(match,w);
}
export function run(match){while(!match.state.finished)step(match);return match;}
export function applyAction(match,action){
 if(isLive(match)&&action.type==='build'){if(!['mixed','short','direct'].includes(action.value))throw Error('Unknown build-up.');match.state.buildUps=[action.value,'mixed'];const tick=match.state.world.ticks;match.state.actions.push({...action,tick,minute:match.state.minute});match.state.events.push({id:'build-'+tick,tick,minute:match.state.minute,team:0,type:'tactic',text:'Build-up: '+action.value});return match;}
 legacy.applyAction(match,action);if(isLive(match)){match.state.actions.at(-1).tick=match.state.world.ticks;
  match.state.rosters[0]=match.state.lineup.map(legacy.player);
  if(action.type==='sub'){const slot=match.state.lineup.indexOf(action.in);match.state.world.energy[slot]=match.state.fitness[action.in];}
 }
 return match;
}
export function branch(original,minute,action){if(!isLive(original))return legacy.branch(original,minute,action);const frame=original.frames.find(f=>f.minute===minute);if(!frame||frame.finished)throw Error('Choose an available moment before full-time.');
 const m={id:globalThis.crypto?.randomUUID?.()||'branch-'+Date.now(),version:LIVE_VERSION,initial:legacy.copy(frame),state:legacy.copy(frame),frames:original.frames.filter(f=>f.minute<=minute).map(legacy.copy),parent:{id:original.id,minute}};return applyAction(m,action);
}
export function cleanImport(value){
 if(!isLive(value))return legacy.cleanImport(value);
 if(value.compact){value=legacy.copy(value);for(const frame of value.frames){frame.rosters=[frame.lineup.map(legacy.player),value.initial.rosters[1]];frame.events=value.state.events.filter(e=>e.tick!==undefined?e.tick<=frame.world.ticks:e.minute<=frame.minute);frame.visualPose=new LiveWorld(frame).pose();}delete value.compact;}
 const v=legacy.copy(value);v.version=legacy.VERSION;legacy.cleanImport(v);
 const w=value.state.world;
 if(!w||!Number.isInteger(w.ticks)||w.ticks<0||w.ticks>14400||w.positions?.length!==22||w.positions.flat().some(n=>!Number.isFinite(n))||w.velocity?.length!==22||w.ball?.length!==2||w.ball.some(n=>!Number.isFinite(n))||value.state.rosters?.some(r=>r.length!==11||r.some(p=>!p?.name)))throw Error('Invalid live world save.');
 return legacy.copy(value);
}
