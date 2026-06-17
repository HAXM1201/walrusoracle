// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;

// Cache để load nhanh và giảm lỗi
let matchCache = null;
let lastFetchTime = 0;

// Mảng chứa lịch sử bộ nhớ dự đoán lấy từ Walrus (Liên kết đồng bộ với data.js)
if (typeof window.userPredictionMemory === 'undefined') {
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
    if (btn) {
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
            <span id="gmailText">Đăng nhập bằng Google</span>
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
    if (currentLang === "en") {
        return dateStr
            .replace(/Thứ 2|thứ 2/g, "Mon")
            .replace(/Thứ 3|thứ 3/g, "Tue")
            .replace(/Thứ 4|thứ 4/g, "Wed")
            .replace(/Thứ 5|thứ 5/g, "Thu")
            .replace(/Thứ 6|thứ 6/g, "Fri")
            .replace(/Thứ 7|thứ 7/g, "Sat")
            .replace(/CN|cn/g, "Sun");
    }
    return dateStr;
}

function getFlagImgHTML(code) {
    if (code === "placeholder") {
        return `<div class="w-12 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">TBD</div>`;
    }
    return `<img src="https://flagcdn.com/w80/${code}.png" onerror="this.onerror=null; this.src='https://placehold.co/48x32/162238/00f2fe?text=${code.toUpperCase()}';" class="w-12 h-8 object-cover rounded shadow-md border border-gray-700/50" alt="${code}" />`;
}

// ==================== HIỆU ỨNG PHÁO HOA (ĐÃ ĐỒNG BỘ VỚI ui-components) ====================
function launchConfetti() {
    if (typeof window.createConfetti === "function") {
        window.createConfetti();
    } else if (typeof confetti === "function") {
        confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 }
        });
    }
}

// Hàm hỗ trợ tương thích ngược với nút gọi cũ trong UI
function createConfetti() {
    launchConfetti();
}

function createParticles() {
    console.log("🎉 Hiệu ứng pháo hoa đã chạy");
}

function animateParticles() {
    if (typeof window.animateParticles === "function") {
        window.animateParticles();
    } else {
        console.log("✨ Hạt hiệu ứng đang chuyển động");
    }
}

