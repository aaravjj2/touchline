"""Reproduce Touchline Analytics v1. Raw downloads stay outside the published app."""
import os
os.environ['OMP_NUM_THREADS']='1'
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['MKL_NUM_THREADS']='1'
import argparse, csv, hashlib, io, json, math, urllib.request, zipfile
from pathlib import Path
from collections import Counter, defaultdict
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, brier_score_loss, roc_auc_score

VERSION='touchline-analytics-1.0.0'
ROUTES=['cross','through','other','none']
ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT/'work/analytics-source'
PERIODS={'1H':0,'2H':1,'E1':2,'E2':3,'P':4}
SOURCES={}
LOCK_PATH=Path(__file__).with_name('sources.lock.json')

def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8')

def source(article):
    CACHE.mkdir(parents=True,exist_ok=True)
    lock=json.loads(LOCK_PATH.read_text()) if LOCK_PATH.exists() else {}
    locked=lock.get(str(article))
    meta_path=CACHE/f'{article}-metadata.json'
    if not meta_path.exists():
        endpoint=f'https://api.figshare.com/v2/articles/{article}'+(f'/versions/{locked["version"]}' if locked else '')
        meta_path.write_bytes(urllib.request.urlopen(endpoint).read())
    meta=json.loads(meta_path.read_text()); f=meta['files'][0]; path=CACHE/f['name']
    if not path.exists():
        print('Downloading',f['name'],flush=True)
        with urllib.request.urlopen(f['download_url']) as r,path.open('wb') as dest:
            while chunk:=r.read(1024*1024): dest.write(chunk)
    raw=path.read_bytes()
    if locked and (meta['version']!=locked['version'] or hashlib.sha256(raw).hexdigest()!=locked['sha256']): raise ValueError('Pinned source version/hash mismatch; review source changes explicitly')
    if f.get('computed_md5') and hashlib.md5(raw).hexdigest()!=f['computed_md5']: raise ValueError('Source checksum mismatch')
    SOURCES[str(article)]={'title':meta['title'],'version':meta['version'],'doi':meta.get('doi'),'url':f'https://figshare.com/articles/dataset/_/{article}','file':f['name'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'license':meta['license']['name']}
    return raw

def geometry(x,y):
    if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not math.isfinite(x+y) or not 0<=x<=100 or not 0<=y<=100: raise ValueError('Invalid shot coordinates')
    dx=(100-x)*1.05; dy=(y-50)*.68
    return math.hypot(dx,dy),math.atan2(7.32*dx,dx*dx+dy*dy-3.66**2)

def bodypart(tags):
    # Wyscout 403 is head/body, not a verified header. Ambiguous tags remain unknown.
    present=[(401,'left'),(402,'right'),(403,'head_body')]
    found=[name for tag,name in present if tag in tags]
    return found[0] if len(found)==1 else 'unknown'

def eligible(event):
    if event.get('eventId')!=10: return False,'non_shot'
    if event.get('matchPeriod') not in ['1H','2H']: return False,'extra_time_or_shootout'
    loc=event.get('positions') or []
    if not loc: return False,'missing_location'
    try: geometry(loc[0].get('x'),loc[0].get('y'))
    except (ValueError,TypeError): return False,'invalid_location'
    return True,None

def route_for(event,previous):
    for p in reversed(previous):
        if p['matchPeriod']!=event['matchPeriod'] or event['eventSec']-p['eventSec']>10: break
        if p.get('teamId')!=event['teamId'] or p.get('eventId') in [2,3,5,6]: break
        tags={t['id'] for t in p.get('tags',[])}
        if p.get('eventId')==8 and 1801 in tags:
            return 'cross' if p.get('subEventId')==80 else 'through' if 901 in tags else 'other'
    return 'none'

def extract(events,matches,league):
    by_match=defaultdict(list); exclusions=Counter(); shots=[]
    for e in events: by_match[e['matchId']].append(e)
    for mid,es in by_match.items():
        # Stable original ordering resolves simultaneous duel events.
        es.sort(key=lambda e:(PERIODS.get(e['matchPeriod'],9),e['eventSec']))
        previous=[]
        for e in es:
            if e.get('eventId')==3 and e.get('subEventId') in [33,35]: exclusions['direct_free_kick' if e['subEventId']==33 else 'penalty']+=1
            ok,reason=eligible(e)
            if not ok:
                if reason!='non_shot': exclusions[reason]+=1
                previous.append(e); continue
            x,y=e['positions'][0]['x'],e['positions'][0]['y']; d,a=geometry(x,y);tags={t['id'] for t in e.get('tags',[])}
            shots.append({'id':e['id'],'match':mid,'team':e['teamId'],'period':e['matchPeriod'],'second':e['eventSec'],'x':x,'y':y,'distance':d,'angle':a,'body':bodypart(tags),'goal':int(101 in tags),'route':route_for(e,previous),'league':league})
            previous.append(e)
    matchids={m['wyId'] for m in matches}
    if set(by_match)-matchids: raise ValueError('Event lacks match metadata')
    return shots,dict(exclusions)

def features(rows,distance_only=False):
    # No goal/outcome, assist/key-pass tags, destination, team, player or route features.
    return np.array([[r['distance']] if distance_only else [r['distance'],r['angle'],int(r['body']=='left'),int(r['body']=='head_body'),int(r['body']=='unknown')] for r in rows],dtype=float)

def fit(X,y,C):
    scaler=StandardScaler().fit(X); model=LogisticRegression(C=C,penalty='l2',solver='liblinear',max_iter=2000,random_state=42).fit(scaler.transform(X),y)
    return scaler,model

def train(rows):
    rng=np.random.default_rng(42);fold={}
    for league in sorted({r['league'] for r in rows}):
        ids=np.array(sorted({r['match'] for r in rows if r['league']==league}));rng.shuffle(ids)
        fold.update({int(mid):i%5 for i,mid in enumerate(ids)})
    y=np.array([r['goal'] for r in rows]);folds=np.array([fold[r['match']] for r in rows]);models={};cv={};audit=[]
    for name,small in [('distance',True),('full',False)]:
        X=features(rows,small);scores=[]
        for C in [.01,.1,1,10]:
            losses=[]
            for k in range(5):
                tr=folds!=k;va=~tr;s,m=fit(X[tr],y[tr],C);p=m.predict_proba(s.transform(X[va]))[:,1];losses.append(float(log_loss(y[va],p)))
                if name=='full' and C==.01:
                    audit.append({'fold':k,'trainMatches':sorted({r['match'] for i,r in enumerate(rows) if tr[i]}),'validationMatches':sorted({r['match'] for i,r in enumerate(rows) if va[i]}),'preprocessingMean':s.mean_.tolist(),'trainRows':int(tr.sum()),'validationRows':int(va.sum())})
            scores.append({'C':C,'foldLogLoss':losses,'meanLogLoss':float(np.mean(losses))})
        chosen=min(scores,key=lambda x:(x['meanLogLoss'],x['C']));s,m=fit(X,y,chosen['C'])
        models[name]={'features':['distance'] if small else ['distance','angle','left','head_body','unknown'],'mean':s.mean_.tolist(),'scale':s.scale_.tolist(),'coefficients':m.coef_[0].tolist(),'intercept':float(m.intercept_[0]),'C':chosen['C']}
        cv[name]=scores
    return {'version':VERSION,'constant':float(y.mean()),'models':models,'training':{'leagues':sorted({r['league'] for r in rows}),'matches':len(fold),'shots':len(rows),'goals':int(y.sum()),'folds':audit,'cv':cv,'seed':42}}

def predict(rows,artifact,name='full'):
    if name=='constant': return np.full(len(rows),artifact['constant'])
    m=artifact['models'][name];X=features(rows,name=='distance');z=((X-np.array(m['mean']))/np.array(m['scale']))@np.array(m['coefficients'])+m['intercept']
    return 1/(1+np.exp(-z))

def metric_values(y,p):
    return {'logLoss':float(log_loss(y,p,labels=[0,1])),'brier':float(brier_score_loss(y,p)),'auc':float(roc_auc_score(y,p)) if len(set(y))==2 else None}

def evaluate(rows,artifact):
    y=np.array([r['goal'] for r in rows]); mids=np.array([r['match'] for r in rows]); ids=sorted(set(mids));groups=[np.where(mids==mid)[0] for mid in ids];rng=np.random.default_rng(42)
    boot=[np.concatenate([groups[i] for i in draw]) for draw in rng.integers(0,len(ids),(2000,len(ids)))];result={}
    for name in ['constant','distance','full']:
        print('Evaluate',name,len(rows),flush=True);p=predict(rows,artifact,name);values=metric_values(y,p);samples={k:[] for k in values}
        for ix in boot:
            v=metric_values(y[ix],p[ix])
            for k,x in v.items():
                if x is not None: samples[k].append(x)
        ci={k:[float(x) for x in np.quantile(v,[.025,.975])] if v else None for k,v in samples.items()}
        bins=[]
        for low in np.arange(0,1,.2):
            mask=(p>=low)&(p<low+.2 if low<.8 else p<=1)
            counts=np.array([int(mask[g].sum()) for g in groups]);observed=np.array([float(y[g][mask[g]].sum()) for g in groups]);estimated=np.array([float(p[g][mask[g]].sum()) for g in groups])
            w=np.random.default_rng(42).multinomial(len(ids),np.full(len(ids),1/len(ids)),size=2000);den=w@counts;valid=den>0
            intervals={k:np.quantile((w@num)[valid]/den[valid],[.025,.975]).tolist() if valid.any() else None for k,num in [('observed',observed),('predicted',estimated)]}
            bins.append({'low':float(low),'high':float(low+.2),'n':int(mask.sum()),'predicted':float(p[mask].mean()) if mask.any() else None,'observed':float(y[mask].mean()) if mask.any() else None,'intervals':intervals})
        result[name]={'metrics':values,'intervals':ci,'calibration':bins}
    return {'shots':len(rows),'goals':int(y.sum()),'shotMatches':len(ids),'bootstrapSamples':2000,'models':result}

def summarize(rows,matches,team=None,route=None):
    ms=[m for m in matches if team is None or str(team) in m['teamsData']]; ids=[m['wyId'] for m in ms]
    selected=[s for s in rows if (team is None or s['team']==team) and (route is None or s['route']==route)]
    slots={mid:i for i,mid in enumerate(ids)};n=np.zeros(len(ids));goals=np.zeros(len(ids));xg=np.zeros(len(ids))
    for s in selected: i=slots[s['match']];n[i]+=1;goals[i]+=s['goal'];xg[i]+=s['xg']
    total=float(xg.sum()); count=int(n.sum());support=int(np.count_nonzero(n));eligible=count>=30 and support>=5
    result={'shots':count,'goals':int(goals.sum()),'xg':total,'xgPerShot':total/count if count else None,'teamMatches':len(ms)*(2 if team is None else 1),'shotMatches':support,'sufficient':eligible,'intervals':None}
    result['xgPerTeamMatch']=total/result['teamMatches'] if result['teamMatches'] else None
    if eligible:
        rng=np.random.default_rng(42);weights=rng.multinomial(len(ids),np.full(len(ids),1/len(ids)),size=2000);ns=weights@n;xs=weights@xg;valid=ns>0
        result['intervals']={'xgPerShot':np.quantile(xs[valid]/ns[valid],[.025,.975]).tolist(),'xgPerTeamMatch':np.quantile(xs/(len(ids)*(2 if team is None else 1)),[.025,.975]).tolist()}
    return result

def difference_interval(rows,matches,route):
    ids=[m['wyId'] for m in matches];slots={mid:i for i,mid in enumerate(ids)};n=np.zeros((2,len(ids)));x=np.zeros((2,len(ids)))
    for r in rows:
        j=int(r['route']!=route);i=slots[r['match']];n[j,i]+=1;x[j,i]+=r['xg']
    weights=np.random.default_rng(42).multinomial(len(ids),np.full(len(ids),1/len(ids)),size=2000);ns=weights@n.T;xs=weights@x.T;valid=(ns>0).all(axis=1);means=xs[valid]/ns[valid]
    return np.quantile(means[:,0]-means[:,1],[.025,.975]).tolist() if valid.any() else None

def build(output):
    events_zip=zipfile.ZipFile(io.BytesIO(source(7770599)));matches_zip=zipfile.ZipFile(io.BytesIO(source(7770422)));teams_raw=source(7765310)
    teams=json.loads(teams_raw) if teams_raw[:1] in [b'[',b'{'] else json.loads(zipfile.ZipFile(io.BytesIO(teams_raw)).read('teams.json'))
    names={t['wyId']:t['name'] for t in teams};all_rows={};all_matches={};exclusions={}
    for league in ['France','Germany','Italy','Spain','England','World_Cup']:
        print('Extract',league,flush=True);matches=json.loads(matches_zip.read(f'matches_{league}.json'));events=json.loads(events_zip.read(f'events_{league}.json'))
        rows,excluded=extract(events,matches,league);all_rows[league]=rows;all_matches[league]=matches;exclusions[league]=excluded;del events
    development=sum([all_rows[l] for l in ['France','Germany','Italy','Spain']],[]);artifact=train(development);output.mkdir(parents=True,exist_ok=True)
    dev_ids={r['match'] for r in development};reports={};datasets={};parity=[]
    for league,key in [('England','england'),('World_Cup','world-cup')]:
        rows=all_rows[league];ms=all_matches[league];assert not dev_ids&{m['wyId'] for m in ms}
        reports[key]=evaluate(rows,artifact);pred=predict(rows,artifact)
        for r,p in zip(rows,pred):r['xg']=float(p)
        tids=sorted({int(t) for m in ms for t in m['teamsData']});summaries={}
        for team in [None]+tids:
            summaries[str(team) if team is not None else 'all']={r or 'all':summarize(rows,ms,team,r) for r in [None]+ROUTES}
        datasets[key]={'version':VERSION,'competition':key,'label':'England 2017–18' if key=='england' else 'World Cup 2018','matches':[{'id':m['wyId'],'label':m['label'],'date':m['dateutc'],'teams':[int(t) for t in m['teamsData']]} for m in ms],'teams':[{'id':i,'name':names.get(i,str(i))} for i in tids],'shots':rows,'summaries':summaries}
        for m in ms: write(output/'matches'/f'{m["wyId"]}.json',{'source':'https://figshare.com/articles/dataset/Matches/7770422','license':'CC BY 4.0','attribution':'Pappalardo et al. (2019), match metadata collected by Wyscout','match':m})
        write(output/f'{key}.json',datasets[key]);parity.extend([{k:r[k] for k in ['distance','angle','body','xg']} for r in rows[:500]])
        with (output/f'{key}.csv').open('w',newline='',encoding='utf-8-sig') as f:
            w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    # Findings are fixed comparisons, reported for BOTH independent datasets; never selected for their p-values.
    findings=[]
    for route in ROUTES:
        per={}
        for key,data in datasets.items():
            s=data['summaries']['all'][route];complement=[r for r in data['shots'] if r['route']!=route];other=summarize(complement,all_matches['England' if key=='england' else 'World_Cup'])
            per[key]={'route':s,'otherRoutes':other,'difference':s['xgPerShot']-other['xgPerShot'] if s['xgPerShot'] is not None and other['xgPerShot'] is not None else None,'differenceInterval':difference_interval(data['shots'],all_matches['England' if key=='england' else 'World_Cup'],route) if s['sufficient'] and other['sufficient'] else None}
        ds=[v['difference'] for v in per.values()];supported=all(v['route']['sufficient'] and v['otherRoutes']['sufficient'] for v in per.values())
        intervals=[v['differenceInterval'] for v in per.values()];interval_direction_repeats=supported and all(i and i[0]>0 for i in intervals) or supported and all(i and i[1]<0 for i in intervals)
        findings.append({'route':route,'datasets':per,'sameDirection':supported and all(x is not None for x in ds) and ds[0]*ds[1]>0,'intervalDirectionRepeats':interval_direction_repeats,'interpretation':'Exploratory association in this model; no causal effect or significance claim. Model-training uncertainty is not included in bootstrap intervals.'})
    write(output/'model.json',artifact);write(output/'validation.json',{'version':VERSION,'evaluation':reports,'findings':findings,'method':'2000 whole-match bootstrap replicates, percentile intervals, seed 42. Held-out competitions were not used for tuning.'});write(output/'parity.json',parity)
    audit={'version':VERSION,'sources':SOURCES,'attribution':'Pappalardo et al. (2019), A public data set of spatio-temporal match events in soccer competitions, Scientific Data 6, 236. Event data collected by Wyscout. CC BY 4.0. doi:10.1038/s41597-019-0247-7','pitchAssumption':'105 x 68 metres; original coordinates 0–100, attacking left to right.','exclusions':exclusions,'coverage':{k:{'matches':len(all_matches[k]),'includedShots':len(v),'includedGoals':sum(r['goal'] for r in v),'unknownBody':sum(r['body']=='unknown' for r in v)} for k,v in all_rows.items()},'developmentMatchIds':sorted(dev_ids),'evaluationMatchIds':{k:[m['wyId'] for m in all_matches[k]] for k in ['England','World_Cup']},'featurePolicy':'Only distance, angle and body part. No outcome, destination, assist/key-pass, identity or pass-route inputs.','routePolicy':'Nearest accurate same-team pass within 10 seconds in same period; no intervening opponent event or stoppage. Cross > through tag 901 > other pass > no linked pass. Association, not verified assist.','exclusionPolicy':'Only eventId 10, periods 1H/2H, finite coordinates in [0,100]. Free-kick shot and penalty subevents are separately counted as excluded. Extra time, shootouts and own goals not recorded as Shot goals are outside this target.','intervalPolicy':'2000 deterministic whole-match resamples; zero-shot matches included in exposure. Comparisons require >=30 shots and >=5 shot-containing matches.','packages':{'numpy':np.__version__,'scikit-learn':__import__('sklearn').__version__}}
    write(output/'provenance.json',audit)
    (output/'LICENSE.txt').write_text('Published match events and metadata: Pappalardo et al. (2019), collected by Wyscout. CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Source: https://figshare.com/collections/Soccer_match_event_dataset/4415000 . Touchline extracts and classifies regular-time shots, computes geometry, and adds its own model estimates. Attribution and transformations: provenance.json. Application source code retains the repository MIT license. These historical data and model estimates are not official current football records.\n',encoding='utf8')
    print(json.dumps({'output':str(output),'evaluation':reports,'findings':[{'route':x['route'],'sameDirection':x['sameDirection']} for x in findings]},indent=2),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'dist/analytics-data'));args=parser.parse_args();build(Path(args.output))
