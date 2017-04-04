/// <reference path="../src/datadog-metrics.d.ts" />
import * as awslambda from "aws-lambda";
import * as metrics from "datadog-metrics";
/**
 * Initialize with standard options.  Safe to call multiple times but actual
 * initialization only happens once.  This is the recommended method.
 */
export declare function init(apiKeyS3Bucket: string, apiKeyS3Key: string, ctx: awslambda.Context): Promise<void>;
/**
 * Advanced initialization options offering full control.  Safe to call multiple
 * times but actual initialization only happens once.
 */
export declare function initAdvanced(options: AsyncBufferedMetricsLoggerOptions): Promise<void>;
/**
 * Record the current value of a metric. They most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
export declare function gauge(key: string, value: number, ...tags: string[]): void;
/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
export declare function increment(key: string, value: number, ...tags: string[]): void;
/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
export declare function histogram(key: string, value: number, ...tags: string[]): void;
/**
 * Calling flush sends any buffered metrics to DataDog. Unless you set flushIntervalSeconds
 * to 0 it won't be necessary to call this function.
 * It can be useful to trigger a manual flush by calling if you want to make sure pending
 * metrics have been sent before you quit the application process, for example.
 */
export declare function flush(): Promise<void>;
export interface AsyncBufferedMetricsLoggerOptions extends metrics.BufferedMetricsLoggerOptions {
    apiKeyS3Bucket?: string;
    apiKeyS3Key?: string;
}
