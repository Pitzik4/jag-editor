const now =
  typeof performance !== 'undefined' && typeof performance.now !== 'undefined' ?
  () => performance.now() :
  () => Date.now();

const _requestAnimationFrame =
  typeof requestAnimationFrame !== 'undefined' ?
  requestAnimationFrame :
  function requestAnimationFrame(cb) {
    setTimeout(() => cb(now()), 16);
  };

export { now, _requestAnimationFrame as requestAnimationFrame };

export function byteArray(length) {
  if(typeof Uint8Array === 'undefined') {
    const out = [];
    for(let i = 0; i < length; ++i) {
      out.push(0);
    }
    return out;
  } else {
    return new Uint8Array(length);
  }
}

export function doubleArray(length) {
  if(typeof Float64Array === 'undefined') {
    const out = [];
    for(let i = 0; i < length; ++i) {
      out.push(0);
    }
    return out;
  } else {
    return new Float64Array(length);
  }
}
