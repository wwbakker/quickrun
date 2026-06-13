import { ProcessTerminal } from "@earendil-works/pi-tui";

import { runSelector } from "./app.ts";
import { commands } from "./commands.ts";

export async function main(): Promise<number> {
  const terminal: ProcessTerminal = new ProcessTerminal();

  try {
    const selectedCommand: string | null = await runSelector({
      terminal,
      cwd: process.cwd(),
      commands,
    });

    if (selectedCommand !== null) {
      process.stdout.write(`${selectedCommand}\n`);
      return 0;
    }

    return 1;
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);
    process.stderr.write(`quickrun failed: ${message}\n`);
    return 1;
  }
}
