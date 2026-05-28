# Auditoria profesional del correo/inbox institucional de FalconNet

Fecha: 2026-05-26  
Alcance: frontend Next.js en `falconnet-frontend/src/app/(main)/correos` y alias `/mail`, backend Spring Boot en `CorreoController`, repositorios/modelos de correo, seguridad JWT, uploads, PWA y navegacion relacionada.

## 1. Resumen ejecutivo

FalconNet ya tiene una base real de correo institucional separada del chat: bandeja de entrada, enviados, categorias, favoritos, no leidos, archivados, papelera, busqueda basica, envio, respuesta simple, adjuntos, informacion academica del remitente/destinatario, JWT y una UI responsive tipo cliente de correo.

El modulo todavia no esta al nivel de Gmail, Outlook, Canvas LMS Inbox o un correo institucional universitario. Los gaps mas importantes estan en seguridad de adjuntos, paginacion, contratos backend, hilos/responder a todos/reenviar, destinatarios academicos por grupo/carrera/semestre y notificaciones realtime/push consumidas por frontend.

El problema mas serio es que existen dos caminos para adjuntos: un endpoint seguro con permiso (`/correos/adjuntos/{id}/descargar`) y una ruta publica (`/imagenes/adjuntos/**`). El frontend usa la ruta publica para abrir/descargar/preview, por lo que cualquier persona con la URL puede acceder al adjunto. Esto rompe una expectativa central de correo institucional.

## 2. Estado actual del correo/inbox

### Lo que ya existe

- Backend dedicado en `backend/src/main/java/com/tesvg/backend/controller/CorreoController.java`.
- Entidades persistentes: `Correo`, `CorreoDestinatario`, `CorreoAdjunto`, `CorreoEtiqueta`.
- Repositorios JPA para entrada, enviados, favoritos, no leidos, archivados, papelera, categorias, etiquetas y busqueda.
- UI principal en `falconnet-frontend/src/app/(main)/correos/page.tsx`.
- Alias `/mail` que reexporta `/correos`.
- Modal de redaccion con destinatarios, categoria, adjuntos, limite cliente de 6 archivos y 25 MB por archivo.
- Vista detalle con identidad institucional y datos academicos.
- JWT requerido en `/correos/**`.
- Descarga segura implementada en backend, aunque no usada por la UI.
- Rate limit en memoria para envio: 20 correos por minuto por usuario.
- Papelera con limpieza programada de elementos antiguos.

### Lo que funciona bien

- Separacion conceptual entre correo e inbox frente a chat.
- Modelo receptor-por-correo con estado por usuario: leido, favorito, etiqueta, papelera, archivado.
- Categorias institucionales basicas: `GENERAL`, `ACADEMICO`, `INSTITUCIONAL`, `COORDINACION`, `TRAMITE`, etc.
- UI responsive con panel de lista/detalle en desktop y vista de una columna en movil.
- Identidad institucional enriquecida desde `Usuario`: rol, carrera, grupo, numero de control y correo verificado.

### Lo incompleto o roto

- Adjuntos de correo estan servidos publicamente por `/imagenes/adjuntos/**`.
- No hay paginacion ni infinite scroll en backend o frontend para bandejas.
- No existe marcar como no leido.
- No existen responder a todos, reenviar ni hilos reales.
- No existen destinatarios academicos por grupo, carrera o semestre.
- No hay DTOs formales de correo; el controlador usa `Map<String,Object>`.
- La UI no consume el endpoint backend de busqueda avanzada ni el endpoint seguro de descarga.
- El backend emite evento STOMP `mail:new`, pero el frontend no se suscribe a `/queue/correos`.
- No hay offline parcial de correo; el service worker solo cachea shell/assets.

## 3. Tabla de comparacion profesional

