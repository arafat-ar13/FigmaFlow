import * as vscode from 'vscode';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

interface Message {
	message: string;
	image?: string;
}

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
		const vscode = acquireVsCodeApi();
		const messagesContainer = document.getElementById('messages');
		const messageInput = document.getElementById('messageInput');
		const sendButton = document.getElementById('sendButton');
		const fileInput = document.getElementById('imageInput');

		const FLASK_API_URL = "http://localhost:5000"; // Change if needed

		let uploadedImage = null; // Store uploaded image data

		// Function to send text messages to Flask
		const sendToFlask = async (endpoint, data) => {
			try {
				const response = await axios.post(FLASK_API_URL + endpoint, data, {
					headers: { 'Content-Type': 'application/json' }
				});

				// Add bot response
				addMessage(response.data.response, false);

				vscode.postMessage({
					command: 'success',
					text: 'Message sent successfully'
				});
			} catch (error) {
				console.error("Error sending message:", error);
			}
		};

		// Function to send images to Flask
		const sendImageToFlask = async (imageFile) => {
			try {
				const formData = new FormData();
				formData.append('file', imageFile);

				const response = await axios.post(FLASK_API_URL + '/process', formData, {
					headers: { 'Content-Type': 'multipart/form-data' }
				});

				// Store the uploaded image
				uploadedImage = imageFile;

				// Display image preview
				addMessage('[Image Uploaded]', true, URL.createObjectURL(imageFile));

				vscode.postMessage({
					command: 'success',
					text: 'Image uploaded successfully'
				});
			} catch (error) {
				console.error('Error:', error);
				vscode.postMessage({
					command: 'error',
					text: error.response?.data?.message || 'Failed to upload image'
				});
			}
		};

		// Function to add messages to chat
		const addMessage = (message, isUser = true, imageUrl = null) => {
			const messageDiv = document.createElement('div');
			messageDiv.className = \`message \${isUser ? 'user-message' : 'bot-message'}\`;
			messageDiv.textContent = message;

			if (imageUrl) {
				const img = document.createElement('img');
				img.src = imageUrl;
				img.style.maxWidth = "200px";
				img.style.borderRadius = "6px";
				messageDiv.appendChild(img);
			}

			messagesContainer.appendChild(messageDiv);
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		};

		// Handle message sending
		function sendMessage() {
			const message = messageInput.value.trim();
			if (message) {
				addMessage(message);
				sendToFlask('/message', { message, image: uploadedImage ? uploadedImage.name : null });
				messageInput.value = '';
				uploadedImage = null;
			}
		}

		// Handle file upload
		fileInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					const imageData = e.target.result;
					vscode.postMessage({
						command: 'fileSelected',
						data: imageData
					});
					sendImageToFlask(file);
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
		addMessage('Hello! How can I help you today?', false);
	</script>
</body>
</html>`;
}

export function deactivate() {}
