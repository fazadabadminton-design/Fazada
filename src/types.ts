export interface Member {
  id: string;
  nama: string;
  noHp: string;
  tanggalDaftar: string;
  biayaSewa?: number; // Nilai sewa khusus member (misal per pertemuan/rutin)
}

export interface Booking {
  id: string;
  pemesan: string;
  noHp: string;
  lapangan: 'Lapangan 1' | 'Lapangan 2';
  tanggal: string; // YYYY-MM-DD
  jam: string; // e.g., "08:00 - 09:00"
  metodePembayaran: 'QRIS' | 'DANA' | 'OVO' | 'Transfer Bank';
  status: 'Menunggu Pembayaran' | 'Lunas' | 'Dibatalkan';
  totalBayar: number;
  waktuPemesanan: string;
}

export interface FinancialRecord {
  id: string;
  bookingId?: string;
  kategori: 'Pemasukan Lapangan' | 'Pemasukan Kantin' | 'Pengeluaran Operasional' | 'Lain-lain';
  jumlah: number;
  tipe: 'Pemasukan' | 'Pengeluaran';
  tanggal: string;
  keterangan: string;
}

export interface AppSettings {
  adminName: string;
  adminPhone: string;
  qrisCodeUrl: string; // QRIS barcode or base64
  hargaPerJam: number;
  bankName: string;
  bankAccountNumber: string;
  logoUrl?: string; // Optional URL for admin logo
}
