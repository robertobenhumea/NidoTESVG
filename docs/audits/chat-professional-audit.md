# Auditoria profesional del modulo de chat de FalconNet

Fecha de auditoria: 2026-05-26  
Alcance: frontend Next.js en `falconnet-frontend/src/app/(main)/messages`, servicios `chat.service.ts` y `groupChat.service.ts`, cliente STOMP, backend Spring Boot de mensajes individuales y grupos, DTOs, entidades, repositorios, seguridad, uploads y PWA.

## 1. Resumen ejecutivo

FalconNet ya tiene una base funcional de chat: conversaciones individuales, grupos, envio de texto, imagenes y documentos, preview/descarga autenticada de adjuntos, agrupacion por dia, hora por mensaje, contadores de no leidos, roles basicos de grupo, miembros, edicion/reacciones/reenviar en grupos y STOMP para eventos grupales.

El modulo todavia no esta al nivel de WhatsApp, Telegram, Messenger o Discord por tres razones principales:

1. El chat individual no tiene WebSocket/STOMP, no pagina mensajes y depende de polling cada 5 segundos.
2. Hay gaps de producto profesional: estados enviado/entregado/leido completos, busqueda dentro del hilo, notificaciones de chat, archivar/silenciar/bloquear/reportar, mensajes fijados, galeria multimedia completa, previews enriquecidos de links y audio/stickers.
3. Hay riesgos tecnicos: queries sin paginacion en DM, DTOs mezclados con `Map`, potencial N+1 en referencias/reacciones/miembros, PWA sin soporte offline real para chat, presencia no integrada en UI y fallback REST parcial.

Estado general: usable para MVP, fuerte en grupos comparado con DM, pero necesita estabilizacion de arquitectura y seguridad/escala antes de parecer chat profesional.

## 2. Estado actual del chat

### Chat individual

Existe en:

- `falconnet-frontend/src/app/(main)/messages/components/ChatThread.tsx`
- `falconnet-frontend/src/services/chat.service.ts`
- `backend/src/main/java/com/tesvg/backend/controller/MensajeController.java`
- `backend/src/main/java/com/tesvg/backend/model/Mensaje.java`
- `backend/src/main/java/com/tesvg/backend/repository/MensajeRepository.java`

Capacidades actuales:

- Texto, imagen y documento.
- Upload con validacion frontend/backend de extension, tipo y tamano maximo 10 MB.
- Render seguro de imagenes con `fetch` + JWT en `SecureAttachment`.
- Descarga/preview autenticado de adjuntos.
- Agrupacion por dia y hora por mensaje.
- Responder mensajes por `referenciaId`.
- Eliminar mensajes propios para todos mediante soft delete.
- Contador de no leidos y marcado como leido al abrir conversacion.
- Polling cada 5 segundos para simular realtime.

Limitaciones:

- Sin WebSocket para DM.
- Sin paginacion/infinite scroll.
- Sin busqueda en hilo.
- Sin editar, reenviar, reacciones, eliminar solo para mi, fijados, typing, presencia real ni ultima conexion.
- `findConversacion` excluye mensajes eliminados, por lo que el frontend tiene UI de "Mensaje eliminado", pero al recargar desaparecen del hilo.
- `referenciaId` en DM no valida que el mensaje referenciado pertenezca a la conversacion.
- No existe rate limit para envio de texto DM, solo para uploads.

### Chat de grupos

Existe en:

- `falconnet-frontend/src/app/(main)/messages/components/GroupChatThread.tsx`
- `falconnet-frontend/src/services/groupChat.service.ts`
- `falconnet-frontend/src/lib/stomp.ts`
- `backend/src/main/java/com/tesvg/backend/controller/ChatGrupoController.java`
- `backend/src/main/java/com/tesvg/backend/websocket/ChatRealtimeController.java`
- `backend/src/main/java/com/tesvg/backend/config/WebSocketConfig.java`
- `backend/src/main/java/com/tesvg/backend/websocket/WebSocketAuthInterceptor.java`

Capacidades actuales:

