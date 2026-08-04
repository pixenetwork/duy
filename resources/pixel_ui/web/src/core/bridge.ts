namespace PixelUI {
  export interface PixelCallbackMap {
    'ui.ready': {
      request: Record<string, never>;
      response: { version: string; state: UiStateSnapshot };
    };
    'ui.close': {
      request: { owner: string };
      response: { accepted: boolean; state: UiStateSnapshot };
    };
    'ui.acquire': {
      request: { owner: string; focus: boolean; cursor: boolean; panel?: string };
      response: { accepted: boolean; state: UiStateSnapshot };
    };
    'ui.release': {
      request: { owner: string };
      response: { accepted: boolean; state: UiStateSnapshot };
    };
    'ui.closeAll': {
      request: { reason?: string };
      response: { accepted: boolean; state: UiStateSnapshot };
    };
    'ui.modalDepth': {
      request: { depth: number };
      response: { accepted: boolean; state: UiStateSnapshot };
    };
    'diagnostics.example': {
      request: { message: string };
      response: { accepted: boolean; echoed: string };
    };
  }

  export type CallbackName = keyof PixelCallbackMap;
  export type CallbackRequest<Name extends CallbackName> = PixelCallbackMap[Name]['request'];
  export type CallbackResponse<Name extends CallbackName> = PixelCallbackMap[Name]['response'];

  export interface PixelEventMap {
    'pixel.ui.state': UiStateSnapshot;
    'pixel.ui.closeAll': { reason: string };
    'pixel.diagnostics': DiagnosticEvent;
  }

  export type EventName = keyof PixelEventMap;
  export type EventListener<Name extends EventName> = (payload: PixelEventMap[Name]) => void;

  export interface SubscriptionOptions {
    once?: boolean;
  }

  export interface RequestOptions {
    timeoutMs?: number;
    signal?: AbortSignal;
  }

  export type BridgeDiagnosticSink = (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, unknown>,
  ) => void;

  export class BridgeFailure extends Error {
    readonly code: BridgeErrorCode;
    readonly details?: unknown;

    constructor(error: BridgeErrorPayload) {
      super(error.message);
      this.name = 'BridgeFailure';
      this.code = error.code;
      this.details = error.details;
    }
  }

  const eventGuards: { [Name in EventName]: Guard<PixelEventMap[Name]> } = {
    'pixel.ui.state': isUiStateSnapshot,
    'pixel.ui.closeAll': (value): value is { reason: string } =>
      isUnknownRecord(value) && isNonEmptyString(value.reason),
    'pixel.diagnostics': isDiagnosticEvent,
  };

  const callbackGuards: {
    [Name in CallbackName]: {
      request: Guard<CallbackRequest<Name>>;
      response: Guard<CallbackResponse<Name>>;
    }
  } = {
    'ui.ready': {
      request: (value): value is Record<string, never> =>
        isUnknownRecord(value) && Object.keys(value).length === 0,
      response: isReadyResponse,
    },
    'ui.close': {
      request: (value): value is { owner: string } =>
        isUnknownRecord(value) && isNonEmptyString(value.owner),
      response: isOkResponse,
    },
    'ui.acquire': {
      request: (value): value is { owner: string; focus: boolean; cursor: boolean; panel?: string } =>
        isUnknownRecord(value)
        && isNonEmptyString(value.owner)
        && isBoolean(value.focus)
        && isBoolean(value.cursor)
        && (value.panel === undefined || isString(value.panel)),
      response: isOkResponse,
    },
    'ui.release': {
      request: (value): value is { owner: string } =>
        isUnknownRecord(value) && isNonEmptyString(value.owner),
      response: isOkResponse,
    },
    'ui.closeAll': {
      request: (value): value is { reason?: string } =>
        isUnknownRecord(value) && (value.reason === undefined || isString(value.reason)),
      response: isOkResponse,
    },
    'ui.modalDepth': {
      request: (value): value is { depth: number } =>
        isUnknownRecord(value) && isFiniteNumber(value.depth) && value.depth >= 0,
      response: isOkResponse,
    },
    'diagnostics.example': {
      request: (value): value is { message: string } =>
        isUnknownRecord(value) && isNonEmptyString(value.message) && value.message.length <= 160,
      response: (value): value is { accepted: boolean; echoed: string } =>
        isUnknownRecord(value) && isBoolean(value.accepted) && isString(value.echoed),
    },
  };

  interface StoredSubscription {
    once: boolean;
    listener: (payload: never) => void;
  }

  export class NuiEventBus {
    private readonly subscriptions = new Map<EventName, Set<StoredSubscription>>();
    private readonly diagnostic: BridgeDiagnosticSink;

    constructor(diagnostic: BridgeDiagnosticSink = () => undefined) {
      this.diagnostic = diagnostic;
    }

    subscribe<Name extends EventName>(
      event: Name,
      listener: EventListener<Name>,
      options: SubscriptionOptions = {},
    ): () => void {
      const subscription: StoredSubscription = {
        once: options.once === true,
        listener: listener as (payload: never) => void,
      };
      const listeners = this.subscriptions.get(event) ?? new Set<StoredSubscription>();
      listeners.add(subscription);
      this.subscriptions.set(event, listeners);
      return () => listeners.delete(subscription);
    }

    receive(value: unknown): boolean {
      if (!isNuiEventEnvelope(value)) {
        this.diagnostic('warn', 'Rejected invalid NUI event envelope');
        return false;
      }
      const event = value.event as EventName;
      const guard = eventGuards[event];
      if (!guard) {
        this.diagnostic('debug', 'Ignored unknown NUI event', { event: value.event });
        return false;
      }
      if (!guard(value.payload)) {
        this.diagnostic('warn', 'Rejected invalid NUI event payload', { event });
        return false;
      }
      const listeners = this.subscriptions.get(event);
      if (!listeners) return true;
      for (const subscription of [...listeners]) {
        subscription.listener(value.payload as never);
        if (subscription.once) listeners.delete(subscription);
      }
      return true;
    }

    clear(): void {
      this.subscriptions.clear();
    }
  }

  export type NuiTransport = (
    envelope: NuiRequestEnvelope,
    signal: AbortSignal | undefined,
  ) => Promise<unknown>;

  type MockHandler<Name extends CallbackName> = (
    payload: CallbackRequest<Name>,
  ) => CallbackResponse<Name> | Promise<CallbackResponse<Name>>;

  interface PendingRequest {
    callback: CallbackName;
    responseGuard: Guard<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: BridgeFailure) => void;
    timer: number;
    removeAbortListener: () => void;
  }

  export class NuiClient {
    private readonly pending = new Map<string, PendingRequest>();
    private readonly completed = new Set<string>();
    private readonly completedOrder: string[] = [];
    private readonly mocks = new Map<CallbackName, (payload: never) => unknown | Promise<unknown>>();
    private readonly diagnostic: BridgeDiagnosticSink;
    private readonly transport: NuiTransport;
    private sequence = 0;
    private closed = false;

    constructor(
      transport?: NuiTransport,
      diagnostic: BridgeDiagnosticSink = () => undefined,
    ) {
      this.diagnostic = diagnostic;
      this.transport = transport ?? ((envelope, signal) => this.defaultTransport(envelope, signal));
    }

    registerMock<Name extends CallbackName>(name: Name, handler: MockHandler<Name>): () => void {
      this.mocks.set(name, handler as (payload: never) => unknown | Promise<unknown>);
      return () => this.mocks.delete(name);
    }

    request<Name extends CallbackName>(
      callback: Name,
      payload: CallbackRequest<Name>,
      options: RequestOptions = {},
    ): Promise<CallbackResponse<Name>> {
      if (this.closed) {
        return Promise.reject(new BridgeFailure({ code: 'CLOSED', message: 'NUI bridge is closed' }));
      }
      if (!callbackGuards[callback].request(payload)) {
        return Promise.reject(new BridgeFailure({
          code: 'BAD_REQUEST',
          message: `Invalid payload for ${callback}`,
        }));
      }
      if (options.signal?.aborted) {
        return Promise.reject(new BridgeFailure({ code: 'ABORTED', message: 'NUI request was aborted' }));
      }

      const requestId = this.nextRequestId();
      const envelope: NuiRequestEnvelope = { version: 1, requestId, callback, payload };
      const timeoutMs = Math.max(1, options.timeoutMs ?? 5000);

      return new Promise<CallbackResponse<Name>>((resolve, reject) => {
        const onAbort = () => this.rejectPending(requestId, {
          code: 'ABORTED',
          message: `NUI request ${callback} was aborted`,
        });
        options.signal?.addEventListener('abort', onAbort, { once: true });
        const timer = window.setTimeout(() => this.rejectPending(requestId, {
          code: 'TIMEOUT',
          message: `NUI request ${callback} timed out after ${timeoutMs}ms`,
        }), timeoutMs);

        this.pending.set(requestId, {
          callback,
          responseGuard: callbackGuards[callback].response as Guard<unknown>,
          resolve: resolve as (value: unknown) => void,
          reject,
          timer,
          removeAbortListener: () => options.signal?.removeEventListener('abort', onAbort),
        });

        void this.transport(envelope, options.signal)
          .then((response) => this.receiveResponse(response))
          .catch((error: unknown) => {
            if (!this.pending.has(requestId)) return;
            this.rejectPending(requestId, {
              code: options.signal?.aborted ? 'ABORTED' : 'TRANSPORT',
              message: error instanceof Error ? error.message : `Transport failed for ${callback}`,
            });
          });
      });
    }

    receiveResponse(value: unknown): boolean {
      if (!isNuiResponseEnvelope(value)) {
        this.diagnostic('warn', 'Rejected invalid NUI response envelope');
        return false;
      }
      if (this.completed.has(value.requestId)) {
        this.diagnostic('warn', 'Ignored duplicate NUI response', { requestId: value.requestId });
        return false;
      }
      const entry = this.pending.get(value.requestId);
      if (!entry) {
        this.diagnostic('debug', 'Ignored response without a pending request', { requestId: value.requestId });
        return false;
      }
      this.finish(value.requestId);
      if (!value.ok) {
        entry.reject(new BridgeFailure(value.error));
        return true;
      }
      if (!entry.responseGuard(value.data)) {
        entry.reject(new BridgeFailure({
          code: 'INVALID_RESPONSE',
          message: `Invalid response payload for ${entry.callback}`,
        }));
        return false;
      }
      entry.resolve(value.data);
      return true;
    }

    close(reason = 'NUI bridge closed'): void {
      if (this.closed) return;
      this.closed = true;
      this.cancelPending(reason);
      this.mocks.clear();
    }

    cancelPending(reason = 'NUI interface closed'): void {
      for (const requestId of [...this.pending.keys()]) {
        this.rejectPending(requestId, { code: 'CLOSED', message: reason });
      }
    }

    get pendingCount(): number {
      return this.pending.size;
    }

    private nextRequestId(): string {
      this.sequence += 1;
      return `px:${Date.now().toString(36)}:${this.sequence.toString(36)}`;
    }

    private rejectPending(requestId: string, error: BridgeErrorPayload): void {
      const entry = this.pending.get(requestId);
      if (!entry) return;
      this.finish(requestId);
      entry.reject(new BridgeFailure(error));
    }

    private finish(requestId: string): void {
      const entry = this.pending.get(requestId);
      if (!entry) return;
      window.clearTimeout(entry.timer);
      entry.removeAbortListener();
      this.pending.delete(requestId);
      this.completed.add(requestId);
      this.completedOrder.push(requestId);
      if (this.completedOrder.length > 256) {
        const oldest = this.completedOrder.shift();
        if (oldest) this.completed.delete(oldest);
      }
    }

    private async defaultTransport(
      envelope: NuiRequestEnvelope,
      signal: AbortSignal | undefined,
    ): Promise<unknown> {
      const mock = this.mocks.get(envelope.callback as CallbackName);
      if (mock && typeof window.GetParentResourceName !== 'function') {
        const data = await mock(envelope.payload as never);
        return { version: 1, requestId: envelope.requestId, ok: true, data };
      }

      const resourceName = typeof window.GetParentResourceName === 'function'
        ? window.GetParentResourceName()
        : 'pixel_ui';
      const response = await fetch(`https://${resourceName}/pixel:ui:bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(envelope),
        signal,
      });
      if (!response.ok) {
        throw new Error(`NUI transport returned HTTP ${response.status}`);
      }
      return response.json() as Promise<unknown>;
    }
  }

  export function createBrowserMockState(): UiStateSnapshot {
    return {
      visible: true,
      activeOwner: 'browser:showcase',
      focus: true,
      cursor: true,
      modalDepth: 0,
      showcaseEnabled: true,
      owners: [{ id: 'browser:showcase', focus: true, cursor: true, panel: 'showcase' }],
      revision: 1,
    };
  }

  export function installBrowserMocks(client: NuiClient): void {
    if (typeof window.GetParentResourceName === 'function') return;
    const state = new UiOwnershipState();
    state.setShowcaseEnabled(true);
    state.acquire({ owner: 'browser:showcase', focus: true, cursor: true, panel: 'showcase' });
    client.registerMock('ui.ready', () => ({ version: '0.2.1-browser', state: state.snapshot() }));
    client.registerMock('ui.acquire', (payload) => ({
      accepted: true,
      state: state.acquire(payload),
    }));
    client.registerMock('ui.release', (payload) => ({
      accepted: true,
      state: state.release(payload.owner),
    }));
    client.registerMock('ui.close', (payload) => ({
      accepted: true,
      state: state.release(payload.owner),
    }));
    client.registerMock('ui.closeAll', () => ({ accepted: true, state: state.closeAll() }));
    client.registerMock('ui.modalDepth', (payload) => ({
      accepted: true,
      state: state.setModalDepth(payload.depth),
    }));
    client.registerMock('diagnostics.example', (payload) => ({
      accepted: true,
      echoed: payload.message,
    }));
  }
}
