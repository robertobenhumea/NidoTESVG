# Chat Grupos

## Descripción

Los grupos de chat permiten conversaciones de múltiples participantes con sistema de roles, tipos de grupo y archivos compartidos.

## Rutas

| Ruta | Descripción |
|---|---|
| `/messages` | Lista de grupos (junto con DMs) |
| `/messages/groups/[groupId]` | Hilo del grupo |

## Tipos de Grupo

| Tipo | Descripción |
|---|---|
| `PUBLICO` | Cualquier usuario puede unirse |
| `PRIVADO` | Solo por invitación |
| `SECRETO` | No aparece en búsquedas |

## Roles

| Rol | Permisos |
|---|---|
| `ADMIN` | Todo: editar grupo, gestionar miembros, roles |
| `MODERADOR` | Silenciar, remover miembros |
| `MIEMBRO` | Enviar mensajes, reaccionar |

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/chat-grupos` | Grupos del usuario |
| POST | `/chat-grupos` | Crear grupo |
| GET | `/chat-grupos/{id}` | Detalle del grupo |
| PUT | `/chat-grupos/{id}` | Editar grupo (admin) |
| DELETE | `/chat-grupos/{id}` | Eliminar grupo (admin) |
| GET | `/chat-grupos/{id}/mensajes?page=&size=` | Mensajes del grupo |
| POST | `/chat-grupos/{id}/mensajes` | Enviar mensaje |
| PUT | `/chat-grupos/{id}/mensajes/{msgId}` | Editar mensaje |
| DELETE | `/chat-grupos/{id}/mensajes/{msgId}` | Eliminar mensaje |
| POST | `/chat-grupos/{id}/adjunto` | Subir archivo |
| GET | `/chat-grupos/{id}/miembros` | Lista de miembros |
| POST | `/chat-grupos/{id}/miembros` | Agregar miembro |
| DELETE | `/chat-grupos/{id}/miembros/{userId}` | Remover miembro |
| POST | `/chat-grupos/{id}/rol/{userId}` | Cambiar rol |
| POST | `/chat-grupos/{id}/silenciar/{userId}` | Silenciar miembro |
| GET | `/chat-grupos/{id}/adjuntos` | Archivos del grupo |
| GET | `/chat-grupos/{id}/enlaces` | Links compartidos |

## Modelo de Datos

### `ChatGrupo`
```
id, nombre, descripcion, foto
tipo (PUBLICO|PRIVADO|SECRETO)
creadorId, fechaCreacion
```

### `ChatGrupoMiembro`
```
id, grupoId, usuarioId
rol (ADMIN|MODERADOR|MIEMBRO)
silenciado, fechaUnion, noLeidos
```

### `ChatGrupoMensaje`
```
id, grupoId, senderId
content, tipo (texto|imagen|audio|archivo|video)
fileUrl, fileName, fileType, fileSize
durationSeconds, waveformData
eliminado, esSistema
createdAt
referenciaId (para reply)
editado, actualizadoEn
reenviado, mensajeOriginalId
```

### `GroupAttachment`
```
id, mensajeId, usuarioId
url, nombreArchivo, tipoArchivo
tipo (imagen|audio|archivo|video)
tamanio, fechaCreacion
```

## Mensajes de Sistema

Los mensajes con `esSistema: true` son automáticos:
- "Usuario X se unió al grupo"
- "Usuario X fue removido"
- "El nombre del grupo cambió a..."

## Adjuntos del Grupo

- Vista "archivos del grupo" muestra galería de todos los attachments
- Vista "enlaces" muestra URLs compartidas en mensajes

## Características Especiales

- **Counter de no leídos**: `ChatGrupoMiembro.noLeidos` por usuario
- **Silenciar**: miembro silenciado no recibe notificaciones
- **Forward**: reenvío de mensajes entre chats

## Estado y Pendientes

| Feature | Estado |
|---|---|
| CRUD grupos completo | ✅ |
| Roles y permisos | ✅ |
| Mensajes de texto | ✅ |
| Imágenes | ✅ |
| Audios con waveform | ✅ |
| Archivos genéricos | ✅ |
| Reply/referencias | ✅ |
| Reacciones | ✅ |
| Editar mensajes | ✅ |
| Adjuntos móvil | ✅ (fix 2026-05-17) |
| Mensajes de sistema | ✅ |
| Menciones (@usuario) | ⚠️ Parcial |
| WebSocket STOMP | 🔜 Fase 4 |
| Notificaciones push por mensaje | 🔜 |

Ver: [[Chat-Arquitectura]] | [[Chat-Audios]] | [[Chat-WebSocket-Futuro]]
