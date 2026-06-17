// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;

// Cache
let matchCache = null;
let lastFetchTime = 0;

// Memory
if (typeof window.userPredictionMemory === 'undefined') {
    window.userPredictionMemory = [];
}

// Trusted Types
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => string,
            createScriptURL: (string) => string,
        });
    }
}

// ==================== FIREBASE AUTH ====================
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
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        updateUserUI();
        alert(currentLang === "vi" ? `Chào ${currentUser.displayName}!` : `Welcome ${currentUser.displayName}!`);
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        if (error.code === 'auth/popup-blocked') {
            alert("❌ Trình duyệt chặn popup! Vui lòng mở khóa.");
        } else {
            alert(`Đăng nhập thất bại: ${error.message}`);
        }
    }
}

function updateUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = `<img src="${currentUser.photoURL}" class="w-6 h-6 rounded-full border border-gray-300" alt=""> <span class="text-emerald-600 font-medium">${currentUser.displayName}</span>`;
        btn.onclick = signOut;
    }
}

function resetUserUI() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" class="w-5 h-5" alt="Google"> <span id="gmailText">Đăng nhập bằng Google</span>`;
        btn.onclick = signInWithGoogle;
    }
}

async function signOut() {
    if (confirm(currentLang === "vi" ? "Đăng xuất?" : "Sign out?")) await auth.signOut();
}

// =========================================================
// ==================== TRANSLATIONS ====================
const translations = {
    vi: {
        heroTitle: 'Gáy Khét World Cup <br/><span class="gradient-text">Nhận Thưởng Lớn</span>',
        heroDesc: 'Dự đoán kết quả từ 104 trận đấu chính thức của giải vô địch bóng đá thế giới FIFA World Cup 2026.',
        secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> Cục Diện 48 Đội',
        secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Lịch Trình Thi Đấu',
        secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
        secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Quỹ Giải Thưởng',
        secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Bảng Vàng Tiên Tri',
        tabVongBang: 'Vòng Bảng', tabVong32: 'Vòng 32 Đội', tabVong16: 'Vòng 16 Đội', tabTuKet: 'Tứ Kết', tabBanKet: 'Bán Kết', tabChungKet: 'Chung Kết',
        btnGmail: 'Đăng nhập Gmail', btnWallet: 'Kết nối ví Slush', btnHistory: 'Lịch sử dự đoán',
        prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Tiên Tri Tỷ Số Đúng', prize1Val: '500 WAL / Vòng',
        prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Phân Tích Hài Hước Nhất', prize2Val: '300 WAL / Trận',
        labelScore: 'Dự đoán Tỷ số', labelAnalysis: 'Lý do phân tích', placeholderAnalysis: 'Nhập nhận định của bạn...', btnSubmit: 'Nộp Dự Đoán',
        matchUnit: 'trận'
    },
    en: {
        heroTitle: 'Roast The World Cup <br/><span class="gradient-text">Win Massive Rewards</span>',
        heroDesc: 'Predict all 104 official matches of FIFA World Cup 2026.',
        secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> 48 Teams Groups',
        secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Match Schedule',
        secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
        secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Prize Pool',
        secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Leaderboard',
        tabVongBang: 'Group Stage', tabVong32: 'Round of 32', tabVong16: 'Round of 16', tabTuKet: 'Quarter-Finals', tabBanKet: 'Semi-Finals', tabChungKet: 'Finals',
        btnGmail: 'Sign in with Gmail', btnWallet: 'Connect Slush Wallet', btnHistory: 'Prediction History',
        prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Correct Score Predictor', prize1Val: '500 WAL / Round',
        prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Funniest Analyst', prize2Val: '300 WAL / Match',
        labelScore: 'Score Prediction', labelAnalysis: 'Analysis', placeholderAnalysis: 'Your funny prediction...', btnSubmit: 'Submit Prediction',
        matchUnit: 'matches'
    }
};

