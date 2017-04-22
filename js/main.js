import * as Renderer from './renderer.js';
import { requestAnimationFrame, now } from './shims.js';
//import { document } from './shims-node.js';

const renderer = Renderer.create(document.getElementById('game'));

requestAnimationFrame(function frame(time) {
  requestAnimationFrame(frame);
  renderer.beginFrame(100, 100);
  renderer.fillPolygon([0, 100, 100, 100, 100, 0, 0, 0], 8, 0, 0, 0);
  //const start = now();
  renderer.fillPolygon([0, 100, 100, 100, 50, 0], 6, 128, 0, 255, Math.cos(time * 0.01) * 25, Math.sin(time * 0.01) * 25);
  //console.log(now() - start);
  renderer.commitFrame();
});

/*for(let i = 0; i < 10000; ++i) {
  renderer.beginFrame(100, 100);
  renderer.fillPolygon([0, 100, 100, 100, 50, 0], 128, 0, 255);
  renderer.commitFrame();
}*/
