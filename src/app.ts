import { TUI, type Terminal } from "@earendil-works/pi-tui";

import { filterCommandsForCwd } from "./match.ts";
import { QuickrunSelector } from "./selector.ts";
import type { QuickCommand } from "./types.ts";

interface TuiInternals {
  previousLines: string[];
  maxLinesRendered: number;
}

interface InlineUiTerminal {
  setTrackedUiRenderer(renderer: () => string[]): void;
  clearTrackedUiRegion(): void;
}

export interface RunSelectorOptions {
  terminal: Terminal;
  cwd: string;
  commands: QuickCommand[];
}

function isInlineUiTerminal(terminal: Terminal): terminal is Terminal & InlineUiTerminal {
  return "setTrackedUiRenderer" in terminal && "clearTrackedUiRegion" in terminal;
}

function clearRenderedUi(terminal: Terminal, lineCount: number): void {
  if (lineCount <= 0) {
    return;
  }

  terminal.moveBy(-(lineCount - 1));

  for (let lineIndex: number = 0; lineIndex < lineCount; lineIndex += 1) {
    terminal.write("\r");
    terminal.clearLine();

    if (lineIndex < lineCount - 1) {
      terminal.moveBy(1);
    }
  }

  terminal.moveBy(-(lineCount - 1));
  terminal.write("\r");
}

export async function runSelector(options: RunSelectorOptions): Promise<string | null> {
  return await new Promise<string | null>((resolve, reject) => {
    try {
      const tui: TUI = new TUI(options.terminal);
      const tuiInternals = tui as unknown as TuiInternals;
      const visibleCommands: QuickCommand[] = filterCommandsForCwd(options.commands, options.cwd);
      let settled: boolean = false;

      const selector: QuickrunSelector = new QuickrunSelector({
        cwd: options.cwd,
        commands: visibleCommands,
        onSelect: (command: QuickCommand) => {
          finish(command.command);
        },
        onCancel: () => {
          finish(null);
        },
        requestRender: () => {
          tui.requestRender();
        },
      });

      const finish = (result: string | null): void => {
        if (settled) {
          return;
        }

        settled = true;

        if (isInlineUiTerminal(options.terminal)) {
          options.terminal.clearTrackedUiRegion();
        } else {
          const lineCount: number = Math.max(
            selector.render(options.terminal.columns).length,
            tuiInternals.maxLinesRendered,
            tuiInternals.previousLines.length,
          );

          clearRenderedUi(options.terminal, lineCount);
        }

        tuiInternals.previousLines = [];
        tuiInternals.maxLinesRendered = 0;
        tui.stop();

        void options.terminal
          .drainInput(25, 5)
          .catch(() => undefined)
          .finally(() => {
            resolve(result);
          });
      };

      if (isInlineUiTerminal(options.terminal)) {
        options.terminal.setTrackedUiRenderer(() => selector.render(options.terminal.columns));
      }

      tui.addChild(selector);
      tui.setFocus(selector);
      tui.start();
    } catch (error: unknown) {
      reject(error);
    }
  });
}
