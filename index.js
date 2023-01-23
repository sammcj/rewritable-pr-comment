const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const { context } = require('@actions/github');
const githubToken = core.getInput('github_token');

const octokit = new Octokit({
  auth: githubToken,
});

// If the action is run on a pull request, use the pull request number. Otherwise, use the issue number.
const isPR = context.eventName == 'pull_request';

// Target is either of type issue or PR.
// If it is an issue it must be provided as input.
const contextTargetNumber = isPR ? context.payload.pull_request.number : core.getInput('issue_id');

const targetNumber =
  core.getInput('issue_id') !== null && isPR === false
    ? core.getInput('issue_id')
    : contextTargetNumber;

// if inputs are in uppercase change them to lowercase
const inputs = {
  debug: core.getInput('debug') ? core.getInput('debug') : false,
  message: core.getInput('message'),
  comment_identifier: core.getInput('comment_identifier')
    ? core.getInput('comment_identifier')
    : '4YE2JbpAewMX4rxmRnWyoSXoAfaiZH19QDB2IR3OSJTxmjSu',

  issue_id: targetNumber,
};

if (inputs.debug) {
  console.log('debug enabled');
  console.log('isPR:', isPR);
  console.log(context);
}

async function run() {
  try {
    const commentMessage = inputs.message;
    const comment_id = inputs.comment_identifier;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    if (inputs.debug) {
      console.log('debug enabled');
      console.log(context);
    }

    // Suffix comment with hidden value to check for updating later.
    const commentIdSuffix = `<hidden purpose="for-rewritable-pr-comment-action-use" value="${comment_id}"></hidden>`;

    if (!targetNumber) {
      core.setFailed('Action must run on a Pull Request, or provided an issue_id.');
    }

    // Check for an existing comment, if it already exists, get the comment ID.
    const existingCommentId = await checkForExistingComment(
      octokit,
      targetNumber,
      comment_id,
      context,
    );

    const commentBody = commentMessage + commentIdSuffix;
    let comment = undefined;

    // If comment already exists, update it. Otherwise, create a new comment.
    if (existingCommentId) {
      console.log('Existing comment found');
      if (inputs.debug) {
        console.log('existing comment ID:', existingCommentId);
        try {
          let existingComment = undefined;
          if (isPR) {
            // Get all comments on the PR.
            existingComment = await octokit.rest.pulls.getReviewComment({
              owner: owner,
              repo: repo,
              comment_id: existingCommentId,
            });
          } else {
            existingComment = await octokit.rest.issues.getComment({
              owner: owner,
              repo: repo,
              comment_id: existingCommentId,
            });
          }
          console.log(existingComment);
        } catch (error) {
          console.log(error);
        }
      }
      try {
        if (isPR) {
          // Get all comments on the PR.
          await octokit.rest.pulls.updateReviewComment({
            owner: owner,
            repo: repo,
            comment_id: existingCommentId,
            body: commentBody,
          });
        } else {
          // Get all comments on the issue.
          await octokit.rest.issues.updateComment({
            owner: owner,
            repo: repo,
            comment_id: existingCommentId,
            body: commentBody,
          });
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        console.log('Creating new comment');
        if (isPR) {
          // Create a new comment on the PR.
          await octokit.rest.pulls.createReviewComment({
            owner: owner,
            repo: repo,
            pull_number: targetNumber,
            body: commentBody,
          });
        } else {
          // Create a new comment on the issue.
          await octokit.rest.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: targetNumber,
            body: commentBody,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }

    core.setOutput('comment-id', comment.data.id);
  } catch (e) {
    core.setFailed(e.message);
  }
}

async function checkForExistingComment(octokit, targetNumber, comment_id, context) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  // Check for an existing comment with the comment_id and returns the comment ID if it exists.
  console.log('Checking for existing comment');

  if (inputs.debug) {
    console.log('debug enabled');
    console.log(`owner: ${owner}`);
    console.log(`repo: ${repo}`);
    console.log(`targetNumber: ${targetNumber}`);
    console.log(`comment_id: ${comment_id}`);
  }

  try {
    let existingComments = undefined;
    if (isPR) {
      // Get all comments on the PR.
      existingComments = await octokit.rest.pulls.listReviewComments({
        owner: owner,
        repo: repo,
        pull_number: targetNumber,
      });
    } else {
      // Get all comments on the issue.
      existingComments = await octokit.rest.issues.listComments({
        owner: owner,
        repo: repo,
        issue_number: targetNumber,
      });
    }

    if (inputs.debug) {
      console.log('existingComments data:', existingComments.data);
    }
    // Check if the comment_id is in the comment body.
    if (Array.isArray(existingComments.data)) {
      existingComments.data.forEach(({ body, id }) => {
        if (body.includes(comment_id)) comment_id = id;
      });

      if (inputs.debug) {
        console.log(`comment_id: ${comment_id}`);
      }
    }
    return comment_id;
  } catch (e) {
    if (inputs.debug) {
      console.log('debug', inputs.debug);
      console.log('error', e);
      console.log('returning undefined');
    }
    return undefined;
  }
}

run();
