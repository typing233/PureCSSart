import { useEffect, useRef } from 'react';

function SplitView({ imageUrl, cssCode }) {
  const cssContainerRef = useRef(null);

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

  return (
    <div className="split-view">
      <div className="split-panel">
        <span className="split-label">原图</span>
        <div className="split-content">
          <img src={imageUrl} alt="Original" />
        </div>
      </div>
      
      <div className="split-panel">
        <span className="split-label right">CSS 渲染</span>
        <div className="split-content">
          <div className="css-preview-container" ref={cssContainerRef}></div>
        </div>
      </div>
    </div>
  );
}

export default SplitView;
