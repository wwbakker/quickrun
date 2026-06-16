import { Key, decodeKittyPrintable, matchesKey, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

import { filterCommandsByQuery } from "./search.ts";
import { isQuickGroup, type QuickAction, type QuickEntry, type QuickGroup } from "./types.ts";

const ANSI_RESET = "\x1b[0m";
const ANSI_TITLE = "\x1b[97m";
const ANSI_COMMAND = "\x1b[90m";
const ANSI_SELECTED_BACKGROUND = "\x1b[107m";
const ANSI_SELECTED_TITLE = "\x1b[30m";
const ANSI_SELECTED_COMMAND = "\x1b[90m";
const COMMAND_COLUMN_GAP = 2;
const GROUP_LABEL = "open group";

export interface QuickrunSelectorOptions {
  cwd: string;
  commands: readonly QuickEntry[];
  onSelect: (command: QuickAction) => void;
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

function getEntryCommand(entry: QuickEntry | QuickAction): string {
  return isQuickGroup(entry) ? GROUP_LABEL : entry.command;
}

function getTitleColumnWidth(commands: readonly (QuickEntry | QuickAction)[]): number {
  return commands.reduce((maxWidth: number, command: QuickEntry | QuickAction) => {
    return Math.max(maxWidth, visibleWidth(command.title));
  }, 0);
}

function getRowWidth(command: QuickEntry | QuickAction, titleColumnWidth: number): number {
  return titleColumnWidth + COMMAND_COLUMN_GAP + visibleWidth(getEntryCommand(command));
}

function padTitle(title: string, targetWidth: number): string {
  const paddingWidth: number = Math.max(0, targetWidth - visibleWidth(title));
  return `${title}${" ".repeat(paddingWidth)}`;
}

function formatCommandLine(
  command: QuickEntry | QuickAction,
  selected: boolean,
  titleColumnWidth: number,
  selectedRowWidth: number,
): string {
  const paddedTitle: string = padTitle(command.title, titleColumnWidth);
  const gap: string = " ".repeat(COMMAND_COLUMN_GAP);
  const renderedCommand: string = getEntryCommand(command);
  const trailingPaddingWidth: number = Math.max(0, selectedRowWidth - getRowWidth(command, titleColumnWidth));
  const trailingPadding: string = selected ? " ".repeat(trailingPaddingWidth) : "";

  if (selected) {
    return `${ANSI_SELECTED_BACKGROUND}${ANSI_SELECTED_TITLE}${paddedTitle}${gap}${ANSI_SELECTED_COMMAND}${renderedCommand}${trailingPadding}${ANSI_RESET}`;
  }

  return `${ANSI_TITLE}${paddedTitle}${ANSI_RESET}${gap}${ANSI_COMMAND}${renderedCommand}${ANSI_RESET}`;
}

/**
 * Searchable selector UI for project-scoped quick commands and groups.
 */
export class QuickrunSelector implements Component {
  private readonly commands: readonly QuickEntry[];
  private readonly onSelect: (command: QuickAction) => void;
  private readonly onCancel: () => void;
  private readonly requestRender: () => void;
  private activeGroup?: QuickGroup;
  private query: string;
  private visibleEntries: Array<QuickEntry | QuickAction>;
  private filteredCommands: Array<QuickEntry | QuickAction>;
  private selectedIndex: number;

  public constructor(options: QuickrunSelectorOptions) {
    this.commands = options.commands;
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    this.requestRender = options.requestRender;
    this.query = "";
    this.visibleEntries = [...this.commands];
    this.filteredCommands = filterCommandsByQuery(this.visibleEntries, this.query);
    this.selectedIndex = 0;
  }

  public invalidate(): void {}

  private updateFilteredCommands(): void {
    this.filteredCommands = filterCommandsByQuery(this.visibleEntries, this.query);
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

  private leaveGroup(): boolean {
    if (this.activeGroup === undefined) {
      return false;
    }

    this.activeGroup = undefined;
    this.query = "";
    this.visibleEntries = [...this.commands];
    this.updateFilteredCommands();
    this.requestRender();
    return true;
  }

  private deleteFromQuery(): void {
    if (this.query.length === 0) {
      void this.leaveGroup();
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

  private openGroup(group: QuickGroup): void {
    this.activeGroup = group;
    this.query = "";
    this.visibleEntries = [...group.commands];
    this.selectedIndex = 0;
    this.updateFilteredCommands();
    this.requestRender();
  }

  private selectCurrentEntry(): void {
    const command: QuickEntry | QuickAction | undefined = this.filteredCommands[this.selectedIndex];
    if (command === undefined) {
      return;
    }

    if (isQuickGroup(command)) {
      this.openGroup(command);
      return;
    }

    this.onSelect(command);
  }

  public handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("d"))) {
      if (!this.leaveGroup()) {
        this.onCancel();
      }
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
      this.selectCurrentEntry();
      return;
    }

    const printableCharacter: string | undefined = getPrintableCharacter(data);
    if (printableCharacter !== undefined) {
      this.appendToQuery(printableCharacter);
    }
  }

  public render(width: number): string[] {
    const activeGroupTitle: string | undefined = this.activeGroup?.title;
    const headerLines: string[] = activeGroupTitle === undefined ? [] : [truncateToWidth(`${ANSI_COMMAND}${activeGroupTitle}/${ANSI_RESET}`, width)];

    if (this.visibleEntries.length === 0) {
      const emptyState: string = activeGroupTitle === undefined
        ? "No commands are configured for this directory."
        : `The \"${activeGroupTitle}\" group is empty.`;
      return [...headerLines, truncateToWidth(emptyState, width)];
    }

    if (this.filteredCommands.length === 0) {
      const noResultsMessage: string = activeGroupTitle === undefined
        ? `No commands match \"${this.query}\".`
        : `No commands in \"${activeGroupTitle}\" match \"${this.query}\".`;
      return [...headerLines, truncateToWidth(noResultsMessage, width)];
    }

    const titleColumnWidth: number = getTitleColumnWidth(this.filteredCommands);
    const selectedRowWidth: number = width;

    return [
      ...headerLines,
      ...this.filteredCommands.map((command: QuickEntry | QuickAction, index: number) => {
        return truncateToWidth(formatCommandLine(command, index === this.selectedIndex, titleColumnWidth, selectedRowWidth), width);
      }),
    ];
  }
}
