import { loadProjectConfig } from './config';
import { createProviderOpts } from './provider';
import { createUploadInfra } from './upload-infra';

const config = loadProjectConfig();
const providerOpts = createProviderOpts();
const infra = createUploadInfra(config, providerOpts);

export const bucketName = infra.bucketName;
export const bucketArn = infra.bucketArn;
export const lambdaArn = infra.lambdaArn;
export const lambdaName = infra.lambdaName;
