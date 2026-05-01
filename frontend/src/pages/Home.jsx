import { useState, useRef, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import SplitView from '../components/SplitView';
import TimelinePlayer from '../components/TimelinePlayer';

function Home() {
  const { showToast, config } = useContext(AppContext);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const [snapshots, setSnapshots] = useState([]);
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editableCss, setEditableCss] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState(true);
  const autoSnapshotTimer = useRef(null);

  const generateMockSnapshots = useCallback((finalCss) => {
    const mockSnapshots = [];
    const steps = 10;
    
    const emptyCss = `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: repeating-conic-gradient(#2a2a3a 0% 25%, #1a1a25 0% 50%) 0 0 / 20px 20px;
}
`;
    
    mockSnapshots.push({
      id: 'snapshot-0',
      cssCode: emptyCss,
      snapshotIndex: 0,
      created_at: new Date().toISOString()
    });
    
    const colorRegex = /#([0-9a-fA-F]{3,6})|rgb\(([^)]+)\)|rgba\(([^)]+)\)/g;
    const colors = [];
    let match;
    while ((match = colorRegex.exec(finalCss)) !== null) {
      colors.push(match[0]);
    }
    const uniqueColors = [...new Set(colors)].slice(0, 5);
    
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      const stepCss = generateStepCss(progress, uniqueColors, finalCss);
      mockSnapshots.push({
        id: `snapshot-${i}`,
        cssCode: stepCss,
        snapshotIndex: i,
        created_at: new Date(Date.now() - (steps - i) * 1000).toISOString()
      });
    }
    
    mockSnapshots.push({
      id: `snapshot-${steps}`,
      cssCode: finalCss,
      snapshotIndex: steps,
      created_at: new Date().toISOString()
    });
    
    return mockSnapshots;
  }, []);

  const generateStepCss = (progress, colors, finalCss) => {
    const baseColor = colors[0] || '#333333';
    const opacity = Math.min(progress * 1.5, 1);
    
    if (progress < 0.3) {
      return `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, ${baseColor}${Math.round(opacity * 99).toString(16).padStart(2, '0')}, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.css-art-container::before {
  content: '';
  position: absolute;
  width: ${Math.round(progress * 200)}px;
  height: ${Math.round(progress * 200)}px;
  background: ${baseColor};
  border-radius: 50%;
  opacity: ${opacity};
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
`;
    } else if (progress < 0.6) {
      const shapeCount = Math.floor(progress * 10);
      let shapesCss = '';
      for (let i = 0; i < shapeCount; i++) {
        const color = colors[i % colors.length] || '#ffffff';
        const size = 30 + Math.random() * 50;
        const posX = 10 + Math.random() * 60;
        const posY = 10 + Math.random() * 60;
        shapesCss += `
.css-art-container .shape-${i} {
  position: absolute;
  left: ${posX}%;
  top: ${posY}%;
  width: ${size}px;
  height: ${size}px;
  background: ${color};
  border-radius: ${Math.random() > 0.5 ? '50%' : '10%'};
  opacity: 0.8;
  animation: floatShape ${2 + Math.random() * 2}s ease-in-out infinite;
  animation-delay: ${Math.random() * 2}s;
}
`;
      }
      
      return `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: repeating-conic-gradient(#2a2a3a 0% 25%, #1a1a25 0% 50%) 0 0 / 20px 20px;
  overflow: hidden;
}

${shapesCss}

@keyframes floatShape {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}
`;
    } else {
      return finalCss;
    }
  };

  const createSnapshot = useCallback(async (cssCode, artworkId = result?.artworkId) => {
    if (!artworkId) return;
    
    try {
      const res = await fetch(`/api/artworks/${artworkId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cssCode })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('快照已创建:', data.snapshotId);
      }
    } catch (error) {
      console.error('创建快照失败:', error);
    }
  }, [result?.artworkId]);

  const handleCssChange = useCallback((newCss) => {
    setEditableCss(newCss);
    
    if (autoSnapshotTimer.current) {
      clearTimeout(autoSnapshotTimer.current);
    }
    
    if (autoSnapshotEnabled && result?.artworkId) {
      autoSnapshotTimer.current = setTimeout(() => {
        setSnapshots(prev => [...prev, {
          id: `snapshot-${Date.now()}`,
          cssCode: newCss,
          snapshotIndex: prev.length,
          created_at: new Date().toISOString()
        }]);
      }, 500);
    }
  }, [autoSnapshotEnabled, result?.artworkId]);

  const handleSnapshotChange = useCallback((index) => {
    setCurrentSnapshotIndex(index);
    if (snapshots[index]) {
      setEditableCss(snapshots[index].cssCode);
    }
  }, [snapshots]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    setImageFile(file);
    setResult(null);
    setSnapshots([]);
    setCurrentSnapshotIndex(0);
    setEditableCss('');
    setShowEditor(false);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleConvert = async () => {
    if (!imageFile) {
      showToast('请先上传图片', 'error');
      return;
    }

    if (!config.hasApiKey) {
      showToast('请先配置 API Key', 'error');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('前端触发超时...');
      controller.abort();
    }, 600000);

    setConverting(true);
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      console.log('开始转换图片...');
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      console.log('收到响应，状态:', res.status);
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
        console.log('响应数据:', data);
      } catch (parseError) {
        console.error('响应解析失败:', text.substring(0, 500));
        throw new Error(`服务器响应格式错误 (${res.status}): ${text.substring(0, 200)}`);
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || `转换失败 (${res.status})`;
        console.error('服务器返回错误:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!data.cssCode || data.cssCode.length === 0) {
        throw new Error('生成的 CSS 代码为空，请重试。');
      }

      console.log('转换成功，CSS代码长度:', data.cssCode.length);
      setResult(data);
      setEditableCss(data.cssCode);
      
      const mockSnaps = generateMockSnapshots(data.cssCode);
      setSnapshots(mockSnaps);
      setCurrentSnapshotIndex(mockSnaps.length - 1);
      
      showToast('转换成功！', 'success');
    } catch (error) {
      console.error('转换错误:', error);
      
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = '请求超时（10分钟）。AI 生成可能需要较长时间，建议：1) 检查网络连接；2) 稍后重试；3) 如果持续超时，请检查火山方舟控制台是否有报错信息。';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行。';
      } else if (error.message.includes('401')) {
        errorMessage = 'API Key 无效，请检查您的火山方舟 API Key 是否正确。';
      } else if (error.message.includes('404') || error.message.includes('模型不存在')) {
        errorMessage = '模型不存在或未开通。请确认：1) Model ID 格式是否正确（需要包含版本号，如 doubao-seed-1-8-lite-260215）；2) 是否已在火山方舟控制台开通该模型服务。';
      } else if (error.message.includes('429') || error.message.includes('额度')) {
        errorMessage = '请求过于频繁或额度不足。请稍后重试或检查火山方舟账户余额。';
      } else if (error.message.includes('超时')) {
        errorMessage = error.message + ' 提示：AI 生成可能需要较长时间，请耐心等待。如果持续超时，请尝试使用较小的图片或检查网络连接。';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      console.log('清理状态...');
      clearTimeout(timeoutId);
      setConverting(false);
    }
  };

  const handleCopyCode = async () => {
    const cssToCopy = editableCss || result?.cssCode;
    if (cssToCopy) {
      try {
        await navigator.clipboard.writeText(cssToCopy);
        showToast('代码已复制到剪贴板', 'success');
      } catch (error) {
        showToast('复制失败', 'error');
      }
    }
  };

  const handlePublish = async () => {
    if (result?.artworkId) {
      try {
        const res = await fetch(`/api/artworks/${result.artworkId}/publish`, {
          method: 'POST'
        });
        if (res.ok) {
          showToast('已发布到画廊！', 'success');
        } else {
          throw new Error('发布失败');
        }
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setSnapshots([]);
    setCurrentSnapshotIndex(0);
    setEditableCss('');
    setShowEditor(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDisplayCss = () => {
    if (snapshots.length > 0 && snapshots[currentSnapshotIndex]) {
      return snapshots[currentSnapshotIndex].cssCode;
    }
    return editableCss || result?.cssCode || '';
  };

  return (
    <div className="container">
      <section className="page-section">
        <h1 className="page-title">图片转 CSS 艺术</h1>
        <p className="page-subtitle">
          上传任意图片，AI 将自动分析并生成纯 CSS 代码，无需任何图片资源
        </p>

        {!imagePreview ? (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📷</div>
            <p className="upload-text">点击或拖拽图片到此处上传</p>
            <p className="upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden-input"
              accept="image/*"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'cover', 
                  borderRadius: '8px' 
                }} 
              />
              <div>
                <p style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {imageFile?.name}
                </p>
                <p className="upload-hint">
                  {(imageFile?.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="action-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleConvert}
                disabled={converting}
              >
                {converting ? '转换中...' : '开始转换'}
              </button>
              <button className="btn btn-outline" onClick={handleReset}>
                重新上传
              </button>
            </div>
          </div>
        )}

        {converting && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p className="loading-text">
              AI 正在分析图片并生成 CSS 代码<span className="loading-dots"></span>
            </p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '32px' }}>
            <div className="editor-controls">
              <button 
                className={`btn ${showEditor ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowEditor(!showEditor)}
              >
                {showEditor ? '隐藏编辑器' : '✏️ 编辑 CSS'}
              </button>
              <label className="auto-snapshot-toggle">
                <input
                  type="checkbox"
                  checked={autoSnapshotEnabled}
                  onChange={(e) => setAutoSnapshotEnabled(e.target.checked)}
                />
                <span>自动快照</span>
              </label>
            </div>

            {showEditor && (
              <div className="css-editor-container">
                <div className="code-header">
                  <span className="code-title">CSS 编辑器</span>
                  <span className="editor-hint">修改后会自动保存快照</span>
                </div>
                <textarea
                  className="css-editor"
                  value={editableCss}
                  onChange={(e) => handleCssChange(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}

            <SplitView 
              imageUrl={result.imageUrl}
              cssCode={getDisplayCss()}
              artworkId={result.artworkId}
            />

            {snapshots.length > 1 && (
              <TimelinePlayer
                snapshots={snapshots}
                currentSnapshotIndex={currentSnapshotIndex}
                onSnapshotChange={handleSnapshotChange}
                isPlaying={isPlaying}
                onPlayStateChange={setIsPlaying}
              />
            )}

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleCopyCode}>
                📋 复制 CSS 代码
              </button>
              <button className="btn btn-secondary" onClick={handlePublish}>
                🚀 发布到画廊
              </button>
            </div>

            <div className="code-block">
              <div className="code-header">
                <span className="code-title">
                  {isPlaying ? '当前快照 CSS 代码' : '生成的 CSS 代码'}
                </span>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleCopyCode}>
                  复制
                </button>
              </div>
              <div className="code-content">
                <pre>{getDisplayCss()}</pre>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
