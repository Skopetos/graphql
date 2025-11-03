export function formatNumber(n) {
  return n.toLocaleString();
}
export function sum(arr, f = x => x) {
  return arr.reduce((a, b) => a + f(b), 0);
}
export function show(el) { el.classList.remove("hidden"); }
export function hide(el) { el.classList.add("hidden"); }