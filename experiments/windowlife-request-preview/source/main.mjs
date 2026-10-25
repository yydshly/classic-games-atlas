import { mount } from './controller.mjs';
import { Renderer } from './view.mjs';
let storage;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
export const diagnostics = mount({ document, window, storage, requestFrame: callback => requestAnimationFrame(callback), Renderer });
