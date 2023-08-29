/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, nonNullProp } from "@microsoft/vscode-azext-utils";
import { localize } from "../../utils/localize";
import { IDeployWorkspaceProjectContext } from "./IDeployWorkspaceProjectContext";
import { IDeployWorkspaceProjectSettings, getDeployWorkspaceProjectSettings } from "./deployWorkspaceProjectSettings";

export class ShouldSaveDeploySettingsPromptStep extends AzureWizardPromptStep<IDeployWorkspaceProjectContext> {
    public async prompt(context: IDeployWorkspaceProjectContext): Promise<void> {
        const settings: IDeployWorkspaceProjectSettings | undefined = await getDeployWorkspaceProjectSettings(nonNullProp(context, 'rootFolder'));

        if (context.registry && settings?.containerRegistryName === context.registry.name && context.containerApp && settings?.containerAppName === context.containerApp.name) {
            // No new changes to save
            return;
        }

        const saveOrOverwrite: string = settings ? localize('overwrite', 'overwrite') : localize('save', 'save');
        const saveItem = { title: localize('saveItem', 'Save...') };
        const dontSaveItem = { title: localize('dontSaveItem', 'Don\'t Save...') };

        const userResponse = await context.ui.showWarningMessage(
            localize('saveWorkspaceSettings', `Would you like to ${saveOrOverwrite} your deployment configuration in local project settings?`),
            { modal: true },
            saveItem,
            dontSaveItem
        );

        context.shouldSaveDeploySettings = userResponse === saveItem;
    }

    public shouldPrompt(context: IDeployWorkspaceProjectContext): boolean {
        return context.shouldSaveDeploySettings === undefined;
    }
}
