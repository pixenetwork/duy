namespace PixelUI {
  export interface OwnershipRequest {
    owner: string;
    focus?: boolean;
    cursor?: boolean;
    panel?: string;
  }

  export class UiOwnershipState {
    private readonly owners = new Map<string, UiOwner>();
    private order: string[] = [];
    private revision = 0;
    private modalDepth = 0;
    private showcaseEnabled = false;

    acquire(request: OwnershipRequest): UiStateSnapshot {
      const owner = request.owner.trim();
      if (!/^[A-Za-z0-9:_-]{1,64}$/.test(owner)) {
        throw new Error('Owner must contain 1-64 safe identifier characters');
      }

      const nextOwner: UiOwner = {
        id: owner,
        focus: request.focus === true,
        cursor: request.cursor === true,
        ...(request.panel ? { panel: request.panel } : {}),
      };
      const current = this.owners.get(owner);
      const isTop = this.order.length > 0 && this.order[this.order.length - 1] === owner;
      if (current
        && isTop
        && current.focus === nextOwner.focus
        && current.cursor === nextOwner.cursor
        && current.panel === nextOwner.panel) {
        return this.snapshot();
      }

      this.owners.set(owner, nextOwner);
      this.order = this.order.filter((entry) => entry !== owner);
      this.order.push(owner);
      this.revision += 1;
      return this.snapshot();
    }

    release(owner: string): UiStateSnapshot {
      if (this.owners.delete(owner)) {
        this.order = this.order.filter((entry) => entry !== owner);
        this.revision += 1;
      }
      if (this.owners.size === 0) this.modalDepth = 0;
      return this.snapshot();
    }

    closeAll(): UiStateSnapshot {
      if (this.owners.size > 0 || this.modalDepth > 0) this.revision += 1;
      this.owners.clear();
      this.order = [];
      this.modalDepth = 0;
      return this.snapshot();
    }

    setModalDepth(depth: number): UiStateSnapshot {
      const next = Math.max(0, Math.floor(depth));
      if (next !== this.modalDepth) {
        this.modalDepth = next;
        this.revision += 1;
      }
      return this.snapshot();
    }

    setShowcaseEnabled(enabled: boolean): UiStateSnapshot {
      if (enabled !== this.showcaseEnabled) {
        this.showcaseEnabled = enabled;
        this.revision += 1;
      }
      return this.snapshot();
    }

    snapshot(): UiStateSnapshot {
      const activeOwner = this.order.length > 0 ? this.order[this.order.length - 1] : null;
      const active = activeOwner ? this.owners.get(activeOwner) : undefined;
      return {
        visible: this.owners.size > 0,
        activeOwner,
        focus: active?.focus === true,
        cursor: active?.cursor === true,
        modalDepth: this.modalDepth,
        showcaseEnabled: this.showcaseEnabled,
        owners: this.order.flatMap((id) => {
          const owner = this.owners.get(id);
          return owner ? [{ ...owner }] : [];
        }),
        revision: this.revision,
      };
    }
  }
}
