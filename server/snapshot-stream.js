import {SnapshotEncoder} from '../shared/snapshot-wire.js';
// Do not enqueue obsolete world frames on a slow connection. Keep events and map updates
// until the latest frame can be sent; encoding advances only for frames actually sent.
export class SnapshotStream{
 constructor(ws,scene){this.ws=ws;this.scene=scene;this.encoder=new SnapshotEncoder();this.pending=null;}
 sceneFor(msg){return msg.me?.city?.location||msg.pl?.find(p=>p.act)?.location||this.scene();}
 send(msg){
  if(this.ws.readyState!==1)return;
  if(['end','paused'].includes(msg.t)&&this.pending){const latest=this.pending;this.pending=null;this.ws.send(JSON.stringify(this.encoder.encode(latest,this.sceneFor(latest))));}
  if(msg.t==='start'){this.pending=null;this.encoder.reset();}
  if(msg.t==='snap'){
   if(this.pending){const old=this.pending;msg={...msg,ev:[...(old.ev||[]),...(msg.ev||[])]};for(const k of ['defs','dv','tm','tv'])if(msg[k]===undefined&&old[k]!==undefined)msg[k]=old[k];}
   if(this.ws.bufferedAmount>256*1024){this.pending=msg;if(this.ws.bufferedAmount>4*1024*1024||(msg.ev?.length||0)>2000)this.ws.close(1013,'Slow connection; reconnecting');return;}
   this.pending=null;
  }
  this.ws.send(JSON.stringify(this.encoder.encode(msg,this.sceneFor(msg))));
 }
}
