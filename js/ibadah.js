const now = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('dateDisplay').innerText = now.toLocaleDateString('id-ID', options);

let todayData = { solat: {}, sunnah: {}, murojaah: '' };

function generateAITarget() {
    const targets = [
        { text: "Surah Al-Mulk (Tabarak) full", url: "https://quran.com/67" },
        { text: "Surah Ar-Rahman ayat 1-40", url: "https://quran.com/55/1-40" },
        { text: "Surah Al-Waqi'ah ayat 1-50", url: "https://quran.com/56/1-50" },
        { text: "Surah Al-Kahf ayat 1-15", url: "https://quran.com/18/1-15" },
        { text: "Surah An-Naba s/d An-Naziat", url: "https://quran.com/78" },
        { text: "Surah Yasin ayat 1-40", url: "https://quran.com/36/1-40" },
        { text: "Surah As-Sajdah ayat 1-30", url: "https://quran.com/32" },
        { text: "Surah Al-Qalam (Juz 29)", url: "https://quran.com/68" },
        { text: "Surah Luqman ayat 1-20", url: "https://quran.com/31/1-20" },
        { text: "Surah Al-Insan full", url: "https://quran.com/76" }
    ];
    
    const dateStr = now.toDateString();
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % targets.length;
    const target = targets[index];
    
    const bookIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

    document.getElementById('aiMessage').innerHTML = `
        <div class="ai-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            Ais Assistant
        </div>
        <div class="ai-text">
            Halo Haris! Rekomendasi jadwal murojaah kamu hari ini adalah menyelesaikan <strong>${target.text}</strong>. Semangat ya!
        </div>
        <a href="${target.url}" target="_blank" class="btn-quran-link">
            ${bookIcon} Buka Al-Quran
        </a>
    `;
}

async function loadData() {
    try {
        const res = await fetch('/api/ibadah');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if(data.today) {
            todayData = data.today;
            for (const [key, value] of Object.entries(todayData.solat || {})) {
                if(value) document.getElementById('btn-' + key).classList.add('active');
            }
            for (const [key, value] of Object.entries(todayData.sunnah || {})) {
                if(value) document.getElementById('btn-' + key).classList.add('active');
            }
            if(todayData.murojaah) {
                document.getElementById('murojaahInput').value = todayData.murojaah;
            }
        }

        const list = document.getElementById('historyList');
        if(data.history && data.history.length > 0) {
            list.innerHTML = data.history.map(h => {
                const solatCount = Object.values(h.solat || {}).filter(Boolean).length;
                return `
                <div class="h-item">
                    <div class="h-date">${h.date}</div>
                    <div class="h-stats">Wajib: ${solatCount}/5 | Murojaah: ${h.murojaah ? '✓' : '-'}</div>
                </div>`;
            }).join('');
        } else {
            list.innerHTML = '<p style="text-align:center; color:#a1a1aa; font-size:12px;">Belum ada histori.</p>';
        }
    } catch (e) {
        console.log('Error memuat data ibadah:', e);
        document.getElementById('historyList').innerHTML = '<p style="text-align:center; color:#ef4444; font-size:12px;">Gagal memuat data dari server.</p>';
    }
}

async function toggleTrack(type, key) {
    const btn = document.getElementById('btn-' + key);
    
    if (btn.classList.contains('syncing')) return; 

    if(!todayData[type]) todayData[type] = {};
    const isCurrentlyDone = todayData[type][key] || false;
    const newValue = !isCurrentlyDone;
    
    btn.classList.add('syncing');
    btn.classList.remove('active');

    try {
        const res = await fetch('/api/ibadah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, key, value: newValue })
        });

        if (!res.ok) throw new Error('Gagal dari database');

        todayData[type][key] = newValue;
        btn.classList.remove('syncing');
        if(newValue) {
            btn.classList.add('active');
        }
    } catch (e) {
        btn.classList.remove('syncing');
        alert('Jaringan tidak stabil, gagal menyimpan ke database.');
        if(isCurrentlyDone) btn.classList.add('active'); 
    }
}

async function saveMurojaah() {
    const val = document.getElementById('murojaahInput').value;
    const btn = document.getElementById('btnSaveMurojaah');
    
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/ibadah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'murojaah', key: 'text', value: val })
        });
        
        if (!res.ok) throw new Error('Database error');

        btn.innerText = 'Tersimpan ✓';
        setTimeout(() => { 
            btn.innerText = 'Simpan Catatan'; 
            btn.disabled = false;
        }, 2000);
    } catch (e) {
        alert('Gagal menyimpan catatan murojaah.');
        btn.innerText = 'Simpan Catatan';
        btn.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    generateAITarget();
    loadData();
});
