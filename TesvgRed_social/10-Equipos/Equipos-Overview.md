# Equipos — Overview

## Descripción

El módulo de equipos permite a los estudiantes crear y gestionar equipos de trabajo, proyectos o grupos de estudio formales, con reclutamiento de integrantes.

## Rutas

| Ruta | Descripción |
|---|---|
| `/equipos` | Lista de equipos |
| `/equipos/[id]` | Detalle de equipo |

## Servicios

- `equipo.service.ts` — operaciones CRUD de equipos

## Módulos Relacionados

### Reclutamiento
`ReclutamientoController` + `SolicitudReclutamiento`

Permite:
- Publicar que se buscan integrantes para un equipo
- Postular a un equipo
- Aceptar/rechazar postulaciones

### Destacados
`DestacadoController` + `DestacadoService`

Permite destacar contenido (posts, equipos) en secciones especiales del feed.

## Estado

| Feature | Estado |
|---|---|
| Listar equipos | ✅ |
| Crear equipo | ✅ |
| Ver detalle | ✅ |
| Reclutamiento | ⚠️ Backend completo, UI básica |
| Recursos del equipo | ⚠️ Parcial |

## Relación con Otros Módulos

- Los equipos pueden tener un grupo de chat asociado
- Los recursos del módulo `/recursos` pueden estar vinculados a equipos
- El reclutamiento aparece en el feed general
