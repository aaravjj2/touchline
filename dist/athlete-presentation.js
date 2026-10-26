// Pure visual sampling from the recorded physical pose. Never changes match state.
export function footballMotion(pose,index,speed){
 const keeper=pose.keepers?pose.keepers.includes(index):index%11===0,team=index<11?0:1;
 if(pose.phase==='GOAL'&&team===pose.team)return {mode:'celebrate'};
 if(pose.kicker===index&&pose.kickAge>=0&&pose.kickAge<.38){const mode=pose.phase==='SHOT'?'shoot':'pass',duration=mode==='shoot'?.5:.36;return {mode,time:Math.min(duration-.001,duration*.42+pose.kickAge)};}
 if(pose.tackler===index&&pose.tackleAge>=0&&pose.tackleAge<.38)return {mode:'tackle',time:Math.min(.449,pose.tackleAge)};
 if(keeper&&pose.carrier===index&&pose.saveAge>=0&&pose.saveAge<.6)return {mode:'keeper-save',time:Math.min(.699,pose.saveAge)};
 const received=pose.receiveAge??pose.switchAge;
 if(pose.carrier===index&&received>=0&&received<.3)return {mode:'receive',time:Math.min(.349,received)};
 return {mode:keeper?'keeper-set':speed>6?'sprint':speed>.3?pose.carrier===index?'dribble':'jog':'idle'};
}
