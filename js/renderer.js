import { byteArray } from './shims.js';

export function create(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  
  let imageData, pixels, outline, oWidth;
  function rebuildImageData() {
    if(imageData && canvas.width === imageData.width && canvas.height === imageData.height) {
      return;
    }
    imageData = ctx.createImageData(canvas.width, canvas.height);
    const { data } = imageData;
    if(typeof Uint8ClampedArray === 'undefined' || !data.buffer) {
      // Something weird and non-spec-compliant is going on here...
      // Best not to touch this.
      pixels = data;
    } else {
      pixels = new Uint8Array(data.buffer, data.byteOffset);
    }
    for(let i = 3; i < pixels.length; i += 4) {
      pixels[i] = 255;
    }
    oWidth = (canvas.width + 7) >> 3;
    if(!outline || outline.length !== oWidth * canvas.height) {
      outline = byteArray(oWidth * canvas.height);
    }
  }
  
  return {
    beginFrame(width, height) {
      if(canvas.width !== width) {
        canvas.width = width;
      }
      if(canvas.height !== height) {
        canvas.height = height;
      }
      rebuildImageData();
    },
    commitFrame() {
      ctx.putImageData(imageData, 0, 0);
    },
    fillPolygon(points, plen, r, g, b, offsX, offsY) {
      plen = Math.min(points.length, plen) |0;
      r &= 255;
      g &= 255;
      b &= 255;
      offsX |= 0;
      offsY |= 0;
      const width = imageData.width |0, height = imageData.height |0;
      let minX = width, maxX = 0;
      let minY = height, maxY = 0;
      let prevX = points[plen - 2] + offsX, prevY = points[plen - 1] + offsY;
      for(let i = 0; i < plen; i += 2) {
        const curX = points[i] + offsX, curY = points[i + 1] + offsY;
        if(curX < minX) minX = curX;
        if(curX > maxX) maxX = curX;
        if(curY < minY) minY = curY;
        if(curY > maxY) maxY = curY;
        const y1 = curY |0, y2 = prevY |0;
        let bottom, x, y;
        if(y1 > y2) {
          bottom = y1;
          y = y2;
          x = prevX;
        } else if(y1 < y2) {
          bottom = y2;
          y = y1;
          x = curX;
        } else {
          prevX = curX;
          prevY = curY;
          continue;
        }
        const xPerY = (curX - prevX) / (curY - prevY);
        for(; y < bottom; ++y, x += xPerY) {
          if(y < 0 || y >= height) continue;
          let intX = x |0;
          if(intX >= width) continue;
          if(intX < 0) intX = 0;
          outline[y * oWidth + (intX >> 3)] ^= 1 << (intX & 7);
        }
        prevX = curX;
        prevY = curY;
      }
      if(minX < 0) minX = 0;
      if(minY < 0) minY = 0;
      if(maxX >= width) maxX = width - 1;
      else if(maxX < minX) maxX = minX;
      if(maxY >= height) maxY = height - 1;
      else if(maxY < minY) maxY = minY;
      //minX = minY = 0; maxX = maxY = 99; // XXX
      for(let y = minY; y <= maxY; ++y) {
        let penIsDown = false;
        for(let x = minX & ~7, idx = y * oWidth + (x >> 3), pixIdx = (y * width + x)*4; x <= maxX; x += 8, ++idx, pixIdx += 8*4) {
          let register = outline[idx];
          if(penIsDown || register) {
            let iterationN = x + 7 <= maxX ? 0 : (x + 7 - maxX), pixIdxX = pixIdx;
            do {
              if(register & 1) {
                penIsDown = !penIsDown;
              }
              if(penIsDown) {
                pixels[pixIdxX    ] = r;
                pixels[pixIdxX + 1] = g;
                pixels[pixIdxX + 2] = b;
              }
              register >>= 1; ++iterationN; pixIdxX += 4;
            } while(register || (penIsDown && iterationN < 8));
            outline[idx] = 0;
          }
        }
      }
    },
  };
}
