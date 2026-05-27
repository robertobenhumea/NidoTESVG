import { getStoredAuthToken, getWsBaseUrl } from '@/lib/utils';

type MessageHandler = (body: unknown) => void;
type StateHandler = (connected: boolean) => void;
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

function wsUrl(): string {
  const raw = getWsBaseUrl();
  return raw.endsWith('/websocket') ? raw : `${raw.replace(/\/$/, '')}/websocket`;
}

function frame(command: string, headers: Record<string, string> = {}, body = ''): string {
  const headerLines = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n');
  return `${command}\n${headerLines}\n\n${body}\0`;
}

function parseFrames(data: string): Array<{ command: string; headers: Record<string, string>; body: string }> {
  return data.split('\0').filter(Boolean).map(raw => {
    const [head, ...bodyParts] = raw.split('\n\n');
    const lines = head.split('\n').filter(Boolean);
    const command = lines.shift() ?? '';
    const headers: Record<string, string> = {};
    lines.forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) headers[line.slice(0, idx)] = line.slice(idx + 1);
    });
    return { command, headers, body: bodyParts.join('\n\n') };
  });
}

class StompClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private nextSubId = 1;
  private subscriptions = new Map<string, { id: string; handlers: Set<MessageHandler> }>();
  private stateHandlers = new Set<StateHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSends: Array<{ destination: string; body: unknown }> = [];

  private get connected() {
    return this.state === 'connected';
  }

  private get open() {
    return this.ws != null && this.ws.readyState === WebSocket.OPEN;
  }

  subscribe(destination: string, handler: MessageHandler): () => void {
    const current = this.subscriptions.get(destination) ?? { id: `sub-${this.nextSubId++}`, handlers: new Set<MessageHandler>() };
    current.handlers.add(handler);
    this.subscriptions.set(destination, current);
    this.ensure();
    if (this.connected) this.safeSendFrame(frame('SUBSCRIBE', { id: current.id, destination }));
    return () => {
      const sub = this.subscriptions.get(destination);
      if (!sub) return;
      sub.handlers.delete(handler);
      if (sub.handlers.size === 0) {
        if (this.connected) this.safeSendFrame(frame('UNSUBSCRIBE', { id: sub.id }));
        this.subscriptions.delete(destination);
      }
    };
  }

  send(destination: string, body: unknown = {}): void {
    this.ensure();
    if (!this.connected || !this.open) {
      this.pendingSends.push({ destination, body });
      if (this.pendingSends.length > 50) this.pendingSends.shift();
      return;
    }
    this.safeSendFrame(frame('SEND', { destination, 'content-type': 'application/json' }, JSON.stringify(body)));
  }

  onState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.connected);
    return () => this.stateHandlers.delete(handler);
  }

  private ensure() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const token = getStoredAuthToken();
    if (!token) return;
    this.setState('connecting');
    this.ws = new WebSocket(wsUrl());
    this.ws.onopen = () => {
      this.safeSendFrame(frame('CONNECT', {
        'accept-version': '1.2',
        'heart-beat': '10000,10000',
        Authorization: `Bearer ${token}`,
      }));
    };
    this.ws.onmessage = event => this.handleMessage(String(event.data));
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.ws.close();
      }
    };
  }

  private handleMessage(data: string) {
    for (const parsed of parseFrames(data)) {
      if (parsed.command === 'CONNECTED') {
        this.setState('connected');
        this.subscriptions.forEach((sub, destination) => {
          this.safeSendFrame(frame('SUBSCRIBE', { id: sub.id, destination }));
        });
        this.flushPendingSends();
      }
      if (parsed.command === 'MESSAGE') {
        const destination = parsed.headers.destination;
        const sub = this.subscriptions.get(destination);
        if (!sub) continue;
        let body: unknown = parsed.body;
        try { body = JSON.parse(parsed.body); } catch { /* text body */ }
        sub.handlers.forEach(handler => handler(body));
      }
    }
  }

  private scheduleReconnect() {
    this.setState('disconnected');
    this.ws = null;
    if (this.reconnectTimer || this.subscriptions.size === 0) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensure();
    }, 2000);
  }

  private safeSendFrame(payload: string): boolean {
    if (!this.open) return false;
    try {
      this.ws!.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  private flushPendingSends() {
    if (!this.connected || this.pendingSends.length === 0) return;
    const pending = this.pendingSends.splice(0);
    pending.forEach(item => {
      this.safeSendFrame(frame('SEND', { destination: item.destination, 'content-type': 'application/json' }, JSON.stringify(item.body)));
    });
  }

  private setState(next: ConnectionState) {
    if (this.state === next) return;
    this.state = next;
    this.publishState();
  }

  private publishState() {
    this.stateHandlers.forEach(handler => handler(this.connected));
  }
}

export const stompClient = new StompClient();
