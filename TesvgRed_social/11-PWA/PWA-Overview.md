# PWA — Progressive Web App

## Descripción

FalconNet está configurada como PWA para permitir instalación en dispositivos móviles y escritorio, con experiencia similar a una app nativa.

## Componentes PWA

### Service Worker (public/sw.js)
- Maneja push notifications
- Cache de recursos estáticos
- Gestión offline básica
- Intercepta notificationclick para navegación

### Web App Manifest
- Nombre de la app
- Íconos en múltiples tamaños
- Orientación y display mode
- Colores de tema

## Push Notifications

Ver detalle en [[06-Correo/Correo-Push-Notifications]].

### Tipos de Push Soportados

| Tipo | Descripción |
|---|---|
| `mail` | Nuevo correo institucional |
| Genérico | Notificación general del sistema |

### Flujo de Activación

```
1. Usuario va a /settings → sección Notificaciones
2. Click "Activar notificaciones push"
3. Browser solicita permiso (Notification.requestPermission)
4. Si permite → se genera suscripción VAPID
5. FE: POST /push/subscribe con la suscripción
6. BE: guarda PushSubscription en DB
7. Listo — usuario recibirá notificaciones
```

## Instalación de la PWA

```
Android Chrome:
  → "Agregar a pantalla de inicio"
  → Se instala como app nativa

iOS Safari:
  → "Compartir" → "Agregar a pantalla de inicio"
  → Se instala como WebApp

Desktop Chrome:
  → Botón de instalación en la barra de dirección
```

## Soporte Offline

- Actualmente: offline parcial (cache de assets)
- Pendiente: offline completo con sync cuando vuelve conexión
- Service Worker cachea shell de la app

## Safe Areas (iPhone X+)

El CSS usa `env(safe-area-inset-*)` para:
- Respetar el notch superior
- Respetar la barra de inicio inferior
- La bottom navigation tiene padding correcto

## Estado

| Feature | Estado |
|---|---|
| Service Worker | ✅ |
| Push notifications (correo) | ✅ |
| Push notifications (general) | ✅ |
| Web App Manifest | ✅ |
| Instalable en móvil | ✅ |
| Safe areas iOS | ✅ |
| Offline support | ⚠️ Parcial |
| Background sync | 🔜 |
| Splash screen personalizada | ⚠️ Básica |

## Pendientes

- [ ] Mejora del splash screen
- [ ] Background sync para posts offline
- [ ] Notificaciones push para mensajes de chat
- [ ] Precaching de rutas frecuentes
- [ ] App badge (counter en ícono de la app)
