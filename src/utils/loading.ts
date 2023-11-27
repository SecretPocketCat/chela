import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLoadingStateFn<TFn extends (...args: any[]) => PromiseLike<unknown>>(
  fn: TFn,
): {
  loading: boolean;
  fn: TFn;
} {
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadingFn = async (
    ...args: Parameters<TFn>
  ): Promise<Awaited<ReturnType<TFn>>> => {
    try {
      setLoading(true);
      return (await fn(...args)) as Awaited<ReturnType<TFn>>;
    } finally {
      setLoading(false);
    }
  };

  return {
    // the fn is just a wrapper, so it's the same fn signature
    // todo: is there a better way to deal with this?
    fn: loadingFn as unknown as TFn,
    loading,
  };
}
