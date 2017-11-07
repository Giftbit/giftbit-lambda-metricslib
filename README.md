# giftbit-lamda-coms-lib
Library for producing metrics in AWS Lambda.

## Requirements

- `node4.3` lambda execution environment

## Installation

`npm install git+ssh://git@github.com/Giftbit/giftbit-lambda-metricslib.git`

## Usage

### With giftbit-lambda-comslib

This example uses giftbit-lambda-comslib and records the time between when a Kinesis event is produced and when it's consumed.

```typescript
import * as awslambda from "aws-lambda";
import * as comsLib from "giftbit-lambda-comslib";
import * as metrics from "giftbit-lambda-metricslib";


function handler(evt: comsLib.aws.KinesisInputEvent, ctx: awslambda.Context, callback: awslambda.Callback): void {
    metrics.init(
        process.env["SECURE_CONFIG_BUCKET"],        // the S3 bucket with the DataDog API key
        process.env["SECURE_CONFIG_KEY_DATADOG"],   // the S3 object key for the DataDog API key
        ctx
    );
    
    if (evt.Records.length) {
        metrics.gauge("kinesis.latency", new Date().getTime() - evt.Records[evt.Records.length - 1].kinesis.approximateArrivalTimestamp * 1000);
    }
    
    // ... process mesages

    metrics.flush().then(
        res => callback(null, "success"),
        err => callback(err)
    );
}
```

### With cassava

This example uses cassava and records a count of the number of items fetched.

```typescript
import * as cassava from "cassava";
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

// This is how cassava recommends exporting the handler without metrics.
// export const handler = router.getLambdaHandler();

export const handler = metrics.wrapLambdaHandler(
    process.env["SECURE_CONFIG_BUCKET"],        // the S3 bucket with the DataDog API key
    process.env["SECURE_CONFIG_KEY_DATADOG"],   // the S3 object key for the DataDog API key
    router.getLambdaHandler()                   // the cassava handler
);
```
