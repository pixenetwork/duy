declare namespace React {
  type Key = string | number;
  type ReactNode = string | number | boolean | null | undefined | ReactElement | readonly ReactNode[];

  interface ReactElement {
    readonly type: unknown;
    readonly props: unknown;
    readonly key: string | null;
  }

  interface MutableRefObject<T> {
    current: T;
  }

  interface SyntheticEvent<T = Element> {
    currentTarget: T;
    target: EventTarget;
    preventDefault(): void;
    stopPropagation(): void;
  }

  interface ChangeEvent<T = Element> extends SyntheticEvent<T> {}
  interface KeyboardEvent<T = Element> extends SyntheticEvent<T> {
    key: string;
    shiftKey: boolean;
  }
  interface MouseEvent<T = Element> extends SyntheticEvent<T> {}

  interface HTMLAttributes<T = HTMLElement> {
    [key: string]: unknown;
    id?: string;
    className?: string;
    children?: ReactNode;
    disabled?: boolean;
    title?: string;
    role?: string;
    tabIndex?: number;
    onClick?: (event: MouseEvent<T>) => void;
    onKeyDown?: (event: KeyboardEvent<T>) => void;
  }

  interface ButtonHTMLAttributes<T = HTMLButtonElement> extends HTMLAttributes<T> {
    type?: 'button' | 'submit' | 'reset';
  }

  interface InputHTMLAttributes<T = HTMLInputElement> extends HTMLAttributes<T> {
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    checked?: boolean;
    defaultChecked?: boolean;
    placeholder?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    onChange?: (event: ChangeEvent<T>) => void;
  }

  interface TextareaHTMLAttributes<T = HTMLTextAreaElement> extends HTMLAttributes<T> {
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    placeholder?: string;
    rows?: number;
    onChange?: (event: ChangeEvent<T>) => void;
  }

  interface SelectHTMLAttributes<T = HTMLSelectElement> extends HTMLAttributes<T> {
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    onChange?: (event: ChangeEvent<T>) => void;
  }

  interface Context<T> {
    Provider: (props: { value: T; children?: ReactNode }) => ReactElement;
  }

  type SetStateAction<T> = T | ((previous: T) => T);
  type Dispatch<T> = (value: T) => void;

  function createElement<P>(
    type: string | ((props: P) => ReactElement | null),
    props: P | null,
    ...children: ReactNode[]
  ): ReactElement;
  function cloneElement(element: ReactElement, props?: Record<string, unknown> | null, ...children: ReactNode[]): ReactElement;
  function createContext<T>(defaultValue: T): Context<T>;
  function useContext<T>(context: Context<T>): T;
  function useState<T>(initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>];
  function useRef<T>(initialValue: T): MutableRefObject<T>;
  function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    dependencies: readonly unknown[],
  ): T;
  function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void;
  function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T;
  function useId(): string;
  const StrictMode: (props: { children?: ReactNode }) => ReactElement;
}

declare namespace ReactDOM {
  function createRoot(container: Element | DocumentFragment): {
    render(node: React.ReactNode): void;
    unmount(): void;
  };
  function createPortal(children: React.ReactNode, container: Element | DocumentFragment, key?: React.Key): React.ReactElement;
  const version: string;
}

declare namespace JSX {
  interface Element extends React.ReactElement {}
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}

interface Window {
  GetParentResourceName?: () => string;
}
