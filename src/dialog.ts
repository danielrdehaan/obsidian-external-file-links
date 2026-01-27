import { logger } from './logger';

function getElectronDialog(): any | null {
	try {
		const electron = require('electron');
		if (electron.remote?.dialog) return electron.remote.dialog;
	} catch { }

	try {
		return require('@electron/remote').dialog;
	} catch {
		logger.error('Could not access Electron dialog');
		return null;
	}
}

export async function selectExternalFile(title = 'Select External File'): Promise<string | null> {
	const dialog = getElectronDialog();
	if (!dialog) return null;

	try {
		const result = await dialog.showOpenDialog({
			title,
			properties: ['openFile'],
		});
		return (result.canceled || !result.filePaths.length) ? null : result.filePaths[0];
	} catch (error) {
		logger.error('Failed to open file dialog:', error);
		return null;
	}
}
