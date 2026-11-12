// Portable, versioned cooperative checkpoints. Codes contain only bounded data;
// they need no account, external database, server memory, or secret credentials.
import {ANIMAL_IDS} from './animals.js';
import {CLOTHES} from './wardrobe.js';
import {TOOLS} from './hardware.js';
import {RESCUE_SPECIES} from './rescue-data.js';
import {enterCityAnimal} from './city-movement.js';
export const MAX_SAVE_CODE=3200;
const slots=['shirt','hat','pants'];
const stages=['zoo','control','parking','driving','city'];
const scenes=['street','bank','hardware','thrift','control','zoo','zooUpper','zooPavilion','zooControl','petstore','airport'];
const cageIds=[...RESCUE_SPECIES,'control-dog','control-cat','control-rabbit'];
const integer=(v,max,min=0)=>Number.isInteger(v)&&v>=min&&v<=max;
const maskClothes=p=>(p.owned||[]).reduce((mask,id)=>{const c=CLOTHES.find(c=>c.id===id);return c?mask|(1<<(slots.indexOf(c.slot)*3+c.style)):mask;},0);
const maskTools=p=>(p.tools||[]).reduce((mask,id)=>{const i=TOOLS.findIndex(t=>t.id===id);return i<0?mask:mask|(1<<i);},0);
function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(36);}
function valid(d){
 if(!d||d.v!==1||!stages.includes(d.stage)||!integer(d.cash,10000000)||!Array.isArray(d.members)||(d.members.length<1||d.members.length>10)||!Array.isArray(d.tools)||d.tools.length!==4||!d.tools.every(n=>integer(n,80)))return false;
 const used=new Set();for(const p of d.members){if(!p||!integer(p.a,9)||used.has(p.a)||!integer(p.o,511)||!integer(p.t,15)||!Array.isArray(p.e)||p.e.length!==3||!p.e.every((s,i)=>integer(s,2,-1)&&(s<0||(p.o&(1<<(i*3+s))))))return false;used.add(p.a);}
 if(d.stage!=='city')return d.city==null&&(!['zoo','control'].includes(d.stage)||(d.moon&&integer(d.moon.free,1023)&&integer(d.moon.fuses,1023)&&typeof d.moon.power==='boolean'));
 const c=d.city;return !!c&&scenes.includes(c.scene)&&integer(c.released,(1<<19)-1)&&typeof c.power==='boolean'&&typeof c.signal==='boolean'&&(!c.signal||c.power)&&typeof c.vault==='boolean'&&integer(c.cash,12000)&&Array.isArray(c.visited)&&c.visited.length<=10&&c.visited.every(n=>integer(n,9))&&Array.isArray(c.bank)&&c.bank.length<=14&&c.bank.every(n=>Array.isArray(n)&&n.length===2&&integer(n[0],1000)&&typeof n[1]==='boolean');
}
export function encodeCheckpoint(data){if(!valid(data))throw new Error('This checkpoint cannot be saved.');const text=JSON.stringify(data),payload=btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');const code='BB1.'+payload+'.'+checksum(payload);if(code.length>MAX_SAVE_CODE)throw new Error('This checkpoint is too large.');return code;}
export function decodeCheckpoint(raw){
 if(typeof raw!=='string'||raw.length>MAX_SAVE_CODE*2)throw new Error('That progress code is too long.');const code=raw.replace(/\s/g,'');if(code.length>MAX_SAVE_CODE)throw new Error('That progress code is too long.');const parts=code.split('.');
 if(parts.length!==3||parts[0]!=='BB1'||!/^[A-Za-z0-9_-]+$/.test(parts[1])||parts[2]!==checksum(parts[1]))throw new Error('Progress code not recognized. Copy the complete BB1 code.');
 let data;try{data=JSON.parse(atob(parts[1].replaceAll('-','+').replaceAll('_','/')));}catch{throw new Error('This progress code is damaged. Copy it again.');}if(!valid(data))throw new Error('This progress code is not supported.');return data;
}
export function captureCheckpoint(g,hostId){
 const crew=g.activePlayers();if(!crew.length)throw new Error('Return to the lobby and choose a crew before saving.');const members=new Map((g.checkpointWardrobe||[]).map(p=>[p.a,{...p,t:0}])),tools=[...(g.checkpointSpareTools||[0,0,0,0])];
 for(const p of crew){members.set(ANIMAL_IDS.indexOf(p.animal),{a:ANIMAL_IDS.indexOf(p.animal),o:maskClothes(p),e:slots.map(slot=>CLOTHES.find(c=>c.id===p.outfit?.[slot])?.style??-1),t:maskTools(p)});for(const id of p.tools||[]){const i=TOOLS.findIndex(t=>t.id===id);if(i>=0)tools[i]++;}}
 let stage=g.zooId==='city'?'city':g.zooId==='parking'?(g.phase==='complete'?'city':g.vehicle.unlocked?'driving':'parking'):g.phase==='complete'?'parking':g.keysActive()?'control':'zoo';
 const data={v:1,stage,cash:crew.reduce((sum,p)=>sum+(p.money||0),0),members:[...members.values()],tools};
 if(['zoo','control'].includes(stage)){data.moon={free:[...crew.filter(p=>p.escaped).map(p=>p.animal),...g.npcs.filter(n=>n.state!=='caged').map(n=>n.animal)].reduce((mask,a)=>mask|(1<<ANIMAL_IDS.indexOf(a)),0),fuses:g.parts.filter(pt=>pt.inserted).reduce((mask,pt)=>{const p=g.players.get(pt.pid);return p?mask|(1<<ANIMAL_IDS.indexOf(p.animal)):mask;},0),power:g.powerDone()};}
 if(stage==='city'){
  const host=crew.find(p=>p.id===hostId)||crew[0],r=g.rescue;
  data.city={scene:r?(host.inVehicle?'street':host.inPlane?'airport':host.caged||host.capturedT>0?(host.cageDistrict==='rescue'?'zoo':'street'):host.location||'street'):'street',released:r?r.animals.reduce((mask,a)=>a.state==='caged'?mask:mask|(1<<cageIds.indexOf(a.id)),0):0,power:!!r&&crew.every(p=>r.inserted.has(p.id)),signal:!!r?.signal,vault:!!g.gate('city-vault')?.state,cash:g.vaultCash??12000,visited:[...(g.visited||[])].map(id=>g.zoo.destinations.findIndex(d=>d.id===id)).filter(i=>i>=0),bank:(g.humans||[]).filter(n=>n.scene==='bank').map(n=>[n.wallet,!!n.picked])};
 }
 return data;
}
export function checkpointSummary(d){const names={zoo:'Moonleaf Zoo — enclosure checkpoint',control:'Moonleaf Zoo — control house',parking:'Parking lot — find the getaway car',driving:'Parking lot — getaway car unlocked',city:'Breakout City'};if(d.stage!=='city')return names[d.stage];const freed=cageIds.filter((_,i)=>d.city.released&(1<<i)).length;return `Breakout City · ${({street:'city streets',bank:'Cedar Bank',hardware:'Beaver Hardware',thrift:'Second Paw Thrift',control:'Animal Control',zoo:'Northgate Zoo',zooUpper:'upper terrace',zooPavilion:'bird house',zooControl:'signal house',petstore:'pet store',airport:'Wildwing Airport'})[d.city.scene]} · ${freed}/19 animals released${d.city.power?' · power restored':''}${d.city.signal?' · signal house complete':''}`;}
export function applyCheckpoint(g,d){
 const crew=g.activePlayers(),used=new Set(),counts=[...d.tools];g.checkpointWardrobe=d.members.map(p=>({a:p.a,o:p.o,e:[...p.e],t:0}));
 const chosen=new Map();for(const p of crew){const record=d.members.find(m=>m.a===ANIMAL_IDS.indexOf(p.animal));if(record){chosen.set(p.id,record);used.add(record.a);}}
 for(const p of crew)if(!chosen.has(p.id)){const record=d.members.find(m=>!used.has(m.a));if(record){chosen.set(p.id,record);used.add(record.a);}}
 for(const [i,p] of crew.entries()){
  const m=chosen.get(p.id);p.money=Math.floor(d.cash/crew.length)+(i<d.cash%crew.length?1:0);p.tools=[];p.owned=[];p.outfit={};
  if(m){for(let bit=0;bit<9;bit++)if(m.o&(1<<bit))p.owned.push(`${p.animal}-${slots[Math.floor(bit/3)]}-${bit%3}`);m.e.forEach((style,i)=>{if(style>=0)p.outfit[slots[i]]=`${p.animal}-${slots[i]}-${style}`;});TOOLS.forEach((t,j)=>{if((m.t&(1<<j))&&counts[j]>0){p.tools.push(t.id);counts[j]--;}});}
 }
 TOOLS.forEach((tool,j)=>{while(counts[j]>0){const next=crew.filter(p=>!p.tools.includes(tool.id)).sort((a,b)=>a.tools.length-b.tools.length)[0];if(!next)break;next.tools.push(tool.id);counts[j]--;}});g.checkpointSpareTools=counts;
 if(['zoo','control'].includes(d.stage)){
  for(const enc of g.zoo.enclosures)if(d.moon.free&(1<<ANIMAL_IDS.indexOf(enc.animal))){g.openGate(g.gate(enc.mainGate));const p=crew.find(p=>p.animal===enc.animal);if(p){const [x,y]=g.gate(enc.mainGate).tiles[0];p.escaped=true;p.x=x+.5;p.y=y+(enc.front==='up'?-.5:1.5);p.safe=[p.x,p.y];}}
  for(const p of crew){const old=chosen.get(p.id),done=d.moon.power||(old&&(d.moon.fuses&(1<<old.a)));if(done){const part=g.parts.find(pt=>pt.pid===p.id);if(part){part.inserted=true;const socket=g.objects.find(o=>o.kind==='socket'&&o.index===part.index);if(socket)socket.state=1;}}}
  g.drainEvents();g.rebuildBlock();
 }
 if(d.stage!=='city')return;
 const c=d.city;g.vaultCash=c.cash;if(c.vault)g.openGate(g.gate('city-vault'));g.visited=new Set(c.visited.map(i=>g.zoo.destinations[i]?.id).filter(Boolean));
 for(const [i,n] of g.humans.filter(n=>n.scene==='bank').entries())if(c.bank[i]){n.wallet=c.bank[i][0];n.picked=c.bank[i][1];}
 if(c.power){for(const p of crew){g.rescue.fuses.add(p.id);g.rescue.inserted.add(p.id);const o=g.obj('rescue-fuse-'+g.order.indexOf(p.id));if(o)o.state=1;}g.obj('rescue-generator').state=crew.length;}
 g.rescue.signal=c.signal;if(c.signal)g.rescue.panelPhase='complete';
 for(const a of g.rescue.animals)if(c.released&(1<<cageIds.indexOf(a.id))){g.openGate(g.gate(a.gate));g.obj('release-'+a.id).state=1;for(const o of g.objects)if(o.kind==='rescueTeam'&&o.cage===a.id)o.state=1;a.state='running';enterCityAnimal(g,a);}
 if(c.scene!=='street')for(const p of crew){p.inVehicle=false;p.vehicleId=null;g._enter(p,c.scene);}
 g.drainEvents();g.rebuildBlock();
}
