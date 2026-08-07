# Sistema de Diseño

## Filosofía Visual

FalconNet usa un sistema de diseño oscuro premium inspirado en:
- **Facebook moderno** — layout, feed, perfiles
- **Discord** — grupos, chat, sidebar
- **Threads** — feed limpio, tipografía
- **X/Twitter moderno** — densidad de información

**No imitar** — interpretar y crear identidad propia.

## Colores — CSS Variables

```css
/* Dark mode (default) */
--color-bg-primary:    #0a0a0b   /* fondo base */
--color-bg-secondary:  #111113   /* cards, sidebars */
--color-bg-tertiary:   #1a1a1f   /* inputs, hover */
--color-border:        #2a2a30   /* borders suaves */
--color-text-primary:  #f0f0f5   /* texto principal */
--color-text-secondary: #8a8a9a  /* texto secundario */
--color-accent:        #4f46e5   /* indigo — color primario */
--color-accent-hover:  #4338ca   /* hover del accent */
--color-success:       #22c55e
--color-warning:       #f59e0b
--color-danger:        #ef4444
```

## Tipografía

- Font base: sistema (Inter en desktop, system-ui)
- Tamaños: escala de 12px → 32px
- Pesos: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## Componentes de UI

### Reglas Visuales
- **Bordes**: `rounded-xl` (12px) para cards, `rounded-lg` para inputs
- **Sombras**: suaves, tipo glassmorphism
- **Blur**: `backdrop-blur` para overlays y modales
- **Spacing**: sistema 4px base (4, 8, 12, 16, 20, 24, 32, 48, 64)
- **Transiciones**: 150-200ms ease para hover, 300ms para animaciones

### Animaciones (Framer Motion)
- Entradas: `fadeIn` + `slideUp` (200-300ms)
- Modales: scale 0.95 → 1.0 con fade
- Listas: `staggerChildren` para items
- Skeletons: pulse suave

## Dark Mode

- Implementado via CSS variables en `:root`
- Toggle via `useTheme` hook
- Preferencia guardada en `localStorage`
- Compatible con `prefers-color-scheme`

## Mobile-First

```
Breakpoints:
  sm:  640px   (iPhone landscape)
  md:  768px   (tablets)
  lg:  1024px  (desktop)
  xl:  1280px  (desktop wide)
  2xl: 1536px  (ultra-wide)
```

### Dispositivos Target
- iPhone SE (375px)
- iPhone 14/15 (390px)
- Android pequeños (360px)
- Tablets (768px+)
- Desktop (1024px+)
- Ultra-wide (1536px+)

## Componentes Específicos

### Feed
- Cards con bordes suaves, sombra ligera
- Media (imagen/video) con aspect-ratio controlado
- Reactions bar horizontal con animaciones
- Comentarios colapsables

### Chat
- Burbujas de mensaje: emisor (accent), receptor (bg-secondary)
- Timestamps discretos
- Indicadores de escritura (typing indicator)
- Audio con waveform y controles de reproducción

### Correo
- 3-pane layout en desktop (sidebar + lista + detalle)
- Mobile: fullscreen list → slide-in detail
- FAB para redactar
- Threading visual con indentación

### Navbar/MobileNav
- Badges numéricos con animación de entrada
- Active state claro
- Bottom bar con `safe-area-inset-bottom` para iPhone X+