- Crear grupos, editar nombre/descripcion/foto/tipo, ver miembros.
- Roles `OWNER`, `ADMIN`, `MODERADOR`, `MIEMBRO`.
- Agregar/remover miembros, cambiar rol, silenciar miembro como castigo/permisos.
- Texto, imagen y documento.
- Paginacion hacia atras por `beforeId` y `limit`.
- Responder, editar, reaccionar, reenviar, eliminar para mi y para todos.
- Galeria parcial de archivos compartidos y lista de links compartidos.
- Typing indicator por STOMP.
- Eventos realtime de grupos por STOMP: creado, actualizado, reaccion, eliminado.
- Polling de respaldo: 8 s si STOMP esta desconectado, 30 s si conectado.
- Endpoint seguro de descarga por `GroupAttachment`: `/grupos/chat/files/{attachmentId}`.

Limitaciones:

- No hay indicador visual claro de estado de conexion salvo variable interna `wsConnected`.
- El boton `MoreVertical` del header no hace nada.
- No existe busqueda dentro del hilo grupal.
- No hay mensajes fijados, menciones funcionales, threads, canales, permisos granulares estilo Discord ni auditoria de moderacion.
- Las reacciones son limitadas a 4 emojis.
- Reenvio solo a grupos, no a DM.
- El endpoint de editar/eliminar/reaccionar no valida membresia activa en todos los caminos antes de autorizar; depende de propiedad del mensaje/admin en algunos casos.

## 3. Tabla de comparacion profesional

Leyenda: Si = existe en codigo; Parcial = existe incompleto o solo en grupos/DM; No = no existe.

