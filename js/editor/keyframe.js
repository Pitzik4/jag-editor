import * as Path from './path.js';

export function create() {
  const color = {
    r: (Math.random() * 256) & 255,
    g: (Math.random() * 256) & 255,
    b: (Math.random() * 256) & 255,
  };
  return {
    color,
    cssColor: `rgb(${color.r},${color.g},${color.b})`,
    paths: [],
    pathDict: [],
    selection: '',
    type: 'wholesale',
  };
}

export function getSelection(paths) {
  const selection = paths.map(path => path.id);
  selection.sort((a, b) => a - b);
  return selection.join(',');
}

export function createWholesale(paths) {
  const out = create();
  const myPaths = out.paths = paths.map(Path.clone);
  for(let i = 0; i < myPaths.length; ++i) {
    out.pathDict[myPaths[i].id] = myPaths[i];
  }
  out.selection = getSelection(myPaths);
  out.type = 'wholesale';
  return out;
}

export function createCumulative(paths, frame) {
  // XXX
  const out = create();
  const myPaths = out.paths = paths.map(Path.clone);
  for(let i = 0; i < myPaths.length; ++i) {
    out.pathDict[myPaths[i].id] = myPaths[i];
  }
  out.selection = getSelection(myPaths);
  out.type = 'cumulative';
  return out;
}

export function applyWholesale(paths, keyframe, amount) {
  if(amount === undefined) {
    amount = 1;
  }
  for(let i = 0; i < paths.length; ++i) {
    const path = paths[i];
    const myPath = keyframe.pathDict[path.id];
    if(myPath) {
      Path.addAToB(myPath, path, amount);
    }
  }
}
