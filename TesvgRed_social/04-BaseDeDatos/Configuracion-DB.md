# Configuración de Base de Datos

## Conexión

```properties
spring.datasource.url=${DB_URL:jdbc:mariadb://localhost:3306/tesvg_red_social}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:1234}
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver
```

## JPA / Hibernate

```properties
spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:update}
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.open-in-view=false
```

- `ddl-auto=update` — Hibernate crea/modifica tablas automáticamente
- `open-in-view=false` — evita lazy loading en el request thread (buena práctica)
- `show-sql=true` — útil para debug (deshabilitar en producción)

## Redis (Cache Opcional)

```properties
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
spring.data.redis.password=${REDIS_PASSWORD:}
spring.data.redis.timeout=${REDIS_TIMEOUT:1500ms}
spring.cache.type=redis
spring.cache.redis.time-to-live=${REDIS_CACHE_TTL:60s}
app.redis.enabled=${REDIS_ENABLED:true}
```

Redis es **opcional**. Si no está disponible:
- `RedisCacheService` actúa como fallback sin errores
- `RateLimitService` puede funcionar en memoria

## Variables de Entorno de Producción

| Variable | Descripción | Default dev |
|---|---|---|
| `DB_URL` | URL JDBC de la base de datos | `jdbc:mariadb://localhost:3306/tesvg_red_social` |
| `DB_USERNAME` | Usuario de DB | `root` |
| `DB_PASSWORD` | Contraseña de DB | `1234` |
| `JWT_SECRET` | Secret para firmar JWTs | valor inseguro de dev |
| `UPLOAD_DIR` | Directorio de uploads | `/home/robe/uploads` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos | localhost:3000, redes locales |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `REDIS_ENABLED` | Habilitar Redis | `true` |
| `VAPID_PUBLIC_KEY` | Llave pública VAPID | key de dev |
| `VAPID_PRIVATE_KEY` | Llave privada VAPID | key de dev |
| `VAPID_SUBJECT` | Subject VAPID | `mailto:nido@tesvg.edu.mx` |

## Uploads de Archivos

```properties
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=30MB
spring.servlet.multipart.max-request-size=60MB
app.upload.dir=${UPLOAD_DIR:/home/robe/uploads}
```

### Estructura de Directorios de Upload

```
/home/robe/uploads/
├── imagenes/          ← avatares, posts
├── adjuntos/          ← adjuntos de correo (formato: {uuid}.{ext})
├── stories/           ← imágenes/videos de stories
└── grupos/            ← archivos de grupos de chat
```

## Restricciones de Correo

```properties
app.mail.attachment.max-size-bytes  ← configurable (default: 26214400 = 25MB)
```

- Máx 6 adjuntos por correo
- Máx 25 MB por archivo
- Máx 100 MB total por correo
- Extensiones peligrosas bloqueadas: `exe, bat, cmd, vbs, js, jar, sh, ps1, dll`
- Whitelist: `pdf, doc, docx, xls, xlsx, ppt, pptx, txt, png, jpg, jpeg, gif, webp, zip, mp4, mov, webm`
