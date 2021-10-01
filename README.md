# Label Based PR Policy Action [![Building the Code](https://github.com/cmpsoares/label-based-pr-policy-action/actions/workflows/build.yml/badge.svg)](https://github.com/cmpsoares/label-based-pr-policy-action/actions/workflows/build.yml) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=alert_status)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=security_rating)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action) [![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=sqale_index)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=cmpsoares_label-based-pr-policy-action&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=cmpsoares_label-based-pr-policy-action)
This is a Github Action that validates the required minimum number of approving reviews and/or Check-runs on a Pull Request depending on the set of labels applied to it.

## Usage

### Create `.github/label-requires-checks-reviews.yml`

Create a `.github/label-requires-checks-reviews.yml` file (if, for some reason, it requires a different file name you can overwrite this value by setting the `configPath` action input) containing a list of the following configurations:
 * `label` is the name of the label that will be checked on the Pull Request.
 * `reviews` the number of approved reviews needed on the Pull Request for the action to return a success value. In case of having several matching tags the highest number will apply.
 * `checks`is the list of names for the successful check-runs needed on the Pull Request for the action to return a success value. In case of having several matching tags it'll require all of them.

Here is an example:

```yml
- label: "typescript"
  reviews: 2
- label: "migration"
  reviews: 5
  checks:
    - build
- label: "_default_"
  reviews: 1
  checks:
    - build
```

With that configuration this check will fail on a Pull Request that has the `typescript` tag until two or more approving reviews have been added. If instead the Pull Request has the `migration` tag it will require five reviews and the check `build` to be succesful. In case both tags are present it will require the highest number of reviews (five) and all the checks to be succesful (in this case `build`).

### Create workflow
Create a workflow (eg: `.github/workflows/label-based-pr-policy.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize this action with content:

```yml
# This workflow will set a number of reviewers and mandatory checks depending on the tags
name: Label-based Branch Protection Example
# Trigger the workflow on pull requests
on:
  pull_request:

jobs:
  require-checks-and-reviewers:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@v2

      - name: label-based-pr-policy-action
        uses: cmpsoares/label-based-pr-policy-action@main
        env:
          GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN}}
```

In order for the workflow to be able to perform actions on the Pull Request you'll need to set a [`PERSONAL_ACCESS_TOKEN`](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) secret on the repository see [Creating and storing encrypted secrets](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets).

### Enforce the requirement
To make this check mandatory you need to specify it on the `Branch protection rule` section of the repository settings like the example:

![Marking the action as required](https://user-images.githubusercontent.com/1571416/86369067-3d62ae80-bc7e-11ea-9b40-7c518e6c8a80.png)

According to this configuration, the `main` branch is protected by the option `Required approving reviews` set to `1`. That means that any Pull Request that wants to merge code into master would have to be approved by at least one reviewer.

By checking `Require status checks to pass before merging` and `require-reviewers` anytime the Pull Request gets a new review this action will fire and the Pull Request is labeled with one of the labels that require more than one approving review blocking the possibility of merging until this label required number of approving reviews is reached.

### Saving tip
Since Github Workflow [jobs can have conditionals](https://github.blog/changelog/2019-10-01-github-actions-new-workflow-syntax-features/), and in the workflow you can [directly access some action metadata](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#contexts).

You can avoid checking out the code and running this action if you know the issue does not contain any of the labels that will trigger it, that will set the action as skipped and will never run.

The drawback is that the list of labels will be duplicated, but you can save a lot of actions time.

### Contribution
TODO: Write contribution guidelines and paste them here.

#### Hard Fork
This repository is based on the [TravePerk's label-requires-revies-action code (hard fork)](https://github.com/travelperk/label-requires-reviews-action), however as the scope changes significantly and there are some annoyances in maintaining a fork we copied our modified code to this repository. However, its fair to give them the credit they deserve.

#### Contributors
So far the following people contributed to this repository. Feel free to join them and contribute!

<a href="https://github.com/cmpsoares/label-based-pr-policy-action/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cmpsoares/label-based-pr-policy-action" />
</a>

<sub><sup>Made with [contributors-img](https://contrib.rocks).</sup></sub>
