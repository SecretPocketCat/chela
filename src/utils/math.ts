export function mod(num: number, divisor: number): number {
  return ((num % divisor) + divisor) % divisor;
}
