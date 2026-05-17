/** Centralized application configuration — single source of truth. */
export const config = {
  app: {
    name:        'FalconNet',
    shortName:   'FalconNet',
    version:     '0.3.0',
    description: 'La red social universitaria del TESVG',
    university:  'TESVG',
    url:         process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },

  api: {
    baseUrl:    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
    timeoutMs:  15_000,
    retries:    0,
  },

  ws: {
    url:           process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws',
    reconnectMs:   2_000,
    maxReconnects: 10,
  },

  /**
   * Feature flags — flip to `true` when a feature is ready to activate.
   * These are evaluated at runtime, not build time.
   */
  features: {
    realtime:          false,  // Phase 4: enable WebSocket connection
    pushNotifications: false,  // Phase 4: enable web push
    chat:              true,   // Phase 3: polling-based realtime
    stories:           true,
    marketplace:       true,
    groups:            true,   // Phase 3: communities
    search:            true,   // Phase 3: search page
    pwa:               true,
  },

  pagination: {
    defaultSize: 20,
    maxSize:     50,
  },

  upload: {
    maxSizeMb:    10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
  },

  sw: {
    path:    '/sw.js',
    scope:   '/',
    version: 'v3',
  },
} as const;

export type FeatureFlag = keyof typeof config.features;

export function isEnabled(flag: FeatureFlag): boolean {
  return config.features[flag];
}
