'use client'; 

import React, { useState, useEffect } from 'react';
import { Save, Plus, Minus, Trash2, History, Calculator, Wallet, ArrowRightLeft } from 'lucide-react';

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
  
  // สำหรับการคำนวณ USDT รวม
  const [sellingUSDT, setSellingUSDT] = useState('');
  const [buyingUSDT, setBuyingUSDT] = useState('');

  // LocalStorage Setup
  useEffect(() => {
    const saved = localStorage.getItem('crypto_transactions_v2'); 
    if (saved) setTransactions(JSON.parse(saved));
    const savedSell = localStorage.getItem('last_sell_price');
    const savedBuy = localStorage.getItem('last_buy_price');
    const savedSelling = localStorage.getItem('selling_usdt');
    const savedBuying = localStorage.getItem('buying_usdt');

    if (savedSell) setSellPrice(savedSell);
    if (savedBuy) setBuyPrice(savedBuy);
    if (savedSelling) setSellingUSDT(savedSelling);
    if (savedBuying) setBuyingUSDT(savedBuying);

    setIsLoaded(true);
  }, []);

  // Update Balance & Save (Includes new USDT states)
  useEffect(() => {
    if (!isLoaded) return; 
    localStorage.setItem('crypto_transactions_v2', JSON.stringify(transactions));
    localStorage.setItem('last_sell_price', sellPrice);
    localStorage.setItem('last_buy_price', buyPrice);
    localStorage.setItem('selling_usdt', sellingUSDT);
    localStorage.setItem('buying_usdt', buyingUSDT);
    
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setCurrentBalance(sorted[0].balanceAfter);
    } else {
      setCurrentBalance(0);
    }
  }, [transactions, isLoaded, sellPrice, buyPrice, sellingUSDT, buyingUSDT]);

  // Handle Scheduled Checkpoint
  const handleSaveScheduled = () => {
    if (!scheduledAmount) return;
    const amountNum = parseFloat(scheduledAmount);
    const newRecord = {
      id: Date.now(), timestamp: new Date().toISOString(), displayTime: new Date().toLocaleString('th-TH'),
      type: 'CHECKPOINT', timeSlot: timeSlot, amount: amountNum, reason: `ยอดคงเหลือรอบ ${timeSlot}`, balanceAfter: amountNum
    };
    setTransactions([newRecord, ...transactions]); setScheduledAmount('');
  };

  // Handle In/Out Transaction
  const handleTransaction = () => {
    if (!txAmount) return;
    const amountNum = parseFloat(txAmount);
    let newBalance = currentBalance;
    if (txType === 'IN') newBalance += amountNum; else newBalance -= amountNum;
    const newRecord = {
      id: Date.now(), timestamp: new Date().toISOString(), displayTime: new Date().toLocaleString('th-TH'),
      type: txType, amount: amountNum, reason: txReason || (txType === 'IN' ? 'รับเข้า' : 'จ่ายออก'), balanceAfter: newBalance
    };
    setTransactions([newRecord, ...transactions]); setTxAmount(''); setTxReason('');
  };

  // Delete Transaction
  const deleteTransaction = (id) => {
    if(!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  // UI Components
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

  const inputStyle = "w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-700 font-medium placeholder:text-gray-400";
  
  // Calculate total USDT for display
  const totalUSDT = parseFloat(sellingUSDT || 0) + parseFloat(buyingUSDT || 0);

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 md:p-12 font-sans text-gray-800 antialiased">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="text-center py-4">
           {/* [UPDATE]: เปลี่ยนชื่อเป็น KRYPTONITE TECHNOLOGY */}
           <h1 className="text-2xl font-bold text-gray-900 mb-2">KRYPTONITE TECHNOLOGY</h1>
           <p className="text-gray-500 text-sm">ระบบบันทึกและคำนวณยอดเหรียญ</p>
        </div>

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
                  type="number" 
                  placeholder="ระบุยอดคงเหลือที่นับได้" 
                  value={scheduledAmount}
                  onChange={(e) => setScheduledAmount(e.target.value)}
                  className={`${inputStyle} flex-1 text-lg font-semibold`}
                />
                <button 
                  onClick={handleSaveScheduled}
                  className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-semibold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                  <Save size={20} /> บันทึก
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
                    type="number" 
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
                  className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-md transition-transform active:scale-[0.98] flex items-center justify-center gap-2
                    ${txType === 'IN' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
                >
                  ยืนยันทำรายการ {txType === 'IN' ? 'รับเข้า' : 'จ่ายออก'}
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
                            {transactions.slice(0, 10).map((tx, index) => ( 
                                <tr key={tx.id} className="hover:bg-gray-50 transition">
                                    {/* วันที่ / เวลา */}
                                    <td className="p-4 text-gray-500 whitespace-nowrap">
                                        <div className="text-xs text-gray-500">{tx.displayTime.split(' ')[0]}</div> 
                                        <div className="font-medium text-gray-700">{tx.displayTime.split(' ')[1]}</div> 
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
                            ))}
                            {/* จำนวนคอลัมน์ = 5 */}
                            {transactions.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">ยังไม่มีรายการ</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
          </div>


          {/* ZONE 3: บวกลบส่วนต่าง & USDT Sum (Bottom Right - Spans 1 column) */}
          <div className="lg:col-span-1">
            
            {/* 3.1: คำนวณส่วนต่าง (LAK) - NOT STICKY */}
            <Card title="คำนวณส่วนต่าง (LAK)" icon={<Calculator size={20} className="text-orange-500" />} className="border-orange-100/50 shadow-orange-50">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">ราคาขาย (Sell)</label>
                  <input 
                    type="number" 
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className={`${inputStyle} text-right font-mono text-2xl focus:ring-orange-100 focus:border-orange-300`}
                    placeholder="0.00"
                  />
                </div>

                <div className="relative">
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white p-1 rounded-full text-gray-400 border border-gray-100">
                      <Minus size={16} />
                   </div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">ราคารับซื้อ (Buy)</label>
                  <input 
                    type="number" 
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className={`${inputStyle} text-right font-mono text-2xl focus:ring-orange-100 focus:border-orange-300`}
                    placeholder="0.00"
                  />
                </div>

                <div className="pt-6 pb-2 mt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-gray-500 font-medium">ส่วนต่าง (กำไร)</span>
                  </div>
                  {/* [UPDATE]: เงื่อนไขสีตามกำไร LAK: > 150 = เขียว, <= 150 = แดง */}
                  {(() => {
                    const profitDifference = sellPrice - buyPrice;
                    
                    // กำหนด Class สีตามเงื่อนไข: > 150 = เขียว, <= 150 = แดง
                    const colorClass = profitDifference > 150 ? 'text-green-500' : 'text-red-500';
                    
                    return (
                      <div className={`text-4xl font-extrabold text-right ${colorClass}`}>
                        {sellPrice && buyPrice 
                          ? profitDifference.toLocaleString() 
                          : '0'
                        } <span className="text-lg text-gray-400 font-medium">LAK</span>
                      </div>
                    );
                  })()}
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
                            type="number" 
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
                            type="number" 
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
                 * ข้อมูลบันทึกในเครื่องนี้เท่านั้น (LocalStorage)
             </p>
          </div>

        </div>
      </div>
    </main>
  );
}