# Feed — Overview

## Descripción

El feed es la pantalla principal de FalconNet. Muestra publicaciones de los usuarios que sigue, paginadas con scroll infinito.

## Ruta

`/` — página principal (home)

## Endpoints del Feed

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/publicaciones?page=0&size=15` | Feed paginado |
| GET | `/publicaciones/usuario/{id}` | Posts de un usuario específico |
| POST | `/publicaciones` | Crear publicación |
| DELETE | `/publicaciones/{id}` | Eliminar (solo propio) |
| POST | `/interacciones/like/{postId}` | Toggle reacción |
| GET | `/interacciones/reacciones-todos` | Mapa de reacciones |
| GET | `/interacciones/comentarios/{postId}` | Comentarios de un post |
| POST | `/interacciones/comentario/{postId}` | Agregar comentario |
| DELETE | `/interacciones/comentario/{id}` | Eliminar comentario |

## Tipos de Publicación

| Tipo | Descripción |
|---|---|
| `texto` | Solo texto |
| `imagen` | Texto + imagen |
| `video` | Texto + video |
| Anuncio (`esAnuncio: true`) | Publicación institucional destacada |
| Fijada (`fijada: true`) | Aparece al inicio del feed |
| Compartida (`compartida: true`) | Repost de otra publicación |

## Sistema de Reacciones

6 tipos de reacción tipo Facebook:
- `like` (👍)
- `love` (❤️)
- `haha` (😂)
- `wow` (😮)
- `sad` (😢)
- `angry` (😡)

**Nota**: Backend guarda en minúsculas, frontend normaliza a mayúsculas.

## useFeed Hook

El hook `useFeed` implementa:
- Paginación infinita (scroll detector)
- Cache via @tanstack/react-query
- Optimistic updates para reacciones
- Prefetch de siguientes páginas

## Estado

| Feature | Estado |
|---|---|
| Feed paginado | ✅ |
| Crear post (texto) | ✅ |
| Crear post (imagen) | ✅ |
| Reacciones (6 tipos) | ✅ |
| Comentarios | ✅ |
| Eliminar post propio | ✅ |
| Posts compartidos | ✅ |
| Stories | ✅ |
| Encuestas | ⚠️ Modelo existe, UI parcial |
| Videos | ⚠️ Modelo existe, UI básica |
| Scroll infinito | ✅ |
| Skeleton loaders | ✅ |

## Notas Técnicas

- Posts NO embedden autor — el frontend hace un `GET /usuarios` para obtener el mapa de usuarios
- Las reacciones vienen como mapa: `{ postId: { tipo: count } }`
- Los comentarios no embedden autor — mismo join manual
- `fecha` es ISO string (Jackson config en backend)

Ver: [[07-Feed/Stories|Stories]] | [[07-Feed/Grupos-Sociales|Grupos Sociales]]
