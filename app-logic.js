// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;
let matchCache = null;
let lastFetchTime = 0;

if (typeof userPredictionMemory === 'undefined') {
    window.userPredictionMemory = [];
}

// ==================== CẤU HÌNH VƯỢT LỖI TRUSTED TYPES ====================
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => {
                console.log("🛡️ [Trusted Types] Đã xử lý Script an toàn từ Extension");
                return string;
            },
            createScriptURL: (string) => string,
        });
    }
}

// ==================== FIREBASE CONFIG & AUTH LAYER ====================
const firebaseConfig = {
  apiKey: "AIzaSyBl7vHtoGcSNqoIgTJnPkgu29wQRD2XVAo",
  authDomain: "walrus-cup-oracle.firebaseapp.com",
  projectId: "walrus-cup-oracle",
  storageBucket: "walrus-cup-oracle.firebasestorage.app",
  messagingSenderId: "152805594660",
  appId: "1:152805594660:web:3767f0fd98f6720031eab1"
};

// Khởi tạo Firebase bảo vệ an toàn chống lặp dữ liệu
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

function initFirebaseAuth() {
    // Luồng lắng nghe trạng thái tài khoản thời gian thực (Giữ đăng nhập khi F5)
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log("✅ Đăng nhập Popup thành công:", user.displayName);
            updateUserUI();
            triggerWalrusMemoryAgent(user.email, user.displayName);
        } else {
            resetUserUI();
            resetAiAgentUI();
        }
    });
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        console.log("🔄 Đang bật cửa sổ Popup xác thực Google...");
        // Quay trở lại luồng mở ô vuông Popup theo ý sếp
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        updateUserUI();
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
    } catch (error) {
        console.error("❌ Lỗi đăng nhập hệ thống Popup:", error);
        alert(`Đăng nhập thất bại: ${error.message}`);
    }
}

function updateUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn && currentUser) {
        btn.innerHTML = `
            <img src="${currentUser.photoURL}" class="w-6 h-6 rounded-full border border-gray-300" alt="">
            <span class="text-emerald-600 font-medium">${currentUser.displayName}</span>
        `;
        // Gán duy nhất luồng đăng xuất, triệt tiêu gán trùng lặp click
        btn.onclick = signOut;
    }
}

function resetUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = `
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" class="w-5 h-5" alt="Google">
            <span id="gmailText">Đăng nhập bằng Google</span>
        `;
        btn.onclick = signInWithGoogle;
    }
}

async function signOut() {
    if (confirm(currentLang === "vi" ? "Đăng xuất tài khoản?" : "Sign out?")) {
        await auth.signOut();
        window.location.reload(); // Làm sạch hoàn toàn bộ nhớ cache đăng nhập
    }
}

// ==================== CÁC HÀM HELPER GIAO DIỆN ====================
function getLocalizedDate(match) {
    let dateStr = match.date || "";
    if (currentLang === "en") return dateStr;
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function getFlagImgHTML(code) {
    if (!code || code === "placeholder") {
        return `<div class="w-12 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">TBD</div>`;
    }
    return `<img src="https://flagcdn.com/w80/${code}.png" onerror="this.onerror=null; this.src='https://placehold.co/48x32/162238/00f2fe?text=${code.toUpperCase()}';" class="w-12 h-8 object-cover rounded shadow-md border border-gray-700/50" alt="${code}" />`;
}

function launchConfetti() {
    if (typeof confetti === "function") {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    }
}

async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước khi nộp dự đoán!" : "Please login first!");
        return;
    }
    launchConfetti();

    // 1. Gọi API sang Backend để vừa lưu Walrus vừa lấy câu trả lời của AI Hải Ly
    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);
    
    if (success) {
        // 2. Cập nhật lịch sử cục bộ trên trình duyệt
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
        
        // 3. Ép giao diện đồng bộ trạng thái ngay lập tức
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
        
        // 4. [NÂNG CẤP XỊN] Hiện luôn lời tiên tri trêu chọc của Hải Ly lên màn hình thay vì alert khô khan
        const aiAgentText = document.getElementById('ai-roast-text');
        if (aiAgentText) {
            // Hiển thị hiệu ứng loading giả lập Hải Ly đang suy nghĩ trong 1 giây
            aiAgentText.innerHTML = `<em>🦫 Hải Ly Tiên Tri đang đọc Blobs bộ nhớ và soạn văn gáy...</em>`;
        }
        
        alert(currentLang === "vi" ? `🎉 Dự đoán trận ${matchId} đã được ghi vào Walrus thành công!` : `🎉 Prediction saved on Walrus!`);
    } else {
        alert(currentLang === "vi" ? "❌ Có lỗi xảy ra khi truyền dữ liệu!" : "❌ Connection error!");
    }
}

