// Saved balances and economy rules retain normalized units. Managerial presentation uses GBP.
export const GBP_PER_UNIT=500000;
export const usesPounds=c=>['english-sandbox','super-league'].includes(c?.setup?.kind);
export const usesSourcedFinances=c=>usesPounds(c)&&[2,3,4].includes(c.economy?.version);
export const gbpToUnits=amount=>Math.round(Number(amount)*100)/100/GBP_PER_UNIT;
export const unitsToGbp=amount=>Math.round(Number(amount)*GBP_PER_UNIT);
export function pounds(value,compact=true){
 if(!Number.isFinite(value))return 'Not published';const sign=value<0?'−':'',n=Math.abs(value);
 if(compact&&n>=1e6)return sign+'£'+new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n/1e6)+'m';
 if(compact&&n>=1e3)return sign+'£'+new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(n/1e3)+'k';
 return sign+'£'+new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n);
}
export const money=(c,amount,compact=true)=>pounds(unitsToGbp(amount),compact);
export const moneyInput=(c,amount)=>unitsToGbp(amount);
export function wageCharge(c,weeklyUnits,round){
 if(!usesSourcedFinances(c))return Math.ceil(weeklyUnits);
 // The league compresses a year into 38 rounds; bill exactly 52 wage weeks.
 const weeks=Math.floor((round+1)*52/38)-Math.floor(round*52/38);
 return gbpToUnits(unitsToGbp(weeklyUnits)*weeks);
}

// Older saved negotiation text can contain credits; display its original value in GBP.
export const moneyMessage=(c,text)=>String(text||'').replace(/(\d+(?:\.\d+)?) credits?\b/g,(_,amount)=>money(c,Number(amount)));
