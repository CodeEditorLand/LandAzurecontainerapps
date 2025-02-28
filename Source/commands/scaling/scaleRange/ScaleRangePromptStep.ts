/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";

import { localize } from "../../../utils/localize";
import { type ScaleRangeContext } from "./ScaleRangeContext";

const maxReplicas: number = 1000;

export class ScaleRangePromptStep extends AzureWizardPromptStep<ScaleRangeContext> {
	public async prompt(context: ScaleRangeContext): Promise<void> {
		const scaleRange: string = (
			await context.ui.showInputBox({
				prompt: localize(
					"editScalingRange",
					"Set the range of application replicas that get created in response to a scale rule. Set any range within the minimum of 0 and the maximum of {0} replicas",
					maxReplicas,
				),
				value: `${context.scaleMinRange}-${context.scaleMaxRange}`,
				validateInput: this.validateInput,
			})
		).trim();

		const [min, max] = scaleRange.split("-").map((range) => Number(range));

		context.newMinRange = min;

		context.newMaxRange = max;
	}

	public shouldPrompt(context: ScaleRangeContext): boolean {
		return !context.newMinRange || !context.newMaxRange;
	}

	private validateInput(range: string | undefined): string | undefined {
		const formatRegex = /^\d{1,3}-\d{1,4}$/;

		if (!range || !formatRegex.test(range)) {
			return localize(
				"enterRange",
				'Please enter the range in the following format "0-{0}"',
				maxReplicas,
			);
		}

		const [min, max] = range.split("-").map((range) => Number(range));

		if (min > maxReplicas || max > maxReplicas) {
			return localize(
				"maxRangeExceeded",
				"The maximum number of replicas is {0}.",
				maxReplicas,
			);
		} else if (min > max) {
			return localize(
				"minHigherThanMax",
				"The minimum range cannot be larger than the maximum range.",
			);
		} else if (max === 0) {
			return localize(
				"maxGreaterThan0",
				"The maximum replicas must be greater than 0.",
			);
		}

		return undefined;
	}
}
