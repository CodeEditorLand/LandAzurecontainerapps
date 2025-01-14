/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { nonNullValue } from "@microsoft/vscode-azext-utils";

import { acrDomain, dockerHubDomain } from "../../../../constants";
import { type ContainerRegistryImageSourceContext } from "./ContainerRegistryImageSourceContext";

export function getLoginServer(
	context: ContainerRegistryImageSourceContext,
): string {
	switch (context.registryDomain) {
		case acrDomain:
			return nonNullValue(context.registry?.loginServer);

		case dockerHubDomain:
			return `${dockerHubDomain}/${context.dockerHubNamespace}`;

		default:
			return context.registryDomain || "";
	}
}
