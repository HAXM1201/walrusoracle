// ==================== app-logic.js ====================

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";
let currentUser = null;

let matchCache = null;
let lastFetchTime = 0;

if (typeof window.userPredictionMemory === 'undefined') {
    window.userPredictionMemory = [];
}

if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => string,
            createScript: (string) => string,
            createScriptURL: (string) => string,
        });
    }
}

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
    if (confirm(currentLang === "vi" ? "Đăng xuất?" : "Sign out?")) {
        await auth.signOut();
    }
}

const translations = {
    vi: {
        heroTitle: 'Gáy Khét World Cup <br/><span class="gradient-text">Nhận Thưởng Lớn</span>',
        heroDesc: 'Dự đoán kết quả từ 104 trận đấu chính thức của giải vô địch bóng đá thế giới FIFA World Cup 2026.',
        secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> Cục Diện 48 Đội',
        secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Lịch Trình Thi Đấu',
        secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
        secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Quỹ Giải Thưởng',
        secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Bảng Vàng Tiên Tri',
        tabVongBang: 'Vòng Bảng', 
        tabVong32: 'Vòng 32 Đội', 
        tabVong16: 'Vòng 16 Đội', 
        tabTuKet: 'Tứ Kết', 
        tabBanKet: 'Bán Kết', 
        tabChungKet: 'Chung Kết',
        btnGmail: 'Đăng nhập Gmail', 
        btnWallet: 'Kết nối ví Slush',
        btnHistory: 'Lịch sử dự đoán',
        prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Tiên Tri Tỷ Số Đúng', 
        prize1Val: '500 WAL / Vòng',
        prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Phân Tích Hài Hước Nhất', 
        prize2Val: '300 WAL / Trận',
        labelScore: 'Dự đoán Tỷ số', 
        labelAnalysis: 'Lý do phân tích', 
        placeholderAnalysis: 'Nhập nhận định của bạn...', 
        btnSubmit: 'Nộp Dự Đoán',
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
        tabVongBang: 'Group Stage', 
        tabVong32: 'Round of 32', 
        tabVong16: 'Round of 16', 
        tabTuKet: 'Quarter-Finals', 
        tabBanKet: 'Semi-Finals', 
        tabChungKet: 'Finals',
        btnGmail: 'Sign in with Gmail', 
        btnWallet: 'Connect Slush Wallet',
        btnHistory: 'Prediction History',
        prize1: '<i class="fa-solid fa-award text-yellow-500"></i> Correct Score Predictor', 
        prize1Val: '500 WAL / Round',
        prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Funniest Analyst', 
        prize2Val: '300 WAL / Match',
        labelScore: 'Score Prediction', 
        labelAnalysis: 'Analysis', 
        placeholderAnalysis: 'Your prediction...', 
        btnSubmit: 'Submit Prediction',
        matchUnit: 'matches'
    }
};

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

const mockLeaderboard = [
    { name: "TayBew", score: 1240, countryCode: "vn" },
    { name: "HALN", score: 1180, countryCode: "vn" },
    { name: "Jack", score: 1090, countryCode: "us" },
    { name: "Puchi", score: 980, countryCode: "br" },
    { name: "Stravia", score: 920, countryCode: "th" }
];

let officialMatches = [];

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
    if (!code || code === "xx" || code === "placeholder") {
        return `<div class="w-12 h-8 bg-gray-800 rounded flex items-center justify-center text-xs font-bold">TBD</div>`;
    }
    return `<img src="https://flagcdn.com/w80/${code}.png" class="w-12 h-8 rounded shadow" onerror="this.src='https://placehold.co/48x32/162238/00f2fe?text=${code.toUpperCase()}'">`;
}

function launchConfetti() {
    if (typeof window.createConfetti === "function") {
        window.createConfetti();
    }
}

function createConfetti() {
    launchConfetti();
}

function createParticles() {
    console.log("🎉 Hiệu ứng pháo hoa đã chạy");
}

function animateParticles() {
    if (typeof window.animateParticles === "function") {
        window.animateParticles();
    }
}

