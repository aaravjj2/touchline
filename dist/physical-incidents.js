import {canPlayPosition} from './player-positions.js';
import {incidentTime} from './match-incidents.js';
export function recordIncident(w,type,team,extra={}){
 const e={id:'physical-'+w.state.incidentLog.length,sequence:w.state.incidentLog.length,type,team,tick:w.ticks,minute:Math.ceil(w.ticks/160),...extra};w.state.incidentLog.push(e);return e;
}
export function physicalSubstitution(state,team,outId,inId,{automatic=false}={}){
 const slot=state.rosters[team].findIndex(p=>p.id===outId),reserve=state.reserves[team].find(p=>p.id===inId),index=team*11+slot,minute=(state.world?.ticks??0)/160,window=state.world?.ticks??0;
 if(slot<0||!reserve||state.substitutions[team]>=5||state.usedPlayers[team].includes(inId)||state.removed?.[outId]==='dismissed')throw Error('Choose an active or injured player and an unused eligible reserve.');
 const outgoing=state.rosters[team][slot],emergency=reserve.positions?.includes('GK')&&!state.activeSlots.some((active,i)=>active&&Math.floor(i/11)===team&&i===state.keeperSlots[team]),position=emergency||state.keeperSlots[team]===index?'GK':outgoing.assignedPosition;
 if(state.world?.flight?.kind==='SHOT'&&state.world.flight.scorerId===outId)throw Error('Wait for the shot to finish before changing its shooter.');
 if(!state.activeSlots[index]&&position==='GK'&&state.activeSlots[state.keeperSlots[team]])throw Error('Replace the emergency goalkeeper to restore a trained goalkeeper.');
 if(!canPlayPosition(reserve,position))throw Error('The reserve cannot cover this natural position.');
 const windows=state.subWindows[team];if(windows.length>=3&&!windows.includes(window))throw Error('Three substitution windows have already been used.');
 if(minute>=90)throw Error('No substitutions after full-time.');
 const wasActive=state.activeSlots[index];if(!wasActive&&state.removed?.[outId]!=='injured')throw Error('A dismissed or unfilled slot cannot be substituted.');state.usedPlayers[team].push(outId);state.reserves[team]=state.reserves[team].filter(p=>p.id!==inId);state.rosters[team][slot]={...reserve,role:position==='GK'?'GK':outgoing.role,assignedPosition:position};state.substitutions[team]++;if(!windows.includes(window))windows.push(window);state.activeSlots[index]=true;if(position==='GK')state.keeperSlots[team]=index;
 if(state.world?.energy){state.fitness[outId]=state.world.energy[index];state.world.energy[index]=state.fitness[inId]??100;}
 state.incidentLog.push({id:'physical-'+state.incidentLog.length,sequence:state.incidentLog.length,type:'substitution',team,tick:window,minute:Math.ceil(minute),out:outId,in:inId,position});
 if(!wasActive&&state.removed?.[outId]!=='injured')throw Error('A dismissed or unfilled slot cannot be substituted.');
 state.events.push({id:'incident-sub-'+state.incidentLog.length,tick:window,minute:Math.ceil(minute),team,type:'substitution',text:reserve.name+' comes on'+(automatic?' for the forced change.':'.'),playerId:inId});
 if(team===0){state.lineup=state.rosters[0].map(p=>p.id);state.bench=state.reserves[0].map(p=>p.id);state.subs=state.substitutions[0];}
 return {slot,index,position};
}
function keeperCover(w,team){
 if(w.isActive(w.state.keeperSlots[team]))return;
 const reserve=w.state.reserves[team].find(p=>canPlayPosition(p,'GK')),out=w.rosters[team].map((p,i)=>({p,i:team*11+i})).filter(q=>w.isActive(q.i)).sort((a,b)=>a.p.defense-b.p.defense||a.i-b.i)[0];
 if(reserve&&out){w.writeState();try{physicalSubstitution(w.state,team,out.p.id,reserve.id,{automatic:true});w.rosters=w.state.rosters;w.energy=[...w.state.world.energy];w.events=w.state.events;return;}catch{}}
 const choices=w.rosters[team].map((p,i)=>({p,i:team*11+i})).filter(q=>w.isActive(q.i)).sort((a,b)=>b.p.defense-a.p.defense||a.i-b.i),chosen=choices[0];w.state.keeperSlots[team]=chosen.i;recordIncident(w,'emergency-keeper',team,{player:chosen.p.id});w.emit('emergency-keeper',team,chosen.p.name+' takes over as emergency goalkeeper.',{player:chosen.i,playerId:chosen.p.id});
}
export function removePhysicalPlayer(w,index,type,{recoveryDays}={}){
 if(!w.isActive(index)||w.state.activeSlots.filter((a,i)=>a&&Math.floor(i/11)===Math.floor(index/11)).length<=7)return false;
 const team=Math.floor(index/11),p=w.profile(index),position=w.isKeeper(index)?'GK':p.assignedPosition;recordIncident(w,type,team,{player:p.id,...(recoveryDays?{recoveryDays}:{})});w.state.activeSlots[index]=false;w.state.removed[p.id]=type==='injury'?'injured':'dismissed';w.velocity[index]=[0,0];w.state.fitness[p.id]=w.energy[index];
 w.emit(type,team,p.name+(type==='injury'?` is injured · estimated ${recoveryDays} days.`:type==='second-yellow'?' is dismissed for a second booking.':' is sent off.'),{player:index,playerId:p.id,recoveryDays});
 if(w.owner===index){w.owner=null;w.flight=null;w.ballV=[0,0];}if(w.flight?.receiver===index)w.flight.receiver=null;
 if(type==='injury'){
  const reserve=w.state.reserves[team].filter(q=>canPlayPosition(q,position)).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id))[0];if(reserve){w.writeState();try{physicalSubstitution(w.state,team,p.id,reserve.id,{automatic:true});w.rosters=w.state.rosters;w.energy=[...w.state.world.energy];w.events=w.state.events;}catch{}}
 }
 keeperCover(w,team);
 const control=w.state.directControl;if(control?.enabled&&(!w.isActive(control.team*11+control.slot)||w.isKeeper(control.team*11+control.slot))){const next=w.state.activeSlots.findIndex((active,i)=>active&&Math.floor(i/11)===control.team&&!w.isKeeper(i));if(next>=0)control.slot=next%11;}
 return true;
}
export function physicalContact(w,defender,victim,manual=false){
 if(!w.isActive(defender)||!w.isActive(victim)||Math.floor(defender/11)===Math.floor(victim/11)||w.clock-(w.lastIncidentContact??-10)<1.2)return false;
 const distance=Math.hypot(w.positions[defender][0]-w.positions[victim][0],w.positions[defender][1]-w.positions[victim][1]);if(distance>2)return false;w.lastIncidentContact=w.clock;
 const team=Math.floor(defender/11),p=w.profile(defender),foul=w.random()<(manual?.32:.19);
 if(foul){
  w.emit('foul',team,p.name+' commits a foul. Free kick.',{player:defender,playerId:p.id});
  if(w.random()<.52){const red=w.random()<.035,booked=w.state.bookings[p.id];if(red||booked){removePhysicalPlayer(w,defender,red?'red':'second-yellow');}else{w.state.bookings[p.id]=true;recordIncident(w,'yellow',team,{player:p.id});w.emit('yellow',team,p.name+' is booked.',{player:defender,playerId:p.id});}}
 }
 const injured=w.random()<.018?(w.random()<.75?victim:defender):null;if(injured!==null){const injuredTeam=Math.floor(injured/11);if(w.injuryCounts[injuredTeam]<2&&removePhysicalPlayer(w,injured,'injury',{recoveryDays:[7,14,21][Math.floor(w.random()*3)]}))w.injuryCounts[injuredTeam]++;}
 if(foul){w.restartAt('FREE KICK',Math.floor(victim/11),[...w.positions[victim]]);return true;}return false;
}
