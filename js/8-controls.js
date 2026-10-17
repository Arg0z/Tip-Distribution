// ==========================================================
// 8-controls.js - what the fixed buttons and inputs do when used
// Uses: everything above, and init() from 10-start.js
// Provides: nothing (only attaches click/input handlers)
// ==========================================================

$('addBtn').addEventListener('click',()=>{const d=day();d.staff.push({name:'',s:d.open,e:Math.min(d.open+8,d.close)});buildShifts();update();
  const ins=$('shifts').querySelectorAll('input');ins[ins.length-1].focus()});
$('copyBtn').addEventListener('click',()=>{if(!st.cur)return;
  if(day().staff.length&&!confirm('Replace the people on '+DAYS[st.cur]+' with '+DAYS[st.cur-1]+'\'s list?'))return;
  day().staff=JSON.parse(JSON.stringify(st.days[st.cur-1].staff));clampShifts(day());buildShifts();update()});
// Opening hours: add/remove an hour at the start or end of the selected day.
// A removed hour's sales and tips are cleared so they can't count by mistake.
const clearHour=(d,h)=>{d.sales[h-START]=0;d.tips[h-START]=0};
$('earlierBtn').addEventListener('click',()=>{const d=day();if(d.open>START){d.open--;buildDay();update()}});
$('laterBtn').addEventListener('click',()=>{const d=day();if(d.close<START+N){d.close++;buildDay();update()}});
$('dropFirstBtn').addEventListener('click',()=>{const d=day();if(d.close-d.open>1){clearHour(d,d.open);d.open++;buildDay();update()}});
$('dropLastBtn').addEventListener('click',()=>{const d=day();if(d.close-d.open>1){d.close--;clearHour(d,d.close);buildDay();update()}});
$('modeDay').addEventListener('click',()=>{st.mode='day';update()});
$('modeWeek').addEventListener('click',()=>{st.mode='week';update()});
// Measure busy hours by Sales or by Tips. Each keeps its own hourly numbers, so switching doesn't erase anything.
$('measureSales').addEventListener('click',()=>{st.measure='sales';buildDay();update()});
$('measureTips').addEventListener('click',()=>{st.measure='tips';buildDay();update()});
$('weekPool').addEventListener('input',e=>{st.weekPool=e.target.value;update()});
$('dayPool').addEventListener('input',e=>{day().pool=e.target.value;update()});
$('split').addEventListener('change',e=>{st.split=e.target.checked;update()});
// Paste: accept one number per open hour separated by commas, spaces or new lines (e.g. copied from a POS report)
$('pasteBtn').addEventListener('click',()=>{
  const nums=$('paste').value.split(/[\s,;]+/).map(t=>t.replace(/[^\d.]/g,'')).filter(Boolean).map(Number).filter(n=>!isNaN(n));
  const d=day(),n=d.close-d.open;
  if(nums.length!==n){$('pasteErr').hidden=false;$('pasteErr').textContent=`Found ${nums.length} numbers. Paste exactly ${n}, one per hour from ${lbl(d.open)} to ${lbl(d.close)}.`;return}
  nums.forEach((v,k)=>hourly(d)[d.open-START+k]=v);buildDay();update()});
$('paste').addEventListener('input',()=>{$('pasteErr').hidden=true});
$('clearBtn').addEventListener('click',()=>{if(confirm('Clear all sales, people, tips and events for the week?')){st=empty();init()}});