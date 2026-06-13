import { describe, expect, test } from "bun:test";

import { StdioTerminal } from "../src/stdio-terminal.ts";

class FakeInputStream {
  public isRaw: boolean = false;
  public isTTY: boolean = true;

  public setRawMode(_enabled: boolean): void {}
  public setEncoding(_encoding: BufferEncoding): void {}
  public resume(): void {}
  public on(_event: string, _handler: (...args: unknown[]) => void): void {}
  public off(_event: string, _handler: (...args: unknown[]) => void): void {}
}

class FakeOutputStream {
  public columns: number = 80;
  public rows: number = 24;
  public isTTY: boolean = true;
  public readonly writes: string[] = [];

  public write(chunk: string): number {
    this.writes.push(chunk);
    return chunk.length;
  }

  public on(_event: string, _handler: (...args: unknown[]) => void): void {}
  public off(_event: string, _handler: (...args: unknown[]) => void): void {}
}

describe("stdio terminal", () => {
  test("strips scrollback-clear sequences from TUI output", () => {
    const input = new FakeInputStream() as unknown as NodeJS.ReadStream;
    const output = new FakeOutputStream() as unknown as NodeJS.WriteStream;
    const terminal = new StdioTerminal(input, output);

    terminal.write("before\x1b[3Jafter\x1b[3J");

    const written = (output as unknown as FakeOutputStream).writes.join("");
    expect(written).toBe("beforeafter");
  });

  test("replaces full-screen clears with inline region clears", () => {
    const input = new FakeInputStream() as unknown as NodeJS.ReadStream;
    const output = new FakeOutputStream() as unknown as NodeJS.WriteStream;
    const terminal = new StdioTerminal(input, output);

    terminal.write("first\r\nsecond\r\nthird");
    terminal.write("\x1b[1A\rupdated second");
    terminal.write("\x1b[?2026h\x1b[2J\x1b[H\x1b[3Jnarrow\r\nview\x1b[?2026l");

    const written = (output as unknown as FakeOutputStream).writes.join("");
    expect(written).not.toContain("\x1b[2J\x1b[H");
    expect(written).not.toContain("\x1b[3J");
    expect(written).toContain("\x1b[1A");
    expect(written).toContain("\r\x1b[2K");
    expect(written).toContain("narrow\r\nview");
  });
});
