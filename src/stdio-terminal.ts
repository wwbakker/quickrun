import type { Terminal } from "@earendil-works/pi-tui";

const CLEAR_VIEWPORT_AND_HOME_SEQUENCE = "\x1b[2J\x1b[H";
const CLEAR_SCROLLBACK_SEQUENCE = "\x1b[3J";

function removeOscSequences(data: string): string {
  return data.replace(/\x1b\][^\x07]*\x07/g, "");
}

/**
 * Minimal process-backed terminal that reads from stdin and writes UI output to a
 * chosen TTY stream. The CLI uses stderr by default so stdout remains clean for
 * shell wrappers that capture the selected command.
 *
 * It also keeps the selector inline in the existing shell session by translating
 * full-screen clear requests into local line clears for the tracked quickrun area.
 */
export class StdioTerminal implements Terminal {
  private readonly input: NodeJS.ReadStream;
  private readonly output: NodeJS.WriteStream;
  private inputHandler?: (data: string) => void;
  private resizeHandler?: () => void;
  private stdinDataHandler?: (data: string) => void;
  private wasRaw: boolean;
  private uiCursorRow: number;
  private uiMaxRows: number;

  public constructor(
    input: NodeJS.ReadStream = process.stdin,
    output: NodeJS.WriteStream = process.stderr.isTTY ? process.stderr : process.stdout,
  ) {
    this.input = input;
    this.output = output;
    this.wasRaw = input.isRaw ?? false;
    this.uiCursorRow = 0;
    this.uiMaxRows = 0;
  }

  public start(onInput: (data: string) => void, onResize: () => void): void {
    this.inputHandler = onInput;
    this.resizeHandler = onResize;

    this.wasRaw = this.input.isRaw ?? false;
    this.uiCursorRow = 0;
    this.uiMaxRows = 0;

    if (this.input.setRawMode !== undefined && this.input.isTTY) {
      this.input.setRawMode(true);
    }

    this.input.setEncoding("utf8");
    this.input.resume();

    this.stdinDataHandler = (data: string) => {
      this.inputHandler?.(data);
    };

    this.output.write("\x1b[?2004h");
    this.input.on("data", this.stdinDataHandler);
    this.output.on("resize", onResize);
  }

  public async drainInput(_maxMs?: number, _idleMs?: number): Promise<void> {}

  public stop(): void {
    this.output.write("\x1b[?2004l");

    if (this.stdinDataHandler !== undefined) {
      this.input.off("data", this.stdinDataHandler);
    }

    if (this.resizeHandler !== undefined) {
      this.output.off("resize", this.resizeHandler);
    }

    if (this.input.setRawMode !== undefined && this.input.isTTY) {
      this.input.setRawMode(this.wasRaw);
    }

    this.inputHandler = undefined;
    this.resizeHandler = undefined;
    this.stdinDataHandler = undefined;
  }

  private writeRaw(data: string): void {
    this.output.write(data);
  }

  private clearTrackedUiRegion(): void {
    if (this.uiMaxRows <= 0) {
      return;
    }

    if (this.uiCursorRow > 0) {
      this.writeRaw(`\x1b[${this.uiCursorRow}A`);
    }

    for (let lineIndex: number = 0; lineIndex < this.uiMaxRows; lineIndex += 1) {
      this.writeRaw("\r\x1b[2K");

      if (lineIndex < this.uiMaxRows - 1) {
        this.writeRaw("\x1b[1B");
      }
    }

    if (this.uiMaxRows > 1) {
      this.writeRaw(`\x1b[${this.uiMaxRows - 1}A`);
    }

    this.writeRaw("\r");
    this.uiCursorRow = 0;
    this.uiMaxRows = 0;
  }

  private updateCursorTracking(data: string): void {
    const sanitizedData: string = removeOscSequences(data);
    let index: number = 0;
    let cursorRow: number = this.uiCursorRow;

    while (index < sanitizedData.length) {
      if (sanitizedData.startsWith("\r\n", index)) {
        cursorRow += 1;
        index += 2;
        continue;
      }

      if (sanitizedData[index] === "\x1b") {
        if (sanitizedData.startsWith("\x1b[", index)) {
          const match = sanitizedData.slice(index).match(/^\x1b\[(?:\?)*([0-9;]*)([A-Za-z])/);
          if (match !== null) {
            const rawValue: string = match[1] ?? "";
            const command: string = match[2] ?? "";
            const numericValue: number = rawValue.length > 0 ? Number.parseInt(rawValue.split(";")[0] ?? "1", 10) : 1;
            const value: number = Number.isFinite(numericValue) ? numericValue : 1;

            if (command === "A") {
              cursorRow = Math.max(0, cursorRow - value);
            } else if (command === "B") {
              cursorRow += value;
            }

            index += match[0].length;
            continue;
          }
        }

        if (sanitizedData.startsWith("\x1b]", index)) {
          const terminatorIndex: number = sanitizedData.indexOf("\x07", index + 2);
          if (terminatorIndex !== -1) {
            index = terminatorIndex + 1;
            continue;
          }
        }
      }

      index += 1;
    }

    this.uiCursorRow = Math.max(0, cursorRow);
    this.uiMaxRows = Math.max(this.uiMaxRows, this.uiCursorRow + 1);
  }

  public write(data: string): void {
    let sanitizedData: string = data;

    if (sanitizedData.includes(CLEAR_VIEWPORT_AND_HOME_SEQUENCE)) {
      this.clearTrackedUiRegion();
      sanitizedData = sanitizedData.replaceAll(CLEAR_VIEWPORT_AND_HOME_SEQUENCE, "");
    }

    sanitizedData = sanitizedData.replaceAll(CLEAR_SCROLLBACK_SEQUENCE, "");
    this.writeRaw(sanitizedData);
    this.updateCursorTracking(sanitizedData);
  }

  public get columns(): number {
    return this.output.columns ?? process.stdout.columns ?? 80;
  }

  public get rows(): number {
    return this.output.rows ?? process.stdout.rows ?? 24;
  }

  public get kittyProtocolActive(): boolean {
    return false;
  }

  public moveBy(lines: number): void {
    if (lines > 0) {
      this.output.write(`\x1b[${lines}B`);
      return;
    }

    if (lines < 0) {
      this.output.write(`\x1b[${-lines}A`);
    }
  }

  public hideCursor(): void {
    this.output.write("\x1b[?25l");
  }

  public showCursor(): void {
    this.output.write("\x1b[?25h");
  }

  public clearLine(): void {
    this.output.write("\x1b[K");
  }

  public clearFromCursor(): void {
    this.output.write("\x1b[J");
  }

  public clearScreen(): void {
    this.output.write("\x1b[2J\x1b[H");
  }

  public setTitle(title: string): void {
    this.output.write(`\x1b]0;${title}\x07`);
  }

  public setProgress(_active: boolean): void {}
}
