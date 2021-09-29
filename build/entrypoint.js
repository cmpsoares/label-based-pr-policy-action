"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const actions_toolkit_1 = require("actions-toolkit");
const args = {
    event: [
        'pull_request_review.submitted',
        'pull_request_review.edited',
        'pull_request_review.dismissed',
        'pull_request.synchronize',
    ],
    secrets: ['GITHUB_TOKEN'],
};
actions_toolkit_1.Toolkit.run(async (toolkit) => {
    var _a;
    toolkit.log.info('Running Action');
    const configPath = (_a = process.env.CONFIG_PATH) !== null && _a !== void 0 ? _a : '.github/label-requires-checks-reviews.yml';
    const rules = toolkit.config(configPath);
    toolkit.log.info('Configured rules: ', rules);
    // Get the repository information
    if (!process.env.GITHUB_EVENT_PATH) {
        toolkit.exit.failure('Process env GITHUB_EVENT_PATH is undefined');
    }
    const { owner, issue_number, repo } = (0, main_1.findRepositoryInformation)(process.env.GITHUB_EVENT_PATH, toolkit.log, toolkit.exit);
    const client = toolkit.github;
    const ref = toolkit.context.ref;
    toolkit.log.info(`Ref is ${ref}`);
    // Get the list of configuration rules for the labels on the issue
    const matchingRules = await (0, main_1.getRulesForLabels)({ owner, issue_number, repo }, client, rules);
    toolkit.log.info('Matching rules: ', matchingRules);
    // Get the required number of required reviews from the rules
    const requiredReviews = (0, main_1.getMaxReviewNumber)(matchingRules);
    const requiredChecks = (0, main_1.getAllRequiredChecks)(matchingRules);
    // Get the actual number of reviews from the issue
    const reviewCount = await (0, main_1.getCurrentReviewCount)({ owner, pull_number: issue_number, repo }, client);
    const jobName = process.env.GITHUB_JOB;
    const headRef = process.env.GITHUB_HEAD_REF;
    const initialWait = 30;
    const timeoutMinutes = process.env.TIMEOUT != null ? Number.parseInt(process.env.TIMEOUT) : 60;
    const timeout = timeoutMinutes * 60;
    const waitPerCycle = 15;
    const retries = timeout / waitPerCycle;
    const checkIfChecksSuccesful = await (0, main_1.checkIfRequiredCheckRunsAreSuccesful)({
        owner,
        repo,
        ref: headRef,
    }, client, jobName, requiredChecks, initialWait, waitPerCycle, retries);
    const currentSuccesfulChecks = await (0, main_1.getListOfCurrentSuccesfulCheckRuns)({
        owner,
        repo,
        ref: headRef,
    }, client, jobName, requiredChecks, 5, 10, 2);
    var compliant = true;
    if (reviewCount < requiredReviews) {
        compliant = false;
        toolkit.log.fatal(`Labels require ${requiredReviews} reviews but the PR only has ${reviewCount}`);
    }
    if (!checkIfChecksSuccesful) {
        compliant = false;
        toolkit.log.fatal(`Labels require [ ${requiredChecks} ] checks to be succesful but the PR only has [ ${currentSuccesfulChecks} ]`);
    }
    // TODO: Validate checks to be exactly equal
    if (!compliant) {
        toolkit.exit.failure(`Check failed due to the above-mentioned reasons.`);
    }
    else {
        toolkit.log.info(`Labels require ${requiredReviews} the PR has ${reviewCount}, and requires [ ${requiredChecks} ] checks and has [ ${currentSuccesfulChecks}] checks`);
    }
}, args);
//# sourceMappingURL=entrypoint.js.map