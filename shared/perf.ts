export function perf(fn: () => { code: string }) {
  const start = performance.now();
  const response = fn();  
  const end = performance.now();
  return { code: response.code || "", time: end - start };
}
