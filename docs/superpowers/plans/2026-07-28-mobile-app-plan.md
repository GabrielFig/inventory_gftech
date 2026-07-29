# Mobile App (Fase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Android (Expo/React Native) para registrar ventas de mostrador contra la misma API en producción (`https://inventory-gftech.onrender.com/api/v1`), según el spec en `docs/superpowers/specs/2026-07-28-mobile-app-design.md`.

**Architecture:** Proyecto Expo nuevo en `mobile/` (sibling de `backend/` y `frontend/`), con `expo-router` (file-based, rutas en `src/app/`), `@tanstack/react-query` para llamadas a la API, y `expo-secure-store` para el JWT. Dos pantallas: Login y Venta (buscar + registrar).

**Tech Stack:** Expo SDK 57, React 19.2, React Native 0.86, TypeScript ~6.0, expo-router ~57, expo-secure-store ~57, @tanstack/react-query.

## Global Constraints

- Node instalado es v20.19.1; los paquetes de React Native 0.86 piden `^20.19.4` (warning `EBADENGINE` de npm, no bloquea el install). Si `npx expo start` falla de forma rara, correr `nvm install 20.19.4 && nvm use 20.19.4` antes de reintentar.
- No hay emulador Android ni dispositivo conectado en este entorno — toda verificación visual/interactiva (Expo Go, APK final) la hace el usuario en su celular. Las tareas de código se verifican con `npx tsc --noEmit` (compila sin ejecutar) hasta la verificación manual final.
- La API no aplica CORS a apps nativas — no se toca nada en Render para esta fase.
- No se commitea `mobile/.env.local` (URL de API de desarrollo) — el `.gitignore` que genera `create-expo-app` ya lo cubre (`.env*.local`).

---

### Task 1: Scaffold del proyecto Expo

**Files:**
- Create: `mobile/` (vía `create-expo-app`, luego se limpia la plantilla demo)
- Delete: `mobile/src/app/explore.tsx`, `mobile/src/components/app-tabs.tsx`, `mobile/src/components/app-tabs.web.tsx`, `mobile/src/components/animated-icon*.tsx`, `mobile/src/components/animated-icon.module.css`, `mobile/src/components/hint-row.tsx`, `mobile/src/components/web-badge.tsx`, `mobile/src/components/ui/collapsible.tsx` (plantilla demo con tabs que no usamos)
- Modify: `mobile/src/app/_layout.tsx`, `mobile/src/app/index.tsx`
- Create: `mobile/src/app/login.tsx`, `mobile/src/app/venta.tsx` (stubs — Tasks 5 y 6 los reemplazan)

**Interfaces:**
- Produces: proyecto Expo corriendo con una pantalla en blanco en `src/app/index.tsx` — la base para las Tasks 2-9.

- [ ] **Step 1: Generar el proyecto**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
CI=1 npx --yes create-expo-app@latest mobile
```

(`CI=1` evita un prompt interactivo sobre inicializar git — no aplica aquí porque `mobile/` queda dentro del repo ya existente.)

- [ ] **Step 2: Borrar el `.git` anidado que crea el scaffold**

`create-expo-app` inicializa su propio repo git dentro de `mobile/` — hay que borrarlo porque `mobile/` debe quedar dentro del repo raíz del proyecto:

```bash
rm -rf mobile/.git
```

- [ ] **Step 3: Quitar la plantilla demo (tabs, iconos animados) que no usamos**

```bash
cd mobile
rm -f src/app/explore.tsx
rm -f src/components/app-tabs.tsx src/components/app-tabs.web.tsx
rm -f src/components/animated-icon.tsx src/components/animated-icon.web.tsx src/components/animated-icon.module.css
rm -f src/components/hint-row.tsx src/components/web-badge.tsx
rm -rf src/components/ui
```

- [ ] **Step 4: Simplificar el layout raíz (sin tabs, sin splash animado)**

Reemplazar el contenido completo de `mobile/src/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

(La Task 4 vuelve a modificar este archivo para agregar `QueryClientProvider` — este paso solo deja el router funcionando sin la plantilla demo.)

- [ ] **Step 5: Placeholder temporal en `index.tsx`**

Reemplazar el contenido completo de `mobile/src/app/index.tsx`:

```tsx
import { Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>GF-Tech LM</Text>
    </View>
  );
}
```

(La Task 4 reemplaza esto con la lógica real de guardia de sesión.)

