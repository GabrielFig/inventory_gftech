import * as LocalAuthentication from "expo-local-authentication";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { apiFetch, onSessionExpired, publicFetch, refreshSession } from "@/lib/api-client";
import {
  clearSession,
  getAccessToken,
  getBiometricEnabled,
  getRefreshToken,
  saveTokens,
  setBiometricEnabled,
} from "@/lib/auth-storage";
import { ApiClientError } from "@/lib/http";
import { queryClient } from "@/lib/query-client";
import type { CurrentUser, TokenResponse } from "@/lib/types";

export type SessionStatus = "loading" | "offline" | "signedOut" | "locked" | "signedIn";
export type UnlockResult = "ok" | "cancelled" | "offline" | "expired";
export type BiometricResult = "enabled" | "cancelled" | "unsupported";

/** Tiempo en segundo plano tras el cual la app vuelve a pedir la huella. */
const LOCK_AFTER_MS = 60_000;

interface SessionValue {
  status: SessionStatus;
  user: CurrentUser | null;
  isAdmin: boolean;
  biometricEnabled: boolean;
  /** El teléfono tiene sensor y al menos una huella/rostro registrado. */
  biometricAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryConnection: () => void;
  unlock: () => Promise<UnlockResult>;
  enableBiometric: () => Promise<BiometricResult>;
  disableBiometric: () => Promise<void>;
  /** Salir del bloqueo para entrar con correo y contraseña. */
  switchToPassword: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

async function checkBiometricAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const authenticating = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  const signOutLocally = useCallback(() => {
    setUser(null);
    setBiometricEnabledState(false);
    setStatus("signedOut");
    queryClient.clear();
  }, []);

  useEffect(() => {
    onSessionExpired(signOutLocally);
    return () => onSessionExpired(null);
  }, [signOutLocally]);

  // Arranque: decide si hay que pedir huella, validar la sesión guardada o ir a login.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [access, refresh, bio, available] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getBiometricEnabled(),
        checkBiometricAvailable(),
      ]);
      if (cancelled) return;
      setBiometricAvailable(available);

      if (!access && !refresh) {
        setStatus("signedOut");
        return;
      }
      if (bio && refresh && available) {
        setBiometricEnabledState(true);
        setStatus("locked");
        return;
      }
      if (bio && (!refresh || !available)) {
        // La huella ya no se puede usar (se borraron las huellas del teléfono): pasa a contraseña.
        await setBiometricEnabled(false);
      }

      try {
        const me = await apiFetch<CurrentUser>("/auth/me");
        if (cancelled) return;
        setUser(me);
        setStatus("signedIn");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 401) setStatus("signedOut");
        else setStatus("offline");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  // Bloqueo al volver de segundo plano.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== "active" || authenticating.current) return;
      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (since && Date.now() - since > LOCK_AFTER_MS && biometricEnabled && status === "signedIn") {
        setStatus("locked");
      }
    });
    return () => subscription.remove();
  }, [biometricEnabled, status]);

  const loadUser = useCallback(async () => {
    const me = await apiFetch<CurrentUser>("/auth/me");
    setUser(me);
    setStatus("signedIn");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await publicFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      await saveTokens({ access: data.access_token, refresh: data.refresh_token });
      await loadUser();
      setBiometricAvailable(await checkBiometricAvailable());
    },
    [loadUser],
  );

  const logout = useCallback(async () => {
    await clearSession();
    signOutLocally();
  }, [signOutLocally]);

  const switchToPassword = logout;

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquea GF-Tech LM",
        cancelLabel: "Cancelar",
      });
      if (!result.success) return "cancelled";

      try {
        const renewed = await refreshSession();
        if (!renewed) {
          signOutLocally();
          return "expired";
        }
        await loadUser();
        backgroundedAt.current = null;
        return "ok";
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          signOutLocally();
          return "expired";
        }
        return "offline";
      }
    } finally {
      authenticating.current = false;
    }
  }, [loadUser, signOutLocally]);

  const enableBiometric = useCallback(async (): Promise<BiometricResult> => {
    if (!(await checkBiometricAvailable())) return "unsupported";
    // Un servidor sin refresh tokens no permite sesión larga: sin esto la huella no serviría.
    if (!(await getRefreshToken())) return "unsupported";

    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirma tu huella para activar el acceso rápido",
        cancelLabel: "Cancelar",
      });
      if (!result.success) return "cancelled";
      await setBiometricEnabled(true);
      setBiometricEnabledState(true);
      return "enabled";
    } finally {
      authenticating.current = false;
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    await setBiometricEnabled(false);
    setBiometricEnabledState(false);
  }, []);

  const retryConnection = useCallback(() => {
    setStatus("loading");
    setBootAttempt((n) => n + 1);
  }, []);

  const value: SessionValue = {
    status,
    user,
    isAdmin: user?.role === "admin",
    biometricEnabled,
    biometricAvailable,
    login,
    logout,
    retryConnection,
    unlock,
    enableBiometric,
    disableBiometric,
    switchToPassword,
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
