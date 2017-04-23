import * as Renderer from './renderer.js';
import { requestAnimationFrame, now } from './shims.js';
//import { document } from './shims-node.js';

const renderer = Renderer.create(document.getElementById('game'));

const circle = [];
for(let i = 0; i < 180*2; ++i) {
  circle.push(Math.cos(i * Math.PI / 180) * 50 + 50, Math.sin(i * Math.PI / 180) * 50 + 50);
}

requestAnimationFrame(function frame(time) {
  requestAnimationFrame(frame);
  renderer.beginFrame(100, 100);
  renderer.fillPolygon([0, 100, 100, 100, 100, 0, 0, 0], 0, 0, 0);
  //const start = now();
  renderer.strokePolygon(circle, 128, 0, 255/*, Math.cos(time * 0.005) * 25, Math.sin(time * 0.005) * 25*/);
  //console.log(now() - start);
  renderer.commitFrame();
});

/*for(let i = 0; i < 10000; ++i) {
  renderer.beginFrame(100, 100);
  renderer.fillPolygon([0, 100, 100, 100, 50, 0], 128, 0, 255);
  renderer.commitFrame();
}*/
