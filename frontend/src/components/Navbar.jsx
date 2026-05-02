import { Link, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AppContext } from '../App';
import ConfigModal from './ConfigModal';

function Navbar() {
  const location = useLocation();
  const { config } = useContext(AppContext);
  const [showConfig, setShowConfig] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <div className="navbar-content">
            <Link to="/" className="logo">PureCSSart</Link>
            <div className="nav-links">
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                转换器
              </Link>
              <Link 
                to="/gallery" 
                className={`nav-link ${location.pathname === '/gallery' ? 'active' : ''}`}
              >
                画廊
              </Link>
              <Link 
                to="/fusion" 
                className={`nav-link ${location.pathname === '/fusion' ? 'active' : ''}`}
              >
                融合
              </Link>
              <div className={`status-badge ${config.hasApiKey ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                <span>{config.hasApiKey ? '已连接' : '未配置'}</span>
              </div>
              <button 
                className="btn btn-outline"
                onClick={() => setShowConfig(true)}
              >
                设置
              </button>
            </div>
          </div>
        </div>
      </nav>
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </>
  );
}

export default Navbar;
