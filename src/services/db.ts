import { Booking, Member, FinancialRecord, AppSettings } from '../types';

// Default App Settings
const DEFAULT_SETTINGS: AppSettings = {
  adminName: 'Fazada Badminton Admin',
  adminPhone: '081234567890',
  qrisCodeUrl: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=400&auto=format&fit=crop&q=60', // Mock QRIS visual
  hargaPerJam: 30000,
  bankName: 'BCA',
  bankAccountNumber: '1234567890',
  logoUrl: '',
};

// Key names for LocalStorage
const STORAGE_KEYS = {
  BOOKINGS: 'fazada_bookings',
  MEMBERS: 'fazada_members',
  FINANCIALS: 'fazada_financials',
  SETTINGS: 'fazada_settings',
  SHEET_ID: 'fazada_google_sheet_id',
};

// Initial/Mock Data for the app when starting fresh
const INITIAL_MEMBERS: Member[] = [
  { id: 'M-1', nama: 'Andi Pratama', noHp: '08129876543', tanggalDaftar: '2026-06-20' },
  { id: 'M-2', nama: 'Budi Santoso', noHp: '08571234567', tanggalDaftar: '2026-06-21' },
  { id: 'M-3', nama: 'Citra Kirana', noHp: '08998887776', tanggalDaftar: '2026-06-22' },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'B-1001',
    pemesan: 'Andi Pratama',
    noHp: '08129876543',
    lapangan: 'Lapangan 1',
    tanggal: '2026-06-24',
    jam: '08:00 - 09:00',
    metodePembayaran: 'QRIS',
    status: 'Lunas',
    totalBayar: 50000,
    waktuPemesanan: '2026-06-23 15:30:00',
  },
  {
    id: 'B-1002',
    pemesan: 'Faza Pratama',
    noHp: '087766554433',
    lapangan: 'Lapangan 2',
    tanggal: '2026-06-24',
    jam: '10:00 - 11:00',
    metodePembayaran: 'DANA',
    status: 'Lunas',
    totalBayar: 50000,
    waktuPemesanan: '2026-06-23 18:20:00',
  },
  {
    id: 'B-1003',
    pemesan: 'Dewi Sartika',
    noHp: '081344556677',
    lapangan: 'Lapangan 1',
    tanggal: '2026-06-24',
    jam: '19:00 - 20:00',
    metodePembayaran: 'Transfer Bank',
    status: 'Menunggu Pembayaran',
    totalBayar: 50000,
    waktuPemesanan: '2026-06-23 20:15:00',
  }
];

const INITIAL_FINANCIALS: FinancialRecord[] = [
  { id: 'F-1', bookingId: 'B-1001', kategori: 'Pemasukan Lapangan', jumlah: 50000, tipe: 'Pemasukan', tanggal: '2026-06-24', keterangan: 'Booking Lapangan 1 - Andi Pratama' },
  { id: 'F-2', bookingId: 'B-1002', kategori: 'Pemasukan Lapangan', jumlah: 50000, tipe: 'Pemasukan', tanggal: '2026-06-24', keterangan: 'Booking Lapangan 2 - Faza Pratama' },
  { id: 'F-3', kategori: 'Pengeluaran Operasional', jumlah: 15000, tipe: 'Pengeluaran', tanggal: '2026-06-23', keterangan: 'Beli shuttlecock baru' },
];

