# Fase Actual — Fase 4

> Inicio estimado: 2026-06
> Objetivo: WebSocket STOMP + Perfiles completos + Admin base

## Objetivo Principal

Reemplazar el sistema de polling del chat por WebSocket STOMP para comunicación en tiempo real verdadera.

## Tareas de Fase 4

### Chat — WebSocket STOMP (P0)

```
[ ] npm install @stomp/stompjs sockjs-client  (frontend)
[ ] Reescribir useSocket.ts con Client de @stomp/stompjs
[ ] Actualizar useRealtime.ts para eventos STOMP
[ ] Reemplazar polling en /messages/[userId]/page.tsx
[ ] Reemplazar polling en /messages/groups/[groupId]/page.tsx
[ ] Implementar typing indicators (STOMP + UI)
[ ] Implementar read receipts (palomita doble)
[ ] Actualizar useUnreadCounts para escuchar push events
```

### Perfiles (P0)

```
[ ] Completar UI de editar perfil en /settings
    - Endpoint ya existe: PUT /usuarios/perfil
    - Falta: foto de perfil upload, foto de portada upload
    - Falta: form con todos los campos del perfil
[ ] Cleanup de /profile/[id] (rutas públicas)
```

### Admin Panel (P1)

```
[ ] Dashboard con estadísticas del sistema
    - Total usuarios, posts, mensajes
[ ] Gestión de usuarios (activar/desactivar)
[ ] Gestión de contenido (moderar posts)
[ ] Gestión de reportes (ChatReport, Reporte)
[ ] Gestión de códigos de acceso (CodigoRegistro)
```

## Dependencias

```
Backend: Ya listo
  ✅ WebSocketConfig.java
  ✅ ChatRealtimeController.java
  ✅ WebSocketAuthInterceptor.java
  ✅ PresenceService.java
  ✅ PUT /usuarios/perfil

Frontend: Pendiente
  ❌ @stomp/stompjs no instalado
  ❌ useSocket.ts usa WebSocket nativo
  ❌ UI editar perfil incompleta
```

## Riesgo Principal

La migración de polling a WebSocket es la tarea más compleja de esta fase. Requiere:
1. No romper funcionalidad actual mientras se migra
2. Manejar reconexión automática del WebSocket
3. Manejar el estado de mensajes durante desconexiones

**Estrategia sugerida**: Feature flag — WebSocket cuando disponible, polling como fallback.

Ver: [[Roadmap-Principal]] | [[Fase-Siguiente]] | [[05-Chat/Chat-WebSocket-Futuro]]
