// app-logic.js

// Khởi tạo các trạng thái mặc định
let currentLang = "vi";
let currentApiStatus = "welcome"; // welcome, connecting, success, fallback

const translations = {
    vi: {
        matchUnit: "trận đấu",
        labelScore: "Dự đoán tỷ số",
        labelAnalysis: "Phân tích chiến thuật",
        placeholderAnalysis: "Nhập nhận định của sếp...",
        btnSubmit: "GỬI DỰ ĐOÁN",
        btnHistory: "Lịch sử",
        heroTitle: "Dự đoán World Cup <span class='text-walrus-aqua'>2026</span>",
        heroDesc: "Hệ thống dự đoán thông minh dành riêng cho cộng đồng Smart Investor.",
        secGroups: "Phân Bảng",
        secMatches: "Danh sách trận đấu",
        secAi: "AI Advisor",
        prize1: "Giải nhất",
        prize1Val: "1000 SUI",
        prize2: "Giải nhì",
        prize2Val: "500 SUI",
        secLeaderboard: "Bảng vàng",
        tabVongBang: "Vòng bảng",
        tabVong32: "Vòng 1/32",
        tabVong16: "Vòng 1/16",
        tabTuKet: "Tứ kết",
        tabBanKet: "Bán kết",
        tabChungKet: "Chung kết",
        aiReading: "Đang phân tích dữ liệu...",
        aiWelcome: "Chào sếp! Sẵn sàng cho mùa giải chưa?",
        aiConnecting: "Đang kết nối với Node dữ liệu...",
        aiSuccess: "Dữ liệu đã sẵn sàng, mời sếp nhập dự đoán.",
        aiFallback: "Kết nối chậm, AI đang ở chế độ dự phòng."
    },
    en: {
        matchUnit: "matches",
        labelScore: "Score Prediction",
        labelAnalysis: "Tactical Analysis",
        placeholderAnalysis: "Enter your insights...",
        btnSubmit: "SUBMIT PREDICTION",
        btnHistory: "History",
        heroTitle: "World Cup <span class='text-walrus-aqua'>2026</span> Predictions",
        heroDesc: "Smart prediction system powered for Smart Investor Community.",
        secGroups: "Groups",
        secMatches: "Match Schedule",
        secAi: "AI Advisor",
        prize1: "First Prize",
        prize1Val: "1000 SUI",
        prize2: "Second Prize",
        prize2Val: "500 SUI",
        secLeaderboard: "Leaderboard",
        tabVongBang: "Group Stage",
        tabVong32: "Round of 32",
        tabVong16: "Round of 16",
        tabTuKet: "Quarter-finals",
        tabBanKet: "Semi-finals",
        tabChungKet: "Finals",
        aiReading: "Analyzing data...",
        aiWelcome: "Hi boss! Ready for the season?",
        aiConnecting: "Connecting to Data Node...",
        aiSuccess: "Data ready, please enter your prediction.",
        aiFallback: "Connection slow, using fallback mode."
    }
};

function switchLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('bg-walrus-aqua', btn.dataset.lang === lang);
        btn.classList.toggle('text-walrus-dark', btn.dataset.lang === lang);
    });
    // Gọi các hàm render lại giao diện
    renderGroups();
    renderMatches();
    updateUINonDynamicText();
}

function handleTabChange(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-walrus-aqua', 'text-walrus-aqua');
        btn.classList.add('border-transparent', 'text-gray-400');
    });
    event.currentTarget.classList.add('border-walrus-aqua', 'text-walrus-aqua');
    event.currentTarget.classList.remove('border-transparent', 'text-gray-400');
}

function handleSubmissionWithEffects(matchId) {
    const scoreA = document.getElementById(`scoreA-${matchId}`).value;
    const scoreB = document.getElementById(`scoreB-${matchId}`).value;
    const analysis = document.getElementById(`analysis-${matchId}`).value;

    if (!scoreA || !scoreB) {
        alert("Sếp vui lòng nhập đủ tỷ số!");
        return;
    }

    // Hiệu ứng loading giả lập
    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "Đang gửi...";
    btn.disabled = true;

    setTimeout(() => {
        console.log(`Đã gửi dự đoán trận ${matchId}: ${scoreA}-${scoreB} | Phân tích: ${analysis}`);
        btn.innerText = "Đã gửi!";
        btn.classList.add('bg-green-600');
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
            btn.classList.remove('bg-green-600');
        }, 2000);
    }, 1000);
}

// Khởi chạy khi tài liệu sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Render ban đầu
    renderGroups();
    renderMatches();
    renderLeaderboard();
    updateUINonDynamicText();
});
