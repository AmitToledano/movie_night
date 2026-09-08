"use client";

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { createClient } from '@supabase/supabase-js';

const seatsLayout = [
  { id: 1, top: '56%', left: '12%', isAvailable: true },
  { id: 2, top: '40%', left: '38%', isAvailable: true },
  { id: 3, top: '58%', left: '38%', isAvailable: true },
  { id: 4, top: '50%', left: '50%', isAvailable: true },
  { id: 5, top: '40%', left: '62%', isAvailable: true },
  { id: 6, top: '56%', left: '68%', isAvailable: true },
  { id: 7, top: '75%', left: '42%', isAvailable: true },
  { id: 8, top: '75%', left: '58%', isAvailable: true },
];

const upcomingMovies = [
  {
    id: 1,
    title: 'גשם של אומגה 3',
    image: '/upcoming-1.png',
    description: 'הממציא הגאון דני ניסה לפתור את בעיית התזונה העולמית, אבל משהו השתבש... במקום כדורי פלאפל, השמיים ממטירים כמוסות דגים! קומדיה מטורפת ורווית בריאות שבה דני מנסה לעצור את סופת האומגה 3 לפני שהעולם כולו יהפוך לסלמון.'
  },
  {
    id: 2,
    title: 'אימת בדיקת הדם',
    image: '/upcoming-2.png',
    description: 'מותחן פסיכולוגי מצמרר שישאיר אתכם ללא נשימה. ליה יוצאת לבדיקה שגרתית, אך מוצאת את עצמה לכודה במבוך סיוטי של מסדרונות בית חולים, אחיות מקריפות ותורי המתנה נצחיים. האם תצליח להוציא את המבחנה ולשרוד?'
  },
  {
    id: 3,
    title: 'הנחפף הראשון שלי',
    image: '/upcoming-3.png',
    description: 'דרמה קומית מרגשת על התחלות חדשות. כששלום, החייל החדש והמבולבל, נוחת במדור, רק החופפת המיתולוגית שירה יכולה להציל אותו מטביעה. מסע שכולו חברות, באגים בקוד, והרגע הקסום שבו הנחפף פורש כנפיים.'
  },
  {
    id: 4,
    title: 'גיל צימר ואבן החכמים',
    image: '/upcoming-4.png',
    description: 'גיל צימרמן מגלה שהוא לא סתם בחור רגיל - הוא קוסם! הצטרפו למסעו הפנטסטי בו יאלץ ללמוד לרקוח שיקויים ולהתעמת מול אדון האופל האכזר שכולם פוחדים לומר את שמו... דניאל אוסי. קסם של קולנוע!'
  },
  {
    id: 5,
    title: 'עוזר בית',
    image: '/upcoming-5.png',
    description: 'דרמת מסתורין סוחפת. ניתן וקסלר, עוזר בית שקט וקפדן, נכנס לנקות את אחוזתה של משפחה יוקרתית. אך בין השטיחים והארונות, מתגלים סודות שמשנים הכל. כי יש לכלוך שאף אקונומיקה לא יכולה להעלים...'
  }
];

