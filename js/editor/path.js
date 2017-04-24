let idCounter = 0;

export function create() {
  return {
    id: ++idCounter,
    color: { r: 0, g: 0, b: 0 },
    subpaths: [],
    x: 0,
    y: 0,
  };
}

export function clone(other) {
  return {
    id: other.id,
    color: {
      r: other.color.r,
      g: other.color.g,
      b: other.color.b,
    },
    subpaths: other.subpaths.map(x => x.slice(0)),
    x: other.x,
    y: other.y,
  };
}

export function duplicate(other) {
  const out = clone(other);
  out.id = ++idCounter;
  return out;
}

export function copyAToB(a, b) {
  b.color.r = a.color.r;
  b.color.g = a.color.g;
  b.color.b = a.color.b;
  const pathN = a.subpaths.length;
  if(b.subpaths.length > pathN) {
    b.subpaths.length = pathN;
  } else {
    while(pathN > b.subpaths.length) {
      b.subpaths.push([]);
    }
  }
  for(let pathIndex = 0; pathIndex < pathN; ++pathIndex) {
    const apath = a.subpaths[pathIndex], bpath = b.subpaths[pathIndex];
    const plen = apath.length;
    if(bpath.length > plen) {
      bpath.length = plen;
    }
    for(let i = 0; i < plen; ++i) {
      bpath[i] = apath[i];
    }
  }
  b.x = a.x;
  b.y = a.y;
}
