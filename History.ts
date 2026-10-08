/**
 * Undo / Redo 履歴。画面全体ではなく「変わった矩形」だけを保存する差分方式なので、
 * スマホでもメモリを圧迫しにくい（仕様 §12, §34）。
 */
export interface Patch {
  x: number;
  y: number;
  w: number;
  h: number;
  before: ImageData;
  after: ImageData;
}

export const MAX_HISTORY = 60;
/** 履歴全体のおおよその上限（バイト）。超えたら古いものから捨てる */
const MAX_BYTES = 160 * 1024 * 1024;

export class History {
  private undoStack: Patch[] = [];
  private redoStack: Patch[] = [];
  private bytes = 0;

  constructor(private onChange: () => void) {}

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get size() {
    return this.undoStack.length;
  }

  private static cost(p: Patch) {
    return p.w * p.h * 8;
  }

  push(p: Patch) {
    this.undoStack.push(p);
    this.bytes += History.cost(p);
    for (const r of this.redoStack) this.bytes -= History.cost(r);
    this.redoStack = [];
    while (this.undoStack.length > MAX_HISTORY || (this.bytes > MAX_BYTES && this.undoStack.length > 1)) {
      const old = this.undoStack.shift()!;
      this.bytes -= History.cost(old);
    }
    this.onChange();
  }

  undo(ctx: CanvasRenderingContext2D): Patch | null {
    const p = this.undoStack.pop();
    if (!p) return null;
    ctx.putImageData(p.before, p.x, p.y);
    this.redoStack.push(p);
    this.onChange();
    return p;
  }

  redo(ctx: CanvasRenderingContext2D): Patch | null {
    const p = this.redoStack.pop();
    if (!p) return null;
    ctx.putImageData(p.after, p.x, p.y);
    this.undoStack.push(p);
    this.onChange();
    return p;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.bytes = 0;
    this.onChange();
  }
}
