import {dist,lineOfSight} from './util.js';
import {DIRS,staffCanEnter} from './tiles.js';
import {HALF} from './physics.js';
const scene=p=>p.location||p.scene||'street';
const asleep=(g,s)=>s.permanentDown||s.downUntil>g.time;
function eligible(p){return p.active&&p.connected&&!p.muzzled&&!p.caged&&p.capturedT<=0&&!p.inVehicle&&!p.inPlane&&!p.inControlRoom&&p.chapterStation==null&&!p.shopping&&!p.arcade&&p.prisonGame==null&&!p.digChoice&&!p.shell&&!p.under&&!p.hop&&!p.slide&&!(p.flinch>0)&&!p.hold;}
export function stopDragging(g,p){const s=g.staff.find(s=>s.id===p.dragging);if(s?.draggedBy===p.id)s.draggedBy=null;p.dragging=null;p.dragLength=0;}
function ownsDrag(g,p,s){return !!s&&s.draggedBy===p.id&&asleep(g,s)&&!s.inCar&&scene(p)===scene(s)&&eligible(p)&&p.input.b&&dist(p.x,p.y,s.x,s.y)<2.1;}
// Freeze the deadline before advancing the clock, including on the final sleepy tick.
export function pauseDraggedStaff(g,dt){
 for(const p of g.players.values())if(p.dragging!=null){const s=g.staff.find(s=>s.id===p.dragging);if(!ownsDrag(g,p,s)){stopDragging(g,p);continue;}if(!s.permanentDown)s.downUntil+=dt;s.state='unconscious';s.path=null;s.target=null;}
 for(const s of g.staff)if(s.draggedBy&&!g.players.get(s.draggedBy)?.active)s.draggedBy=null;
}
export function grabSleepingStaff(g,p){
 if(p.dragging!=null){p.running=false;p.sprintT=0;return true;}if(!eligible(p)||!p.input.b)return false;
 const [dx,dy]=DIRS[p.face];
 const s=g.staff.filter(s=>asleep(g,s)&&!s.inCar&&!s.draggedBy&&scene(p)===scene(s)&&dist(p.x,p.y,s.x,s.y)<1.75&&(s.x-p.x)*dx+(s.y-p.y)*dy>-.35&&lineOfSight(p.x,p.y,s.x,s.y,(x,y)=>g.visionBlocked(x,y))).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0];
 if(!s)return false;p.dragging=s.id;p.dragLength=Math.max(.65,dist(p.x,p.y,s.x,s.y));s.draggedBy=p.id;p.running=false;p.sprintT=0;p.hold=null;s.state='unconscious';s.path=null;s.target=null;return true;
}
function bodyFits(g,s,x,y){
 const room=g.zoo.interiors?.[scene(s)]?.rect;
 if(room&&(x<=room[0]+HALF||x>=room[2]-HALF||y<=room[1]+HALF||y>=room[3]-HALF))return false;
 for(let ty=Math.floor(y-HALF);ty<=Math.floor(y+HALF-1e-6);ty++)for(let tx=Math.floor(x-HALF);tx<=Math.floor(x+HALF-1e-6);tx++)if(tx<0||ty<0||tx>=g.w||ty>=g.h||g.entSolid[ty*g.w+tx]||!staffCanEnter(g.tileAt(tx,ty)))return false;
 return true;
}
export function followDraggedStaff(g,p,from){
 if(p.dragging==null)return;const s=g.staff.find(s=>s.id===p.dragging);
 if(!ownsDrag(g,p,s)){stopDragging(g,p);return;}p.biteAnimT=.15;p.running=false;p.sprintT=0;
 const d=dist(p.x,p.y,s.x,s.y),travel=dist(p.x,p.y,...from),pull=Math.max(0,Math.min(travel,d-p.dragLength));
 if(pull<=.00001)return;
 const x=s.x+(p.x-s.x)/d*pull,y=s.y+(p.y-s.y)/d*pull,steps=Math.max(1,Math.ceil(pull/.08));
 for(let i=1;i<=steps;i++)if(!bodyFits(g,s,s.x+(x-s.x)*i/steps,s.y+(y-s.y)*i/steps)){[p.x,p.y]=from;p.moving=false;return;}
 s.x=x;s.y=y;s.state='unconscious';
}
export function staffFlashlight(g,s){
 if(s.permanentDown||s.draggedBy)return 0;
 const left=(s.downUntil||0)-g.time;if(left<=0)return 1;if(left>1.4)return 0;
 return [0,.7,0,1,0,0,1][Math.min(6,Math.floor((1.4-left)*5))];
}
