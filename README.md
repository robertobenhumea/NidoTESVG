# FalconNet — Red Social Universitaria TESVG

**FalconNet** es la red social universitaria del Tecnológico Superior de Villa de Álvarez (TESVG). Conecta estudiantes, docentes y la comunidad académica en un espacio moderno, seguro y pensado para el campus.

---

## Arquitectura del proyecto

```
redSocial/
├── backend/                   # Spring Boot REST API
│   └── src/main/
│       ├── java/com/tesvg/
│       │   ├── controller/    # 21 controladores REST
│       │   ├── model/         # Entidades JPA
│       │   ├── repository/    # Spring Data repositories
│       │   ├── service/       # Lógica de negocio
│       │   ├── config/        # Seguridad JWT, CORS, WebSocket
│       │   └── websocket/     # Interceptor WS
│       └── resources/
│           ├── static/        # Legacy HTML/JS/CSS (en migración)
│           └── application.properties
│
└── falconnet-frontend/        # Next.js 16 App Router
    └── src/
        ├── app/               # Rutas (App Router)
        │   ├── (auth)/        # login, register
        │   └── (main)/        # feed, profile, messages, groups, search…
        ├── components/        # UI, feed, profile, stories, layout
        ├── services/          # API clients (REST)
        ├── hooks/             # Custom React hooks
        ├── lib/               # config, utils, socket, realtime
        ├── store/             # Context stores (auth, theme, ui)
        └── types/             # TypeScript types (frontend + backend shapes)
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | Spring Boot 3, Java 17, Spring Security + JWT, Spring Data JPA, STOMP/SockJS WebSocket |
| **Base de datos** | MariaDB / MySQL |
| **Frontend** | Next.js 16.2.6, React 19, TypeScript 5, Tailwind CSS 4 |
| **Estado** | React Context API (auth, theme, ui) |
| **PWA** | Service Worker, Web Manifest, Web Push (VAPID) |
| **Realtime (actual)** | Polling HTTP (chat 5s, badges 30s) |
| **Realtime (futuro)** | STOMP sobre SockJS — backend ya configurado |

---

## Funcionalidades implementadas

### Backend (Spring Boot)
- ✅ Autenticación JWT (registro, login, middleware)
- ✅ Feed de publicaciones (paginado, compartir, fijar)
- ✅ Reacciones (6 tipos), comentarios, respuestas
- ✅ Historias tipo Instagram (24h TTL, viewers)
- ✅ Mensajería privada (conversaciones, mensajes)
- ✅ Notificaciones (categorías, leído/no leído)
- ✅ Marketplace (productos, favoritos, solicitudes)
- ✅ Grupos/comunidades (miembros, roles, posts)
- ✅ Búsqueda global (usuarios, posts, grupos)
- ✅ Perfiles públicos, seguidores/seguidos
- ✅ Rankings, insignias, eventos, avisos
- ✅ Panel admin, reportes
- ✅ Web Push (VAPID)
- ✅ WebSocket STOMP configurado (listo para Phase 4)

### Frontend (Next.js — falconnet-frontend/)
- ✅ `/` — Feed infinito con skeleton loaders
- ✅ `/login` `/register` — Auth completa con JWT
- ✅ `/profile` — Perfil propio y público (vía `?id=`)
- ✅ `/messages` — Lista conversaciones
- ✅ `/messages/[userId]` — Thread DM con polling 5s
- ✅ `/notifications` — Panel notificaciones
- ✅ `/marketplace` — Listado y publicación de productos
- ✅ `/groups` — Comunidades: listar, crear, unirse
- ✅ `/groups/[id]` — Detalle: miembros, posts, compose
- ✅ `/search` — Búsqueda global con debounce
- ✅ `/settings` — Preferencias, tema dark/light
- ✅ Navbar con badges en tiempo real
- ✅ Mobile bottom nav
- ✅ Stories bar + viewer fullscreen
- ✅ PWA (instalable, offline page, push)

---

## Ejecutar el proyecto

### Prerequisitos

- Java 17+
- Maven 3.8+
- Node.js 20+
- MariaDB/MySQL corriendo en localhost:3306

### Backend

```bash
cd backend

# Configurar base de datos en:
# src/main/resources/application.properties

mvn spring-boot:run
# → http://localhost:8080
```

### Frontend

```bash
cd falconnet-frontend

# Instalar dependencias (solo primera vez)
npm install

# Crear archivo de entorno (solo primera vez)
cp .env.local.example .env.local   # si existe, si no:
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws" >> .env.local

# Desarrollo
npm run dev
# → http://localhost:3000

# Build de producción
npm run build && npm start
```

---

## Flujo Git

### Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Estable, producción |
| `feature/<nombre>` | Nuevas funcionalidades |

### Convención de commits

```
feat(scope): descripción
fix(scope): descripción
chore(scope): descripción
refactor(scope): descripción
```

### Ejemplos de ramas futuras

```bash
git checkout -b feature/phase-4-websocket    # WebSocket STOMP real
git checkout -b feature/edit-profile          # Editar perfil en settings
git checkout -b feature/admin-panel           # Panel admin frontend
git checkout -b feature/public-profiles       # Ruta /profile/[id] limpia
git checkout -b feature/events-calendar       # Página eventos
git checkout -b fix/<descripcion>             # Bugfixes
```

---

## Variables de entorno

### Backend — `application.properties`

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/redsocial
spring.datasource.username=...
spring.datasource.password=...
jwt.secret=...
vapid.public.key=...
vapid.private.key=...
```

### Frontend — `.env.local` (no commitear)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

---

## Notas de arquitectura

### Migración en curso

El proyecto está migrando de una arquitectura monolítica (HTML/JS servido por Spring Boot en `backend/src/main/resources/static/`) hacia un frontend moderno separado (`falconnet-frontend/`). La app legacy sigue funcionando mientras se migran funcionalidades al nuevo frontend.

### WebSocket (Phase 4)

El backend ya tiene STOMP/SockJS configurado en `/ws`. El frontend tiene un cliente WebSocket custom en `lib/socket.ts` que usa raw WebSocket (incompatible con STOMP). Phase 4 requiere agregar `@stomp/stompjs` al frontend para conectar correctamente.

### Feature flags

En `falconnet-frontend/src/lib/config.ts`:
```typescript
features: {
  realtime: false,      // Phase 4: WebSocket STOMP
  chat: true,           // Polling activo
  groups: true,
  search: true,
  stories: true,
  marketplace: true,
}
```

---

## Equipo

Desarrollado para TESVG — Tecnológico Superior de Villa de Álvarez.
