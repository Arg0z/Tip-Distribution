// ==========================================================
// 2-state.js - the saved data (st) and shortcuts for reading it
//
// All the numbers and names you type are kept in ONE object called st ("state").
// This file loads st from the browser when the page opens, repairs data saved by
// older versions of the page, and offers short helper functions so the other files
// don't have to repeat the same lookups.
//
// Uses: START, N, OPEN, CLOSE, empty() from 1-settings.js
// Provides: st, save(), $(), day(), okShift(), measure(), hourly(), openVals(), sum(), dayTips(), weekTips()
// ==========================================================

// What st looks like:
// {
//   mode:     "day"  = each day's tips are split among that day's staff ("Pool per day")
//             "week" = all tips for the week are split in one go ("One pool for the week")
//   measure:  "tips" or "sales" - which hourly numbers decide how busy an hour was
//   weekPool: the week's tip amount typed in (only used for "One pool for the week" + sales)
//   split:    true/false - the "Share each hour among the people working it" checkbox
//   cur:      which day tab is selected, 0 = Mon ... 6 = Sun
//   days: 7 entries, Mon..Sun, each:
//     { pool:  that day's tip amount typed in (only used for "Pool per day" + sales)
//       open:  first hour the place is open, e.g. 10 = 10:00
//       close: the hour it closes, e.g. 25 = 01:00 next day (see the hour grid in 1-settings.js)
//       sales: 24 numbers, sales per hour, one per slot of the hour grid
//       tips:  24 numbers, tips per hour, same layout
//       staff: [ { name, s = start hour, e = end hour }, ... ]  e.g. {name:"Ann", s:10, e:18}
//     }
//   events: [ { name, date, pool = the event's tips, staff: [ {name}, ... ] }, ... ]
// }
// st is stored in the browser's localStorage (under the name 'tipsplit-week-v2'), so
// everything is still there after closing and reopening the page on the same device and
// browser. Nothing is sent anywhere.
let st;
// Read the saved week. JSON.parse turns the saved text back into an object. If the
// saved text is damaged, or the browser blocks storage, we just start with nothing.
try{st=JSON.parse(localStorage.getItem('tipsplit-week-v2'))}catch(e){st=null}
// Nothing saved yet, or the saved data doesn't look like a week (it must have 7 days):
// start with a blank week.
if(!st||!Array.isArray(st.days)||st.days.length!==7)st=empty();

// ---- Repairs for data saved by older versions of the page ----
// The measure is always "tips" unless "sales" was chosen. (Older saves have no measure
// at all; they get tips, the current default.)
if(st.measure!=='sales')st.measure='tips';
// Before each day had its own opening hours, every day ran 10:00-01:00 and the hourly
// lists had 15 numbers, the first one being 10:00. Those days get the default hours,
// and their 15 numbers are moved into the right slots of the new 24-slot grid
// (10:00 is slot 10-START = 4, so the old first number goes into slot 4, and so on).
// Afterwards, any hourly list that is missing or the wrong length is replaced with zeros,
// so the rest of the code can always count on 24 numbers.
st.days.forEach(d=>{
  if(d.open===undefined){d.open=OPEN;d.close=CLOSE;
    ['sales','tips'].forEach(k=>{const a=Array.isArray(d[k])?d[k]:[];d[k]=Array(N).fill(0);a.slice(0,15).forEach((v,i)=>d[k][10-START+i]=+v||0)})}
  ['sales','tips'].forEach(k=>{if(!Array.isArray(d[k])||d[k].length!==N)d[k]=Array(N).fill(0)})});
// Data saved before events existed: start with no events.
if(!Array.isArray(st.events))st.events=[];
// Events used to have start/end times; they don't any more, so remove them.
st.events.forEach(ev=>{delete ev.start;delete ev.end});

// save: write st back to the browser. Called by update() after every change, so nothing
// typed is lost. Wrapped in try/catch because some browsers (private windows, blocked
// site data) refuse storage; the page still works then, it just won't remember.
const save=()=>{try{localStorage.setItem('tipsplit-week-v2',JSON.stringify(st))}catch(e){}};

// ---- Shortcuts ----
// $('x'): find the element on the page with id="x" (see index.html for the ids).
const $=id=>document.getElementById(id);
// day(): the day currently selected with the tabs.
const day=()=>st.days[st.cur];
// okShift(p): true if a shift makes sense, i.e. the end time is after the start time.
// Shifts that fail this get no hours, no points and a warning on screen.
const okShift=p=>p.e>p.s;
// measure(): "sales" or "tips" - what the hourly numbers mean. It is also the name of
// the matching list inside each day (d.sales or d.tips), which is what hourly() uses.
const measure=()=>st.measure==='sales'?'sales':'tips';
// hourly(d): the full 24-slot list for the current measure, e.g. d.tips.
// Changing a number in this list changes the saved data.
const hourly=d=>d[measure()];
// openVals(d): only the numbers inside that day's opening hours, as a new, shorter list.
// Position 0 is the first open hour. Example: open=10, close=25 -> 15 numbers,
// position 0 = 10:00-11:00 ... position 14 = 00:00-01:00.
const openVals=d=>hourly(d).slice(d.open-START,d.close-START);

// ---- How much money there is to split ----
// sum(list): add up a list of numbers. Anything that isn't a number counts as 0.
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
// dayTips(d): the tips to split for one day.
//   - Measuring by tips: the total of that day's hourly tips during opening hours
//     (the tip box on screen is then filled in automatically and can't be typed in).
//   - Measuring by sales: the amount typed into that day's tip box.
const dayTips=d=>measure()==='tips'?sum(d.tips.slice(d.open-START,d.close-START)):(parseFloat(d.pool)||0);
// weekTips(): the tips to split for "One pool for the week".
//   - Measuring by tips: all seven days' hourly tips added together.
//   - Measuring by sales: the amount typed into the week tip box.
const weekTips=()=>measure()==='tips'?sum(st.days.map(dayTips)):(parseFloat(st.weekPool)||0);
