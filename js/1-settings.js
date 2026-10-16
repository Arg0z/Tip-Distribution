// ==========================================================
// 1-settings.js - fixed settings, small helpers and the blank week
// Uses: nothing (loaded first).
// Provides: START, N, DAYS, lbl, esc, key, empty()
// ==========================================================

// Opening hours: 15 one-hour slots starting at 10:00 (10:00-11:00 ... 00:00-01:00).
// Hours are stored as numbers 10..25, where 24 = 00:00 and 25 = 01:00 (next day).
const START=10,N=15,DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// lbl: turn an hour number into "HH:00"
const lbl=h=>String(h%24).padStart(2,'0')+':00';
// esc: escape text before putting it into HTML (prevents broken markup from names)
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// key: normalise a name so "Anna", " anna " and "ANNA" count as the same person
const key=n=>n.trim().toLowerCase().replace(/\s+/g,' ');
// empty: a blank week. Keeps the current tip settings (mode, "share each hour",
// sales/tips measure) if there are any; on a first visit (no saved data yet) it uses the defaults.
function empty(){return{mode:st&&st.mode==='week'?'week':'day',measure:st&&st.measure==='sales'?'sales':'tips',weekPool:0,split:!!(st&&st.split),cur:0,
  days:DAYS.map(()=>({pool:0,sales:Array(N).fill(0),tips:Array(N).fill(0),staff:[]})),events:[]}}
