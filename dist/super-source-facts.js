// Stable biographical facts checked against primary sources on 22 October 2026.
// These facts do not establish opening-day ownership or complete squad coverage.
const birth=(value,source)=>({birthDate:value,evidence:{status:'verified',source,effective:value,checked:'2026-10-22'}});
export const SUPER_SOURCE_FACTS={
 'world-sandbox-eng-p606798':birth('2003-02-07','https://www.premierleague.com/en/news/4226266'),
 'super-leipzig-abdoulkone':birth('2005-04-22','https://datencenter.dfb.de/datencenter/personen/abdoul-kone/spieler'),
 'super-stuttgart-alexandergroi':birth('1998-07-01','https://datencenter.dfb.de/datencenter/personen/alexander-groiss/spieler'),
 'super-stuttgart-dominiknothnagel':birth('1994-12-28','https://datencenter.dfb.de/datencenter/personen/dominik-nothnagel/spieler'),
 'super-inter-mattiamarello':birth('2008-03-13','https://www.uefa.com/news-media/mediaservices/informationkits/competitions/uefachampionsleague/2027/match/2049695/printmatchpresskits/')
};
