type EventHandler = (data: unknown) => void;

/**
 * Lightweight WebSocket client with auto-reconnect and typed events.
 * Phase 3: call socket.connect(token) from useSocket hook when auth is ready.
 */
class SocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private shouldReconnect = false;
  private reconnectDelay = 2_000;
  private reconnectAttempts = 0;
  private listeners = new Map<string, Set<EventHandler>>();

  constructor(url: string) {
    this.url = url;
  }

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this._open(token);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
  }

  /** Subscribe to an event. Returns an unsubscribe function. */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  /** Send an event to the server (no-op if not connected). */
  emit(event: string, data: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ event, data }));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private _open(token: string): void {
    this.ws = new WebSocket(`${this.url}?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._dispatch('$connected', null);
    };

    this.ws.onclose = () => {
      this._dispatch('$disconnected', null);
      if (this.shouldReconnect) this._scheduleReconnect(token);
    };

    this.ws.onerror = () => {
      this._dispatch('$error', null);
    };

    this.ws.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data as string) as { event: string; data: unknown };
        this._dispatch(parsed.event, parsed.data);
      } catch {
        // malformed message — ignore
      }
    };
  }

  private _dispatch(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  private _scheduleReconnect(token: string): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30_000);
    setTimeout(() => {
      if (this.shouldReconnect) this._open(token);
    }, delay);
  }
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws';
export const socket = new SocketClient(WS_BASE);