| Feature | Existe | Funciona | Falta | Prioridad | Archivos relacionados |
|---|---:|---:|---|---|---|
| 1. Mensajes de texto | Si | Si | Validar longitud en DM y rate limit | P0 | `ChatThread.tsx`, `GroupChatThread.tsx`, `MensajeController.java`, `ChatGrupoController.java` |
| 2. Mensajes con imagenes | Si | Si | Sanitizacion mas fuerte de MIME/contenido real | P0 | `SecureAttachment.tsx`, `ImagenController.java`, `MensajeController.java`, `ChatGrupoController.java` |
| 3. Mensajes con documentos | Si | Si | Antivirus/escaneo, mas tipos controlados | P1 | `chat.service.ts`, `groupChat.service.ts`, controllers de mensajes |
| 4. Descarga de archivos | Si | Si | Mejor UX de error/progreso | P1 | `SecureAttachment.tsx`, `ImagenController.java`, `ChatGrupoController.java` |
| 5. Preview de imagenes | Si | Si | Lightbox profesional, zoom, carrusel | P2 | `SecureAttachment.tsx`, `ChatThread.tsx`, `GroupChatThread.tsx` |
| 6. Fechas correctas | Si | Parcial | Normalizar timezone/ISO y pruebas | P1 | `dayLabel`, `timeStr`, DTOs con `LocalDateTime` |
| 7. Agrupacion por dia | Si | Si | Persistencia con mensajes eliminados en DM | P2 | `ChatThread.tsx`, `GroupChatThread.tsx` |
| 8. Hora por mensaje | Si | Si | Estado de zona horaria consistente | P2 | `ChatThread.tsx`, `GroupChatThread.tsx` |
| 9. Estado enviado/entregado/leido | Parcial | Parcial | Enviado/entregado no existen; leido solo boolean DM | P1 | `Mensaje.leido`, `MensajeController.marcarLeidos` |
| 10. Reacciones | Parcial | Si en grupos | Agregar a DM y ampliar emojis | P1 | `MessageReaction`, `ChatGrupoController.toggleReaccion` |
| 11. Responder mensajes | Si | Parcial | Validar referencia en DM y unificar DTOs | P1 | `referenciaId`, `ReplyPreviewDTO`, `ChatThread.tsx` |
| 12. Reenviar mensajes | Parcial | Si en grupos | DM y reenvio cruzado DM/grupo | P2 | `ForwardGroupMessageRequest`, `groupChat.service.ts` |
| 13. Editar mensajes | Parcial | Si en grupos | DM y reglas de ventana temporal | P2 | `UpdateGroupMessageRequest`, `ChatGrupoMensaje.editado` |
| 14. Eliminar para mi | Parcial | Si en grupos | DM | P2 | `ChatGrupoMensajeOculto`, `deleteMessage(...modo)` |
| 15. Eliminar para todos | Si | Parcial | DM recarga oculta borrados; permisos/ventana temporal | P1 | `MensajeRepository.findConversacion`, `ChatGrupoController.eliminarMensaje` |
| 16. Mensajes fijados | No | No | Modelo, endpoints y UI | P2 | No existe |
| 17. Busqueda dentro del chat | No | No | Search por hilo y resaltado | P1 | No existe |
| 18. Mensajes no leidos | Si | Parcial | Semantica por hilo y lectura granular | P1 | `no-leidos`, `ultimaLectura`, `useUnreadCounts.ts` |
| 19. Contador de no leidos | Si | Si | Actualizacion realtime | P1 | `ConvList.tsx`, `MensajeController.noLeidos`, `ChatGrupoController.noLeidos` |
| 20. Scroll inteligente | Parcial | Parcial | Boton "nuevos mensajes", conservar posicion al paginar | P1 | `ChatThread.tsx`, `GroupChatThread.tsx` |
| 21. Infinite scroll/paginacion | Parcial | Grupos si, DM no | Paginacion DM y scroll estable | P0 | `getMessagesPage`, `MensajeRepository.findConversacion` |
| 22. Typing indicator | Parcial | Si en grupos | DM | P1 | `ChatRealtimeController`, `GroupChatThread.sendTyping` |
| 23. Usuarios online | Parcial | Backend existe, UI incompleta | Integrar presencia en lista y header | P1 | `PresenceService`, `usePresence.ts`, `ConvList.tsx` |
| 24. Ultima conexion | No | No | Persistir last seen | P2 | No existe |
| 25. WebSocket estable | Parcial | Grupos parcial | STOMP robusto, heartbeat real, DM | P0 | `stomp.ts`, `WebSocketConfig.java` |
| 26. Reconexion automatica | Si | Parcial | Backoff, limite, reauth, estado UI | P1 | `stomp.ts` |
| 27. Fallback REST si falla WebSocket | Parcial | Grupos si, DM es REST | Formalizar estrategia y evitar duplicados | P1 | `GroupChatThread.tsx` polling |
| 28. Notificaciones | Parcial | Generales existen | Notificaciones especificas de chat/push por mensaje | P1 | `NotificacionService`, `PushController`, `settings/page.tsx` |
| 29. Silenciar chat | Parcial | Solo silenciar miembro de grupo | Mute por conversacion/grupo para usuario | P2 | `ChatGrupoMiembro.silenciado` |
| 30. Archivar chat | Parcial | Archivar grupo completo por owner | Archivo personal de DM/grupo | P2 | `archiveGroup`, `ChatGrupo.activo` |
| 31. Bloquear usuario | No | No | Modelo, endpoints, bloqueo de envio | P1 | No existe |
| 32. Reportar mensaje | No | No | Moderacion y trazabilidad | P1 | `Reporte` existe para otros modulos, no chat |
| 33. Roles en grupos | Si | Si | Permisos mas granulares | P1 | `ChatGrupoMiembro`, `ChatGroupRole` |
| 34. Agregar/quitar miembros | Si | Si | Invitaciones/pending state | P1 | `addMiembros`, `removeMiembro`, `GroupInfoPanel` |
| 35. Cambiar nombre/foto grupo | Si | Si | Validacion fuerte de foto | P2 | `updateGroup`, `uploadGroupPhoto` |
| 36. Ver miembros del grupo | Si | Si | Busqueda/filtrado de miembros | P2 | `GroupInfoPanel`, `getMiembros` |
| 37. Permisos de grupo | Parcial | Parcial | Matriz configurable estilo Discord | P1 | `esAdmin`, `silenciado`, roles |
| 38. Multimedia gallery | Parcial | Parcial | Vista completa con filtros, videos, paginacion | P2 | `GroupInfoPanel`, `GroupAttachment` |
| 39. Links preview | Parcial | Parcial | Solo lista de URLs; falta metadata preview | P2 | `findLinksByGrupoId`, `extractLinks` |
| 40. Emojis/stickers | Parcial | Parcial | Emoji picker basico; no stickers/GIF | P3 | `EMOJIS` en threads |
| 41. Audio | No | No | Grabacion/envio/reproduccion | P2 | No existe |
| 42. Responsive mobile-first | Si | Parcial | Revisar teclado movil, overflow y panel lateral | P1 | `messages/page.tsx`, `ChatThread.tsx`, `GroupChatThread.tsx` |
| 43. Input fijo inferior en movil | Si | Parcial | Manejo completo de teclado y safe-area | P1 | Footers de threads |
| 44. Soporte PWA | Si | Parcial | SW solo shell/assets; sin offline chat/push activo por flag | P2 | `manifest.json`, `sw.js`, `Providers` |
| 45. Seguridad de archivos | Si | Parcial | Magic bytes, antivirus, nombres, no servir HTML inline | P0 | `ImagenController`, upload helpers |
| 46. Validacion de tipos/tamanos | Si | Parcial | Backend permite multipart global 30/60 MB; validacion por contenido real | P0 | `application.properties`, controllers |
| 47. Prevencion spam/rate limit | Parcial | Parcial | Falta envio texto DM y politicas por grupo/usuario | P0 | `RateLimitService`, `allowSend` |
| 48. Optimizacion queries | Parcial | Parcial | DM sin paginacion, N+1 en referencias/reacciones | P0 | Repositories/controllers |
| 49. DTOs ligeros | Parcial | Parcial | DM usa `Map`; duplicidad `tipo/messageType`, `fileUrl/archivoUrl` | P2 | DTOs, services mapper |
| 50. Cache futura/Redis readiness | Si | Parcial | Redis usado para unread/rate/pubsub, no cache de paginas ni broker externo | P2 | `RedisCacheService`, `RedisConfig` |

