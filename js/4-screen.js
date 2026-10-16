// ==========================================================
// 4-screen.js - builds the inputs: day tabs, hourly sales boxes, staff rows
// Uses: 1, 2, and update() from 6-update.js
// Provides: buildDays(), buildDay(), opts(), buildNames(), buildShifts()
// ==========================================================

// buildDays: the Mon..Sun tabs. Clicking one switches the selected day.
function buildDays(){
  $('days').innerHTML=DAYS.map((d,i)=>`<button data-d="${i}" aria-pressed="${i===st.cur}">${d}<small id="dsum${i}"></small></button>`).join('');
  $('days').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.cur=+b.dataset.d;
    $('days').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));buildDay();update()}));
}
// buildDay: fill the day section (tips, hourly sales/tips inputs, staff) for the selected day
function buildDay(){
  const d=day(),w=measure();
  $('dayPoolLbl').textContent=DAYS[st.cur]+' tips';$('dayPool').value=d.pool;
  $('dayResTitle').textContent='Split for '+DAYS[st.cur];
  $('hoursTitle').textContent=w==='tips'?'Tips per hour':'Sales per hour';
  $('hoursHint').textContent=`Total ${w} for the whole place in each hour, 10:00 to 01:00. You can also paste ${N} numbers from your POS.`;
  $('hours').innerHTML=hourly(d).map((v,i)=>`<label>${lbl(START+i)}–${lbl(START+i+1)}<input type="number" inputmode="decimal" min="0" data-i="${i}" value="${v}"></label>`).join('');
  $('hours').querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>{hourly(day())[+inp.dataset.i]=Math.max(0,parseFloat(inp.value)||0);update()}));
  $('paste').value='';$('pasteErr').hidden=true;
  $('copyBtn').disabled=st.cur===0;
  buildShifts();
}
// opts: <option> list of hours for the start/end dropdowns
function opts(from,to,sel){let o='';for(let h=from;h<=to;h++)o+=`<option value="${h}"${h===sel?' selected':''}>${lbl(h)}</option>`;return o}
// buildNames: list of names used this week (days and events), offered as suggestions when typing
function buildNames(){
  const seen={},add=p=>{const k=key(p.name||'');if(k&&!seen[k])seen[k]=p.name.trim()};
  st.days.forEach(d=>d.staff.forEach(add));st.events.forEach(ev=>ev.staff.forEach(add));
  $('names').innerHTML=Object.values(seen).map(n=>`<option value="${esc(n)}">`).join('');
}
// buildShifts: one row per person on the selected day: name, start, end, remove button
function buildShifts(){
  const d=day();
  $('shifts').innerHTML=d.staff.map((p,i)=>`<div class="shift">
    <input aria-label="Name" list="names" data-i="${i}" data-k="name" value="${esc(p.name)}" placeholder="Name" autocomplete="off">
    <select aria-label="Start" data-i="${i}" data-k="s">${opts(START,START+N-1,p.s)}</select>
    <select aria-label="End" data-i="${i}" data-k="e">${opts(START+1,START+N,p.e)}</select>
    <button class="x" aria-label="Remove ${esc(p.name||'person')}" data-rm="${i}">✕</button></div>`).join('')||'<p class="hint">Nobody added for this day yet.</p>';
  $('shifts').querySelectorAll('[data-k]').forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{
    const p=day().staff[+el.dataset.i];p[el.dataset.k]=el.dataset.k==='name'?el.value:+el.value;update()}));
  $('shifts').querySelectorAll('[data-k="name"]').forEach(el=>el.addEventListener('blur',buildNames));
  $('shifts').querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{day().staff.splice(+b.dataset.rm,1);buildShifts();update()}));
  buildNames();
}
