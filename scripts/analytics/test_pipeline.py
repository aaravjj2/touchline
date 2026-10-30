import unittest, math, json, zipfile
from pathlib import Path
import numpy as np
from build import geometry,bodypart,eligible,route_for,extract,summarize,features,predict,ROOT

def event(id=1,**kw):
    return {'id':id,'matchId':9,'teamId':1,'eventId':10,'subEventId':100,'matchPeriod':'1H','eventSec':20,'positions':[{'x':90,'y':50}],'tags':[],**kw}

class PipelineRules(unittest.TestCase):
    def test_geometry_and_invalid_locations(self):
        d,a=geometry(90,50);self.assertAlmostEqual(d,10.5);self.assertAlmostEqual(a,2*math.atan(3.66/10.5))
        self.assertEqual(geometry(90,30),geometry(90,70))
        for xy in [(-1,50),(101,50),(30,float('nan')),(None,30)]:
            with self.assertRaises((ValueError,TypeError)):geometry(*xy)
    def test_body_mapping_preserves_head_body_and_unknown(self):
        self.assertEqual([bodypart(set(x)) for x in [[401],[402],[403],[],[401,403]]],['left','right','head_body','unknown','unknown'])
    def test_exclusions_and_goals(self):
        self.assertTrue(eligible(event())[0]);self.assertFalse(eligible(event(eventId=3,subEventId=35))[0]);self.assertFalse(eligible(event(matchPeriod='E1'))[0]);self.assertFalse(eligible(event(positions=[]))[0]);self.assertFalse(eligible(event(positions=[{'x':101,'y':0}]))[0])
        shots,counts=extract([event(tags=[{'id':101}]),event(2,eventId=3,subEventId=33),event(3,eventId=3,subEventId=35),event(4,matchPeriod='P')],[{'wyId':9}],'fixture')
        self.assertEqual(shots[0]['goal'],1);self.assertEqual(counts,{'direct_free_kick':1,'penalty':1,'extra_time_or_shootout':1})
    def test_pass_association_boundary_stoppage_opponent_and_priority(self):
        p=event(eventId=8,subEventId=80,eventSec=10,tags=[{'id':1801},{'id':901}]);self.assertEqual(route_for(event(),[p]),'cross')
        p['subEventId']=85;self.assertEqual(route_for(event(),[p]),'through');p['tags']=[{'id':1801}];self.assertEqual(route_for(event(),[p]),'other')
        self.assertEqual(route_for(event(eventSec=20.001),[p]),'none')
        for stop in [event(teamId=2,eventId=1,eventSec=15),event(eventId=5,eventSec=15)]:self.assertEqual(route_for(event(),[p,stop]),'none')
        p['matchPeriod']='2H';self.assertEqual(route_for(event(),[p]),'none')
    def test_zero_shot_exposure_and_sparse_suppression(self):
        ms=[{'wyId':i,'teamsData':{'1':{},'2':{}}} for i in range(6)];r={'match':0,'team':1,'route':'cross','goal':0,'xg':.3}
        a=summarize([r],ms,1,'cross');self.assertEqual(a['teamMatches'],6);self.assertAlmostEqual(a['xgPerTeamMatch'],.05);self.assertFalse(a['sufficient']);self.assertIsNone(a['intervals'])
        b=summarize([r],ms);self.assertEqual(b['teamMatches'],12)
    def test_outcome_and_identity_cannot_change_features(self):
        r={'distance':12.,'angle':.4,'body':'left','goal':0,'team':1,'route':'cross'};s={**r,'goal':1,'team':99,'route':'none','assist':True,'end_location':[100,50]};np.testing.assert_array_equal(features([r]),features([s]))

class PublishedAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=ROOT/'dist/analytics-data';cls.model=json.loads((root/'model.json').read_text());cls.prov=json.loads((root/'provenance.json').read_text());cls.report=json.loads((root/'validation.json').read_text())
    def test_development_and_evaluation_disjoint(self):
        train=set(self.prov['developmentMatchIds']);evaluations=[set(x) for x in self.prov['evaluationMatchIds'].values()];self.assertFalse(train&evaluations[0]);self.assertFalse(train&evaluations[1]);self.assertFalse(evaluations[0]&evaluations[1]);self.assertEqual([len(x) for x in evaluations],[380,64])
        val=[]
        for fold in self.model['training']['folds']:
            self.assertFalse(set(fold['trainMatches'])&set(fold['validationMatches']));self.assertEqual(set(fold['trainMatches'])|set(fold['validationMatches']),train);val+=fold['validationMatches']
        self.assertEqual(set(val),train);self.assertEqual(len(val),len(set(val)))
    def test_fold_preprocessing_uses_only_training_rows(self):
        from build import extract
        ez=zipfile.ZipFile(ROOT/'work/analytics-source/events.zip');mz=zipfile.ZipFile(ROOT/'work/analytics-source/matches.zip');rows=[]
        for l in ['France','Germany','Italy','Spain']:rows+=extract(json.loads(ez.read('events_'+l+'.json')),json.loads(mz.read('matches_'+l+'.json')),l)[0]
        for fold in self.model['training']['folds']:
            ids=set(fold['trainMatches']);X=features([r for r in rows if r['match'] in ids]);np.testing.assert_allclose(X.mean(axis=0),fold['preprocessingMean'],rtol=0,atol=1e-11)
    def test_published_metrics_baseline_and_calibration(self):
        from build import metric_values
        for key in ['england','world-cup']:
            rows=json.loads((ROOT/f'dist/analytics-data/{key}.json').read_text(encoding='utf8'))['shots'];y=np.array([r['goal'] for r in rows]);rep=self.report['evaluation'][key]
            for name in ['constant','distance','full']:
                values=metric_values(y,predict(rows,self.model,name))
                for k,v in values.items():self.assertAlmostEqual(v,rep['models'][name]['metrics'][k],places=12)
                self.assertEqual(sum(b['n'] for b in rep['models'][name]['calibration']),len(rows))
                for interval in rep['models'][name]['intervals'].values():self.assertLessEqual(interval[0],interval[1])

if __name__=='__main__':unittest.main()
