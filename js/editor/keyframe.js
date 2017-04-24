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
    selection: '',
  };
}

export function getSelection(paths) {
  const selection = paths.map(path => path.id);
  selection.sort((a, b) => a - b);
  return selection.join(',');
}

export function createWholesale(paths) {
  const out = create();
  out.paths = paths.map(Path.clone);
  out.selection = getSelection(out.paths);
  return out;
}

export function createCumulative(paths, frame) {
  // XXX
  const out = create();
  out.paths = paths.map(Path.clone);
  out.selection = getSelection(out.paths);
  return out;
}
