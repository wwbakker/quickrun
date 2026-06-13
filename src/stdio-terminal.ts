import { visibleWidth, type Terminal } from "@earendil-works/pi-tui";

const CLEAR_VIEWPORT_AND_HOME_SEQUENCE = "\x1b[2J\x1b[H";
const CLEAR_SCROLLBACK_SEQUENCE = "\x1b[3J";
const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const OSC_PATTERN = /\x1b\][^\x07]*\x07/g;

type TrackedUiRenderer = () => string[];

function stripNonPrintingSequences(data: string): string {
  return data.replaceAll(OSC_PATTERN, "").replaceAll(ANSI_PATTERN, "");
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
  private trackedUiRenderer?: TrackedUiRenderer;
  private renderedUiLines: string[];

  public constructor(
    input: NodeJS.ReadStream = process.stdin,
    output: NodeJS.WriteStream = process.stderr.isTTY ? process.stderr : process.stdout,
  ) {
    this.input = input;
    this.output = output;
    this.wasRaw = input.isRaw ?? false;
    this.renderedUiLines = [];
  }

  public start(onInput: (data: string) => void, onResize: () => void): void {
    this.inputHandler = onInput;
    this.resizeHandler = onResize;

    this.wasRaw = this.input.isRaw ?? false;

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
    this.trackedUiRenderer = undefined;
    this.renderedUiLines = [];
  }

  public setTrackedUiRenderer(renderer: TrackedUiRenderer): void {
    this.trackedUiRenderer = renderer;
  }

  public clearTrackedUiRegion(): void {
    const physicalRows: number = this.getTrackedUiPhysicalRows();
    if (physicalRows <= 0) {
      return;
    }

    if (physicalRows > 1) {
      this.writeRaw(`\x1b[${physicalRows - 1}A`);
    }

    for (let lineIndex: number = 0; lineIndex < physicalRows; lineIndex += 1) {
      this.writeRaw("\r\x1b[2K");

      if (lineIndex < physicalRows - 1) {
        this.writeRaw("\x1b[1B");
      }
    }

    if (physicalRows > 1) {
      this.writeRaw(`\x1b[${physicalRows - 1}A`);
    }

    this.writeRaw("\r");
  }

  private writeRaw(data: string): void {
    this.output.write(data);
  }

  private getTrackedUiPhysicalRows(): number {
    const lines: string[] = this.renderedUiLines.length > 0
      ? this.renderedUiLines
      : this.trackedUiRenderer?.() ?? [];

    if (lines.length === 0) {
      return 0;
    }

    const columns: number = Math.max(1, this.columns);

    return lines.reduce((rowCount: number, line: string) => {
      const lineWidth: number = Math.max(0, visibleWidth(stripNonPrintingSequences(line)));
      return rowCount + Math.max(1, Math.ceil(lineWidth / columns));
    }, 0);
  }

  public write(data: string): void {
    let sanitizedData: string = data;

    if (sanitizedData.includes(CLEAR_VIEWPORT_AND_HOME_SEQUENCE)) {
      this.clearTrackedUiRegion();
      sanitizedData = sanitizedData.replaceAll(CLEAR_VIEWPORT_AND_HOME_SEQUENCE, "");
    }

    sanitizedData = sanitizedData.replaceAll(CLEAR_SCROLLBACK_SEQUENCE, "");
    this.writeRaw(sanitizedData);

    if (this.trackedUiRenderer !== undefined && sanitizedData.includes("\x1b[?2026l")) {
      this.renderedUiLines = this.trackedUiRenderer();
    }
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
