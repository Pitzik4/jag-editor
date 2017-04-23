import * as Renderer from '../renderer.js';
import * as Path from './path.js';
import { requestAnimationFrame } from '../shims.js';

const pixels = document.createElement('canvas');
const renderer = Renderer.create(pixels);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const rectangle = [0, 60, 80, 60, 80, 0, 0, 0];
//const triangle = [15, 55, 65, 55, 40, 5];
const paths = [Path.create()];
paths[0].color = { r: 128, g: 0, b: 255 };
for(let i = 0; i < 1800*2; ++i) {
  paths[0].points.push(Math.cos(i * Math.PI / 1800) * 30 + 40, Math.sin(i * Math.PI / 1800) * 30 + 30);
}
let selectedPath, selectionStart, selectionEnd;

function frame(time) {
  requestAnimationFrame(frame);
  
  if(canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
  if(canvas.height !== window.innerHeight) canvas.height = window.innerHeight;
  
  renderer.beginFrame(80, 60);
  renderer.fillPolygon(rectangle, 0, 0, 0);
  for(let i = 0, len = paths.length; i < len; ++i) {
    renderer.fillPolygon(paths[i].points, paths[i].color.r, paths[i].color.g, paths[i].color.b);
  }
  renderer.commitFrame();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  const scale = canvas.height / pixels.height;
  ctx.setTransform(scale, 0, 0, scale, (canvas.width - pixels.width * scale) * 0.5, 0);
  ctx.drawImage(pixels, 0, 0);
  
  function renderOutline(points, selectionStart, selectionEnd) {
    selectionStart |= 0;
    selectionEnd |= 0;
    
    const plen = points.length >> 1;
    const lineWidth = 2 / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    function getX(i) {
      return points[((i + plen) % plen) * 2];
    }
    function getY(i) {
      return points[((i + plen) % plen) * 2 + 1];
    }
    
    ctx.beginPath();
    ctx.moveTo(getX(selectionEnd), getY(selectionEnd));
    for(let i = (selectionEnd + 1) % plen; ; i = (i + 1) % plen) {
      const curX = getX(i), curY = getY(i);
      ctx.lineTo(curX, curY);
      if(i === selectionStart % plen) {
        break;
      }
    }
    for(let i = (selectionEnd + 1) % plen; i !== selectionStart % plen; i = (i + 1) % plen) {
      const curX = getX(i), curY = getY(i);
      ctx.moveTo(curX - lineWidth, curY - lineWidth);
      ctx.lineTo(curX + lineWidth, curY - lineWidth);
      ctx.lineTo(curX + lineWidth, curY + lineWidth);
      ctx.lineTo(curX - lineWidth, curY + lineWidth);
      ctx.lineTo(curX - lineWidth, curY - lineWidth);
    }
    ctx.strokeStyle = 'white';
    ctx.lineWidth = lineWidth * 2;
    ctx.stroke();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 1;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(getX(selectionStart), getY(selectionStart));
    for(let i = (selectionStart + 1) % plen; i !== (selectionEnd + 1) % plen; i = (i + 1) % plen) {
      const curX = getX(i), curY = getY(i);
      ctx.lineTo(curX, curY);
    }
    for(let i = selectionStart % plen; i !== (selectionEnd + 1) % plen; i = (i + 1) % plen) {
      const curX = getX(i), curY = getY(i);
      ctx.moveTo(curX - lineWidth, curY - lineWidth);
      ctx.lineTo(curX + lineWidth, curY - lineWidth);
      ctx.lineTo(curX + lineWidth, curY + lineWidth);
      ctx.lineTo(curX - lineWidth, curY + lineWidth);
      ctx.lineTo(curX - lineWidth, curY - lineWidth);
    }
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 2;
    ctx.stroke();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = lineWidth * 1;
    ctx.stroke();
  }
  
  if(selectedPath) {
    renderOutline(selectedPath.points, selectionStart, selectionEnd);
  }
}

requestAnimationFrame(frame);
