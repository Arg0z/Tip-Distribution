// ==========================================================
// 5-events.js - the Events section: one card per event (party, catering...)
// Each event has its own tips, split equally between the people added to it.
// Uses: esc, key (1), st, $() (2), eventSplit(), money() (3), buildNames() (4), update() (6)
// Provides: newEvent(), buildEvents(), showEvents()
// ==========================================================

// newEvent: a blank event
const newEvent=()=>({name:'',date:'',pool:0,staff:[]});
// buildEvents: draw every event card (details, people, result table) and wire up its inputs.
// Only called when cards are added/removed or people are added/removed;
// typing just calls update(), which refreshes the results through showEvents().
function buildEvents(){
  $('events').innerHTML=st.events.map((ev,i)=>`<div class="event" data-ev="${i}">
    <div class="evgrid">
      <label class="evname">Event name<input data-f="name" value="${esc(ev.name)}" placeholder="e.g. Birthday party" autocomplete="off"></label>
      <label>Date<input type="date" data-f="date" value="${esc(ev.date)}"></label>
      <label>Tips<input type="number" inputmode="decimal" min="0" step="0.01" data-f="pool" value="${esc(ev.pool)}"></label>
    </div>
    <h4>Split between</h4>
    ${ev.staff.map((p,j)=>`<div class="evp"><input aria-label="Name" list="names" data-j="${j}" value="${esc(p.name)}" placeholder="Name" autocomplete="off"><button class="x" aria-label="Remove ${esc(p.name||'person')}" data-rmp="${j}">✕</button></div>`).join('')||'<p class="hint">Nobody added to this event yet.</p>'}
    <div class="row"><button data-addp>Add person</button><button data-rmev>Remove event</button></div>
    <p class="err" id="evErr${i}" hidden></p>
    <div class="tablewrap"><table>
      <thead><tr><th>Name</th><th>Share</th><th>Tips</th></tr></thead><tbody id="evRes${i}"></tbody>
    </table></div>
  </div>`).join('')||'<p class="hint">No events this week.</p>';
  $('events').querySelectorAll('.event').forEach(card=>{
    const i=+card.dataset.ev,ev=st.events[i];
    // event details: name, date, tips
    card.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('input',()=>{ev[el.dataset.f]=el.value;update()}));
    // people on the event
    card.querySelectorAll('[data-j]').forEach(el=>{
      el.addEventListener('input',()=>{ev.staff[+el.dataset.j].name=el.value;update()});
      el.addEventListener('blur',buildNames)});
    card.querySelectorAll('[data-rmp]').forEach(b=>b.addEventListener('click',()=>{ev.staff.splice(+b.dataset.rmp,1);buildEvents();update()}));
    card.querySelector('[data-addp]').addEventListener('click',()=>{ev.staff.push({name:''});buildEvents();update();
      const ins=$('events').querySelectorAll(`[data-ev="${i}"] [data-j]`);ins[ins.length-1].focus()});
    card.querySelector('[data-rmev]').addEventListener('click',()=>{
      if((ev.name||ev.staff.length||parseFloat(ev.pool))&&!confirm('Remove the event "'+(ev.name||'unnamed')+'"?'))return;
      st.events.splice(i,1);buildEvents();update()});
  });
  buildNames();
}
// showEvents: fill each event's result table and warnings (called from update)
function showEvents(evs){
  st.events.forEach((ev,i)=>{const tb=$('evRes'+i),err=$('evErr'+i);if(!tb)return;
    const list=evs[i],msgs=[];
    tb.innerHTML=list.map(x=>`<tr><td>${esc(x.name)}</td><td>${(100/list.length).toFixed(1)}%</td><td class="amt">${money(x.cents)}</td></tr>`).join('')
      ||'<tr><td colspan="3" style="color:var(--muted)">Add people to split this event\'s tips.</td></tr>';
    const ks=ev.staff.map(p=>key(p.name||'')).filter(Boolean),dup=[...new Set(ks.filter((k,n)=>ks.indexOf(k)!==n))];
    if(dup.length)msgs.push('Listed twice: '+dup.join(', ')+'. They are counted once.');
    if(ev.staff.some(p=>!key(p.name||'')))msgs.push('Someone has no name, so they get no share.');
    if((parseFloat(ev.pool)||0)>0&&!list.length)msgs.push('Tips entered but nobody to split them between.');
    err.hidden=!msgs.length;err.textContent=msgs.join(' ');
  });
}
// "Add event" button: new card at the bottom, cursor in its name box
$('addEvBtn').addEventListener('click',()=>{st.events.push(newEvent());buildEvents();update();
  const cards=$('events').querySelectorAll('.event');cards[cards.length-1].querySelector('[data-f="name"]').focus()});
