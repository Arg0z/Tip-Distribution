// ==========================================================
// 9-export.js - Export to Excel (the whole week, or one day)
//
// Builds real .xlsx files in the browser with xlsx-js-style (loaded in index.html as
// window.XLSX) and hands them to you to save. Nothing is uploaded. xlsx-js-style is the
// SheetJS library plus support for cell colours, borders and bold text (cell.s), which the
// day sheets use. All money is in Canadian dollars (CAD).
// Two buttons:
//   "Export to Excel" (under the week table) -> tip-split-week.xlsx with:
//       Week   = the whole week table: every person's tips per day, events, hours and
//                total, plus the Paid out / Tips entered / Difference check rows
//       Mon... = one sheet per day that has people or events on it (same as the day export below)
//       Events = every event's split (only if there are events)
//   "Export <day> to Excel" (under the day table) -> e.g. tip-split-Mon.xlsx with one
//       sheet: that day's split, and the hour-by-hour numbers it was based on.
// Money is written as real numbers (not text) shown as CAD, e.g. $12.34, so Excel can add it up.
//
// Uses: compute(), checkTotals(), dayReport(), ma() (3), st, measure(), okShift(), openVals(),
//       dayTips(), $() (2), DAYS, START, lbl, tm (1)
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
// CAD: Excel's format for Canadian dollars (locale 1009 = English, Canada): $1,234.56, and
// negative amounts in red with a minus sign
const CAD='[$$-1009]#,##0.00;[RED]-[$$-1009]#,##0.00';
// BLANK0(format): the same number format with a third part that shows zero as nothing,
// e.g. CAD -> '...;[RED]-[$$-1009]#,##0.00;""' (Excel formats are positive;negative;zero)
const BLANK0=z=>z+';""';
// xMoney(cents): a money cell in Canadian dollars, e.g. 1234 -> $12.34
const xMoney=c=>({t:'n',v:c/100,z:CAD});
// xNum(value, format): a number cell with an Excel number format, e.g. '0.0%'
// xHrs(hours): hours as a plain number rounded to 2 decimals, e.g. 7.5 (7 h 30 min)
const xHrs=h=>Math.round(h*100)/100;
const xNum=(v,z)=>({t:'n',v,z});
// xDiff(paid, entered): a Difference cell (in cents), in CAD. Shows +$1.06 / -$1.06 (red), or ✓ when they
// match. "–" when there is nothing to compare (entered is null).
const xDiff=(p,e)=>e===null?'–':({t:'n',v:(p-e)/100,z:'+[$$-1009]#,##0.00;[RED]-[$$-1009]#,##0.00;"✓"'});
// measureLabel(): the current busy-hours measure as shown on the buttons
const measureLabel=()=>({spg:'Sales per game',sales:'Sales per hour',tips:'Tips per hour'})[measure()];
// ---- Cell colours and borders (the day sheets) ----
// Fill colours, as RGB hex codes:
//   title  = lime green (the "Mon – tip split" title)
//   label  = red (setting names and table headings)
//   value  = blue (setting values and the Total label)
//   name   = light blue (people's names; a paler shade of the Total label's blue, so the
//            names column and its Total read as one group)
//   money  = green (tips, and the hour labels)
//   check  = yellow ("Power BI" / "Verified By")
const FILL={title:'92D050',label:'FF0000',value:'8EA9DB',name:'DDEBF7',money:'70AD47',check:'FFFF00'};
// BOX: a thin black border on all four sides of a cell
const LINE={style:'thin',color:{rgb:'000000'}},BOX={top:LINE,bottom:LINE,left:LINE,right:LINE};
// paint(ws, row, fromCol, toCol, fill, bold, format): style a run of cells in one row
// (0 = row 1 / column A): thin border, plus an optional fill colour, bold text and number
// format. Cells that are still empty are created so their border and colour show:
//   - with a format (the box next to "Power BI"): a NUMBER cell holding 0, whose format
//     shows 0 as nothing (see BLANK0), so the box looks empty but is a real CAD-formatted
//     number cell - an amount typed into it in Excel shows as CAD
//   - otherwise: empty text
// (The library can't write a styled cell with no value at all, and an empty-text cell
// would make Excel treat what's typed into it as text and ignore the CAD format.)
function paint(ws,r,c1,c2,fill,bold,z){
  for(let c=c1;c<=c2;c++){const a=XLSX.utils.encode_cell({r,c}),cell=ws[a]||(ws[a]=z?{t:'n',v:0,z:BLANK0(z)}:{t:'s',v:''});
    if(z&&cell.z!==BLANK0(z))cell.z=z;
    cell.s={border:BOX,...(fill?{fill:{patternType:'solid',fgColor:{rgb:fill}}}:{}),...(bold?{font:{bold:true}}:{}),...(cell.z?{numFmt:cell.z}:{})}}
}
// sheet(rows, widths): turn a list of rows into a sheet and set each column's width (in
// characters). If the rows come with styling instructions (rows.paint, a list of
// [row, fromCol, toCol, fill, bold, format] - see dayRows), they are applied too.
function sheet(rows,widths){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=widths.map(wch=>({wch}));
  (rows.paint||[]).forEach(p=>paint(ws,...p));return ws}

