import {T} from '../tiles.js';
import {ANIMAL_IDS} from '../animals.js';
export function buildCity(){
 const w=160,h=184,tiles=new Uint8Array(w*h).fill(T.GRASS),theme=new Uint8Array(w*h),staffMask=new Uint8Array(w*h),driveMask=new Uint8Array(w*h),decor=[],objects=[];
 const themes=['outside','roadHorizontal','roadVertical','parking','pavement'];
 const rect=(x0,y0,x1,y1,t,th=0,drive=0)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;tiles[i]=t;theme[i]=th;driveMask[i]=drive;}};
 rect(0,0,w-1,0,T.WALL);rect(0,h-1,w-1,h-1,T.WALL);rect(0,0,0,h-1,T.WALL);rect(w-1,0,w-1,h-1,T.WALL);
 for(const x of [12,50,88,126]){rect(x-5,2,x+4,124,T.FLOOR,4);rect(x-4,2,x+3,124,T.PATH,2,1);}
 for(const y of [12,44,76,108]){rect(2,y-5,157,y+4,T.FLOOR,4);rect(2,y-4,157,y+3,T.PATH,1,1);}
 // Restore crossing lanes after paving sidewalks so the street grid stays connected.
 for(const x of [12,50,88,126])rect(x-4,2,x+3,124,T.PATH,2,1);
 const names=['Acorn Groceries','Cedar Bank','Beaver Hardware','Moonlight Cafe','Second Paw Thrift','Animal Control','Northgate Zoo','Sunspire Safari Zoo','Frostfern Aquarium Zoo'];
 const destinations=[];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const i=row*3+col,x=22+col*38,y=22+row*32,width=22,height=12,name=names[i],scene=i===1?'bank':i===4?'thrift':i===5?'control':null;
  rect(x,y,x+21,y+11,T.WALL);rect(x,y+12,x+21,y+12,T.FLOOR,4);rect(x,y+13,x+21,y+17,T.PATH,3,1);
  // Parking bays leave clear driveways from each lot to the street.
  for(let n=0;n<5;n++){decor.push({kind:'parkingBay',x:x+n*4,y:y+13,w:3,h:4});if(n===0||n===4){rect(x+n*4,y+13,x+n*4+2,y+16,T.MACHINE,3);decor.push({kind:'parkedCar',x:x+n*4,y:y+13,w:3,h:4,angle:Math.PI/2,colorIndex:(i+n)%6});}}
  decor.push({kind:'cityBuilding',x,y,w:width,h:height,text:name,zoo:row===2,color:['#567b7f','#7e6378','#9b7b55'][col]});
  decor.push({kind:'sign',x:x+11,y:y+12,text:name});
  destinations.push({id:'site'+i,name,x:x+11,y:44+row*32,scene});
  if(scene)objects.push({id:'enter-'+scene,kind:'cityDoor',scene,x:x+10,y:y+12,stand:[x+10,y+13],walkable:true,label:'Enter '+name});
 }
 for(const [i,x] of [12,50,88,126].entries())for(const y of [12,44,76,108]){decor.push({kind:'street',x,y,text:['Acorn Avenue','Cedar Street','Moonlight Boulevard','Harbor Road'][i]});decor.push({kind:'lamp',x:x+4,y:y+4});}
 for(let x=136;x<153;x+=4)for(let y=22;y<110;y+=7)rect(x,y,x+1,y+1,T.TREE);
 // Interior rooms share one authoritative world, so teammates may split up.
 const interiors={bank:{rect:[4,134,46,178],spawn:[24,158],exit:[24,176]},thrift:{rect:[54,134,96,178],spawn:[75,172],exit:[75,176]},control:{rect:[104,134,156,178],spawn:[116,171],exit:[116,176]}};
 for(const [scene,r] of Object.entries(interiors)){const [a,b,c,d]=r.rect;rect(a,b,c,d,T.WALL);rect(a+1,b+1,c-1,d-1,T.FLOOR,4);objects.push({id:'leave-'+scene,kind:'cityDoor',scene:'street',from:scene,x:r.exit[0],y:r.exit[1],walkable:true,label:'Return to city'});decor.push({kind:'interiorSign',x:a+3,y:b+3,text:scene==='bank'?'CEDAR BANK':scene==='thrift'?'SECOND PAW THRIFT':'ANIMAL CONTROL'});}
 rect(34,135,34,177,T.REINF);rect(34,146,34,148,T.PATH);objects.push({id:'vault-wheel',kind:'vaultWheel',x:30,y:147,walkable:true,label:'Vault wheel'},{id:'vault-cash',kind:'vaultCash',x:40,y:143,walkable:true,label:'Vault cash'},{id:'thrift-counter',kind:'shopCounter',x:75,y:146,walkable:true,label:'Browse disguises'},{id:'control-latch',kind:'controlLatch',x:134,y:161,walkable:true,label:'Open animal-control cage'});
 // Bank counters, benches, garment racks and animal-control cage are real obstacles.
 for(const [scene,items] of Object.entries({bank:[[9,140,18,141],[9,150,14,151],[18,166,22,167]],thrift:[[58,140,66,141],[83,140,91,141],[58,153,66,154],[83,153,91,154]],control:[[140,138,151,139]]}))for(const r of items){rect(...r,T.MACHINE);decor.push({kind:scene==='thrift'?'clothesRack':'cityCounter',x:r[0],y:r[1],w:r[2]-r[0]+1,h:r[3]-r[1]+1});}
 rect(136,148,153,171,T.FENCE);rect(137,149,152,170,T.FLOOR,4);rect(136,160,136,162,T.PATH);
 const enclosures=ANIMAL_IDS.map((animal,index)=>({index,animal,name:'City arrival',spawn:[12,12],rect:[8,8,16,16],solution:[],hint:'Park, climb out and use E to enter the bank, thrift store or animal control.'}));
 return {id:'city',name:'Breakout City',daylight:true,w,h,tiles,theme,themes,staffMask,driveMask,decor,enclosures,destinations,interiors,
 gates:[{id:'city-vault',kind:'vault',vis:'solid',tiles:[[34,146],[34,147],[34,148]],label:'Bank vault'},{id:'city-cage',kind:'holding',vis:'bars',tiles:[[136,160],[136,161],[136,162]],label:'Animal-control cage'}],objects:[{id:'getaway',kind:'vehicle',x:12,y:14,stand:[12,15],label:'Crew car'},...objects],plates:[],crates:[],burrows:[],bays:[],sockets:[],keys:[],hideout:[],exitZone:[-10,-10,-9,-9],requiredRescues:0,staffRoutes:[],staff:{patrolSpeed:1.6,chaseSpeed:2.5,investigateSpeed:2,range:7,halfAngle:.8,loseTime:2},
 getaway:{x:12,y:12,angle:0,stall:[10,10,13,13]},intro:'Breakout City! Park at Cedar Bank to find money, shop at Second Paw Thrift for disguises, and rescue captured friends at Animal Control.'};
}
