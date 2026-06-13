import { describe, expect, test } from "bun:test";

import type { Terminal } from "@earendil-works/pi-tui";

import { runSelector } from "../src/app.ts";
import { commands } from "../src/commands.ts";

class ImmediateCancelTerminal implements Terminal {
  private inputHandler?: (data: string) => void;
  private readonly width: number;
  private readonly height: number;

  public constructor(width: number = 80, height: number = 24) {
    this.width = width;
    this.height = height;
  }

  public start(onInput: (data: string) => void, _onResize: () => void): void {
    this.inputHandler = onInput;
    queueMicrotask(() => {
      this.inputHandler?.("\u0003");
    });
  }

  public stop(): void {
    this.inputHandler = undefined;
  }

  public async drainInput(_maxMs?: number, _idleMs?: number): Promise<void> {
    return await Promise.resolve();
  }

  public write(_data: string): void {}

  public get columns(): number {
    return this.width;
  }

  public get rows(): number {
    return this.height;
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

describe("phase 1 scaffold", () => {
  test("exports a typed example command registry", () => {
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]?.id).toBeString();
    expect(commands[0]?.title).toBeString();
    expect(commands[0]?.command).toBeString();
  });

  test("can start the selector with an injected terminal and cancel safely", async () => {
    const terminal: ImmediateCancelTerminal = new ImmediateCancelTerminal();

    const selectedCommand: string | null = await runSelector({
      terminal,
      cwd: "/tmp/quickrun-ts",
      commands,
    });

    expect(selectedCommand).toBeNull();
  });
});
