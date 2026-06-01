const API_URL = '/api/playlist';

document.addEventListener("DOMContentLoaded", () => { loadPlaylistsFromDB(); });

async function loadPlaylistsFromDB() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data && !data.error) {
            allPlaylists = data;
            if (!allPlaylists["Lagu Favorit"]) allPlaylists["Lagu Favorit"] = [];
        } else { allPlaylists = { "Lagu Favorit": [] }; }
        renderPlaylistGrid(); checkIfLiked();
    } catch (error) { allPlaylists = { "Lagu Favorit": [] }; }
}

function checkIfLiked() {
    if (!currentVideoId) return;
    const likeBtn = document.getElementById('likeBtn'); if (!likeBtn) return;
    const favList = allPlaylists["Lagu Favorit"] || [];
    const isLiked = favList.some(song => song.videoId === currentVideoId);
    likeBtn.innerHTML = isLiked 
        ? '<svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
}

async function toggleLike() {
    if (!currentVideoId || historyIndex < 0) return;
    const currentSong = playHistory[historyIndex];
    if (!allPlaylists["Lagu Favorit"]) allPlaylists["Lagu Favorit"] = [];
    const favList = allPlaylists["Lagu Favorit"];
    const songIndex = favList.findIndex(song => song.videoId === currentVideoId);
    const isAdding = songIndex === -1;

    if (isAdding) favList.push(currentSong); else favList.splice(songIndex, 1);
    checkIfLiked(); renderPlaylistGrid();

    try {
        await fetch(API_URL, {
            method: isAdding ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName: "Lagu Favorit", videoId: currentSong.videoId, title: currentSong.title, channel: currentSong.channel })
        });
    } catch (e) { console.error(e); }
}

function addToPlaylist() {
    if (!currentVideoId || historyIndex < 0) return;
    const saveModal = document.getElementById('saveModal');
    saveModal.querySelector('h3').innerText = 'Pilih Playlist';
    document.getElementById('newPlaylistInput').style.display = 'block';

    const savePlaylistList = document.getElementById('savePlaylistList');
    savePlaylistList.innerHTML = '';

    for (const playlistName in allPlaylists) {
        if (playlistName === "Lagu Favorit") continue;
        const isAlreadyIn = allPlaylists[playlistName].some(song => song.videoId === currentVideoId);
        savePlaylistList.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#09090b; padding:10px 14px; border-radius:10px; border:1px solid #27272a; margin-bottom:8px;">
                <span style="color:#fff; font-size:14px;">${playlistName}</span>
                <button onclick="addSongToExistingPlaylist('${playlistName}')" style="background:${isAlreadyIn ? '#3f3f46' : '#fbbf24'}; color:${isAlreadyIn ? '#a1a1aa' : '#000'}; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:pointer;" ${isAlreadyIn ? 'disabled' : ''}>
                    ${isAlreadyIn ? 'Ditambahkan' : 'Tambah'}
                </button>
            </div>`;
    }
    if(Object.keys(allPlaylists).length <= 1) savePlaylistList.innerHTML = '<div style="color:#777; font-size:13px; text-align:center; padding:10px;">Belum ada custom playlist.</div>';
    saveModal.style.display = 'flex';
}

async function addSongToExistingPlaylist(playlistName) {
    const currentSong = playHistory[historyIndex];
    if (!allPlaylists[playlistName].some(song => song.videoId === currentSong.videoId)) {
        allPlaylists[playlistName].push(currentSong);
        renderPlaylistGrid(); addToPlaylist(); 
        await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName, videoId: currentSong.videoId, title: currentSong.title, channel: currentSong.channel })
        });
    }
}

async function saveToNewPlaylist() {
    const inputEle = document.getElementById('newPlaylistInput');
    const newName = inputEle.value.trim();
    if (!newName) return alert("Nama playlist tidak boleh kosong!");
    if (allPlaylists[newName]) return alert("Nama playlist sudah ada!");

    const currentSong = playHistory[historyIndex];
    allPlaylists[newName] = [currentSong];
    renderPlaylistGrid(); inputEle.value = '';
    document.getElementById('saveModal').style.display = 'none';

    await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName: newName, videoId: currentSong.videoId, title: currentSong.title, channel: currentSong.channel })
    });
}

function renderPlaylistGrid() {
    const grid = document.getElementById('playlistGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (const [name, songs] of Object.entries(allPlaylists)) {
        const coverImg = songs.length > 0 ? `https://img.youtube.com/vi/${songs[0].videoId}/mqdefault.jpg` : ''; 
        const coverHTML = coverImg ? `<img src="${coverImg}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; background:#27272a; display:flex; align-items:center; justify-content:center; font-size:24px;">🎵</div>`;
        grid.innerHTML += `
            <div class="playlist-card" onclick="openPlaylistManager('${name}')" style="background:#18181b; border-radius:12px; overflow:hidden; cursor:pointer; border:1px solid #27272a;">
                <div style="width:100%; aspect-ratio:1/1;">${coverHTML}</div>
                <div style="padding:10px;">
                    <div style="color:#fff; font-size:14px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                    <div style="color:#777; font-size:12px; margin-top:4px;">${songs.length} Lagu</div>
                </div>
            </div>`;
    }
}