// ==================== WORLD CUP GROUPS (STATIC) ====================
const worldCupGroups = {
    "Bảng A": [{name:"Mexico",nameEn:"Mexico",code:"mx"},{name:"Nam Phi",nameEn:"South Africa",code:"za"},{name:"Hàn Quốc",nameEn:"South Korea",code:"kr"},{name:"CH Séc",nameEn:"Czech Republic",code:"cz"}],
    "Bảng B": [{name:"Canada",nameEn:"Canada",code:"ca"},{name:"Bosnia & Herzegovina",nameEn:"Bosnia & Herzegovina",code:"ba"},{name:"Qatar",nameEn:"Qatar",code:"qa"},{name:"Thụy Sĩ",nameEn:"Switzerland",code:"ch"}],
    "Bảng C": [{name:"Brazil",nameEn:"Brazil",code:"br"},{name:"Ma Rốc",nameEn:"Morocco",code:"ma"},{name:"Haiti",nameEn:"Haiti",code:"ht"},{name:"Scotland",nameEn:"Scotland",code:"gb-sct"}],
    "Bảng D": [{name:"Mỹ",nameEn:"USA",code:"us"},{name:"Paraguay",nameEn:"Paraguay",code:"py"},{name:"Úc",nameEn:"Australia",code:"au"},{name:"Thổ Nhĩ Kỳ",nameEn:"Turkey",code:"tr"}],
    "Bảng E": [{name:"Đức",nameEn:"Germany",code:"de"},{name:"Curaçao",nameEn:"Curaçao",code:"cw"},{name:"Bờ Biển Ngà",nameEn:"Ivory Coast",code:"ci"},{name:"Ecuador",nameEn:"Ecuador",code:"ec"}],
    "Bảng F": [{name:"Hà Lan",nameEn:"Netherlands",code:"nl"},{name:"Nhật Bản",nameEn:"Japan",code:"jp"},{name:"Thụy Điển",nameEn:"Sweden",code:"se"},{name:"Tunisia",nameEn:"Tunisia",code:"tn"}],
    "Bảng G": [{name:"Bỉ",nameEn:"Belgium",code:"be"},{name:"Ai Cập",nameEn:"Egypt",code:"eg"},{name:"Iran",nameEn:"Iran",code:"ir"},{name:"New Zealand",nameEn:"New Zealand",code:"nz"}],
    "Bảng H": [{name:"Tây Ban Nha",nameEn:"Spain",code:"es"},{name:"Cape Verde",nameEn:"Cape Verde",code:"cv"},{name:"Ả Rập Xê Út",nameEn:"Saudi Arabia",code:"sa"},{name:"Uruguay",nameEn:"Uruguay",code:"uy"}],
    "Bảng I": [{name:"Pháp",nameEn:"France",code:"fr"},{name:"Senegal",nameEn:"Senegal",code:"sn"},{name:"Iraq",nameEn:"Iraq",code:"iq"},{name:"Na Uy",nameEn:"Norway",code:"no"}],
    "Bảng J": [{name:"Argentina",nameEn:"Argentina",code:"ar"},{name:"Algeria",nameEn:"Algeria",code:"dz"},{name:"Áo",nameEn:"Austria",code:"at"},{name:"Jordan",nameEn:"Jordan",code:"jo"}],
    "Bảng K": [{name:"Bồ Đào Nha",nameEn:"Portugal",code:"pt"},{name:"DR Congo",nameEn:"DR Congo",code:"cd"},{name:"Uzbekistan",nameEn:"Uzbekistan",code:"uz"},{name:"Colombia",nameEn:"Colombia",code:"co"}],
    "Bảng L": [{name:"Anh",nameEn:"England",code:"gb-eng"},{name:"Croatia",nameEn:"Croatia",code:"hr"},{name:"Ghana",nameEn:"Ghana",code:"gh"},{name:"Panama",nameEn:"Panama",code:"pa"}]
};

// ==================== MOCK LEADERBOARD ====================
const mockLeaderboard = [
    { name: "TayBew", score: 1240, countryCode: "vn" },
    { name: "HALN", score: 1180, countryCode: "vn" },
    { name: "Jack", score: 1090, countryCode: "us" },
    { name: "Puchi", score: 980, countryCode: "br" },
    { name: "Stravia", score: 920, countryCode: "th" }
];

// ==================== OFFICIAL MATCHES (LOAD TỪ GITHUB) ====================
let officialMatches = [];

// ==================== HIỆU ỨNG ====================
function getLocalizedDate(match) {
    let dateStr = match.date || "";
    if (currentLang === "en") {
        return dateStr.replace(/Thứ 2|thứ 2/g, "Mon").replace(/Thứ 3|thứ 3/g, "Tue").replace(/Thứ 4|thứ 4/g, "Wed")
                      .replace(/Thứ 5|thứ 5/g, "Thu").replace(/Thứ 6|thứ 6/g, "Fri").replace(/Thứ 7|thứ 7/g, "Sat").replace(/CN|cn/g, "Sun");
    }
    return dateStr;
}

