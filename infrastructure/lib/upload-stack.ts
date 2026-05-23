import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

const ALLOWED_ORIGINS = [
  'https://wickedstickerz.com',
  'https://thewickedlab.com',
  'https://wicked-stickerz.myshopify.com',
];

export class UploadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Private S3 bucket — no public access, uploads readable only via presigned GET URLs
    const bucket = new s3.Bucket(this, 'UploadsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedHeaders: ['Content-Type'],
        allowedMethods: [s3.HttpMethods.PUT],
        allowedOrigins: ALLOWED_ORIGINS,
        maxAge: 300,
      }],
      lifecycleRules: [{
        id: 'expire-uploads-after-1-year',
        prefix: 'uploads/',
        expiration: cdk.Duration.days(365),
      }],
      // Retain bucket on stack deletion to avoid accidentally losing customer uploads
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lambda — bundled with esbuild via NodejsFunction (no manual zip needed)
    const presignFn = new NodejsFunction(this, 'PresignFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/presign/index.js'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      bundling: {
        // Bundle @aws-sdk v3 packages rather than relying on the runtime version
        externalModules: ['aws-sdk'],
      },
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    bucket.grantPut(presignFn, 'uploads/*');
    bucket.grantRead(presignFn, 'uploads/*');

    // HTTP API Gateway
    const api = new apigw.HttpApi(this, 'UploadApi', {
      apiName: 'wl-upload-api',
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.OPTIONS],
        allowOrigins: ALLOWED_ORIGINS,
        maxAge: cdk.Duration.seconds(300),
      },
    });

    // Set after api is created so the token resolves correctly at deploy time
    presignFn.addEnvironment('API_BASE_URL', api.apiEndpoint);

    const integration = new apigwIntegrations.HttpLambdaIntegration(
      'PresignIntegration',
      presignFn,
    );

    api.addRoutes({ path: '/presign', methods: [apigw.HttpMethod.GET], integration });
    api.addRoutes({ path: '/view',    methods: [apigw.HttpMethod.GET], integration });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.apiEndpoint,
      description: 'Paste into the Upload Endpoint URL setting in the Shopify theme editor',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });
  }
}
