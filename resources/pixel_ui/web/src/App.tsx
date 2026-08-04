namespace PixelUI {
  function bridgeDiagnostic(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, unknown>,
  ): void {
    if (typeof window.GetParentResourceName === 'function') return;
    const method = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';
    console[method](`[pixel_ui] ${message}`, fields ?? {});
  }

  export function App() {
    const busRef = React.useRef<NuiEventBus | null>(null);
    const bridgeRef = React.useRef<NuiClient | null>(null);
    if (!busRef.current) busRef.current = new NuiEventBus(bridgeDiagnostic);
    if (!bridgeRef.current) {
      bridgeRef.current = new NuiClient(undefined, bridgeDiagnostic);
      installBrowserMocks(bridgeRef.current);
    }

    const bus = busRef.current;
    const bridge = bridgeRef.current;
    const browserMode = typeof window.GetParentResourceName !== 'function';
    const [state, setState] = React.useState<UiStateSnapshot>(
      browserMode ? createBrowserMockState() : {
        visible: false,
        activeOwner: null,
        focus: false,
        cursor: false,
        modalDepth: 0,
        showcaseEnabled: false,
        owners: [],
        revision: 0,
      },
    );

    React.useEffect(() => {
      const unsubscribeState = bus.subscribe('pixel.ui.state', setState);
      const unsubscribeClose = bus.subscribe('pixel.ui.closeAll', () => {
        bridge.cancelPending('Lua requested UI shutdown');
        setState((current) => ({
          ...current,
          visible: false,
          activeOwner: null,
          focus: false,
          cursor: false,
          modalDepth: 0,
          owners: [],
          revision: current.revision + 1,
        }));
      });
      const onMessage = (event: MessageEvent<unknown>) => {
        bus.receive(event.data);
      };
      window.addEventListener('message', onMessage);

      void bridge.request('ui.ready', {}, { timeoutMs: 5000 })
        .then((result) => setState(result.state))
        .catch((error: unknown) => bridgeDiagnostic(
          'warn',
          'Ready handshake failed',
          { error: error instanceof Error ? error.message : 'unknown' },
        ));

      return () => {
        window.removeEventListener('message', onMessage);
        unsubscribeState();
        unsubscribeClose();
        bus.clear();
        bridge.close('Pixel UI unmounted');
      };
    }, [bridge, bus]);

    React.useEffect(() => {
      const onKeyDown = (event: globalThis.KeyboardEvent) => {
        if (event.defaultPrevented
          || event.key !== 'Escape'
          || !state.visible
          || state.modalDepth > 0
          || !state.activeOwner) return;
        event.preventDefault();
        void bridge.request('ui.release', { owner: state.activeOwner })
          .then((result) => {
            setState(result.state);
            if (!result.state.visible) bridge.cancelPending('Pixel UI closed');
          })
          .catch(() => undefined);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [bridge, state.activeOwner, state.modalDepth, state.visible]);

    const closeActive = () => {
      if (!state.activeOwner) return;
      void bridge.request('ui.close', { owner: state.activeOwner })
        .then((result) => {
          setState(result.state);
          if (!result.state.visible) bridge.cancelPending('Pixel UI closed');
        })
        .catch(() => undefined);
    };

    const reportOverlayDepth = React.useCallback((depth: number) => {
      void bridge.request('ui.modalDepth', { depth }, { timeoutMs: 1500 })
        .then((result) => setState(result.state))
        .catch(() => undefined);
    }, [bridge]);

    const showcaseVisible = state.showcaseEnabled
      && (browserMode || state.owners.some((owner) => owner.panel === 'showcase'));

    return (
      <OverlayProvider onDepthChange={reportOverlayDepth}>
        <ToastProvider>
          <ApplicationShell
            visible={state.visible}
            header={(
              <Header
                brand={(
                  <span className="pixel-wordmark">
                    <span aria-hidden="true">PN</span>
                    <strong>PIXEL <small>NETWORK</small></strong>
                  </span>
                )}
                actions={(
                  <Row>
                    {browserMode && <Badge tone="warning">Browser mock</Badge>}
                    <Badge tone={state.focus ? 'success' : 'neutral'}>{state.focus ? 'Focus owned' : 'Passive'}</Badge>
                    <IconButton label="Close active Pixel interface" icon="×" tone="neutral" onClick={closeActive} />
                  </Row>
                )}
              >
                <span className="pixel-header__title">{showcaseVisible ? 'Developer showcase' : 'Shared application shell'}</span>
              </Header>
            )}
            sidebar={(
              <Sidebar
                items={[
                  { id: 'showcase', label: 'Components', icon: '◇' },
                  { id: 'bridge', label: 'Bridge', icon: '↔' },
                  { id: 'accessibility', label: 'Accessibility', icon: '◎' },
                ]}
                activeId="showcase"
              />
            )}
          >
            {showcaseVisible
              ? <Showcase bridge={bridge} />
              : (
                <ContentPanel
                  title="Pixel UI is ready"
                  description="This shared surface is waiting for the active Pixel module to provide its application view."
                >
                  <EmptyState
                    title="No development panel selected"
                    description="The component showcase remains disabled unless explicitly enabled."
                    action={<Button onClick={closeActive}>Close interface</Button>}
                  />
                </ContentPanel>
              )}
          </ApplicationShell>
        </ToastProvider>
      </OverlayProvider>
    );
  }
}
