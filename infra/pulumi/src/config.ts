import * as path from 'node:path';

import * as pulumi from '@pulumi/pulumi';

export interface ProjectConfig {
  bucketName: string;
  resourcePrefix: string;
  uploadNotifierHandlerPath: string;
  uploadNotifierWebhookUrl: string;
}

export const loadProjectConfig = (): ProjectConfig => {
  const config = new pulumi.Config('project');
  const pulumiProjectRoot = path.resolve(__dirname, '..');

  return {
    bucketName: config.get('s3Bucket') ?? 'upload-service-bucket',
    resourcePrefix: `upload-service-${pulumi.getStack()}`,
    uploadNotifierHandlerPath: path.resolve(
      pulumiProjectRoot,
      config.require('lambdaDistDir'),
      'upload-notifier.mjs'
    ),
    uploadNotifierWebhookUrl: config.require('uploadWebhookUrl'),
  };
};
