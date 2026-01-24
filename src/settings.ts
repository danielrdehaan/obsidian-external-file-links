import { ExternalFileLinksSettings, ModifierCombo } from './types';

// Helper to create a disabled combo (all false)
export const DISABLED_COMBO: ModifierCombo = { shift: false, ctrl: false, meta: false, alt: false };

export const DEFAULT_SETTINGS: ExternalFileLinksSettings = {
	defaultDropAction: 'external',
	defaultInsertStyle: 'embed',
	// Modifier key combinations for specific actions
	importModifier: { shift: true, ctrl: false, meta: false, alt: false },
	embedModifier: { shift: false, ctrl: false, meta: false, alt: false },
	linkModifier: { shift: false, ctrl: false, meta: true, alt: false },
	rawPathModifier: { shift: false, ctrl: false, meta: false, alt: false },
	// Display settings
	imageMaxWidth: 0, // 0 means no max width
	pdfHeight: '600px',
	showMissingFilePlaceholder: true,
	logLevel: 'warn',
};
