// Authoritative cooperative control-house puzzle. Only a player's own controls and
// a clue for another operator are sent in their personal snapshot.
import { ANIMALS } from './animals.js';
const LABELS=['WOBBLY BANANA','MOON SNIFFER','FISH SOCKS','TURNIP ENGINE','SNEEZE VALVE','BISCUIT ORBIT'];
const FLAVOR=['The invisible giraffe demands it.','Human paperwork smells like rain.','Do not wake the emergency cabbage.','The moon has misplaced its trousers.','A very official duck says so.'];

export function initControlRoom(g,attempt=0){
 const panels={};
 for(const [doorIndex,p] of g.activePlayers().entries()){
  const offset=Math.floor(g.rng()*LABELS.length);
  const controls=LABELS.map((_,i)=>({label:LABELS[(i+offset)%LABELS.length],kind:i%2?'lever':'dial',value:0,max:i%2?1:5}));
  const planned=controls.map(()=>0),tasks=[];
  for(let i=0;i<5;i++){
   const control=Math.floor(g.rng()*controls.length),max=controls[control].max;
   const value=(planned[control]+1+Math.floor(g.rng()*max))%(max+1);planned[control]=value;
   tasks.push({control,value,flavor:FLAVOR[Math.floor(g.rng()*FLAVOR.length)]});
  }
  panels[p.id]={doorIndex,controls,tasks,done:0,powered:false};
 }
 g.controlRoom={phase:'waiting',remaining:180,limit:180,attempt,entered:{},panels};
}

export function controlPublic(g){
 const c=g.controlRoom;
 return {phase:c.phase,remaining:Math.max(0,c.remaining),limit:c.limit,attempt:c.attempt,
  team:g.activePlayers().map(p=>({id:p.id,name:p.name,animal:p.animal,doorIndex:c.panels[p.id]?.doorIndex,inside:!!p.inControlRoom,powered:!!c.panels[p.id]?.powered,done:c.panels[p.id]?.done||0})),
  paused:g.activePlayers().some(p=>!p.connected)};
}

export function controlPersonal(g,pid){
 const p=g.players.get(pid),c=g.controlRoom;
 if(!p?.inControlRoom)return null;
 const ids=g.activePlayers().map(p=>p.id),i=ids.indexOf(pid),target=ids[(i+1)%ids.length];
 const panel=c.panels[pid],other=c.panels[target],task=other?.tasks[other.done];
 let instruction=null;
 if(task){
  const control=other.controls[task.control],who=g.players.get(target);
  const value=control.kind==='lever'?(task.value?'UP':'DOWN'):String(task.value);
  instruction={target,index:other.done,control:task.control,value:task.value,
   text:`${ids.length===1?'Rescued friend on the radio says':`Tell ${who.name} (${ANIMALS[who.animal].name})`}: set the ${control.label} ${control.kind} to ${value}. ${task.flavor}`};
 }
 return {...controlPublic(g),controls:panel.controls,done:panel.done,powered:panel.powered,
  ready:ids.every(id=>g.players.get(id).inControlRoom&&g.players.get(id).connected),instruction};
}

export function enterControlRoom(g,p,door){
 if(!g.keysActive())return g.msg(p,'Restore power and free your animal friends first.');
 const order=g.controlRoom.panels[p.id]?.doorIndex;
 if(door.index!==order)return g.msg(p,`This door belongs to ${g.activePlayers().find(q=>g.controlRoom.panels[q.id]?.doorIndex===door.index)?.name||'another operator'}. Find your own entrance.`);
 if(g.controlRoom.phase==='complete')return;
 p.inControlRoom=true;p.hold=null;p.hidden=false;p.x=67.5;p.y=28.5;
 g.controlRoom.entered[p.id]=door.index;door.state=1;
}

export function controlAction(g,pid,msg){
 const p=g.players.get(pid),c=g.controlRoom,panel=c.panels[pid];
 if(!p?.active||!p.connected||!p.inControlRoom||!panel||p.capturedT>0)return;
 if(msg.op==='leave'&&c.phase==='waiting'){
  const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===c.entered[pid]);
  p.inControlRoom=false;delete c.entered[pid];if(door){door.state=0;p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;}return;
 }
 if(g.activePlayers().some(q=>!q.connected))return;
 if(msg.op==='power'&&c.phase==='arming')panel.powered=true;
 if(msg.op!=='set'||c.phase!=='running'||!panel.powered||panel.done>=5)return;
 if(!Number.isInteger(msg.control)||!Number.isInteger(msg.value))return;
 const control=panel.controls[msg.control];
 if(!control||msg.value<0||msg.value>control.max)return;
 control.value=msg.value;
 const task=panel.tasks[panel.done];
 if(task.control===msg.control&&task.value===msg.value){panel.done++;g.emit({k:'paneltask',pid,name:p.name,done:panel.done});}
}

export function stepControlRoom(g,dt){
 const c=g.controlRoom,players=g.activePlayers();
 for(const id of Object.keys(c.panels))if(!players.some(p=>p.id===id)){delete c.panels[id];delete c.entered[id];}
 if(!players.length||c.phase==='complete'||players.some(p=>!p.connected))return;
 if(c.phase==='waiting'&&players.every(p=>p.inControlRoom)){c.phase='arming';g.emit({k:'panelready'});}
 if(c.phase==='arming'&&players.every(p=>c.panels[p.id]?.powered))c.phase='running';
 if(c.phase!=='arming'&&c.phase!=='running')return;
 c.remaining-=dt;
 if(c.remaining<=0){
  const attempt=c.attempt+1;
  for(const p of players){p.inControlRoom=false;g._capture(g.staff[0]||{},p);}
  for(const o of g.objects)if(o.kind==='controlDoor')o.state=0;
  initControlRoom(g,attempt);g.emit({k:'panelraid'});return;
 }
 if(c.phase==='running'&&players.every(p=>c.panels[p.id]?.done>=5)){
  c.phase='complete';g.openGate(g.gate(g.zoo.exitGate));
  for(const p of players){
   const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===c.entered[p.id]);
   p.inControlRoom=false;p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;p.grace=3;
  }
  g.emit({k:'exitOpen'});
 }
}
