/**
 * recall pick — Interactive command picker
 */

import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { searchCommands, getRecentCommands, type Command } from '../db/commands.ts';
import { colors, formatHeader, formatRelativeTime, getIcons } from '../ui/index.ts';

export interface PickFlags {
  repo?: string;
  failedOnly?: boolean;
  query?: string;
}

export async function handlePick(flags: PickFlags): Promise<void> {
  // Fetch commands based on filters
  let commands: Command[] = [];

  if (flags.query) {
    commands = searchCommands({
      query: flags.query,
      repo_path_hash: flags.repo,
      failedOnly: flags.failedOnly,
      limit: 100,
    });
  } else {
    commands = getRecentCommands({
      repo_path_hash: flags.repo,
      limit: 100,
    });
  }

  if (commands.length === 0) {
    console.log(colors.dim('No commands found.'));
    return;
  }

  // Run interactive picker
  const selected = await runPicker(commands);

  if (selected) {
    // Print the selected command for shell to execute
    console.log(selected.raw_command);
  } else {
    console.log(colors.dim('No selection made.'));
  }
}

async function runPicker(commands: Command[]): Promise<Command | null> {
  let selectedIndex = 0;
  const visibleCount = 10;
  let windowStart = 0;

  const rl = createInterface({ input, output });

  // Hide cursor
  output.write('\x1B[?25l');

  const render = () => {
    const icons = getIcons();
    // Clear screen and move to top
    output.write('\x1B[2J\x1B[0f');

    console.log(formatHeader(`${icons.search} recall pick`));
    console.log('');
    console.log(colors.dim('  Use ↑/↓ to navigate, Enter to execute, Ctrl+C to cancel'));
    console.log('');

    // Calculate visible window
    if (selectedIndex < windowStart) {
      windowStart = selectedIndex;
    } else if (selectedIndex >= windowStart + visibleCount) {
      windowStart = selectedIndex - visibleCount + 1;
    }

    const visibleCommands = commands.slice(windowStart, windowStart + visibleCount);

    for (let i = 0; i < visibleCommands.length; i++) {
      const cmd = visibleCommands[i];
      const globalIndex = windowStart + i;
      const isSelected = globalIndex === selectedIndex;

      const prefix = isSelected ? `${colors.bold('>')} ` : '  ';
      const commandStr = isSelected ? colors.bold(cmd.raw_command) : cmd.raw_command;
      const metaStr = colors.dim(`  ${formatRelativeTime(cmd.created_at)}`);

      console.log(`${prefix}${commandStr}${metaStr}`);
    }

    // Show scrollbar indicator if needed
    if (commands.length > visibleCount) {
      const scrollPos = Math.floor((windowStart / (commands.length - visibleCount)) * 10);
      const scrollBar = '█'.repeat(scrollPos) + '░'.repeat(10 - scrollPos);
      console.log('');
      console.log(colors.dim(`  [${scrollBar}] ${windowStart + 1}-${Math.min(windowStart + visibleCount, commands.length)}/${commands.length}`));
    }
  };

  render();

  return new Promise((resolve) => {
    input.setRawMode(true);
    input.resume();

    input.on('data', (key) => {
      const keyStr = key.toString();

      if (keyStr === '\x03') { // Ctrl+C
        cleanup();
        resolve(null);
        return;
      }

      if (keyStr === '\r' || keyStr === '\n') { // Enter
        cleanup();
        resolve(commands[selectedIndex]);
        return;
      }

      if (keyStr === '\x1B[A') { // Up arrow
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
        return;
      }

      if (keyStr === '\x1B[B') { // Down arrow
        selectedIndex = Math.min(commands.length - 1, selectedIndex + 1);
        render();
        return;
      }

      if (keyStr === 'q' || keyStr === 'Q') { // q to quit
        cleanup();
        resolve(null);
        return;
      }
    });

    // Handle terminal resize
    const handleResize = () => {
      render();
    };

    process.on('SIGWINCH', handleResize);

    function cleanup() {
      input.setRawMode(false);
      input.pause();
      input.removeAllListeners('data');
      process.off('SIGWINCH', handleResize);
      rl.close();
      output.write('\x1B[?25h'); // Show cursor
      output.write('\x1B[2J\x1B[0f'); // Clear screen
    }
  });
}
