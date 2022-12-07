const core = require('@actions/core');
const github = require('@actions/github');
const context = require('@actions/github');
const DEFAULT_COMMENT_IDENTIFIER = '4YE2JbpAewMX4rxmRnWyoSXoAfaiZH19QDB2IR3OSJTxmjSu';

async function checkForExistingComment(octokit, issue_number, commentIdentifier, repo, owner) {
  // console log
  console.log('Checking for existing comment');
  const existingComments = await octokit.issues.listComments({
    issue_number,
    repo,
    owner,
  });

  if (!existingComments.data.length) {
    return undefined;
  }

  let existingCommentId = undefined;
  if (Array.isArray(existingComments.data)) {
    existingComments.data.forEach(({ body, id }) => {
      if (body.includes(commentIdentifier)) existingCommentId = id;
    });
  }
  return existingCommentId;
}

async function run() {
  try {
    // const context = github.context;
    const repo = context.repo;
    const owner = context.owner;
    const commentMessage = core.getInput('message');
    const commentId = core.getInput('COMMENT_IDENTIFIER')
      ? core.getInput('COMMENT_IDENTIFIER')
      : DEFAULT_COMMENT_IDENTIFIER;
    const githubToken = core.getInput('GITHUB_TOKEN');

    console.log('context', context);

    const issue_number = core.getInput('ISSUE_ID')
      ? core.getInput('ISSUE_ID')
      : context.payload.pull_request.number;

    if (!issue_number) {
      core.setFailed('Action must run on a Pull Request.');
      return;
    }

    const octokit = github.getOctokit(githubToken);
    // Suffix comment with hidden value to check for updating later.
    const commentIdSuffix = `\n\n\n<hidden purpose="for-rewritable-pr-comment-action-use" value="${commentId}"></hidden>`;

    // If comment already exists, get the comment ID.
    const existingCommentId = await checkForExistingComment(
      octokit,
      issue_number,
      commentId,
      repo,
      owner,
      commentIdSuffix,
    );

    const commentBody = commentMessage + commentIdSuffix;
    let comment = undefined;

    if (existingCommentId) {
      comment = await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: existingCommentId,
        body: commentBody,
      });
    } else {
      comment = await octokit.issues.createComment({
        owner,
        repo,
        issue_number,
        body: commentBody,
      });
    }

    core.setOutput('comment-id', comment.data.id);
  } catch (e) {
    core.setFailed(e.message);
  }
}

run();
