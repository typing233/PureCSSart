import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import { useState, useEffect, createContext, useCallback } from 'react';

export const AppContext = createContext();

function App() {
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState({
    hasApiKey: false,
    modelName: 'doubao-seed-1.8',
    codeModelName: 'doubao-seed-1.8'
  });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return (
    <AppContext.Provider value={{ config, showToast, updateConfig }}>
      <Router>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
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