| Feature | Existe | Funciona | Falta | Prioridad | Archivos relacionados |
|---|---:|---:|---|---|---|
| 1. Enviar correo | Si | Parcial | Enviar adjuntos en transaccion o flujo atomico; DTOs | P0 | `CorreoController.java:242`, `ComposeModal.tsx:214` |
| 2. Recibir correo | Si | Si | Realtime visible en UI y push | P1 | `CorreoRepository.java:19`, `CorreoController.java:782` |
| 3. Bandeja de entrada | Si | Si | Paginacion, filtros avanzados, contador global correcto | P0 | `CorreoController.java:54`, `page.tsx:600` |
| 4. Enviados | Si | Si | Paginacion y detalle completo multi-destinatario | P1 | `CorreoController.java:62`, `page.tsx:609` |
| 5. Historial persistente | Si | Parcial | Hilos/conversaciones y retencion/auditoria | P1 | `Correo.java`, `CorreoDestinatario.java` |
| 6. Asunto | Si | Si | Validacion DTO y normalizacion | P0 | `Correo.java`, `CorreoController.java:249` |
| 7. Cuerpo del correo | Si | Si | Editor rich text seguro y render HTML controlado | P1 | `CorreoController.java:250`, `MailDetail.tsx` |
| 8. Destinatario individual | Si | Si | Busqueda paginada de usuarios | P0 | `ComposeModal.tsx:94`, `CorreoController.java:260` |
| 9. Destinatario por coordinacion/departamento | Parcial | Parcial | Coordinacion real por carrera/departamento; hoy trae roles globales | P1 | `CorreoController.java:528`, `ComposeModal.tsx:119` |
| 10. Destinatario por grupo | No | No | Endpoint, selector y permisos academicos | P1 | No existe |
| 11. Destinatario por carrera | No | No | Endpoint, selector y permisos academicos | P1 | No existe |
| 12. Destinatario por semestre | No | No | Endpoint, selector y permisos academicos | P1 | No existe |
| 13. Adjuntar archivos | Si | Parcial | Flujo atomico; adjuntar antes de enviar o draft real | P0 | `ComposeModal.tsx:178`, `CorreoController.java:406` |
| 14. Descargar adjuntos | Si | Parcial | Frontend debe usar endpoint seguro por ID | P0 | `CorreoController.java:475`, `MailDetail.tsx:143` |
| 15. Preview de imagenes | Si | Parcial | No debe usar URL publica; lightbox/control de permisos | P1 | `MailDetail.tsx:197`, `ImagenController.java:126` |
| 16. Preview de PDF | Parcial | Parcial | Viewer seguro integrado; hoy solo abrir inline por URL publica | P1 | `ImagenController.java:139`, `MailDetail.tsx:221` |
| 17. Validacion de archivos | Si | Parcial | Magic bytes, MIME real, antivirus, bloqueo de contenido activo | P0 | `CorreoController.java:417`, `ComposeModal.tsx:149` |
| 18. Limite de tamaño | Si | Si | Limite total por correo y por usuario | P1 | `CorreoController.java:50`, `ComposeModal.tsx:14` |
| 19. Multiples adjuntos | Si | Parcial | UI sube uno por uno aunque backend tiene endpoint multiple | P2 | `CorreoController.java:435`, `ComposeModal.tsx:225` |
| 20. Favoritos | Si | Si | Accion masiva | P2 | `CorreoController.java:588`, `page.tsx:635` |
| 21. No leidos | Si | Si | Contadores por bandeja/categoria | P1 | `CorreoController.java:86`, `useUnreadCounts.ts` |
| 22. Marcar como leido | Si | Si | Confirmacion al abrir detalle real desde backend | P1 | `CorreoController.java:167`, `page.tsx:672` |
| 23. Marcar como no leido | No | No | Endpoint y UI | P1 | No existe |
| 24. Eliminar correo | Parcial | Parcial | Borrado definitivo por usuario y para enviados | P1 | `CorreoController.java:617` |
| 25. Papelera | Si | Parcial | Vaciar manual real de todos los elementos, restaurar enviados | P1 | `CorreoController.java:110`, `CorreoScheduler.java` |
| 26. Archivar correo | Si | Si | Acciones masivas | P2 | `CorreoController.java:606`, `page.tsx:654` |
| 27. Buscar correos | Si | Parcial | UI usa filtro local; backend search no integrado para grandes datos | P0 | `CorreoController.java:141`, `page.tsx:742` |
| 28. Filtros por categoria | Si | Si | UI de filtros combinados | P2 | `CorreoController.java:102`, `page.tsx:600` |
| 29. Filtros por fecha | No | No | Query backend y controles UI | P1 | No existe |
| 30. Filtros por remitente | Parcial | Parcial | Solo busqueda local/backend por texto, no filtro formal | P2 | `CorreoRepository.java:87`, `page.tsx:753` |
| 31. Filtros por carrera/grupo/semestre | No | No | Indices, query y UI | P1 | No existe |
| 32. Prioridad del correo | Parcial | Parcial | Campo real de prioridad; hoy se infiere de comunicado | P1 | `CorreoController.java:759` |
| 33. Categorias institucionales | Si | Si | Gobernanza por rol y plantillas | P2 | `CorreoController.java:874` |
| 34. Responder correo | Si | Parcial | Referencia/hilo real; no manda `referenciaId` desde UI | P1 | `page.tsx:680`, `CorreoController.java:272` |
| 35. Responder a todos | No | No | UI y backend con destinatarios originales | P1 | No existe |
| 36. Reenviar correo | No | No | UI, endpoint, adjuntos opcionales | P1 | No existe |
| 37. Hilos/conversaciones de correo | Parcial | No | `referenciaId` existe, pero no hay thread UI ni validacion | P1 | `Correo.java:45`, `CorreoController.java:272` |
| 38. Firma institucional | No | No | Firma por rol/carrera/departamento | P2 | No existe |
| 39. Informacion academica del remitente | Si | Si | Normalizar semestre vs grupo | P1 | `CorreoController.java:810`, `MailDetail.tsx:48` |
| 40. Identidad institucional del usuario | Si | Parcial | Verificacion institucional real, no solo dominio | P1 | `CorreoController.java:815` |
| 41. Roles: alumno, docente, coordinacion, admin | Si | Parcial | Mapeo no coincide literal con alumno/coordinacion | P1 | `Usuario.java`, `CorreoController.java:833` |
| 42. Permisos por rol | Parcial | Parcial | Solo comunicado bloquea estudiante; falta permisos granulares | P0 | `CorreoController.java:539`, `SecurityConfig.java` |
| 43. Buzones oficiales | No | No | Buzones compartidos/departamentales | P1 | No existe |
| 44. Correo a coordinacion | Parcial | Parcial | Agrega todas las autoridades/admin/direccion, no coordinacion especifica | P1 | `CorreoController.java:528` |
| 45. Notificaciones de nuevo correo | Parcial | Parcial | Backend emite STOMP, frontend no consume; push no conectado | P1 | `CorreoController.java:782`, `stomp.ts` |
| 46. Paginacion | No | No | Pageable backend y UI | P0 | `CorreoRepository.java:13` |
| 47. Infinite scroll/carga progresiva | No | No | Cursor/offset y preservacion de scroll | P1 | `page.tsx:594` |
| 48. Seguridad de adjuntos | Parcial | No | Quitar ruta publica, validar contenido, escaneo | P0 | `SecurityConfig.java:77`, `ImagenController.java:126` |
| 49. Rate limit/anti-spam | Parcial | Parcial | En memoria, no distribuido, sin politicas por rol/destinatarios masivos | P0 | `CorreoController.java:44` |
| 50. Responsive mobile-first | Si | Parcial | Revisar teclado, overflow, acciones faltantes | P2 | `page.tsx:765`, `ComposeModal.tsx` |
| 51. PWA | Si | Parcial | Manifest sin shortcut mail; SW sin correo offline | P2 | `public/manifest.json`, `public/sw.js` |
| 52. Offline parcial | No | No | Cache de inbox/drafts/outbox local | P2 | `public/sw.js` |
| 53. Auditoria/logs | Parcial | Parcial | Logs de descarga existen; falta auditoria estructurada de envio/lectura/borrado | P1 | `CorreoController.java:478` |
| 54. Exportar/descargar correo | No | No | Export EML/PDF/ZIP de correo y adjuntos | P3 | No existe |
| 55. Plantillas institucionales | No | No | Plantillas por tramite/aviso/docente/coordinacion | P2 | No existe |

