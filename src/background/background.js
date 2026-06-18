// ============================================================
// 即梦提示词优化器 - Background Service Worker
// 负责调用各 AI 模型 API
// ============================================================

// --- 默认配置 ---
const DEFAULT_CONFIG = {
  provider: 'doubao',
  // 豆包 (火山引擎 Ark)
  doubao: {
    apiKey: '',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-seed-2-0-pro-260215'
  },
  // DeepSeek
  deepseek: {
    apiKey: '',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-v4-flash'
  },
  // 通义千问 (阿里云百炼)
  qwen: {
    apiKey: '',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max'
  },
  // 自定义 OpenAI 兼容 API（支持多条）
  custom: {
    items: [],
    selectedId: null
  },
  // 默认提示词模板
  templates: [
    {
      id: 'detail-en',
      name: '详细英文描述',
      prompt: 'You are a professional AI prompt engineer. Please optimize the following prompt into a more detailed, vivid English description. The prompt may contain reference image markers like "参考图1", "参考图2" etc. — you MUST keep these markers EXACTLY as they appear (preserve the Chinese text and number), do not translate or modify them. IMPORTANT: "参考图1" corresponds to the FIRST image provided to you, "参考图2" to the SECOND image, and so on. When describing each reference figure, base your description on what you actually see in that image (clothing, appearance, pose). Do NOT swap or reassign the numbers — describe each reference figure according to its corresponding image. Output ONLY the optimized prompt without any explanations or markdown formatting.\n\nOriginal prompt: {prompt}'
    },
    {
      id: 'detail-zh',
      name: '详细中文描述',
      prompt: '你是一位专业的 AI 提示词工程师。请将以下提示词优化为更详细、更生动的中文描述。提示词中可能包含 "参考图1"、"参考图2" 等图片引用标记，你必须原样保留这些标记（包括中文和数字），不要修改或删除它们。重要说明："参考图1" 对应发送给你的第1张图片，"参考图2" 对应第2张图片，以此类推。描述每个参考图角色时，请根据对应图片中实际看到的内容（服装、外貌、姿态）进行描述。不要调换或重新分配编号。添加关于光线、构图、风格、氛围和技术质量的细节。只输出优化后的提示词，不要有任何解释或 markdown 格式。\n\n原始提示词：{prompt}'
    },
    {
      id: 'english',
      name: '翻译为英文',
      prompt: 'Translate the following prompt into English for AI image generation. The prompt may contain Chinese markers like "参考图1", "参考图2" etc. — you MUST keep these markers EXACTLY as-is (preserve the Chinese characters and numbers), do not translate or modify them. IMPORTANT: "参考图1" corresponds to the FIRST image provided to you, "参考图2" to the SECOND image, and so on. When mentioning each reference figure in the translation, base the description on what you actually see in that image. Make the rest fluent and natural. Output ONLY the translated prompt without any explanations.\n\n{prompt}'
    },
    {
      id: 'concise',
      name: '精简优化',
      prompt: 'Optimize the following prompt to be more concise and effective for AI image generation. The prompt may contain reference image markers like "参考图1", "参考图2" etc. — you MUST keep these markers EXACTLY as they appear, do not modify or remove them. IMPORTANT: "参考图1" corresponds to the FIRST image provided to you, "参考图2" to the SECOND image, and so on. Describe each reference figure based on what the corresponding image actually shows. Keep the core elements but remove redundancy. Output ONLY the optimized prompt.\n\n{prompt}'
    },
    {
      id: 'art-style',
      name: '艺术风格强化',
      prompt: 'You are a professional AI prompt engineer. Enhance the following prompt with specific artistic style references. The prompt may contain reference image markers like "参考图1", "参考图2" etc. — you MUST keep these markers EXACTLY as they appear. IMPORTANT: "参考图1" corresponds to the FIRST image provided to you, "参考图2" to the SECOND image, and so on. Describe each reference figure\'s appearance based on what the corresponding image actually shows. Add details about color palette, brushwork, texture, and mood. Output ONLY the optimized prompt without explanations.\n\nOriginal prompt: {prompt}'
    },
    {
      id: 'with-image',
      name: '结合参考图优化',
      prompt: 'You are a professional AI prompt engineer. Based on the reference images and the user\'s prompt, generate an optimized prompt. The user prompt may contain reference image markers like "参考图1", "参考图2" etc. — you MUST keep these markers EXACTLY as they appear. CRITICAL: "参考图1" corresponds to the FIRST image provided to you in this conversation, "参考图2" to the SECOND image, "参考图3" to the THIRD image, and so on. Do NOT guess which image matches which reference number — use the positional order. Describe each character\'s clothing, appearance, and actions based on what you actually see in the corresponding image. Combine the visual elements from each image with the user\'s intent. Output ONLY the optimized prompt.\n\nUser prompt: {prompt}'
    }
  ]
};

