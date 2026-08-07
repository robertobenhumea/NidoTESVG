# Chat — Bugs y Pendientes

## Bugs Conocidos

| Bug | Módulo | Prioridad | Estado |
|---|---|---|---|
| Adjuntos móvil en grupos no se enviaban | Chat Grupos | P0 | ✅ Corregido (2026-05-17) |
| WebSocket nativo incompatible con STOMP backend | WebSocket | P1 | 🔜 Fase 4 |

## Deuda Técnica

### Polling → WebSocket
El polling de 5 segundos es funcional pero ineficiente:
- Genera requests constantes aunque no haya mensajes
- Latencia de hasta 5 segundos
- No escala bien con muchos usuarios simultáneos

**Solución**: Migrar a STOMP con `@stomp/stompjs` (Fase 4)

### useSocket.ts
- Usa WebSocket nativo, no STOMP
- Incompatible con el backend que usa SockJS/STOMP
- Necesita reescribirse completamente

## Pendientes

### P0 (Críticos)
- [ ] Migrar a WebSocket STOMP (Fase 4)

### P1 (Importantes)
- [ ] Typing indicator (muestra "X está escribiendo...")
- [ ] Read receipts (palomita doble tipo WhatsApp)
- [ ] Notificaciones push por mensaje de chat

### P2 (Mejoras)
- [ ] Búsqueda dentro de conversaciones
- [ ] Mensajes con links enriquecidos (Open Graph preview)
- [ ] Menciones en grupos (@usuario autocomplete)
- [ ] Gif support
- [ ] Stickers

### P3 (Nice to have)
- [ ] Transcripción de audios
- [ ] Velocidad de reproducción de audios
- [ ] Modo silencioso por conversación
- [ ] Archivado de conversaciones
- [ ] Exportar historial de chat
