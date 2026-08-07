# Glosario de FalconNet

## Términos del Proyecto

| Término | Significado |
|---|---|
| **FalconNet** | Nombre público de la red social |
| **NidoTESVG** | Nombre interno/codename del proyecto |
| **TESVG** | Instituto Tecnológico Superior del Valle de Guaymas |
| **Bandeja** | Carpeta de correos (entrada, enviados, etc.) |
| **Hilo / Thread** | Conversación de correo con replies encadenados |
| **Adjunto** | Archivo adjunto a un correo |
| **Buzón oficial** | Buzón institucional compartido (soporte@, becas@, etc.) |
| **Badge** | Contador numérico sobre ícono de notificación |
| **FAB** | Floating Action Button — botón flotante |
| **Polling** | Consultar el servidor repetidamente para detectar cambios |
| **STOMP** | Simple Text Oriented Messaging Protocol — protocolo WebSocket |
| **VAPID** | Voluntary Application Server Identification — estándar de push notifications |
| **PWA** | Progressive Web App — app web instalable |
| **Safe area** | Área segura en iPhones con notch (espacio para cámara/barra de inicio) |
| **Realtime** | En tiempo real, sin polling |
| **Soft delete** | Borrado lógico — `eliminado=true`, registro permanece en DB |
| **DTOs** | Data Transfer Objects — objetos de transferencia de datos entre capas |
| **JWT** | JSON Web Token — token de autenticación |
| **JJWT** | Librería Java para JWT |
| **DDL auto** | Hibernate puede crear/modificar tablas automáticamente |
| **Presencia** | Estado online/offline de un usuario |
| **Waveform** | Forma de onda visual de un audio |
| **Threading** | Agrupación de correos en conversaciones encadenadas |

## Roles de Usuario

| Rol | Español | Permisos |
|---|---|---|
| `ESTUDIANTE` | Estudiante | Base — acceso general |
| `AUTORIDAD` | Autoridad | Avisos, correos masivos |
| `ADMIN` | Administrador | Acceso total |
| `DIRECCION` | Dirección | Avisos institucionales, correos masivos |

## Estados de Módulos

| Símbolo | Significado |
|---|---|
| ✅ | Completado y funcional |
| ⚠️ | Parcialmente implementado |
| 🔜 | Planificado para próxima fase |
| ❌ | No implementado / bloqueado |

## Convenciones de Código

| Convención | Descripción |
|---|---|
| `B` prefix (BUser, BPublicacion) | Tipo del backend (raw, sin normalizar) |
| Sin `B` prefix (User, Post) | Tipo normalizado para UI |
| `service.ts` | Capa de acceso a API |
| `use*.ts` | Custom hooks de React |
| `*.types.ts` | Definiciones de tipos TypeScript |
