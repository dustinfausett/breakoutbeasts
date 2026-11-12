import {addRescueDistrict} from './rescue-district.js';
import {T} from '../tiles.js';
import {ANIMAL_IDS} from '../animals.js';
export function buildCity(){
 const w=160,h=432,tiles=new Uint8Array(w*h).fill(T.GRASS),theme=new Uint8Array(w*h),staffMask=new Uint8Array(w*h),driveMask=new Uint8Array(w*h),decor=[],objects=[];
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
  const i=row*3+col,x=22+col*38,y=22+row*32,width=22,height=12,name=names[i],scene=i===0?'grocery':i===1?'bank':i===2?'hardware':i===4?'thrift':i===5?'control':null;
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
 // Keep off-map rooms isolated; stairs and building doors are the only transfers.
 rect(1,128,w-2,h-2,T.WALL);
 // Interior rooms share one authoritative world, so teammates may split up.
 const interiors={grocery:{rect:[4,164,30,185],spawn:[17,180],exit:[17,183]},bank:{rect:[4,134,31,158],spawn:[15,152],exit:[15,156]},hardware:{rect:[35,134,50,158],spawn:[43,153],exit:[43,156]},thrift:{rect:[54,134,72,150],spawn:[63,146],exit:[63,148],name:'Second Paw Thrift'},control:{rect:[104,134,140,163],spawn:[119,159],exit:[119,161],name:'Animal Control'}};
 for(const [scene,r] of Object.entries(interiors)){const [a,b,c,d]=r.rect;rect(a,b,c,d,T.WALL);rect(a+1,b+1,c-1,d-1,T.FLOOR,4);objects.push({id:'leave-'+scene,kind:'cityDoor',scene:'street',from:scene,x:r.exit[0],y:r.exit[1],walkable:true,label:'Return to city'});decor.push({kind:'interiorSign',x:a+3,y:b+3,text:scene==='bank'?'CEDAR BANK':scene==='thrift'?'SECOND PAW THRIFT':scene==='hardware'?'BEAVER HARDWARE':scene==='grocery'?'ACORN GROCERIES':'ANIMAL CONTROL'});}
 rect(24,135,24,144,T.REINF);rect(24,144,30,144,T.REINF);rect(24,140,24,142,T.PATH);objects.push({id:'vault-wheel',kind:'vaultWheel',x:21,y:141,walkable:true,label:'Vault wheel'},{id:'vault-cash',kind:'vaultCash',x:27,y:138,walkable:true,label:'Vault cash'},{id:'hardware-counter',kind:'hardwareCounter',x:43,y:141,walkable:true,label:'Buy habitat tools'},{id:'thrift-counter',kind:'shopCounter',x:63,y:140,walkable:true,label:'Browse disguises'},{id:'control-latch',kind:'controlLatch',x:124,y:155,walkable:true,label:'Open animal-control cage'});

 rect(17,173,20,174,T.MACHINE);decor.push({kind:'cityCounter',x:17,y:173,w:4,h:2});
 objects.push({id:'grocery-counter',kind:'groceryCounter',x:18,y:175,walkable:true,label:'Cashier'});
 for(const [id,scene,category,label,x,y] of [['hats','thrift','hat','Hats',69,140],['shirts','thrift','shirt','Shirts',60,140],['pants','thrift','pants','Pants',60,145],['tools','hardware','tools','Tools',40,140],['meat','grocery','meat','Meat',9,170],['fish','grocery','fish','Fish',23,170],['bananas','grocery','bananas','Bananas',9,176]]){objects.push({id:'shelf-'+id,kind:'shopShelf',scene,category,label,x,y,walkable:true});decor.push({kind:'shelfLabel',x:x-1,y:y-1,text:label});if(scene==='grocery'){rect(x-2,y-2,x,y-1,T.MACHINE);decor.push({kind:'foodShelf',x:x-2,y:y-2,w:3,h:2,food:category});}}
 for(const [x,y] of [[63,140],[43,141],[18,175]])decor.push({kind:'shelfLabel',x:x-1,y:y-1,text:'Cashier'});
 // Bank counters, benches, garment racks and animal-control cage are real obstacles.
 for(const [scene,items] of Object.entries({bank:[[7,139,17,140],[7,148,9,149]],hardware:[[37,138,39,142],[46,138,48,142],[37,147,39,150]],thrift:[[57,138,59,139],[66,138,68,139],[57,143,59,144],[66,143,68,144]],control:[[108,153,112,154]]}))for(const r of items){rect(...r,T.MACHINE);decor.push({kind:scene==='thrift'?'clothesRack':scene==='hardware'?'toolShelf':'cityCounter',x:r[0],y:r[1],w:r[2]-r[0]+1,h:r[3]-r[1]+1});}
 const controlLayout={holding:[126,149,137,160],door:[127,155],doorTiles:[[126,154],[126,155],[126,156]],slots:[[128,150],[130,150],[133,150],[135,150],[128,159],[130,159],[133,159],[135,159]]};
 rect(...controlLayout.holding,T.FENCE);rect(127,150,136,159,T.FLOOR,4);rect(126,154,126,156,T.PATH);
 const controlCages=[{id:'control-dog',species:'dog',rect:[107,138,114,144]},{id:'control-cat',species:'cat',rect:[118,138,125,144]},{id:'control-rabbit',species:'rabbit',rect:[129,138,136,144]}];
 const district=addRescueDistrict({rect,decor,objects,interiors,destinations,controlCages});
 for(const [x,y,index,ww,hh] of [[57,136,0,3,3],[66,136,1,3,3],[57,141,2,3,3],[66,141,3,3,3],[61,136,4,3,3],[55,146,5,2,3],[69,146,6,2,2]])decor.push({kind:'thriftArt',x,y,index,w:ww,h:hh});
 const enclosures=ANIMAL_IDS.map((animal,index)=>({index,animal,name:'City arrival',spawn:[12,12],rect:[8,8,16,16],solution:[],hint:'Park, climb out and use E to enter the bank, thrift store or animal control.'}));
 const bankLayout={wallX:24,wheel:[21,141],cash:[27,138],vault:[24,135,30,144]};
 for(const [x,y,index,ww,hh] of [[7,137,0,3,3],[11,137,0,3,3],[15,137,0,3,3],[25,140,1,4,3],[26,136,2,4,3],[6,143,3,2,3],[37,136,4,3,3],[41,138,5,4,2],[46,145,6,3,3],[41,148,7,3,3]])decor.push({kind:'shopArt',x,y,index,w:ww,h:hh});
 const cans=[[17,20],[17,52],[17,84],[17,116],[55,20],[55,52],[55,84],[55,116],[93,20],[93,52],[93,84],[93,116],[131,20],[131,52],[131,84],[131,116],[6,153],[29,153],[36,153],[49,153],[70,148],[105,159],[138,158],[23,38],[41,38],[61,38],[79,38],[99,38],[117,38],[23,70],[61,70],[99,70],[23,102],[61,102],[99,102]];
 for(const [i,[x,y]] of cans.entries())if([T.FLOOR,T.PATH,T.GRASS].includes(tiles[y*w+x])&&!objects.some(o=>Math.hypot(o.x-x,o.y-y)<2))objects.push({id:'city-bin-'+i,kind:'can',x,y,label:'Garbage can'});
 return {bankLayout,controlLayout,id:'city',name:'Breakout City',daylight:true,w,h,tiles,theme,themes,staffMask,driveMask,decor,enclosures,destinations,interiors,rescueDistrict:district,
 gates:[...district.gates,{id:'city-vault',kind:'vault',vis:'solid',tiles:[[24,140],[24,141],[24,142]],label:'Bank vault'},{id:'city-cage',kind:'holding',vis:'bars',tiles:controlLayout.doorTiles,label:'Animal-control cage'}],objects:[{id:'getaway',kind:'vehicle',x:12,y:14,stand:[12,15],label:'Crew car'},...objects],plates:[],crates:[],burrows:[],bays:[],sockets:[],keys:[],hideout:[],exitZone:[-10,-10,-9,-9],requiredRescues:0,staffRoutes:[],staff:{patrolSpeed:1.6,chaseSpeed:2.5,investigateSpeed:2,range:7,halfAngle:.8,loseTime:2},
 getaway:{x:12,y:12,angle:0,stall:[10,10,13,13]},intro:'Breakout City! Park at Cedar Bank to find money, shop at Second Paw Thrift for disguises, and rescue captured friends at Animal Control.'};
}
