export function normal(selectedPath) {
  let selectionStart = 0, selectionEnd = 0;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys) {
      if(mouseClicked) {
        selectedPath = undefined;
        for(let i = paths.length - 1; i >= 0; --i) {
          if(renderer.containsPoint(paths[i].points, mouseX, mouseY, paths[i].x, paths[i].y)) {
            selectedPath = paths[i];
            break;
          }
        }
      }
      
      while(pendingKeys.length) {
        const key = pendingKeys.pop().toLowerCase();
        if(key === 'g') {
          if(selectedPath) {
            return grab(this, selectedPath, mouseX, mouseY);
          }
        } else if(key === 'm') {
          if(selectedPath) {
            return mutateStart(this, selectedPath);
          }
        }
      }
    },
    render(ctx, scale) {
      if(selectedPath) {
        renderOutline(ctx, scale, selectedPath, selectionStart, selectionEnd);
      }
    },
  };
}

export function grab(prev, selectedPath, startX, startY) {
  const offsX = selectedPath.x - startX, offsY = selectedPath.y - startY;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys) {
      if(mouseClicked || pendingKeys.some(x => x.toLowerCase() === 'g')) {
        return prev;
      }
      
      selectedPath.x = mouseX + offsX;
      selectedPath.y = mouseY + offsY;
    },
    render(ctx, scale) {  },
  };
}

export function mutateStart(prev, selectedPath) {
  let nearestPoint = 0;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys) {
      if(pendingKeys.some(x => x === ' ' || x === 'Escape')) {
        return prev;
      }
      
      const points = selectedPath.points, plen = points.length |0;
      const offsX = selectedPath.x |0, offsY = selectedPath.y |0;
      let nearestDistanceSquared = Infinity;
      for(let i = 0; i < plen; i += 2) {
        const x = points[i] + offsX, y = points[i+1] + offsY;
        const dx = x - mouseX, dy = y - mouseY;
        const distanceSquared = dx*dx + dy*dy;
        if(distanceSquared < nearestDistanceSquared) {
          nearestPoint = i >> 1;
          nearestDistanceSquared = distanceSquared;
        }
      }
      
      if(mouseDown) {
        return mutate(prev, selectedPath, nearestPoint, mouseX, mouseY);
      }
    },
    render(ctx, scale) {
      renderOutline(ctx, scale, selectedPath);
      
      const offsX = selectedPath.x |0, offsY = selectedPath.y |0;
      const lineWidth = 2 / scale;
      const nx = selectedPath.points[nearestPoint*2] + offsX, ny = selectedPath.points[nearestPoint*2+1] + offsY;
      ctx.beginPath();
      ctx.moveTo(nx - lineWidth*2, ny - lineWidth*2);
      ctx.lineTo(nx + lineWidth*2, ny - lineWidth*2);
      ctx.lineTo(nx + lineWidth*2, ny + lineWidth*2);
      ctx.lineTo(nx - lineWidth*2, ny + lineWidth*2);
      ctx.lineTo(nx - lineWidth*2, ny - lineWidth*2);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = lineWidth * 2;
      ctx.stroke();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = lineWidth * 1;
      ctx.stroke();
    },
  };
}

