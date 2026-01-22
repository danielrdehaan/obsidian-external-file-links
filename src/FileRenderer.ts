import { ExternalFileLinksSettings } from './types';
import { getFileType, getFileName, pathToFileUrl, createBlobUrl, fileExists } from './utils';
import { shell } from 'electron';

export interface RenderOptions {
	filePath: string;
	width?: number;
	isEmbed: boolean;
	linkText?: string;
	settings: ExternalFileLinksSettings;
}

export function renderExternalFile(options: RenderOptions): HTMLElement {
	const { filePath, width, isEmbed, linkText, settings } = options;

	// Don't pre-check file existence (fs doesn't work reliably in Obsidian)
	// Instead, rely on error handlers in the HTML elements

	if (!isEmbed) {
		return createClickableLink(filePath, linkText);
	}

	const fileType = getFileType(filePath);

	switch (fileType) {
		case 'image':
			return createImageEmbed(filePath, width, settings);
		case 'video':
			return createVideoEmbed(filePath, settings);
		case 'audio':
			return createAudioEmbed(filePath);
		case 'pdf':
			return createPdfEmbed(filePath, settings);
		default:
			return createClickableLink(filePath, linkText);
	}
}

function createImageEmbed(filePath: string, width: number | undefined, settings: ExternalFileLinksSettings): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-image');

	// Show loading state initially
	const loading = document.createElement('div');
	loading.addClass('external-file-loading');
	loading.textContent = 'Loading...';
	container.appendChild(loading);

	// Load the file asynchronously
	createBlobUrl(filePath).then((blobUrl) => {
		container.empty();

		const img = document.createElement('img');
		img.src = blobUrl;
		img.alt = getFileName(filePath);

		// Apply width from syntax or settings
		if (width) {
			img.style.maxWidth = `${width}px`;
		} else if (settings.imageMaxWidth > 0) {
			img.style.maxWidth = `${settings.imageMaxWidth}px`;
		}

		img.addEventListener('error', () => {
			container.empty();
			container.appendChild(createMissingFilePlaceholder(filePath));
		});

		container.appendChild(img);
	}).catch(() => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder(filePath));
	});

	return container;
}

function createVideoEmbed(filePath: string, settings: ExternalFileLinksSettings): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-video');

	// Show loading state initially
	const loading = document.createElement('div');
	loading.addClass('external-file-loading');
	loading.textContent = 'Loading video...';
	container.appendChild(loading);

	// Load the file asynchronously
	createBlobUrl(filePath).then((blobUrl) => {
		container.empty();

		const video = document.createElement('video');
		video.src = blobUrl;
		video.controls = true;
		video.preload = 'metadata';

		video.addEventListener('error', () => {
			container.empty();
			container.appendChild(createMissingFilePlaceholder(filePath));
		});

		container.appendChild(video);
	}).catch(() => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder(filePath));
	});

	return container;
}

function createAudioEmbed(filePath: string): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-audio');

	// Show loading state initially
	const loading = document.createElement('div');
	loading.addClass('external-file-loading');
	loading.textContent = 'Loading audio...';
	container.appendChild(loading);

	// Load the file asynchronously
	createBlobUrl(filePath).then((blobUrl) => {
		container.empty();

		const audio = document.createElement('audio');
		audio.src = blobUrl;
		audio.controls = true;
		audio.preload = 'metadata';

		audio.addEventListener('error', () => {
			container.empty();
			container.appendChild(createMissingFilePlaceholder(filePath));
		});

		container.appendChild(audio);
	}).catch(() => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder(filePath));
	});

	return container;
}

function createPdfEmbed(filePath: string, settings: ExternalFileLinksSettings): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-pdf');

	// Show loading state initially
	const loading = document.createElement('div');
	loading.addClass('external-file-loading');
	loading.textContent = 'Loading PDF...';
	container.appendChild(loading);

	// Load the file asynchronously
	createBlobUrl(filePath).then((blobUrl) => {
		container.empty();

		// Use object tag for PDFs as it handles blob URLs better
		const object = document.createElement('object');
		object.data = blobUrl;
		object.type = 'application/pdf';
		object.style.width = '100%';
		object.style.height = settings.pdfHeight;

		// Fallback content if PDF can't be displayed
		const fallback = document.createElement('p');
		fallback.textContent = 'PDF cannot be displayed. ';
		const link = document.createElement('a');
		link.href = '#';
		link.textContent = 'Click to open';
		link.addEventListener('click', (evt) => {
			evt.preventDefault();
			openExternalFile(filePath);
		});
		fallback.appendChild(link);
		object.appendChild(fallback);

		container.appendChild(object);
	}).catch(() => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder(filePath));
	});

	return container;
}

function createClickableLink(filePath: string, linkText?: string): HTMLElement {
	const container = document.createElement('span');
	container.addClass('external-file-link');

	const link = document.createElement('a');
	link.addClass('external-link');
	link.textContent = linkText || getFileName(filePath);
	link.href = '#';
	link.title = `Open ${filePath}`;

	link.addEventListener('click', (evt) => {
		evt.preventDefault();
		openExternalFile(filePath);
	});

	// Add file icon
	const icon = document.createElement('span');
	icon.addClass('external-file-icon');
	icon.innerHTML = getFileIcon(filePath);

	container.appendChild(icon);
	container.appendChild(link);

	return container;
}

function createMissingFilePlaceholder(filePath: string): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-missing');

	const icon = document.createElement('span');
	icon.addClass('external-file-missing-icon');
	icon.innerHTML = '⚠️';

	const text = document.createElement('span');
	text.addClass('external-file-missing-text');
	text.textContent = `File not found: ${getFileName(filePath)}`;

	const path = document.createElement('span');
	path.addClass('external-file-missing-path');
	path.textContent = filePath;

	container.appendChild(icon);
	container.appendChild(text);
	container.appendChild(path);

	return container;
}

function getFileIcon(filePath: string): string {
	const fileType = getFileType(filePath);
	switch (fileType) {
		case 'image':
			return '🖼️';
		case 'video':
			return '🎬';
		case 'audio':
			return '🎵';
		case 'pdf':
			return '📄';
		default:
			return '📎';
	}
}

export function openExternalFile(filePath: string): void {
	shell.openPath(filePath);
}
