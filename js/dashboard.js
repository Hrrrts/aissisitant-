document.addEventListener("DOMContentLoaded", () => {
    loadWidgets();
});

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

async function loadWidgets() {
    // 1. WIDGET DOMPET
    try {
        const walletRes = await fetch('/api/wallet');
        const walletData = await walletRes.json();
        document.getElementById('widSaldo').innerText = formatRupiah(walletData.balance || 0);
    } catch (e) { document.getElementById('widSaldo').innerText = 'Error'; }

    // 2. WIDGET IBADAH (Cerdas baca jam)
    try {
        const ibadahRes = await fetch('/api/ibadah');
        const ibadahData = await ibadahRes.json();
        const solat = ibadahData.today ? (ibadahData.today.solat || {}) : {};
        
        const hour = new Date().getHours();
        let targetSolat = '';
        let targetName = '';

        if (hour >= 4 && hour < 11) { targetSolat = 'subuh'; targetName = 'Subuh'; }
        else if (hour >= 11 && hour < 15) { targetSolat = 'dzuhur'; targetName = 'Dzuhur'; }
        else if (hour >= 15 && hour < 18) { targetSolat = 'ashar'; targetName = 'Ashar'; }
        else if (hour >= 18 && hour < 19) { targetSolat = 'maghrib'; targetName = 'Maghrib'; }
        else { targetSolat = 'isya'; targetName = 'Isya'; }

        const widIbadahText = document.getElementById('widIbadah');
        const widIbadahSub = document.getElementById('widIbadahSub');

        if (solat[targetSolat]) {
            widIbadahText.innerText = `Udah ${targetName} ✓`;
            widIbadahText.style.color = '#4ade80';
            widIbadahSub.innerText = 'Alhamdulillah aman!';
        } else {
            widIbadahText.innerText = `Belum ${targetName}!`;
            widIbadahText.style.color = '#f87171';
            widIbadahSub.innerText = 'Waktunya salat bro';
        }
    } catch (e) { document.getElementById('widIbadah').innerText = 'Error'; }

    // 3. WIDGET MUSIC (Dari LocalStorage)
    const history = JSON.parse(localStorage.getItem('ais_search_history')) || [];
    const widMusic = document.getElementById('widMusic');
    if (history.length > 0) {
        widMusic.innerText = history[0];
    } else {
        widMusic.innerText = "Belum muter lagu";
    }

    // 4. WIDGET JURNAL
    try {
        const journalRes = await fetch('/api/journal');
        const journals = await journalRes.json();
        const todayStr = new Date().toLocaleDateString('id-ID');
        
        const hasToday = journals.some(j => new Date(j.date).toLocaleDateString('id-ID') === todayStr);
        const widJurnal = document.getElementById('widJurnal');
        
        if (hasToday) {
            widJurnal.innerText = "Sudah nulis hari ini 📖";
            widJurnal.style.color = '#4ade80';
        } else {
            widJurnal.innerText = "Kosong, nyatet apa hari ini?";
            widJurnal.style.color = '#fbbf24';
        }
    } catch (e) {}
}
