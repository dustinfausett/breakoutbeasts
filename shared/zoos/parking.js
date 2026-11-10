import {T} from '../tiles.js';
import {ANIMAL_IDS} from '../animals.js';
export function buildParking(){
 const w=66,h=44,tiles=new Uint8Array(w*h).fill(T.PATH),theme=new Uint8Array(w*h),staffMask=new Uint8Array(w*h),decor=[];
 const rect=(x0,y0,x1,y1,t)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles[y*w+x]=t;};
 rect(0,0,w-1,0,T.WALL);rect(0,h-1,w-1,h-1,T.WALL);rect(0,0,0,h-1,T.WALL);rect(w-1,0,w-1,h-1,T.WALL);
 // Cars are solid cover, separated by generous walkways and planted islands.
 const colors=['#9a454f','#458ba3','#bca461','#708260','#7c6699'];
 for(const [row,y] of [7,17,29].entries())for(let col=0;col<8;col++){
  const x=10+col*6;rect(x,y,x+3,y+2,T.MACHINE);decor.push({kind:'parkedCar',x,y,w:4,h:3,color:colors[(row+col)%colors.length],getaway:row===1&&col===7});
 }
 for(const y of [12,24,35])for(let x=11;x<57;x+=7){rect(x,y,x+1,y+1,T.BUSH);}

 decor.push({kind:'lotExit',x:58,y:37,w:6,h:4});
 decor.push({kind:'sign',x:3,y:17,text:'Zoo Service Exit'},{kind:'sign',x:58,y:39,text:'Road to the next adventure'});
 const spawn=[4,21],enclosures=ANIMAL_IDS.map((animal,index)=>({index,animal,name:'Zoo service exit',spawn:[...spawn],rect:[2,18,6,25],solution:[],hint:'Find a keeper carrying car keys. Stay out of sight.'}));
 const paths=[[[8,5],[56,5],[56,11],[8,11]],[[8,38],[58,38],[58,33],[8,33]],[[8,21],[44,21],[44,26],[8,26]],[[60,6],[60,32],[57,32],[57,6]],[[14,15],[50,15],[50,11],[14,11]],[[13,27],[54,27],[54,32],[13,32]]];
 return {id:'parking',name:'Moonleaf Parking Lot',w,h,tiles,theme,themes:['outside'],staffMask,decor,enclosures,
  gates:[],objects:[{id:'getaway',kind:'vehicle',x:54,y:20,stand:[54,21],label:'Getaway wagon'}],plates:[],crates:[],burrows:[],bays:[],sockets:[],keys:[],hideout:[],exitZone:[61,38,63,40],requiredRescues:0,
  getaway:{x:54,y:18.5,angle:0,stall:[52,17,55,19]},
  staffRoutes:paths.map(route=>({route,start:0})),staff:{patrolSpeed:1.5,chaseSpeed:2.2,alertSpeed:1.9,investigateSpeed:1.55,range:5.5,halfAngle:.72,detectRate:1},
  intro:'You made it outside! Hide among cars and bushes, sneak behind a keeper to steal car keys, then use the stolen key fob to find your car among the stalls. Get everyone aboard and drive to the exit road together.'};
}
