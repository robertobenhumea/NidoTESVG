# DTOs Principales del Backend

## Mapeo de Campos (Backend → Frontend)

| Campo Backend | Campo Frontend | Nota |
|---|---|---|
| `UsuarioResponse.correo` | `User.email` | |
| `UsuarioResponse.fotoPerfil` | `User.avatarUrl` | |
| `UsuarioResponse.username` | `User.username` + `User.displayName` | Backend no tiene displayName |
| `Publicacion.contenido` | `Post.content` | |
| `Publicacion.imagenUrl` | `Post.imageUrl` | |
| `Publicacion.fecha` | `Post.createdAt` | ISO string (no timestamps) |
| `Publicacion.usuarioId` | resuelto via user map | Posts no embedden autor |
| `Comentario.usuarioId` | resuelto via user map | Comentarios tampoco embedden autor |
| `BReactionType` (lowercase) | Frontend UPPERCASE | Normalizar en service layer |

---

## DTOs de Autenticación

### UsuarioResponse
```json
{
  "id": "Long",
  "username": "String",
  "correo": "String",
  "fotoPerfil": "String?",
  "fotoPortada": "String?",
  "bio": "String?",
  "carrera": "String?",
  "grupo": "String?",
  "ciudad": "String?",
  "intereses": "String?",
  "fechaNacimiento": "String?",
  "rol": "ESTUDIANTE | AUTORIDAD | ADMIN | DIRECCION",
  "activo": "Boolean",
  "lastSeen": "String?",
  "numeroControl": "String?",
  "matricula": "String?",
  "departamento": "String?"
}
```

---

## DTOs de Correo

### CorreoResumenDTO (bandeja — lista)
```json
{
  "id": "Long",
  "emisorId": "Long",
  "emisorNombre": "String",
  "emisorFoto": "String?",
  "asunto": "String",
  "cuerpo": "String (primeros 200 chars — preview)",
  "fecha": "String",
  "leido": "Boolean",
  "esEnviado": "Boolean",
  "favorito": "Boolean",
  "archivado": "Boolean",
  "enPapelera": "Boolean",
  "tieneAdjuntos": "Boolean",
  "threadId": "Long?",
  "replicasCount": "int",
  "categoria": "String?"
}
```

### CorreoDetalleDTO (detalle completo)
```json
{
  "cuerpoHtml": "String? (HTML sanitizado)",
  "destinatarios": "DestinatarioDTO[]",
  "adjuntos": "AdjuntoDTO[]",
  "tipoAccion": "RESPUESTA | RESPUESTA_TODOS | REENVIO | null",
  "parentId": "Long?",
  "audiencia": "String?",
  "audienciaCarrera": "String?",
  "audienciaGrupo": "String?"
}
```

### AdjuntoDTO
```json
{
  "id": "Long",
  "nombreArchivo": "String",
  "downloadUrl": "/correos/adjuntos/{id}/descargar",
  "tipoArchivo": "String?",
  "tamanio": "Long?",
  "fecha": "String"
}
```

> `archivoUrl` NUNCA se devuelve en respuestas API — solo acceso via downloadUrl + JWT

### CorreoPageDTO
```json
{
  "content": "T[]",
  "page": "int",
  "size": "int",
  "totalElements": "long",
  "totalPages": "int",
  "hasMore": "boolean"
}
```

### EnviarCorreoRequest
```json
{
  "destinatarios": "Long[]",
  "asunto": "String (@NotBlank)",
  "cuerpo": "String (@NotBlank)",
  "cuerpoHtml": "String?",
  "esBorrador": "boolean",
  "threadId": "Long?",
  "parentId": "Long?",
  "tipoAccion": "RESPUESTA | RESPUESTA_TODOS | REENVIO | null",
  "reenviadoDe": "Long?"
}
```

---

## DTOs de Chat (DM)

### MessageDTO
```json
{
  "id": "Long",
  "emisorId": "Long",
  "receptorId": "Long",
  "contenido": "String?",
  "tipo": "texto | imagen | audio | archivo | video",
  "fileUrl": "String?",
  "fileName": "String?",
  "fileType": "String?",
  "fileSize": "Long?",
  "durationSeconds": "Float?",
  "waveformData": "String?",
  "eliminado": "Boolean",
  "fecha": "String",
  "emisorNombre": "String?",
  "emisorFoto": "String?",
  "replyPreview": "ReplyPreviewDTO?",
  "editado": "Boolean?",
  "reactions": "MessageReactionDTO[]?",
  "myReaction": "String?"
}
```

---

## DTOs de Chat Grupos

### ChatGroupDTO
```json
{
  "id": "Long",
  "nombre": "String",
  "descripcion": "String?",
  "foto": "String?",
  "tipo": "PUBLICO | PRIVADO | SECRETO",
  "creadorId": "Long",
  "miRol": "ADMIN | MODERADOR | MIEMBRO",
  "noLeidos": "int",
  "fechaCreacion": "String",
  "lastMessage": "String?",
  "lastTipo": "String?",
  "lastDate": "String?",
  "lastSender": "String?"
}
```

---

## DTOs Realtime (WebSocket STOMP)

### ChatRealtimeEventDTO
```json
{
  "tipo": "NEW_MESSAGE | TYPING | READ | REACTION | DELETE",
  "conversacionId": "Long?",
  "grupoId": "Long?",
  "mensaje": "MessageDTO?",
  "usuarioId": "Long?"
}
```

### PresenceEventDTO
```json
{
  "usuarioId": "Long",
  "online": "Boolean",
  "lastSeen": "String?"
}
```

---

## DTO de Identidad Institucional

```json
{
  "id": "Long",
  "nombre": "String",
  "username": "String",
  "correo": "String",
  "fotoPerfil": "String?",
  "carrera": "String?",
  "semestre": "String? (= campo grupo)",
  "grupo": "String?",
  "matricula": "String?",
  "numeroControl": "String?",
  "rol": "String (enum name)",
  "rolLabel": "Estudiante | Docente | Coordinación | Dirección | Admin",
  "departamento": "String?",
  "facultad": "Instituto Tecnológico Superior del Valle de Guaymas",
  "verificadoInstitucional": "Boolean (correo termina en @tesvg.edu.mx)"
}
```

Ver: [[Endpoints-API]] | [[06-Correo/Correo-Arquitectura]] | [[05-Chat/Chat-Arquitectura]]