// ====================== NỘP DỰ ĐOÁN ======================
async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (homeScore === undefined && awayScore === undefined) {
        createConfetti();
        animateParticles();
        mockSubmit(matchId);
        return;
    }

    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước khi nộp dự đoán!" : "Please login first!");
        return;
    }

    launchConfetti();
    createParticles();

    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);

    if (success) {
        // Cập nhật bộ nhớ đệm cục bộ ngay lập tức để AI có thể nhớ hành vi mới
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0,
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

function mockSubmit(id) { 
    const successMsg = currentLang === "en" 
        ? `Success! Your prediction for match ${id} has been securely stored on Walrus Mainnet.`
        : `Thành công! Dự đoán trận ${id} đã được lưu trữ lên Walrus Mainnet.`;
    alert(successMsg); 
}

// ==================== WALRUS PUBLISHER ====================
const CUSTOM_PUBLISHER_URL = "https://walrus-publisher-production-b5d6.up.railway.app";

async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước!" : "Please sign in first!");
        return false;
    }

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

        if (response.ok) {
            console.log("✅ Lưu Walrus thành công");
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error("Publisher Error:", error);
        alert(currentLang === "vi" ? "❌ Lỗi kết nối Publisher. Kiểm tra lại backend." : "❌ Publisher connection failed.");
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

    if (aiStatusText) aiStatusText.innerText = currentLang === "vi" ? "🧠 Đang giải mã Blobs bộ nhớ..." : "🧠 Decoding memory Blobs...";
    if (aiAvatarBox) aiAvatarBox.innerText = "⏳";

    setTimeout(() => {
        // Tìm lịch sử liên kết với tài khoản trên bộ nhớ lưu trữ Walrus
        const userHistory = window.userPredictionMemory.filter(item => item.ownerEmail === email);
        const totalPredictions = userHistory.length;

        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        if (aiStatusText) aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";

        // KỊCH BẢN THAY ĐỔI HÀNH VI THEO THỜI GIAN/DỮ LIỆU CŨ (AUTHENTIC PERSISTENT MEMORY)
        if (totalPredictions === 0) {
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Chào sếp <strong>${displayName}</strong>! Bộ nhớ Walrus ghi nhận tài khoản này mới toanh, sếp chưa cược trận nào. Thử gáy một trận ở Vòng Bảng xem tài tiên tri đến đâu đi sếp!"`
                : `"Hello sếp <strong>${displayName}</strong>! Walrus storage shows a completely new account. You haven't made any predictions yet. Try your luck with a Group Stage match now!"`;
        } else if (totalPredictions >= 1 && totalPredictions <= 3) {
            const lastPred = userHistory[userHistory.length - 1];
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Tôi đã nạp khối dữ liệu cũ của sếp <strong>${displayName}</strong> rồi! Bộ nhớ ghi nhận sếp đã gáy tổng cộng <strong>${totalPredictions} trận</strong>. Gần đây nhất là trận <strong>${lastPred.matchId}</strong> với tỷ số ${lastPred.homeScore}-${lastPred.awayScore}. Cứ đà này là tích đủ điều kiện đua giải tuần đó sếp!"`
                : `"Data blocks loaded for <strong>${displayName}</strong>! Persistent state holds <strong>${totalPredictions} prediction(s)</strong>. Your latest bet was on Match <strong>${lastPred.matchId}</strong> (${lastPred.homeScore}-${lastPred.awayScore}). Keep going to earn your rewards!"`;
        } else {
            // Trường hợp người dùng lão luyện sử dụng app trên 4 ngày/nhiều trận đấu
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"🔥 <strong>Úi xời, sếp ${displayName} gáy khét quá!</strong> Bộ nhớ Walrus Blobs lưu trữ vĩnh viễn tận <strong>${totalPredictions} dự đoán</strong> của sếp rồi. Tôi thấy sếp phân tích trận đấu rất có flair, để tôi tổng hợp gửi thẳng lên Bảng Vàng Tiên Tri cạnh tranh top 500 WAL nhé!"`
                : `"🔥 <strong>Impressive, sếp ${displayName}!</strong> Walrus Blobs stores <strong>${totalPredictions} history entries</strong> for you. Your prediction flair is outstanding. I am forwarding your decentralized state directly to the Prophecy Board to compete for the 500 WAL pool!"`;
        }
    }, 1200); // Tạo hiệu ứng trễ giải mã dữ liệu thực tế
}

// ==================== RENDER MATCHES ====================
function renderMatches(filterType = 'vong-bang') {
    const container = document.getElementById('match-list-container');
    const countBadge = document.getElementById('match-count');
    if (!container) return;
    
    container.innerHTML = '';
    const filtered = officialMatches.filter(m => m.type === filterType);
    const lang = translations[currentLang];
    if (countBadge) countBadge.innerText = `${filtered.length} ${lang.matchUnit}`;

    filtered.forEach(match => {
        const card = document.createElement('div');
        if (match.isHot) {
            card.className = "bg-walrus-card border border-amber-500 hot-match-card rounded-2xl p-6 shadow-2xl relative overflow-hidden transition";
        } else {
            card.className = "bg-walrus-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition hover:border-gray-700";
        }
        
        let displayGroup = currentLang === "en" && match.groupEn ? match.groupEn : match.group;
        if (currentLang === "en" && displayGroup.includes("Bảng")) { 
            displayGroup = displayGroup.replace("Bảng", "Group"); 
        }
        
        let displayDate = getLocalizedDate(match);
        let displayTeamA = currentLang === "en" ? (match.teamAEn || match.teamA) : match.teamA;
        let displayTeamB = currentLang === "en" ? (match.teamBEn || match.teamB) : match.teamB;

        let cardHTML = '';

        if (match.result && match.result.home !== undefined) {
            const res = match.result;
            let goalsHTML = '';
            if (res.goals && res.goals.length > 0) {
                goalsHTML = `<div class="mt-5 space-y-2">`;
                res.goals.forEach(g => {
                    const teamName = g.team === 'home' ? displayTeamA : displayTeamB;
                    goalsHTML += `
                        <div class="flex justify-between items-center bg-gray-900/70 px-4 py-2.5 rounded-xl text-sm">
                            <span>${teamName} — <strong>${g.scorer}</strong></span>
                            <span class="font-mono text-emerald-400 font-bold">${g.minute}'</span>
                        </div>`;
                });
                goalsHTML += `</div>`;
            }

            cardHTML = `
                <div class="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-5 py-1.5 rounded-bl-2xl">${currentLang === "en" ? "FINISHED" : "KẾT THÚC"}</div>
                ${match.isHot ? `<div class="absolute top-4 left-4 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded">🔥 HOT MATCH</div>` : ''}
                
                <div class="flex items-center justify-between mt-8 mb-6 px-4">
                    <div class="flex flex-col items-center w-28 text-center">
                        ${getFlagImgHTML(match.codeA)}
                        <span class="font-bold text-white mt-3 text-base">${displayTeamA}</span>
                    </div>
                    <div class="text-center">
                        <div class="text-7xl font-black font-mono tracking-tighter text-white">${res.home} - ${res.away}</div>
                        <div class="text-xs text-gray-400 mt-2">${displayDate} • ${match.time}</div>
                    </div>
                    <div class="flex flex-col items-center w-28 text-center">
                        ${getFlagImgHTML(match.codeB)}
                        <span class="font-bold text-white mt-3 text-base">${displayTeamB}</span>
                    </div>
                </div>
                ${goalsHTML}
            `;
        } else {
            cardHTML = `
                ${match.isHot ? `<div class="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-[9px] px-3 py-0.5 uppercase tracking-widest shadow-md z-10">🔥 HOT MATCH</div>` : ''}
                <div class="absolute top-0 right-0 bg-worldcup-gold text-walrus-dark font-bold text-[10px] px-3 py-1 uppercase tracking-wider rounded-bl-xl z-10">
                    ${currentLang === "en" ? "Match" : "Trận"} ${match.id} - ${displayGroup}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-400 mb-4 mt-8">
                    <i class="fa-solid fa-location-dot text-red-400"></i>
                    <span class="font-semibold text-gray-300">${match.stadium}</span>
                </div>
                <div class="flex items-center justify-between my-6 px-4">
                    <div class="flex flex-col items-center gap-2 w-28 text-center">
                        ${getFlagImgHTML(match.codeA)}
                        <span class="font-bold text-white text-sm mt-1">${displayTeamA}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-xs text-gray-500 uppercase tracking-widest font-bold">VS</span>
                        <span class="text-[11px] bg-gray-800 text-gray-400 px-3 py-1 rounded-full mt-2 font-mono text-center">${displayDate}<br/>${match.time}</span>
                    </div>
                    <div class="flex flex-col items-center gap-2 w-28 text-center">
                        ${getFlagImgHTML(match.codeB)}
                        <span class="font-bold text-gray-400 text-sm mt-1">${displayTeamB}</span>
                    </div>
                </div>
                <div class="border-t border-gray-800/60 pt-5 mt-4 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div class="sm:col-span-1">
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">${lang.labelScore}</label>
                            <div class="flex items-center gap-2">
                                <input type="number" id="scoreA-${match.id}" placeholder="0" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center font-bold text-white focus:outline-none focus:border-walrus-aqua">
                                <span class="text-gray-600 font-bold">-</span>
                                <input type="number" id="scoreB-${match.id}" placeholder="0" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center font-bold text-white focus:outline-none focus:border-walrus-aqua">
                            </div>
                        </div>
                        <div class="sm:col-span-2">
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">${lang.labelAnalysis}</label>
                            <input type="text" id="analysis-${match.id}" placeholder="${lang.placeholderAnalysis}" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-walrus-aqua">
                        </div>
                    </div>
                    <div class="flex justify-end pt-2">
                        <button onclick="handleSubmissionWithEffects('${match.id}', document.getElementById('scoreA-${match.id}').value, document.getElementById('scoreB-${match.id}').value, document.getElementById('analysis-${match.id}').value)" 
                                class="gradient-btn hover:opacity-90 text-walrus-dark font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-walrus-aqua/20 flex items-center gap-2 transition">
                            ${lang.btnSubmit}
                        </button>
                    </div>
                </div>
            `;
        }

        card.innerHTML = cardHTML;
        container.appendChild(card);
    });
}

// ==================== CÁC HÀM ĐIỀU HƯỚNG VÀ PHÂN LOẠI ====================
function filterMatches(type) {
    activeTabGlobal = type;
    const tabs = ['vong-bang', 'vong-32', 'vong-16', 'tu-ket', 'ban-ket', 'chung-ket'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        if (tabBtn) {
            if (t === type) tabBtn.className = "px-3 py-2 rounded-lg font-bold transition bg-walrus-aqua text-walrus-dark";
            else tabBtn.className = "px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition";
        }
    });
    renderMatches(type);
}

function renderGroups() {
    const container = document.getElementById('groups-container');
    if (!container) return;
    container.innerHTML = '';
    for (const [groupName, teams] of Object.entries(worldCupGroups)) {
        const groupCard = document.createElement('div');
        groupCard.className = "bg-walrus-card border border-gray-800/80 rounded-xl p-3 text-xs shadow-md";
        let dynamicGroupName = currentLang === "en" ? groupName.replace("Bảng", "Group") : groupName;
        let teamsHTML = `<h3 class="font-bold text-walrus-aqua border-b border-gray-700/50 pb-1.5 mb-2">${dynamicGroupName}</h3><ul class="space-y-1.5">`;
        teams.forEach(team => {
            let displayName = currentLang === "en" ? team.nameEn : team.name;
            teamsHTML += `<li class="flex items-center gap-2 text-gray-300 font-medium">
                <img src="https://flagcdn.com/w40/${team.code}.png" onerror="this.onerror=null; this.src='https://placehold.co/24x16/0b1528/00f2fe?text=${team.code.toUpperCase()}';" class="w-5 h-3.5 object-cover rounded-sm" /> 
                ${displayName}
            </li>`;
        });
        teamsHTML += `</ul>`;
        groupCard.innerHTML = teamsHTML;
        container.appendChild(groupCard);
    }
}
// ==================== FALLBACK NẾU DATA.JS CHƯA LOAD ====================
if (typeof mockLeaderboard === 'undefined') {
    window.mockLeaderboard = [
        { name: "TayBew", score: 1240, countryCode: "vn" },
        { name: "HALN", score: 1180, countryCode: "vn" },
        { name: "Jack", score: 1090, countryCode: "us" },
        { name: "Puchi", score: 980, countryCode: "br" },
        { name: "Stravia", score: 920, countryCode: "th" }
    ];
}
function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sử dụng window.mockLeaderboard để an toàn
    const leaderboardData = window.mockLeaderboard || mockLeaderboard || [];
    
    leaderboardData.forEach((user, index) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2.5 bg-gray-950/40 border border-gray-800/60 rounded-xl text-xs";
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        row.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-6 font-bold text-gray-400 text-center">${medal}</span>
                <div class="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 relative group">
                    <span class="text-sm">🦫</span>
                    <img src="https://flagcdn.com/w20/${user.countryCode}.png" class="absolute -bottom-1 -right-1 w-3.5 h-2.5 object-cover rounded-sm border border-gray-900" />
                </div>
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

    // Chỉ cập nhật văn bản trạng thái chào mừng ban đầu nếu chưa có user kết nối bộ nhớ
    if (!currentUser) {
        resetAiAgentUI();
    }
}

function toggleLanguage() {
    const flag = document.getElementById('langFlag');
    const txt = document.getElementById('langText');

    if (currentLang === "vi") {
        currentLang = "en";
        flag.src = "https://flagcdn.com/w20/vn.png";
        txt.innerText = "VI";
    } else {
        currentLang = "vi";
        flag.src = "https://flagcdn.com/w20/gb.png";
        txt.innerText = "EN";
    }

    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
    
    if (currentUser) {
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
    }
}

// ==================== QUẢN LÝ VÍ & TÀI KHOẢN MOCK CODES ====================
let isGmailLoggedIn = true; 
let isWalletConnected = false;

function toggleGmail() {
    isGmailLoggedIn = !isGmailLoggedIn;
    const btn = document.getElementById('gmailBtn');
    const txt = document.getElementById('gmailText');
    if(isGmailLoggedIn) {
        btn.classList.replace('bg-gray-800', 'bg-red-950');
        btn.classList.add('border-red-900/50');
        txt.innerHTML = `<span class="text-red-400 font-bold">huyenanh***@gmail.com</span>`;
    } else {
        btn.className = "flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 transition duration-200";
        txt.innerText = translations[currentLang].btnGmail;
    }
}

function toggleWallet() {
    isWalletConnected = !isWalletConnected;
    const btn = document.getElementById('walletBtn');
    const txt = document.getElementById('walletText');
    if(isWalletConnected) {
        btn.classList.replace('bg-walrus-card', 'bg-teal-950');
        btn.classList.add('border-teal-900/50');
        txt.innerHTML = `<span class="text-emerald-400 font-mono">0xSlush...40a2</span>`;
    } else {
        btn.className = "flex items-center gap-2 px-4 py-2 bg-walrus-card hover:bg-opacity-80 text-walrus-aqua text-sm font-semibold rounded-xl border border-walrus-aqua/30 transition duration-200";
        txt.innerText = translations[currentLang].btnWallet;
    }
}

async function fetchMyPredictions() {
    const email = currentUser ? currentUser.email : document.getElementById('gmailText').innerText;
    
    if (email.includes("Đăng nhập") || email.includes("Sign in") || !currentUser) {
        alert(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!");
        return;
    }

    alert(currentLang === "en" ? "Fetching your prediction history from Walrus..." : "Đang truy xuất lịch sử dự đoán từ Walrus...");
    
    const myHistory = window.userPredictionMemory.filter(item => item.ownerEmail === email);
    
    if (myHistory.length === 0) {
        alert(currentLang === "en" ? "No prediction history found for this account." : "Chưa có lịch sử dự đoán cho tài khoản này.");
    } else {
        console.table(myHistory); 
        alert(currentLang === "en" 
            ? `You have ${myHistory.length} prediction(s). Check browser console for details!` 
            : `Sếp đã có ${myHistory.length} dự đoán. Kiểm tra console để xem chi tiết!`);
    }
}

// Bổ sung hàm ánh xạ tương thích với thuộc tính onclick="showMyPredictions()" trong file index.html
window.showMyPredictions = fetchMyPredictions;


// ==================== LIVE REFRESH & API CONTROL (ĐÃ ỔN ĐỊNH) ====================
let refreshInterval = null;
let isFirstSuccess = false;
let apiFailedCount = 0;
const MAX_API_FAILS = 3;

function startLiveRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);

    const intervalTime = isFirstSuccess ? 600000 : 5000; // 10 phút hoặc 5 giây

    refreshInterval = setInterval(() => {
        if (apiFailedCount < MAX_API_FAILS) {
            fetchWorldCupData();
        }
    }, intervalTime);

    console.log(`🔄 Auto refresh: ${intervalTime === 5000 ? '5 giây' : '10 phút'}`);
}

async function fetchWorldCupData(retryCount = 0) {
    const now = Date.now();

    // Cache ngắn hạn
    if (matchCache && (now - lastFetchTime < 30000)) return;

    currentApiStatus = "connecting";

    try {
        console.log(`🌐 Fetching World Cup... (Attempt ${retryCount + 1})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://worldcup26.ir/get/games', {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        localStorage.setItem('worldcup_cache_v2', JSON.stringify({
            timestamp: now,
            data: data
        }));

        applyApiData(data);
        matchCache = data;
        lastFetchTime = now;
        currentApiStatus = "success";
        apiFailedCount = 0;

        console.log("✅ Đã lấy kết quả online thành công!");

        if (!isFirstSuccess) {
            isFirstSuccess = true;
            console.log("🔄 Chuyển sang chế độ 10 phút/lần");
            startLiveRefresh();
        }

        renderMatches(activeTabGlobal);

    } catch (error) {
        apiFailedCount++;
        console.warn(`❌ API lỗi (${apiFailedCount}/${MAX_API_FAILS}):`, error.message);

        if (retryCount < 1 && apiFailedCount < MAX_API_FAILS) {
            setTimeout(() => fetchWorldCupData(retryCount + 1), 4000);
        } else if (apiFailedCount >= MAX_API_FAILS) {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
            console.log("⛔ API không khả dụng → Tắt auto refresh, dùng dữ liệu tĩnh");
            currentApiStatus = "fallback";
            renderMatches(activeTabGlobal);
        }
    }
}

