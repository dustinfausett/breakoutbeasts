const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current=null,labels='',send;
export function mountControlPanel(sender){
 send=sender;const root=document.querySelector('#control-room');
 root.innerHTML=`<div class="console-shell"><div class="console-top"><span>MOONLEAF EXIT CONTROL</span><span id="console-count"></span></div>
 <label class="breach-label">KEEPERS BREAK IN <span id="breach-time"></span><progress id="breach-bar" max="180" value="180"></progress></label>
 <header class="console-header"><div class="instruction-screen" role="status"><small>READ THIS TO YOUR TEAM</small><p id="panel-instruction"></p></div><button id="panel-power" class="power-switch" aria-label="Power on panel">POWER</button></header>
 <div id="panel-team" class="panel-team"></div><div id="panel-controls" class="panel-controls"></div>
 <p class="panel-note">Your screen describes someone else’s controls. Read aloud or type your clue below. Each operator must finish five tasks.</p>
 <div class="panel-chat"><ol id="panel-chat-log" aria-live="polite"></ol><form id="panel-chat-form"><input id="panel-chat-input" maxlength="180" placeholder="Tell your team what your screen says…" aria-label="Message to team"><button class="btn">Send</button></form></div>
 <button id="panel-leave" class="btn small">Leave this station</button></div>`;
 root.addEventListener('click',e=>{
  if(e.target.closest('#panel-power'))send({t:'panel',op:'power'});
  if(e.target.closest('#panel-leave'))send({t:'panel',op:'leave'});
  const b=e.target.closest('[data-control]');if(!b||!current)return;
  const i=Number(b.dataset.control),c=current.controls[i];
  const value=c.kind==='lever'?1-c.value:(c.value+Number(b.dataset.delta)+c.max+1)%(c.max+1);
  send({t:'panel',op:'set',control:i,value});
 });
 root.querySelector('#panel-chat-form').onsubmit=e=>{e.preventDefault();const input=root.querySelector('#panel-chat-input');if(input.value.trim())send({t:'chat',text:input.value.trim()});input.value='';};
}

export function updateControlPanel(panel){
 const root=document.querySelector('#control-room');root.hidden=!panel;current=panel;if(!panel)return;
 const hash=panel.controls.map(c=>c.label+c.kind).join('|');
 if(hash!==labels){
  labels=hash;root.querySelector('#panel-controls').innerHTML=panel.controls.map((c,i)=>`<section class="console-control" data-slot="${i}"><h3>${escape(c.label)}</h3>${c.kind==='dial'?`<div class="dial-face" aria-hidden="true"><i></i><span>0 · 1 · 2 · 3 · 4 · 5</span></div><div class="dial-actions"><button data-control="${i}" data-delta="-1" aria-label="Turn ${escape(c.label)} down">↶</button><output></output><button data-control="${i}" data-delta="1" aria-label="Turn ${escape(c.label)} up">↷</button></div>`:`<button class="lever-switch" data-control="${i}" aria-label="Toggle ${escape(c.label)}"><i></i></button><output></output>`}</section>`).join('');
 }
 root.querySelector('#console-count').textContent=`YOUR TASKS ${panel.done}/5`;
 root.querySelector('#breach-time').textContent=panel.phase==='waiting'?'Waiting for the team':`${Math.ceil(panel.remaining)}s${panel.paused?' · connection paused':''}`;
 const bar=root.querySelector('#breach-bar');bar.max=panel.limit;bar.value=panel.remaining;
 root.querySelector('#panel-power').disabled=!panel.ready||panel.powered||panel.phase!=='arming';
 root.querySelector('#panel-power').classList.toggle('flashing',panel.ready&&!panel.powered&&panel.phase==='arming');
 root.querySelector('#panel-power').textContent=panel.powered?'ON':'POWER';
 root.querySelector('#panel-instruction').textContent=panel.phase==='waiting'?'Choose any free door. Waiting for every animal to take a station.':!panel.powered?'Everyone is in place! Press your flashing red power button.':panel.phase==='arming'?'Panel powered. Waiting for the other operators to switch on.':panel.instruction?.text||'Your teammate has finished all five tasks. Keep helping the rest of the team!';
 root.querySelector('#panel-team').innerHTML=panel.team.map(p=>`<span class="${p.done===5?'finished':''}">${escape(p.name)} · ${p.inside?(p.powered?`${p.done}/5`:'at station'):'finding door'}</span>`).join('');
 panel.controls.forEach((c,i)=>{
  const slot=root.querySelector(`[data-slot="${i}"]`);slot.querySelector('output').textContent=c.kind==='lever'?(c.value?'UP':'DOWN'):String(c.value);
  slot.querySelectorAll('button').forEach(b=>b.disabled=panel.phase!=='running'||!panel.powered||panel.done>=5);
  const needle=slot.querySelector('.dial-face i');if(needle)needle.style.transform=`rotate(${-135+c.value*54}deg)`;
  slot.querySelector('.lever-switch')?.setAttribute('aria-pressed',String(!!c.value));
 });
 root.querySelector('#panel-leave').hidden=panel.phase!=='waiting';
}

export function addPanelChat(ev){
 const log=document.querySelector('#panel-chat-log');if(!log)return;
 const item=document.createElement('li');item.textContent=`${ev.name}: ${ev.text}`;log.append(item);
 while(log.children.length>20)log.firstChild.remove();log.scrollTop=log.scrollHeight;
}
