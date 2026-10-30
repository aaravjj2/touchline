// Shared date/fixture contract. Dates are UTC civil days, never local timestamps.
const DAY=86400000;
export function dayNumber(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Use an ISO calendar date.');
 const n=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==date)throw Error('Invalid calendar date.');
 return n/DAY;
}
export const addDays=(date,days)=>{if(!Number.isInteger(days))throw Error('Use whole calendar days.');return new Date((dayNumber(date)+days)*DAY).toISOString().slice(0,10);};
export const daysBetween=(a,b)=>dayNumber(b)-dayNumber(a);
export const displayDate=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(dayNumber(date)*DAY));
export function createCalendar({id,start,minimumRestDays=2}){
 dayNumber(start);if(!id||!Number.isInteger(minimumRestDays)||minimumRestDays<1)throw Error('Invalid calendar settings.');
 return {version:1,id,date:start,minimumRestDays,fixtures:[],decisions:[],history:[]};
}
export function scheduleFixture(calendar,fixture){
 const f={...fixture,status:'scheduled',result:null};dayNumber(f.date);
 if(!f.id||!f.competition||!f.home||!f.away||f.home===f.away||calendar.fixtures.some(x=>x.id===f.id)||f.date<calendar.date)throw Error('Invalid or duplicate fixture.');
 for(const x of calendar.fixtures){
  if(![x.home,x.away].some(id=>id===f.home||id===f.away))continue;
  if(Math.abs(daysBetween(x.date,f.date))<calendar.minimumRestDays)throw Error('Club calendar conflict: insufficient rest.');
 }
 calendar.fixtures.push(f);calendar.fixtures.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));return f;
}
export function fixtureRestDays(calendar,fixture,club){
 const previous=calendar.fixtures.filter(f=>f.id!==fixture.id&&f.date<fixture.date&&(f.home===club||f.away===club)).at(-1);
 return previous?daysBetween(previous.date,fixture.date):null;
}
export function addCalendarDecision(calendar,{id,date,title,mandatory=true}){
 dayNumber(date);if(!id||!title||date<calendar.date||calendar.decisions.some(d=>d.id===id))throw Error('Invalid calendar decision.');
 calendar.decisions.push({id,date,title,mandatory:!!mandatory,resolved:false});
}
export function resolveCalendarDecision(calendar,id){const d=calendar.decisions.find(x=>x.id===id);if(!d)throw Error('Unknown calendar decision.');d.resolved=true;}
export function commitCalendarResult(calendar,id,result){
 const f=calendar.fixtures.find(x=>x.id===id);if(!f)throw Error('Unknown fixture.');
 // An exact retry is harmless; a conflicting retry is a save/integration error.
 if(f.status==='complete'){if(JSON.stringify(f.result)!==JSON.stringify(result))throw Error('Fixture already has a different result.');return false;}
 if(f.date!==calendar.date||!result||result.home!==f.home||result.away!==f.away||!['physical','statistical'].includes(result.kind)||!Array.isArray(result.score)||result.score.length!==2||result.score.some(n=>!Number.isInteger(n)||n<0))throw Error('Result does not match the active fixture.');
 if(result.kind==='statistical'&&(result.definition||result.replay))throw Error('Statistical results cannot contain physical replays.');
 if(result.kind==='physical'&&(!result.recordId||!result.engineVersion))throw Error('Physical result needs its recorded match identity.');
 f.result=structuredClone(result);f.status='complete';return true;
}
// Every committed fixture is a serializable checkpoint. Callers own worker/storage transport.
export async function advanceCalendar(calendar,{until,simulate,checkpoint=()=>{},cancelled=()=>false,controlledClub=null,stopBeforeControlled=false}){
 dayNumber(until);if(until<calendar.date)throw Error('Cannot reverse the calendar.');
 let completed=0;
 while(true){
  if(cancelled())return {reason:'cancelled',completed,date:calendar.date};
  const decision=calendar.decisions.filter(d=>!d.resolved&&d.mandatory&&d.date<=until).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))[0];
  const fixture=calendar.fixtures.find(f=>f.status==='scheduled'&&f.date<=until);
  if(decision&&(!fixture||decision.date<=fixture.date)){calendar.date=decision.date;await checkpoint(structuredClone(calendar));return {reason:'decision',id:decision.id,completed,date:calendar.date};}
  if(!fixture){calendar.date=until;await checkpoint(structuredClone(calendar));return {reason:'complete',completed,date:calendar.date};}
  calendar.date=fixture.date;
  if(stopBeforeControlled&&(fixture.home===controlledClub||fixture.away===controlledClub)){await checkpoint(structuredClone(calendar));return {reason:'fixture',id:fixture.id,completed,date:calendar.date};}
  const result=await simulate(structuredClone(fixture));
  commitCalendarResult(calendar,fixture.id,result);completed++;
  await checkpoint(structuredClone(calendar));
 }
}
// Read-only adapter for legacy fantasy saves: no rewrite of results, fatigue or windows.
export function fantasyManagerCalendar(c){
 const start=addDays(`${2025+c.season}-08-01`,7),calendar=createCalendar({id:'fantasy-'+c.season,start});
 const comp=c.competition;if(!comp?.schedule)return calendar;
 comp.schedule.forEach((pairs,round)=>pairs.forEach(([home,away],index)=>{
  const f=scheduleFixture(calendar,{id:`${calendar.id}:${round}:${index}`,competition:'Fantasy league',date:addDays(start,round*7),home,away,round:round+1});
  const recorded=comp.results.find(r=>r.round===round+1&&r.home===home&&r.away===away);
  if(recorded){f.status='complete';f.result={score:[...recorded.score],kind:recorded.definition?'physical':'statistical'};}
 }));
 calendar.date=addDays(start,Math.max(0,comp.round-1)*7);return calendar;
}