// ---- Sheet contents ----
// rowBuilder(): an empty list of rows plus two helpers for filling it, used by every sheet:
//   add(row, ...styles) - add a row, with styles as [fromCol, toCol, fill, bold, format]
//                         (columns 0 = A, 1 = B ...); sheet() applies them once the sheet exists
//   set(name, value)    - a settings row: name in A (red, bold), value in B (blue)
function rowBuilder(){
  const rows=[];rows.paint=[];
  const add=(row,...styles)=>{styles.forEach(s=>rows.paint.push([rows.length,...s]));rows.push(row)};
  const set=(name,value)=>add([name,value],[0,0,FILL.label,true],[1,1,FILL.value]);
  return{rows,add,set};
}

// weekRows(r): the Week sheet, laid out like the week table on the page.
// r = the result of compute(). A few settings rows on top, then one row per person
// (highest total first; a day they didn't work is left empty), then the check rows.
// Styled like the day sheets: title lime | settings red/blue | headings red |
// names light blue | Total column green | Paid out / Tips entered labels blue |
// Difference label yellow | thin borders on every table cell.
function weekRows(r){
  const hasEv=st.events.length>0,isWeek=st.mode==='week';
  const ppl=[...r.people].sort((a,b)=>b.total-a.total),c=checkTotals(ppl);
  // ev(x): the Events column value, only when there are events
  const ev=x=>hasEv?[x]:[];
  // last = the Total column (A Name, B-H Mon-Sun, [Events], Hours, Total)
  const last=DAYS.length+(hasEv?3:2);
  const {rows,add,set}=rowBuilder();
  add(['Tip split – week'],[0,0,FILL.title,true]);
  set('Tip pool',isWeek?'One pool for the week':'Pool per day');
  set('Busy hours measured by',measureLabel());
  set('Share each hour',st.split?'On':'Off');
  rows.push([]);
  add(['Name',...DAYS,...ev('Events'),'Hours','Total'],[0,last,FILL.label,true]);
  ppl.forEach(P=>add([P.name,...P.days.map((x,i)=>P.worked[i]?xMoney(x):null),...ev(P.ev?xMoney(P.ev):null),xHrs(P.hrs),xMoney(P.total)],
    [0,0,FILL.name],[1,last-1],[last,last,FILL.money]));
  // Check rows, the same as under the table on the page (see checkTotals in 3-calculations.js)
  add(['Paid out',...c.paidDay.map(xMoney),...ev(xMoney(c.paidEv)),xHrs(ppl.reduce((a,P)=>a+P.hrs,0)),xMoney(c.paidAll)],
    [0,0,FILL.value,true],[1,last-1],[last,last,FILL.money]);
  add(['Tips entered',...c.entDay.map(e=>e===null?'–':xMoney(e)),...ev(xMoney(c.entEv)),null,xMoney(c.entAll)],
    [0,0,FILL.value,true],[1,last-1],[last,last,FILL.money]);
  add(['Difference',...DAYS.map((x,i)=>isWeek?'–':xDiff(c.paidDay[i],c.entDay[i])),...ev(xDiff(c.paidEv,c.entEv)),null,xDiff(c.paidAll,c.entAll)],
    [0,0,FILL.check,true],[1,last-1],[last,last,FILL.money]);
  return rows;
}

