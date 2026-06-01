document.addEventListener("DOMContentLoaded", () => {
    loadWallet();

    // FORMAT TITIK OTOMATIS SAAT NGETIK
    const amountInput = document.getElementById('txAmount');
    if(amountInput) {
        amountInput.addEventListener('input', function(e) {
            let value = this.value.replace(/[^0-9]/g, '');
            if (value) {
                this.value = new Intl.NumberFormat('id-ID').format(value);
            } else {
                this.value = '';
            }
        });
    }
});

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

async function loadWallet() {
    try {
        const res = await fetch('/api/wallet');
        const data = await res.json();
        
        document.getElementById('balanceText').innerText = formatRupiah(data.balance);
        
        const list = document.getElementById('historyList');
        if (data.txs.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#555; font-size:13px;">Belum ada transaksi.</p>';
            return;
        }

        list.innerHTML = data.txs.map(tx => {
            const dateObj = new Date(tx.date);
            const dateStr = dateObj.toLocaleDateString('id-ID', {day:'numeric', month:'short'}) + ' • ' + dateObj.getHours() + ':' + String(dateObj.getMinutes()).padStart(2, '0');
            const isIncome = tx.type === 'income';
            
            return `
            <div class="tx-card">
                <div class="tx-info">
                    <div class="tx-desc">${tx.desc}</div>
                    <div class="tx-date">${dateStr}</div>
                </div>
                <div class="tx-amount ${isIncome ? 'text-green' : 'text-red'}">
                    ${isIncome ? '+' : '-'}${formatRupiah(tx.amount)}
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        document.getElementById('historyList').innerHTML = '<p style="color:#f87171; text-align:center;">Gagal terhubung ke database.</p>';
    }
}

window.showForm = function(type) {
    const section = document.getElementById('inputSection');
    section.style.display = 'block';
    document.getElementById('txType').value = type;
    
    const title = document.getElementById('formTitle');
    if(type === 'income') {
        title.innerText = 'Catat Pemasukan';
        title.style.color = '#4ade80';
    } else {
        title.innerText = 'Catat Pengeluaran';
        title.style.color = '#f87171';
    }
}

window.submitTransaction = async function() {
    const rawAmount = document.getElementById('txAmount').value;
    const amount = rawAmount.replace(/\./g, '');
    const desc = document.getElementById('txDesc').value;
    const type = document.getElementById('txType').value;

    if(!amount || !desc) return alert("Isi nominal dan keterangan dulu!");

    const btn = document.querySelector('.btn-submit');
    btn.innerText = 'Menyimpan...';

    try {
        const res = await fetch('/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, amount, desc })
        });
        const data = await res.json();
        
        if(data.success) {
            document.getElementById('txAmount').value = '';
            document.getElementById('txDesc').value = '';
            document.getElementById('inputSection').style.display = 'none';
            btn.innerText = 'Simpan ke Database';
            loadWallet(); 
        }
    } catch (error) {
        alert("Gagal menyimpan ke server!");
        btn.innerText = 'Simpan ke Database';
    }
}
