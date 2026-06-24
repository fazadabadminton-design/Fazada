import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, DollarSign, Settings, Plus, Search, Trash2, Edit2, Check, RefreshCw, Smartphone, Sliders, ChevronDown, Award, TrendingUp, Calendar, Upload, Image } from 'lucide-react';
import { Booking, Member, FinancialRecord, AppSettings } from '../types';

interface PortalAdminProps {
  bookings: Booking[];
  members: Member[];
  financials: FinancialRecord[];
  settings: AppSettings;
  onUpdateBookings: (bookings: Booking[]) => void;
  onUpdateMembers: (members: Member[]) => void;
  onUpdateFinancials: (financials: FinancialRecord[]) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onForceSync: () => Promise<void>;
  isSyncing: boolean;
  isGoogleConnected: boolean;
}

export default function PortalAdmin({
  bookings,
  members,
  financials,
  settings,
  onUpdateBookings,
  onUpdateMembers,
  onUpdateFinancials,
  onUpdateSettings,
  onForceSync,
  isSyncing,
  isGoogleConnected,
}: PortalAdminProps) {
  // Navigation tabs: 'dashboard' | 'members' | 'bookings' | 'finance' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'members' | 'bookings' | 'finance' | 'settings'>('dashboard');

  // Input states for Members
  const [memberSearch, setMemberSearch] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBiayaSewa, setNewMemberBiayaSewa] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Edit member states
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberBiayaSewa, setEditMemberBiayaSewa] = useState('');

  // Input states for Member Recurring Booking
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedMemberForRecurring, setSelectedMemberForRecurring] = useState<Member | null>(null);
  const [recurringCourt, setRecurringCourt] = useState<'Lapangan 1' | 'Lapangan 2'>('Lapangan 1');
  const [recurringStartDate, setRecurringStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recurringJam, setRecurringJam] = useState('08:00 - 09:00');
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurringOccurrences, setRecurringOccurrences] = useState<number>(4);
  const [recurringPayment, setRecurringPayment] = useState<Booking['metodePembayaran']>('Transfer Bank');
  const [recurringStatus, setRecurringStatus] = useState<Booking['status']>('Lunas');

  // Input states for Bookings (manual admin booking)
  const [bookingSearch, setBookingSearch] = useState('');
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCourt, setManualCourt] = useState<'Lapangan 1' | 'Lapangan 2'>('Lapangan 1');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualJam, setManualJam] = useState('08:00 - 09:00');
  const [manualPayment, setManualPayment] = useState<Booking['metodePembayaran']>('Transfer Bank');
  const [manualStatus, setManualStatus] = useState<Booking['status']>('Lunas');

  // Input states for Finance
  const [financeCategory, setFinanceCategory] = useState<FinancialRecord['kategori']>('Pemasukan Lapangan');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeType, setFinanceType] = useState<FinancialRecord['tipe']>('Pemasukan');
  const [financeDesc, setFinanceDesc] = useState('');
  const [showAddFinanceModal, setShowAddFinanceModal] = useState(false);

  // Settings states
  const [adminName, setAdminName] = useState(settings.adminName);
  const [adminPhone, setAdminPhone] = useState(settings.adminPhone);
  const [qrisUrl, setQrisUrl] = useState(settings.qrisCodeUrl);
  const [hargaPerJam, setHargaPerJam] = useState(settings.hargaPerJam.toString());
  const [bankName, setBankName] = useState(settings.bankName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(settings.bankAccountNumber || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');

  // Sync settings when props change
  useEffect(() => {
    setAdminName(settings.adminName);
    setAdminPhone(settings.adminPhone);
    setQrisUrl(settings.qrisCodeUrl);
    setHargaPerJam(settings.hargaPerJam.toString());
    setBankName(settings.bankName || '');
    setBankAccountNumber(settings.bankAccountNumber || '');
    setLogoUrl(settings.logoUrl || '');
  }, [settings]);

  // Computations for Dashboard Overview
  const dashboardStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const activeBookingsToday = bookings.filter(b => b.tanggal === todayStr && b.status !== 'Dibatalkan').length;
    const totalMembersCount = members.length;
    
    // Total income (from financial records)
    const incomeRecords = financials.filter(f => f.tipe === 'Pemasukan');
    const expenseRecords = financials.filter(f => f.tipe === 'Pengeluaran');
    
    const totalIncome = incomeRecords.reduce((sum, r) => sum + r.jumlah, 0);
    const totalExpense = expenseRecords.reduce((sum, r) => sum + r.jumlah, 0);
    const netProfit = totalIncome - totalExpense;

    return {
      activeBookingsToday,
      totalMembersCount,
      totalIncome,
      totalExpense,
      netProfit,
    };
  }, [bookings, members, financials]);

  // Financial Chart details (SVG representation of last 7 days of financials)
  const financialChartData = useMemo(() => {
    // Group records by last 7 days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      
      const dayRecords = financials.filter(f => f.tanggal === dayStr);
      const income = dayRecords.filter(r => r.tipe === 'Pemasukan').reduce((s, r) => s + r.jumlah, 0);
      const expense = dayRecords.filter(r => r.tipe === 'Pengeluaran').reduce((s, r) => s + r.jumlah, 0);
      
      result.push({ dayStr, label: dayLabel, income, expense });
    }
    return result;
  }, [financials]);

  // Max value for chart scaling
  const maxChartValue = useMemo(() => {
    const vals = financialChartData.map(d => Math.max(d.income, d.expense, 50000));
    return Math.max(...vals);
  }, [financialChartData]);

  // Members searching
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const s = memberSearch.toLowerCase();
    return members.filter(m => m.nama.toLowerCase().includes(s) || m.noHp.includes(s));
  }, [members, memberSearch]);

  // Bookings searching
  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    if (bookingSearch.trim()) {
      const s = bookingSearch.toLowerCase();
      list = list.filter(b => b.pemesan.toLowerCase().includes(s) || b.noHp.includes(s) || b.lapangan.toLowerCase().includes(s) || b.tanggal.includes(s));
    }
    // Sort chronologically (upcoming bookings first)
    return list.sort((a, b) => {
      const d1 = new Date(`${a.tanggal} ${a.jam.split(' ')[0]}`);
      const d2 = new Date(`${b.tanggal} ${b.jam.split(' ')[0]}`);
      return d2.getTime() - d1.getTime();
    });
  }, [bookings, bookingSearch]);

  // Add Member Action
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;

    const newMember: Member = {
      id: 'M-' + Math.floor(1000 + Math.random() * 9000),
      nama: newMemberName,
      noHp: newMemberPhone,
      tanggalDaftar: new Date().toISOString().split('T')[0],
      biayaSewa: newMemberBiayaSewa ? parseInt(newMemberBiayaSewa, 10) : undefined,
    };

    onUpdateMembers([newMember, ...members]);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberBiayaSewa('');
    setShowAddMemberModal(false);
  };

  // Edit Member Helpers
  const handleOpenEditMember = (member: Member) => {
    setEditingMember(member);
    setEditMemberName(member.nama);
    setEditMemberPhone(member.noHp);
    setEditMemberBiayaSewa(member.biayaSewa ? member.biayaSewa.toString() : '');
    setShowEditMemberModal(true);
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const updatedMembers = members.map(m => {
      if (m.id === editingMember.id) {
        return {
          ...m,
          nama: editMemberName,
          noHp: editMemberPhone,
          biayaSewa: editMemberBiayaSewa ? parseInt(editMemberBiayaSewa, 10) : undefined,
        };
      }
      return m;
    });

    onUpdateMembers(updatedMembers);
    setShowEditMemberModal(false);
    setEditingMember(null);
    setEditMemberName('');
    setEditMemberPhone('');
    setEditMemberBiayaSewa('');
  };

  // Open Recurring Booking Modal
  const handleOpenRecurringBooking = (member: Member) => {
    setSelectedMemberForRecurring(member);
    setRecurringCourt('Lapangan 1');
    setRecurringStartDate(new Date().toISOString().split('T')[0]);
    setRecurringJam('08:00 - 09:00');
    setRecurringFrequency('weekly');
    setRecurringOccurrences(4);
    setRecurringPayment('Transfer Bank');
    setRecurringStatus('Lunas');
    setShowRecurringModal(true);
  };

  // Add Recurring Booking
  const handleAddRecurringBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForRecurring) return;

    // Helper to generate dates
    const generateDates = (startDate: string, frequency: 'daily' | 'weekly' | 'monthly', occurrences: number): string[] => {
      const datesList: string[] = [];
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return [];

      for (let i = 0; i < occurrences; i++) {
        const current = new Date(start);
        if (frequency === 'daily') {
          current.setDate(start.getDate() + i);
        } else if (frequency === 'weekly') {
          current.setDate(start.getDate() + i * 7);
        } else if (frequency === 'monthly') {
          current.setMonth(start.getMonth() + i);
        }
        datesList.push(current.toISOString().split('T')[0]);
      }
      return datesList;
    };

    const proposedDates = generateDates(recurringStartDate, recurringFrequency, recurringOccurrences);
    if (proposedDates.length === 0) {
      alert('Tanggal mulai tidak valid.');
      return;
    }

    // Check conflicts for all proposed dates
    const conflicts: { date: string; conflictBy: string }[] = [];
    proposedDates.forEach(date => {
      const conflict = bookings.find(
        b => b.tanggal === date && b.lapangan === recurringCourt && b.jam === recurringJam && b.status !== 'Dibatalkan'
      );
      if (conflict) {
        conflicts.push({ date, conflictBy: conflict.pemesan });
      }
    });

    if (conflicts.length > 0) {
      const conflictMsg = conflicts.map(c => `- Tanggal ${c.date} (oleh ${c.conflictBy})`).join('\n');
      alert(`Gagal membuat jadwal rutin! Terdapat bentrok jadwal pada:\n${conflictMsg}\n\nSilakan pilih waktu, lapangan, atau tanggal mulai lain.`);
      return;
    }

    const newBookings: Booking[] = [];
    const newFinancials: FinancialRecord[] = [];
    const singlePrice = selectedMemberForRecurring.biayaSewa && selectedMemberForRecurring.biayaSewa > 0
      ? selectedMemberForRecurring.biayaSewa
      : (parseInt(hargaPerJam) || 30000);

    proposedDates.forEach((date, index) => {
      const bookingId = 'B-' + Math.floor(100000 + Math.random() * 900000);
      const newBooking: Booking = {
        id: bookingId,
        pemesan: selectedMemberForRecurring.nama,
        noHp: selectedMemberForRecurring.noHp,
        lapangan: recurringCourt,
        tanggal: date,
        jam: recurringJam,
        metodePembayaran: recurringPayment,
        status: recurringStatus,
        totalBayar: singlePrice,
        waktuPemesanan: new Date().toLocaleString('id-ID'),
      };
      newBookings.push(newBooking);

      if (recurringStatus === 'Lunas') {
        const finId = 'F-' + Math.floor(1000 + Math.random() * 9000);
        const newFin: FinancialRecord = {
          id: finId,
          bookingId: bookingId,
          kategori: 'Pemasukan Lapangan',
          jumlah: singlePrice,
          tipe: 'Pemasukan',
          tanggal: date,
          keterangan: `Sewa Rutin Member: ${selectedMemberForRecurring.nama} (${recurringCourt}, Sesi ${index + 1}/${recurringOccurrences})`,
        };
        newFinancials.push(newFin);
      }
    });

    onUpdateBookings([...newBookings, ...bookings]);
    if (newFinancials.length > 0) {
      onUpdateFinancials([...newFinancials, ...financials]);
    }

    alert(`Berhasil membuat ${proposedDates.length} jadwal rutin berturut-turut untuk member: ${selectedMemberForRecurring.nama}!`);
    setShowRecurringModal(false);
  };

  // Add Booking Action (Manual)
  const handleAddBookingManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) return;

    // Check conflict
    const conflict = bookings.find(
      b => b.tanggal === manualDate && b.lapangan === manualCourt && b.jam === manualJam && b.status !== 'Dibatalkan'
    );
    if (conflict) {
      alert(`Jadwal tabrakan! ${manualCourt} pada tanggal ${manualDate} jam ${manualJam} sudah di-booking oleh ${conflict.pemesan}`);
      return;
    }

    const bookingId = 'B-' + Math.floor(100000 + Math.random() * 900000);
    const newBooking: Booking = {
      id: bookingId,
      pemesan: manualName,
      noHp: manualPhone,
      lapangan: manualCourt,
      tanggal: manualDate,
      jam: manualJam,
      metodePembayaran: manualPayment,
      status: manualStatus,
      totalBayar: parseInt(hargaPerJam) || 50000,
      waktuPemesanan: new Date().toLocaleString('id-ID'),
    };

    // Update bookings list
    onUpdateBookings([newBooking, ...bookings]);

    // Add to financial if Lunas
    if (manualStatus === 'Lunas') {
      const finId = 'F-' + Math.floor(1000 + Math.random() * 9000);
      const newFin: FinancialRecord = {
        id: finId,
        bookingId: bookingId,
        kategori: 'Pemasukan Lapangan',
        jumlah: parseInt(hargaPerJam) || 50000,
        tipe: 'Pemasukan',
        tanggal: manualDate,
        keterangan: `Booking Lapangan ${manualCourt} - ${manualName} (Admin Input)`,
      };
      onUpdateFinancials([newFin, ...financials]);
    }

    // Reset fields
    setManualName('');
    setManualPhone('');
    setShowAddBookingModal(false);
  };

  // Action: Toggle booking status (Menunggu Pembayaran -> Lunas, or Lunas -> Menunggu Pembayaran, or Cancel)
  const handleUpdateBookingStatus = (id: string, newStatus: Booking['status']) => {
    const updated = bookings.map(b => {
      if (b.id === id) {
        // If changed to Lunas, create financial record if not already exists
        if (newStatus === 'Lunas' && b.status !== 'Lunas') {
          const finId = 'F-' + Math.floor(1000 + Math.random() * 9000);
          const newFin: FinancialRecord = {
            id: finId,
            bookingId: b.id,
            kategori: 'Pemasukan Lapangan',
            jumlah: b.totalBayar,
            tipe: 'Pemasukan',
            tanggal: b.tanggal,
            keterangan: `Sewa ${b.lapangan} - ${b.pemesan} (${b.jam})`,
          };
          onUpdateFinancials([newFin, ...financials]);
        }
        return { ...b, status: newStatus };
      }
      return b;
    });
    onUpdateBookings(updated);
  };

  // Action: Delete booking
  const handleDeleteBooking = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus booking ini?')) {
      const updatedBookings = bookings.filter(b => b.id !== id);
      const updatedFinancials = financials.filter(f => f.bookingId !== id);
      onUpdateBookings(updatedBookings);
      onUpdateFinancials(updatedFinancials);
    }
  };

  // Action: Delete member
  const handleDeleteMember = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus member ini?')) {
      onUpdateMembers(members.filter(m => m.id !== id));
    }
  };

  // Action: Add Finance Transaction
  const handleAddFinance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeAmount || !financeDesc.trim()) return;

    const newRec: FinancialRecord = {
      id: 'F-' + Math.floor(1000 + Math.random() * 9000),
      kategori: financeCategory,
      jumlah: parseInt(financeAmount),
      tipe: financeType,
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: financeDesc,
    };

    onUpdateFinancials([newRec, ...financials]);
    setFinanceAmount('');
    setFinanceDesc('');
    setShowAddFinanceModal(false);
  };

  // Action: Delete Finance Record
  const handleDeleteFinance = (id: string) => {
    if (window.confirm('Hapus transaksi ini?')) {
      onUpdateFinancials(financials.filter(f => f.id !== id));
    }
  };

  // Action: Handle Local Logo File Upload & Resize
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file terlalu besar. Silakan pilih gambar di bawah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 160;
        const MAX_HEIGHT = 160;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Set compressed JPEG base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setLogoUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Action: Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = parseInt(hargaPerJam) || 50000;
    onUpdateSettings({
      adminName,
      adminPhone,
      qrisCodeUrl: qrisUrl,
      hargaPerJam: cleanPrice,
      bankName,
      bankAccountNumber,
      logoUrl,
    });
    setSettingsSuccessMessage('Pengaturan admin berhasil diperbarui!');
    setTimeout(() => setSettingsSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6" id="portal-admin">
      
      {/* Sub Navigation */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-1 overflow-x-auto">
        {(['dashboard', 'bookings', 'members', 'finance', 'settings'] as const).map(tab => {
          const icons = {
            dashboard: <Sliders className="w-4 h-4" />,
            bookings: <BookOpen className="w-4 h-4" />,
            members: <Users className="w-4 h-4" />,
            finance: <DollarSign className="w-4 h-4" />,
            settings: <Settings className="w-4 h-4" />,
          };
          const labels = {
            dashboard: 'Dashboard',
            bookings: 'Jadwal & Booking',
            members: 'Member',
            finance: 'Keuangan',
            settings: 'Pengaturan',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === tab
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {icons[tab]}
              <span>{labels[tab]}</span>
            </button>
          );
        })}
      </div>

      {/* Sync Status Banner */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isGoogleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
          <div className="text-sm">
            <span className="font-bold text-gray-800">Status Sinkronisasi Database: </span>
            <span className={isGoogleConnected ? 'text-emerald-700 font-semibold' : 'text-gray-500'}>
              {isGoogleConnected ? 'Koneksi Cloud (Google Sheets Aktif)' : 'Offline (Data Tersimpan Lokal)'}
            </span>
          </div>
        </div>
        <button
          onClick={onForceSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer border border-emerald-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi ke Google Sheet'}</span>
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Booking Hari Ini</span>
                <span className="text-2xl font-black text-gray-800">{dashboardStats.activeBookingsToday}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Total Member</span>
                <span className="text-2xl font-black text-gray-800">{dashboardStats.totalMembersCount}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Pemasukan Kotor</span>
                <span className="text-xl font-black text-emerald-600">Rp {dashboardStats.totalIncome.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Laba Bersih</span>
                <span className="text-xl font-black text-blue-600">Rp {dashboardStats.netProfit.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Quick Schedule Overview & Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Interactive Financial Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-800">Grafik Keuangan (7 Hari Terakhir)</h3>
                <span className="text-xs text-gray-400">Total Transaksi</span>
              </div>

              {/* Simple pure-SVG responsive chart */}
              <div className="relative pt-4">
                <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="#cbd5e1" strokeWidth="1" />

                  {/* Columns */}
                  {financialChartData.map((d, index) => {
                    const x = 50 + index * 60;
                    const incY = 170 - (d.income / maxChartValue) * 140;
                    const expY = 170 - (d.expense / maxChartValue) * 140;

                    return (
                      <g key={d.dayStr} className="group cursor-pointer">
                        {/* Income Bar (Green) */}
                        <rect
                          x={x}
                          y={incY}
                          width="18"
                          height={Math.max(170 - incY, 1)}
                          fill="#10b981"
                          rx="3"
                          className="opacity-90 hover:opacity-100 transition"
                        />
                        {/* Expense Bar (Red) */}
                        <rect
                          x={x + 20}
                          y={expY}
                          width="18"
                          height={Math.max(170 - expY, 1)}
                          fill="#ef4444"
                          rx="3"
                          className="opacity-90 hover:opacity-100 transition"
                        />

                        {/* Text Label */}
                        <text
                          x={x + 19}
                          y="188"
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {d.label}
                        </text>

                        {/* Interactive values tooltip on hover (using SVG titles for accessibility) */}
                        <title>{`Tanggal: ${d.dayStr}\nMasuk: Rp ${d.income.toLocaleString()}\nKeluar: Rp ${d.expense.toLocaleString()}`}</title>
                      </g>
                    );
                  })}
                </svg>

                <div className="flex justify-center gap-6 text-xs mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500"></span>
                    <span className="text-gray-600 font-medium">Pemasukan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-red-500"></span>
                    <span className="text-gray-600 font-medium">Pengeluaran</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Admin Profile Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo Admin"
                    className="w-16 h-16 rounded-full mx-auto border-4 border-white shadow-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 bg-emerald-600 text-white font-black text-2xl flex items-center justify-center rounded-full mx-auto border-4 border-white shadow-md">
                    {settings.adminName[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-gray-800 text-base">{settings.adminName}</h4>
                  <p className="text-xs text-emerald-700 font-semibold">{settings.adminPhone}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-gray-700 block">PROFIL AKTIF LAPANGAN:</span>
                <div className="space-y-1 text-gray-500">
                  <div className="flex justify-between">
                    <span>Nama Klub</span>
                    <span className="font-semibold text-gray-800">Fazada Badminton</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarif per Jam</span>
                    <span className="font-semibold text-emerald-600">Rp {settings.hargaPerJam.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kapasitas Lapangan</span>
                    <span className="font-semibold text-gray-800">2 Unit (Vinyl Premium)</span>
                  </div>
                </div>
              </div>

              {/* Barcode Portal Penyewa */}
              <div className="pt-4 border-t border-gray-100 text-center space-y-3">
                <span className="font-bold text-xs text-gray-700 block uppercase tracking-wide">Barcode Portal Penyewa</span>
                <p className="text-[10px] text-gray-400">Penyewa dapat melakukan scan barcode ini untuk melakukan pemesanan lapangan langsung dari smartphone:</p>
                <div className="inline-block p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '?portal=penyewa')}`}
                    alt="Barcode Portal Penyewa"
                    className="w-32 h-32 mx-auto rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-[10px] text-emerald-700 font-mono bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-100 overflow-hidden text-ellipsis whitespace-nowrap" title={window.location.origin + '?portal=penyewa'}>
                  {window.location.origin}?portal=penyewa
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          {/* Header actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Pemesan/Lapangan/Tanggal..."
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <button
              onClick={() => {
                setManualDate(new Date().toISOString().split('T')[0]);
                setShowAddBookingModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Booking Baru</span>
            </button>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                    <th className="p-4">Pemesan / Kontak</th>
                    <th className="p-4">Lapangan</th>
                    <th className="p-4">Jadwal Main</th>
                    <th className="p-4">Pembayaran</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <div>
                            <span className="font-extrabold text-gray-800 block">{b.pemesan}</span>
                            <span className="text-xs text-gray-400 font-mono">{b.noHp}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-emerald-800">{b.lapangan}</td>
                        <td className="p-4 text-xs">
                          <div>
                            <span className="font-semibold text-gray-700 block">{b.tanggal}</span>
                            <span className="text-gray-400">{b.jam}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold">{b.metodePembayaran}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              b.status === 'Lunas'
                                ? 'bg-emerald-50 text-emerald-700'
                                : b.status === 'Dibatalkan'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-extrabold text-gray-800">
                          Rp {b.totalBayar.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center items-center">
                            {b.status === 'Menunggu Pembayaran' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'Lunas')}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Konfirmasi Lunas"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {b.status !== 'Dibatalkan' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'Dibatalkan')}
                                className="p-1 text-amber-600 hover:bg-amber-50 rounded text-xs font-bold"
                                title="Batalkan"
                              >
                                Batal
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                        Tidak ada data pemesanan lapangan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Member (Nama/Nomor)..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Member Baru</span>
            </button>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                    <th className="p-4">ID Member</th>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Nomor HP / WhatsApp</th>
                    <th className="p-4">Tanggal Gabung</th>
                    <th className="p-4">Tarif Sesi Khusus</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono font-bold text-gray-500">{m.id}</td>
                        <td className="p-4 font-bold text-gray-800">{m.nama}</td>
                        <td className="p-4 text-gray-600 font-mono">{m.noHp}</td>
                        <td className="p-4 text-gray-500">{m.tanggalDaftar}</td>
                        <td className="p-4">
                          {m.biayaSewa && m.biayaSewa > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs w-max">
                                Rp {m.biayaSewa.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5">Khusus Sesi</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Umum (Rp {(parseInt(hargaPerJam) || 30000).toLocaleString('id-ID')})</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenRecurringBooking(m)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded inline-flex items-center gap-1 mr-2 cursor-pointer font-semibold text-xs"
                            title="Booking Rutin (Jadwal Tetap)"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Jadwal Rutin</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditMember(m)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded inline-flex items-center gap-1 mr-2 cursor-pointer font-semibold text-xs"
                            title="Edit Data / Tarif Member"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded inline-block"
                            title="Hapus Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                        Tidak ada member terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'finance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Catatan Keuangan & Kas Lapangan</h3>
            <button
              onClick={() => setShowAddFinanceModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Mutasi Kas</span>
            </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Tipe</th>
                    <th className="p-4 text-right">Jumlah</th>
                    <th className="p-4 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {financials.length > 0 ? (
                    financials.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50/50">
                        <td className="p-4 text-xs text-gray-500">{f.tanggal}</td>
                        <td className="p-4 font-semibold text-gray-800">{f.keterangan}</td>
                        <td className="p-4 text-xs text-gray-600">{f.kategori}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            f.tipe === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {f.tipe}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-extrabold ${f.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {f.tipe === 'Pemasukan' ? '+' : '-'} Rp {f.jumlah.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteFinance(f.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                        Belum ada riwayat kas masuk/keluar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-3">Pengaturan Profil & Barcode QRIS</h3>
          
          {settingsSuccessMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              {settingsSuccessMessage}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">Nama Admin / Penanggung Jawab</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">No HP Admin (Untuk konfirmasi WhatsApp)</label>
              <input
                type="text"
                required
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">Tarif Sewa Lapangan per Jam (Rupiah)</label>
              <input
                type="number"
                required
                value={hargaPerJam}
                onChange={e => setHargaPerJam(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nama Bank</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA, Mandiri"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">No Rekening Bank</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 12345678"
                  value={bankAccountNumber}
                  onChange={e => setBankAccountNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">URL Gambar Barcode QRIS</label>
              <input
                type="text"
                required
                value={qrisUrl}
                onChange={e => setQrisUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-400 block">Masukkan link gambar barcode QRIS Anda untuk dipindai oleh para penyewa saat melakukan booking.</span>
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="text-xs font-bold text-gray-700 block">Kustomisasi Logo Lapangan</label>
              
              {/* Local File Uploader from Computer/Drive */}
              <div className="p-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 hover:bg-emerald-50/30 hover:border-emerald-400 transition-all duration-200 relative group">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition duration-150">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs text-gray-600">
                  <span className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition">
                    Pilih File Logo dari Komputer / Drive
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-gray-400">Format PNG, JPG, JPEG (Max. 5MB). Otomatis dikompresi & disimpan.</p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {/* Logo Preview */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center bg-emerald-50 shadow-inner shrink-0 relative">
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=120&auto=format&fit=crop&q=60'; }} referrerPolicy="no-referrer" />
                      {logoUrl.startsWith('data:image/') && (
                        <span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded-sm shadow-sm">Base64</span>
                      )}
                    </>
                  ) : (
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md border-b-2 border-emerald-800">
                      {adminName ? adminName[0].toUpperCase() : 'F'}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">Atau input URL Link Gambar:</label>
                  <input
                    type="text"
                    placeholder="URL Gambar Logo (Kosongkan untuk inisial nama)"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Logos */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className={`p-1.5 text-[10px] font-bold border rounded-xl text-center transition cursor-pointer ${!logoUrl ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  Inisial Nama
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=120&auto=format&fit=crop&q=60')}
                  className={`p-1.5 text-[10px] font-bold border rounded-xl text-center transition cursor-pointer ${logoUrl === 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=120&auto=format&fit=crop&q=60' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  Kok Shuttle
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=120&auto=format&fit=crop&q=60')}
                  className={`p-1.5 text-[10px] font-bold border rounded-xl text-center transition cursor-pointer ${logoUrl === 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=120&auto=format&fit=crop&q=60' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  Court Hijau
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl('https://images.unsplash.com/photo-1613918431703-aa9b0573cc00?w=120&auto=format&fit=crop&q=60')}
                  className={`p-1.5 text-[10px] font-bold border rounded-xl text-center transition cursor-pointer ${logoUrl === 'https://images.unsplash.com/photo-1613918431703-aa9b0573cc00?w=120&auto=format&fit=crop&q=60' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  Raket Court
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition cursor-pointer text-sm shadow-md"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALS */}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-800 border-b pb-2">Registrasi Member Baru</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Pratama"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nomor HP / WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 0812345678"
                  value={newMemberPhone}
                  onChange={e => setNewMemberPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nilai Sewa Khusus (Per Sesi / Jam) (Opsional)</label>
                <input
                  type="number"
                  placeholder="Misal: 25000 (Kosongkan jika tarif normal)"
                  value={newMemberBiayaSewa}
                  onChange={e => setNewMemberBiayaSewa(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400">Dapat diatur per pertemuan/mingguan/bulanan. Kosongkan untuk tarif umum.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Simpan Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-800 border-b pb-2">Edit Data / Tarif Member</h3>
            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editMemberName}
                  onChange={e => setEditMemberName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nomor HP / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editMemberPhone}
                  onChange={e => setEditMemberPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Nilai Sewa Khusus (Per Sesi / Jam) (Opsional)</label>
                <input
                  type="number"
                  placeholder="Misal: 25000 (Kosongkan jika tarif normal)"
                  value={editMemberBiayaSewa}
                  onChange={e => setEditMemberBiayaSewa(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400">Kosongkan untuk mengembalikan ke tarif standar.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMemberModal(false);
                    setEditingMember(null);
                  }}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Recurring Booking Modal */}
      {showRecurringModal && selectedMemberForRecurring && (() => {
        const activeRecurringPrice = selectedMemberForRecurring.biayaSewa && selectedMemberForRecurring.biayaSewa > 0
          ? selectedMemberForRecurring.biayaSewa
          : (parseInt(hargaPerJam) || 30000);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-gray-800">Input Booking Rutin Member</h3>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Member Details */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
              <p className="text-gray-500 font-semibold">Profil Member:</p>
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">{selectedMemberForRecurring.nama}</span>
                <span className="font-mono text-gray-600">{selectedMemberForRecurring.noHp}</span>
              </div>
            </div>

            <form onSubmit={handleAddRecurringBooking} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Lapangan</label>
                  <select
                    value={recurringCourt}
                    onChange={e => setRecurringCourt(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Lapangan 1">Lapangan 1</option>
                    <option value="Lapangan 2">Lapangan 2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Tanggal Mulai Sesi 1</label>
                  <input
                    type="date"
                    required
                    value={recurringStartDate}
                    onChange={e => setRecurringStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Frekuensi Rutin</label>
                  <select
                    value={recurringFrequency}
                    onChange={e => setRecurringFrequency(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="weekly">Setiap Minggu (Hari yang Sama)</option>
                    <option value="daily">Setiap Hari Berturut-turut</option>
                    <option value="monthly">Setiap Bulan (Tanggal yang Sama)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Jumlah Pertemuan (Sesi)</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    required
                    value={recurringOccurrences}
                    onChange={e => setRecurringOccurrences(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Jam Bermain (Sesi Rutin)</label>
                <select
                  value={recurringJam}
                  onChange={e => setRecurringJam(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {[
                    '06:00 - 07:00',
                    '07:00 - 08:00',
                    '08:00 - 09:00',
                    '09:00 - 10:00',
                    '10:00 - 11:00',
                    '11:00 - 12:00',
                    '12:00 - 13:00',
                    '13:00 - 14:00',
                    '14:00 - 15:00',
                    '15:00 - 16:00',
                    '16:00 - 17:00',
                    '17:00 - 18:00',
                    '18:00 - 19:00',
                    '19:00 - 20:00',
                    '20:00 - 21:00',
                    '21:00 - 22:00',
                    '22:00 - 23:00',
                  ].map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Metode Bayar</label>
                  <select
                    value={recurringPayment}
                    onChange={e => setRecurringPayment(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                    <option value="DANA">DANA</option>
                    <option value="OVO">OVO</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Status Pembayaran</label>
                  <select
                    value={recurringStatus}
                    onChange={e => setRecurringStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                  </select>
                </div>
              </div>

              {/* Price Calculation details */}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                <div>
                  <p className="text-emerald-800 font-bold">Kalkulasi Total Biaya:</p>
                  <p className="text-emerald-600 text-[10px]">
                    {recurringOccurrences} sesi x Rp {activeRecurringPrice.toLocaleString('id-ID')}
                    {selectedMemberForRecurring.biayaSewa && selectedMemberForRecurring.biayaSewa > 0 && (
                      <span className="text-amber-600 ml-1 font-bold">(Tarif Khusus Member)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-800 font-extrabold text-base">
                    Rp {(recurringOccurrences * activeRecurringPrice).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Buat Jadwal Rutin
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Add Booking Modal (Manual Admin Input) */}
      {showAddBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-800 border-b pb-2">Input Booking Lapangan Manual</h3>
            <form onSubmit={handleAddBookingManual} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Nama Pemesan</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="08123..."
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Lapangan</label>
                  <select
                    value={manualCourt}
                    onChange={e => setManualCourt(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs"
                  >
                    <option value="Lapangan 1">Lapangan 1</option>
                    <option value="Lapangan 2">Lapangan 2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Tanggal</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Jam Bermain</label>
                  <select
                    value={manualJam}
                    onChange={e => setManualJam(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs"
                  >
                    {[
                      '06:00 - 07:00',
                      '07:00 - 08:00',
                      '08:00 - 09:00',
                      '09:00 - 10:00',
                      '10:00 - 11:00',
                      '11:00 - 12:00',
                      '12:00 - 13:00',
                      '13:00 - 14:00',
                      '14:00 - 15:00',
                      '15:00 - 16:00',
                      '16:00 - 17:00',
                      '17:00 - 18:00',
                      '18:00 - 19:00',
                      '19:00 - 20:00',
                      '20:00 - 21:00',
                      '21:00 - 22:00',
                      '22:00 - 23:00',
                    ].map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">Pembayaran</label>
                  <select
                    value={manualPayment}
                    onChange={e => setManualPayment(e.target.value as any)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                    <option value="DANA">DANA</option>
                    <option value="OVO">OVO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Status Pembayaran</label>
                <select
                  value={manualStatus}
                  onChange={e => setManualStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Simpan Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Finance Transaction Modal */}
      {showAddFinanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-800 border-b pb-2">Catat Mutasi Kas Manual</h3>
            <form onSubmit={handleAddFinance} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Tipe Kas</label>
                <select
                  value={financeType}
                  onChange={e => {
                    setFinanceType(e.target.value as any);
                    setFinanceCategory(e.target.value === 'Pemasukan' ? 'Pemasukan Lapangan' : 'Pengeluaran Operasional');
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="Pemasukan">Pemasukan (Uang Masuk)</option>
                  <option value="Pengeluaran">Pengeluaran (Uang Keluar)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Kategori</label>
                <select
                  value={financeCategory}
                  onChange={e => setFinanceCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  {financeType === 'Pemasukan' ? (
                    <>
                      <option value="Pemasukan Lapangan">Pemasukan Lapangan</option>
                      <option value="Pemasukan Kantin">Pemasukan Kantin</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Pengeluaran Operasional">Pengeluaran Operasional</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Jumlah Uang (Rupiah)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000"
                  value={financeAmount}
                  onChange={e => setFinanceAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Keterangan Singkat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli net baru"
                  value={financeDesc}
                  onChange={e => setFinanceDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFinanceModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