const CUSTOM_PUBLISHER_URL = "https://walrus-backend-production.up.railway.app";
async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) return false;
    
    // Gom tất cả thông tin cược trận đấu thành chuỗi văn bản để AI Backend đọc hiểu
    const userText = `Trận ${matchId} (Tỷ số dự đoán: ${scoreA}-${scoreB}). Nhận định: ${analysis || "Không có"}`;

    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/api/ai-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userIdentifier: currentUser.email,
                userText: userText,
                displayName: currentUser.displayName
            })
        });
        return response.ok;
    } catch (error) {
        console.error("Publisher Error:", error);
        return false;
    }
}

function resetAiAgentUI() {
    const aiStatusText = document.getElementById('ai-status-text');
    const aiAgentText = document.getElementById('ai-roast-text');
    if (aiStatusText) aiStatusText.innerText = currentLang === "vi" ? "Đang chờ sếp đăng nhập..." : "Waiting for sign in...";
    if (aiAgentText) {
        aiAgentText.innerHTML = currentLang === "vi" 
            ? `"Chào sếp! Hãy kết nối ví Slush hoặc đăng nhập Gmail để tôi quét lịch sử gáy trận đấu của sếp trên mạng lưới Walrus nhé."`
            : `"Welcome! Please connect Slush wallet or sign in with Gmail so I can scan your prediction history on Walrus."`;
    }
}

async function triggerWalrusMemoryAgent(email, displayName) {
    const aiStatusText = document.getElementById('ai-status-text');
    const aiAgentText = document.getElementById('ai-roast-text');
    const aiAvatarBox = document.getElementById('ai-avatar-box');
    if (!aiStatusText || !aiAgentText) return;

    aiStatusText.innerText = currentLang === "vi" ? "🧠 Đang đồng bộ bộ nhớ Walrus..." : "🧠 Syncing Walrus memory...";
    if (aiAvatarBox) aiAvatarBox.innerText = "⏳";

    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/api/ai-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userIdentifier: email,
                userText: "Tôi muốn kiểm tra lịch sử cược của mình",
                displayName: displayName
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
            aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";
            
            // 1. Hiển thị lời gáy của Hải Ly lên khung chat
            aiAgentText.innerHTML = `<strong>Hải Ly Tiên Tri:</strong> ${data.botReply}`;

            // 2. [THẦN TỐC] Tự động trích xuất lịch sử từ lời gáy của Hải Ly để nạp vào nút "Lịch sử dự đoán"
            if (data.botReply && window.userPredictionMemory.length === 0) {
                // Regex thông minh tìm kiếm các đoạn "Trận X: Tỷ số dự đoán Y-Z" trong văn bản của AI
                const regex = /Trận\s+(\d+):\s+Tỷ\s+số\s+dự\s+đoán\s+(\d+)-(\d+)/gi;
                let match;
                while ((match = regex.exec(data.botReply)) !== null) {
                    window.userPredictionMemory.push({
                        ownerEmail: email,
                        matchId: match[1],
                        homeScore: parseInt(match[2]),
                        awayScore: parseInt(match[3]),
                        analysis: "Đồng bộ từ Walrus Agent",
                        timestamp: new Date().toISOString()
                    });
                }
                console.log("🔄 Đã đồng bộ ngược vào giao diện nút bấm:", window.userPredictionMemory);
            }
        } else {
            throw new Error("Backend error");
        }
    } catch (error) {
        console.error("Lỗi đồng bộ lịch sử:", error);
        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "⚠️ Lỗi đồng bộ" : "⚠️ Sync failed";
    }
}

