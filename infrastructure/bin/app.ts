import * as cdk from 'aws-cdk-lib';
import { UploadStack } from '../lib/upload-stack';

const app = new cdk.App();

new UploadStack(app, 'WickedLabUploadStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
