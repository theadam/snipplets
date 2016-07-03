export function getDeps(el) {
  return (el.getAttribute('data-deps') || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

export function debounce(wait = 100, fn) {
  let timeout;
  return function debouncer(...args) {
    const ctx = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(ctx, args);
    }, wait);
  };
}
