# Quickrun Implementation Plan

This plan is designed to be worked through incrementally and checked off during implementation.

## Goal

Build a fast terminal utility that:
- shows a searchable list of user-configured commands,
- filters commands based on the current working directory,
- supports keyboard navigation,
- prints the selected command on `Enter`, and
- is intended to be wrapped by a `zsh` function that executes the selected command in the current shell.

## Confirmed product decisions

- [x] Use **Bun + TypeScript**
- [x] Use **`@earendil-works/pi-tui`** for the interactive terminal UI
- [x] Use a **global TypeScript configuration API** for commands
- [x] Use **glob patterns** to decide whether a command is shown for a given cwd
- [x] On selection, **print the command to stdout** rather than executing it as a child process
- [x] Support **`zsh` first** for shell integration
- [x] Add **integration tests** using a local copy of the upstream `VirtualTerminal` helper

---

## Phase 1: Project structure and types

- [x] Create a `src/` layout for implementation code
- [x] Move the current CLI entrypoint logic out of `index.ts` into focused modules
- [x] Add a shared `QuickCommand` type
- [x] Define the config API for command registration
- [x] Decide and document the default location of the built-in/global command registry for v1

### Proposed module layout

- `src/types.ts` — shared types
- `src/commands.ts` — global TypeScript command registry
- `src/match.ts` — cwd/glob matching
- `src/search.ts` — filtering/ranking
- `src/selector.ts` — TUI selector component
- `src/app.ts` — app orchestration with injected terminal
- `src/cli.ts` — production CLI entrypoint
- `index.ts` — thin startup wrapper or re-exported CLI entrypoint

### Acceptance criteria

- [x] The command/config API is typed and easy to edit manually
- [x] Non-UI logic is separated from terminal startup code
- [x] The interactive app can be started with an injected `Terminal`

---

## Phase 2: Command model and config API

- [x] Define the `QuickCommand` interface
- [x] Support required fields:
  - [x] `id`
  - [x] `title`
  - [x] `command`
  - [x] `when` (`string | string[]` glob patterns)
- [x] Support optional fields:
  - [x] `description`
  - [x] `tags`
- [x] Add a small example command registry for development/testing
- [x] Document how users should add/edit commands

### Suggested initial shape

```ts
export type QuickCommand = {
  id: string;
  title: string;
  command: string;
  when: string | string[];
  description?: string;
  tags?: string[];
};
```

### Acceptance criteria

- [x] Commands can be defined in plain TypeScript without extra tooling
- [x] The config supports multiple cwd globs per command
- [x] Example commands cover at least 2 different project patterns

---

## Phase 3: cwd matching

- [x] Choose a glob library or implementation strategy compatible with Bun
- [x] Normalize cwd values before matching
- [x] Normalize `~`/home-directory patterns if supported in config
- [x] Implement command visibility filtering for the current cwd
- [x] Decide whether matching is "any glob matches" for `when[]`
- [x] Add unit tests for matching behavior

### Matching rules for v1

- [x] A command is visible if **any** `when` glob matches the current cwd
- [x] Matching is deterministic and case handling is documented
- [x] Path normalization behavior is documented

### Acceptance criteria

- [x] Matching works for exact project paths
- [x] Matching works for nested directories inside a project
- [x] Non-matching commands are excluded before rendering

---

## Phase 4: Search and ranking

- [x] Implement case-insensitive search
- [x] Search across:
  - [x] `title`
  - [x] `command`
  - [x] `description`
  - [x] `tags`
- [x] Add lightweight ranking so better matches appear first
- [x] Define empty-query behavior
- [x] Define no-results behavior
- [x] Add unit tests for ranking/filtering

### Suggested v1 behavior

- [x] Empty query shows all cwd-matching commands
- [x] Exact or prefix matches in `title` rank above loose matches
- [x] Commands with matching tags/descriptions still appear, but below title hits

### Acceptance criteria

- [x] Typing immediately narrows the result list
- [x] Results remain stable and predictable
- [x] No-results state is clearly rendered

---

## Phase 5: TUI selector UI

- [x] Build a selector component using `@earendil-works/pi-tui`
- [x] Render a search input and result list together
- [x] Show matching commands immediately on startup
- [x] Support keyboard navigation:
  - [x] `Up`
  - [x] `Down`
  - [ ] optional `j` / `k`
- [x] Support selection on `Enter`
- [x] Support cancellation on `Esc`
- [x] Support cancellation on `Ctrl-C`
- [x] Preserve selection bounds when the filtered list changes
- [x] Render useful per-item text without overflowing terminal width
- [x] Decide the visible row format for each command

### Candidate row format

- [x] Primary line: `title`
- [x] Secondary line: `command`
- [x] Optional tertiary context: `description` or tags if space allows

### Acceptance criteria

- [x] UI is usable immediately after startup
- [x] Navigation feels responsive
- [x] The selected row is visually obvious
- [x] The component behaves correctly in narrow terminals

---

## Phase 6: App orchestration and CLI contract

- [x] Implement `runSelector(...)` or equivalent testable app API
- [x] Inject `Terminal`, cwd, and command list into the app
- [x] Return the selected command as a string result
- [x] Return `null` or equivalent on cancel
- [x] Ensure the production CLI prints **only** the selected command to stdout
- [x] Send non-result diagnostics to stderr only
- [x] Ensure cancel path prints nothing usable by the wrapper

