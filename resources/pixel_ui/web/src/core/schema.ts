namespace PixelUI {
  export type Guard<T> = (value: unknown) => value is T;

  export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; issues: readonly string[] };

  export const isUnknownRecord: Guard<Record<string, unknown>> = (
    value: unknown,
  ): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

  export const isString: Guard<string> = (value: unknown): value is string =>
    typeof value === 'string';

  export const isNonEmptyString: Guard<string> = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

  export const isBoolean: Guard<boolean> = (value: unknown): value is boolean =>
    typeof value === 'boolean';

  export const isFiniteNumber: Guard<number> = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

  export function isOptional<T>(guard: Guard<T>): Guard<T | undefined> {
    return (value: unknown): value is T | undefined => value === undefined || guard(value);
  }

  export function isArrayOf<T>(guard: Guard<T>): Guard<readonly T[]> {
    return (value: unknown): value is readonly T[] => Array.isArray(value) && value.every(guard);
  }

  export function validate<T>(value: unknown, guard: Guard<T>, label = 'payload'): ValidationResult<T> {
    return guard(value)
      ? { ok: true, value }
      : { ok: false, issues: [`Invalid ${label}`] };
  }

  export type BridgeErrorCode =
    | 'ABORTED'
    | 'BAD_REQUEST'
    | 'CLOSED'
    | 'DUPLICATE_RESPONSE'
    | 'INTERNAL'
    | 'INVALID_RESPONSE'
    | 'NOT_FOUND'
    | 'TIMEOUT'
    | 'TRANSPORT';

  export interface BridgeErrorPayload {
    code: BridgeErrorCode;
    message: string;
    details?: unknown;
  }

  export interface NuiEventEnvelope<T = unknown> {
    version: 1;
    event: string;
    payload: T;
  }

  export interface NuiRequestEnvelope<T = unknown> {
    version: 1;
    requestId: string;
    callback: string;
    payload: T;
  }

  export type NuiResponseEnvelope<T = unknown> =
    | { version: 1; requestId: string; ok: true; data: T }
    | { version: 1; requestId: string; ok: false; error: BridgeErrorPayload };

  export interface UiOwner {
    id: string;
    focus: boolean;
    cursor: boolean;
    panel?: string;
  }

  export interface UiStateSnapshot {
    visible: boolean;
    activeOwner: string | null;
    focus: boolean;
    cursor: boolean;
    modalDepth: number;
    showcaseEnabled: boolean;
    owners: readonly UiOwner[];
    revision: number;
  }

  export interface DiagnosticEvent {
    level: 'debug' | 'info' | 'warn' | 'error';
    resource: string;
    module: string;
    message: string;
    fields?: Record<string, unknown>;
  }

  export const isRequestId: Guard<string> = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9:_-]{8,96}$/.test(value);

  export const isBridgeError: Guard<BridgeErrorPayload> = (
    value: unknown,
  ): value is BridgeErrorPayload => {
    if (!isUnknownRecord(value)) return false;
    const codes: readonly BridgeErrorCode[] = [
      'ABORTED',
      'BAD_REQUEST',
      'CLOSED',
      'DUPLICATE_RESPONSE',
      'INTERNAL',
      'INVALID_RESPONSE',
      'NOT_FOUND',
      'TIMEOUT',
      'TRANSPORT',
    ];
    return typeof value.code === 'string'
      && codes.includes(value.code as BridgeErrorCode)
      && isNonEmptyString(value.message);
  };

  export const isNuiEventEnvelope: Guard<NuiEventEnvelope> = (
    value: unknown,
  ): value is NuiEventEnvelope =>
    isUnknownRecord(value)
    && value.version === 1
    && isNonEmptyString(value.event)
    && 'payload' in value;

  export const isNuiResponseEnvelope: Guard<NuiResponseEnvelope> = (
    value: unknown,
  ): value is NuiResponseEnvelope => {
    if (!isUnknownRecord(value) || value.version !== 1 || !isRequestId(value.requestId)) return false;
    if (value.ok === true) return 'data' in value;
    return value.ok === false && isBridgeError(value.error);
  };

  export const isUiOwner: Guard<UiOwner> = (value: unknown): value is UiOwner =>
    isUnknownRecord(value)
    && isNonEmptyString(value.id)
    && isBoolean(value.focus)
    && isBoolean(value.cursor)
    && (value.panel === undefined || isString(value.panel));

  export const isUiStateSnapshot: Guard<UiStateSnapshot> = (
    value: unknown,
  ): value is UiStateSnapshot =>
    isUnknownRecord(value)
    && isBoolean(value.visible)
    && (value.activeOwner === null || isNonEmptyString(value.activeOwner))
    && isBoolean(value.focus)
    && isBoolean(value.cursor)
    && isFiniteNumber(value.modalDepth)
    && value.modalDepth >= 0
    && isBoolean(value.showcaseEnabled)
    && isArrayOf(isUiOwner)(value.owners)
    && isFiniteNumber(value.revision);

  export const isDiagnosticEvent: Guard<DiagnosticEvent> = (
    value: unknown,
  ): value is DiagnosticEvent => {
    if (!isUnknownRecord(value)) return false;
    return ['debug', 'info', 'warn', 'error'].includes(String(value.level))
      && isNonEmptyString(value.resource)
      && isNonEmptyString(value.module)
      && isNonEmptyString(value.message)
      && (value.fields === undefined || isUnknownRecord(value.fields));
  };

  export const isReadyResponse: Guard<{ version: string; state: UiStateSnapshot }> = (
    value: unknown,
  ): value is { version: string; state: UiStateSnapshot } =>
    isUnknownRecord(value) && isNonEmptyString(value.version) && isUiStateSnapshot(value.state);

  export const isOkResponse: Guard<{ accepted: boolean; state: UiStateSnapshot }> = (
    value: unknown,
  ): value is { accepted: boolean; state: UiStateSnapshot } =>
    isUnknownRecord(value) && isBoolean(value.accepted) && isUiStateSnapshot(value.state);
}
