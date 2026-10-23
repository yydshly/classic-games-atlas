try{
 const app=await import('./game.mjs?ferry-r2');
 await app.init();
 clearTimeout(window.kineticBootTimer);
 document.querySelector('#loading').hidden=true;
 document.querySelector('#error').hidden=true;
 document.querySelector('#start').hidden=false;
}catch(error){
 clearTimeout(window.kineticBootTimer);
 console.warn('Dock scene could not start',error);
 window.kineticBootError();
}
