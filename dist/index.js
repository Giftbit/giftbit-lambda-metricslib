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
const metrics = require("datadog-metrics");
let initialized = false;
let afterInitThunks = [];
/**
 * Get a Lambda handler that automatically initializes metrics.
 */
function wrapLambdaHandler(options) {
    return (evt, ctx) => __awaiter(this, void 0, void 0, function* () {
        init(options, ctx).catch(err => console.error("sentry init error", err));
        return options.handler(evt, ctx);
    });
}
exports.wrapLambdaHandler = wrapLambdaHandler;
/**
 * Initialize manually with standard options.  Safe to call multiple times but actual
 * initialization only happens once.
 *
 * Metrics calls will be buffered until init is called.
 */
function init(options, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (initialized) {
            return;
        }
        const apiKeyObject = yield options.secureConfig;
        if (!apiKeyObject.apiKey) {
            throw new Error("Stored DataDog API key object missing `apiKey` member.");
        }
        const loggerOptions = options.loggerOptions || {};
        const loggerOptionsTags = loggerOptions.defaultTags || [];
        metrics.init(Object.assign({}, loggerOptions, { apiKey: apiKeyObject.apiKey, defaultTags: [...loggerOptionsTags, ...getLambdaContextTags(ctx)], prefix: loggerOptions.prefix || "gb.lambda." }));
        initialized = true;
        afterInitThunks.forEach(thunk => thunk());
        afterInitThunks = [];
    });
}
exports.init = init;
/**
 * Get a list of tags for the given Lambda context.
 */
function getLambdaContextTags(ctx) {
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
exports.getLambdaContextTags = getLambdaContextTags;
/**
 * Record the current value of a metric. The most recent value in a given flush
 * interval will be recorded. Optionally, specify a set of tags to associate with
 * the metric. This should be used for sum values such as total hard disk space,
 * process uptime, total number of active users, or number of rows in a database table.
 */
function gauge(key, value, tags, timestamp) {
    if (!initialized) {
        afterInitThunks.push(() => metrics.gauge(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.gauge(key, value, tags, getTimestampMillis(timestamp));
}
exports.gauge = gauge;
/**
 * Increment the counter by the given value (or 1 by default). Optionally, specify a
 * list of tags to associate with the metric. This is useful for counting things such
 * as incrementing a counter each time a page is requested.
 */
function increment(key, value = 1, tags, timestamp) {
    if (!initialized) {
        afterInitThunks.push(() => metrics.increment(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.increment(key, value, tags, getTimestampMillis(timestamp));
}
exports.increment = increment;
/**
 * Sample a histogram value. Histograms will produce metrics that describe the distribution
 * of the recorded values, namely the minimum, maximum, average, count and the 75th, 85th,
 * 95th and 99th percentiles. Optionally, specify a list of tags to associate with the metric.
 */
function histogram(key, value, tags, timestamp) {
    if (!initialized) {
        afterInitThunks.push(() => metrics.histogram(key, value, tags, getTimestampMillis(timestamp)));
        return;
    }
    metrics.histogram(key, value, tags, getTimestampMillis(timestamp));
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
        if (!initialized) {
            yield new Promise(resolve => afterInitThunks.push(resolve));
        }
        return yield new Promise((resolve, reject) => metrics.flush(resolve, reject));
    });
}
exports.flush = flush;
function getTimestampMillis(timestamp) {
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