- [ ] **Step 6: Stubs de `login.tsx` y `venta.tsx`**

`app.json` tiene `experiments.typedRoutes: true` — Expo Router solo reconoce como ruta válida (para type-checking) los archivos que ya existen en `src/app/`. Como `index.tsx` va a navegar a `/login` y `/venta` desde la Task 4, esas rutas deben existir ya, aunque sea como placeholder — si no, `tsc --noEmit` falla.

Crear `mobile/src/app/login.tsx` y `mobile/src/app/venta.tsx` con el mismo contenido placeholder (Task 5 y Task 6 los reemplazan por completo):

```tsx
import { Text, View } from "react-native";

export default function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>GF-Tech LM</Text>
    </View>
  );
}
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
git add mobile/
git commit -m "feat(mobile): scaffold Expo + limpieza de plantilla demo"
```

---

### Task 2: Tipos compartidos con la API

**Files:**
- Create: `mobile/src/lib/types.ts`

**Interfaces:**
- Produces: `TokenResponse`, `CurrentUser`, `UserRole`, `Product`, `ProductListResponse`, `SaleCreate`, `SaleRead` — usados por Tasks 3, 5, 6, 7.

- [ ] **Step 1: Escribir los tipos**

Crear `mobile/src/lib/types.ts` (reflejan exactamente los schemas Pydantic de `backend/app/schemas/auth.py`, `product.py` y `sale.py`):

```ts
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type UserRole = "admin" | "vendedor";

export interface CurrentUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export type StockStatus = "ok" | "bajo" | "agotado";

export interface Product {
  id: string;
  code: string;
  name: string;
  model_compatibility: string;
  sale_price: string;
  cost: string;
  current_stock: number;
  status: StockStatus;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface SaleCreate {
  product_id: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
}

export interface SaleRead {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  notes: string | null;
  sale_date: string;
  total: string;
  profit: string;
}
```

Nota: `sale_price`, `cost`, `unit_price`, `unit_cost`, `total`, `profit` llegan como string desde FastAPI (son `Decimal` serializados por Pydantic) — se convierten con `Number(...)` donde se necesiten como número (Task 6 y 7).

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/types.ts
git commit -m "feat(mobile): tipos compartidos con la API"
```

---

### Task 3: Auth storage (SecureStore) + cliente API con JWT

**Files:**
- Create: `mobile/src/lib/auth-storage.ts`
- Create: `mobile/src/lib/api-client.ts`

**Interfaces:**
- Consumes: tipos de Task 2
- Produces: `getToken()`, `setToken(token)`, `clearToken()` (async, usadas por Tasks 4-7); `apiFetch<T>(path, options)`, `ApiClientError` (usadas por Tasks 5-7)

- [ ] **Step 1: Auth storage sobre SecureStore**

Crear `mobile/src/lib/auth-storage.ts`:

```ts
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "gftech_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

- [ ] **Step 2: Cliente API**

Crear `mobile/src/lib/api-client.ts` — mismo patrón que `frontend/src/lib/api-client.ts`, adaptado a que `getToken`/`clearToken` son async (no hay `document.cookie` en React Native):

```ts
import { clearToken, getToken } from "./auth-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8010/api/v1";

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined | null>;
  auth?: boolean;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    await clearToken();
    throw new ApiClientError("Sesión expirada", 401);
  }

  if (!response.ok) {
    let detail = "Ocurrió un error inesperado";
    try {
      const data = await response.json();
      detail = data.detail ?? detail;
    } catch {
      // ignore json parse errors
    }
    throw new ApiClientError(detail, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/auth-storage.ts mobile/src/lib/api-client.ts
git commit -m "feat(mobile): auth storage con SecureStore y cliente API con JWT"
```

---

### Task 4: QueryClientProvider + layout raíz con guardia de sesión

**Files:**
- Modify: `mobile/src/app/_layout.tsx`
- Modify: `mobile/src/app/index.tsx`
- Create: `mobile/src/lib/query-client.ts`

**Interfaces:**
- Consumes: `apiFetch`, `getToken` de Task 3; `CurrentUser` de Task 2
- Produces: `queryClient` (usado solo internamente por `_layout.tsx`); patrón de guardia de sesión que Tasks 5 y 7 asumen (si no hay sesión válida, `index.tsx` ya mandó a `/login`)

- [ ] **Step 1: QueryClient con reintentos para el cold-start de Render**

Crear `mobile/src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
    },
  },
});
```