## 4. Bugs detectados

1. P0 - DM elimina soft delete pero `findConversacion` filtra eliminados. Resultado: tras recargar, el mensaje borrado desaparece en vez de mostrarse como "Mensaje eliminado". Archivo: `MensajeRepository.java`.
2. P0 - DM no tiene paginacion. `findConversacion` carga todo el historial y `findAllByUsuario` carga todos los mensajes del usuario. Riesgo directo al crecer. Archivos: `MensajeRepository.java`, `MensajeController.java`.
3. P0 - Envio de texto DM no tiene rate limit ni max length. Puede abusarse con spam o payloads grandes. Archivo: `MensajeController.enviar`.
4. P1 - `onTouchStart` en `Bubble` retorna cleanup dentro del handler, pero React ignora ese retorno; el long press puede abrir menu aunque el usuario suelte antes. Archivo: `ChatThread.tsx`.
5. P1 - `document.addEventListener('visibilitychange', () => ...)` en `ChatThread` no se remueve porque se registra una funcion anonima y el cleanup solo limpia intervalo. Puede duplicar listeners al cambiar de conversacion.
6. P1 - `referenciaId` en DM no valida pertenencia a la conversacion. Un cliente podria referenciar mensajes ajenos y filtrar preview parcial si conoce IDs. Archivo: `MensajeController.enviar`.
7. P1 - `editarMensaje`, `reenviar` y parte de `eliminarMensaje` de grupos no verifican membresia activa del actor antes de algunas acciones; la autorizacion se basa en autor/admin, pero un ex miembro podria tener caminos ambiguos si conserva sesion e IDs. Archivo: `ChatGrupoController.java`.
8. P1 - `stomp.ts` implementa STOMP manual sin manejo completo de heartbeats, receipts, ERROR frames ni SockJS negotiation. Puede fallar frente al endpoint `.withSockJS()` segun despliegue/proxy.
9. P2 - Header de grupo tiene boton `MoreVertical` sin accion. Archivo: `GroupChatThread.tsx`.
10. P2 - `GroupInfoPanel` muestra solo los primeros 8 adjuntos/links sin link a galeria completa ni paginacion.

## 5. Riesgos tecnicos

- Escalabilidad: DM no pagina y las listas de conversaciones recorren todos los mensajes del usuario.
- Consistencia realtime: grupos mezclan STOMP y polling; DM solo polling. Esto crea experiencias distintas y posibles duplicados/desfases.
- Seguridad de archivos: se valida extension y content-type declarado/probe, pero no magic bytes, antivirus, cuarentena ni lista estricta por MIME real.
- Autorizacion: uploads de DM protegen acceso en `/imagenes/mensajes/{nombre}`, pero la metadata queda ligada a busqueda por URL; cualquier inconsistencia de URL rompe acceso.
- Redis readiness parcial: hay cache, rate limit y pubsub, pero el broker STOMP sigue siendo `SimpleBroker` en memoria, no Redis/Rabbit externo.
- Observabilidad limitada: no hay metricas de latencia WS, fallos de upload, reconexiones, duplicados ni cola pendiente.

