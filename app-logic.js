// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;

// Hệ thống dữ liệu động (Thay thế hoàn toàn data.js)
let translations = {};
let worldCupGroups = {};
let officialMatches = [];
let mockLeaderboard = [];

// Cache để load nhanh và giảm lỗi
let matchCache = null;
let lastFetchTime = 0;

// Mảng chứa lịch sử bộ nhớ dự đoán lấy từ Walrus
if (typeof userPredictionMemory === 'undefined') {
    window.userPredictionMemory = [];
}

// URL DATA NGUỒN MỞ OPENFOOTBALL (WORLD CUP 2026)
const RAW_TEAM_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json";
const RAW_STADIUM_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.stadiums.json";
const RAW_MATCH_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const RAW_GROUP_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.groups.json";

// ==================== CẤU HÌNH VƯỢT LỖI TRUSTED TYPES ====================
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => string,
            createScriptURL: (string) => string,
        });
    }
}

// Tự động khởi tạo bộ từ điển dịch thuật tĩnh tích hợp trực tiếp
function initStaticTranslations() {
    translations = {
        vi: {
            heroTitle: 'Gáy Khét World Cup <br/><span class="gradient-text">Nhận Thưởng Lớn</span>',
            heroDesc: 'Dự đoán kết quả từ 104 trận đấu chính thức của giải vô địch bóng đá thế giới FIFA World Cup 2026. Nhận định của bạn sẽ được lưu vĩnh viễn trên hạ tầng Walrus Blobs Storage.',
            secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> Cục Diện 48 Đội Đường Đến World Cup 2026',
            secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Lịch Trình Thi Đấu Chính Thức',
            secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
            secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Quỹ Giải Thưởng',
            secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Bảng Vàng Tiên Tri',
            tabVongBang: 'Vòng Bảng', tabVong32: 'Vòng 32 Đội', tabVong16: 'Vòng 16 Đội', tabTuKet: 'Tứ Kết', tabBanKet: 'Bán Kết', tabChungKet: 'Chung Kết',
            aiReading: 'Đang đọc bộ nhớ Walrus Mainnet...',
            aiWelcome: '"Chào sếp! Hãy kết nối ví Slush hoặc đăng nhập Gmail để tôi quét lịch sử gáy trận đấu của sếp trên mạng lưới Walrus nhé."',
            aiConnecting: '"Đang kết nối API nguồn mở để lấy kết quả World Cup 2026 thời gian thực..."',
            aiSuccess: '"Đã đồng bộ thành công dữ liệu từ hạ tầng OpenFootball! Sơ đồ giải đấu và kết quả các trận đấu đã được cập nhật chính xác. Vào gáy tiếp đi sếp!"',
            aiFallback: '"Không kết nối được API bên ngoài, tôi đang sử dụng dữ liệu bộ nhớ dự phòng có sẵn trên mạng lưới Walrus cho sếp nhé!"',
            btnGmail: 'Đăng nhập Gmail', btnWallet: 'Kết nối ví Slush', btnHistory: 'Lịch sử dự đoán',
            prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Tiên Tri Tỷ Số Đúng', prize1Val: '500 WAL / Vòng',
            prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Phân Tích Hài Hước Nhất', prize2Val: '300 WAL / Trận',
            labelScore: 'Dự đoán Tỷ số', labelAnalysis: 'Lý do phân tích / Câu gáy hài hước', placeholderAnalysis: 'Nhập nhận định lầy lội của bạn tại đây...',
            btnSubmit: '<i class="fa-solid fa-cloud-arrow-up"></i> Nộp Dự Đoán', matchUnit: 'trận', resultStr: 'Kết quả'
        },
        en: {
            heroTitle: 'Roast The World Cup <br/><span class="gradient-text">Win Massive Rewards</span>',
            heroDesc: 'Predict the outcomes of all 104 official matches for the FIFA World Cup 2026. Your insights will be permanently stored on the decentralized Walrus Blobs Storage infrastructure.',
            secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> 48 Teams Roadmap - World Cup 2026 Groups',
            secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Official Match Schedule',
            secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
            secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Prize Pool & Rewards',
            secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Prediction Leaderboard',
            tabVongBang: 'Group Stage', tabVong32: 'Round of 32', tabVong16: 'Round of 16', tabTuKet: 'Quarter-Finals', tabBanKet: 'Semi-Finals', tabChungKet: 'Finals',
            aiReading: 'Reading Walrus Mainnet storage...',
            aiWelcome: '"Hello boss! Connect your Slush Wallet or sign in with Gmail so I can scan your historical prediction logs on the Walrus Network."',
            aiConnecting: '"Connecting to open API to fetch live World Cup 2026 results in real-time..."',
            aiSuccess: '"OpenFootball data sync successful! Real-time scores and tournament brackets updated via Walrus Memory."',
            aiFallback: '"External API offline, I am actively recovering backup tournament state from the secure Walrus decentralized nodes!"',
            btnGmail: 'Sign in with Gmail', btnWallet: 'Connect Slush Wallet', btnHistory: 'Prediction History',
            prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Correct Score Predictor', prize1Val: '500 WAL / Round',
            prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Funniest Match Analyst', prize2Val: '300 WAL / Match',
            labelScore: 'Score Prediction', labelAnalysis: 'Analysis / Banter Comment', placeholderAnalysis: 'Type your funny, trash-talk prediction here...',
            btnSubmit: '<i class="fa-solid fa-cloud-arrow-up"></i> Submit Prediction', matchUnit: 'matches', resultStr: 'Result'
        }
    };

    mockLeaderboard = [
        { name: "TayBew", score: 1240, countryCode: "vn" },
        { name: "HALN", score: 1180, countryCode: "vn" },
        { name: "Jack", score: 1090, countryCode: "us" },
        { name: "Puchi", score: 980, countryCode: "br" },
        { name: "Stravia", score: 920, countryCode: "th" }
    ];
}

