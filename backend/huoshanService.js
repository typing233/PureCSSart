const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class HuoshanService {
  constructor(apiKey, modelName, codeModelName) {
    this.apiKey = apiKey;
    this.modelName = modelName || 'doubao-seed-1.8';
    this.codeModelName = codeModelName || 'doubao-seed-1.8';
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  }

  async analyzeImage(imageBase64) {
    const url = `${this.baseUrl}/chat/completions`;
    
    const payload = {
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请详细描述这张图片的内容，包括颜色、形状、布局、主要元素等。我需要用这些信息来生成纯 CSS 艺术代码。请详细描述每个元素的位置、颜色、大小和关系。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`火山方舟 API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  async generateCSS(imageDescription, imageDimensions) {
    const url = `${this.baseUrl}/chat/completions`;
    
    const prompt = `根据以下图片描述，生成一个纯 CSS 艺术作品。要求：
1. 使用纯 CSS 绘制，不使用任何图片或外部资源
2. 使用 CSS Grid 或多个 div 元素配合 box-shadow、border-radius、background 等属性来绘制
3. 代码要简洁但效果要接近原图
4. 所有元素要放在一个容器 div 中，容器类名为 .css-art-container
5. 容器尺寸参考：width: ${imageDimensions.width}px, height: ${imageDimensions.height}px（可以适当调整比例）
6. 只返回 CSS 代码，不要解释，不要包括 style 标签
7. 确保所有颜色值都准确
8. 使用相对定位或绝对定位来放置元素

图片描述：
${imageDescription}

请生成对应的纯 CSS 代码：`;

    const payload = {
      model: this.codeModelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的 CSS 艺术家，擅长用纯 CSS 绘制复杂的图形和艺术作品。你只返回 CSS 代码，不解释。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`火山方舟 API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    let cssCode = result.choices[0].message.content;
    
    cssCode = cssCode.replace(/```css\s*/g, '').replace(/```\s*$/g, '').trim();
    
    return cssCode;
  }
}

module.exports = HuoshanService;
