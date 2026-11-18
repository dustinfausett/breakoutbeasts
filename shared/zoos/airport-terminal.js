import {T} from '../tiles.js';
export function addAirportTerminal({rect,objects,decor,gates}){
 // Join the divider to both perimeter walls; reinforced tiles resist all powers.
 rect(71,350,72,426,T.REINF);rect(4,350,155,350,T.REINF);rect(4,426,155,426,T.REINF);rect(4,350,4,426,T.REINF);rect(155,350,155,426,T.REINF);
 const kiosk=(x,y,w,h,label,color)=>{rect(x,y,x+w,y+h,T.REINF);rect(x+1,y+1,x+w-1,y+h-1,T.FLOOR,4);const door=x+Math.floor(w/2);rect(door,y+h,door+1,y+h,T.FLOOR,4);decor.push({kind:'airportShop',x,y,w,h,label,color});};
 kiosk(8,358,25,18,'BANANA BUTTON ARCADE','#8063a2');kiosk(41,358,24,17,'SNACK ATTACK','#bc764c');kiosk(8,384,27,18,'WILDWING SOUVENIRS','#588c92');
 const names=['Fruit Catch','Whack a Turnip','Memory Match','Perfect Landing','Snack Maze'];
 for(let i=0;i<5;i++){const x=11+i*4,y=365;objects.push({id:'airport-arcade-'+i,kind:'arcadeMachine',index:i,x,y,walkable:true,label:names[i]+' · $5'});decor.push({kind:'arcadeCabinet',x,y,index:i});}
 objects.push({id:'airport-snacks',kind:'shopShelf',scene:'airport',category:'snacks',x:46,y:363,walkable:true,label:'Snacks'},{id:'airport-snack-pay',kind:'shopCounter',scene:'airport',x:59,y:371,walkable:true,label:'Snack cashier'});
 decor.push({kind:'foodShelf',x:44,y:362,w:10,h:2,food:'bananas'},{kind:'shelfLabel',x:45,y:361,text:'CHIPS · JUICE · COOKIES'});
 for(const [i,category] of ['hat','shirt','pants'].entries()){const x=12+i*8,y=389;objects.push({id:'airport-souvenir-'+category,kind:'shopShelf',scene:'airport',category,x,y,walkable:true,label:'Souvenir '+category+'s'});decor.push({kind:'shelfLabel',x,y:387,text:category.toUpperCase()+'S'},{kind:'thriftArt',index:i,x:x-1,y:388,w:4,h:3});}
 objects.push({id:'airport-souvenir-pay',kind:'shopCounter',scene:'airport',x:12,y:399,walkable:true,label:'Souvenir cashier'});
 for(const [x,y] of [[58,371],[11,399]])decor.push({kind:'airportCashier',x,y});
 const layout={holding:[40,382,67,396],doorTiles:[[52,396],[53,396]],slots:Array.from({length:8},(_,i)=>[42+i*3,384])};
 rect(...layout.holding,T.REINF);rect(41,383,66,395,T.FLOOR,4);rect(52,396,53,396,T.FLOOR,4);gates.push({id:'airport-prison',kind:'holding',vis:'bars',tiles:layout.doorTiles,label:'Airport police jail'});
 for(let i=0;i<8;i++)objects.push({id:'airport-lock-'+i,kind:'prisonLock',prison:'airport',index:i,x:42+i*3,y:383,walkable:true,label:'Airport jail lock '+(i+1)});
 decor.push({kind:'shelfLabel',x:43,y:381,text:'AIRPORT POLICE · LOCKUP'},{kind:'shelfLabel',x:48,y:398,text:'EXIT AFTER UNLOCKING'});
 objects.push({id:'airport-return',kind:'airportReturn',x:74,y:419,walkable:true,label:'One-way exit to terminal · pay again to return'});decor.push({kind:'shelfLabel',x:75,y:417,text:'← TERMINAL · ONE WAY'});
 for(const [x,y] of [[36,380],[9,411],[66,406]])objects.push({id:'airport-bin-'+x,kind:'can',x,y,label:'Airport garbage can'});
 return layout;
}
