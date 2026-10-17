// ==========================================================
// 3-calculations.js - the maths: busy level, points, and splitting money
//
// No screen code here, only numbers in -> numbers out. If you want to know WHY
// someone got the amount they got, this is the file to read.
//
// The method in short:
//   1. Busy level: for every open hour, take the hourly tips (or sales) and smooth
//      them with a 3-hour moving average (ma). A higher number = a busier hour.
//   2. Points: each person gets the busy level of every hour they worked, added up
//      (dayPoints). Working the rush earns more points than working a quiet hour.
//   3. Money: the tips are divided in proportion to points, in whole cents, so the
//      amounts always add up exactly to the tips entered (splitCents).
//   4. Events are separate: their tips are divided equally (eventSplit).
//
// All money is handled in whole CENTS (e.g. $12.34 is stored as 1234) so there are
// never any fractions of a cent and no floating-point rounding surprises.
//
// Uses: key (1), st, okShift, openVals, dayTips, weekTips (2)
// Provides: ma(), dayPoints(), splitCents(), money(), compute(), eventSplit()
// ==========================================================

// ma: centred 3-hour moving average (the "busy level").
// Each hour becomes the average of itself, the hour before and the hour after.
// The first and last open hours only have one neighbour, so they average 2 values.
// Example: hourly tips  20, 40, 90, 30
//          busy level   30, 50, 53.3, 60   ( (20+40)/2, (20+40+90)/3, (40+90+30)/3, (90+30)/2 )
// Why smooth? One big table can make a single hour look very busy by luck. The
// average shows how busy that part of the day really was, so it's fairer.
// s is the list of numbers for the open hours only (see openVals in 2-state.js).
const ma=s=>s.map((v,i)=>{const a=s.slice(Math.max(0,i-1),i+2);return a.reduce((x,y)=>x+y,0)/a.length});

// dayPoints: points and hours for every person on one day.
// Returns one {pts, hrs} per staff row, in the same order as d.staff.
//   hrs = length of the shift (end - start), as shown in the tables.
//   pts = the busy level of each hour worked, added up.
// Example (share each hour OFF): busy level 30, 50, 53.3, 60 for 10:00-14:00.
//   Ann works 10:00-12:00 -> 30 + 50   = 80 points
//   Bob works 11:00-14:00 -> 50 + 53.3 + 60 = 163.3 points
// If "share each hour" is ON, an hour's value is first divided by how many people were
// working it (count[]). In the example, 11:00-12:00 has Ann and Bob, so each gets 50/2 = 25
// for it: Ann = 30 + 25 = 55, Bob = 25 + 53.3 + 60 = 138.3.
// Only the day's opening hours count: any part of a shift before opening or after
// closing earns no points (inside() checks this). Shifts with the end before the start
// (okShift fails) get 0 hours and 0 points.
function dayPoints(d){
  // m = busy level for each open hour; count = people working each open hour (starts at 0)
  const m=ma(openVals(d)),count=m.map(()=>0),inside=h=>h>=d.open&&h<d.close;
  // First pass: count how many people work each hour (only needed for "share each hour")
  d.staff.forEach(p=>{if(okShift(p))for(let h=p.s;h<p.e;h++)if(inside(h))count[h-d.open]++});
  // Second pass: add up each person's points, hour by hour
  return d.staff.map(p=>{let pts=0,hrs=0;
    if(okShift(p)){hrs=p.e-p.s;for(let h=p.s;h<p.e;h++)if(inside(h)){const i=h-d.open;pts+=st.split?m[i]/count[i]:m[i]}}
    return{pts,hrs}});
}

// splitCents: divide an amount of money in proportion to weights (points), in whole cents.
// weights = a list of numbers (e.g. everyone's points), amount = dollars (e.g. 100.00).
// Returns a list of cents, one per weight, that ALWAYS adds up exactly to the amount.
// How (the "largest remainder" method):
//   1. Work out everyone's exact share in cents, e.g. 3333.33, 3333.33, 3333.33.
//   2. Round everyone DOWN to whole cents: 3333, 3333, 3333 -> that's 9999, 1 cent short.
//   3. Hand out the missing cents one at a time to the people whose share was cut the
//      most (largest decimal part), so nobody is ever more than 1 cent off their exact share.
// If all weights are 0 (no one earned points), nobody gets anything: the money is
// reported as "not paid out" on screen instead of being split arbitrarily.
function splitCents(weights,amount){
  // tot = total weight; c = the amount in whole cents (negative amounts count as 0)
  const tot=weights.reduce((a,b)=>a+b,0),c=Math.round(Math.max(0,amount)*100);
  if(!tot)return weights.map(()=>0);
  // raw = exact shares in cents, out = rounded down, left = cents still to hand out
  const raw=weights.map(w=>w/tot*c),out=raw.map(Math.floor);let left=c-out.reduce((a,b)=>a+b,0);
  // Sort by decimal part, biggest first, and give each of those one extra cent until none are left
  raw.map((r,i)=>({i,f:r%1})).sort((a,b)=>b.f-a.f).forEach(o=>{if(left>0){out[o.i]++;left--}});
  return out;
}
// money: turn cents into the text shown on screen, e.g. 1234 -> "12.34".
const money=c=>(c/100).toFixed(2);

