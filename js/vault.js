const API_URL = '/api/tools?type=vault';

document.addEventListener("DOMContentLoaded", () => {
    loadVaultData();
});

async function loadVaultData() {
    const container = document.getElementById('vaultContainer');
    container.innerHTML = '<p style="color:#a1a1aa; font-size:13px; text-align:center;">Membuka brankas...</p>';
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = '<p style="color:#52525b; font-size:13px; text-align:center;">Brankas masih kosong.</p>';
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="vault-item">
                <div class="vault-header">
                    <div>
                        <h3 class="vault-title">${item.title}</h3>
                        ${item.username ? `<div class="vault-username">${item.username}</div>` : ''}
                    </div>
                    <button class="icon-btn delete" onclick="deleteVaultItem('${item._id}')" title="Hapus">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
                <div class="password-area">
                    <div class="password-text" id="pw-text-${item._id}" data-pw="${item.password}">••••••••</div>
                    <div class="vault-actions">
                        <button class="icon-btn" onclick="togglePassword('${item._id}')" title="Lihat">
                            <svg id="pw-icon-${item._id}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button class="icon-btn copy" onclick="copyPassword('${item.password}')" title="Salin">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p style="color:#ef4444; font-size:13px; text-align:center;">Gagal memuat brankas.</p>';
    }
}

async function savePassword() {
    const title = document.getElementById('v-title').value.trim();
    const username = document.getElementById('v-username').value.trim();
    const password = document.getElementById('v-password').value.trim();
    const btn = document.getElementById('btnSaveVault');

    if (!title || !password) {
        alert("Nama Web/Aplikasi dan Password wajib diisi!");
        return;
    }

    btn.innerHTML = 'Menyimpan...';
    btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, username, password })
        });
        
        // Bersihkan form
        document.getElementById('v-title').value = '';
        document.getElementById('v-username').value = '';
        document.getElementById('v-password').value = '';
        
        loadVaultData(); // Refresh UI
        showToast("Tersimpan di Brankas!");
    } catch (e) {
        alert("Gagal menyimpan data.");
    } finally {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan Password`;
        btn.disabled = false;
    }
}

function togglePassword(id) {
    const textEl = document.getElementById(`pw-text-${id}`);
    const iconEl = document.getElementById(`pw-icon-${id}`);
    const actualPw = textEl.getAttribute('data-pw');

    if (textEl.innerText === '••••••••') {
        textEl.innerText = actualPw; // Tampilkan
        iconEl.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`; // Icon mata dicoret
    } else {
        textEl.innerText = '••••••••'; // Sembunyikan
        iconEl.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`; // Icon mata terbuka
    }
}

async function copyPassword(password) {
    try {
        await navigator.clipboard.writeText(password);
        showToast("Password Disalin!");
    } catch (err) {
        alert("Gagal menyalin. Browser tidak mendukung.");
    }
}

async function deleteVaultItem(id) {
    if(!confirm("Yakin ingin menghapus password ini dari brankas?")) return;
    try {
        await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadVaultData();
    } catch (e) {
        alert("Gagal menghapus.");
    }
}

function showToast(message) {
    const toast = document.getElementById('vaultToast');
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${message}`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2000);
}
