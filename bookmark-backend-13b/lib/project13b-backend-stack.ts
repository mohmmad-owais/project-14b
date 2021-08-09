import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as CodePipeline from "@aws-cdk/aws-codepipeline";
import * as CodePipelineAction from "@aws-cdk/aws-codepipeline-actions";
import * as CodeBuild from "@aws-cdk/aws-codebuild";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deployment from "@aws-cdk/aws-s3-deployment";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";

export class Project13bStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // The code that defines your stack goes here
    const api = new appsync.GraphqlApi(this, "Api", {
      name: "cdk-bookmark-appsync-api",
      schema: appsync.Schema.fromAsset("graphql/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
      logConfig: { fieldLogLevel: appsync.FieldLogLevel.ALL },
      xrayEnabled: true,
    });

    //Deploy Gatsby on s3 bucket
    const myBucket = new s3.Bucket(this, "bookmarkBucket", {
      versioned: true,
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
    });

    const dist = new cloudfront.Distribution(this, "myDistribution", {
      defaultBehavior: { origin: new origins.S3Origin(myBucket) },
    });

    new s3Deployment.BucketDeployment(this, "deployBookmarkWebsite", {
      sources: [s3Deployment.Source.asset("../bookmark-frontend-13b/public")],
      destinationBucket: myBucket,
      distribution: dist,
    });

    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: dist.domainName,
    });

    const bookmarkLambda = new lambda.Function(this, "bookmarkLambda", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "main.handler",
      code: lambda.Code.fromAsset("functions"),
      memorySize: 1024,
    });
    // Grant the lambda permission to put custom events on eventbridge
    events.EventBus.grantAllPutEvents(bookmarkLambda);

    const consumerLambda = new lambda.Function(this, "consumerFunction", {
      code: lambda.Code.fromInline(
        "exports.handler = (event, context) => { console.log(event); context.succeed(event); }"
      ),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
    });

    const lambdaDs = api.addLambdaDataSource(
      "lambdaDatasource",
      bookmarkLambda
    );

    lambdaDs.createResolver({
      typeName: "Query",
      fieldName: "getBookmark",
    });

    lambdaDs.createResolver({
      typeName: "Mutation",
      fieldName: "addBookmark",
    });

    lambdaDs.createResolver({
      typeName: "Mutation",
      fieldName: "deleteBookmark",
    });

    const bookmarkTable = new ddb.Table(this, "CDKBookmarkTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
    });
    bookmarkTable.grantFullAccess(bookmarkLambda);
    bookmarkLambda.addEnvironment("BOOKMARK_TABLE", bookmarkTable.tableName);

    // Prints out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl,
    });

    // Prints out the AppSync GraphQL API key to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || "",
    });

    // Prints out the stack region to the terminal
    new cdk.CfnOutput(this, "Stack Region", {
      value: this.region,
    });

    // Artifact from source stage
    const sourceOutput = new CodePipeline.Artifact();

    // Artifact from build stage
    const S3Output = new CodePipeline.Artifact();

    //Code build action, Here you will define a complete build
    const s3Build = new CodeBuild.PipelineProject(this, "s3Build", {
      buildSpec: CodeBuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: 12,
            },
            commands: [
              "cd bookmark-frontend-13b",
              "npm i -g gatsby",
              "npm install",
            ],
          },
          build: {
            commands: ["npm run build"],
          },
        },
        artifacts: {
          "base-directory": "./bookmark-frontend-13b/public", ///outputting our generated Gatsby Build files to the public directory
          files: ["**/*"],
        },
      }),
      environment: {
        buildImage: CodeBuild.LinuxBuildImage.STANDARD_3_0, ///BuildImage version 3 because we are using nodejs environment 12
      },
    });

    const policy = new PolicyStatement();
    policy.addActions("s3:*");
    policy.addResources("*");

    s3Build.addToRolePolicy(policy);

    ///Define a pipeline
    const pipeline = new CodePipeline.Pipeline(this, "BookmarkPipeline", {
      crossAccountKeys: false, //Pipeline construct creates an AWS Key Management Service (AWS KMS) which cost $1/month. this will save your $1.
      restartExecutionOnUpdate: true, //Indicates whether to rerun the AWS CodePipeline pipeline after you update it.
    });

    ///Adding stages to pipeline

    //First Stage Source
    pipeline.addStage({
      stageName: "Source",
      actions: [
        new CodePipelineAction.GitHubSourceAction({
          actionName: "Checkout",
          owner: "mohmmad-owais",
          repo: "project-14b",
          oauthToken: cdk.SecretValue.plainText(
            "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"
          ), ///create token on github and save it on aws secret manager
          output: sourceOutput, ///Output will save in the sourceOutput Artifact
          branch: "main", ///Branch of your repo
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodePipelineAction.CodeBuildAction({
          actionName: "s3Build",
          project: s3Build,
          input: sourceOutput,
          outputs: [S3Output],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new CodePipelineAction.S3DeployAction({
          actionName: "s3Build",
          input: S3Output,
          bucket: myBucket,
        }),
      ],
    });

    // The rule that filters events to match country == "PK" and sends them to the consumer Lambda.
    const PKrule = new events.Rule(this, "bookmarkLambdaRule", {
      targets: [new targets.LambdaFunction(consumerLambda)],
      description:
        "Filter events that come from country PK and invoke lambda with it.",
      eventPattern: {
        source: ["bookmarkRule"],
      },
    });
  }
}
