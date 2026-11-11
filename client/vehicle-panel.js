import {IMAGES} from './assets.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stations=['Jungle FM','Safari Swing','Moonlight Jazz'];let radioStation=0;
const controlRects=[[0,70,435,510],[510,80,220,510],[845,100,430,470],[35,665,310,550],[390,795,500,270],[895,660,320,550]];
const art=i=>{const [, ,w,h]=controlRects[i];return `<canvas class="control-art ${i===0?'wheel-art':''}" width="${w}" height="${h}" data-control-art="${i}" aria-hidden="true"></canvas>`;};
function paintControls(root){const img=IMAGES['cockpit-controls'];if(!img)return;for(const c of root.querySelectorAll('[data-control-art]')){const i=Number(c.dataset.controlArt),g=c.getContext('2d'),[x,y,w,h]=controlRects[i];g.imageSmoothingEnabled=false;g.drawImage(img,x*img.width/1280,y*img.height/1280,w*img.width/1280,h*img.height/1280,0,0,c.width,c.height);}}
let send,current=null,signature='',held=new Map(),fobOpen=false,gearDrag=null;
function transmit(control,value,down=true){send({t:'vehicle',control,value,held:down});}
function release(control){if(!held.has(control))return;held.delete(control);transmit(control,0,false);}
function releaseAll(){gearDrag=null;for(const id of [...held.keys()])release(id);}
export function mountVehiclePanel(sender){
 send=sender;const root=document.querySelector('#vehicle-panel'),fob=document.querySelector('#key-fob');
 fob.innerHTML='<button class="fob-toggle" aria-expanded="false">🔑 Key fob</button><div class="fob-buttons" hidden><button data-fob="unlock">🔓 Unlock</button><button data-fob="panic" class="panic">PANIC</button></div>';
 fob.addEventListener('click',e=>{if(e.target.closest('.fob-toggle')){fobOpen=!fobOpen;fob.querySelector('.fob-buttons').hidden=!fobOpen;fob.querySelector('.fob-toggle').setAttribute('aria-expanded',String(fobOpen));}const b=e.target.closest('[data-fob]');if(b)send({t:'vehicle',op:b.dataset.fob});});
 root.addEventListener('click',e=>{if(e.target.closest('[data-radio-cycle]')){radioStation=(radioStation+1)%stations.length;root.querySelector('#radio-station').textContent=stations[radioStation];window.dispatchEvent(new CustomEvent('beasts-radio',{detail:radioStation}));return;}const b=e.target.closest('[data-car-control]');if(b)send({t:'vehicle',control:b.dataset.carControl,value:b.dataset.carValue});if(e.target.closest('[data-car-leave]')){releaseAll();send({t:'vehicle',op:'leave'});}});
 root.addEventListener('pointerdown',e=>{
  const knob=e.target.closest('[data-gear-handle]');if(knob&&!knob.disabled){e.preventDefault();knob.setPointerCapture(e.pointerId);gearDrag={pointer:e.pointerId,track:knob.closest('.gear-gate').getBoundingClientRect()};return;}
  const b=e.target.closest('[data-hold-control]');if(!b||b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);
  const id=b.dataset.holdControl,value=id==='steering'?0:1;held.set(id,{pointer:e.pointerId,startX:e.clientX,value});transmit(id,value);b.classList.add('pressed');
 });
 root.addEventListener('pointermove',e=>{if(gearDrag?.pointer===e.pointerId){const t=gearDrag.track,index=Math.max(0,Math.min(2,Math.round((e.clientY-t.top-16)/(t.height-32)*2))),value=['Park','Reverse','Drive'][index];send({t:'vehicle',control:'gear',value,held:true});return;}const h=held.get('steering');if(h?.pointer!==e.pointerId)return;h.value=Math.max(-1,Math.min(1,(e.clientX-h.startX)/90));transmit('steering',h.value);root.querySelector('.wheel-art')?.style.setProperty('--turn',`${h.value*110}deg`);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,e=>{if(gearDrag?.pointer===e.pointerId)gearDrag=null;for(const [id,h] of held)if(h.pointer===e.pointerId){release(id);root.querySelector(`[data-hold-control="${id}"]`)?.classList.remove('pressed');}});
 root.addEventListener('keydown',e=>{const gear=e.target.closest('[data-gear-handle]');if(gear&&['ArrowUp','ArrowDown'].includes(e.code)&&!gear.disabled){e.preventDefault();e.stopPropagation();const i=Number(gear.getAttribute('aria-valuenow'));send({t:'vehicle',control:'gear',held:true,value:['Park','Reverse','Drive'][Math.max(0,Math.min(2,i+(e.code==='ArrowDown'?1:-1)))]});return;}const b=e.target.closest('[data-hold-control]');if(!b||b.disabled||!['Space','Enter','ArrowLeft','ArrowRight'].includes(e.code))return;e.preventDefault();e.stopPropagation();const id=b.dataset.holdControl,value=id==='steering'?(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0):1;held.set(id,{pointer:'keyboard',value});transmit(id,value);});
 root.addEventListener('keyup',e=>{const b=e.target.closest('[data-hold-control]');if(b&&['Space','Enter','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();e.stopPropagation();release(b.dataset.holdControl);}});
 const shortcuts={KeyW:['gas',1],ArrowUp:['gas',1],KeyS:['brake',1],ArrowDown:['brake',1],KeyA:['steering',-1],ArrowLeft:['steering',-1],KeyD:['steering',1],ArrowRight:['steering',1]};
 window.addEventListener('keydown',e=>{
  const shortcut=shortcuts[e.code];if(!shortcut||!current||root.hidden||(e.target?.matches('input,textarea')||e.target?.closest('[data-gear-handle]'))||document.querySelector('#pause.show,#complete.show,#settings.show'))return;
  const [id,value]=shortcut;if(current.inCar!==current.need||current.team.some(p=>!p.connected)||!current.controls.some(c=>c.id===id))return;
  e.preventDefault();e.stopPropagation();held.set(id,{pointer:'shortcut-'+e.code,value});transmit(id,value);
 },true);
 window.addEventListener('keyup',e=>{const shortcut=shortcuts[e.code];if(shortcut&&held.get(shortcut[0])?.pointer==='shortcut-'+e.code){e.preventDefault();e.stopPropagation();release(shortcut[0]);}},true);
 document.addEventListener('keydown',e=>{if(e.code==='Escape')releaseAll();},true);
 window.addEventListener('resize',releaseAll);
 window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
 setInterval(()=>{for(const [id,h] of held)transmit(id,h.value);},100);
}
export function updateKeyFob(show){document.querySelector('#key-fob').hidden=!show;if(!show){fobOpen=false;document.querySelector('.fob-buttons').hidden=true;document.querySelector('.fob-toggle').setAttribute('aria-expanded','false');}}
export function updateVehiclePanel(v){
 const root=document.querySelector('#vehicle-panel');root.hidden=!v;current=v;document.body.classList.toggle('in-car',!!v);
 if(!v){releaseAll();signature='';return;}
 const enabled=v.inCar===v.need&&!v.team.some(p=>!p.connected),key=v.controls.filter(c=>c.id!=='navigation'||!v.city).map(c=>c.id).join('|');
 if(key!==signature){releaseAll();signature=key;
  root.innerHTML=`<div class="cockpit"><header><strong>GETAWAY CREW</strong><span id="car-speed"></span><button class="btn small" data-car-leave>Climb out</button></header><p id="car-crew"></p><div class="driving-jobs">${v.controls.filter(c=>c.id!=='navigation'||!v.city).map(c=>`<section class="driving-job"><h3>${esc(c.label)}</h3>${c.kind==='gear'?'<div class="gear-gate"><div class="gear-rail"></div><span class="gear-slot">P</span><span class="gear-slot">R</span><span class="gear-slot">D</span><button data-gear-handle class="gear-handle" aria-label="Hold and drag gear shifter between Park, Reverse and Drive" role="slider" aria-valuemin="0" aria-valuemax="2" tabindex="0"><i></i></button></div>':c.kind==='wheel'?`<button class="steering-wheel" data-hold-control="steering" aria-label="Hold steering wheel and drag left or right">${art(0)}</button>`:c.kind==='pedal'?`<button class="pedal ${c.id}" data-hold-control="${c.id}" aria-label="Hold ${c.label}">${art(c.id==='gas'?1:2)}<span class="component-label">${c.id==='gas'?'GAS':'BRAKE'}</span></button>`:`<div class="shifter">${c.choices.map(value=>`<button class="btn" data-car-control="${c.id}" data-car-value="${esc(value)}">${esc(value)}</button>`).join('')}</div>`}<small>${esc(c.hint)}</small></section>`).join('')}</div><button class="car-radio" data-radio-cycle aria-label="Change radio station">${art(4)}<span id="radio-station">${stations[radioStation]}</span></button><footer id="car-route"></footer></div>`;
  const gearImage=root.querySelector('[data-gear-handle]');if(gearImage)gearImage.innerHTML=art(3);const ignition=root.querySelector('[data-car-control="ignition"]');if(ignition)ignition.insertAdjacentHTML('beforebegin',art(5));paintControls(root);
 }
 if(!enabled)releaseAll();
 root.querySelectorAll('button:not([data-car-leave])').forEach(b=>b.disabled=!enabled);
 root.querySelector('[data-car-leave]').disabled=Math.abs(v.car.speed)>.2;
 root.querySelector('#car-speed').textContent=`${Math.abs(v.car.speed*8).toFixed(0)} km/h`;
 root.querySelector('#car-crew').textContent=!enabled?`${v.inCar}/${v.need} aboard · waiting for the whole connected crew`:v.city?'Explore the city. Stop near a store or zoo to discover it.':'Drive through the opening at the bottom right to leave the lot.';
 const gear=root.querySelector('[data-gear-handle]');if(gear){const value=v.controls.find(c=>c.id==='gear')?.value,index=['Park','Reverse','Drive'].indexOf(value);gear.style.top=`calc(${Math.max(0,index)*50}% - ${Math.max(0,index)*16}px)`;gear.setAttribute('aria-valuenow',String(index));gear.setAttribute('aria-valuetext',value);}
 for(const c of v.controls){root.querySelectorAll(`[data-car-control="${c.id}"]`).forEach(b=>{b.classList.toggle('selected',b.dataset.carValue===String(c.value));b.setAttribute('aria-pressed',String(b.dataset.carValue===String(c.value)));});const b=root.querySelector(`[data-hold-control="${c.id}"]`);b?.classList.toggle('pressed',!!c.value);}
 if(!held.has('steering'))root.querySelector('.wheel-art')?.style.setProperty('--turn',`${v.car.steering*110}deg`);
 root.querySelector('#car-route').textContent=v.roles.map(r=>`${r.name}: ${r.label}`).join(' · ');
}