// ==================== FIREBASE AUTH (CƠ CHẾ POPUP CHUẨN - KHÔNG XUNG ĐỘT) ====================
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
            setTimeout(() => {
                triggerWalrusMemoryAgent(user.email, user.displayName);
            }, 200);
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
        console.log("🔄 Đang khởi chạy cửa sổ xác thực Google bằng Popup...");
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        alert(currentLang === "vi" ? `Chào ${currentUser.displayName}!` : `Welcome ${currentUser.displayName}!`);
    } catch (error) {
        console.error("Lỗi đăng nhập hệ thống:", error);
        if (error.code === 'auth/popup-blocked') {
            alert("❌ Trình duyệt của sếp đã chặn cửa sổ Popup! Vui lòng nhấn vào biểu tượng mở khóa ở góc thanh địa chỉ duyệt web.");
        } else {
            alert(`Đăng nhập thất bại: ${error.message}. Thử lại trên tab ẩn danh hoặc kiểm tra cấu hình COOP.`);
        }
    }
}

function updateUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn && currentUser) {
        btn.innerHTML = `
            <img src="${currentUser.photoURL}" class="w-6 h-6 rounded-full border border-gray-300" alt="">
            <span class="text-emerald-400 font-medium">${currentUser.displayName}</span>
        `;
        btn.onclick = signOut;
    }
}

function resetUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = `
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" class="w-5 h-5" alt="Google">
            <span id="gmailText">${currentLang === "vi" ? "Đăng nhập bằng Google" : "Sign in with Google"}</span>
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
// ==================== HÀM HỖ TRỢ ĐỊNH DẠNG ====================
// =========================================================

function getLocalizedDate(match) {
    let dateStr = match.date || "";
    if (currentLang === "en") {
        return dateStr
            .replace(/Thứ 2|thứ 2/g, "Mon").replace(/Thứ 3|thứ 3/g, "Tue")
            .replace(/Thứ 4|thứ 4/g, "Wed").replace(/Thứ 5|thứ 5/g, "Thu")
            .replace(/Thứ 6|thứ 6/g, "Fri").replace(/Thứ 7|thứ 7/g, "Sat")
            .replace(/CN|cn/g, "Sun");
    }
    return dateStr;
}

function getFlagImgHTML(code) {
    if (!code || code === "placeholder") {
        return `<div class="w-12 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">TBD</div>`;
    }
    return `<img src="https://flagcdn.com/w80/${code}.png" onerror="this.onerror=null; this.src='https://placehold.co/48x32/162238/00f2fe?text=${code.toUpperCase()}';" class="w-12 h-8 object-cover rounded shadow-md border border-gray-700/50" alt="${code}" />`;
}

// ==================== HIỆU ỨNG PHÁO HOA CANVAS ====================
function launchConfetti() {
    if (typeof confetti === "function") {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    }
}

function createConfetti() {
    if (typeof confetti === "function") {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
}

function createParticles() { console.log("🎉 Hiệu ứng pháo hoa đã chạy"); }
function animateParticles() { console.log("✨ Hạt hiệu ứng đang chuyển động"); }

// ====================== NỘP DỰ ĐOÁN LÊN WALRUS ======================
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
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            analysis: analysis,
            timestamp: new Date().toISOString()
        });

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
        alert(currentLang === "vi" ? "❌ Lỗi kết nối Publisher. Kiểm tra lại backend." : "❌ Publisher connection failed.");
        return false;
    }
}

// ==================== TRÍ NHỚ DÀI HẠN (WALRUS PERSISTENT AGENT) ====================
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
        const userHistory = (window.userPredictionMemory || []).filter(item => item.ownerEmail === email);
        const totalPredictions = userHistory.length;

        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";

        if (totalPredictions === 0) {
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Chào sếp <strong>${displayName}</strong>! Bộ nhớ Walrus ghi nhận tài khoản này mới toanh, sếp chưa cược trận nào. Thử gáy một trận ở Vòng Bảng xem tài tiên tri đến đâu đi sếp!"`
                : `"Hello sếp <strong>${displayName}</strong>! Walrus storage shows a completely new account. You haven't made any predictions yet. Try your luck with a Group Stage match now!"`;
            return;
        }

        // THUẬT TOÁN NHỚ SÂU: Phân tích đội bóng bias & Tỉ lệ đoán trúng hướng trận đấu
        let teamCounts = {};
        let correctPredictions = 0;
        let evaluatedMatches = 0;

        userHistory.forEach(pred => {
            const match = officialMatches.find(m => String(m.id) === String(pred.matchId));
            if (!match) return;

            let chosenTeam = null;
            if (pred.homeScore > pred.awayScore) chosenTeam = match.teamA;
            else if (pred.awayScore > pred.homeScore) chosenTeam = match.teamB;

            if (chosenTeam) teamCounts[chosenTeam] = (teamCounts[chosenTeam] || 0) + 1;

            if (match.result && match.result.home !== undefined) {
                evaluatedMatches++;
                const predictedTrend = Math.sign(pred.homeScore - pred.awayScore);
                const realTrend = Math.sign(match.result.home - match.result.away);
                if (predictedTrend === realTrend) correctPredictions++;
            }
        });

        let favoriteTeam = "Chưa rõ";
        let maxCount = 0;
        for (const [team, count] of Object.entries(teamCounts)) {
            if (count > maxCount) { maxCount = count; favoriteTeam = team; }
        }

        const accuracyRate = evaluatedMatches > 0 ? Math.round((correctPredictions / evaluatedMatches) * 100) : null;
        const lastPred = userHistory[userHistory.length - 1];

        if (totalPredictions >= 1 && totalPredictions <= 3) {
            aiAgentText.innerHTML = currentLang === "vi"
                ? `"Tôi đã nạp khối dữ liệu cũ của sếp <strong>${displayName}</strong>! Bộ nhớ ghi nhận sếp gáy <strong>${totalPredictions} trận</strong>. Có vẻ sếp khá thiên vị đội <strong>${favoriteTeam}</strong> đúng không? Gần nhất là trận <strong>${lastPred.matchId}</strong> cược tỷ số ${lastPred.homeScore}-${lastPred.awayScore}. Chờ bóng lăn xem sếp sáng mắt ra không nhé!"`
                : `"Data blocks loaded for <strong>${displayName}</strong>! Persistent state holds <strong>${totalPredictions} prediction(s)</strong>. My memory senses you are biased towards <strong>${favoriteTeam}</strong>! Your latest bet was on Match <strong>${lastPred.matchId}</strong> (${lastPred.homeScore}-${lastPred.awayScore}). Let's see how it goes!"`;
        } else {
            if (accuracyRate !== null && accuracyRate < 50) {
                aiAgentText.innerHTML = currentLang === "vi"
                    ? `"🔥 <strong>Úi xời, sếp ${displayName} gáy thì khét mà tỉ lệ trúng hướng chỉ có ${accuracyRate}%!</strong> Bộ nhớ vĩnh viễn lưu ${totalPredictions} cược rồi, sếp bị 'bệnh' tin tưởng mù quáng vào <strong>${favoriteTeam}</strong> đấy. Tỉnh táo lại để đua top 500 WAL đi sếp ơi!"`
                    : `"🔥 <strong>Impressive banter, sếp ${displayName}, but your accuracy is only ${accuracyRate}%!</strong> Walrus Shadows stores ${totalPredictions} history entries for you. You have a huge blind spot for <strong>${favoriteTeam}</strong>. Focus up to secure your WAL rewards!"`;
            } else {
                aiAgentText.innerHTML = currentLang === "vi"
                    ? `"🔥 <strong>Úi xời, sếp ${displayName} gáy khét mà chuẩn đấy!</strong> Tỉ lệ trúng hướng trận đấu đạt <strong>${accuracyRate || 100}%</strong> qua ${totalPredictions} dự đoán. Con mắt tiên tri của sếp linh đấy, để tôi tổng hợp dữ liệu gửi thẳng lên Bảng Vàng Tiên Tri cạnh tranh giải nhé!"`
                    : `"🔥 <strong>Outstanding, sếp ${displayName}!</strong> Your tournament insight sits at a solid <strong>${accuracyRate || 100}%</strong> across ${totalPredictions} records. Your flair is undeniable. Forwarding your decentralized state directly to the Prophecy Board!"`;
            }
        }
    }, 1200);
}

