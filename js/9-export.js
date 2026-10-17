// ==========================================================
// 9-export.js - "Export to Excel"
//
// Builds a real .xlsx file in the browser with the SheetJS library (loaded in
// index.html as window.XLSX) and hands it to you to save. Nothing is uploaded.
//
// Uses: compute() (3), $() (2)
// Provides: downloads, saveFile(), fmtCols()
// ==========================================================

// downloads: how to save the file when the page runs inside Claude (see below); stays
// null anywhere else.
let downloads=null;
// Only show the button if the SheetJS library actually loaded (it comes from the
// internet, so it can be missing when offline).
if(window.XLSX)$('xlsxBtn').hidden=false;
// When the page is opened inside Claude, files are saved through Claude's "downloads"
// feature (it asks you to confirm). Anywhere else (opened from disk or your own website)
// this does nothing and the normal browser download below is used.
(async()=>{try{if(window.claude&&claude.use)downloads=await claude.use('downloads')}catch(e){downloads=null}})();

// saveFile: hand the finished file (name + its bytes) to you to save.
async function saveFile(name,buf){
  // Inside Claude: use its save feature
  if(downloads)return downloads.save({filename:name,data:buf});
  // Normal browser: make a temporary link to the file, click it to start the download,
  // remove the link, and free the memory a second later.
  const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// fmtCols(sheet, columns, format): give number cells in the listed columns (0 = column A)
// an Excel number format, e.g. '0.00' so 12.5 shows as 12.50. Row 1 (the headings) is skipped.
const fmtCols=(ws,cols,z)=>{const r=XLSX.utils.decode_range(ws['!ref']);for(let R=1;R<=r.e.r;R++)cols.forEach(C=>{const c=ws[XLSX.utils.encode_cell({r:R,c:C})];if(c&&c.t==='n')c.z=z})};

// "Export to Excel" button: a file "tip-split-week.xlsx" with one sheet, "Tips":
//   column A = Name, column B = Tips (their week total, days + events, in dollars),
//   highest first, with a Total row at the bottom.
// If saving fails, a short message explains why (declining the save is not an error).
$('xlsxBtn').addEventListener('click',async()=>{
  const msg=$('xlsxMsg');msg.hidden=true;
  const {pts,dayCents,people}=compute();
  people.sort((a,b)=>b.total-a.total);
  // wk = the rows of the sheet; totals are stored in cents, so divide by 100 for dollars
  const wk=[['Name','Tips']];
  people.forEach(P=>wk.push([P.name,P.total/100]));
  wk.push(['Total',people.reduce((a,P)=>a+P.total,0)/100]);
  // Turn the rows into a sheet, show column B with 2 decimals, set column widths
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
