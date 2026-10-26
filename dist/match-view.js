import {CLUBS} from './engine.js';

// Hand-drawn articulated athletes, not font glyphs or kit icons. The draw loop
// uses the same frozen pose while paused, so pausing also stops every limb.
export class MatchView {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.last=null;this.walk=new Array(22).fill(0);}
 draw(pose,state,{moving=false,reduced=false}={}){
  const canvas=this.canvas,ctx=this.ctx,rect=canvas.getBoundingClientRect();
  const w=Math.max(300,rect.width),h=rect.height||w*.64,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const inset=w*.055,top=h*.085,fw=w-2*inset,fh=h*.80;
  const xy=p=>[inset+p[0]/100*fw,top+p[1]/64*fh];
  ctx.fillStyle='#10231e';ctx.fillRect(0,0,w,h);
  // Stadium apron, seating lights and alternating cut grass.
  for(let row=0;row<3;row++)for(let j=0;j<50;j++){ctx.fillStyle=['#355148','#243e37','#527366'][(row+j)%3];ctx.fillRect(j*w/50+2,row*4+3,w/50-4,2);ctx.fillRect(j*w/50+2,h-5-row*4,w/50-4,2);}
  ctx.fillStyle='#243b31';ctx.fillRect(inset-7,top-7,fw+14,fh+14);
  for(let stripe=0;stripe<10;stripe++){ctx.fillStyle=stripe%2?'#327951':'#2d704a';ctx.fillRect(inset+stripe*fw/10,top,fw/10,fh);}
  const shade=ctx.createLinearGradient(0,top,0,top+fh);shade.addColorStop(0,'#071c1418');shade.addColorStop(.5,'#c0f1c908');shade.addColorStop(1,'#071c1438');ctx.fillStyle=shade;ctx.fillRect(inset,top,fw,fh);
  ctx.strokeStyle='#cbe6cc99';ctx.lineWidth=1.2;
  const line=(a,b)=>{ctx.beginPath();ctx.moveTo(...xy(a));ctx.lineTo(...xy(b));ctx.stroke();};
  const box=(x,y,bw,bh)=>{const p=xy([x,y]);ctx.strokeRect(p[0],p[1],bw/100*fw,bh/64*fh);};
  box(0,0,100,64);line([50,0],[50,64]);ctx.beginPath();ctx.ellipse(...xy([50,32]),fw*.087,fh*.137,0,0,Math.PI*2);ctx.stroke();
  box(0,13.5,16,37);box(84,13.5,16,37);box(0,23,5.5,18);box(94.5,23,5.5,18);
  for(const x of [11,50,89]){ctx.beginPath();ctx.arc(...xy([x,32]),1.5,0,Math.PI*2);ctx.fillStyle='#dcebd3';ctx.fill();}
  for(const x of [0,100]){const dir=x===0?-1:1;ctx.strokeStyle='#c1d5d5aa';box(x+(dir<0?-3:0),27,3,10);ctx.strokeStyle='#d1e6df24';for(let j=0;j<5;j++)line([x,27+j*2.5],[x+dir*3,27+j*2.5]);for(let j=1;j<3;j++)line([x+dir*j,27],[x+dir*j,37]);}
  ctx.font=`600 ${Math.max(8,w*.014)}px system-ui`;ctx.fillStyle='#a7c4b1aa';ctx.textAlign='center';ctx.fillText('T O U C H L I N E  /  MATCHDAY',w/2,h*.965);
  const scale=Math.max(.58,Math.min(1.3,w/720));
  const drawAthlete=(p,i)=>{if(pose.active?.[i]===false)return;
   const [x,y]=xy(p),team=i<11?0:1,keeper=pose.keepers?pose.keepers.includes(i):i%11===0;
   const old=this.last?.positions[i]||p,dx=p[0]-old[0],dy=p[1]-old[1],speed=Math.hypot(dx,dy);
   if(moving&&!reduced)this.walk[i]+=speed*2.8;
   const stride=moving&&!reduced&&speed>.002?Math.sin(this.walk[i])*3.3:0;
   const facing=speed>.004?Math.atan2(dy,dx):team===0?0:Math.PI;
   ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(keeper&&i===(1-pose.team)*11&&pose.phase==='SHOT'){ctx.rotate(Math.sin(Math.min(1,Math.max(0,((pose.progress||0)-.82)/.18))*Math.PI/2)*.75*(pose.ball[1]<32?-1:1));}
   ctx.fillStyle='#08241666';ctx.beginPath();ctx.ellipse(2,4,8,3.5,0,0,Math.PI*2);ctx.fill();
   if((pose.controlled??pose.carrier)===i){ctx.strokeStyle=team===0?'#d5ff7a':'#c1deff';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,3,11,5,0,0,Math.PI*2);ctx.stroke();}
   // Dark socks and boots alternate with the run cycle.
   ctx.strokeStyle='#152824';ctx.lineWidth=3.6;ctx.lineCap='round';
   for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*2.5,-1);ctx.lineTo(side*2.8+Math.cos(facing)*stride*side,5+stride*side*.5);ctx.stroke();ctx.strokeStyle='#e8eee3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(side*2.8+Math.cos(facing)*stride*side,5+stride*side*.5);ctx.lineTo(side*2.8+Math.cos(facing)*stride*side+2,5+stride*side*.5);ctx.stroke();ctx.strokeStyle='#152824';ctx.lineWidth=3.6;}
   const skin=['#c88e66','#e3b28a','#835b40','#b77c53'][i%4];
   ctx.strokeStyle=skin;ctx.lineWidth=2.8;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*4,-7);ctx.lineTo(side*7,-3+stride*side*.65);ctx.stroke();}
   ctx.fillStyle=keeper?'#ffad55':team===0?CLUBS[state.club].color:CLUBS[state.opponent].color;ctx.beginPath();ctx.roundRect(-4.8,-11,9.6,11,2);ctx.fill();
   ctx.fillStyle='#f9ffea99';ctx.fillRect(-.8,-10,1.6,7);ctx.fillStyle='#172d24';ctx.fillRect(-4,-1,8,3);
   ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-14,3.7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a2522';ctx.beginPath();ctx.arc(0,-15,3.6,Math.PI,Math.PI*2);ctx.fill();
   ctx.fillStyle='#10261c';ctx.font='bold 6px system-ui';ctx.textAlign='center';ctx.fillText(String(i%11+1),0,-3);
   ctx.restore();
  };
  // Sort by depth so legs/heads occlude naturally.
  pose.positions.map((p,i)=>({p,i})).sort((a,b)=>a.p[1]-b.p[1]).forEach(({p,i})=>drawAthlete(p,i));
  const [bx,by]=xy(pose.ball),lift=(pose.height||0)*scale*4;
  ctx.fillStyle='#05231577';ctx.beginPath();ctx.ellipse(bx+1,by+2,3.5*scale,1.7*scale,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fffdee';ctx.strokeStyle='#21382c';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(bx,by-lift,3.1*scale,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#24372b';ctx.beginPath();ctx.arc(bx+.6,by-lift-.5,1.2*scale,0,Math.PI*2);ctx.fill();
  if(pose.restartFade>.05){ctx.fillStyle=`rgba(13,30,23,${pose.restartFade*.85})`;ctx.fillRect(0,0,w,h);ctx.fillStyle='#dcf3bf';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('KICK-OFF',w/2,h/2);}
  this.width=canvas.clientWidth;this.last={positions:pose.positions.map(p=>[...p])};
  canvas.dataset.phase=pose.phase;canvas.dataset.progress=Number(pose.progress||0).toFixed(3);canvas.dataset.ball=pose.ball.map(n=>n.toFixed(2)).join(',');
 }
}
