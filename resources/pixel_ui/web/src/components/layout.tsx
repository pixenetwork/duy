namespace PixelUI {
  export type Space = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

  export interface StackProps extends React.HTMLAttributes {
    gap?: Space;
    align?: 'start' | 'center' | 'end' | 'stretch';
  }

  export function Stack({ gap = 4, align = 'stretch', className, children, ...props }: StackProps) {
    return (
      <div
        {...props}
        className={classNames('pixel-stack', className)}
        data-align={align}
        style={{ '--layout-gap': `var(--pixel-space-${gap})` }}
      >
        {children}
      </div>
    );
  }

  export interface RowProps extends StackProps {
    wrap?: boolean;
    justify?: 'start' | 'center' | 'end' | 'between';
  }

  export function Row({
    gap = 3,
    align = 'center',
    wrap = false,
    justify = 'start',
    className,
    children,
    ...props
  }: RowProps) {
    return (
      <div
        {...props}
        className={classNames('pixel-row', className)}
        data-align={align}
        data-justify={justify}
        data-wrap={wrap}
        style={{ '--layout-gap': `var(--pixel-space-${gap})` }}
      >
        {children}
      </div>
    );
  }

  export interface GridProps extends React.HTMLAttributes {
    columns?: number | 'auto';
    gap?: Space;
    minColumnWidth?: string;
  }

  export function Grid({
    columns = 'auto',
    gap = 4,
    minColumnWidth = '240px',
    className,
    children,
    ...props
  }: GridProps) {
    const template = columns === 'auto'
      ? `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}), 1fr))`
      : `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`;
    return (
      <div
        {...props}
        className={classNames('pixel-grid', className)}
        style={{
          '--layout-gap': `var(--pixel-space-${gap})`,
          '--grid-template': template,
        }}
      >
        {children}
      </div>
    );
  }

  export interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
    label?: string;
  }

  export function Divider({ orientation = 'horizontal', label }: DividerProps) {
    return (
      <div
        className={`pixel-divider pixel-divider--${orientation}`}
        role="separator"
        aria-orientation={orientation}
      >
        {label && <span>{label}</span>}
      </div>
    );
  }

  export interface ScrollAreaProps extends React.HTMLAttributes {
    label: string;
    maxHeight?: string;
  }

  export function ScrollArea({ label, maxHeight = '100%', className, children, ...props }: ScrollAreaProps) {
    return (
      <div
        {...props}
        className={classNames('pixel-scroll-area', className)}
        role="region"
        aria-label={label}
        tabIndex={0}
        style={{ maxHeight }}
      >
        {children}
      </div>
    );
  }

  export interface HeaderProps extends React.HTMLAttributes {
    brand?: React.ReactNode;
    actions?: React.ReactNode;
  }

  export function Header({ brand, actions, children, className, ...props }: HeaderProps) {
    return (
      <header {...props} className={classNames('pixel-header', className)}>
        <div className="pixel-header__brand">{brand}</div>
        <div className="pixel-header__content">{children}</div>
        <div className="pixel-header__actions">{actions}</div>
      </header>
    );
  }

  export interface NavigationItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
  }

  export interface SidebarProps extends React.HTMLAttributes {
    label?: string;
    items?: readonly NavigationItem[];
    activeId?: string;
    onNavigate?: (id: string) => void;
  }

  export function Sidebar({
    label = 'Application navigation',
    items = [],
    activeId,
    onNavigate,
    children,
    className,
    ...props
  }: SidebarProps) {
    return (
      <aside {...props} className={classNames('pixel-sidebar', className)}>
        <nav aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="pixel-sidebar__item"
              aria-current={item.id === activeId ? 'page' : undefined}
              onClick={() => onNavigate?.(item.id)}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
          {children}
        </nav>
      </aside>
    );
  }

  export interface ContentPanelProps extends React.HTMLAttributes {
    title?: string;
    description?: string;
  }

  export function ContentPanel({ title, description, children, className, ...props }: ContentPanelProps) {
    return (
      <section {...props} className={classNames('pixel-content-panel', className)}>
        {(title || description) && (
          <header>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </header>
        )}
        {children}
      </section>
    );
  }

  export interface ApplicationShellProps {
    header: React.ReactNode;
    sidebar?: React.ReactNode;
    children: React.ReactNode;
    visible: boolean;
  }

  export function ApplicationShell({ header, sidebar, children, visible }: ApplicationShellProps) {
    return (
      <main
        className="pixel-shell"
        data-visible={visible}
        aria-hidden={!visible}
        inert={!visible ? '' : undefined}
      >
        <div className="pixel-application">
          {header}
          {sidebar}
          <div className="pixel-application__content">{children}</div>
        </div>
      </main>
    );
  }

  export interface OverlayLayerProps {
    children: React.ReactNode;
  }

  export function OverlayLayer({ children }: OverlayLayerProps) {
    const root = document.getElementById('pixel-overlays');
    return root ? ReactDOM.createPortal(children, root) : null;
  }
}
