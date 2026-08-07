# Perfiles — Overview

## Descripción

Los perfiles públicos muestran información del usuario, sus publicaciones, seguidores y acciones sociales (seguir, enviar mensaje, enviar correo).

## Rutas

| Ruta | Descripción |
|---|---|
| `/profile/[id]` | Perfil público de cualquier usuario |
| `/settings` | Configuración del propio perfil |

## Endpoints de Perfiles

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/usuarios/{id}` | Datos del perfil público |
| GET | `/publicaciones/usuario/{id}` | Posts del usuario |
| GET | `/seguidores/{id}/seguidores` | Lista de seguidores |
| GET | `/seguidores/{id}/siguiendo` | Lista de seguidos |
| POST | `/seguidores/toggle/{id}` | Seguir/dejar de seguir |
| GET | `/seguidores/estado/{id}` | Estado de seguimiento actual |

## Información del Perfil

```typescript
// BUser (desde backend)
{
  id, username, correo
  fotoPerfil, fotoPortada
  bio, carrera, grupo
  ciudad, intereses
  fechaNacimiento
  rol (ESTUDIANTE|AUTORIDAD|ADMIN|DIRECCION)
  activo, lastSeen
  numeroControl, matricula
  departamento
}
```

## Acciones Sociales en Perfil Público

- **Seguir / Dejar de seguir** — toggle
- **Enviar mensaje** → navega a `/messages/[userId]`
- **Enviar correo** → abre ComposeModal con destinatario prellenado
- **Ver seguidores** → lista paginada
- **Ver seguidos** → lista paginada

## Layout del Perfil

```
┌─────────────────────────────────┐
│         Foto de portada          │
│    ┌─────┐                       │
│    │Avatar│  Nombre              │
│    └─────┘  @username            │
│             Bio                  │
│  [Seguir] [Mensaje] [Correo]    │
├─────────────────────────────────┤
│  Carrera | Seguidores | Seguidos │
├─────────────────────────────────┤
│         Posts del usuario        │
│         (grid o lista)           │
└─────────────────────────────────┘
```

## Configuración de Perfil (/settings)

Permite editar:
- Foto de perfil (upload)
- Foto de portada (upload)
- Bio
- Ciudad
- Intereses
- Fecha de nacimiento

**Pendiente (Fase 4)**: La UI de editar perfil en `/settings` está incompleta. El endpoint `PUT /usuarios/perfil` ya existe en el backend.

## Insignias (Badges de Logros)

- `InsigniaService` otorga insignias automáticamente
- Las insignias aparecen en el perfil
- Ejemplos: "Primer post", "100 seguidores", etc.

## Ranking

- El sistema de ranking (`RankingController`) puntúa a usuarios
- El ranking aparece en `/ranking`
- Basado en: posts, reacciones recibidas, seguidores, etc.

Ver: [[08-Perfiles/Seguidores|Sistema de Seguidores]]
