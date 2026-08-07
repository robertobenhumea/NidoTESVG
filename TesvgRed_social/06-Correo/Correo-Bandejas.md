# Correo — Bandejas

## Bandejas Implementadas

### Entrada
- Correos recibidos donde el usuario es destinatario
- No incluye borradores ni enviados propios
- Ordenados por fecha descendente

### Enviados
- Correos donde el usuario es emisor
- Incluye replies y reenvíos propios

### Favoritos
- Correos marcados con estrella (`CorreoDestinatario.favorito = true`)
- Aplica tanto para enviados como recibidos

### No Leídos
- Correos donde `CorreoDestinatario.leido = false`
- Badge numérico en sidebar

### Archivados
- Correos archivados (`CorreoDestinatario.archivado = true`)
- No aparecen en otras bandejas

### Papelera
- Correos eliminados (`CorreoDestinatario.enPapelera = true`)
- Vaciado automático via `CorreoScheduler`

### Categorías
- Etiquetas personalizadas por usuario
- `GET /correos/categoria/{nombre}`

## Paginación

Todos los endpoints de bandeja:
```
GET /correos/{bandeja}?page=0&size=20
```

Respuesta `CorreoPageDTO`:
```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8,
  "hasMore": true
}
```

El frontend muestra botón "Cargar más" que appends a la lista existente.

## Acciones por Correo (desde lista)

| Acción | Descripción |
|---|---|
| Marcar favorito | Toggle `favorito` |
| Archivar | Toggle `archivado` |
| Mover a papelera | Toggle `enPapelera` |
| Marcar no leído | PATCH `/correos/{id}/marcar-no-leido` |
| Responder | Abre ComposeModal en modo `reply` |
| Responder a todos | Abre ComposeModal en modo `replyAll` |
| Reenviar | Abre ComposeModal en modo `forward` |

## Swipe Actions (Mobile)

En móvil, swipe en un correo de la lista:
- Swipe izquierda → mover a papelera
- Swipe derecha → marcar favorito

## Atajos de Teclado (Desktop)

| Tecla | Acción |
|---|---|
| `C` | Nuevo correo (Compose) |
| `R` | Responder al seleccionado |
| `Esc` | Cerrar detalle / cerrar modal |
| `F` | Marcar/desmarcar favorito |
| `D` | Mover a papelera |

## Estados de UI

- **Skeleton loaders** durante carga inicial
- **Empty states** con ilustración cuando bandeja vacía
- **Toast notifications** para confirmación de acciones
- **Real-time search** con debounce sobre la bandeja activa
- **Filter chips**: Todos / No leídos / Destacados

Ver: [[Correo-Arquitectura]] | [[Correo-Threading]]