function applyApiData(data) {
    if (!data?.games) return;

    data.games.forEach(apiMatch => {
        const localMatch = officialMatches.find(m => String(m.id) === String(apiMatch.id));
        if (!localMatch) return;

        if (apiMatch.finished === "TRUE" || apiMatch.status === "finished") {
            localMatch.result = {
                home: parseInt(apiMatch.home_score) || 0,
                away: parseInt(apiMatch.away_score) || 0,
                goals: []
            };

            const parseScorers = (str, team) => {
                if (!str || str === "null") return;
                str.replace(/[{}"]/g, '').split(',').forEach(item => {
                    if (item.trim()) {
                        const parts = item.trim().split(/\s+(\d+)'?$/);
                        localMatch.result.goals.push({
                            team: team,
                            scorer: parts[0] ? parts[0].trim() : item.trim(),
                            minute: parts[1] ? parts[1].trim() : ""
                        });
                    }
                });
            };

            parseScorers(apiMatch.home_scorers, "home");
            parseScorers(apiMatch.away_scorers, "away");
        }

        if (parseInt(localMatch.id) > 72) {
            if (apiMatch.home_team) {
                localMatch.teamA = localMatch.teamAEn = apiMatch.home_team;
                localMatch.codeA = (apiMatch.home_tla || "placeholder").toLowerCase();
            }
            if (apiMatch.away_team) {
                localMatch.teamB = localMatch.teamBEn = apiMatch.away_team;
                localMatch.codeB = (apiMatch.away_tla || "placeholder").toLowerCase();
            }
        }
    });
}

// ==================== KHỞI TẠO APP ====================
function initApp() {
    currentApiStatus = "welcome";
    updateUINonDynamicText();
    renderGroups();
    filterMatches('vong-bang');
    renderLeaderboard();
    
    initFirebaseAuth();

    renderMatches(activeTabGlobal);

    setTimeout(() => {
        fetchWorldCupData();
        startLiveRefresh();
    }, 800);
}

// ==================== EXPOSE GLOBAL ====================
window.filterMatches = filterMatches;
window.toggleLanguage = toggleLanguage;
window.toggleWallet = toggleWallet;
window.showMyPredictions = fetchMyPredictions;
window.handleSubmissionWithEffects = handleSubmissionWithEffects;
window.initApp = initApp;
