/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	KnownActiveRevisionsMode,
	type Revision,
} from "@azure/arm-appcontainers";
import {
	AzureWizard,
	createSubscriptionContext,
	type ExecuteActivityContext,
	type IActionContext,
	type ISubscriptionContext,
} from "@microsoft/vscode-azext-utils";

import { ext } from "../../../extensionVariables";
import { type UpdateImageTelemetryProps as TelemetryProps } from "../../../telemetry/commandTelemetryProps";
import { type SetTelemetryProps } from "../../../telemetry/SetTelemetryProps";
import {
	type ContainerAppItem,
	type ContainerAppModel,
} from "../../../tree/ContainerAppItem";
import { type RevisionDraftItem } from "../../../tree/revisionManagement/RevisionDraftItem";
import { type RevisionItem } from "../../../tree/revisionManagement/RevisionItem";
import { createActivityContext } from "../../../utils/activityUtils";
import { getManagedEnvironmentFromContainerApp } from "../../../utils/getResourceUtils";
import { getVerifyProvidersStep } from "../../../utils/getVerifyProvidersStep";
import { localize } from "../../../utils/localize";
import { pickContainerApp } from "../../../utils/pickItem/pickContainerApp";
import {
	pickRevision,
	pickRevisionDraft,
} from "../../../utils/pickItem/pickRevision";
import { getParentResourceFromItem } from "../../../utils/revisionDraftUtils";
import { RevisionDraftDeployPromptStep } from "../../revisionDraft/RevisionDraftDeployPromptStep";
import { type ImageSourceBaseContext } from "../imageSource/ImageSourceContext";
import { ImageSourceListStep } from "../imageSource/ImageSourceListStep";
import { UpdateImageDraftStep } from "./UpdateImageDraftStep";
import { UpdateRegistryAndSecretsStep } from "./UpdateRegistryAndSecretsStep";

export type UpdateImageContext = ImageSourceBaseContext &
	ExecuteActivityContext &
	SetTelemetryProps<TelemetryProps>;

/**
 * An ACA exclusive command that updates the container app or revision's container image via revision draft.
 * The draft must be deployed for the changes to take effect and can be used to bundle together template changes.
 */
export async function updateImage(
	context: IActionContext,
	node?: ContainerAppItem | RevisionItem,
): Promise<void> {
	let item: ContainerAppItem | RevisionItem | RevisionDraftItem | undefined =
		node;

	if (!item) {
		const containerAppItem: ContainerAppItem =
			await pickContainerApp(context);

		if (
			containerAppItem.containerApp.revisionsMode ===
			KnownActiveRevisionsMode.Single
		) {
			item = containerAppItem;
		} else {
			if (
				ext.revisionDraftFileSystem.doesContainerAppsItemHaveRevisionDraft(
					containerAppItem,
				)
			) {
				item = await pickRevisionDraft(context, containerAppItem);
			} else {
				item = await pickRevision(context, containerAppItem);
			}
		}
	}

	const { subscription, containerApp } = item;

	const subscriptionContext: ISubscriptionContext =
		createSubscriptionContext(subscription);

	const wizardContext: UpdateImageContext = {
		...context,
		...subscriptionContext,
		...(await createActivityContext()),
		subscription,
		managedEnvironment: await getManagedEnvironmentFromContainerApp(
			{ ...context, ...subscriptionContext },
			containerApp,
		),
		containerApp,
	};

	wizardContext.telemetry.properties.revisionMode =
		containerApp.revisionsMode;

	const parentResource: ContainerAppModel | Revision =
		getParentResourceFromItem(item);

	const wizard: AzureWizard<UpdateImageContext> = new AzureWizard(
		wizardContext,
		{
			title: localize(
				"updateImage",
				'Update container image for "{0}" (draft)',
				parentResource.name,
			),
			promptSteps: [
				new ImageSourceListStep(),
				new RevisionDraftDeployPromptStep(),
			],
			executeSteps: [
				getVerifyProvidersStep<UpdateImageContext>(),
				new UpdateRegistryAndSecretsStep(),
				new UpdateImageDraftStep(item),
			],
			showLoadingPrompt: true,
		},
	);

	await wizard.prompt();

	await wizard.execute();
}
