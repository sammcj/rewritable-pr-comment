/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 455:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 656:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __webpack_require__ !== 'undefined') __webpack_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __webpack_require__(455);
const github = __webpack_require__(656);
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
    const commentMessage = core.getInput('message');
    const commentId = core.getInput('COMMENT_IDENTIFIER')
      ? core.getInput('COMMENT_IDENTIFIER')
      : DEFAULT_COMMENT_IDENTIFIER;
    const githubToken = core.getInput('GITHUB_TOKEN');

    const issue_id = core.getInput('ISSUE_ID')
      ? core.getInput('ISSUE_ID')
      : ctx.payload.pull_request.number;
    const { owner, repo } = ctx.repo;

    if (!issue_id) {
      core.setFailed('Action must run on a Pull Request.');
      return;
    }

    const octokit = new github(githubToken);

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

    core.setOutput('comment-id', comment.data.id);
  } catch (e) {
    core.setFailed(e.message);
  }
}

run().then();

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map