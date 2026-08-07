# FalconNet — Resumen Ejecutivo

## ¿Qué es FalconNet?

FalconNet (nombre interno: NidoTESVG) es una red social universitaria completa desarrollada para los estudiantes, docentes y autoridades del **Instituto Tecnológico Superior del Valle de Guaymas (TESVG)**.

## Objetivo

Crear una plataforma social interna que centralice:
- Comunicación entre estudiantes y docentes
- Feed de publicaciones institucionales
- Correo institucional integrado
- Chat directo y grupos
- Marketplace estudiantil
- Recursos educativos
- Eventos y avisos
- Equipos/comunidades

## Analogía de Producto

FalconNet es la combinación de:
- **Facebook** — feed, perfiles, grupos sociales
- **Outlook/Gmail** — correo institucional con threading
- **Discord** — grupos de chat con roles y archivos
- **Wallapop/Facebook Marketplace** — mercado estudiantil

## Arquitectura Resumida

```
┌─────────────────────────────────────────────┐
│            FALCONNET                         │
│                                             │
│  Next.js 16 (puerto 3000)                   │
│  ↕ REST + (futuro) WebSocket STOMP          │
│  Spring Boot (puerto 8080)                  │
│  ↕                                          │
│  MariaDB + Redis                            │
└─────────────────────────────────────────────┘
```

## Roles de Usuario

| Rol | Descripción |
|---|---|
| `ESTUDIANTE` | Usuario base |
| `AUTORIDAD` | Acceso ampliado |
| `ADMIN` | Administración total |
| `DIRECCION` | Dirección académica |

## Estado Actual (2026-06-05)

El proyecto está en **desarrollo activo**. El backend tiene API REST completa. El frontend cubre todos los módulos principales con UI premium mobile-first.

La siguiente fase crítica es implementar WebSocket STOMP para reemplazar el polling actual del chat.

## Decisión Estratégica

Docker, VPS, Nginx y Cloudflare se implementarán **al final**, cuando todas las funcionalidades estén estabilizadas. Ver [[15-Decisiones/Decisiones-Arquitectura]].