function getFlagImgHTML(code) {
    if (code === "placeholder") return `<div class="w-12 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">TBD</div>`;
    return `<img src="https://flagcdn.com/w80/${code}.png" onerror="this.onerror=null; this.src='https://placehold.co/48x32/162238/00f2fe?text=${code.toUpperCase()}';" class="w-12 h-8 object-cover rounded shadow-md border border-gray-700/50" alt="${code}" />`;
}

function launchConfetti() {
    if (typeof window.createConfetti === "function") window.createConfetti();
}

function createConfetti() { launchConfetti(); }
function createParticles() { console.log("🎉 Hiệu ứng pháo hoa đã chạy"); }
function animateParticles() {
    if (typeof window.animateParticles === "function") window.animateParticles();
}

// ====================== NỘP DỰ ĐOÁN ======================
async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước!" : "Please login first!");
        return;
    }
    launchConfetti();
    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);
    if (success) {
        window.userPredictionMemory.push({ ownerEmail: currentUser.email, matchId: matchId, homeScore: parseInt(homeScore)||0, awayScore: parseInt(awayScore)||0, analysis: analysis, timestamp: new Date().toISOString() });
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
        alert(currentLang === "vi" ? `🎉 Dự đoán trận ${matchId} đã lưu!` : `🎉 Prediction saved!`);
        setTimeout(() => renderMatches(activeTabGlobal), 1000);
    }
}

// ==================== WALRUS PUBLISHER & MEMORY AGENT (rút gọn) ====================
const CUSTOM_PUBLISHER_URL = "https://walrus-publisher-production-b5d6.up.railway.app";