- [ ] **Step 2: Envolver el layout con `QueryClientProvider`**

Reemplazar el contenido completo de `mobile/src/app/_layout.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { queryClient } from "@/lib/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Guardia de sesión en `index.tsx`**

Reemplazar el contenido completo de `mobile/src/app/index.tsx`:

```tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { apiFetch, ApiClientError } from "@/lib/api-client";
import { clearToken, getToken } from "@/lib/auth-storage";
import type { CurrentUser } from "@/lib/types";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        await apiFetch<CurrentUser>("/auth/me");
        if (!cancelled) router.replace("/venta");
      } catch (error) {
        if (error instanceof ApiClientError) await clearToken();
        if (!cancelled) router.replace("/login");
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size="large" />
      <Text>Conectando con el servidor…</Text>
    </View>
  );
}
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores — `src/app/login.tsx` y `src/app/venta.tsx` ya existen como stubs desde la Task 1 Step 6, así que `router.replace("/login")` y `router.replace("/venta")` son rutas válidas para `typedRoutes`.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/_layout.tsx mobile/src/app/index.tsx mobile/src/lib/query-client.ts
git commit -m "feat(mobile): QueryClientProvider y guardia de sesión"
```

---

### Task 5: Pantalla de Login

**Files:**
- Create: `mobile/src/hooks/useLogin.ts`
- Modify: `mobile/src/app/login.tsx` (reemplaza el stub de la Task 1)

**Interfaces:**
- Consumes: `apiFetch`, `ApiClientError`, `setToken` de Task 3; `TokenResponse` de Task 2
- Produces: ruta `/login` que Task 4 (`index.tsx`) ya referencia

- [ ] **Step 1: Hook de login**

Crear `mobile/src/hooks/useLogin.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { apiFetch } from "@/lib/api-client";
import { setToken } from "@/lib/auth-storage";
import type { TokenResponse } from "@/lib/types";

interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<TokenResponse>("/auth/login", { method: "POST", body: input, auth: false }),
    onSuccess: async (data) => {
      await setToken(data.access_token);
      router.replace("/venta");
    },
  });
}
```

- [ ] **Step 2: Pantalla de Login**

Crear `mobile/src/app/login.tsx`:

```tsx
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiClientError } from "@/lib/api-client";
import { useLogin } from "@/hooks/useLogin";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const errorMessage =
    login.error instanceof ApiClientError ? login.error.message : login.error ? "No se pudo conectar" : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GF-Tech LM</Text>
      <TextInput
        style={styles.input}
        placeholder="tu@gftech.mx"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable
        style={styles.button}
        disabled={login.isPending}
        onPress={() => login.mutate({ email, password })}
      >
        {login.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#208AEF", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626", textAlign: "center" },
});
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useLogin.ts mobile/src/app/login.tsx
git commit -m "feat(mobile): pantalla de login"
```

---

### Task 6: Buscador de productos en la pantalla Venta

**Files:**
- Create: `mobile/src/hooks/useDebouncedValue.ts`
- Create: `mobile/src/hooks/useProductSearch.ts`
- Modify: `mobile/src/app/venta.tsx` (reemplaza el stub de la Task 1)

**Interfaces:**
- Consumes: `apiFetch` de Task 3; `Product`, `ProductListResponse` de Task 2
- Produces: ruta `/venta` que Task 4 (`index.tsx`) y Task 5 (`useLogin`) ya referencian; estado `selectedProduct` que Task 7 consume dentro del mismo archivo `venta.tsx`

- [ ] **Step 1: Hook de debounce genérico**

Crear `mobile/src/hooks/useDebouncedValue.ts`:

```ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Hook de búsqueda de productos**

Crear `mobile/src/hooks/useProductSearch.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { ProductListResponse } from "@/lib/types";

export function useProductSearch(search: string) {
  return useQuery({
    queryKey: ["products", "search", search],
    queryFn: () => apiFetch<ProductListResponse>("/products", { params: { search, limit: 10 } }),
    enabled: search.trim().length >= 2,
  });
}
```

- [ ] **Step 3: Pantalla Venta — buscador y selección (sin el formulario de confirmación todavía)**

Crear `mobile/src/app/venta.tsx`:

