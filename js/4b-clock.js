// ==========================================================
// 4b-clock.js - the clock window for picking a shift's Start or End time
//
// Each Start/End box has a small clock button. It opens a window with:
//   - two boxes at the top, [HH] : [MM], to type the hour (0-23) and minutes (0-59)
//   - a round clock face to tap or drag on:
//       hours:   outer ring 12, 1 ... 11 and inner ring 00, 13 ... 23 (24-hour clock);
//                hours the place isn't open that day are faded and can't be picked
//       minutes: 00, 05 ... 55 around the edge; tap or drag anywhere for any minute
//     Picking an hour switches the face to minutes, like a phone's clock.
//   - Cancel / OK. OK puts the time in the box and saves it (commitTime in 4-screen.js,
//     which also keeps it inside the opening hours and treats times before 06:00 as
//     after midnight).
// The boxes and the face stay in step: typing moves the hand, tapping fills in the boxes.
// Keys: Enter = OK, Esc = Cancel. Clicking the dimmed area outside the window = Cancel.
//
// Uses: lbl, tm, fromTm (1), $(), day() (2), commitTime() (4)
// Provides: CLOCK_ICON, openPicker(), closePicker()
// ==========================================================

// CLOCK_ICON: the small clock drawn on the button in each Start/End box
const CLOCK_ICON='<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/></svg>';

// ck = the window's state while it is open (null when closed):
//   el = the Start/End box it was opened for, mode = 'h' (picking hours) or 'm' (minutes),
//   H = hour 0-23, M = minutes 0-59
let ck=null;
// The clock face, in drawing units (it is a 256 x 256 square scaled to fit):
// centre, outer ring radius, inner ring radius (the 00/13-23 hours)
const CX=128,CY=128,R_OUT=100,R_IN=64;
const two=n=>String(n).padStart(2,'0');

// openHours(): the hours (0-23) the selected day is open, e.g. open 10:00-01:00 ->
// 10, 11 ... 23, 0, 1. The closing hour itself is included, so an end time can be picked.
function openHours(){const d=day(),s=new Set();for(let h=d.open;h<=d.close;h++)s.add(h%24);return s}

// openPicker(el): open the window for time box el, starting from the time already in it
// (or the opening time if the box can't be read)
function openPicker(el){
  const d=day(),t=fromTm(el.value),h=isNaN(t)?d.open:t;let H=Math.floor(h),M=Math.round((h-H)*60);
  if(M===60){H++;M=0}
  ck={el,mode:'h',H:H%24,M};
  const p=d.staff[+el.dataset.i];
  $('clockTitle').textContent=(el.dataset.k==='s'?'Start':'End')+' time'+(p&&p.name.trim()?' – '+p.name.trim():'');
  $('ckHint').textContent=`Open ${lbl(d.open)} – ${lbl(d.close)}. Times before 6:00 are after midnight.`;
  $('clockWrap').hidden=false;
  showClock();
  $('ckH').focus();$('ckH').select();
}
// closePicker(): close the window (without saving). Returns the box it was open for.
function closePicker(){const el=ck&&ck.el;ck=null;$('clockWrap').hidden=true;return el}

// at(angle, r): the point at that angle (degrees, 0 = 12 o'clock, clockwise) and distance from the centre
const at=(a,r)=>[CX+r*Math.sin(a*Math.PI/180),CY-r*Math.cos(a*Math.PI/180)];

// showClock(keep): redraw the window from ck. keep = the time box being typed in, whose text
// is left alone so the cursor doesn't jump while typing.
function showClock(keep){
  if(keep!=='H')$('ckH').value=two(ck.H);
  if(keep!=='M')$('ckM').value=two(ck.M);
  $('ckH').classList.toggle('on',ck.mode==='h');$('ckM').classList.toggle('on',ck.mode==='m');
  const open=openHours();let s=`<circle cx="${CX}" cy="${CY}" r="122" fill="var(--bg)"/>`;
  // Where the hand points: hours 1-12 on the outer ring, 0 and 13-23 on the inner ring
  const handA=ck.mode==='h'?(ck.H%12)*30:ck.M*6,handR=ck.mode==='h'&&(ck.H===0||ck.H>12)?R_IN:R_OUT,[hx,hy]=at(handA,handR);
  s+=`<line x1="${CX}" y1="${CY}" x2="${hx}" y2="${hy}" stroke="var(--accent)" stroke-width="2"/><circle cx="${CX}" cy="${CY}" r="4" fill="var(--accent)"/>`;
  s+=`<circle cx="${hx}" cy="${hy}" r="17" fill="var(--accent)"/>`;
  // A minute between the 5-minute marks (e.g. :07) gets a small dot in the middle of the knob
  if(ck.mode==='m'&&ck.M%5)s+=`<circle cx="${hx}" cy="${hy}" r="3" fill="var(--card)"/>`;
  if(ck.mode==='h'){
    for(let i=0;i<12;i++){
      const outer=i||12,inner=i?i+12:0;
      const [ox,oy]=at(i*30,R_OUT),[ix,iy]=at(i*30,R_IN);
      s+=`<text x="${ox}" y="${oy}" class="${open.has(outer)?'':'off'} ${ck.H===outer?'sel':''}">${outer}</text>`;
      s+=`<text x="${ix}" y="${iy}" class="in ${open.has(inner)?'':'off'} ${ck.H===inner?'sel':''}">${two(inner)}</text>`;
    }
  }else{
    for(let i=0;i<12;i++){const [x,y]=at(i*30,R_OUT);s+=`<text x="${x}" y="${y}" class="${ck.M===i*5?'sel':''}">${two(i*5)}</text>`}
  }
  $('ckDial').innerHTML=s;
}

