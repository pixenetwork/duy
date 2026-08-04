namespace PixelUI {
  interface ShowcaseProps {
    bridge: NuiClient;
  }

  interface ShowcaseRow {
    id: string;
    module: string;
    status: 'Ready' | 'Review' | 'Deferred';
    latency: number;
  }

  export function Showcase({ bridge }: ShowcaseProps) {
    const [input, setInput] = React.useState('Pixel operator');
    const [notes, setNotes] = React.useState('Chrome edge, obsidian glass, restrained energy.');
    const [select, setSelect] = React.useState('inventory');
    const [checked, setChecked] = React.useState(true);
    const [toggled, setToggled] = React.useState(false);
    const [slider, setSlider] = React.useState(68);
    const [modal, setModal] = React.useState(false);
    const [dialog, setDialog] = React.useState(false);
    const [drawer, setDrawer] = React.useState(false);
    const [bridgeResult, setBridgeResult] = React.useState('Ready for a mocked callback.');
    const toast = useToast();

    const rows: readonly ShowcaseRow[] = [
      { id: 'ui', module: 'Pixel UI', status: 'Ready', latency: 4 },
      { id: 'character', module: 'Character migration', status: 'Deferred', latency: 0 },
      { id: 'admin', module: 'Admin migration', status: 'Review', latency: 11 },
    ];

    const tableColumns: readonly DataTableColumn<ShowcaseRow>[] = [
      { id: 'module', header: 'Module', render: (row) => row.module },
      {
        id: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={row.status === 'Ready' ? 'success' : row.status === 'Review' ? 'warning' : 'neutral'}>
            {row.status}
          </Badge>
        ),
      },
      { id: 'latency', header: 'Latency', align: 'right', render: (row) => `${row.latency} ms` },
    ];

    const runBridgeExample = async () => {
      setBridgeResult('Calling browser-safe diagnostics mock…');
      try {
        const result = await bridge.request(
          'diagnostics.example',
          { message: 'Showcase bridge request' },
          { timeoutMs: 1500 },
        );
        setBridgeResult(`Correlated response: ${result.echoed}`);
      } catch (error) {
        setBridgeResult(error instanceof Error ? error.message : 'Bridge request failed');
      }
    };

    return (
      <ScrollArea label="Pixel UI component showcase" maxHeight="calc(100vh - var(--pixel-size-header))">
        <Stack gap={6} className="pixel-showcase">
          <section className="pixel-showcase__hero">
            <span className="pixel-kicker">Foundation v0.2.1 · Developer only</span>
            <h1>Pixel UI Kit</h1>
            <p>Reusable controls, accessible overlays, layouts, notifications, and the typed bridge in the approved Pixel OS material system.</p>
            <Row wrap>
              <Badge tone="success">21 components</Badge>
              <Badge tone="primary">Strict TypeScript</Badge>
              <Badge tone="neutral">Offline NUI</Badge>
            </Row>
          </section>

          <Grid columns="auto" minColumnWidth="320px" gap={5}>
            <Card title="Actions" eyebrow="Buttons" actions={<Badge tone="primary">Interactive</Badge>}>
              <Stack>
                <Row wrap>
                  <Button>Primary</Button>
                  <Button tone="neutral">Neutral</Button>
                  <Button tone="success">Success</Button>
                  <Button tone="warning">Warning</Button>
                  <Button tone="danger">Danger</Button>
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </Row>
                <Row>
                  <Tooltip content="Icon buttons require an accessible label">
                    <IconButton label="Energy settings" icon="⚙" />
                  </Tooltip>
                  <IconButton label="Close preview" icon="×" tone="neutral" />
                </Row>
              </Stack>
            </Card>

            <Card title="Form controls" eyebrow="Inputs">
              <Stack>
                <Input
                  label="Operator name"
                  value={input}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  hint="A visible native label is always provided."
                />
                <Textarea
                  label="Design note"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                />
                <Select
                  label="Target module"
                  value={select}
                  onChange={(event) => setSelect(event.currentTarget.value)}
                  options={[
                    { value: 'inventory', label: 'Pixel Inventory' },
                    { value: 'character', label: 'Pixel Character' },
                    { value: 'admin', label: 'Pixel Admin' },
                  ]}
                />
                <Checkbox
                  label="Enable telemetry preview"
                  description="Development data only"
                  checked={checked}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setChecked(event.currentTarget.checked)}
                />
                <Toggle
                  label="Energy accent"
                  description="Uses switch semantics"
                  checked={toggled}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setToggled(event.currentTarget.checked)}
                />
                <Slider
                  label="Interface scale"
                  value={slider}
                  min={50}
                  max={100}
                  unit="%"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSlider(Number(event.currentTarget.value))}
                />
              </Stack>
            </Card>

            <Card title="Overlays" eyebrow="Focus managed">
              <Stack>
                <Row wrap>
                  <Button onClick={() => setModal(true)}>Open modal</Button>
                  <Button tone="danger" onClick={() => setDialog(true)}>Confirm dialog</Button>
                  <Button tone="neutral" onClick={() => setDrawer(true)}>Open drawer</Button>
                </Row>
                <Divider label="Notifications" />
                <Row wrap>
                  <Button tone="neutral" onClick={() => toast.notify({ title: 'Information', message: 'The NUI bridge is ready.', tone: 'info' })}>Info toast</Button>
                  <Button tone="success" onClick={() => toast.notify({ title: 'Saved', message: 'Local showcase state updated.', tone: 'success' })}>Success</Button>
                  <Button tone="warning" onClick={() => toast.notify({ title: 'Review', message: 'Live Enhanced QA remains pending.', tone: 'warning' })}>Warning</Button>
                  <Button tone="danger" onClick={() => toast.notify({ title: 'Rejected', message: 'Invalid authority data was blocked.', tone: 'error' })}>Error</Button>
                </Row>
              </Stack>
            </Card>

            <Card title="System states" eyebrow="Feedback">
              <Grid columns={3} minColumnWidth="140px" gap={3}>
                <LoadingState label="Synchronizing" />
                <EmptyState title="No records" description="Create the first entry." />
                <ErrorState title="Request failed" description="Try again safely." />
              </Grid>
            </Card>
          </Grid>

          <Card title="Navigation patterns" eyebrow="Keyboard ready">
            <Tabs
              label="Component categories"
              tabs={[
                { id: 'overview', label: 'Overview', content: <p>Use Left/Right, Home, and End to move between tabs.</p> },
                { id: 'tokens', label: 'Tokens', content: <p>All visual values come from the generated Pixel token source.</p> },
                { id: 'disabled', label: 'Unavailable', content: null, disabled: true },
              ]}
            />
          </Card>

          <Card
            title="Data table and context menu"
            eyebrow="Structured data"
            actions={(
              <ContextMenu
                label="Table actions"
                trigger={<span>Actions ▾</span>}
                items={[
                  { id: 'refresh', label: 'Refresh snapshot', onSelect: () => toast.notify({ title: 'Snapshot refreshed' }) },
                  { id: 'export', label: 'Export disabled', disabled: true, onSelect: () => undefined },
                  { id: 'clear', label: 'Clear local view', destructive: true, onSelect: () => toast.notify({ title: 'Local view cleared', tone: 'warning' }) },
                ]}
              />
            )}
          >
            <DataTable label="Pixel module readiness" columns={tableColumns} rows={rows} rowKey={(row) => row.id} />
          </Card>

          <Grid columns="auto" minColumnWidth="260px">
            <ContentPanel title="Content panel" description="A focused application work surface.">
              <Stack gap={2}>
                <span>Stack controls vertical rhythm.</span>
                <Row justify="between"><span>Row aligns content.</span><Badge>Layout</Badge></Row>
              </Stack>
            </ContentPanel>
            <ContentPanel title="Typed bridge" description="Browser mode uses a safe local callback mock.">
              <Stack gap={3}>
                <code>{bridgeResult}</code>
                <Button onClick={() => void runBridgeExample()}>Run correlated request</Button>
              </Stack>
            </ContentPanel>
          </Grid>
        </Stack>

        <Modal
          open={modal}
          title="Accessible modal"
          description="Tab is trapped here, Escape closes, and focus returns to the trigger."
          onClose={() => setModal(false)}
          footer={<Button onClick={() => setModal(false)}>Done</Button>}
        >
          <Input label="Focusable field" placeholder="Try keyboard navigation" />
          <Button tone="neutral" onClick={() => setDialog(true)}>Open nested dialog</Button>
        </Modal>

        <ConfirmDialog
          open={dialog}
          title="Confirm local action"
          description="This showcase action never reaches production authority."
          onCancel={() => setDialog(false)}
          onConfirm={() => {
            setDialog(false);
            toast.notify({ title: 'Confirmed', tone: 'success' });
          }}
        />

        <Drawer
          open={drawer}
          title="Navigation drawer"
          description="Drawers share the same focus and Escape contract."
          onClose={() => setDrawer(false)}
          footer={<Button fullWidth onClick={() => setDrawer(false)}>Close drawer</Button>}
        >
          <Stack>
            <Button tone="neutral">Profile</Button>
            <Button tone="neutral">Permissions</Button>
            <Button tone="neutral">Audit trail</Button>
          </Stack>
        </Drawer>
      </ScrollArea>
    );
  }
}