### Proposed contract

```ts
type RunSelectorOptions = {
  terminal: Terminal;
  cwd: string;
  commands: QuickCommand[];
};

async function runSelector(options: RunSelectorOptions): Promise<string | null>
```

### Acceptance criteria

- [x] App logic is testable without a real terminal
- [x] Selection result is machine-capturable from stdout
- [x] Cancel behavior is safe for shell wrappers

---

## Phase 7: zsh integration

- [x] Add a documented `zsh` wrapper function
- [x] Capture the CLI stdout into a shell variable
- [x] No-op on cancel or empty output
- [x] Execute the selected command in the current shell via `eval`
- [x] Document installation steps for `.zshrc`
- [x] Document any quoting or safety caveats

### Example target workflow

```zsh
qr() {
  local cmd
  cmd="$(quickrun)" || return
  [[ -z "$cmd" ]] && return
  eval "$cmd"
}
```

### Acceptance criteria

- [x] Wrapper works in `zsh`
- [x] Selected command runs in the current shell context
- [x] Cancel does nothing

---

## Phase 8: Integration test harness

- [x] Add `@xterm/headless` as a dev dependency
- [x] Create `test/virtual-terminal.ts`
- [x] Base it on the upstream `pi` `VirtualTerminal` helper
- [x] Adapt imports so it uses the local installed `Terminal` type
- [x] Verify the helper supports:
  - [x] `sendInput(...)`
  - [x] `resize(...)`
  - [x] `flush()`
  - [x] `waitForRender()`
  - [x] `getViewport()`

### Acceptance criteria

- [x] Tests can drive the TUI without a real terminal
- [x] Rendered output can be inspected reliably
- [x] Keyboard input can be simulated deterministically

---

## Phase 9: Integration tests

- [x] Add an integration test for initial render
- [x] Add an integration test for cwd filtering
- [x] Add an integration test for typing into search
- [x] Add an integration test for arrow-key navigation
- [x] Add an integration test for `Enter` selection
- [x] Add an integration test for `Esc` cancel
- [x] Add an integration test for `Ctrl-C` cancel
- [x] Add an integration test for no-results behavior
- [x] Add an integration test for terminal resize behavior

### Specific scenarios to cover

- [x] Given a cwd, matching commands are visible immediately
- [x] Typing `dev` filters the list to dev-like commands
- [x] Moving down changes the selected item
- [x] Pressing `Enter` resolves the correct command string
- [x] Pressing `Esc` resolves `null`
- [x] When no commands match the query, the UI shows an empty state
- [x] Resizing the terminal keeps rendering valid and selection stable

### Acceptance criteria

- [x] Core interactive behavior is covered end-to-end
- [x] Tests are reliable enough for repeated agent-driven runs

---

## Phase 10: Unit tests

- [x] Add tests for command normalization
- [x] Add tests for glob matching
- [x] Add tests for home-directory expansion if supported
- [x] Add tests for ranking behavior
- [x] Add tests for selection-index clamping during filter changes
- [x] Add tests for CLI stdout/stderr behavior where practical

### Acceptance criteria

- [x] Matching and search logic are validated independently of the UI
- [x] Small regressions can be diagnosed without reading terminal snapshots

---

## Phase 11: Documentation and examples

- [x] Update `README.md` with project purpose
- [x] Add installation instructions
- [x] Add usage instructions
- [x] Add config examples
- [x] Add `zsh` integration instructions
- [x] Add testing instructions
- [x] Add screenshots or sample terminal output if useful

### README should answer

- [x] What is quickrun?
- [x] How do I define commands?
- [x] How does cwd matching work?
- [x] How do I run it manually?
- [x] How do I wire it into `zsh`?
- [x] How do I run the tests?

---

## Phase 12: Final verification

- [x] Run the full test suite with `bun test`
- [x] Manually smoke-test the CLI in a real terminal
- [x] Manually smoke-test the `zsh` wrapper
- [x] Verify stdout contains only the selected command
- [x] Verify cancel path is safe
- [x] Verify a narrow terminal still behaves acceptably

### Definition of done

- [x] The interactive selector works in a real terminal
- [x] Commands are filtered by cwd glob patterns
- [x] Search and keyboard navigation are responsive
- [x] `Enter` returns the intended command
- [x] `zsh` integration executes the chosen command in the current shell
- [x] Integration tests cover the critical interaction flow
- [x] The README is sufficient for first use

---

## Nice-to-have follow-ups

- [ ] Per-project command overrides
- [ ] Command history / frecency ranking
- [ ] Command grouping or sections
- [ ] Hidden/internal tags for ranking only
- [ ] Preview pane or extra metadata
- [ ] Multi-shell support beyond `zsh`
- [ ] Optional argument prompts/templates
- [ ] Importing commands from external config files later

---

## Notes for implementation

- Keep stdout clean: only emit the final command result there.
- Prefer stderr for status, diagnostics, and cancellation messaging.
- Build the app so the TUI can be tested through an injected terminal.
- Avoid coupling shell integration logic to the UI implementation.
- Start with a minimal, fast v1 and defer advanced ergonomics until after tests are in place.