async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (!currentUser) {
        alert(currentLang === "vi" ? "Vui lòng đăng nhập Gmail trước!" : "Please login first!");
        return;
    }
    launchConfetti();
    const success = await storePredictionOnWalrus(matchId, homeScore, awayScore, analysis);
    if (success) {
        window.userPredictionMemory.push({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0,
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
        alert(currentLang === "vi" ? `🎉 Dự đoán trận ${matchId} đã lưu!` : `🎉 Prediction saved!`);
        setTimeout(() => renderMatches(activeTabGlobal), 1000);
    }
}

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

        let cardHTML = '';

        if (match.result && match.result.home !== null) {
            cardHTML = `
                <div class="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-5 py-1.5 rounded-bl-2xl">KẾT THÚC</div>
                <div class="flex items-center justify-between mt-8 mb-6 px-4">
                    <div class="flex flex-col items-center w-28 text-center">
                        ${getFlagImgHTML(match.codeA)}
                        <span class="font-bold text-white mt-3 text-base">${displayTeamA}</span>
                    </div>
                    <div class="text-center">
                        <div class="text-7xl font-black font-mono tracking-tighter text-white">${match.result.home} - ${match.result.away}</div>
                        <div class="text-xs text-gray-400 mt-2">${displayDate}</div>
                    </div>
                    <div class="flex flex-col items-center w-28 text-center">
                        ${getFlagImgHTML(match.codeB)}
                        <span class="font-bold text-white mt-3 text-base">${displayTeamB}</span>
                    </div>
                </div>
            `;
        } else {
            cardHTML = `
                <div class="absolute top-0 right-0 bg-worldcup-gold text-walrus-dark font-bold text-[10px] px-3 py-1 uppercase tracking-wider rounded-bl-xl">Trận ${match.id}</div>
                <div class="flex items-center justify-between my-6 px-4">
                    <div class="flex flex-col items-center gap-2 w-28 text-center">
                        ${getFlagImgHTML(match.codeA)}
                        <span class="font-bold text-white text-sm mt-1">${displayTeamA}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-xs text-gray-500 uppercase tracking-widest font-bold">VS</span>
                        <span class="text-[11px] bg-gray-800 text-gray-400 px-3 py-1 rounded-full mt-2 font-mono text-center">${displayDate}</span>
                    </div>
                    <div class="flex flex-col items-center gap-2 w-28 text-center">
                        ${getFlagImgHTML(match.codeB)}
                        <span class="font-bold text-gray-400 text-sm mt-1">${displayTeamB}</span>
                    </div>
                </div>
                <div class="border-t border-gray-800/60 pt-5 mt-4">
                    <button onclick="handleSubmissionWithEffects('${match.id}', document.getElementById('scoreA-${match.id}').value || 0, document.getElementById('scoreB-${match.id}').value || 0)" 
                            class="w-full py-3 bg-[#00f2fe] hover:bg-[#4facfe] text-black font-bold rounded-xl transition">Nộp Dự Đoán</button>
                </div>
            `;
        }

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
                <span class="font-mono font-semibold text-gray-200">${user.name}</span>
            </div>
            <span class="font-bold text-walrus-aqua">${user.score} PTS</span>
        `;
        container.appendChild(row);
    });
}

function updateUINonDynamicText() {
    const lang = translations[currentLang];
    const heroTitleEl = document.getElementById('hero-title');
    if (heroTitleEl) heroTitleEl.innerHTML = lang.heroTitle;
    const heroDescEl = document.getElementById('hero-desc');
    if (heroDescEl) heroDescEl.innerText = lang.heroDesc;
}

function toggleLanguage() {
    currentLang = currentLang === "vi" ? "en" : "vi";
    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
}

function filterMatches(type) {
    activeTabGlobal = type;
    renderMatches(type);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 800);
    }
}

async function fetchWorldCupData() {
    try {
        console.log("🌐 Đang lấy dữ liệu từ GitHub...");
        const response = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();

        officialMatches = data.matches.map((m, index) => ({
            id: String(m.num || index + 1),
            group: "Vòng Bảng",
            groupEn: "Group Stage",
            date: m.date || "2026-06-11",
            time: m.time || "TBD",
            stadium: m.stadium || "TBD",
            teamA: m.team1 ? m.team1.name : "TBD",
            teamAEn: m.team1 ? m.team1.name : "TBD",
            codeA: m.team1 && m.team1.code ? m.team1.code.toLowerCase() : "xx",
            teamB: m.team2 ? m.team2.name : "TBD",
            teamBEn: m.team2 ? m.team2.name : "TBD",
            codeB: m.team2 && m.team2.code ? m.team2.code.toLowerCase() : "xx",
            type: "vong-bang",
            isHot: false,
            result: m.score && m.score.ft ? {
                home: parseInt(m.score.ft.split('-')[0]) || 0,
                away: parseInt(m.score.ft.split('-')[1]) || 0
            } : null
        }));

        console.log(`✅ Tải thành công ${officialMatches.length} trận từ GitHub`);
        hideLoadingOverlay();
        renderMatches(activeTabGlobal);
        renderGroups();
    } catch (error) {
        console.error("❌ Lỗi tải GitHub:", error);
        hideLoadingOverlay();
    }
}

function initApp() {
    updateUINonDynamicText();
    renderGroups();
    filterMatches('vong-bang');
    renderLeaderboard();
    initFirebaseAuth();
    setTimeout(() => {
        fetchWorldCupData();
    }, 600);
    setTimeout(hideLoadingOverlay, 10000);
}

window.filterMatches = filterMatches;
window.toggleLanguage = toggleLanguage;
window.toggleWallet = function() {};
window.showMyPredictions = function() {};
window.handleSubmissionWithEffects = handleSubmissionWithEffects;
window.initApp = initApp;
