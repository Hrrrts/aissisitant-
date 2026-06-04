const API_URL = '/api/absen';
let currentActiveRecord = null;
let records = [];

document.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadAttendanceData();
});

// Update Jam Digital Real-Time
function startClock() {
    const timeEl = document.getElementById('liveTime');
    const dateEl = document.getElementById('liveDate');
    
    setInterval(() => {
        const now = new Date();
        timeEl.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dateEl.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);
}

// Format waktu Helper
function formatTimeOnly(isoString) {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes) {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}j ${m}m`;
}

async function loadAttendanceData() {
    try {
        const res = await fetch(API_URL);
        records = await res.json();
        
        // Cek apakah ada record yang belum di Clock Out
        currentActiveRecord = records.find(r => r.clockOut === null);
        updateUIState();
        renderHistory();
        calculateWeeklyStats();
    } catch (e) {
        console.error("Gagal memuat absen", e);
    }
}

function updateUIState() {
    const btn = document.getElementById('btnAction');
    const inputLoc = document.getElementById('inputLocation');

    if (currentActiveRecord) {
        // Sedang Bekerja
        inputLoc.value = currentActiveRecord.location;
        inputLoc.disabled = true;
        btn.className = 'btn-action clock-out';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> CLOCK OUT`;
        btn.onclick = executeClockOut;
    } else {
        // Belum Bekerja
        inputLoc.value = '';
        inputLoc.disabled = false;
        btn.className = 'btn-action';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg> CLOCK IN`;
        btn.onclick = executeClockIn;
    }
}

async function executeClockIn() {
    const location = document.getElementById('inputLocation').value.trim();
    if (!location) return alert("Isi lokasi kerja dulu (contoh: WFO, Cafe, Kamar)");

    const btn = document.getElementById('btnAction');
    btn.innerHTML = 'Memproses...'; btn.disabled = true;

    try {
        const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, dateStr })
        });
        await loadAttendanceData();
    } catch (e) {
        alert("Gagal Clock In");
    } finally {
        btn.disabled = false;
    }
}

async function executeClockOut() {
    if (!currentActiveRecord) return;
    const btn = document.getElementById('btnAction');
    btn.innerHTML = 'Memproses...'; btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentActiveRecord._id })
        });
        currentActiveRecord = null;
        await loadAttendanceData();
    } catch (e) {
        alert("Gagal Clock Out");
    } finally {
        btn.disabled = false;
    }
}

async function deleteRecord(id) {
    if(!confirm("Hapus catatan absen ini?")) return;
    try {
        await fetch(API_URL, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        loadAttendanceData();
    } catch (e) { alert("Gagal menghapus"); }
}

function calculateWeeklyStats() {
    // Hitung total jam kerja dari 7 hari terakhir
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    let totalMins = 0;
    records.forEach(r => {
        const recordDate = new Date(r.clockIn);
        if (recordDate >= sevenDaysAgo && r.totalMinutes) {
            totalMins += r.totalMinutes;
        }
    });

    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    document.getElementById('weeklyTotal').innerText = `${h}h ${m}m`;
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (records.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#52525b; font-size:13px;">Belum ada riwayat absen.</p>';
        return;
    }

    list.innerHTML = records.map(r => `
        <div class="h-item">
            <button class="btn-del-record" onclick="deleteRecord('${r._id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="h-header">
                <div class="h-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ${r.dateStr}
                </div>
                <div class="h-loc">${r.location}</div>
            </div>
            <div class="h-body">
                <div style="display:flex; gap:20px;">
                    <div class="h-time-wrap">
                        <span class="h-time-label">In</span>
                        <span class="h-time-val">${formatTimeOnly(r.clockIn)}</span>
                    </div>
                    <div class="h-time-wrap">
                        <span class="h-time-label">Out</span>
                        <span class="h-time-val">${formatTimeOnly(r.clockOut)}</span>
                    </div>
                </div>
                <div class="h-duration">${r.clockOut ? formatDuration(r.totalMinutes) : '<span style="color:#fbbf24">Bekerja...</span>'}</div>
            </div>
        </div>
    `).join('');
}
