import type { Terminal } from "@earendil-works/pi-tui";

/**
 * Minimal process-backed terminal that reads from stdin and writes UI output to a
 * chosen TTY stream. The CLI uses stderr by default so stdout remains clean for
 * shell wrappers that capture the selected command.
 */
export class StdioTerminal implements Terminal {
  private readonly input: NodeJS.ReadStream;
  private readonly output: NodeJS.WriteStream;
  private inputHandler?: (data: string) => void;
  private resizeHandler?: () => void;
  private stdinDataHandler?: (data: string) => void;
  private wasRaw: boolean;

  public constructor(
    input: NodeJS.ReadStream = process.stdin,
    output: NodeJS.WriteStream = process.stderr.isTTY ? process.stderr : process.stdout,
  ) {
    this.input = input;
    this.output = output;
    this.wasRaw = input.isRaw ?? false;
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
  }

  public write(data: string): void {
    this.output.write(data);
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
