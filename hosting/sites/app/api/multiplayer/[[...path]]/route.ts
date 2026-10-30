import {env} from 'cloudflare:workers';
import {handleRoomRequest} from '../../../../lib/room-api.js';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handleRoomRequest(request,env.DB);
export const POST=GET;
