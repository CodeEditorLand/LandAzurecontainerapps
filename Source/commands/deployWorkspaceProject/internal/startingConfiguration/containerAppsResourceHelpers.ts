/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	type ContainerAppsAPIClient,
	type ManagedEnvironment,
} from "@azure/arm-appcontainers";
import { type ResourceGroup } from "@azure/arm-resources";
import {
	getResourceGroupFromId,
	ResourceGroupListStep,
	uiUtils,
} from "@microsoft/vscode-azext-azureutils";
import {
	nonNullProp,
	type ISubscriptionActionContext,
} from "@microsoft/vscode-azext-utils";

import { type ContainerAppModel } from "../../../../tree/ContainerAppItem";
import { createContainerAppsAPIClient } from "../../../../utils/azureClients";

interface ContainerAppsResources {
	resourceGroup?: ResourceGroup;

	managedEnvironment?: ManagedEnvironment;

	containerApp?: ContainerAppModel;
}

export async function getResourcesFromContainerAppHelper(
	context: ISubscriptionActionContext,
	containerApp: ContainerAppModel,
): Promise<ContainerAppsResources> {
	const client: ContainerAppsAPIClient =
		await createContainerAppsAPIClient(context);

	const managedEnvironments: ManagedEnvironment[] =
		await uiUtils.listAllIterator(
			client.managedEnvironments.listBySubscription(),
		);

	const managedEnvironment = managedEnvironments.find(
		(env) => env.id === containerApp.managedEnvironmentId,
	);

	const resourceGroups: ResourceGroup[] =
		await ResourceGroupListStep.getResourceGroups(context);

	const resourceGroup = resourceGroups.find(
		(rg) => rg.name === containerApp.resourceGroup,
	);

	return {
		resourceGroup,
		managedEnvironment,
		containerApp,
	};
}

export async function getResourcesFromManagedEnvironmentHelper(
	context: ISubscriptionActionContext,
	managedEnvironment: ManagedEnvironment,
): Promise<ContainerAppsResources> {
	const resourceGroups: ResourceGroup[] =
		await ResourceGroupListStep.getResourceGroups(context);

	const resourceGroup = resourceGroups.find(
		(rg) =>
			rg.name ===
			getResourceGroupFromId(nonNullProp(managedEnvironment, "id")),
	);

	return {
		resourceGroup,
		managedEnvironment,
	};
}