```tsx
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { Product } from "@/lib/types";

const STATUS_LABEL: Record<Product["status"], string> = {
  ok: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

export default function VentaScreen() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isFetching } = useProductSearch(debouncedSearch);

  if (selectedProduct) {
    // La Task 7 reemplaza este bloque por el formulario de confirmación de venta.
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setSelectedProduct(null)}>
          <Text style={styles.back}>← Cambiar producto</Text>
        </Pressable>
        <Text style={styles.title}>{selectedProduct.name}</Text>
        <Text>{selectedProduct.code}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar venta</Text>
      <TextInput
        style={styles.input}
        placeholder="INV-001, Ghostic Acrigel, iPhone 15..."
        value={search}
        onChangeText={setSearch}
      />
      {isFetching ? <ActivityIndicator style={styles.spinner} /> : null}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => setSelectedProduct(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultCode}>
                {item.code} · {item.model_compatibility}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.resultPrice}>${item.sale_price}</Text>
              <Text style={styles.resultStatus}>{STATUS_LABEL[item.status]}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  spinner: { marginVertical: 8 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultName: { fontSize: 16, fontWeight: "600" },
  resultCode: { color: "#666", fontSize: 13 },
  resultPrice: { fontSize: 16, fontWeight: "600" },
  resultStatus: { color: "#666", fontSize: 13 },
  back: { color: "#208AEF", marginBottom: 8 },
});
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useDebouncedValue.ts mobile/src/hooks/useProductSearch.ts mobile/src/app/venta.tsx
git commit -m "feat(mobile): buscador de productos en la pantalla de venta"
```

---

### Task 7: Registrar venta (formulario de confirmación)

**Files:**
- Create: `mobile/src/hooks/useRegisterSale.ts`
- Modify: `mobile/src/app/venta.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `ApiClientError` de Task 3; `SaleCreate`, `SaleRead` de Task 2; el bloque `if (selectedProduct)` de Task 6 que este task reemplaza
- Produces: flujo de venta completo — no hay más tasks que dependan de esto

- [ ] **Step 1: Hook para registrar la venta**

Crear `mobile/src/hooks/useRegisterSale.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { SaleCreate, SaleRead } from "@/lib/types";

