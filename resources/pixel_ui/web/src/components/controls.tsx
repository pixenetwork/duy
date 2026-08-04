namespace PixelUI {
  export type ComponentTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';
  export type ComponentSize = 'small' | 'medium' | 'large';

  export interface ButtonProps extends React.ButtonHTMLAttributes {
    tone?: ComponentTone;
    size?: ComponentSize;
    loading?: boolean;
    fullWidth?: boolean;
  }

  export function Button({
    tone = 'primary',
    size = 'medium',
    loading = false,
    fullWidth = false,
    children,
    className,
    disabled,
    ...props
  }: ButtonProps) {
    return (
      <button
        {...props}
        type={props.type ?? 'button'}
        className={classNames(
          'pixel-button',
          `pixel-tone--${tone}`,
          `pixel-size--${size}`,
          fullWidth && 'pixel-control--full',
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading && <span className="pixel-spinner pixel-spinner--inline" aria-hidden="true" />}
        <span>{children}</span>
      </button>
    );
  }

  export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    label: string;
    icon: React.ReactNode;
  }

  export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
    return (
      <Button {...props} className={classNames('pixel-icon-button', className)} aria-label={label}>
        <span aria-hidden="true">{icon}</span>
      </Button>
    );
  }

  interface FieldFrameProps {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
  }

  function FieldFrame({ id, label, hint, error, children }: FieldFrameProps) {
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
    return (
      <label className="pixel-field" htmlFor={id}>
        <span className="pixel-field__label">{label}</span>
        {React.createElement('span', { className: 'pixel-field__control', 'aria-describedby': describedBy }, children)}
        {hint && <span id={`${id}-hint`} className="pixel-field__hint">{hint}</span>}
        {error && <span id={`${id}-error`} className="pixel-field__error" role="alert">{error}</span>}
      </label>
    );
  }

  export interface InputProps extends React.InputHTMLAttributes {
    label: string;
    hint?: string;
    error?: string;
  }

  export function Input({ label, hint, error, id: suppliedId, className, ...props }: InputProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
    return (
      <FieldFrame id={id} label={label} hint={hint} error={error}>
        <input
          {...props}
          id={id}
          className={classNames('pixel-input', className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        />
      </FieldFrame>
    );
  }

  export interface TextareaProps extends React.TextareaHTMLAttributes {
    label: string;
    hint?: string;
    error?: string;
  }

  export function Textarea({ label, hint, error, id: suppliedId, className, ...props }: TextareaProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
    return (
      <FieldFrame id={id} label={label} hint={hint} error={error}>
        <textarea
          {...props}
          id={id}
          className={classNames('pixel-input pixel-textarea', className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        />
      </FieldFrame>
    );
  }

  export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
  }

  export interface SelectProps extends React.SelectHTMLAttributes {
    label: string;
    hint?: string;
    error?: string;
    options: readonly SelectOption[];
  }

  export function Select({
    label,
    hint,
    error,
    options,
    id: suppliedId,
    className,
    ...props
  }: SelectProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
    return (
      <FieldFrame id={id} label={label} hint={hint} error={error}>
        <select
          {...props}
          id={id}
          className={classNames('pixel-input pixel-select', className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldFrame>
    );
  }

  export interface CheckboxProps extends Omit<React.InputHTMLAttributes, 'type'> {
    label: string;
    description?: string;
  }

  export function Checkbox({ label, description, id: suppliedId, className, ...props }: CheckboxProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    return (
      <label className={classNames('pixel-check', className)} htmlFor={id}>
        <input {...props} id={id} type="checkbox" className="pixel-check__native" />
        <span className="pixel-check__box" aria-hidden="true">✓</span>
        <span>
          <span className="pixel-check__label">{label}</span>
          {description && <span className="pixel-check__description">{description}</span>}
        </span>
      </label>
    );
  }

  export type ToggleProps = CheckboxProps;

  export function Toggle({ label, description, id: suppliedId, className, ...props }: ToggleProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    return (
      <label className={classNames('pixel-toggle', className)} htmlFor={id}>
        <span>
          <span className="pixel-check__label">{label}</span>
          {description && <span className="pixel-check__description">{description}</span>}
        </span>
        <input {...props} id={id} type="checkbox" role="switch" className="pixel-toggle__native" />
        <span className="pixel-toggle__track" aria-hidden="true"><span /></span>
      </label>
    );
  }

  export interface SliderProps extends Omit<React.InputHTMLAttributes, 'type'> {
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
  }

  export function Slider({
    label,
    value,
    min,
    max,
    unit = '',
    id: suppliedId,
    className,
    ...props
  }: SliderProps) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;
    return (
      <label className={classNames('pixel-slider', className)} htmlFor={id}>
        <span className="pixel-field__label">
          {label}<output htmlFor={id}>{value}{unit}</output>
        </span>
        <input
          {...props}
          id={id}
          type="range"
          value={value}
          min={min}
          max={max}
          style={{ '--component-slider-progress': `${percentage}%` }}
        />
      </label>
    );
  }

  export interface BadgeProps {
    children: React.ReactNode;
    tone?: ComponentTone;
  }

  export function Badge({ children, tone = 'neutral' }: BadgeProps) {
    return <span className={classNames('pixel-badge', `pixel-tone--${tone}`)}>{children}</span>;
  }

  export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    placement?: 'top' | 'right' | 'bottom' | 'left';
  }

  export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
    const id = React.useId();
    return (
      <span className="pixel-tooltip-anchor">
        {React.cloneElement(children, { 'aria-describedby': id })}
        <span id={id} role="tooltip" className={`pixel-tooltip pixel-tooltip--${placement}`}>
          {content}
        </span>
      </span>
    );
  }

  export interface CardProps extends React.HTMLAttributes {
    title?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
  }

  export function Card({ title, eyebrow, actions, children, className, ...props }: CardProps) {
    return (
      <section {...props} className={classNames('pixel-card', className)}>
        {(title || eyebrow || actions) && (
          <header className="pixel-card__header">
            <div>
              {eyebrow && <span className="pixel-kicker">{eyebrow}</span>}
              {title && <h3>{title}</h3>}
            </div>
            {actions}
          </header>
        )}
        <div className="pixel-card__body">{children}</div>
      </section>
    );
  }

  export interface LoadingStateProps {
    label?: string;
  }

  export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
    return (
      <div className="pixel-state" role="status" aria-live="polite">
        <span className="pixel-spinner" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    );
  }

  export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
  }

  export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
      <div className="pixel-state">
        <span className="pixel-state__glyph" aria-hidden="true">◇</span>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action}
      </div>
    );
  }

  export interface ErrorStateProps extends EmptyStateProps {}

  export function ErrorState({ title, description, action }: ErrorStateProps) {
    return (
      <div className="pixel-state pixel-state--error" role="alert">
        <span className="pixel-state__glyph" aria-hidden="true">!</span>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action}
      </div>
    );
  }

  export function classNames(...values: readonly unknown[]): string {
    return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
  }
}
