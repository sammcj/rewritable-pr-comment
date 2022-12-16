const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const { context } = require('@actions/github');

const githubToken = core.getInput('github_token');

const octokit = new Octokit({
  auth: githubToken,
});

console.log('context', context);

// if inputs are in uppercase change them to lowercase
const inputs = {
  message: core.getInput('message'),
  comment_identifier: core.getInput('comment_identifier')
    ? core.getInput('comment_identifier')
    : '4YE2JbpAewMX4rxmRnWyoSXoAfaiZH19QDB2IR3OSJTxmjSu',
  issue_id: core.getInput('issue_id')
    ? core.getInput('issue_id')
    : context.payload.issue.number || context.payload.pull_request.number,
};

async function run() {
  try {
    const commentMessage = inputs.message;
    const commentId = inputs.comment_identifier;
    const issue_number = inputs.issue_id;

    if (!issue_number) {
      core.setFailed('Action must run on a Pull Request.');
      return;
    }

    // Suffix comment with hidden value to check for updating later.
    const commentIdSuffix = `\n\n\n<hidden purpose="for-rewritable-pr-comment-action-use" value="${commentId}"></hidden>`;

    // If comment already exists, get the comment ID.
    const existingCommentId = await checkForExistingComment(
      octokit,
      issue_number,
      commentId,
      context,
    );

    const commentBody = commentMessage + commentIdSuffix;
    let comment = undefined;

    if (existingCommentId) {
      comment = await octokit.rest.pulls.updateReviewComment({
        ...context,
        comment_id: existingCommentId,
        body: commentBody,
      });
    } else {
      comment = await octokit.rest.issues.createComment({
        ...context,
        issue_number,
        body: commentBody,
      });
    }

    core.setOutput('comment-id', comment.data.id);
  } catch (e) {
    core.setFailed(e.message);
  }
}

async function checkForExistingComment(octokit, issue_number, commentIdentifier, context) {
  // Check for an existing comment with the commentIdentifier and returns the comment ID if it exists.
  console.log('Checking for existing comment');

  try {
    const existingComments = await octokit.rest.pulls.listCommentsForReview({
      ...context,
      pull_number: issue_number,
      review_id: commentIdentifier,
    });

    if (Array.isArray(existingComments.data)) {
      existingComments.data.forEach(({ body, id }) => {
        if (body.includes(commentIdentifier)) commentIdentifier = id;
      });
    }
    return commentIdentifier;
  } catch (e) {
    return undefined;
  }
}

run();
