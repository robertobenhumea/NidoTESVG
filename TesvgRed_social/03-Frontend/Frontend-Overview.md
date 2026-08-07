# Frontend Overview

## Tech Stack

- **Next.js 16.2.6** — App Router, Server Components, Turbopack
- **React 19.2.4** — UI library
- **TypeScript ^5** — tipado estricto, `no any`
- **TailwindCSS ^4** — utility-first, dark mode nativo
- **Framer Motion ^12** — animaciones fluidas
- **@tanstack/react-query ^5** — cache de servidor, queries reactivas
- **react-hook-form + zod** — formularios tipados con validación

## Principios de Diseño

1. **Mobile-first** — diseño parte de móvil, escala a desktop
2. **Dark mode premium** — look moderno tipo Discord/Threads
3. **Server components** — mínimo de código cliente
4. **Lazy loading** — componentes pesados cargados bajo demanda
5. **TypeScript estricto** — no `any`, interfaces claras

## Layout del Sistema

```
app/layout.tsx              ← root layout (html, body)
  └── app/(auth)/layout.tsx ← layout para login/registro
  └── app/(main)/layout.tsx ← layout protegido
        ├── Navbar (desktop)
        ├── MobileNav (bottom bar, móvil)
        ├── Sidebar (desktop)
        └── {children}
```

## Sistema de Navegación

### Desktop
- Navbar horizontal superior con logo, búsqueda, badges, avatar
- Sidebar izquierdo con links principales

### Mobile
- Bottom navigation bar con 5 tabs
- Hamburger drawer para opciones adicionales
- FAB (Floating Action Button) en pantallas específicas

## Badges en Tiempo Real

El hook `useUnreadCounts` hace polling cada 30 segundos para:
- Mensajes no leídos (DM + grupos de chat)
- Notificaciones pendientes

Los badges aparecen en Navbar y MobileNav automáticamente.

## Estado de la Aplicación

| Área | Mecanismo |
|---|---|
| Auth | Context + localStorage (JWT) |
| Feed | @tanstack/react-query |
| Chat | Polling + estado local |
| Notificaciones | @tanstack/react-query + polling |
| Tema | useTheme hook + CSS variables |

## PWA

- `public/sw.js` — Service Worker
- Handles push notifications (tipo `mail`, tipo genérico)
- Notificationclick navega a la URL correcta
- Soporte offline parcial

## Módulos del Frontend

| Módulo | Ruta | Estado |
|---|---|---|
| Feed | `/` | ✅ Completo |
| Correo | `/correos` | ✅ Completo (Fases 1-3) |
| Chat DM | `/messages/[userId]` | ✅ Funcional (polling) |
| Chat Grupos | `/messages/groups/[groupId]` | ✅ Funcional (polling) |
| Grupos Sociales | `/groups` | ✅ Completo |
| Marketplace | `/marketplace` | ✅ Funcional |
| Perfil | `/profile/[id]` | ✅ Completo |
| Búsqueda | `/search` | ✅ Completo |
| Configuración | `/settings` | ✅ Funcional |
| Avisos | `/avisos` | ✅ Funcional |
| Eventos | `/eventos` | ✅ Funcional |
| Recursos | `/recursos` | ✅ Funcional |
| Ranking | `/ranking` | ✅ Funcional |
| Equipos | `/equipos` | ✅ Funcional |
| Admin | `/admin` | ⚠️ Parcial |

Ver: [[Estructura-Frontend|Estructura Detallada]] | [[03-Frontend/Sistema-Diseno|Sistema de Diseño]]
