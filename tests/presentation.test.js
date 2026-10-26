import test from 'node:test';
import assert from 'node:assert/strict';
import {playerAppearance,clubPresentation} from '../dist/presentation.js';
import {renderClubPicker} from '../dist/club-picker.js';
import {PACKS} from '../dist/legends.js';
import {portraitArtwork,sectionCard,panelTabs} from '../dist/ui-kit.js';
test('appearance follows player identity across roster slots without mutating match data',()=>{
 const player={id:'test-person',personId:'person-7',name:'A Player',role:'MID'},snapshot=structuredClone(player),a=playerAppearance(player);assert.deepEqual(a,playerAppearance({...player,id:'another-era-card'}));assert.notDeepEqual(a,playerAppearance({...player,personId:'person-8'}));assert.deepEqual(player,snapshot);assert.ok(a.height>.9&&a.height<1.1);assert.equal(clubPresentation({id:'one',color:'url(unsafe)'}).color,'#b6f36a');
});
test('presentation settings validate values and write only to the QA presentation namespace',async()=>{
 const values=new Map(),oldStorage=globalThis.localStorage,oldLocation=globalThis.location;globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};globalThis.location={search:'?qa=1'};
 try{const p=await import('../dist/presentation.js?settings-test');assert.equal(p.presentationPreferences().camera,'broadcast');assert.equal(p.setPresentationPreference('camera','tactical'),true);assert.equal(p.setPresentationPreference('camera','invalid'),false);assert.equal(p.presentationPreferences().camera,'tactical');assert.deepEqual([...values.keys()],['touchline.presentation.qa.v1']);assert.equal(JSON.parse(values.values().next().value).camera,'tactical');}finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});
test('club cards retain catalogue identity, show real squad previews and escape authored labels',()=>{
 const before=JSON.stringify(PACKS),html=renderClubPicker(PACKS,'pack14');assert.ok(html.includes('value="pack14"'));assert.ok(html.includes('Barcelona'));assert.ok(html.includes('2014–15'));assert.ok(html.includes('Historic fantasy career'));assert.equal((html.match(/data-club-search=/g)||[]).length,PACKS.length);assert.equal(JSON.stringify(PACKS),before);assert.ok(sectionCard('<script>','<img>','safe').includes('&lt;script&gt;'));assert.ok(portraitArtwork({id:'test',name:'<script>',color:'red" onload="bad'}).includes('#6d94b8'));assert.ok(panelTabs('test',[{id:'one',name:'First',html:'A'},{id:'two',name:'Second',html:'B'}]).includes('role="tabpanel"'));
});
