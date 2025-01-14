/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type WorkspaceDeploymentConfigurationContext } from "../WorkspaceDeploymentConfigurationContext";
import { FilePathsVerifyStep } from "./FilePathsVerifyStep";

export class SrcValidateStep extends FilePathsVerifyStep {
	priority: number = 110;

	deploymentSettingskey = "srcPath" as const;

	contextKey = "srcPath" as const;

	fileType = "source code";

	public shouldExecute(
		context: WorkspaceDeploymentConfigurationContext,
	): boolean {
		return !context.srcPath;
	}
}
