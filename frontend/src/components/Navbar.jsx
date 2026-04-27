import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Image as ImageIcon, GalleryVerticalEnd } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    backdropFilter: 'blur(10px)',
    opacity: 0.95,
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
  };

  const navLinksStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
  });

  const iconButtonStyle = {
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  };

  const isHome = location.pathname === '/';
  const isGallery = location.pathname.startsWith('/gallery');

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        <Link to="/" style={logoStyle}>
          <ImageIcon size={24} />
          <span>CSS Art</span>
        </Link>

        <div style={navLinksStyle}>
          <Link to="/" style={linkStyle(isHome)}>
            <ImageIcon size={18} />
            <span>生成</span>
          </Link>
          <Link to="/gallery" style={linkStyle(isGallery)}>
            <GalleryVerticalEnd size={18} />
            <span>画廊</span>
          </Link>
          <button
            onClick={toggleTheme}
            style={iconButtonStyle}
            title={isDark ? '切换亮色模式' : '切换暗色模式'}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