## 6. Problemas de arquitectura

- DM y grupos tienen modelos y capacidades desalineadas. Grupos tienen reacciones, editar, reenviar, ocultar para mi, STOMP y paginacion; DM no.
- El backend de DM mezcla `MessageDTO` con `Map<String,Object>` en respuestas; dificulta contrato estable y pruebas.
- Hay duplicidad historica de campos (`tipo/messageType`, `archivoUrl/fileUrl`, `nombreArchivo/fileName`) en entidades, DTOs y mappers.
- `ChatGrupoController` concentra demasiada responsabilidad: grupos, miembros, mensajes, uploads, links, adjuntos, roles, realtime y helpers.
- STOMP esta implementado a mano en frontend; una libreria probada reduciria riesgo de protocolo.

## 7. Problemas responsive/PWA

- Mobile esta contemplado con layout de pantalla completa y `100dvh`, pero falta prueba de teclado virtual, scroll con input fijo, safe-area y menus contextuales largos.
- El input inferior existe, pero no hay manejo avanzado de salto al ultimo mensaje, boton de nuevos mensajes ni preservacion de scroll al cargar anteriores.
- PWA existe con manifest y service worker en produccion, pero el SW solo cachea shell/iconos/static; no hay cache offline de conversaciones ni cola de envio.
- Push existe en settings/backend, pero `pushNotifications` esta desactivado por flag y no hay integracion especifica de nuevos mensajes de chat.

## 8. Problemas de seguridad

- Falta rate limit para texto DM.
- Falta validacion de pertenencia de `referenciaId` en DM.
- Falta analisis de contenido real de archivos: magic bytes, antivirus y bloqueo explicito de HTML/SVG/scriptables como adjuntos.
- `WebSocketConfig` permite origen `*` en `/ws`; el JWT mitiga, pero en produccion conviene restringir origenes.
- El JWT se guarda en `localStorage`; es practico, pero aumenta impacto de XSS. Para un chat profesional se deberia evaluar cookie httpOnly o hardening CSP.
- No hay bloquear usuario, reportar mensaje ni moderacion de abuso en chat.

## 9. Problemas backend

- `MensajeRepository.findConversacion` y `findAllByUsuario` no tienen paginacion.
- `MensajeController` no valida longitud maxima de contenido ni rate limit para mensajes de texto.
- `MensajeController` devuelve `Map` para conversaciones y `MessageDTO` para envio, con contratos diferentes.
- `ChatGrupoController` hace multiples consultas por mensaje para emisor, reply preview y reacciones. Esto puede ser N+1.
- `deleteByPrefix` en Redis usa `keys(prefix + "*")`, riesgoso en produccion si hay muchas claves.
- No hay tests especificos para chat, uploads, permisos, STOMP o DTO mapping.

## 10. Problemas frontend

- DM no usa WebSocket, typing ni presencia real.
- DM no pagina y no tiene infinite scroll.
- Search de `ConvList` solo filtra conversaciones/grupos, no busca dentro del hilo.
- Falta estado visible de conexion/reconexion.
- No hay estados optimistas profesionales: pendiente, enviado, error/reintentar, entregado, leido.
- No hay preview enriquecida de links, audios, stickers, fijados ni reportes.
- El manejo de errores en algunos flujos es silencioso, por ejemplo delete/copy/polling.

## 11. Problemas WebSocket

- Solo grupos usan STOMP.
- El cliente STOMP manual no procesa `ERROR`, heartbeats entrantes/salientes reales, receipts ni backoff incremental.
- La conexion no se inicia de forma global; se crea por suscripcion de grupo. Presencia global existe en backend, pero no esta consumida en chat.
- No hay cola persistente de mensajes offline; `pendingSends` vive en memoria.
- No hay fallback REST formal para acciones STOMP porque el envio real ya es REST y STOMP solo distribuye eventos. Esto funciona, pero la arquitectura debe documentarse.

## 12. Features faltantes

