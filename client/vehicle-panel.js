const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let last='';
export function mountVehiclePanel(send){const root=document.querySelector('#vehicle-panel');root.addEventListener('click',e=>{
 const b=e.target.closest('[data-car-control]');if(b)send({t:'vehicle',control:b.dataset.carControl,value:b.dataset.carValue});
 if(e.target.closest('[data-car-leave]'))send({t:'vehicle',op:'leave'});
});}
export function updateVehiclePanel(v){const root=document.querySelector('#vehicle-panel');root.hidden=!v;if(!v){last='';return;}
 const html=`<div class="panel car-console"><h2>GETAWAY WAGON</h2><p>Every animal has a job. Set your controls together, then hold steady while the wagon starts.</p><div class="car-team">${v.team.map(p=>`<span>${esc(p.name)}: ${p.connected?(p.inside?'aboard':'outside'):'reconnecting'}</span>`).join('')}</div><p class="car-status">${v.inCar}/${v.need} aboard · ${v.team.some(p=>!p.connected)?'Waiting for a teammate to reconnect':v.inCar<v.need?'Wait for everyone to climb in':'Crew ready — operate your controls'}</p>${v.controls.map(c=>`<section class="car-job"><h3>${esc(c.label)}</h3><p>Your job: <b>${esc(c.goal)}</b></p><div>${c.choices.map(value=>`<button class="btn ${value===c.value?'selected':''}" data-car-control="${c.id}" data-car-value="${esc(value)}" ${v.inCar<v.need||v.team.some(p=>!p.connected)?'disabled':''} aria-pressed="${value===c.value}">${esc(value)}</button>`).join('')}</div></section>`).join('')}<div class="car-role-status">${v.roles.map(r=>`<span>${r.ready?'✓':'○'} ${esc(r.name)} · ${esc(r.label)}</span>`).join('')}</div><label>Engine ready <progress max="3" value="${v.progress}"></progress></label><button class="btn small" data-car-leave>Climb back out</button></div>`;
 if(html!==last){root.innerHTML=html;last=html;}
}
