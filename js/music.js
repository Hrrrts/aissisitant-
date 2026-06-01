let player;
let currentVideoId = '';
let isPlaying = false;
let progressInterval;
let playHistory = [];
let historyIndex = -1;
let parsedLyrics = [];
let currentLyricIndex = -1;
let allPlaylists = {}; 

const playIconSvg = '▶';
const pauseIconSvg = '⏸';

document.addEventListener("DOMContentLoaded", () => {
    loadPlaylistsToHome();
    loadSearchHistory();
});

// LOGIKA RIWAYAT PENCARIAN (LOCALSTORAGE)
const searchHistoryKey = 'ais_search_history';

function loadSearchHistory() {
    const history = JSON.parse(localStorage.getItem(searchHistoryKey)) || [];
    const container = document.getElementById('searchHistory');
    if(history.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = history.map(q => `<div class="history-pill" onclick="executeSearch('${q.replace(/'/g, "\\'")}')">🕒 ${q}</div>`).join('');
}

function saveSearchHistory(query) {
    let history = JSON.parse(localStorage.getItem(searchHistoryKey)) || [];
    // Hapus duplikat kalau udah ada
    history = history.filter(q => q.toLowerCase() !== query.toLowerCase()); 
    history.unshift(query); // Masukin di paling depan
    if(history.length > 8) history.pop(); // Maksimal nyimpen 8 aja biar gak kepanjangan
    localStorage.setItem(searchHistoryKey, JSON.stringify(history));
    loadSearchHistory();
}

function openFullPlayer() {
    if(!currentVideoId) return;
    document.getElementById('fullPlayer').classList.add('open');
    history.pushState({ modal: 'fullPlayer' }, ''); 
}

function closeFullPlayer() {
    document.getElementById('fullPlayer').classList.remove('open');
}

window.addEventListener('popstate', (e) => {
    const fp = document.getElementById('fullPlayer');
    if (fp.classList.contains('open')) {
        fp.classList.remove('open');
    }
});

async function loadPlaylistsToHome() {
    const grid = document.getElementById('playlistGrid');
    try {
        const response = await fetch('/api/playlist');
        allPlaylists = await response.json();
        
        if (Object.keys(allPlaylists).length === 0) {
            grid.innerHTML = '<p style="color:#888; font-size:13px; grid-column: span 2;">Belum ada playlist.</p>';
            return;
        }

        let html = '';
        for (let name in allPlaylists) {
            const songs = allPlaylists[name];
            const coverImage = songs.length > 0 ? `https://img.youtube.com/vi/${songs[0].videoId}/hqdefault.jpg` : '';
            
            html += `
                <div class="playlist-card" style="background-image: url('${coverImage}');" onclick='playFromFolder("${name}")'>
                    <div class="playlist-overlay"></div>
                    <div class="playlist-info">
                        <div class="pl-card-title">${name}</div>
                        <div class="pl-card-count">${songs.length} Lagu</div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;
        checkIfLiked();
    } catch (error) {
        grid.innerHTML = '<p style="color:#ff4444; font-size:13px;">Gagal memuat database.</p>';
    }
}

function playFromFolder(playlistName) {
    const songs = allPlaylists[playlistName];
    if(!songs || songs.length === 0) return;
    selectSong(songs[0].videoId, songs[0].title, songs[0].channel);
}

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

function onYouTubeIframeAPIReady() {
    player = new YT.Player('playerContainer', {
        height: '0', width: '0', videoId: '',
        playerVars: { 'autoplay': 1, 'controls': 0, 'playsinline': 1 },
        events: { 'onStateChange': onPlayerStateChange }
    });
}

function formatTime(seconds) {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
}

function updatePlayPauseIcons(playing) {
    document.getElementById('playBtn').innerHTML = playing ? pauseIconSvg : playIconSvg;
    document.getElementById('miniPlayBtn').innerHTML = playing ? pauseIconSvg : playIconSvg;
}

function onPlayerStateChange(event) {
    const progressBar = document.getElementById('progressBar');
    if (event.data == YT.PlayerState.ENDED) { playNextLogics(); return; }
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseIcons(true);
        progressBar.max = player.getDuration();
        document.getElementById('durationTime').innerText = formatTime(player.getDuration());
        progressInterval = setInterval(() => {
            const current = player.getCurrentTime();
            progressBar.value = current;
            document.getElementById('currentTime').innerText = formatTime(current);
            syncLyrics(current);
        }, 500);
    } else {
        isPlaying = false;
        updatePlayPauseIcons(false);
        clearInterval(progressInterval);
    }
}

document.getElementById('progressBar').addEventListener('input', (e) => {
    if(player && player.seekTo) {
        player.seekTo(e.target.value, true);
        document.getElementById('currentTime').innerText = formatTime(e.target.value);
        syncLyrics(e.target.value);
    }
});

// EKSEKUSI PENCARIAN
document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    executeSearch(query);
});

async function executeSearch(query) {
    document.getElementById('searchInput').value = query; // Update input box if clicked from pill
    saveSearchHistory(query); // Simpan ke histori
    
    const searchResults = document.getElementById('searchResults');
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

function togglePlayPause() {
    if (!currentVideoId || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
}
document.getElementById('playBtn').addEventListener('click', togglePlayPause);
document.getElementById('miniPlayBtn').addEventListener('click', togglePlayPause);
document.getElementById('nextBtn').addEventListener('click', playNextLogics);
document.getElementById('prevBtn').addEventListener('click', () => {
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
        fetchSimilarVibes(); // Panggil algoritma cerdas
    }
}

// ALGORITMA AUTO-PLAY CERDAS (NYARI ARTIS BARU)
async function fetchSimilarVibes() {
    const currentTitle = playHistory[historyIndex].title;
    const currentArtist = playHistory[historyIndex].channel;
    document.getElementById('fullTitle').innerText = "Mencari vibes baru...";
    
    try {
        // Trik: Tambahin kata kunci recommended biar dapet playlist YT
        const searchQ = currentTitle + " recommended indie music audio";
        const res = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            // FILTER: Buang semua lagu yang artisnya SAMA dengan yang lagi diputar
            const filtered = data.filter(item => {
                const isSameVideo = item.videoId === currentVideoId;
                const isSameArtist = item.channel.toLowerCase().includes(currentArtist.toLowerCase());
                return !isSameVideo && !isSameArtist;
            });

            // Kalau ada hasil artis lain, ambil acak. Kalau mentok habis, ambil random biasa.
            const nextSong = filtered.length > 0 
                ? filtered[Math.floor(Math.random() * filtered.length)] 
                : data[Math.floor(Math.random() * data.length)];
                
            selectSong(nextSong.videoId, nextSong.title, nextSong.channel);
        }
    } catch (e) {}
}

async function fetchLyrics(rawTitle, artist) {
    const lyricsBox = document.getElementById('lyricsContainer');
    lyricsBox.style.display = 'block';
    lyricsBox.innerHTML = '<div style="margin-top:20%;"><i style="color:#777;">Mencari lirik...</i></div>';
    parsedLyrics = []; currentLyricIndex = -1;
    let cleanTitle = rawTitle.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    let searchQuery = cleanTitle.includes('-') ? (cleanTitle.split('-')[1].trim() + ' ' + cleanTitle.split('-')[0].trim()) : (cleanTitle + ' ' + artist);

    try {
        const res = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(searchQuery));
        const data = await res.json();
        if (data && data.length > 0) {
            if (data[0].syncedLyrics) parseSyncedLyrics(data[0].syncedLyrics);
            else if (data[0].plainLyrics) lyricsBox.innerHTML = data[0].plainLyrics.replace(/\n/g, '<br><br>');
            else lyricsBox.innerHTML = '<div style="margin-top:20%;"><i style="color:#777;">Lirik tidak ditemukan.</i></div>';
        } else lyricsBox.innerHTML = '<div style="margin-top:20%;"><i style="color:#777;">Maaf, lirik tidak ditemukan.</i></div>';
    } catch (e) { lyricsBox.innerHTML = '<div style="margin-top:20%;"><i style="color:#777;">Error lirik.</i></div>'; }
}

function parseSyncedLyrics(lrc) {
    const lines = lrc.split('\n');
    const regex = /\[(\d{2}):(\d{2}\.\d{2})\](.*)/;
    let html = '<div style="height: 120px;"></div>';
    lines.forEach((line, index) => {
        const match = line.match(regex);
        if (match) {
            const min = parseInt(match[1]); const sec = parseFloat(match[2]);
            const time = (min * 60) + sec;
            const text = match[3].trim() || '🎵';
            parsedLyrics.push({ time, text, id: 'lyric-' + index });
            html += `<div id="lyric-${index}" class="lyric-line">${text}</div>`;
        }
    });
    html += '<div style="height: 150px;"></div>';
    document.getElementById('lyricsContainer').innerHTML = html;
}

function syncLyrics(currentTime) {
    if (parsedLyrics.length === 0) return;
    let activeIndex = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
        if (currentTime >= parsedLyrics[i].time) activeIndex = i;
        else break;
    }
    if (activeIndex !== -1 && activeIndex !== currentLyricIndex) {
        if (currentLyricIndex !== -1) {
            const oldEl = document.getElementById(parsedLyrics[currentLyricIndex].id);
            if (oldEl) oldEl.classList.remove('lyric-active');
        }
        currentLyricIndex = activeIndex;
        const newEl = document.getElementById(parsedLyrics[activeIndex].id);
        if (newEl) {
            newEl.classList.add('lyric-active');
            document.getElementById('lyricsContainer').scrollTo({ top: newEl.offsetTop - 150, behavior: 'smooth' });
        }
    }
}

function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    
    document.getElementById('miniPlayer').classList.add('show');
    document.getElementById('miniTitle').innerText = title;
    document.getElementById('miniArtist').innerText = channel;
    document.getElementById('miniThumb').src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    document.getElementById('miniThumb').style.display = 'block';

    document.getElementById('fullTitle').innerText = title;
    document.getElementById('fullArtist').innerText = channel;
    document.getElementById('fullThumb').src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    document.getElementById('fullThumb').style.display = 'block';
    
    document.getElementById('prevBtn').disabled = historyIndex <= 0;
    checkIfLiked();

    if (player && player.loadVideoById) player.loadVideoById(videoId);
    fetchLyrics(title, channel);
}

function selectSong(videoId, title, channel) {
    document.getElementById('searchResults').style.display = 'none';
    if (historyIndex < playHistory.length - 1) playHistory = playHistory.slice(0, historyIndex + 1);
    playHistory.push({videoId, title, channel});
    historyIndex++;
    loadSongToPlayer(videoId, title, channel);
}

function checkIfLiked() {
    if (!currentVideoId) return;
    const likedSongs = allPlaylists["Lagu Disukai"] || [];
    const isLiked = likedSongs.find(s => s.videoId === currentVideoId);
    
    const likeBtn = document.getElementById('likeBtn');
    if (isLiked) {
        likeBtn.innerText = '♥';
        likeBtn.style.color = '#1db954';
    } else {
        likeBtn.innerText = '♡';
        likeBtn.style.color = '#fff';
    }
}

async function toggleLike() {
    if (!currentVideoId) return;
    const likedSongs = allPlaylists["Lagu Disukai"] || [];
    const isLiked = likedSongs.find(s => s.videoId === currentVideoId);
    
    const method = isLiked ? 'DELETE' : 'POST';
    const bodyData = {
        playlistName: "Lagu Disukai",
        videoId: currentVideoId,
        title: document.getElementById('fullTitle').innerText,
        channel: document.getElementById('fullArtist').innerText
    };

    try {
        await fetch('/api/playlist', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        await loadPlaylistsToHome(); 
    } catch (e) {
        alert("Gagal sinkron sama database");
    }
}

async function addToPlaylist() {
    if (!currentVideoId) return;
    const playlistName = prompt("Simpan ke playlist mana?", "Favorit");
    if (!playlistName) return;

    try {
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistName: playlistName,
                videoId: currentVideoId,
                title: document.getElementById('fullTitle').innerText,
                channel: document.getElementById('fullArtist').innerText
            })
        });
        const data = await response.json();
        if (data.success) {
            loadPlaylistsToHome(); 
        } else { alert(data.error); }
    } catch (error) { alert("Error database."); }
}

// === LOGIKA JENDELA MODAL PLAYLIST ===
function addToPlaylist() {
    if (!currentVideoId) return;
    const modal = document.getElementById('saveModal');
    const listContainer = document.getElementById('savePlaylistList');
    
    // Tampilkan daftar playlist yang ada sebagai tombol
    listContainer.innerHTML = '';
    for (let name in allPlaylists) {
        if (name === "Lagu Disukai") continue; // Abaikan folder Love
        listContainer.innerHTML += `
            <button onclick="saveToExisting('${name.replace(/'/g, "\\'")}')" style="background:#27272a; color:#fff; border:none; padding:12px; border-radius:10px; text-align:left; font-family:inherit; font-weight:600; cursor:pointer;">
                + ${name}
            </button>
        `;
    }
    
    if(listContainer.innerHTML === '') {
        listContainer.innerHTML = '<div style="color:#555; font-size:13px;">Belum ada playlist selain Lagu Disukai.</div>';
    }
    
    document.getElementById('newPlaylistInput').value = '';
    modal.style.display = 'flex';
}

async function saveToExisting(playlistName) {
    document.getElementById('saveModal').style.display = 'none';
    await executeSaveToDB(playlistName);
}

async function saveToNewPlaylist() {
    const input = document.getElementById('newPlaylistInput').value;
    if (!input.trim()) return alert("Nama playlist nggak boleh kosong!");
    document.getElementById('saveModal').style.display = 'none';
    await executeSaveToDB(input.trim());
}

async function executeSaveToDB(playlistName) {
    try {
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistName: playlistName,
                videoId: currentVideoId,
                title: document.getElementById('fullTitle').innerText,
                channel: document.getElementById('fullArtist').innerText
            })
        });
        const data = await response.json();
        if (data.success) {
            alert(`Lagu ditambahkan ke ${playlistName}!`);
            loadPlaylistsToHome(); // Refresh otomatis
        } else { alert(data.error); }
    } catch (error) { alert("Error database."); }
}

// Override fungsi lama yang pakai prompt
window.addToPlaylist = addToPlaylist;
