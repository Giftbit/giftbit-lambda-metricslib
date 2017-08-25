import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda";
import * as metrics from "datadog-metrics";

let initted = false;
let afterInitThunks: (() => void)[] = [];

/**
 * Initialize with standard options.  Safe to call multiple times but actual
 * initialization only happens once.  This is the recommended method.
 *
 * Metrics calls will be buffered until init is called.
 */
export async function init(apiKeyS3Bucket: string, apiKeyS3Key: string, ctx: awslambda.Context): Promise<void> {
    if (!apiKeyS3Bucket) {
        throw new Error("apiKeyS3Bucket not set");
    }
    if (!apiKeyS3Key) {
        throw new Error("apiKeyS3Key not set");
    }

    return initAdvanced({
        apiKeyS3Bucket: apiKeyS3Bucket,
        apiKeyS3Key: apiKeyS3Key,
        defaultTags: getDefaultTags(ctx),
        prefix: "gb.lambda."
    });
}

/**
 * Get a list of tags for the given Lambda context.
 */
export function getDefaultTags(ctx: awslambda.Context): string[] {
    const tags = [
        `functionname:${ctx.functionName}`,
        `resource:${ctx.functionName}`
    ];

    const accountMatcher = /arn:aws:lambda:([a-z0-9-]+):([0-9]+):.*/.exec(ctx.invokedFunctionArn);
    if (accountMatcher) {
        tags.push(
            `aws_account:${accountMatcher[2]}`,
            `region:${accountMatcher[1]}`
        );
    }

    return tags;
}

/**
 * Advanced initialization options offering full control.  Safe to call multiple
 * times but actual initialization only happens once.
 *
 * Metrics calls will be buffered until init is called.
 */
export async function initAdvanced(options: AsyncBufferedMetricsLoggerOptions): Promise<void> {
    if (initted) {
        return;
    }

    if (options.apiKeyS3Bucket && options.apiKeyS3Key) {
        const s3 = new aws.S3({
            apiVersion: "2006-03-01",
            credentials: new aws.EnvironmentCredentials("AWS"),
            signatureVersion: "v4"
        });
        const s3Object = await s3.getObject({
            Bucket: options.apiKeyS3Bucket,
            Key: options.apiKeyS3Key
        }).promise();
        const apiKeyObject = JSON.parse(s3Object.Body.toString());
        if (!apiKeyObject.apiKey) {
            throw new Error("Stored DataDog API key object missing `apiKey` member.");
        }

        options = {
            ...options,
            apiKey: apiKeyObject.apiKey
        };
    }

    metrics.init(options);
    initted = true;
    afterInitThunks.forEach(thunk => thunk());
    afterInitThunks = [];
}

/**
 * Record the current value of a metric. The most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
export function gauge(key: string, value: number, ...tags: string[]): void {
    if (!initted) {
        afterInitThunks.push(() => metrics.gauge.apply(metrics, arguments));
        return;
    }
    metrics.gauge.apply(metrics, arguments);
}

/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
export function increment(key: string, value: number, ...tags: string[]): void {
    if (!initted) {
        afterInitThunks.push(() => metrics.increment.apply(metrics, arguments));
        return;
    }
    metrics.increment.apply(metrics, arguments);
}

/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
export function histogram(key: string, value: number, ...tags: string[]): void {
    if (!initted) {
        afterInitThunks.push(() => metrics.histogram.apply(metrics, arguments));
        return;
    }
    metrics.histogram.apply(metrics, arguments);
}

/**
 * Calling flush sends any buffered metrics to DataDog. Unless you set flushIntervalSeconds
 * to 0 it won't be necessary to call this function.
 * It can be useful to trigger a manual flush by calling if you want to make sure pending
 * metrics have been sent before you quit the application process, for example.
 */
export async function flush(): Promise<void> {
    if (!initted) {
        await new Promise(resolve => afterInitThunks.push(resolve));
    }
    return await new Promise<void>((resolve, reject) => metrics.flush(resolve, reject));
}

export interface AsyncBufferedMetricsLoggerOptions extends metrics.BufferedMetricsLoggerOptions {
    apiKeyS3Bucket?: string;
    apiKeyS3Key?: string;
}