// dayRows(i, r): one day's sheet (i = 0 for Mon ... 6 for Sun, r = the result of compute()).
//   Top:    the day's opening hours, the settings, and the tips split that day
//   Middle: the split table - name, start, end, hours, points, share, tips - and a Total row;
//           if events were held that day, also H Events and I Total (tips + events), with a
//           row for anyone who only worked an event, and an "Event: <name>" row per event on top;
//           then "Power BI" (an empty box for the Power BI amount, in CAD) and
//           "Verified By" (an empty box for whoever checked it)
//   Bottom: hour by hour - the numbers entered (SPG, sales or tips), the busy level
//           (3-hour moving average) and how many people were working, so every
//           person's points can be checked by hand
// Every table cell gets a thin border, and the colours from FILL (see above):
//   A1 title lime | setting names red, values blue | headings red | names light blue |
//   tips green | Total label blue | Power BI / Verified By yellow | hour labels green
function dayRows(i,r){
  const d=st.days[i],dp=r.pts[i],dc=r.dayCents[i],w=measure(),isWeek=st.mode==='week';
  // tot = everyone's points that day; cents = the tips actually split that day
  const tot=dp.reduce((a,x)=>a+x.pts,0),cents=dc.reduce((a,b)=>a+b,0);
  // rows + the add / set helpers (see rowBuilder above)
  const {rows,add,set}=rowBuilder();
  add([`${DAYS[i]} – tip split`],[0,0,FILL.title,true]);
  // Settings: name in A (red), value in B (blue)
  set('Opening hours',`${lbl(d.open)} – ${lbl(d.close)}`);
  set('Busy hours measured by',measureLabel());
  set('Share each hour',st.split?'On':'Off');
  if(isWeek)set('Tips (this day\'s part of the week pool)',xMoney(cents));else set('Tips to split',xMoney(Math.round(dayTips(d)*100)));
  // Events held this day (their Day set to this day): one settings row each, and two more
  // columns in the split table - H Events (each person's event tips) and I Total (G + H)
  const rep=dayReport(i,r),hasEv=rep.events.length>0,last=hasEv?8:6;
  rep.events.forEach(e=>set('Event: '+e.name,xMoney(e.cents)));
  rows.push([]);
  // The split table (the same rows as the table on the page, from dayReport)
  add(['Name','Start','End','Hours','Points','Share','Tips',...(hasEv?['Events','Total']:[])],[0,last,FILL.label,true]);
  // A person who only worked an event has no shift, so Start/End/Hours/Points/Share/Tips stay empty
  rep.rows.forEach(x=>{const shift=x.s!==null;
    add([x.name,shift?tm(x.s):null,shift?tm(x.e):null,shift?xHrs(x.hrs):null,shift?xNum(x.pts,'#,##0.0'):null,shift?xNum(x.share,'0.0%'):null,shift?xMoney(x.tips):null,
      ...(hasEv?[x.ev?xMoney(x.ev):null,xMoney(x.total)]:[])],
      [0,0,FILL.name],[1,5],[6,last,FILL.money])});
  add(['Total',null,null,xHrs(rep.tot.hrs),xNum(tot,'#,##0.0'),xNum(tot?1:0,'0.0%'),xMoney(cents),...(hasEv?[xMoney(rep.tot.ev),xMoney(rep.tot.total)]:[])],
    [0,0,FILL.value,true],[1,5],[6,last,FILL.money]);
  // Sign-off boxes under the Share/Tips columns: the box next to "Power BI" is formatted
  // as CAD, so an amount typed into it shows as money
  add([null,null,null,null,null,'Power BI'],[5,5,FILL.check,true],[6,6,null,false,CAD]);
  add([null,null,null,null,null,'Verified By'],[5,5,FILL.check,true],[6,6]);
  rows.push([]);
  // Hour by hour
  const m=ma(openVals(d));
  add(['Hour',{spg:'Sales per game',sales:'Sales',tips:'Tips'}[w],'Busy level','People working'],[0,3,FILL.label,true]);
  for(let h=d.open;h<d.close;h++){const j=h-START,busy=xNum(m[h-d.open],'0.00');
    // on = how many valid shifts include at least part of this hour
    const on=d.staff.filter(p=>okShift(p)&&p.s<h+1&&p.e>h).length;
    add([hourLbl(h),xNum(d[w][j],'0.00'),busy,on],[0,0,FILL.money],[1,3]);
  }
  return rows;
}

