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

    terminal.setTrackedUiRenderer(() => ["first", "second", "third"]);
    terminal.write("\x1b[?2026h\x1b[2J\x1b[H\x1b[3Jnarrow\r\nview\x1b[?2026l");

    const written = (output as unknown as FakeOutputStream).writes.join("");
    expect(written).not.toContain("\x1b[2J\x1b[H");
    expect(written).not.toContain("\x1b[3J");
    expect(written).toContain("\r\x1b[2K");
    expect(written).toContain("narrow\r\nview");
  });

  test("clears wrapped rows after a width shrink", () => {
    const input = new FakeInputStream() as unknown as NodeJS.ReadStream;
    const output = new FakeOutputStream() as unknown as NodeJS.WriteStream;
    const terminal = new StdioTerminal(input, output);

    terminal.setTrackedUiRenderer(() => ["123456789012", "abcdef"]);
    (output as unknown as FakeOutputStream).columns = 6;
    terminal.clearTrackedUiRegion();

    const written = (output as unknown as FakeOutputStream).writes.join("");
    const clearCount = written.split("\r\x1b[2K").length - 1;
    expect(clearCount).toBe(3);
    expect(written).toContain("\x1b[2A");
  });

  test("clears based on the last rendered UI, not the next renderer output", () => {
    const input = new FakeInputStream() as unknown as NodeJS.ReadStream;
    const output = new FakeOutputStream() as unknown as NodeJS.WriteStream;
    const terminal = new StdioTerminal(input, output);

    let lines: string[] = ["123456789012"];
    terminal.setTrackedUiRenderer(() => lines);
    terminal.write("\x1b[?2026h123456789012\x1b[?2026l");

    lines = ["short"];
    (output as unknown as FakeOutputStream).columns = 6;
    terminal.clearTrackedUiRegion();

    const written = (output as unknown as FakeOutputStream).writes.join("");
    const clearCount = written.split("\r\x1b[2K").length - 1;
    expect(clearCount).toBe(2);
  });
});
