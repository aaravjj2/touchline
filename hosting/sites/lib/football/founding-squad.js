// Original Touchline starter players, not real people or sourced registrations.
// Eighteen players allow immediate fixtures and five open recruitment places.
const definitions=[
 ['Ellis Ward','GK',74],['Samir Vale','GK',69],
 ['Theo Marsh','DEF',74],['Luca Fenwick','DEF',73],['Noah Mercer','DEF',72],['Idris Bell','DEF',71],['Finn Holloway','DEF',69],['Rafi Cole','DEF',68],
 ['Jonah Reed','MID',75],['Milo Hart','MID',74],['Amir Rowan','MID',72],['Callum North','MID',71],['Leo Ashford','MID',69],['Isaac Wren','MID',68],
 ['Zane Brooks','FWD',75],['Oscar Hale','FWD',73],['Evan Rivers','FWD',71],['Nico Field','FWD',69]
];
export const FOUNDING_PLAYERS=definitions.map(([name,role,rating],i)=>({
 id:'founder-'+i,personId:'touchline-founder-'+i,name,role,rating,club:'Founding squad',era:'Original players',color:'#b6f36a',number:i+1,
 attack:role==='FWD'?rating:role==='MID'?rating-5:rating-20,defense:['DEF','GK'].includes(role)?rating:role==='MID'?rating-8:rating-24,
 control:role==='MID'?rating:rating-7,stamina:role==='GK'?85:80+i%10,cost:Math.max(12,Math.round((rating-65)*.85)),source:'Touchline original starter squad',ratingSource:'Touchline authored'
}));
export const FOUNDING_PACK={players:FOUNDING_PLAYERS};