async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) return false;
    const predictionData = { userEmail: currentUser.email, matchId, homeScore: parseInt(scoreA)||0, awayScore: parseInt(scoreB)||0, analysis: analysis||"", timestamp: new Date().toISOString(), lang: currentLang };
    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/publish`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(predictionData) });
        return response.ok;
    } catch (e) { console.error(e); return false; }
}

function resetAiAgentUI() {
    const aiStatusText = document.getElementById('ai-status-text');
    const aiAgentText = document.getElementById('ai-roast-text');
    if (aiStatusText) aiStatusText.innerText = currentLang === "vi" ? "Đang chờ sếp đăng nhập..." : "Waiting for sign in...";
    if (aiAgentText) aiAgentText.innerHTML = currentLang === "vi" ? `"Chào sếp! Hãy đăng nhập Gmail..."` : `"Welcome! Please sign in..."`;
}

function triggerWalrusMemoryAgent(email, displayName) {
    const aiStatusText = document.getElementById('ai-status-text');
    const aiAgentText = document.getElementById('ai-roast-text');
    if (!aiStatusText || !aiAgentText) return;
    aiStatusText.innerText = currentLang === "vi" ? "🧠 Đang giải mã..." : "🧠 Decoding...";
    setTimeout(() => {
        const total = window.userPredictionMemory.filter(item => item.ownerEmail === email).length;
        aiStatusText.innerText = currentLang === "vi" ? "✅ Bộ nhớ Walrus: Đã đồng bộ" : "✅ Walrus Memory: Synced";
        aiAgentText.innerHTML = total === 0 
            ? (currentLang === "vi" ? `"Chào sếp <strong>${displayName}</strong>! Tài khoản mới."` : `"Hello <strong>${displayName}</strong>! New account."`)
            : (currentLang === "vi" ? `"Đã có <strong>${total}</strong> dự đoán của sếp."` : `"Synced <strong>${total}</strong> predictions."`);
    }, 1200);
}

// ==================== RENDER FUNCTIONS ====================
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
        card.className = "bg-walrus-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition hover:border-gray-700";
        let displayGroup = currentLang === "en" && match.groupEn ? match.groupEn : match.group;
        let displayDate = getLocalizedDate(match);
        let displayTeamA = currentLang === "en" ? (match.teamAEn || match.teamA) : match.teamA;
        let displayTeamB = currentLang === "en" ? (match.teamBEn || match.teamB) : match.teamB;

        let cardHTML = match.result && match.result.home !== undefined 
            ? `<div class="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-5 py-1.5 rounded-bl-2xl">KẾT THÚC</div>
               <div class="flex items-center justify-between mt-8 mb-6 px-4">
                   <div class="flex flex-col items-center w-28">${getFlagImgHTML(match.codeA)}<span class="font-bold text-white mt-3">${displayTeamA}</span></div>
                   <div class="text-center"><div class="text-7xl font-black">${match.result.home} - ${match.result.away}</div><div class="text-xs text-gray-400">${displayDate}</div></div>
                   <div class="flex flex-col items-center w-28">${getFlagImgHTML(match.codeB)}<span class="font-bold text-white mt-3">${displayTeamB}</span></div>
               </div>`
            : `<div class="absolute top-0 right-0 bg-worldcup-gold text-walrus-dark font-bold text-[10px] px-3 py-1 rounded-bl-xl">Trận ${match.id}</div>
               <div class="flex items-center justify-between my-6 px-4">
                   <div class="flex flex-col items-center w-28">${getFlagImgHTML(match.codeA)}<span class="font-bold text-white mt-1">${displayTeamA}</span></div>
                   <div class="text-center"><span class="text-xs text-gray-500">VS</span><br><span class="text-[11px]">${displayDate}</span></div>
                   <div class="flex flex-col items-center w-28">${getFlagImgHTML(match.codeB)}<span class="font-bold text-gray-400 mt-1">${displayTeamB}</span></div>
               </div>
               <div class="border-t border-gray-800 pt-5">
                   <button onclick="handleSubmissionWithEffects('${match.id}', document.getElementById('scoreA-${match.id}').value, document.getElementById('scoreB-${match.id}').value, '')" class="w-full py-3 bg-walrus-aqua text-walrus-dark font-bold rounded-xl">Nộp Dự Đoán</button>
               </div>`;

        card.innerHTML = cardHTML;
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
        let dynamicName = currentLang === "en" ? groupName.replace("Bảng", "Group") : groupName;
        let html = `<h3 class="font-bold text-walrus-aqua mb-2">${dynamicName}</h3><ul class="space-y-1">`;
        teams.forEach(t => {
            html += `<li class="flex items-center gap-2"><img src="https://flagcdn.com/w40/${t.code}.png" class="w-5 h-3.5" onerror="this.src='https://placehold.co/24x16/162238/00f2fe?text=${t.code}'"> ${currentLang==="en"?t.nameEn:t.name}</li>`;
        });
        html += `</ul>`;
        groupCard.innerHTML = html;
        container.appendChild(groupCard);
    }
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    container.innerHTML = '';
    mockLeaderboard.forEach((user, i) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-3 bg-gray-950/50 rounded-xl text-sm";
        row.innerHTML = `<span>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)} ${user.name}</span><span class="font-bold text-walrus-aqua">${user.score} PTS</span>`;
        container.appendChild(row);
    });
}

function updateUINonDynamicText() {
    const lang = translations[currentLang];
    // Cập nhật text các phần tĩnh (bạn có thể bổ sung thêm id nếu cần)
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.innerHTML = lang.heroTitle;
    // ... (các phần khác tương tự)
}

function toggleLanguage() {
    currentLang = currentLang === "vi" ? "en" : "vi";
    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
}

// ==================== KHỞI TẠO ====================
function filterMatches(type) {
    activeTabGlobal = type;
    renderMatches(type);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 800);
    }
}

// ==================== GITHUB DATA ====================
async function fetchWorldCupData() {
    try {
        console.log("🌐 Đang lấy dữ liệu từ GitHub...");
        const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        officialMatches = convertGitHubData(data);
        console.log(`✅ Tải thành công ${officialMatches.length} trận`);
        hideLoadingOverlay();
        renderMatches(activeTabGlobal);
    } catch (e) {
        console.error("❌ Lỗi GitHub:", e);
        hideLoadingOverlay();
    }
}

function convertGitHubData(data) {
    const arr = [];
    if (data.matches) {
        data.matches.forEach((m, idx) => {
            arr.push({
                id: String(m.num || idx+1),
                group: "Vòng Bảng",
                groupEn: "Group Stage",
                date: m.date || "TBD",
                time: m.time || "TBD",
                stadium: m.stadium || "TBD",
                teamA: m.team1?.name || "TBD",
                teamAEn: m.team1?.name || "TBD",
                codeA: (m.team1?.code || "xx").toLowerCase(),
                teamB: m.team2?.name || "TBD",
                teamBEn: m.team2?.name || "TBD",
                codeB: (m.team2?.code || "xx").toLowerCase(),
                type: "vong-bang",
                isHot: false
            });
        });
    }
    return arr;
}

// ==================== INIT ====================
function initApp() {
    updateUINonDynamicText();
    renderGroups();
    filterMatches('vong-bang');
    renderLeaderboard();
    initFirebaseAuth();
    setTimeout(fetchWorldCupData, 800);
    setTimeout(hideLoadingOverlay, 10000);
}

// ==================== EXPOSE ====================
window.filterMatches = filterMatches;
window.toggleLanguage = toggleLanguage;
window.toggleWallet = function(){};
window.showMyPredictions = function(){};
window.handleSubmissionWithEffects = handleSubmissionWithEffects;
window.initApp = initApp;
