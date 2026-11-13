# GF-Tech LM — App móvil (Android)

App para llevar el negocio desde el celular: ventas, inventario, ingresos y servicios técnicos.
Habla con la misma API (FastAPI) que la web, sin duplicar lógica.

## Qué incluye

| Pestaña | Qué puedes hacer |
|---|---|
| **Inicio** | Ingresos de hoy / 7 / 30 días / año (ventas + servicios + ganancia), gráfica de 7 días, accesos rápidos, alertas de stock y ventas recientes |
| **Ventas** | Historial agrupado por día, con total y ganancia; registrar venta rápida; editar o eliminar (admin) |
| **Inventario** | Buscar y filtrar (stock bajo, agotados, categoría); detalle, resurtir, alta y edición de productos (admin) |
| **Servicios** | **Mis tarifas**: lo que cobras por cada servicio técnico. **Cobrados**: historial de servicios, que suma a tus ingresos |
| **Más** | Ingresos, buscador por modelo (“¿qué le queda a este teléfono?”), acceso con huella, cerrar sesión |

Los permisos siguen a la web: el **vendedor** registra ventas y cobra servicios; el **administrador**
además da de alta/edita productos y tarifas, y ve costos y ganancias.

## Acceso con huella

1. La primera vez se entra con correo y contraseña. La app ofrece activar la huella.
2. Con la huella activa, al abrir la app solo se pide la huella (o el PIN del teléfono como respaldo).
3. La app se vuelve a bloquear si pasa más de 1 minuto en segundo plano.
4. Se puede activar/desactivar en **Más → Entrar con huella**.

Detalle técnico: el login devuelve un `access_token` (12 h) y un `refresh_token` (90 días). Ambos se guardan
en `expo-secure-store` (Keystore de Android). Cuando el access token vence, la app lo renueva sola con
`POST /auth/refresh` (que además rota el refresh token). **La contraseña nunca se guarda en el teléfono.**
Requiere backend con `/auth/refresh` (rama `feature/mobile-app`).

## Rendimiento y animaciones

- **Arranque rápido:** al abrir la app se despierta el servidor (Render) en segundo plano y, al iniciar sesión,
  se precargan Ventas, Inventario y Servicios para que abran con datos y no con esqueletos.
- **Caché y foco:** los datos se conservan 30 min y se refrescan solos al volver a la app.
- **Listas:** ventana de renderizado acotada y pestañas inactivas congeladas (`freezeOnBlur`).
- **Animaciones (Reanimated, hilo de UI):** botones que se hunden al tocar, entrada escalonada de secciones y filas,
  cifra de ingresos que "cuenta", barras de la gráfica que crecen, selector con indicador deslizante,
  esqueletos con pulso e ícono activo de las pestañas con rebote.
- **Barra del sistema:** la barra de pestañas, los botones flotantes y los formularios suman el área segura
  inferior, así que se acomodan tanto a la navegación por botones como a la de gestos.

## Desarrollo

```bash
cd mobile
npm install
cp .env.example .env.local        # EXPO_PUBLIC_API_URL → IP de tu PC en la red local
npx expo start                    # escanea el QR con Expo Go
```

Para probar contra el backend local de Docker Compose usa `EXPO_PUBLIC_API_URL=http://<IP-de-tu-PC>:8010/api/v1`
y agrega el origen a `CORS_ORIGINS` solo si pruebas la versión web (`npx expo start --web`);
las apps nativas no usan CORS. Sin `.env.local` la app apunta a producción
(`https://inventory-gftech.onrender.com/api/v1`).

> Render (plan gratis) duerme el servicio tras 15 min sin tráfico: la primera petición puede tardar ~50 s.
> La app lo muestra como “El servidor está despertando…” y reintenta; no es un error.

## Generar el APK

```bash
npx eas-cli login                                    # una sola vez
npx eas-cli build --platform android --profile preview
```

El perfil `preview` (en `eas.json`) genera un **APK** instalable que apunta a la API de producción.
Descárgalo del enlace que entrega EAS e instálalo en el teléfono (permite “instalar apps de origen desconocido”).

## Estructura

```
src/
  app/            rutas (expo-router): login, unlock, (tabs)/*, venta/*, producto/*, servicio/*, ingresos, modelo
  components/ui/  sistema de diseño: Button, Card, TextField, Chips, Fab, estados vacíos/error/carga…
  theme/          tokens (colores claro/oscuro, espaciado, tipografía Space Grotesk)
  lib/            cliente API con renovación de sesión, sesión/huella, formato, periodos
  hooks/api.ts    consultas y mutaciones (TanStack Query)
```
