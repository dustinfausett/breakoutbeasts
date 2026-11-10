import {T} from '../tiles.js';
import {ANIMAL_IDS} from '../animals.js';
export function buildCity(){
 const w=160,h=128,tiles=new Uint8Array(w*h).fill(T.GRASS),theme=new Uint8Array(w*h),staffMask=new Uint8Array(w*h),decor=[];
 const rect=(x0,y0,x1,y1,t)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles[y*w+x]=t;};
 rect(0,0,w-1,0,T.WALL);rect(0,h-1,w-1,h-1,T.WALL);rect(0,0,0,h-1,T.WALL);rect(w-1,0,w-1,h-1,T.WALL);
 for(const x of [12,50,88,126])rect(x-4,2,x+3,h-3,T.PATH);
 for(const y of [12,44,76,108])rect(2,y-4,w-3,y+3,T.PATH);
 const names=['Acorn Groceries','Cedar Bank','Beaver Hardware','Moonlight Cafe','Fern Pharmacy','Critter Supplies','Northgate Zoo','Sunspire Safari Zoo','Frostfern Aquarium Zoo'];
 const destinations=[];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const i=row*3+col,x=22+col*38,y=22+row*32,width=22,height=row===2?16:12,name=names[i];
  rect(x,y,x+width-1,y+height-1,T.WALL);rect(x+8,y+height,x+13,44+row*32,T.PATH);
  decor.push({kind:'cityBuilding',x,y,w:width,h:height,text:name,zoo:row===2,color:['#567b7f','#7e6378','#9b7b55'][col]});
  decor.push({kind:'sign',x:x+11,y:41+row*32,text:name});destinations.push({id:'site'+i,name,x:x+11,y:44+row*32});
 }
 for(const [i,x] of [12,50,88,126].entries())for(const [j,y] of [12,44,76,108].entries()){
  decor.push({kind:'street',x,y,text:['Acorn Avenue','Cedar Street','Moonlight Boulevard','Harbor Road'][i]});
  decor.push({kind:'lamp',x:x+4,y:y+4});
 }
 for(let x=136;x<153;x+=4)for(let y=22;y<110;y+=7)rect(x,y,x+1,y+1,T.TREE);
 const enclosures=ANIMAL_IDS.map((animal,index)=>({index,animal,name:'City arrival',spawn:[12,12],rect:[8,8,16,16],solution:[],hint:'Drive the city streets and discover stores and zoos.'}));
 return {id:'city',name:'Breakout City',daylight:true,w,h,tiles,theme,themes:['outside'],staffMask,decor,enclosures,destinations,
  gates:[],objects:[{id:'getaway',kind:'vehicle',x:12,y:14,stand:[12,15],label:'Crew car'}],plates:[],crates:[],burrows:[],bays:[],sockets:[],keys:[],hideout:[],exitZone:[-10,-10,-9,-9],requiredRescues:0,staffRoutes:[],staff:{patrolSpeed:1.5,chaseSpeed:2.2,range:5.5,halfAngle:.72},
  getaway:{x:12,y:12,angle:0,stall:[10,10,13,13]},intro:'Welcome to Breakout City! Drive the street grid to discover six stores and three zoos. Pull up and stop near an address to discover it. The buildings are destinations for future missions.'};
}