Faltan para acercarse a WhatsApp/Telegram/Messenger:

- DM realtime con STOMP.
- Estados enviado/entregado/leido por mensaje.
- Typing en DM.
- Online/ultima conexion real en UI.
- Busqueda dentro del chat.
- Paginacion/infinite scroll en DM.
- Reacciones en DM.
- Editar y reenviar en DM.
- Eliminar para mi en DM.
- Notificaciones push por mensaje.
- Silenciar/archivar por conversacion.
- Bloquear usuario y reportar mensaje.
- Mensajes fijados.
- Galeria multimedia completa.
- Link previews con metadata.
- Audio/voice notes.
- Reintento de envio y estado offline.

Faltan para acercarse a Discord:

- Canales dentro de servidores/grupos.
- Permisos granulares por rol/canal.
- Menciones con notificaciones.
- Moderacion/auditoria.
- Threads/respuestas avanzadas.
- Busqueda global por servidor/chat.

## 13. Recomendaciones por prioridad

### P0: rompe o amenaza el uso basico

1. Agregar paginacion a DM y cambiar frontend a infinite scroll.
2. Corregir soft delete en DM para que los mensajes eliminados sigan apareciendo como placeholder o implementar eliminar para mi/todos correctamente.
3. Agregar rate limit y longitud maxima al envio de texto DM.
4. Validar `referenciaId` en DM contra la conversacion actual.
5. Reforzar seguridad de archivos: magic bytes, bloqueo de tipos peligrosos, nombres seguros y politica de descarga.

### P1: necesario para chat profesional

1. Unificar realtime: STOMP tambien para DM, eventos de lectura, typing y presencia.
2. Mostrar estado de conexion/reconexion y errores de envio.
3. Implementar estados enviado/entregado/leido.
4. Integrar presencia y ultima conexion en header/lista.
5. Implementar busqueda dentro de chats.
6. Notificaciones push especificas de chat.
7. Bloquear usuario y reportar mensaje.
8. Mejorar permisos de grupos y verificar membresia activa en todas las acciones.

### P2: mejora importante

1. Editar, reenviar, reacciones y eliminar para mi en DM.
2. Mensajes fijados.
3. Galeria multimedia completa con filtros y paginacion.
4. Link previews enriquecidos.
5. Silenciar/archivar por conversacion.
6. Refactor de DTOs para contratos estables y ligeros.
7. Optimizar queries con joins/proyecciones y evitar N+1.

### P3: nice to have

1. Stickers/GIFs.
2. Voice notes.
3. Temas por chat.
4. Reacciones ilimitadas/custom.
5. Threads/canales estilo Discord.

## 14. Los 5 problemas mas urgentes

1. DM sin paginacion: carga historiales completos y no escala.
2. DM sin WebSocket/STOMP: la experiencia realtime depende de polling.
3. Soft delete roto en DM: los mensajes eliminados desaparecen al recargar.
4. Falta rate limit/limite de longitud en texto DM.
5. Seguridad de archivos todavia parcial: falta validacion por contenido real y escaneo.

## 15. Las 10 features mas importantes que faltan

1. WebSocket/STOMP para chats individuales.
2. Paginacion/infinite scroll en DM.
3. Estados enviado/entregado/leido.
4. Typing indicator en DM.
5. Online y ultima conexion visibles.
6. Busqueda dentro del chat.
7. Notificaciones push por mensaje.
8. Bloquear usuario y reportar mensaje.
9. Reacciones/editar/reenviar en DM.
10. Silenciar/archivar conversaciones.

## 16. Siguiente prompt recomendado

```text
Implementa la fase P0 del chat de FalconNet sin cambiar el diseño visual:

1. Agrega paginacion backend para mensajes individuales con beforeId y limit.
2. Cambia ChatThread para cargar los ultimos 50 mensajes y cargar anteriores preservando scroll.
3. Corrige soft delete en DM para que los mensajes eliminados se rendericen como "Mensaje eliminado" despues de recargar.
4. Agrega rate limit y max length al envio de texto DM.
5. Valida que referenciaId pertenezca a la conversacion actual.
6. Agrega pruebas backend para paginacion, delete, referencia invalida y rate limit.

No implementes WebSocket todavia. Mantén compatibilidad con el frontend actual.
```
