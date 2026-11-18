const plane=new Image();plane.src=globalThis.__BB_ASSETS__?.['flight-plane']||'assets/flight-plane.png';
const atlas=new Image();atlas.src=globalThis.__BB_ASSETS__?.['flight-atlas']||'assets/flight-atlas.png';
export function tile(ctx,id,x,y,w,h){if(!atlas.complete||!atlas.naturalWidth)return;const sw=atlas.naturalWidth/4,sh=atlas.naturalHeight/2;ctx.drawImage(atlas,(id%4)*sw,Math.floor(id/4)*sh,sw,sh,x,y,w,h);}
// The camera rises with altitude: the runway drops out of view instead of
// keeping the aircraft a few pixels above the ground at 1,000 feet.
export function flightCamera(altitude,height){const feet=Math.max(0,altitude||0);return {groundDrop:feet*.3,planeY:height*.66-Math.min(height*.26,feet*.25)};}
function clouds(c,w,h,f){
 const altitude=f.altitude||0;
 for(let i=0;i<13;i++){
  const x=((i*173-f.distance*.13)%(w+220)+(w+220))%(w+220)-100;
  const y=((i*61+altitude*.12)%(h+160)+(h+160))%(h+160)-90;
  c.fillStyle=i%2?'#e4f2ed':'#f9f3d9';c.fillRect(x,y,70+i%3*14,12);c.fillRect(x+15,y-10,38,14);c.fillRect(x+38,y-6,28,8);
 }
}
export function flightScene(canvas,f){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,altitude=f.altitude||0,{groundDrop,planeY}=flightCamera(altitude,h);
 c.imageSmoothingEnabled=false;c.fillStyle=altitude>500?'#85b9d8':'#8bc8d6';c.fillRect(0,0,w,h);clouds(c,w,h,f);
 const forward=f.roles.includes('steering');
 if(forward){
  if(groundDrop<h+40)tile(c,1,-60-f.lateral*20,-20+groundDrop,w+120,h+40);
  if(altitude<50){
   if(f.remaining<1000){const y=h*.3+(1-f.remaining/1000)**2*h*.6+groundDrop;c.fillStyle='#fff1be';c.fillRect(0,y,w,8);c.fillStyle='#c96d4c';for(let x=0;x<w;x+=40)c.fillRect(x,y,20,8);}
   const wx=w-100,wy=65+groundDrop,wind=f.wind||0;c.fillStyle='#e8d8a6';c.fillRect(wx,wy,3,40);c.fillStyle='#ec8a4a';c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+Math.sign(wind||1)*(20+Math.abs(wind)*20),wy+6);c.lineTo(wx,wy+12);c.fill();
   const shift=f.lateral*24;c.fillStyle='#f4dc9a';for(let i=0;i<12;i++){const t=(i/12+f.distance/100)%1,y=h*.3+t*t*h*.65+groundDrop;c.fillRect(w/2-shift*t-3,y,6+10*t,3+12*t);}
  }
  // Nose/window frame stays in the foreground while the runway falls away.
  c.fillStyle='#263d42';c.fillRect(0,h-14,w,14);c.fillRect(0,0,10,h);c.fillRect(w-10,0,10,h);
 }else{
  const offset=f.distance*.6%w;
  if(groundDrop<h){tile(c,2,-offset,groundDrop,w,h);tile(c,2,w-offset,groundDrop,w,h);}
  const groundY=h*.83+groundDrop;
  c.fillStyle='#4c575e';c.fillRect(0,groundY,w,h*.17);c.fillStyle='#fff0ad';for(let i=0;i<18;i++)c.fillRect(i*90-f.distance*2%90,h*.93+groundDrop,45,4);
  c.save();c.translate(w*.4,planeY);c.rotate(-f.angle*Math.PI/180);c.scale(1,Math.max(.4,Math.cos(f.roll*Math.PI/180)));
  if(plane.complete&&plane.naturalWidth)c.drawImage(plane,-150,-85,300,150);else tile(c,0,-150,-85,300,150);
  if(f.visualGear>1){const leg=f.visualGear/100*22;c.fillStyle='#d8bc88';c.fillRect(-50,31,4,leg);c.fillRect(93,23,4,leg);c.fillStyle='#24313a';for(const [x,y] of [[-48,34+leg],[95,26+leg]]){c.beginPath();c.arc(x,y,7,0,7);c.fill();c.strokeStyle='#d0c59b';c.lineWidth=2;c.beginPath();c.arc(x,y,3,f.distance/2,f.distance/2+3);c.stroke();}}
  c.strokeStyle='#b8d5b2';c.lineWidth=4;c.beginPath();c.moveTo(-65,15);c.lineTo(-20,15+(f.visualFlaps||0)/6);c.stroke();c.strokeStyle='#fff8cc';
  for(const x of [35,100]){c.beginPath();c.ellipse(x,18,4,f.visualThrust>2?18+Math.sin(Date.now()/Math.max(20,140-f.visualThrust))*5:3,0,0,7);c.stroke();}c.restore();
 }
 if(altitude>150){c.globalAlpha=.35;clouds(c,w,h,{...f,distance:f.distance*1.7,altitude:altitude+550});c.globalAlpha=1;}
 if(f.phase==='crashed'){c.fillStyle='#d77154';c.fillText(f.reason,15,h-15);}
}
export function gauge(canvas,label,value,min=0,max=100){const c=canvas.getContext('2d');c.clearRect(0,0,180,180);tile(c,5,0,0,180,180);c.save();c.translate(90,87);c.rotate((-135+Math.max(0,Math.min(100,(value-min)/(max-min)*100))*2.7)*Math.PI/180);c.fillStyle='#ed9855';c.fillRect(-3,-60,6,65);c.restore();}

