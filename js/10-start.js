// ==========================================================
// 10-start.js - start-up: draws the page for the first time
// Must be loaded last, after every other file.
// Provides: init()
// ==========================================================

// init: draw everything from the current state (used on load, reset and clear)
function init(){buildDays();buildDay();buildEvents();$('split').checked=!!st.split;$('weekPool').value=st.weekPool;update()}
init();
