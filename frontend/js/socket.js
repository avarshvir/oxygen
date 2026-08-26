window.isWorking = false;
// 1. Globally accessible download function
window.downloadFile = function(base64Code, filename) {
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

    const socket = new WebSocket("ws://127.0.0.1:8000/ws");

    socket.onopen = function() {
        console.log("Connected to Oxygen Backend");
    };

    // Helper: Determine file extension and smart default names
    function getSmartFileInfo(agentName, lang, index) {
        lang = lang ? lang.toLowerCase().trim() : '';

        // 1. Technical Writer always produces markdown docs
        if (agentName === 'writer') {
            return { ext: 'md', filename: 'README.md' };
        }

        // 2. QA Tester produces test reports
        if (agentName === 'tester') {
            return { ext: 'md', filename: `QA_REPORT_${index}.md` };
        }

        // 3. Researcher produces architecture specs
        if (agentName === 'researcher') {
            return { ext: 'md', filename: 'ARCHITECTURE_PROPOSAL.md' };
        }

        // 4. Developer generates code based on language tag
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

        let cleanText = text.replace(codeBlockRegex, function(match, lang, code) {
            matchCount++;
            const fileInfo = getSmartFileInfo(agentName, lang, matchCount);
            const safeCode = btoa(unescape(encodeURIComponent(code)));

            return `
                <div class="card mt-2 mb-2 bg-dark text-white border-secondary" style="max-width: 480px;">
                    <div class="card-body d-flex justify-content-between align-items-center p-2">
                        <span class="small font-monospace text-truncate me-2">📄 ${fileInfo.filename}</span>
                        <button class="btn btn-sm btn-success text-nowrap" onclick="window.downloadFile('${safeCode}', '${fileInfo.filename}')">
                            ⬇️ Download (${fileInfo.ext.toUpperCase()})
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

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);

        let badgeColor = "bg-primary";
        if (data.agent === "researcher") badgeColor = "bg-success";
        if (data.agent === "developer") badgeColor = "bg-dark";
        if (data.agent === "tester") badgeColor = "bg-danger";
        if (data.agent === "writer") badgeColor = "bg-info";

        window.activeAgent = data.agent;

        setTimeout(() => {
            if (window.activeAgent === data.agent) {
                window.activeAgent = null;
            }
        }, 3000);

        const formattedContent = cleanAgentMessage(data.content, data.agent);
        appendMessage(data.label, formattedContent, badgeColor, "bg-light", "text-start");
    };

    function appendMessage(sender, text, badgeClass, bgClass, alignClass) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `mb-2 ${alignClass}`;
        msgDiv.innerHTML = `
            <span class="badge ${badgeClass}">${sender}</span>
            <div class="border rounded p-2 mt-1 ${bgClass} text-dark d-inline-block text-start" style="max-width: 85%; word-break: break-word;">${text}</div>
        `;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    /*
    sendBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (text && socket.readyState === WebSocket.OPEN) {
            appendMessage("You", text, "bg-secondary", "bg-white", "text-end");
            socket.send(JSON.stringify({ type: "user_input", content: text }));
            userInput.value = "";
        }
    });*/

    sendBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (text && socket.readyState === WebSocket.OPEN) {
            window.isWorking = true; // <-- TRIGGER WORK MODE!
            appendMessage("You", text, "bg-secondary", "bg-white", "text-end");
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