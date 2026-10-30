// Versioned, deterministic direct control. Inactive in existing manager-only fixtures.
const length=v=>Math.hypot(...v),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function directPlayer(w){const c=w.state.directControl;if(!c?.enabled)return null;const i=c.team*11+c.slot;return w.state.incidentVersion===1&&(!w.isActive(i)||w.isKeeper(i))?null:i;}
export function directTarget(w,i,normal){if(directPlayer(w)!==i)return normal;const c=w.state.directControl,p=w.positions[i],n=length(c.move)||1;return [p[0]+c.move[0]/n*12,p[1]+c.move[1]/n*12];}
export function directMultiplier(w,i){return directPlayer(w)===i?(w.state.directControl.sprint?1.2:.86):1;}
export function applyDirectAction(w){
 const c=w.state.directControl;if(!c?.enabled||w.directSequence===c.sequence)return;w.directSequence=c.sequence;
 const i=directPlayer(w);if(i===null)return;const p=w.positions[i],dir=c.team?-1:1,aim=length(c.move)>.1?c.move:[dir,0],n=length(aim)||1;
 if(c.action==='switch'){const own=w.owner!==null&&Math.floor(w.owner/11)===c.team&&w.owner%11!==0&&(w.state.incidentVersion!==1||w.isActive(w.owner)&&!w.isKeeper(w.owner))?w.owner:null;const near=Array.from({length:10},(_,k)=>c.team*11+k+1).filter(k=>k!==i&&(w.state.incidentVersion!==1||w.isActive(k)&&!w.isKeeper(k))).sort((a,b)=>distance(w.positions[a],w.ball)-distance(w.positions[b],w.ball));if(near.length||own!==null)c.slot=(own!==null&&own!==i?own:near[0]??own)%11;return;}
 if(c.action==='tackle'&&w.owner!==i){w.tackler=i;w.tackleAt=w.clock;const opponent=w.owner;if(opponent!==null&&Math.floor(opponent/11)!==c.team&&distance(p,w.ball)<1.9&&w.clock-w.lastSwitch>.3){if(w.state.incidentVersion===1&&w.contact?.(i,opponent,true))return;w.take(i,'TACKLE');}return;}
 if(w.owner!==i||w.clock-w.kickAt<.25)return;
 if(c.action==='shoot'){const error=(100-(w.profile(i).attack||70))*.025;w.kick([c.team?-1:101,32+Math.max(-3.3,Math.min(3.3,aim[1]*2.7))+(w.random()-.5)*error],'SHOT');}
 if(['pass','through'].includes(c.action)){const options=Array.from({length:10},(_,k)=>c.team*11+k+1).filter(k=>k!==i&&(w.state.incidentVersion!==1||w.isActive(k)&&!w.isKeeper(k))).map(k=>{const q=w.positions[k],d=distance(p,q),dot=((q[0]-p[0])*aim[0]+(q[1]-p[1])*aim[1])/(d*n||1);return {k,d,score:dot*24-Math.abs(d-(c.action==='through'?25:15))*.35};}).filter(q=>q.d>2&&q.d<48).sort((a,b)=>b.score-a.score);if(options.length){const k=options[0].k,q=w.positions[k],lead=c.action==='through'?5:1;w.kick([Math.max(1,Math.min(99,q[0]+dir*lead)),q[1]],'PASS',k);c.slot=k%11;}}
}
export function validateDirectCommand(s,command,team){
 if(s.controlVersion!==1)throw Error('Direct play is not enabled for this fixture.');
 if(!Number.isInteger(command.slot)||command.slot<1||command.slot>10||!Array.isArray(command.move)||command.move.length!==2||command.move.some(n=>!Number.isFinite(n)||Math.abs(n)>1)||typeof command.enabled!=='boolean'||typeof command.sprint!=='boolean'||!['none','pass','through','shoot','tackle','switch'].includes(command.action))throw Error('Invalid direct-play input.');
 s.directControl={team,slot:command.slot,move:[...command.move],sprint:command.sprint,enabled:command.enabled,action:command.action,sequence:s.actions.length+1};
}
