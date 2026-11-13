import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

import { ApiClientError } from "@/lib/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      // Se conserva la caché 30 min: volver a una pestaña o filtro ya visto es instantáneo.
      gcTime: 30 * 60_000,
      // Los 4xx (permisos, validación, sesión) no mejoran reintentando; la red y los 5xx sí.
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

// En el celular no hay "foco de ventana": al volver a la app se refrescan los datos vencidos.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}
