// Touchline editorial profiles, NOT EA/FC data or measured real-world statistics.
// Unknown individuals keep an explicitly marked club baseline rather than fake precision.
const profiles={
 'Mbappé':[96,98,40,91,91],'Haaland':[95,98,43,84,87],'Vinícius Júnior':[95,96,38,93,90],
 'Bellingham':[94,91,83,94,92],'Valverde':[92,86,86,91,96],'Courtois':[93,42,96,85,85],
 'Salah':[94,96,45,92,90],'Van Dijk':[93,65,97,87,88],'Alisson':[92,42,95,88,85],
 'Saka':[92,92,59,92,91],'Rice':[91,75,94,92,94],'Ødegaard':[92,87,65,96,88],
 'Raya':[89,40,92,89,85],'Saliba':[92,55,95,87,91],'Gabriel':[90,62,94,82,88],
 'Kane':[95,98,48,94,86],'Musiala':[93,91,52,97,89],'Kimmich':[92,80,91,96,92],
 'Neuer':[90,40,93,91,84],'Dembélé':[94,95,41,95,87],'Vitinha':[92,80,77,97,92],
 'Hakimi':[91,84,85,89,95],'Donnarumma':[92,40,95,82,85],'Pedri':[93,84,75,97,89],
 'Lamine Yamal':[95,93,42,97,89],'Raphinha':[93,94,57,92,93],'Lewandowski':[91,96,41,88,82],
 'Lautaro Martínez':[93,96,54,89,89],'Barella':[92,84,85,94,95],'Bastoni':[91,58,95,89,91],
 'Bruno Fernandes':[91,91,67,95,94],'Oblak':[91,40,94,82,85],'Kobel':[90,40,93,80,85]
};
export function authoredProfile(p,clubRating){
 const values=profiles[p.name];const rating=values?.[0]??clubRating-8;
 return {...p,rating,attack:values?.[1]??(p.role==='FWD'?rating:p.role==='MID'?rating-5:rating-20),defense:values?.[2]??(['GK','DEF'].includes(p.role)?rating:rating-15),control:values?.[3]??(p.role==='MID'?rating:rating-6),stamina:values?.[4]??82,ratingSource:values?'Touchline individual profile':'Touchline club baseline'};
}
