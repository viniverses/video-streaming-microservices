import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const LOCALSTACK_ENDPOINT = 'http://localhost:4566';

const createLocalstackProvider = (): aws.Provider =>
  new aws.Provider('localstack', {
    region: 'us-east-1',
    accessKey: 'test',
    secretKey: 'test',
    skipCredentialsValidation: true,
    skipRequestingAccountId: true,
    s3UsePathStyle: true,
    endpoints: [
      {
        s3: LOCALSTACK_ENDPOINT,
        lambda: LOCALSTACK_ENDPOINT,
        iam: LOCALSTACK_ENDPOINT,
        sts: LOCALSTACK_ENDPOINT,
      },
    ],
  });

export const createProviderOpts = (): pulumi.ResourceOptions => ({
  provider: createLocalstackProvider(),
});
