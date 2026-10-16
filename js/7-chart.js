// ==========================================================
// 7-chart.js - the "How busy the day was" SVG chart
// Uses: ma() (3), hourly(), measure() and helpers from 1 and 2
// Provides: drawChart()
// ==========================================================

// drawChart: SVG chart for the selected day. Grey bars = sales (or tips) per hour,
// blue line = moving average, shaded bars underneath = each person's shift.
function drawChart(d){
  const v0=hourly(d),m=ma(v0),on=d.staff.filter(okShift);
  const W=640,padL=44,padR=10,top=14,ch=170,rowH=22,H=top+ch+26+on.length*rowH+8;
  const max=Math.max(1,...v0,...m),cw=(W-padL-padR)/N,y=v=>top+ch-v/max*ch;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly ${measure()} for ${DAYS[st.cur]} with moving average line and shifts">`;
  for(let k=0;k<=3;k++){const v=max*k/3,yy=y(v);s+=`<line x1="${padL}" x2="${W-padR}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${padL-6}" y="${yy+4}" font-size="11" text-anchor="end" fill="var(--muted)">${Math.round(v)}</text>`}
  v0.forEach((v,i)=>{s+=`<rect x="${padL+i*cw+cw*.18}" y="${y(v)}" width="${cw*.64}" height="${top+ch-y(v)}" rx="3" fill="var(--bar)"/>`});
  s+=`<polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${m.map((v,i)=>`${padL+i*cw+cw/2},${y(v)}`).join(' ')}"/>`;
  for(let i=0;i<=N;i+=2)s+=`<text x="${padL+i*cw}" y="${top+ch+16}" font-size="11" text-anchor="middle" fill="var(--muted)">${lbl(START+i)}</text>`;
  on.forEach((p,r)=>{const yy=top+ch+26+r*rowH,x1=padL+(p.s-START)*cw,x2=padL+(p.e-START)*cw;
    s+=`<rect x="${x1}" y="${yy}" width="${x2-x1}" height="${rowH-6}" rx="5" fill="var(--accent-soft)"/><text x="${x1+6}" y="${yy+12}" font-size="11" fill="var(--ink)">${esc(p.name||'—')}</text>`});
  $('chart').innerHTML=s+'</svg>';
}
