import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';

const DEFAULT_VISION_MODEL = 'doubao-seed-1-8-lite-260215';
const DEFAULT_CODE_MODEL = 'doubao-seed-1-8-lite-260215';

function ConfigModal({ onClose }) {
  const { config, auraConfig, showToast, updateConfig, updateAuraConfig } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('api');
  
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [codeModelName, setCodeModelName] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [localAuraConfig, setLocalAuraConfig] = useState({
    timeEnabled: true,
    weatherEnabled: true,
    mouseEnabled: true
  });

  useEffect(() => {
    const visionModel = config.modelName === 'doubao-seed-1.8' ? DEFAULT_VISION_MODEL : config.modelName;
    const codeModel = config.codeModelName === 'doubao-seed-1.8' ? DEFAULT_CODE_MODEL : config.codeModelName;
    setModelName(visionModel);
    setCodeModelName(codeModel);
    setBaseUrl(config.baseUrl || '');
  }, [config]);

  useEffect(() => {
    setLocalAuraConfig({
      timeEnabled: auraConfig.timeEnabled,
      weatherEnabled: auraConfig.weatherEnabled,
      mouseEnabled: auraConfig.mouseEnabled
    });
  }, [auraConfig]);

  const testConnection = async () => {
    if (!apiKey.trim() && !config.hasApiKey) {
      showToast('请先输入 API Key', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testApiKey = apiKey.trim() || 'test_mode';
      const testBaseUrl = baseUrl.trim() || 'https://ark.cn-beijing.volces.com/api/v3';
      
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: testApiKey,
          baseUrl: testBaseUrl,
          modelName: modelName || DEFAULT_VISION_MODEL
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || '连接测试成功！API 可用。' });
        showToast('连接测试成功！', 'success');
      } else {
        setTestResult({ success: false, message: data.error || data.message || '连接测试失败' });
        showToast('连接测试失败: ' + (data.error || data.message), 'error');
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      setTestResult({ success: false, message: '网络错误，请检查后端服务是否正常运行' });
      showToast('连接测试失败: 网络错误', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        modelName: modelName || DEFAULT_VISION_MODEL,
        codeModelName: codeModelName || DEFAULT_CODE_MODEL
      };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }
      if (baseUrl.trim()) {
        payload.baseUrl = baseUrl.trim();
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        updateConfig({
          hasApiKey: config.hasApiKey || !!apiKey.trim(),
          modelName: modelName || DEFAULT_VISION_MODEL,
          codeModelName: codeModelName || DEFAULT_CODE_MODEL,
          baseUrl: baseUrl || config.baseUrl
        });
        showToast('API 配置已保存', 'success');
        onClose();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuraConfig = async () => {
    try {
      const res = await fetch('/api/aura-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localAuraConfig)
      });

      if (res.ok) {
        updateAuraConfig(localAuraConfig);
        showToast('Aura 配置已保存', 'success');
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal config-modal">
        <div className="modal-header">
          <h2 className="modal-title">设置</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="config-tabs">
          <button
            className={`config-tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            API 配置
          </button>
          <button
            className={`config-tab ${activeTab === 'aura' ? 'active' : ''}`}
            onClick={() => setActiveTab('aura')}
          >
            Aura 感知
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'api' && (
            <>
              <div className="form-group">
                <label className="form-label">API 服务类型</label>
                <div className="radio-group">
                  <label className="radio-item">
                    <input type="radio" name="serviceType" value="volcengine" defaultChecked disabled />
                    <span>火山方舟</span>
                  </label>
                  <label className="radio-item">
                    <input type="radio" name="serviceType" value="openai" disabled />
                    <span>OpenAI 兼容 (实验性)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Base URL (可选，用于 OpenAI 兼容接口)</label>
                <input
                  type="text"
                  className="form-input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="例如: https://api.openai.com/v1"
                />
                <p className="form-hint">
                  留空则使用默认火山方舟接口。如果使用其他 OpenAI 兼容的 API 服务，请填写完整的 Base URL。
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="form-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config.hasApiKey ? '••••••••••••（已配置，留空保持不变）' : '请输入您的 API Key'}
                />
                <p className="form-hint">
                  在 API 服务提供商的控制台创建 API Key。首次使用必须配置，之后更新时可以留空保持原有值。
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">视觉模型 ID（图片分析）</label>
                <input
                  type="text"
                  className="form-input"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={`例如: ${DEFAULT_VISION_MODEL}`}
                />
                <p className="form-hint">
                  <strong>重要：</strong>需要填入完整的 Model ID。模型必须支持视觉理解（图片输入）。
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">代码模型 ID（CSS 生成）</label>
                <input
                  type="text"
                  className="form-input"
                  value={codeModelName}
                  onChange={(e) => setCodeModelName(e.target.value)}
                  placeholder={`例如: ${DEFAULT_CODE_MODEL}`}
                />
                <p className="form-hint">
                  用于生成 CSS 代码的模型，可以使用同视觉模型或其他文本模型。
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">连接测试</label>
                <div className="test-connection-section">
                  <button 
                    className="btn btn-secondary"
                    onClick={testConnection}
                    disabled={testing}
                  >
                    {testing ? '测试中...' : '🔍 测试连接'}
                  </button>
                  {testResult && (
                    <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                      <span className="status-badge inline">
                        <span className="status-dot"></span>
                        {testResult.success ? '连接成功' : '连接失败'}
                      </span>
                      <p className="test-message">{testResult.message}</p>
                    </div>
                  )}
                </div>
                <p className="form-hint">
                  点击测试连接按钮验证 API Key 和模型是否有效。
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">⚠️ 使用前必读</label>
                <div className="form-hint" style={{ marginTop: '0', lineHeight: '1.8' }}>
                  <strong>火山方舟配置步骤：</strong><br/>
                  1. 注册火山引擎账号并完成实名认证<br/>
                  2. 进入 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>火山方舟控制台</a><br/>
                  3. 在「API Key管理」页面创建 API Key<br/>
                  4. 在「开通管理」页面开通需要的模型（如 doubao-seed-1.8 系列）<br/>
                  5. 在「在线推理」页面查看开通模型的完整 Model ID（包含版本号）<br/>
                  <br/>
                  <strong>OpenAI 兼容接口配置：</strong><br/>
                  1. 填写 Base URL（如 https://api.openai.com/v1）<br/>
                  2. 填写 API Key<br/>
                  3. 填写支持的模型 ID<br/>
                  4. 点击「测试连接」验证配置<br/>
                  <br/>
                  <strong>注意：</strong><br/>
                  - 必须开通视觉模型才能进行图片分析<br/>
                  - Model ID 必须包含完整版本号<br/>
                  - 新用户通常有免费额度可供测试
                </div>
              </div>
            </>
          )}

          {activeTab === 'aura' && (
            <>
              <div className="aura-intro">
                <p className="form-hint">
                  Aura 感知系统让画布根据当前时间和天气自动调整色调和氛围，提供沉浸式的视觉体验。
                </p>
              </div>

              <div className="aura-toggle-group">
                <div className="aura-toggle-item">
                  <div className="toggle-label">
                    <span className="toggle-icon">🌅</span>
                    <div>
                      <strong>时间感知</strong>
                      <p className="toggle-desc">根据当前时间自动调整色调：白天暖色，夜晚冷色</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={localAuraConfig.timeEnabled}
                      onChange={(e) => setLocalAuraConfig(prev => ({ ...prev, timeEnabled: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="aura-toggle-item">
                  <div className="toggle-label">
                    <span className="toggle-icon">🌤️</span>
                    <div>
                      <strong>天气感知</strong>
                      <p className="toggle-desc">根据实时天气添加特效：雨天涟漪，晴天光斑</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={localAuraConfig.weatherEnabled}
                      onChange={(e) => setLocalAuraConfig(prev => ({ ...prev, weatherEnabled: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="aura-toggle-item">
                  <div className="toggle-label">
                    <span className="toggle-icon">🖱️</span>
                    <div>
                      <strong>鼠标交互</strong>
                      <p className="toggle-desc">响应鼠标移动，产生动态交互效果</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={localAuraConfig.mouseEnabled}
                      onChange={(e) => setLocalAuraConfig(prev => ({ ...prev, mouseEnabled: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="time-theme-preview">
                <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>时间主题预览</h4>
                <div className="theme-preview-grid">
                  <div className="theme-preview-item dawn">
                    <span className="theme-time">05:00 - 08:00</span>
                    <span className="theme-name">黎明</span>
                  </div>
                  <div className="theme-preview-item morning">
                    <span className="theme-time">08:00 - 12:00</span>
                    <span className="theme-name">早晨</span>
                  </div>
                  <div className="theme-preview-item noon">
                    <span className="theme-time">12:00 - 17:00</span>
                    <span className="theme-name">正午</span>
                  </div>
                  <div className="theme-preview-item evening">
                    <span className="theme-time">17:00 - 20:00</span>
                    <span className="theme-name">傍晚</span>
                  </div>
                  <div className="theme-preview-item night">
                    <span className="theme-time">20:00 - 05:00</span>
                    <span className="theme-name">夜晚</span>
                  </div>
                </div>
              </div>

              <div className="weather-effect-preview">
                <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>天气特效预览</h4>
                <div className="weather-preview-grid">
                  <div className="weather-preview-item sunny">
                    <span className="weather-icon">☀️</span>
                    <span className="weather-name">晴天</span>
                    <span className="weather-effect">光斑效果</span>
                  </div>
                  <div className="weather-preview-item cloudy">
                    <span className="weather-icon">☁️</span>
                    <span className="weather-name">多云</span>
                    <span className="weather-effect">柔和光影</span>
                  </div>
                  <div className="weather-preview-item rainy">
                    <span className="weather-icon">🌧️</span>
                    <span className="weather-name">雨天</span>
                    <span className="weather-effect">涟漪效果</span>
                  </div>
                  <div className="weather-preview-item snowy">
                    <span className="weather-icon">❄️</span>
                    <span className="weather-name">雪天</span>
                    <span className="weather-effect">雪花飘落</span>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveAuraConfig}
                  style={{ width: '100%' }}
                >
                  保存 Aura 配置
                </button>
              </div>
            </>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>取消</button>
          {activeTab === 'api' && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfigModal;
