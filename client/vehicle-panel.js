const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let send,current=null,signature='',held=new Map(),fobOpen=false;
function transmit(control,value,down=true){send({t:'vehicle',control,value,held:down});}
function release(control){if(!held.has(control))return;held.delete(control);transmit(control,0,false);}
function releaseAll(){for(const id of [...held.keys()])release(id);}
export function mountVehiclePanel(sender){
 send=sender;const root=document.querySelector('#vehicle-panel'),fob=document.querySelector('#key-fob');
 fob.innerHTML='<button class="fob-toggle" aria-expanded="false">🔑 Key fob</button><div class="fob-buttons" hidden><button data-fob="unlock">🔓 Unlock</button><button data-fob="panic" class="panic">PANIC</button></div>';
 fob.addEventListener('click',e=>{if(e.target.closest('.fob-toggle')){fobOpen=!fobOpen;fob.querySelector('.fob-buttons').hidden=!fobOpen;fob.querySelector('.fob-toggle').setAttribute('aria-expanded',String(fobOpen));}const b=e.target.closest('[data-fob]');if(b)send({t:'vehicle',op:b.dataset.fob});});
 root.addEventListener('click',e=>{const b=e.target.closest('[data-car-control]');if(b)send({t:'vehicle',control:b.dataset.carControl,value:b.dataset.carValue});if(e.target.closest('[data-car-leave]')){releaseAll();send({t:'vehicle',op:'leave'});}});
 root.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-hold-control]');if(!b||b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);
  const id=b.dataset.holdControl,value=id==='steering'?0:1;held.set(id,{pointer:e.pointerId,startX:e.clientX,value});transmit(id,value);b.classList.add('pressed');
 });
 root.addEventListener('pointermove',e=>{const h=held.get('steering');if(h?.pointer!==e.pointerId)return;h.value=Math.max(-1,Math.min(1,(e.clientX-h.startX)/90));transmit('steering',h.value);root.querySelector('.wheel-art')?.style.setProperty('--turn',`${h.value*110}deg`);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,e=>{for(const [id,h] of held)if(h.pointer===e.pointerId){release(id);root.querySelector(`[data-hold-control="${id}"]`)?.classList.remove('pressed');}});
 root.addEventListener('keydown',e=>{const b=e.target.closest('[data-hold-control]');if(!b||b.disabled||!['Space','Enter','ArrowLeft','ArrowRight'].includes(e.code))return;e.preventDefault();e.stopPropagation();const id=b.dataset.holdControl,value=id==='steering'?(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0):1;held.set(id,{pointer:'keyboard',value});transmit(id,value);});
 root.addEventListener('keyup',e=>{const b=e.target.closest('[data-hold-control]');if(b&&['Space','Enter','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();e.stopPropagation();release(b.dataset.holdControl);}});
 const shortcuts={KeyW:['gas',1],ArrowUp:['gas',1],KeyS:['brake',1],ArrowDown:['brake',1],KeyA:['steering',-1],ArrowLeft:['steering',-1],KeyD:['steering',1],ArrowRight:['steering',1]};
 window.addEventListener('keydown',e=>{
  const shortcut=shortcuts[e.code];if(!shortcut||!current||root.hidden||e.target?.matches('input,textarea')||document.querySelector('#pause.show,#complete.show,#settings.show'))return;
  const [id,value]=shortcut;if(current.inCar!==current.need||current.team.some(p=>!p.connected)||!current.controls.some(c=>c.id===id))return;
  e.preventDefault();e.stopPropagation();held.set(id,{pointer:'shortcut-'+e.code,value});transmit(id,value);
 },true);
 window.addEventListener('keyup',e=>{const shortcut=shortcuts[e.code];if(shortcut&&held.get(shortcut[0])?.pointer==='shortcut-'+e.code){e.preventDefault();e.stopPropagation();release(shortcut[0]);}},true);
 document.addEventListener('keydown',e=>{if(e.code==='Escape')releaseAll();},true);
 window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
 setInterval(()=>{for(const [id,h] of held)transmit(id,h.value);},100);
}
export function updateKeyFob(show){document.querySelector('#key-fob').hidden=!show;if(!show){fobOpen=false;document.querySelector('.fob-buttons').hidden=true;document.querySelector('.fob-toggle').setAttribute('aria-expanded','false');}}
export function updateVehiclePanel(v){
 const root=document.querySelector('#vehicle-panel');root.hidden=!v;current=v;document.body.classList.toggle('in-car',!!v);
 if(!v){releaseAll();signature='';return;}
 const enabled=v.inCar===v.need&&!v.team.some(p=>!p.connected),key=v.controls.map(c=>c.id).join('|');
 if(key!==signature){releaseAll();signature=key;
  root.innerHTML=`<div class="cockpit"><header><strong>GETAWAY CREW</strong><span id="car-speed"></span><button class="btn small" data-car-leave>Climb out</button></header><p id="car-crew"></p><div class="driving-jobs">${v.controls.map(c=>`<section class="driving-job"><h3>${esc(c.label)}</h3>${c.kind==='wheel'?'<button class="steering-wheel" data-hold-control="steering" aria-label="Hold steering wheel and drag left or right"><svg class="wheel-art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="47" fill="#172531" stroke="#bfc8b8" stroke-width="12"/><path d="M60 60 16 44 M60 60 104 44 M60 60 60 105" fill="none" stroke="#9aabac" stroke-width="10"/><circle cx="60" cy="60" r="16" fill="#cba96c" stroke="#192731" stroke-width="5"/></svg></button>':c.kind==='pedal'?`<button class="pedal ${c.id}" data-hold-control="${c.id}" aria-label="Hold ${c.label}"><span></span>${c.id==='gas'?'GAS':'BRAKE'}</button>`:`<div class="shifter">${c.choices.map(value=>`<button class="btn" data-car-control="${c.id}" data-car-value="${esc(value)}">${esc(value)}</button>`).join('')}</div>`}<small>${esc(c.hint)}</small></section>`).join('')}</div><footer id="car-route"></footer></div>`;
 }
 if(!enabled)releaseAll();
 root.querySelectorAll('button:not([data-car-leave])').forEach(b=>b.disabled=!enabled);
 root.querySelector('[data-car-leave]').disabled=Math.abs(v.car.speed)>.2;
 root.querySelector('#car-speed').textContent=`${Math.abs(v.car.speed*8).toFixed(0)} km/h`;
 root.querySelector('#car-crew').textContent=!enabled?`${v.inCar}/${v.need} aboard · waiting for the whole connected crew`:'Keep the lot in view. Drive to the exit road at the bottom right, then brake to a stop.';
 for(const c of v.controls){root.querySelectorAll(`[data-car-control="${c.id}"]`).forEach(b=>{b.classList.toggle('selected',b.dataset.carValue===String(c.value));b.setAttribute('aria-pressed',String(b.dataset.carValue===String(c.value)));});const b=root.querySelector(`[data-hold-control="${c.id}"]`);b?.classList.toggle('pressed',!!c.value);}
 if(!held.has('steering'))root.querySelector('.wheel-art')?.style.setProperty('--turn',`${v.car.steering*110}deg`);
 root.querySelector('#car-route').textContent=v.roles.map(r=>`${r.name}: ${r.label}`).join(' · ');
}
