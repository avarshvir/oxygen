window.activeAgent = null;
window.isWorking = false;

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("officeCanvas");
    const ctx = canvas.getContext("2d");
    const container = document.getElementById("canvasContainer");
    const activeBadge = document.getElementById("activeAgentBadge");
    
    // Virtual floorplan resolution (Internal game coordinates)
    const VIRTUAL_WIDTH = 1000;
    const VIRTUAL_HEIGHT = 600;

    function resizeCanvas() {
        const containerRect = container.getBoundingClientRect();
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
        
        // Calculate scaling factor to fit VIRTUAL coords into ACTUAL canvas
        const scaleX = canvas.width / VIRTUAL_WIDTH;
        const scaleY = canvas.height / VIRTUAL_HEIGHT;
        window.scale = Math.min(scaleX, scaleY);
        
        // Calculate offset to center the floorplan
        window.offsetX = (canvas.width - (VIRTUAL_WIDTH * window.scale)) / 2;
        window.offsetY = (canvas.height - (VIRTUAL_HEIGHT * window.scale)) / 2;
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // --- 1. Define the Floorplan (Cabins & Areas) ---
    const rooms = [
        // Top Row
        { name: "Reception", x: 10, y: 10, w: 150, h: 200, color: "rgba(255, 253, 231, 0.8)", props: [{type: "plant", x: 20, y: 80}, {type: "desk", x: 80, y: 120}] },
        { name: "HR Dept.", x: 170, y: 10, w: 150, h: 200, color: "rgba(252, 228, 236, 0.8)", props: [{type: "cabinet", x: 180, y: 60}] },
        { name: "PM Cabin", x: 330, y: 10, w: 160, h: 200, color: "rgba(227, 242, 253, 0.8)", props: [{type: "chart", x: 350, y: 60}] },
        { name: "Meeting Room", x: 500, y: 10, w: 220, h: 200, color: "rgba(243, 229, 245, 0.8)", props: [{type: "meeting_table", x: 550, y: 100}] },
        { name: "Data Server", x: 730, y: 10, w: 120, h: 200, color: "rgba(33, 37, 41, 0.8)", textColor: "#fff", props: [{type: "server", x: 750, y: 80}, {type: "server", x: 800, y: 80}] },
        { name: "Machinery", x: 860, y: 10, w: 130, h: 200, color: "rgba(236, 239, 241, 0.8)", props: [{type: "machine", x: 880, y: 80}] },
        
        // Middle Row (Hallway)
        { name: "Main Hallway", x: 10, y: 220, w: 980, h: 60, color: "rgba(222, 226, 230, 0.8)", props: [] },

        // Bottom Row
        { name: "Cafeteria", x: 10, y: 290, w: 150, h: 300, color: "rgba(255, 243, 224, 0.8)", props: [{type: "table", x: 60, y: 400}, {type: "table", x: 100, y: 480}] },
        { name: "Gym", x: 170, y: 290, w: 150, h: 300, color: "rgba(224, 247, 250, 0.8)", props: [{type: "weights", x: 200, y: 400}, {type: "mat", x: 220, y: 480}] },
        { name: "Dev Cabin", x: 330, y: 290, w: 160, h: 300, color: "rgba(248, 249, 250, 0.8)", props: [{type: "whiteboard", x: 350, y: 450}] },
        { name: "Tester Cabin", x: 500, y: 290, w: 160, h: 300, color: "rgba(255, 235, 238, 0.8)", props: [{type: "whiteboard", x: 520, y: 450}] },
        { name: "Writer Cabin", x: 670, y: 290, w: 160, h: 300, color: "rgba(224, 242, 241, 0.8)", props: [{type: "cabinet", x: 690, y: 450}] },
        { name: "Research", x: 840, y: 290, w: 150, h: 300, color: "rgba(232, 245, 233, 0.8)", props: [{type: "bookshelf", x: 860, y: 450}] }
    ];

    // --- 2. Define All Employees ---
    const employees = [
        { id: "receptionist", label: "Stacy", color: "#9c27b0", isAI: false, x: 80, y: 150, targetX: 80, targetY: 150 },
        { id: "hr", label: "Bob", color: "#ff9800", isAI: false, x: 240, y: 150, targetX: 240, targetY: 150 },
        { id: "pm", label: "PM", color: "#3b82f6", isAI: true, deskX: 410, deskY: 120, x: 410, y: 120, targetX: 410, targetY: 120 },
        { id: "developer", label: "Dev", color: "#8b5cf6", isAI: true, deskX: 410, deskY: 360, x: 410, y: 360, targetX: 410, targetY: 360 },
        { id: "tester", label: "QA", color: "#ef4444", isAI: true, deskX: 580, deskY: 360, x: 580, y: 360, targetX: 580, targetY: 360 },
        { id: "writer", label: "Writer", color: "#06b6d4", isAI: true, deskX: 750, deskY: 360, x: 750, y: 360, targetX: 750, targetY: 360 },
        { id: "researcher", label: "Research", color: "#10b981", isAI: true, deskX: 910, deskY: 360, x: 910, y: 360, targetX: 910, targetY: 360 }
    ];

    let frame = 0;
    const SPEED = 2.0;

    // --- Pixel Art Sprite Renderer ---
    const SPRITE_SCALE = 3;
    const baseSprite = [
        "000555550000",
        "005555555000",
        "005222225000",
        "002262622000",
        "002222222000",
        "000222220000",
        "000333330000",
        "003333333000",
        "033343433300",
        "033343433300",
        "033333333300",
        "000440440000",
        "000110110000",
        "000110110000",
        "001110111000"
    ];

    function drawPixelArt(ctx, x, y, primaryColor, bounce) {
        // Color mapping: 0=transparent, 1=pants, 2=skin, 3=primary, 4=secondary/shade, 5=hair, 6=eyes
        const colors = {
            "0": null,
            "1": "#2c3e50",
            "2": "#ffcca8",
            "3": primaryColor,
            "4": "rgba(0,0,0,0.2)", // Shading over primary
            "5": "#3e2723",
            "6": "#ffffff"
        };
        
        const offsetX = x - (6 * SPRITE_SCALE);
        const offsetY = y - (15 * SPRITE_SCALE) + bounce;

        for (let row = 0; row < baseSprite.length; row++) {
            for (let col = 0; col < baseSprite[row].length; col++) {
                const px = baseSprite[row][col];
                if (px !== "0") {
                    ctx.fillStyle = (px === "4") ? primaryColor : colors[px];
                    ctx.fillRect(offsetX + (col * SPRITE_SCALE), offsetY + (row * SPRITE_SCALE), SPRITE_SCALE, SPRITE_SCALE);
                    if (px === "4") {
                        // Apply shade
                        ctx.fillStyle = colors["4"];
                        ctx.fillRect(offsetX + (col * SPRITE_SCALE), offsetY + (row * SPRITE_SCALE), SPRITE_SCALE, SPRITE_SCALE);
                    }
                }
            }
        }
    }

    // --- Custom Geometric Prop Renderer ---
    function drawProp(type, x, y) {
        ctx.lineWidth = 1;
        if (type === "server") {
            ctx.fillStyle = "#2c3e50"; ctx.fillRect(x, y, 35, 85); 
            ctx.fillStyle = "#34495e"; ctx.fillRect(x+2, y+2, 31, 81); 
            ctx.fillStyle = (frame % 40 < 20) ? "#2ecc71" : "#e74c3c"; // Blinking lights
            ctx.fillRect(x + 5, y + 10, 20, 5); ctx.fillRect(x + 5, y + 30, 20, 5);
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(x + 5, y + 50, 5, 5);
        } else if (type === "plant") {
            ctx.fillStyle = "#d35400"; ctx.fillRect(x + 5, y + 25, 20, 20); // Pot
            ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.arc(x + 15, y + 15, 16, 0, Math.PI * 2); ctx.fill(); // Leaves
            ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.arc(x + 10, y + 10, 10, 0, Math.PI * 2); ctx.fill(); // Highlights
        } else if (type === "desk") {
            ctx.fillStyle = "#a0522d"; ctx.fillRect(x, y, 60, 30);
            ctx.fillStyle = "#8b4513"; ctx.fillRect(x, y, 60, 5);
        } else if (type === "cabinet") {
            ctx.fillStyle = "#7f8c8d"; ctx.fillRect(x, y, 30, 50);
            ctx.fillStyle = "#bdc3c7"; ctx.fillRect(x + 5, y + 5, 20, 12); ctx.fillRect(x + 5, y + 22, 20, 12);
            ctx.fillStyle = "#34495e"; ctx.fillRect(x + 12, y + 10, 6, 2); ctx.fillRect(x + 12, y + 27, 6, 2); // Handles
        } else if (type === "bookshelf") {
            ctx.fillStyle = "#5c4033"; ctx.fillRect(x, y, 40, 60);
            ctx.fillStyle = "#e0a96d"; ctx.fillRect(x + 5, y + 10, 10, 14); ctx.fillRect(x + 20, y + 28, 14, 14);
            ctx.fillStyle = "#c0392b"; ctx.fillRect(x + 20, y + 10, 8, 14); ctx.fillStyle = "#2980b9"; ctx.fillRect(x + 5, y + 28, 10, 14);
        } else if (type === "table") {
            ctx.fillStyle = "#f39c12"; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#d35400"; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = "#fff"; ctx.fillRect(x-5, y-5, 10, 10); // Centerpiece
        } else if (type === "meeting_table") {
            ctx.fillStyle = "#e67e22"; ctx.fillRect(x, y, 120, 50); // Big Table
            ctx.fillStyle = "#d35400"; ctx.fillRect(x, y, 120, 5);
            ctx.fillStyle = "#2c3e50"; // Chairs
            ctx.fillRect(x + 15, y - 12, 20, 12); ctx.fillRect(x + 50, y - 12, 20, 12); ctx.fillRect(x + 85, y - 12, 20, 12);
            ctx.fillRect(x + 15, y + 50, 20, 12); ctx.fillRect(x + 50, y + 50, 20, 12); ctx.fillRect(x + 85, y + 50, 20, 12);
        } else if (type === "weights") {
            ctx.fillStyle = "#34495e"; ctx.fillRect(x, y + 10, 40, 6); 
            ctx.fillRect(x - 8, y + 4, 8, 18); ctx.fillRect(x + 40, y + 4, 8, 18); 
        } else if (type === "mat") {
            ctx.fillStyle = "#1abc9c"; ctx.fillRect(x, y, 50, 20);
        } else if (type === "chart") {
            ctx.fillStyle = "#ecf0f1"; ctx.fillRect(x, y, 45, 35); ctx.strokeStyle = "#bdc3c7"; ctx.strokeRect(x, y, 45, 35);
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(x + 8, y + 15, 8, 20);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(x + 20, y + 10, 8, 25);
            ctx.fillStyle = "#3498db"; ctx.fillRect(x + 32, y + 5, 8, 30);
        } else if (type === "whiteboard") {
            ctx.fillStyle = "#ecf0f1"; ctx.fillRect(x, y, 50, 30); ctx.strokeStyle = "#7f8c8d"; ctx.lineWidth=2; ctx.strokeRect(x, y, 50, 30);
            ctx.fillStyle = "#34495e"; ctx.fillRect(x + 5, y + 5, 20, 3); ctx.fillRect(x + 5, y + 12, 35, 3);
        } else if (type === "machine") {
            ctx.fillStyle = "#95a5a6"; ctx.fillRect(x, y, 60, 50); // Base
            ctx.fillStyle = "#7f8c8d"; ctx.fillRect(x + 10, y - 25, 40, 25); // Top vent
            ctx.fillStyle = (frame % 20 < 10) ? "#f1c40f" : "#e67e22"; // Moving laser/light
            ctx.fillRect(x + 15, y + 20, 30, 8);
        }
    }

    const leisureRooms = ["Cafeteria", "Gym", "Meeting Room", "Reception", "Main Hallway"];
    function getRandomWanderTarget() {
        const targets = rooms.filter(r => leisureRooms.includes(r.name));
        const room = targets[Math.floor(Math.random() * targets.length)] || rooms[0];
        return {
            x: room.x + 30 + Math.random() * (room.w - 60),
            y: room.y + 40 + Math.random() * (room.h - 80)
        };
    }

    // --- Badge UI Updater ---
    function updateBadgeUI() {
        if (!window.activeAgent || !window.isWorking) {
            activeBadge.textContent = "Standby";
            activeBadge.style.color = "var(--text-secondary)";
            activeBadge.style.background = "rgba(255,255,255,0.05)";
            activeBadge.style.border = "1px solid rgba(255,255,255,0.1)";
            return;
        }

        let agentName = "Unknown";
        let agentColor = "white";
        
        const agent = employees.find(e => e.id === window.activeAgent);
        if (agent) {
            agentName = agent.label;
            agentColor = agent.color;
        }

        activeBadge.textContent = `${agentName} is thinking...`;
        activeBadge.style.color = agentColor;
        activeBadge.style.background = `rgba(${hexToRgb(agentColor)}, 0.15)`;
        activeBadge.style.border = `1px solid rgba(${hexToRgb(agentColor)}, 0.4)`;
    }

    function hexToRgb(hex) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }

    function drawOffice() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render a grid pattern for the floor background to make it look like a real pixel game
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        
        updateBadgeUI();

        ctx.save();
        ctx.translate(window.offsetX, window.offsetY);
        ctx.scale(window.scale, window.scale);
        
        // --- Draw Rooms & Props ---
        rooms.forEach(room => {
            // Draw floor shadow/depth
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            ctx.fillRect(room.x+5, room.y+5, room.w, room.h);
            
            // Draw floor base
            ctx.fillStyle = room.color;
            ctx.fillRect(room.x, room.y, room.w, room.h);
            
            // Draw thick walls
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 4;
            ctx.strokeRect(room.x, room.y, room.w, room.h);
            
            // Inner carpet/rug effect for some rooms
            if(room.name !== "Main Hallway" && room.name !== "Cafeteria" && room.name !== "Gym") {
                ctx.fillStyle = "rgba(0,0,0,0.05)";
                ctx.fillRect(room.x+10, room.y+30, room.w-20, room.h-40);
            }
            
            ctx.fillStyle = room.textColor || "#2c3e50";
            ctx.font = "bold 14px 'Outfit', sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(room.name, room.x + 10, room.y + 20);

            room.props.forEach(prop => drawProp(prop.type, prop.x, prop.y));
        });

        // --- Update & Draw Employees ---
        // Sort employees by Y coordinate for proper depth rendering (z-index)
        const sortedEmployees = [...employees].sort((a, b) => a.y - b.y);

        sortedEmployees.forEach(emp => {
            const isActive = window.activeAgent === emp.id;
            
            if (emp.isAI && isActive) {
                emp.targetX = emp.deskX;
                emp.targetY = emp.deskY;
            } else {
                const distToTarget = Math.hypot(emp.targetX - emp.x, emp.targetY - emp.y);
                if (distToTarget < 5 && Math.random() < 0.01) { 
                    const newTarget = getRandomWanderTarget();
                    emp.targetX = newTarget.x;
                    emp.targetY = newTarget.y;
                }
            }

            const dx = emp.targetX - emp.x;
            const dy = emp.targetY - emp.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > SPEED) {
                emp.x += (dx / distance) * SPEED;
                emp.y += (dy / distance) * SPEED;
            } else {
                emp.x = emp.targetX;
                emp.y = emp.targetY;
            }

            const isAtDesk = emp.isAI && (Math.abs(emp.x - emp.deskX) < 5 && Math.abs(emp.y - emp.deskY) < 5);
            const isSpeaking = window.activeAgent === emp.id && window.isWorking;
            // Only bounce if walking or speaking
            const bounce = (isSpeaking || distance > SPEED) ? Math.sin(frame * 0.4) * 3 : 0;

            // Draw Detailed Desk Setup (PC, Monitor, Phone)
            if (isAtDesk) {
                // Desk Table
                ctx.fillStyle = "#8B4513"; ctx.fillRect(emp.deskX - 35, emp.deskY + 5, 70, 35); 
                // PC Tower
                ctx.fillStyle = "#212529"; ctx.fillRect(emp.deskX - 33, emp.deskY + 8, 12, 25); 
                // Monitor Stand & Screen
                ctx.fillStyle = "#6c757d"; ctx.fillRect(emp.deskX - 2, emp.deskY + 15, 4, 8); 
                ctx.fillStyle = "#343a40"; ctx.fillRect(emp.deskX - 15, emp.deskY - 5, 30, 20); 
                // Screen Glow (Active if working)
                ctx.fillStyle = isSpeaking ? emp.color : "#212529"; 
                ctx.fillRect(emp.deskX - 12, emp.deskY - 2, 24, 14); 
                // Keyboard
                ctx.fillStyle = "#ced4da"; ctx.fillRect(emp.deskX - 12, emp.deskY + 25, 24, 8); 
            }

            // Draw Pixel Art Avatar with shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(emp.x, emp.y + 10, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            drawPixelArt(ctx, emp.x, emp.y, emp.color, bounce);

            // Draw Name Badge
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(emp.label, emp.x, emp.y + 32);

            // Draw Speech Bubble and glow if working
            if (isSpeaking) {
                // Glow effect
                ctx.shadowColor = emp.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(emp.x, emp.y, 25, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.fillStyle = "rgba(0,0,0,0.8)";
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(emp.x - 25, emp.y - 45 + bounce, 50, 16, 4);
                    ctx.fill();
                } else {
                    ctx.fillRect(emp.x - 25, emp.y - 45 + bounce, 50, 16);
                }
                ctx.fillStyle = "white";
                ctx.font = "10px Inter, sans-serif";
                ctx.fillText("Working", emp.x, emp.y - 34 + bounce);
            }
        });

        ctx.restore();
        frame++;
        requestAnimationFrame(drawOffice);
    }

    drawOffice();
});