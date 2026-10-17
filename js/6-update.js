// ==========================================================
// 6-update.js - redraws all results after every change
// Uses: compute() (3), showEvents() (5), drawChart() (7), helpers from 1 and 2
// Provides: update()
// ==========================================================

// update: runs after every change. Saves, recalculates, and redraws the
// day results, warnings, day-tab totals, week table and chart.
function update(){
  save();
  const {pts,dayCents,people,evs}=compute(),d=day(),dp=pts[st.cur],dc=dayCents[st.cur];
  const isWeek=st.mode==='week';
  $('modeDay').setAttribute('aria-pressed',!isWeek);$('modeWeek').setAttribute('aria-pressed',isWeek);
  const w=measure();
  $('measureSales').setAttribute('aria-pressed',w==='sales');$('measureTips').setAttribute('aria-pressed',w==='tips');
  $('measureHint').textContent=w==='tips'?'An hour counts for more when more tips came in during it.':'An hour counts for more when the place sold more during it.';
  $('weekPoolWrap').hidden=!isWeek;$('dayPoolWrap').hidden=isWeek;
  // Tip boxes: in tips mode they show the total of the hourly tips and can't be typed in.
  // Switching back to sales mode puts the typed amounts back.
  const auto=w==='tips';
  if(auto){$('dayPool').value=dayTips(d).toFixed(2);$('weekPool').value=weekTips().toFixed(2)}
  else if($('dayPool').readOnly){$('dayPool').value=d.pool;$('weekPool').value=st.weekPool}
  $('dayPool').readOnly=$('weekPool').readOnly=auto;
  $('dayPoolLbl').textContent=DAYS[st.cur]+(auto?' tips (total of hourly tips)':' tips');
  $('weekPoolLbl').textContent=auto?'Week tips (total of hourly tips)':'Week tip pool';
  $('modeHint').textContent=isWeek?'All tips from the week are split by everyone\'s total points, so busier days count for more.':'Each day\'s tips are split among the people who worked that day, then added up for the week.';
  DAYS.forEach((x,i)=>{const el=$('dsum'+i);if(el){const c=isWeek?dayCents[i].reduce((a,b)=>a+b,0):Math.round(dayTips(st.days[i])*100);el.textContent=c?Math.round(c/100):'–'}});
  const msgs=[];
  const bad=d.staff.filter(p=>!okShift(p)).map(p=>p.name||'Someone');
  if(bad.length)msgs.push(bad.join(', ')+': end time must be after start time.');
  const ks=d.staff.map(p=>key(p.name||'')).filter(Boolean),dup=[...new Set(ks.filter((k,i)=>ks.indexOf(k)!==i))];
  if(dup.length)msgs.push('Listed twice today: '+dup.join(', ')+'. Their hours will be added together.');
  if(d.staff.some(p=>!key(p.name||'')&&okShift(p)))msgs.push('Someone has no name, so their tips won\'t appear in the week total.');
  // Tips that can't be paid out: a pool with no valid shifts, or shifts but no hourly sales/tips (0 points)
  if(!isWeek){const lost=DAYS.filter((x,i)=>dayTips(st.days[i])>0&&!pts[i].some(r=>r.pts>0));
    if(lost.length)msgs.push('Tips entered but not paid out on '+lost.join(', ')+` (no valid shifts or no hourly ${w} entered).`);}
  else if(weekTips()>0&&!people.some(P=>P.pts>0))msgs.push(`Week tips entered but not paid out (no named shifts with hourly ${w} yet).`);
  $('shiftErr').hidden=!msgs.length;$('shiftErr').textContent=msgs.join(' ');
  const tot=dp.reduce((a,r)=>a+r.pts,0);
  $('dayRes').innerHTML=d.staff.map((p,k)=>dp[k].hrs?`<tr><td>${esc(p.name||'—')}</td><td>${dp[k].hrs}</td><td>${Math.round(dp[k].pts).toLocaleString()}</td><td>${tot?(dp[k].pts/tot*100).toFixed(1):'0.0'}%</td><td class="amt">${money(Math.round(dc[k]))}</td></tr>`:'').join('')||'<tr><td colspan="5" style="color:var(--muted)">Nobody has a shift on this day yet.</td></tr>';
  showEvents(evs);
  // Week table. The Events column only appears when there is at least one event.
  const hasEv=st.events.length>0;
  $('weekHead').innerHTML=`<tr><th>Name</th>${DAYS.map(x=>`<th>${x}</th>`).join('')}${hasEv?'<th>Events</th>':''}<th>Hours</th><th>Total</th></tr>`;
  let grand=0,hrsAll=0;
  people.sort((a,b)=>b.total-a.total);
  $('weekRes').innerHTML=people.map(P=>{grand+=P.total;hrsAll+=P.hrs;
    return `<tr><td>${esc(P.name)}</td>${P.days.map((c,i)=>`<td>${P.worked[i]?money(Math.round(c)):'–'}</td>`).join('')}${hasEv?`<td>${P.ev?money(P.ev):'–'}</td>`:''}<td>${P.hrs}</td><td class="amt">${money(P.total)}</td></tr>`}).join('')||`<tr><td colspan="${hasEv?11:10}" style="color:var(--muted)">Add people to a day or event to see the week total.</td></tr>`;
  // Check rows: what was paid out vs the tips that were entered, per day, events and in total.
  // In "one pool for the week" with sales, tips are only entered as one weekly amount, so day columns show "–".
  const paidDay=DAYS.map((x,i)=>people.reduce((a,P)=>a+P.days[i],0)),paidEv=people.reduce((a,P)=>a+P.ev,0);
  const entDay=DAYS.map((x,i)=>isWeek&&w==='sales'?null:Math.round(dayTips(st.days[i])*100));
  const entEv=st.events.reduce((a,ev)=>a+Math.round(Math.max(0,parseFloat(ev.pool)||0)*100),0);
  const entAll=(isWeek?Math.round(weekTips()*100):entDay.reduce((a,c)=>a+c,0))+entEv;
  const diff=(p,e)=>e===null?'–':p===e?'<span class="ok">✓</span>':`<span class="bad">${p>e?'+':'−'}${money(Math.abs(p-e))}</span>`;
  $('weekFoot').innerHTML=(people.length||entAll)?`<tr><td>Paid out</td>${paidDay.map(c=>`<td>${money(c)}</td>`).join('')}${hasEv?`<td>${money(paidEv)}</td>`:''}<td>${hrsAll}</td><td>${money(grand)}</td></tr>
    <tr class="check"><td>Tips entered</td>${entDay.map(c=>`<td>${c===null?'–':money(c)}</td>`).join('')}${hasEv?`<td>${money(entEv)}</td>`:''}<td></td><td>${money(entAll)}</td></tr>
    <tr class="check"><td>Difference</td>${DAYS.map((x,i)=>`<td>${isWeek?'–':diff(paidDay[i],entDay[i])}</td>`).join('')}${hasEv?`<td>${diff(paidEv,entEv)}</td>`:''}<td></td><td>${diff(grand,entAll)}</td></tr>`:'';
  // Explain a mismatch so it can be fixed
  const why=[];
  if(grand!==entAll){
    if(st.days.some(d=>d.staff.some(p=>!key(p.name||'')&&okShift(p))))why.push('someone has a shift but no name');
    if(!isWeek&&DAYS.some((x,i)=>dayTips(st.days[i])>0&&!pts[i].some(r=>r.pts>0)))why.push(`a day has tips but no shift during an hour with ${w} entered`);
    if(isWeek&&weekTips()>0&&!people.some(P=>P.pts>0))why.push('no named shifts with hourly numbers yet');
    if(st.events.some(ev=>(parseFloat(ev.pool)||0)>0&&!eventSplit(ev).length))why.push('an event has tips but nobody on it');
  }
  $('weekCheck').hidden=grand===entAll;
  $('weekCheck').textContent=grand===entAll?'':`Paid out is ${money(Math.abs(grand-entAll))} ${grand>entAll?'more':'less'} than entered`+(why.length?': '+why.join('; ')+'.':'.');
  drawChart(d);
}