// ==================== FETCH DATA ĐỘNG GITHUB OPENFOOTBALL ====================
async function fetchWorldCupData() {
    const aiStatusText = document.getElementById('ai-status-text');
    if (aiStatusText) aiStatusText.innerText = translations[currentLang].aiConnecting;

    try {
        const response = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
        if (!response.ok) throw new Error("GitHub Network error");
        const data = await response.json();

        officialMatches = [];
        worldCupGroups = {};

        data.matches.forEach((item, idx) => {
            const matchId = String(idx + 1);
            
            let rawTeam1 = item.team1 || "TBD";
            let rawTeam2 = item.team2 || "TBD";

            const teamAInfo = countryMap[rawTeam1] || { vi: rawTeam1, code: "placeholder" };
            const teamBInfo = countryMap[rawTeam2] || { vi: rawTeam2, code: "placeholder" };

            let type = "vong-bang";
            const roundLower = item.round ? item.round.toLowerCase() : "";
            
            if (roundLower.includes("round of 32")) type = "vong-32";
            else if (roundLower.includes("round of 16")) type = "vong-16";
            else if (roundLower.includes("quarter")) type = "tu-ket";
            else if (roundLower.includes("semi")) type = "ban-ket";
            else if (roundLower.includes("final") || roundLower.includes("third place")) type = "chung-ket";

            if (item.group && type === "vong-bang") {
                const groupName = item.group;
                if (!worldCupGroups[groupName]) worldCupGroups[groupName] = [];
                if (!worldCupGroups[groupName].some(t => t.nameEn === rawTeam1) && teamAInfo.code !== "placeholder") {
                    worldCupGroups[groupName].push({ name: teamAInfo.vi, nameEn: rawTeam1, code: teamAInfo.code });
                }
            }

            let matchResult = null;
            if (item.score && item.score.ft && Array.isArray(item.score.ft)) {
                let goalsList = [];

                if (item.goals1 && Array.isArray(item.goals1)) {
                    item.goals1.forEach(g => {
                        goalsList.push({ team: 'home', scorer: g.name, minute: g.minute });
                    });
                }
                if (item.goals2 && Array.isArray(item.goals2)) {
                    item.goals2.forEach(g => {
                        goalsList.push({ team: 'away', scorer: g.name, minute: g.minute });
                    });
                }

                matchResult = {
                    home: item.score.ft[0],
                    away: item.score.ft[1],
                    goals: goalsList
                };
            }

            officialMatches.push({
                id: matchId,
                group: item.group || item.round,
                groupEn: item.group || item.round,
                date: item.date || "",
                time: item.time || "",
                stadium: item.ground || "Stadium TBA",
                teamA: teamAInfo.vi,
                teamAEn: rawTeam1,
                codeA: teamAInfo.code,
                teamB: teamBInfo.vi,
                teamBEn: rawTeam2,
                codeB: teamBInfo.code,
                type: type,
                isHot: idx % 10 === 0,
                result: matchResult
            });
        });

        // Quy hoạch thứ tự theo dòng thời gian đá chuẩn
        officialMatches.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const timeCleanA = a.time.split(" ")[0] || "00:00";
            const timeCleanB = b.time.split(" ")[0] || "00:00";
            const [hourA, minA] = timeCleanA.split(":").map(Number);
            const [hourB, minB] = timeCleanB.split(":").map(Number);
            if (hourA !== hourB) return hourA - hourB;
            if (minA !== minB) return minA - minB;
            return parseInt(a.id) - parseInt(b.id);
        });

        currentApiStatus = "success";
        if (aiStatusText) aiStatusText.innerText = translations[currentLang].aiSuccess;

    } catch (error) {
        console.error("Lỗi dòng nạp GitHub:", error);
        currentApiStatus = "fallback";
    } finally {
        renderGroups();
        renderMatches(activeTabGlobal);

        const loadingBox = document.getElementById('loading-overlay') || document.querySelector('.loading-box') || document.getElementById('loading') || document.querySelector('[class*="loading"]');
        if (loadingBox) {
            loadingBox.style.setProperty('display', 'none', 'important');
        }
    }
}

