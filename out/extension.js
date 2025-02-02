"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let panel;
function activate(context) {
    console.log('Congratulations, your extension "figma-flow" is now active!');
    const disposable = vscode.commands.registerCommand('figma-flow.start', () => {
        if (panel) {
            panel.reveal(vscode.ViewColumn.One);
            sendActiveEditorCode(panel);
        }
        else {
            panel = vscode.window.createWebviewPanel('figmaFlowPanel', // Internal identifier
            'Figma Flow', // Panel title
            vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = getWebviewContent();
            // Listen for messages from the webview (if needed)
            panel.webview.onDidReceiveMessage(message => {
                // Handle messages if necessary
            });
            sendActiveEditorCode(panel);
            panel.onDidDispose(() => {
                panel = undefined;
            });
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
function sendActiveEditorCode(panel) {
    if (vscode.window.activeTextEditor) {
        const code = vscode.window.activeTextEditor.document.getText();
        panel.webview.postMessage({ command: 'setCode', code });
    }
}
function getWebviewContent() {
    return `<!DOCTYPE html>
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
    .user-message { background: #e2e8f0; margin-left: 20%; }
    .bot-message { background: #f1f5f9; margin-right: 20%; }
    .input-container { display: flex; gap: 8px; }
    .message-input-container { flex: 1; display: flex; gap: 8px; }
    /* The text input now serves as the prompt */
    input { flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
    button { padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: #1e293b; }
    .media-button { cursor: pointer; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; }
    .media-button:hover { background: rgb(142, 15, 127); border-color: rgb(151, 160, 172); }
  </style>
</head>
<body>
  <h1>Figma Flow</h1>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-container">
      <!-- The input here is for the prompt only -->
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

    async function sendMessageToAPI(code, prompt, image, type) {
      // If an image is provided, use multipart form data
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
        // Otherwise, send a JSON payload
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
      // Retrieve the prompt from the input (but do not display the secret code)
      const prompt = messageInput.value.trim();
      // Clear the prompt field (optional)
      messageInput.value = '';
      
      const imageInput = document.getElementById('imageInput');
      const imageFile = imageInput.files[0];

      if (!secretCode) {
        addMessage('No code found in the active editor.', false);
        return;
      }
      
      addMessage("Sending request...", true);
      
      sendMessageToAPI(secretCode, prompt, imageFile, 'message')
        .then(response => {
          if (response) {
            addMessage(response.code, false);
          } else {
            addMessage('Error: Could not get response from server', false);
          }
        })
        .catch(error => {
          console.error("Error sending request:", error);
          addMessage('Error: Request failed', false);
        });
    }

    sendButton.addEventListener('click', handleSend);
  </script>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map