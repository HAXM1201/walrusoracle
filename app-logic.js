<!-- ==================== app-logic.js ==================== -->

let currentLang = "vi"; 
let currentApiStatus = "welcome"; 
let activeTabGlobal = "vong-bang";

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

        let hotBadgeHTML = match.isHot 
            ? `<div class="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-[9px] px-3 py-0.5 uppercase tracking-widest shadow-md z-10">
                    🔥 HOT MATCH
               </div>` 
            : '';

        card.innerHTML = `
            ${hotBadgeHTML}
            <div class="absolute top-0 right-0 bg-worldcup-gold text-walrus-dark font-bold text-[10px] px-3 py-1 uppercase tracking-wider rounded-bl-xl z-10">
                ${currentLang === "en" ? "Match" : "Trận"} ${match.id} - ${displayGroup}
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-400 mb-4 mt-1">
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
                    <button onclick="handleSubmissionWithEffects('${match.id}')" class="gradient-btn hover:opacity-90 text-walrus-dark font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-walrus-aqua/20 flex items-center gap-2 transition">
                        ${lang.btnSubmit}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

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

// =========================================================
// 🌐 ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG QUA FOOTBALL-DATA.ORG
// =========================================================
const FOOTBALL_DATA_API_KEY = "1287e361b6fe45d49685debe16b7561f"; 

async function fetchWorldCupData() {
    const aiAgentText = document.getElementById('ai-roast-text');
    const aiAvatarBox = document.getElementById('ai-avatar-box');
    
    currentApiStatus = "connecting";
    if (aiAgentText) aiAgentText.innerHTML = translations[currentLang].aiConnecting;
    if (aiAvatarBox) aiAvatarBox.innerText = "🔍";

    try {
        const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
            method: 'GET',
            headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
        });

        if (!response.ok) throw new Error("API Connection Failed");
        const data = await response.json();
        const apiMatches = data.matches;

        apiMatches.forEach(apiMatch => {
            const localMatch = officialMatches.find(m => m.id === apiMatch.matchNumber.toString());
            
            if (localMatch) {
                if (apiMatch.status === "FINISHED") {
                    const resultPrefix = currentLang === "en" ? "Result" : "Kết quả";
                    if (!localMatch.stadium.includes(resultPrefix)) {
                        localMatch.stadium += ` (${resultPrefix}: ${apiMatch.score.fullTime.home} - ${apiMatch.score.fullTime.away})`;
                    }
                }

                if (apiMatch.homeTeam && apiMatch.homeTeam.name && localMatch.id > 72) {
                    localMatch.teamA = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name;
                    localMatch.teamAEn = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name;
                    localMatch.codeA = apiMatch.homeTeam.tla ? apiMatch.homeTeam.tla.toLowerCase() : "placeholder";
                }
                if (apiMatch.awayTeam && apiMatch.awayTeam.name && localMatch.id > 72) {
                    localMatch.teamB = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name;
                    localMatch.teamBEn = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name;
                    localMatch.codeB = apiMatch.awayTeam.tla ? apiMatch.awayTeam.tla.toLowerCase() : "placeholder";
                }
            }
        });

        currentApiStatus = "success";
        if (aiAgentText) aiAgentText.innerHTML = translations[currentLang].aiSuccess;
        if (aiAvatarBox) aiAvatarBox.innerText = "🏆";

        renderMatches(activeTabGlobal);

    } catch (error) {
        console.log("API Error or rate limit hit. Falling back to internal data.");
        currentApiStatus = "fallback";
        if (aiAgentText) aiAgentText.innerHTML = translations[currentLang].aiFallback;
        if (aiAvatarBox) aiAvatarBox.innerText = "🛡️";
    }
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

    const aiStatusText = document.getElementById('ai-status-text');
    if (aiStatusText) aiStatusText.innerText = lang.aiReading;
    
    const aiAgentText = document.getElementById('ai-roast-text');
    if (aiAgentText) {
        if (currentApiStatus === "welcome") aiAgentText.innerHTML = lang.aiWelcome;
        else if (currentApiStatus === "connecting") aiAgentText.innerHTML = lang.aiConnecting;
        else if (currentApiStatus === "success") aiAgentText.innerHTML = lang.aiSuccess;
        else if (currentApiStatus === "fallback") aiAgentText.innerHTML = lang.aiFallback;
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
}

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

function handleSubmissionWithEffects(id) {
    createConfetti();
    animateParticles();
    mockSubmit(id);
}

function mockSubmit(id) { 
    const successMsg = currentLang === "en" 
        ? `Success! Your prediction for match ${id} has been securely stored on Walrus Mainnet.`
        : `Thành công! Dự đoán trận ${id} đã được lưu trữ lên Walrus Mainnet.`;
    alert(successMsg); 
}

async function fetchMyPredictions() {
    const email = document.getElementById('gmailText').innerText;
    
    if (email.includes("Đăng nhập") || email.includes("Sign in")) {
        alert(currentLang === "en" ? "Please sign in with Gmail first!" : "Sếp vui lòng đăng nhập Gmail trước!");
        return;
    }

    alert(currentLang === "en" ? "Fetching your prediction history from Walrus..." : "Đang truy xuất lịch sử dự đoán từ Walrus...");
    
    const myHistory = userPredictionMemory.filter(item => item.ownerEmail === email);
    
    if (myHistory.length === 0) {
        alert(currentLang === "en" ? "No prediction history found for this account." : "Chưa có lịch sử dự đoán cho tài khoản này.");
    } else {
        console.table(myHistory); 
        alert(currentLang === "en" 
            ? `You have ${myHistory.length} prediction(s). Check browser console for details!` 
            : `Sếp đã có ${myHistory.length} dự đoán. Kiểm tra console để xem chi tiết!`);
    }
}
// ==================== FIREBASE AUTH WITH GOOGLE ====================
let currentUser = null;

// Firebase config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyBl7vHtoGcSNqoIgTJnPkgu29wQRD2XVAo",
  authDomain: "walrus-cup-oracle.firebaseapp.com",
  projectId: "walrus-cup-oracle",
  storageBucket: "walrus-cup-oracle.firebasestorage.app",
  messagingSenderId: "152805594660",
  appId: "1:152805594660:web:3767f0fd98f6720031eab1",
  measurementId: "G-PSVC36Q50K"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

function initFirebaseAuth() {
    // Kiểm tra user đã đăng nhập chưa
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            updateUserUI();
        } else {
            currentUser = null;
            resetUserUI();
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
        
        alert(currentLang === "vi" 
            ? `Chào ${currentUser.displayName}! Đăng nhập thành công.` 
            : `Welcome ${currentUser.displayName}!`);
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        alert("Đăng nhập thất bại. Vui lòng thử lại.");
    }
}

function updateUserUI() {
    const btn = document.getElementById('googleBtn');
    const txt = document.getElementById('gmailText');

    if (currentUser) {
        btn.innerHTML = `
            <img src="${currentUser.photoURL || 'https://via.placeholder.com/32'}" 
                 class="w-6 h-6 rounded-full border border-gray-300" alt="">
            <span class="text-emerald-600 font-medium">${currentUser.displayName}</span>
        `;
        btn.onclick = signOut;
    }
}

function resetUserUI() {
    const btn = document.getElementById('googleBtn');
    btn.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
             class="w-5 h-5" alt="Google">
        <span id="gmailText">${translations[currentLang].btnGmail || 'Đăng nhập bằng Google'}</span>
    `;
    btn.onclick = signInWithGoogle;
}

async function signOut() {
    if (confirm(currentLang === "vi" ? "Bạn muốn đăng xuất?" : "Sign out?")) {
        await auth.signOut();
        currentUser = null;
        resetUserUI();
    }
}

// ====================== KHỞI CHẠY ======================
function initApp() {
    currentApiStatus = "welcome";
    updateUINonDynamicText();
    renderGroups();
    filterMatches('vong-bang');
    renderLeaderboard();
    fetchWorldCupData();

    // Khởi tạo Firebase Auth
    initFirebaseAuth();
}
