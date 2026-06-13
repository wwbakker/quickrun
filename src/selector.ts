import { Key, decodeKittyPrintable, matchesKey, truncateToWidth, type Component } from "@earendil-works/pi-tui";

import { filterCommandsByQuery } from "./search.ts";
import type { QuickCommand } from "./types.ts";

export interface QuickrunSelectorOptions {
  cwd: string;
  commands: readonly QuickCommand[];
  onSelect: (command: QuickCommand) => void;
  onCancel: () => void;
  requestRender: () => void;
}

function clampSelectedIndex(selectedIndex: number, commandCount: number): number {
  if (commandCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(selectedIndex, 0), commandCount - 1);
}

function getPrintableCharacter(data: string): string | undefined {
  const decodedCharacter: string | undefined = decodeKittyPrintable(data);
  if (decodedCharacter !== undefined) {
    return decodedCharacter;
  }

  if (data.length === 1 && data >= " " && data !== "\u007f") {
    return data;
  }

  return undefined;
}

/**
 * Searchable selector UI for project-scoped quick commands.
 */
export class QuickrunSelector implements Component {
  private readonly cwd: string;
  private readonly commands: readonly QuickCommand[];
  private readonly onSelect: (command: QuickCommand) => void;
  private readonly onCancel: () => void;
  private readonly requestRender: () => void;
  private query: string;
  private filteredCommands: QuickCommand[];
  private selectedIndex: number;

  public constructor(options: QuickrunSelectorOptions) {
    this.cwd = options.cwd;
    this.commands = options.commands;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    this.requestRender = options.requestRender;
    this.query = "";
    this.filteredCommands = filterCommandsByQuery(this.commands, this.query);
    this.selectedIndex = 0;
  }

  public invalidate(): void {}

  private updateFilteredCommands(): void {
    this.filteredCommands = filterCommandsByQuery(this.commands, this.query);
    this.selectedIndex = clampSelectedIndex(this.selectedIndex, this.filteredCommands.length);
  }

  private moveSelection(nextIndex: number): void {
    const clampedIndex: number = clampSelectedIndex(nextIndex, this.filteredCommands.length);
    if (clampedIndex !== this.selectedIndex) {
      this.selectedIndex = clampedIndex;
      this.requestRender();
    }
  }

  private appendToQuery(inputCharacter: string): void {
    this.query += inputCharacter;
    this.updateFilteredCommands();
    this.requestRender();
  }

  private deleteFromQuery(): void {
    if (this.query.length === 0) {
      return;
    }

    this.query = this.query.slice(0, -1);
    this.updateFilteredCommands();
    this.requestRender();
  }

  public handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
      this.onCancel();
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.moveSelection(this.selectedIndex - 1);
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.moveSelection(this.selectedIndex + 1);
      return;
    }

    if (matchesKey(data, Key.backspace)) {
      this.deleteFromQuery();
      return;
    }

    if (matchesKey(data, Key.enter)) {
      const command: QuickCommand | undefined = this.filteredCommands[this.selectedIndex];
      if (command !== undefined) {
        this.onSelect(command);
      }
      return;
    }

    const printableCharacter: string | undefined = getPrintableCharacter(data);
    if (printableCharacter !== undefined) {
      this.appendToQuery(printableCharacter);
    }
  }

  public render(width: number): string[] {
    const lines: string[] = [
      "Quickrun",
      `cwd: ${this.cwd}`,
      `search: ${this.query}`,
      "Use ↑/↓ to move, Enter to select, Backspace to edit, Esc/Ctrl-C to cancel.",
      "",
    ];

    if (this.commands.length === 0) {
      lines.push("No commands are configured for this directory.");
      return lines.map((line: string) => truncateToWidth(line, width));
    }

    if (this.filteredCommands.length === 0) {
      lines.push(`No commands match \"${this.query}\".`);
      return lines.map((line: string) => truncateToWidth(line, width));
    }

    lines.push(`Showing ${this.filteredCommands.length} command${this.filteredCommands.length === 1 ? "" : "s"}.`);
    lines.push("");

    for (const [index, command] of this.filteredCommands.entries()) {
      const prefix: string = index === this.selectedIndex ? ">" : " ";
      lines.push(`${prefix} ${command.title}`);
      lines.push(`  ${command.command}`);

      if (command.description !== undefined) {
        lines.push(`  ${command.description}`);
      }

      if (command.tags !== undefined && command.tags.length > 0) {
        lines.push(`  tags: ${command.tags.join(", ")}`);
      }

      lines.push("");
    }

    return lines.map((line: string) => truncateToWidth(line, width));
  }
}
