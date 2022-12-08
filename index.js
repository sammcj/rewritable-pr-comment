const { getInput, setOutput, setFailed } = require('@actions/core');
const github = require('@actions/github');
const DEFAULT_COMMENT_IDENTIFIER = '4YE2JbpAewMX4rxmRnWyoSXoAfaiZH19QDB2IR3OSJTxmjSu';
const ctx = github.context;

async function checkForExistingComment(octokit, repo, owner, issue_number, commentIdentifier) {
  const existingComments = await octokit.issues.listComments({
    repo,
    owner,
    issue_number,
  });

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
    const commentMessage = getInput('message');
    const commentId = getInput('COMMENT_IDENTIFIER')
      ? getInput('COMMENT_IDENTIFIER')
      : DEFAULT_COMMENT_IDENTIFIER;
    const githubToken = getInput('GITHUB_TOKEN');

    const issue_id = getInput('ISSUE_ID') ? getInput('ISSUE_ID') : ctx.payload.pull_request.number;
    const { owner, repo } = ctx.repo;

    if (!issue_id) {
      setFailed('Action must run on a Pull Request.');
      return;
    }

    const octokit = github.getOctokit(githubToken);

    // Suffix comment with hidden value to check for updating later.
    const commentIdSuffix = `\n\n\n<hidden purpose="for-rewritable-pr-comment-action-use" value="${commentId}"></hidden>`;

    // If comment already exists, get the comment ID.
    const existingCommentId = await checkForExistingComment(
      octokit,
      repo,
      owner,
      issue_id,
      commentIdSuffix,
    );

    const commentBody = commentMessage + commentIdSuffix;
    let comment = undefined;
    if (existingCommentId) {
      comment = await octokit.issues.updateComment({
        repo,
        owner,
        comment_id: existingCommentId,
        body: commentBody,
      });
    } else {
      comment = await octokit.issues.createComment({
        repo,
        owner,
        issue_number: issue_id,
        body: commentBody,
      });
    }

    setOutput('comment-id', comment.data.id);
  } catch (e) {
    setFailed(e.message);
  }
}

run();
