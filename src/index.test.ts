import * as awslambda from "aws-lambda";
import * as chai from "chai";
import {getDefaultTags} from "./index";

describe("getDefaultTags", () => {
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

        const tags = getDefaultTags(ctx);
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

        const tags = getDefaultTags(ctx);
        chai.assert.isArray(tags);
    });
});
