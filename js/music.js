let player;
let currentVideoId = '';
let isPlaying = false;
let progressInterval;
let playHistory = [];
let historyIndex = -1;
let parsedLyrics = [];
let currentLyricIndex = -1;

const playIconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
const pauseIconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

// INISIALISASI HALAMAN
document.addEventListener("DOMContentLoaded", () => {
    loadPlaylistsToHome();
});

// MEMUAT PLAYLIST KE BERANDA (LAYAR UTAMA)
async function loadPlaylistsToHome() {
    const grid = document.getElementById('playlistGrid');
    try {
        const response = await fetch('/api/playlist');
        const playlists = await response.json();
        
        if (Object.keys(playlists).length === 0) {
            grid.innerHTML = '<p style="color:#888; font-size:13px; grid-column: span 2;">Belum ada playlist. Cari lagu dan tambahkan!</p>';
            return;
        }

        let html = '';
        for (let name in playlists) {
            html += `
                <div class="playlist-card" onclick='playFromFolder(${JSON.stringify(playlists[name]).replace(/'/g, "&#39;")})'>
                    <div class="pl-card-title">${name}</div>
                    <div class="pl-card-count">${playlists[name].length} Lagu ▶</div>
                </div>
            `;
        }
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML = '<p style="color:#ff4444; font-size:13px; grid-column: span 2;">Gagal memuat database.</p>';
    }
}

// MAIN DARI FOLDER PLAYLIST
function playFromFolder(songs) {
    if(!songs || songs.length === 0) return;
    // Langsung putar lagu pertama dari playlist itu
    selectSong(songs[0].videoId, songs[0].title, songs[0].channel);
}

// LOGIKA YOUTUBE & PEMUTAR
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
    document.getElementById('miniPlayBtn').innerHTML = playing ? '⏸' : '▶';
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

// PENCARIAN
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
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
});

// KONTROL PLAY & NEXT
function togglePlayPause() {
    if (!currentVideoId || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
}
document.getElementById('playBtn').addEventListener('click', togglePlayPause);
document.getElementById('miniPlayBtn').addEventListener('click', togglePlayPause);

document.getElementById('nextBtn').addEventListener('click', playNextLogics);
document.getElementById('miniNextBtn').addEventListener('click', playNextLogics);
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
        // Cari vibes serupa
        fetchSimilarVibes();
    }
}

async function fetchSimilarVibes() {
    const currentTitle = playHistory[historyIndex].title;
    const currentArtist = playHistory[historyIndex].channel;
    document.getElementById('fullTitle').innerText = "Mencari otomatis...";
    
    try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(currentTitle + " " + currentArtist + " mix audio"));
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1) {
            const filtered = data.filter(item => item.videoId !== currentVideoId);
            const nextSong = filtered[Math.floor(Math.random() * filtered.length)] || data[0];
            selectSong(nextSong.videoId, nextSong.title, nextSong.channel);
        }
    } catch (e) {}
}

// LOGIKA LIRIK
async function fetchLyrics(rawTitle, artist) {
    const lyricsBox = document.getElementById('lyricsContainer');
    lyricsBox.style.display = 'block';
    lyricsBox.innerHTML = '<div style="margin-top:40%;"><i style="color:#777;">Mencari lirik...</i></div>';
    parsedLyrics = []; currentLyricIndex = -1;

    let cleanTitle = rawTitle.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    let searchQuery = cleanTitle.includes('-') ? (cleanTitle.split('-')[1].trim() + ' ' + cleanTitle.split('-')[0].trim()) : (cleanTitle + ' ' + artist);

    try {
        const res = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(searchQuery));
        const data = await res.json();
        if (data && data.length > 0) {
            if (data[0].syncedLyrics) parseSyncedLyrics(data[0].syncedLyrics);
            else if (data[0].plainLyrics) lyricsBox.innerHTML = data[0].plainLyrics.replace(/\n/g, '<br><br>');
            else lyricsBox.innerHTML = '<div style="margin-top:40%;"><i style="color:#777;">Lirik tidak ditemukan.</i></div>';
        } else lyricsBox.innerHTML = '<div style="margin-top:40%;"><i style="color:#777;">Maaf, lirik tidak ditemukan.</i></div>';
    } catch (e) { lyricsBox.innerHTML = '<div style="margin-top:40%;"><i style="color:#777;">Error lirik.</i></div>'; }
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

// UPDATE TAMPILAN
function toggleFullPlayer() {
    if(!currentVideoId) return;
    document.getElementById('fullPlayer').classList.toggle('open');
}

function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    
    // Update Mini Player
    document.getElementById('miniPlayer').classList.add('show');
    document.getElementById('miniTitle').innerText = title;
    document.getElementById('miniArtist').innerText = channel;
    const miniImg = document.getElementById('miniThumb');
    miniImg.src = 'https://img.youtube.com/vi/' + videoId + '/default.jpg';
    miniImg.style.display = 'block';

    // Update Full Player
    document.getElementById('fullTitle').innerText = title;
    document.getElementById('fullArtist').innerText = channel;
    document.getElementById('defaultIcon').style.display = 'none';
    const fullImg = document.getElementById('fullThumb');
    fullImg.src = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
    fullImg.style.display = 'block';
    
    document.getElementById('prevBtn').disabled = historyIndex <= 0;
    
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

// SIMPAN KE MONGODB
async function addToPlaylist() {
    if (!currentVideoId) return;
    const playlistName = prompt("Simpan ke playlist apa?", "Favorit");
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
            alert("Lagu disimpan!");
            loadPlaylistsToHome(); // Refresh tampilan kotak playlist di beranda
        } else { alert("Gagal: " + data.error); }
    } catch (error) { alert("Error database."); }
}
