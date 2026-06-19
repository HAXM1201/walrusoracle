// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;

// Cache để load nhanh và giảm lỗi
let matchCache = null;
let lastFetchTime = 0;

// Mảng chứa lịch sử bộ nhớ dự đoán lấy từ Walrus (Liên kết đồng bộ với data.js)
if (typeof userPredictionMemory === 'undefined') {
    window.userPredictionMemory = [];
}

// ==================== CẤU HÌNH VƯỢT LỖI TRUSTED TYPES (ĐẶT Ở ĐẦU FILE) ====================
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => string,
            createScriptURL: (string) => string,
        });
    }
}

// ==================== FIREBASE AUTH (CƠ CHẾ POPUP CHUẨN) ====================
const firebaseConfig = {
  apiKey: "AIzaSyBl7vHtoGcSNqoIgTJnPkgu29wQRD2XVAo",
  authDomain: "walrus-cup-oracle.firebaseapp.com",
  projectId: "walrus-cup-oracle",
  storageBucket: "walrus-cup-oracle.firebasestorage.app",
  messagingSenderId: "152805594660",
  appId: "1:152805594660:web:3767f0fd98f6720031eab1"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

function initFirebaseAuth() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            updateUserUI();
            // KÍCH HOẠT BỘ NHỚ: Khi đăng nhập thành công, ép Hải Ly đọc bộ nhớ lịch sử Walrus ngay
            triggerWalrusMemoryAgent(user.email, user.displayName);
        } else {
            resetUserUI();
            // Trả con AI về trạng thái ban đầu khi logout
            resetAiAgentUI();
        }
    });
}

async function signInWithGoogle() {
    // Ép cấu hình customParameters để Google xử lý luồng popup độc lập, giảm xung đột COOP
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        console.log("🔄 Đang khởi chạy cửa sổ xác thực Google...");
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        updateUserUI();
        alert(currentLang === "vi" ? `Chào ${currentUser.displayName}!` : `Welcome ${currentUser.displayName}!`);
    } catch (error) {
        console.error("Lỗi đăng nhập hệ thống:", error);
        
        // Bắt chính xác các kịch bản lỗi để hướng dẫn người dùng
        if (error.code === 'auth/popup-blocked') {
            alert("❌ Trình duyệt của sếp đã chặn cửa sổ Popup! Vui lòng nhấn vào biểu tượng mở khóa ô vuông ở góc thanh địa chỉ duyệt web.");
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log("Người dùng đã chủ động tắt popup trước khi đăng nhập.");
        } else if (error.code === 'auth/unauthorized-domain') {
            alert("❌ Domain walrusoracle.xyz chưa được bật quyền trong Firebase Console!");
        } else {
            alert(`Đăng nhập thất bại: ${error.message}. Hãy thử lại trên tab ẩn danh.`);
        }
    }
}

function updateUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn && currentUser) {
        btn.innerHTML = `
            <img src="${currentUser.photoURL}" class="w-6 h-6 rounded-full border border-gray-300" alt="">
            <span class="text-emerald-600 font-medium">${currentUser.displayName}</span>
        `;
        btn.onclick = signOut;
    }
}

function resetUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = `
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" class="w-5 h-5" alt="Google">
            <span id="gmailText">${translations[currentLang].btnGmail}</span>
        `;
        btn.onclick = signInWithGoogle;
    }
}

async function signOut() {
    if (confirm(currentLang === "vi" ? "Đăng xuất?" : "Sign out?")) {
        await auth.signOut();
    }
}

// =========================================================
// ==================== HÀM HỖ TRỢ ====================
// =========================================================

function getLocalizedDate(match) {
    let dateStr = match.date || "";
    if (currentLang === "en") return dateStr;
    // Chuyển đổi định dạng YYYY-MM-DD từ GitHub sang ngày xem dạng trực quan VN
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

// ==================== HIỆU ỨNG PHÁO HOA ====================
function launchConfetti() {
    if (typeof confetti === "function") {
        confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 }
        });
    }
}

// ====================== NỘP DỰ ĐOÁN ======================
async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước khi nộp dự đoán!" : "Please login first!");
        return;
    }

    launchConfetti();

    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);

    if (success) {
        // Cập nhật bộ nhớ đệm cục bộ ngay lập tức để AI có thể nhớ hành vi mới
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            analysis: analysis,
            timestamp: new Date().toISOString()
        });

        // Bắt Hải Ly phân tích lại hành vi vừa ghi nhớ
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);

        alert(currentLang === "vi" 
            ? `🎉 Dự đoán trận ${matchId} đã được lưu thành công lên Walrus Mainnet!` 
            : `🎉 Prediction saved on Walrus!`);
        
        setTimeout(() => {
            renderMatches(activeTabGlobal);
        }, 1000);
    }
}

