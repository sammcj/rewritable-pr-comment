const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const { context } = require('@actions/github');

const githubToken = core.getInput('github_token');

const octokit = new Octokit({
  auth: githubToken,
});

// if inputs are in uppercase change them to lowercase
const inputs = {
  debug: core.getInput('debug') ? core.getInput('debug') : false,

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
    const issue_number = inputs.issue_id;
    const comment_id = inputs.comment_identifier;

    if (!issue_number) {
      core.setFailed('Action must run on a Pull Request.');
      return;
    }

    // Suffix comment with hidden value to check for updating later.
    const commentIdSuffix = `\n\n\n<hidden purpose="for-rewritable-pr-comment-action-use" value="${comment_id}"></hidden>`;

    // If comment already exists, get the comment ID.
    const existingCommentId = await checkForExistingComment(
      octokit,
      issue_number,
      comment_id,
      context,
    );

    const commentBody = commentMessage + commentIdSuffix;
    let comment = undefined;

    if (existingCommentId) {
      console.log('Existing comment found');
      if (inputs.debug) {
        const existingComment = await octokit.rest.issues.getComment({
          ...context.repo.owner,
          ...context.repo.repo,
          comment_id: existingCommentId,
        });
        console.log(existingComment.data.body);
        octokit.setOutput('existingComment', existingComment.data.body);
      }
      comment = await octokit.rest.issues.updateComment({
        ...context.repo.owner,
        ...context.repo.repo,
        comment_id: existingCommentId,
        body: commentBody,
      });
    } else {
      console.log('Creating new comment');
      comment = await octokit.rest.issues.createComment({
        ...context.repo.owner,
        ...context.repo.repo,
        issue_number,
        body: commentBody,
      });
    }

    core.setOutput('comment-id', comment.data.id);
  } catch (e) {
    core.setFailed(e.message);
  }
}

async function checkForExistingComment(octokit, issue_number, comment_id, context) {
  // Check for an existing comment with the comment_id and returns the comment ID if it exists.
  console.log('Checking for existing comment');

  if (inputs.debug) {
    console.log('debug enabled');
    console.log(`owner: ${context.repo.owner}`);
    console.log(`repo: ${context.repo.repo}`);
    console.log(`issue_number: ${issue_number}`);
    console.log(`comment_id: ${comment_id}`);
  }

  try {
    const existingComments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue_number,
    });

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
