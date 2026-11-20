// Optional transport encoding. The simulation and decoded browser snapshots stay unchanged.
const stable=['g','os','cr','bu','pd','broken','waiting','obj','rescue'];
const rounded=n=>Math.round(n*100)/100;
const humanRow=h=>[h.id,rounded(h.x),rounded(h.y),rounded(h.d),+h.asleep|(+h.visitor<<1)|(+h.moving<<2)|(+h.running<<3)|(+h.calling<<4)|(+h.empty<<5),h.color,h.scene||'street'];
const human=row=>({id:row[0],x:row[1],y:row[2],d:row[3],asleep:!!(row[4]&1),visitor:!!(row[4]&2),moving:!!(row[4]&4),running:!!(row[4]&8),calling:!!(row[4]&16),empty:!!(row[4]&32),color:row[5],scene:row[6]});
export class SnapshotEncoder{
 constructor(){this.reset();}
 reset(){this.previous={};this.people=[];this.humansSeen=false;this.personal={};}
 encode(msg,scene='street'){
  if(msg.t==='start'){this.reset();return msg;}if(msg.t!=='snap')return msg;
  const out={...msg,wire:1};
  for(const key of stable){const text=JSON.stringify(msg[key]);if(this.previous[key]===text)delete out[key];else this.previous[key]=text;}
  const next=msg.me||null;if(next){const patch={},removed=Object.keys(this.personal).filter(k=>!Object.hasOwn(next,k));for(const [key,value]of Object.entries(next)){const text=JSON.stringify(value);if(this.personal[key]!==text){patch[key]=value;this.personal[key]=text;}}for(const key of removed)delete this.personal[key];delete out.me;out.m=patch;if(removed.length)out.mr=removed;}else this.personal={};
  if(msg.humans){const rows=msg.humans.filter(h=>(h.scene||'street')===scene).map(humanRow),reset=!this.humansSeen||rows.length!==this.people.length||rows.some((r,i)=>r[0]!==this.people[i]?.[0]);
   if(reset)out.h={r:rows};else{const changes=[];for(let i=0;i<rows.length;i++){const r=rows[i],old=this.people[i];if(r.some((v,j)=>v!==old[j]))changes.push([i,...r.slice(1)]);}if(changes.length)out.h={d:changes};}
   this.people=rows;this.humansSeen=true;delete out.humans;
  }
  return out;
 }
}
export class SnapshotDecoder{
 constructor(){this.reset();}
 reset(){this.previous=null;this.people=[];}
 decode(msg){
  if(msg.t==='start'){this.reset();return msg;}if(msg.t!=='snap'||msg.wire!==1)return msg;
  const out={...this.previous,...msg};delete out.wire;delete out.h;delete out.m;delete out.mr;for(const key of ['tm','tv','defs','dv'])if(!Object.hasOwn(msg,key))delete out[key];
  if(msg.m){out.me={...this.previous?.me,...msg.m};for(const key of msg.mr||[])delete out.me[key];}
  if(msg.h?.r)this.people=msg.h.r.map(human);else if(msg.h?.d){const next=this.people.slice();for(const [i,...r]of msg.h.d)next[i]=human([next[i].id,...r]);this.people=next;}
  if(msg.h||this.previous?.humans)out.humans=this.people;
  this.previous=out;return out;
 }
}
