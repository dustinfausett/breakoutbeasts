import {mkdir,open,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {decodeCheckpoint} from '../shared/checkpoints.js';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const shortCheckpointCode=code=>typeof code==='string'&&/^[A-HJ-NP-Z2-9]{10}$/.test(code.toUpperCase());
export function checkpointStore(directory){
 return {async put(backup){decodeCheckpoint(backup);await mkdir(directory,{recursive:true});for(let attempt=0;attempt<8;attempt++){const code=[...randomBytes(10)].map(n=>ALPHABET[n%32]).join(''),file=path.join(directory,code+'.save');let handle;try{handle=await open(file,'wx',0o600);}catch(e){if(e.code==='EEXIST')continue;throw e;}try{await handle.writeFile(backup,'utf8');await handle.sync();}catch(e){await unlink(file).catch(()=>{});throw e;}finally{await handle.close();}return code;}throw new Error('Could not allocate a progress code.');},async get(raw){const code=String(raw||'').toUpperCase();if(!shortCheckpointCode(code))throw new Error('Enter the complete ten-character progress code.');const file=path.join(directory,code+'.save');let backup;try{backup=await readFile(file,'utf8');}catch{throw new Error('Progress code not found. Check the code or load your downloaded backup.');}decodeCheckpoint(backup);return backup;}};
}
