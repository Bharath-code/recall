/**
 * recall pause — Pause command capture
 */

import { updateConfig, isCaptureEnabled } from '../config/index.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export function handlePause(): void {
  const icons = getIcons();

  if (!isCaptureEnabled()) {
    console.log(colors.dim('Capture is already paused.'));
    return;
  }

  updateConfig({ capture_enabled: false });
  console.log(formatHeader(`${icons.warn} recall pause`));
  console.log('');
  console.log(`  ${icons.check} ${colors.success('Capture paused')}`);
  console.log('');
  console.log(colors.dim('  Commands will not be captured until you run `recall resume`.'));
  console.log('');
}
