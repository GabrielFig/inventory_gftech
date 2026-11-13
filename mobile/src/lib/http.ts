const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://inventory-gftech.onrender.com/api/v1";

/**
 * Despierta el servidor (Render duerme el plan gratis): se llama al abrir la app, así
 * cuando el usuario termina de poner la huella o la contraseña ya está listo.
 */
export function warmUpServer(): void {
  const root = API_URL.replace(/\/api\/v1\/?$/, "");
  fetch(root + "/health").catch(() => {});
}

// Render (plan gratis) duerme el servicio y la primera petición puede tardar ~50 s.
const TIMEOUT_MS = 70_000;

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: QueryParams;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function readDetail(data: unknown): string | null {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((e: { msg?: string }) => e.msg).filter(Boolean);
    return msgs.length ? msgs.join(", ") : null;
  }
  return typeof detail === "string" ? detail : null;
}

/** Petición cruda: sin lógica de sesión. Lanza ApiClientError (status 0 = sin conexión). */
export async function request<T>(path: string, options: RequestOptions = {}, token?: string | null): Promise<T> {
  const { method = "GET", body, params } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = (error as { name?: string })?.name === "AbortError";
    throw new ApiClientError(
      aborted
        ? "El servidor tardó demasiado en responder. Intenta de nuevo."
        : "No hay conexión con el servidor. Revisa tu internet.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail: string | null = null;
    try {
      detail = readDetail(await response.json());
    } catch {
      // cuerpo no JSON
    }
    throw new ApiClientError(detail ?? "Ocurrió un error inesperado", response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
