import { TUI, type Terminal } from "@earendil-works/pi-tui";

import { QuickrunSelector } from "./selector.ts";
import type { QuickCommand } from "./types.ts";

export interface RunSelectorOptions {
  terminal: Terminal;
  cwd: string;
  commands: QuickCommand[];
}

export async function runSelector(options: RunSelectorOptions): Promise<string | null> {
  return await new Promise<string | null>((resolve, reject) => {
    try {
      const tui: TUI = new TUI(options.terminal);
      let settled: boolean = false;

      const finish = (result: string | null): void => {
        if (settled) {
          return;
        }

        settled = true;
        tui.stop();

        void options.terminal
          .drainInput(25, 5)
          .catch(() => undefined)
          .finally(() => {
            resolve(result);
          });
      };

      const selector: QuickrunSelector = new QuickrunSelector({
        cwd: options.cwd,
        commands: options.commands,
        onSelect: (command: QuickCommand) => {
          finish(command.command);
        },
        onCancel: () => {
          finish(null);
        },
      });

      tui.addChild(selector);
      tui.setFocus(selector);
      tui.start();
    } catch (error: unknown) {
      reject(error);
    }
  });
}
