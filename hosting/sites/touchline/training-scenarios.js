import {PLAYERS} from './engine.js';
import {fixtureDefinition,fixtureState} from './fixture-engine.js';
import {LiveWorld} from './live-world.js';
export const EXERCISES=[
 {id:'passing',title:'Receive & pass',copy:'Receive the ball on the left and complete a pass to a free teammate.',hint:'First input starts the clock. J / Pass uses the forward lane. Release movement to receive, then move again.',goal:'completed-pass'},
 {id:'shooting',title:'Create a shot',copy:'Take over an attacking possession near the penalty area and get a shot away.',hint:'Move toward goal, then L / Shoot. A shot counts; a goal is not guaranteed.',goal:'shot'},
 {id:'defending',title:'Stop the counter',copy:'Take the nearest defender as the opposition attacks. Close down and win possession.',hint:'Q / Switch finds a nearby player. Move close, then C / Tackle.',goal:'recovery'}
];
const cache=new Map();
export function trainingScenario(id){
 const exercise=EXERCISES.find(e=>e.id===id);if(!exercise)throw Error('Unknown training exercise.');
 if(cache.has(id))return structuredClone(cache.get(id));
 for(const seed of [3801,3802,3803,3804]){
  const home={id:'training-home',name:'Touchline Academy',color:'#b6f36a',roster:PLAYERS},away={id:'training-away',name:'Training Opposition',color:'#8db7ff',roster:PLAYERS.map(p=>({...p,id:'training-away-'+p.id}))},definition=fixtureDefinition(home,away,seed),s=fixtureState(definition),w=new LiveWorld(s);
  while(w.ticks<5000){
   const own=w.owner!==null&&w.owner>0&&w.owner<11,attack=own&&w.positions[w.owner][0]>74&&Math.abs(w.positions[w.owner][1]-32)<17,defend=w.owner!==null&&w.owner>11&&w.ball[0]<44&&w.clock-w.lastSwitch>.4&&w.positions.slice(1,11).some(p=>Math.hypot(p[0]-w.ball[0],p[1]-w.ball[1])<1.8);
   if(!w.restart&&(id==='passing'?w.ticks===90:id==='shooting'?attack:defend)){
    w.writeState(s);const result={definition,resume:{state:s},exercise:{...exercise,startTick:w.ticks,endTick:w.ticks+1800}};cache.set(id,structuredClone(result));return result;
   }
   w.fixed();
  }
 }
 throw Error('No reproducible training situation found.');
}
