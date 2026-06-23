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
        showCyberToast(currentLang === "vi" ? `Đăng nhập thất bại: ${error.message}` : `Login failed: ${error.message}`, "error");
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
        showCyberToast(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước khi nộp dự đoán!" : "Please login first!", "error");
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
            aiAgentText.innerHTML = currentLang === "vi" 
                ? `<em>🦫 Hải Ly Tiên Tri đang đọc Blobs bộ nhớ và soạn văn gáy...</em>`
                : `<em>🦫 Walrus Oracle is reading memory blobs and preparing a response...</em>`;
        }
        
        showCyberToast(currentLang === "vi" ? `Dự đoán trận ${matchId} đã được ghi vào Walrus thành công!` : `Prediction saved on Walrus!`, "success");
    } else {
        showCyberToast(currentLang === "vi" ? "Có lỗi xảy ra khi truyền dữ liệu!" : "Connection error!", "error");
    }
}

const CUSTOM_PUBLISHER_URL = "https://walrus-backend-production.up.railway.app";

async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) return false;
    
    showSuccessPopup("Đang chờ Hải Ly xử lý...");

    const userText = `Trận ${matchId} (Tỷ số dự đoán: ${scoreA}-${scoreB}). Nhận định: ${analysis || "Không có"}`;
    
    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/api/ai-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIdentifier: currentUser.email,
                userText: userText,
                displayName: currentUser.displayName,
                lang: currentLang
            })
        });

        if (!response.ok) throw new Error("Backend Error");

        const data = await response.json();

        // Cập nhật Local
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            analysis: data.botReply,
            timestamp: new Date().toISOString()
        });

        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
        hideSuccessPopup();
        return true;
    } catch (error) {
        hideSuccessPopup();
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

    aiStatusText.innerText = currentLang === "vi" ? "🧠 Đang đồng bộ..." : "🧠 Syncing...";
    if (aiAvatarBox) aiAvatarBox.innerText = "⏳";

    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/api/ai-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userIdentifier: email,
                userText: "Lịch sử dự đoán",
                displayName: displayName,
                lang: currentLang 
            })
        });

        if (!response.ok) throw new Error("Backend error");
        const data = await response.json();
        
        // 1. Hiển thị lời gáy
        aiAgentText.innerHTML = `<strong>${currentLang === "vi" ? "Hải Ly Tiên Tri" : "Walrus Oracle"}:</strong> ${data.botReply}`;
        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ đã đồng bộ" : "✅ Walrus Memory: Synced";

        // 2. Quét dữ liệu và nạp mảng
        if (data.botReply) {
            const blocks = data.botReply.split(/\[TRẬN\]|\[MATCH\]/i);
            
            blocks.forEach(block => {
                if (!block.trim()) return;

                const idMatch = block.match(/(?:Trận\s+số|Trận|Match)\s*(\d+)/i) || block.match(/(\d+)/);
                const scoreMatch = block.match(/(\d+)\s*-\s*(\d+)/);

                if (idMatch && scoreMatch) {
                    const mId = idMatch[1] || idMatch[0];
                    const isExisted = window.userPredictionMemory.some(p => String(p.matchId) === String(mId.trim()));
                    
                    if (!isExisted) {
                        window.userPredictionMemory.push({
                            ownerEmail: email,
                            matchId: mId.trim(),
                            homeScore: parseInt(scoreMatch[1]),
                            awayScore: parseInt(scoreMatch[2]),
                            analysis: data.botReply,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            });
            console.log("🔄 [Walrus Memory Sync Success]:", window.userPredictionMemory);
            
            // 3. GỌI NGAY HÀM CẬP NHẬT BẢNG VÀNG
            if (typeof renderLeaderboardFromWalrus === 'function') {
                renderLeaderboardFromWalrus();
            }
        }
        
    } catch (error) {
        console.error("Lỗi đồng bộ:", error);
        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "⚠️ Lỗi đồng bộ" : "⚠️ Sync failed";
    }
}

function renderLeaderboardFromWalrus() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    const data = window.userPredictionMemory; 
    container.innerHTML = ''; 

    data.forEach((item, index) => {
        const card = document.createElement('div');
        // Thêm class 'prediction-card' để ăn CSS nằm ngang
        card.className = "prediction-card bg-slate-900/80 border border-slate-700 rounded-xl p-3 cursor-pointer hover:border-emerald-500 transition-all";
        
        card.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold text-gray-500">#${index + 1}</span>
                <div class="w-6 h-6 rounded-full bg-emerald-900 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                    ${item.ownerEmail ? item.ownerEmail.charAt(0).toUpperCase() : 'G'}
                </div>
                <span class="text-xs font-semibold text-gray-200 truncate">Trận ${item.matchId}</span>
            </div>
            <p class="text-[11px] text-gray-300 italic truncate">"${item.analysis.substring(0, 40)}..."</p>
        `;

        card.onclick = () => alert("Chi tiết: " + item.analysis);
        container.appendChild(card);
    });
}
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

// ==================== HÀM RENDER TRẬN ĐẤU QUY HOẠCH THEO THỜI GIAN VÀ MÚI GIỜ ====================
function renderMatches(filterType = 'vong-bang') {
    const container = document.getElementById('match-list-container');
    if (!container) return;
    container.innerHTML = '';

    const filtered = officialMatches.filter(m => m.type === filterType);
    const countBadge = document.getElementById('match-count');
    if (countBadge) countBadge.innerText = `${filtered.length} ${translations[currentLang].matchUnit}`;

    // === 1. CHUYỂN ĐỔI MÚI GIỜ GMT+7 VÀ TRÍCH XUẤT THỜI GIAN CHUẨN XÁC ===
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

        // Định dạng hiển thị ngày tùy biến theo ngôn ngữ (VN: DD/MM/YYYY, EN: MM/DD/YYYY)
        const localDateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString(currentLang === "vi" ? 'vi-VN' : 'en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) : match.date;

        const sortableDateKey = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh'
        }) : match.date;

        const localTimeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }) : match.time;

        return {
            ...match,
            sortTimestamp: dateObj.getTime() || 0,
            sortId: parseInt(match.id) || 0,
            vietnamDate: localDateStr,
            dateKey: sortableDateKey,
            vietnamTime: localTimeStr
        };
    });

    // === 2. GOM NHÓM THEO DÒNG THỜI GIAN VÀ SẮP XẾP ===
    const groupedData = {};
    processedMatches.forEach(match => {
        if (!groupedData[match.dateKey]) {
            groupedData[match.dateKey] = {
                displayDate: match.vietnamDate,
                matches: []
            };
        }
        groupedData[match.dateKey].matches.push(match);
    });

    const sortedDateKeys = Object.keys(groupedData).sort();

    // === 3. DUYỆT QUA TỪNG NGÀY ĐỂ DỰNG HTML CARD UI ===
    sortedDateKeys.forEach(dateKey => {
        const dateGroup = groupedData[dateKey];
        const dateGroupContainer = document.createElement('div');
        dateGroupContainer.className = "col-span-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-2xl mb-6 space-y-4";
        
        const safeId = `group-${dateKey}`;
        
        // ĐỒNG BỘ NGÔN NGỮ KHUNG NGÀY CHUNG
        const labelLichThiDau = currentLang === "vi" ? `📅 LỊCH THI ĐẤU: ${dateGroup.displayDate}` : `📅 MATCH SCHEDULE: ${dateGroup.displayDate}`;
        const labelMuiGio = currentLang === "vi" ? "MÚI GIỜ GMT +7" : "TIMEZONE GMT +7";

        dateGroupContainer.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-amber-400 tracking-wide flex items-center gap-1.5">${labelLichThiDau}</span>
                </div>
                <span class="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">${labelMuiGio}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1" id="${safeId}"></div>
        `;
        
        container.appendChild(dateGroupContainer);
        const subGrid = document.getElementById(safeId);

        dateGroup.matches.sort((a, b) => a.sortId - b.sortId);

        dateGroup.matches.forEach(match => {
            const card = document.createElement('div');
            const isFinished = match.result && match.result.home !== null && match.result.away !== null;
            
            card.className = isFinished
                ? "bg-slate-950/40 border border-slate-900 rounded-2xl p-5 shadow-inner flex flex-col justify-between"
                : (match.isHot 
                    ? "bg-slate-950/90 border-2 border-amber-500 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                    : "bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-slate-700/60 transition-all");

            // ĐỒNG BỘ TÊN QUỐC GIA CHUẨN THEO TAB NGÔN NGỮ
            const displayTeamA = currentLang === "vi" ? match.teamA : match.teamAEn;
            const displayTeamB = currentLang === "vi" ? match.teamB : match.teamBEn;
            const labelTran = currentLang === "vi" ? "TRẬN" : "MATCH";

            let matchStatusHTML = "";
            let bottomActionHTML = "";

            if (isFinished) {
                let scorersHTML = "";
                if (match.result.goals && match.result.goals.length > 0) {
                    scorersHTML = `<div class="w-full mt-3 grid grid-cols-2 gap-x-4 text-[10px] text-gray-500 bg-slate-900/30 p-2 rounded-xl border border-slate-900/80">`;
                    
                    let homeScorers = match.result.goals.filter(g => g.team === 'home');
                    let awayScorers = match.result.goals.filter(g => g.team === 'away');
                    
                    scorersHTML += `<div class="space-y-1 text-left border-r border-slate-800/60 pr-1">`;
                    homeScorers.forEach(g => {
                        scorersHTML += `<div class="truncate text-gray-400">⚽ ${g.scorer} (${g.minute}')</div>`;
                    });
                    scorersHTML += `</div>`;
                    
                    scorersHTML += `<div class="space-y-1 text-right pl-1">`;
                    awayScorers.forEach(g => {
                        scorersHTML += `<div class="truncate text-gray-400">${g.scorer} (${g.minute}') ⚽</div>`;
                    });
                    scorersHTML += `</div>`;
                    
                    scorersHTML += `</div>`;
                }

                matchStatusHTML = `
                    <div class="flex flex-col items-center justify-center w-4/12">
                        <div class="flex items-center gap-3 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800 font-mono">
                            <span class="text-xl font-black text-emerald-400">${match.result.home}</span>
                            <span class="text-xs text-gray-600 font-bold">-</span>
                            <span class="text-xl font-black text-emerald-400">${match.result.away}</span>
                        </div>
                        <span class="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans mt-1.5 font-bold tracking-wider">FT</span>
                    </div>
                `;
                
                const labelFinishedDesc = currentLang === "vi" 
                    ? "🏁 Trận đấu đã kết thúc trực tuyến. Bộ nhớ cược đã đóng." 
                    : "🏁 Live match has finished. Prediction pool closed.";

                bottomActionHTML = `
                    ${scorersHTML}
                    <div class="mt-2.5 pt-2 border-t border-slate-900/40 text-center text-[10px] text-gray-500 italic font-medium">
                        ${labelFinishedDesc}
                    </div>
                `;
            } else {
                matchStatusHTML = `
                    <div class="text-center w-4/12 flex flex-col items-center justify-center gap-1">
                        <span class="text-[11px] font-mono font-black bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded shadow-sm">${match.vietnamTime}</span>
                        <span class="text-[10px] text-gray-600 font-bold">VS</span>
                    </div>
                `;

                const placeholderRoast = currentLang === 'vi' ? 'Lý do phân tích / Câu gáy hài hước...' : 'Your logic / fun roast...';
                const btnSubmitText = currentLang === 'vi' ? 'Nộp Dự Đoán' : 'Submit';

                bottomActionHTML = `
                    <div class="mt-2 pt-3 border-t border-slate-800/80 space-y-2">
                        <div class="flex gap-2 justify-center items-center">
                            <input type="number" id="scoreA-${match.id}" placeholder="0" class="w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all">
                            <span class="text-xs text-gray-600 font-bold">-</span>
                            <input type="number" id="scoreB-${match.id}" placeholder="0" class="w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all">
                        </div>
                        <input type="text" id="analysis-${match.id}" placeholder="${placeholderRoast}" class="w-full h-8 bg-slate-950/50 border border-slate-800/80 rounded-lg px-2.5 text-xs text-gray-300 focus:border-emerald-500 outline-none transition-all">
                        <button onclick="handleSubmissionWithEffects('${match.id}', document.getElementById('scoreA-${match.id}').value, document.getElementById('scoreB-${match.id}').value, document.getElementById('analysis-${match.id}').value)" 
                                class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs tracking-wider transition-all shadow-md shadow-emerald-950/40">
                            ${btnSubmitText}
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-3">
                        <span class="truncate max-w-[170px]">📍 ${match.stadium}</span>
                        <span class="${match.isHot ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}">${labelTran} ${match.id} — ${match.group}</span>
                    </div>
                    <div class="flex items-center justify-between my-2 px-1">
                        <div class="flex flex-col items-center text-center w-4/12 gap-1.5">
                            ${getFlagImgHTML(match.codeA)}
                            <div class="text-xs font-bold text-gray-200 truncate max-w-[110px]">${displayTeamA}</div>
                        </div>
                        ${matchStatusHTML}
                        <div class="flex flex-col items-center text-center w-4/12 gap-1.5">
                            ${getFlagImgHTML(match.codeB)}
                            <div class="text-xs font-bold text-gray-200 truncate max-w-[110px]">${displayTeamB}</div>
                        </div>
                    </div>
                </div>
                ${bottomActionHTML}
            `;
            subGrid.appendChild(card);
        });
    });
}
function createGroupCardHTML(groupName, teams) {
    let teamsHTML = teams.map(t => `
        <div class="flex items-center gap-2 py-1">
            <img src="https://flagcdn.com/w20/${t.code}.png" class="w-5 h-3 object-cover rounded-sm">
            <span class="truncate">${t.name}</span>
        </div>
    `).join('');
    
    return `
        <div class="font-bold text-walrus-aqua mb-2 uppercase tracking-wider">${groupName}</div>
        <div class="space-y-1">${teamsHTML}</div>
    `;
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
window.filterMatches = filterMatches;
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
    
    // Hàm helper để gán text an toàn
    const setInner = (id, content) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = content;
    };
    const setText = (id, content) => {
        const el = document.getElementById(id);
        if (el) el.innerText = content;
    };

    setText('btn-history-text', lang.btnHistory);
    setInner('hero-title', lang.heroTitle);
    setText('hero-desc', lang.heroDesc);
    setInner('section-groups-title', lang.secGroups);
    setInner('section-matches-title', lang.secMatches);
    setInner('section-ai-title', lang.secAi);
    setInner('section-prizes-title', lang.secPrizes);
    setInner('section-leaderboard-title', lang.secLeaderboard);
    setText('tab-vong-bang', lang.tabVongBang);
    setText('tab-vong-32', lang.tabVong32);
    setText('tab-vong-16', lang.tabVong16);
    setText('tab-tu-ket', lang.tabTuKet);
    setText('tab-ban-ket', lang.tabBanKet);
    setText('tab-chung-ket', lang.tabChungKet);
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
        showCyberToast(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!", "warning");
        return;
    }

    const aiAgentText = document.getElementById('ai-roast-text');
    let cauGayCuaHaiLy = "";
    if (aiAgentText) {
        cauGayCuaHaiLy = aiAgentText.innerText.replace("Hải Ly Tiên Tri:", "").replace("Walrus Oracle:", "").trim();
    }

    if (!cauGayCuaHaiLy || cauGayCuaHaiLy.includes("Chào sếp") || cauGayCuaHaiLy.includes("Đang chờ") || cauGayCuaHaiLy.includes("Welcome")) {
        showCyberToast(currentLang === "vi" 
            ? "🦫 Hải Ly báo: Bộ nhớ trống hoặc đang đồng bộ. Sếp thử cược 1 trận để kích hoạt lịch sử nhé!" 
            : "No prediction history found on Walrus yet!", "warning");
        return;
    }

    // --- BỘ QUY HOẠCH REGEX TOÀN DIỆN CHỐNG DÍNH CHỮ & QUỐC TẾ HÓA ---
    let records = [];
    let tongQuanText = "";

    // 1. Trích xuất phần [TỔNG QUAN] hoặc [SUMMARY] ra trước
    const tongQuanMatch = cauGayCuaHaiLy.match(/\[TỔNG QUAN\]([\s\S]*)$/i) || cauGayCuaHaiLy.match(/\[SUMMARY\]([\s\S]*)$/i);
    if (tongQuanMatch) {
        tongQuanText = tongQuanMatch[1].trim();
        cauGayCuaHaiLy = cauGayCuaHaiLy.replace(/\[TỔNG QUAN\]([\s\S]*)$/i, "").replace(/\[SUMMARY\]([\s\S]*)$/i, "");
    }

    // 2. Tự động chuẩn hóa dấu xuống dòng trước mỗi chữ [TRẬN] hoặc [MATCH]
    let chuoiChuanHoa = cauGayCuaHaiLy
        .replace(/\[TRẬN\]/gi, "\n[TRẬN]")
        .replace(/\[MATCH\]/gi, "\n[TRẬN]");
    
    const tranMatches = chuoiChuanHoa.match(/\[TRẬN\][\s\S]*?(?=\[TRẬN\]|$)/gi);

    if (tranMatches && tranMatches.length > 0) {
        tranMatches.forEach(block => {
            const title = (block.match(/\[TRẬN\]([\s\S]*?)(?=\[CÂU GÁY\]|\[🗣️ CÂU GÁY\]|\[ROAST\]|\[HẢI LY\]|\[🦫 HẢI LY\]|$)/i)?.[1] || "").trim();
            const cauGay = (block.match(/(?:\[CÂU GÁY\]|\[🗣️ CÂU GÁY\]|\[ROAST\])([\s\S]*?)(?=\[HẢI LY\]|\[🦫 HẢI LY\]|$)/i)?.[1] || "Không có").trim();
            const haiLy = (block.match(/(?:\[HẢI LY\]|\[🦫 HẢI LY\])([\s\S]*?)$/i)?.[1] || "").trim();

            if (title) {
                let cleanTitle = title;
                let predictionVerificationHTML = "";

                // Dò tìm số ID Trận đấu xuất hiện trong tiêu đề
                const idMatch = title.match(/(?:Trận\s+số\s+|Trận\s+|Match\s+)(\d+)/i);
                if (idMatch && idMatch[1]) {
                    const targetId = idMatch[1].trim();
                    const foundMatchInfo = officialMatches.find(m => String(m.id) === targetId);
                    
                    if (foundMatchInfo) {
                        const isFinished = foundMatchInfo.result && foundMatchInfo.result.home !== null && foundMatchInfo.result.away !== null;
                        const teamAName = currentLang === "vi" ? foundMatchInfo.teamA : foundMatchInfo.teamAEn;
                        const teamBName = currentLang === "vi" ? foundMatchInfo.teamB : foundMatchInfo.teamBEn;

                        // Tìm điểm số sếp cược
                        const scoreMatch = block.match(/(?:dự\s+đoán|tỷ\s+số|:\s*|predict)\[?(\d+)\]?\s*-\s*\[?(\d+)\]?/i) || title.match(/\[?(\d+)\]?\s*-\s*\[?(\d+)\]?/);
                        let predHome = 0;
                        let predAway = 0;
                        let hasValidPrediction = false;

                        if (scoreMatch) {
                            predHome = parseInt(scoreMatch[1]);
                            predAway = parseInt(scoreMatch[2]);
                            hasValidPrediction = true;
                        }

                        if (isFinished) {
                            const realHome = parseInt(foundMatchInfo.result.home);
                            const realAway = parseInt(foundMatchInfo.result.away);

                            cleanTitle = currentLang === "vi"
                                ? `Trận số ${targetId} — 🏠 ${teamAName} vs ${teamBName} ✈️ (Kết quả: ${realHome}-${realAway})`
                                : `Match ${targetId} — 🏠 ${teamAName} vs ${teamBName} ✈️ (Result: ${realHome}-${realAway})`;

                            if (hasValidPrediction) {
                                const realSign = realHome > realAway ? 1 : (realHome < realAway ? -1 : 0);
                                const predSign = predHome > predAway ? 1 : (predHome < predAway ? -1 : 0);

                                if (realHome === predHome && realAway === predAway) {
                                    predictionVerificationHTML = currentLang === "vi"
                                        ? `<div class="mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2">🎯 <span>Thần sầu sếp ơi! Sếp dự đoán TRÚNG KHÍT TỶ SỐ <span class="underline">${predHome}-${predAway}</span> rồi. Tiên tri vũ trụ gọi tên sếp!</span></div>`
                                        : `<div class="mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2">🎯 <span>Masterclass! You predicted the exact scoreline <span class="underline">${predHome}-${predAway}</span>!</span></div>`;
                                } else if (realSign === predSign) {
                                    predictionVerificationHTML = currentLang === "vi"
                                        ? `<div class="mt-2 text-xs font-bold text-teal-400 bg-teal-950/40 p-2.5 rounded-xl border border-teal-500/20 flex items-center gap-2">👍 <span>Đẳng cấp sếp ơi! Sếp đoán ĐÚNG KẾT QUẢ trận đấu (Dự đoán: ${predHome}-${predAway} | Thực tế: ${realHome}-${realAway}). Suýt soát nổ hũ tỷ số!</span></div>`
                                        : `<div class="mt-2 text-xs font-bold text-teal-400 bg-teal-950/40 p-2.5 rounded-xl border border-teal-500/20 flex items-center gap-2">👍 <span>Great reading! You got the CORRECT OUTCOME (Predicted: ${predHome}-${predAway} | Real: ${realHome}-${realAway})!</span></div>`;
                                } else {
                                    predictionVerificationHTML = currentLang === "vi"
                                        ? `<div class="mt-2 text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20 flex items-center gap-2">❌ <span>Lần này trật lất rồi sếp ơi (Dự đoán: ${predHome}-${predAway} | Kết quả: ${realHome}-${realAway}). Đề nghị sếp học thêm một khóa tiên tri cấp tốc nhé! 😄</span></div>`
                                        : `<div class="mt-2 text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20 flex items-center gap-2">❌ <span>Completely wrong (Predicted: ${predHome}-${predAway} | Real: ${realHome}-${realAway}). You need more oracle training! 😄</span></div>`;
                                }
                            }
                        } else {
                            cleanTitle = currentLang === "vi"
                                ? `Trận số ${targetId} — 🏠 ${teamAName} vs ${teamBName} ✈️`
                                : `Match ${targetId} — 🏠 ${teamAName} vs ${teamBName} ✈️`;
                            
                            predictionVerificationHTML = currentLang === "vi"
                                ? `<div class="mt-2 text-xs text-amber-400 bg-amber-950/20 p-2 rounded-xl border border-amber-500/20 italic">⏳ Trận đấu chưa diễn ra. Đang chờ kết quả trực tuyến...</div>`
                                : `<div class="mt-2 text-xs text-amber-400 bg-amber-950/20 p-2 rounded-xl border border-amber-500/20 italic">⏳ Match pending. Waiting for live result verification...</div>`;
                        }

                        let displayCauGay = hasValidPrediction ? `${predHome} - ${predAway} (${cauGay})` : cauGay;

                        records.push({
                            title: cleanTitle,
                            cauGay: displayCauGay,
                            haiLy: haiLy,
                            verification: predictionVerificationHTML
                        });
                    }
                }
            }
        });
    }

    // 3. DỰNG GIAO DIỆN HTML CARD UI
    let htmlContent = `<div class="space-y-4 font-sans text-gray-300">`;

    if (records.length > 0) {
        records.forEach((item, index) => {
            const labelNhanDinh = currentLang === "vi" ? "🗣️ Dự đoán của sếp:" : "🗣️ Your Prediction:";
            const labelHaiLyPhan = currentLang === "vi" ? "HẢI LY BÌNH LUẬN GIẢI THÍCH:" : "WALRUS AGENT COMMENT:";
            const fallbackComment = currentLang === "vi" ? "Hải Ly đang đồng bộ dữ liệu..." : "Walrus is recalling transaction memory...";

            htmlContent += `
                <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all">
                    <div class="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <span class="bg-emerald-500/10 text-emerald-400 w-5 h-5 rounded-md flex items-center justify-center text-xs border border-emerald-500/20">${index + 1}</span>
                        ⚽ ${item.title}
                    </div>
                    
                    <div class="space-y-2.5 pl-3 border-l-2 border-slate-700">
                        <div class="text-xs text-gray-400 leading-relaxed">
                            <span class="text-amber-500 font-semibold">${labelNhanDinh}</span> 
                            <span class="bg-slate-900/30 px-2 py-0.5 rounded text-gray-200 font-mono font-bold">${item.cauGay}</span>
                        </div>
                        
                        <div class="text-sm text-gray-200 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex gap-2 items-start">
                            <span class="text-base leading-none mt-0.5">🦫</span>
                            <div>
                                <span class="text-emerald-300 font-medium text-xs block mb-0.5">${labelHaiLyPhan}</span>
                                <span class="italic text-emerald-100/90">${item.haiLy || fallbackComment}</span>
                            </div>
                        </div>
                        ${item.verification}
                    </div>
                </div>
            `;
        });
    } else {
        let chuoiGiaMaForm = cauGayCuaHaiLy
            .replace(/\[TRẬN\]/gi, `<br><br><span class="text-emerald-400 font-bold">⚽ [TRẬN]</span>`)
            .replace(/\[MATCH\]/gi, `<br><br><span class="text-emerald-400 font-bold">⚽ [MATCH]</span>`)
            .replace(/\[CÂU\s+GÁY\]/gi, `<br><span class="text-amber-500 font-medium">🗣️ [CÂU GÁY]</span>`)
            .replace(/\[ROAST\]/gi, `<br><span class="text-amber-500 font-medium">🗣️ [ROAST]</span>`)
            .replace(/\[HẢI\s+LY\]/gi, `<br><span class="text-teal-300 italic">🦫 [HẢI LY]</span>`)
            .replace(/\[COMMENT\]/gi, `<br><span class="text-teal-300 italic">🦫 [COMMENT]</span>`);

        htmlContent += `
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 border-l-4 border-emerald-500 text-sm leading-relaxed text-gray-300 font-sans">
                <span class="text-amber-400 font-bold block mb-2">${currentLang === "vi" ? "🔄 HẢI LY ĐANG ĐỒNG BỘ DỮ LIỆU CÙNG SẾP:" : "🔄 AGENT DATA MEMORY SYNCING:"}</span>
                ${chuoiGiaMaForm}
            </div>
        `;
    }

    htmlContent += `</div>`;

    let modal = document.getElementById('walrus-history-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'walrus-history-modal';
        modal.className = "fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 hidden";
        document.body.appendChild(modal);
    }

    const modalHeaderTitle = currentLang === "vi" ? "📜 BẢNG ĐỐI CHIẾU DỰ ĐOÁN & KẾT QUẢ THỰC TẾ" : "📜 PREDICTION VS REAL RESULT VERIFICATION";
    const modalCloseBtnText = currentLang === "vi" ? "Đóng cửa sổ" : "Close Window";

    modal.innerHTML = `
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-gray-200 font-sans animate-fade-in">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <h3 class="text-emerald-400 font-bold text-base flex items-center gap-2 tracking-wide">
                    ${modalHeaderTitle}
                </h3>
                <span class="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded font-mono border border-gray-700">WALRUS AGENT ONSCHAIN</span>
            </div>
            
            <div class="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                ${htmlContent}
            </div>
            
            <div class="mt-5 flex justify-end border-t border-gray-800/60 pt-3">
                <button onclick="document.getElementById('walrus-history-modal').classList.add('hidden')" 
                        class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-emerald-900/40 tracking-wider">
                    ${modalCloseBtnText}
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}
window.showMyPredictions = fetchMyPredictions;

// ==================== HỆ THỐNG CUSTOM TOAST NOTIFICATION CYBERPUNK THAY THẾ ALERT() ====================
function showCyberToast(message, type = 'success') {
    let container = document.getElementById('cyber-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cyber-toast-container';
        container.className = "fixed bottom-5 right-5 z-[10000] flex flex-col gap-3 max-w-md w-full pointer-events-none p-4";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = "pointer-events-auto transform translate-y-5 opacity-0 transition-all duration-300 font-sans p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-bold tracking-wide";
    
    if (type === 'success') {
        toast.className += " bg-slate-900/95 border-emerald-500/40 text-emerald-400 shadow-emerald-950/40";
    } else if (type === 'error') {
        toast.className += " bg-slate-900/95 border-rose-500/40 text-rose-400 shadow-rose-950/40";
    } else {
        toast.className += " bg-slate-900/95 border-amber-500/40 text-amber-400 shadow-amber-950/40";
    }

    toast.innerHTML = `
        <div class="flex-1 flex items-center gap-2">
            <span>${type === 'success' ? '🎉' : type === 'error' ? '❌' : '⚠️'}</span>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-gray-500 hover:text-gray-300 transition-all ml-2 font-black">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
window.showCyberToast = showCyberToast;

function initApp() {
    updateUINonDynamicText();
    renderLeaderboard();
    initFirebaseAuth();
    fetchWorldCupData();
    setInterval(fetchWorldCupData, 60000); 
}
window.initApp = initApp;


function showSuccessPopup(message) {
    const popup = document.createElement('div');
    popup.id = "haili-popup"; // Đặt ID để dễ tìm và xóa
    popup.className = "fixed bottom-5 right-5 bg-emerald-600 text-white p-4 rounded-lg shadow-2xl z-50 animate-bounce";
    popup.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-2xl">🦫</span>
            <div>
                <p class="font-bold">Đang gáy & Lưu Blockchain...</p>
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

// Hàm này dùng để xóa popup
function hideSuccessPopup() {
    const popup = document.getElementById('haili-popup');
    if (popup) popup.remove();
}
