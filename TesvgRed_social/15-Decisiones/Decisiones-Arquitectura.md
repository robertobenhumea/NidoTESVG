# Decisiones de Arquitectura

> Registro de decisiones importantes que explican el "por qué" de las elecciones técnicas.

---

## DEC-001: Docker al Final

**Decisión**: Docker, docker-compose y contenedores se implementan **después** de que todas las funcionalidades estén estabilizadas y probadas.

**Razón**: Durante desarrollo activo, Docker agrega fricción:
- Rebuilds lentos al cambiar código
- Hot reload más complicado
- Debugging más difícil
- No aporta valor funcional hasta que se necesita replicabilidad del entorno

**Aplicación**: No usar Docker para desarrollo local. Configurar en la fase final de infraestructura.

**Fecha**: Registrado en 2026-06-05

---

## DEC-002: VPS al Final

**Decisión**: El despliegue en VPS se hace **después** de estabilizar todas las funcionalidades.

**Razón**: Hacer deploy prematuro significa:
- Lidiar con issues de infraestructura mientras aún se desarrollan features
- Mayor riesgo de downtime durante development
- Costos operativos antes de necesitarlos
- Distracción del desarrollo del producto

**Aplicación**: Desarrollar en localhost hasta que el producto esté feature-complete y estable.

---

## DEC-003: Nginx al Final

**Decisión**: Nginx como reverse proxy se configura junto con el VPS.

**Razón**: Nginx es necesario en producción para:
- SSL termination (HTTPS)
- Reverse proxy de Next.js y Spring Boot
- Servir archivos estáticos de manera eficiente
- Rate limiting a nivel de infraestructura

Pero en desarrollo, Next.js dev server y Spring Boot corren directamente.

---

## DEC-004: Cloudflare al Final

**Decisión**: Cloudflare (CDN, DNS, DDoS protection) se configura junto con el dominio de producción.

**Razón**: Cloudflare requiere un dominio real y un servidor en producción. No aplica en desarrollo local.

**Aplicación**: Configurar cuando se compre el dominio y se levante el VPS.

---

## DEC-005: Redis Evaluado Post-Estabilización

**Decisión**: Redis es opcional — se evalúa si mantenerlo después de que las funcionalidades estén estables.

**Razón**:
- Redis añade un servicio adicional para gestionar
- El rate limiting puede hacerse en memoria para cargas bajas
- El cache puede deshabilitarse sin afectar funcionalidad

**Estado actual**: Redis está integrado y funciona. `app.redis.enabled=true` por defecto. Si Redis no está disponible, el sistema degrada gracefully.

---

## DEC-006: UX/UI Premium Después de Funcionalidades

**Decisión**: Las mejoras de UX premium (animaciones elaboradas, micro-interacciones, efectos visuales complejos) se implementan **después** de que todas las funcionalidades core estén estables.

**Razón**: Optimizar UX sobre funcionalidades incompletas es contraproducente. Primero que funcione, luego que sea bonito (y ya es bonito desde la base).

---

## DEC-007: Separación Frontend/Backend

**Decisión**: Separar Spring Boot (API pura, :8080) de Next.js (frontend, :3000).

**Razón**: La arquitectura monolítica original (Spring Boot sirviendo HTML/JS) tenía:
- Bugs recurrentes de integración
- Límites de escalabilidad
- Dificultar el desarrollo parallel de frontend y backend
- Imposible usar SSR moderno de Next.js

**Aplicación**: `spring.web.resources.add-mappings=false` — Spring Boot no sirve recursos estáticos.

---

## DEC-008: Polling Antes de WebSocket

**Decisión**: Implementar polling en chat antes de migrar a WebSocket STOMP.

**Razón**: El polling de 5s permite tener chat funcional inmediatamente sin la complejidad de WebSocket. La migración a STOMP se hace en Fase 4 cuando el resto del sistema esté estable.

---

## DEC-009: MariaDB sobre PostgreSQL

**Decisión**: MariaDB como base de datos principal (compatible con MySQL).

**Razón**: El equipo tiene más experiencia con MariaDB/MySQL. La compatibilidad con el entorno de desarrollo del TESVG.

> Nota: `CLAUDE.md` del proyecto menciona PostgreSQL por error histórico — la realidad es MariaDB.

---

## DEC-010: DDL Auto=Update en Desarrollo

**Decisión**: Usar `spring.jpa.hibernate.ddl-auto=update` en desarrollo.

**Razón**: Permite agregar campos nuevos a entidades sin migrations manuales durante el desarrollo rápido.

**Riesgo**: No usar `update` en producción — usar `validate` + Flyway migrations.
