# Endpoints API — Referencia Completa

> Base URL: `http://localhost:8080` (sin prefijo `/api/`)
> Todas las rutas protegidas requieren `Authorization: Bearer <token>`

---

## Auth y Usuarios

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/usuarios/login` | No | `{ correo, password }` → `{ token, usuario }` |
| POST | `/usuarios/registro` | No | `{ correo, password, username, codigoAcceso? }` → UsuarioResponse |
| GET | `/usuarios/me` | Sí | Usuario actual |
| GET | `/usuarios/perfil` | Sí | Igual que /me |
| PUT | `/usuarios/perfil` | Sí | Actualizar campos de perfil |
| GET | `/usuarios` | Sí | Lista completa de usuarios |
| GET | `/usuarios/{id}` | Sí | Perfil público de usuario |

## Publicaciones (Feed)

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/publicaciones?page=0&size=15` | Sí | Feed paginado → `{ content, hasMore, page }` |
| GET | `/publicaciones` | Sí | Lista completa (compat) |
| GET | `/publicaciones/usuario/{id}` | Sí | Posts de un usuario |
| POST | `/publicaciones` | Sí | `{ contenido, imagenUrl? }` → Publicacion |
| DELETE | `/publicaciones/{id}` | Sí | Solo posts propios |

## Reacciones y Comentarios

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/interacciones/like/{postId}` | Sí | `{ tipo: 'like'\|'love'\|'haha'\|'wow'\|'sad'\|'angry' }` |
| GET | `/interacciones/mis-reacciones` | Sí | `{ postId: tipo }` map |
| GET | `/interacciones/reacciones-todos` | Sí | `{ postId: { tipo: count } }` map |
| GET | `/interacciones/comentarios/{postId}` | Sí | `Comentario[]` |
| POST | `/interacciones/comentario/{postId}` | Sí | `{ contenido }` → Comentario |
| DELETE | `/interacciones/comentario/{id}` | Sí | Solo comentarios propios |
| GET | `/interacciones/comentarios-todos` | Sí | `{ postId: Comentario[] }` map |

## Seguidores

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/seguidores/toggle/{userId}` | Sí | Toggle follow → `{ accion, seguidores }` |
| GET | `/seguidores/estado/{userId}` | Sí | `{ siguiendo, seguidores }` |
| GET | `/seguidores/{userId}/seguidores` | Sí | Lista de seguidores |
| GET | `/seguidores/{userId}/siguiendo` | Sí | Lista de seguidos |

## Chat DM (Mensajes)

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/mensajes/conversaciones` | Sí | Lista de conversaciones |
| GET | `/mensajes/{userId}` | Sí | Mensajes con un usuario |
| POST | `/mensajes/{userId}` | Sí | Enviar mensaje |
| DELETE | `/mensajes/{id}` | Sí | Eliminar mensaje |

## Chat Grupos

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/chat-grupos` | Sí | Grupos del usuario |
| POST | `/chat-grupos` | Sí | Crear grupo |
| GET | `/chat-grupos/{id}` | Sí | Detalle del grupo |
| GET | `/chat-grupos/{id}/mensajes` | Sí | Mensajes del grupo |
| POST | `/chat-grupos/{id}/mensajes` | Sí | Enviar mensaje al grupo |
| POST | `/chat-grupos/{id}/adjunto` | Sí | Subir archivo al grupo |
| GET | `/chat-grupos/{id}/miembros` | Sí | Miembros del grupo |
| POST | `/chat-grupos/{id}/miembros` | Sí | Agregar miembro |
| DELETE | `/chat-grupos/{id}/miembros/{userId}` | Sí | Remover miembro |

## Correo Institucional

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/correos/entrada?page=&size=` | Sí | Bandeja entrada paginada |
| GET | `/correos/enviados?page=&size=` | Sí | Bandeja enviados |
| GET | `/correos/favoritos?page=&size=` | Sí | Correos favoritos |
| GET | `/correos/no-leidos/lista?page=&size=` | Sí | No leídos |
| GET | `/correos/archivados?page=&size=` | Sí | Archivados |
| GET | `/correos/papelera?page=&size=` | Sí | Papelera |
| GET | `/correos/categoria/{cat}?page=&size=` | Sí | Por categoría |
| GET | `/correos/{id}` | Sí | Detalle completo |
| POST | `/correos/enviar` | Sí | Enviar correo nuevo |
| POST | `/correos/{id}/adjunto` | Sí | Adjuntar archivo |
| GET | `/correos/adjuntos/{id}/descargar` | Sí | Descargar adjunto (JWT required) |
| PATCH | `/correos/{id}/marcar-no-leido` | Sí | Marcar como no leído |
| GET | `/correos/{id}/hilo` | Sí | Thread completo (hilo) |
| GET | `/correos/identidad` | Sí | Info institucional del usuario |

## Notificaciones

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/notificaciones` | Sí | Lista de notificaciones |
| PATCH | `/notificaciones/{id}/leer` | Sí | Marcar como leída |
| PATCH | `/notificaciones/leer-todas` | Sí | Marcar todas como leídas |

## Push Notifications

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/push/status` | Sí | `{ subscribed, count }` |
| POST | `/push/subscribe` | Sí | Registrar suscripción VAPID |
| DELETE | `/push/unsubscribe` | Sí | Cancelar suscripción |

## Grupos Sociales

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/grupos` | Sí | Lista de grupos |
| POST | `/grupos` | Sí | Crear grupo |
| GET | `/grupos/{id}` | Sí | Detalle del grupo |
| POST | `/grupos/{id}/unirse` | Sí | Unirse al grupo |
| DELETE | `/grupos/{id}/salir` | Sí | Salir del grupo |
| GET | `/grupos/{id}/publicaciones` | Sí | Posts del grupo |
| POST | `/grupos/{id}/publicaciones` | Sí | Publicar en grupo |

## Búsqueda

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/buscar?q={query}&type={users\|posts\|groups}` | Sí | Búsqueda global con debounce |

## Marketplace

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/market/productos` | Sí | Lista de productos |
| POST | `/market/productos` | Sí | Publicar producto |
| GET | `/market/productos/{id}` | Sí | Detalle producto |
| DELETE | `/market/productos/{id}` | Sí | Eliminar producto (propio) |

## Imágenes

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/imagenes/upload` | Sí | Subir imagen → URL |
| GET | `/imagenes/{filename}` | No | Servir imagen |
| GET | `/imagenes/adjuntos/{uuid}` | No (bloqueado) | Ruta interna — NO usar |

> `/imagenes/adjuntos/**` está en `denyAll()` — acceder vía `/correos/adjuntos/{id}/descargar`

Ver: [[02-Backend/DTOs-Principales]] | [[06-Correo/Correo-Arquitectura]]
