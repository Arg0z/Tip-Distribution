// ==========================================================
// 1-settings.js - fixed settings, small helpers and the blank week
//
// This file is loaded first, so it must not use anything from the other files
// (except inside empty(), which only runs later, once st exists).
// Everything here is a fixed value or a tiny "tool" function that the other
// files use over and over.
//
// Uses: nothing (loaded first).
// Provides: START, N, OPEN, CLOSE, DAYS, lbl, esc, key, empty()
// ==========================================================

// ---- The hour grid ----
// Every day is stored on the same grid of 24 one-hour slots, starting at 06:00:
//   slot 0 = 06:00-07:00, slot 1 = 07:00-08:00, ... slot 23 = 05:00-06:00 (next day).
// Hours themselves are stored as plain numbers that keep counting past midnight,
// so a shift can run "through" midnight without any special handling:
//   6 = 06:00, 12 = 12:00, 23 = 23:00, 24 = 00:00, 25 = 01:00, ... 30 = 06:00 next day.
// To go from an hour number to its slot in the grid, subtract START (e.g. hour 10 -> slot 4).
//
// Each day only USES part of this grid: its opening hours, from day.open (first hour
// the place is open) up to day.close (the moment it closes). Example: open=10, close=25
// means 10:00 to 01:00, i.e. 15 hours. Slots outside the opening hours are ignored.
//
// START = first hour of the grid, N = number of slots in the grid,
// DAYS = the short day names shown on the tabs (index 0 = Monday ... 6 = Sunday).
const START=6,N=24,DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// Opening hours given to a day that doesn't have any yet (first visit, or old saved data):
// 10:00 to 01:00. After that, each day keeps its own hours (see the Opening hours buttons).
const OPEN=10,CLOSE=25;

// ---- Small helpers ----
// lbl: turn an hour number into the text shown on screen, "HH:00".
// h%24 wraps hours past midnight back round: 24 -> "00:00", 25 -> "01:00".
const lbl=h=>String(h%24).padStart(2,'0')+':00';
// esc: make text safe to put inside HTML. Names are typed by people, and a name like
// "<b>Ann" or "Bob & Co" would otherwise break the page layout. Each special character
// is swapped for its HTML code (& -> &amp;, < -> &lt;, and so on), so it shows as text.
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// key: the "matching version" of a name, used to recognise the same person on different
// days and events. It removes spaces at the start/end, makes everything lower case and
// turns runs of spaces into one, so "Anna", " anna " and "ANNA" all become "anna".
// The name as typed is still what's shown on screen; key() is only used for matching.
const key=n=>n.trim().toLowerCase().replace(/\s+/g,' ');

// ---- The blank week ----
// empty: build a fresh, empty week (used on a first visit and by "Clear the week").
// It deliberately KEEPS the things that are settings rather than data for one week:
//   - tip pool type (per day / one pool for the week)
//   - what busy hours are measured by (tips / sales)
//   - "share each hour" on/off
//   - each day's opening hours (they're the regular schedule, not this week's data)
// Everything else starts at zero: tip amounts, hourly numbers, people and events.
// On a first visit there is no saved data yet (st is empty), so the defaults are used:
// pool per day, tips per hour, share each hour off, open 10:00-01:00 every day.
// The fields of the returned object are explained at the top of 2-state.js.
function empty(){return{mode:st&&st.mode==='week'?'week':'day',measure:st&&st.measure==='sales'?'sales':'tips',weekPool:0,split:!!(st&&st.split),cur:0,
  // one entry per day; o = that same day in the current week (if there is one), to copy its hours
  days:DAYS.map((x,i)=>{const o=st&&st.days&&st.days[i];
    return{pool:0,open:o?o.open:OPEN,close:o?o.close:CLOSE,sales:Array(N).fill(0),tips:Array(N).fill(0),staff:[]}}),events:[]}}
