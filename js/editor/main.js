import * as Renderer from '../renderer.js';
import * as Path from './path.js';
import * as Modes from './modes.js';
import { requestAnimationFrame } from '../shims.js';

const pixels = document.createElement('canvas');
const renderer = Renderer.create(pixels);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const rectangle = [0, 60, 80, 60, 80, 0, 0, 0];
const paths = [Path.create()];
paths[0].color = { r: 128, g: 0, b: 255 };
for(let i = 0; i < 1800*2; ++i) {
  paths[0].points.push(Math.cos(i * Math.PI / 1800) * 30 + 40, Math.sin(i * Math.PI / 1800) * 30 + 30);
}
//paths[0].points = [15, 55, 65, 55, 40, 5];
let mode = Modes.normal();

function frame(time) {
  requestAnimationFrame(frame);
  
  // scaling
  
  if(canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
  if(canvas.height !== window.innerHeight) canvas.height = window.innerHeight;
  
  const scale = canvas.height / pixels.height;
  
  
  // update logic
  
  const mouseX = (screenMouseX - (canvas.width - pixels.width * scale) * 0.5) / scale;
  const mouseY = screenMouseY / scale;
  const mouseDown = screenMouseDown;
  const mouseClicked = screenMouseClicked;
  screenMouseClicked = false;
  
  do {
    let newMode = mode.update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys);
    if(newMode) {
      mode = newMode;
    }
    pendingKeys.length = 0;
  } while(newMode);
  
  
  // render logic
  
  renderer.beginFrame(80, 60);
  renderer.fillPolygon(rectangle, 0, 0, 0);
  for(let i = 0, len = paths.length; i < len; ++i) {
    renderer.fillPolygon(paths[i].points, paths[i].color.r, paths[i].color.g, paths[i].color.b, paths[i].x, paths[i].y);
  }
  renderer.commitFrame();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scale, 0, 0, scale, (canvas.width - pixels.width * scale) * 0.5, 0);
  ctx.drawImage(pixels, 0, 0);
  
  mode.render(ctx, scale);
}

requestAnimationFrame(frame);

let screenMouseX = 0, screenMouseY = 0, screenMouseDown = false, screenMouseClicked = false;

window.addEventListener('mousemove', ev => {
  screenMouseX = ev.clientX;
  screenMouseY = ev.clientY;
});

window.addEventListener('mousedown', ev => {
  screenMouseDown = true;
});

window.addEventListener('mouseup', ev => {
  screenMouseDown = false;
  screenMouseClicked = true;
});

const pendingKeys = [];

window.addEventListener('keydown', ev => {
  pendingKeys.push(ev.key);
});