// ==================== WALRUS PUBLISHER ====================
const CUSTOM_PUBLISHER_URL = "https://walrus-publisher-production-b5d6.up.railway.app";

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

// ==================== LOGIC TRÍ NHỚ DÀI HẠN (WALRUS PERSISTENT AGENT) ====================
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
        // Tìm lịch sử liên kết với tài khoản trên bộ nhớ lưu trữ Walrus
        const userHistory = window.userPredictionMemory.filter(item => item.ownerEmail === email);
        const totalPredictions = userHistory.length;

        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";

        // THAY ĐỔI HÀNH VI THEO THỜI GIAN/DỮ LIỆU CŨ (AUTHENTIC PERSISTENT MEMORY)
        if (totalPredictions === 0) {
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Chào sếp <strong>${displayName}</strong>! Bộ nhớ Walrus ghi nhận tài khoản này mới toanh, sếp chưa cược trận nào. Thử gáy một trận xem tài tiên tri đến đâu đi sếp!"`
                : `"Hello sếp <strong>${displayName}</strong>! Walrus storage shows a completely new account. You haven't made any predictions yet. Try your luck with a match now!"`;
        } else {
            const lastPred = userHistory[userHistory.length - 1];
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Tôi đã nạp khối dữ liệu bộ nhớ của sếp <strong>${displayName}</strong> rồi! Hệ thống ghi nhận sếp đã gáy tổng cộng <strong>${totalPredictions} trận</strong>. Gần đây nhất là trận <strong>${lastPred.matchId}</strong> với tỷ số ${lastPred.homeScore}-${lastPred.awayScore}."`
                : `"Data blocks loaded for <strong>${displayName}</strong>! Persistent state holds <strong>${totalPredictions} prediction(s)</strong>. Your latest bet was on Match <strong>${lastPred.matchId}</strong> (${lastPred.homeScore}-${lastPred.awayScore})."`;
        }
    }, 1000);
}

// FETCH DỮ LIỆU ĐỘNG TỪ GITHUB OPENFOOTBALL (BẢN FIX TRẬN 103 & KẾT QUẢ ONLINE)
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
            
            // Đối chiếu tìm thông tin map quốc gia từ từ điển cấu hình
            const teamAInfo = countryMap[item.team1] || { vi: item.team1, code: "placeholder" };
            const teamBInfo = countryMap[item.team2] || { vi: item.team2, code: "placeholder" };

            // PHÂN LOẠI VÒNG ĐẤU ĐỘNG (ĐÃ FIX TRẬN 103 & CHUNG KẾT)
            let type = "vong-bang";
            const roundLower = item.round ? item.round.toLowerCase() : "";
            
            if (roundLower.includes("round of 32")) type = "vong-32";
            else if (roundLower.includes("round of 16")) type = "vong-16";
            else if (roundLower.includes("quarter")) type = "tu-ket";
            else if (roundLower.includes("semi")) type = "ban-ket";
            // Khớp chính xác trận tranh hạng 3 (third place) và chung kết tổng vào tab chung-ket
            else if (roundLower.includes("final") || roundLower.includes("third place")) type = "chung-ket";

            // Gom và phân loại cấu trúc bảng đấu vòng bảng động
            if (item.group && type === "vong-bang") {
                const groupName = item.group;
                if (!worldCupGroups[groupName]) worldCupGroups[groupName] = [];
                if (!worldCupGroups[groupName].some(t => t.nameEn === item.team1)) {
                    worldCupGroups[groupName].push({ name: teamAInfo.vi, nameEn: item.team1, code: teamAInfo.code });
                }
            }

            // XỬ LÝ KẾT QUẢ ONLINE CHUẨN ĐỊNH DẠNG GITHUB (ĐA ĐÁ XONG / CHƯA ĐÁ)
            let matchResult = null;
            if (item.hasOwnProperty('score1') && item.hasOwnProperty('score2') && item.score1 !== null && item.score2 !== null) {
                matchResult = {
                    home: parseInt(item.score1),
                    away: parseInt(item.score2),
                    goals: [] // Cấu trúc openfootball JSON không có mảng danh sách người ghi bàn cụ thể
                };
            }

            // Đẩy vào mảng chuẩn để phục vụ render giao diện
            officialMatches.push({
                id: matchId,
                group: item.group || item.round,
                groupEn: item.group || item.round,
                date: item.date,
                time: item.time || "",
                stadium: item.ground || "Stadium TBA",
                teamA: teamAInfo.vi,
                teamAEn: item.team1,
                codeA: teamAInfo.code,
                teamB: teamBInfo.vi,
                teamBEn: item.team2,
                codeB: teamBInfo.code,
                type: type,
                isHot: idx % 10 === 0,
                result: matchResult
            });
        });

        currentApiStatus = "success";
        if (aiStatusText) aiStatusText.innerText = translations[currentLang].aiSuccess;

    } catch (error) {
        console.error("❌ Không lấy được dữ liệu online:", error);
        currentApiStatus = "fallback";
    }

    renderGroups();
    renderMatches(activeTabGlobal);
}
// ==================== RENDER MATCHES & GROUPS ====================
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

