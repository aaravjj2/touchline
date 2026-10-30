// Read-only match context; guidance never submits commands or predicts results.
export function possessionGuidance(w,team,{running=true,ready=false,complete=false}={}){
 const c=w.state.directControl;
 if(!c?.enabled)return {kind:'automatic',text:'Automatic play · take control to move a player.'};
 if(complete)return {kind:'complete',text:'Practice finished · retry or choose the next skill.'};
 if(ready)return {kind:'ready',text:'Ready · movement or an action starts practice.'};
 if(!running)return {kind:'paused',text:'Paused · resume play before moving or acting.'};
 const player=team*11+c.slot;
 if(w.state.incidentVersion===1&&(!w.isActive(player)||w.isKeeper(player)))return {kind:'unavailable',text:'Selected player unavailable · Switch / Q to an active outfield player.'};
 if(w.restart)return {kind:'restart',text:'Restart in progress · players reset automatically.'};
 if(w.owner===player)return {kind:'on-ball',text:'You have the ball · aim with movement, then Pass / J or Shoot / L.'};
 if(w.owner!==null&&Math.floor(w.owner/11)===team){
  if(w.owner%11===0||w.state.incidentVersion===1&&w.isKeeper(w.owner))return {kind:'keeper',text:'Your goalkeeper has the ball · move into space for the release.'};
  return {kind:'teammate',text:'A teammate has the ball · Switch / Q takes control of the carrier.'};
 }
 if(w.owner===null)return {kind:'loose',text:w.flight?.kind==='PASS'?(w.flight.team!==undefined&&w.flight.team!==team?'Opposition pass in flight · move to intercept or Switch / Q.':'Pass in flight · move to receive; release movement to settle.'):'Ball is loose · move towards it or Switch / Q to a nearby player.'};
 const p=w.positions[player],near=p&&Math.hypot(p[0]-w.ball[0],p[1]-w.ball[1])<1.9;
 return {kind:'opposition',text:near?'Near the ball · Tackle / C attempts a challenge.':'Opposition possession · close down or Switch / Q to a nearby defender.'};
}
