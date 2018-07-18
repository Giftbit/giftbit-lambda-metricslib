import * as awslambda from "aws-lambda";
import * as metrics from "datadog-metrics";
import { MetricsLibConfig } from "./MetricsLibConfig";
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
export declare function wrapLambdaHandler(options: WrapLambdaHandlerOptions): (evt: any, ctx: awslambda.Context) => Promise<any>;
/**
 * Get a list of tags for the given Lambda context.
 */
export declare function getLambdaContextTags(ctx: awslambda.Context): string[];
/**
 * Record the current value of a metric. The most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
export declare function gauge(key: string, value: number, tags?: string[], timestamp?: number | Date): void;
/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
export declare function increment(key: string, value?: number, tags?: string[], timestamp?: number | Date): void;
/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
export declare function histogram(key: string, value: number, tags?: string[], timestamp?: number | Date): void;
/**
 * Calling flush sends any buffered metrics to DataDog. Unless you set flushIntervalSeconds
 * to 0 it won't be necessary to call this function.
 * It can be useful to trigger a manual flush by calling if you want to make sure pending
 * metrics have been sent before you quit the application process, for example.
 */
export declare function flush(): Promise<void>;
