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
    fillPolygon(subpaths, r, g, b, offsX, offsY) {
      r &= 255;
      g &= 255;
      b &= 255;
      offsX |= 0;
      offsX += 0.5;
      offsY |= 0;
      offsY += 0.5;
      const width = imageData.width |0, height = imageData.height |0;
      let minX = width, maxX = 0;
      let minY = height, maxY = 0;
      for(let pathIndex = 0; pathIndex < subpaths.length; ++pathIndex) {
        const points = subpaths[pathIndex];
        const plen = points.length |0;
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
          if(bottom > 0) {
            if(bottom > height) bottom = height;
            const xPerY = (curX - prevX) / (curY - prevY);
            for(; y < bottom; ++y, x += xPerY) {
              if(y < 0) continue;
              let intX = x |0;
              if(intX >= width) continue;
              if(intX < 0) intX = 0;
              outline[y * oWidth + (intX >> 3)] ^= 1 << (intX & 7);
            }
          }
          prevX = curX;
          prevY = curY;
        }
      }
      minX |= 0;
      minY |= 0;
      maxX = Math.ceil(maxX) |0;
      maxY = Math.ceil(maxY) |0;
      if(minX < 0) minX = 0;
      if(minY < 0) minY = 0;
      if(maxX >= width) maxX = width - 1;
      else if(maxX < minX) maxX = minX;
      if(maxY >= height) maxY = height - 1;
      else if(maxY < minY) maxY = minY;
      for(let y = minY; y <= maxY; ++y) {
        let penIsDown = 0;
        for(let x = minX & ~7, idx = y * oWidth + (x >> 3), pixIdx = (y * width + x)*4; x <= maxX; x += 8, ++idx, pixIdx += 8*4) {
          let register = outline[idx];
          if(penIsDown || register) {
            let iterationN = x + 7 <= maxX ? 0 : (x + 7 - maxX), pixIdxX = pixIdx;
            do {
              penIsDown ^= register & 1;
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
    strokePolygon(subpaths, r, g, b, offsX, offsY) {
      r &= 255;
      g &= 255;
      b &= 255;
      offsX |= 0;
      offsY |= 0;
      const width = imageData.width |0, height = imageData.height |0;
      for(let pathIndex = 0; pathIndex < subpaths.length; ++pathIndex) {
        const points = subpaths[pathIndex];
        const plen = points.length |0;
        let prevX = points[plen - 2] + offsX, prevY = points[plen - 1] + offsY;
        for(let i = 0; i < plen; i += 2) {
          const curX = points[i] + offsX, curY = points[i + 1] + offsY;
          if(Math.abs(curY - prevY) > Math.abs(curX - prevX)) {
            if(prevY > curY) {
              let bottom = prevY |0, x = curX, y = curY |0;
              if(bottom > 0) {
                if(bottom > height) bottom = height;
                const xPerY = (curX - prevX) / (curY - prevY);
                for(; y < bottom; ++y, x += xPerY) {
                  if(y < 0) continue;
                  const intX = x |0;
                  if(intX < 0 || intX >= width) continue;
                  const idx = (y * width + intX) * 4;
                  pixels[idx    ] = r;
                  pixels[idx + 1] = g;
                  pixels[idx + 2] = b;
                }
              }
            } else {
              let top = prevY |0, x = curX, y = curY |0;
              if(top < height - 1) {
                if(top < -1) top = -1;
                const xPerY = (curX - prevX) / (curY - prevY);
                for(; y > top; --y, x -= xPerY) {
                  if(y >= height) continue;
                  const intX = x |0;
                  if(intX < 0 || intX >= width) continue;
                  const idx = (y * width + intX) * 4;
                  pixels[idx    ] = r;
                  pixels[idx + 1] = g;
                  pixels[idx + 2] = b;
                }
              }
            }
          } else {
            if(prevX > curX) {
              let right = prevX |0, x = curX |0, y = curY;
              if(right > 0) {
                if(right > width) right = width;
                const yPerX = (curY - prevY) / (curX - prevX);
                for(; x < right; ++x, y += yPerX) {
                  if(x < 0) continue;
                  const intY = y |0;
                  if(intY < 0 || intY >= height) continue;
                  const idx = (intY * width + x) * 4;
                  pixels[idx    ] = r;
                  pixels[idx + 1] = g;
                  pixels[idx + 2] = b;
                }
              }
            } else {
              let left = prevX |0, x = curX |0, y = curY;
              if(left < width - 1) {
                if(left < -1) left = -1;
                const yPerX = (curY - prevY) / (curX - prevX);
                for(; x > left; --x, y -= yPerX) {
                  if(x >= width) continue;
                  const intY = y |0;
                  if(intY < 0 || intY >= height) continue;
                  const idx = (intY * width + x) * 4;
                  pixels[idx    ] = r;
                  pixels[idx + 1] = g;
                  pixels[idx + 2] = b;
                }
              }
            }
          }
          prevX = curX;
          prevY = curY;
        }
      }
    },
    containsPoint(subpaths, x, y, offsX, offsY) {
      x -= offsX |0;
      y -= offsY |0;
      let out = false;
      for(let pathIndex = 0; pathIndex < subpaths.length; ++pathIndex) {
        const points = subpaths[pathIndex];
        const plen = points.length |0;
        let prevX = points[plen - 2], prevY = points[plen - 1];
        for(let i = 0; i < plen; i += 2) {
          const curX = points[i], curY = points[i + 1];
          const xPerY = (curX - prevX) / (curY - prevY);
          if((y < curY) !== (y < prevY) && x < curX + (y - curY) * xPerY) {
            out = !out;
          }
          prevX = curX;
          prevY = curY;
        }
      }
      return out;
    },
  };
}
