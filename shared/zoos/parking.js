import {T} from '../tiles.js';
import {ANIMAL_IDS} from '../animals.js';
export function buildParking(){
 const w=78,h=64,tiles=new Uint8Array(w*h).fill(T.PATH),theme=new Uint8Array(w*h),staffMask=new Uint8Array(w*h),decor=[];
 const rect=(x0,y0,x1,y1,t)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles[y*w+x]=t;};
 rect(0,0,w-1,0,T.WALL);rect(0,h-1,w-1,h-1,T.WALL);rect(0,0,0,h-1,T.WALL);rect(w-1,0,w-1,h-1,T.WALL);
 // Cars are solid cover, separated by generous walkways and planted islands.
 const colors=['#9a454f','#458ba3','#bca461','#708260','#7c6699'];
 for(const [row,y] of [7,23,39].entries())for(let col=0;col<8;col++){
  const x=10+col*7;rect(x,y,x+2,y+3,T.MACHINE);decor.push({kind:'parkedCar',x,y,w:3,h:4,angle:Math.PI/2,color:colors[(row+col)%colors.length],getaway:row===1&&col===7});
 }
 for(const y of [15,31,47])for(let x=11;x<65;x+=7){rect(x,y,x+1,y+1,T.BUSH);}

 rect(0,59,w-1,59,T.WALL);rect(67,52,75,62,T.PATH);
 decor.push({kind:'lotExit',x:67,y:55,w:8,h:5});
 decor.push({kind:'sign',x:3,y:17,text:'Zoo Service Exit'},{kind:'sign',x:66,y:56,text:'Road to the next adventure'});
 const spawn=[4,21],enclosures=ANIMAL_IDS.map((animal,index)=>({index,animal,name:'Zoo service exit',spawn:[...spawn],rect:[2,18,6,25],solution:[],hint:'Find a keeper carrying car keys. Stay out of sight.'}));
 const paths=[[[8,5],[66,5],[66,13],[8,13]],[[8,53],[65,53],[65,50],[8,50]],[[8,20],[65,20],[65,28],[8,28]],[[71,6],[71,52],[67,52],[67,6]],[[14,18],[62,18],[62,13],[14,13]],[[13,36],[65,36],[65,45],[13,45]]];
 return {id:'parking',name:'Moonleaf Parking Lot',w,h,tiles,theme,themes:['outside'],staffMask,decor,enclosures,
  gates:[],objects:[{id:'parking-bin-1',kind:'can',x:7,y:16,label:'Garbage can'},{id:'parking-bin-2',kind:'can',x:7,y:32,label:'Garbage can'},{id:'parking-bin-3',kind:'can',x:65,y:52,label:'Garbage can'},{id:'getaway',kind:'vehicle',x:62,y:28,stand:[61,28],label:'Getaway wagon'}],plates:[],crates:[],burrows:[],bays:[],sockets:[],keys:[],hideout:[],exitZone:[67,59,75,62],requiredRescues:0,
  getaway:{x:60.5,y:25,angle:Math.PI/2,stall:[59,23,61,26]},
  staffRoutes:paths.map(route=>({route,start:0})),staff:{patrolSpeed:1.5,chaseSpeed:2.2,alertSpeed:1.9,investigateSpeed:1.55,range:5.5,halfAngle:.72,detectRate:1},
  intro:'You made it outside! Hide among cars and bushes, sneak behind a keeper to steal car keys, then use the stolen key fob to find your car among the stalls. Get everyone aboard and drive to the exit road together.'};
}
