"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws = require("aws-sdk");
const metrics = require("datadog-metrics");
let initted = false;
let afterInitThunks = [];
/**
 * Initialize with standard options.  Safe to call multiple times but actual
 * initialization only happens once.  This is the recommended method.
 *
 * Metrics calls will be buffered until init is called.
 *
 * @param apiKeyS3Bucket The S3 bucket holding the API key
 * @param apiKeyS3Key The S3 item key holding the API key
 * @param ctx The Lambda context object passed into the Lambda handler
 */
function init(apiKeyS3Bucket, apiKeyS3Key, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
exports.init = init;
/**
 * Create a Lambda handler that inits metrics and then calls the given Lambda handler.
 * @param apiKeyS3Bucket The S3 bucket holding the API key
 * @param apiKeyS3Key The S3 item key holding the API key
 * @param handler The handler to delegate to after init
 */
function wrapLambdaHandler(apiKeyS3Bucket, apiKeyS3Key, handler) {
    return (evt, ctx, callback) => {
        init(apiKeyS3Bucket, apiKeyS3Key, ctx).catch(err => console.error("metrics init error", err));
        handler(evt, ctx, callback);
    };
}
exports.wrapLambdaHandler = wrapLambdaHandler;
/**
 * Get a list of tags for the given Lambda context.
 */
function getDefaultTags(ctx) {
    const tags = [
        `functionname:${ctx.functionName}`,
        `resource:${ctx.functionName}`
    ];
    const accountMatcher = /arn:aws:lambda:([a-z0-9-]+):([0-9]+):.*/.exec(ctx.invokedFunctionArn);
    if (accountMatcher) {
        tags.push(`aws_account:${accountMatcher[2]}`, `region:${accountMatcher[1]}`);
    }
    return tags;
}
exports.getDefaultTags = getDefaultTags;
/**
 * Advanced initialization options offering full control.  Safe to call multiple
 * times but actual initialization only happens once.
 *
 * Metrics calls will be buffered until init is called.
 */
function initAdvanced(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (initted) {
            return;
        }
        if (options.apiKeyS3Bucket && options.apiKeyS3Key) {
            const s3 = new aws.S3({
                apiVersion: "2006-03-01",
                credentials: new aws.EnvironmentCredentials("AWS"),
                signatureVersion: "v4"
            });
            const s3Object = yield s3.getObject({
                Bucket: options.apiKeyS3Bucket,
                Key: options.apiKeyS3Key
            }).promise();
            const apiKeyObject = JSON.parse(s3Object.Body.toString());
            if (!apiKeyObject.apiKey) {
                throw new Error("Stored DataDog API key object missing `apiKey` member.");
            }
            options = Object.assign({}, options, { apiKey: apiKeyObject.apiKey });
        }
        metrics.init(options);
        initted = true;
        afterInitThunks.forEach(thunk => thunk());
        afterInitThunks = [];
    });
}
exports.initAdvanced = initAdvanced;
/**
 * Record the current value of a metric. The most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
function gauge(key, value, ...tags) {
    if (!initted) {
        afterInitThunks.push(() => metrics.gauge(key, value, ...tags));
        return;
    }
    metrics.gauge(key, value, ...tags);
}
exports.gauge = gauge;
/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
function increment(key, value = 1, ...tags) {
    if (!initted) {
        afterInitThunks.push(() => metrics.increment(key, value, ...tags));
        return;
    }
    metrics.increment(key, value, ...tags);
}
exports.increment = increment;
/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
function histogram(key, value, ...tags) {
    if (!initted) {
        afterInitThunks.push(() => metrics.histogram(key, value, ...tags));
        return;
    }
    metrics.histogram(key, value, ...tags);
}
exports.histogram = histogram;
/**
 * Calling flush sends any buffered metrics to DataDog. Unless you set flushIntervalSeconds
 * to 0 it won't be necessary to call this function.
 * It can be useful to trigger a manual flush by calling if you want to make sure pending
 * metrics have been sent before you quit the application process, for example.
 */
function flush() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!initted) {
            yield new Promise(resolve => afterInitThunks.push(resolve));
        }
        return yield new Promise((resolve, reject) => metrics.flush(resolve, reject));
    });
}
exports.flush = flush;
