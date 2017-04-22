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
