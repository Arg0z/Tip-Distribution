// ==========================================================
// 2-state.js - the saved data (st) and shortcuts for reading it
// Uses: empty() from 1-settings.js
// Provides: st, save(), $(), day(), okShift(), measure(), hourly(), openVals(), sum(), dayTips(), weekTips()
// ==========================================================

// st holds everything: { mode: "day"|"week", measure: "sales"|"tips", weekPool, split,
// cur (selected day 0-6),
// days: [ { pool, open (first hour), close (end of last hour), sales[24], tips[24],
//           staff: [ {name, s (start hour), e (end hour)} ] } x7 ],
// events: [ { name, date, pool, staff: [ {name} ] } ] }
// It is loaded from and saved to the browser so entries survive closing the page.
let st;
try{st=JSON.parse(localStorage.getItem('tipsplit-week-v2'))}catch(e){st=null}
// Nothing saved yet (or saved data is damaged): start with a blank week
if(!st||!Array.isArray(st.days)||st.days.length!==7)st=empty();
// Measure defaults to tips per hour unless sales was chosen.
// Data saved before the tips measure existed: give every day an empty tips list.
if(st.measure!=='sales')st.measure='tips';
// Data saved before each day had its own opening hours: the old grid was 15 hours from 10:00,
// so move those numbers into the right place in the new 24-hour grid.
st.days.forEach(d=>{
  if(d.open===undefined){d.open=OPEN;d.close=CLOSE;
    ['sales','tips'].forEach(k=>{const a=Array.isArray(d[k])?d[k]:[];d[k]=Array(N).fill(0);a.slice(0,15).forEach((v,i)=>d[k][10-START+i]=+v||0)})}
  ['sales','tips'].forEach(k=>{if(!Array.isArray(d[k])||d[k].length!==N)d[k]=Array(N).fill(0)})});
// Data saved before events existed: start with no events
if(!Array.isArray(st.events))st.events=[];
// Events saved when they still had start/end times: drop the times
st.events.forEach(ev=>{delete ev.start;delete ev.end});
// save: store state in the browser (wrapped in try/catch because storage can be blocked)
const save=()=>{try{localStorage.setItem('tipsplit-week-v2',JSON.stringify(st))}catch(e){}};
// Small shortcuts: $ = find element by id, day() = currently selected day, okShift = end after start
const $=id=>document.getElementById(id);
const day=()=>st.days[st.cur];
const okShift=p=>p.e>p.s;
// measure() = what the hourly numbers are: "sales" or "tips" (also the name of the list in each day)
// hourly(d) = the 15 hourly numbers used for that measure, e.g. d.sales or d.tips
const measure=()=>st.measure==='sales'?'sales':'tips';
const hourly=d=>d[measure()];
// openVals(d) = only the hourly numbers inside that day's opening hours (index 0 = first open hour)
const openVals=d=>hourly(d).slice(d.open-START,d.close-START);
// dayTips(d) / weekTips() = the tips to split. In tips mode they are the total of the
// hourly tips (filled in automatically); in sales mode, the amounts typed into the tip boxes.
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
const dayTips=d=>measure()==='tips'?sum(d.tips.slice(d.open-START,d.close-START)):(parseFloat(d.pool)||0);
const weekTips=()=>measure()==='tips'?sum(st.days.map(dayTips)):(parseFloat(st.weekPool)||0);
