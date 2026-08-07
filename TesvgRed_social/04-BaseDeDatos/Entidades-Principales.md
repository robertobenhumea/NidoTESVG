# Entidades Principales — Base de Datos

> Motor: MariaDB (compatible MySQL)
> Esquema: `tesvg_red_social`
> ORM: Spring Data JPA / Hibernate
> DDL: `spring.jpa.hibernate.ddl-auto=update`

---

## Diagrama de Entidades Core

```mermaid
erDiagram
    USUARIO {
        Long id PK
        String username
        String correo
        String password
        String fotoPerfil
        String fotoPortada
        String bio
        String carrera
        String grupo
        String ciudad
        String intereses
        String fechaNacimiento
        Rol rol
        Boolean activo
        String lastSeen
        String numeroControl
        String matricula
        String departamento
    }

    PUBLICACION {
        Long id PK
        Long usuarioId FK
        String contenido
        String imagenUrl
        LocalDateTime fecha
        String tipo
        String videoUrl
        Boolean esAnuncio
        Boolean fijada
        Boolean compartida
        Long publicacionOriginalId
        Boolean allowComments
        LocalDateTime expiresAt
    }

    COMENTARIO {
        Long id PK
        Long usuarioId FK
        Long publicacionId FK
        String contenido
        LocalDateTime createdAt
    }

    LIKE {
        Long id PK
        Long usuarioId FK
        Long publicacionId FK
        String tipo
    }

    SEGUIDOR {
        Long id PK
        Long seguidorId FK
        Long seguidoId FK
    }

    USUARIO ||--o{ PUBLICACION : "crea"
    USUARIO ||--o{ COMENTARIO : "escribe"
    USUARIO ||--o{ LIKE : "da"
    USUARIO ||--o{ SEGUIDOR : "sigue"
    PUBLICACION ||--o{ COMENTARIO : "tiene"
    PUBLICACION ||--o{ LIKE : "recibe"
```

---

## Entidades de Chat (DM)

```mermaid
erDiagram
    MENSAJE {
        Long id PK
        Long emisorId FK
        Long receptorId FK
        String contenido
        String tipo
        String fileUrl
        String fileName
        String fileType
        Long fileSize
        Float durationSeconds
        String waveformData
        Boolean eliminado
        LocalDateTime fecha
        Boolean editado
        LocalDateTime actualizadoEn
        Boolean reenviado
        Long mensajeOriginalId
    }

    MESSAGE_REACTION {
        Long id PK
        Long mensajeId FK
        Long usuarioId FK
        String reactionType
    }

    DM_MESSAGE_HIDDEN {
        Long id PK
        Long mensajeId FK
        Long usuarioId FK
    }

    CHAT_BLOCK {
        Long id PK
        Long bloqueadorId FK
        Long bloqueadoId FK
        LocalDateTime fecha
    }

    CHAT_REPORT {
        Long id PK
        Long reportadorId FK
        Long reportadoId FK
        String motivo
        LocalDateTime fecha
    }

    CHAT_AUDIT_LOG {
        Long id PK
        Long usuarioId FK
        String accion
        String detalle
        LocalDateTime fecha
    }
```

---

## Entidades de Chat Grupos

```mermaid
erDiagram
    CHAT_GRUPO {
        Long id PK
        String nombre
        String descripcion
        String foto
        String tipo
        Long creadorId FK
        LocalDateTime fechaCreacion
    }

    CHAT_GRUPO_MIEMBRO {
        Long id PK
        Long grupoId FK
        Long usuarioId FK
        String rol
        Boolean silenciado
        LocalDateTime fechaUnion
        int noLeidos
    }

    CHAT_GRUPO_MENSAJE {
        Long id PK
        Long grupoId FK
        Long senderId FK
        String content
        String tipo
        String fileUrl
        String fileName
        String fileType
        Long fileSize
        Float durationSeconds
        String waveformData
        Boolean eliminado
        Boolean esSistema
        LocalDateTime createdAt
        Long referenciaId
        Boolean editado
        Boolean reenviado
        Long mensajeOriginalId
    }

    GROUP_ATTACHMENT {
        Long id PK
        Long mensajeId FK
        Long usuarioId FK
        String url
        String nombreArchivo
        String tipoArchivo
        String tipo
        Long tamanio
        LocalDateTime fechaCreacion
    }

    CHAT_GRUPO ||--o{ CHAT_GRUPO_MIEMBRO : "tiene"
    CHAT_GRUPO ||--o{ CHAT_GRUPO_MENSAJE : "contiene"
    CHAT_GRUPO_MENSAJE ||--o{ GROUP_ATTACHMENT : "adjunta"
```

---

## Entidades de Correo

```mermaid
erDiagram
    CORREO {
        Long id PK
        Long emisorId FK
        String asunto
        String cuerpo
        String cuerpoHtml
        LocalDateTime fecha
        Boolean esBorrador
        Long threadId
        Long parentId
        String tipoAccion
        Long reenviadoDe
        String audiencia
        String audienciaCarrera
        String audienciaGrupo
    }

    CORREO_DESTINATARIO {
        Long id PK
        Long correoId FK
        Long receptorId FK
        Boolean leido
        Boolean favorito
        Boolean archivado
        Boolean enPapelera
    }

    CORREO_ADJUNTO {
        Long id PK
        Long correoId FK
        String nombreArchivo
        String archivoUrl
        String tipoArchivo
        Long tamanio
        LocalDateTime fecha
    }

    CORREO_ETIQUETA {
        Long id PK
        Long correoId FK
        Long usuarioId FK
        String etiqueta
    }

    CORREO ||--o{ CORREO_DESTINATARIO : "enviado a"
    CORREO ||--o{ CORREO_ADJUNTO : "adjunta"
    CORREO ||--o{ CORREO_ETIQUETA : "etiquetado"
```

---

## Otras Entidades Importantes

### Social
| Entidad | Descripción |
|---|---|
| `GrupoSocial` | Grupos/comunidades de usuarios |
| `GrupoMiembro` | Miembros de grupos sociales |
| `GrupoPublicacion` | Posts dentro de grupos |
| `Story`, `StoryViewer` | Stories tipo Instagram |
| `Notificacion` | Notificaciones del sistema |
| `PushSubscription` | Suscripciones VAPID para push |
| `Favorito` | Correos/posts favoritos |
| `Destacado` | Contenido destacado |

### Marketplace
| Entidad | Descripción |
|---|---|
| `Producto` | Producto en venta |
| `SolicitudCompra` | Solicitud de compra |

### Institucional
| Entidad | Descripción |
|---|---|
| `Evento` | Eventos académicos |
| `Aviso` | Avisos institucionales |
| `Recurso` | Recursos educativos |
| `Encuesta`, `EncuestaOpcion`, `EncuestaVoto` | Sistema de encuestas |
| `Reclutamiento`, `SolicitudReclutamiento` | Reclutamiento estudiantil |
| `CodigoRegistro` | Códigos de acceso para registro |
| `Reporte` | Reportes de contenido |
| `Insignia`, `UsuarioInsignia` | Sistema de logros |
| `BuzonOficial`, `BuzonMiembro` | Buzones institucionales |

---

## Notas Técnicas

- Jackson: `write-dates-as-timestamps=false` → `LocalDateTime` serializa como ISO string
- Posts y comentarios NO embedden autor — join manual con lista de usuarios
- `archivoUrl` de adjuntos bloqueado en `SecurityConfig` (`denyAll()`)
- DDL auto en `update` — Hibernate crea columnas nuevas automáticamente

Ver: [[02-Backend/Endpoints-API]] | [[04-BaseDeDatos/Configuracion-DB]]
