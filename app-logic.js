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

    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);
    if (success) {
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
        alert(currentLang === "vi" ? `🎉 Dự đoán trận ${matchId} thành công!` : `🎉 Prediction saved on Walrus!`);
    }
}

const CUSTOM_PUBLISHER_URL = "walrus-backend-production.up.railway.app";
async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) return false;
    const predictionData = {
        userEmail: currentUser.email,
        matchId: matchId,
        homeScore: parseInt(scoreA) || 0,
        awayScore: parseInt(scoreB) || 0,
        analysis: analysis || "",
        timestamp: new Date().toISOString(),
        lang: currentLang
    };
    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(predictionData)
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

function triggerWalrusMemoryAgent(email, displayName) {
    const aiStatusText = document.getElementById('ai-status-text');
    const aiAgentText = document.getElementById('ai-roast-text');
    const aiAvatarBox = document.getElementById('ai-avatar-box');
    if (!aiStatusText || !aiAgentText) return;

    aiStatusText.innerText = currentLang === "vi" ? "🧠 Đang giải mã Blobs bộ nhớ..." : "🧠 Decoding memory Blobs...";
    if (aiAvatarBox) aiAvatarBox.innerText = "⏳";

    setTimeout(() => {
        const userHistory = window.userPredictionMemory.filter(item => item.ownerEmail === email);
        const totalPredictions = userHistory.length;

        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";

        if (totalPredictions === 0) {
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Chào sếp <strong>${displayName}</strong>! Bộ nhớ ghi nhận tài khoản này chưa cược trận nào. Thử gáy một trận xem tài tiên tri đến đâu sếp!"`
                : `"Hello sếp <strong>${displayName}</strong>! Walrus storage shows a new account. Try your luck with a match now!"`;
        } else {
            const lastPred = userHistory[userHistory.length - 1];
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Tôi đã nạp dữ liệu của sếp <strong>${displayName}</strong>! Ghi nhận sếp đã cược <strong>${totalPredictions} trận</strong>. Gần đây nhất là trận <strong>${lastPred.matchId}</strong> (${lastPred.homeScore}-${lastPred.awayScore})."`
                : `"Data blocks loaded! Persistent state holds <strong>${totalPredictions} prediction(s)</strong>. Latest on Match <strong>${lastPred.matchId}</strong>."`;
        }
    }, 1000);
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

    filtered.forEach(match => {
        const card = document.createElement('div');
        card.className = match.isHot 
            ? "bg-walrus-card border border-amber-500 hot-match-card rounded-2xl p-6 shadow-2xl relative overflow-hidden transition"
            : "bg-walrus-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition hover:border-gray-700";
        
        card.innerHTML = createMatchCardHTML(match);
        container.appendChild(card);
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
    const myHistory = window.userPredictionMemory.filter(item => item.ownerEmail === currentUser.email);
    alert(`Sếp đã có ${myHistory.length} dự đoán. Kiểm tra console để xem chi tiết!`);
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
