import { Key, matchesKey, truncateToWidth, type Component } from "@earendil-works/pi-tui";

import type { QuickCommand } from "./types.ts";

export interface QuickrunSelectorOptions {
  cwd: string;
  commands: readonly QuickCommand[];
  onSelect: (command: QuickCommand) => void;
  onCancel: () => void;
}

/**
 * Phase 1 selector scaffold: enough structure to exercise terminal injection and
 * keep the production entrypoint decoupled from future search/navigation work.
 */
export class QuickrunSelector implements Component {
  private readonly cwd: string;
  private readonly commands: readonly QuickCommand[];
  private readonly onSelect: (command: QuickCommand) => void;
  private readonly onCancel: () => void;
  private selectedIndex: number;

  public constructor(options: QuickrunSelectorOptions) {
    this.cwd = options.cwd;
    this.commands = options.commands;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    this.selectedIndex = 0;
  }

  public invalidate(): void {}

  public handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
      this.onCancel();
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.selectedIndex = Math.min(this.commands.length - 1, this.selectedIndex + 1);
      return;
    }

    if (matchesKey(data, Key.enter)) {
      const command: QuickCommand | undefined = this.commands[this.selectedIndex];
      if (command !== undefined) {
        this.onSelect(command);
      }
    }
  }

  public render(width: number): string[] {
    const lines: string[] = [
      "Quickrun",
      `cwd: ${this.cwd}`,
      "",
      "Phase 1 scaffold: command registry + injected terminal wiring.",
      "Press Enter to emit the highlighted command, or Esc/Ctrl-C to cancel.",
      "",
    ];

    if (this.commands.length === 0) {
      lines.push("No configured commands are available yet.");
    } else {
      for (const [index, command] of this.commands.entries()) {
        const prefix: string = index === this.selectedIndex ? ">" : " ";
        lines.push(`${prefix} ${command.title}`);
        lines.push(`  ${command.command}`);
      }
    }

    return lines.map((line: string) => truncateToWidth(line, width));
  }
}
