import Octokit, { ChecksListForRefResponseCheckRunsItem } from '@octokit/rest'
import {
  Context,
  WebhookPayloadWithRepository,
} from 'actions-toolkit/lib/context'
import { Exit } from 'actions-toolkit/lib/exit'
import { GitHub } from 'actions-toolkit/lib/github'
import { LoggerFunc, Signale } from 'signale'
import {
  Rule,
  IssuesListLabelsOnIssueParams,
  IssuesListLabelsOnIssueResponse,
  PullsListReviewsParams,
  PullsListReviewsResponse,
  ListCheckRunsForRefParams,
} from './types'
import { wait } from './wait'

// wait for a sec amount of seconds
const delay = async (sec: number) =>
  new Promise((res) => setTimeout(res, sec * 1000))

//TODO: Change function to read a _default label for default settings when no label is configured

// Get the maximum number of reviews based on the configuration and the issue labels
export const getRulesForLabels = async (
  issuesListLabelsOnIssueParams: IssuesListLabelsOnIssueParams,
  client,
  rules: Rule[]
): Promise<Rule[]> => {
  return client.issues
    .listLabelsOnIssue(issuesListLabelsOnIssueParams)
    .then(({ data: labels }: IssuesListLabelsOnIssueResponse) => {
      return labels.reduce((acc, label) => acc.concat(label.name), [])
    })
    .then((issueLabels: string[]) =>
      rules.filter((rule) => issueLabels.includes(rule.label))
    )
}

// Get the maximum number of reviews based on the configuration and the issue labels
export const getMaxReviewNumber = (rules: Rule[]): number =>
  rules.reduce((acc, rule) => (rule.reviews > acc ? rule.reviews : acc), 0)

export const getAllRequiredChecks = (rules: Rule[]): String[] => {
  var requiredChecks: String[]
  requiredChecks = []
  rules.forEach(function (rule) {
    if (typeof rule.checks !== 'undefined' && rule.checks.length > 0) {
      rule.checks.forEach(function (check) {
        if (requiredChecks.indexOf(check) < 0) {
          requiredChecks.push(check)
        }
      })
    }
  })

  return requiredChecks
}

// Returns the repository information using provided gitHubEventPath
export const findRepositoryInformation = (
  gitHubEventPath: string,
  log: LoggerFunc & Signale,
  exit: Exit
): IssuesListLabelsOnIssueParams => {
  const payload: WebhookPayloadWithRepository = require(gitHubEventPath)
  if (payload.pull_request?.number === undefined) {
    exit.neutral(
      'Action not triggered by a PullRequest review action. PR ID is missing'
    )
  }
  log.info(`Checking labels for PR#${payload.pull_request.number}`)
  return {
    issue_number: payload.pull_request.number,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
  }
}

// Get the current review count from an issue
export const getCurrentReviewCount = async (
  pullsListReviewsParams: PullsListReviewsParams,
  client
): Promise<number> => {
  return client.pulls
    .listReviews(pullsListReviewsParams)
    .then(({ data: reviews }: PullsListReviewsResponse) => {
      return reviews.reduce(
        (acc, review) => (review.state === 'APPROVED' ? acc + 1 : acc),
        0
      )
    })
}

// Get the current status for a specific check from a our pull commit ref
export const getListOfCurrentSuccesfulCheckRuns = async (
  listCheckRunsForRefParams: ListCheckRunsForRefParams,
  client: GitHub,
  currentJobName: String,
  requiredChecks: String[],
  initialWait = 360,
  waitPerCycle = 60,
  retries = 10
): Promise<Array<String>> => {
  await delay(initialWait)
  var checkRunsListResponse = await client.checks.listForRef(
    listCheckRunsForRefParams
  )
  var currentHeadSha: string = checkRunsListResponse.data.check_runs[0].head_sha

  for (var i = 0; i < retries; i++) {
    if (
      (checkRunsListResponse.data.total_count <= 1 ||
        checkRunsListResponse.data.check_runs.filter(
          (check_run) => check_run.status.match('in_progress') === null
        ).length <= 1) &&
      checkRunsListResponse.data.check_runs[0].head_sha == currentHeadSha
    ) {
      var completedBreakOut: boolean = true
      requiredChecks.forEach((element) => {
        checkRunsListResponse.data.check_runs.forEach((check_run) => {
          completedBreakOut =
            completedBreakOut &&
            check_run.name.match(element.toString()) != null &&
            check_run.status.match('completed') != null
        })
      })
      if (completedBreakOut) break

      await delay(waitPerCycle)
      checkRunsListResponse = await client.checks.listForRef(
        listCheckRunsForRefParams
      )
    }
  }

  var successArray: String[] = []
  var checkRunsList: Array<ChecksListForRefResponseCheckRunsItem> =
    checkRunsListResponse.data.check_runs
  checkRunsList.forEach((value) => {
    if (
      value.name.match(currentJobName.toString()) === null &&
      value.status.match('completed') &&
      value.conclusion.match('success')
    ) {
      successArray.push(value.name)
    }
  })

  return successArray
}

// Validate if required checks are all succesfull or not
export const checkIfRequiredCheckRunsAreSuccesful = async (
  listCheckRunsForRefParams: ListCheckRunsForRefParams,
  client: GitHub,
  currentJobName: String,
  requiredChecks: String[],
  initialWait = 360,
  waitPerCycle = 60,
  retries = 10
): Promise<Boolean> => {
  var successArray: String[] = await getListOfCurrentSuccesfulCheckRuns(
    listCheckRunsForRefParams,
    client,
    currentJobName,
    requiredChecks,
    initialWait,
    waitPerCycle,
    retries
  )
  var successValidation: boolean = requiredChecks.some((requiredCheck) =>
    successArray.includes(requiredCheck)
  )

  return successValidation
}
