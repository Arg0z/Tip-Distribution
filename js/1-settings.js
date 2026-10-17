// ==========================================================
// 1-settings.js - fixed settings, small helpers and the blank week
// Uses: nothing (loaded first).
// Provides: START, N, OPEN, CLOSE, DAYS, lbl, esc, key, empty()
// ==========================================================

// Hour grid: 24 one-hour slots starting at 06:00 (06:00-07:00 ... 05:00-06:00 next day).
// Hours are stored as numbers 6..30, where 24 = 00:00, 25 = 01:00 (next day) and so on.
// Each day has its own opening hours inside this grid (day.open .. day.close).
const START=6,N=24,DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// Default opening hours for a new day: 10:00 to 01:00
const OPEN=10,CLOSE=25;
// lbl: turn an hour number into "HH:00"
const lbl=h=>String(h%24).padStart(2,'0')+':00';
// esc: escape text before putting it into HTML (prevents broken markup from names)
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// key: normalise a name so "Anna", " anna " and "ANNA" count as the same person
const key=n=>n.trim().toLowerCase().replace(/\s+/g,' ');
// empty: a blank week. Keeps the current tip settings (mode, "share each hour",
// sales/tips measure) and each day's opening hours if there are any; on a first visit
// (no saved data yet) it uses the defaults.
function empty(){return{mode:st&&st.mode==='week'?'week':'day',measure:st&&st.measure==='sales'?'sales':'tips',weekPool:0,split:!!(st&&st.split),cur:0,
  days:DAYS.map((x,i)=>{const o=st&&st.days&&st.days[i];
    return{pool:0,open:o?o.open:OPEN,close:o?o.close:CLOSE,sales:Array(N).fill(0),tips:Array(N).fill(0),staff:[]}}),events:[]}}
