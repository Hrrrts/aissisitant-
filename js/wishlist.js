const API_URL = '/api/wishlist';
let wishlistItems = [];

document.addEventListener("DOMContentLoaded", () => {
    loadWishlistData();
    setupDiscountToggle();
});

function formatRupiah(amount) {
    return 'Rp' + parseFloat(amount).toLocaleString('id-ID');
}

function setupDiscountToggle() {
    const checkbox = document.getElementById('w-isDiscount');
    const discGroup = document.getElementById('discountPriceGroup');
    if(checkbox) {
        checkbox.addEventListener('change', (e) => {
            discGroup.style.display = e.target.checked ? 'block' : 'none';
        });
    }
}

async function fetchLinkMetadata() {
    const urlInput = document.getElementById('w-link');
    const url = urlInput.value.trim();
    if (!url) return alert("Tempel link produk terlebih dahulu!");

    const btn = document.getElementById('btnCheckLink');
    const origText = btn.innerText;
    btn.innerText = "Check..."; btn.disabled = true;

    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scrape', url }) });
        const data = await res.json();
        
        if (data.success && data.title) {
            document.getElementById('w-title').value = data.title;
            if(data.image) document.getElementById('w-image').value = data.image;
        }
    } catch (e) { console.log("Gagal memuat detail otomatis"); } 
    finally { btn.innerText = origText; btn.disabled = false; }
}

async function saveWishlistItem() {
    const title = document.getElementById('w-title').value.trim();
    const link = document.getElementById('w-link').value.trim();
    const image = document.getElementById('w-image').value.trim();
    const reason = document.getElementById('w-reason').value.trim();
    const price = document.getElementById('w-price').value.trim();
    const isDiscount = document.getElementById('w-isDiscount').checked;
    const discountPrice = document.getElementById('w-discountPrice').value.trim();

    if (!title || !price) return alert("Nama barang dan harga wajib diisi!");
    const btn = document.getElementById('btnSaveWish');
    btn.innerText = 'Menyimpan...'; btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, link, image, reason, price, isDiscount, discountPrice })
        });
        
        document.getElementById('w-title').value = ''; document.getElementById('w-link').value = '';
        document.getElementById('w-image').value = ''; document.getElementById('w-reason').value = '';
        document.getElementById('w-price').value = ''; document.getElementById('w-isDiscount').checked = false;
        document.getElementById('w-discountPrice').value = ''; document.getElementById('discountPriceGroup').style.display = 'none';

        loadWishlistData();
    } catch (e) { alert("Gagal menyimpan item."); }
    finally { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> TAMBAHKAN IMPIAN`; btn.disabled = false; }
}

async function loadWishlistData() {
    const grid = document.getElementById('wishlistGrid');
    grid.innerHTML = '<p style="color:#a1a1aa; font-size:13px; grid-column:span 2; text-align:center;">Membuka daftar keinginan...</p>';

    try {
        const res = await fetch(API_URL);
        wishlistItems = await res.json();

        if (wishlistItems.length === 0) {
            grid.innerHTML = '<p style="color:#52525b; font-size:13px; grid-column:span 2; text-align:center;">Belum ada impian terdaftar.</p>'; return;
        }

        grid.innerHTML = wishlistItems.map(item => {
            const hasImg = item.image && item.image.startsWith('http');
            const imgHTML = hasImg ? `<img src="${item.image}" class="wish-img">` : `<div class="wish-no-img"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;
            const discountBadge = item.isDiscount ? `<div class="discount-badge">Promo</div>` : '';
            
            const priceHTML = item.isDiscount 
                ? `<div><span class="price-tag">${formatRupiah(item.discountPrice)}</span> <span class="old-price-strike">${formatRupiah(item.price)}</span></div>`
                : `<span class="price-tag">${formatRupiah(item.price)}</span>`;

            return `
                <div class="wish-item-card" onclick="openDetailModal('${item._id}')">
                    ${discountBadge}
                    <div class="wish-img-wrap">${imgHTML}</div>
                    <div class="wish-info">
                        <h4 class="wish-item-title">${item.title}</h4>
                        ${priceHTML}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { grid.innerHTML = '<p style="color:#ef4444; font-size:13px; grid-column:span 2; text-align:center;">Gagal memuat data.</p>'; }
}

function openDetailModal(id) {
    const item = wishlistItems.find(i => i._id === id);
    if (!item) return;

    document.getElementById('detailModal').style.display = 'flex';
    const hasImg = item.image && item.image.startsWith('http');
    
    document.getElementById('m-img').style.display = hasImg ? 'block' : 'none';
    if(hasImg) document.getElementById('m-img').src = item.image;

    document.getElementById('m-title').innerText = item.title;
    document.getElementById('m-reason').innerText = item.reason || "Tidak ada alasan spesifik yang dicatat.";
    
    const priceArea = document.getElementById('m-price-area');
    if (item.isDiscount) {
        priceArea.innerHTML = `<span class="price-tag" style="font-size:16px;">${formatRupiah(item.discountPrice)}</span> <span class="old-price-strike" style="font-size:13px; margin-left:8px;">${formatRupiah(item.price)}</span> <span style="color:#ef4444; font-weight:700; font-size:12px; margin-left:8px;">(DISKON)</span>`;
    } else { priceArea.innerHTML = `<span class="price-tag" style="font-size:16px;">${formatRupiah(item.price)}</span>`; }

    document.getElementById('m-link-btn').href = item.link && item.link.startsWith('http') ? item.link : '#';
    document.getElementById('m-delete-btn').onclick = () => deleteWishItem(item._id);
}

function closeDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

async function deleteWishItem(id) {
    if (!confirm("Hapus barang ini dari wishlist?")) return;
    try {
        await fetch(API_URL, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        closeDetailModal(); loadWishlistData();
    } catch (e) { alert("Gagal menghapus."); }
}
