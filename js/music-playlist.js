const API_URL = '/api/playlist';

document.addEventListener("DOMContentLoaded", () => {
    loadPlaylistsFromDB();
});

async function loadPlaylistsFromDB() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && !data.error) {
            allPlaylists = data;
            if (!allPlaylists["Lagu Favorit"]) allPlaylists["Lagu Favorit"] = [];
        } else {
            allPlaylists = { "Lagu Favorit": [] };
        }
        renderPlaylistGrid();
        checkIfLiked();
    } catch (error) {
        console.error("Gagal memuat playlist:", error);
        allPlaylists = { "Lagu Favorit": [] };
    }
}

// ==========================================
// FITUR LIKED SONGS (TOMBOL LOVE)
// ==========================================
function checkIfLiked() {
    if (!currentVideoId) return;
    const likeBtn = document.getElementById('likeBtn');
    if (!likeBtn) return;

    const favList = allPlaylists["Lagu Favorit"] || [];
    const isLiked = favList.some(song => song.videoId === currentVideoId);

    if (isLiked) {
        likeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    } else {
        likeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    }
}

async function toggleLike() {
    if (!currentVideoId || historyIndex < 0) return;
    const currentSong = playHistory[historyIndex];
    if (!allPlaylists["Lagu Favorit"]) allPlaylists["Lagu Favorit"] = [];
    
    const favList = allPlaylists["Lagu Favorit"];
    const songIndex = favList.findIndex(song => song.videoId === currentVideoId);
    const isAdding = songIndex === -1;

    // Optimistic UI Update
    if (isAdding) favList.push(currentSong);
    else favList.splice(songIndex, 1);
    
    checkIfLiked();
    renderPlaylistGrid();

    // API Call
    try {
        const method = isAdding ? 'POST' : 'DELETE';
        await fetch(API_URL, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                playlistName: "Lagu Favorit", 
                videoId: currentSong.videoId, 
                title: currentSong.title, 
                channel: currentSong.channel 
            })
        });
    } catch (e) { console.error(e); }
}

// ==========================================
// FITUR MODAL TAMBAH KE PLAYLIST LAIN
// ==========================================
function addToPlaylist() {
    if (!currentVideoId || historyIndex < 0) return;
    const saveModal = document.getElementById('saveModal');
    const savePlaylistList = document.getElementById('savePlaylistList');
    savePlaylistList.innerHTML = '';

    for (const playlistName in allPlaylists) {
        if (playlistName === "Lagu Favorit") continue;
        const isAlreadyIn = allPlaylists[playlistName].some(song => song.videoId === currentVideoId);
        savePlaylistList.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#09090b; padding:10px 14px; border-radius:10px; border:1px solid #27272a;">
                <span style="color:#fff; font-size:14px;">${playlistName}</span>
                <button onclick="addSongToExistingPlaylist('${playlistName}')" style="background:${isAlreadyIn ? '#3f3f46' : '#fbbf24'}; color:${isAlreadyIn ? '#a1a1aa' : '#000'}; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:pointer;" ${isAlreadyIn ? 'disabled' : ''}>
                    ${isAlreadyIn ? 'Ditambahkan' : 'Tambah'}
                </button>
            </div>
        `;
    }

    if(Object.keys(allPlaylists).length <= 1) {
        savePlaylistList.innerHTML = '<div style="color:#777; font-size:13px; text-align:center; padding:10px;">Belum ada custom playlist.</div>';
    }
    saveModal.style.display = 'flex';
}

async function addSongToExistingPlaylist(playlistName) {
    const currentSong = playHistory[historyIndex];
    if (!allPlaylists[playlistName].some(song => song.videoId === currentSong.videoId)) {
        allPlaylists[playlistName].push(currentSong);
        renderPlaylistGrid();
        addToPlaylist(); 
        
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    renderPlaylistGrid();
    inputEle.value = '';
    document.getElementById('saveModal').style.display = 'none';

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName: newName, videoId: currentSong.videoId, title: currentSong.title, channel: currentSong.channel })
    });
}

// ==========================================
// RENDER TAMPILAN & MANAJEMEN PLAYLIST
// ==========================================
function renderPlaylistGrid() {
    const grid = document.getElementById('playlistGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (const [name, songs] of Object.entries(allPlaylists)) {
        const coverImg = songs.length > 0 ? `https://img.youtube.com/vi/${songs[0].videoId}/mqdefault.jpg` : ''; 
        const coverHTML = coverImg 
            ? `<img src="${coverImg}" style="width:100%; height:100%; object-fit:cover;">`
            : `<div style="width:100%; height:100%; background:#27272a; display:flex; align-items:center; justify-content:center; font-size:24px;">🎵</div>`;

        grid.innerHTML += `
            <div class="playlist-card" onclick="openPlaylistManager('${name}')" style="background:#18181b; border-radius:12px; overflow:hidden; cursor:pointer; border:1px solid #27272a;">
                <div style="width:100%; aspect-ratio:1/1;">${coverHTML}</div>
                <div style="padding:10px;">
                    <div style="color:#fff; font-size:14px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                    <div style="color:#777; font-size:12px; margin-top:4px;">${songs.length} Lagu</div>
                </div>
            </div>
        `;
    }
}

function openPlaylistManager(playlistName) {
    currentManagingPlaylist = playlistName;
    const pm = document.getElementById('playlistManagerModal');
    document.getElementById('pmTitle').innerText = playlistName;
    const pmSongList = document.getElementById('pmSongList');
    pmSongList.innerHTML = '';

    const songs = allPlaylists[playlistName] || [];
    if (songs.length === 0) {
        pmSongList.innerHTML = '<div style="color:#777; text-align:center; margin-top:20px;">Playlist ini masih kosong.</div>';
    } else {
        songs.forEach((song) => {
            pmSongList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#09090b; padding:12px; border-radius:12px;">
                    <div style="flex:1; overflow:hidden; cursor:pointer;" onclick="playSongFromPlaylist('${song.videoId}', '${song.title.replace(/'/g, "\\'")}', '${song.channel.replace(/'/g, "\\'")}')">
                        <div style="color:#fff; font-size:14px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
                        <div style="color:#777; font-size:12px; margin-top:4px;">${song.channel}</div>
                    </div>
                    <button onclick="removeSongFromPlaylist('${playlistName}', '${song.videoId}')" style="background:none; border:none; color:#ef4444; font-size:18px; cursor:pointer; padding-left:10px;">🗑️</button>
                </div>
            `;
        });
    }
    pm.style.display = 'flex';
    history.pushState({ modal: 'playlistManager' }, '');
}

function closePlaylistManager() {
    const pm = document.getElementById('playlistManagerModal');
    if (pm) pm.style.display = 'none';
}

async function removeSongFromPlaylist(playlistName, videoId) {
    if(confirm("Hapus lagu ini dari playlist?")) {
        allPlaylists[playlistName] = allPlaylists[playlistName].filter(song => song.videoId !== videoId);
        renderPlaylistGrid();
        openPlaylistManager(playlistName); 
        checkIfLiked(); 
        
        await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistName, videoId })
        });
    }
}

function playSongFromPlaylist(videoId, title, channel) {
    closePlaylistManager();
    if(typeof selectSong === 'function') selectSong(videoId, title, channel);
}
