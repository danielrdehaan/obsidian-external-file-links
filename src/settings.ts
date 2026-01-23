import { ExternalFileLinksSettings } from './types';

export const DEFAULT_SETTINGS: ExternalFileLinksSettings = {
	defaultDragBehavior: 'embed',
	defaultDropAction: 'external',
	alternateDropModifier: 'shift',
	imageMaxWidth: 0, // 0 means no max width
	pdfHeight: '600px',
	showMissingFilePlaceholder: true,
	logLevel: 'warn',
};