## 4. Bugs detectados

1. P0 - Adjuntos publicos: `SecurityConfig.java:77` permite `/imagenes/adjuntos/**` sin autenticacion y `ImagenController.java:126` sirve cualquier adjunto por nombre. Esto permite acceso por URL directa.
2. P0 - La UI descarga/abre adjuntos por `archivoUrl` publico en vez de `/correos/adjuntos/{adjuntoId}/descargar`. Archivos: `MailDetail.tsx:143`, `MailDetail.tsx:221`.
3. P0 - Las bandejas no paginan. Repositorios devuelven `List<Correo>` sin `Pageable`; con muchos correos la carga se degrada. Archivo: `CorreoRepository.java:13-104`.
4. P1 - La UI marca como leido con estado optimista y no revierte si falla la API. Archivo: `page.tsx:672-677`.
5. P1 - El contador de no leidos mostrado en sidebar se calcula sobre `items` de la pestana actual, no necesariamente sobre toda la entrada. Archivo: `page.tsx:760`.
6. P1 - `buscar-avanzado` hace filtrado en memoria despues de cargar resultados de entrada; no escala y no filtra por fecha/remitente/carrera. Archivo: `CorreoController.java:151-164`.
7. P1 - `respuesta` en UI no envia `referenciaId`; por tanto no se crea hilo persistente aunque backend tenga campo. Archivos: `page.tsx:680-690`, `ComposeModal.tsx:214-221`.
8. P1 - El backend crea el correo antes de subir adjuntos; si un adjunto falla, el correo ya fue enviado sin adjuntos completos. Archivo: `ComposeModal.tsx:223-237`.
9. P2 - Hay `console.log`/`console.error` en descarga de adjuntos de correo. Archivo: `MailDetail.tsx:151-174`.
10. P2 - `semestre` se llena con `grupo`, duplicando semantica academica. Archivo: `CorreoController.java:824`.