// eventRows(r): the Events sheet - one row per person per event (event name, date, day and
// the event's tips repeated on each row, so the sheet can be sorted or filtered).
// An event with nobody on it gets one row saying so.
// Styled like the day sheets: title lime | headings red | event names light blue |
// Tips column green | a Total row (label blue) | thin borders on every table cell.
function eventRows(r){
  const {rows,add}=rowBuilder();
  add(['Events'],[0,0,FILL.title,true]);
  rows.push([]);
  add(['Event','Date','Day','Event tips','Name','Share','Tips'],[0,6,FILL.label,true]);
  let total=0;
  st.events.forEach((ev,i)=>{const list=r.evs[i],cents=Math.round(Math.max(0,parseFloat(ev.pool)||0)*100);
    const info=[ev.name||'Unnamed event',ev.date||'',ev.day===null?'–':DAYS[ev.day],xMoney(cents)];
    const style=[[0,0,FILL.name],[1,5],[6,6,FILL.money]];
    if(!list.length)add([...info,'(nobody on this event)',null,xMoney(0)],...style);
    list.forEach(x=>{total+=x.cents;add([...info,x.name,xNum(1/list.length,'0.0%'),xMoney(x.cents)],...style)})});
  add(['Total',null,null,null,null,null,xMoney(total)],[0,0,FILL.value,true],[1,5],[6,6,FILL.money]);
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
const DAY_COLS=[30,14,9,13,10,14,10,10,10],WEEK_COLS=[24,...DAYS.map(()=>10),10,7,10],EV_COLS=[24,12,7,11,18,8,10];

// "Export to Excel" under the week table: the Week sheet, then one sheet per day that has
// people or events on it, then Events (if any)
$('xlsxBtn').addEventListener('click',()=>{const r=compute();
  const sheets=[['Week',sheet(weekRows(r),WEEK_COLS)]];
  DAYS.forEach((x,i)=>{if(st.days[i].staff.length||st.events.some(ev=>ev.day===i))sheets.push([x,sheet(dayRows(i,r),DAY_COLS)])});
  if(st.events.length)sheets.push(['Events',sheet(eventRows(r),EV_COLS)]);
  exportBook(sheets,'tip-split-week.xlsx',$('xlsxMsg'))});

// "Export <day> to Excel" under the day table: just the selected day
$('xlsxDayBtn').addEventListener('click',()=>{
  exportBook([[DAYS[st.cur],sheet(dayRows(st.cur,compute()),DAY_COLS)]],`tip-split-${DAYS[st.cur]}.xlsx`,$('xlsxDayMsg'))});
