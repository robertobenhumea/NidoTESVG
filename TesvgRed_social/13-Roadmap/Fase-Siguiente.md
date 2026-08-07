# Fase Siguiente — Fase 5

> Estimada: 2026-07
> Objetivo: Correo avanzado + UX premium + Estabilización

## Objetivo Principal

Con WebSocket STOMP funcionando y perfiles completos, la Fase 5 se enfoca en completar el módulo de correo institucional y mejorar la UX general.

## Tareas de Fase 5

### Correo — Buzones Oficiales (P1)

```
El modelo ya existe:
  ✅ BuzonOficial.java
  ✅ BuzonMiembro.java
  ✅ BuzonDataSeeder.java

Pendiente:
  [ ] UI para gestionar buzones (admin)
  [ ] UI para responder desde un buzón oficial
  [ ] Selector de buzón en ComposeModal
  [ ] Correos "de" un buzón (no del usuario personal)
```

### Correo — Destinatarios Masivos (P1)

```
El DTO ya existe:
  ✅ EnviarMasivoRequest.java

Pendiente:
  [ ] Endpoint para envío masivo
  [ ] UI con selector: todos | carrera | grupo | semestre | rol
  [ ] Solo disponible para AUTORIDAD/DIRECCION/ADMIN
  [ ] Preview de cantidad de destinatarios antes de enviar
```

### Correo — Borradores (P2)

```
El modelo ya soporta esBorrador:
  ✅ Correo.esBorrador field

Pendiente:
  [ ] Endpoint GET /correos/borradores
  [ ] Auto-save de borradores mientras se escribe
  [ ] UI de bandeja de borradores
  [ ] Recuperar borrador al reabrir ComposeModal
```

### UX Premium (P2)

```
[ ] Animaciones de transición entre rutas
[ ] Skeleton loaders mejorados
[ ] Loading states más fluidos
[ ] Empty states con ilustraciones
[ ] Micro-animaciones en reacciones
[ ] Haptic feedback en móvil (si API disponible)
```

### Estabilización General

```
[ ] Audit de TypeScript — eliminar todos los warnings
[ ] Performance audit con Lighthouse
[ ] Bundle size optimization
[ ] Lazy loading en más componentes
[ ] Tests unitarios para hooks críticos
[ ] Tests de integración para flujos principales
```

## Fase Futura — Fase 6

### Infraestructura de Producción

Cuando las funcionalidades estén estabilizadas:

```
[ ] Docker Compose completo (backend + frontend + DB + Redis)
[ ] Nginx como reverse proxy
[ ] Deploy en VPS
[ ] Cloudflare CDN + DNS
[ ] HTTPS con certificado SSL
[ ] Variables de entorno de producción
[ ] Monitoreo y alertas
[ ] Backups de base de datos
```

Ver detalles en: [[16-Infraestructura-Futura/Plan-Infraestructura]]

## Decisión Clave

Docker, VPS, Nginx y Cloudflare se implementan **al final** — después de que todas las funcionalidades estén estabilizadas y probadas en desarrollo. Ver: [[15-Decisiones/Decisiones-Arquitectura]].
