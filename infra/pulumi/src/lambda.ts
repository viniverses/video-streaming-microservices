import * as path from 'node:path';

import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import type { ProjectConfig } from './config';
import type { UploadNotifierRoleResources } from './iam';

export interface UploadNotifierLambdaResources {
  function: aws.lambda.Function;
  invokePermission: aws.lambda.Permission;
}

export const createUploadNotifierLambda = (
  config: ProjectConfig,
  bucket: aws.s3.BucketV2,
  roleResources: UploadNotifierRoleResources,
  providerOpts: pulumi.ResourceOptions
): UploadNotifierLambdaResources => {
  const lambdaCode = new pulumi.asset.FileArchive(
    path.dirname(config.uploadNotifierHandlerPath)
  );

  const uploadNotifierLambda = new aws.lambda.Function(
    `${config.resourcePrefix}-notifier`,
    {
      name: `${config.resourcePrefix}-notifier`,
      role: roleResources.role.arn,
      runtime: aws.lambda.Runtime.NodeJS18dX,
      handler: 'upload-notifier.handler',
      code: lambdaCode,
      timeout: 30,
      memorySize: 256,
      environment: {
        variables: {
          NODE_OPTIONS: '--enable-source-maps',
          UPLOAD_SERVICE_WEBHOOK_URL: config.uploadNotifierWebhookUrl,
        },
      },
    },
    {
      ...providerOpts,
      dependsOn: [
        roleResources.role,
        roleResources.logsPolicy,
        roleResources.s3ReadPolicy,
      ],
    }
  );

  const invokePermission = new aws.lambda.Permission(
    `${config.resourcePrefix}-s3-invoke-permission`,
    {
      action: 'lambda:InvokeFunction',
      function: uploadNotifierLambda.name,
      principal: 's3.amazonaws.com',
      sourceArn: bucket.arn,
    },
    { ...providerOpts, dependsOn: [uploadNotifierLambda] }
  );

  return { function: uploadNotifierLambda, invokePermission };
};
