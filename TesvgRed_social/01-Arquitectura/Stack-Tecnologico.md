# Stack Tecnológico

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.2.6 | Framework React, App Router, SSR/SSG |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Tipado estático estricto |
| TailwindCSS | ^4 | Utility-first CSS |
| Framer Motion | ^12.38.0 | Animaciones fluidas |
| @tanstack/react-query | ^5.100.10 | Servidor estado, caché de queries |
| react-hook-form | ^7.76.0 | Manejo de formularios |
| zod | ^4.4.3 | Validación de esquemas |
| lucide-react | ^1.16.0 | Iconos |
| clsx + tailwind-merge | ^2.1.1 / ^3.6.0 | Condicionales CSS |

### Herramientas de Desarrollo Frontend
- Vitest — testing unitario
- @testing-library/react — testing de componentes
- ESLint — linting
- Turbopack — bundler (Next.js 16)

## Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Spring Boot | 3.x | Framework web principal |
| Spring Security | — | Autenticación JWT, CORS, seguridad |
| Spring Data JPA | — | ORM, repositories |
| Spring WebSocket | — | STOMP/SockJS |
| Spring Data Redis | — | Cache, rate limiting |
| Spring Validation | — | Validación de DTOs |
| JJWT | 0.11.5 | Generación y validación JWT |
| Lombok | — | Reducción de boilerplate Java |
| MariaDB Java Client | — | Driver JDBC |
| web-push | 5.1.1 | Notificaciones push VAPID |
| bcprov (Bouncy Castle) | 1.70 | Criptografía para VAPID |

## Base de Datos

| Tecnología | Uso |
|---|---|
| MariaDB / MySQL | Base de datos principal |
| Redis | Cache opcional, rate limit, presencia |

## Infraestructura (configurada pero no activada en prod)

| Tecnología | Estado |
|---|---|
| Docker | Definido en docker-compose.redis.yml — se activa al final |
| Nginx | Planificado — reverse proxy |
| VPS | Planificado — deployment final |
| Cloudflare | Planificado — CDN + DNS |

## PWA

| Componente | Implementación |
|---|---|
| Service Worker | `falconnet-frontend/public/sw.js` |
| Push Notifications | VAPID keys en backend, sw.js en frontend |
| Web App Manifest | Configurado |
| Offline Support | Parcial |

## Arquitectura de Módulos Backend

```
backend/src/main/java/com/tesvg/backend/
├── config/          # Redis, Security, WebSocket
├── controller/      # 25+ REST controllers
├── dto/             # 30+ DTOs de request/response
├── model/           # 50+ entidades JPA
├── repository/      # Spring Data repositories
├── security/        # JwtFilter, JwtUtil
├── service/         # Servicios de negocio
└── websocket/       # STOMP controller + presencia
```

## Arquitectura de Módulos Frontend

```
falconnet-frontend/src/
├── app/
│   ├── (auth)/      # Login, registro
│   └── (main)/      # Rutas protegidas
│       ├── correos/ # Correo institucional
│       ├── messages/ # Chat DM + grupos
│       ├── groups/  # Grupos sociales
│       ├── marketplace/ # Marketplace
│       ├── search/  # Búsqueda global
│       ├── settings/ # Configuración
│       └── ...
├── components/      # Componentes reutilizables
├── hooks/           # Custom hooks
├── lib/             # Utilidades (mailPush, etc)
├── providers/       # Context providers
├── services/        # API services (18 archivos)
├── store/           # Estado global (Zustand?)
└── types/           # TypeScript types
```

Ver: [[Arquitectura-General]] | [[Estructura-Backend]] | [[Estructura-Frontend]]
