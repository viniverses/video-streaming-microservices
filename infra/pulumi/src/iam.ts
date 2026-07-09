import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import type { ProjectConfig } from './config';

export interface UploadNotifierRoleResources {
  role: aws.iam.Role;
  logsPolicy: aws.iam.RolePolicy;
  s3ReadPolicy: aws.iam.RolePolicy;
}

export const createUploadNotifierRole = (
  config: ProjectConfig,
  bucket: aws.s3.BucketV2,
  providerOpts: pulumi.ResourceOptions
): UploadNotifierRoleResources => {
  const lambdaRole = new aws.iam.Role(
    `${config.resourcePrefix}-lambda-role`,
    {
      name: `${config.resourcePrefix}-lambda-role`,
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      }),
    },
    providerOpts
  );

  // Minimum permission: CloudWatch logs
  const logsPolicy = new aws.iam.RolePolicy(
    `${config.resourcePrefix}-lambda-logs-policy`,
    {
      name: `${config.resourcePrefix}-lambda-logs`,
      role: lambdaRole.id,
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            Resource: 'arn:aws:logs:*:*:*',
          },
        ],
      }),
    },
    providerOpts
  );

  // Minimum permission: read the object that triggered the event
  const s3ReadPolicy = new aws.iam.RolePolicy(
    `${config.resourcePrefix}-lambda-s3-policy`,
    {
      name: `${config.resourcePrefix}-lambda-s3`,
      role: lambdaRole.id,
      policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": ["s3:GetObject", "s3:HeadObject"],
            "Resource": "${bucket.arn}/*"
          }
        ]
      }`,
    },
    providerOpts
  );

  return { role: lambdaRole, logsPolicy, s3ReadPolicy };
};
