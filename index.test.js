const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const { context } = require('@actions/github');
const index = require('./index');

jest.mock('@actions/core');
jest.mock('@octokit/rest');
jest.mock('@actions/github');

describe('index.js tests', () => {
  beforeEach(() => {
    // Reset all mocks.
    jest.clearAllMocks();
    // Set up mocked inputs.
    core.getInput
      .mockReturnValueOnce('test_github_token')
      .mockReturnValueOnce('test_debug')
      .mockReturnValueOnce('test_message')
      .mockReturnValueOnce('test_comment_identifier')
      .mockReturnValueOnce('test_issue_id');
    // Set up mocked context payload.
    context.payload = {
      issue: {
        number: 1,
      },
      eventName: 'pull_request',
    };
  });
  it('creates a new comment if one does not exist', async () => {
    // Set up mocked Octokit functions.
    const createComment = jest.fn().mockResolvedValue({
      data: {
        id: 123,
      },
    });
    Octokit.mockImplementation(() => {
      return {
        rest: {
          issues: {
            createComment,
          },
        },
      };
    });
    // Run the function.
    await index.run();
    // Assert that the createComment function was called with the correct arguments.
    expect(createComment).toHaveBeenCalledWith({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: 1,
      body: 'test_message<hidden purpose="for-rewritable-pr-comment-action-use" value="test_comment_identifier"></hidden>',
    });
    // Assert that the correct output was set.
    expect(core.setOutput).toHaveBeenCalledWith('comment-id', 123);
  });

  it('updates an existing comment if one exists', async () => {
    // Set up mocked Octokit functions.
    const updateComment = jest.fn().mockResolvedValue({
      data: {
        id: 123,
      },
    });
    const checkForExistingComment = jest.fn().mockResolvedValue(123);
    Octokit.mockImplementation(() => {
      return {
        rest: {
          issues: {
            updateComment,
            getComment: jest.fn().mockResolvedValue({}),
          },
        },
      };
    });
    index.checkForExistingComment = checkForExistingComment;
    // Run the function.
    await index.run();
    // Assert that the checkForExistingComment function was called with the correct arguments.
    expect(checkForExistingComment).toHaveBeenCalledWith(
      Octokit,
      1,
      'test_comment_identifier',
      context,
    );
    // Assert that the updateComment function was called with the correct arguments.
    expect(updateComment).toHaveBeenCalledWith({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: 123,
      body: 'test_message<hidden purpose="for-rewritable-pr-comment-action-use" value="test_comment_identifier"></hidden>',
    });
    // Assert that the correct output was set.
    expect(core.setOutput).toHaveBeenCalledWith('comment-id', 123);
  });
  // Remove the issue from the context payload.
  delete context.payload.issue;
  // Run the function.
  index.run();
  // Assert that the function failed.
  expect(core.setFailed).toHaveBeenCalledWith('Action must run on a Pull Request.');
});

it('fails if an error occurs', async () => {
  // Set up mocked Octokit function to throw an error.
  Octokit.mockImplementation(() => {
    return {
      rest: {
        issues: {
          createComment: jest.fn().mockRejectedValue(new Error('Test Error')),
        },
      },
    };
  });
  it('fails if an error occurs', async () => {
    // Set up mocked Octokit function to throw an error.
    Octokit.mockImplementation(() => {
      return {
        rest: {
          issues: {
            createComment: jest.fn().mockRejectedValue(new Error('Test Error')),
          },
        },
      };
    });
    // Run the function.
    await index.run();
    // Assert that the function failed with the correct error message.
    expect(core.setFailed).toHaveBeenCalledWith('Test Error');
  });
});