// ==================== CÁC HÀM ĐIỀU HƯỚNG VÀ PHÂN LOẠI TAB ====================
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
    
    document.getElementById('prize-1-title').innerHTML = lang.prize1;
    document.getElementById('prize-1-val').innerText = lang.prize1Val;
    document.getElementById('prize-2-title').innerHTML = lang.prize2;
    document.getElementById('prize-2-val').innerText = lang.prize2Val;
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
// ==================== QUẢN LÝ VÍ & TÀI KHOẢN MOCK CODES ====================
let isGmailLoggedIn = true; 
let isWalletConnected = false;

function toggleGmail() {
    isGmailLoggedIn = !isGmailLoggedIn;
    const btn = document.getElementById('gmailBtn');
    const txt = document.getElementById('gmailText');
    if(isGmailLoggedIn) {
        if (btn) btn.className = "flex items-center gap-3 px-5 py-2.5 bg-red-950 text-gray-200 font-semibold rounded-2xl border border-red-900/50 transition duration-200 shadow-sm";
        if (txt) txt.innerHTML = `<span class="text-red-400 font-bold">huyenanh***@gmail.com</span>`;
    } else {
        if (btn) btn.className = "flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-2xl border border-gray-300 transition duration-200 shadow-sm";
        if (txt) txt.innerText = translations[currentLang].btnGmail;
    }
}

function toggleWallet() {
    isWalletConnected = !isWalletConnected;
    const btn = document.getElementById('walletBtn');
    const txt = document.getElementById('walletText');
    if(isWalletConnected) {
        if (btn) {
            btn.classList.replace('bg-walrus-card', 'bg-teal-950');
            btn.classList.add('border-teal-900/50');
        }
        if (txt) txt.innerHTML = `<span class="text-emerald-400 font-mono">0xSlush...40a2</span>`;
    } else {
        if (btn) {
            btn.className = "flex items-center gap-2 px-4 py-2 bg-walrus-card hover:bg-opacity-80 text-walrus-aqua text-sm font-semibold rounded-xl border border-walrus-aqua/30 transition duration-200";
        }
        if (txt) txt.innerText = translations[currentLang].btnWallet;
    }
}
// ==================== TRUY XUẤT LỊCH SỬ DỰ ĐOÁN ====================
async function fetchMyPredictions() {
    if (!currentUser) {
        alert(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!");
        return;
    }
    const myHistory = window.userPredictionMemory.filter(item => item.ownerEmail === currentUser.email);
    
    if (myHistory.length === 0) {
        alert(currentLang === "en" ? "No prediction history found for this account." : "Chưa có lịch sử dự đoán cho tài khoản này.");
    } else {
        console.table(myHistory); 
        alert(currentLang === "en" 
            ? `You have ${myHistory.length} prediction(s). Check browser console for details!` 
            : `Sếp đã có ${myHistory.length} dự đoán. Kiểm tra console để xem chi tiết!`);
    }
}

window.showMyPredictions = fetchMyPredictions;

// ==================== KHỞI TẠO APP VÀ VÒNG LẶP ĐỒNG BỘ ====================
function initApp() {
    currentApiStatus = "welcome";
    updateUINonDynamicText();
    renderLeaderboard();
    
    initFirebaseAuth();
    fetchWorldCupData();
    
    // Tự động làm mới dữ liệu từ openfootball mỗi 60 giây
    setInterval(fetchWorldCupData, 60000); 
}

window.initApp = initApp;
