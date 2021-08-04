import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";

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
