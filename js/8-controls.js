// ==========================================================
// 8-controls.js - what the fixed buttons and inputs do when used
// Uses: everything above, and init() from 10-start.js
// Provides: nothing (only attaches click/input handlers)
// ==========================================================

$('addBtn').addEventListener('click',()=>{day().staff.push({name:'',s:START,e:START+8});buildShifts();update();
  const ins=$('shifts').querySelectorAll('input');ins[ins.length-1].focus()});
$('copyBtn').addEventListener('click',()=>{if(!st.cur)return;
  if(day().staff.length&&!confirm('Replace the people on '+DAYS[st.cur]+' with '+DAYS[st.cur-1]+'\'s list?'))return;
  day().staff=JSON.parse(JSON.stringify(st.days[st.cur-1].staff));buildShifts();update()});
$('modeDay').addEventListener('click',()=>{st.mode='day';update()});
$('modeWeek').addEventListener('click',()=>{st.mode='week';update()});
// Measure busy hours by Sales or by Tips. Each keeps its own hourly numbers, so switching doesn't erase anything.
$('measureSales').addEventListener('click',()=>{st.measure='sales';buildDay();update()});
$('measureTips').addEventListener('click',()=>{st.measure='tips';buildDay();update()});
$('weekPool').addEventListener('input',e=>{st.weekPool=e.target.value;update()});
$('dayPool').addEventListener('input',e=>{day().pool=e.target.value;update()});
$('split').addEventListener('change',e=>{st.split=e.target.checked;update()});
// Paste: accept 15 numbers separated by commas, spaces or new lines (e.g. copied from a POS report)
$('pasteBtn').addEventListener('click',()=>{
  const nums=$('paste').value.split(/[\s,;]+/).map(t=>t.replace(/[^\d.]/g,'')).filter(Boolean).map(Number).filter(n=>!isNaN(n));
  if(nums.length!==N){$('pasteErr').hidden=false;$('pasteErr').textContent=`Found ${nums.length} numbers. Paste exactly ${N}, one per hour from 10:00 to 01:00.`;return}
  day()[measure()]=nums;buildDay();update()});
$('paste').addEventListener('input',()=>{$('pasteErr').hidden=true});
$('clearBtn').addEventListener('click',()=>{if(confirm('Clear all sales, people, tips and events for the week?')){st=empty();init()}});