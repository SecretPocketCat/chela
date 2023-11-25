// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function forgetFnReturn<T extends (...args: any[]) => unknown>(fn: T) {
  return fn as ReplaceReturnType<T, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (
  ...a: Parameters<T>
) => TNewReturn;
