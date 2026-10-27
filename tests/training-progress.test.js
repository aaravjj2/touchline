import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProgress,recordPractice,nextPractice,trainingProgressKey,readPractice,savePractice} from '../dist/training-progress.js';
test('confirmed successes advance practice independently, including skills completed out of order',()=>{
 const original=normalizeProgress(null),miss=recordPractice(original,'passing',false);
 assert.equal(nextPractice(miss),'passing');assert.equal(miss.skills.passing.attempts,1);assert.equal(original.skills.passing.attempts,0);
 let progress=recordPractice(miss,'passing',true);assert.equal(nextPractice(progress),'shooting');
 progress=recordPractice(progress,'defending',true);assert.equal(nextPractice(progress),'shooting');
 progress=recordPractice(progress,'shooting',true);assert.equal(nextPractice(progress),null);
 assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress))),progress);
 assert.throws(()=>recordPractice(progress,'unknown',true));assert.throws(()=>recordPractice(progress,'passing','true'));
});
test('malformed and unavailable practice storage preserves career data and permits session progress',()=>{
 const entries=new Map([['career','untouched']]),storage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)},key=trainingProgressKey(true);
 assert.notEqual(key,trainingProgressKey(false));entries.set(key,'broken');assert.deepEqual(readPractice(storage,key),normalizeProgress(null));
 const progress=recordPractice(null,'shooting',true);assert.equal(savePractice(storage,key,progress),true);assert.deepEqual(readPractice(storage,key),progress);assert.equal(entries.get('career'),'untouched');
 const unavailable={getItem(){throw Error('Blocked');},setItem(){throw Error('Full');}};
 assert.deepEqual(readPractice(unavailable,key),normalizeProgress(null));assert.equal(savePractice(unavailable,key,progress),false);
 assert.deepEqual(normalizeProgress({version:1,skills:{passing:{attempts:2,completed:9}}}).skills.passing,{attempts:2,completed:2});
 assert.deepEqual(normalizeProgress({version:99,skills:progress.skills}),normalizeProgress(null));
});
