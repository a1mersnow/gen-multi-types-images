// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// @ts-ignore
import * as sharp from 'sharp';
const path = require('path');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gen-multi-types-images" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('gen-multi-types-images.generateImages', (uri: vscode.Uri) => {
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Generating',
			},
			async (progress) => {
				const sources: string[] = await collectSources(uri);
				if (sources.length === 0) {
					vscode.window.showErrorMessage('No supported files.');
					return;
				}
				for (const source of sources) {
					const parsed = vscode.Uri.parse(source);
					progress.report({ message: source.match(/[^\/\\]+$/)?.[0] });
					await transform(parsed);
				}
				vscode.window.showInformationMessage('Generating Done.');
			}
		);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function transform(uri: vscode.Uri) {
	const fs = vscode.workspace.fs;
	const input = await sharp(uri.fsPath);
	await input.jpeg({
    progressive: true,
  }).toBuffer().then((data: {buffer: Uint8Array}) => {
		return fs.writeFile(vscode.Uri.parse(uri.fsPath.replace(/\.[a-z]+$/, '.jpeg')), new Uint8Array(data.buffer));
	});
	await input.webp().toBuffer().then((data: {buffer: Uint8Array}) => {
		return fs.writeFile(vscode.Uri.parse(uri.fsPath.replace(/\.[a-z]+$/, '.webp')), new Uint8Array(data.buffer));
	});
	await input.avif().toBuffer().then((data: {buffer: Uint8Array}) => {
		return fs.writeFile(vscode.Uri.parse(uri.fsPath.replace(/\.[a-z]+$/, '.avif')), new Uint8Array(data.buffer));
	});
}

async function collectSources(uri: vscode.Uri) {
	const results: string[] = [];
	await _collectSources(uri, results);
	return results;
}

async function _collectSources(uri: vscode.Uri, results: string[]) {
	const fs = vscode.workspace.fs;
	const stat = await fs.stat(uri);
	if (stat.type === vscode.FileType.Directory) {
		const items = await fs.readDirectory(uri);
		for (let item of items) {
			await _collectSources(vscode.Uri.joinPath(uri, item[0]), results);
		}
	} else if (stat.type === vscode.FileType.File && isImage(uri.fsPath)) {
		results.push(uri.fsPath);
	}
}

function isImage(path: string): boolean {
	return ['.png', '.jpeg', '.jpg', '.webp', '.avif'].some(x => path.endsWith(x));
}
