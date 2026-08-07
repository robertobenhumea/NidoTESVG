# FalconNet — Base de Conocimiento

> Red Social Universitaria del TESVG
> Documentación técnica y organizacional completa

---

## Inicio Rápido

| Necesitas... | Ve a... |
|---|---|
| Entender el proyecto | [[00-Dashboard/Resumen-Ejecutivo]] |
| Ver el estado general | [[00-Dashboard/Dashboard]] |
| Ver la arquitectura | [[01-Arquitectura/Arquitectura-General]] |
| Ver endpoints de la API | [[02-Backend/Endpoints-API]] |
| Ver DTOs del backend | [[02-Backend/DTOs-Principales]] |
| Entender el correo | [[06-Correo/Correo-Arquitectura]] |
| Entender el chat | [[05-Chat/Chat-Arquitectura]] |
| Ver bugs actuales | [[14-Bugs/Bugs-Conocidos]] |
| Ver el roadmap | [[13-Roadmap/Roadmap-Principal]] |
| Ver decisiones técnicas | [[15-Decisiones/Decisiones-Arquitectura]] |
| Ver diagramas Mermaid | [[99-Wiki/Diagramas-Mermaid]] |

---

## Estructura de la Base de Conocimiento

```
FalconNet/
├── 00-Dashboard/           ← Estado general, resumen ejecutivo
├── 01-Arquitectura/        ← Arquitectura, stack, JWT, estructuras
├── 02-Backend/             ← Endpoints, DTOs, referencia API
├── 03-Frontend/            ← Overview frontend, sistema de diseño
├── 04-BaseDeDatos/         ← Entidades, configuración DB
├── 05-Chat/                ← DM, grupos, audios, WebSocket futuro
├── 06-Correo/              ← Bandejas, adjuntos, threading, push
├── 07-Feed/                ← Feed, stories
├── 08-Perfiles/            ← Perfiles, seguidores
├── 09-Marketplace/         ← Marketplace estudiantil
├── 10-Equipos/             ← Equipos, reclutamiento
├── 11-PWA/                 ← Progressive Web App
├── 12-Seguridad/           ← JWT, adjuntos, rate limiting
├── 13-Roadmap/             ← Roadmap P0-P3, fases
├── 14-Bugs/                ← Bugs activos, deuda técnica
├── 15-Decisiones/          ← ADRs — por qué se tomaron las decisiones
├── 16-Infraestructura-Futura/  ← Docker, VPS, Nginx, Cloudflare
└── 99-Wiki/                ← Glosario, convenciones, diagramas, estado
```

---

## Estado del Proyecto (2026-06-05)

```
✅ Completado: Fases 1, 2, 3 + Correo F1, F2, F3
🔄 En curso:   Fase 4 (WebSocket + Perfiles)
🔜 Planificado: Fase 5 (Correo avanzado + UX premium)
🔜 Futuro:     Infraestructura de producción (Docker/VPS)
```

---

## Tecnologías Principales

| Frontend | Backend | Datos |
|---|---|---|
| Next.js 16 | Spring Boot | MariaDB |
| React 19 | Spring Security | Redis |
| TypeScript | JJWT | FileSystem |
| TailwindCSS 4 | WebSocket STOMP | — |
| Framer Motion | Web Push (VAPID) | — |

---

*Generado: 2026-06-05 | Proyecto: FalconNet / NidoTESVG*
