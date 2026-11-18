// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { removeConsoleLogs } = require('./removeConsoleLogs');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    'remove-console-log.helloWorld',
    async function () {
      // The code you place here will be executed every time your command is executed
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(
          'Open a file to remove console logs from'
        );
        return;
      }

      const document = editor.document;
      const original = document.getText();
      const { text, count, skipped } = removeConsoleLogs(
        original,
        document.languageId
      );

      if (count === 0) {
        // Display a message box to the user
        vscode.window.showInformationMessage(
          skipped > 0
            ? `Found ${skipped} console log(s) that could not be removed safely`
            : 'There is no console log to remove'
        );
        return;
      }

      // Apply the change through the editor so unsaved content is used,
      // the edit is part of the undo stack, and remote/untitled files work.
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(
          document.positionAt(0),
          document.positionAt(original.length)
        ),
        text
      );

      let applied = false;
      try {
        applied = await vscode.workspace.applyEdit(edit);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Could not remove console logs: ${error.message}`
        );
        return;
      }

      if (applied) {
        // Display a message box to the user
        vscode.window.showInformationMessage(
          skipped > 0
            ? `Removed ${count} console log(s); skipped ${skipped} that could not be removed safely`
            : `Successfully removed all (${count}) console logs`
        );
      } else {
        vscode.window.showErrorMessage('Could not remove console logs');
      }
    }
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
