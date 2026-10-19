# CHUCK's Web — Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

Panel personal **CHUCK's Web**: una suite de herramientas en español para el día a día — tareas, seguimiento de los peques ("Hijitos"), cuentas y movimientos, calendario con festivos, control de peso, colecciones personalizadas, wiki personal y lista de compras con seguimiento de precios.

Este repositorio contiene **solo la capa de presentación**. Todos los datos viven en el backend y se consumen a través del BFF.

> **Arquitectura:** [`chucks-web-frontend`](.) (este repo, `:5177`) → [`chucks-web-bff`](../chucks-web-bff) (`:3000`) → [`chucks-web-backend`](../chucks-web-backend) (`:3001` + PostgreSQL)

## Secciones de la aplicación

La navegación es un estado interno en `src/App.tsx` (sin router):

| Sección | Descripción |
|---|---|
| Mis tareas | Tareas con pestañas por contexto/proyecto |
| Hijitos | Seguimiento por tracks (tareas, subtareas, prioridades, banners) |
| Cuentas | Cuentas con columnas propias y registros (movimientos) |
| Calendario | Eventos, colores y festivos |
| Control de peso | Registro de peso y objetivo |
| Colección | Colecciones genéricas con columnas definidas por el usuario, items, tags e importación desde LaunchBox/CSV |
| Wiki | Páginas de documentación con categorías, jerarquía y resaltado de sintaxis |
| Lista de Compras | Wishlist con scraping de precios, contextos de compra y refresh de links |

## Stack

| Área | Tecnología |
|---|---|
| UI | React 19, TypeScript 6 |
| Build | Vite 8 + `@vitejs/plugin-react` |
| Estilos | CSS Modules (`*.module.css`) + hojas globales en `src/styles/` |
| Tema claro/oscuro | `data-theme` persistido en `localStorage` (`marea-theme`) — `src/hooks/useTheme.ts` |
| HTTP | `fetch` nativo (sin axios) |
| Sintaxis | `highlight.js` (wiki) |
| Lint | Oxlint (reemplaza ESLint) |

Sin router, sin state management externo (todo `useState` local) y sin framework de testing por ahora.

## Requisitos

- Node.js 20+ recomendado
- El [BFF](../chucks-web-bff) levantado (por defecto en `http://localhost:3000`)

## Puesta en marcha

```bash
npm install
```

Configura la URL del BFF (opcional, hay default `http://localhost:3000`):

```bash
# .env.local
VITE_BFF_URL=http://localhost:3000
```

```bash
npm run dev
```

La app queda en **http://localhost:5177** (puerto fijo, `strictPort: true`).

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Type-check (`tsc -b`) + build de producción en `dist/` |
| `npm run lint` | Lint con Oxlint |
| `npm run preview` | Sirve el build de producción (también en `:5177`) |

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `VITE_BFF_URL` | `http://localhost:3000` | URL base del BFF — ver `src/api/http.ts` |

Los archivos `*.local` están en `.gitignore`; usa `.env.local` para tu configuración.

## Estructura

```
src/
├── main.tsx                  # Entry point (StrictMode + <App/>)
├── App.tsx                   # Shell de layout + navegación y estado global mínimo
├── api/                      # Capa de acceso a datos (una función por dominio)
│   ├── http.ts               # Cliente fetch central (requestJson + BFF_URL)
│   ├── accounts.ts  calendar.ts  collections.ts  hijitos.ts
│   ├── images.ts    launchbox.ts  shopping.ts     weight.ts
│   └── wiki.ts      wishlist.ts
├── components/
│   ├── Sidebar.tsx  Header.tsx  Hero.tsx  ThemeToggle.tsx  ...
│   ├── TasksList/TaskItem/TaskModal, ProjectCard/ProjectModal
│   ├── HijitosTool  CuentasTool  CalendarioTool  ControlPesoTool
│   ├── WikiTool  ShoppingWishlistTool
│   └── collection/           # Suite de colecciones (editor, items, LaunchBox, wishlist)
├── hooks/useTheme.ts         # Tema claro/oscuro
├── styles/                   # index.css + collection-suite.css
├── utils/                    # files.ts, wikiHighlight.ts
├── data/                     # launchboxPlatforms.json (datos estáticos)
└── assets/                   # imágenes, iconos, sprite SVG
```

Cada componente lleva su `*.module.css` hermano.

## Comunicación con el BFF

Todas las llamadas pasan por `requestJson()` en `src/api/http.ts`, que construye `${BFF_URL}${path}` y normaliza los errores desde el campo `message` del JSON. Los prefijos consumidos:

`/tasks`, `/accounts`, `/calendar`, `/collections`, `/hijitos`, `/images/search`, `/launchbox/*`, `/shopping/*`, `/weight`, `/wiki/*`, `/wishlist`

No hay proxy de Vite configurado: en desarrollo hay que levantar el BFF aparte (el BFF ya tiene CORS habilitado para `localhost:5177`).

## Persistencia local

Solo preferencias de UI en `localStorage`:

- `marea-theme` — tema claro/oscuro
- `chucks.collection.catalog-view` / `chucks.collection.catalog-sort` — vista y orden del catálogo de colecciones

El resto de datos (tareas, colecciones, wiki, precios…) viven en el backend.

## Notas pendientes

- `index.html` tiene `lang="en"` y título `chucks-web-frontend` (mejorable: `lang="es"` y título "CHUCK's Web").
- Sin tests unitarios todavía.
- `src/assets/tobe/` y `design_backup.html` son prototipos legacy, ignorados por git.
