import { Key, decodeKittyPrintable, matchesKey, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

import { filterCommandsByQuery } from "./search.ts";
import type { QuickCommand } from "./types.ts";

const ANSI_RESET = "\x1b[0m";
const ANSI_TITLE = "\x1b[97m";
const ANSI_COMMAND = "\x1b[90m";
const ANSI_SELECTED_BACKGROUND = "\x1b[107m";
const ANSI_SELECTED_TITLE = "\x1b[30m";
const ANSI_SELECTED_COMMAND = "\x1b[90m";
const COMMAND_COLUMN_GAP = 2;

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

function getTitleColumnWidth(commands: readonly QuickCommand[]): number {
  return commands.reduce((maxWidth: number, command: QuickCommand) => {
    return Math.max(maxWidth, visibleWidth(command.title));
  }, 0);
}

function getRowWidth(command: QuickCommand, titleColumnWidth: number): number {
  return titleColumnWidth + COMMAND_COLUMN_GAP + visibleWidth(command.command);
}

function padTitle(title: string, targetWidth: number): string {
  const paddingWidth: number = Math.max(0, targetWidth - visibleWidth(title));
  return `${title}${" ".repeat(paddingWidth)}`;
}

function formatCommandLine(
  command: QuickCommand,
  selected: boolean,
  titleColumnWidth: number,
  selectedRowWidth: number,
): string {
  const paddedTitle: string = padTitle(command.title, titleColumnWidth);
  const gap: string = " ".repeat(COMMAND_COLUMN_GAP);
  const trailingPaddingWidth: number = Math.max(0, selectedRowWidth - getRowWidth(command, titleColumnWidth));
  const trailingPadding: string = selected ? " ".repeat(trailingPaddingWidth) : "";

  if (selected) {
    return `${ANSI_SELECTED_BACKGROUND}${ANSI_SELECTED_TITLE}${paddedTitle}${gap}${ANSI_SELECTED_COMMAND}${command.command}${trailingPadding}${ANSI_RESET}`;
  }

  return `${ANSI_TITLE}${paddedTitle}${ANSI_RESET}${gap}${ANSI_COMMAND}${command.command}${ANSI_RESET}`;
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

  private clearQuery(): void {
    if (this.query.length === 0) {
      return;
    }

    this.query = "";
    this.updateFilteredCommands();
    this.requestRender();
  }

  public handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("d"))) {
      this.onCancel();
      return;
    }

    if (matchesKey(data, Key.ctrl("c"))) {
      this.clearQuery();
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
    if (this.commands.length === 0) {
      return [truncateToWidth("No commands are configured for this directory.", width)];
    }

    if (this.filteredCommands.length === 0) {
      return [truncateToWidth(`No commands match \"${this.query}\".`, width)];
    }

    const titleColumnWidth: number = getTitleColumnWidth(this.filteredCommands);
    const selectedRowWidth: number = width;

    return this.filteredCommands.map((command: QuickCommand, index: number) => {
      return truncateToWidth(formatCommandLine(command, index === this.selectedIndex, titleColumnWidth, selectedRowWidth), width);
    });
  }
}
