namespace PixelUI {
  export type NavigationKey = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'End' | 'Home';

  export function nextKeyboardIndex(
    current: number,
    count: number,
    key: NavigationKey,
    orientation: 'horizontal' | 'vertical' | 'both' = 'both',
  ): number {
    if (count <= 0) return -1;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    const backward = key === 'ArrowLeft' || key === 'ArrowUp';
    const forward = key === 'ArrowRight' || key === 'ArrowDown';
    if ((orientation === 'horizontal' && (key === 'ArrowUp' || key === 'ArrowDown'))
      || (orientation === 'vertical' && (key === 'ArrowLeft' || key === 'ArrowRight'))
      || (!backward && !forward)) return current;
    return backward ? (current - 1 + count) % count : (current + 1) % count;
  }

  export function shouldCloseOnEscape(key: string, isTopMost: boolean, dismissible = true): boolean {
    return key === 'Escape' && isTopMost && dismissible;
  }

  export const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  export interface FocusTrapHandle {
    deactivate(): void;
  }

  export function activateFocusTrap(
    container: HTMLElement,
    onEscape: () => void,
    isTopMost: () => boolean,
  ): FocusTrapHandle {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.getAttribute('aria-hidden') !== 'true');

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldCloseOnEscape(event.key, isTopMost())) {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab' || !isTopMost()) return;
      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    (focusables()[0] ?? container).focus();

    return {
      deactivate() {
        container.removeEventListener('keydown', onKeyDown);
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
      },
    };
  }
}