// === FITUR MANAJEMEN PLAYLIST DENGAN SVG ICONS ===
function openPlaylistManager(playlistName) {
    currentManagingPlaylist = playlistName;
    const pm = document.getElementById('playlistManagerModal');
    const pmTitle = document.getElementById('pmTitle');
    
    // Icon Edit (Pencil) & Delete (Trash) untuk Judul
    let editBtns = '';
    if (playlistName !== "Lagu Favorit") {
        editBtns = `
            <div style="display:flex; gap:12px; margin-left:10px; align-items:center;">
                <button onclick="renamePlaylist('${playlistName}')" style="background:none; border:none; color:#a1a1aa; cursor:pointer; padding:0; display:flex;" title="Ganti Nama">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button onclick="deleteEntirePlaylist('${playlistName}')" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:0; display:flex;" title="Hapus Playlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>`;
    }

    pmTitle.innerHTML = `<div style="display:flex; align-items:center;">${playlistName} ${editBtns}</div>`;
    
    const pmSongList = document.getElementById('pmSongList');
    pmSongList.innerHTML = '';
    const songs = allPlaylists[playlistName] || [];

    if (songs.length === 0) {
        pmSongList.innerHTML = '<div style="color:#777; text-align:center; margin-top:20px;">Playlist ini masih kosong.</div>';
    } else {
        // Icon Play & Shuffle
        pmSongList.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom: 15px;">
                <button onclick="playEntirePlaylist('${playlistName}', false)" style="flex:1; padding:10px; background:#fbbf24; color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Putar Semua
                </button>
                <button onclick="playEntirePlaylist('${playlistName}', true)" style="flex:1; padding:10px; background:#27272a; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Acak
                </button>
            </div>`;

        songs.forEach((song) => {
            const safeTitle = encodeURIComponent(song.title);
            const safeChannel = encodeURIComponent(song.channel);
            // Icon Move (Arrow Right) & Delete (Trash)
            pmSongList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#09090b; padding:12px; border-radius:12px; margin-bottom:8px;">
                    <div style="flex:1; overflow:hidden; cursor:pointer;" onclick="playSongFromPlaylist('${song.videoId}', '${safeTitle}', '${safeChannel}')">
                        <div style="color:#fff; font-size:14px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
                        <div style="color:#777; font-size:12px; margin-top:4px;">${song.channel}</div>
                    </div>
                    <div style="display:flex; gap:14px; align-items:center; margin-left:10px;">
                        ${playlistName !== "Lagu Favorit" ? `<button onclick="promptMoveSong('${playlistName}', '${song.videoId}', '${safeTitle}', '${safeChannel}')" style="background:none; border:none; color:#a1a1aa; cursor:pointer; padding:0; display:flex;" title="Pindah Playlist"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg></button>` : ''}
                        <button onclick="removeSongFromPlaylist('${playlistName}', '${song.videoId}')" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:0; display:flex;" title="Hapus Lagu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </div>`;
        });
    }
    pm.style.display = 'flex';
    history.pushState({ modal: 'playlistManager' }, '');
}

