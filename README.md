# giftbit-lamda-coms-lib [deprecated]

*Deprecated in favour of using Cloudwatch logs to send metrics to Datadog: https://docs.datadoghq.com/integrations/amazon_lambda/#using-cloudwatch-logs.* 

*For basic plug-and-play response logging, use the `MetricsRoute` in [giftbit-cassava-routes](https://github.com/Giftbit/giftbit-cassava-routes). To log custom metrics, use a log statement in the [specified format](https://docs.datadoghq.com/integrations/amazon_lambda/#using-cloudwatch-logs).*

------------------------------

Library for producing metrics in AWS Lambda.

## Requirements

- `node8.10` lambda execution environment

## Installation

`npm install git+ssh://git@github.com/Giftbit/giftbit-lambda-metricslib.git`

## Usage

### With cassava

This example uses cassava and records a count of the number of items fetched.  Metricslib is initialized automatically in the wrapped handler.

```typescript
import * as cassava from "cassava";
import * as giftbitRoutes from "giftbit-cassava-routes";
import * as metrics from "giftbit-lambda-metricslib";

const router = new cassava.Router();

router.route("/getSomeThings")
    .method("GET")
    .handler(async evt => {
        let items: any[];

        // ... populate items from the DB.

        metrics.increment("fetch.count", items.length);

        return {
            body: {
                items: items
            }
        };
    });

export const handler = metrics.wrapLambdaHandler({
    secureConfig: giftbitRoutes.secureConfig.fetchFromS3ByEnvVar("SECURE_CONFIG_BUCKET", "SECURE_CONFIG_KEY_DATADOG"),
    handler: router.getLambdaHandler()
});
```


### With giftbit-lambda-comslib

This example uses giftbit-lambda-comslib and records the time between when a Kinesis event is produced and when it's consumed.  Metricslib is initialized manually.

```typescript
import * as awslambda from "aws-lambda";
import * as comsLib from "giftbit-lambda-comslib";
import * as metrics from "giftbit-lambda-metricslib";


async function handler(evt: comsLib.aws.KinesisInputEvent, ctx: awslambda.Context): Promise<any> {
    metrics.init(
        {
            secureConfig: {
                apiKey: "xxx"
            }
        },
        ctx
    );

    if (evt.Records.length) {
        metrics.gauge("kinesis.latency", new Date().getTime() - evt.Records[evt.Records.length - 1].kinesis.approximateArrivalTimestamp * 1000);
    }

    // ... process mesages

    await metrics.flush();
    return "success";
}
```