## 5. Riesgos tecnicos

- Escalabilidad: todas las bandejas cargan listas completas sin `limit`, `offset`, cursor ni indices visibles por fecha/receptor/categoria.
- Contratos debiles: `CorreoController` acepta y devuelve `Map<String,Object>`; no hay DTOs de request/response para validar estructura.
- Consistencia: el envio y la subida de adjuntos son dos fases no atomicas. Un correo puede quedar enviado con adjuntos incompletos.
- Acoplamiento: `CorreoController` concentra bandejas, envio, borradores, programados, adjuntos, destinatarios, etiquetas, notificaciones y mapping.
- Datos academicos: grupo/semestre/carrera se toman directamente del usuario sin modelo academico normalizado.

## 6. Problemas de arquitectura

- Falta separar `CorreoService`, `CorreoAdjuntoService`, `CorreoSearchService`, `CorreoRecipientService` y DTO mappers.
- No hay endpoints academicos formales para destinatarios por carrera, grupo, semestre o coordinacion especifica.
- `referenciaId` es insuficiente para hilos profesionales: falta `threadId`, `inReplyTo`, orden cronologico, participantes y conteo de mensajes.
- No hay buzones oficiales/compartidos para coordinacion, direccion, control escolar o docentes.
- El rate limit en `ConcurrentHashMap` se pierde al reiniciar y no sirve en multiples instancias.

## 7. Problemas responsive/PWA

- La UI base es responsive y usa `100dvh`, drawer movil y lista/detalle adaptativa.
- Falta revisar overflow de chips de destinatarios y adjuntos largos en pantallas pequenas.
- El manifest no incluye shortcut a correo; solo Inicio, Mensajes y Marketplace.
- El service worker solo cachea manifest/iconos/static assets; no hay cache offline de inbox, drafts ni outbox.
- No hay cola de envio offline ni guardado local de borradores.

