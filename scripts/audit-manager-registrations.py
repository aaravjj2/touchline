"""Audit a candidate against the official submitted squad list, without fuzzy auto-merges.

Run from project root. No unmatched person is guessed or silently removed.
"""
import json,re,unicodedata,urllib.request
from html import unescape
from pathlib import Path
URL='https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists'
html=urllib.request.urlopen(URL,timeout=30).read().decode('utf8')
root=Path('data/manager')
data=json.loads((root/'england-2026-candidate.json').read_text('utf8'))
def normalize(name):
 text=unicodedata.normalize('NFKD',name.translate(str.maketrans({'Ø':'O','ø':'o','Đ':'D','đ':'d','ß':'ss','ı':'i'}))).encode('ascii','ignore').decode().lower()
 return set(re.findall(r'[a-z]+',text))-{'de','da','dos','do','di','jr','junior'}
aliases={'Leeds United':'Leeds','Newcastle United':'Newcastle','AFC Bournemouth':'Bournemouth','Manchester City':'Man City','Manchester United':'Man Utd','Brighton & Hove Albion':'Brighton','Nottingham Forest':"Nott'm Forest",'Tottenham Hotspur':'Spurs','Wolverhampton Wanderers':'Wolves'}
clubs={c['name']:c['id'] for c in data['clubs']}
entries=[]
for heading,body in re.findall(r'<h5[^>]*>(.*?)</h5>(.*?)(?=<h5|$)',html,re.S):
 name=unescape(re.sub('<[^>]+>','',heading)).strip();club=clubs.get(aliases.get(name,name))
 if not club:continue
 # Lists are br-delimited; strong tags hold explanatory subheadings.
 for para in re.findall(r'<p[^>]*>(.*?)</p>',body,re.S):
  para=re.sub(r'<strong[^>]*>.*?</strong>','',para,flags=re.S)
  for line in re.split(r'<br\s*/?>',para):
   text=unescape(re.sub('<[^>]+>','',line)).strip()
   if ',' not in text or len(text)>130 or '(' in text and '(Loan)' not in text:continue
   entries.append({'name':text.replace('*','').replace('(Loan)','').strip(),'club':club,'loanOut':'(Loan)' in text})
if len(set(e['club'] for e in entries))!=20:raise RuntimeError('Official list is not the expected full league; refusing an incomplete audit.')
rows=[]
for c in data['clubs']:
 for p in c['players']:
  tokens=normalize(p['name'])
  matches=[e for e in entries if len(tokens)>=2 and (tokens<=normalize(e['name']) or (len(normalize(e['name']))>=2 and normalize(e['name'])<=tokens))]
  active=[e for e in matches if not e['loanOut']]
  if len(active)==1 and len(matches)==1:status='matched-active';match=active[0]
  elif len(matches)==1 and matches[0]['loanOut']:status='listed-loan-out';match=matches[0]
  else:status='unresolved';match=None
  rows.append({'player':p['id'],'name':p['name'],'feedClub':c['id'],'status':status,'matchedClub':match['club'] if match else None,'matchedName':match['name'] if match else None})
report={'version':1,'source':URL,'checked':'2026-10-21','method':'Exact normalized name token containment, globally unique entry only. Ambiguous and absent names are unresolved; no fuzzy identity merges. Squad listing does not independently verify parent ownership of incoming loans.','sourceClubs':20,'sourceEntries':len(entries),'counts':{status:sum(r['status']==status for r in rows) for status in ['matched-active','listed-loan-out','unresolved']},'players':rows}
(root/'england-2026-registration-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps(report['counts']))
