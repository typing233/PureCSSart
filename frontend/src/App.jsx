import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Fusion from './pages/Fusion';
import { useState, useEffect, createContext, useCallback } from 'react';

export const AppContext = createContext();

function App() {
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState({
    hasApiKey: false,
    modelName: 'doubao-seed-1.8',
    codeModelName: 'doubao-seed-1.8'
  });
  const [auraConfig, setAuraConfig] = useState({
    timeEnabled: true,
    weatherEnabled: true,
    mouseEnabled: true,
    timeOffset: null,
    weatherUpdateInterval: '300000'
  });
  const [weather, setWeather] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
    
    fetch('/api/aura-config')
      .then(res => res.json())
      .then(data => setAuraConfig(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auraConfig.weatherEnabled) return;

    const fetchWeather = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setWeather(data.weather);
                }
              })
              .catch(console.error);
          },
          (error) => {
            console.warn('无法获取地理位置:', error);
            fetch(`/api/weather?lat=39.9042&lon=116.4074`)
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setWeather(data.weather);
                }
              })
              .catch(console.error);
          }
        );
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, parseInt(auraConfig.weatherUpdateInterval) || 300000);
    
    return () => clearInterval(interval);
  }, [auraConfig.weatherEnabled, auraConfig.weatherUpdateInterval]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const updateAuraConfig = useCallback((newConfig) => {
    setAuraConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const getTimeBasedTheme = useCallback(() => {
    if (!auraConfig.timeEnabled) return { type: 'neutral', filter: 'none' };
    
    const hour = currentTime.getHours();
    
    if (hour >= 5 && hour < 8) {
      return { type: 'dawn', filter: 'sepia(0.3) brightness(1.1)', warmLevel: 0.7 };
    } else if (hour >= 8 && hour < 12) {
      return { type: 'morning', filter: 'sepia(0.2) brightness(1.05)', warmLevel: 0.8 };
    } else if (hour >= 12 && hour < 17) {
      return { type: 'noon', filter: 'brightness(1.1) saturate(1.1)', warmLevel: 1.0 };
    } else if (hour >= 17 && hour < 20) {
      return { type: 'evening', filter: 'sepia(0.4) brightness(0.95)', warmLevel: 0.9 };
    } else if (hour >= 20 || hour < 5) {
      return { type: 'night', filter: 'saturate(0.7) brightness(0.8) hue-rotate(200deg)', warmLevel: 0.3 };
    }
    
    return { type: 'neutral', filter: 'none', warmLevel: 0.5 };
  }, [auraConfig.timeEnabled, currentTime]);

  const getWeatherEffects = useCallback(() => {
    if (!auraConfig.weatherEnabled || !weather) return { type: 'none', css: '' };
    
    switch (weather.type) {
      case 'rainy':
      case 'drizzle':
      case 'stormy':
        return {
          type: 'rain',
          css: `
            @keyframes rainFall {
              0% { transform: translateY(-100%); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(400px); opacity: 0; }
            }
            @keyframes ripple {
              0% { transform: scale(0); opacity: 0.8; }
              100% { transform: scale(2); opacity: 0; }
            }
          `
        };
      case 'sunny':
        return {
          type: 'sunny',
          css: `
            @keyframes sunSpot {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.1); }
            }
            @keyframes sunGlow {
              0%, 100% { box-shadow: 0 0 30px rgba(255, 220, 100, 0.3); }
              50% { box-shadow: 0 0 60px rgba(255, 220, 100, 0.5); }
            }
          `
        };
      case 'cloudy':
      case 'foggy':
        return {
          type: 'cloudy',
          css: `
            @keyframes cloudMove {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `
        };
      case 'snowy':
        return {
          type: 'snow',
          css: `
            @keyframes snowFall {
              0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
              100% { transform: translateY(400px) rotate(360deg); opacity: 0; }
            }
          `
        };
      default:
        return { type: 'none', css: '' };
    }
  }, [auraConfig.weatherEnabled, weather]);

  return (
    <AppContext.Provider value={{ 
      config, 
      auraConfig,
      weather,
      currentTime,
      showToast, 
      updateConfig,
      updateAuraConfig,
      getTimeBasedTheme,
      getWeatherEffects
    }}>
      <Router>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/fusion" element={<Fusion />} />
          </Routes>
          {toast && (
            <div className={`toast ${toast.type}`}>
              {toast.message}
            </div>
          )}
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
