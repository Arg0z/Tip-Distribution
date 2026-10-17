// ==========================================================
// 10-start.js - start-up: draws the page for the first time
//
// Must be loaded LAST, after every other file, because it calls functions from all
// of them. Until this runs, the page only shows the empty layout from index.html.
//
// Provides: init()
// ==========================================================

// init: draw the whole page from st - the day tabs, the selected day, the event cards,
// the "share each hour" checkbox and the week tip box - then calculate and show all
// results. Used when the page opens, and again after "Clear the week".
function init(){buildDays();buildDay();buildEvents();$('split').checked=!!st.split;$('weekPool').value=st.weekPool;update()}
init();
