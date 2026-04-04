import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const fetchCurrentUser = async (token) => {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data.success || !data.user) {
    return null;
  }

  return data.user;
};

const Login = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [displayTab, setDisplayTab] = useState('login');
  const [tabMotionClass, setTabMotionClass] = useState('auth-form-idle');
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    passwordConfirm: '', 
    hskLevel: '1',
    terms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const tabSwapTimerRef = useRef(null);
  const tabSettleTimerRef = useRef(null);

  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('redirect') || '';
    if (!raw.startsWith('/') || raw.startsWith('/login')) {
      return null;
    }
    return raw;
  }, [location.search]);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const clearTabAnimationTimers = () => {
    if (tabSwapTimerRef.current) {
      window.clearTimeout(tabSwapTimerRef.current);
      tabSwapTimerRef.current = null;
    }

    if (tabSettleTimerRef.current) {
      window.clearTimeout(tabSettleTimerRef.current);
      tabSettleTimerRef.current = null;
    }
  };

  const switchAuthTab = (nextTab, options = {}) => {
    const { clearError = true } = options;

    if (!nextTab || nextTab === activeTab || isTabSwitching) {
      return;
    }

    const direction = activeTab === 'login' && nextTab === 'register' ? 'forward' : 'backward';
    if (clearError) {
      setError(null);
    }

    clearTabAnimationTimers();
    setActiveTab(nextTab);
    setIsTabSwitching(true);
    setTabMotionClass(direction === 'forward' ? 'auth-form-exit-forward' : 'auth-form-exit-backward');

    tabSwapTimerRef.current = window.setTimeout(() => {
      setDisplayTab(nextTab);
      setTabMotionClass(direction === 'forward' ? 'auth-form-enter-forward' : 'auth-form-enter-backward');

      tabSettleTimerRef.current = window.setTimeout(() => {
        setTabMotionClass('auth-form-idle');
        setIsTabSwitching(false);
        tabSettleTimerRef.current = null;
      }, 280);

      tabSwapTimerRef.current = null;
    }, 150);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);

        const canonicalUser = await fetchCurrentUser(data.token);
        const resolvedUser = canonicalUser || data.user || null;

        if (resolvedUser) {
          localStorage.setItem('user', JSON.stringify(resolvedUser));
        } else {
          localStorage.removeItem('user');
        }

        const fallbackPath = resolvedUser?.role === 'admin' ? '/admin' : '/home';
        navigate(redirectPath || fallbackPath, { replace: true });
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (!formData.terms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng!');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: formData.email.split('@')[0], // Auto generate simple username
          full_name: formData.fullName,
          email: formData.email, 
          password: formData.password,
          hsk_level: parseInt(formData.hskLevel)
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        switchAuthTab('login', { clearError: false });
        setError('Đăng ký thành công! Vui lòng đăng nhập.');
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => {
    clearTabAnimationTimers();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="absolute top-16 left-[-4rem] w-44 h-44 bg-blue-300/40 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-8 right-[-5rem] w-56 h-56 bg-cyan-300/35 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-lg animate-glass-rise">
        <div className="text-center mb-7">
          <Link to="/home" className="inline-flex items-center gap-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
              <span className="material-symbols-outlined text-2xl">movie_edit</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-blue-950 mt-4">Chào mừng trở lại</h1>
          <p className="text-glass-subtle mt-1">Đăng nhập để tiếp tục hành trình học tiếng Trung</p>
        </div>

        <div className="glass-surface-strong rounded-[30px] border border-white/70 p-5 sm:p-8">
          <div className="glass-surface rounded-2xl p-1.5 mb-7 border border-white/70 flex">
            <button
              className={`flex-1 py-2.5 text-sm font-semibold transition glass-tab ${activeTab === 'login' ? 'glass-tab-active' : ''}`}
              onClick={() => { switchAuthTab('login'); }}
              disabled={loading || isTabSwitching}
            >
              Đăng nhập
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-semibold transition glass-tab ${activeTab === 'register' ? 'glass-tab-active' : ''}`}
              onClick={() => { switchAuthTab('register'); }}
              disabled={loading || isTabSwitching}
            >
              Đăng ký
            </button>
          </div>

          {error && (
            <div className={`mb-6 p-3 rounded-xl text-sm text-center border ${error.includes('thành công') ? 'bg-emerald-100/70 border-emerald-300/40 text-emerald-700' : 'bg-rose-100/70 border-rose-300/40 text-rose-700'}`}>
              {error}
            </div>
          )}

          <div className={`auth-form-shell ${tabMotionClass}`}>
            {displayTab === 'login' && (
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="relative">
                <input
                  type="text"
                  id="loginEmail"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="glass-input w-full px-4 py-3"
                  placeholder="Email hoặc username"
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPassword"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="glass-input w-full px-4 py-3 pr-12"
                  placeholder="Mật khẩu"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-glass-subtle hover:text-blue-700" onClick={() => setShowPassword(!showPassword)}>
                  <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-glass-subtle">
                  <input type="checkbox" name="remember" className="rounded border-white/70 text-blue-600 focus:ring-blue-300" />
                  Ghi nhớ đăng nhập
                </label>
                <a href="#" className="text-blue-600 hover:underline">Quên mật khẩu?</a>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 glass-btn glass-btn-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                <span className="material-symbols-outlined text-lg">login</span>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
              </form>
            )}

            {displayTab === 'register' && (
              <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <input
                type="text"
                id="registerName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="glass-input w-full px-4 py-3"
                placeholder="Họ và tên"
              />

              <input
                type="email"
                id="registerEmail"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="glass-input w-full px-4 py-3"
                placeholder="Email"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="registerPassword"
                  name="password"
                  required
                  minLength="6"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="glass-input w-full px-4 py-3 pr-12"
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-glass-subtle hover:text-blue-700" onClick={() => setShowPassword(!showPassword)}>
                  <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  id="registerPasswordConfirm"
                  name="passwordConfirm"
                  required
                  value={formData.passwordConfirm}
                  onChange={handleInputChange}
                  className="glass-input w-full px-4 py-3 pr-12"
                  placeholder="Xác nhận mật khẩu"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-glass-subtle hover:text-blue-700" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}>
                  <span className="material-symbols-outlined">{showPasswordConfirm ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-glass-subtle mb-2">Trình độ hiện tại</label>
                <select name="hskLevel" value={formData.hskLevel} onChange={handleInputChange} className="glass-input w-full px-4 py-3">
                  <option value="1">Mới bắt đầu (HSK 1)</option>
                  <option value="2">Sơ cấp (HSK 2)</option>
                  <option value="3">Trung cấp (HSK 3-4)</option>
                  <option value="5">Cao cấp (HSK 5-6)</option>
                </select>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm text-glass-subtle">
                <input type="checkbox" name="terms" required checked={formData.terms} onChange={handleInputChange} className="rounded border-white/70 text-blue-600 focus:ring-blue-300 mt-0.5" />
                <span>
                  Tôi đồng ý với <Link to="#" className="text-blue-600 hover:underline">Điều khoản sử dụng</Link>
                  {' '}và <Link to="#" className="text-blue-600 hover:underline">Chính sách bảo mật</Link>
                </span>
              </label>

              <button type="submit" disabled={loading} className="w-full py-3 glass-btn glass-btn-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                <span className="material-symbols-outlined text-lg">person_add</span>
                {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
              </form>
            )}
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/60" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 glass-surface rounded-full text-glass-subtle">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button type="button" className="glass-btn border border-white/70 flex items-center justify-center gap-2 py-2.5 w-full col-span-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
