const API_URL = '/api/pekerjaan';
let workspaces = {};

document.addEventListener("DOMContentLoaded", () => {
    loadWorkData();
});

async function loadWorkData() {
    const container = document.getElementById('workspaceContainer');
    container.innerHTML = '<p style="color:#a1a1aa; font-size:13px;">Memuat ruang kerja...</p>';
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        workspaces = {}; // Reset
        
        // Kelompokkan data berdasarkan Kategori
        data.forEach(item => {
            if (!workspaces[item.category]) workspaces[item.category] = [];
            workspaces[item.category].push(item);
        });

        renderWorkspaces();
    } catch (e) {
        container.innerHTML = '<p style="color:#ef4444; font-size:13px;">Gagal memuat data.</p>';
    }
}

function renderWorkspaces() {
    const container = document.getElementById('workspaceContainer');
    container.innerHTML = '';

    if (Object.keys(workspaces).length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#a1a1aa; font-size:13px; margin-top:40px; border:1px dashed #27272a; padding:30px; border-radius:16px;">
                Ruang kerja masih kosong.<br>Klik tombol + di pojok kanan bawah untuk membuat blok baru.
            </div>`;
        return;
    }

    for (const [category, items] of Object.entries(workspaces)) {
        let itemsHtml = items.map(item => `
            <div class="work-item ${item.isDone ? 'done' : ''}" id="item-${item._id}">
                <div class="item-left" onclick="toggleItemStatus('${item._id}', ${!item.isDone})">
                    <div class="checkbox">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span class="item-text">${item.text}</span>
                </div>
                <button class="btn-delete" onclick="deleteItem('${item._id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `).join('');

        container.innerHTML += `
            <div class="work-block">
                <div class="block-header">
                    <h3 class="block-title">${category}</h3>
                </div>
                <div class="item-list">
                    ${itemsHtml || '<span style="color:#52525b; font-size:12px;">Kosong</span>'}
                </div>
                <div class="add-form">
                    <input type="text" id="input-${category}" class="input-work" placeholder="Tambah ke ${category}..." onkeypress="handleEnter(event, '${category}')">
                    <button class="btn-add" onclick="addNewItem('${category}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }
}

function handleEnter(e, category) {
    if (e.key === 'Enter') addNewItem(category);
}

async function addNewItem(category) {
    const input = document.getElementById(`input-${category}`);
    const text = input.value.trim();
    if (!text) return;

    input.value = 'Menyimpan...';
    input.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, text })
        });
        await loadWorkData(); // Refresh UI langsung dari server
    } catch (e) {
        alert("Gagal menyimpan data.");
    } finally {
        input.value = '';
        input.disabled = false;
    }
}

// Fitur Custom Block (Bikin Kategori Baru Bebas)
async function createNewBlock() {
    const category = prompt("Masukkan Nama Blok Baru (Cth: Inventory Gudang, Task UI/UX, dll):");
    if (!category || category.trim() === '') return;
    
    // Bikin item dummy sementara untuk trigger pembuatan kategori di database
    const text = prompt(`Masukkan item pertama untuk "${category}":`);
    if (!text || text.trim() === '') return;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category.trim(), text: text.trim() })
        });
        loadWorkData();
    } catch (e) {
        alert("Gagal membuat blok baru.");
    }
}

async function toggleItemStatus(id, newStatus) {
    // Optimistic UI Update (Ganti warna duluan biar kerasa cepet)
    const el = document.getElementById(`item-${id}`);
    if (newStatus) el.classList.add('done'); else el.classList.remove('done');

    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isDone: newStatus })
        });
        loadWorkData(); // Sync ulang di background
    } catch (e) {
        alert("Gagal update status");
        if (!newStatus) el.classList.add('done'); else el.classList.remove('done');
    }
}

async function deleteItem(id) {
    if(!confirm("Hapus item ini?")) return;
    try {
        await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadWorkData();
    } catch (e) {
        alert("Gagal menghapus item.");
    }
}
