import * as pulumi from '@pulumi/pulumi';

import type { ProjectConfig } from './config';
import { createUploadNotifierRole } from './iam';
import { createUploadNotifierLambda } from './lambda';
import { createUploadBucket, wireUploadBucketNotification } from './s3';

export interface UploadInfraOutputs {
  bucketName: pulumi.Output<string>;
  bucketArn: pulumi.Output<string>;
  lambdaArn: pulumi.Output<string>;
  lambdaName: pulumi.Output<string>;
}

export const createUploadInfra = (
  config: ProjectConfig,
  providerOpts: pulumi.ResourceOptions
): UploadInfraOutputs => {
  const { bucket } = createUploadBucket(config, providerOpts);
  const roleResources = createUploadNotifierRole(config, bucket, providerOpts);
  const lambdaResources = createUploadNotifierLambda(
    config,
    bucket,
    roleResources,
    providerOpts
  );

  wireUploadBucketNotification(
    config,
    bucket,
    lambdaResources.function,
    lambdaResources.invokePermission,
    providerOpts
  );

  return {
    bucketName: bucket.bucket,
    bucketArn: bucket.arn,
    lambdaArn: lambdaResources.function.arn,
    lambdaName: lambdaResources.function.name,
  };
};
