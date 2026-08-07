# Chat — WebSocket STOMP (Fase 4)

## Estado Actual vs Futuro

### Actual: Polling
```
Frontend → GET /mensajes/{userId} cada 5s
Frontend → GET /chat-grupos/{id}/mensajes cada 5s
Ventajas: simple, funciona hoy
Desventajas: latencia ~5s, carga innecesaria al servidor
```

### Futuro: WebSocket STOMP
```
Frontend → conecta /ws una vez
Backend → push mensajes instantáneos
Ventajas: realtime verdadero, eficiente
Desventajas: mayor complejidad, requiere migración
```

## Backend — Ya Implementado

El backend YA tiene WebSocket STOMP listo:

### WebSocketConfig.java
```java
registry.addEndpoint("/ws")
    .withSockJS();  // SockJS fallback para navegadores viejos

registry.enableSimpleBroker("/topic", "/queue");
registry.setApplicationDestinationPrefixes("/app");
```

### ChatRealtimeController.java
```
/app/chat.dm        → enviar DM por STOMP
/app/chat.group     → enviar mensaje de grupo por STOMP
/topic/user.{id}    → canal personal (recibir mensajes)
```

### WebSocketAuthInterceptor.java
- Valida JWT en el handshake de WebSocket
- Configura `SecurityContextHolder` para el canal

### PresenceService.java
- Trackea usuarios conectados
- Emite `PresenceEventDTO` al conectar/desconectar

## Frontend — Pendiente de Implementar

### Problema Actual
`useSocket.ts` usa WebSocket nativo (no STOMP):
```typescript
// INCOMPATIBLE con STOMP del backend
const ws = new WebSocket(`ws://localhost:8080/ws`);
```

### Solución Requerida
Instalar `@stomp/stompjs` y reescribir `useSocket.ts`:
```typescript
import { Client } from '@stomp/stompjs';

const client = new Client({
  brokerURL: 'ws://localhost:8080/ws/websocket',
  // o usando SockJS:
  webSocketFactory: () => new SockJS('/ws'),
  connectHeaders: { Authorization: `Bearer ${token}` },
  onConnect: () => {
    client.subscribe(`/topic/user.${userId}`, onMessage);
  }
});
```

## Plan de Migración (Fase 4)

```
1. npm install @stomp/stompjs sockjs-client
2. Reescribir useSocket.ts con @stomp/stompjs
3. Actualizar useRealtime.ts para manejar eventos STOMP
4. Reemplazar polling en /messages/[userId]/page.tsx
5. Reemplazar polling en /messages/groups/[groupId]/page.tsx
6. Implementar typing indicators via STOMP
7. Implementar read receipts via STOMP
8. Actualizar useUnreadCounts para escuchar eventos push
```

## Eventos WebSocket Planeados

```typescript
// Recibidos via /topic/user.{userId}
{
  tipo: 'NEW_MESSAGE',       // mensaje nuevo DM
  conversacionId: number,
  mensaje: MessageDTO
}
{
  tipo: 'NEW_GROUP_MESSAGE', // mensaje nuevo en grupo
  grupoId: number,
  mensaje: ChatGroupMessageDTO
}
{
  tipo: 'TYPING',            // indicador de escritura
  conversacionId: number,
  usuarioId: number,
  escribiendo: boolean
}
{
  tipo: 'READ',              // mensaje leído
  conversacionId: number,
  usuarioId: number
}
{
  tipo: 'PRESENCE',          // cambio de presencia
  usuarioId: number,
  online: boolean,
  lastSeen: string?
}
```

## Presencia

`PresenceService` ya trackea conexiones via `WebSocketPresenceListener`:
- `SessionConnectEvent` → usuario conectado
- `SessionDisconnectEvent` → usuario desconectado

El frontend podrá usar `usePresence.ts` para mostrar indicadores "En línea".

Ver: [[Chat-Arquitectura]] | [[13-Roadmap/Fase-Siguiente]]