// --- הגדרות חיבור ל-Supabase ---
const supabaseUrl = 'https://uuivyqdozodkphetembd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aXZ5cWRvem9ka3BoZXRlbWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Nzg1MjMsImV4cCI6MjEwNDQ1NDUyM30.K2gl8Xe0GwXEULVsD9pWWaq9AP2dHqSoHj4asTW2-8M';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CinemaApp() {
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');

  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [snacks, setSnacks] = useState({ popcorn: 0, nachos: 0, drinks: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLockingSeat, setIsLockingSeat] = useState(false);

  const [flippedMovie, setFlippedMovie] = useState<number | null>(null);

  const [dbSeats, setDbSeats] = useState<any[]>([]);

  const ticketRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [scrollTranslate, setScrollTranslate] = useState(0);

  useEffect(() => {
    const fetchSeats = async () => {
      const { data } = await supabase.from('seats').select('*').order('id');
      if (data) setDbSeats(data);
    };

    fetchSeats();

    const channel = supabase
      .channel('public:seats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seats' }, (payload) => {
        setDbSeats(prev => prev.map(seat => seat.id === payload.new.id ? payload.new : seat));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleFinalizeOrder = async () => {
    if (!selectedSeat) return;
    setIsLockingSeat(true);

    const { data, error } = await supabase
      .from('seats')
      .update({ is_available: false, booked_by: nickname || fullName })
      .eq('id', selectedSeat)
      .eq('is_available', true)
      .select();

    setIsLockingSeat(false);

    if (error || !data || data.length === 0) {
      alert('אופס! מישהו בדיוק תפס את המושב הזה בזמן שבחרת פופקורן. אנא בחר מושב אחר.');
      setSelectedSeat(null);
      setStep(2);
      return;
    }

    nextStep();
  };

  const handleSnackChange = (item: keyof typeof snacks, amount: number) => {
    setSnacks(prev => ({ ...prev, [item]: Math.max(0, prev[item] + amount) }));
  };

  const downloadTicket = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(ticketRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `Spider_Ticket_${nickname || fullName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ticket', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleScrollMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current || !scrollContentRef.current) return;
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = 1 - (x / rect.width);
    const overflow = content.scrollWidth - rect.width;
    if (overflow > 0) {
      setScrollTranslate(overflow * percentage);
    }
  };

  const isFormValid = fullName.trim() !== '' && nickname.trim() !== '' && selectedMovie !== null;

  const renderStep1 = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-inner">
        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">פרטי המזמין</label>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="שם מלא"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-lg p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="text"
            placeholder="כינוי"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-lg p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">בחירת סרט להקרנה הקרובה</label>
        <div
          onClick={() => setSelectedMovie('bullet-train')}
          className={`cursor-pointer transition-all duration-300 flex flex-col md:flex-row items-center bg-zinc-900 border-2 rounded-2xl p-4 gap-6 relative overflow-hidden group ${selectedMovie === 'bullet-train'
            ? 'border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.4)] bg-red-950/20'
            : 'border-zinc-700 hover:border-zinc-500'
            }`}
        >
          <img
            src="/image_bc1988.jpg"
            alt="רכבת הקליע"
            className={`w-32 h-48 object-cover rounded-xl shadow-lg z-10 transition-transform duration-300 ${selectedMovie === 'bullet-train' ? 'scale-105' : 'group-hover:scale-105'}`}
          />
          <div className="z-10 text-center md:text-right w-full flex flex-col justify-center h-full">
            <h3 className="text-3xl font-black mb-2 text-white drop-shadow-md">רכבת הקליע</h3>
            <p className="text-red-400 font-medium mb-4">שעת הקרנה: 18:00</p>
            <div className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-colors ${selectedMovie === 'bullet-train' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
              }`}>
              {selectedMovie === 'bullet-train' ? '✓ הסרט נבחר' : 'לחץ לבחירה'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-end">
          <span>בקרוב ב-Spider Cinema</span>
          <span className="text-[10px] text-zinc-600 font-normal normal-case opacity-70">&larr; הזז עכבר כדי לגלול, לחץ כדי לקרוא &rarr;</span>
        </label>

        <div
          ref={scrollContainerRef}
          onMouseMove={handleScrollMouseMove}
          className="w-full overflow-hidden cursor-ew-resize relative rounded-xl py-4 -my-4"
        >
          <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-zinc-900 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-zinc-900 to-transparent z-10 pointer-events-none"></div>

          <div
            ref={scrollContentRef}
            className="flex gap-4 w-max transition-transform duration-500 ease-out py-2 px-2"
            style={{ transform: `translateX(${scrollTranslate}px)` }}
          >
            {upcomingMovies.map((movie) => {
              const isFlipped = flippedMovie === movie.id;
              return (
                <div
                  key={movie.id}
                  className="w-[120px] md:w-[150px] flex-shrink-0 cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:scale-105 [perspective:1000px]"
                  onClick={() => setFlippedMovie(isFlipped ? null : movie.id)}
                >
                  <div className={`w-full aspect-[2/3] relative transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                    <div className="absolute inset-0 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-lg [backface-visibility:hidden]">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-all duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    {/* צד אחורי - תיאור */}
                    <div className="absolute inset-0 bg-zinc-800 rounded-xl border-2 border-red-900/50 overflow-hidden shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] p-2 flex flex-col items-center text-center">
                      <h4 className="text-white font-bold mt-1 mb-1 text-xs md:text-sm drop-shadow-md leading-tight px-1">{movie.title}</h4>

                      {/* אזור התוכן עם גלילה נסתרת */}
                      <div className="w-full flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center px-1">
                        <p className="text-zinc-300 text-[10px] md:text-[11px] leading-tight md:leading-snug">{movie.description}</p>
                      </div>

                      <div className="mt-1 text-[9px] md:text-[10px] text-red-400 animate-pulse font-bold">בקרוב</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        disabled={!isFormValid}
        onClick={nextStep}
        className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        בחר מקום
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in text-center w-full">
      <h2 className="text-2xl font-bold mb-2">בחירת מושבים - משרד Spider</h2>
      <p className="text-gray-400 text-sm mb-6">לחץ על מושב פנוי כדי לתפוס אותו להקרנה</p>

      <div className="relative w-full h-[450px] md:h-[550px] bg-zinc-950 border-2 border-zinc-800 rounded-xl overflow-hidden mx-auto shadow-2xl">
        <div className="absolute top-0 left-[25%] w-[50%] h-[12%] bg-blue-900/20 border-b-2 border-blue-400/50 flex items-center justify-center shadow-[0_10px_40px_rgba(96,165,250,0.15)]">
          <span className="text-blue-400/70 text-xs md:text-sm font-bold tracking-[0.3em]">SCREEN</span>
        </div>

        <div className="absolute top-[14%] left-[26%] w-[23%] h-[6%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[14%] left-[51%] w-[23%] h-[6%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[22%] left-[21%] w-[15%] h-[5%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[29%] left-[21%] w-[8%] h-[8%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[48%] left-[17%] w-[8%] h-[28%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[30%] left-[78%] w-[8%] h-[18%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>
        <div className="absolute top-[50%] left-[78%] w-[8%] h-[18%] bg-zinc-800/40 rounded-sm border border-zinc-700/50 backdrop-blur-sm"></div>

        <div className="absolute top-[70%] left-[76%] w-[12%] h-[16%] bg-zinc-900/90 rounded-lg border border-zinc-700 shadow-xl flex flex-col items-center justify-center p-1">
          <div className="text-green-500 font-mono text-[10px] font-black tracking-widest border border-green-500/50 px-1.5 rounded mb-1 bg-green-500/10 shadow-[0_0_8px_rgba(34,197,94,0.3)]">
            DOOR
          </div>
          <svg className="w-6 h-6 text-zinc-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-[35%] w-[30%] h-[10%] bg-zinc-800/40 rounded-t-lg border-t border-x border-zinc-700/50 flex flex-col items-center justify-start pt-2">
          <div className="w-12 h-4 bg-zinc-950 rounded flex items-center justify-center border border-zinc-700 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          </div>
        </div>

        {seatsLayout.map(layoutSeat => {
          const dbSeat = dbSeats.find(s => s.id === layoutSeat.id);
          const isAvailable = dbSeat ? dbSeat.is_available : layoutSeat.isAvailable;
          const isSelected = selectedSeat === layoutSeat.id;
          const bookedBy = dbSeat?.booked_by;

          return (
            <button
              key={layoutSeat.id}
              disabled={!isAvailable}
              onClick={() => setSelectedSeat(layoutSeat.id)}
              style={{ top: layoutSeat.top, left: layoutSeat.left }}
              className={`absolute group w-12 h-14 md:w-14 md:h-16 -ml-6 -mt-7 md:-ml-7 md:-mt-8 flex flex-col items-center justify-end transition-all duration-300 z-10 ${!isAvailable ? 'cursor-not-allowed opacity-50' : 'hover:scale-110'
                } ${isSelected ? 'scale-110 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]' : ''}`}
            >
              <div className={`w-3/4 h-2/5 rounded-t-xl transition-colors duration-300 ${isSelected ? 'bg-red-500' : 'bg-zinc-600 group-hover:bg-zinc-500'}`}></div>
              <div className="w-full h-3/5 flex justify-between items-end relative">
                <div className={`w-[22%] h-full rounded-md transition-colors duration-300 ${isSelected ? 'bg-red-800' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}></div>
                <div className={`w-[56%] h-4/5 rounded-t-lg absolute left-[22%] bottom-0 flex items-center justify-center transition-colors duration-300 shadow-inner px-0.5 overflow-hidden ${isSelected ? 'bg-red-600' : 'bg-zinc-500 group-hover:bg-zinc-400'}`}>
                  <span className={`text-[9px] md:text-[10px] font-black mb-1 w-full truncate text-center ${isSelected ? 'text-white' : 'text-zinc-900'} ${!isAvailable ? 'text-zinc-800' : ''}`}>
                    {!isAvailable && bookedBy ? bookedBy : layoutSeat.id}
                  </span>
                </div>
                <div className={`w-[22%] h-full rounded-md transition-colors duration-300 ${isSelected ? 'bg-red-800' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={prevStep} className="w-1/3 bg-zinc-800 text-white py-4 rounded-xl hover:bg-zinc-700 transition-colors">חזור</button>
        <button
          disabled={!selectedSeat}
          onClick={nextStep}
          className="w-2/3 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          המשך למזנון
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-6">🍿 מזנון קולנוע</h2>

      <div className="space-y-4">
        {[
          { id: 'popcorn', name: 'פופקורן גדול', icon: '🍿' },
          { id: 'nachos', name: 'נאצ׳וס ורוטב גבינה', icon: '🧀' },
          { id: 'drinks', name: 'שתייה קלה', icon: '🥤' }
        ].map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-4 text-xl">
              <span>{item.icon}</span>
              <span className="font-medium text-gray-200">{item.name}</span>
            </div>
            <div className="flex items-center gap-4 bg-zinc-800 rounded-lg p-1">
              <button onClick={() => handleSnackChange(item.id as keyof typeof snacks, -1)} className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-md hover:bg-zinc-600 text-xl font-bold transition-colors">-</button>
              <span className="w-6 text-center font-bold text-lg">{snacks[item.id as keyof typeof snacks]}</span>
              <button onClick={() => handleSnackChange(item.id as keyof typeof snacks, 1)} className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-md hover:bg-zinc-600 text-xl font-bold transition-colors">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button onClick={prevStep} className="w-1/3 bg-zinc-800 text-white py-4 rounded-xl hover:bg-zinc-700 transition-colors">חזור</button>
        <button
          onClick={handleFinalizeOrder}
          disabled={isLockingSeat}
          className="w-2/3 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center disabled:opacity-75"
        >
          {isLockingSeat ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              משריין ומנפיק כרטיס...
            </span>
          ) : 'סיום והנפקת כרטיס'}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const ticketData = `SpiderMovie-${nickname}-Seat${selectedSeat}-BulletTrain`;

    return (
      <div className="flex flex-col items-center animate-fade-in">
        <div
          ref={ticketRef}
          className="bg-white text-black w-80 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.4)]"
        >
          <div className="bg-red-700 text-white p-4 text-center border-b-4 border-dashed border-gray-300 relative">
            <h1 className="text-xl font-black uppercase tracking-wide">Spider Cinema</h1>
            <p className="text-sm font-medium mt-1">רכבת הקליע | 18:00</p>
          </div>

          <div className="p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] relative">
            <div className="mb-4 text-right">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Ticket Holder</p>
              <p className="text-xl font-bold text-gray-900 border-b pb-1">
                {nickname} <span className="text-sm text-gray-500 font-normal">({fullName})</span>
              </p>
            </div>

            <div className="flex justify-between mb-4 border-b pb-4 mt-4" dir="ltr">
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Seat</p>
                <p className="text-3xl font-black text-red-600">{selectedSeat}</p>
              </div>
              <div className="text-right flex flex-col justify-end">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Snacks</p>
                <p className="text-sm font-bold text-gray-800 text-left">
                  {snacks.popcorn > 0 && `🍿 x${snacks.popcorn} `}
                  {snacks.nachos > 0 && `🧀 x${snacks.nachos} `}
                  {snacks.drinks > 0 && `🥤 x${snacks.drinks}`}
                  {Object.values(snacks).every(v => v === 0) && 'None'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center mt-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <QRCode value={ticketData} size={130} level="M" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 w-full max-w-xs">
          <button
            onClick={downloadTicket}
            disabled={isDownloading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDownloading ? 'מכין תמונה...' : '⬇️ הורד כרטיס'}
          </button>
        </div>

        <button onClick={() => {
          setStep(1);
          setSelectedMovie(null);
          setSelectedSeat(null);
          setSnacks({ popcorn: 0, nachos: 0, drinks: 0 });
          setFullName('');
          setNickname('');
          setFlippedMovie(null);
        }} className="mt-4 text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4">
          התחל הזמנה חדשה
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 flex items-center justify-center font-sans selection:bg-red-500" dir="rtl">
      <div className="max-w-2xl w-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-600/5 blur-[100px] pointer-events-none -z-10"></div>

        <div className="mb-8 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 mb-6 drop-shadow-md tracking-tight">
            SPIDER MOVIE NIGHT
          </h1>
          <div className="flex justify-center items-center gap-2 text-xs md:text-sm text-gray-500 font-medium tracking-wide bg-zinc-950/50 py-2 px-4 rounded-full inline-flex border border-zinc-800">
            <span className={`transition-colors ${step >= 1 ? 'text-red-500' : ''}`}>1. פרטים</span>
            <span>•</span>
            <span className={`transition-colors ${step >= 2 ? 'text-red-500' : ''}`}>2. מקום</span>
            <span>•</span>
            <span className={`transition-colors ${step >= 3 ? 'text-red-500' : ''}`}>3. מזנון</span>
            <span>•</span>
            <span className={`transition-colors ${step === 4 ? 'text-red-500' : ''}`}>4. כרטיס</span>
          </div>
        </div>

        <div className="relative z-10">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}