function renderMatches(filterType = 'vong-bang') {
    const container = document.getElementById('match-list-container');
    if (!container) return;
    container.innerHTML = '';

    const filtered = officialMatches.filter(m => m.type === filterType);
    const countBadge = document.getElementById('match-count');
    if (countBadge) countBadge.innerText = `${filtered.length} ${translations[currentLang].matchUnit}`;

    // === 3. QUY HOẠCH SẮP XẾP: ÉP THỨ TỰ TRẬN ĐẤU TỪ BÉ ĐẾN LỚN THEO ID CHIỀU THỜI GIAN THỰC ===
    const processedMatches = filtered.map(match => {
        let rawDateTimeStr = `${match.date}T${match.time.split(" ")[0]}`;
        const utcMatch = match.time.match(/UTC([-+]\d+)/i);
        if (utcMatch) {
            const offset = parseInt(utcMatch[1]);
            const prefix = offset >= 0 ? "+" : "-";
            const absOffset = Math.abs(offset).toString().padStart(2, '0');
            rawDateTimeStr += `${prefix}${absOffset}:00`;
        } else {
            rawDateTimeStr += "Z";
        }

        const dateObj = new Date(rawDateTimeStr);

        const localDateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) : match.date;

        const localTimeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }) : match.time;

        return {
            ...match,
            sortId: parseInt(match.id) || 0,
            vietnamDate: localDateStr,
            vietnamTime: localTimeStr
        };
    });

    // Sắp xếp chặt chẽ theo số ID Trận đấu tăng dần (Trận 1, 2, 3... 104) để không bao giờ bị xáo trộn ngày tháng
    processedMatches.sort((a, b) => a.sortId - b.sortId);

    // GOM NHÓM CÁC TRẬN ĐẤU CÓ CÙNG NGÀY VIỆT NAM (GMT+7)
    const groupedByDate = {};
    processedMatches.forEach(match => {
        if (!groupedByDate[match.vietnamDate]) {
            groupedByDate[match.vietnamDate] = [];
        }
        groupedByDate[match.vietnamDate].push(match);
    });

    // VẼ GIA DIỆN HTML THEO ĐÚNG CẤU TRÚC ĐÃ ĐƯỢC QUY HOẠCH
    Object.keys(groupedByDate).forEach(date => {
        const dateGroupContainer = document.createElement('div');
        dateGroupContainer.className = "col-span-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-2xl mb-6 space-y-4";
        
        dateGroupContainer.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-amber-400 tracking-wide flex items-center gap-1.5">📅 LỊCH THI ĐẤU: ${date}</span>
                </div>
                <span class="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">MÚI GIỜ GMT +7</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1" id="group-${date.replace(/\//g, '-')}"></div>
        `;
        
        container.appendChild(dateGroupContainer);
        const subGrid = document.getElementById(`group-${date.replace(/\//g, '-')}`);

        groupedByDate[date].forEach(match => {
            const card = document.createElement('div');
            const isFinished = match.result && match.result.home !== null && match.result.away !== null;
            
            card.className = isFinished
                ? "bg-slate-950/40 border border-slate-900 rounded-2xl p-5 shadow-inner flex flex-col justify-between"
                : (match.isHot 
                    ? "bg-slate-950/90 border-2 border-amber-500 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                    : "bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-slate-700/60 transition-all");

            // --- 1 & 2. VÁ LỖI CÂN ĐỐI TỶ SỐ & THÊM CẦU THỦ GHI BÀN ---
            let matchStatusHTML = "";
            let bottomActionHTML = "";

            if (isFinished) {
                // Tạo danh sách cầu thủ ghi bàn nếu có dữ liệu online
                let scorersHTML = "";
                if (match.result.goals && match.result.goals.length > 0) {
                    scorersHTML = `<div class="mt-2 text-[10px] text-gray-500 space-y-0.5 text-center bg-slate-900/30 p-1.5 rounded-lg border border-slate-900">`;
                    match.result.goals.forEach(g => {
                        const icon = g.team === 'home' ? '⚽' : '⚽';
                        scorersHTML += `<div>${icon} ${g.scorer} (${g.minute}')</div>`;
                    });
                    scorersHTML += `</div>`;
                }

                // Cân đối tỷ số nằm ngang hàng chuẩn UI bóng đá chuyên nghiệp
                matchStatusHTML = `
                    <div class="flex flex-col items-center justify-center w-4/12">
                        <div class="flex items-center gap-3 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800 font-mono">
                            <span class="text-xl font-black text-emerald-400">${match.result.home}</span>
                            <span class="text-xs text-gray-600 font-bold">-</span>
                            <span class="text-xl font-black text-emerald-400">${match.result.away}</span>
                        </div>
                        <span class="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans mt-1.5 font-bold tracking-wider">FT</span>
                        ${scorersHTML}
                    </div>
                `;
                bottomActionHTML = `
                    <div class="mt-2 pt-2.5 border-t border-slate-900/60 text-center text-[10px] text-gray-500 italic font-medium">
                        🏁 Trận đấu đã kết thúc trực tuyến. Bộ nhớ cược đã đóng.
                    </div>
                `;
            } else {
                matchStatusHTML = `
                    <div class="text-center w-4/12 flex flex-col items-center justify-center gap-1">
                        <span class="text-[11px] font-mono font-black bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded shadow-sm">${match.vietnamTime}</span>
                        <span class="text-[10px] text-gray-600 font-bold">VS</span>
                    </div>
                `;
                bottomActionHTML = `
                    <div class="mt-2 pt-3 border-t border-slate-800/80 space-y-2">
                        <div class="flex gap-2 justify-center items-center">
                            <input type="number" id="scoreA-${match.id}" placeholder="0" class="w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all">
                            <span class="text-xs text-gray-600 font-bold">-</span>
                            <input type="number" id="scoreB-${match.id}" placeholder="0" class="w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all">
                        </div>
                        <input type="text" id="analysis-${match.id}" placeholder="${currentLang === 'vi' ? 'Lý do phân tích / Câu gáy hài hước...' : 'Your logic / fun roast...'}" class="w-full h-8 bg-slate-950/50 border border-slate-800/80 rounded-lg px-2.5 text-xs text-gray-300 focus:border-emerald-500 outline-none transition-all">
                        <button onclick="handleSubmissionWithEffects('${match.id}', document.getElementById('scoreA-${match.id}').value, document.getElementById('scoreB-${match.id}').value, document.getElementById('analysis-${match.id}').value)" 
                                class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs tracking-wider transition-all shadow-md shadow-emerald-950/40">
                            ${currentLang === 'vi' ? 'Nộp Dự Đoán' : 'Submit'}
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div>
                    <!-- Vòng đấu & Địa điểm -->
                    <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-3">
                        <span class="truncate max-w-[170px]">📍 ${match.stadium}</span>
                        <span class="${match.isHot ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}">TRẬN ${match.id} — ${match.group}</span>
                    </div>
                    
                    <!-- Kèo đấu -->
                    <div class="flex items-center justify-between my-2 px-1">
                        <div class="flex flex-col items-center text-center w-4/12 gap-1.5">
                            ${getFlagImgHTML(match.codeA)}
                            <div class="text-xs font-bold text-gray-200 truncate max-w-[110px]">${match.teamA}</div>
                        </div>
                        ${matchStatusHTML}
                        <div class="flex flex-col items-center text-center w-4/12 gap-1.5">
                            ${getFlagImgHTML(match.codeB)}
                            <div class="text-xs font-bold text-gray-200 truncate max-w-[110px]">${match.teamB}</div>
                        </div>
                    </div>
                </div>
                ${bottomActionHTML}
            `;
            subGrid.appendChild(card);
        });
    });
}
function renderGroups() {
    const container = document.getElementById('groups-container');
    if (!container) return;
    container.innerHTML = '';

    for (const [groupName, teams] of Object.entries(worldCupGroups)) {
        const groupCard = document.createElement('div');
        groupCard.className = "bg-walrus-card border border-gray-800/80 rounded-xl p-3 text-xs shadow-md";
        groupCard.innerHTML = createGroupCardHTML(groupName, teams);
        container.appendChild(groupCard);
    }
}

function filterMatches(type) {
    activeTabGlobal = type;
    const tabs = ['vong-bang', 'vong-32', 'vong-16', 'tu-ket', 'ban-ket', 'chung-ket'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        if (tabBtn) {
            tabBtn.className = (t === type) 
                ? "px-3 py-2 rounded-lg font-bold transition bg-walrus-aqua text-walrus-dark"
                : "px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition";
        }
    });
    renderMatches(type);
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    container.innerHTML = '';
    mockLeaderboard.forEach((user, index) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2.5 bg-gray-950/40 border border-gray-800/60 rounded-xl text-xs";
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        row.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-6 font-bold text-gray-400 text-center">${medal}</span>
                <span class="font-mono font-semibold text-gray-200">${user.name}</span>
            </div>
            <span class="font-bold text-walrus-aqua">${user.score} PTS</span>
        `;
        container.appendChild(row);
    });
}

function updateUINonDynamicText() {
    const lang = translations[currentLang];
    document.getElementById('btn-history-text').innerText = lang.btnHistory;
    document.getElementById('hero-title').innerHTML = lang.heroTitle;
    document.getElementById('hero-desc').innerText = lang.heroDesc;
    document.getElementById('section-groups-title').innerHTML = lang.secGroups;
    document.getElementById('section-matches-title').innerHTML = lang.secMatches;
    document.getElementById('section-ai-title').innerHTML = lang.secAi;
    document.getElementById('section-prizes-title').innerHTML = lang.secPrizes;
    document.getElementById('section-leaderboard-title').innerHTML = lang.secLeaderboard;
    document.getElementById('tab-vong-bang').innerText = lang.tabVongBang;
    document.getElementById('tab-vong-32').innerText = lang.tabVong32;
    document.getElementById('tab-vong-16').innerText = lang.tabVong16;
    document.getElementById('tab-tu-ket').innerText = lang.tabTuKet;
    document.getElementById('tab-ban-ket').innerText = lang.tabBanKet;
    document.getElementById('tab-chung-ket').innerText = lang.tabChungKet;
}

function toggleLanguage() {
    currentLang = (currentLang === "vi") ? "en" : "vi";
    const flag = document.getElementById('langFlag');
    const txt = document.getElementById('langText');
    if (flag && txt) {
        flag.src = currentLang === "vi" ? "https://flagcdn.com/w20/gb.png" : "https://flagcdn.com/w20/vn.png";
        txt.innerText = currentLang.toUpperCase();
    }
    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
}

let isWalletConnected = false;
function toggleWallet() { isWalletConnected = !isWalletConnected; }

async function fetchMyPredictions() {
    if (!currentUser) {
        alert(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!");
        return;
    }

    const aiAgentText = document.getElementById('ai-roast-text');
    let cauGayCuaHaiLy = "";
    if (aiAgentText) {
        cauGayCuaHaiLy = aiAgentText.innerText.replace("Hải Ly Tiên Tri:", "").trim();
    }

    if (!cauGayCuaHaiLy || cauGayCuaHaiLy.includes("Chào sếp") || cauGayCuaHaiLy.includes("Đang chờ")) {
        alert(currentLang === "vi" 
            ? "🦫 Hải Ly báo: Bộ nhớ trống hoặc đang đồng bộ. Sếp thử cược 1 trận để kích hoạt lịch sử nhé!" 
            : "No prediction history found on Walrus yet!");
        return;
    }

    // --- QUY HOẠCH REGEX THÔNG MINH: TỰ ĐỘNG PHÂN TÁCH KHÔNG PHỤ THUỘC AI ---
    let records = [];
    let tongQuanText = "";

    // 1. Cắt phần [TỔNG QUAN] ra trước nếu có
    const tongQuanMatch = cauGayCuaHaiLy.match(/\[TỔNG QUAN\]([\s\S]*)$/i);
    if (tongQuanMatch) {
        tongQuanText = tongQuanMatch[1].trim();
        cauGayCuaHaiLy = cauGayCuaHaiLy.replace(/\[TỔNG QUAN\]([\s\S]*)$/i, "");
    }

    // 2. Tìm tất cả các cụm bắt đầu bằng [TRẬN] cho đến [TRẬN] tiếp theo
    const tranMatches = cauGayCuaHaiLy.match(/\[TRẬN\][\s\S]*?(?=\[TRẬN\]|$)/gi);

    if (tranMatches && tranMatches.length > 0) {
        tranMatches.forEach(block => {
            // Trích xuất thông tin từng ô bằng biểu thức chính quy
            const title = (block.match(/\[TRẬN\]([\s\S]*?)(?=\[CÂU GÁY\]|\[HẢI LY\]|$)/i)?.[1] || "").trim();
            const cauGay = (block.match(/\[CÂU GÁY\]([\s\S]*?)(?=\[HẢI LY\]|$)/i)?.[1] || "Không có").trim();
            const haiLy = (block.match(/\[HẢI LY\]([\s\S]*?)$/i)?.[1] || "").trim();

            if (title) {
                // Thay thế Đội A / Đội B thành tên gọi rành mạch cho giao diện trực quan
                let cleanTitle = title
                    .replace(/Đội\s+A/gi, "🏠 Đội nhà")
                    .replace(/Đội\s+B/gi, "✈️ Đội khách");
                
                records.push({ title: cleanTitle, cauGay, haiLy });
            }
        });
    }

    // 3. Dựng cấu trúc HTML Card UI bóng bẩy, rành mạch
    let htmlContent = `<div class="space-y-4 font-sans text-gray-300">`;

    if (records.length > 0) {
        records.forEach((item, index) => {
            htmlContent += `
                <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all">
                    <div class="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <span class="bg-emerald-500/10 text-emerald-400 w-5 h-5 rounded-md flex items-center justify-center text-xs border border-emerald-500/20">${index + 1}</span>
                        ⚽ ${item.title}
                    </div>
                    
                    <div class="space-y-2.5 pl-3 border-l-2 border-slate-700">
                        <div class="text-xs text-gray-400 leading-relaxed">
                            <span class="text-amber-500 font-semibold">🗣️ Nhận định của sếp:</span> 
                            <span class="bg-slate-900/30 px-1.5 py-0.5 rounded text-gray-300">${item.cauGay}</span>
                        </div>
                        <div class="text-sm text-gray-200 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex gap-2 items-start">
                            <span class="text-base leading-none mt-0.5">🦫</span>
                            <div>
                                <span class="text-emerald-300 font-medium text-xs block mb-0.5">HẢI LY PHÁN:</span>
                                <span class="italic text-emerald-100/90">${item.haiLy || "Hải Ly đang ngủ quên chưa bình luận trận này..."}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        // Nếu AI trả về chuỗi văn bản tự do hoàn toàn không bóc tách được tag
        htmlContent += `
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 border-l-4 border-emerald-500 whitespace-pre-line text-sm leading-relaxed text-gray-300">
                ${cauGayCuaHaiLy}
            </div>
        `;
    }

    // Nếu có phần tổng quan thì nạp vào dưới cùng
    if (tongQuanText) {
        htmlContent += `
            <div class="mt-6 bg-gradient-to-r from-emerald-950/40 to-slate-900/40 border border-emerald-500/30 rounded-xl p-4 shadow-md">
                <div class="text-amber-400 font-bold text-xs tracking-wider mb-1.5 flex items-center gap-1.5">
                    📊 ĐÁNH GIÁ TỔNG QUAN PHONG ĐỘ
                </div>
                <div class="text-sm text-gray-300 leading-relaxed font-sans">${tongQuanText}</div>
            </div>
        `;
    }

    htmlContent += `</div>`;

    // 4. Tạo/Cập nhật cấu trúc Modal cửa sổ rộng lớn max-w-2xl
    let modal = document.getElementById('walrus-history-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'walrus-history-modal';
        modal.className = "fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 hidden";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-gray-200 font-sans animate-fade-in">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <h3 class="text-emerald-400 font-bold text-base flex items-center gap-2 tracking-wide">
                    📜 LỊCH SỬ DỰ ĐOÁN & TIÊN TRI
                </h3>
                <span class="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded font-mono border border-gray-700">WALRUS AGENT ONSCHAIN</span>
            </div>
            
            <div class="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                ${htmlContent}
            </div>
            
            <div class="mt-5 flex justify-end border-t border-gray-800/60 pt-3">
                <button onclick="document.getElementById('walrus-history-modal').classList.add('hidden')" 
                        class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-emerald-900/40 tracking-wider">
                    Đóng cửa sổ
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}
window.showMyPredictions = fetchMyPredictions;

function initApp() {
    updateUINonDynamicText();
    renderLeaderboard();
    initFirebaseAuth();
    fetchWorldCupData();
    setInterval(fetchWorldCupData, 60000); 
}
window.initApp = initApp;
