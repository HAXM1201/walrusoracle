<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Walrus Cup Oracle - World Cup 2026 Predictions</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] }, colors: { walrus: { dark: "#0b1528", card: "#162238", aqua: "#00f2fe", lightAqua: "#4facfe" }, worldcup: { gold: "#f59e0b", grass: "#10b981" } }, animation: { 'border-glow': 'borderGlow 4s linear infinite' }, keyframes: { borderGlow: { '0%, 100%': { 'border-color': 'rgba(245, 158, 11, 0.4)' }, '50%': { 'border-color': 'rgba(0, 242, 254, 1)' } } } } } }
    </script>
    <style>
        .gradient-text { background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gradient-btn { background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); }
        .hero-bg { background: linear-gradient(to bottom, rgba(11, 21, 40, 0.85), rgba(11, 21, 40, 1)), url('wc1.png'); background-size: cover; background-position: center; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0b1528; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #162238; border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 10px; }
        .hot-match-card { animation: border-glow 4s linear infinite; border-width: 2px !important; }
    </style>
</head>
<body class="bg-walrus-dark text-gray-100 min-h-screen font-sans antialiased relative overflow-x-hidden">

    <canvas id="effect-canvas" class="absolute top-0 left-0 w-full h-full pointer-events-none z-50"></canvas>

    <header class="border-b border-gray-800 bg-walrus-dark/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-walrus-dark shadow-lg shadow-walrus-aqua/20"><i class="fa-solid fa-trophy text-xl"></i></div>
                <div>
                    <span class="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">WALRUS<span class="gradient-text">CUP</span>ORACLE</span>
                    <span class="text-[10px] text-worldcup-gold block font-semibold tracking-wider uppercase">World Cup 2026 Edition</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="toggleLanguage()" id="langBtn" class="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 transition">
                    <img id="langFlag" src="https://flagcdn.com/w20/gb.png" class="w-5 h-3.5 object-cover rounded-sm" alt="Lang">
                    <span id="langText">EN</span>
                </button>
                <button id="gmailBtn" onclick="toggleGmail()" class="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 transition"><i class="fa-brands fa-google text-red-500"></i> <span id="gmailText">Đăng nhập Gmail</span></button>
                <button id="walletBtn" onclick="toggleWallet()" class="flex items-center gap-2 px-4 py-2 bg-walrus-card hover:bg-opacity-80 text-walrus-aqua text-sm font-semibold rounded-xl border border-walrus-aqua/30 transition"><i class="fa-solid fa-wallet"></i> <span id="walletText">Kết nối ví Slush</span></button>
                <button onclick="fetchMyPredictions()" id="btn-history" class="bg-gray-800 text-walrus-aqua px-4 py-2.5 rounded-xl border border-walrus-aqua/30 text-sm font-bold transition hover:bg-walrus-aqua hover:text-walrus-dark"><i class="fa-solid fa-clock-rotate-left"></i> <span id="btn-history-text">Lịch sử dự đoán</span></button> 
            </div>
        </div>
    </header>

    <section class="hero-bg relative py-16 sm:py-24 border-b border-gray-800/50 overflow-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h1 id="hero-title" class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Gáy Khét World Cup</h1>
            <p id="hero-desc" class="text-gray-300 mt-6 text-sm sm:text-base leading-relaxed">Dự đoán kết quả từ 104 trận đấu chính thức của FIFA World Cup 2026.</p>
        </div>
    </section>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <section class="space-y-6">
            <h2 id="section-groups-title" class="text-2xl font-bold text-white flex items-center gap-2">Cục Diện 48 Đội</h2>
            <div id="groups-container" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
        </section>

        <div id="voting-section" class="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-24">
            <div class="lg:col-span-2 space-y-6">
                <div class="flex flex-col gap-4 border-b border-gray-800 pb-4">
                    <h2 id="section-matches-title" class="text-2xl font-bold text-white">Lịch Trình Thi Đấu</h2>
                    <div class="flex flex-wrap bg-gray-900 p-1.5 rounded-xl border border-gray-800 text-xs gap-1">
                        <button onclick="filterMatches('vong-bang')" id="tab-vong-bang" class="px-3 py-2 rounded-lg font-bold bg-walrus-aqua text-walrus-dark">Vòng Bảng</button>
                        <button onclick="filterMatches('vong-32')" id="tab-vong-32" class="px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white">Vòng 32 Đội</button>
                        <button onclick="filterMatches('vong-16')" id="tab-vong-16" class="px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white">Vòng 16 Đội</button>
                        <button onclick="filterMatches('tu-ket')" id="tab-tu-ket" class="px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white">Tứ Kết</button>
                        <button onclick="filterMatches('ban-ket')" id="tab-ban-ket" class="px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white">Bán Kết</button>
                        <button onclick="filterMatches('chung-ket')" id="tab-chung-ket" class="px-3 py-2 rounded-lg font-bold text-gray-400 hover:text-white">Chung Kết</button>
                    </div>
                </div>
                <div id="match-list-container" class="space-y-6 max-h-[850px] overflow-y-auto pr-3 custom-scrollbar"></div>
            </div>
            <div class="space-y-6">
                <h2 id="section-ai-title" class="text-2xl font-bold text-white">Walrus Memory Agent</h2>
                <div class="bg-walrus-card p-5 rounded-2xl border border-walrus-aqua/20"><p id="ai-roast-text" class="text-xs italic text-gray-300"></p></div>
                <h2 id="section-leaderboard-title" class="text-2xl font-bold text-white">Bảng Vàng</h2>
                <div id="leaderboard-container" class="bg-walrus-card border border-gray-800 rounded-2xl p-4 space-y-3"></div>
            </div>
        </div>
    </main>

    <script src="data.js"></script>
    <script src="ui-components.js"></script>
    <script type="module" src="app-logic.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            if(typeof initApp === 'function') initApp();
        });
    </script>
</body>
</html>
