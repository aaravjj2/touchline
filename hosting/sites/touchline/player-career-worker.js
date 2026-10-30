import {advancePlayerYear} from './annual-career.js';
import {advancePlayerWeek} from './player-career-core.js';
self.onmessage=({data})=>{try{const c=data.career;if(data.mode==='annual')advancePlayerYear(c);else for(let i=0;i<Math.min(4,data.count)&&c.week<38;i++)advancePlayerWeek(c);self.postMessage({career:c});}catch(error){self.postMessage({error:error.message});}};
