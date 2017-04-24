import * as Path from './path.js';
import * as Keyframe from './keyframe.js';
import * as Pin from './pin.js';

export function normal(paths, selectedPaths) {
  selectedPaths = selectedPaths || [];
  const frames = [paths.map(Path.clone)];
  const cumulativeKeyframes = [], wholesaleKeyframes = [], pins = [];
  let currentFrame = 0;
  
  function getFrame(frameN) {
    if(frameN < 0) frameN = 0;
    else if(frameN >= frames.length) frameN = frames.length - 1;
    return frames[frameN];
  }
  
  function applyFrame(paths, frameN) {
    currentFrame = frameN;
    const frame = getFrame(frameN);
    for(let i = 0; i < paths.length; ++i) {
      Path.copyAToB(frame[i], paths[i]);
    }
  }
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      if(mouseClicked) {
        if(!shiftDown) {
          selectedPaths.length = 0;
        }
        for(let i = paths.length - 1; i >= 0; --i) {
          if(renderer.containsPoint(paths[i].subpaths, mouseX, mouseY, paths[i].x, paths[i].y)) {
            if(shiftDown) {
              const index = selectedPaths.indexOf(paths[i]);
              if(index === -1) {
                selectedPaths.push(paths[i]);
              } else {
                selectedPaths.splice(index, 1);
              }
            } else {
              selectedPaths.push(paths[i]);
            }
            break;
          }
        }
      }
      
      const selectionOrEverything = selectedPaths.length ? selectedPaths : paths;
      while(pendingKeys.length) {
        const key = pendingKeys.pop().toLowerCase();
        if(key === 'g') { //////////////// (G)rab
          if(selectedPaths.length) {
            return grab(this, selectedPaths, mouseX, mouseY);
          }
        } else if(key === 'm') { ///////// (M)utate
          if(selectedPaths.length) {
            return mutateStart(this, selectedPaths);
          }
        } else if(key === 'a') { ///////// (A)ppend
          if(!selectedPaths.length) {
            const path = Path.create();
            selectedPaths.push(path);
            paths.push(path);
            path.color = {
              r: (Math.random() * 256) & 255,
              g: (Math.random() * 256) & 255,
              b: (Math.random() * 256) & 255,
            };
            for(let frameN = 0; frameN < frames.length; ++frameN) {
              frames[frameN].push(Path.clone(path));
            }
          }
          const selectedPath = selectedPaths[selectedPaths.length - 1];
          const selectedPathIndex = paths.indexOf(selectedPath);
          return drawAndAppend(this, selectedPath, points => {
            selectedPath.subpaths.push(points);
            for(let frameN = 0; frameN < frames.length; ++frameN) {
              frames[frameN][selectedPathIndex].subpaths.push(points.slice(0));
            }
          });
        } else if(key === 'delete') { //// (Delete) Selected Shapes
          while(selectedPaths.length) {
            const selectedPath = selectedPaths.pop();
            const index = paths.indexOf(selectedPath);
            if(index !== -1) {
              paths.splice(index, 1);
              for(let frameN = 0; frameN < frames.length; ++frameN) {
                frames[frameN].splice(index, 1);
              }
            }
          }
        } else if(key === 'p') { ///////// (P)lay
          
        } else if(key === 's') { ///////// (S)crub Timeline / (S)eek
          applyFrame(paths, currentFrame);
          return seek(this, applyFrame, currentFrame);
        } else if(key === 'r') { ///////// (R)ecord
          
        } else if(key === 'q') { ///////// Save (Q)mulative Keyframe
          cumulativeKeyframes.push(Keyframe.createCumulative(selectionOrEverything, getFrame(currentFrame)));
        } else if(key === 'w') { ///////// Save (W)holesale Keyframe
          wholesaleKeyframes.push(Keyframe.createWholesale(selectionOrEverything));
        } else if(key === 'k') { ///////// Manage (K)eyframes
          return manageKeyframes(this, wholesaleKeyframes, cumulativeKeyframes, pins, selectionOrEverything);
        } else if(key === ' ') { ///////// Flatten Timeline
          frames.length = 0;
          frames[0] = paths.map(Path.clone);
          currentFrame = 0;
        }
      }
    },
    render(ctx, scale) {
      for(let i = 0; i < selectedPaths.length; ++i) {
        renderOutline(ctx, scale, selectedPaths[i]);
      }
    },
  };
}

