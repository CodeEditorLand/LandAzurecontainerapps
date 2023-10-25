/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import type { KnownActiveRevisionsMode } from "@azure/arm-appcontainers";
import type { SetEnvironmentVariableOption } from "../constants";
import type { AzdTelemetryProps } from "./AzdTelemetryProps";
import type { WorkspaceFileTelemetryProps } from "./WorkspaceFileTelemetryProps";

export interface DeployRevisionDraftTelemetryProps extends Pick<AzdTelemetryProps, 'isAzdExtensionInstalled'> {
    revisionMode?: KnownActiveRevisionsMode;

    commandUpdatesCount?: string;  // Updates via revision draft commands
    directUpdatesCount?: string;  // Direct updates via 'editContainerApp' & 'editDraft'
}

export interface DeployWorkspaceProjectTelemetryProps extends AzdTelemetryProps, WorkspaceFileTelemetryProps {
    revisionMode?: KnownActiveRevisionsMode;

    // getDefaultContextValues
    hasWorkspaceProjectOpen?: 'true' | 'false';
    workspaceSettingsState?: 'none' | 'partial' | 'all';  // What level of workspace project settings did we detect on init?
    settingsOverride?: 'none' | 'triggered' | 'accepted';
    promptedForEnvironment?: 'true' | "false";
    promptDefaultNameReason?: 'invalid' | 'unavailable';

    // Resources
    existingResourceGroup?: 'true' | 'false';
    existingEnvironment?: 'true' | 'false';
    existingRegistry?: 'true' | 'false';
    existingContainerApp?: 'true' | 'false';
    existingLocation?: 'true' | 'false';

    // Environment variables
    setEnvironmentVariableOption?: SetEnvironmentVariableOption;  // EnvironmentVariablesListStep

    // Ingress
    dockerfileExposePortRangeCount?: string;  // IngressPromptStep
    dockerfileExposePort?: string;  // IngressPromptStep

    // Update
    hasUnsupportedFeatures?: 'true' | 'false';  // ContainerAppOverwriteConfirmStep

    // Save settings
    noNewSettings?: 'true' | 'false';  // ShouldSaveDeploySettingsPromptStep
    shouldSaveDeploySettings?: 'true' | 'false';  // ShouldSaveDeploySettingsPromptStep
    didSaveSettings?: 'true' | 'false';  // DeployWorkspaceProjectSaveSettingsStep - we swallow errors here, so log the outcome just in case
}

export interface DeployWorkspaceProjectNotificationTelemetryProps {
    userAction?: 'canceled' | 'browse' | 'viewOutput';
}