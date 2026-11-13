import { clearAccessToken, getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth-storage";
import { ApiClientError, request, type RequestOptions } from "@/lib/http";
import type { TokenResponse } from "@/lib/types";

export { ApiClientError } from "@/lib/http";

type SignedOutListener = () => void;
let signedOutListener: SignedOutListener | null = null;

/** La sesión se registra aquí para enterarse cuando el servidor rechaza las credenciales. */
export function onSessionExpired(listener: SignedOutListener | null): void {
  signedOutListener = listener;
}

let refreshing: Promise<string | null> | null = null;

/**
 * Canjea el refresh token por un access token nuevo. Una sola petición a la vez:
 * si varias consultas reciben 401 juntas, comparten el mismo canje.
 * Devuelve null si no hay refresh token o el servidor lo rechazó (sesión vencida).
 * Si no hay conexión, lanza el error para no cerrar la sesión por un mal momento de red.
 */
export function refreshSession(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = await getRefreshToken();
      if (!refresh) return null;
      try {
        const data = await request<TokenResponse>("/auth/refresh", {
          method: "POST",
          body: { refresh_token: refresh },
        });
        await saveTokens({ access: data.access_token, refresh: data.refresh_token });
        return data.access_token;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await clearSession();
          return null;
        }
        throw error;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();
  try {
    return await request<T>(path, options, token);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 401) throw error;

    // Token vencido: se renueva en silencio con el refresh token y se reintenta una vez.
    const renewed = await refreshSession();
    if (renewed) return request<T>(path, options, renewed);

    await clearAccessToken();
    signedOutListener?.();
    throw new ApiClientError("Tu sesión expiró. Inicia sesión de nuevo.", 401);
  }
}

/** Peticiones sin sesión (login). Un 401 aquí significa credenciales incorrectas, no sesión vencida. */
export function publicFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, null);
}
