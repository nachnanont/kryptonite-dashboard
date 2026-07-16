'use client'; 

import React, { useState, useEffect } from 'react';
import { Save, Plus, Minus, Trash2, History, Calculator, Wallet, ArrowRightLeft, Clock } from 'lucide-react';

// ระดับสมาชิก P2P และส่วนลดค่าธรรมเนียมของแต่ละระดับ
const RANK_OPTIONS = [
  { value: 'none', label: 'ไม่มีระดับ', discount: 0 },
  { value: 'bronze', label: 'Bronze', discount: 0.20 },
  { value: 'silver', label: 'Silver', discount: 0.30 },
  { value: 'gold', label: 'Gold', discount: 0.50 },
];
const BASE_FEE = 0.002; // ค่าธรรมเนียมฐาน 0.20%

const inputStyle =
  "w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-700 font-medium placeholder:text-gray-400";

// สำคัญ: ประกาศ component ไว้นอก Home เพื่อไม่ให้ถูกสร้างใหม่ทุกครั้งที่ state เปลี่ยน
// (ถ้าอยู่ข้างใน React จะ remount ช่องกรอกทุกครั้งที่พิมพ์ ทำให้โฟกัสหลุด/คีย์บอร์ดปิด)
const Card = ({ children, title, icon, className = "" }) => (
  <div className={`bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
    {title && (
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-3">
        {icon && <span className="p-2 bg-gray-50 text-gray-500 rounded-xl">{icon}</span>}
        {title}
      </h3>
    )}
    {children}
  </div>
);

// แถวแสดงผลกำไรสุทธิ ใช้ร่วมกันสำหรับ 100 / 1,000 / จำนวนกำหนดเอง USDT
const ProfitRow = ({ label, data, highlight = false }) => {
  const hasData = data !== null;
  const isPositive = hasData && data.lak >= 0;
  const sign = hasData && data.lak !== 0 ? (isPositive ? '+' : '') : '';
  return (
    <div className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${highlight ? 'bg-orange-50/70 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
      <span className={`text-sm font-semibold ${highlight ? 'text-orange-700' : 'text-gray-500'}`}>{label}</span>
      <div className="text-right">
        <div className={`text-lg font-extrabold whitespace-nowrap ${!hasData ? 'text-gray-300' : isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {hasData ? `${sign}${data.lak.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
          <span className="text-xs font-medium text-gray-400 ml-1">LAK</span>
        </div>
        <div className="text-xs font-medium text-gray-400 whitespace-nowrap">
          {hasData ? `≈ ${sign}${data.usdt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` : '≈ - USDT'}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  // ==============================
  // LOGIC & STATE PART
  // ==============================
  const [transactions, setTransactions] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [timeSlot, setTimeSlot] = useState('08:00');
  const [scheduledAmount, setScheduledAmount] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [txType, setTxType] = useState('IN');
  const [sellPrice, setSellPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [rank, setRank] = useState('none');
  const [customAmount, setCustomAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // สำหรับการคำนวณ USDT รวม
  const [sellingUSDT, setSellingUSDT] = useState('');
  const [buyingUSDT, setBuyingUSDT] = useState('');

  // แปลงแถวจากฐานข้อมูล (schema เดิม) -> รูปแบบที่หน้าจอใช้
  const mapRow = (r) => {
    const amt = parseFloat(r.amount);
    const bal = parseFloat(r.balance);
    let type, amount;
    if (r.type === 'SET_BALANCE') {
      type = 'CHECKPOINT';
      amount = amt;
    } else {
      type = amt >= 0 ? 'IN' : 'OUT';
      amount = Math.abs(amt);
    }
    return {
      id: r.id,
      timestamp: r.created_at,
      displayTime: new Date(r.created_at).toLocaleString('th-TH'),
      type,
      amount,
      reason: r.note || '',
      balanceAfter: bal,
    };
  };

  // โหลดรายการจากฐานข้อมูลกลาง (sync ข้ามเครื่อง)
  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
      const txs = (data.transactions || []).map(mapRow);
      setTransactions(txs);
      setCurrentBalance(txs.length ? txs[0].balanceAfter : 0);
      setError('');
    } catch (e) {
      setError('เชื่อมต่อฐานข้อมูลไม่ได้: ' + e.message);
    }
  };

  // โหลดครั้งแรก: ค่าเครื่องคำนวณจาก localStorage + รายการจากฐานข้อมูล
  useEffect(() => {
    const savedSell = localStorage.getItem('last_sell_price');
    const savedBuy = localStorage.getItem('last_buy_price');
    const savedSelling = localStorage.getItem('selling_usdt');
    const savedBuying = localStorage.getItem('buying_usdt');
    const savedRank = localStorage.getItem('p2p_rank');

    if (savedSell) setSellPrice(savedSell);
    if (savedBuy) setBuyPrice(savedBuy);
    if (savedSelling) setSellingUSDT(savedSelling);
    if (savedBuying) setBuyingUSDT(savedBuying);
    if (savedRank) setRank(savedRank);

    loadTransactions().finally(() => setIsLoaded(true));
  }, []);

  // เก็บค่าเครื่องคำนวณไว้ในเครื่อง (ไม่ sync — เป็นค่าชั่วคราวส่วนตัว)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('last_sell_price', sellPrice);
    localStorage.setItem('last_buy_price', buyPrice);
    localStorage.setItem('selling_usdt', sellingUSDT);
    localStorage.setItem('buying_usdt', buyingUSDT);
    localStorage.setItem('p2p_rank', rank);
  }, [isLoaded, sellPrice, buyPrice, sellingUSDT, buyingUSDT, rank]);

  const postTransaction = async (payload) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
  };

  // Handle Scheduled Checkpoint
  const handleSaveScheduled = async () => {
    if (!scheduledAmount || busy) return;
    setBusy(true);
    try {
      await postTransaction({ kind: 'checkpoint', amount: parseFloat(scheduledAmount), reason: `ยอดคงเหลือรอบ ${timeSlot}` });
      setScheduledAmount('');
      await loadTransactions();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Handle In/Out Transaction
  const handleTransaction = async () => {
    if (!txAmount || busy) return;
    setBusy(true);
    try {
      await postTransaction({
        kind: txType === 'IN' ? 'in' : 'out',
        amount: parseFloat(txAmount),
        reason: txReason || (txType === 'IN' ? 'รับเข้า' : 'จ่ายออก'),
      });
      setTxAmount('');
      setTxReason('');
      await loadTransactions();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Delete Transaction
  const deleteTransaction = async (id) => {
    if (busy) return;
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'ลบไม่สำเร็จ');
      await loadTransactions();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ==============================
  // เครื่องคำนวณกำไร P2P
  // ==============================
  const currentRank = RANK_OPTIONS.find((r) => r.value === rank) || RANK_OPTIONS[0];
  const effectiveFee = BASE_FEE * (1 - currentRank.discount); // ค่าธรรมเนียมจริงต่อฝั่ง หลังหักส่วนลดตามระดับ

  const sellNum = parseFloat(sellPrice);
  const buyNum = parseFloat(buyPrice);
  const pricesValid = sellPrice !== '' && buyPrice !== '' && !isNaN(sellNum) && !isNaN(buyNum);
  const avgPrice = pricesValid ? (sellNum + buyNum) / 2 : 0;

  // กำไรสุทธิ = กำไรขั้นต้น - ค่าธรรมเนียมฝั่งซื้อ - ค่าธรรมเนียมฝั่งขาย
  const calcNetProfit = (amountUSDT) => {
    if (!pricesValid || isNaN(amountUSDT)) return null;
    const grossProfitLAK = amountUSDT * (sellNum - buyNum);
    const buyFeeLAK = amountUSDT * effectiveFee * buyNum;
    const sellFeeLAK = amountUSDT * effectiveFee * sellNum;
    const netProfitLAK = grossProfitLAK - buyFeeLAK - sellFeeLAK;
    const netProfitUSDT = avgPrice > 0 ? netProfitLAK / avgPrice : 0;
    return { lak: netProfitLAK, usdt: netProfitUSDT };
  };

  const profit100 = calcNetProfit(100);
  const profit1000 = calcNetProfit(1000);
  const profitCustom = calcNetProfit(parseFloat(customAmount));

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  // Calculate total USDT for display
  const totalUSDT = parseFloat(sellingUSDT || 0) + parseFloat(buyingUSDT || 0);

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 md:p-12 font-sans text-gray-800 antialiased">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="text-center py-4">
           {/* [UPDATE]: เปลี่ยนชื่อเป็น KRYPTONITE TECHNOLOGY */}
           <h1 className="text-2xl font-bold text-gray-900 mb-2">KRYPTONITE TECHNOLOGY</h1>
           <p className="text-gray-500 text-sm">ระบบบันทึกและคำนวณยอดเหรียญ · ซิงก์ข้ามอุปกรณ์</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-2xl px-5 py-3 text-center">
            {error}
          </div>
        )}

        {/* ZONE 1: ยอดคงเหลือล่าสุด (Top) */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-indigo-50/50 shadow-[0_20px_50px_rgb(79,70,229,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-50 rounded-full opacity-50 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 text-center">
             <div className="inline-flex items-center gap-2 text-indigo-600 bg-indigo-50/80 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Wallet size={18} /> เหรียญคงเหลือล่าสุด
             </div>
            <div className="text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 mt-2">
              {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              <span className="text-2xl md:text-3xl text-gray-400 ml-3 font-medium">USDT</span>
            </div>
            <p className="mt-6 text-sm text-gray-500 flex items-center justify-center gap-2">
              <History size={14} /> อัปเดตล่าสุด: {transactions[0]?.displayTime || '-'}
            </p>
          </div>
        </div>

        {/* Main Grid: Bottom Zones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ZONE 2: ที่ใส่ข้อมูล (Bottom Left - Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 2.1: บันทึกยอดตามรอบเวลา */}
            <Card title="บันทึกยอดตามรอบเวลา" icon={<History size={20} />}>
              <div className="flex flex-col md:flex-row gap-4">
                <select 
                  value={timeSlot} 
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className={`${inputStyle} md:w-40 cursor-pointer`}
                >
                  <option value="08:00">08:00 น.</option>
                  <option value="12:00">12:00 น.</option>
                  <option value="17:00">17:00 น.</option>
                  <option value="23:00">23:00 น.</option>
                </select>
                <input 
                  type="number" inputMode="decimal" 
                  placeholder="ระบุยอดคงเหลือที่นับได้" 
                  value={scheduledAmount}
                  onChange={(e) => setScheduledAmount(e.target.value)}
                  className={`${inputStyle} flex-1 text-lg font-semibold`}
                />
                <button
                  onClick={handleSaveScheduled}
                  disabled={busy}
                  className="bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-semibold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                  <Save size={20} /> {busy ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </Card>
            
            {/* 2.2: บันทึก รับ/จ่าย (Original Position) */}
            <Card title="บันทึกรายการ (รับเข้า / จ่ายออก)" icon={<ArrowRightLeft size={20} />}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-2xl">
                   <button 
                    onClick={() => setTxType('IN')}
                    className={`py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${txType === 'IN' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Plus size={18} /> รับเข้า
                  </button>
                  <button 
                    onClick={() => setTxType('OUT')}
                    className={`py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${txType === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Minus size={18} /> จ่ายออก
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="number" inputMode="decimal" 
                    placeholder="จำนวน (USDT)" 
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className={`${inputStyle} flex-1 text-xl font-bold tracking-wide`}
                  />
                   <input 
                    type="text" 
                    placeholder="เหตุผล (เช่น ลูกค้าโอน)" 
                    value={txReason}
                    onChange={(e) => setTxReason(e.target.value)}
                    className={`${inputStyle} flex-[1.5]`}
                  />
                </div>

                <button
                  onClick={handleTransaction}
                  disabled={busy}
                  className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-md transition-transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                    ${txType === 'IN' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
                >
                  {busy ? 'กำลังบันทึก...' : `ยืนยันทำรายการ ${txType === 'IN' ? 'รับเข้า' : 'จ่ายออก'}`}
                </button>
              </div>
            </Card>

            {/* 2.3: ตารางประวัติ (History Table) */}
            <Card title="ประวัติรายการล่าสุด" icon={<History size={20} />}>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="p-4 font-semibold">วันที่ / เวลา</th> 
                                <th className="p-4 font-semibold">รายละเอียด</th>
                                <th className="p-4 text-right font-semibold">ยอดเปลี่ยนแปลง</th> 
                                <th className="p-4 text-right font-semibold">คงเหลือล่าสุด</th>
                                <th className="p-4 text-center font-semibold">ลบ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.slice(0, 10).map((tx, index) => {
                                const txDate = new Date(tx.timestamp);
                                const dateStr = txDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                const timeStr = txDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
                                return (
                                <tr key={tx.id} className="hover:bg-gray-50 transition">
                                    {/* วันที่ / เวลา */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-xl bg-gray-50 text-gray-400">
                                                <Clock size={14} />
                                            </span>
                                            <div>
                                                <div className="font-mono font-bold text-gray-800 text-sm leading-tight">{timeStr} <span className="font-sans font-normal text-gray-400">น.</span></div>
                                                <div className="text-xs text-gray-400 leading-tight">{dateStr}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* รายละเอียด */}
                                    <td className="p-4 font-medium text-gray-700">
                                      <div className="flex items-center gap-2">
                                        {/* แถบสีเล็กๆ เพื่อบ่งบอกประเภท */}
                                        <span className={`w-2 h-2 rounded-full ${
                                            tx.type === 'IN' ? 'bg-green-500' : 
                                            tx.type === 'OUT' ? 'bg-red-500' : 
                                            'bg-indigo-500'
                                          }`}>
                                        </span>
                                        {tx.reason}
                                      </div>
                                    </td>
                                    
                                    {/* จำนวนการเปลี่ยนแปลง (Delta) */}
                                    <td className={`p-4 text-right font-bold`}>
                                        {(() => {
                                            let deltaAmount = 0;
                                            let deltaSign = '';
                                            const prevTx = transactions[index + 1]; 

                                            if (tx.type === 'CHECKPOINT') {
                                                const prevBalance = prevTx ? prevTx.balanceAfter : 0;
                                                deltaAmount = tx.balanceAfter - prevBalance;
                                                
                                                deltaSign = deltaAmount >= 0 ? '+' : '-';
                                                deltaAmount = Math.abs(deltaAmount);
                                            } else { // IN or OUT
                                                deltaAmount = parseFloat(tx.amount);
                                                deltaSign = tx.type === 'OUT' ? '-' : '+';
                                            }

                                            // กำหนดสีตามเครื่องหมาย
                                            const deltaClass = deltaSign === '-' ? 'text-red-500' : deltaSign === '+' ? 'text-green-500' : 'text-gray-500';

                                            return (
                                                <span className={deltaClass}>
                                                    {deltaSign}
                                                    {deltaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    
                                    {/* ยอดคงเหลือสุดท้าย */}
                                    <td className="p-4 text-right text-gray-800 font-bold">
                                        {tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    
                                    {/* ปุ่มลบ */}
                                    <td className="p-4 text-center">
                                        <button onClick={() => deleteTransaction(tx.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                            {/* จำนวนคอลัมน์ = 5 */}
                            {transactions.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">ยังไม่มีรายการ</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
          </div>


          {/* ZONE 3: บวกลบส่วนต่าง & USDT Sum (Bottom Right - Spans 1 column) */}
          <div className="lg:col-span-1">
            
            {/* 3.1: เครื่องคำนวณกำไร P2P */}
            <Card title="เครื่องคำนวณกำไร P2P" icon={<Calculator size={20} className="text-orange-500" />} className="border-orange-100/50 shadow-orange-50">
              <div className="space-y-6">

                {/* เลือกระดับสมาชิก */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">ระดับสมาชิก</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                    {RANK_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setRank(r.value)}
                        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl transition-all ${
                          rank === r.value ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <span className="text-sm font-bold">{r.label}</span>
                        <span className="text-[10px] font-medium opacity-70">ลดค่าธรรมเนียม {Math.round(r.discount * 100)}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ราคาขาย / ราคารับซื้อ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">ราคาขาย (Sell)</label>
                    <input
                      type="number" inputMode="decimal"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className={`${inputStyle} text-right font-mono text-lg focus:ring-orange-100 focus:border-orange-300`}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">ราคารับซื้อ (Buy)</label>
                    <input
                      type="number" inputMode="decimal"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className={`${inputStyle} text-right font-mono text-lg focus:ring-orange-100 focus:border-orange-300`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <p className="text-xs text-center text-gray-400 -mt-2">
                  หน่วย LAK / USDT · ค่าธรรมเนียมจริงต่อฝั่ง{' '}
                  <span className="font-semibold text-gray-500">{(effectiveFee * 100).toFixed(3)}%</span>
                  {' '}(ฐาน 0.20% ลด {Math.round(currentRank.discount * 100)}%)
                </p>

                {/* ผลลัพธ์กำไรสุทธิ: 100 / 1,000 USDT */}
                <div className="space-y-3 pt-4 border-t border-dashed border-gray-200">
                  <ProfitRow label="กำไรสุทธิ · 100 USDT" data={profit100} />
                  <ProfitRow label="กำไรสุทธิ · 1,000 USDT" data={profit1000} />
                </div>

                {/* จำนวนกำหนดเอง */}
                <div className="pt-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">จำนวนกำหนดเอง (USDT)</label>
                  <input
                    type="number" inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className={`${inputStyle} text-right font-mono text-lg mb-3 focus:ring-orange-100 focus:border-orange-300`}
                    placeholder="เช่น 500"
                  />
                  <ProfitRow label={`กำไรสุทธิ · ${customAmount || 0} USDT`} data={profitCustom} highlight />
                </div>
              </div>
            </Card>

            {/* 3.2: คำนวณ USDT รวม */}
            <Card title="รวมยอด USDT (สำหรับ Session)" icon={<Plus size={20} className="text-indigo-500" />} className="mt-8">
                <div className="space-y-4">
                    {/* Input 1: เหรียญที่ขายอยู่ */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">เหรียญที่ขายอยู่</label>
                        <input 
                            type="number" inputMode="decimal" 
                            value={sellingUSDT}
                            onChange={(e) => setSellingUSDT(e.target.value)}
                            className={`${inputStyle} text-right font-mono text-xl`}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Input 2: เหรียญที่รอรับซื้อ */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-2">เหรียญที่รอรับซื้อ</label>
                        <input 
                            type="number" inputMode="decimal" 
                            value={buyingUSDT}
                            onChange={(e) => setBuyingUSDT(e.target.value)}
                            className={`${inputStyle} text-right font-mono text-xl`}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Output: จำนวน USDT รวม */}
                    <div className="pt-4 mt-4 border-t border-dashed border-gray-200">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-gray-500 font-medium">จำนวน USDT รวม</span>
                        </div>
                        <div className={`text-4xl font-extrabold text-right text-indigo-600`}>
                            {totalUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                            <span className="text-lg text-gray-400 font-medium">USDT</span>
                        </div>
                    </div>
                </div>
            </Card>
             <p className="text-center text-xs text-gray-400 mt-4">
                 * ยอด/ประวัติซิงก์ผ่านฐานข้อมูลกลาง — เข้าดูและอัปเดตได้จากทุกอุปกรณ์
             </p>
          </div>

        </div>
      </div>
    </main>
  );
}