export function mutate(prev, selectedPath, startPoint, startX, startY) {
  const startPointX = selectedPath.points[startPoint*2];
  const startPointY = selectedPath.points[startPoint*2+1];
  
  const pathX = selectedPath.x |0;
  const pathY = selectedPath.y |0;
  
  const offsX = startPointX - startX;
  const offsY = startPointY - startY;
  
  const drawing = [startPointX, startPointY];
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys) {
      mouseX += offsX;
      mouseY += offsY;
      
      const prevX = drawing[drawing.length - 2], prevY = drawing[drawing.length - 1];
      
      function getIntersection(x1, y1, x2, y2) {
        x2 -= x1;
        y2 -= y1;
        const points = selectedPath.points;
        const plen = points.length |0;
        let prevX = points[plen - 2] + pathX, prevY = points[plen - 1] + pathY;
        for(let i = 0; i < plen; i += 2) {
          const curX = points[i] + pathX, curY = points[i + 1] + pathY;
          const dx = curX - prevX, dy = curY - prevY;
          const t = ((curX - x1) * dy - (curY - y1) * dx) / (x2 * dy - y2 * dx);
          const u = ((x1 - curX) * y2 - (y1 - curY) * x2) / (dx * y2 - dy * x2);
          if(t >= 0 && t < 1 && u >= 0 && u < 1) {
            return i >> 1;
          }
          prevX = curX;
          prevY = curY;
        }
        return -1;
      }
      
      if(Math.max(Math.abs(mouseX - prevX), Math.abs(mouseY - prevY)) >= 0.1) {
        let endPoint = -1;
        if(Math.max(Math.abs(mouseX - startPointX), Math.abs(mouseY - startPointY)) >= 1) {
          endPoint = getIntersection(prevX, prevY, mouseX, mouseY);
        }
        if(endPoint === -1) {
          drawing.push(mouseX, mouseY);
        } else {
          const points = selectedPath.points, plen = points.length |0;
          
          drawing.push(selectedPath.points[endPoint*2], selectedPath.points[endPoint*2+1]);
          const dlen = drawing.length |0;
          
          let dPhysLength = 0;
          for(let i = 2; i < dlen; i += 2) {
            const dx = drawing[i    ] - drawing[i - 2];
            const dy = drawing[i + 1] - drawing[i - 1];
            dPhysLength += Math.sqrt(dx*dx + dy*dy);
          }
          
          let drawingAvgX = 0, drawingAvgY = 0;
          for(let i = 0, len = drawing.length; i < len; i += 2) {
            drawingAvgX += drawing[i];
            drawingAvgY += drawing[i + 1];
          }
          drawingAvgX /= dlen >> 1;
          drawingAvgY /= dlen >> 1;
          
          let winding1AvgX = 0, winding1AvgY = 0, winding1Count = 0;
          for(let i = startPoint*2; ; i = (i + 2) % plen) {
            winding1AvgX += points[i];
            winding1AvgY += points[i + 1];
            ++winding1Count;
            if(i === endPoint*2) {
              break;
            }
          }
          winding1AvgX /= winding1Count;
          winding1AvgY /= winding1Count;
          
          let winding2AvgX = 0, winding2AvgY = 0, winding2Count = 0;
          for(let i = endPoint*2; ; i = (i + 2) % plen) {
            winding2AvgX += points[i];
            winding2AvgY += points[i + 1];
            ++winding2Count;
            if(i === startPoint*2) {
              break;
            }
          }
          winding2AvgX /= winding2Count;
          winding2AvgY /= winding2Count;
          
          const winding1dx = drawingAvgX - winding1AvgX;
          const winding1dy = drawingAvgY - winding1AvgY;
          const winding2dx = drawingAvgX - winding2AvgX;
          const winding2dy = drawingAvgY - winding2AvgY;
          if(
            winding2dx*winding2dx + winding2dy*winding2dy
            >
            winding1dx*winding1dx + winding1dy*winding1dy
          ) {
            // winding 1 (startPoint..endPoint) is closer.
            if(winding1Count <= 1) {
              // this probably won't happen, but let's not try to handle it.
              return prev;
            }
            
            const stepLength = dPhysLength / (winding1Count - 1);
            let debt = 0;
            for(let i = 2, pointsI = startPoint*2; i < dlen; i += 2) {
              let x1 = drawing[i - 2], y1 = drawing[i - 1];
              const x2 = drawing[i    ], y2 = drawing[i + 1];
              const dx = x2 - x1, dy = y2 - y1;
              let length = Math.sqrt(dx*dx + dy*dy);
              const nx = dx / length, ny = dy / length; // normalized
              if(length > stepLength - debt) {
                x1 += nx * (stepLength - debt);
                y1 += ny * (stepLength - debt);
                length -= stepLength - debt;
                pointsI = (pointsI + 2) % plen;
                points[pointsI    ] = x1;
                points[pointsI + 1] = y1;
                debt = 0;
                while(length > stepLength) {
                  x1 += nx * stepLength;
                  y1 += ny * stepLength;
                  length -= stepLength;
                  pointsI = (pointsI + 2) % plen;
                  points[pointsI    ] = x1;
                  points[pointsI + 1] = y1;
                }
              }
              debt += length;
            }
          } else {
            // winding 2 (endPoint..startPoint) is closer.
            if(winding2Count <= 1) {
              // this probably won't happen, but let's not try to handle it.
              return prev;
            }
            
            // reverse the drawing.
            for(let i = 0; i < dlen >> 1; i += 2) {
              const tx = drawing[i], ty = drawing[i + 1];
              drawing[i    ] = drawing[dlen - i - 2];
              drawing[i + 1] = drawing[dlen - i - 1];
              drawing[dlen - i - 2] = tx;
              drawing[dlen - i - 1] = ty;
            }
            
            const stepLength = dPhysLength / (winding2Count - 1);
            let debt = 0;
            for(let i = 2, pointsI = endPoint*2; i < dlen; i += 2) {
              let x1 = drawing[i - 2], y1 = drawing[i - 1];
              const x2 = drawing[i    ], y2 = drawing[i + 1];
              const dx = x2 - x1, dy = y2 - y1;
              let length = Math.sqrt(dx*dx + dy*dy);
              const nx = dx / length, ny = dy / length; // normalized
              if(length > stepLength - debt) {
                x1 += nx * (stepLength - debt);
                y1 += ny * (stepLength - debt);
                length -= stepLength - debt;
                pointsI = (pointsI + 2) % plen;
                points[pointsI    ] = x1;
                points[pointsI + 1] = y1;
                debt = 0;
                while(length > stepLength) {
                  x1 += nx * stepLength;
                  y1 += ny * stepLength;
                  length -= stepLength;
                  pointsI = (pointsI + 2) % plen;
                  points[pointsI    ] = x1;
                  points[pointsI + 1] = y1;
                }
              }
              debt += length;
            }
          }
          
          return prev;
        }
      }
    },
    render(ctx, scale) {
      renderOutline(ctx, scale, selectedPath);
      
      const lineWidth = 2 / scale;
      
      ctx.beginPath();
      ctx.moveTo(drawing[0] + pathX, drawing[1] + pathY);
      for(let i = 2; i < drawing.length; i += 2) {
        ctx.lineTo(drawing[i] + pathX, drawing[i + 1] + pathY);
      }
      
      ctx.strokeStyle = 'black';
      ctx.lineWidth = lineWidth * 2;
      ctx.stroke();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = lineWidth * 1;
      ctx.stroke();
    },
  };
}

