/**
 * recall resume — Resume command capture
 */

import { updateConfig, isCaptureEnabled } from '../config/index.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export function handleResume(): void {
  const icons = getIcons();

  if (isCaptureEnabled()) {
    console.log(colors.dim('Capture is already enabled.'));
    return;
  }

  updateConfig({ capture_enabled: true });
  console.log(formatHeader(`${icons.check} recall resume`));
  console.log('');
  console.log(`  ${icons.check} ${colors.success('Capture resumed')}`);
  console.log('');
  console.log(colors.dim('  Commands will now be captured again.'));
  console.log('');
}
