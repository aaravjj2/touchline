import {SUPER_PACKS} from './super-catalog.js';
import {SUPER_DATASET_ID,SUPER_CUTOFF,auditSuperDataset} from './super-dataset.js';
import {SUPER_SOURCE_FACTS} from './super-source-facts.js';
import {positionsFor} from './player-positions.js';
import {REVIEWED_POSITIONS} from './super-reviewed-positions.js';
import {REVIEWED_MEMBERSHIP} from './super-reviewed-membership.js';
// October List A records are candidates, never evidence of August registration.
export function openingCandidate(){return {id:SUPER_DATASET_ID,cutoff:SUPER_CUTOFF,sourceSnapshot:'2026-10-21',clubs:SUPER_PACKS.map(club=>({id:club.id,country:club.country,name:club.club,membership:structuredClone(REVIEWED_MEMBERSHIP[club.id]||null),coverage:null,players:club.players.map(p=>{const fact=SUPER_SOURCE_FACTS[p.id],position=REVIEWED_POSITIONS[p.id];return {...p,positions:[...(position?.positions||positionsFor(p))],...(fact?{birthDate:fact.birthDate}:{}),owner:null,registeredClub:club.id,evidence:{...(fact?{identity:{...fact.evidence},birthDate:{...fact.evidence}}:{}),...(position?{positions:{...position.evidence}}:{})}};} )}))};}
export const SUPER_OPENING_AUDIT=auditSuperDataset(openingCandidate());