export function grab(prev, selectedPaths, startX, startY) {
  startX |= 0;
  startY |= 0;
  
  const originalPositions = selectedPaths.map(({ x, y }) => ({ x, y }));
  const offsets = originalPositions.map(({ x, y }) => ({ x: x - startX, y: y - startY }));
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      mouseX |= 0;
      mouseY |= 0;
      
      if(mouseClicked || pendingKeys.some(x => x.toLowerCase() === 'g')) {
        return prev;
      }
      
      if(pendingKeys.some(x => x === ' ' || x === 'Escape')) {
        for(let i = 0; i < selectedPaths.length; ++i) {
          selectedPaths[i].x = originalPositions[i].x;
          selectedPaths[i].y = originalPositions[i].y;
        }
        return prev;
      }
      
      for(let i = 0; i < selectedPaths.length; ++i) {
        selectedPaths[i].x = mouseX + offsets[i].x;
        selectedPaths[i].y = mouseY + offsets[i].y;
      }
    },
    render(ctx, scale) {  },
  };
}

export function mutateStart(prev, selectedPaths) {
  let nearestPath = selectedPaths[0], nearestSubpath = 0, nearestPoint = 0;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      if(pendingKeys.some(x => x === ' ' || x === 'Escape')) {
        return prev;
      }
      
      let nearestDistanceSquared = Infinity;
      for(let selectedPathIndex = 0; selectedPathIndex < selectedPaths.length; ++selectedPathIndex) {
        const selectedPath = selectedPaths[selectedPathIndex];
        const offsX = selectedPath.x |0, offsY = selectedPath.y |0;
        for(let pathIndex = 0; pathIndex < selectedPath.subpaths.length; ++pathIndex) {
          const points = selectedPath.subpaths[pathIndex], plen = points.length |0;
          for(let i = 0; i < plen; i += 2) {
            const x = points[i] + offsX, y = points[i+1] + offsY;
            const dx = x - mouseX, dy = y - mouseY;
            const distanceSquared = dx*dx + dy*dy;
            if(distanceSquared < nearestDistanceSquared) {
              nearestPath = selectedPath;
              nearestSubpath = pathIndex;
              nearestPoint = i >> 1;
              nearestDistanceSquared = distanceSquared;
            }
          }
        }
      }
      
      if(mouseDown) {
        return mutate(prev, nearestPath, nearestSubpath, nearestPoint, mouseX, mouseY);
      }
    },
    render(ctx, scale) {
      for(let i = 0; i < selectedPaths.length; ++i) {
        renderOutline(ctx, scale, selectedPaths[i]);
      }
      
      const offsX = nearestPath.x |0, offsY = nearestPath.y |0;
      const lineWidth = 2 / scale;
      const nx = nearestPath.subpaths[nearestSubpath][nearestPoint*2] + offsX, ny = nearestPath.subpaths[nearestSubpath][nearestPoint*2+1] + offsY;
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

export function mutate(prev, selectedPath, pathIndex, startPoint, startX, startY) {
  const startPointX = selectedPath.subpaths[pathIndex][startPoint*2];
  const startPointY = selectedPath.subpaths[pathIndex][startPoint*2+1];
  
  const pathX = selectedPath.x |0;
  const pathY = selectedPath.y |0;
  
  const offsX = startPointX - startX;
  const offsY = startPointY - startY;
  
  const drawing = [startPointX, startPointY];
  
  let hasTraveled = false;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      if(pendingKeys.some(x => x === ' ' || x === 'Escape')) {
        return prev;
      }
      
      mouseX += offsX;
      mouseY += offsY;
      
      function getIntersection(x1, y1, x2, y2) {
        x2 -= x1;
        y2 -= y1;
        const points = selectedPath.subpaths[pathIndex];
        const plen = points.length |0;
        let prevX = points[plen - 2], prevY = points[plen - 1];
        for(let i = 0; i < plen; i += 2) {
          const curX = points[i], curY = points[i + 1];
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
      
      const prevX = drawing[drawing.length - 2], prevY = drawing[drawing.length - 1];
      
      if(Math.max(Math.abs(mouseX - prevX), Math.abs(mouseY - prevY)) >= 0.1) {
        let endPoint = -1;
        if(hasTraveled && !mouseDown) {
          endPoint = getIntersection(prevX, prevY, mouseX, mouseY);
        }
        hasTraveled = true;
        if(endPoint === -1) {
          drawing.push(mouseX, mouseY);
        } else {
          const points = selectedPath.subpaths[pathIndex], plen = points.length |0;
          
          drawing.push(selectedPath.subpaths[pathIndex][endPoint*2], selectedPath.subpaths[pathIndex][endPoint*2+1]);
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
          
          const commitModifications = function commitModifications(points, windingCount, startPoint) {
            if(windingCount <= 1) {
              // this probably won't happen, but let's not try to handle it.
              return;
            }
            
            const stepLength = dPhysLength / (windingCount - 1);
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
          };
          
          const reverseDrawing = function reverseDrawing() {
            for(let i = 0; i < dlen >> 1; i += 2) {
              const tx = drawing[i], ty = drawing[i + 1];
              drawing[i    ] = drawing[dlen - i - 2];
              drawing[i + 1] = drawing[dlen - i - 1];
              drawing[dlen - i - 2] = tx;
              drawing[dlen - i - 1] = ty;
            }
          }
          
          let alternatePoints = points.slice(0);
          commitModifications(points, winding1Count, startPoint);
          reverseDrawing();
          commitModifications(alternatePoints, winding2Count, endPoint);
          
          const winding1dx = drawingAvgX - winding1AvgX;
          const winding1dy = drawingAvgY - winding1AvgY;
          const winding2dx = drawingAvgX - winding2AvgX;
          const winding2dy = drawingAvgY - winding2AvgY;
          if(
            winding2dx*winding2dx + winding2dy*winding2dy
            <
            winding1dx*winding1dx + winding1dy*winding1dy
          ) {
            // winding 2 (endPoint..startPoint) is closer.
            selectedPath.subpaths[pathIndex] = alternatePoints;
            alternatePoints = points;
          }
          
          return addHook(prev, 'z', () => {
            const tmp = selectedPath.subpaths[pathIndex];
            selectedPath.subpaths[pathIndex] = alternatePoints;
            alternatePoints = tmp;
          });
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

export function drawAndAppend(prev, selectedPath, callback) {
  const drawing = [];
  let amDrawing = false;
  
  const pathX = selectedPath.x |0;
  const pathY = selectedPath.y |0;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      mouseX -= pathX;
      mouseY -= pathY;
      
      if(mouseDown) {
        if(!amDrawing) {
          // begin
          drawing.push(mouseX, mouseY);
        } else {
          const prevX = drawing[drawing.length - 2], prevY = drawing[drawing.length - 1];
          
          if(Math.max(Math.abs(mouseX - prevX), Math.abs(mouseY - prevY)) >= 0.1) {
            drawing.push(mouseX, mouseY);
          }
        }
        
        amDrawing = true;
      } else if(amDrawing) {
        // finish
        
        const dlen = drawing.length |0;
        
        let dPhysLength = 0;
        for(let i = 0; i < dlen; i += 2) {
          const dx = drawing[i    ] - drawing[(i + dlen - 2) % dlen];
          const dy = drawing[i + 1] - drawing[(i + dlen - 1) % dlen];
          dPhysLength += Math.sqrt(dx*dx + dy*dy);
        }
        
        const points = [];
        
        const stepLength = dPhysLength / 3600;
        let debt = 0;
        for(let i = 0; i < dlen; i += 2) {
          let x1 = drawing[(i + dlen - 2) % dlen], y1 = drawing[(i + dlen - 1) % dlen];
          const x2 = drawing[i    ], y2 = drawing[i + 1];
          const dx = x2 - x1, dy = y2 - y1;
          let length = Math.sqrt(dx*dx + dy*dy);
          const nx = dx / length, ny = dy / length; // normalized
          if(length > stepLength - debt) {
            x1 += nx * (stepLength - debt);
            y1 += ny * (stepLength - debt);
            length -= stepLength - debt;
            points.push(x1, y1);
            debt = 0;
            while(length > stepLength) {
              x1 += nx * stepLength;
              y1 += ny * stepLength;
              length -= stepLength;
              points.push(x1, y1);
            }
          }
          debt += length;
        }
        
        callback(points);
        
        return prev;
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

export function seek(prev, applyFrame, currentFrame) {
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      while(pendingKeys.length) {
        const key = pendingKeys.pop().toLowerCase();
        if(key === 'escape' || key === ' ' || key === 's') {
          return prev;
        } else if(key === 'arrowright' || key === 'd') {
          applyFrame(paths, ++currentFrame);
        } else if(key === 'arrowleft' || key === 'a') {
          applyFrame(paths, --currentFrame);
        }
      }
    },
    render(ctx, scale) {
      
    },
  };
}

export function manageKeyframes(prev, wholesaleKeyframes, cumulativeKeyframes, pins, selectedPaths) {
  const selection = Keyframe.getSelection(selectedPaths);
  const applicableWholesaleKeyframes = wholesaleKeyframes.filter(kf => kf.selection === selection);
  const applicableCumulativeKeyframes = cumulativeKeyframes.filter(kf => kf.selection === selection);
  const applicablePins = pins.filter(pin => pin.keyframe.selection === selection);
  
  let grabbedPin, pinOffsetX = 0, pinOffsetY = 0;
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      if(pendingKeys.some(x => x === ' ' || x === 'Escape' || x === 'k')) {
        return prev;
      }
      
      if(mouseDown) {
        if(grabbedPin) {
          grabbedPin.x = mouseX + pinOffsetX;
          grabbedPin.y = mouseY + pinOffsetY;
        } else {
          for(let i = applicablePins.length - 1; i >= 0; --i) {
            const pin = applicablePins[i];
            const dx = pin.x - mouseX, dy = pin.y - mouseY;
            if(dx*dx + dy*dy <= pinRadius*pinRadius) {
              grabbedPin = pin;
              pinOffsetX = dx;
              pinOffsetY = dy;
              break;
            }
          }
          if(grabbedPin === undefined) {
            grabbedPin = Pin.create(mouseX, mouseY, applicableWholesaleKeyframes[0]);
            pinOffsetX = pinOffsetY = 0;
            applicablePins.push(grabbedPin);
            pins.push(grabbedPin);
          }
        }
      } else if(grabbedPin) {
        if(grabbedPin.x < 0 || grabbedPin.x >= 80) {
          // delete the pin
          const pinsIndex = pins.indexOf(grabbedPin);
          pins.splice(pinsIndex, 1);
          const applicablePinsIndex = applicablePins.indexOf(grabbedPin);
          applicablePins.splice(applicablePinsIndex, 1);
        }
        grabbedPin = undefined;
      }
    },
    render(ctx, scale) {
      renderPins(ctx, scale, applicablePins);
    },
  };
}

export function addHook(subordinate, key, action) {
  key = key.toLowerCase();
  
  return {
    update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown) {
      for(let i = pendingKeys.length - 1; i >= 0; --i) {
        if(pendingKeys[i].toLowerCase() === key) {
          pendingKeys.splice(i, 1);
          if(action) {
            action();
          }
        }
      }
      
      return subordinate.update(renderer, paths, mouseX, mouseY, mouseDown, mouseClicked, pendingKeys, shiftDown);
    },
    render(ctx, scale) {
      subordinate.render(ctx, scale);
    },
  };
}

function renderOutline(ctx, scale, path, selectedSubpath, selectionStart, selectionEnd) {
  selectionStart |= 0;
  selectionEnd |= 0;
  
  const offsX = path.x |0, offsY = path.y |0;
  const lineWidth = 2 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  function getX(pathIndex, i) {
    const points = path.subpaths[pathIndex], plen = points.length >> 1;
    return points[((i + plen) % plen) * 2] + offsX;
  }
  function getY(pathIndex, i) {
    const points = path.subpaths[pathIndex], plen = points.length >> 1;
    return points[((i + plen) % plen) * 2 + 1] + offsY;
  }
  
  ctx.beginPath();
  if(selectedSubpath >= 0) {
    const plen = path.subpaths[selectedSubpath].length |0;
    ctx.moveTo(getX(selectedSubpath, selectionEnd), getY(selectedSubpath, selectionEnd));
    for(let i = (selectionEnd + 1) % plen; ; i = (i + 1) % plen) {
      const curX = getX(selectedSubpath, i), curY = getY(selectedSubpath, i);
      ctx.lineTo(curX, curY);
      if(i === selectionStart % plen) {
        break;
      }
    }
  }
  for(let pathIndex = 0; pathIndex < path.subpaths.length; ++pathIndex) {
    if(pathIndex === selectedSubpath) continue;
    const plen = path.subpaths[pathIndex].length |0;
    ctx.moveTo(getX(pathIndex, -1), getY(pathIndex, -1));
    for(let i = 0; i < plen; ++i) {
      ctx.lineTo(getX(pathIndex, i), getY(pathIndex, i));
    }
  }
  ctx.strokeStyle = 'white';
  ctx.lineWidth = lineWidth * 2;
  ctx.stroke();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = lineWidth * 1;
  ctx.stroke();
  
  if(selectedSubpath >= 0) {
    const plen = path.subpaths[selectedSubpath].length |0;
    ctx.beginPath();
    ctx.moveTo(getX(selectedSubpath, selectionStart), getY(selectedSubpath, selectionStart));
    for(let i = (selectionStart + 1) % plen; i !== (selectionEnd + 1) % plen; i = (i + 1) % plen) {
      const curX = getX(selectedSubpath, i), curY = getY(selectedSubpath, i);
      ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 2;
    ctx.stroke();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = lineWidth * 1;
    ctx.stroke();
  }
}

const pinRadius = 1;
function renderPins(ctx, scale, pins) {
  const lineWidth = 2 / scale;
  
  for(let i = 0; i < pins.length; ++i) {
    const pin = pins[i];
    ctx.beginPath();
    ctx.moveTo(pin.x + pinRadius, pin.y);
    ctx.arc(pin.x, pin.y, pinRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = pin.keyframe.cssColor;
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 2;
    ctx.stroke();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = lineWidth * 1;
    ctx.stroke();
  }
}
