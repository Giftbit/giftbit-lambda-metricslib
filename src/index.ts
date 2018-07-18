import * as awslambda from "aws-lambda";
import * as metrics from "datadog-metrics";
import {MetricsLibConfig} from "./MetricsLibConfig";

let initialized = false;
let afterInitThunks: (() => void)[] = [];

export interface WrapLambdaHandlerOptions {
    /**
     * The lambda handler to wrap.
     */
    handler: (evt: any, ctx: awslambda.Context) => Promise<any>;

    /**
     * The secure config with the api key.
     */
    secureConfig: Promise<MetricsLibConfig> | MetricsLibConfig;

    /**
     * Optional options for the metrics logger.  `apiKey` will be overridden.
     * `defaultTags` will be amended with tags from the Lambda context.
     */
    loggerOptions?: metrics.BufferedMetricsLoggerOptions;
}

/**
 * Get a Lambda handler that automatically initializes metrics.
 */
export function wrapLambdaHandler(options: WrapLambdaHandlerOptions): (evt: any, ctx: awslambda.Context) => Promise<any> {
    return async (evt: any, ctx: awslambda.Context): Promise<any> => {
        init(options, ctx).catch(err => console.error("sentry init error", err));
        return options.handler(evt, ctx);
    };
}

/**
 * Initialize manually with standard options.  Safe to call multiple times but actual
 * initialization only happens once.
 *
 * Metrics calls will be buffered until init is called.
 */
export async function init(options: WrapLambdaHandlerOptions, ctx: awslambda.Context): Promise<void> {
    if (initialized) {
        return;
    }

    const apiKeyObject = await options.secureConfig;
    if (!apiKeyObject.apiKey) {
        throw new Error("Stored DataDog API key object missing `apiKey` member.");
    }

    const loggerOptions = options.loggerOptions || {};
    const loggerOptionsTags = loggerOptions.defaultTags || [];

    metrics.init({
        ...loggerOptions,
        apiKey: apiKeyObject.apiKey,
        defaultTags: [...loggerOptionsTags, ...getLambdaContextTags(ctx)],
        prefix: loggerOptions.prefix || "gb.lambda."
    });
    initialized = true;
    afterInitThunks.forEach(thunk => thunk());
    afterInitThunks = [];
}

/**
 * Get a list of tags for the given Lambda context.
 */
export function getLambdaContextTags(ctx: awslambda.Context): string[] {
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
 * Record the current value of a metric. The most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
export function gauge(key: string, value: number, tags?: string[], timestamp?: number | Date): void {
    if (!initialized) {
        afterInitThunks.push(() => metrics.gauge(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.gauge(key, value, tags, getTimestampMillis(timestamp));
}

/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
export function increment(key: string, value: number = 1, tags?: string[], timestamp?: number | Date): void {
    if (!initialized) {
        afterInitThunks.push(() => metrics.increment(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.increment(key, value, tags, getTimestampMillis(timestamp));
}

/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
export function histogram(key: string, value: number, tags?: string[], timestamp?: number | Date): void {
    if (!initialized) {
        afterInitThunks.push(() => metrics.histogram(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.histogram(key, value, tags, getTimestampMillis(timestamp));
}

/**
 * Calling flush sends any buffered metrics to DataDog. Unless you set flushIntervalSeconds
 * to 0 it won't be necessary to call this function.
 * It can be useful to trigger a manual flush by calling if you want to make sure pending
 * metrics have been sent before you quit the application process, for example.
 */
export async function flush(): Promise<void> {
    if (!initialized) {
        await new Promise(resolve => afterInitThunks.push(resolve));
    }
    return await new Promise<void>((resolve, reject) => metrics.flush(resolve, reject));
}

function getTimestampMillis(timestamp?: number | Date): number | undefined {
    if (timestamp == null) {
        return undefined;
    }
    if (timestamp instanceof Date) {
        return timestamp.getTime();
    }
    if (typeof timestamp === "number") {
        return timestamp;
    }
    throw new Error("timestamp must a number, a Date, or undefined");
}
