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

// LOGIKA RIWAYAT PENCARIAN
const searchHistoryKey = 'ais_search_history';

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
    if (fp && fp.classList.contains('open')) {
        fp.classList.remove('open');
    }
});

async function loadPlaylistsToHome() {
    const grid = document.getElementById('playlistGrid');
    try {
        const response = await fetch('/api/playlist');
        allPlaylists = await response.json();
        
        if (Object.keys(allPlaylists).length === 0) {
            if(grid) grid.innerHTML = '<p style="color:#888; font-size:13px; grid-column: span 2;">Belum ada playlist.</p>';
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
        if(grid) grid.innerHTML = html;
        checkIfLiked();
    } catch (error) {
        if(grid) grid.innerHTML = '<p style="color:#ff4444; font-size:13px;">Gagal memuat database.</p>';
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
    const pb = document.getElementById('playBtn');
    const mpb = document.getElementById('miniPlayBtn');
    if(pb) pb.innerHTML = playing ? pauseIconSvg : playIconSvg;
    if(mpb) mpb.innerHTML = playing ? pauseIconSvg : playIconSvg;
}

function onPlayerStateChange(event) {
    const progressBar = document.getElementById('progressBar');
    if (event.data == YT.PlayerState.ENDED) { playNextLogics(); return; }
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseIcons(true);
        if(progressBar) progressBar.max = player.getDuration();
        const dur = document.getElementById('durationTime');
        if(dur) dur.innerText = formatTime(player.getDuration());
        progressInterval = setInterval(() => {
            const current = player.getCurrentTime();
            if(progressBar) progressBar.value = current;
            const curT = document.getElementById('currentTime');
            if(curT) curT.innerText = formatTime(current);
            syncLyrics(current);
        }, 500);
    } else {
        isPlaying = false;
        updatePlayPauseIcons(false);
        clearInterval(progressInterval);
    }
}

const pbInput = document.getElementById('progressBar');
if(pbInput) {
    pbInput.addEventListener('input', (e) => {
        if(player && player.seekTo) {
            player.seekTo(e.target.value, true);
            const curT = document.getElementById('currentTime');
            if(curT) curT.innerText = formatTime(e.target.value);
            syncLyrics(e.target.value);
        }
    });
}

// BISA PENCET TOMBOL ENTER UNTUK NYARI
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
            searchInput.blur(); // Nutup keyboard HP otomatis
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

function togglePlayPause() {
    if (!currentVideoId || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
}

const pb = document.getElementById('playBtn');
const mpb = document.getElementById('miniPlayBtn');
const nb = document.getElementById('nextBtn');
const prb = document.getElementById('prevBtn');

if(pb) pb.addEventListener('click', togglePlayPause);
if(mpb) mpb.addEventListener('click', togglePlayPause);
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

// ALGORITMA VIBES BARU: MENGHINDARI COVER DAN LIVE
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

async function fetchLyrics(rawTitle, artist) {
    const lyricsBox = document.getElementById('lyricsContainer');
    if(!lyricsBox) return;
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
    const container = document.getElementById('lyricsContainer');
    if(container) container.innerHTML = html;
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
            if(container) container.scrollTo({ top: newEl.offsetTop - 150, behavior: 'smooth' });
        }
    }
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

function checkIfLiked() {
    if (!currentVideoId) return;
    const likedSongs = allPlaylists["Lagu Disukai"] || [];
    const isLiked = likedSongs.find(s => s.videoId === currentVideoId);
    
    const likeBtn = document.getElementById('likeBtn');
    if(!likeBtn) return;
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
    const ft = document.getElementById('fullTitle');
    const fa = document.getElementById('fullArtist');
    
    const bodyData = {
        playlistName: "Lagu Disukai",
        videoId: currentVideoId,
        title: ft ? ft.innerText : '',
        channel: fa ? fa.innerText : ''
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

function addToPlaylist() {
    if (!currentVideoId) return;
    const modal = document.getElementById('saveModal');
    const listContainer = document.getElementById('savePlaylistList');
    if(!modal || !listContainer) return;
    
    listContainer.innerHTML = '';
    for (let name in allPlaylists) {
        if (name === "Lagu Disukai") continue; 
        listContainer.innerHTML += `
            <button onclick="saveToExisting('${name.replace(/'/g, "\\'")}')" style="background:#27272a; color:#fff; border:none; padding:12px; border-radius:10px; text-align:left; font-family:inherit; font-weight:600; cursor:pointer;">
                + ${name}
            </button>
        `;
    }
    
    if(listContainer.innerHTML === '') {
        listContainer.innerHTML = '<div style="color:#555; font-size:13px;">Belum ada playlist selain Lagu Disukai.</div>';
    }
    
    const newPl = document.getElementById('newPlaylistInput');
    if(newPl) newPl.value = '';
    modal.style.display = 'flex';
}

async function saveToExisting(playlistName) {
    const modal = document.getElementById('saveModal');
    if(modal) modal.style.display = 'none';
    await executeSaveToDB(playlistName);
}

async function saveToNewPlaylist() {
    const input = document.getElementById('newPlaylistInput');
    if(!input) return;
    const val = input.value;
    if (!val.trim()) return alert("Nama playlist nggak boleh kosong!");
    const modal = document.getElementById('saveModal');
    if(modal) modal.style.display = 'none';
    await executeSaveToDB(val.trim());
}

async function executeSaveToDB(playlistName) {
    const ft = document.getElementById('fullTitle');
    const fa = document.getElementById('fullArtist');
    try {
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistName: playlistName,
                videoId: currentVideoId,
                title: ft ? ft.innerText : '',
                channel: fa ? fa.innerText : ''
            })
        });
        const data = await response.json();
        if (data.success) {
            alert(`Lagu ditambahkan ke ${playlistName}!`);
            loadPlaylistsToHome(); 
        } else { alert(data.error); }
    } catch (error) { alert("Error database."); }
}

window.addToPlaylist = addToPlaylist;
