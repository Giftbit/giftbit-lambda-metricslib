# giftbit-lamda-coms-lib
Library for producing metrics in AWS Lambda.

## Requirements

- `node4.3` lambda execution environment

## Installation

`npm install git+ssh://git@github.com/Giftbit/giftbit-lambda-metricslib.git`

## Usage

```typescript
import * as awslambda from "aws-lambda";
import * as comsLib from "giftbit-lambda-comslib";
import * as metrics from "giftbit-lambda-metricslib";

// env var SECURE_CONFIG_BUCKET is the S3 bucket with the DataDog API key
// env var SECURE_CONFIG_KEY_DATADOG is the S3 object key for the DataDog API key

async function handleInputEvent(evt: comsLib.aws.KinesisInputEvent, ctx: awslambda.Context): Promise<any> {
    metrics.init(process.env["SECURE_CONFIG_BUCKET"], process.env["SECURE_CONFIG_KEY_DATADOG"], ctx);
    if (evt.Records.length) {
        metrics.gauge("kinesis.latency", new Date().getTime() - evt.Records[evt.Records.length - 1].kinesis.approximateArrivalTimestamp * 1000);
    }
    
    // ... process mesages

    await metrics.flush();
    return "success";
}

```
