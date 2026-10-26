// Reviewed against season-specific official league/federation/club records.
// This establishes selection only, never opening-day player registration or coverage.
const evidence=(source,effective,note)=>({status:'verified',source,effective,checked:'2026-10-23',note});
const groups=[
 [['english-eng-1','english-eng-15','english-eng-16','english-eng-2','english-eng-14','english-eng-3'],'https://www.premierleague.com/en/news/4668605/everything-thats-been-decided-in-202526-premier-league','2026-05-24','Official completed 2025/26 summary identifies the top five and Bournemouth sixth; all six meet selection.'],
 [['super-barcelona','super-real-madrid','super-villarreal','super-atletico'],'https://rfef.es/es/clasificacion','2026-05-24','Reviewed completed 38-match table: Barcelona, Real Madrid, Villarreal and Atletico occupy places 1–4.'],
 [['super-bayern','super-dortmund','super-leipzig','super-stuttgart'],'https://www.bayer04.de/en-us/competition/202526-season/bundesliga','2026-05-16','Club-hosted 2025/26 final table, 34 matches: Bayern, Dortmund, Leipzig and Stuttgart occupy places 1–4.'],
 [['super-inter','super-napoli','super-roma','super-como'],'https://www.legaseriea.it/serie-a/news/numeri-e-statistiche-della-serie-a-enilive-2025-2026','2026-05-24','Official season summary explicitly identifies Inter champions, Napoli second, Roma third and Como fourth.'],
 [['super-paris','super-lens'],'https://www.om.fr/fr/equipe/hommes/classement/2025-2026','2026-05-17','Club-hosted 2025/26 final table, 34 matches: PSG first, Lens second.']
];
export const REVIEWED_MEMBERSHIP=Object.fromEntries(groups.flatMap(([ids,source,effective,note])=>ids.map(id=>[id,evidence(source,effective,note)])));
