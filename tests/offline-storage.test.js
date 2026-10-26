import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineRetention,workerCacheName} from '../dist/offline-storage.js';
const build=(name,preparedAt,complete=true)=>({name:'touchline-static-'+name,preparedAt,complete});
test('offline retention preserves active build and recorded rollback, not a newer incomplete download',()=>{
 const builds=[build('old',1),build('rollback',2),build('active',3),build('interrupted',4,false),{name:'unrelated',complete:true,preparedAt:10}];const r=offlineRetention(builds,'touchline-static-active',{previous:'touchline-static-rollback'});assert.deepEqual(r.keep,['touchline-static-rollback','touchline-static-active']);assert.deepEqual(r.remove,['touchline-static-old','touchline-static-interrupted']);
});
test('waiting and installing builds are protected while history stays bounded',()=>{
 const builds=[build('old',1),build('rollback',2),build('active',3),build('waiting',4),build('installing',5,false)];const r=offlineRetention(builds,'touchline-static-active',{previous:'touchline-static-rollback',protectedNames:['touchline-static-waiting','touchline-static-installing']});assert.deepEqual(r.remove,['touchline-static-old']);assert.equal(r.keep.length,4);
});
test('other windows prevent cleanup and unknown histories keep one complete fallback',()=>{
 const builds=[build('old',1),build('new',2),build('active',3)];for(const windows of [0,2,3])assert.deepEqual(offlineRetention(builds,'touchline-static-active',{windows}).remove,[]);assert.deepEqual(offlineRetention(builds,'touchline-static-active').remove,['touchline-static-old']);
});
test('worker cache identity accepts only explicitly versioned build URLs',()=>{
 assert.equal(workerCacheName('http://localhost/service-worker.js?build=3.11.0-preview.1&id=0123456789abcdef0123'),'touchline-static-3.11.0-preview.1-0123456789abcdef0123');for(const url of [undefined,'invalid','https://host/service-worker.js','https://host/service-worker.js?build=../../bad&id=abc'])assert.equal(workerCacheName(url),null);
});
