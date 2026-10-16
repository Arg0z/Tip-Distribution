// ==========================================================
// 3-calculations.js - the maths: busy level, points, and splitting money
// No screen code here, only numbers in -> numbers out.
// Uses: START, N, key (1), st, okShift, hourly, dayTips, weekTips (2)
// Provides: ma(), dayPoints(), splitCents(), money(), compute(), eventSplit()
// ==========================================================

// ma: centered 3-hour moving average. Each hour = average of itself, the hour before
// and the hour after (only 2 values at the first/last hour). This smooths out random
// spikes such as one big table, so it reflects how busy that part of the day was.
const ma=s=>s.map((v,i)=>{const a=s.slice(Math.max(0,i-1),Math.min(N,i+2));return a.reduce((x,y)=>x+y,0)/a.length});
// dayPoints: points and hours for every person on one day.
// Points = sum of the moving-average value for each hour worked.
// The hourly values are sales or tips per hour, depending on the measure setting.
// If "share each hour" is on, each hour's value is first divided by the
// number of people working that hour (count[]).
function dayPoints(d){
  const m=ma(hourly(d)),count=Array(N).fill(0);
  d.staff.forEach(p=>{if(okShift(p))for(let h=p.s;h<p.e;h++)count[h-START]++});
  return d.staff.map(p=>{let pts=0,hrs=0;
    if(okShift(p)){hrs=p.e-p.s;for(let h=p.s;h<p.e;h++){const i=h-START;pts+=st.split?m[i]/count[i]:m[i]}}
    return{pts,hrs}});
}
// splitCents: split an amount in proportion to weights, in whole cents.
// Rounds everyone down, then hands the leftover cents to those with the largest
// remainders, so the result always adds up exactly to the tip pool.
function splitCents(weights,amount){
  const tot=weights.reduce((a,b)=>a+b,0),c=Math.round(Math.max(0,amount)*100);
  if(!tot)return weights.map(()=>0);
  const raw=weights.map(w=>w/tot*c),out=raw.map(Math.floor);let left=c-out.reduce((a,b)=>a+b,0);
  raw.map((r,i)=>({i,f:r%1})).sort((a,b)=>b.f-a.f).forEach(o=>{if(left>0){out[o.i]++;left--}});
  return out;
}
// money: cents -> "12.34"
const money=c=>(c/100).toFixed(2);

// compute: the whole week's results.
// 1) points per person per day  2) money per person per day
//    - "Pool per day": each day's tips split among that day's staff
//    - "One pool for the week": the weekly pool split by everyone's total points,
//      then each person's total is split back over their shifts (in whole cents,
//      so the day columns always add up to the totals)
// 3) events: each event's tips split equally (see eventSplit), kept separate
// 4) people[] = one row per person (matched by name across days and events) with
//    tips per day, event tips (ev), total hours, total points and total tips.
function compute(){
  const pts=st.days.map(dayPoints),isWeek=st.mode==='week',evs=st.events.map(eventSplit);
  const people=[],idx={};
  const addPerson=(k,name)=>{if(!(k in idx)){idx[k]=people.length;people.push({name,days:Array(7).fill(0),ev:0,hrs:0,pts:0,total:0,worked:Array(7).fill(false)})}};
  st.days.forEach(d=>d.staff.forEach(p=>{const k=key(p.name||'');if(k)addPerson(k,p.name.trim())}));
  evs.forEach(list=>list.forEach(x=>addPerson(x.k,x.name)));
  const dayCents=st.days.map((d,i)=>isWeek?pts[i].map(()=>0):splitCents(pts[i].map(r=>r.pts),dayTips(d)));
  // slots[k] = the [day, row] of every valid shift belonging to person k
  const slots=people.map(()=>[]);
  st.days.forEach((d,i)=>d.staff.forEach((p,j)=>{const k=key(p.name||'');if(!k||!okShift(p))return;const P=people[idx[k]];
    P.hrs+=pts[i][j].hrs;P.pts+=pts[i][j].pts;P.worked[i]=true;slots[idx[k]].push([i,j])}));
  if(isWeek){
    const t=splitCents(people.map(P=>P.pts),weekTips());
    people.forEach((P,k)=>{const c=splitCents(slots[k].map(([i,j])=>pts[i][j].pts),t[k]/100);slots[k].forEach(([i,j],n)=>dayCents[i][j]=c[n])});
  }
  evs.forEach(list=>list.forEach(x=>people[idx[x.k]].ev+=x.cents));
  people.forEach((P,k)=>{slots[k].forEach(([i,j])=>P.days[i]+=dayCents[i][j]);P.total=P.days.reduce((a,b)=>a+b,0)+P.ev});
  return{pts,dayCents,people,evs};
}
// eventSplit: one event's tips split equally between the named people on it,
// in whole cents (each person counted once, even if listed twice).
// Returns [ {k (name key), name, cents} ] in the order people were added.
function eventSplit(ev){
  const seen={},list=[];
  ev.staff.forEach(p=>{const k=key(p.name||'');if(k&&!seen[k]){seen[k]=1;list.push({k,name:p.name.trim()})}});
  const c=splitCents(list.map(()=>1),parseFloat(ev.pool)||0);
  return list.map((x,n)=>({...x,cents:c[n]}));
}
