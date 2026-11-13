import { QueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      // Los 4xx (permisos, validación, sesión) no mejoran reintentando; la red y los 5xx sí.
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});
