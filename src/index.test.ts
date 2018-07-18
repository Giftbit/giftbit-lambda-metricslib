import * as awslambda from "aws-lambda";
import * as chai from "chai";
import * as datadogMetrics from "datadog-metrics";
import * as sinon from "sinon";
import * as metrics from "./index";

describe("index", () => {

    let sandbox: sinon.SinonSandbox;

    before(() => {
        process.env["DATADOG_API_KEY"] = "XXX";
        sandbox = sinon.createSandbox();
    });

    after(() => {
        delete process.env["DATADOG_API_KEY"];
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("wrapLambdaHandler()", () => {
        it("calls datadogMetrics.init() after the handler is called",  async () => {
            const apiKey = "asdf";
            const awsAccountId = "123456789012";
            const awsRegion = "us-west-2";
            const evtPayload = {
                b: "bravo"
            };
            const functionName = "fakeyhandler";
            const handlerPayload = {
                a: "alpha"
            };

            const stub = sandbox.stub(datadogMetrics, "init").callsFake((options: datadogMetrics.BufferedMetricsLoggerOptions) => {
                chai.assert.equal(options.apiKey, apiKey);
                chai.assert.sameMembers(options.defaultTags, [`functionname:${functionName}`, `resource:${functionName}`, `aws_account:${awsAccountId}`, `region:${awsRegion}`]);
            });

            const lambdaContext = {
                callbackWaitsForEmptyEventLoop: false,
                functionName,
                functionVersion: "1.0",
                invokedFunctionArn: `arn:aws:lambda:${awsRegion}:${awsAccountId}:function:${functionName}`,
                memoryLimitInMB: 128,
                awsRequestId: "awsRequestId",
                logGroupName: "logGroupName",
                logStreamName: "logStreamName"
            } as awslambda.Context;

            let handlerCalled = false;
            const wrappedHandler = metrics.wrapLambdaHandler({
                handler: async (evt: any, ctx: any) => {
                    chai.assert.deepEqual(evt, evtPayload);
                    chai.assert.deepEqual(ctx, lambdaContext);
                    handlerCalled = true;
                    return handlerPayload;
                },
                secureConfig: Promise.resolve({apiKey})
            });
            chai.assert.isFunction(wrappedHandler);
            chai.assert.isFalse(handlerCalled);

            const callResponse = await wrappedHandler(evtPayload, lambdaContext);
            chai.assert.isTrue(handlerCalled);
            chai.assert.deepEqual(callResponse, handlerPayload);
            chai.assert.equal(stub.callCount, 1);

            await wrappedHandler(evtPayload, lambdaContext);
            chai.assert.equal(stub.callCount, 1);
        });
    });

    describe("gauge()", () => {
        it("passes along all its arguments",  async () => {
            const stub = sandbox.stub(datadogMetrics, "gauge")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.gauge("mykey", 11, ["a", "b", "c"], 10101010);
            chai.assert.equal(stub.callCount, 1);
        });

        it("converts Date timestamps to numbers", () => {
            const stub = sandbox.stub(datadogMetrics, "gauge")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.gauge("mykey", 11, ["a", "b", "c"], new Date(10101010));
            chai.assert.equal(stub.callCount, 1);
        });
    });

    describe("increment()", () => {
        it("passes along all its arguments",  async () => {
            const stub = sandbox.stub(datadogMetrics, "increment")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.increment("mykey", 11, ["a", "b", "c"], 10101010);
            chai.assert.equal(stub.callCount, 1);
        });

        it("converts Date timestamps to numbers", () => {
            const stub = sandbox.stub(datadogMetrics, "increment")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.increment("mykey", 11, ["a", "b", "c"], new Date(10101010));
            chai.assert.equal(stub.callCount, 1);
        });
    });

    describe("histogram()", () => {
        it("passes along all its arguments",  async () => {
            const stub = sandbox.stub(datadogMetrics, "histogram")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.histogram("mykey", 11, ["a", "b", "c"], 10101010);
            chai.assert.equal(stub.callCount, 1);
        });

        it("converts Date timestamps to numbers", () => {
            const stub = sandbox.stub(datadogMetrics, "histogram")
                .callsFake((key: string, value: number, tags: string[], timestamp: number)  => {
                    chai.assert.equal(key, "mykey");
                    chai.assert.equal(value, 11);
                    chai.assert.deepEqual(tags, ["a", "b", "c"]);
                    chai.assert.equal(timestamp, 10101010);
                });

            metrics.histogram("mykey", 11, ["a", "b", "c"], new Date(10101010));
            chai.assert.equal(stub.callCount, 1);
        });
    });

    describe("getDefaultTags()", () => {
        it("gets functionname, resource, aws_account, region", () => {
            const ctx: awslambda.Context = {
                callbackWaitsForEmptyEventLoop: false,
                functionName: "MyTestingFunction",
                functionVersion: "1.0",
                invokedFunctionArn: "arn:aws:lambda:us-west-2:784593521445:function:MyTestingFunction",
                memoryLimitInMB: 128,
                awsRequestId: "asfikhughasjhlgasdjhgaf",
                logGroupName: "LoggyMcLoggerson",
                logStreamName: "LogStream2ElectricBoogaloo",
                getRemainingTimeInMillis: () => 0,
                done: () => {},
                fail: () => {},
                succeed: () => {}
            };

            const tags = metrics.getLambdaContextTags(ctx);
            chai.assert.sameMembers(tags, [
                "functionname:MyTestingFunction",
                "resource:MyTestingFunction",
                "aws_account:784593521445",
                "region:us-west-2"
            ]);
        });

        it("doesn't throw an exception if the invokedFunctionArn is malformed", () => {
            const ctx: awslambda.Context = {
                callbackWaitsForEmptyEventLoop: false,
                functionName: "MyTestingFunction",
                functionVersion: "1.0",
                invokedFunctionArn: "asdasdrafwraedd",
                memoryLimitInMB: 128,
                awsRequestId: "asfikhughasjhlgasdjhgaf",
                logGroupName: "LoggyMcLoggerson",
                logStreamName: "LogStream2ElectricBoogaloo",
                getRemainingTimeInMillis: () => 0,
                done: () => {},
                fail: () => {},
                succeed: () => {}
            };

            const tags = metrics.getLambdaContextTags(ctx);
            chai.assert.isArray(tags);
        });
    });
});