function closePlaylistManager() {
    const pm = document.getElementById('playlistManagerModal');
    if (pm) pm.style.display = 'none';
}

function playEntirePlaylist(playlistName, shuffle = false) {
    let songs = [...allPlaylists[playlistName]];
    if (songs.length === 0) return;
    
    if (shuffle) {
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
    }

    playHistory = songs; historyIndex = 0;
    const firstSong = playHistory[0];
    
    const sr = document.getElementById('searchResults'); if(sr) sr.style.display = 'none';
    loadSongToPlayer(firstSong.videoId, firstSong.title, firstSong.channel);
    closePlaylistManager();
}

async function renamePlaylist(oldName) {
    const newName = prompt("Masukkan nama baru untuk playlist:", oldName);
    if (!newName || newName === oldName) return;
    if (allPlaylists[newName]) return alert("Nama playlist sudah dipakai!");

    allPlaylists[newName] = allPlaylists[oldName]; delete allPlaylists[oldName];
    renderPlaylistGrid(); closePlaylistManager();

    await fetch(API_URL, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
    });
}

async function deleteEntirePlaylist(playlistName) {
    if(confirm(`Yakin ingin menghapus seluruh playlist "${playlistName}"?`)) {
        delete allPlaylists[playlistName];
        renderPlaylistGrid(); closePlaylistManager();
        await fetch(API_URL, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName }) 
        });
    }
}

function playSongFromPlaylist(videoId, safeTitle, safeChannel) {
    closePlaylistManager();
    const title = decodeURIComponent(safeTitle); const channel = decodeURIComponent(safeChannel);
    if(typeof selectSong === 'function') selectSong(videoId, title, channel, false);
}

async function removeSongFromPlaylist(playlistName, videoId) {
    if(confirm("Hapus lagu ini dari playlist?")) {
        allPlaylists[playlistName] = allPlaylists[playlistName].filter(song => song.videoId !== videoId);
        renderPlaylistGrid(); openPlaylistManager(playlistName); checkIfLiked(); 
        await fetch(API_URL, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName, videoId })
        });
    }
}

let moveData = null;
function promptMoveSong(playlistName, videoId, safeTitle, safeChannel) {
    moveData = { source: playlistName, song: { videoId, title: decodeURIComponent(safeTitle), channel: decodeURIComponent(safeChannel) } };
    const saveModal = document.getElementById('saveModal');
    saveModal.querySelector('h3').innerText = 'Pindah ke Playlist';
    
    const savePlaylistList = document.getElementById('savePlaylistList'); savePlaylistList.innerHTML = '';
    for (const pName in allPlaylists) {
        if (pName === playlistName || pName === "Lagu Favorit") continue;
        savePlaylistList.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#09090b; padding:10px 14px; border-radius:10px; border:1px solid #27272a; margin-bottom:8px;">
                <span style="color:#fff; font-size:14px;">${pName}</span>
                <button onclick="executeMove('${pName}')" style="background:#fbbf24; color:#000; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Pilih</button>
            </div>`;
    }
    
    document.getElementById('newPlaylistInput').style.display = 'none'; 
    saveModal.style.display = 'flex';
}

async function executeMove(targetPlaylist) {
    if (!moveData) return;
    const { source, song } = moveData;

    if (!allPlaylists[targetPlaylist].some(s => s.videoId === song.videoId)) {
        allPlaylists[targetPlaylist].push(song);
        await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName: targetPlaylist, videoId: song.videoId, title: song.title, channel: song.channel })
        });
    }

    allPlaylists[source] = allPlaylists[source].filter(s => s.videoId !== song.videoId);
    await fetch(API_URL, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName: source, videoId: song.videoId })
    });

    document.getElementById('saveModal').style.display = 'none';
    moveData = null; renderPlaylistGrid(); closePlaylistManager();
}
