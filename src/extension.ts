import * as vscode from 'vscode';
import dotenv from 'dotenv';
dotenv.config();

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "figma-flow" is now active!');

  const disposable = vscode.commands.registerCommand('figma-flow.start', () => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
      sendActiveEditorCode(panel);
    } else {
      panel = vscode.window.createWebviewPanel(
        'figmaFlowPanel', // Internal identifier
        'Figma Flow',     // Panel title
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = getWebviewContent();

      // Listen for messages from the webview.
      panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
          case 'updateEditorCode':
            // Use the delayed update function
            updateActiveEditorWithDelay(message.code);
            break;
          default:
            console.warn(`Unknown command: ${message.command}`);
        }
      });

      sendActiveEditorCode(panel);

      panel.onDidDispose(() => {
        panel = undefined;
      });
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

/**
 * Gradually updates the active editor with newCode, character-by-character,
 * using a typewriter effect.
 */
function updateActiveEditorWithDelay(newCode: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found to update.');
    return;
  }
  
  const document = editor.document;

  // First, clear the document.
  editor.edit(editBuilder => {
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    editBuilder.replace(fullRange, '');
  }).then(() => {
    let index = 0;
    const interval = 0.05; // Delay in milliseconds between characters

    // A helper function that inserts one character at a time.
    const typeNextChar = () => {
      if (index < newCode.length) {
        // Get current text length to determine insertion position.
        const currentText = editor.document.getText();
        const position = editor.document.positionAt(currentText.length);
        editor.edit(editBuilder => {
          editBuilder.insert(position, newCode.charAt(index));
        }).then(() => {
          index++;
          setTimeout(typeNextChar, interval);
        });
      } else {
        vscode.window.showInformationMessage('Editor updated with new code.');
      }
    };

    typeNextChar();
  });
}

function sendActiveEditorCode(panel: vscode.WebviewPanel) {
  if (vscode.window.activeTextEditor) {
    const code = vscode.window.activeTextEditor.document.getText();
    panel.webview.postMessage({ command: 'setCode', code });
  }
}

function getWebviewContent(): string {
  // Note: in the webview content below, we add a postMessage call after receiving a successful response from the API.
  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Flow</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@radix-ui/themes@2.0.0/styles.css">
  <style>
    body { padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    .chat-container { max-width: 800px; margin: 0 auto; }
    .messages { height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .message { padding: 8px 12px; margin: 8px 0; border-radius: 8px; display: flex; align-items: center; gap: 8px; }
    .user-message { background: rgb(31, 41, 54); margin-left: 20%; }
    .bot-message { background: rgb(22, 40, 59); margin-right: 20%; }
    .input-container { display: flex; gap: 8px; }
    .message-input-container { flex: 1; display: flex; gap: 8px; }
    input { flex: 1; padding: 8px 12px; border: 1px solid rgb(74, 115, 135); border-radius: 6px; }
    button { padding: 8px 16px; background: rgb(100, 138, 227); color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: rgb(148, 164, 191); }
    .media-button { cursor: pointer; padding: 8px; border: 1px solid rgb(30, 36, 39); border-radius: 6px; background: white; }
    .media-button:hover { background: rgb(45, 192, 101); border-color: rgb(151, 160, 172); }
  </style>
</head>
<body>
  <h1>Figma Flow</h1>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-container">
      <div class="message-input-container">
        <input type="text" id="messageInput" placeholder="Type your prompt...">
        <label class="media-button">
          <input type="file" id="imageInput" accept="image/*" style="display: none;">
          📷 Upload Image
        </label>
      </div>
      <button id="sendButton">Send</button>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');

    // This secret variable will hold the active editor's code (hidden from the user)
    let secretCode = "";

    // Listen for messages from the extension host.
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'setCode') {
        secretCode = message.code;
      }
    });

    async function sendMessageToAPI(code, prompt, image) {
      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('code', code);
        formData.append('prompt', prompt);
        try {
          const response = await fetch('https://figmaflow.pythonanywhere.com/api/upload', {
            method: 'POST',
            body: formData
          });
          if (!response.ok) throw new Error('Network response was not ok');
          return await response.json();
        } catch (error) {
          console.error('Error:', error);
          return null;
        }
      } else {
        try {
          const response = await fetch('https://figmaflow.pythonanywhere.com/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, prompt: prompt })
          });
          if (!response.ok) throw new Error('Network response was not ok');
          return await response.json();
        } catch (error) {
          console.error('Error:', error);
          return null;
        }
      }
    }

    function addMessage(text, isUser = true) {
      const messageDiv = document.createElement('div');
      messageDiv.className = \`message \${isUser ? 'user-message' : 'bot-message'}\`;
      messageDiv.textContent = text;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function handleSend() {
      const prompt = messageInput.value.trim();
      messageInput.value = '';
      
      const imageInput = document.getElementById('imageInput');
      const imageFile = imageInput.files[0];

      
      
      addMessage("Sending request...", true);
      
      try {
        const response = await sendMessageToAPI(secretCode, prompt, imageFile);
        if (response && response.code) {
          addMessage(response.code, false);
          // Send a message to the extension host to update the active editor with a typewriter effect.
          vscode.postMessage({ command: 'updateEditorCode', code: response.code });
        } else {
          addMessage('Error: Could not get response from server', false);
        }
      } catch (error) {
        console.error("Error sending request:", error);
        addMessage('Error: Request failed', false);
      }
    }

    sendButton.addEventListener('click', handleSend);
  </script>
</body>
</html>`;
}