export class DBService {
  // Load initial settings
  static getSettings(): AppSettings {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Bookings management
  static getBookings(): Booking[] {
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_BOOKINGS; }
    }
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    return INITIAL_BOOKINGS;
  }

  static saveBookings(bookings: Booking[]) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  // Members management
  static getMembers(): Member[] {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_MEMBERS; }
    }
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
    return INITIAL_MEMBERS;
  }

  static saveMembers(members: Member[]) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }

  // Financials management
  static getFinancials(): FinancialRecord[] {
    const saved = localStorage.getItem(STORAGE_KEYS.FINANCIALS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_FINANCIALS; }
    }
    localStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(INITIAL_FINANCIALS));
    return INITIAL_FINANCIALS;
  }

  static saveFinancials(financials: FinancialRecord[]) {
    localStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(financials));
  }

  // Google Sheet integration helpers
  static getStoredSheetId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SHEET_ID);
  }

  static saveStoredSheetId(id: string) {
    localStorage.setItem(STORAGE_KEYS.SHEET_ID, id);
  }

  // Find or Create Google Spreadsheet
  static async findOrCreateSpreadsheet(accessToken: string): Promise<string> {
    try {
      // 1. Search for existing spreadsheet
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='Fazada Badminton Database' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const id = searchData.files[0].id;
        this.saveStoredSheetId(id);
        return id;
      }

      // 2. Not found, create a new spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: 'Fazada Badminton Database' },
          sheets: [
            { properties: { title: 'Bookings' } },
            { properties: { title: 'Members' } },
            { properties: { title: 'Financials' } },
            { properties: { title: 'Settings' } },
          ],
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error?.message || 'Gagal membuat Google Spreadsheet');
      }

      const newId = createData.spreadsheetId;
      this.saveStoredSheetId(newId);

      // Initialize headers on the new sheets
      await this.initGoogleSheetHeaders(accessToken, newId);

      return newId;
    } catch (error) {
      console.error('Error in findOrCreateSpreadsheet:', error);
      throw error;
    }
  }

  // Write sheet headers
  private static async initGoogleSheetHeaders(accessToken: string, spreadsheetId: string) {
    const headers = {
      'Bookings!A1:J1': [['ID', 'Pemesan', 'No HP', 'Lapangan', 'Tanggal', 'Jam', 'Metode Pembayaran', 'Status', 'Total Bayar', 'Waktu Pemesanan']],
      'Members!A1:E1': [['ID', 'Nama', 'No HP', 'Tanggal Daftar', 'Biaya Sewa']],
      'Financials!A1:G1': [['ID', 'Booking ID', 'Kategori', 'Jumlah', 'Tipe', 'Tanggal', 'Keterangan']],
      'Settings!A1:G1': [['Admin Name', 'Admin Phone', 'Harga Per Jam', 'QRIS Url', 'Nama Bank', 'No Rekening Bank', 'Logo Url']],
    };

    for (const [range, values] of Object.entries(headers)) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
    }

    // Initialize default settings row
    const defaultSettingsValues = [[
      DEFAULT_SETTINGS.adminName,
      DEFAULT_SETTINGS.adminPhone,
      DEFAULT_SETTINGS.hargaPerJam.toString(),
      DEFAULT_SETTINGS.qrisCodeUrl,
      DEFAULT_SETTINGS.bankName,
      DEFAULT_SETTINGS.bankAccountNumber,
      DEFAULT_SETTINGS.logoUrl || '',
    ]];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:G2?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: defaultSettingsValues }),
      }
    );
  }

  // Push Local Data to Google Sheets (Full Sync)
  static async syncLocalToGoogleSheets(accessToken: string, spreadsheetId: string): Promise<boolean> {
    try {
      const bookings = this.getBookings();
      const members = this.getMembers();
      const financials = this.getFinancials();
      const settings = this.getSettings();

      // Formats data arrays
      const bookingValues = [
        ['ID', 'Pemesan', 'No HP', 'Lapangan', 'Tanggal', 'Jam', 'Metode Pembayaran', 'Status', 'Total Bayar', 'Waktu Pemesanan'],
        ...bookings.map(b => [b.id, b.pemesan, b.noHp, b.lapangan, b.tanggal, b.jam, b.metodePembayaran, b.status, b.totalBayar.toString(), b.waktuPemesanan])
      ];

      const memberValues = [
        ['ID', 'Nama', 'No HP', 'Tanggal Daftar', 'Biaya Sewa'],
        ...members.map(m => [m.id, m.nama, m.noHp, m.tanggalDaftar, (m.biayaSewa || 0).toString()])
      ];

      const financialValues = [
        ['ID', 'Booking ID', 'Kategori', 'Jumlah', 'Tipe', 'Tanggal', 'Keterangan'],
        ...financials.map(f => [f.id, f.bookingId || '', f.kategori, f.jumlah.toString(), f.tipe, f.tanggal, f.keterangan])
      ];

      const settingsValues = [
        ['Admin Name', 'Admin Phone', 'Harga Per Jam', 'QRIS Url', 'Nama Bank', 'No Rekening Bank', 'Logo Url'],
        [settings.adminName, settings.adminPhone, settings.hargaPerJam.toString(), settings.qrisCodeUrl, settings.bankName || '', settings.bankAccountNumber || '', settings.logoUrl || '']
      ];

      // Overwrite the sheets completely with the synchronized arrays
      const payloads = [
        { range: 'Bookings!A1:J1000', values: bookingValues },
        { range: 'Members!A1:E1000', values: memberValues },
        { range: 'Financials!A1:G1000', values: financialValues },
        { range: 'Settings!A1:G2', values: settingsValues },
      ];

      for (const payload of payloads) {
        // Clear range first to prevent stale row leftovers
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${payload.range.split('!')[0]}!A1:Z1000:clear`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        // Put new values
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${payload.range}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: payload.values }),
          }
        );
        if (!res.ok) {
          throw new Error(`Failed to update ${payload.range}`);
        }
      }

      return true;
    } catch (e) {
      console.error('Error syncing local to Google Sheets:', e);
      return false;
    }
  }

  // Pull Google Sheets Data to Local Storage
  static async syncGoogleSheetsToLocal(accessToken: string, spreadsheetId: string): Promise<{
    bookings: Booking[];
    members: Member[];
    financials: FinancialRecord[];
    settings: AppSettings;
  }> {
    try {
      const fetchRange = async (range: string) => {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        return data.values || [];
      };

      const [bookingRows, memberRows, financialRows, settingsRows] = await Promise.all([
        fetchRange('Bookings!A2:J1000'),
        fetchRange('Members!A2:E1000'),
        fetchRange('Financials!A2:G1000'),
        fetchRange('Settings!A2:G2'),
      ]);

      // Parse bookings
      const bookings: Booking[] = bookingRows.map((row: string[], index: number) => ({
        id: row[0] || `B-SHEET-${index}`,
        pemesan: row[1] || '',
        noHp: row[2] || '',
        lapangan: (row[3] === 'Lapangan 2' ? 'Lapangan 2' : 'Lapangan 1') as Booking['lapangan'],
        tanggal: row[4] || '',
        jam: row[5] || '',
        metodePembayaran: (row[6] || 'QRIS') as Booking['metodePembayaran'],
        status: (row[7] || 'Menunggu Pembayaran') as Booking['status'],
        totalBayar: parseInt(row[8]) || 50000,
        waktuPemesanan: row[9] || '',
      }));

      // Parse members
      const members: Member[] = memberRows.map((row: string[], index: number) => ({
        id: row[0] || `M-SHEET-${index}`,
        nama: row[1] || '',
        noHp: row[2] || '',
        tanggalDaftar: row[3] || '',
        biayaSewa: parseInt(row[4]) || undefined,
      }));

      // Parse financials
      const financials: FinancialRecord[] = financialRows.map((row: string[], index: number) => ({
        id: row[0] || `F-SHEET-${index}`,
        bookingId: row[1] || undefined,
        kategori: (row[2] || 'Pemasukan Lapangan') as FinancialRecord['kategori'],
        jumlah: parseInt(row[3]) || 0,
        tipe: (row[4] || 'Pemasukan') as FinancialRecord['tipe'],
        tanggal: row[5] || '',
        keterangan: row[6] || '',
      }));

      // Parse settings
      let settings: AppSettings = DEFAULT_SETTINGS;
      if (settingsRows && settingsRows.length > 0) {
        const sRow = settingsRows[0];
        settings = {
          adminName: sRow[0] || DEFAULT_SETTINGS.adminName,
          adminPhone: sRow[1] || DEFAULT_SETTINGS.adminPhone,
          hargaPerJam: parseInt(sRow[2]) || DEFAULT_SETTINGS.hargaPerJam,
          qrisCodeUrl: sRow[3] || DEFAULT_SETTINGS.qrisCodeUrl,
          bankName: sRow[4] || DEFAULT_SETTINGS.bankName,
          bankAccountNumber: sRow[5] || DEFAULT_SETTINGS.bankAccountNumber,
          logoUrl: sRow[6] || DEFAULT_SETTINGS.logoUrl,
        };
      }

      // Save to local storage to persist
      if (bookings.length > 0) this.saveBookings(bookings);
      if (members.length > 0) this.saveMembers(members);
      if (financials.length > 0) this.saveFinancials(financials);
      this.saveSettings(settings);

      return { bookings, members, financials, settings };
    } catch (e) {
      console.error('Error syncing Google Sheets to local:', e);
      throw e;
    }
  }
}
