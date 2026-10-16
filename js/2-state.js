// ==========================================================
// 2-state.js - the saved data (st) and shortcuts for reading it
// Uses: empty() from 1-settings.js
// Provides: st, save(), $(), day(), okShift(), measure(), hourly(), sum(), dayTips(), weekTips()
// ==========================================================

// st holds everything: { mode: "day"|"week", measure: "sales"|"tips", weekPool, split,
// cur (selected day 0-6),
// days: [ { pool, sales[15], tips[15], staff: [ {name, s (start hour), e (end hour)} ] } x7 ],
// events: [ { name, date, pool, staff: [ {name} ] } ] }
// It is loaded from and saved to the browser so entries survive closing the page.
let st;
try{st=JSON.parse(localStorage.getItem('tipsplit-week-v2'))}catch(e){st=null}
// Nothing saved yet (or saved data is damaged): start with a blank week
if(!st||!Array.isArray(st.days)||st.days.length!==7)st=empty();
// Measure defaults to tips per hour unless sales was chosen.
// Data saved before the tips measure existed: give every day an empty tips list.
if(st.measure!=='sales')st.measure='tips';
st.days.forEach(d=>{if(!Array.isArray(d.tips)||d.tips.length!==N)d.tips=Array(N).fill(0)});
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
// dayTips(d) / weekTips() = the tips to split. In tips mode they are the total of the
// hourly tips (filled in automatically); in sales mode, the amounts typed into the tip boxes.
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
const dayTips=d=>measure()==='tips'?sum(d.tips):(parseFloat(d.pool)||0);
const weekTips=()=>measure()==='tips'?sum(st.days.map(d=>sum(d.tips))):(parseFloat(st.weekPool)||0);
