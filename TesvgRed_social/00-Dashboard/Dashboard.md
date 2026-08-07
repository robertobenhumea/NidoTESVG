# FalconNet — Dashboard Principal

> Red social universitaria del Instituto Tecnológico Superior del Valle de Guaymas (TESVG)

---

## Estado General del Proyecto

| Dimensión | Estado |
|---|---|
| Backend (Spring Boot) | ✅ Activo — API completa |
| Frontend (Next.js 16) | ✅ Activo — Fase 3 completada |
| Base de datos (MariaDB) | ✅ Operacional |
| Chat (DM + Grupos) | ✅ Funcional (polling) |
| Correo institucional | ✅ Fases 1-3 completas |
| WebSocket STOMP | ⚠️ Backend listo, frontend pendiente |
| PWA | ⚠️ Parcial (push notifications activas) |
| Redis | ⚠️ Integrado, opcional |
| Docker | 🔜 Fase final |
| Producción/VPS | 🔜 Fase final |

---

## Navegación Rápida

### Arquitectura
- [[01-Arquitectura/Arquitectura-General|Arquitectura General]]
- [[01-Arquitectura/Stack-Tecnologico|Stack Tecnológico]]
- [[01-Arquitectura/Flujo-JWT|Flujo JWT]]
- [[01-Arquitectura/Estructura-Backend|Estructura Backend]]
- [[01-Arquitectura/Estructura-Frontend|Estructura Frontend]]

### Módulos Principales
- [[05-Chat/Chat-Arquitectura|Chat — Arquitectura]]
- [[06-Correo/Correo-Arquitectura|Correo — Arquitectura]]
- [[07-Feed/Feed-Overview|Feed — Overview]]
- [[08-Perfiles/Perfiles-Overview|Perfiles — Overview]]
- [[09-Marketplace/Marketplace-Overview|Marketplace — Overview]]
- [[10-Equipos/Equipos-Overview|Equipos — Overview]]

### Planificación
- [[13-Roadmap/Roadmap-Principal|Roadmap Principal]]
- [[13-Roadmap/Fase-Actual|Fase Actual]]
- [[13-Roadmap/Fase-Siguiente|Fase Siguiente]]
- [[14-Bugs/Bugs-Conocidos|Bugs Conocidos]]
- [[15-Decisiones/Decisiones-Arquitectura|Decisiones de Arquitectura]]

### Infraestructura
- [[16-Infraestructura-Futura/Plan-Infraestructura|Plan Infraestructura Futura]]

---

## Resumen de Fases Completadas

```
Fase 1 ✅  Base, diseño, rutas, API client, auth
Fase 2 ✅  API real, feed, posts, reacciones, comentarios, stories, perfiles, marketplace, chat
Fase 3 ✅  Grupos sociales, búsqueda global, polling chat, badges no leídos
Correo F1 ✅  3-pane layout, mobile-first, bandejas, adjuntos seguros
Correo F2 ✅  Threading (hilo), reply/replyAll/forward, mark-unread
Correo F3 ✅  Push notifications para correo nuevo
Fase 4 🔜  WebSocket STOMP, editar perfil, panel admin
```

---

## Fechas Clave

| Evento | Fecha |
|---|---|
| Inicio arquitectura separada | 2026-05-16 |
| Fases 1-3 completadas | 2026-05-17 |
| Mail módulo (rediseño) | 2026-05-17 |
| Correo Fase 2 (threading) | 2026-05-27 |
| Correo Fase 3 (push) | 2026-05-28 |
| Estado documental | 2026-06-05 |

---

## Links Útiles

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3000`
- Base de datos: `localhost:3306/tesvg_red_social`
- Redis: `localhost:6379`
