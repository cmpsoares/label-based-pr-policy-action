import {
  getRulesForLabels,
  getMaxReviewNumber,
  getAllRequiredChecks,
  getCurrentReviewCount,
  findRepositoryInformation,
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
  ],
  secrets: ['GITHUB_TOKEN'],
}

Toolkit.run(async (toolkit: Toolkit) => {
  toolkit.log.info('Running Action')
  const configPath: string =
    process.env.CONFIG_PATH ?? '.github/label-requires-checks-reviews.yml'
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
  const ref: String = toolkit.context.ref
  toolkit.log.info(`Ref is ${ref}`)

  // Get the list of configuration rules for the labels on the issue
  const matchingRules: Rule[] = await getRulesForLabels(
    { owner, issue_number, repo },
    client,
    rules
  )
  toolkit.log.info('Matching rules: ', matchingRules)

  // Get the required number of required reviews from the rules
  const requiredReviews: number = getMaxReviewNumber(matchingRules)
  const requiredChecks: String[] = getAllRequiredChecks(matchingRules)

  // Get the actual number of reviews from the issue
  const reviewCount: number = await getCurrentReviewCount(
    { owner, pull_number: issue_number, repo } as PullsListReviewsParams,
    client
  )

  const jobName: String = process.env.GITHUB_JOB
  const headRef: String = process.env.GITHUB_HEAD_REF
  const initialWait: number =
    process.env.INITIAL_WAIT != null
      ? Number.parseInt(process.env.INITIAL_WAIT)
      : 120
  const timeout: number =
    process.env.TIMEOUT != null ? Number.parseInt(process.env.TIMEOUT) : 60
  const retries: number =
    process.env.RETRIES != null ? Number.parseInt(process.env.RETRIES) : 5
  const currentSuccesfulChecks: String[] =
    await getListOfCurrentSuccesfulCheckRuns(
      {
        owner,
        repo,
        ref: headRef,
      } as ListCheckRunsForRefParams,
      client,
      jobName,
      initialWait,
      timeout,
      retries
    )

  var compliant: boolean = true
  if (reviewCount < requiredReviews) {
    compliant = false
    toolkit.log.fatal(
      `Labels require ${requiredReviews} reviews but the PR only has ${reviewCount}`
    )
  }
  if (currentSuccesfulChecks.length < requiredChecks.length) {
    compliant = false
    toolkit.log.fatal(
      `Labels require [ ${requiredChecks} ] checks to be succesful but the PR only has [ ${currentSuccesfulChecks} ]`
    )
  }
  if (!compliant) {
    toolkit.exit.failure(`Check failed due to the above-mentioned reasons.`)
  } else {
    toolkit.log.info(
      `Labels require ${requiredReviews} the PR has ${reviewCount}, and requires [ ${requiredChecks} ] checks and has [ ${currentSuccesfulChecks}] checks`
    )
  }
}, args)
