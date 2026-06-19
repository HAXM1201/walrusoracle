// ==================== ui-components.js ====================

const canvas = document.getElementById('effect-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
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
    if (!ctx) return;
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

function createGroupCardHTML(groupName, teams) {
    let dynamicGroupName = currentLang === "en" ? groupName.replace("Bảng", "Group") : groupName;
    let teamsHTML = `<h3 class="font-bold text-walrus-aqua border-b border-gray-700/50 pb-1.5 mb-2">${dynamicGroupName}</h3><ul class="space-y-1.5">`;
    teams.forEach(team => {
        let displayName = currentLang === "en" ? team.nameEn : team.name;
        teamsHTML += `<li class="flex items-center gap-2 text-gray-300 font-medium">
            <img src="https://flagcdn.com/w40/${team.code}.png" onerror="this.onerror=null; this.src='https://placehold.co/24x16/0b1528/00f2fe?text=${team.code.toUpperCase()}';" class="w-5 h-3.5 object-cover rounded-sm" /> 
            ${displayName}
        </li>`;
    });
    return teamsHTML + `</ul>`;
}

function createMatchCardHTML(match) {
    const lang = translations[currentLang];
    let displayGroup = currentLang === "en" && match.groupEn ? match.groupEn : match.group;
    if (currentLang === "en" && displayGroup.includes("Bảng")) { 
        displayGroup = displayGroup.replace("Bảng", "Group");
    }
    
    let displayDate = getLocalizedDate(match);
    let displayTeamA = currentLang === "en" ? (match.teamAEn || match.teamA) : match.teamA;
    let displayTeamB = currentLang === "en" ? (match.teamBEn || match.teamB) : match.teamB;
    let hotBadgeHTML = match.isHot 
        ? `<div class="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold text-[9px] px-3 py-0.5 uppercase tracking-widest shadow-md z-10">🔥 HOT MATCH</div>` 
        : '';
    
    let actionAreaHTML = '';

    // GIAO DIỆN KHI TRẬN ĐẤU ĐÃ KẾT THÚC (HIỂN THỊ TỶ SỐ + TÊN NGƯỜI GHI BÀN)
    if (match.result && match.result.home !== undefined && match.result.home !== null) {
        const res = match.result;
        let goalsHTML = '';
        
        // Tạo danh sách diễn biến bàn thắng nếu có cầu thủ ghi bàn
        if (res.goals && res.goals.length > 0) {
            goalsHTML = `<div class="mt-4 border-t border-gray-800/40 pt-3 space-y-1.5 max-w-md mx-auto">`;
            res.goals.forEach(g => {
                const isHome = g.team === 'home';
                const alignmentClass = isHome ? 'text-left' : 'text-right';
                const iconHTML = `<i class="fa-solid fa-soccer-ball text-emerald-400 mx-1.5 text-xs animate-spin-slow"></i>`;
                
                goalsHTML += `
                    <div class="text-xs text-gray-300 font-medium ${alignmentClass}">
                        ${isHome ? iconHTML + `<strong>${g.scorer}</strong> (${g.minute}')` : `<strong>${g.scorer}</strong> (${g.minute}')` + iconHTML}
                    </div>`;
            });
            goalsHTML += `</div>`;
        }

        actionAreaHTML = `
            <div class="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-5 py-1.5 rounded-bl-2xl">${currentLang === "en" ? "FINISHED" : "KẾT THÚC"}</div>
            <div class="text-center border-t border-gray-800/60 pt-4 mt-4">
                <div class="text-6xl font-black font-mono tracking-tighter text-emerald-400 mb-1">${res.home} - ${res.away}</div>
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">${lang.resultStr || 'Official Result'}</div>
            </div>
            ${goalsHTML}
        `;
    } else {
        // Luồng hiển thị ô cược nhập điểm cho trận đấu chuẩn bị diễn ra
        actionAreaHTML = `
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

    return `
        <div class="relative w-full h-full">
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
            ${actionAreaHTML}
        </div>
    `;
}

window.createConfetti = createConfetti;
window.animateParticles = animateParticles;
window.createGroupCardHTML = createGroupCardHTML;
window.createMatchCardHTML = createMatchCardHTML;