## 8. Problemas de seguridad

- P0: adjuntos publicos por `/imagenes/adjuntos/**`.
- Validacion de archivos por extension; falta validar MIME real/magic bytes.
- No hay antivirus/escaneo de malware.
- Se permiten `zip`, videos y documentos Office sin inspeccion de contenido.
- No hay limite total de adjuntos por correo en backend; el limite de 6 solo vive en frontend.
- No hay politicas anti-spam por rol, cantidad de destinatarios, adjuntos o comunicados masivos.
- Falta auditoria estructurada de envio, descarga, lectura, papelera y comunicados.

## 9. Problemas backend

- No hay DTOs de correo.
- No hay paginacion.
- No hay `marcarNoLeido`.
- No hay endpoints de responder a todos, reenviar, hilos, exportar, plantillas o busqueda profesional.
- Los comunicados masivos solo bloquean a estudiantes; roles administrativos/docentes tienen demasiado alcance sin permisos granulares.
- La descarga segura existe pero convive con ruta publica.
- La busqueda avanzada filtra en memoria y no cubre fecha/remitente/carrera/grupo/semestre.

## 10. Problemas frontend

- La busqueda principal es local sobre la lista cargada; no sirve para historiales grandes.
- No se consume `buscar` ni `buscar-avanzado` en la UI principal.
- No hay UI para marcar como no leido.
- No hay responder a todos ni reenviar.
- No hay vista de hilos.
- No hay suscripcion a nuevos correos por STOMP.
- El selector de destinatarios carga `/usuarios` completo y filtra localmente.
- El detalle usa `msg` de la lista; no siempre consulta `/correos/{id}` para detalle enriquecido y marcado real.

## 11. Problemas de adjuntos

- La seguridad actual de adjuntos no cumple expectativa institucional porque el path publico expone archivos.
- Preview de imagenes y PDF depende de URL publica.
- El endpoint seguro de descarga por ID existe, pero no es usado por la UI.
- No hay endpoint seguro de preview inline por ID.
- No hay control de limite total por correo en backend.
- No hay borrado fisico de archivos al eliminar borradores o limpiar papelera; se borra metadata, pero no se observa limpieza del archivo en disco.
- No hay escaneo antivirus ni validacion de contenido real.

## 12. Problemas de permisos/roles

- Roles existen, pero los nombres no coinciden exactamente con el modelo solicitado: `ESTUDIANTE`, `DOCENTE`, `AUTORIDAD`, `ADMINISTRATIVO`, `PERSONAL`, `ADMIN`, `DIRECCION`.
- Solo `comunicado` restringe a estudiantes. Falta matriz de permisos por rol para:
  - enviar a grupos/carreras/semestres;
  - enviar comunicados oficiales;
  - usar buzones oficiales;
  - enviar con prioridad alta;
  - ver auditoria;
  - enviar adjuntos grandes.
- Coordinacion no esta modelada como departamento academico; se resuelve por roles globales `AUTORIDAD`, `ADMIN`, `DIRECCION`.

## 13. Features faltantes

- Marcar como no leido.
- Responder a todos.
- Reenviar.
- Hilos/conversaciones reales.
- Destinatarios por grupo, carrera y semestre.
- Buzones oficiales.
- Firma institucional.
- Plantillas institucionales.
- Busqueda avanzada completa con fecha, remitente y datos academicos.
- Paginacion/infinite scroll.
- Offline parcial y outbox local.
- Exportar correo.
- Auditoria estructurada.
- Seguridad profesional de adjuntos.

## 14. Recomendaciones por prioridad

### P0

