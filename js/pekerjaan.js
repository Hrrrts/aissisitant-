const API_URL = '/api/pekerjaan';
let allData = [];
let workspaces = {};

document.addEventListener("DOMContentLoaded", () => { loadWorkData(); });

async function loadWorkData() {
    try {
        const res = await fetch(API_URL);
        allData = await res.json();
        
        // Pisahkan data Inventory Log Fix & Custom Blocks
        const inventoryLogs = allData.filter(item => item.category === "Inventory Log");
        renderInventoryTable(inventoryLogs);

        workspaces = {};
        const customItems = allData.filter(item => item.category !== "Inventory Log");
        customItems.forEach(item => {
            if (!workspaces[item.category]) workspaces[item.category] = [];
            workspaces[item.category].push(item);
        });
        renderCustomWorkspaces();
    } catch (e) {
        console.error("Gagal memuat data pekerjaan", e);
    }
}

// 1. RENDER TABEL FIXED LOG INVENTORY
function renderInventoryTable(logs) {
    const tbody = document.getElementById('tbodyLog');
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#52525b; font-size:12px;">Belum ada log barang hari ini.</td></tr>`;
        return;
    }

    // Urutkan terbalik (paling baru di atas) sesuai perilaku PHP array_reverse
    const reversedLogs = [...logs].reverse();

    tbody.innerHTML = reversedLogs.map(log => {
        const jam = new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return `
            <tr>
                <td class="td-time">${jam}</td>
                <td class="td-item">${log.text}</td>
                <td><span class="badge-qty-table">${log.qty}</span></td>
                <td class="td-ket">${log.keterangan || '-'}</td>
                <td>
                    <button class="btn-del-table" onclick="deleteItem('${log._id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Handler Simpan Log Fix
async function saveFixedInventory() {
    const inputItem = document.getElementById('invItem');
    const inputQty = document.getElementById('invQty');
    const inputKet = document.getElementById('invKet');
    const btn = document.getElementById('btnSimpanFixed');

    const text = inputItem.value.trim();
    const qty = inputQty.value.trim();
    const keterangan = inputKet.value.trim();

    if (!text || !qty) return alert("Nama Barang dan Qty wajib diisi!");

    btn.innerText = 'Menyimpan...'; btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: "Inventory Log", text, qty, keterangan })
        });
        inputItem.value = ''; inputQty.value = ''; inputKet.value = '';
        await loadWorkData();
        inputItem.focus();
    } catch (e) {
        alert("Gagal menyimpan log.");
    } finally {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> SIMPAN LOG`;
        btn.disabled = false;
    }
}

// COPY REKAP WA DARI TABEL FIXED LOG
function copyRekapWA() {
    const logs = allData.filter(item => item.category === "Inventory Log");
    if (logs.length === 0) return alert("Tidak ada data untuk direkap hari ini!");

    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = `📦 *LOG STATUS INVENTORI*\n📅 Tanggal: ${dateStr}\n\n`;

    logs.forEach((log, idx) => {
        const jam = new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const ketStr = log.keterangan ? ` _(${log.keterangan})_` : '';
        text += `• [${jam}] *${log.text.toUpperCase()}* ➔ *${log.qty}*${ketStr}\n`;
    });

    text += `\n_Aissistant Auto-Generated_`;

    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('workToast');
        toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Rekap disalin ke WA!`;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 2000);
    }).catch(() => { alert("Gagal menyalin."); });
}

// 2. RENDER SUB-BAGIAN KUSTOM BLOCKS (DYNAMIQUES)
function renderCustomWorkspaces() {
    const grid = document.getElementById('customWorkspaceGrid');
    grid.innerHTML = '';

    for (const [category, items] of Object.entries(workspaces)) {
        let itemsHtml = items.map(item => `
            <div class="custom-item ${item.isDone ? 'done' : ''}" onclick="toggleCustomStatus('${item._id}', ${!item.isDone})">
                <span>${item.text}</span>
                <button class="btn-del-table" style="color:#ef4444;" onclick="event.stopPropagation(); deleteItem('${item._id}')">✕</button>
            </div>
        `).join('');

        grid.innerHTML += `
            <div class="work-block">
                <div class="block-header">
                    <h3 class="block-title">${category}</h3>
                </div>
                <div class="item-list">${itemsHtml || '<span style="color:#52525b; font-size:11px;">Kosong</span>'}</div>
                <div class="add-block-form">
                    <input type="text" id="task-${category}" class="input-block-task" placeholder="Tambah kegiatan..." onkeypress="if(event.key==='Enter') addCustomTask('${category}')">
                    <button class="btn-add-task" onclick="addCustomTask('${category}')">+</button>
                </div>
            </div>
        `;
    }
}

async function addCustomTask(category) {
    const input = document.getElementById(`task-${category}`);
    const text = input.value.trim();
    if (!text) return;
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, text }) });
        loadWorkData();
    } catch (e) { alert("Error"); }
}

async function createNewBlock() {
    const category = prompt("Nama Kategori Kerja Baru:");
    if (!category || !category.trim()) return;
    const text = prompt(`Item pertama untuk "${category}":`);
    if (!text || !text.trim()) return;
    try {
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: category.trim(), text: text.trim() }) });
        loadWorkData();
    } catch (e) { alert("Error"); }
}

async function toggleCustomStatus(id, newStatus) {
    try {
        await fetch(API_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isDone: newStatus }) });
        loadWorkData();
    } catch (e) {}
}

async function deleteItem(id) {
    if (!confirm("Hapus log ini?")) return;
    try {
        await fetch(API_URL, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        loadWorkData();
    } catch (e) { alert("Gagal"); }
}
