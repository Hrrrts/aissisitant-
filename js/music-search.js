document.addEventListener("DOMContentLoaded", () => {
    loadSearchHistory();
});

function loadSearchHistory() {
    const history = JSON.parse(localStorage.getItem(searchHistoryKey)) || [];
    const container = document.getElementById('searchHistory');
    if(!container) return;
    if(history.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = history.map(q => `<div class="history-pill" onclick="executeSearch('${q.replace(/'/g, "\\'")}')">🕒 ${q}</div>`).join('');
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

if(searchBtn) {
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value;
        if (!query) return;
        executeSearch(query);
    });
}

if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            const query = e.target.value;
            if(query) executeSearch(query);
            searchInput.blur(); 
        }
    });
}

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
            searchResults.innerHTML = data.map(item => `
                <div class="result-item" onclick="selectSong('${item.videoId}', '${item.title.replace(/'/g, "\\'")}', '${item.channel.replace(/'/g, "\\'")}')">
                    <div class="result-title">${item.title}</div>
                    <div class="result-channel">${item.channel}</div>
                </div>
            `).join('');
        } else { searchResults.innerHTML = '<div class="result-item">Tidak ditemukan.</div>'; }
    } catch (e) { searchResults.innerHTML = '<div class="result-item">Error jaringan.</div>'; }
}

function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    
    const mp = document.getElementById('miniPlayer');
    if(mp) mp.classList.add('show');
    const mt = document.getElementById('miniTitle');
    if(mt) mt.innerText = title;
    const ma = document.getElementById('miniArtist');
    if(ma) ma.innerText = channel;
    const mTh = document.getElementById('miniThumb');
    if(mTh) { mTh.src = `https://img.youtube.com/vi/${videoId}/default.jpg`; mTh.style.display = 'block'; }

    const ft = document.getElementById('fullTitle');
    if(ft) ft.innerText = title;
    const fa = document.getElementById('fullArtist');
    if(fa) fa.innerText = channel;
    const fTh = document.getElementById('fullThumb');
    if(fTh) { fTh.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; fTh.style.display = 'block'; }
    
    const prb = document.getElementById('prevBtn');
    if(prb) prb.disabled = historyIndex <= 0;
    
    checkIfLiked();

    if (player && player.loadVideoById) player.loadVideoById(videoId);
    fetchLyrics(title, channel);
}

function selectSong(videoId, title, channel) {
    const sr = document.getElementById('searchResults');
    if(sr) sr.style.display = 'none';
    if (historyIndex < playHistory.length - 1) playHistory = playHistory.slice(0, historyIndex + 1);
    playHistory.push({videoId, title, channel});
    historyIndex++;
    loadSongToPlayer(videoId, title, channel);
}

const nb = document.getElementById('nextBtn');
const prb = document.getElementById('prevBtn');

if(nb) nb.addEventListener('click', playNextLogics);
if(prb) {
    prb.addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            const prevSong = playHistory[historyIndex];
            loadSongToPlayer(prevSong.videoId, prevSong.title, prevSong.channel);
        }
    });
}

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
    const currentArtist = playHistory[historyIndex].channel;
    const ft = document.getElementById('fullTitle');
    if(ft) ft.innerText = "Mencari vibes baru...";
    
    try {
        const searchQ = currentTitle + " " + currentArtist + " recommended official audio -cover -live -karaoke";
        const res = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            const filtered = data.filter(item => {
                const isSameVideo = item.videoId === currentVideoId;
                const isSameArtist = item.channel.toLowerCase().includes(currentArtist.toLowerCase());
                return !isSameVideo && !isSameArtist;
            });

            const nextSong = filtered.length > 0 
                ? filtered[Math.floor(Math.random() * filtered.length)] 
                : data[Math.floor(Math.random() * data.length)];
                
            selectSong(nextSong.videoId, nextSong.title, nextSong.channel);
        }
    } catch (e) {}
}
