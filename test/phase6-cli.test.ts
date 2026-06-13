import { describe, expect, test } from "bun:test";

import type { Terminal } from "@earendil-works/pi-tui";

import { runCli, type WritableTextStream } from "../src/cli.ts";
import type { QuickCommand } from "../src/types.ts";

class DummyTerminal implements Terminal {
  public start(_onInput: (data: string) => void, _onResize: () => void): void {}
  public stop(): void {}
  public async drainInput(_maxMs?: number, _idleMs?: number): Promise<void> {}
  public write(_data: string): void {}
  public get columns(): number {
    return 80;
  }
  public get rows(): number {
    return 24;
  }
  public get kittyProtocolActive(): boolean {
    return false;
  }
  public moveBy(_lines: number): void {}
  public hideCursor(): void {}
  public showCursor(): void {}
  public clearLine(): void {}
  public clearFromCursor(): void {}
  public clearScreen(): void {}
  public setTitle(_title: string): void {}
  public setProgress(_active: boolean): void {}
}

class MemoryStream implements WritableTextStream {
  public readonly writes: string[] = [];

  public write(chunk: string): number {
    this.writes.push(chunk);
    return chunk.length;
  }

  public get text(): string {
    return this.writes.join("");
  }
}

const commands: QuickCommand[] = [
  {
    title: "Run tests",
    command: "bun test",
    when: "**",
  },
];

describe("phase 6 CLI contract", () => {
  test("writes only the selected command to stdout", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode: number = await runCli({
      terminal: new DummyTerminal(),
      cwd: "/tmp/project",
      commands,
      stdout,
      stderr,
      runSelectorFn: async () => "bun test",
    });

    expect(exitCode).toBe(0);
    expect(stdout.text).toBe("bun test\n");
    expect(stderr.text).toBe("");
  });

  test("returns nonzero and prints nothing on cancel", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode: number = await runCli({
      terminal: new DummyTerminal(),
      cwd: "/tmp/project",
      commands,
      stdout,
      stderr,
      runSelectorFn: async () => null,
    });

    expect(exitCode).toBe(1);
    expect(stdout.text).toBe("");
    expect(stderr.text).toBe("");
  });

  test("sends failures to stderr only", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode: number = await runCli({
      terminal: new DummyTerminal(),
      cwd: "/tmp/project",
      commands,
      stdout,
      stderr,
      runSelectorFn: async () => {
        throw new Error("boom");
      },
    });

    expect(exitCode).toBe(1);
    expect(stdout.text).toBe("");
    expect(stderr.text).toContain("quickrun failed: boom");
  });
});