// compute: work out the whole week's results. Called after every change.
// Steps:
//   1) Points for every person on every day (dayPoints).
//   2) Money for every shift:
//      - "Pool per day": each day's tips are split among that day's staff by their points.
//      - "One pool for the week": the week's tips are split by everyone's points for the
//        whole week (so a busy Saturday counts for more than a quiet Monday). Then each
//        person's week amount is split back over the days they worked, again by points
//        and in whole cents, so the day columns in the week table add up to their total.
//   3) Events: each event's tips split equally (eventSplit), kept in their own column.
//   4) people = one row per person for the week table. The same person on different days
//      and events is recognised by name (see key() in 1-settings.js).
// Returns:
//   pts      = points/hours per day per staff row: pts[day][row] = {pts, hrs}
//   dayCents = cents per day per staff row:          dayCents[day][row]
//   people   = [ {name, days[7] (cents per day), ev (event cents), hrs, pts,
//                 total (cents), worked[7] (true if they had a shift that day)} ]
//   evs      = the result of eventSplit() for each event
// Note: with "Pool per day", a shift with no name still gets its share of that day's tips
// (so other people's amounts don't jump while you're typing a name), but it can't appear
// in the week table, so that money shows up as "less than entered" in the check rows.
// With "One pool for the week", unnamed shifts are simply left out of the split.
function compute(){
  const pts=st.days.map(dayPoints),isWeek=st.mode==='week',evs=st.events.map(eventSplit);
  // people = the list of rows; idx = name key -> position in people
  const people=[],idx={};
  // addPerson: add a new row for this name, unless they already have one
  const addPerson=(k,name)=>{if(!(k in idx)){idx[k]=people.length;people.push({name,days:Array(7).fill(0),ev:0,hrs:0,pts:0,total:0,worked:Array(7).fill(false)})}};
  // Everyone with a name on any day or any event gets a row (first spelling seen is shown)
  st.days.forEach(d=>d.staff.forEach(p=>{const k=key(p.name||'');if(k)addPerson(k,p.name.trim())}));
  evs.forEach(list=>list.forEach(x=>addPerson(x.k,x.name)));
  // Pool per day: split each day's tips now. One pool for the week: start at 0, filled in below.
  const dayCents=st.days.map((d,i)=>isWeek?pts[i].map(()=>0):splitCents(pts[i].map(r=>r.pts),dayTips(d)));
  // slots[k] = the [day, row] of every valid shift belonging to person k.
  // While collecting them, add up each person's hours and points for the week.
  const slots=people.map(()=>[]);
  st.days.forEach((d,i)=>d.staff.forEach((p,j)=>{const k=key(p.name||'');if(!k||!okShift(p))return;const P=people[idx[k]];
    P.hrs+=pts[i][j].hrs;P.pts+=pts[i][j].pts;P.worked[i]=true;slots[idx[k]].push([i,j])}));
  if(isWeek){
    // t = each person's share of the week's tips, in cents, by their week points
    const t=splitCents(people.map(P=>P.pts),weekTips());
    // Spread each person's share back over their shifts, by the points of each shift
    people.forEach((P,k)=>{const c=splitCents(slots[k].map(([i,j])=>pts[i][j].pts),t[k]/100);slots[k].forEach(([i,j],n)=>dayCents[i][j]=c[n])});
  }
  // Add event tips to each person's events column
  evs.forEach(list=>list.forEach(x=>people[idx[x.k]].ev+=x.cents));
  // Fill in each person's day columns from their shifts, then their total (days + events)
  people.forEach((P,k)=>{slots[k].forEach(([i,j])=>P.days[i]+=dayCents[i][j]);P.total=P.days.reduce((a,b)=>a+b,0)+P.ev});
  return{pts,dayCents,people,evs};
}

// eventSplit: divide one event's tips equally between the named people on it, in whole
// cents (using splitCents with everyone weighted 1, so leftover cents are spread fairly:
// $100 between 3 people = 33.34, 33.33, 33.33).
// Someone listed twice is counted once; rows with no name are skipped.
// Returns [ {k (name key), name, cents}, ... ] in the order people were added.
function eventSplit(ev){
  // seen = name keys already on the list, so duplicates are skipped
  const seen={},list=[];
  ev.staff.forEach(p=>{const k=key(p.name||'');if(k&&!seen[k]){seen[k]=1;list.push({k,name:p.name.trim()})}});
  const c=splitCents(list.map(()=>1),parseFloat(ev.pool)||0);
  return list.map((x,n)=>({...x,cents:c[n]}));
}
