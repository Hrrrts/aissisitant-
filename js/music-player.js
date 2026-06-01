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

function togglePlayPause() {
    if (!currentVideoId || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
}

const pb = document.getElementById('playBtn');
const mpb = document.getElementById('miniPlayBtn');
if(pb) pb.addEventListener('click', togglePlayPause);
if(mpb) mpb.addEventListener('click', togglePlayPause);

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
    if (fp && fp.classList.contains('open')) fp.classList.remove('open');
    const pm = document.getElementById('playlistManagerModal');
    if (pm && pm.style.display === 'flex') pm.style.display = 'none';
});

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
