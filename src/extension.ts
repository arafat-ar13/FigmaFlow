
import * as vscode from 'vscode';

import dotenv from 'dotenv';
dotenv.config();

interface Message {
	message: string;
	image?: string;
}

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "figma-flow" is now active!');

	const disposable = vscode.commands.registerCommand('figma-flow.start', () => {
		if (panel) {
			panel.reveal(vscode.ViewColumn.One);
		} else {
			panel = vscode.window.createWebviewPanel(
				'start',
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
							console.log('File received:', message.data);
							vscode.window.showInformationMessage('File uploaded successfully!');
							break;
					}
				},
				undefined,
				context.subscriptions
			);

			panel.onDidDispose(() => {
				panel = undefined;
			}, null, context.subscriptions);
		}
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent() {
	return /*html*/`<!DOCTYPE html>
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
			<div class="message-input-container">
				<input type="text" id="messageInput" placeholder="Type your message...">
				<label class="media-button">
					<input type="file" id="imageInput" accept="image/*" style="display: none;">
					📷 Upload Image
				</label>
			</div>
			<button id="sendButton">Send</button>
		</div>
	</div>

	<script>
		const messageInput = document.getElementById('messageInput');
		const sendButton = document.getElementById('sendButton');
		const messagesContainer = document.getElementById('messages');


async function sendMessageToAPI(message, image, type) {
	if (type == 'message') {
            try {
                const response = await fetch('https://figmaflow.pythonanywhere.com/api/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: message,
                        prompt: message
                    })
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error:', error);
                return null;
            }
		}
	
	else {
		// Send the image as multipart
		const formData = new FormData();
		formData.append('image', image);

		try {
			const response = await fetch('https://figmaflow.pythonanywhere.com/api/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}	

			const data = await response.json();
			return data;
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
				const message = messageInput.value.trim();
				if (!message) return;

				const imageInput = document.getElementById('imageInput');
				const imageFile = imageInput.files[0];

				// Add user message to chat
				addMessage(message, true);
				messageInput.value = '';

				// Using .then() chains to handle the promise
				sendMessageToAPI(message, imageFile, 'message')
					.then(response => {
						console.log('Full response:', response); // Debug log to inspect response
						if (response ) {
							addMessage(response.code, false);
						} else {
							console.log('Response structure:', response); // Debug log to see response structure
							addMessage('Error: Could not get response from server', false);
						}
					})
					.catch(error => {
						console.error("Error sending message:", error);
						addMessage('Error: Request failed', false);
					});

			}

		


			

			
		// Send message when clicking the send button
		sendButton.addEventListener('click', handleSend);

		// Send message when pressing Enter
		messageInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				handleSend();
			}
		});
	</script>
</body>
</html>`;
}

export function deactivate() {}

