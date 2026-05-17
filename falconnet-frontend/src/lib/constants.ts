/** UI layout constants — keep in sync with CSS variables in globals.css */
export const NAV_HEIGHT_PX        = 56;
export const MOBILE_NAV_HEIGHT_PX = 64;

/** Breakpoints — keep in sync with useBreakpoint */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Feed */
export const MAX_POST_LENGTH      = 2_000;
export const MAX_COMMENT_LENGTH   = 500;
export const STORY_DURATION_MS    = 5_000;
export const STORY_EXPIRES_HOURS  = 24;

/** Marketplace */
export const MARKETPLACE_CATEGORIES = [
  'Libros',
  'Electrónicos',
  'Ropa y accesorios',
  'Servicios',
  'Material escolar',
  'Otros',
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

/** Reactions */
export const REACTIONS = [
  { type: 'LIKE',  emoji: '👍', label: 'Me gusta' },
  { type: 'LOVE',  emoji: '❤️', label: 'Me encanta' },
  { type: 'HAHA',  emoji: '😂', label: 'Jajaja' },
  { type: 'WOW',   emoji: '😮', label: 'Asombra' },
  { type: 'SAD',   emoji: '😢', label: 'Entristece' },
  { type: 'ANGRY', emoji: '😡', label: 'Enoja' },
] as const;

/** Routes */
export const ROUTES = {
  HOME:          '/',
  LOGIN:         '/login',
  REGISTER:      '/register',
  PROFILE:       '/profile',
  MESSAGES:      '/messages',
  MARKETPLACE:   '/marketplace',
  NOTIFICATIONS: '/notifications',
  SETTINGS:      '/settings',
  CREATE:        '/create',
  GROUPS:        '/groups',
  SEARCH:        '/search',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];

/** Timing */
export const TOAST_DURATION_MS    = 4_000;
export const DEBOUNCE_SEARCH_MS   = 300;
export const DEBOUNCE_RESIZE_MS   = 150;
export const ANIMATION_FAST_MS    = 150;
export const ANIMATION_NORMAL_MS  = 200;
export const ANIMATION_SLOW_MS    = 300;
