// ==========================================================
// 8-controls.js - what the fixed buttons and boxes do when used
//
// "Fixed" means they are written directly in index.html and never rebuilt (unlike the
// staff rows or event cards). Each line below says: when this is clicked/typed in,
// change st like this, then redraw. buildDay()/buildShifts() redraw the inputs when the
// layout changes; update() recalculates and redraws the results.
//
// Uses: everything above, and init() from 10-start.js
// Provides: nothing (only attaches click/input handlers)
// ==========================================================

// ---- Who worked ----
// "Add person": a new row starting at opening time, 8 hours long (or until closing if
// that's sooner), with the cursor put in its name box.
$('addBtn').addEventListener('click',()=>{const d=day();d.staff.push({name:'',s:d.open,e:Math.min(d.open+8,d.close)});buildShifts();update();
  const ins=$('shifts').querySelectorAll('input');ins[ins.length-1].focus()});
// "Copy people from previous day": replace this day's people with the day before's
// (names and times). Asks first if this day already has people. Times are then fitted
// into this day's opening hours. Not available on Monday (there's no day before).
// JSON.parse(JSON.stringify(...)) makes a separate copy, so editing one day later
// doesn't change the other.
$('copyBtn').addEventListener('click',()=>{if(!st.cur)return;
  if(day().staff.length&&!confirm('Replace the people on '+DAYS[st.cur]+' with '+DAYS[st.cur-1]+'\'s list?'))return;
  day().staff=JSON.parse(JSON.stringify(st.days[st.cur-1].staff));clampShifts(day());buildShifts();update()});

// ---- Opening hours ----
// Four buttons add or remove one hour at the start or end of the selected day.
// Limits: hours stay within the 06:00-06:00 grid, and a day keeps at least 1 hour.
// When an hour is removed, its SPG, sales and tips are set back to 0, so a number you can't
// see any more can never be counted by mistake (and adding the hour back starts at 0).
// buildDay() then fits any shifts that ran into the removed hour inside the new hours.
// clearHour(d, h): set hour h's SPG, sales and tips to 0 on day d
const clearHour=(d,h)=>{d.spg[h-START]=0;d.sales[h-START]=0;d.tips[h-START]=0};
// "+ Earlier": open one hour earlier
$('earlierBtn').addEventListener('click',()=>{const d=day();if(d.open>START){d.open--;buildDay();update()}});
// "+ Later": close one hour later
$('laterBtn').addEventListener('click',()=>{const d=day();if(d.close<START+N){d.close++;buildDay();update()}});
// "− First hour": open one hour later (the old first hour is cleared)
$('dropFirstBtn').addEventListener('click',()=>{const d=day();if(d.close-d.open>1){clearHour(d,d.open);d.open++;buildDay();update()}});
// "− Last hour": close one hour earlier (the old last hour is cleared)
$('dropLastBtn').addEventListener('click',()=>{const d=day();if(d.close-d.open>1){d.close--;clearHour(d,d.close);buildDay();update()}});

// ---- Tips settings ----
// "Pool per day" / "One pool for the week"
$('modeDay').addEventListener('click',()=>{st.mode='day';update()});
$('modeWeek').addEventListener('click',()=>{st.mode='week';update()});
// "Sales per game" / "Sales per hour" / "Tips per hour". Each keeps its own hourly
// numbers (spg, sales, tips), so switching doesn't erase anything. buildDay() swaps the
// hour boxes over.
$('measureSpg').addEventListener('click',()=>{st.measure='spg';buildDay();update()});
$('measureSales').addEventListener('click',()=>{st.measure='sales';buildDay();update()});
$('measureTips').addEventListener('click',()=>{st.measure='tips';buildDay();update()});
// Tip boxes (only typed in when measuring by SPG or sales; see update() in 6-update.js).
// The text is saved as typed and turned into a number when calculating.
$('weekPool').addEventListener('input',e=>{st.weekPool=e.target.value;update()});
$('dayPool').addEventListener('input',e=>{day().pool=e.target.value;update()});
// "Share each hour among the people working it" checkbox (see dayPoints in 3-calculations.js)
$('split').addEventListener('change',e=>{st.split=e.target.checked;update()});

// ---- Paste hourly numbers ----
// Fill all the hour boxes at once, e.g. from a POS report. The text is cut up at commas,
// semicolons, spaces and new lines; from each piece everything except digits and dots
// is removed (so "$120" or "120.50€" work), and empty pieces are dropped.
// There must be exactly one number per open hour, otherwise nothing is changed and a
// message says how many were found.
// Careful: because only digits and dots are kept, a minus sign is dropped ("-5" -> 5),
// and a thousands separator splits a number in two ("1,200" -> 1 and 200).
// fillFrom(list): put the pasted numbers into a day's list ('spg', 'sales' or 'tips')
function fillFrom(list){
  const nums=$('paste').value.split(/[\s,;]+/).map(t=>t.replace(/[^\d.]/g,'')).filter(Boolean).map(Number).filter(n=>!isNaN(n));
  const d=day(),n=d.close-d.open;
  if(nums.length!==n){$('pasteErr').hidden=false;$('pasteErr').textContent=`Found ${nums.length} numbers. Paste exactly ${n}, one per hour from ${lbl(d.open)} to ${lbl(d.close)}.`;return}
  // Put the numbers into the open hours, first number = first open hour
  nums.forEach((v,k)=>d[list][d.open-START+k]=v);buildDay();update()}
$('pasteBtn').addEventListener('click',()=>fillFrom(measure()));
// Hide the paste error as soon as the text is changed
$('paste').addEventListener('input',()=>{$('pasteErr').hidden=true});

// ---- Clear the week ----
// After confirming, start a blank week (see empty() in 1-settings.js: the tip settings and
// each day's opening hours are kept) and redraw the whole page.
$('clearBtn').addEventListener('click',()=>{if(confirm('Clear all sales, people, tips and events for the week?')){st=empty();init()}});
