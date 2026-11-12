// Authoritative cooperative control-house puzzle. Only a player's own controls and
// an anonymously assigned clue (including their own) are sent in their personal snapshot.
import {stationPanel,routeStationClues,stationInstruction} from './stations.js';

export function initControlRoom(g,attempt=0){
 const panels={};
 for(const [doorIndex,p] of g.activePlayers().entries()){
  panels[p.id]={...stationPanel(g,doorIndex),doorIndex};
 }
 g.controlRoom={phase:'waiting',remaining:180,limit:180,attempt,entered:{},panels,roster:g.activePlayers().map(p=>p.id).join('|')};routeStationClues(g,panels);
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
 const ids=g.activePlayers().map(p=>p.id),target=ids.find(id=>c.panels[id]?.reader===pid&&c.panels[id]?.done<5);
 const panel=c.panels[pid],other=c.panels[target],task=other?.tasks[other.done];let instruction=null;
 if(task){const control=other.controls[task.control];instruction={target,index:other.done,control:task.control,value:task.value,text:stationInstruction(control,task.value)};}

 return {...controlPublic(g),controls:panel.controls,done:panel.done,powered:panel.powered,
  ready:ids.every(id=>g.players.get(id).inControlRoom&&g.players.get(id).connected),instruction};
}

export function enterControlRoom(g,p,door){
 if(!g.keysActive())return g.msg(p,'Restore power and free your animal friends first.');
 const c=g.controlRoom,occupant=g.activePlayers().find(q=>q.id!==p.id&&q.inControlRoom&&c.entered[q.id]===door.index);
 if(occupant)return g.msg(p,`${occupant.name} is already in this room. Choose a free door.`);
 const old=c.panels[p.id]?.doorIndex,other=g.activePlayers().find(q=>q.id!==p.id&&!q.inControlRoom&&c.panels[q.id]?.doorIndex===door.index);
 if(other)c.panels[other.id].doorIndex=old;
 c.panels[p.id].doorIndex=door.index;
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
 if(task.control===msg.control&&task.value===msg.value){panel.done++;routeStationClues(g,c.panels);g.emit({k:'paneltask',pid,name:p.name,done:panel.done});}
}

export function stepControlRoom(g,dt){
 const c=g.controlRoom,players=g.activePlayers();
 const roster=players.map(p=>p.id).join('|');if(c.roster!==roster){c.roster=roster;routeStationClues(g,c.panels);}
 for(const id of Object.keys(c.panels))if(!players.some(p=>p.id===id)){const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===c.entered[id]);if(door)door.state=0;delete c.panels[id];delete c.entered[id];}
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
