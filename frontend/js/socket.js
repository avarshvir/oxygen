window.isWorking = false;
// 1. Globally accessible download function
window.downloadFile = function (base64Code, filename) {
    const code = decodeURIComponent(escape(atob(base64Code)));
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

document.addEventListener("DOMContentLoaded", () => {
    const chatHistory = document.getElementById("chatHistory");
    const sendBtn = document.getElementById("sendBtn");
    const userInput = document.getElementById("userInput");

    // Settings Elements
    const settingsBtn = document.getElementById("settingsBtn");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");

    const llmProvider = document.getElementById("llmProvider");
    const llmModel = document.getElementById("llmModel");
    const llmApiKey = document.getElementById("llmApiKey");
    const apiKeyGroup = document.getElementById("apiKeyGroup");

    // Default Config
    let llmConfig = {
        provider: "gemini",
        model: "gemini-1.5-flash",
        api_key: ""
    };

    // Load saved config if available
    const savedConfig = localStorage.getItem("oxygenLlmConfig");
    if (savedConfig) {
        llmConfig = JSON.parse(savedConfig);
        llmProvider.value = llmConfig.provider;
        llmModel.value = llmConfig.model;
        llmApiKey.value = llmConfig.api_key;
    }

    // Toggle API key visibility based on provider
    llmProvider.addEventListener("change", () => {
        if (llmProvider.value === "ollama") {
            apiKeyGroup.style.display = "none";
            if (llmModel.value === "gemini-1.5-flash") llmModel.value = "llama3.1";
        } else {
            apiKeyGroup.style.display = "flex";
            if (llmModel.value === "llama3.1") llmModel.value = "gemini-1.5-flash";
        }
    });

    // Manually trigger change to set initial state
    llmProvider.dispatchEvent(new Event("change"));

    // Modal Togglers
    settingsBtn.addEventListener("click", () => settingsModal.classList.remove("hidden"));
    closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

    const socket = new WebSocket("ws://127.0.0.1:8000/ws");

    socket.onopen = function () {
        console.log("Connected to Oxygen Backend");
        sendConfig(); // Send initial config
    };

    function sendConfig() {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "config", config: llmConfig }));
        }
    }

    saveSettingsBtn.addEventListener("click", () => {
        llmConfig = {
            provider: llmProvider.value,
            model: llmModel.value,
            api_key: llmApiKey.value
        };
        localStorage.setItem("oxygenLlmConfig", JSON.stringify(llmConfig));
        sendConfig();
        settingsModal.classList.add("hidden");
    });

    // Helper: Determine file extension and smart default names
    function getSmartFileInfo(agentName, lang, index) {
        lang = lang ? lang.toLowerCase().trim() : '';

        if (agentName === 'writer') return { ext: 'md', filename: 'README.md' };
        if (agentName === 'tester') return { ext: 'md', filename: `QA_REPORT_${index}.md` };
        if (agentName === 'researcher') return { ext: 'md', filename: 'ARCHITECTURE_PROPOSAL.md' };

        let ext = 'py';
        if (lang === 'python' || lang === 'py') ext = 'py';
        else if (lang === 'cpp' || lang === 'c++') ext = 'cpp';
        else if (lang === 'javascript' || lang === 'js') ext = 'js';
        else if (lang === 'html') ext = 'html';
        else if (lang === 'css') ext = 'css';
        else if (lang === 'json') ext = 'json';
        else if (lang === 'bash' || lang === 'sh') ext = 'sh';
        else if (lang === 'text' || lang === 'txt') ext = 'txt';

        let filename = (ext === 'txt' && index === 1) ? 'requirements.txt' : `source_code_${index}.${ext}`;
        return { ext: ext, filename: filename };
    }

    // Smart Parser: Converts code blocks into download cards
    function cleanAgentMessage(text, agentName) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let matchCount = 0;

        let cleanText = text.replace(codeBlockRegex, function (match, lang, code) {
            matchCount++;
            const fileInfo = getSmartFileInfo(agentName, lang, matchCount);
            const safeCode = btoa(unescape(encodeURIComponent(code)));

            return `
                <div class="file-card">
                    <div class="file-card-inner">
                        <span class="file-name">📄 ${fileInfo.filename}</span>
                        <button class="download-btn" onclick="window.downloadFile('${safeCode}', '${fileInfo.filename}')">
                            ⬇️ Download
                        </button>
                    </div>
                </div>
            `;
        });

        // Basic formatting
        cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cleanText = cleanText.replace(/\n/g, '<br>');

        return cleanText;
    }

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        let badgeClass = "pm-badge";
        if (data.agent === "researcher") badgeClass = "researcher-badge";
        if (data.agent === "developer") badgeClass = "developer-badge";
        if (data.agent === "tester") badgeClass = "tester-badge";
        if (data.agent === "writer") badgeClass = "writer-badge";

        window.activeAgent = data.agent;
        window.isWorking = true; // Ensure they are marked working if we get a message

        // Stop the working animation after a brief delay so they don't look permanently stuck
        setTimeout(() => {
            if (window.activeAgent === data.agent) {
                // If it's the writer, they are usually the last step.
                if (data.agent === "writer" || data.agent === "pm") {
                    window.isWorking = false;
                }
                window.activeAgent = null;
            }
        }, 4000);

        const formattedContent = cleanAgentMessage(data.content, data.agent);
        appendMessage(data.label, formattedContent, badgeClass, "ai-message");
    };

    function appendMessage(sender, text, badgeClass, typeClass) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${typeClass}`;
        msgDiv.innerHTML = `
            <div class="message-header">
                <span class="agent-badge ${badgeClass}">${sender}</span>
            </div>
            <div class="message-bubble">${text}</div>
        `;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    sendBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (text && socket.readyState === WebSocket.OPEN) {
            window.isWorking = true;
            window.activeAgent = "pm"; // PM takes it first
            appendMessage("You", text, "user-badge", "user-message");
            socket.send(JSON.stringify({ type: "user_input", content: text }));
            userInput.value = "";
        }
    });

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });
});