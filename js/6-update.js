// ==========================================================
// 6-update.js - redraws all results after every change
//
// update() is the heart of the page: every time anything is typed, picked or clicked,
// it is called. It saves the week, recalculates everything from scratch with compute(),
// and refreshes every result on screen. Recalculating everything each time is simple
// and fast enough, and it means the screen can never show out-of-date numbers.
//
// Uses: compute() (3), showEvents() (5), drawChart() (7), helpers from 1 and 2
// Provides: update()
// ==========================================================

function update(){
  save();
  // Results for the whole week, plus shortcuts for the selected day:
  // d = the day, dp = its points per staff row, dc = its cents per staff row
  const {pts,dayCents,people,evs}=compute(),d=day(),dp=pts[st.cur],dc=dayCents[st.cur];
  const isWeek=st.mode==='week';

  // ---- Tips section: show which buttons are selected, and the matching explanations ----
  $('modeDay').setAttribute('aria-pressed',!isWeek);$('modeWeek').setAttribute('aria-pressed',isWeek);
  const w=measure();
  $('measureSales').setAttribute('aria-pressed',w==='sales');$('measureTips').setAttribute('aria-pressed',w==='tips');
  $('measureHint').textContent=w==='tips'?'An hour counts for more when more tips came in during it.':'An hour counts for more when the place sold more during it.';
  // "Pool per day" shows a tip box on each day; "One pool for the week" shows one week box
  $('weekPoolWrap').hidden=!isWeek;$('dayPoolWrap').hidden=isWeek;
  // Tip boxes: when measuring by tips, the tips to split ARE the hourly tips added up,
  // so the boxes show that total and can't be typed in (read-only, dashed outline).
  // When switching back to sales, the amounts that were typed before are put back.
  const auto=w==='tips';
  if(auto){$('dayPool').value=dayTips(d).toFixed(2);$('weekPool').value=weekTips().toFixed(2)}
  else if($('dayPool').readOnly){$('dayPool').value=d.pool;$('weekPool').value=st.weekPool}
  $('dayPool').readOnly=$('weekPool').readOnly=auto;
  $('dayPoolLbl').textContent=DAYS[st.cur]+(auto?' tips (total of hourly tips)':' tips');
  $('weekPoolLbl').textContent=auto?'Week tips (total of hourly tips)':'Week tip pool';
  $('modeHint').textContent=isWeek?'All tips from the week are split by everyone\'s total points, so busier days count for more.':'Each day\'s tips are split among the people who worked that day, then added up for the week.';

  // ---- Small totals under the day tabs ----
  // Pool per day: that day's tips. One pool for the week: the part of the week's tips
  // that ended up on that day. Rounded to WHOLE DOLLARS to fit the tab (exact amounts
  // are in the tables), and "–" for a day with nothing.
  DAYS.forEach((x,i)=>{const el=$('dsum'+i);if(el){const c=isWeek?dayCents[i].reduce((a,b)=>a+b,0):Math.round(dayTips(st.days[i])*100);el.textContent=c?Math.round(c/100):'–'}});

  // ---- Warnings under "Who worked" (for the selected day) ----
  const msgs=[];
  // Shifts whose end time isn't after the start time
  const bad=d.staff.filter(p=>!okShift(p)).map(p=>p.name||'Someone');
  if(bad.length)msgs.push(bad.join(', ')+': end time must be after start time.');
  // The same name twice on this day (allowed, e.g. a split shift: the hours are added together)
  const ks=d.staff.map(p=>key(p.name||'')).filter(Boolean),dup=[...new Set(ks.filter((k,i)=>ks.indexOf(k)!==i))];
  if(dup.length)msgs.push('Listed twice today: '+dup.join(', ')+'. Their hours will be added together.');
  // A shift with no name: it can't be matched to anyone in the week total
  if(d.staff.some(p=>!key(p.name||'')&&okShift(p)))msgs.push('Someone has no name, so their tips won\'t appear in the week total.');
  // Tips that can't be paid out, because nobody earned any points: no valid shifts, or
  // shifts only during hours where no sales/tips were entered (busy level 0).
  // Pool per day: checked day by day. One pool for the week: checked for the whole week.
  if(!isWeek){const lost=DAYS.filter((x,i)=>dayTips(st.days[i])>0&&!pts[i].some(r=>r.pts>0));
    if(lost.length)msgs.push('Tips entered but not paid out on '+lost.join(', ')+` (no valid shifts or no hourly ${w} entered).`);}
  else if(weekTips()>0&&!people.some(P=>P.pts>0))msgs.push(`Week tips entered but not paid out (no named shifts with hourly ${w} yet).`);
  $('shiftErr').hidden=!msgs.length;$('shiftErr').textContent=msgs.join(' ');

  // ---- "Split for <day>" table ----
  // One row per person with a valid shift: hours, points (rounded for display only),
  // share of the day's points in %, and their tips for the day.
  const tot=dp.reduce((a,r)=>a+r.pts,0);
  $('dayRes').innerHTML=d.staff.map((p,k)=>dp[k].hrs?`<tr><td>${esc(p.name||'—')}</td><td>${dp[k].hrs}</td><td>${Math.round(dp[k].pts).toLocaleString()}</td><td>${tot?(dp[k].pts/tot*100).toFixed(1):'0.0'}%</td><td class="amt">${money(Math.round(dc[k]))}</td></tr>`:'').join('')||'<tr><td colspan="5" style="color:var(--muted)">Nobody has a shift on this day yet.</td></tr>';

  // ---- Events: result table and warnings on each card ----
  showEvents(evs);

  // ---- Week total table ----
  // One row per person, highest total first: tips for each day ("–" if they didn't work
  // that day), events, hours and total. The Events column only appears when there is
  // at least one event. grand / hrsAll = everyone's totals added up, for the bottom rows.
  const hasEv=st.events.length>0;
  $('weekHead').innerHTML=`<tr><th>Name</th>${DAYS.map(x=>`<th>${x}</th>`).join('')}${hasEv?'<th>Events</th>':''}<th>Hours</th><th>Total</th></tr>`;
  let grand=0,hrsAll=0;
  people.sort((a,b)=>b.total-a.total);
  $('weekRes').innerHTML=people.map(P=>{grand+=P.total;hrsAll+=P.hrs;
    return `<tr><td>${esc(P.name)}</td>${P.days.map((c,i)=>`<td>${P.worked[i]?money(Math.round(c)):'–'}</td>`).join('')}${hasEv?`<td>${P.ev?money(P.ev):'–'}</td>`:''}<td>${P.hrs}</td><td class="amt">${money(P.total)}</td></tr>`}).join('')||`<tr><td colspan="${hasEv?11:10}" style="color:var(--muted)">Add people to a day or event to see the week total.</td></tr>`;

  // ---- Check rows at the bottom of the week table ----
  // These let you confirm that every cent entered was paid out:
  //   Paid out     = what people in the table actually receive, per day / events / total
  //   Tips entered = the tips that were entered, in the same columns
  //   Difference   = Paid out minus Tips entered: ✓ when equal, otherwise +/− the amount
  // With "One pool for the week", tips are split over the whole week, so a single day
  // can't be compared and its Difference shows "–". With "One pool for the week" AND
  // sales, tips are only entered as one weekly amount, so the day columns of
  // "Tips entered" show "–" too. All amounts here are in cents.
  const paidDay=DAYS.map((x,i)=>people.reduce((a,P)=>a+P.days[i],0)),paidEv=people.reduce((a,P)=>a+P.ev,0);
  const entDay=DAYS.map((x,i)=>isWeek&&w==='sales'?null:Math.round(dayTips(st.days[i])*100));
  const entEv=st.events.reduce((a,ev)=>a+Math.round(Math.max(0,parseFloat(ev.pool)||0)*100),0);
  const entAll=(isWeek?Math.round(weekTips()*100):entDay.reduce((a,c)=>a+c,0))+entEv;
  // diff(paid, entered): the text for one Difference cell (null = nothing to compare)
  const diff=(p,e)=>e===null?'–':p===e?'<span class="ok">✓</span>':`<span class="bad">${p>e?'+':'−'}${money(Math.abs(p-e))}</span>`;
  $('weekFoot').innerHTML=(people.length||entAll)?`<tr><td>Paid out</td>${paidDay.map(c=>`<td>${money(c)}</td>`).join('')}${hasEv?`<td>${money(paidEv)}</td>`:''}<td>${hrsAll}</td><td>${money(grand)}</td></tr>
    <tr class="check"><td>Tips entered</td>${entDay.map(c=>`<td>${c===null?'–':money(c)}</td>`).join('')}${hasEv?`<td>${money(entEv)}</td>`:''}<td></td><td>${money(entAll)}</td></tr>
    <tr class="check"><td>Difference</td>${DAYS.map((x,i)=>`<td>${isWeek?'–':diff(paidDay[i],entDay[i])}</td>`).join('')}${hasEv?`<td>${diff(paidEv,entEv)}</td>`:''}<td></td><td>${diff(grand,entAll)}</td></tr>`:'';
  // If the totals don't match, show a red line under the table saying by how much, with
  // the likely reasons, so they can be fixed. (The maths itself always splits the full
  // amount; a gap means some tips had nobody to go to.)
  const why=[];
  if(grand!==entAll){
    if(st.days.some(d=>d.staff.some(p=>!key(p.name||'')&&okShift(p))))why.push('someone has a shift but no name');
    if(!isWeek&&DAYS.some((x,i)=>dayTips(st.days[i])>0&&!pts[i].some(r=>r.pts>0)))why.push(`a day has tips but no shift during an hour with ${w} entered`);
    if(isWeek&&weekTips()>0&&!people.some(P=>P.pts>0))why.push('no named shifts with hourly numbers yet');
    if(st.events.some(ev=>(parseFloat(ev.pool)||0)>0&&!eventSplit(ev).length))why.push('an event has tips but nobody on it');
  }
  $('weekCheck').hidden=grand===entAll;
  $('weekCheck').textContent=grand===entAll?'':`Paid out is ${money(Math.abs(grand-entAll))} ${grand>entAll?'more':'less'} than entered`+(why.length?': '+why.join('; ')+'.':'.');

  // ---- Chart for the selected day ----
  drawChart(d);
}
