// Presentation observations only: requests never count as successful football actions.
export const actionLabels={pass:'Pass',through:'Through ball',shoot:'Shot',tackle:'Tackle',switch:'Switch'};
export function actionRequest(action,w){const c=w.state.directControl;return {action,tick:w.ticks,player:c.team*11+c.slot,slot:c.slot,kickAt:w.kickAt,tackleAt:w.tackleAt??-10,completed:w.completed[c.team],team:c.team};}
export function observeAction(r,w){
 if(w.ticks<=r.tick)return null;
 if(r.action==='switch')return w.state.directControl.slot!==r.slot?{kind:'switch',text:'Switched to '+w.profile(r.team*11+w.state.directControl.slot).name}:{kind:'unavailable',text:'No player switch made'};
 if(['pass','through','shoot'].includes(r.action)&&w.kickAt>r.kickAt&&w.kicker===r.player)return {kind:r.action==='shoot'?'shot':'pass',text:r.action==='shoot'?'Shot taken':'Pass played',kickAt:w.kickAt};
 if(r.action==='tackle'&&w.tackler===r.player&&(w.tackleAt??-10)>r.tackleAt)return {kind:w.owner===r.player?'recovery':'attempt',text:w.owner===r.player?'Possession won':'Tackle attempted'};
 return {kind:'unavailable',text:r.action==='tackle'?'No tackle made · move closer to the ball':'No '+(r.action==='shoot'?'shot':'pass')+' played · control the ball first'};
}