// pick(e): the hour or minute under the pointer on the clock face
function pick(e){
  const r=$('ckDial').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*256-CX,y=(e.clientY-r.top)/r.height*256-CY;
  // a = angle from 12 o'clock, clockwise (0-360); dist = how far from the centre
  const a=(Math.atan2(x,-y)*180/Math.PI+360)%360,dist=Math.hypot(x,y);
  if(ck.mode==='h'){
    // nearest of the 12 positions; inner ring if closer to it than to the outer ring
    const i=Math.round(a/30)%12,H=dist<(R_OUT+R_IN)/2?(i?i+12:0):(i||12);
    if(!openHours().has(H))return false;   // closed hours can't be picked
    ck.H=H;
  }else ck.M=Math.round(a/6)%60;
  showClock();return true;
}
// Tapping or dragging on the face: follows the pointer while it's pressed. Letting go
// after picking an hour switches to minutes (tapping only a faded, closed hour doesn't).
// picked = whether this press has picked something yet
let dragging=false,picked=false;
$('ckDial').addEventListener('pointerdown',e=>{if(!ck)return;dragging=true;try{$('ckDial').setPointerCapture(e.pointerId)}catch(err){}picked=pick(e);e.preventDefault()});
$('ckDial').addEventListener('pointermove',e=>{if(dragging&&ck&&pick(e))picked=true});
$('ckDial').addEventListener('pointerup',e=>{if(!dragging||!ck)return;dragging=false;
  if(ck.mode==='h'&&picked){ck.mode='m';showClock();$('ckM').focus();$('ckM').select()}});

// The HH / MM boxes: clicking one switches the face to it; typing a valid number moves the
// hand. After 2 digits of hours, the cursor jumps to the minutes. Leaving a box tidies it
// (e.g. "7" -> "07"); text that isn't a valid hour/minute is put back to the last good one.
$('ckH').addEventListener('focus',()=>{if(!ck)return;ck.mode='h';showClock('H');$('ckH').select()});
$('ckM').addEventListener('focus',()=>{if(!ck)return;ck.mode='m';showClock('M');$('ckM').select()});
$('ckH').addEventListener('input',()=>{const v=$('ckH').value.replace(/\D/g,''),n=+v;
  if(v!==''&&n<=23){ck.H=n;showClock('H')}
  if(v.length===2){$('ckM').focus()}});
$('ckM').addEventListener('input',()=>{const v=$('ckM').value.replace(/\D/g,''),n=+v;
  if(v!==''&&n<=59){ck.M=n;showClock('M')}});
['ckH','ckM'].forEach(id=>$(id).addEventListener('blur',()=>{if(ck)showClock()}));

// OK: put the time in the box and save it. Cancel: close without changing anything.
function okPicker(){if(!ck)return;const el=ck.el,t=two(ck.H)+':'+two(ck.M);closePicker();el.value=t;commitTime(el);el.focus()}
function cancelPicker(){const el=closePicker();if(el)el.focus()}
$('ckOk').addEventListener('click',okPicker);
$('ckCancel').addEventListener('click',cancelPicker);
// Click on the dimmed area outside the window = Cancel
$('clockWrap').addEventListener('mousedown',e=>{if(e.target===$('clockWrap'))cancelPicker()});
// Enter = OK, Esc = Cancel (while the window is open)
document.addEventListener('keydown',e=>{if(!ck)return;
  if(e.key==='Enter'){e.preventDefault();okPicker()}else if(e.key==='Escape'){e.preventDefault();cancelPicker()}});
