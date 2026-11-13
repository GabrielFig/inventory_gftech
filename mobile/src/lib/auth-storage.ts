import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_KEY = "gftech_access_token";
const REFRESH_KEY = "gftech_refresh_token";
const BIOMETRIC_KEY = "gftech_biometric_enabled";
const LEGACY_TOKEN_KEY = "gftech_token";

// SecureStore (Keystore en Android) no existe en web; solo se usa localStorage
// para poder probar las pantallas en el navegador durante el desarrollo.
const isWeb = Platform.OS === "web";

async function read(key: string): Promise<string | null> {
  if (isWeb) return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return (await read(ACCESS_KEY)) ?? (await read(LEGACY_TOKEN_KEY));
}

export const getRefreshToken = () => read(REFRESH_KEY);

export async function saveTokens(tokens: { access: string; refresh?: string | null }): Promise<void> {
  await write(ACCESS_KEY, tokens.access);
  if (tokens.refresh) await write(REFRESH_KEY, tokens.refresh);
  await remove(LEGACY_TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  await remove(ACCESS_KEY);
  await remove(LEGACY_TOKEN_KEY);
}

export async function getBiometricEnabled(): Promise<boolean> {
  return (await read(BIOMETRIC_KEY)) === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await write(BIOMETRIC_KEY, "1");
  else await remove(BIOMETRIC_KEY);
}

/** Cierra sesión por completo: borra tokens y la preferencia de huella. */
export async function clearSession(): Promise<void> {
  await Promise.all([remove(ACCESS_KEY), remove(REFRESH_KEY), remove(BIOMETRIC_KEY), remove(LEGACY_TOKEN_KEY)]);
}
