/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";

import { localize } from "../../../../utils/localize";
import { type IAddScaleRuleContext } from "./IAddScaleRuleContext";

export abstract class PositiveRealNumberBaseStep extends AzureWizardPromptStep<IAddScaleRuleContext> {
	public abstract prompt(context: IAddScaleRuleContext): Promise<void>;

	public abstract shouldPrompt(context: IAddScaleRuleContext): boolean;

	public validateInput(input: string | undefined): string | undefined {
		input = input ? input.trim() : "";

		const thirtyTwoBitMaxSafeInteger = 2147483647;

		if (!/^[1-9]+[0-9]*$/.test(input)) {
			return localize(
				"invalidPositiveRealNumber",
				"The number entered must be a whole number greater than or equal to 1.",
			);
		}

		if (Number(input) > thirtyTwoBitMaxSafeInteger) {
			return localize(
				"numberTooLarge",
				"The number entered is too large.",
			);
		}

		return undefined;
	}
}
