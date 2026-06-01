document.addEventListener("DOMContentLoaded", () => {
    loadSearchHistory();
    fetchTrendingMusic(); 
});

function loadSearchHistory() {
    const history = JSON.parse(localStorage.getItem(searchHistoryKey)) || [];
    const container = document.getElementById('searchHistory');
    if(!container) return;
    if(history.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'flex';
    
    // Icon SVG Jam elegan sebagai pengganti emot
    const clockSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px; vertical-align:middle; position:relative; top:-1px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    
    container.innerHTML = history.map(q => `<div class="history-pill" onclick="executeSearch('${q.replace(/'/g, "\\'")}')">${clockSvg}${q}</div>`).join('');
}

function saveSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem(searchHistoryKey)) || [];
    history = history.filter(q => q.toLowerCase() !== query.toLowerCase()); 
    history.unshift(query);
    if(history.length > 8) history.pop();
    localStorage.setItem(searchHistoryKey, JSON.stringify(history));
    loadSearchHistory();
}

const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

if(searchBtn) searchBtn.addEventListener('click', () => { if (searchInput.value) executeSearch(searchInput.value); });
if(searchInput) searchInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && e.target.value) { executeSearch(e.target.value); searchInput.blur(); }
});

async function executeSearch(query) {
    const sInput = document.getElementById('searchInput');
    if(sInput) sInput.value = query; 
    saveSearchHistory(query); 
    
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;
    searchResults.style.display = 'block';
    searchResults.innerHTML = '<div class="result-item" style="text-align:center;">Mencari...</div>';
    
    try {
        const response = await fetch('/api/search?q=' + encodeURIComponent(query));
        const data = await response.json();
        if(Array.isArray(data) && data.length > 0) {
            searchResults.innerHTML = data.map(item => {
                const safeTitle = encodeURIComponent(item.title);
                const safeChannel = encodeURIComponent(item.channel);
                return `
                <div class="result-item" onclick="selectSong('${item.videoId}', '${safeTitle}', '${safeChannel}', true)">
                    <div class="result-title">${item.title}</div>
                    <div class="result-channel">${item.channel}</div>
                </div>`;
            }).join('');
        } else { searchResults.innerHTML = '<div class="result-item">Tidak ditemukan.</div>'; }
    } catch (e) { searchResults.innerHTML = '<div class="result-item">Error jaringan.</div>'; }
}

function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    
    const mp = document.getElementById('miniPlayer'); if(mp) mp.classList.add('show');
    const mt = document.getElementById('miniTitle'); if(mt) mt.innerText = title;
    const ma = document.getElementById('miniArtist'); if(ma) ma.innerText = channel;
    const mTh = document.getElementById('miniThumb'); if(mTh) { mTh.src = `https://img.youtube.com/vi/${videoId}/default.jpg`; mTh.style.display = 'block'; }

    const ft = document.getElementById('fullTitle'); if(ft) ft.innerText = title;
    const fa = document.getElementById('fullArtist'); if(fa) fa.innerText = channel;
    const fTh = document.getElementById('fullThumb'); if(fTh) { fTh.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; fTh.style.display = 'block'; }
    
    const prb = document.getElementById('prevBtn'); if(prb) prb.disabled = historyIndex <= 0;
    
    checkIfLiked();
    if (player && player.loadVideoById) player.loadVideoById(videoId);
    fetchLyrics(title, channel);
}

function selectSong(videoId, title, channel, isEncoded = false) {
    const sr = document.getElementById('searchResults');
    if(sr) sr.style.display = 'none';
    
    const finalTitle = isEncoded ? decodeURIComponent(title) : title;
    const finalChannel = isEncoded ? decodeURIComponent(channel) : channel;

    if (historyIndex < playHistory.length - 1) playHistory = playHistory.slice(0, historyIndex + 1);
    playHistory.push({videoId, title: finalTitle, channel: finalChannel});
    historyIndex++;
    loadSongToPlayer(videoId, finalTitle, finalChannel);
}

const nb = document.getElementById('nextBtn');
const prb = document.getElementById('prevBtn');

if(nb) nb.addEventListener('click', playNextLogics);
if(prb) prb.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        const prevSong = playHistory[historyIndex];
        loadSongToPlayer(prevSong.videoId, prevSong.title, prevSong.channel);
    }
});

function playNextLogics() {
    if (!currentVideoId) return;
    if (historyIndex < playHistory.length - 1) {
        historyIndex++;
        const nextSong = playHistory[historyIndex];
        loadSongToPlayer(nextSong.videoId, nextSong.title, nextSong.channel);
    } else {
        fetchSimilarVibes();
    }
}

async function fetchSimilarVibes() {
    const currentTitle = playHistory[historyIndex].title;
    let currentArtist = playHistory[historyIndex].channel;
    currentArtist = currentArtist.replace(/ - Topic|Official|VEVO/gi, '').trim();

    const ft = document.getElementById('fullTitle');
    if(ft) ft.innerText = "Mencari vibes serupa...";
    
    try {
        const searchQ = `${currentArtist} mix audio -karaoke -live`;
        const res = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            const playedIds = playHistory.map(h => h.videoId);
            const filtered = data.filter(item => !playedIds.includes(item.videoId));
            const nextSong = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : data[Math.floor(Math.random() * data.length)];
            selectSong(nextSong.videoId, nextSong.title, nextSong.channel, false);
        } else { if(ft) ft.innerText = "Radio habis :("; }
    } catch (e) { if(ft) ft.innerText = "Error memuat radio"; }
}

async function fetchTrendingMusic() {
    const grid = document.getElementById('exploreGrid');
    if (!grid) return;

    try {
        const response = await fetch('/api/explore'); 
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            grid.innerHTML = data.map(song => {
                const safeTitle = encodeURIComponent(song.title);
                const safeChannel = encodeURIComponent(song.channel);
                return `
                <div onclick="selectSong('${song.videoId}', '${safeTitle}', '${safeChannel}', true)" style="min-width:140px; background:#18181b; border-radius:12px; overflow:hidden; cursor:pointer; border:1px solid #27272a;">
                    <img src="https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg" style="width:100%; aspect-ratio:1/1; object-fit:cover;">
                    <div style="padding:10px;">
                        <div style="color:#fff; font-size:13px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
                        <div style="color:#777; font-size:11px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.channel}</div>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (e) { grid.innerHTML = '<p style="color:#ef4444; font-size:13px;">Gagal memuat trending.</p>'; }
}
