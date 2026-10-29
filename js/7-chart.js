// ==========================================================
// 7-chart.js - the "How busy the day was" chart
//
// The chart is drawn as SVG (a picture described in text, which the browser draws).
// It's rebuilt from scratch by update() after every change.
//
// Uses: ma() (3), openVals(), measure() and helpers from 1 and 2
// Provides: drawChart()
// ==========================================================

// drawChart: the chart for one day, covering only its opening hours.
//   Grey bars        = the hourly values: sales per game, sales or tips
//   Blue line        = the busy level (3-hour moving average) that points are based on
//   Shaded bars below = one row per person, showing when their shift was
// Seeing the shift bars under the blue line makes it easy to check who worked the rush.
function drawChart(d){
  // v0 = hourly numbers, m = busy level, on = shifts that make sense, n = number of hours
  const v0=openVals(d),m=ma(v0),on=d.staff.filter(okShift),n=v0.length;
  // Sizes in drawing units (the SVG scales to the width of the screen):
  // W = width, padL/padR = space left/right (left has room for the scale numbers),
  // top = space above, ch = chart height, rowH = height of each shift row,
  // H = total height: chart + time labels + one row per shift
  const W=640,padL=44,padR=10,top=14,ch=170,rowH=22,H=top+ch+26+on.length*rowH+8;
  // max = the highest value, which reaches the top of the chart (at least 1, so an empty
  // day doesn't divide by zero); cw = width of one hour; y(v) = how far down value v is drawn
  const max=Math.max(1,...v0,...m),cw=(W-padL-padR)/n,y=v=>top+ch-v/max*ch;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly ${measure()==='spg'?'sales per game':measure()} for ${DAYS[st.cur]} with moving average line and shifts">`;
  // 4 horizontal guide lines (0, 1/3, 2/3 and the max) with their value on the left
  for(let k=0;k<=3;k++){const v=max*k/3,yy=y(v);s+=`<line x1="${padL}" x2="${W-padR}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${padL-6}" y="${yy+4}" font-size="11" text-anchor="end" fill="var(--muted)">${Math.round(v)}</text>`}
  // One grey bar per hour (64% of the hour's width, centred)
  v0.forEach((v,i)=>{s+=`<rect x="${padL+i*cw+cw*.18}" y="${y(v)}" width="${cw*.64}" height="${top+ch-y(v)}" rx="3" fill="var(--bar)"/>`});
  // The busy-level line, through the middle of each hour
  s+=`<polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${m.map((v,i)=>`${padL+i*cw+cw/2},${y(v)}`).join(' ')}"/>`;
  // Time labels along the bottom: every hour, or every 2 hours on long days so they don't overlap
  for(let i=0;i<=n;i+=n>12?2:1)s+=`<text x="${padL+i*cw}" y="${top+ch+16}" font-size="11" text-anchor="middle" fill="var(--muted)">${lbl(d.open+i)}</text>`;
  // One shaded bar per shift, from its start to its end time, with the person's name on it
  on.forEach((p,r)=>{const yy=top+ch+26+r*rowH,x1=padL+(p.s-d.open)*cw,x2=padL+(p.e-d.open)*cw;
    s+=`<rect x="${x1}" y="${yy}" width="${x2-x1}" height="${rowH-6}" rx="5" fill="var(--accent-soft)"/><text x="${x1+6}" y="${yy+12}" font-size="11" fill="var(--ink)">${esc(p.name||'—')}</text>`});
  $('chart').innerHTML=s+'</svg>';
}
