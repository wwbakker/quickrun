import type { Terminal } from "@earendil-works/pi-tui";

import { runSelector, type RunSelectorOptions } from "./app.ts";
import { commands } from "./commands.ts";
import { StdioTerminal } from "./stdio-terminal.ts";
import type { QuickCommand } from "./types.ts";

export interface WritableTextStream {
  write(chunk: string): unknown;
}

export type SelectorRunner = (options: RunSelectorOptions) => Promise<string | null>;

export interface RunCliOptions {
  terminal: Terminal;
  cwd: string;
  commands: QuickCommand[];
  stdout: WritableTextStream;
  stderr: WritableTextStream;
  runSelectorFn?: SelectorRunner;
}

export async function runCli(options: RunCliOptions): Promise<number> {
  const runSelectorFn: SelectorRunner = options.runSelectorFn ?? runSelector;

  try {
    const selectedCommand: string | null = await runSelectorFn({
      terminal: options.terminal,
      cwd: options.cwd,
      commands: options.commands,
    });

    if (selectedCommand !== null) {
      options.stdout.write(`${selectedCommand}\n`);
      return 0;
    }

    return 1;
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);
    options.stderr.write(`quickrun failed: ${message}\n`);
    return 1;
  }
}

export async function main(): Promise<number> {
  return await runCli({
    terminal: new StdioTerminal(),
    cwd: process.cwd(),
    commands,
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
