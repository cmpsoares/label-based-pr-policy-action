import { Endpoints } from '@octokit/types'

export interface Rule {
  label: string
  reviews: number
  checks?: string[]
}

export type IssuesListLabelsOnIssueParams =
  Endpoints['GET /repos/:owner/:repo/issues/:issue_number/labels']['parameters']
export type IssuesListLabelsOnIssueResponse =
  Endpoints['GET /repos/:owner/:repo/issues/:issue_number/labels']['response']
export type PullsListReviewsParams =
  Endpoints['GET /repos/:owner/:repo/pulls/:pull_number/reviews']['parameters']
export type PullsListReviewsResponse =
  Endpoints['GET /repos/:owner/:repo/pulls/:pull_number/reviews']['response']
export type StatusListChecksParams =
  Endpoints['GET /repos/:owner/:repo/commits/:ref/status']['parameters']
export type StatusListChecksResponse =
  Endpoints['GET /repos/:owner/:repo/commits/:ref/status']['response']
// :ref has to be in the following format: "refs/pull/:pull_number/head"
export type ListCheckRunsForRefParams =
  Endpoints['GET /repos/:owner/:repo/commits/:ref/check-runs']['parameters']
export type ListCheckRunsForRefResponse =
  Endpoints['GET /repos/:owner/:repo/commits/:ref/check-runs']['response']