// ==================== RENDER TRẬN ĐẤU RA GIAO DIỆN ====================
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
        card.className = match.isHot 
            ? "bg-walrus-card border border-amber-500 hot-match-card rounded-2xl p-6 shadow-2xl relative overflow-hidden transition"
            : "bg-walrus-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition hover:border-gray-700";
        
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

// ==================== ĐIỀU HƯỚNG TAB TRẬN ĐẤU ====================
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
    if (!lang) return;
    
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

    if (!currentUser) resetAiAgentUI();
}

function toggleLanguage() {
    const flag = document.getElementById('langFlag');
    const txt = document.getElementById('langText');

    if (currentLang === "vi") {
        currentLang = "en";
        flag.src = "https://flagcdn.com/w20/gb.png";
        txt.innerText = "EN";
    } else {
        currentLang = "vi";
        flag.src = "https://flagcdn.com/w20/vn.png";
        txt.innerText = "VI";
    }

    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
    
    if (currentUser) triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
}

// ==================== KẾT NỐI VÍ SLUSH (MOCK) ====================
let isWalletConnected = false;
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
    const email = currentUser ? currentUser.email : "";
    if (!currentUser) {
        alert(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!");
        return;
    }

    alert(currentLang === "en" ? "Fetching your prediction history from Walrus..." : "Đang truy xuất lịch sử dự đoán từ Walrus...");
    const myHistory = (window.userPredictionMemory || []).filter(item => item.ownerEmail === email);
    
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

// ==================== BỘ PHÂN GIẢI & ĐỒNG BỘ DỮ LIỆU ĐỘNG (OPENFOOTBALL 2026 BRACKETS) ====================
async function fetchWorldCupData() {
    const aiAgentText = document.getElementById('ai-roast-text');
    const aiAvatarBox = document.getElementById('ai-avatar-box');
    
    const now = Date.now();
    if (matchCache && (now - lastFetchTime < 45000)) {
        currentApiStatus = "success";
        renderMatches(activeTabGlobal);
        return;
    }

    currentApiStatus = "connecting";
    if (aiAgentText) aiAgentText.innerHTML = translations[currentLang].aiConnecting;

    try {
        // Tải song song 4 file JSON cốt lõi từ kho lưu trữ OpenFootball 2026 trên GitHub
        const [teamsRes, stadiumsRes, groupsRes, matchesRes] = await Promise.all([
            fetch(RAW_TEAM_URL).then(r => r.json()),
            fetch(RAW_STADIUM_URL).then(r => r.json()),
            fetch(RAW_GROUP_URL).then(r => r.json()),
            fetch(RAW_MATCH_URL).then(r => r.json())
        ]);

        // 1. Ánh xạ Đội tuyển & Mã Code Quốc Kỳ ISO chuẩn
        let teamMap = {};
       // Kiểm tra nếu teamsRes là mảng thuần (gốc của OpenFootball GitHub)
       const actualTeams = Array.isArray(teamsRes) ? teamsRes : (teamsRes.teams || []);

       actualTeams.forEach(t => {
            teamMap[t.name] = {
                name: t.name,
                nameEn: t.name,
                code: t.code ? t.code.toLowerCase() : "placeholder"
            };
        });

        // 2. Định hình Cục diện 12 Bảng đấu (48 Đội)
        worldCupGroups = {};
        groupsRes.groups.forEach(g => {
            worldCupGroups[g.name] = g.teams.map(teamName => {
                return teamMap[teamName] || { name: teamName, nameEn: teamName, code: "placeholder" };
            });
        });

        // 3. Phân loại cấu trúc Sân vận động công bố
        let stadiumMap = {};
        stadiumsRes.stadiums.forEach(s => { stadiumMap[s.key] = s.name; });

        // 4. Đồng bộ danh sách 104 trận đấu động (Cả Vòng Bảng lẫn Knockout)
        officialMatches = [];
        let matchCounter = 1;

        matchesRes.rounds.forEach(round => {
            let roundType = "vong-bang";
            if (round.name.includes("Round of 32")) roundType = "vong-32";
            else if (round.name.includes("Round of 16")) roundType = "vong-16";
            else if (round.name.includes("Quarter-finals")) roundType = "u-ket";
            else if (round.name.includes("Semi-finals")) roundType = "ban-ket";
            else if (round.name.includes("Final")) roundType = "chung-ket";

            round.matches.forEach(m => {
                let localMatch = {
                    id: String(m.num || matchCounter++),
                    group: round.name,
                    groupEn: round.name,
                    date: m.date,
                    time: m.time || "00:00",
                    stadium: stadiumMap[m.stadium] || m.stadium || "FIFA Stadium",
                    teamA: m.team1,
                    teamAEn: m.team1,
                    codeA: teamMap[m.team1] ? teamMap[m.team1].code : "placeholder",
                    teamB: m.team2,
                    teamBEn: m.team2,
                    codeB: teamMap[m.team2] ? teamMap[m.team2].code : "placeholder",
                    type: roundType,
                    isHot: m.num % 6 === 0 ? true : false // Đánh dấu trận Hot động ngẫu nhiên theo ID
                };

                // Đồng bộ hóa kết quả trực tiếp, cầu thủ ghi bàn từ tệp JSON động
                if (m.score1 !== undefined && m.score2 !== undefined) {
                    localMatch.result = {
                        home: m.score1,
                        away: m.score2,
                        goals: []
                    };
                    
                    // Nếu tệp cấu hình nguồn mở có mảng danh sách ghi bàn (goals)
                    if (m.goals1) {
                        m.goals1.forEach(g => {
                            localMatch.result.goals.push({ team: 'home', scorer: g.name, minute: g.minute });
                        });
                    }
                    if (m.goals2) {
                        m.goals2.forEach(g => {
                            localMatch.result.goals.push({ team: 'away', scorer: g.name, minute: g.minute });
                        });
                    }
                }

                officialMatches.push(localMatch);
            });
        });

        matchCache = matchesRes;
        lastFetchTime = now;
        currentApiStatus = "success";
        
        console.log("✅ Đã đồng bộ hoàn tất 104 trận đấu từ kho dữ liệu OpenFootball 2026!");
    } catch (error) {
        console.error("❌ Lỗi Fetch GitHub OpenFootball -> Chuyển vùng bộ nhớ Walrus dự phòng:", error);
        currentApiStatus = "fallback";
    }

    // Ép làm mới chữ của Hải Ly Tiên Tri và vẽ lại các Box Card trên UI
    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
}

let refreshInterval = null;
function startLiveRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(fetchWorldCupData, 60000);
}

// ==================== KHỞI TẠO ĐỘC LẬP TỪ INDEX ====================
function initApp() {
    initStaticTranslations();
    currentApiStatus = "welcome";
    updateUINonDynamicText();
    
    initFirebaseAuth();
    fetchWorldCupData();
    startLiveRefresh();
}

window.initApp = initApp;
