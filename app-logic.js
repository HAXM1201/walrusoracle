// ==================== app-logic.js (refactored) ====================

let currentLang = "vi";
let currentApiStatus = "welcome";
let activeTabGlobal = "vong-bang";
let currentUser = null;
let matchCache = null;
let lastFetchTime = 0;
let isWalletConnected = false;
let isFetchingWorldCupData = false;

if (typeof window.userPredictionMemory === "undefined") {
    window.userPredictionMemory = [];
}

const CUSTOM_PUBLISHER_URL = "[walrus-backend-production.up.railway.app](https://walrus-backend-production.up.railway.app)";

// ==================== FIREBASE CONFIG & AUTH LAYER ====================
const firebaseConfig = {
    apiKey: "AIzaSyBl7vHtoGcSNqoIgTJnPkgu29wQRD2XVAo",
    authDomain: "walrus-cup-oracle.firebaseapp.com",
    projectId: "walrus-cup-oracle",
    storageBucket: "walrus-cup-oracle.firebasestorage.app",
    messagingSenderId: "152805594660",
    appId: "1:152805594660:web:3767f0fd98f6720031eab1"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// ==================== SAFE HELPERS ====================
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return String(value);
}

function clearNode(node) {
    if (!node) return;
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function createEl(tag, className = "", text = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

function parseScore(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
}

function buildUserPredictionKey(ownerEmail, matchId, homeScore, awayScore) {
    return `${safeText(ownerEmail)}__${safeText(matchId)}__${safeText(homeScore)}__${safeText(awayScore)}`;
}

function hasPrediction(ownerEmail, matchId, homeScore, awayScore) {
    const key = buildUserPredictionKey(ownerEmail, matchId, homeScore, awayScore);
    return window.userPredictionMemory.some(item => {
        const itemKey = buildUserPredictionKey(
            item.ownerEmail,
            item.matchId,
            item.homeScore,
            item.awayScore
        );
        return itemKey === key;
    });
}

function upsertPrediction(prediction) {
    if (!prediction) return;

    const normalized = {
        ownerEmail: safeText(prediction.ownerEmail),
        matchId: safeText(prediction.matchId),
        homeScore: Number.isInteger(prediction.homeScore) ? prediction.homeScore : null,
        awayScore: Number.isInteger(prediction.awayScore) ? prediction.awayScore : null,
        analysis: safeText(prediction.analysis),
        timestamp: prediction.timestamp || new Date().toISOString()
    };

    const existingIndex = window.userPredictionMemory.findIndex(item => {
        return (
            String(item.ownerEmail) === normalized.ownerEmail &&
            String(item.matchId) === normalized.matchId &&
            Number(item.homeScore) === normalized.homeScore &&
            Number(item.awayScore) === normalized.awayScore
        );
    });

    if (existingIndex >= 0) {
        window.userPredictionMemory[existingIndex] = {
            ...window.userPredictionMemory[existingIndex],
            ...normalized
        };
    } else {
        window.userPredictionMemory.push(normalized);
    }
}

function getLocalizedDate(match) {
    let dateStr = match?.date || "";
    if (currentLang === "en") return dateStr;
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function launchConfetti() {
    if (typeof confetti === "function") {
        confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 }
        });
    }
}

// ==================== UI: FLAGS ====================
function createFlagNode(code) {
    if (!code || code === "placeholder") {
        const box = document.createElement("div");
        box.className = "w-12 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase";
        box.textContent = "TBD";
        return box;
    }

    const img = document.createElement("img");
    img.src = `[flagcdn.com](https://flagcdn.com/w80/${encodeURIComponent(code)}.png)`;
    img.className = "w-12 h-8 object-cover rounded shadow-md border border-gray-700/50";
    img.alt = code;
    img.onerror = function onFlagError() {
        img.onerror = null;
        img.src = `[placehold.co](https://placehold.co/48x32/162238/00f2fe?text=${encodeURIComponent(String(code).toUpperCase())})`;
    };
    return img;
}

// ==================== AUTH ====================
function initFirebaseAuth() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log("✅ Đăng nhập thành công:", user.displayName);
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
    provider.setCustomParameters({ prompt: "select_account" });

    try {
        console.log("🔄 Đang bật Popup xác thực Google...");
        const result = await auth.signInWithPopup(provider);
        currentUser = result.user;
        updateUserUI();
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);
    } catch (error) {
        console.error("❌ Lỗi đăng nhập:", error);
        showCyberToast(
            currentLang === "vi"
                ? `Đăng nhập thất bại: ${error.message}`
                : `Login failed: ${error.message}`,
            "error"
        );
    }
}

function updateUserUI() {
    const btn = document.getElementById("googleBtn");
    if (!btn || !currentUser) return;

    clearNode(btn);

    const img = document.createElement("img");
    img.src = currentUser.photoURL || "";
    img.className = "w-6 h-6 rounded-full border border-gray-300";
    img.alt = "User avatar";

    const span = document.createElement("span");
    span.className = "text-emerald-600 font-medium";
    span.textContent = currentUser.displayName || "User";

    btn.appendChild(img);
    btn.appendChild(span);
    btn.onclick = signOut;
}

