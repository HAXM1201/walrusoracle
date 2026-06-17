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
// ==================== TRANSLATIONS ====================
const translations = {
    vi: {
        heroTitle: 'Gáy Khét World Cup <br/><span class="gradient-text">Nhận Thưởng Lớn</span>',
        heroDesc: 'Dự đoán kết quả từ 104 trận đấu chính thức của giải vô địch bóng đá thế giới FIFA World Cup 2026. Nhận định của bạn sẽ được lưu vĩnh viễn trên hạ tầng Walrus Blobs Storage.',
        secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> Cục Diện 48 Đội Đường Đến World Cup 2026',
        secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Lịch Trình Thi Đấu Chính Thức',
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
        labelAnalysis: 'Lý do phân tích / Câu gáy hài hước', 
        placeholderAnalysis: 'Nhập nhận định lầy lội của bạn tại đây...', 
        btnSubmit: '<i class="fa-solid fa-cloud-arrow-up"></i> Nộp Dự Đoán',
        matchUnit: 'trận'
    },
    en: {
        heroTitle: 'Roast The World Cup <br/><span class="gradient-text">Win Massive Rewards</span>',
        heroDesc: 'Predict the outcomes of all 104 official matches for the FIFA World Cup 2026. Your insights will be permanently stored on the decentralized Walrus Blobs Storage infrastructure.',
        secGroups: '<i class="fa-solid fa-users-rectangle text-walrus-aqua"></i> 48 Teams Roadmap - World Cup 2026 Groups',
        secMatches: '<i class="fa-regular fa-calendar-days text-worldcup-gold"></i> Official Match Schedule',
        secAi: '<i class="fa-solid fa-brain text-walrus-aqua"></i> Walrus Memory Agent',
        secPrizes: '<i class="fa-solid fa-trophy text-worldcup-gold"></i> Prize Pool & Rewards',
        secLeaderboard: '<i class="fa-solid fa-ranking-star text-worldcup-gold"></i> Prediction Leaderboard',
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
        prize2: '<i class="fa-solid fa-face-laugh-squint text-orange-400"></i> Funniest Match Analyst', 
        prize2Val: '300 WAL / Match',
        labelScore: 'Score Prediction', 
        labelAnalysis: 'Analysis / Banter Comment', 
        placeholderAnalysis: 'Type your funny, trash-talk prediction here...', 
        btnSubmit: '<i class="fa-solid fa-cloud-arrow-up"></i> Submit Prediction',
        matchUnit: 'matches'
    }
};

// ==================== HIỆU ỨNG & HÀM HỖ TRỢ ====================
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

// NỘP DỰ ĐOÁN, WALRUS PUBLISHER, MEMORY AGENT, RENDER... (giữ nguyên từ file cũ của bạn)
// ... (bạn copy phần này từ file cũ vào đây)

// ==================== LOADING OVERLAY ====================
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 800);
    }
}

// ==================== LOAD DATA TRỰC TIẾP TỪ GITHUB ====================
let officialMatches = [];

async function fetchWorldCupData() {
    try {
        console.log("🌐 Đang lấy dữ liệu World Cup từ GitHub...");

        const response = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');

        if (!response.ok) throw new Error("Network error");

        const data = await response.json();

        // Chuyển đổi dữ liệu GitHub thành format của chúng ta
        officialMatches = convertGitHubData(data);

        console.log(`✅ Đã tải ${officialMatches.length} trận đấu từ GitHub`);

        hideLoadingOverlay();
        renderMatches(activeTabGlobal);
        renderGroups();

    } catch (error) {
        console.error("❌ Lỗi tải dữ liệu GitHub:", error);
        hideLoadingOverlay();
    }
}

function convertGitHubData(data) {
    const matches = [];
    if (data.matches) {
        data.matches.forEach((match, index) => {
            const id = String(match.num || (index + 1));
            matches.push({
                id: id,
                group: match.group || "Vòng Bảng",
                groupEn: match.group || "Group Stage",
                date: match.date || "TBD",
                time: match.time || "TBD",
                stadium: match.stadium || "TBD",
                teamA: match.team1?.name || "TBD",
                teamAEn: match.team1?.name || "TBD",
                codeA: (match.team1?.code || "placeholder").toLowerCase(),
                teamB: match.team2?.name || "TBD",
                teamBEn: match.team2?.name || "TBD",
                codeB: (match.team2?.code || "placeholder").toLowerCase(),
                type: "vong-bang",
                isHot: false
            });
        });
    }
    return matches;
}

// ==================== KHỞI TẠO APP ====================
function initApp() {
    currentApiStatus = "welcome";
    updateUINonDynamicText();
    renderGroups();
    filterMatches('vong-bang');
    renderLeaderboard();
    
    initFirebaseAuth();

    setTimeout(() => {
        fetchWorldCupData();
    }, 500);

    setTimeout(hideLoadingOverlay, 8000);
}

// ==================== EXPOSE GLOBAL ====================
window.filterMatches = filterMatches;
window.toggleLanguage = toggleLanguage;
window.toggleWallet = toggleWallet;
window.showMyPredictions = fetchMyPredictions;
window.handleSubmissionWithEffects = handleSubmissionWithEffects;
window.initApp = initApp;
