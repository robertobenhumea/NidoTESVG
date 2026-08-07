# Convenciones de Desarrollo

## Frontend

### Estructura de Archivos

```
src/app/(main)/[modulo]/
├── page.tsx           ← page principal del módulo
├── layout.tsx         ← layout (si aplica)
├── loading.tsx        ← skeleton loader
├── error.tsx          ← error boundary
└── _components/       ← componentes específicos del módulo
    ├── types.ts       ← tipos TypeScript del módulo
    ├── ComponenteA.tsx
    └── ComponenteB.tsx
```

### Naming

- **Componentes**: PascalCase — `MailDetail.tsx`
- **Hooks**: camelCase con prefix `use` — `useUnreadCounts.ts`
- **Services**: camelCase con suffix `.service` — `chat.service.ts`
- **Types**: camelCase con suffix `.types` — `realtime.types.ts`
- **Pages**: `page.tsx` (Next.js App Router)

### TypeScript

```typescript
// CORRECTO
interface MailDetailProps {
  correo: CorreoDetalleDTO;
  onClose: () => void;
}

// INCORRECTO
const props: any = ...
function handler(e: any) ...
```

### CSS/TailwindCSS

```tsx
// Condicionales con clsx + tailwind-merge
import { cn } from '@/lib/utils'; // clsx + twMerge

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

### Componentes

```typescript
// Server Component (default)
export default function FeedPage() { ... }

// Client Component (solo cuando se necesita)
'use client';
export default function InteractiveComponent() { ... }
```

## Backend

### Naming (Java/Spring)

- **Controllers**: `*Controller.java`
- **Services**: `*Service.java`
- **Repositories**: `*Repository.java`
- **Entities**: `NombreEntidad.java`
- **DTOs Request**: `Verb*Request.java` (ej: `EnviarCorreoRequest`)
- **DTOs Response**: `*DTO.java` o `*Response.java`

### Endpoints

```java
// Rutas en kebab-case
@GetMapping("/correos/no-leidos/lista")

// Parámetros en camelCase
@RequestParam(defaultValue = "0") int page

// Path variables
@PathVariable Long id
```

### Respuestas

```java
// Siempre devolver ResponseEntity
@PostMapping("/enviar")
public ResponseEntity<Map<String, Object>> enviar(...) {
    return ResponseEntity.ok(Map.of("id", correoId, "mensaje", "ok"));
}
```

## Git

### Commits

```
feat: descripción corta de la feature
fix: descripción del bug corregido
refactor: descripción del refactor
docs: descripción de documentación
```

### Ramas (futuro)

```
main         ← producción
develop      ← desarrollo activo
feature/*    ← features nuevas
fix/*        ← bug fixes
```

## Reglas Críticas

1. **No mezclar correo y chat** — diferentes entidades, componentes, endpoints
2. **Mobile-first siempre** — diseñar para móvil primero
3. **No `any` en TypeScript** — usar tipos correctos
4. **No tocar Docker/VPS/Nginx/Cloudflare** hasta la fase final
5. **No destructive DB operations** sin confirmación explícita

Ver: [[Glosario]] | [[01-Arquitectura/Stack-Tecnologico]]
