let walletChart = null; // Variabel global buat nampung grafik

document.addEventListener("DOMContentLoaded", () => {
    loadWallet();

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
        
        // 1. UPDATE SALDO UTAMA
        document.getElementById('balanceText').innerText = formatRupiah(data.balance);
        
        // 2. HITUNG LAPORAN BULAN INI & PERSIAPKAN DATA GRAFIK
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthIncome = 0;
        let monthExpense = 0;

        // Bikin template untuk grafik 7 hari terakhir
        const labels7Days = [];
        const dataIncome7Days = [];
        const dataExpense7Days = [];
        
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels7Days.push(d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
            dataIncome7Days.push(0);
            dataExpense7Days.push(0);
        }

        data.txs.forEach(tx => {
            const txDate = new Date(tx.date);
            
            // Logika Rekap Bulanan
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                if (tx.type === 'income') monthIncome += tx.amount;
                else monthExpense += tx.amount;
            }

            // Logika Grafik 7 Hari
            const dateStr = txDate.toLocaleDateString('id-ID', {day:'numeric', month:'short'});
            const idx = labels7Days.indexOf(dateStr);
            if(idx !== -1) {
                if (tx.type === 'income') dataIncome7Days[idx] += tx.amount;
                else dataExpense7Days[idx] += tx.amount;
            }
        });

        document.getElementById('monthIncomeText').innerText = formatRupiah(monthIncome);
        document.getElementById('monthExpenseText').innerText = formatRupiah(monthExpense);

        // Gambar Grafik Chart.js
        renderChart(labels7Days, dataIncome7Days, dataExpense7Days);
        
        // 3. RENDER RIWAYAT KE BAWAH
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

// FUNGSI MENGGAMBAR GRAFIK
function renderChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('walletChart').getContext('2d');
    
    // Hapus grafik lama kalau udah ada (biar gak numpuk pas nambah transaksi)
    if(walletChart) {
        walletChart.destroy();
    }

    walletChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    backgroundColor: '#4ade80',
                    borderRadius: 4,
                    barPercentage: 0.6
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    backgroundColor: '#f87171',
                    borderRadius: 4,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Sembunyiin judul legenda biar gak penuh
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: '#888', font: {size: 10} }
                },
                y: { 
                    grid: { color: '#27272a' },
                    ticks: { color: '#888', font: {size: 10}, callback: function(value) { return value/1000 + 'K'; } } // Disingkat misal 50.000 jadi 50K
                }
            }
        }
    });
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
            loadWallet(); // Panggil ulang untuk merefresh Saldo, Laporan, Grafik, dan History
        }
    } catch (error) {
        alert("Gagal menyimpan ke server!");
        btn.innerText = 'Simpan ke Database';
    }
}
