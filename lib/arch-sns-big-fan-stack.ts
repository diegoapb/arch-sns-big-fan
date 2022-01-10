import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_sub from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class ArchSnsBigFanStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * SNS Topic Creation
     * Nuestra api posteara mensages directamente en este topic
     */
    const topic = new sns.Topic(this, "theBigFanTopic", {
      displayName: "The Big Fan Topic CDK Pattern Topic",
    });

    /**
     * SQS Suscribers creation for our SNS Topic
     * 2 subscripciones, una para el mensaje con estatus de creado y una para cualquier otro mensaje
     */

    // Subscriber for the created message
    const createdStatusQueue = new sqs.Queue(
      this,
      "BigFanTopicStatusCreatedSubscriberQueue",
      {
        visibilityTimeout: Duration.seconds(300),
        queueName: "BigFanTopicStatusCreatedSubscriberQueue",
      }
    );

    // Solo envia mensajes a nuestra cola createdStatusQueue cuando el mensaje tenga estatus created
    topic.addSubscription(
      new sns_sub.SqsSubscription(createdStatusQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          status: sns.SubscriptionFilter.stringFilter({
            allowlist: ["created"],
          }),
        },
      })
    );

    // Subscriber for any other message
    const anyOtherStatusQueue = new sqs.Queue(
      this,
      "BigFanTopicStatusAnyOtherSubscriberQueue",
      {
        visibilityTimeout: Duration.seconds(300),
        queueName: "BigFanTopicStatusAnyOtherSubscriberQueue",
      }
    );

    // Envia mensajes a nuestra cola anyOtherStatusQueue cuando el no tenga created en el status
    topic.addSubscription(
      new sns_sub.SqsSubscription(anyOtherStatusQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          status: sns.SubscriptionFilter.stringFilter({
            denylist: ["created"],
          }),
        },
      })
    );

    /**
     * Creacion de lambdas que se suscribiran a nuestas queues anteriores
     */

    // Created status queue lambda
    const sqsCreatedStatusSubscribeLambda = new lambda.Function(
      this,
      "SQSCreatedStatusSubscribeLambdaHandler",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("lambda-fns/subscribe"),
        handler: "createdStatus.handler",
      }
    );
    // Otorga permisos para conusmir mensajes de una cola
    createdStatusQueue.grantSendMessages(sqsCreatedStatusSubscribeLambda);
    // hace que una cola sea fuente de eventos de una lambda
    sqsCreatedStatusSubscribeLambda.addEventSource(
      new SqsEventSource(createdStatusQueue, {})
    );

    // Any other status queue lambda
    const sqsAnyOtherStatusSubscribeLambda = new lambda.Function(
      this,
      "SQSAnyOtherStatusSubscribeLambdaHandler",
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        code: lambda.Code.fromAsset("lambda-fns/subscribe"),
        handler: "anyOtherStatus.handler",
      }
    );
    // Otorga permisos para conusmir mensajes de una cola
    anyOtherStatusQueue.grantConsumeMessages(sqsAnyOtherStatusSubscribeLambda);
    // hace que una cola sea fuente de eventos de una lambda
    sqsAnyOtherStatusSubscribeLambda.addEventSource(
      new SqsEventSource(anyOtherStatusQueue, {})
    );
  }
}
