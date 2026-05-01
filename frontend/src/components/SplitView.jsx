import { useEffect, useRef, useContext, useState } from 'react';
import { AppContext } from '../App';

function SplitView({ imageUrl, cssCode, artworkId }) {
  const cssContainerRef = useRef(null);
  const effectContainerRef = useRef(null);
  const { auraConfig, weather, getTimeBasedTheme, getWeatherEffects } = useContext(AppContext);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const timeTheme = getTimeBasedTheme();
  const weatherEffects = getWeatherEffects();

  useEffect(() => {
    if (cssContainerRef.current) {
      const styleId = 'generated-css-style';
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = cssCode;
      
      cssContainerRef.current.innerHTML = '<div class="css-art-container"></div>';
    }

    return () => {
      const styleElement = document.getElementById('generated-css-style');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [cssCode]);

  useEffect(() => {
    if (!weatherEffects.css || !auraConfig.weatherEnabled) return;

    const effectStyleId = 'weather-effects-style';
    let effectStyle = document.getElementById(effectStyleId);
    
    if (!effectStyle) {
      effectStyle = document.createElement('style');
      effectStyle.id = effectStyleId;
      document.head.appendChild(effectStyle);
    }
    
    effectStyle.textContent = weatherEffects.css;

    return () => {
      const el = document.getElementById(effectStyleId);
      if (el) el.remove();
    };
  }, [weatherEffects.css, auraConfig.weatherEnabled]);

  useEffect(() => {
    if (!effectContainerRef.current || !auraConfig.weatherEnabled) return;

    const container = effectContainerRef.current;
    container.innerHTML = '';

    if (weatherEffects.type === 'rain' || weather?.type === 'rainy' || weather?.type === 'stormy') {
      for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(drop);
      }

      for (let i = 0; i < 5; i++) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${20 + Math.random() * 60}%`;
        ripple.style.top = `${50 + Math.random() * 40}%`;
        ripple.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(ripple);
      }
    } else if (weatherEffects.type === 'sunny' || weather?.type === 'sunny') {
      for (let i = 0; i < 8; i++) {
        const spot = document.createElement('div');
        spot.className = 'sun-spot';
        spot.style.left = `${10 + Math.random() * 80}%`;
        spot.style.top = `${10 + Math.random() * 80}%`;
        spot.style.animationDelay = `${Math.random() * 4}s`;
        spot.style.width = `${40 + Math.random() * 60}px`;
        spot.style.height = `${40 + Math.random() * 60}px`;
        container.appendChild(spot);
      }
    } else if (weatherEffects.type === 'snow' || weather?.type === 'snowy') {
      for (let i = 0; i < 20; i++) {
        const flake = document.createElement('div');
        flake.className = 'snow-flake';
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.animationDuration = `${3 + Math.random() * 4}s`;
        flake.style.animationDelay = `${Math.random() * 5}s`;
        flake.style.width = `${4 + Math.random() * 8}px`;
        flake.style.height = `${4 + Math.random() * 8}px`;
        container.appendChild(flake);
      }
    }
  }, [weatherEffects.type, weather?.type, auraConfig.weatherEnabled]);

  const handleMouseMove = (e) => {
    if (!auraConfig.mouseEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const getFilterStyle = () => {
    if (!auraConfig.timeEnabled) return {};
    return {
      filter: timeTheme.filter,
      transition: 'filter 0.5s ease'
    };
  };

  return (
    <div className="split-view">
      <div className="split-panel">
        <span className="split-label">原图</span>
        <div className="split-content" style={getFilterStyle()}>
          <img src={imageUrl} alt="Original" />
        </div>
      </div>
      
      <div 
        className="split-panel"
        onMouseMove={handleMouseMove}
      >
        <span className="split-label right">CSS 渲染</span>
        <div 
          className="split-content"
          style={{ position: 'relative' }}
        >
          {auraConfig.weatherEnabled && (
            <div 
              ref={effectContainerRef}
              className="weather-effect-layer"
              style={{ pointerEvents: 'none', zIndex: 10 }}
            />
          )}
          
          <div 
            className="css-preview-container" 
            ref={cssContainerRef}
            style={getFilterStyle()}
          />
          
          {auraConfig.mouseEnabled && (
            <div 
              className="mouse-trail"
              style={{
                left: mousePos.x - 20,
                top: mousePos.y - 20,
                display: 'block'
              }}
            />
          )}
        </div>
        
        <div className="aura-status-bar">
          {auraConfig.timeEnabled && (
            <div className="aura-status-item">
              <span className="aura-icon">
                {timeTheme.type === 'dawn' ? '🌅' : 
                 timeTheme.type === 'morning' ? '🌤️' :
                 timeTheme.type === 'noon' ? '☀️' :
                 timeTheme.type === 'evening' ? '🌆' : '🌙'}
              </span>
              <span className="aura-text">{timeTheme.type}</span>
            </div>
          )}
          {auraConfig.weatherEnabled && weather && (
            <div className="aura-status-item">
              <span className="aura-icon">
                {weather.type === 'sunny' ? '☀️' :
                 weather.type === 'cloudy' ? '☁️' :
                 weather.type === 'rainy' ? '🌧️' :
                 weather.type === 'snowy' ? '❄️' :
                 weather.type === 'stormy' ? '⛈️' : '🌈'}
              </span>
              <span className="aura-text">{weather.description}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SplitView;
