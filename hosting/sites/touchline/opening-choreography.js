// Original presentation-only montage. No match state, commands or results.
export const OPENING_DURATION=12;
export function openingChoreography(seconds,{still=false}={}){
 const t=still?8.5:((Math.max(0,seconds)%OPENING_DURATION)+OPENING_DURATION)%OPENING_DURATION;
 let motion={mode:'idle'},z=0,velocity=[0,0],ball={kind:'ground',position:[-.16,.15,.42]},phase='idle';
 if(t<2.6){z=-3.12+t*1.2;velocity=[0,1.2];motion={mode:'dribble'};ball.position=[-.16,.15+Math.abs(Math.sin(t*9))*.025,z+.4];phase='dribble';}
 else if(t<3.2){motion={mode:'receive',time:Math.min(.349,t-2.6)};ball.kind='foot';phase='receive';}
 else if(t<3.7){motion={mode:'shoot',time:Math.min(.499,t-3.2)};ball=t<3.41?{kind:'foot',position:[-.16,.15,.42]}:{kind:'flight',age:t-3.41};phase=t<3.41?'wind-up':'shoot';}
 else if(t<4.6){ball={kind:'flight',age:t-3.41};phase='follow-through';}
 else if(t<7.2){motion={mode:'celebrate',time:Math.min(1.199,t-4.6)};ball={kind:'hidden'};phase='celebrate';}
 else if(t<8){motion={mode:'celebrate',time:Math.max(0,1.199*(1-(t-7.2)/.8))};ball={kind:'hidden'};phase='settle';}
 return {time:t,phase,motion,position:[0,z],velocity,ball,opacity:still?1:Math.min(1,t/.35,(OPENING_DURATION-t)/.55)};
}
