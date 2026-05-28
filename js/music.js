let player;
let currentVideoId = '';
let isPlaying = false;
let progressInterval;
let playHistory = [];
let historyIndex = -1;
let parsedLyrics = [];
let currentLyricIndex = -1;

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

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

function onPlayerStateChange(event) {
    const playIcon = document.getElementById('playIcon');
    const progressBar = document.getElementById('progressBar');
    
    if (event.data == YT.PlayerState.ENDED) {
        playNextLogics(); 
        return;
    }

    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
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
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
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

const searchBtn = document.getElementById('searchBtn');
searchBtn.addEventListener('click', async () => {
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
        } else { searchResults.innerHTML = '<div class="result-item">Lagu tidak ditemukan.</div>'; }
    } catch (error) { searchResults.innerHTML = '<div class="result-item">Koneksi terputus.</div>'; }
});

async function fetchSimilarVibes() {
    const currentTitle = playHistory[historyIndex].title;
    const currentArtist = playHistory[historyIndex].channel;
    const searchQ = currentTitle + " " + currentArtist + " mix audio";
    document.getElementById('title').innerText = "Mencari vibes serupa...";
    
    try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1) {
            const filtered = data.filter(item => item.videoId !== currentVideoId);
            const nextSong = filtered[Math.floor(Math.random() * filtered.length)] || data[0];
            selectSong(nextSong.videoId, nextSong.title, nextSong.channel);
        }
    } catch (e) {}
}

function updateNavButtons() { document.getElementById('prevBtn').disabled = historyIndex <= 0; }

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
document.getElementById('nextBtn').addEventListener('click', playNextLogics);
document.getElementById('prevBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        const prevSong = playHistory[historyIndex];
        loadSongToPlayer(prevSong.videoId, prevSong.title, prevSong.channel);
    }
});

async function fetchLyrics(rawTitle, artist) {
    const lyricsBox = document.getElementById('lyricsContainer');
    const lyricsTitle = document.getElementById('lyricsTitle');
    lyricsTitle.style.display = 'block';
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
    } catch (e) { lyricsBox.innerHTML = '<div style="margin-top:40%;"><i style="color:#777;">Koneksi lirik terputus.</i></div>'; }
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
            const container = document.getElementById('lyricsContainer');
            container.scrollTo({ top: newEl.offsetTop - (container.clientHeight / 2), behavior: 'smooth' });
        }
    }
}

function loadSongToPlayer(videoId, title, channel) {
    currentVideoId = videoId;
    document.getElementById('title').innerText = title;
    document.getElementById('artist').innerText = channel;
    document.getElementById('defaultIcon').style.display = 'none';
    const albumImg = document.getElementById('albumImage');
    albumImg.src = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
    albumImg.style.display = 'block';
    
    if (player && player.loadVideoById) player.loadVideoById(videoId);
    updateNavButtons();
    fetchLyrics(title, channel);
}

function selectSong(videoId, title, channel) {
    document.getElementById('searchResults').style.display = 'none';
    if (historyIndex < playHistory.length - 1) playHistory = playHistory.slice(0, historyIndex + 1);
    playHistory.push({videoId, title, channel});
    historyIndex++;
    loadSongToPlayer(videoId, title, channel);
}

document.getElementById('playBtn').addEventListener('click', () => {
    if (!currentVideoId || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
});

// ==========================================
// INTEGRASI MONGODB PLAYLIST
// ==========================================

async function addToPlaylist() {
    if (!currentVideoId) return alert("Pilih lagu dulu yang mau disimpen!");
    
    const currentTitle = document.getElementById('title').innerText;
    const currentArtist = document.getElementById('artist').innerText;
    
    const playlistName = prompt("Simpan ke playlist apa?\n(Ketik nama playlist baru, misal: Galau, Semangat, dll)", "Favorit");
    if (!playlistName) return;

    // Mengirim data ke API Vercel -> MongoDB
    try {
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistName: playlistName,
                videoId: currentVideoId,
                title: currentTitle,
                channel: currentArtist
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert("Lagu berhasil masuk ke cloud MongoDB!");
        } else {
            alert("Gagal: " + data.error);
        }
    } catch (error) {
        alert("Koneksi ke database error.");
    }
}

async function openPlaylistModal() {
    const modal = document.getElementById('playlistModal');
    const container = document.getElementById('playlistContainerModal');
    modal.style.display = 'flex';
    container.innerHTML = '<p style="text-align:center; color:#888;">Mengambil data dari MongoDB...</p>';
    
    try {
        const response = await fetch('/api/playlist');
        const playlists = await response.json();
        
        if (Object.keys(playlists).length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">Belum ada playlist di database. Putar lagu lalu klik + buat bikin.</p>';
            return;
        }

        let html = '';
        for (let name in playlists) {
            // Kita simpan data mentah lagu-lagunya di atribut data html biar gampang dipanggil
            html += `
                <div class="pl-folder" onclick='showSongsInPlaylist("${name}", ${JSON.stringify(playlists[name]).replace(/'/g, "&#39;")})'>
                    <div>
                        <div style="font-weight:bold; font-size:16px;">${name}</div>
                        <div style="font-size:12px; color:#888;">${playlists[name].length} Lagu</div>
                    </div>
                    <div style="font-size:20px; color:#555;">❯</div>
                </div>
            `;
        }
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="text-align:center; color:#ff4444;">Gagal terhubung ke MongoDB.</p>';
    }
}

function showSongsInPlaylist(name, songs) {
    const container = document.getElementById('playlistContainerModal');
    
    let html = `
        <div style="margin-bottom:15px; color:#38bdf8; cursor:pointer; font-size:14px; display:inline-block;" onclick="openPlaylistModal()">
            ← Kembali ke Playlist
        </div>
        <h4 style="margin:0 0 15px 0;">Menampilkan: ${name}</h4>
    `;

    songs.forEach(song => {
        html += `
            <div class="pl-song-item" onclick="playFromPlaylist('${song.videoId}', '${song.title.replace(/'/g, "\\'")}', '${song.channel.replace(/'/g, "\\'")}')">
                <div class="pl-song-title">${song.title}</div>
                <div class="pl-song-artist">${song.channel}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function playFromPlaylist(videoId, title, channel) {
    closePlaylistModal();
    selectSong(videoId, title, channel);
}

function closePlaylistModal() {
    document.getElementById('playlistModal').style.display = 'none';
}
