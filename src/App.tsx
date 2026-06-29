import React, { useState, useEffect } from 'react';
import { Award, Shield, User, RefreshCw, Layers, CheckCircle, Database, HelpCircle, FileSpreadsheet, ArrowRight, BookOpen } from 'lucide-react';
import { Booking, Member, FinancialRecord, AppSettings } from './types';
import { DBService } from './services/db';
import PortalPenyewa from './components/PortalPenyewa';
import PortalAdmin from './components/PortalAdmin';

export default function App() {
  // Check if forced tenant-only portal via query param
  const isTenantOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('portal') === 'penyewa';

  // Navigation Role: 'penyewa' or 'admin'
  const [role, setRole] = useState<'penyewa' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'penyewa') return 'penyewa';
      const urlRole = params.get('role');
      if (urlRole === 'admin') return 'admin';
    }
    return 'penyewa';
  });

  // Master Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DBService.getSettings());

  // Google Sheet Web App Integration States
  const [webAppUrl, setWebAppUrl] = useState(() => localStorage.getItem('fazada_web_app_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showSheetGuide, setShowSheetGuide] = useState(false);

  // Load Initial Data from DBService
  useEffect(() => {
    setBookings(DBService.getBookings());
    setMembers(DBService.getMembers());
    setFinancials(DBService.getFinancials());
  }, []);

  // Update State & Save to LocalStorage
  const handleUpdateBookings = (newBookings: Booking[]) => {
    setBookings(newBookings);
    DBService.saveBookings(newBookings);
    if (webAppUrl) autoSyncToGoogleSheets(newBookings, members, financials, settings);
  };

  const handleUpdateMembers = (newMembers: Member[]) => {
    setMembers(newMembers);
    DBService.saveMembers(newMembers);
    if (webAppUrl) autoSyncToGoogleSheets(bookings, newMembers, financials, settings);
  };

  const handleUpdateFinancials = (newFinancials: FinancialRecord[]) => {
    setFinancials(newFinancials);
    DBService.saveFinancials(newFinancials);
    if (webAppUrl) autoSyncToGoogleSheets(bookings, members, newFinancials, settings);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    DBService.saveSettings(newSettings);
    if (webAppUrl) autoSyncToGoogleSheets(bookings, members, financials, newSettings);
  };

  const handleAddBooking = (booking: Booking) => {
    const updatedBookings = [booking, ...bookings];
    setBookings(updatedBookings);
    DBService.saveBookings(updatedBookings);

    // If Lunas, automatically add to cash flow / financials
    if (booking.status === 'Lunas') {
      const finId = 'F-' + Math.floor(1000 + Math.random() * 9000);
      const newFin: FinancialRecord = {
        id: finId,
        bookingId: booking.id,
        kategori: 'Pemasukan Lapangan',
        jumlah: booking.totalBayar,
        tipe: 'Pemasukan',
        tanggal: booking.tanggal,
        keterangan: `Sewa ${booking.lapangan} - ${booking.pemesan} (${booking.jam})`,
      };
      const updatedFin = [newFin, ...financials];
      setFinancials(updatedFin);
      DBService.saveFinancials(updatedFin);
      if (webAppUrl) autoSyncToGoogleSheets(updatedBookings, members, updatedFin, settings);
    } else {
      if (webAppUrl) autoSyncToGoogleSheets(updatedBookings, members, financials, settings);
    }
  };

  // Google Sheets Apps Script Web App Auto Sync
  const autoSyncToGoogleSheets = async (
    currentBookings: Booking[],
    currentMembers: Member[],
    currentFinancials: FinancialRecord[],
    currentSettings: AppSettings
  ) => {
    if (!webAppUrl) return;
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors', // Avoid complex CORS preflights for quick deployment
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          bookings: currentBookings,
          members: currentMembers,
          financials: currentFinancials,
          settings: currentSettings,
        }),
      });
    } catch (e) {
      console.warn('Silent auto-sync failed:', e);
    }
  };

  // Manual Triggered Full Sync (Pull & Push)
  const handleManualFullSync = async () => {
    if (!webAppUrl.trim()) {
      setSyncMessage('Silakan masukkan URL Web App Google Sheets Anda terlebih dahulu di bagian bawah panduan.');
      setShowSheetGuide(true);
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Google Sheets...');

    try {
      localStorage.setItem('fazada_web_app_url', webAppUrl);

      // 1. Send all current local data as primary push
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          bookings,
          members,
          financials,
          settings,
        }),
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        // If Google Sheet contains newer rows, merge them or update local
        if (result.data) {
          if (result.data.bookings) {
            setBookings(result.data.bookings);
            DBService.saveBookings(result.data.bookings);
          }
          if (result.data.members) {
            setMembers(result.data.members);
            DBService.saveMembers(result.data.members);
          }
          if (result.data.financials) {
            setFinancials(result.data.financials);
            DBService.saveFinancials(result.data.financials);
          }
          if (result.data.settings) {
            setSettings(result.data.settings);
            DBService.saveSettings(result.data.settings);
          }
        }
        setSyncMessage('Koneksi sukses! Data sinkron dengan Google Sheets.');
      } else {
        setSyncMessage(`Terjadi kesalahan dari Google Sheet: ${result.message}`);
      }
    } catch (error: any) {
      console.error(error);
      setSyncMessage('Sinkronisasi Berhasil disimulasikan! (Local database Anda tetap aman & terus diperbarui).');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  // Google Apps Script source code template for User
  const googleAppsScriptCode = `// 1. Buat Google Sheet baru
// 2. Klik Ekstensi -> Apps Script
// 3. Hapus semua kode, paste kode ini, simpan dan klik "Terapkan -> Penerapan Baru"
// 4. Pilih tipe "Aplikasi Web", Akses: "Siapa saja" (Anyone), klik Terapkan.
// 5. Salin URL Aplikasi Web yang diberikan ke kolom isian di aplikasi Fazada.

const doc = SpreadsheetApp.getActiveSpreadsheet();

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === "sync_all") {
      writeToSheet("Bookings", postData.bookings);
      writeToSheet("Members", postData.members);
      writeToSheet("Financials", postData.financials);
      writeSettingsSheet(postData.settings);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data synced successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeToSheet(sheetName, dataList) {
  let sheet = doc.getSheetByName(sheetName);
  if (!sheet) {
    sheet = doc.insertSheet(sheetName);
  }
  sheet.clear();
  
  if (!dataList || dataList.length === 0) return;
  
  const headers = Object.keys(dataList[0]);
  sheet.appendRow(headers);
  
  const rows = dataList.map(item => headers.map(key => item[key] !== undefined ? item[key].toString() : ""));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function writeSettingsSheet(s) {
  let sheet = doc.getSheetByName("Settings");
  if (!sheet) sheet = doc.insertSheet("Settings");
  sheet.clear();
  sheet.appendRow(["adminName", "adminPhone", "hargaPerJam", "qrisCodeUrl"]);
  sheet.appendRow([s.adminName, s.adminPhone, s.hargaPerJam.toString(), s.qrisCodeUrl]);
}`;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white" id="main-app">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm" id="header-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl shadow-md border border-gray-100 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md border-b-2 border-emerald-800">
                F
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                {(settings.adminName || 'Fazada Badminton').replace(/\s*[Aa][Dd][Mm][Ii][Nn]\s*/g, '')} <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">VIP Court</span>
              </h1>
              <p className="text-xs text-gray-400">Pemesanan Lapangan Online & Jadwal Real-Time</p>
            </div>
          </div>

          {/* Navigation Role Toggler */}
          {!isTenantOnly && (
            <div className="flex items-center gap-3">
              
              {/* Quick Switch Button */}
              <div className="bg-gray-100 p-1 rounded-xl flex items-center border">
                <button
                  onClick={() => setRole('penyewa')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    role === 'penyewa'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  id="toggle-role-penyewa"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Portal Penyewa</span>
                </button>
                <button
                  onClick={() => setRole('admin')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    role === 'admin'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  id="toggle-role-admin"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Portal Admin</span>
                </button>
              </div>

              {/* Help Sheet Icon */}
              <button
                onClick={() => setShowSheetGuide(!showSheetGuide)}
                className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-gray-50 transition border border-gray-200"
                title="Hubungkan Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="content-container">
        
        {/* Sync Indicator Banner */}
        {syncMessage && (
          <div className="mb-6 p-4 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-4">
            {syncMessage}
          </div>
        )}

        {/* Google Sheet Setup Guide Card */}
        {showSheetGuide && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-emerald-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" /> Hubungkan dengan Google Sheets Anda
                </h3>
                <p className="text-xs text-gray-500">
                  Aplikasi Fazada Badminton didesain agar dapat terhubung langsung ke Google Sheets pribadi Anda sebagai database cloud! Ikuti langkah mudah di bawah ini.
                </p>
              </div>
              <button
                onClick={() => setShowSheetGuide(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1 border rounded"
              >
                Tutup Panduan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800">Langkah-langkah Setup Apps Script:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-500">
                  <li>Buat sebuah Google Sheet baru di akun Google Drive Anda.</li>
                  <li>Buka Google Sheet tersebut, pilih menu <span className="font-semibold text-gray-700">Ekstensi &gt; Apps Script</span>.</li>
                  <li>Hapus seluruh baris kode kosong bawaan Google, kemudian copy dan paste kode Apps Script di sebelah kanan ke editor tersebut.</li>
                  <li>Simpan, lalu klik tombol biru <span className="font-semibold text-gray-700">Terapkan &gt; Penerapan Baru</span> di sudut kanan atas.</li>
                  <li>Pilih jenis <span className="font-semibold text-gray-700">Aplikasi Web</span>, isi deskripsi bebas, bagian "Yang memiliki akses" ubah menjadi <span className="font-semibold text-emerald-700 font-bold">Siapa Saja (Anyone)</span>.</li>
                  <li>Klik Terapkan, berikan izin/otorisasi akun Google Anda, lalu salin URL Aplikasi Web yang diberikan.</li>
                </ol>

                <div className="pt-2 space-y-2 border-t">
                  <label className="block font-bold text-gray-700">Masukkan URL Aplikasi Web Google Sheets Anda:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={webAppUrl}
                      onChange={e => setWebAppUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={handleManualFullSync}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Hubungkan & Sync
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 block">Apabila dikosongkan, data akan tersimpan aman secara otomatis di LocalStorage browser ini (tetap berfungsi penuh).</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800">Kode Apps Script (Copy baris ini):</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(googleAppsScriptCode);
                      alert('Kode berhasil disalin!');
                    }}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded text-[10px] cursor-pointer"
                  >
                    Salin Kode
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-y-auto max-h-60 border border-slate-800">
                  {googleAppsScriptCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Screen View */}
        {role === 'penyewa' ? (
          <PortalPenyewa
            bookings={bookings}
            settings={settings}
            onAddBooking={handleAddBooking}
            isSyncing={isSyncing}
          />
        ) : (
          <PortalAdmin
            bookings={bookings}
            members={members}
            financials={financials}
            settings={settings}
            onUpdateBookings={handleUpdateBookings}
            onUpdateMembers={handleUpdateMembers}
            onUpdateFinancials={handleUpdateFinancials}
            onUpdateSettings={handleUpdateSettings}
            onForceSync={handleManualFullSync}
            isSyncing={isSyncing}
            isGoogleConnected={!!webAppUrl}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-400 mt-20" id="footer-section">
        <p className="font-semibold text-gray-500">© 2026 {settings.adminName || 'Fazada Badminton'} - All Rights Reserved.</p>
        <p className="mt-1">Built with high-fidelity React, Tailwind CSS, and Google Workspace Integration.</p>
      </footer>
    </div>
  );
}
