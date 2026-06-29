import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, User, Phone, History, CreditCard, ChevronRight, QrCode, Sparkles, Loader } from 'lucide-react';
import { Booking, AppSettings } from '../types';

interface PortalPenyewaProps {
  bookings: Booking[];
  settings: AppSettings;
  onAddBooking: (booking: Booking) => void;
  isSyncing: boolean;
}

const AVAILABLE_HOURS = [
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
];

export default function PortalPenyewa({ bookings, settings, onAddBooking, isSyncing }: PortalPenyewaProps) {
  // Tabs: 'booking' or 'history'
  const [activeTab, setActiveTab] = useState<'booking' | 'history'>('booking');

  // Booking states
  const [selectedCourt, setSelectedCourt] = useState<'Lapangan 1' | 'Lapangan 2'>('Lapangan 1');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  
  // User states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Booking['metodePembayaran']>('QRIS');

  // Confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<Booking | null>(null);

  // Quick Date Helpers (Today + 6 upcoming days)
  const dateOptions = useMemo(() => {
    const options = [];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : days[d.getDay()];
      options.push({
        date: dateString,
        label: dayLabel,
        formatted: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      });
    }
    return options;
  }, []);

  // Filter Bookings to find taken slots
  const bookedSlotsMap = useMemo(() => {
    const map: Record<string, Booking> = {};
    bookings.forEach(b => {
      if (b.tanggal === selectedDate && b.lapangan === selectedCourt && b.status !== 'Dibatalkan') {
        map[b.jam] = b;
      }
    });
    return map;
  }, [bookings, selectedDate, selectedCourt]);

  // Check if a time slot has already passed
  const isSlotPassed = (slot: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (selectedDate !== todayStr) return false;

    const [startPart] = slot.split(' - ');
    const [sh, sm] = startPart.split(':').map(Number);
    const currentHour = today.getHours();
    const currentMin = today.getMinutes();

    if (currentHour > sh) return true;
    if (currentHour === sh && currentMin >= sm) return true;
    return false;
  };

  // Handle slot selection with auto-consecutive blocking
  const handleSlotToggle = (startSlot: string) => {
    if (bookedSlotsMap[startSlot] || isSlotPassed(startSlot)) return; // Taken or Passed

    const startIndex = AVAILABLE_HOURS.indexOf(startSlot);
    if (startIndex === -1) return;

    // Get consecutive slots based on selectedDuration
    const slotsToSelect: string[] = [];
    for (let i = 0; i < selectedDuration; i++) {
      const nextIndex = startIndex + i;
      if (nextIndex < AVAILABLE_HOURS.length) {
        const nextSlot = AVAILABLE_HOURS[nextIndex];
        if (bookedSlotsMap[nextSlot]) {
          alert(`Maaf, slot jam "${nextSlot}" berikutnya sudah di-booking oleh orang lain untuk durasi ${selectedDuration} jam.`);
          return;
        }
        if (isSlotPassed(nextSlot)) {
          alert(`Maaf, slot jam "${nextSlot}" berikutnya sudah melewati waktu sekarang.`);
          return;
        }
        slotsToSelect.push(nextSlot);
      } else {
        alert('Maaf, durasi booking Anda melebihi batas jam operasional lapangan (Maksimal s.d 23:00).');
        return;
      }
    }

    // Toggle logic
    const isAlreadySelected = slotsToSelect.every(s => selectedSlots.includes(s)) && selectedSlots.length === slotsToSelect.length;
    if (isAlreadySelected) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(slotsToSelect);
    }
  };

  // Compute Cost
  const totalCost = selectedSlots.length * settings.hargaPerJam;

  // Search User's own bookings by phone number
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);

  const userHistoryBookings = useMemo(() => {
    if (!searchPhone.trim()) return [];
    return bookings
      .filter(b => b.noHp.replace(/\D/g, '') === searchPhone.replace(/\D/g, ''))
      .sort((a, b) => new Date(b.waktuPemesanan).getTime() - new Date(a.waktuPemesanan).getTime());
  }, [bookings, searchPhone]);

  // Handle Form Submission - Pre-confirm
  const handleBookingPreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || selectedSlots.length === 0) {
      alert('Mohon lengkapi nama, nomor HP, dan pilih minimal 1 slot jam.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Final confirmation & save booking
  const handleConfirmBooking = () => {
    const dateFormatted = new Date().toLocaleString('id-ID');
    const newBookings: Booking[] = selectedSlots.map((slot, index) => {
      const id = 'B-' + Math.floor(100000 + Math.random() * 900000);
      return {
        id,
        pemesan: name,
        noHp: phone,
        lapangan: selectedCourt,
        tanggal: selectedDate,
        jam: slot,
        metodePembayaran: paymentMethod,
        status: paymentMethod === 'QRIS' ? 'Lunas' : 'Menunggu Pembayaran',
        totalBayar: settings.hargaPerJam,
        waktuPemesanan: dateFormatted,
      };
    });

    // Save the bookings (one by one or just trigger save)
    newBookings.forEach(booking => onAddBooking(booking));

    // Save for the receipt view (summarize selected slots)
    const summaryBooking: Booking = {
      id: newBookings[0].id + (newBookings.length > 1 ? ` & ${newBookings.length - 1} lainnya` : ''),
      pemesan: name,
      noHp: phone,
      lapangan: selectedCourt,
      tanggal: selectedDate,
      jam: selectedSlots.join(', '),
      metodePembayaran: paymentMethod,
      status: paymentMethod === 'QRIS' ? 'Lunas' : 'Menunggu Pembayaran',
      totalBayar: totalCost,
      waktuPemesanan: dateFormatted,
    };

    setLastCreatedBooking(summaryBooking);
    // Set search phone so the user can see it instantly in history
    setSearchPhone(phone);
    
    // Clear form
    setSelectedSlots([]);
    setShowConfirmModal(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="space-y-8" id="portal-penyewa">
      {/* Top Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex-1 py-4 text-center font-medium transition ${
            activeTab === 'booking'
              ? 'border-b-2 border-emerald-600 text-emerald-600'
              : 'text-gray-500 hover:text-emerald-500'
          }`}
          id="btn-tab-booking"
        >
          📅 Cari & Sewa Lapangan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-center font-medium transition ${
            activeTab === 'history'
              ? 'border-b-2 border-emerald-600 text-emerald-600'
              : 'text-gray-500 hover:text-emerald-500'
          }`}
          id="btn-tab-history"
        >
          🔍 Riwayat Booking Anda
        </button>
      </div>

      {activeTab === 'booking' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Schedulers & Slot Picker */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Choose Court */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Pilih Lapangan
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {(['Lapangan 1', 'Lapangan 2'] as const).map(court => (
                  <button
                    key={court}
                    onClick={() => {
                      setSelectedCourt(court);
                      setSelectedSlots([]); // Clear temporary selected slots on court change
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition flex justify-between items-center ${
                      selectedCourt === court
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm'
                        : 'border-gray-100 bg-gray-50/30 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{court}</span>
                      <span className="text-xs text-gray-500">Premium Vinyl Flooring</span>
                    </div>
                    {selectedCourt === court && <span className="w-3 h-3 rounded-full bg-emerald-500"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Pilih Tanggal Main
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {dateOptions.map(opt => (
                  <button
                    key={opt.date}
                    onClick={() => {
                      setSelectedDate(opt.date);
                      setSelectedSlots([]); // Clear slots
                    }}
                    className={`flex-shrink-0 min-w-[80px] p-3 rounded-xl border text-center transition ${
                      selectedDate === opt.date
                        ? 'border-emerald-500 bg-emerald-500 text-white font-medium shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs block opacity-80">{opt.label}</span>
                    <span className="text-base font-semibold block">{opt.formatted}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" /> Pilih Jam Tersedia
                </h2>
                <div className="text-xs text-gray-500">
                  Harga: <span className="font-semibold text-emerald-600">Rp {settings.hargaPerJam.toLocaleString('id-ID')}/jam</span>
                </div>
              </div>

              {/* Status Legend & Duration Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-gray-100">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>
                    <span className="text-gray-500">Tersedia</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-100 border border-red-200 text-red-700"></span>
                    <span className="text-gray-500">Penuh (Booked)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span className="text-gray-500">Pilihan Anda</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 opacity-60"></span>
                    <span className="text-gray-500">Selesai / Terlewat</span>
                  </div>
                </div>

                {/* Dropdown Durasi Sewa */}
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 self-start sm:self-auto">
                  <label htmlFor="duration-select" className="text-xs font-bold text-emerald-800">Durasi:</label>
                  <select
                    id="duration-select"
                    value={selectedDuration}
                    onChange={(e) => {
                      const dur = parseInt(e.target.value, 10);
                      setSelectedDuration(dur);
                      setSelectedSlots([]); // Reset selected slots
                    }}
                    className="bg-white border border-emerald-200 text-emerald-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value={1}>1 Jam</option>
                    <option value={2}>2 Jam</option>
                    <option value={3}>3 Jam</option>
                  </select>
                </div>
              </div>

               {/* Slots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_HOURS.map(slot => {
                  const isTaken = !!bookedSlotsMap[slot];
                  const isPassed = isSlotPassed(slot);
                  const isSelected = selectedSlots.includes(slot);
                  const slotBooking = bookedSlotsMap[slot];
                  const isDisabled = isTaken || isPassed;

                  return (
                    <button
                      key={slot}
                      disabled={isDisabled}
                      onClick={() => handleSlotToggle(slot)}
                      className={`p-3 rounded-xl text-sm transition font-medium border flex flex-col items-center justify-center relative overflow-hidden ${
                        isTaken
                          ? 'bg-red-50 text-red-400 border-red-100 cursor-not-allowed'
                          : isPassed
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-gray-50/50 hover:bg-gray-100 text-gray-700 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span>{slot}</span>
                      {isTaken && (
                        <span className="text-[10px] text-red-500 font-normal">
                          {slotBooking?.pemesan.substring(0, 10)}...
                        </span>
                      )}
                      {isPassed && !isTaken && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          Selesai / Lewat
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Checkout & User Form */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-3">Detail Pemesanan</h2>
              
              {/* Receipt Summary */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Lapangan</span>
                  <span className="font-semibold text-gray-800">{selectedCourt}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tanggal</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 block">Jam Bermain ({selectedSlots.length} Jam):</span>
                  {selectedSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedSlots.map(s => (
                        <span key={s} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded font-semibold border border-emerald-100">
                          {s.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-amber-500 text-xs italic">Belum memilih jam</span>
                  )}
                </div>
                
                <div className="border-t pt-3 flex justify-between items-center text-base">
                  <span className="font-bold text-gray-800">Total Harga</span>
                  <span className="font-extrabold text-emerald-600">Rp {totalCost.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleBookingPreSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 block">Nama Lengkap</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Faza"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 block">Nomor WhatsApp (No HP)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 08123456789"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Payment Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 block">Metode Pembayaran Digital</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'QRIS', label: 'QRIS', desc: 'Selesai Instan' },
                      { id: 'DANA', label: 'DANA', desc: 'E-Wallet' },
                      { id: 'OVO', label: 'OVO', desc: 'E-Wallet' },
                      { id: 'Transfer Bank', label: settings.bankName || 'Transfer Bank', desc: 'Manual Transfer' }
                    ] as const).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          paymentMethod === p.id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xs block font-bold">{p.label}</span>
                        <span className="text-[10px] text-gray-500 font-normal">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={selectedSlots.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Sewa Sekarang
                </button>
              </form>
            </div>
          </div>

        </div>
      ) : (
        /* Booking History */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Cari Riwayat Sewa Lapangan</h2>
            <p className="text-xs text-gray-500">Masukkan nomor WhatsApp Anda saat mendaftar untuk melihat seluruh data pemesanan atau status konfirmasi otomatis.</p>
            
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Contoh: 08123456789"
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button 
                onClick={() => setIsSearchingHistory(true)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Cari
              </button>
            </div>
          </div>

          {searchPhone.trim() ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-600">Hasil Pencarian untuk: {searchPhone}</h3>
              
              {userHistoryBookings.length > 0 ? (
                userHistoryBookings.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{b.lapangan}</span>
                        <span className="text-xs text-gray-400">| ID: {b.id}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>Tanggal: <span className="font-medium text-gray-700">{b.tanggal}</span></p>
                        <p>Jam: <span className="font-medium text-gray-700">{b.jam}</span></p>
                        <p>Pembayaran: <span className="font-medium text-gray-700">{b.metodePembayaran}</span></p>
                        <p className="text-[10px] text-gray-400">Dipesan pada: {b.waktuPemesanan}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-sm font-extrabold text-emerald-600">Rp {b.totalBayar.toLocaleString('id-ID')}</div>
                      <div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                          b.status === 'Lunas'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'Dibatalkan'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-8 rounded-xl border border-gray-100 text-center text-gray-500 text-sm">
                  Tidak ada riwayat booking ditemukan untuk nomor ini. Pastikan nomor sesuai.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-gray-100 text-center text-gray-400 text-sm italic">
              Masukkan nomor WhatsApp Anda di atas untuk memunculkan riwayat pesanan Anda.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">Selesaikan Pembayaran Anda</h3>
            
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-xl space-y-2 border border-emerald-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pemesan</span>
                  <span className="font-semibold text-gray-800">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kontak WhatsApp</span>
                  <span className="font-semibold text-gray-800">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lapangan & Slot</span>
                  <span className="font-semibold text-gray-800">{selectedCourt} ({selectedSlots.length} Jam)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-100 text-base font-bold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-emerald-700">Rp {totalCost.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* QRIS Scan Section */}
              {paymentMethod === 'QRIS' ? (
                <div className="text-center space-y-3 bg-gray-50 p-4 rounded-xl border">
                  <span className="text-xs font-bold text-gray-700 block">SCAN QRIS UNTUK MEMBAYAR INSTAN</span>
                  <div className="flex justify-center bg-white p-2 rounded-lg inline-block mx-auto border shadow-inner">
                    <img
                      src={settings.qrisCodeUrl}
                      alt="QRIS Barcode"
                      className="w-40 h-40 object-cover"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">QR Code valid untuk 15 menit. Pembayaran akan terkonfirmasi LUNAS secara otomatis.</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-gray-600 bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                  <p className="font-bold text-amber-800 mb-1">Panduan Pembayaran Manual ({paymentMethod}):</p>
                  {paymentMethod === 'Transfer Bank' ? (
                    <div className="space-y-1 text-[11px]">
                      <p>Transfer ke Rekening Bank {settings.bankName || 'BCA'}:</p>
                      <p className="font-bold text-gray-800 text-sm">{settings.bankAccountNumber || '1234567890'}</p>
                      <p>a.n. <span className="font-semibold">{(settings.adminName || 'Fazada Badminton').replace(/\s*[Aa][Dd][Mm][Ii][Nn]\s*/g, '')}</span></p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-[11px]">
                      <p>Kirim Saldo {paymentMethod} ke Nomor Tujuan:</p>
                      <p className="font-bold text-gray-800 text-sm">{settings.adminPhone}</p>
                      <p>a.n. <span className="font-semibold">{(settings.adminName || '').replace(/\s*[Aa][Dd][Mm][Ii][Nn]\s*/g, '')}</span></p>
                    </div>
                  )}
                  <p className="text-[10px] mt-2 text-amber-700">Setelah transfer, mohon kirim bukti pembayaran melalui WhatsApp ke <span className="font-bold">{settings.adminPhone}</span> untuk konfirmasi manual.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer text-center text-sm"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmBooking}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer text-center text-sm"
              >
                Saya Sudah Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Confirmation modal */}
      {showSuccessModal && lastCreatedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              {settings.logoUrl ? (
                <div className="relative w-20 h-20 mx-auto">
                  <img
                    src={settings.logoUrl}
                    alt="Logo Lapangan"
                    className="w-20 h-20 rounded-full mx-auto border-4 border-emerald-50 shadow-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100">
                  <CheckCircle className="w-10 h-10" />
                </div>
              )}
              <h3 className="text-xl font-black text-emerald-800">Booking Berhasil & Terkonfirmasi!</h3>
              <p className="text-xs text-gray-500">Notifikasi konfirmasi otomatis telah diproses & dikirim ke WhatsApp Anda.</p>
            </div>

            <div className="border border-dashed border-gray-200 p-4 rounded-xl space-y-3 bg-gray-50 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Kode Booking</span>
                <span className="font-mono font-bold text-gray-800">{lastCreatedBooking.id}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Pemesan</span>
                <span className="font-bold text-gray-800">{lastCreatedBooking.pemesan}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>No HP / WhatsApp</span>
                <span className="font-bold text-gray-800">{lastCreatedBooking.noHp}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Lapangan</span>
                <span className="font-bold text-emerald-700">{lastCreatedBooking.lapangan}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tanggal</span>
                <span className="font-bold text-gray-800">{lastCreatedBooking.tanggal}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Jam Bermain</span>
                <span className="font-bold text-gray-800 text-right max-w-[200px]">{lastCreatedBooking.jam}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Metode Pembayaran</span>
                <span className="font-bold text-gray-800">{lastCreatedBooking.metodePembayaran}</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-2 border-t border-dashed">
                <span>Status Pesanan</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lastCreatedBooking.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>{lastCreatedBooking.status}</span>
              </div>
              <div className="flex justify-between text-gray-700 font-bold text-sm pt-2 border-t">
                <span>Total Bayar</span>
                <span>Rp {lastCreatedBooking.totalBayar.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-[11px] leading-relaxed text-center font-medium border border-blue-100">
              📲 Screenshot halaman ini atau cek folder pesan WhatsApp Anda untuk verifikasi petugas saat memasuki lapangan {(settings.adminName || 'Fazada Badminton').replace(/\s*[Aa][Dd][Mm][Ii][Nn]\s*/g, '')}.
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer"
            >
              Mengerti & Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
