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
// Provides: buildDays(), clampShifts(), buildDay(), opts(), buildNames(), buildShifts()
// ==========================================================

// buildDays: draw the Mon..Sun tabs. Under each day name there is a small total
// (<small id="dsum0"> etc.), filled in by update(). Clicking a tab selects that day:
// it is marked as pressed, and the day section is rebuilt for it.
function buildDays(){
  $('days').innerHTML=DAYS.map((d,i)=>`<button data-d="${i}" aria-pressed="${i===st.cur}">${d}<small id="dsum${i}"></small></button>`).join('');
  $('days').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.cur=+b.dataset.d;
    $('days').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));buildDay();update()}));
}

// clampShifts: move every shift on a day inside that day's opening hours.
// The start is kept between opening and the last open hour, and the end between one hour
// after opening and closing time. Example: open 11:00-23:00, a shift 10:00-18:00 becomes
// 11:00-18:00. Used whenever opening hours change or people are copied from another day,
// so the Start/End dropdowns always show the real saved times.
function clampShifts(d){d.staff.forEach(p=>{p.s=Math.min(Math.max(p.s,d.open),d.close-1);p.e=Math.min(Math.max(p.e,d.open+1),d.close)})}

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

// opts: the list of times for a Start or End dropdown, from hour "from" to hour "to"
// (both included), with the hour "sel" already selected.
function opts(from,to,sel){let o='';for(let h=from;h<=to;h++)o+=`<option value="${h}"${h===sel?' selected':''}>${lbl(h)}</option>`;return o}

// buildNames: collect every name used this week (on any day or event) and offer them as
// suggestions while typing a name (the <datalist id="names"> in index.html). This helps
// spell names the same way every day, which is how the week total matches people up.
// Each person appears once, with the first spelling found.
function buildNames(){
  const seen={},add=p=>{const k=key(p.name||'');if(k&&!seen[k])seen[k]=p.name.trim()};
  st.days.forEach(d=>d.staff.forEach(add));st.events.forEach(ev=>ev.staff.forEach(add));
  $('names').innerHTML=Object.values(seen).map(n=>`<option value="${esc(n)}">`).join('');
}

// buildShifts: one row per person on the selected day: name box, Start and End dropdowns
// (limited to the day's opening hours) and a ✕ button to remove them.
// data-i = the person's position in the day's staff list; data-k = which field the input
// changes ("name", "s" for start, "e" for end).
function buildShifts(){
  const d=day();
  $('shifts').innerHTML=d.staff.map((p,i)=>`<div class="shift">
    <input aria-label="Name" list="names" data-i="${i}" data-k="name" value="${esc(p.name)}" placeholder="Name" autocomplete="off">
    <select aria-label="Start" data-i="${i}" data-k="s">${opts(d.open,d.close-1,p.s)}</select>
    <select aria-label="End" data-i="${i}" data-k="e">${opts(d.open+1,d.close,p.e)}</select>
    <button class="x" aria-label="Remove ${esc(p.name||'person')}" data-rm="${i}">✕</button></div>`).join('')||'<p class="hint">Nobody added for this day yet.</p>';
  // Typing a name / picking a time saves it straight into st (times are stored as numbers)
  $('shifts').querySelectorAll('[data-k]').forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{
    const p=day().staff[+el.dataset.i];p[el.dataset.k]=el.dataset.k==='name'?el.value:+el.value;update()}));
  // When you leave a name box, refresh the name suggestions so the new name is offered
  $('shifts').querySelectorAll('[data-k="name"]').forEach(el=>el.addEventListener('blur',buildNames));
  // ✕ removes that person from this day only
  $('shifts').querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{day().staff.splice(+b.dataset.rm,1);buildShifts();update()}));
  buildNames();
}
