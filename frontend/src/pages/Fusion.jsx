import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';

function Fusion() {
  const { showToast } = useContext(AppContext);
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork1, setSelectedArtwork1] = useState(null);
  const [selectedArtwork2, setSelectedArtwork2] = useState(null);
  const [fusionType, setFusionType] = useState('smooth');
  const [blendRatio, setBlendRatio] = useState(0.5);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionResult, setFusionResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const fusionTypes = [
    { value: 'smooth', label: '平滑过渡', description: '两幅作品平滑混合，颜色渐变过渡' },
    { value: 'collision', label: '碰撞拼接', description: '两幅作品动态碰撞，产生视觉冲击' },
    { value: 'morph', label: '形变替换', description: '形状不断变形，融合两者特征' }
  ];

  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    try {
      const res = await fetch('/api/artworks/selectable?limit=50');
      const data = await res.json();
      if (res.ok) {
        setArtworks(data.artworks);
      }
    } catch (error) {
      console.error('获取作品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArtwork = (artwork, isFirst) => {
    if (isFirst) {
      if (selectedArtwork2?.id === artwork.id) {
        showToast('不能选择同一幅作品', 'error');
        return;
      }
      setSelectedArtwork1(artwork);
    } else {
      if (selectedArtwork1?.id === artwork.id) {
        showToast('不能选择同一幅作品', 'error');
        return;
      }
      setSelectedArtwork2(artwork);
    }
    setFusionResult(null);
  };

  const handleFusion = async () => {
    if (!selectedArtwork1 || !selectedArtwork2) {
      showToast('请选择两幅作品', 'error');
      return;
    }

    setIsFusing(true);
    try {
      const res = await fetch('/api/fusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artwork1Id: selectedArtwork1.id,
          artwork2Id: selectedArtwork2.id,
          fusionType,
          ratio: blendRatio
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFusionResult(data);
        showToast('融合成功！', 'success');
      } else {
        throw new Error(data.error || '融合失败');
      }
    } catch (error) {
      console.error('融合错误:', error);
      showToast('融合失败: ' + error.message, 'error');
    } finally {
      setIsFusing(false);
    }
  };

  const handleCopyResult = async () => {
    if (fusionResult?.cssCode) {
      try {
        await navigator.clipboard.writeText(fusionResult.cssCode);
        showToast('融合代码已复制到剪贴板', 'success');
      } catch (error) {
        showToast('复制失败', 'error');
      }
    }
  };

  const handleSwap = () => {
    const temp = selectedArtwork1;
    setSelectedArtwork1(selectedArtwork2);
    setSelectedArtwork2(temp);
    setFusionResult(null);
  };

  return (
    <div className="container">
      <section className="page-section">
        <h1 className="page-title">作品融合</h1>
        <p className="page-subtitle">
          选择两幅作品，按比例融合它们的颜色体系、几何特征和动画模式
        </p>

        <div className="fusion-container">
          <div className="fusion-selectors">
            <div className="fusion-selector">
              <h3 className="fusion-selector-title">作品 A</h3>
              {selectedArtwork1 ? (
                <div className="selected-artwork">
                  <img src={selectedArtwork1.image_url} alt="作品A" />
                  <div className="selected-artwork-info">
                    <span>#{selectedArtwork1.id}</span>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setSelectedArtwork1(null)}
                    >
                      更换
                    </button>
                  </div>
                </div>
              ) : (
                <div className="artwork-placeholder">
                  <span>请从下方选择作品</span>
                </div>
              )}
            </div>

            <div className="fusion-middle">
              <div className="fusion-type-selector">
                <h4>融合方式</h4>
                {fusionTypes.map(type => (
                  <button
                    key={type.value}
                    className={`fusion-type-btn ${fusionType === type.value ? 'active' : ''}`}
                    onClick={() => {
                      setFusionType(type.value);
                      setFusionResult(null);
                    }}
                  >
                    <span className="fusion-type-label">{type.label}</span>
                    <span className="fusion-type-desc">{type.description}</span>
                  </button>
                ))}
              </div>

              {fusionType === 'smooth' && (
                <div className="blend-ratio-control">
                  <h4>混合比例</h4>
                  <div className="slider-container">
                    <span className="slider-label">A</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={blendRatio * 100}
                      onChange={(e) => {
                        setBlendRatio(parseInt(e.target.value) / 100);
                        setFusionResult(null);
                      }}
                      className="blend-slider"
                    />
                    <span className="slider-label">B</span>
                  </div>
                  <div className="ratio-display">
                    比例: A {Math.round((1 - blendRatio) * 100)}% : B {Math.round(blendRatio * 100)}%
                  </div>
                </div>
              )}

              <button className="swap-btn" onClick={handleSwap} title="交换两幅作品">
                ⇄ 交换
              </button>

              <button 
                className="btn btn-primary fusion-btn"
                onClick={handleFusion}
                disabled={!selectedArtwork1 || !selectedArtwork2 || isFusing}
              >
                {isFusing ? '融合中...' : '开始融合'}
              </button>
            </div>

            <div className="fusion-selector">
              <h3 className="fusion-selector-title">作品 B</h3>
              {selectedArtwork2 ? (
                <div className="selected-artwork">
                  <img src={selectedArtwork2.image_url} alt="作品B" />
                  <div className="selected-artwork-info">
                    <span>#{selectedArtwork2.id}</span>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setSelectedArtwork2(null)}
                    >
                      更换
                    </button>
                  </div>
                </div>
              ) : (
                <div className="artwork-placeholder">
                  <span>请从下方选择作品</span>
                </div>
              )}
            </div>
          </div>

          {fusionResult && (
            <div className="fusion-result">
              <h3>融合结果</h3>
              <div className="fusion-preview">
                <FusionPreview cssCode={fusionResult.cssCode} />
              </div>
              <div className="fusion-actions">
                <button className="btn btn-primary" onClick={handleCopyResult}>
                  📋 复制融合代码
                </button>
              </div>
              <div className="code-block">
                <div className="code-header">
                  <span className="code-title">融合后的 CSS 代码</span>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '6px 12px', fontSize: '12px' }} 
                    onClick={handleCopyResult}
                  >
                    复制
                  </button>
                </div>
                <div className="code-content">
                  <pre>{fusionResult.cssCode}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="artwork-gallery-section">
          <h3>可选作品</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : artworks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                暂无作品可用于融合，请先生成一些作品
              </p>
            </div>
          ) : (
            <div className="fusion-artwork-grid">
              {artworks.map(artwork => (
                <div
                  key={artwork.id}
                  className={`fusion-artwork-item ${
                    selectedArtwork1?.id === artwork.id ? 'selected-as-1' : ''
                  } ${selectedArtwork2?.id === artwork.id ? 'selected-as-2' : ''}`}
                >
                  <img src={artwork.image_url} alt={`作品 #${artwork.id}`} />
                  <div className="fusion-artwork-overlay">
                    <span className="artwork-id">#{artwork.id}</span>
                    <div className="artwork-actions">
                      <button
                        className={`select-btn ${selectedArtwork1?.id === artwork.id ? 'active' : ''}`}
                        onClick={() => handleSelectArtwork(artwork, true)}
                      >
                        选作 A
                      </button>
                      <button
                        className={`select-btn ${selectedArtwork2?.id === artwork.id ? 'active' : ''}`}
                        onClick={() => handleSelectArtwork(artwork, false)}
                      >
                        选作 B
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FusionPreview({ cssCode }) {
  useEffect(() => {
    const styleId = 'fusion-preview-style';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = cssCode;

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [cssCode]);

  return (
    <div className="fusion-preview-container">
      <div className="css-art-container"></div>
    </div>
  );
}

export default Fusion;
