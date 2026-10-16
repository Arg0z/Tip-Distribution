// ==========================================================
// 9-export.js - Export to Excel (needs the SheetJS library, window.XLSX)
// Uses: compute() (3), $() (2)
// Provides: downloads, saveFile(), fmtCols()
// ==========================================================

let downloads=null;
// If XLSX loaded, show the button. Inside Claude we also ask for the "downloads"
// capability; outside Claude (e.g. on your own website) we fall back to a normal
// browser download link.
if(window.XLSX)$('xlsxBtn').hidden=false;
(async()=>{try{if(window.claude&&claude.use)downloads=await claude.use('downloads')}catch(e){downloads=null}})();
// saveFile: hand the finished file to the browser
async function saveFile(name,buf){
  if(downloads)return downloads.save({filename:name,data:buf});      // inside Claude
  const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);                       // standalone page
}
const fmtCols=(ws,cols,z)=>{const r=XLSX.utils.decode_range(ws['!ref']);for(let R=1;R<=r.e.r;R++)cols.forEach(C=>{const c=ws[XLSX.utils.encode_cell({r:R,c:C})];if(c&&c.t==='n')c.z=z})};
// Export: one sheet "Tips" with two columns, Name and Tips (weekly total),
// highest first, plus a Total row. The viewer confirms before the file is saved.
$('xlsxBtn').addEventListener('click',async()=>{
  const msg=$('xlsxMsg');msg.hidden=true;
  const {pts,dayCents,people}=compute();
  people.sort((a,b)=>b.total-a.total);
  const wk=[['Name','Tips']];
  people.forEach(P=>wk.push([P.name,P.total/100]));
  wk.push(['Total',people.reduce((a,P)=>a+P.total,0)/100]);
  const wb=XLSX.utils.book_new(),s1=XLSX.utils.aoa_to_sheet(wk);
  fmtCols(s1,[1],'0.00');
  s1['!cols']=[{wch:18},{wch:12}];
  XLSX.utils.book_append_sheet(wb,s1,'Tips');
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  try{await saveFile('tip-split-week.xlsx',buf)}
  catch(e){const c=e&&e.code;if(c==='declined')return;
    msg.hidden=false;msg.textContent=c==='rate_limited'?'A save is already open. Try again in a moment.':'Excel export isn\'t available in this view.';
    }
});
