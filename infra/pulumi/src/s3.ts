import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import type { ProjectConfig } from './config';

export interface UploadBucketResources {
  bucket: aws.s3.BucketV2;
}

export const createUploadBucket = (
  config: ProjectConfig,
  providerOpts: pulumi.ResourceOptions
): UploadBucketResources => {
  const uploadBucket = new aws.s3.BucketV2(
    `${config.resourcePrefix}-bucket`,
    {
      bucket: config.bucketName,
      forceDestroy: true,
    },
    providerOpts
  );

  new aws.s3.BucketCorsConfigurationV2(
    `${config.resourcePrefix}-bucket-cors`,
    {
      bucket: uploadBucket.id,
      corsRules: [
        {
          allowedHeaders: ['Content-Type'],
          allowedMethods: ['PUT', 'GET', 'HEAD'],
          allowedOrigins: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
          ],
          exposeHeaders: ['ETag'],
          maxAgeSeconds: 3600,
        },
      ],
    },
    providerOpts
  );

  // Object ACLs disabled; public access only via bucket policy (below).
  new aws.s3.BucketOwnershipControls(
    `${config.resourcePrefix}-bucket-ownership`,
    {
      bucket: uploadBucket.id,
      rule: {
        objectOwnership: 'BucketOwnerEnforced',
      },
    },
    providerOpts
  );

  const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
    `${config.resourcePrefix}-bucket-pab`,
    {
      bucket: uploadBucket.id,
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: false,
      restrictPublicBuckets: false,
    },
    providerOpts
  );

  new aws.s3.BucketPolicy(
    `${config.resourcePrefix}-bucket-policy`,
    {
      bucket: uploadBucket.id,
      policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "PublicReadVideosPrefix",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": [
              "${uploadBucket.arn}/videos/*/renditions/*",
              "${uploadBucket.arn}/videos/*/thumbnails/*",
              "${uploadBucket.arn}/videos/*/audio/*"
            ]
          }
        ]
      }`,
    },
    { ...providerOpts, dependsOn: [bucketPublicAccessBlock, uploadBucket] }
  );

  return { bucket: uploadBucket };
};

export const wireUploadBucketNotification = (
  config: ProjectConfig,
  bucket: aws.s3.BucketV2,
  lambdaFunction: aws.lambda.Function,
  invokePermission: aws.lambda.Permission,
  providerOpts: pulumi.ResourceOptions
) => {
  new aws.s3.BucketNotification(
    `${config.resourcePrefix}-bucket-notification`,
    {
      bucket: bucket.id,
      lambdaFunctions: [
        {
          lambdaFunctionArn: lambdaFunction.arn,
          events: ['s3:ObjectCreated:*'],
          filterPrefix: 'originals/',
        },
      ],
    },
    { ...providerOpts, dependsOn: [invokePermission] }
  );
};
