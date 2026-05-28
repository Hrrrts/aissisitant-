let player;
let currentVideoId = '';
let isPlaying = false;
let progressInterval;
let playHistory = [];
let historyIndex = -1;
let parsedLyrics = [];
let currentLyricIndex = -1;
let allPlaylists = {}; // Buat nyimpen data playlist di memory biar cepet

const playIconSvg = '▶';
const pauseIconSvg = '⏸';

document.addEventListener("DOMContentLoaded", () => {
    loadPlaylistsToHome();
});

// LOGIKA SWIPE BACK (HISTORY API)
function openFullPlayer() {
    if(!currentVideoId) return;
    document.getElementById('fullPlayer').classList.add('open');
    // Bikin jebakan histori biar swipe back di HP kebaca
    history.pushState({ modal: 'fullPlayer' }, ''); 
}

function closeFullPlayer() {
    document.getElementById('fullPlayer').classList.remove('open');
}

// Deteksi saat user melakukan swipe back (kembali) di HP Android
window.addEventListener('popstate', (e) => {
    const fp = document.getElementById('fullPlayer');
    if (fp.classList.contains('open')) {
        fp.classList.remove('open'); // Tutup player tanpa nutup app
    }
});

// MEMUAT PLAYLIST (DENGAN GAMBAR)
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
            // Ambil gambar dari lagu pertama di playlist tersebut
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
        checkIfLiked(); // Cek status love kalau lagu lagi muter
    } catch (error) {
        grid.innerHTML = '<p style="color:#ff4444; font-size:13px;">Gagal memuat database.</p>';
    }
}

function playFromFolder(playlistName) {
    const songs = allPlaylists[playlistName];
    if(!songs || songs.length === 0) return;
    selectSong(songs[0].videoId, songs[0].title, songs[0].channel);
}

// LOGIKA YOUTUBE
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

// KONTROL UPDATE TAMPILAN
function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    
    // Mini Player Update
    document.getElementById('miniPlayer').classList.add('show');
    document.getElementById('miniTitle').innerText = title;
    document.getElementById('miniArtist').innerText = channel;
    document.getElementById('miniThumb').src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    document.getElementById('miniThumb').style.display = 'block';

    // Full Player Update
    document.getElementById('fullTitle').innerText = title;
    document.getElementById('fullArtist').innerText = channel;
    document.getElementById('fullThumb').src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    document.getElementById('fullThumb').style.display = 'block';
    
    document.getElementById('prevBtn').disabled = historyIndex <= 0;
    
    checkIfLiked(); // Update icon hati

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

// LOGIKA TOMBOL LOVE & PLAYLIST
function checkIfLiked() {
    if (!currentVideoId) return;
    const likedSongs = allPlaylists["Lagu Disukai"] || [];
    const isLiked = likedSongs.find(s => s.videoId === currentVideoId);
    
    const likeBtn = document.getElementById('likeBtn');
    if (isLiked) {
        likeBtn.innerText = '♥'; // Hati isi
        likeBtn.style.color = '#1db954';
    } else {
        likeBtn.innerText = '♡'; // Hati kosong
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
        // Tembak API buat tambah/hapus
        await fetch('/api/playlist', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        // Refresh daftar playlist biar sinkron
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
            loadPlaylistsToHome(); // Refresh otomatis
        } else { alert(data.error); }
    } catch (error) { alert("Error database."); }
}
