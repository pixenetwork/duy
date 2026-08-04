namespace PixelUI {
  export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }

  export interface TabsProps {
    label: string;
    tabs: readonly TabItem[];
    selectedId?: string;
    onChange?: (id: string) => void;
  }

  export function Tabs({ label, tabs, selectedId, onChange }: TabsProps) {
    const fallback = tabs.find((tab) => !tab.disabled)?.id ?? '';
    const [internalId, setInternalId] = React.useState(fallback);
    const activeId = selectedId ?? internalId;
    const instanceId = React.useId();

    const select = (id: string) => {
      if (selectedId === undefined) setInternalId(id);
      onChange?.(id);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const enabled = tabs.filter((tab) => !tab.disabled);
      const current = Math.max(0, enabled.findIndex((tab) => tab.id === activeId));
      const next = nextKeyboardIndex(current, enabled.length, event.key as NavigationKey, 'horizontal');
      const nextTab = enabled[next];
      if (!nextTab) return;
      event.preventDefault();
      select(nextTab.id);
      const button = event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab-id="${nextTab.id}"]`);
      button?.focus();
    };

    const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
    return (
      <div className="pixel-tabs">
        <div className="pixel-tabs__list" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${instanceId}-tab-${tab.id}`}
              data-tab-id={tab.id}
              aria-selected={tab.id === active?.id}
              aria-controls={`${instanceId}-panel-${tab.id}`}
              tabIndex={tab.id === active?.id ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {active && (
          <div
            className="pixel-tabs__panel"
            role="tabpanel"
            id={`${instanceId}-panel-${active.id}`}
            aria-labelledby={`${instanceId}-tab-${active.id}`}
            tabIndex={0}
          >
            {active.content}
          </div>
        )}
      </div>
    );
  }

  export interface DataTableColumn<Row> {
    id: string;
    header: string;
    render(row: Row): React.ReactNode;
    align?: 'left' | 'center' | 'right';
  }

  export interface DataTableProps<Row> {
    label: string;
    columns: readonly DataTableColumn<Row>[];
    rows: readonly Row[];
    rowKey(row: Row): string;
    emptyTitle?: string;
  }

  export function DataTable<Row>({
    label,
    columns,
    rows,
    rowKey,
    emptyTitle = 'No records available',
  }: DataTableProps<Row>) {
    if (rows.length === 0) return <EmptyState title={emptyTitle} />;
    return (
      <div className="pixel-table-wrap" role="region" aria-label={label} tabIndex={0}>
        <table className="pixel-table">
          <caption className="pixel-visually-hidden">{label}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} scope="col" data-align={column.align ?? 'left'}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.id} data-align={column.align ?? 'left'}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  export interface ContextMenuItem {
    id: string;
    label: string;
    disabled?: boolean;
    destructive?: boolean;
    onSelect: () => void;
  }

  export interface ContextMenuProps {
    label: string;
    trigger: React.ReactNode;
    items: readonly ContextMenuItem[];
  }

  export function ContextMenu({ label, trigger, items }: ContextMenuProps) {
    const [open, setOpen] = React.useState(false);
    const menuId = React.useId();
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
      if (!open) return undefined;
      const onDocumentClick = (event: globalThis.MouseEvent) => {
        if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', onDocumentClick);
      return () => document.removeEventListener('mousedown', onDocumentClick);
    }, [open]);

    const focusItem = (index: number) => {
      const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
      buttons?.[index]?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const buttons = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'),
      );
      const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
      const next = nextKeyboardIndex(current, buttons.length, event.key as NavigationKey, 'vertical');
      event.preventDefault();
      buttons[next]?.focus();
    };

    return (
      <div className="pixel-context" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          className="pixel-context__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            setOpen((current) => !current);
            window.setTimeout(() => focusItem(0), 0);
          }}
        >
          {trigger}
        </button>
        {open && (
          <div id={menuId} className="pixel-context__menu" role="menu" aria-label={label} onKeyDown={onKeyDown}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                data-destructive={item.destructive || undefined}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
}