1. Cerrar `/imagenes/adjuntos/**` o protegerlo con permiso por correo; migrar frontend a `/correos/adjuntos/{id}/descargar`.
2. Agregar paginacion backend (`Pageable` o cursor) para entrada, enviados, categorias, favoritos, no leidos, archivados y papelera.
3. Crear DTOs de correo: `EnviarCorreoRequest`, `CorreoResumenDTO`, `CorreoDetalleDTO`, `AdjuntoDTO`, `DestinatarioDTO`.
4. Endurecer adjuntos: validacion MIME real, limite total por correo, maximo de archivos en backend y bloqueo de tipos riesgosos.
5. Mover rate limit a `RateLimitService`/Redis y agregar limites por destinatarios masivos.

### P1

1. Implementar `marcarNoLeido`.
2. Implementar responder, responder a todos y reenviar con `threadId`.
3. Agregar destinatarios por carrera, grupo, semestre y coordinacion real.
4. Consumir notificaciones STOMP `mail:new` en frontend y actualizar contador/bandeja.
5. Agregar busqueda avanzada real con filtros por fecha, remitente, categoria y datos academicos.
6. Crear permisos por rol para comunicados, prioridad, buzones oficiales y envios masivos.
7. Agregar endpoint seguro de preview inline para imagen/PDF.

### P2

1. Offline parcial: cache de ultimos correos, borradores locales y outbox.
2. Acciones masivas: archivar, eliminar, marcar leido/no leido.
3. Shortcut PWA a correo.
4. Plantillas institucionales.
5. Firma institucional por perfil/rol.

### P3

1. Exportar correo en PDF/EML.
2. Etiquetas con colores visibles en lista y detalle.
3. Confirmaciones de lectura configurables por correo.

## 15. Comparacion contra Gmail, Outlook, Canvas LMS y correo universitario

- Gmail/Outlook: FalconNet tiene bandejas basicas, categorias y adjuntos, pero le faltan busqueda avanzada, paginacion, hilos, filtros potentes, acciones masivas, seguridad de adjuntos y confiabilidad offline.
- Canvas LMS Inbox: FalconNet todavia no tiene envio por curso/grupo/rol academico ni contexto academico formal de conversaciones.
- Correo institucional universitario: FalconNet muestra identidad academica, pero necesita buzones oficiales, permisos por area, auditoria, plantillas y seguridad fuerte de adjuntos para operar como canal formal.

## 16. Los 5 problemas mas urgentes

1. Adjuntos publicos por `/imagenes/adjuntos/**`.
2. Falta paginacion en todas las bandejas.
3. Falta DTO/contrato backend formal para correo.
4. Falta flujo atomico/confiable para enviar correo con adjuntos.
5. Falta permisos granulares por rol para comunicados, destinatarios masivos y buzones oficiales.

## 17. Las 10 features mas importantes que faltan

1. Marcar como no leido.
2. Responder a todos.
3. Reenviar.
4. Hilos/conversaciones reales.
5. Destinatarios por grupo.
6. Destinatarios por carrera.
7. Destinatarios por semestre.
8. Busqueda avanzada con fecha/remitente/datos academicos.
9. Buzones oficiales por coordinacion/departamento.
10. Notificaciones realtime/push de nuevo correo en frontend.

## 18. Siguiente prompt recomendado

```text
Implementa la fase P0 del modulo de correo/inbox institucional de FalconNet sin mezclarlo con chat.

Objetivos:
1. Proteger adjuntos de correo: eliminar el acceso publico a /imagenes/adjuntos/** o bloquearlo con JWT/permisos.
2. Cambiar el frontend para descargar/abrir adjuntos usando /correos/adjuntos/{adjuntoId}/descargar.
3. Agregar paginacion backend y frontend para entrada, enviados, favoritos, no leidos, archivados, papelera y categorias.
4. Crear DTOs formales para enviar correo, resumen de correo, detalle de correo, destinatarios y adjuntos.
5. Validar en backend maximo de adjuntos, tamano total por correo y tipos de archivo.

No implementes features P1 todavia. Mantén el correo separado de chat. Agrega pruebas backend/frontend donde aplique y documenta los endpoints modificados.
```
