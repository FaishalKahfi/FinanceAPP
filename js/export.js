/* ============================================
   FinanceKu - Export / Import Module
   ============================================ */

const ExportUtil = {
  // ---- Export Report to PDF ----
  async exportReportPDF(reportType) {
    const elementId = this.getReportElementId(reportType);
    const element = document.getElementById(elementId);

    if (!element || element.innerHTML.includes('empty-state')) {
      UI.warning('Tidak ada data untuk diekspor');
      return;
    }

    UI.showLoading();

    try {
      const title = this.getReportTitle(reportType);
      const dateRange = this.getDateRangeText();

      const wrapper = document.createElement('div');
      wrapper.style.padding = '20px';
      wrapper.style.fontFamily = 'Inter, sans-serif';
      wrapper.innerHTML = `
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1E3A8A;margin:0 0 4px">${title}</h2>
          <p style="color:#6B7280;font-size:13px;margin:0">${dateRange}</p>
          <p style="color:#6B7280;font-size:12px;margin:4px 0 0">Dicetak pada: ${UI.formatDateFull(new Date())}</p>
        </div>
        ${element.innerHTML}
      `;

      // Style the table for PDF
      wrapper.querySelectorAll('table').forEach(t => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
        t.style.fontSize = '12px';
      });
      wrapper.querySelectorAll('th, td').forEach(cell => {
        cell.style.padding = '8px 12px';
        cell.style.borderBottom = '1px solid #E5E7EB';
      });
      wrapper.querySelectorAll('th').forEach(th => {
        th.style.backgroundColor = '#F9FAFB';
        th.style.fontWeight = '600';
        th.style.textAlign = 'left';
      });

      const opt = {
        margin: 10,
        filename: `FinanceKu_${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(wrapper).save();
      UI.success('PDF berhasil diunduh');
    } catch (err) {
      UI.error('Gagal mengekspor PDF: ' + err.message);
    } finally {
      UI.hideLoading();
    }
  },

  // ---- Export Report to Excel ----
  async exportReportExcel(reportType) {
    const elementId = this.getReportElementId(reportType);
    const tableEl = document.querySelector(`#${elementId} table`) || document.getElementById(elementId);

    if (!tableEl || tableEl.innerHTML.includes('empty-state')) {
      UI.warning('Tidak ada data untuk diekspor');
      return;
    }

    try {
      const title = this.getReportTitle(reportType);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.table_to_sheet(tableEl.tagName === 'TABLE' ? tableEl : tableEl.querySelector('table'));
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));

      XLSX.writeFile(wb, `FinanceKu_${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      UI.success('Excel berhasil diunduh');
    } catch (err) {
      UI.error('Gagal mengekspor Excel: ' + err.message);
    }
  },

  // ---- Backup to JSON ----
  async backupToJSON() {
    try {
      UI.showLoading();
      const data = await DB.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinanceKu_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.hideLoading();
      UI.success('Backup berhasil diunduh');
    } catch (err) {
      UI.hideLoading();
      UI.error('Gagal membuat backup: ' + err.message);
    }
  },

  // ---- Restore from JSON ----
  async restoreFromJSON() {
    const confirmed = await UI.confirm(
      'Restore data dari file backup?',
      'Semua data saat ini akan DIGANTI dengan data dari file backup. Pastikan Anda sudah mem-backup data yang ada.'
    );
    if (!confirmed) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        UI.showLoading();
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.appName || data.appName !== 'FinanceKu') {
          throw new Error('File bukan backup FinanceKu yang valid');
        }

        await DB.importAllData(data);
        UI.hideLoading();
        UI.success('Data berhasil di-restore! Halaman akan dimuat ulang.');

        // Reload after restore
        setTimeout(() => {
          Auth.logout();
        }, 1500);
      } catch (err) {
        UI.hideLoading();
        UI.error('Gagal restore: ' + err.message);
      }
    };

    input.click();
  },

  // ---- Helpers ----
  getReportElementId(reportType) {
    const map = {
      ledger: 'ledger-table-body',
      profitloss: 'profitloss-content',
      cashflow: 'cashflow-content'
    };
    return map[reportType] || 'ledger-table-body';
  },

  getReportTitle(reportType) {
    const map = {
      ledger: 'Buku Besar (General Ledger)',
      profitloss: 'Laporan Laba Rugi',
      cashflow: 'Laporan Arus Kas'
    };
    return map[reportType] || 'Laporan';
  },

  getDateRangeText() {
    const start = document.getElementById('report-filter-start')?.value;
    const end = document.getElementById('report-filter-end')?.value;
    if (start && end) {
      return `Periode: ${UI.formatDate(start)} - ${UI.formatDate(end)}`;
    } else if (start) {
      return `Dari: ${UI.formatDate(start)}`;
    } else if (end) {
      return `Sampai: ${UI.formatDate(end)}`;
    }
    return 'Semua Periode';
  }
};
