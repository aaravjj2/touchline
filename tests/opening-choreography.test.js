import test from 'node:test';
import assert from 'node:assert/strict';
import {openingChoreography,OPENING_DURATION} from '../dist/opening-choreography.js';

test('opening montage orders ball control, a contact-timed shot and celebration deterministically',()=>{
 const times=[1,2.8,3.3,3.5,4,5.5,7.5,9],phases=times.map(t=>openingChoreography(t).phase);assert.deepEqual(phases,['dribble','receive','wind-up','shoot','follow-through','celebrate','settle','idle']);assert.equal(openingChoreography(3.409).ball.kind,'foot');assert.equal(openingChoreography(3.41).ball.kind,'flight');assert.ok(Math.abs(openingChoreography(3.41).motion.time-.21)<1e-9);for(const t of times)assert.deepEqual(openingChoreography(t),openingChoreography(t+OPENING_DURATION));
});
test('reduced-motion samples stay static; looping fades rather than exposing a position jump',()=>{
 assert.deepEqual(openingChoreography(1,{still:true}),openingChoreography(500,{still:true}));assert.equal(openingChoreography(100,{still:true}).phase,'idle');assert.equal(openingChoreography(0).opacity,0);assert.ok(openingChoreography(11.99).opacity<.03);assert.equal(openingChoreography(12).opacity,0);
 for(let t=0;t<120;t+=.1){const sample=openingChoreography(t);assert.ok(sample.position.every(Number.isFinite));assert.ok(sample.opacity>=0&&sample.opacity<=1);}
});
