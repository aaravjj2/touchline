import {FIELD} from './club-field.js';
import {rng} from './competition.js';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function hash(text){let n=2166136261;for(const ch of String(text))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
const names=['Northbank','Riverside','Cedar','Harbour','Hillcrest','Eastgate','Westfield','Lakeside','Valley','Southgate','Oakwood','Meadow','Kingswell','Brook','Ashford','Seaview','Stonebridge','Pine','Redwood','Greenhill'];
export function worldClub(id){
 if(id?.startsWith('nation:'))return {id,name:decodeURIComponent(id.slice(7)),country:'INT',rating:70,color:'#9db8df'};
 const real=FIELD.find(t=>t.id===id);if(real)return real;
 if(id?.startsWith('academy:'))return {id,name:decodeURIComponent(id.slice(8))+' Development FC',country:decodeURIComponent(id.slice(8)),rating:52,color:'#92c9ae',fictional:true};
 if(id?.startsWith('career:')){const [,code,index]=id.split(':'),i=Number(index),country=decodeURIComponent(code);return {id,name:names[i%20]+' '+(i<20?'Athletic':'United'),country,rating:i<20?65+(i*7%17):49+(i*5%18),color:['#92c9ae','#deac79','#9ea9df'][i%3],fictional:true};}
 return null;
}
export function createCircuit(club,seed,year=1){
 const country=club.country,real=FIELD.filter(t=>t.country===country).map(t=>t.id),generated=Array.from({length:40},(_,i)=>'career:'+encodeURIComponent(country)+':'+i);
 const top=[...real,...generated.slice(0,20)].slice(0,20),lower=generated.slice(20);
 if(!top.includes(club.id)&&!lower.includes(club.id))lower[0]=club.id;
 const tiers=[top,lower],random=rng(hash(country)^seed^year),schedule=[];
 for(let tier=0;tier<2;tier++){
  const rotation=[...tiers[tier]];
  for(let round=0;round<19;round++){
   for(let i=0;i<10;i++){const pair=[rotation[i],rotation[19-i]];if((round+i)%2)pair.reverse();schedule.push({id:country+':'+year+':'+tier+':'+round+':'+i,round:round+1,tier,home:pair[0],away:pair[1]},{id:country+':'+year+':'+tier+':'+(round+19)+':'+i,round:round+20,tier,home:pair[1],away:pair[0]});}
   rotation.splice(1,0,rotation.pop());
  }
 }
 const entrants=[...top,...lower];for(let i=entrants.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
 return {country,year,tiers,schedule,results:[],cup:{entrants,results:[],round:0,winner:null},completed:false};
}
export function table(circuit,tier){
 const rows=new Map(circuit.tiers[tier].map(id=>[id,{id,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
 for(const r of circuit.results){if(r.tier!==tier)continue;const a=rows.get(r.home),b=rows.get(r.away);a.p++;b.p++;a.gf+=r.score[0];a.ga+=r.score[1];b.gf+=r.score[1];b.ga+=r.score[0];if(r.score[0]===r.score[1]){a.d++;b.d++;a.pts++;b.pts++;}else{const [win,lose]=r.score[0]>r.score[1]?[a,b]:[b,a];win.w++;win.pts+=3;lose.l++;}}
 return [...rows.values()].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id.localeCompare(b.id));
}
export function nextCircuit(old,seed){
 const top=table(old,0).map(r=>r.id),lower=table(old,1).map(r=>r.id),next=createCircuit(worldClub(top[0]),seed,old.year+1);
 next.tiers=[[...top.slice(0,17),...lower.slice(0,3)],[...lower.slice(3),...top.slice(17)]];
 // Reuse the round-robin index layout, substituting the promoted/relegated membership.
 const initial=next.schedule.map(f=>({...f})),original=next.tiers.map(()=>[]);
 for(let t=0;t<2;t++){const ids=[...new Set(initial.filter(f=>f.tier===t).flatMap(f=>[f.home,f.away]))];original[t]=ids;}
 const mapping=new Map(original.flatMap((ids,t)=>ids.map((id,i)=>[t+':'+id,next.tiers[t][i]])));
 next.schedule=initial.map(f=>({...f,home:mapping.get(f.tier+':'+f.home),away:mapping.get(f.tier+':'+f.away)}));next.cup.entrants=next.tiers.flat();return next;
}
export const poisson=(mean,random)=>{const limit=Math.exp(-Math.max(.02,mean));let p=1,n=0;do{p*=random();n++;}while(p>limit&&n<18);return n-1;};
export function simulateWorldFixture(f,seed,impact=0,side=0){
 const random=rng(hash(f.id)^seed),home=worldClub(f.home),away=worldClub(f.away),diff=(home.rating-away.rating)/25+.12+(side===0?impact:-impact);
 return {...f,score:[poisson(clamp(1.3*Math.exp(diff),.2,3.6),random),poisson(clamp(1.15*Math.exp(-diff),.2,3.6),random)],model:'career-world-3'};
}
export function squadCandidates(clubId,role,season=1){
 const club=worldClub(clubId),random=rng(hash(clubId+role)),first=['Leo','Noah','Alex','Sam','Rayan','Adrian','Milan','Nico'],last=['Silva','Marin','Costa','Reed','Vega','Laurent','Berg','Santos'];
 return Array.from({length:3},(_,i)=>({id:clubId+':'+role+':'+i,name:first[Math.floor(random()*8)]+' '+last[Math.floor(random()*8)],rating:clamp(club.rating-14+i*3+Math.floor(random()*5)+(season%3-1),40,94),role,simulated:true}));
}