function renderOutline(ctx, scale, path, selectionStart, selectionEnd) {
  selectionStart |= 0;
  selectionEnd |= 0;
  
  const points = path.points, plen = points.length >> 1;
  const offsX = path.x |0, offsY = path.y |0;
  const lineWidth = 2 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  function getX(i) {
    return points[((i + plen) % plen) * 2] + offsX;
  }
  function getY(i) {
    return points[((i + plen) % plen) * 2 + 1] + offsY;
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
  /*for(let i = (selectionEnd + 1) % plen; i !== selectionStart % plen; i = (i + 1) % plen) {
    const curX = getX(i), curY = getY(i);
    ctx.moveTo(curX - lineWidth, curY - lineWidth);
    ctx.lineTo(curX + lineWidth, curY - lineWidth);
    ctx.lineTo(curX + lineWidth, curY + lineWidth);
    ctx.lineTo(curX - lineWidth, curY + lineWidth);
    ctx.lineTo(curX - lineWidth, curY - lineWidth);
  }*/
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
  /*for(let i = selectionStart % plen; i !== (selectionEnd + 1) % plen; i = (i + 1) % plen) {
    const curX = getX(i), curY = getY(i);
    ctx.moveTo(curX - lineWidth, curY - lineWidth);
    ctx.lineTo(curX + lineWidth, curY - lineWidth);
    ctx.lineTo(curX + lineWidth, curY + lineWidth);
    ctx.lineTo(curX - lineWidth, curY + lineWidth);
    ctx.lineTo(curX - lineWidth, curY - lineWidth);
  }*/
  ctx.strokeStyle = 'black';
  ctx.lineWidth = lineWidth * 2;
  ctx.stroke();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = lineWidth * 1;
  ctx.stroke();
}
