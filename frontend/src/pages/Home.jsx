import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen text-glass-main overflow-x-hidden">
      <header className="fixed top-3 left-0 right-0 z-50 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto h-16 sm:h-20 flex items-center justify-between glass-surface rounded-2xl sm:rounded-3xl px-3 sm:px-6 border border-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
              <span className="material-symbols-outlined text-2xl">movie_edit</span>
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-blue-900">Cineshadow <span className="font-medium text-blue-600">Languages</span></span>
          </div>
          <nav className="hidden lg:flex items-center gap-2 glass-surface rounded-full px-3 py-2 border border-white/70">
            <Link className="px-3 py-1.5 rounded-full text-sm font-semibold text-glass-subtle hover:bg-white/60 hover:text-blue-700 transition" to="/library">Thư viện</Link>
            <Link className="px-3 py-1.5 rounded-full text-sm font-semibold text-glass-subtle hover:bg-white/60 hover:text-blue-700 transition" to="/library?track=chinese">Lộ trình Trung</Link>
            <Link className="px-3 py-1.5 rounded-full text-sm font-semibold text-glass-subtle hover:bg-white/60 hover:text-blue-700 transition" to="/library?track=english">Lộ trình Anh</Link>
            <Link className="px-3 py-1.5 rounded-full text-sm font-semibold text-glass-subtle hover:bg-white/60 hover:text-blue-700 transition" to="#">Blog</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="glass-btn glass-btn-primary px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-28 pb-10">
        <section className="relative overflow-hidden py-14 sm:py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10 space-y-7 animate-glass-rise">
              <div className="inline-flex items-center gap-2 px-4 py-2 glass-pill text-blue-700 text-xs font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Cách học của Gen Z
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-blue-950 leading-[1.05] tracking-tight">
                Học ngoại ngữ <span className="italic text-blue-600">"chuẩn đét"</span> cùng phim ảnh
              </h1>
              <p className="text-base sm:text-xl text-glass-subtle max-w-xl leading-relaxed">
                Shadowing là công cụ cực hiệu quả để luyện phản xạ giao tiếp thực chiến qua phim ảnh, hiện đã mở rộng cho cả lộ trình tiếng Trung và tiếng Anh.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="glass-btn glass-btn-primary px-6 sm:px-10 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold flex items-center justify-center gap-2">
                  Học ngay
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <a href="#shadowing-info" className="glass-btn px-6 sm:px-10 py-4 sm:py-5 rounded-2xl text-blue-700 text-base sm:text-lg font-bold flex items-center justify-center gap-2">
                  Tìm hiểu thêm
                </a>
              </div>
              <div className="inline-flex flex-wrap gap-2 text-xs sm:text-sm text-blue-700 font-semibold">
                <span className="glass-chip px-3 py-1">Lộ trình tiếng Trung</span>
                <span className="glass-chip px-3 py-1">Lộ trình tiếng Anh</span>
              </div>
            </div>
            
            <div className="relative animate-glass-rise" style={{ animationDelay: '0.08s' }}>
              <div className="absolute -top-12 -right-12 w-72 h-72 bg-blue-400/25 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-8 w-64 h-64 bg-cyan-300/25 rounded-full blur-3xl" />
              <div className="relative rounded-[30px] overflow-hidden glass-surface-strong border border-white/70 p-3 sm:p-4">
                <img alt="Student studying with headphones" className="w-full aspect-[4/3] object-cover rounded-2xl" src="https://i.pinimg.com/736x/f1/b0/65/f1b065ad3ea884656c2661ac10ce3cb4.jpg" />
                <div className="absolute bottom-7 left-7 right-7 p-4 glass-surface rounded-2xl flex items-center gap-4 border border-white/75">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-400/35">
                    <span className="material-symbols-outlined">graphic_eq</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-glass-subtle uppercase tracking-tight">Đang luyện tập</p>
                    <p className="text-sm font-bold text-blue-900">Đi đến nơi có gió - Episode 04</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-2 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-sequence">
            <Link to="/library?track=chinese" className="stagger-item glass-surface rounded-3xl p-6 border border-white/70 space-y-3 glass-hover-lift">
              <div className="inline-flex items-center gap-2 text-blue-700 font-semibold">
                <span className="material-symbols-outlined">south_america</span>
                Lộ trình tiếng Trung
              </div>
              <h3 className="text-2xl font-bold text-blue-950">Tập trung phát âm và ngữ điệu bản xứ</h3>
              <p className="text-glass-subtle">Đi từ HSK cơ bản đến giao tiếp đời sống với phụ đề CN/VI/Pinyin và luyện shadowing theo câu.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Vào thư viện <span className="material-symbols-outlined text-base">arrow_forward</span></span>
            </Link>

            <Link to="/library?track=english" className="stagger-item glass-surface rounded-3xl p-6 border border-white/70 space-y-3 glass-hover-lift">
              <div className="inline-flex items-center gap-2 text-blue-700 font-semibold">
                <span className="material-symbols-outlined">language</span>
                Lộ trình tiếng Anh
              </div>
              <h3 className="text-2xl font-bold text-blue-950">Luyện phản xạ hội thoại theo ngữ cảnh thật</h3>
              <p className="text-glass-subtle">Theo dõi nội dung video tiếng Anh theo từng level, luyện bắt âm và nói đuổi để tăng tự tin giao tiếp.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Khám phá ngay <span className="material-symbols-outlined text-base">arrow_forward</span></span>
            </Link>
          </div>
        </section>

        <section id="shadowing-info" className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-950">Shadowing là gì?</h2>
            <p className="text-lg text-glass-subtle max-w-2xl mx-auto">3 bước đơn giản để làm chủ phát âm mà không cần nhồi nhét từ vựng khô khan.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-sequence">
            <div className="stagger-item glass-surface rounded-3xl p-8 border border-white/70 flex flex-col items-center text-center space-y-6 glass-hover-lift">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-300/40">
                <span className="material-symbols-outlined text-4xl text-white">headset</span>
              </div>
              <h3 className="text-2xl font-bold text-blue-950">1. Nghe kỹ</h3>
              <p className="text-glass-subtle">Nghe đoạn hội thoại trong phim để nắm bắt ngữ điệu và cảm xúc của nhân vật.</p>
            </div>
            <div className="stagger-item glass-surface rounded-3xl p-8 border border-white/70 flex flex-col items-center text-center space-y-6 glass-hover-lift">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-violet-400 flex items-center justify-center shadow-lg shadow-fuchsia-300/40">
                <span className="material-symbols-outlined text-4xl text-white">record_voice_over</span>
              </div>
              <h3 className="text-2xl font-bold text-blue-950">2. Bắt chước</h3>
              <p className="text-glass-subtle">Đuổi theo lời thoại ngay lập tức với tốc độ và ngữ khí y hệt bản gốc.</p>
            </div>
            <div className="stagger-item glass-surface rounded-3xl p-8 border border-white/70 flex flex-col items-center text-center space-y-6 glass-hover-lift">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-300/40">
                <span className="material-symbols-outlined text-4xl text-white">mic</span>
              </div>
              <h3 className="text-2xl font-bold text-blue-950">3. Ghi âm</h3>
              <p className="text-glass-subtle">Nghe lại bản ghi âm của mình để AI so sánh độ chính xác và sửa lỗi.</p>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative glass-surface-strong rounded-[32px] p-6 sm:p-12 lg:p-20 overflow-hidden text-center space-y-6 sm:space-y-8 border border-white/70">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-300/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-950 relative z-10">
              Gia nhập cộng đồng học ngoại ngữ mỗi ngày
            </h2>
            <p className="text-lg sm:text-xl text-glass-subtle max-w-2xl mx-auto relative z-10">
              Bắt đầu hành trình chinh phục tiếng Trung hoặc tiếng Anh qua phim ảnh ngay hôm nay. Miễn phí cho các bài học khởi động.
            </p>
            <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="glass-btn glass-btn-primary px-12 py-5 rounded-full text-xl font-bold w-full sm:w-auto text-center">
                Bắt đầu ngay thôi!
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto glass-surface rounded-3xl border border-white/70 py-10 text-center">
          <span className="text-xl font-extrabold text-blue-800">Cineshadow <span className="font-medium text-blue-600">Languages</span></span>
          <p className="text-glass-subtle mt-4">Nền tảng học ngoại ngữ bằng shadowing hiện đại.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;