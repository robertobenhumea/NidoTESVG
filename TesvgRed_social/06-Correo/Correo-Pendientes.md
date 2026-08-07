# Correo — Pendientes y Deuda Técnica

## Estado de Fases

| Fase | Estado | Descripción |
|---|---|---|
| Fase 1 | ✅ Completa | Seguridad adjuntos, DTOs, paginación, layout 3-pane |
| Fase 2 | ✅ Completa | Threading, reply/replyAll/forward, mark-unread |
| Fase 3 | ✅ Completa | Push notifications para correo nuevo |
| Fase 4 | 🔜 Planificada | Buzones oficiales, destinatarios masivos |

## Pendientes

### P1 — Buzones Oficiales
- `BuzonOficial` y `BuzonMiembro` ya existen en el modelo
- Permite buzones tipo "soporte@tesvg.edu.mx", "becas@tesvg.edu.mx"
- Múltiples usuarios responden desde el mismo buzón
- `BuzonDataSeeder` prepara los datos iniciales

### P1 — Destinatarios Masivos
```
EnviarMasivoRequest ya existe en dto/
Permite enviar a:
  - Toda la carrera
  - Todo un grupo/semestre
  - Todos los usuarios con cierto rol
Solo para AUTORIDAD/DIRECCION/ADMIN
```

### P2 — Borradores
- Ya existe `esBorrador` en el modelo
- Falta UI para guardar/recuperar borradores
- Falta endpoint `GET /correos/borradores`

### P2 — Categorías Personalizadas
- `CorreoEtiqueta` ya existe en el modelo
- Falta UI para crear/gestionar categorías
- Falta sincronización de etiquetas

### P2 — Búsqueda Global en Correos
- Buscar por asunto, remitente, contenido
- Endpoint pendiente de implementar

### P3 — Correos Programados
- Enviar correo en fecha/hora futura
- `CorreoScheduler` ya existe, extender su funcionalidad

### P3 — Plantillas de Correo
- Plantillas reutilizables para correos frecuentes
- Solo para roles institucionales

## Bugs Conocidos

| Bug | Prioridad | Estado |
|---|---|---|
| Preview de `cuerpo` muestra HTML crudo si no se sanitiza antes de guardar | P1 | Mitigado con HtmlSanitizerService |

## Deuda Técnica

- `CorreoDestinatario` maneja estado por usuario (leido/favorito/archivado) — si el emisor borra el correo, los receptores lo siguen viendo
- No hay "vaciar papelera" manual — solo el scheduler automático lo hace
- Falta validación de `destinatarios` existentes antes de enviar (el correo se crea aunque los IDs sean inválidos)
