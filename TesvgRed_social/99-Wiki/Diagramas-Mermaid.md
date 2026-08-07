# Diagramas Mermaid — Referencia Rápida

## 1. Arquitectura General

```mermaid
graph LR
    BROWSER["Navegador / PWA"]
    NEXTJS["Next.js 16\n:3000"]
    SPRING["Spring Boot\n:8080"]
    MARIA["MariaDB\n:3306"]
    REDIS["Redis\n:6379"]
    DISK["/uploads/"]
    PUSH["Web Push\n(VAPID)"]
    SW["Service Worker"]

    BROWSER --> NEXTJS
    NEXTJS -->|"REST + JWT"| SPRING
    NEXTJS -->|"STOMP/WS (futuro)"| SPRING
    SPRING --> MARIA
    SPRING --> REDIS
    SPRING --> DISK
    SPRING --> PUSH
    PUSH --> SW
    SW --> BROWSER
```

## 2. Flujo JWT Simplificado

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend

    FE->>BE: POST /usuarios/login { correo, password }
    BE-->>FE: { token, usuario }
    FE->>FE: localStorage.setItem('token', token)

    Note over FE,BE: Requests subsecuentes

    FE->>BE: GET /publicaciones\nAuthorization: Bearer token
    BE->>BE: JwtFilter valida token
    BE-->>FE: Response data
```

## 3. Flujo de Correo (Envío y Notificación)

```mermaid
sequenceDiagram
    participant E as Emisor
    participant FE as Frontend
    participant BE as Backend
    participant PUSH as Push Service
    participant R as Receptor

    E->>FE: Escribe correo + adjuntos
    FE->>BE: POST /correos/enviar
    FE->>BE: POST /correos/{id}/adjunto (x N)
    BE->>BE: Guarda en DB
    BE->>PUSH: sendMailNotification(receptorId)
    PUSH->>R: Push notification del OS
    R->>FE: Click → /correos?tab=entrada
    FE->>BE: GET /correos/{id}
    BE-->>FE: CorreoDetalleDTO
```

## 4. Flujo de Chat (Estado Actual — Polling)

```mermaid
sequenceDiagram
    participant A as Usuario A
    participant FE as Frontend A
    participant BE as Backend
    participant FE2 as Frontend B

    A->>FE: Escribe y envía mensaje
    FE->>BE: POST /mensajes/{userId}
    BE-->>FE: MessageDTO

    Note over FE2,BE: 5 segundos después...
    FE2->>BE: GET /mensajes/{userId}
    BE-->>FE2: Lista actualizada con nuevo mensaje
```

## 5. Flujo de Chat (Futuro — WebSocket STOMP)

```mermaid
sequenceDiagram
    participant A as Usuario A
    participant FE as Frontend A
    participant BE as Backend STOMP
    participant FE2 as Frontend B

    Note over FE,BE: Conexión inicial
    FE->>BE: CONNECT /ws (Bearer token)
    FE2->>BE: CONNECT /ws (Bearer token)
    FE->>BE: SUBSCRIBE /topic/user.{idB}
    FE2->>BE: SUBSCRIBE /topic/user.{idA}

    Note over A,FE2: Mensaje en tiempo real
    A->>FE: Escribe mensaje
    FE->>BE: SEND /app/chat.dm { message }
    BE->>BE: Guarda en DB
    BE-->>FE2: PUSH /topic/user.{idB} MessageDTO
    FE2->>FE2: Mensaje aparece instantáneo
```

## 6. Estructura del Backend (Paquetes)

```mermaid
graph TD
    BE["backend/"] --> CONFIG["config/\nRedis Security WebSocket"]
    BE --> CTRL["controller/ (24)"]
    BE --> DTO["dto/ (30+)"]
    BE --> MODEL["model/ (50+)"]
    BE --> REPO["repository/"]
    BE --> SEC["security/\nJwtFilter JwtUtil"]
    BE --> SVC["service/ (11)"]
    BE --> WS["websocket/ (4)"]
```

## 7. Estructura del Frontend (Módulos)

```mermaid
graph TD
    SRC["src/"] --> APP["app/"]
    SRC --> COMP["components/"]
    SRC --> HOOKS["hooks/ (14)"]
    SRC --> SVC["services/ (18)"]
    SRC --> TYPES["types/"]

    APP --> AUTH["(auth)\nlogin registro"]
    APP --> MAIN["(main)\nrutas protegidas"]

    MAIN --> FEED["/\nFeed"]
    MAIN --> CORREOS["/correos"]
    MAIN --> MSGS["/messages\n/messages/[userId]\n/messages/groups/[id]"]
    MAIN --> GROUPS["/groups\n/groups/[id]"]
    MAIN --> OTHER["marketplace\nprofile search\nsettings avisos\neventos recursos..."]
```

## 8. Threading de Correo

```mermaid
graph TD
    ROOT["Correo A (raíz)\nthreadId=null\nparentId=null"]

    ROOT --> REPLY1["Reply B\nthreadId=A.id\nparentId=A.id\ntipoAccion=RESPUESTA"]
    ROOT --> REPLY2["Reply-All C\nthreadId=A.id\nparentId=A.id\ntipoAccion=RESPUESTA_TODOS"]

    FORWARD["Forward D\nNuevo hilo\nthreadId=null\ntipoAccion=REENVIO\nreenviadoDe=A.id"]

    ROOT -.->|"reenvío"| FORWARD
```