export function useRegisterSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaleCreate) => apiFetch<SaleRead>("/sales", { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

- [ ] **Step 2: Reemplazar el bloque de confirmación en `venta.tsx`**

En `mobile/src/app/venta.tsx`, agregar los imports:

```tsx
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { ApiClientError } from "@/lib/api-client";
import { useRegisterSale } from "@/hooks/useRegisterSale";
```

Reemplazar el bloque `if (selectedProduct) { ... }` de la Task 6 por:

```tsx
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const registerSale = useRegisterSale();

  useEffect(() => {
    if (selectedProduct) setUnitPrice(selectedProduct.sale_price);
  }, [selectedProduct]);

  if (selectedProduct) {
    const errorMessage =
      registerSale.error instanceof ApiClientError ? registerSale.error.message : null;

    return (
      <View style={styles.container}>
        <Pressable
          onPress={() => {
            setSelectedProduct(null);
            registerSale.reset();
          }}
        >
          <Text style={styles.back}>← Cambiar producto</Text>
        </Pressable>
        <Text style={styles.title}>{selectedProduct.name}</Text>
        <Text style={styles.resultCode}>
          {selectedProduct.code} · Disponible: {selectedProduct.current_stock} pieza(s)
        </Text>

        <Text>Cantidad</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <Text>Precio unitario</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={unitPrice}
          onChangeText={setUnitPrice}
        />

        <Text>Notas (opcional)</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable
          style={styles.button}
          disabled={registerSale.isPending}
          onPress={() => {
            const parsedQuantity = Number(quantity);
            const parsedPrice = Number(unitPrice);
            if (!parsedQuantity || parsedQuantity <= 0) return;

            registerSale.mutate(
              {
                product_id: selectedProduct.id,
                quantity: parsedQuantity,
                unit_price: parsedPrice || undefined,
                notes: notes || undefined,
              },
              {
                onSuccess: (sale) => {
                  Alert.alert("Venta registrada", `Total: $${sale.total}`);
                  setSelectedProduct(null);
                  setSearch("");
                  setQuantity("1");
                  setNotes("");
                },
              },
            );
          }}
        >
          {registerSale.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirmar venta</Text>
          )}
        </Pressable>
      </View>
    );
  }
```

Y agregar los dos estilos que faltan al `StyleSheet.create` existente:

```tsx
  button: { backgroundColor: "#208AEF", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626" },
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useRegisterSale.ts mobile/src/app/venta.tsx
git commit -m "feat(mobile): formulario de confirmación y registro de venta"
```

---

### Task 8: Variables de entorno y verificación manual en Expo Go

**Files:**
- Create: `mobile/.env.example`
- Create: `mobile/.env.local` (no se commitea — ya cubierto por el `.gitignore` del scaffold)

**Interfaces:** ninguna — tarea de configuración y verificación manual.

- [ ] **Step 1: Documentar la variable de entorno**

Crear `mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://TU-IP-LOCAL:8010/api/v1
```

- [ ] **Step 2: Configurar el entorno de desarrollo — CHECKPOINT: lo hace el usuario**

Expo Go corre en tu celular físico, así que `localhost` ahí se refiere al celular, no a tu computadora — hay que usar la IP local de tu máquina en la misma red WiFi.

```bash
# obtener tu IP local (Linux):
hostname -I | awk '{print $1}'
```

Crear `mobile/.env.local` con esa IP:
```
EXPO_PUBLIC_API_URL=http://<TU-IP-LOCAL>:8010/api/v1
```

- [ ] **Step 3: Levantar el backend local y correr la app — CHECKPOINT: lo hace el usuario en su celular**

```bash
# en una terminal: levantar el backend local
cd /home/gabriel/Documentos/portafolio/inventario_gftech
docker compose up -d

# en otra terminal: correr Expo
cd mobile
npx expo start
```

Escanear el QR con la app **Expo Go** (Android) desde el celular, conectado a la misma red WiFi.

- [ ] **Step 4: Probar el flujo completo — CHECKPOINT: lo hace el usuario**

1. Login con `admin@gftech.mx` / `GFTech2026!` (credenciales de desarrollo).
2. Buscar un producto (ej. `INV-001`).
3. Registrar una venta de prueba, confirmar que aparece el total.
4. Cerrar la app y volver a abrirla — debe entrar directo a Venta (sesión persistida en SecureStore) sin pedir login de nuevo.

- [ ] **Step 5: Probar contra producción (Render + Neon)**

Cambiar `mobile/.env.local` temporalmente a:
```
EXPO_PUBLIC_API_URL=https://inventory-gftech.onrender.com/api/v1
```
Reiniciar `npx expo start`, repetir el login (con las credenciales de producción) y una venta de prueba — confirmar en el navegador (`https://inventory-gftech.vercel.app`) que la venta aparece ahí también, ya que es la misma base de datos.

Revertir `mobile/.env.local` a la IP local para seguir desarrollando.

- [ ] **Step 6: Commit**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
git add mobile/.env.example
git commit -m "docs(mobile): documentar EXPO_PUBLIC_API_URL"
```

---

### Task 9: Build de producción con EAS y APK final

**Files:**
- Create: `mobile/eas.json`

**Interfaces:** ninguna — tarea final de distribución.

- [ ] **Step 1: Instalar EAS CLI y loguearse — CHECKPOINT: requiere cuenta de Expo del usuario**

```bash
cd mobile
npx eas login
npx eas build:configure
```

Esto genera `mobile/eas.json` automáticamente.

- [ ] **Step 2: Configurar el profile de build para apuntar a producción**

En `mobile/eas.json`, agregar la variable de entorno de producción al profile `preview` (o el que haya generado el Step 1):

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://inventory-gftech.onrender.com/api/v1"
      }
    }
  }
}
```

- [ ] **Step 3: Generar el APK — CHECKPOINT: lo hace el usuario (build en la nube de Expo, consume cuota del plan free)**

```bash
npx eas build --platform android --profile preview
```

Al terminar, EAS da un link de descarga del `.apk`.

- [ ] **Step 4: Instalar y probar en el celular del mostrador**

Descargar el `.apk` desde el link, habilitar "orígenes desconocidos" en el celular, instalar. Repetir el flujo de login + venta de prueba (Task 8 Step 4) contra la app instalada — debe comportarse igual que en Expo Go.

- [ ] **Step 5: Commit**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
git add mobile/eas.json
git commit -m "chore(mobile): configuración de EAS Build"
```

---

## Fuera de alcance (backlog para después)

Igual que quedó documentado en el spec: historial de ventas, alertas de stock bajo, dashboard, gestión de productos, iOS, publicación en Play Store. Todo se puede agregar como pantallas nuevas en `mobile/src/app/` sin tocar el backend.
