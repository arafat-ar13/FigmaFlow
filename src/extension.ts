import * as vscode from 'vscode';
import dotenv from 'dotenv';
dotenv.config();

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "figma-flow" is now active!');

  const disposable = vscode.commands.registerCommand('figma-flow.start', () => {
    // If the panel already exists, reveal it; otherwise, create a new one.
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
      // Optionally update the code again when panel is revealed.
      sendActiveEditorCode(panel);
    } else {
      panel = vscode.window.createWebviewPanel(
        'figmaFlowPanel', // Internal identifier for the panel
        'Figma Flow',     // Title of the panel displayed to the user
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = getWebviewContent();

      // Send the active editor code to the webview once it's loaded.
      panel.webview.onDidReceiveMessage(message => {
        // (Handle any messages from the webview if needed)
      });

      sendActiveEditorCode(panel);

      // Reset when the panel is closed
      panel.onDidDispose(() => {
        panel = undefined;
      });
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function sendActiveEditorCode(panel: vscode.WebviewPanel) {
  if (vscode.window.activeTextEditor) {
    const code = vscode.window.activeTextEditor.document.getText();
    panel.webview.postMessage({ command: 'setCode', code });
  }
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Flow</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@radix-ui/themes@2.0.0/styles.css">
  <style>
    body {
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .chat-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .messages {
      height: 400px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .message {
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-message {
      background: #e2e8f0;
      margin-left: 20%;
    }
    .bot-message {
      background: #f1f5f9;
      margin-right: 20%;
    }
    .input-container {
      display: flex;
      gap: 8px;
    }
    .message-input-container {
      flex: 1;
      display: flex;
      gap: 8px;
    }
    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    button {
      padding: 8px 16px;
      background: #0f172a;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover {
      background: #1e293b;
    }
    .media-button {
      cursor: pointer;
      padding: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
    }
    .media-button:hover {
      background: rgb(142, 15, 127);
      border-color: rgb(151, 160, 172);
    }
  </style>
</head>
<body>
  <h1>Figma Flow</h1>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-container">
      <!-- We'll display the code from the active editor here -->
      <div class="message-input-container">
        <textarea id="codeDisplay" style="flex:1; height:150px;" placeholder="Code from active editor will appear here"></textarea>
      </div>
      <button id="sendButton">Send Code</button>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const codeDisplay = document.getElementById('codeDisplay');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');
    
    // Variable to hold the code from the active editor.
    let codeFromEditor = "";

    // Listen for messages from the extension host.
    window.addEventListener('message', event => {
      const message = event.data;
      if(message.command === 'setCode'){
        codeFromEditor = message.code;
        // Display the code in the textarea for visual feedback.
        codeDisplay.value = codeFromEditor;
      }
    });

    async function sendMessageToAPI(code, image, type) {
      if (type === 'message') {
        try {
          const response = await fetch('https://figmaflow.pythonanywhere.com/api/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code, prompt: code })
          });
          if (!response.ok) throw new Error('Network response was not ok');
          return await response.json();
        } catch (error) {
          console.error('Error:', error);
          return null;
        }
      } else {
        const formData = new FormData();
        formData.append('image', image);
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
      // Use the stored code from the active editor.
      if (!codeFromEditor) {
        addMessage('No code received from the active editor.', false);
        return;
      }
      addMessage(codeFromEditor, true);
      sendMessageToAPI(codeFromEditor, null, 'message')
        .then(response => {
          if (response) {
            addMessage(response.code, false);
          } else {
            addMessage('Error: Could not get response from server', false);
          }
        })
        .catch(error => {
          console.error("Error sending code:", error);
          addMessage('Error: Request failed', false);
        });
    }

    sendButton.addEventListener('click', handleSend);
  </script>
</body>
</html>`;
}
