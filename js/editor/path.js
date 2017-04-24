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

function blendAToB(a, b, amount) {
  return b + (a - b) * amount;
}

export function applyAToB(a, b, amount) {
  b.color.r = blendAToB(a.color.r, b.color.r, amount);
  b.color.g = blendAToB(a.color.g, b.color.g, amount);
  b.color.b = blendAToB(a.color.b, b.color.b, amount);
  const pathN = a.subpaths.length;
  if(b.subpaths.length !== pathN) {
    throw Error("Non-matching path counts for application!");
  }
  for(let pathIndex = 0; pathIndex < pathN; ++pathIndex) {
    const apath = a.subpaths[pathIndex], bpath = b.subpaths[pathIndex];
    const plen = apath.length;
    if(bpath.length !== plen) {
      throw Error("Non-matching point counts for application!");
    }
    for(let i = 0; i < plen; ++i) {
      bpath[i] = blendAToB(apath[i], bpath[i], amount);
    }
  }
  b.x = blendAToB(a.x, b.x, amount);
  b.y = blendAToB(a.y, b.y, amount);
}

export function addAToB(a, b, amount) {
  b.color.r += a.color.r * amount;
  b.color.g += a.color.g * amount;
  b.color.b += a.color.b * amount;
  const pathN = a.subpaths.length;
  if(b.subpaths.length !== pathN) {
    throw Error("Non-matching path counts for addition!");
  }
  for(let pathIndex = 0; pathIndex < pathN; ++pathIndex) {
    const apath = a.subpaths[pathIndex], bpath = b.subpaths[pathIndex];
    const plen = apath.length;
    if(bpath.length !== plen) {
      throw Error("Non-matching point counts for addition!");
    }
    for(let i = 0; i < plen; ++i) {
      bpath[i] += apath[i] * amount;
    }
  }
  b.x += a.x * amount;
  b.y += a.y * amount;
}

export function setToZero(path) {
  path.color.r = 0;
  path.color.g = 0;
  path.color.b = 0;
  const pathN = path.subpaths.length;
  for(let pathIndex = 0; pathIndex < pathN; ++pathIndex) {
    const apath = path.subpaths[pathIndex];
    const plen = apath.length;
    for(let i = 0; i < plen; ++i) {
      apath[i] = 0;
    }
  }
  path.x = 0;
  path.y = 0;
}
