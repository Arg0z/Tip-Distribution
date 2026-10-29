// ==========================================================
// 9-export.js - Export to Excel (the whole week, or one day)
//
// Builds real .xlsx files in the browser with the SheetJS library (loaded in
// index.html as window.XLSX) and hands them to you to save. Nothing is uploaded.
// Two buttons:
//   "Export to Excel" (under the week table) -> tip-split-week.xlsx with:
//       Week   = the whole week table: every person's tips per day, events, hours and
//                total, plus the Paid out / Tips entered / Difference check rows
//       Mon... = one sheet per day that has people on it (same as the day export below)
//       Events = every event's split (only if there are events)
//   "Export <day> to Excel" (under the day table) -> e.g. tip-split-Mon.xlsx with one
//       sheet: that day's split, and the hour-by-hour numbers it was based on.
// Money is written as real numbers (not text) with 2 decimals, so Excel can add it up.
//
// Uses: compute(), checkTotals(), ma() (3), st, measure(), okShift(), openVals(),
//       dayTips(), $() (2), DAYS, START, lbl (1)
// Provides: downloads, saveFile(), weekRows(), dayRows(), eventRows(), exportBook()
// ==========================================================

// downloads: how to save the file when the page runs inside Claude (see below); stays
// null anywhere else.
let downloads=null;
// Only show the export buttons if the SheetJS library actually loaded (it comes from the
// internet, so it can be missing when offline).
if(window.XLSX)$('xlsxBtn').hidden=$('xlsxDayBtn').hidden=false;
// When the page is opened inside Claude, files are saved through Claude's "downloads"
// feature (it asks you to confirm). Anywhere else (opened from disk or your own website)
// this does nothing and the normal browser download below is used.
(async()=>{try{if(window.claude&&claude.use)downloads=await claude.use('downloads')}catch(e){downloads=null}})();

