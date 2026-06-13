import type { Terminal as XtermTerminalType } from "@xterm/headless";
import xterm from "@xterm/headless";
import type { Terminal } from "@earendil-works/pi-tui";

const XtermTerminal = xterm.Terminal;

/**
 * Virtual terminal for testing using xterm.js for accurate terminal emulation.
 *
 * Adapted from the upstream pi-tui test helper:
 * https://github.com/earendil-works/pi/blob/main/packages/tui/test/virtual-terminal.ts
 */
export class VirtualTerminal implements Terminal {
  private xterm: XtermTerminalType;
  private inputHandler?: (data: string) => void;
  private resizeHandler?: () => void;
  private _columns: number;
  private _rows: number;

  public constructor(columns: number = 80, rows: number = 24) {
    this._columns = columns;
    this._rows = rows;

    this.xterm = new XtermTerminal({
      cols: columns,
      rows,
      disableStdin: true,
      allowProposedApi: true,
    });
  }

  public start(onInput: (data: string) => void, onResize: () => void): void {
    this.inputHandler = onInput;
    this.resizeHandler = onResize;
    this.xterm.write("\x1b[?2004h");
  }

  public async drainInput(_maxMs?: number, _idleMs?: number): Promise<void> {}

  public stop(): void {
    this.xterm.write("\x1b[?2004l");
    this.inputHandler = undefined;
    this.resizeHandler = undefined;
  }

  public write(data: string): void {
    this.xterm.write(data);
  }

  public get columns(): number {
    return this._columns;
  }

  public get rows(): number {
    return this._rows;
  }

  public get kittyProtocolActive(): boolean {
    return true;
  }

  public moveBy(lines: number): void {
    if (lines > 0) {
      this.xterm.write(`\x1b[${lines}B`);
      return;
    }

    if (lines < 0) {
      this.xterm.write(`\x1b[${-lines}A`);
    }
  }

  public hideCursor(): void {
    this.xterm.write("\x1b[?25l");
  }

  public showCursor(): void {
    this.xterm.write("\x1b[?25h");
  }

  public clearLine(): void {
    this.xterm.write("\x1b[K");
  }

  public clearFromCursor(): void {
    this.xterm.write("\x1b[J");
  }

  public clearScreen(): void {
    this.xterm.write("\x1b[2J\x1b[H");
  }

  public setTitle(title: string): void {
    this.xterm.write(`\x1b]0;${title}\x07`);
  }

  public setProgress(_active: boolean): void {}

  public sendInput(data: string): void {
    this.inputHandler?.(data);
  }

  public resize(columns: number, rows: number): void {
    this._columns = columns;
    this._rows = rows;
    this.xterm.resize(columns, rows);
    this.resizeHandler?.();
  }

  public async flush(): Promise<void> {
    return await new Promise<void>((resolve) => {
      this.xterm.write("", () => resolve());
    });
  }

  public async flushAndGetViewport(): Promise<string[]> {
    await this.flush();
    return this.getViewport();
  }

  public getViewport(): string[] {
    const lines: string[] = [];
    const buffer = this.xterm.buffer.active;

    for (let rowIndex: number = 0; rowIndex < this.xterm.rows; rowIndex += 1) {
      const line = buffer.getLine(buffer.viewportY + rowIndex);
      lines.push(line?.translateToString(true) ?? "");
    }

    return lines;
  }

  public getCursorPosition(): { x: number; y: number } {
    const buffer = this.xterm.buffer.active;
    return {
      x: buffer.cursorX,
      y: buffer.cursorY,
    };
  }

  public async waitForRender(): Promise<void> {
    await new Promise<void>((resolve) => process.nextTick(resolve));
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    await this.flush();
  }
}
