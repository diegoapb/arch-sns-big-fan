import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_sub from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";

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
    const createdStatusQueue = new sqs.Queue(this, 'BigFanTopicStatusCreatedSubscriberQueue',{
      visibilityTimeout: Duration.seconds(300),
      queueName: 'BigFanTopicStatusCreatedSubscriberQueue',
    })

    // Solo envia mensajes a nuestra cola createdStatusQueue cuando el mensaje tenga estatus created
    topic.addSubscription(new sns_sub.SqsSubscription(createdStatusQueue, {
      rawMessageDelivery: true,
      filterPolicy: {
        status: sns.SubscriptionFilter.stringFilter({
          allowlist: ['created']
        })
      }
    }));

    // Subscriber for any other message
    const anyOtherStatusQueue = new sqs.Queue(this, 'BigFanTopicStatusAnyOtherSubscriberQueue',{
      visibilityTimeout: Duration.seconds(300),
      queueName: 'BigFanTopicStatusAnyOtherSubscriberQueue',
    })

    // Envia mensajes a nuestra cola anyOtherStatusQueue cuando el no tenga created en el status
    topic.addSubscription(new sns_sub.SqsSubscription(anyOtherStatusQueue, {
      rawMessageDelivery: true,
      filterPolicy: {
        status: sns.SubscriptionFilter.stringFilter({
          denylist: ['created']
        })
      }
    }));






  }
}
