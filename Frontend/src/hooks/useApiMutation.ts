"use client";

import { useCallback, useState } from "react";

interface MutationState<T> {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  data: T | null;
}

/**
 * Hook reutilizable para llamadas asíncronas (mutaciones de API) sin repetir try/catch/loading en las pantallas.
 */
export function useApiMutation<TArgs extends any[], TResult = any>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  options?: {
    onSuccessMessage?: string;
    onSuccess?: (result: TResult) => void;
  }
) {
  const [state, setState] = useState<MutationState<TResult>>({
    isLoading: false,
    error: null,
    successMessage: null,
    data: null,
  });

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setState({ isLoading: true, error: null, successMessage: null, data: null });
      try {
        const result = await mutationFn(...args);
        setState({
          isLoading: false,
          error: null,
          successMessage: options?.onSuccessMessage || null,
          data: result,
        });
        options?.onSuccess?.(result);
        return result;
      } catch (err: any) {
        setState({
          isLoading: false,
          error: err?.message || "Ocurrió un error inesperado",
          successMessage: null,
          data: null,
        });
        return null;
      }
    },
    [mutationFn, options]
  );

  const clearFeedback = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, successMessage: null }));
  }, []);

  return {
    ...state,
    mutate,
    clearFeedback,
  };
}

