window.activeAgent = null;

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("officeCanvas");
    const ctx = canvas.getContext("2d");
    
    // Kept the massive resolution for the floorplan
    canvas.width = 1000;
    canvas.height = 600;

    // --- 1. Define the Floorplan (Cabins & Areas) ---
    const rooms = [
        // Top Row
        { name: "Reception", x: 10, y: 10, w: 150, h: 200, color: "#fffde7", props: [{type: "plant", x: 20, y: 80}, {type: "desk", x: 80, y: 120}] },
        { name: "HR Dept.", x: 170, y: 10, w: 150, h: 200, color: "#fce4ec", props: [{type: "cabinet", x: 180, y: 60}] },
        { name: "PM Cabin", x: 330, y: 10, w: 160, h: 200, color: "#e3f2fd", props: [{type: "chart", x: 350, y: 60}] },
        { name: "Meeting Room", x: 500, y: 10, w: 220, h: 200, color: "#f3e5f5", props: [{type: "meeting_table", x: 550, y: 100}] },
        { name: "Data Server", x: 730, y: 10, w: 120, h: 200, color: "#212529", textColor: "#fff", props: [{type: "server", x: 750, y: 80}, {type: "server", x: 800, y: 80}] },
        { name: "Machinery", x: 860, y: 10, w: 130, h: 200, color: "#eceff1", props: [{type: "machine", x: 880, y: 80}] },
        
        // Middle Row (Hallway)
        { name: "Main Hallway", x: 10, y: 220, w: 980, h: 60, color: "#dee2e6", props: [] },

        // Bottom Row
        { name: "Cafeteria", x: 10, y: 290, w: 150, h: 300, color: "#fff3e0", props: [{type: "table", x: 60, y: 400}, {type: "table", x: 100, y: 480}] },
        { name: "Gym", x: 170, y: 290, w: 150, h: 300, color: "#e0f7fa", props: [{type: "weights", x: 200, y: 400}, {type: "mat", x: 220, y: 480}] },
        { name: "Dev Cabin", x: 330, y: 290, w: 160, h: 300, color: "#f8f9fa", props: [{type: "whiteboard", x: 350, y: 450}] },
        { name: "Tester Cabin", x: 500, y: 290, w: 160, h: 300, color: "#ffebee", props: [{type: "whiteboard", x: 520, y: 450}] },
        { name: "Writer Cabin", x: 670, y: 290, w: 160, h: 300, color: "#e0f2f1", props: [{type: "cabinet", x: 690, y: 450}] },
        { name: "Research", x: 840, y: 290, w: 150, h: 300, color: "#e8f5e9", props: [{type: "bookshelf", x: 860, y: 450}] }
    ];

    // --- 2. Define All Employees ---
    const employees = [
        { id: "receptionist", label: "Stacy (Rec)", color: "#9c27b0", isAI: false, x: 80, y: 150, targetX: 80, targetY: 150 },
        { id: "hr", label: "Bob (HR)", color: "#ff9800", isAI: false, x: 240, y: 150, targetX: 240, targetY: 150 },
        { id: "pm", label: "Manager", color: "#0d6efd", isAI: true, deskX: 410, deskY: 120, x: 410, y: 120, targetX: 410, targetY: 120 },
        { id: "developer", label: "Developer", color: "#212529", isAI: true, deskX: 410, deskY: 360, x: 410, y: 360, targetX: 410, targetY: 360 },
        { id: "tester", label: "QA Tester", color: "#dc3545", isAI: true, deskX: 580, deskY: 360, x: 580, y: 360, targetX: 580, targetY: 360 },
        { id: "writer", label: "Tech Writer", color: "#0dcaf0", isAI: true, deskX: 750, deskY: 360, x: 750, y: 360, targetX: 750, targetY: 360 },
        { id: "researcher", label: "Researcher", color: "#198754", isAI: true, deskX: 910, deskY: 360, x: 910, y: 360, targetX: 910, targetY: 360 }
    ];

    let frame = 0;
    const SPEED = 2.0;

    // --- Custom Geometric Prop Renderer ---
    function drawProp(type, x, y) {
        ctx.lineWidth = 1;
        if (type === "server") {
            ctx.fillStyle = "#343a40"; ctx.fillRect(x, y, 30, 80); 
            ctx.fillStyle = (frame % 40 < 20) ? "#20c997" : "#dc3545"; // Blinking lights
            ctx.fillRect(x + 5, y + 10, 20, 5); ctx.fillRect(x + 5, y + 30, 20, 5);
        } else if (type === "plant") {
            ctx.fillStyle = "#8B4513"; ctx.fillRect(x + 5, y + 20, 15, 15); 
            ctx.fillStyle = "#28a745"; ctx.beginPath(); ctx.arc(x + 12, y + 10, 12, 0, Math.PI * 2); ctx.fill();
        } else if (type === "desk") {
            ctx.fillStyle = "#d4a373"; ctx.fillRect(x, y, 50, 25);
        } else if (type === "cabinet") {
            ctx.fillStyle = "#6c757d"; ctx.fillRect(x, y, 25, 45);
            ctx.fillStyle = "#ced4da"; ctx.fillRect(x + 5, y + 5, 15, 10); ctx.fillRect(x + 5, y + 20, 15, 10);
        } else if (type === "bookshelf") {
            ctx.fillStyle = "#5c4033"; ctx.fillRect(x, y, 30, 50);
            ctx.fillStyle = "#e0a96d"; ctx.fillRect(x + 5, y + 10, 8, 12); ctx.fillRect(x + 15, y + 25, 10, 12);
        } else if (type === "table") {
            ctx.fillStyle = "#faedcd"; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#d4a373"; ctx.stroke();
        } else if (type === "meeting_table") {
            ctx.fillStyle = "#b08d6a"; ctx.fillRect(x, y, 100, 40); // Big Table
            ctx.fillStyle = "#343a40"; // Chairs
            ctx.fillRect(x + 10, y - 10, 15, 10); ctx.fillRect(x + 40, y - 10, 15, 10); ctx.fillRect(x + 75, y - 10, 15, 10);
            ctx.fillRect(x + 10, y + 40, 15, 10); ctx.fillRect(x + 40, y + 40, 15, 10); ctx.fillRect(x + 75, y + 40, 15, 10);
        } else if (type === "weights") {
            ctx.fillStyle = "#495057"; ctx.fillRect(x, y + 10, 30, 4); 
            ctx.fillRect(x - 5, y + 5, 5, 14); ctx.fillRect(x + 30, y + 5, 5, 14); 
        } else if (type === "mat") {
            ctx.fillStyle = "#17a2b8"; ctx.fillRect(x, y, 40, 15);
        } else if (type === "chart") {
            ctx.fillStyle = "#fff"; ctx.fillRect(x, y, 35, 25); ctx.strokeStyle = "#000"; ctx.strokeRect(x, y, 35, 25);
            ctx.fillStyle = "#dc3545"; ctx.fillRect(x + 5, y + 10, 6, 15);
            ctx.fillStyle = "#28a745"; ctx.fillRect(x + 15, y + 5, 6, 20);
        } else if (type === "whiteboard") {
            ctx.fillStyle = "#fff"; ctx.fillRect(x, y, 40, 25); ctx.strokeStyle = "#000"; ctx.strokeRect(x, y, 40, 25);
            ctx.fillStyle = "#adb5bd"; ctx.fillRect(x + 5, y + 5, 15, 3);
        } else if (type === "machine") {
            ctx.fillStyle = "#95a5a6"; ctx.fillRect(x, y, 50, 40); // Base
            ctx.fillStyle = "#7f8c8d"; ctx.fillRect(x + 10, y - 20, 30, 20); // Top vent
            ctx.fillStyle = (frame % 20 < 10) ? "#f1c40f" : "#e67e22"; // Moving laser/light
            ctx.fillRect(x + 15, y + 15, 20, 5);
        }
    }

    function getRandomWanderTarget() {
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        return {
            x: room.x + 30 + Math.random() * (room.w - 60),
            y: room.y + 40 + Math.random() * (room.h - 80)
        };
    }

    function drawOffice() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // --- Draw Rooms & Props ---
        rooms.forEach(room => {
            ctx.fillStyle = room.color;
            ctx.fillRect(room.x, room.y, room.w, room.h);
            ctx.strokeStyle = "#adb5bd";
            ctx.strokeRect(room.x, room.y, room.w, room.h);
            
            ctx.fillStyle = room.textColor || "#495057";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "left";
            ctx.fillText(room.name, room.x + 5, room.y + 15);

            room.props.forEach(prop => drawProp(prop.type, prop.x, prop.y));
        });

        // --- Update & Draw Employees ---
        employees.forEach(emp => {
            if (emp.isAI && window.isWorking) {
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
            const isSpeaking = window.activeAgent === emp.id;
            const bounce = isSpeaking ? Math.sin(frame * 0.3) * 4 : 0;

            // Draw Detailed Desk Setup (PC, Monitor, Phone)
            if (isAtDesk) {
                // Desk Table
                ctx.fillStyle = "#8B4513"; ctx.fillRect(emp.deskX - 30, emp.deskY + 10, 60, 25); 
                // PC Tower
                ctx.fillStyle = "#212529"; ctx.fillRect(emp.deskX - 28, emp.deskY + 12, 10, 20); 
                // Monitor Stand & Screen
                ctx.fillStyle = "#6c757d"; ctx.fillRect(emp.deskX - 2, emp.deskY + 18, 4, 6); 
                ctx.fillStyle = "#343a40"; ctx.fillRect(emp.deskX - 12, emp.deskY + 2, 24, 16); 
                // Screen Glow (Active if working)
                ctx.fillStyle = (isSpeaking || window.isWorking) ? "#0d6efd" : "#212529"; 
                ctx.fillRect(emp.deskX - 10, emp.deskY + 4, 20, 12); 
                // Keyboard
                ctx.fillStyle = "#ced4da"; ctx.fillRect(emp.deskX - 10, emp.deskY + 26, 20, 6); 
                // Mobile Phone
                ctx.fillStyle = "#000"; ctx.fillRect(emp.deskX + 15, emp.deskY + 26, 6, 8); 
                ctx.fillStyle = "#0dcaf0"; ctx.fillRect(emp.deskX + 16, emp.deskY + 27, 4, 6); // Phone screen
            }

            // --- Draw Upgraded Avatar ---
            // Legs
            ctx.fillStyle = "#343a40"; 
            ctx.fillRect(emp.x - 6, emp.y + 10 + bounce, 4, 10);
            ctx.fillRect(emp.x + 2, emp.y + 10 + bounce, 4, 10);
            
            // Torso (Uses their agent color)
            ctx.fillStyle = emp.color;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(emp.x - 10, emp.y - 10 + bounce, 20, 22, 4) : ctx.fillRect(emp.x - 10, emp.y - 10 + bounce, 20, 22);
            ctx.fill();

            // Arms (Swing slightly if moving)
            const armSwing = (distance > SPEED) ? Math.sin(frame * 0.3) * 5 : 0;
            ctx.fillStyle = emp.color;
            ctx.fillRect(emp.x - 14, emp.y - 8 + bounce + armSwing, 4, 15);
            ctx.fillRect(emp.x + 10, emp.y - 8 + bounce - armSwing, 4, 15);

            // Head (Skin tone)
            ctx.fillStyle = "#ffb6c1";
            ctx.beginPath();
            ctx.arc(emp.x, emp.y - 16 + bounce, 8, 0, Math.PI * 2);
            ctx.fill();

            // Draw Name Badge
            ctx.fillStyle = "#000";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(emp.label, emp.x, emp.y + 32);

            // Draw Speech Bubble
            if (isSpeaking) {
                ctx.fillStyle = "white";
                ctx.fillRect(emp.x - 25, emp.y - 45 + bounce, 50, 16);
                ctx.strokeStyle = "black"; ctx.lineWidth = 1;
                ctx.strokeRect(emp.x - 25, emp.y - 45 + bounce, 50, 16);
                ctx.fillStyle = "black";
                ctx.font = "9px monospace";
                ctx.fillText("Working..", emp.x, emp.y - 34 + bounce);
            }
        });

        frame++;
        requestAnimationFrame(drawOffice);
    }

    drawOffice();
});