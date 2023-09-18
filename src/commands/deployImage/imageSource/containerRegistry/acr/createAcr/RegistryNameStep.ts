/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient, RegistryNameStatus } from "@azure/arm-containerregistry";
import { AzureWizardPromptStep, ISubscriptionActionContext } from "@microsoft/vscode-azext-utils";
import { createContainerRegistryManagementClient } from "../../../../../../utils/azureClients";
import { localize } from "../../../../../../utils/localize";
import { CreateAcrContext } from "./CreateAcrContext";

export class RegistryNameStep extends AzureWizardPromptStep<CreateAcrContext> {
    public async prompt(context: CreateAcrContext): Promise<void> {
        context.newRegistryName = await context.ui.showInputBox({
            prompt: localize('registryName', 'Enter a name for the new registry'),
            validateInput: this.validateInput,
            asyncValidationTask: (value: string): Promise<string | undefined> => this.validateNameAvalability(context, value)
        });
    }

    public shouldPrompt(context: CreateAcrContext): boolean {
        return !context.newRegistryName;
    }

    private validateInput(name: string | undefined): string | undefined {
        name = name ? name.trim() : '';

        const { minLength, maxLength } = { minLength: 5, maxLength: 50 };
        if (name.length < minLength || name.length > maxLength) {
            return localize('validationLengthError', 'The name must be between {0} and {1} characters.', minLength, maxLength);
        } else if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
            return localize('validateInputError', `The name must consist of alphanumeric characters.`);
        }

        return undefined;
    }

    private async validateNameAvalability(context: CreateAcrContext, name: string) {
        if (!await RegistryNameStep.isNameAvailable(context, name)) {
            return localize('validateInputError', `The registry name ${name} is already in use.`);
        }

        return undefined;
    }

    public static async isNameAvailable(context: ISubscriptionActionContext, name: string): Promise<boolean> {
        const client: ContainerRegistryManagementClient = await createContainerRegistryManagementClient(context);
        const nameResponse: RegistryNameStatus = await client.registries.checkNameAvailability({ name: name, type: "Microsoft.ContainerRegistry/registries" });
        return !!nameResponse.nameAvailable;
    }
}
