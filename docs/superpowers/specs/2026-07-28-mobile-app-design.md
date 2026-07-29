# Mobile App (Fase 3) — Design Spec

## Goal

Dar a los vendedores de GF-Tech LM una forma de registrar ventas de mostrador desde un celular Android, consumiendo la misma API (FastAPI en Render + Postgres en Neon) que ya usa el frontend web — sin duplicar lógica de negocio, sin tocar el backend.

## Contexto

- La API (`https://inventory-gftech.onrender.com/api/v1`) ya está online, con JWT en el header `Authorization: Bearer <token>` (no cookies), lo que la hace consumible desde cualquier cliente sin cambios — ver `frontend/src/lib/api-client.ts` como referencia del patrón ya validado en producción.
- CORS no aplica a apps nativas (es una restricción exclusiva de navegadores), así que no hace falta tocar `CORS_ORIGINS` en Render para esta fase.
- Render (plan free) duerme el servicio tras 15 min sin tráfico; la primera petición del día puede tardar ~30-50s en responder. La app debe manejar esto con un estado de carga, no como un error.

## Alcance de v1

Enfocada en un único caso de uso: **registrar una venta rápido en el mostrador.**

**Incluye:**
- Login
- Buscar producto + registrar venta (pantalla única)

**Explícitamente fuera de alcance de v1** (la API ya los soporta; son pantallas nuevas a futuro, no cambios de backend):
- Historial de ventas
- Alertas de stock bajo
- Dashboard / KPIs
- Gestión de productos (alta/edición/resurtido) — funciones de admin
- iOS
- Publicación en Play Store

## Enfoque técnico

**Elegido: Expo (React Native), managed workflow.**

- Reutiliza el modelo mental de React que ya existe en `frontend/` (Next.js) — mismas ideas de componentes, hooks, TanStack Query.
- No requiere Android Studio/SDK local: los builds de producción se hacen con **EAS Build** (servicio en la nube de Expo, plan free alcanza para esta app).
- Durante desarrollo se usa la app **Expo Go** (escanear QR) para iterar sin compilar nada.

**Alternativas descartadas:**
- *Flutter*: mismo resultado, pero en Dart — sin reuso de patrones con el código React ya existente en el repo. No aporta nada aquí.
- *React Native "bare" (sin Expo)*: más control de bajo nivel, pero obliga a mantener el toolchain nativo de Android localmente (Gradle, SDK) — complejidad innecesaria para una app de 2 pantallas.

## Estructura del proyecto

Nuevo directorio `mobile/` en la raíz del repo, al mismo nivel que `backend/` y `frontend/`:

```
mobile/
  app/                 # rutas (expo-router, file-based)
    _layout.tsx        # layout raíz: valida sesión, redirige a login o venta
    login.tsx
    venta.tsx
  src/
    lib/
      api-client.ts     # fetch wrapper con JWT — mismo patrón que frontend/src/lib/api-client.ts
      auth-storage.ts    # wrapper sobre expo-secure-store (en vez de cookies)
      types.ts           # tipos compartidos con las respuestas de la API (Product, Sale, TokenResponse)
    hooks/
      useLogin.ts
      useProductSearch.ts
      useRegisterSale.ts
  app.json
  package.json
```

## Arquitectura y flujo de datos

**Sesión:**
1. Al abrir la app, se lee el token guardado en `expo-secure-store`.
2. Si existe, se valida contra `GET /api/v1/auth/me`. Si responde 200, pasa directo a la pantalla Venta. Si responde 401 (o no hay token), va a Login.
3. Login hace `POST /api/v1/auth/login` con `{email, password}` → guarda `access_token` de la respuesta en `expo-secure-store` → navega a Venta.

**Pantalla Venta (flujo principal):**
1. Buscador de texto, debounced (300ms) → `GET /api/v1/products?search=<texto>&limit=10` mientras el usuario escribe.
2. Selecciona un producto de los resultados → se muestra su `sale_price`, `current_stock` y `status` (ok/bajo/agotado).
3. Formulario de confirmación: cantidad (default 1), precio unitario (precargado con `sale_price`, editable — igual que permite el backend con `unit_price` opcional en `SaleCreate`), notas opcionales.
4. Confirmar → `POST /api/v1/sales` con `{product_id, quantity, unit_price, notes}`.
5. Éxito → mensaje de confirmación (toast) con el total vendido, se limpia el buscador para la siguiente venta.
6. Error de stock insuficiente (400 del backend) → se muestra el mensaje de error tal cual lo manda la API (`"Stock insuficiente. Disponible: N pieza(s)"`).

**Manejo de errores globales:**
- Cualquier respuesta 401 → borra el token guardado, redirige a Login.
- Timeout o error de red en la primera petición tras abrir la app → pantalla de "Conectando con el servidor… puede tardar hasta 1 minuto" con reintento automático (aprovechando los reintentos por defecto de TanStack Query), no un error duro.
- Sin caché offline: si no hay conexión, no se puede ni buscar ni vender — es una decisión consciente para v1 (documentado arriba en Contexto).

## Librerías clave

- `expo-router` — navegación file-based, ya viene en el template estándar de Expo; deja el camino abierto para agregar pantallas (historial, alertas) sin reestructurar.
- `@tanstack/react-query` — mismo patrón que `frontend/`, con reintentos automáticos (ayuda con el cold-start de Render).
- `expo-secure-store` — almacenamiento cifrado del JWT (Keystore en Android), en vez de `AsyncStorage` (que guarda en texto plano).
- Variable de entorno `EXPO_PUBLIC_API_URL` (convención de Expo para env vars públicas, equivalente a `NEXT_PUBLIC_*` en Next.js) apuntando a `https://inventory-gftech.onrender.com/api/v1` en producción, o a la IP local del backend Docker en desarrollo.

## Build y distribución

- **Desarrollo:** Expo Go (QR), sin compilar, contra la API local de Docker Compose o contra Render.
- **Producción:** cuenta gratis de Expo + `eas build --platform android --profile preview` → genera un APK descargable desde la nube. Se instala en el celular del mostrador habilitando "orígenes desconocidos" — sin pasar por Google Play.

## Testing

- Manual: flujo de login + búsqueda + venta probado en Expo Go contra el backend local (Docker Compose) durante desarrollo.
- Antes de entregar: mismo flujo probado en un APK real (EAS Build) contra la API de producción en Render, incluyendo el caso de cold-start (probar con el servicio dormido).
- No se agregan tests automatizados de UI para esta v1 — es una app de 2 pantallas; el costo de un framework de testing E2E no se justifica todavía (YAGNI). Si la app crece (historial, alertas, admin), se reevalúa.