// --- 内置 provider 列表 ---
const BUILTIN_PROVIDERS = ['doubao', 'deepseek', 'qwen'];

const PROVIDER_LABELS = {
  doubao: '豆包 (火山引擎)',
  deepseek: 'DeepSeek',
  qwen: '通义千问 (阿里云)'
};

// 内置模型列表（用于 popup 显示）
const BUILTIN_MODELS = {
  doubao: [
    { id: 'doubao-seed-2-0-pro-260215', label: '豆包 Pro' },
    { id: 'doubao-seed-2-0-lite-260428', label: '豆包 Lite' },
    { id: 'doubao-seed-2-0-mini-260428', label: '豆包 Mini' }
  ],
  deepseek: [
    { id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    { id: 'deepseek-v4-pro', label: 'DeepSeek Pro' }
  ],
  qwen: [
    { id: 'qwen-max', label: '通义千问' }
  ]
};

// --- 获取配置 ---
async function getConfig() {
  const result = await chrome.storage.sync.get([
    'provider', 'doubao', 'deepseek', 'qwen', 'custom', 'templates'
  ]);

  // 兼容旧版 custom 数据格式（单个对象 → 数组）
  let customItems = [];
  if (result.custom) {
    if (Array.isArray(result.custom.items)) {
      customItems = result.custom.items;
    } else if (result.custom.apiKey !== undefined) {
      // 旧格式：{ apiKey: '', endpoint: '', model: '' }
      customItems = [{
        id: 'custom-migrated',
        name: '自定义 API (已迁移)',
        apiKey: result.custom.apiKey || '',
        endpoint: result.custom.endpoint || '',
        model: result.custom.model || ''
      }];
    }
  }

  // 兼容旧版 provider 值 'custom' → 迁移为第一个自定义条目 ID
  let provider = result.provider || DEFAULT_CONFIG.provider;
  if (provider === 'custom' && customItems.length > 0) {
    provider = customItems[0].id;
  }

  return {
    ...DEFAULT_CONFIG,
    ...result,
    provider, // 覆盖可能为 'custom' 的旧值
    doubao: { ...DEFAULT_CONFIG.doubao, ...result.doubao },
    deepseek: { ...DEFAULT_CONFIG.deepseek, ...result.deepseek },
    qwen: { ...DEFAULT_CONFIG.qwen, ...result.qwen },
    custom: { items: customItems, selectedId: null },
    templates: result.templates || DEFAULT_CONFIG.templates
  };
}

// --- 获取当前 provider 的配置（支持 "provider:modelId" 格式） ---
function parseProvider(raw) {
  if (!raw || !raw.includes(':')) return { name: raw || 'doubao', model: null };
  const sep = raw.indexOf(':');
  return { name: raw.slice(0, sep), model: raw.slice(sep + 1) };
}

function getProviderConfig(config) {
  const { name: provider, model: modelOverride } = parseProvider(config.provider);

  if (BUILTIN_PROVIDERS.includes(provider)) {
    const conf = config[provider];
    if (!conf || !conf.apiKey) {
      throw new Error(`请先在设置页面配置 ${PROVIDER_LABELS[provider]} 的 API Key`);
    }
    return {
      ...conf,
      model: modelOverride || conf.model
    };
  }

  // 自定义 API：按 ID 查找
  const customItems = config.custom?.items || [];
  const item = customItems.find(i => i.id === provider);
  if (!item) {
    throw new Error(`自定义 API 条目 "${provider}" 未找到，请先在设置页面配置`);
  }
  if (!item.apiKey || !item.endpoint || !item.model) {
    throw new Error(`自定义 API "${item.name}" 配置不完整，请检查设置`);
  }
  return item;
}

function getProviderLabel(provider) {
  if (BUILTIN_PROVIDERS.includes(provider)) {
    return PROVIDER_LABELS[provider] || provider;
  }
  return provider; // custom items use their ID
}

// --- 调用大模型 API ---
async function callAI(promptText, imageBase64Array = []) {
  const config = await getConfig();
  const providerConf = getProviderConfig(config);

  // 构建消息
  const messages = buildMessages(config, promptText, imageBase64Array);
  console.log('API 请求:', { provider: config.provider, model: providerConf.model, images: imageBase64Array.length });

  // 发送请求
  const response = await fetch(providerConf.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerConf.apiKey}`
    },
    body: JSON.stringify({
      model: providerConf.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) {
    throw new Error('API 返回内容为空');
  }
  return result;
}

// --- 构建消息（支持多张图片） ---
function buildMessages(config, promptText, imageBase64Array) {
  // 找到匹配的模板
  const templateId = config.currentTemplateId || 'detail-en';
  const template = config.templates.find(t => t.id === templateId) || config.templates[0];

  let systemPrompt = template.prompt.replace('{prompt}', promptText);

  const messages = [];

  if (imageBase64Array && imageBase64Array.length > 0) {
    // 多模态请求 — 支持多张图片
    const content = [{ type: 'text', text: systemPrompt }];
    imageBase64Array.forEach(b64 => {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${b64}`,
          detail: 'high'
        }
      });
    });
    messages.push({ role: 'user', content });
  } else {
    // 纯文本请求
    messages.push({
      role: 'system',
      content: 'You are a professional AI prompt engineer. Respond concisely and accurately.'
    });
    messages.push({
      role: 'user',
      content: systemPrompt
    });
  }

  return messages;
}