// saveFile: hand the finished file (name + its bytes) to you to save.
async function saveFile(name,buf){
  // Inside Claude: use its save feature
  if(downloads)return downloads.save({filename:name,data:buf});
  // Normal browser: make a temporary link to the file, click it to start the download,
  // remove the link, and free the memory a second later.
  const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// ---- Cell helpers ----
// SheetJS accepts either a plain value or a cell object {t: type, v: value, z: number format}.
// null leaves the cell empty.
// xMoney(cents): a money cell, e.g. 1234 -> 12.34 shown with 2 decimals
const xMoney=c=>({t:'n',v:c/100,z:'0.00'});
// xNum(value, format): a number cell with an Excel number format, e.g. '0.0%'
const xNum=(v,z)=>({t:'n',v,z});
// xDiff(paid, entered): a Difference cell (in cents). Shows +1.06 / -1.06, or ✓ when they
// match. "–" when there is nothing to compare (entered is null).
const xDiff=(p,e)=>e===null?'–':({t:'n',v:(p-e)/100,z:'+0.00;-0.00;"✓"'});
// measureLabel(): the current busy-hours measure as shown on the buttons
const measureLabel=()=>({spg:'Sales per game',sales:'Sales per hour',tips:'Tips per hour'})[measure()];
// sheet(rows, widths): turn a list of rows into a sheet and set each column's width (in characters)
function sheet(rows,widths){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=widths.map(wch=>({wch}));return ws}

// ---- Sheet contents ----
// weekRows(r): the Week sheet, laid out like the week table on the page.
// r = the result of compute(). A few settings rows on top, then one row per person
// (highest total first; a day they didn't work is left empty), then the check rows.
function weekRows(r){
  const hasEv=st.events.length>0,isWeek=st.mode==='week';
  const ppl=[...r.people].sort((a,b)=>b.total-a.total),c=checkTotals(ppl);
  // ev(x): the Events column value, only when there are events
  const ev=x=>hasEv?[x]:[];
  const rows=[['Tip split – week'],['Tip pool',isWeek?'One pool for the week':'Pool per day'],
    ['Busy hours measured by',measureLabel()],['Share each hour',st.split?'On':'Off'],[],
    ['Name',...DAYS,...ev('Events'),'Hours','Total']];
  ppl.forEach(P=>rows.push([P.name,...P.days.map((x,i)=>P.worked[i]?xMoney(x):null),...ev(P.ev?xMoney(P.ev):null),P.hrs,xMoney(P.total)]));
  // Check rows, the same as under the table on the page (see checkTotals in 3-calculations.js)
  rows.push(['Paid out',...c.paidDay.map(xMoney),...ev(xMoney(c.paidEv)),ppl.reduce((a,P)=>a+P.hrs,0),xMoney(c.paidAll)]);
  rows.push(['Tips entered',...c.entDay.map(e=>e===null?'–':xMoney(e)),...ev(xMoney(c.entEv)),null,xMoney(c.entAll)]);
  rows.push(['Difference',...DAYS.map((x,i)=>isWeek?'–':xDiff(c.paidDay[i],c.entDay[i])),...ev(xDiff(c.paidEv,c.entEv)),null,xDiff(c.paidAll,c.entAll)]);
  return rows;
}

// dayRows(i, r): one day's sheet (i = 0 for Mon ... 6 for Sun, r = the result of compute()).
//   Top:    the day's opening hours, the settings, and the tips split that day
//   Middle: the split table - name, start, end, hours, points, share, tips - and a Total row
//   Bottom: hour by hour - the numbers entered (SPG, sales or tips), the busy level
//           (3-hour moving average) and how many people were working, so every
//           person's points can be checked by hand
function dayRows(i,r){
  const d=st.days[i],dp=r.pts[i],dc=r.dayCents[i],w=measure(),isWeek=st.mode==='week';
  // tot = everyone's points that day; cents = the tips actually split that day
  const tot=dp.reduce((a,x)=>a+x.pts,0),cents=dc.reduce((a,b)=>a+b,0);
  const rows=[[`${DAYS[i]} – tip split`],['Opening hours',`${lbl(d.open)} – ${lbl(d.close)}`],
    ['Busy hours measured by',measureLabel()],['Share each hour',st.split?'On':'Off'],
    isWeek?['Tips (this day\'s part of the week pool)',xMoney(cents)]:['Tips to split',xMoney(Math.round(dayTips(d)*100))],[],
    ['Name','Start','End','Hours','Points','Share','Tips']];
  // One row per person with a valid shift (the same rows as the table on the page)
  let hrs=0;
  d.staff.forEach((p,k)=>{if(!dp[k].hrs)return;hrs+=dp[k].hrs;
    rows.push([p.name||'—',lbl(p.s),lbl(p.e),dp[k].hrs,xNum(dp[k].pts,'#,##0.0'),xNum(tot?dp[k].pts/tot:0,'0.0%'),xMoney(dc[k])])});
  rows.push(['Total',null,null,hrs,xNum(tot,'#,##0.0'),xNum(tot?1:0,'0.0%'),xMoney(cents)]);
  // Hour by hour
  const m=ma(openVals(d));
  rows.push([],['Hour',{spg:'Sales per game',sales:'Sales',tips:'Tips'}[w],'Busy level','People working']);
  for(let h=d.open;h<d.close;h++){const j=h-START,busy=xNum(m[h-d.open],'0.00');
    // on = how many valid shifts include this hour
    const on=d.staff.filter(p=>okShift(p)&&p.s<=h&&h<p.e).length,hour=`${lbl(h)}–${lbl(h+1)}`;
    rows.push([hour,xNum(d[w][j],'0.00'),busy,on]);
  }
  return rows;
}

// eventRows(r): the Events sheet - one row per person per event (event name, date and
// the event's tips repeated on each row, so the sheet can be sorted or filtered).
// An event with nobody on it gets one row saying so.
function eventRows(r){
  const rows=[['Events'],[],['Event','Date','Event tips','Name','Share','Tips']];
  st.events.forEach((ev,i)=>{const list=r.evs[i],info=[ev.name||'Unnamed event',ev.date||'',xMoney(Math.round(Math.max(0,parseFloat(ev.pool)||0)*100))];
    if(!list.length)rows.push([...info,'(nobody on this event)',null,xMoney(0)]);
    list.forEach(x=>rows.push([...info,x.name,xNum(1/list.length,'0.0%'),xMoney(x.cents)]))});
  return rows;
}

// exportBook(sheets, filename, msg): build a workbook from [ [sheet name, sheet], ... ],
// save it, and show a short message in msg if saving fails (declining is not an error).
async function exportBook(sheets,name,msg){
  msg.hidden=true;
  const wb=XLSX.utils.book_new();sheets.forEach(([n,ws])=>XLSX.utils.book_append_sheet(wb,ws,n));
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  try{await saveFile(name,buf)}
  catch(e){const c=e&&e.code;if(c==='declined')return;
    msg.hidden=false;msg.textContent=c==='rate_limited'?'A save is already open. Try again in a moment.':'Excel export isn\'t available in this view.';
    }
}

// Column widths (in characters) for each kind of sheet
const DAY_COLS=[30,14,9,8,10,14,8],WEEK_COLS=[22,...DAYS.map(()=>9),9,7,10],EV_COLS=[24,12,11,18,8,10];

// "Export to Excel" under the week table: the Week sheet, then one sheet per day that has
// people on it, then Events (if any)
$('xlsxBtn').addEventListener('click',()=>{const r=compute();
  const sheets=[['Week',sheet(weekRows(r),WEEK_COLS)]];
  DAYS.forEach((x,i)=>{if(st.days[i].staff.length)sheets.push([x,sheet(dayRows(i,r),DAY_COLS)])});
  if(st.events.length)sheets.push(['Events',sheet(eventRows(r),EV_COLS)]);
  exportBook(sheets,'tip-split-week.xlsx',$('xlsxMsg'))});

// "Export <day> to Excel" under the day table: just the selected day
$('xlsxDayBtn').addEventListener('click',()=>{
  exportBook([[DAYS[st.cur],sheet(dayRows(st.cur,compute()),DAY_COLS)]],`tip-split-${DAYS[st.cur]}.xlsx`,$('xlsxDayMsg'))});
