# Correo — Threading (Hilos)

## Descripción

El sistema de threading permite agrupar correos en conversaciones, similar a Gmail. Un hilo puede contener: respuesta, respuesta-a-todos y reenvíos.

## Modelo de Hilo

```
Correo raíz (A)
  threadId = null
  parentId = null

    └─ Respuesta (B) de usuario X
         threadId = A.id
         parentId = A.id
         tipoAccion = RESPUESTA

    └─ Respuesta-a-todos (C) de usuario Y
         threadId = A.id
         parentId = A.id
         tipoAccion = RESPUESTA_TODOS

Reenvío (D) — inicia NUEVO hilo
  threadId = null
  parentId = null
  tipoAccion = REENVIO
  reenviadoDe = A.id
```

## Endpoint del Hilo

```
GET /correos/{id}/hilo
→ List<ThreadMessageDTO>   (raíz + todos los replies, orden ASC por fecha)
```

El `{id}` puede ser cualquier correo del hilo — el backend encuentra la raíz automáticamente.

## ThreadMessageDTO

```json
{
  "id": 1,
  "emisorId": 5,
  "emisorNombre": "Roberto Benhumea",
  "emisorFoto": "/imagenes/avatar.jpg",
  "asunto": "Re: Proyecto final",
  "cuerpo": "Texto plano...",
  "cuerpoHtml": "<p>HTML sanitizado</p>",
  "fecha": "2026-05-28T10:30:00",
  "tipoAccion": "RESPUESTA",
  "adjuntos": []
}
```

## ComposeModal — Modos

```typescript
type Mode = 'compose' | 'reply' | 'replyAll' | 'forward';

// Props del modal
{
  mode: Mode,
  initialBody: string,  // prefilled para forward (cuerpo citado)
  threadId: number?,    // para replies
  parentId: number?,    // para replies
}
```

## MailDetail.tsx — Acciones

| Botón | Visible cuando | Acción |
|---|---|---|
| Responder | Siempre | `mode='reply'` |
| Responder a todos | Tiene destinatarios | `mode='replyAll'` |
| Reenviar | Siempre | `mode='forward'` |
| Marcar no leído | `leido=true` | PATCH `/correos/{id}/marcar-no-leido` |

## Vista del Hilo en MailDetail

- Sección colapsable "Ver hilo (N mensajes)"
- Se carga vía `GET /correos/{id}/hilo` al expandir
- Muestra todos los mensajes en orden cronológico
- Badge de tipo de acción (`RESPUESTA`, `REENVIO`, etc.)

## HTML en Correos

- `cuerpoHtml` puede contener HTML formateado
- Se renderiza con `dangerouslySetInnerHTML` en MailDetail
- `HtmlSanitizerService` limpia el HTML antes de guardarlo en DB
- Si `cuerpoHtml` es null, se muestra `cuerpo` (texto plano)

## replicasCount

`CorreoResumenDTO.replicasCount` muestra cuántas respuestas tiene el correo:
```sql
SELECT COUNT(*) FROM Correo WHERE threadId = :rootId
```
Se usa para mostrar "5 respuestas" en la lista de bandeja.