function resetUserUI() {
    const btn = document.getElementById("googleBtn");
    if (!btn) return;

    clearNode(btn);

    const img = document.createElement("img");
    img.src = "[upload.wikimedia.org](https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg)";
    img.className = "w-5 h-5";
    img.alt = "Google";

    const span = document.createElement("span");
    span.id = "gmailText";
    span.textContent = currentLang === "vi" ? "Đăng nhập bằng Google" : "Sign in with Google";

    btn.appendChild(img);
    btn.appendChild(span);
    btn.onclick = signInWithGoogle;
}

async function signOut() {
    const ok = confirm(currentLang === "vi" ? "Đăng xuất tài khoản?" : "Sign out?");
    if (!ok) return;

    await auth.signOut();
    window.location.reload();
}

// ==================== AI AGENT UI ====================
function resetAiAgentUI() {
    const aiStatusText = document.getElementById("ai-status-text");
    const aiAgentText = document.getElementById("ai-roast-text");

    if (aiStatusText) {
        aiStatusText.innerText = currentLang === "vi"
            ? "Đang chờ sếp đăng nhập..."
            : "Waiting for sign in...";
    }

    if (aiAgentText) {
        aiAgentText.textContent = currentLang === "vi"
            ? 'Chào sếp! Hãy kết nối ví Slush hoặc đăng nhập Gmail để tôi quét lịch sử gáy trận đấu của sếp trên mạng lưới Walrus nhé.'
            : "Welcome! Please connect Slush wallet or sign in with Gmail so I can scan your prediction history on Walrus.";
    }
}

