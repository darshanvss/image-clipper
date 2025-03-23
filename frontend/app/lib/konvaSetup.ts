'use client';

// This file ensures Konva is properly initialized only in browser environments
let Konva: any;

if (typeof window !== 'undefined') {
  // We're in the browser, safe to import Konva
  Konva = require('konva');
} else {
  // We're on the server, create a minimal mock
  Konva = {
    Stage: class {},
    Layer: class {},
    Line: class {},
    Image: class {},
  };
}

export default Konva; 