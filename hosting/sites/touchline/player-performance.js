// Counts recorded football events; no fabricated individual pass/assist statistics.
export function playerPerformance(def,state){
 const rows=def.rosters.map((team,t)=>team.concat(def.reserves[t]).map(p=>({...p,team:t,minutes:0,goals:0,shots:0,saves:0,recoveries:0})));
 const slots=def.rosters.map(r=>r.map(p=>p.id)),entered=new Map(def.rosters.flat().map(p=>[p.id,0]));
 const find=(team,id)=>rows[team].find(p=>p.id===id);
 const commands=[...(state.actions||[])].filter(c=>c.type==='sub').sort((a,b)=>a.tick-b.tick);let commandIndex=0;
 const sub=c=>{const t=c.team??0,row=find(t,c.out),slot=slots[t].indexOf(c.out);if(slot<0)return;row.minutes+=(c.tick-(entered.get(c.out)||0))/160;slots[t][slot]=c.in;entered.delete(c.out);entered.set(c.in,c.tick);};
 for(const event of state.events||[]){
  while(commands[commandIndex]&&commands[commandIndex].tick<=(event.tick??event.minute*160))sub(commands[commandIndex++]);
  const t=event.team;if(t!==0&&t!==1)continue;
  let row=event.scorer?rows[t].find(p=>p.name===event.scorer):Number.isInteger(event.player)?find(t,slots[t][event.player%11]):null;
  if(row&&['goal','shot','save','recovery'].includes(event.type))row[({goal:'goals',shot:'shots',save:'saves',recovery:'recoveries'})[event.type]]++;
 }
 while(commands[commandIndex])sub(commands[commandIndex++]);
 const end=state.world?.ticks??state.minute*160;
 for(const team of rows)for(const row of team){if(entered.has(row.id))row.minutes+=(end-entered.get(row.id))/160;row.minutes=Math.max(0,Math.min(90,Math.round(row.minutes)));}
 return rows;
}