async function triggerWalrusMemoryAgent(email, displayName) {
    const aiStatusText = document.getElementById("ai-status-text");
    const aiAgentText = document.getElementById("ai-roast-text");
    const aiAvatarBox = document.getElementById("ai-avatar-box");

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

        if (!response.ok) {
            throw new Error("Backend error");
        }

        const data = await response.json();
        const label = currentLang === "vi" ? "Hải Ly Tiên Tri" : "Walrus Oracle";
        aiAgentText.textContent = `${label}: ${safeText(data.botReply, "")}`;

        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi"
            ? "✅ Bộ nhớ đã đồng bộ"
            : "✅ Walrus Memory: Synced";

        if (data.botReply) {
            const blocks = data.botReply.split(/\[TRẬN\]|\[MATCH\]/i);

            blocks.forEach(block => {
                if (!block.trim()) return;

                const idMatch = block.match(/(\d+)/);
                const scoreMatch = block.match(/(\d+)\s*-\s*(\d+)/);

                if (idMatch && scoreMatch) {
                    const mId = idMatch[1].trim();
                    const hScore = parseInt(scoreMatch[1], 10);
                    const aScore = parseInt(scoreMatch[2], 10);

                    if (!hasPrediction(email, mId, hScore, aScore)) {
                        upsertPrediction({
                            ownerEmail: email,
                            matchId: mId,
                            homeScore: hScore,
                            awayScore: aScore,
                            analysis: "Synced from Oracle",
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            });

            console.log("🔄 [Walrus Memory Sync Success]:", window.userPredictionMemory);
        }
    } catch (error) {
        console.error("Lỗi đồng bộ:", error);
        if (aiAvatarBox) aiAvatarBox.innerText = "🦫";
        aiStatusText.innerText = currentLang === "vi" ? "⚠️ Lỗi đồng bộ" : "⚠️ Sync failed";
    }
}

// ==================== TOAST ====================
function showCyberToast(message, type = "success") {
    let container = document.getElementById("cyber-toast-container");

    if (!container) {
        container = document.createElement("div");
        container.id = "cyber-toast-container";
        container.className = "fixed bottom-5 right-5 z-[10000] flex flex-col gap-3 max-w-md w-full pointer-events-none p-4";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className =
        "pointer-events-auto transform translate-y-5 opacity-0 transition-all duration-300 font-sans p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-bold tracking-wide";

    if (type === "success") {
        toast.className += " bg-slate-900/95 border-emerald-500/40 text-emerald-400 shadow-emerald-950/40";
    } else if (type === "error") {
        toast.className += " bg-slate-900/95 border-rose-500/40 text-rose-400 shadow-rose-950/40";
    } else {
        toast.className += " bg-slate-900/95 border-amber-500/40 text-amber-400 shadow-amber-950/40";
    }

    const content = document.createElement("div");
    content.className = "flex-1 flex items-center gap-2";

    const icon = document.createElement("span");
    icon.textContent = type === "success" ? "🎉" : type === "error" ? "❌" : "⚠️";

    const text = document.createElement("span");
    text.textContent = safeText(message);

    const closeBtn = document.createElement("button");
    closeBtn.className = "text-gray-500 hover:text-gray-300 transition-all ml-2 font-black";
    closeBtn.textContent = "×";
    closeBtn.onclick = () => toast.remove();

    content.appendChild(icon);
    content.appendChild(text);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-5", "opacity-0");
    }, 10);

    setTimeout(() => {
        toast.classList.add("translate-y-[-20px]", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
window.showCyberToast = showCyberToast;

// ==================== POPUP ====================
function hideSuccessPopup() {
    const popup = document.getElementById("haili-popup");
    if (popup) popup.remove();
}

function showSuccessPopup(message) {
    hideSuccessPopup();

    const popup = document.createElement("div");
    popup.id = "haili-popup";
    popup.className = "fixed bottom-5 right-5 bg-emerald-600 text-white p-4 rounded-lg shadow-2xl z-50 animate-bounce";

    const row = document.createElement("div");
    row.className = "flex items-center gap-2";

    const icon = document.createElement("span");
    icon.className = "text-2xl";
    icon.textContent = "🦫";

    const content = document.createElement("div");

    const title = document.createElement("p");
    title.className = "font-bold";
    title.textContent = currentLang === "vi" ? "Đang gáy & Lưu Blockchain..." : "Processing & Saving...";

    const desc = document.createElement("p");
    desc.className = "text-sm";
    desc.textContent = safeText(message);

    content.appendChild(title);
    content.appendChild(desc);
    row.appendChild(icon);
    row.appendChild(content);
    popup.appendChild(row);

    document.body.appendChild(popup);
}

// ==================== SUBMIT / SAVE ====================
async function storePredictionOnWalrus(matchId, scoreA, scoreB, analysis) {
    if (!currentUser) return false;

    showSuccessPopup(currentLang === "vi" ? "Đang chờ Hải Ly xử lý..." : "Waiting for Walrus agent...");

    const cleanAnalysis = safeText(analysis).trim();
    const userText = `Trận ${matchId} (Tỷ số dự đoán: ${scoreA}-${scoreB}). Nhận định: ${cleanAnalysis || "Không có"}`;

    try {
        const response = await fetch(`${CUSTOM_PUBLISHER_URL}/api/ai-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userIdentifier: currentUser.email,
                userText: userText,
                displayName: currentUser.displayName,
                lang: currentLang
            })
        });

        if (!response.ok) {
            throw new Error("Backend Error");
        }

        const data = await response.json();

        upsertPrediction({
            ownerEmail: currentUser.email,
            matchId: matchId,
            homeScore: scoreA,
            awayScore: scoreB,
            analysis: cleanAnalysis || safeText(data.botReply),
            timestamp: new Date().toISOString()
        });

        hideSuccessPopup();
        return true;
    } catch (error) {
        hideSuccessPopup();
        console.error("Publisher Error:", error);
        return false;
    }
}

async function handleSubmissionWithEffects(matchId, homeScore, awayScore, analysis = "") {
    if (!currentUser) {
        showCyberToast(
            currentLang === "vi"
                ? "Vui lòng đăng nhập Gmail trước khi nộp dự đoán!"
                : "Please login first!",
            "error"
        );
        return;
    }

    const home = parseScore(homeScore);
    const away = parseScore(awayScore);

    if (home === null || away === null) {
        showCyberToast(
            currentLang === "vi"
                ? "Vui lòng nhập tỷ số hợp lệ."
                : "Please enter a valid score.",
            "warning"
        );
        return;
    }

    launchConfetti();

    const success = await storePredictionOnWalrus(matchId, home, away, analysis);

    if (success) {
        triggerWalrusMemoryAgent(currentUser.email, currentUser.displayName);

        const aiAgentText = document.getElementById("ai-roast-text");
        if (aiAgentText) {
            aiAgentText.textContent = currentLang === "vi"
                ? "🦫 Hải Ly Tiên Tri đang đọc Blobs bộ nhớ và soạn văn gáy..."
                : "🦫 Walrus Oracle is reading memory blobs and preparing a response...";
        }

        showCyberToast(
            currentLang === "vi"
                ? `Dự đoán trận ${matchId} đã được ghi thành công!`
                : `Prediction saved successfully!`,
            "success"
        );
    } else {
        showCyberToast(
            currentLang === "vi"
                ? "Có lỗi xảy ra khi truyền dữ liệu!"
                : "Connection error!",
            "error"
        );
    }
}

window.handleSubmissionWithEffects = handleSubmissionWithEffects;

// ==================== FETCH DATA ====================
async function fetchWorldCupData() {
    if (isFetchingWorldCupData) return;
    isFetchingWorldCupData = true;

    const aiStatusText = document.getElementById("ai-status-text");
    if (aiStatusText && typeof translations !== "undefined" && translations[currentLang]) {
        aiStatusText.innerText = translations[currentLang].aiConnecting;
    }

    try {
        const response = await fetch("[raw.githubusercontent.com](https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json)");
        if (!response.ok) throw new Error("GitHub Network error");

        const data = await response.json();

        officialMatches = [];
        worldCupGroups = {};

        data.matches.forEach((item, idx) => {
            const matchId = String(idx + 1);

            const rawTeam1 = item.team1 || "TBD";
            const rawTeam2 = item.team2 || "TBD";

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

                if (
                    !worldCupGroups[groupName].some(t => t.nameEn === rawTeam1) &&
                    teamAInfo.code !== "placeholder"
                ) {
                    worldCupGroups[groupName].push({
                        name: teamAInfo.vi,
                        nameEn: rawTeam1,
                        code: teamAInfo.code
                    });
                }
            }

            let matchResult = null;
            if (item.score && item.score.ft && Array.isArray(item.score.ft)) {
                const goalsList = [];

                if (item.goals1 && Array.isArray(item.goals1)) {
                    item.goals1.forEach(g => {
                        goalsList.push({
                            team: "home",
                            scorer: g.name,
                            minute: g.minute
                        });
                    });
                }

                if (item.goals2 && Array.isArray(item.goals2)) {
                    item.goals2.forEach(g => {
                        goalsList.push({
                            team: "away",
                            scorer: g.name,
                            minute: g.minute
                        });
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
                type,
                isHot: idx % 10 === 0,
                result: matchResult
            });
        });

        officialMatches.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);

            const timeCleanA = a.time.split(" ")[0] || "00:00";
            const timeCleanB = b.time.split(" ")[0] || "00:00";

            const [hourA, minA] = timeCleanA.split(":").map(Number);
            const [hourB, minB] = timeCleanB.split(":").map(Number);

            if (hourA !== hourB) return hourA - hourB;
            if (minA !== minB) return minA - minB;
            return parseInt(a.id, 10) - parseInt(b.id, 10);
        });

        currentApiStatus = "success";
        lastFetchTime = Date.now();

        if (aiStatusText && typeof translations !== "undefined" && translations[currentLang]) {
            aiStatusText.innerText = translations[currentLang].aiSuccess;
        }
    } catch (error) {
        console.error("Lỗi dòng nạp GitHub:", error);
        currentApiStatus = "fallback";
    } finally {
        renderGroups();
        renderMatches(activeTabGlobal);

        const loadingBox =
            document.getElementById("loading-overlay") ||
            document.querySelector(".loading-box") ||
            document.getElementById("loading") ||
            document.querySelector('[class*="loading"]');

        if (loadingBox) {
            loadingBox.style.setProperty("display", "none", "important");
        }

        isFetchingWorldCupData = false;
    }
}

// ==================== MATCH RENDER ====================
function buildScorersHTML(goals = []) {
    if (!goals.length) return "";

    const homeScorers = goals.filter(g => g.team === "home");
    const awayScorers = goals.filter(g => g.team === "away");

    let html = `<div class="w-full mt-3 grid grid-cols-2 gap-x-4 text-[10px] text-gray-500 bg-slate-900/30 p-2 rounded-xl border border-slate-900/80">`;

    html += `<div class="space-y-1 text-left border-r border-slate-800/60 pr-1">`;
    homeScorers.forEach(g => {
        html += `<div class="truncate text-gray-400">⚽ ${escapeHTML(g.scorer)} (${escapeHTML(g.minute)}')</div>`;
    });
    html += `</div>`;

    html += `<div class="space-y-1 text-right pl-1">`;
    awayScorers.forEach(g => {
        html += `<div class="truncate text-gray-400">${escapeHTML(g.scorer)} (${escapeHTML(g.minute)}') ⚽</div>`;
    });
    html += `</div>`;

    html += `</div>`;
    return html;
}

function createPredictionActionArea(match) {
    const wrapper = document.createElement("div");
    wrapper.className = "mt-2 pt-3 border-t border-slate-800/80 space-y-2";

    const scoreRow = document.createElement("div");
    scoreRow.className = "flex gap-2 justify-center items-center";

    const inputA = document.createElement("input");
    inputA.type = "number";
    inputA.id = `scoreA-${match.id}`;
    inputA.placeholder = "0";
    inputA.className = "w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all";

    const dash = document.createElement("span");
    dash.className = "text-xs text-gray-600 font-bold";
    dash.textContent = "-";

    const inputB = document.createElement("input");
    inputB.type = "number";
    inputB.id = `scoreB-${match.id}`;
    inputB.placeholder = "0";
    inputB.className = "w-12 h-8 bg-slate-950 border border-slate-800 rounded-lg text-center text-sm font-bold text-gray-200 focus:border-emerald-500 outline-none transition-all";

    scoreRow.appendChild(inputA);
    scoreRow.appendChild(dash);
    scoreRow.appendChild(inputB);

    const analysisInput = document.createElement("input");
    analysisInput.type = "text";
    analysisInput.id = `analysis-${match.id}`;
    analysisInput.placeholder = currentLang === "vi"
        ? "Lý do phân tích / Câu gáy hài hước..."
        : "Your logic / fun roast...";
    analysisInput.className = "w-full h-8 bg-slate-950/50 border border-slate-800/80 rounded-lg px-2.5 text-xs text-gray-300 focus:border-emerald-500 outline-none transition-all";

    const submitBtn = document.createElement("button");
    submitBtn.className = "w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs tracking-wider transition-all shadow-md shadow-emerald-950/40";
    submitBtn.textContent = currentLang === "vi" ? "Nộp Dự Đoán" : "Submit";
    submitBtn.addEventListener("click", () => {
        handleSubmissionWithEffects(
            match.id,
            inputA.value,
            inputB.value,
            analysisInput.value
        );
    });

    wrapper.appendChild(scoreRow);
    wrapper.appendChild(analysisInput);
    wrapper.appendChild(submitBtn);

    return wrapper;
}

function renderMatches(filterType = "vong-bang") {
    const container = document.getElementById("match-list-container");
    if (!container) return;

    container.innerHTML = "";

    const filtered = officialMatches.filter(m => m.type === filterType);
    const countBadge = document.getElementById("match-count");
    if (countBadge && typeof translations !== "undefined" && translations[currentLang]) {
        countBadge.innerText = `${filtered.length} ${translations[currentLang].matchUnit}`;
    }

    const processedMatches = filtered.map(match => {
        let rawDateTimeStr = `${match.date}T${match.time.split(" ")[0]}`;
        const utcMatch = match.time.match(/UTC([-+]\d+)/i);

        if (utcMatch) {
            const offset = parseInt(utcMatch[1], 10);
            const prefix = offset >= 0 ? "+" : "-";
            const absOffset = Math.abs(offset).toString().padStart(2, "0");
            rawDateTimeStr += `${prefix}${absOffset}:00`;
        } else {
            rawDateTimeStr += "Z";
        }

        const dateObj = new Date(rawDateTimeStr);

        const localDateStr = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString(currentLang === "vi" ? "vi-VN" : "en-US", {
                timeZone: "Asia/Ho_Chi_Minh",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            })
            : match.date;

        const sortableDateKey = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString("en-CA", {
                timeZone: "Asia/Ho_Chi_Minh"
            })
            : match.date;

        const localTimeStr = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            })
            : match.time;

        return {
            ...match,
            sortTimestamp: dateObj.getTime() || 0,
            sortId: parseInt(match.id, 10) || 0,
            vietnamDate: localDateStr,
            dateKey: sortableDateKey,
            vietnamTime: localTimeStr
        };
    });

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

    sortedDateKeys.forEach(dateKey => {
        const dateGroup = groupedData[dateKey];

        const dateGroupContainer = document.createElement("div");
        dateGroupContainer.className = "col-span-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-2xl mb-6 space-y-4";

        const header = document.createElement("div");
        header.className = "flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2";

        const left = document.createElement("div");
        left.className = "flex items-center gap-2";

        const title = document.createElement("span");
        title.className = "text-sm font-bold text-amber-400 tracking-wide flex items-center gap-1.5";
        title.textContent = currentLang === "vi"
            ? `📅 LỊCH THI ĐẤU: ${dateGroup.displayDate}`
            : `📅 MATCH SCHEDULE: ${dateGroup.displayDate}`;

        left.appendChild(title);

        const tz = document.createElement("span");
        tz.className = "text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md";
        tz.textContent = currentLang === "vi" ? "MÚI GIỜ GMT +7" : "TIMEZONE GMT +7";

        header.appendChild(left);
        header.appendChild(tz);

        const subGrid = document.createElement("div");
        subGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-5 pt-1";

        dateGroupContainer.appendChild(header);
        dateGroupContainer.appendChild(subGrid);
        container.appendChild(dateGroupContainer);

        dateGroup.matches.sort((a, b) => a.sortId - b.sortId);

        dateGroup.matches.forEach(match => {
            const card = document.createElement("div");
            const isFinished = !!(
                match.result &&
                match.result.home !== null &&
                match.result.away !== null
            );

            card.className = isFinished
                ? "bg-slate-950/40 border border-slate-900 rounded-2xl p-5 shadow-inner flex flex-col justify-between"
                : (match.isHot
                    ? "bg-slate-950/90 border-2 border-amber-500 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                    : "bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-slate-700/60 transition-all");

            const displayTeamA = currentLang === "vi" ? match.teamA : match.teamAEn;
            const displayTeamB = currentLang === "vi" ? match.teamB : match.teamBEn;
            const labelTran = currentLang === "vi" ? "TRẬN" : "MATCH";

            const topWrap = document.createElement("div");

            const topBar = document.createElement("div");
            topBar.className = "flex justify-between items-center text-[10px] text-gray-400 font-mono mb-3";

            const stadium = document.createElement("span");
            stadium.className = "truncate max-w-[170px]";
            stadium.textContent = `📍 ${safeText(match.stadium)}`;

            const meta = document.createElement("span");
            meta.className = match.isHot ? "text-amber-400 font-bold" : "text-emerald-400 font-bold";
            meta.textContent = `${labelTran} ${match.id} — ${safeText(match.group)}`;

            topBar.appendChild(stadium);
            topBar.appendChild(meta);

            const body = document.createElement("div");
            body.className = "flex items-center justify-between my-2 px-1";

            const teamACol = document.createElement("div");
            teamACol.className = "flex flex-col items-center text-center w-4/12 gap-1.5";
            teamACol.appendChild(createFlagNode(match.codeA));
            const teamAText = document.createElement("div");
            teamAText.className = "text-xs font-bold text-gray-200 truncate max-w-[110px]";
            teamAText.textContent = safeText(displayTeamA);
            teamACol.appendChild(teamAText);

            const centerCol = document.createElement("div");

            if (isFinished) {
                centerCol.className = "flex flex-col items-center justify-center w-4/12";

                const scoreBox = document.createElement("div");
                scoreBox.className = "flex items-center gap-3 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800 font-mono";

                const homeScore = document.createElement("span");
                homeScore.className = "text-xl font-black text-emerald-400";
                homeScore.textContent = String(match.result.home);

                const dash = document.createElement("span");
                dash.className = "text-xs text-gray-600 font-bold";
                dash.textContent = "-";

                const awayScore = document.createElement("span");
                awayScore.className = "text-xl font-black text-emerald-400";
                awayScore.textContent = String(match.result.away);

                scoreBox.appendChild(homeScore);
                scoreBox.appendChild(dash);
                scoreBox.appendChild(awayScore);

                const ft = document.createElement("span");
                ft.className = "text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans mt-1.5 font-bold tracking-wider";
                ft.textContent = "FT";

                centerCol.appendChild(scoreBox);
                centerCol.appendChild(ft);
            } else {
                centerCol.className = "text-center w-4/12 flex flex-col items-center justify-center gap-1";

                const time = document.createElement("span");
                time.className = "text-[11px] font-mono font-black bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded shadow-sm";
                time.textContent = safeText(match.vietnamTime);

                const vs = document.createElement("span");
                vs.className = "text-[10px] text-gray-600 font-bold";
                vs.textContent = "VS";

                centerCol.appendChild(time);
                centerCol.appendChild(vs);
            }

            const teamBCol = document.createElement("div");
            teamBCol.className = "flex flex-col items-center text-center w-4/12 gap-1.5";
            teamBCol.appendChild(createFlagNode(match.codeB));
            const teamBText = document.createElement("div");
            teamBText.className = "text-xs font-bold text-gray-200 truncate max-w-[110px]";
            teamBText.textContent = safeText(displayTeamB);
            teamBCol.appendChild(teamBText);

            body.appendChild(teamACol);
            body.appendChild(centerCol);
            body.appendChild(teamBCol);

            topWrap.appendChild(topBar);
            topWrap.appendChild(body);
            card.appendChild(topWrap);

            if (isFinished) {
                const bottomWrap = document.createElement("div");

                const scorersHTML = buildScorersHTML(match.result.goals || []);
                if (scorersHTML) {
                    const scorersBox = document.createElement("div");
                    scorersBox.innerHTML = scorersHTML;
                    bottomWrap.appendChild(scorersBox.firstElementChild);
                }

                const desc = document.createElement("div");
                desc.className = "mt-2.5 pt-2 border-t border-slate-900/40 text-center text-[10px] text-gray-500 italic font-medium";
                desc.textContent = currentLang === "vi"
                    ? "🏁 Trận đấu đã kết thúc trực tuyến. Bộ nhớ cược đã đóng."
                    : "🏁 Live match has finished. Prediction pool closed.";

                bottomWrap.appendChild(desc);
                card.appendChild(bottomWrap);
            } else {
                card.appendChild(createPredictionActionArea(match));
            }

            subGrid.appendChild(card);
        });
    });
}

// ==================== GROUPS ====================
function renderGroups() {
    const container = document.getElementById("groups-container");
    if (!container) return;

    container.innerHTML = "";

    for (const [groupName, teams] of Object.entries(worldCupGroups)) {
        const groupCard = document.createElement("div");
        groupCard.className = "bg-walrus-card border border-gray-800/80 rounded-xl p-3 text-xs shadow-md";

        if (typeof createGroupCardHTML === "function") {
            groupCard.innerHTML = createGroupCardHTML(groupName, teams);
        } else {
            groupCard.innerHTML = `
                <div class="font-bold text-emerald-400 mb-2">${escapeHTML(groupName)}</div>
                <div class="space-y-1">
                    ${teams.map(team => `<div>${escapeHTML(team.name || team.nameEn || "")}</div>`).join("")}
                </div>
            `;
        }

        container.appendChild(groupCard);
    }
}

// ==================== FILTER ====================
function filterMatches(type) {
    activeTabGlobal = type;

    const tabs = ["vong-bang", "vong-32", "vong-16", "tu-ket", "ban-ket", "chung-ket"];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        if (!tabBtn) return;

        tabBtn.className = t === type
            ? "px-3 py-2 rounded-lg font-bold transition bg-walrus-aqua text-walrus-dark"
            : "px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition";
    });

    renderMatches(type);
}
window.filterMatches = filterMatches;

// ==================== LEADERBOARD ====================
function renderLeaderboard() {
    const container = document.getElementById("leaderboard-container");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(mockLeaderboard)) return;

    mockLeaderboard.forEach((user, index) => {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between p-2.5 bg-gray-950/40 border border-gray-800/60 rounded-xl text-xs";

        const left = document.createElement("div");
        left.className = "flex items-center gap-2.5";

        const medal = document.createElement("span");
        medal.className = "w-6 font-bold text-gray-400 text-center";
        medal.textContent =
            index === 0 ? "🥇" :
            index === 1 ? "🥈" :
            index === 2 ? "🥉" :
            `#${index + 1}`;

        const name = document.createElement("span");
        name.className = "font-mono font-semibold text-gray-200";
        name.textContent = safeText(user.name);

        left.appendChild(medal);
        left.appendChild(name);

        const score = document.createElement("span");
        score.className = "font-bold text-walrus-aqua";
        score.textContent = `${safeText(user.score)} PTS`;

        row.appendChild(left);
        row.appendChild(score);
        container.appendChild(row);
    });
}

// ==================== STATIC UI TEXT ====================
function updateUINonDynamicText() {
    const lang = translations[currentLang];
    if (!lang) return;

    setText("btn-history-text", lang.btnHistory);

    setHTML("hero-title", lang.heroTitle);
    setText("hero-desc", lang.heroDesc);

    setHTML("section-groups-title", lang.secGroups);
    setHTML("section-matches-title", lang.secMatches);
    setHTML("section-ai-title", lang.secAi);
    setHTML("section-prizes-title", lang.secPrizes);
    setHTML("section-leaderboard-title", lang.secLeaderboard);

    setText("tab-vong-bang", lang.tabVongBang);
    setText("tab-vong-32", lang.tabVong32);
    setText("tab-vong-16", lang.tabVong16);
    setText("tab-tu-ket", lang.tabTuKet);
    setText("tab-ban-ket", lang.tabBanKet);
    setText("tab-chung-ket", lang.tabChungKet);

    if (!currentUser) {
        resetUserUI();
    }
}

// ==================== LANGUAGE ====================
function toggleLanguage() {
    currentLang = currentLang === "vi" ? "en" : "vi";

    const flag = document.getElementById("langFlag");
    const txt = document.getElementById("langText");

    if (flag && txt) {
        flag.src = currentLang === "vi"
            ? "[flagcdn.com](https://flagcdn.com/w20/gb.png)"
            : "[flagcdn.com](https://flagcdn.com/w20/vn.png)";
        txt.innerText = currentLang.toUpperCase();
    }

    updateUINonDynamicText();
    renderGroups();
    renderMatches(activeTabGlobal);
}
window.toggleLanguage = toggleLanguage;

// ==================== WALLET ====================
function toggleWallet() {
    isWalletConnected = !isWalletConnected;
    return isWalletConnected;
}
window.toggleWallet = toggleWallet;

// ==================== HISTORY / MODAL ====================
function fetchMyPredictions() {
    if (!currentUser) {
        showCyberToast(
            currentLang === "en"
                ? "Please sign in with Gmail first!"
                : "Sếp vui lòng đăng nhập Gmail trước!",
            "warning"
        );
        return;
    }

    const aiAgentText = document.getElementById("ai-roast-text");
    let cauGayCuaHaiLy = "";

    if (aiAgentText) {
        cauGayCuaHaiLy = aiAgentText.innerText
            .replace("Hải Ly Tiên Tri:", "")
            .replace("Walrus Oracle:", "")
            .trim();
    }

    if (
        !cauGayCuaHaiLy ||
        cauGayCuaHaiLy.includes("Chào sếp") ||
        cauGayCuaHaiLy.includes("Đang chờ") ||
        cauGayCuaHaiLy.includes("Welcome")
    ) {
        showCyberToast(
            currentLang === "vi"
                ? "🦫 Hải Ly báo: Bộ nhớ trống hoặc đang đồng bộ. Sếp thử cược 1 trận để kích hoạt lịch sử nhé!"
                : "No prediction history found on Walrus yet!",
            "warning"
        );
        return;
    }

    let records = [];
    let tongQuanText = "";

    const tongQuanMatch =
        cauGayCuaHaiLy.match(/\[TỔNG QUAN\]([\s\S]*)$/i) ||
        cauGayCuaHaiLy.match(/\[SUMMARY\]([\s\S]*)$/i);

    if (tongQuanMatch) {
        tongQuanText = tongQuanMatch[1].trim();
        cauGayCuaHaiLy = cauGayCuaHaiLy
            .replace(/\[TỔNG QUAN\]([\s\S]*)$/i, "")
            .replace(/\[SUMMARY\]([\s\S]*)$/i, "");
    }

    const chuoiChuanHoa = cauGayCuaHaiLy
        .replace(/\[TRẬN\]/gi, "\n[TRẬN]")
        .replace(/\[MATCH\]/gi, "\n[TRẬN]");

    const tranMatches = chuoiChuanHoa.match(/\[TRẬN\][\s\S]*?(?=\[TRẬN\]|$)/gi);

    if (tranMatches && tranMatches.length > 0) {
        tranMatches.forEach(block => {
            const title =
                (block.match(/\[TRẬN\]([\s\S]*?)(?=\[CÂU GÁY\]|\[🗣️ CÂU GÁY\]|\[ROAST\]|\[HẢI LY\]|\[🦫 HẢI LY\]|$)/i)?.[1] || "").trim();

            const cauGay =
                (block.match(/(?:\[CÂU GÁY\]|\[🗣️ CÂU GÁY\]|\[ROAST\])([\s\S]*?)(?=\[HẢI LY\]|\[🦫 HẢI LY\]|$)/i)?.[1] || "Không có").trim();

            const haiLy =
                (block.match(/(?:\[HẢI LY\]|\[🦫 HẢI LY\])([\s\S]*?)$/i)?.[1] || "").trim();

            if (!title) return;

            let cleanTitle = title;
            let predictionVerificationHTML = "";

            const idMatch = title.match(/(?:Trận\s+số\s+|Trận\s+|Match\s+)(\d+)/i);
            if (!idMatch || !idMatch[1]) return;

            const targetId = idMatch[1].trim();
            const foundMatchInfo = officialMatches.find(m => String(m.id) === targetId);
            if (!foundMatchInfo) return;

            const isFinished = foundMatchInfo.result &&
                foundMatchInfo.result.home !== null &&
                foundMatchInfo.result.away !== null;

            const teamAName = currentLang === "vi" ? foundMatchInfo.teamA : foundMatchInfo.teamAEn;
            const teamBName = currentLang === "vi" ? foundMatchInfo.teamB : foundMatchInfo.teamBEn;

            const scoreMatch =
                block.match(/(?:dự\s+đoán|tỷ\s+số|:\s*|predict)\[?(\d+)\]?\s*-\s*\[?(\d+)\]?/i) ||
                title.match(/\[?(\d+)\]?\s*-\s*\[?(\d+)\]?/);

            let predHome = 0;
            let predAway = 0;
            let hasValidPrediction = false;

            if (scoreMatch) {
                predHome = parseInt(scoreMatch[1], 10);
                predAway = parseInt(scoreMatch[2], 10);
                hasValidPrediction = true;
            }

            if (isFinished) {
                const realHome = parseInt(foundMatchInfo.result.home, 10);
                const realAway = parseInt(foundMatchInfo.result.away, 10);

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

            const displayCauGay = hasValidPrediction ? `${predHome} - ${predAway} (${cauGay})` : cauGay;

            records.push({
                title: cleanTitle,
                cauGay: displayCauGay,
                haiLy: haiLy,
                verification: predictionVerificationHTML
            });
        });
    }

    let htmlContent = `<div class="space-y-4 font-sans text-gray-300">`;

    if (records.length > 0) {
        records.forEach((item, index) => {
            const labelNhanDinh = currentLang === "vi" ? "🗣️ Dự đoán của sếp:" : "🗣️ Your Prediction:";
            const labelHaiLyPhan = currentLang === "vi" ? "HẢI LY BÌNH LUẬN GIẢI THÍCH:" : "WALRUS AGENT COMMENT:";
            const fallbackComment = currentLang === "vi"
                ? "Hải Ly đang đồng bộ dữ liệu..."
                : "Walrus is recalling transaction memory...";

            htmlContent += `
                <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all">
                    <div class="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                        <span class="bg-emerald-500/10 text-emerald-400 w-5 h-5 rounded-md flex items-center justify-center text-xs border border-emerald-500/20">${index + 1}</span>
                        ⚽ ${escapeHTML(item.title)}
                    </div>

                    <div class="space-y-2.5 pl-3 border-l-2 border-slate-700">
                        <div class="text-xs text-gray-400 leading-relaxed">
                            <span class="text-amber-500 font-semibold">${escapeHTML(labelNhanDinh)}</span>
                            <span class="bg-slate-900/30 px-2 py-0.5 rounded text-gray-200 font-mono font-bold">${escapeHTML(item.cauGay)}</span>
                        </div>

                        <div class="text-sm text-gray-200 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex gap-2 items-start">
                            <span class="text-base leading-none mt-0.5">🦫</span>
                            <div>
                                <span class="text-emerald-300 font-medium text-xs block mb-0.5">${escapeHTML(labelHaiLyPhan)}</span>
                                <span class="italic text-emerald-100/90">${escapeHTML(item.haiLy || fallbackComment)}</span>
                            </div>
                        </div>

                        ${item.verification}
                    </div>
                </div>
            `;
        });
    } else {
        let chuoiGiaMaForm = escapeHTML(cauGayCuaHaiLy)
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

    if (tongQuanText) {
        htmlContent += `
            <div class="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-4 text-sm text-gray-200">
                <div class="text-emerald-400 font-bold mb-2">${currentLang === "vi" ? "📌 TỔNG QUAN" : "📌 SUMMARY"}</div>
                <div>${escapeHTML(tongQuanText)}</div>
            </div>
        `;
    }

    htmlContent += `</div>`;

    let modal = document.getElementById("walrus-history-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "walrus-history-modal";
        modal.className = "fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 hidden";
        document.body.appendChild(modal);
    }

    const modalHeaderTitle = currentLang === "vi"
        ? "📜 BẢNG ĐỐI CHIẾU DỰ ĐOÁN & KẾT QUẢ THỰC TẾ"
        : "📜 PREDICTION VS REAL RESULT VERIFICATION";

    const modalCloseBtnText = currentLang === "vi" ? "Đóng cửa sổ" : "Close Window";

    modal.innerHTML = `
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-gray-200 font-sans animate-fade-in">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <h3 class="text-emerald-400 font-bold text-base flex items-center gap-2 tracking-wide">
                    ${escapeHTML(modalHeaderTitle)}
                </h3>
                <span class="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded font-mono border border-gray-700">WALRUS AGENT ONSCHAIN</span>
            </div>

            <div class="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                ${htmlContent}
            </div>

            <div class="mt-5 flex justify-end border-t border-gray-800/60 pt-3">
                <button id="close-history-modal-btn"
                        class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-xs transition-all shadow-md shadow-emerald-900/40 tracking-wider">
                    ${escapeHTML(modalCloseBtnText)}
                </button>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");

    const closeBtn = document.getElementById("close-history-modal-btn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add("hidden");
        };
    }
}
window.showMyPredictions = fetchMyPredictions;

// ==================== APP INIT ====================
function initApp() {
    updateUINonDynamicText();
    renderLeaderboard();
    initFirebaseAuth();
    fetchWorldCupData();
    setInterval(fetchWorldCupData, 60000);
}
window.initApp = initApp;
