import {
  getRulesForLabels,
  getMaxReviewNumber,
  getAllRequiredChecks,
  getCurrentReviewCount,
  findRepositoryInformation,
  checkIfRequiredCheckRunsAreSuccesful,
  getListOfCurrentSuccesfulCheckRuns,
} from './main'
import { Toolkit, ToolkitOptions } from 'actions-toolkit'
import { GitHub } from 'actions-toolkit/lib/github'
import {
  Rule,
  IssuesListLabelsOnIssueParams,
  PullsListReviewsParams,
  ListCheckRunsForRefParams,
} from './types'

const args: ToolkitOptions = {
  event: [
    'pull_request_review.submitted',
    'pull_request_review.edited',
    'pull_request_review.dismissed',
    'pull_request.synchronize',
    'pull_request.opened',
    'pull_request_target.synchronize',
    'pull_request_target.opened',
  ],
  secrets: ['GITHUB_TOKEN'],
}

Toolkit.run(async (toolkit: Toolkit) => {
  toolkit.log.info('Running Action')
  const configPath: string =
    process.env.INPUT_CONFIGPATH ?? '.github/label-requires-checks-reviews.yml'
  const rules: Rule[] = toolkit.config(configPath)
  toolkit.log.info('Configured rules: ', rules)

  // Get the repository information
  if (!process.env.GITHUB_EVENT_PATH) {
    toolkit.exit.failure('Process env GITHUB_EVENT_PATH is undefined')
  }
  const { owner, issue_number, repo }: IssuesListLabelsOnIssueParams =
    findRepositoryInformation(
      process.env.GITHUB_EVENT_PATH,
      toolkit.log,
      toolkit.exit
    )
  const client: GitHub = toolkit.github

  // Get the list of configuration rules for the labels on the issue
  const matchingRules: Rule[] = await getRulesForLabels(
    { owner, issue_number, repo },
    client,
    rules
  )
  toolkit.log.info('Matching rules: ', matchingRules)

  // Get the required number of required reviews from the rules
  const requiredReviews: number = getMaxReviewNumber(matchingRules)
  const requiredChecks: string[] = getAllRequiredChecks(matchingRules)

  // Get the actual number of reviews from the issue
  const reviewCount: number = await getCurrentReviewCount(
    { owner, pull_number: issue_number, repo } as PullsListReviewsParams,
    client
  )

  const jobName: string = process.env.GITHUB_JOB
  const headRef: string = process.env.GITHUB_HEAD_REF
  const initialWait: number =
    process.env.INPUT_INITIALWAIT != null
      ? Number.parseInt(process.env.INPUT_INITIALWAIT)
      : 30
  const timeoutMinutes: number =
    process.env.INPUT_TIMEOUT != null
      ? Number.parseInt(process.env.INPUT_TIMEOUT)
      : 60
  const timeout: number = timeoutMinutes * 60
  const waitPerCycle: number = 15
  const retries: number = timeout / waitPerCycle
  const checkIfChecksSuccesful: boolean =
    await checkIfRequiredCheckRunsAreSuccesful(
      {
        owner,
        repo,
        ref: headRef,
      } as ListCheckRunsForRefParams,
      client,
      jobName,
      requiredChecks,
      initialWait,
      waitPerCycle,
      retries
    )
  const currentSuccesfulChecks: string[] =
    await getListOfCurrentSuccesfulCheckRuns(
      {
        owner,
        repo,
        ref: headRef,
      } as ListCheckRunsForRefParams,
      client,
      jobName,
      requiredChecks,
      5,
      10,
      2
    )

  var compliant: boolean = true
  if (reviewCount < requiredReviews) {
    compliant = false
    toolkit.log.fatal(
      `Labels require ${requiredReviews} reviews but the PR only has ${reviewCount}`
    )
  }
  if (!checkIfChecksSuccesful) {
    compliant = false
    toolkit.log.fatal(
      `Labels require [ ${requiredChecks} ] checks to be succesful but the PR only has [ ${currentSuccesfulChecks} ]`
    )
  }

  if (!compliant) {
    toolkit.exit.failure(`Check failed due to the above-mentioned reasons.`)
  } else {
    toolkit.log.info(
      `Labels require ${requiredReviews} reviews the PR has ${reviewCount}, and requires the following [ ${requiredChecks} ] checks and has [ ${currentSuccesfulChecks}] checks`
    )
  }
}, args)
