"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getListOfCurrentSuccesfulCheckRuns = exports.getCurrentReviewCount = exports.findRepositoryInformation = exports.getAllRequiredChecks = exports.getMaxReviewNumber = exports.getRulesForLabels = void 0;
// wait for a sec amount of seconds
const delay = async (sec) => new Promise((res) => setTimeout(res, sec * 1000));
// Get the maximum number of reviews based on the configuration and the issue labels
const getRulesForLabels = async (issuesListLabelsOnIssueParams, client, rules) => {
    return client.issues
        .listLabelsOnIssue(issuesListLabelsOnIssueParams)
        .then(({ data: labels }) => {
        return labels.reduce((acc, label) => acc.concat(label.name), []);
    })
        .then((issueLabels) => rules.filter((rule) => issueLabels.includes(rule.label)));
};
exports.getRulesForLabels = getRulesForLabels;
// Get the maximum number of reviews based on the configuration and the issue labels
const getMaxReviewNumber = (rules) => rules.reduce((acc, rule) => (rule.reviews > acc ? rule.reviews : acc), 0);
exports.getMaxReviewNumber = getMaxReviewNumber;
const getAllRequiredChecks = (rules) => {
    var requiredChecks;
    requiredChecks = [];
    rules.forEach(function (rule) {
        if (typeof rule.checks !== 'undefined' && rule.checks.length > 0) {
            rule.checks.forEach(function (check) {
                if (requiredChecks.indexOf(check) < 0) {
                    requiredChecks.push(check);
                }
            });
        }
    });
    return requiredChecks;
};
exports.getAllRequiredChecks = getAllRequiredChecks;
// Returns the repository information using provided gitHubEventPath
const findRepositoryInformation = (gitHubEventPath, log, exit) => {
    var _a;
    const payload = require(gitHubEventPath);
    if (((_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.number) === undefined) {
        exit.neutral('Action not triggered by a PullRequest review action. PR ID is missing');
    }
    log.info(`Checking labels for PR#${payload.pull_request.number}`);
    return {
        issue_number: payload.pull_request.number,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
    };
};
exports.findRepositoryInformation = findRepositoryInformation;
// Get the current review count from an issue
const getCurrentReviewCount = async (pullsListReviewsParams, client) => {
    return client.pulls
        .listReviews(pullsListReviewsParams)
        .then(({ data: reviews }) => {
        return reviews.reduce((acc, review) => (review.state === 'APPROVED' ? acc + 1 : acc), 0);
    });
};
exports.getCurrentReviewCount = getCurrentReviewCount;
// Get the current status for a specific check from a our pull commit ref
const getListOfCurrentSuccesfulCheckRuns = async (listCheckRunsForRefParams, client, currentJobName, initialWait = 360, timeout = 60, retries = 10) => {
    await delay(initialWait);
    var checkRunsListResponse = await client.checks.listForRef(listCheckRunsForRefParams);
    for (var i = 0; i < retries; i++) {
        if (checkRunsListResponse.data.total_count <= 1 ||
            checkRunsListResponse.data.check_runs.filter((check_run) => check_run.status.match('in_progress') === null).length <= 1) {
            await delay(timeout);
            checkRunsListResponse = await client.checks.listForRef(listCheckRunsForRefParams);
        }
    }
    var successArray = [];
    var checkRunsList = checkRunsListResponse.data.check_runs;
    checkRunsList.forEach((value) => {
        if (value.name.match(currentJobName.toString()) === null &&
            value.status.match('completed') &&
            value.conclusion.match('success')) {
            successArray.push(value.name);
        }
    });
    return successArray;
};
exports.getListOfCurrentSuccesfulCheckRuns = getListOfCurrentSuccesfulCheckRuns;
//# sourceMappingURL=main.js.map