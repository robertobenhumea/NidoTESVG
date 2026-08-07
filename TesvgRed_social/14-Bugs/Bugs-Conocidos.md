# Bugs Conocidos

> Última actualización: 2026-06-05

## Bugs Activos

| ID | Módulo | Descripción | Prioridad | Workaround |
|---|---|---|---|---|
| BUG-001 | Chat | WebSocket nativo incompatible con STOMP backend | P1 | Polling cada 5s funciona |
| BUG-002 | Auth | JWT sin expiración en dev (posible en prod) | P1 | Configurar JWT_EXPIRATION en env |
| BUG-003 | Feed | Posts no embedden autor → N+1 query manual | P2 | GET /usuarios cacheado |

## Bugs Corregidos

| ID | Módulo | Descripción | Fecha Fix |
|---|---|---|---|
| FIX-001 | Chat | Adjuntos móvil en grupos no se enviaban | 2026-05-17 |
| FIX-002 | Correo | `archivoUrl` expuesto en API | 2026-05-26 |
| FIX-003 | Correo | Paginación de bandejas inconsistente | 2026-05-26 |
| FIX-004 | Correo | Favoritos no funcionaban correctamente | 2026-05-26 |

## Deuda Técnica

### Alta Prioridad

**DT-001: Polling en Chat**
- El polling de 5s es un workaround temporal
- Genera ~720 requests/hora por usuario activo en chat
- Solucionado en Fase 4 con WebSocket STOMP

**DT-002: N+1 en Feed**
- Posts y comentarios no embedden autor
- Frontend hace GET /usuarios una vez y construye mapa
- Mejora: backend debería devolver autor embebido

**DT-003: useSocket.ts obsoleto**
- Usa WebSocket nativo no compatible con STOMP
- Necesita reescritura completa en Fase 4

### Media Prioridad

**DT-004: JWT sin expiración**
- En dev, los tokens no expiran
- Riesgo en producción si tokens son comprometidos
- Fix: `app.jwt.expiration=86400000` (24h)

**DT-005: `GET /usuarios` carga todos los usuarios**
- Endpoint sin paginación para obtener mapa de usuarios
- Con muchos usuarios puede ser lento
- Fix: batch API o endpoint paginado con IDs específicos

**DT-006: DDL auto=update en prod**
- `spring.jpa.hibernate.ddl-auto=update` es riesgoso en producción
- Puede hacer migraciones automáticas no deseadas
- Fix: usar `validate` en prod + migraciones manuales con Flyway

### Baja Prioridad

**DT-007: `show-sql=true` en todas las configs**
- Genera log verbose en producción
- Fix: `spring.jpa.show-sql=false` en prod profile

**DT-008: Borradores en modelo pero sin UI**
- `esBorrador` existe en Correo pero no hay bandeja de borradores
- Fix: implementar en Fase 5

## Reportar Bugs

Al encontrar un bug nuevo, documentar aquí con:
- Módulo afectado
- Descripción clara del comportamiento esperado vs actual
- Pasos para reproducir
- Prioridad estimada
- Si existe workaround
