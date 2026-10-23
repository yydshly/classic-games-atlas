try{await import('./game.mjs');clearTimeout(window.quietBootTimer)}catch{clearTimeout(window.quietBootTimer);window.quietBootError()}
