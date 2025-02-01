import * as vscode from 'vscode';

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "figma-flow" is now active!');

	const disposable = vscode.commands.registerCommand('figma-flow.helloWorld', () => {
		if (panel) {
			panel.reveal(vscode.ViewColumn.One);
		} else {
			panel = vscode.window.createWebviewPanel(
				'figmaFlow',
				'Figma Flow',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
				}
			);

			panel.webview.html = getWebviewContent();

			panel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'fileSelected':
							// Handle the uploaded file data
							console.log('File received:', message.data);
							vscode.window.showInformationMessage('File uploaded successfully!');
							break;
					}
				},
				undefined,
				context.subscriptions
			);

			panel.onDidDispose(
				() => {
					panel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent() {
return /*html*/` <!DOCTYPE html> 
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
				
				.media-button input[type="image"] {
					padding: 8px 16px;
					border: 1px solid #e2e8f0;
					border-radius: 6px;
					cursor: pointer;
					background: white;
					display: inline-flex;
					align-items: center;
					gap: 8px;
				}
				
				.media-button:hover {
					background:rgb(142, 15, 127);
					border-color:rgb(151, 160, 172);
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
			
			</style>
		</head>
		<body>
			<div class="chat-container">
				<div class="messages" id="messages"></div>
				<div class="input-container">
					<div class="message-input-container">
						<input 
							type="text" 
							id="messageInput" 
							placeholder="Type your message...">
						<label class="media-button">
						<input type="image" id="image-input" accept="image/*">
							
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7m4 0h6m0 0v6m0-6L12 12"/>
								</svg>
						</label>
					</div>
					<button id="sendButton">Send</button>
				</div>
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				const messagesContainer = document.getElementById('messages');
				const messageInput = document.getElementById('messageInput');
				const sendButton = document.getElementById('sendButton');
				const fileInput = document.getElementById('fileInput');

				const FlaskURL = 'placeholder' //placeholder will put link in 


				// Function to send text messages to Flask
				const sendToFlask = async (endpoint, data) => {
					try {
						const response = await fetch(`${FLASK_API_URL}/${endpoint}`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(data)
						});
						
						if (!response.ok) {
							throw new Error(`HTTP error! status: ${response.status}`);
						}
						
						const result = await response.json();
						addMessage(result.response, false);
						
						vscode.postMessage({
							command: 'success',
							text: 'Message sent successfully'
						});
					} catch (error) {
						// Error handling
					}
				}
				

				const addMessage = (
					content, 
					isUser = false, 
					imageUrl = null
					)
					=> 
					{
					const messageDiv = document.createElement('div');
					messageDiv.className = \message \${isUser ? 'user-message' : 'bot-message'}\;
					
					if (imageUrl) {
						const img = document.createElement('img');
						img.src = imageUrl;
						img.className = 'uploaded-image';
						messageDiv.appendChild(img);
					}
					
					if (content) {
						const textDiv = document.createElement('div');
						textDiv.textContent = content;
						messageDiv.appendChild(textDiv);
					}
					
					messagesContainer.appendChild(messageDiv);
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}

				function sendMessage() {
					const message = messageInput.value.trim();
					if (message) {
						addMessage(message, true);
						vscode.postMessage({
							command: 'sendMessage',
							text: message
						});
						messageInput.value = '';
					}
				}

				fileInput.addEventListener('change', (e) => {
					const file = e.target.files[0];
					if (file) {
						const reader = new FileReader();
						reader.onload = (e) => {
							const imageData = e.target.result;
							addMessage('', true, imageData);
							vscode.postMessage({
								command: 'fileSelected',
								data: imageData
							});
						};
						reader.readAsDataURL(file);
					}
				});

				sendButton.addEventListener('click', sendMessage);
				messageInput.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						sendMessage();
					}
				});

				// Add initial bot message
				addMessage('Hello! How can I help you today?');
			</script>
		</body>
		</html>`;
}

export function deactivate() {}
