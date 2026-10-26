import {escapeHtml as esc} from './ui-kit.js';

// A read-only view of the most recent user fixture. No inferred match ratings or tactics.
export function latestClubMatch(c){
 const index=c.results.findLastIndex(m=>m.home===c.user||m.away===c.user);if(index<0)return null;
 const match=c.results[index],side=match.home===c.user?0:1,other=1-side;
 return {match,index,side,opponent:c.teams.find(t=>t.id===(side?match.home:match.away))?.name||'Opponent',score:[match.score[side],match.score[other]],physical:match.engineVersion==='2.0.0'&&!!match.definition};
}
export function campaignRecap(c){
 const latest=latestClubMatch(c);if(!latest)return '';
 const {match:m,index,side,opponent,score,physical}=latest,other=1-side,name=id=>c.teams.find(t=>t.id===id)?.name||id,players=m.playerStats?.[side]?.filter(p=>p.minutes>0)||[],numbers=(values,label)=>Array.isArray(values)&&values.length===2&&values.every(Number.isFinite)?`<div><span>${esc(label)}</span><b>${values[side]} <small>— ${values[other]}</small></b></div>`:'';
 const stage=m.stage==='league'?(Number.isInteger(m.round)?'Matchday '+m.round:'League match'):m.stage||'Fixture';
 const outcome=score[0]>score[1]?'Win':score[0]<score[1]?'Loss':'Draw',penSide=m.penaltyHome?(m.penaltyHome===c.user?0:1):side;
 return `<section class="card campaign-recap" aria-label="Latest match report"><header><div><span class="eyebrow">LATEST MATCH · ${esc(stage)}</span><h2>${score.join(' – ')} <span>vs ${esc(opponent)}</span></h2><p>${outcome} · ${side?'Away':'Home'}${m.leg&&m.stage!=='league'&&m.stage!=='Final'&&c.format!=='clubcup'?' · leg '+m.leg:''}${m.pens?' · penalties '+[m.pens[penSide],m.pens[1-penSide]].join('–'):''}</p></div>${physical?`<button class="btn secondary" data-action="eu-watch-fixture" data-value="${index}">Replay this match</button>`:''}</header>
 ${m.tieWinner?`<p class="campaign-qualification">Tie winner: ${esc(name(m.tieWinner))}</p>`:m.pens&&m.winner?`<p class="campaign-qualification">Shootout winner: ${esc(name(m.winner))}</p>`:''}
 ${physical?`<div class="recap-metrics">${numbers(m.shots,'Shots · your team / opponent')}${numbers(m.stats?.completed,'Completed passes · your team / opponent')}${numbers(m.stats?.recoveries,'Recoveries · your team / opponent')}</div>${players.length?`<details><summary>Recorded player contributions · ${players.length} players</summary><div class="recap-table-scroll" tabindex="0" role="region" aria-label="Player contributions table"><table><caption>Actions recorded in this match</caption><thead><tr>${['Player','Minutes','Goals','Shots','Saves','Recoveries'].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${players.map(p=>`<tr><th scope="row">${esc(p.name)}</th>${['minutes','goals','shots','saves','recoveries'].map(k=>`<td>${Number.isFinite(p[k])?p[k]:'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>Recorded actions only. Player attributes are not match-performance ratings.</p></details>`:'<p>Detailed player contributions are unavailable in this older record.</p>'}`:'<p>Statistical result. This match has no recorded player actions or physical replay.</p>'}</section>`;
}
