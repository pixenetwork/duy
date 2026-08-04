namespace PixelUI {
  interface OverlayContextValue {
    register(id: string): () => void;
    isTop(id: string): boolean;
  }

  const OverlayContext = React.createContext<OverlayContextValue | null>(null);

  export interface OverlayProviderProps {
    children: React.ReactNode;
    onDepthChange?: (depth: number) => void;
  }

  export function OverlayProvider({ children, onDepthChange }: OverlayProviderProps) {
    const [stack, setStack] = React.useState<readonly string[]>([]);
    const stackRef = React.useRef(stack);
    stackRef.current = stack;
    const onDepthChangeRef = React.useRef(onDepthChange);
    onDepthChangeRef.current = onDepthChange;

    const register = React.useCallback((id: string) => {
      setStack((current) => current.includes(id) ? current : [...current, id]);
      return () => setStack((current) => current.filter((entry) => entry !== id));
    }, []);

    React.useEffect(() => {
      onDepthChangeRef.current?.(stack.length);
    }, [stack.length]);

    const value = React.useMemo<OverlayContextValue>(() => ({
      register,
      isTop: (id: string) => {
        const current = stackRef.current;
        return current.length > 0 && current[current.length - 1] === id;
      },
    }), [register]);

    return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
  }

  function useOverlayRegistration(open: boolean): {
    id: string;
    isTopMost: () => boolean;
  } {
    const context = React.useContext(OverlayContext);
    const id = React.useId();
    const contextRef = React.useRef(context);
    contextRef.current = context;
    const isTopMost = React.useCallback(() => contextRef.current?.isTop(id) ?? true, [id]);
    React.useEffect(() => {
      if (!open || !context) return undefined;
      return context.register(id);
    }, [context, id, open]);
    return { id, isTopMost };
  }

  interface OverlayFrameProps {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    dismissible?: boolean;
    className?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    role?: 'dialog' | 'alertdialog';
  }

  function OverlayFrame({
    open,
    title,
    description,
    onClose,
    dismissible = true,
    className,
    children,
    footer,
    role = 'dialog',
  }: OverlayFrameProps) {
    const registration = useOverlayRegistration(open);
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const titleId = `${registration.id}-title`;
    const descriptionId = `${registration.id}-description`;
    const closeRef = React.useRef(onClose);
    closeRef.current = onClose;

    React.useEffect(() => {
      const panel = panelRef.current;
      if (!open || !panel) return undefined;
      return activateFocusTrap(
        panel,
        () => {
          if (dismissible) closeRef.current();
        },
        registration.isTopMost,
      ).deactivate;
    }, [dismissible, open, registration.isTopMost]);

    if (!open) return null;
    return (
      <OverlayLayer>
        <div className="pixel-overlay" data-overlay-id={registration.id}>
          <div
            ref={panelRef}
            className={classNames('pixel-overlay__panel', className)}
            role={role}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
          >
            <header className="pixel-overlay__header">
              <div>
                <span className="pixel-kicker">Pixel OS</span>
                <h2 id={titleId}>{title}</h2>
                {description && <p id={descriptionId}>{description}</p>}
              </div>
              {dismissible && <IconButton label={`Close ${title}`} icon="×" tone="neutral" onClick={onClose} />}
            </header>
            <div className="pixel-overlay__body">{children}</div>
            {footer && <footer className="pixel-overlay__footer">{footer}</footer>}
          </div>
        </div>
      </OverlayLayer>
    );
  }

  export interface ModalProps extends Omit<OverlayFrameProps, 'role'> {}

  export function Modal(props: ModalProps) {
    return <OverlayFrame {...props} className={classNames('pixel-modal', props.className)} />;
  }

  export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ComponentTone;
    onConfirm: () => void;
    onCancel: () => void;
  }

  export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'danger',
    onConfirm,
    onCancel,
  }: ConfirmDialogProps) {
    return (
      <OverlayFrame
        open={open}
        title={title}
        description={description}
        onClose={onCancel}
        role="alertdialog"
        footer={(
          <Row justify="end">
            <Button tone="neutral" onClick={onCancel}>{cancelLabel}</Button>
            <Button tone={tone} onClick={onConfirm}>{confirmLabel}</Button>
          </Row>
        )}
      >
        <p className="pixel-dialog__message">This action requires an explicit decision.</p>
      </OverlayFrame>
    );
  }

  export type DialogProps = ConfirmDialogProps;
  export const Dialog = ConfirmDialog;

  export interface DrawerProps extends Omit<OverlayFrameProps, 'className' | 'role'> {
    side?: 'left' | 'right';
  }

  export function Drawer({ side = 'right', ...props }: DrawerProps) {
    return <OverlayFrame {...props} className={`pixel-drawer pixel-drawer--${side}`} />;
  }

  export type ToastTone = 'info' | 'success' | 'warning' | 'error';

  export interface ToastInput {
    title: string;
    message?: string;
    tone?: ToastTone;
    durationMs?: number;
  }

  interface ToastRecord extends ToastInput {
    id: string;
  }

  export interface ToastApi {
    notify(toast: ToastInput): string;
    dismiss(id: string): void;
    clear(): void;
  }

  const ToastContext = React.createContext<ToastApi | null>(null);

  export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<readonly ToastRecord[]>([]);
    const sequence = React.useRef(0);
    const timers = React.useRef(new Map<string, number>());

    const dismiss = React.useCallback((id: string) => {
      const timer = timers.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const clear = React.useCallback(() => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
      setToasts([]);
    }, []);

    const notify = React.useCallback((input: ToastInput) => {
      sequence.current += 1;
      const id = `toast-${sequence.current}`;
      setToasts((current) => [...current, { ...input, id }]);
      const durationMs = Math.max(1000, input.durationMs ?? 4200);
      timers.current.set(id, window.setTimeout(() => dismiss(id), durationMs));
      return id;
    }, [dismiss]);

    React.useEffect(() => clear, [clear]);

    const api = React.useMemo<ToastApi>(() => ({ notify, dismiss, clear }), [clear, dismiss, notify]);
    return (
      <ToastContext.Provider value={api}>
        {children}
        <OverlayLayer>
          <div className="pixel-toast-region" aria-label="Notifications" aria-live="polite">
            {toasts.map((toast) => (
              <article key={toast.id} className={`pixel-toast pixel-toast--${toast.tone ?? 'info'}`} role="status">
                <span className="pixel-toast__energy" aria-hidden="true" />
                <div>
                  <strong>{toast.title}</strong>
                  {toast.message && <p>{toast.message}</p>}
                </div>
                <IconButton label={`Dismiss ${toast.title}`} icon="×" tone="neutral" size="small" onClick={() => dismiss(toast.id)} />
              </article>
            ))}
          </div>
        </OverlayLayer>
      </ToastContext.Provider>
    );
  }

  export function useToast(): ToastApi {
    const context = React.useContext(ToastContext);
    if (!context) throw new Error('useToast must be used inside ToastProvider');
    return context;
  }
}
