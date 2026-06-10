// ui-components.js

// =========================================================
// 🎆 MÔ-ĐUN HIỆU ỨNG PHÁO HOA CANVAS
// =========================================================
const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createConfetti() {
    const colors = ['#00f2fe', '#4facfe', '#f59e0b', '#10b981', '#ef4444'];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2 + window.scrollY - 200,
            radius: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 5,
            opacity: 1,
            gravity: 0.15
        });
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.015;
        ctx.beginPath();
        ctx.arc(p.x, p.y - window.scrollY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        if (p.opacity <= 0) particles.splice(i, 1);
    }
    if (particles.length > 0) requestAnimationFrame(animateParticles);
}

// =========================================================
// 🧩 CÁC HÀM RENDER GIAO DIỆN
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

function renderGroups() {
    const container = document.getElementById('groups-container');
    if (!container || typeof worldCupGroups === 'undefined') return;
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
    if (!container || typeof officialMatches === 'undefined') return;
    container.innerHTML = '';
    const filtered = officialMatches.filter(m => m.type === filterType);
    const lang = translations[currentLang];
    if (countBadge) countBadge.innerText = `${filtered.length} ${lang.matchUnit}`;

    filtered.forEach(match => {
        const card = document.createElement('div');
        card.className = match.isHot ? "bg-walrus-card border border-amber-500 hot-match-card rounded-2xl p-6 shadow-2xl relative overflow-hidden transition" : "bg-walrus-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition hover:border-gray-700";
        
        let displayGroup = currentLang === "en" && match.groupEn ? match.groupEn : match.group;
        if (currentLang === "en" && displayGroup.includes("Bảng")) displayGroup = displayGroup.replace("Bảng", "Group");
        let displayDate = getLocalizedDate(match);
        let displayTeamA = currentLang === "en" ? (match.teamAEn || match.teamA) : match.teamA;
        let displayTeamB = currentLang === "en" ? (match.teamBEn || match.teamB) : match.teamB;
        let hotBadgeHTML = match.isHot ? `<div class="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-[9px] px-3 py-0.5 uppercase tracking-widest shadow-md z-10">🔥 HOT MATCH</div>` : '';

        card.innerHTML = `
            ${hotBadgeHTML}
            <div class="absolute top-0 right-0 bg-worldcup-gold text-walrus-dark font-bold text-[10px] px-3 py-1 uppercase tracking-wider rounded-bl-xl z-10">
                ${currentLang === "en" ? "Match" : "Trận"} ${match.id} - ${displayGroup}
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-400 mb-4 mt-1"><i class="fa-solid fa-location-dot text-red-400"></i><span class="font-semibold text-gray-300">${match.stadium}</span></div>
            <div class="flex items-center justify-between my-6 px-4">
                <div class="flex flex-col items-center gap-2 w-28 text-center">${getFlagImgHTML(match.codeA)}<span class="font-bold text-white text-sm mt-1">${displayTeamA}</span></div>
                <div class="flex flex-col items-center"><span class="text-xs text-gray-500 uppercase tracking-widest font-bold">VS</span><span class="text-[11px] bg-gray-800 text-gray-400 px-3 py-1 rounded-full mt-2 font-mono text-center">${displayDate}<br/>${match.time}</span></div>
                <div class="flex flex-col items-center gap-2 w-28 text-center">${getFlagImgHTML(match.codeB)}<span class="font-bold text-gray-400 text-sm mt-1">${displayTeamB}</span></div>
            </div>
            <div class="border-t border-gray-800/60 pt-5 mt-4 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div class="sm:col-span-1">
                        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">${lang.labelScore}</label>
                        <div class="flex items-center gap-2"><input type="number" id="scoreA-${match.id}" placeholder="0" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center font-bold text-white focus:outline-none"><span class="text-gray-600 font-bold">-</span><input type="number" id="scoreB-${match.id}" placeholder="0" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center font-bold text-white focus:outline-none"></div>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">${lang.labelAnalysis}</label>
                        <input type="text" id="analysis-${match.id}" placeholder="${lang.placeholderAnalysis}" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none">
                    </div>
                </div>
                <div class="flex justify-end pt-2">
                    <button onclick="handleSubmissionWithEffects('${match.id}')" class="gradient-btn hover:opacity-90 text-walrus-dark font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-walrus-aqua/20 flex items-center gap-2 transition">${lang.btnSubmit}</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container || typeof mockLeaderboard === 'undefined') return;
    container.innerHTML = '';
    mockLeaderboard.forEach((user, index) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2.5 bg-gray-950/40 border border-gray-800/60 rounded-xl text-xs";
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        row.innerHTML = `<div class="flex items-center gap-2.5"><span class="w-6 font-bold text-gray-400 text-center">${medal}</span><div class="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700"><span class="text-sm">🦫</span></div><span class="font-mono font-semibold text-gray-200">${user.name}</span></div><span class="font-bold text-walrus-aqua">${user.score} PTS</span>`;
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