const controls=new Image();controls.src=globalThis.__BB_ASSETS__?.['flight-controls']||'assets/flight-controls.png';
export function drawPhysicalControl(canvas,control,{held=false,turn=null,cover=false}={}){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;
 const ready=controls.complete&&controls.naturalWidth,sw=controls.naturalWidth/4,sh=controls.naturalHeight/2;
 const sprite=(id,x,y,ww,hh)=>{if(ready)c.drawImage(controls,id%4*sw,Math.floor(id/4)*sh,sw,sh,x,y,ww,hh);else tile(c,7,x,y,ww,hh);};
 const v=Math.max(0,Math.min(100,control.position||0)),id=control.id,kind=control.kind;
 c.strokeStyle='#758a7f';c.lineWidth=3;
 if(kind==='lever'){
  c.fillStyle='#091b21';c.fillRect(w*.42,12,w*.16,h-20);c.strokeRect(w*.42,12,w*.16,h-20);
  for(let y=18;y<h-10;y+=14){c.fillStyle='#b6a273';c.fillRect(w*.31,y,12,2);}
  const y=12+(1-v/100)*(h-60);
  if(ready)c.drawImage(controls,0,0,sw,sh*.34,w*.13,y,w*.74,52);else sprite(0,w*.13,y,w*.74,52);
 }else if(kind==='wheel'||id==='bank'||kind==='crank'){
  c.save();c.translate(w/2,h/2);c.rotate(kind==='crank'?(turn??v*Math.PI/10):(v-50)*Math.PI/50);
  sprite(kind==='crank'?4:2,-w*.43,-h*.48,w*.86,h*.96);c.restore();
 }else if(id==='pitch'){
  const offset=(v-50)*.45;c.fillStyle='#091b21';c.fillRect(w*.43,10,w*.14,h-20);
  sprite(3,w*.08,offset,w*.84,h*.92);
 }else if(kind==='pedal'){
  c.save();c.translate(w/2,h*.88);c.scale(1,1-v*.0035);sprite(1,-w*.38,-h*.85,w*.76,h*.9);c.restore();
 }else if(kind==='shifter'){
  const positions=[h*.68,h*.38,h*.08];c.strokeStyle='#b5a477';c.lineWidth=5;c.beginPath();c.moveTo(w*.42,25);c.lineTo(w*.42,h-22);c.stroke();
  c.font='bold 10px monospace';c.fillStyle='#e6d5a8';for(const [i,label] of ['FWD','REV','PARK'].entries())c.fillText(label,w*.71,positions[2-i]+20);
  sprite(5,w*.15,positions[Math.round(v/50)]-12,w*.5,h*.42);
 }else if(kind==='covered'){
  sprite(6,w*.13,5+(v/100)*10,w*.74,h*.9);
  if(!cover){c.fillStyle='#a93d2ae8';c.fillRect(w*.24,h*.12,w*.52,h*.48);c.strokeStyle='#ef9267';c.strokeRect(w*.24,h*.12,w*.52,h*.48);c.fillStyle='#ffd79c';c.font='bold 11px monospace';c.fillText('COVER',w*.34,h*.38);}
 }else{
  c.save();c.translate(w/2,h/2);c.rotate(v>50?.045:-.045);sprite(7,-w*.34,-h*.45,w*.68,h*.9);c.restore();
  if(v>50){c.fillStyle='#b7f77d';c.fillRect(w*.43,h*.2,w*.12,5);}
 }
 if(held){c.strokeStyle='#f2d78c';c.lineWidth=2;c.strokeRect(2,2,w-4,h-4);}
}
