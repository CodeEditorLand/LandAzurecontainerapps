/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	KnownActiveRevisionsMode,
	type Template,
} from "@azure/arm-appcontainers";
import {
	parseAzureResourceId,
	type ParsedAzureResourceId,
} from "@microsoft/vscode-azext-azureutils";
import { nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import {
	commands,
	Disposable,
	EventEmitter,
	FileChangeType,
	FileType,
	window,
	workspace,
	type Event,
	type FileChangeEvent,
	type FileStat,
	type FileSystemProvider,
	type TextDocument,
	type Uri,
} from "vscode";
import { URI } from "vscode-uri";

import { ext } from "../../extensionVariables";
import {
	ContainerAppItem,
	type ContainerAppModel,
} from "../../tree/ContainerAppItem";
import { type ContainerAppsItem } from "../../tree/ContainerAppsBranchDataProvider";
import { type RevisionsItemModel } from "../../tree/revisionManagement/RevisionItem";
import { RevisionsItem } from "../../tree/revisionManagement/RevisionsItem";
import { localize } from "../../utils/localize";

const notSupported: string = localize(
	"notSupported",
	"This operation is not currently supported.",
);

interface WriteFileOptions {
	readonly create?: boolean; // Existing FileSystemProvider option
	readonly overwrite?: boolean; // Existing FileSystemProvider option
	isCommandEntrypoint?: boolean;
}

export class RevisionDraftFile implements FileStat {
	type: FileType = FileType.File;

	size: number;

	ctime: number;

	mtime: number;

	contents: Uint8Array;

	commandUpdatesCount: number = 0; // Updates via revision draft commands
	directUpdatesCount: number = 0; // Direct updates via 'editContainerApp' & 'editDraft'

	constructor(
		contents: Uint8Array,
		readonly containerApp: ContainerAppModel,
		readonly baseRevisionName: string,
	) {
		this.contents = contents;

		this.size = contents.byteLength;

		this.ctime = Date.now();

		this.mtime = Date.now();
	}
}

/**
 * File system provider that allows for reading/writing/deploying container app revision drafts
 *
 * Enforces a policy of one revision draft per container app
 */
export class RevisionDraftFileSystem implements FileSystemProvider {
	static readonly scheme: string = "containerAppsRevisionDraft";

	private readonly emitter: EventEmitter<FileChangeEvent[]> =
		new EventEmitter<FileChangeEvent[]>();

	private readonly bufferedEvents: FileChangeEvent[] = [];

	private fireSoonHandle?: NodeJS.Timer;

	private draftStore: Map<string, RevisionDraftFile> = new Map();

	get onDidChangeFile(): Event<FileChangeEvent[]> {
		return this.emitter.event;
	}

	createRevisionDraft(item: ContainerAppItem | RevisionsItemModel): void {
		const uri: Uri = this.buildUriFromItem(item);

		if (this.draftStore.has(uri.path)) {
			return;
		}

		// Branching path reasoning: https://github.com/microsoft/vscode-azurecontainerapps/blob/main/src/commands/revisionDraft/README.md
		let file: RevisionDraftFile | undefined;

		if (
			ContainerAppItem.isContainerAppItem(item) ||
			item.containerApp.revisionsMode === KnownActiveRevisionsMode.Single
		) {
			const revisionContent: Uint8Array = Buffer.from(
				JSON.stringify(
					nonNullValueAndProp(item.containerApp, "template"),
					undefined,
					4,
				),
			);

			file = new RevisionDraftFile(
				revisionContent,
				item.containerApp,
				nonNullValueAndProp(item.containerApp, "latestRevisionName"),
			);
		} else {
			// A trick to help the draft item appear properly when the parent isn't already expanded (covers the command palette entrypoints)
			void ext.state.showCreatingChild(
				RevisionsItem.getRevisionsItemId(item.containerApp.id),
				localize("creatingDraft", "Creating draft..."),
				() => Promise.resolve(),
			);

			const revisionContent: Uint8Array = Buffer.from(
				JSON.stringify(
					nonNullValueAndProp(item.revision, "template"),
					undefined,
					4,
				),
			);

			file = new RevisionDraftFile(
				revisionContent,
				item.containerApp,
				nonNullValueAndProp(item.revision, "name"),
			);
		}

		// Currently the container app id reveals only the hidden container app resources, so we'll have to make due with expanding the parent for now
		void commands.executeCommand(
			"azureResourceGroups.revealResource",
			file.containerApp.managedEnvironmentId,
			{ select: false, expand: true },
		);

		this.draftStore.set(uri.path, file);

		this.fireSoon({ type: FileChangeType.Created, uri });
	}

	parseRevisionDraft(item: ContainerAppsItem): Template | undefined {
		const uri: URI = this.buildUriFromItem(item);

		if (!this.draftStore.has(uri.path)) {
			return undefined;
		}

		return JSON.parse(this.readFile(uri).toString()) as Template;
	}

	readFile(uri: Uri): Uint8Array {
		const contents = this.draftStore.get(uri.path)?.contents;

		return contents ? Buffer.from(contents) : Buffer.from("");
	}

	doesContainerAppsItemHaveRevisionDraft(item: ContainerAppsItem): boolean {
		const uri: Uri = this.buildUriFromItem(item);

		return this.draftStore.has(uri.path);
	}

	getRevisionDraftFile(
		item: ContainerAppsItem,
	): RevisionDraftFile | undefined {
		const uri: Uri = this.buildUriFromItem(item);

		return this.draftStore.get(uri.path);
	}

	stat(uri: Uri): FileStat {
		const file: RevisionDraftFile | undefined = this.draftStore.get(
			uri.path,
		);

		if (file) {
			return {
				type: file.type,
				ctime: file.ctime,
				mtime: file.mtime,
				size: file.size,
			};
		} else {
			return { type: FileType.File, ctime: 0, mtime: 0, size: 0 };
		}
	}

	async editRevisionDraft(
		item: ContainerAppItem | RevisionsItemModel,
	): Promise<void> {
		const uri: Uri = this.buildUriFromItem(item);

		if (!this.draftStore.has(uri.path)) {
			this.createRevisionDraft(item);
		}

		const textDoc: TextDocument = await workspace.openTextDocument(uri);

		await window.showTextDocument(textDoc);
	}

	writeFile(
		uri: Uri,
		contents: Uint8Array,
		options?: WriteFileOptions,
	): void {
		const file: RevisionDraftFile | undefined = this.draftStore.get(
			uri.path,
		);

		if (!file || Buffer.from(file.contents).equals(Buffer.from(contents))) {
			return;
		}

		if (options?.isCommandEntrypoint) {
			file.commandUpdatesCount++;
		} else {
			file.directUpdatesCount++;
		}

		file.contents = contents;

		file.size = contents.byteLength;

		file.mtime = Date.now();

		this.draftStore.set(uri.path, file);

		this.fireSoon({ type: FileChangeType.Changed, uri });

		// Currently the container app id reveals only the hidden container app resources, so we'll have to make due with expanding the parent for now
		void commands.executeCommand(
			"azureResourceGroups.revealResource",
			file.containerApp.managedEnvironmentId,
			{ select: false, expand: true },
		);

		ext.state.notifyChildrenChanged(file.containerApp.managedEnvironmentId);
	}

	updateRevisionDraftWithTemplate(
		item: ContainerAppItem | RevisionsItemModel,
		template: Template,
	): void {
		const uri: Uri = this.buildUriFromItem(item);

		if (!this.draftStore.has(uri.path)) {
			this.createRevisionDraft(item);
		}

		const newContent: Uint8Array = Buffer.from(
			JSON.stringify(template, undefined, 4),
		);

		this.writeFile(uri, newContent, { isCommandEntrypoint: true });
	}

	discardRevisionDraft(item: ContainerAppsItem): void {
		const uri: Uri = this.buildUriFromItem(item);

		if (!this.draftStore.has(uri.path)) {
			return;
		}

		this.delete(uri);
	}

	delete(uri: Uri): void {
		this.draftStore.delete(uri.path);

		this.fireSoon({ type: FileChangeType.Deleted, uri });
	}

	private buildUriFromItem(item: ContainerAppsItem): Uri {
		// Container app names are not globally unique, so we need to produce a unique ID for lookup
		const parsedResourceId: ParsedAzureResourceId = parseAzureResourceId(
			item.containerApp.id,
		);

		const shortenedContainerAppId: string = `${parsedResourceId.subscriptionId?.slice(0, 5)}.../resourceGroups/${parsedResourceId.resourceGroup}/containerApps/${parsedResourceId.resourceName}`;

		return URI.parse(
			`${RevisionDraftFileSystem.scheme}:/${shortenedContainerAppId}.containerapp-template.json`,
		);
	}

	// Adapted from: https://github.com/microsoft/vscode-extension-samples/blob/master/fsprovider-sample/src/fileSystemProvider.ts
	fireSoon(...events: FileChangeEvent[]): void {
		this.bufferedEvents.push(...events);

		if (this.fireSoonHandle) {
			clearTimeout(this.fireSoonHandle);
		}

		this.fireSoonHandle = setTimeout(() => {
			this.emitter.fire(this.bufferedEvents);

			this.bufferedEvents.length = 0;
		}, 5);
	}

	watch(): Disposable {
		return new Disposable((): void => {
			/** Do nothing */
		});
	}

	readDirectory(): [string, FileType][] {
		throw new Error(notSupported);
	}

	createDirectory(): void {
		throw new Error(notSupported);
	}

	rename(): void {
		throw new Error(notSupported);
	}
}
