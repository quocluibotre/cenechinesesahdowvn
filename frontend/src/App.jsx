import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

// Import các Page đã tạo ở các bước trước
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Player from './pages/Player';
import Library from './pages/Library';
import ThemeToggleButton from './components/ui/ThemeToggleButton';

const EXIT_DURATION = 180;
const ENTER_DURATION = 360;

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!token) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('route-enter');

  const currentKey = `${location.pathname}${location.search}`;
  const displayKey = `${displayLocation.pathname}${displayLocation.search}`;

  useEffect(() => {
    if (currentKey !== displayKey) {
      setStage('route-exit');
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setStage('route-enter');
      }, EXIT_DURATION);
      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [currentKey, displayKey, location]);

  useEffect(() => {
    if (stage !== 'route-enter') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setStage('route-idle');
    }, ENTER_DURATION);
    return () => clearTimeout(timeout);
  }, [stage, displayKey]);

  return (
    <div className={`route-shell ${stage}`}>
      <Routes location={displayLocation}>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/player/:videoId" element={<Player />} />
        <Route
          path="/library"
          element={<RequireAuth><Library /></RequireAuth>}
        />
        <Route
          path="*"
          element={(
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="glass-surface-strong rounded-3xl px-8 py-10 text-center animate-glass-rise">
                <div className="text-4xl font-bold text-red-500">404</div>
                <div className="mt-2 text-glass-subtle">Trang không tồn tại</div>
              </div>
            </div>
          )}
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-sky">
        <AnimatedRoutes />
        <ThemeToggleButton />
      </div>
    </Router>
  );
}

export default App;