// --- 监听来自 popup 和 content script 的消息 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background 收到消息:', request.action);

  switch (request.action) {
    case 'optimizePrompt':
      // 优化提示词（支持多张图片）
      callAI(request.prompt, request.imageBase64Array || [])
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持通道开放

    case 'getConfig':
      getConfig()
        .then(config => {
          // 返回配置时隐藏 API Key，但标记是否已配置
          const safeConfig = JSON.parse(JSON.stringify(config));

          // 内置 provider 隐藏 key
          for (const key of BUILTIN_PROVIDERS) {
            if (safeConfig[key]) {
              safeConfig[key] = {
                ...safeConfig[key],
                apiKey: safeConfig[key].apiKey ? '***' : ''
              };
            }
          }

          // 自定义条目隐藏 key
          if (safeConfig.custom?.items) {
            safeConfig.custom.items = safeConfig.custom.items.map(item => ({
              ...item,
              apiKey: item.apiKey ? '***' : ''
            }));
          }

          // 判断当前选中的 provider 是否有 API Key
          safeConfig.apiKeyConfigured = checkApiKeyConfigured(config);
          sendResponse({ success: true, config: safeConfig });
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'saveConfig':
      chrome.storage.sync.set(request.config, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'getPromptFromPage':
      // 转发到 content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          sendResponse({ success: false, error: '未找到活动标签页' });
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPromptFromPage' })
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ success: false, error: '无法连接到页面: ' + error.message }));
      });
      return true;

    default:
      sendResponse({ success: false, error: '未知操作: ' + request.action });
      return true;
  }
});

// --- 检查当前 provider 的 API Key 是否已配置（使用原始数据） ---
function checkApiKeyConfigured(config) {
  const { name: provider } = parseProvider(config.provider || 'doubao');

  if (BUILTIN_PROVIDERS.includes(provider)) {
    return !!(config[provider]?.apiKey);
  }

  // 自定义
  const item = config.custom?.items?.find(i => i.id === provider);
  return !!(item?.apiKey);
}
