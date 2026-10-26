"""Read official accepted/exemption PDFs into a versioned, non-playable data candidate."""
import json,re,io,urllib.request
from pathlib import Path
from pypdf import PdfReader
BASE='https://www.thefa.com/-/media/thefacom-new/files/competitions/2026-27/accepted-exemptions-and-prize-fund/'
ACCEPTED=BASE+'020726/the-emirates-fa-cup---list-of-clubs-accepted.ashx?la=en'
EXEMPT=BASE+'the-emirates-fa-cup---list-of-exemptions.ashx?la=en'
def text(url):
 raw=urllib.request.urlopen(url,timeout=30).read()
 return '\n'.join(p.extract_text() or '' for p in PdfReader(io.BytesIO(raw)).pages)
lines=[x.strip() for x in text(ACCEPTED).splitlines() if x.strip()]
if lines[:3]!=['THE EMIRATES FA CUP','SEASON 2026-27','LIST OF 743 CLUBS – ACCEPTED']:raise RuntimeError('Source edition or structure changed.')
names=lines[3:]
if len(names)!=743 or len(set(names))!=743:raise RuntimeError('Incomplete or duplicate cup field.')
sections=re.split(r'(\d+ CLUBS EXEMPT TO [^\n]+)',text(EXEMPT))[1:]
rounds={'THIRD ROUND PROPER':'third-proper','FIRST ROUND PROPER':'first-proper','FOURTH ROUND QUALIFYING':'fourth-qualifying','SECOND ROUND QUALIFYING':'second-qualifying','FIRST ROUND QUALIFYING':'first-qualifying','PRELIMINARY ROUND':'preliminary'}
entry={};counts={}
for i in range(0,len(sections),2):
 header=sections[i];expected=int(header.split()[0]);r=next(v for k,v in rounds.items() if 'TO '+k in header)
 rows=[x.strip() for x in sections[i+1].splitlines() if x.strip()][:expected]
 if len(rows)!=expected:raise RuntimeError('Truncated exemption list.')
 for name in rows:
  if name not in names or name in entry:raise RuntimeError('Invalid exemption identity: '+name)
  entry[name]=r
 counts[r]=len(rows)
if sum(counts.values())!=305:raise RuntimeError('Unexpected exemption count.')
data={'version':1,'season':'2026–27','checked':'2026-10-21','source':ACCEPTED,'exemptionsSource':EXEMPT,'status':'verified-entrants-and-entry-rounds-only','coverage':'All 743 accepted clubs and official exemptions. Strengths, squads, scheduling and tie rules are separate release gates.','entryCounts':{'extra-preliminary':len(names)-len(entry),**counts},'clubs':[{'id':'fa-2026:'+str(i),'name':name,'entryRound':entry.get(name,'extra-preliminary')}for i,name in enumerate(names)]}
Path('data/manager/fa-cup-2026-entrants.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n','utf8')
print(data['entryCounts'])
