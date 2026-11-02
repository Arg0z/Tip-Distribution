// ==========================================================
// 4-screen.js - builds the inputs in the "Day by day" section:
// day tabs, opening hours, hourly boxes (SPG, sales or tips) and the staff rows.
//
// These functions REBUILD parts of the page from st (they write fresh HTML and
// attach what happens when you type or click). They are only called when the layout
// has to change (another day picked, a person added/removed, hours changed...).
// Plain typing doesn't rebuild anything: it just updates st and calls update(),
// which recalculates the results. That way the box you're typing in keeps its cursor.
//
// Uses: 1, 2, and update() from 6-update.js
// Provides: buildDays(), inHours(), clampShifts(), buildDay(), buildNames(), buildShifts()
// ==========================================================

// buildDays: draw the Mon..Sun tabs. Under each day name there is a small total
// (<small id="dsum0"> etc.), filled in by update(). Clicking a tab selects that day:
// it is marked as pressed, and the day section is rebuilt for it.
function buildDays(){
  $('days').innerHTML=DAYS.map((d,i)=>`<button data-d="${i}" aria-pressed="${i===st.cur}">${d}<small id="dsum${i}"></small></button>`).join('');
  $('days').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.cur=+b.dataset.d;
    $('days').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));buildDay();update()}));
}

// inHours(d, h): time h moved inside day d's opening hours (opening time at the earliest,
// closing time at the latest)
const inHours=(d,h)=>Math.min(Math.max(h,d.open),d.close);
// clampShifts: move every shift on a day inside that day's opening hours.
// Example: open 11:00-23:00, a shift 10:30-18:00 becomes 11:00-18:00. Used whenever opening
// hours change or people are copied from another day, so the Start/End boxes always show
// the real saved times. (A shift that was entirely outside the new hours ends up with the
// same start and end, and gets the "end time must be after start time" warning.)
function clampShifts(d){d.staff.forEach(p=>{p.s=inHours(d,p.s);p.e=inHours(d,p.e)})}

// buildDay: fill the whole day section for the selected day.
function buildDay(){
  // d = the selected day, w = "tips" or "sales", n = number of open hours
  const d=day(),w=measure(),n=d.close-d.open;
  clampShifts(d);
  // Opening hours row: show "10:00 – 01:00" and grey out buttons that can't be used
  // (can't go before 06:00 or past 06:00 next day, and a day must keep at least 1 hour)
  $('openLbl').textContent=`${lbl(d.open)} – ${lbl(d.close)}`;
  $('earlierBtn').disabled=d.open<=START;$('laterBtn').disabled=d.close>=START+N;
  $('dropFirstBtn').disabled=$('dropLastBtn').disabled=n<=1;
  // Tip box and titles for this day
  $('dayPoolLbl').textContent=DAYS[st.cur]+' tips';$('dayPool').value=d.pool;
  $('dayResTitle').textContent='Split for '+DAYS[st.cur];
  $('xlsxDayBtn').textContent='Export '+DAYS[st.cur]+' to Excel';
  $('hoursTitle').textContent={spg:'Sales per game (SPG) per hour',sales:'Sales per hour',tips:'Tips per hour'}[w];
  $('hoursHint').textContent=w==='spg'
    ?`Sales per game for each hour, ${lbl(d.open)} to ${lbl(d.close)}, as shown in your POS. You can also paste ${n} numbers at once.`
    :`Total ${w} for the whole place in each hour, ${lbl(d.open)} to ${lbl(d.close)}. You can also paste ${n} numbers from your POS.`;
  // One number box per open hour, labelled e.g. "10:00–11:00".
  // data-i = the slot in the 24-slot grid, so typing knows where to save the number.
  $('hours').innerHTML=openVals(d).map((v,k)=>{const h=d.open+k;return `<label>${lbl(h)}–${lbl(h+1)}<input type="number" inputmode="decimal" min="0" data-i="${h-START}" value="${v}"></label>`}).join('');
  // Typing in an hour box saves the number (empty or negative counts as 0) and recalculates
  $('hours').querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>{hourly(day())[+inp.dataset.i]=Math.max(0,parseFloat(inp.value)||0);update()}));
  // Empty the paste box, and disable "Copy people from previous day" on Monday
  $('paste').value='';$('pasteErr').hidden=true;
  $('copyBtn').disabled=st.cur===0;
  buildShifts();
}

// buildNames: collect every name used this week (on any day or event) and offer them as
// suggestions while typing a name (the <datalist id="names"> in index.html). This helps
// spell names the same way every day, which is how the week total matches people up.
// Each person appears once, with the first spelling found.
function buildNames(){
  const seen={},add=p=>{const k=key(p.name||'');if(k&&!seen[k])seen[k]=p.name.trim()};
  st.days.forEach(d=>d.staff.forEach(add));st.events.forEach(ev=>ev.staff.forEach(add));
  $('names').innerHTML=Object.values(seen).map(n=>`<option value="${esc(n)}">`).join('');
}

// buildShifts: one row per person on the selected day: name box, Start and End time boxes
// (hours and minutes, e.g. 10:30) and a ✕ button to remove them.
// data-i = the person's position in the day's staff list; data-k = which field the input
// changes ("name", "s" for start, "e" for end).
function buildShifts(){
  const d=day();
  $('shifts').innerHTML=d.staff.map((p,i)=>`<div class="shift">
    <input aria-label="Name" list="names" data-i="${i}" data-k="name" value="${esc(p.name)}" placeholder="Name" autocomplete="off">
    <input type="time" aria-label="Start" data-i="${i}" data-k="s" value="${tm(p.s)}">
    <input type="time" aria-label="End" data-i="${i}" data-k="e" value="${tm(p.e)}">
    <button class="x" aria-label="Remove ${esc(p.name||'person')}" data-rm="${i}">✕</button></div>`).join('')||'<p class="hint">Nobody added for this day yet.</p>';
  // Typing a name saves it straight into st
  $('shifts').querySelectorAll('[data-k="name"]').forEach(el=>el.addEventListener('input',()=>{day().staff[+el.dataset.i].name=el.value;update()}));
  // Changing a time saves it as hours (10:30 -> 10.5). Times before 06:00 are after midnight
  // (fromTm adds 24), and an end time of 06:00 means 06:00 the next morning when that's the
  // only way it can come after the start. The time is then kept inside the opening hours;
  // if it had to be moved, the box shows the corrected time. A half-typed time is ignored.
  $('shifts').querySelectorAll('[data-k="s"],[data-k="e"]').forEach(el=>el.addEventListener('change',()=>{
    const d=day(),p=d.staff[+el.dataset.i],k=el.dataset.k;let h=fromTm(el.value);if(isNaN(h))return;
    if(k==='e'&&h<=p.s&&h+24<=START+N)h+=24;
    p[k]=inHours(d,h);if(p[k]!==h)el.value=tm(p[k]);update()}));
  // When you leave a name box, refresh the name suggestions so the new name is offered
  $('shifts').querySelectorAll('[data-k="name"]').forEach(el=>el.addEventListener('blur',buildNames));
  // ✕ removes that person from this day only
  $('shifts').querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{day().staff.splice(+b.dataset.rm,1);buildShifts();update()}));
  buildNames();
}
