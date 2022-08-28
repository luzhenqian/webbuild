export function perf(fn: Function) {
  const start = performance.now();
  const response = fn();
  const end = performance.now();
  return { ...response, time: end - start };
}
