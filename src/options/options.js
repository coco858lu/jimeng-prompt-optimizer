// ============================================================
// 即梦提示词优化器 - Options/设置页面逻辑
// ============================================================

// --- 默认模板 ---
const DEFAULT_TEMPLATES = [
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
];

// --- DOM 引用 ---
const providerSelect = document.getElementById('provider');

const providerConfigs = {
  doubao: document.getElementById('config-doubao'),
  deepseek: document.getElementById('config-deepseek'),
  qwen: document.getElementById('config-qwen'),
  custom: document.getElementById('config-custom')
};

// --- 状态 ---
let customItemsData = []; // 保存当前自定义 API 列表数据，用于渲染

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
});

// --- 加载设置 ---
function loadSettings() {
  chrome.storage.sync.get([
    'provider', 'doubao', 'deepseek', 'qwen', 'custom', 'templates', 'currentTemplateId'
  ], (result) => {
    // 默认值
    const config = {
      provider: 'doubao',
      doubao: { apiKey: '', endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-0-pro-260215' },
      deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash' },
      qwen: { apiKey: '', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-max' },
      custom: { items: [], selectedId: null },
      templates: DEFAULT_TEMPLATES,
      ...result
    };

    // 兼容旧版 custom 格式（单个对象 → 数组）
    if (config.custom && !Array.isArray(config.custom.items)) {
      if (config.custom.apiKey !== undefined) {
        config.custom = {
          items: [{
            id: 'custom-migrated',
            name: '自定义 API (已迁移)',
            apiKey: config.custom.apiKey || '',
            endpoint: config.custom.endpoint || '',
            model: config.custom.model || ''
          }],
          selectedId: null
        };
      } else {
        config.custom = { items: [], selectedId: null };
      }
    }

    // 填充 provider
    providerSelect.value = config.provider;
    showProviderConfig(config.provider);

    // 填充各内置 provider 的配置
    for (const key of ['doubao', 'deepseek', 'qwen']) {
      const conf = config[key] || {};
      const el = document.getElementById(`${key}-api-key`);
      if (el) el.value = conf.apiKey || '';
      const endpointEl = document.getElementById(`${key}-endpoint`);
      if (endpointEl) endpointEl.value = conf.endpoint || '';
      const modelEl = document.getElementById(`${key}-model`);
      if (modelEl) modelEl.value = conf.model || '';
    }

    // 加载自定义 API 列表
    customItemsData = config.custom?.items || [];
    renderCustomItems();

    // 渲染模板
    renderTemplates(config.templates);
  });
}

// --- 渲染自定义 API 列表 ---
function renderCustomItems() {
  const list = document.getElementById('custom-list');
  list.innerHTML = '';

  if (customItemsData.length === 0) {
    list.innerHTML = '<p class="form-hint" style="text-align:center;padding:12px;">暂无自定义 API，点击下方按钮添加</p>';
    return;
  }

  customItemsData.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'custom-item';
    div.dataset.index = index;

    div.innerHTML = `
      <div class="custom-item-header">
        <span class="item-name">${escapeHtml(item.name || '未命名')}</span>
        <div class="template-actions">
          <button class="btn btn-danger btn-delete-custom" data-index="${index}">🗑️</button>
        </div>
      </div>
      <div class="custom-item-fields">
        <div class="form-group">
          <label class="form-label">名称</label>
          <input type="text" class="form-input custom-name" value="${escapeHtml(item.name)}" placeholder="API 名称">
        </div>
        <div class="form-group">
          <label class="form-label">API Key</label>
          <div class="input-group">
            <input type="password" class="form-input custom-apikey" value="${escapeHtml(item.apiKey)}" placeholder="输入 API Key">
            <button class="btn btn-toggle-pw-custom" type="button">👁️</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Endpoint</label>
          <input type="url" class="form-input custom-endpoint" value="${escapeHtml(item.endpoint)}" placeholder="https://api.your-service.com/v1/chat/completions">
        </div>
        <div class="form-group">
          <label class="form-label">模型名称</label>
          <input type="text" class="form-input custom-model" value="${escapeHtml(item.model)}" placeholder="如: gpt-4o">
        </div>
      </div>
    `;

    list.appendChild(div);
  });

  // 绑定删除事件
  document.querySelectorAll('.btn-delete-custom').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      deleteCustomItem(index);
    });
  });

  // 绑定密码 toggle
  document.querySelectorAll('.btn-toggle-pw-custom').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = e.currentTarget.closest('.input-group').querySelector('.custom-apikey');
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
}

// --- 收集当前自定义 API 数据 ---
function collectCustomItems() {
  const items = [];
  const itemEls = document.querySelectorAll('.custom-item');
  itemEls.forEach(el => {
    const name = el.querySelector('.custom-name')?.value?.trim() || '未命名';
    const apiKey = el.querySelector('.custom-apikey')?.value || '';
    const endpoint = el.querySelector('.custom-endpoint')?.value?.trim() || '';
    const model = el.querySelector('.custom-model')?.value?.trim() || '';
    const index = parseInt(el.dataset.index);
    const oldItem = customItemsData[index] || {};
    items.push({
      id: oldItem.id || 'custom-' + Date.now() + '-' + index,
      name,
      apiKey,
      endpoint,
      model
    });
  });
  return items;
}

// --- 添加自定义 API ---
function addCustomItem() {
  customItemsData.push({
    id: 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: '新 API ' + (customItemsData.length + 1),
    apiKey: '',
    endpoint: '',
    model: ''
  });
  renderCustomItems();
}

// --- 删除自定义 API ---
function deleteCustomItem(index) {
  if (customItemsData.length <= 1) {
    showSaveStatus('至少保留一个自定义 API 条目（或删除后不再使用自定义 API）', 'error');
    return;
  }
  customItemsData.splice(index, 1);
  renderCustomItems();
  showSaveStatus('已删除自定义 API', 'success');
}

// --- 显示/隐藏 Provider 配置 ---
function showProviderConfig(provider) {
  for (const [key, el] of Object.entries(providerConfigs)) {
    el.style.display = key === provider ? 'block' : 'none';
  }
}

// --- 渲染模板 ---
function renderTemplates(templates) {
  const list = document.getElementById('template-list');
  list.innerHTML = '';

  templates.forEach((t, index) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.dataset.index = index;

    item.innerHTML = `
      <div class="template-item-header">
        <input type="text" class="template-name-input" value="${escapeHtml(t.name)}" placeholder="模板名称">
        <div class="template-actions">
          <button class="btn btn-danger btn-delete-template" data-index="${index}">🗑️</button>
        </div>
      </div>
      <textarea class="template-prompt-input" placeholder="输入优化提示，使用 {prompt} 占位符">${escapeHtml(t.prompt)}</textarea>
    `;

    list.appendChild(item);
  });

  document.querySelectorAll('.btn-delete-template').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      deleteTemplate(index);
    });
  });
}

// --- 添加模板 ---
function addTemplate() {
  chrome.storage.sync.get(['templates'], (result) => {
    const templates = result.templates || DEFAULT_TEMPLATES;
    templates.push({
      id: 'custom-' + Date.now(),
      name: '新模板 ' + (templates.length + 1),
      prompt: '优化以下提示词：\n\n{prompt}'
    });
    chrome.storage.sync.set({ templates }, () => {
      renderTemplates(templates);
    });
  });
}

// --- 删除模板 ---
function deleteTemplate(index) {
  chrome.storage.sync.get(['templates'], (result) => {
    const templates = result.templates || DEFAULT_TEMPLATES;
    if (templates.length <= 1) {
      showSaveStatus('至少保留一个模板', 'error');
      return;
    }
    templates.splice(index, 1);
    chrome.storage.sync.set({ templates }, () => {
      renderTemplates(templates);
      showSaveStatus('已删除模板', 'success');
    });
  });
}

// --- 保存设置 ---
function saveSettings() {
  const provider = providerSelect.value;

  // 收集内置 provider
  const configs = {};
  for (const key of ['doubao', 'deepseek', 'qwen']) {
    configs[key] = {
      apiKey: document.getElementById(`${key}-api-key`)?.value || '',
      endpoint: document.getElementById(`${key}-endpoint`)?.value || '',
      model: document.getElementById(`${key}-model`)?.value || ''
    };
  }

  // 收集自定义 API
  const customItems = collectCustomItems();
  configs.custom = {
    items: customItems,
    selectedId: null
  };

  // 如果有自定义条目，自动设置第一个为选中
  if (customItems.length > 0) {
    configs.custom.selectedId = customItems[0].id;
  }

  // 收集模板
  const templateItems = document.querySelectorAll('.template-item');
  const templates = Array.from(templateItems).map((item, index) => {
    const name = item.querySelector('.template-name-input')?.value || `模板 ${index + 1}`;
    const prompt = item.querySelector('.template-prompt-input')?.value || '';
    return { id: 'custom-' + Date.now() + '-' + index, name, prompt };
  });

  const data = { provider, ...configs, templates };

  chrome.storage.sync.set(data, () => {
    if (chrome.runtime.lastError) {
      showSaveStatus('保存失败: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showSaveStatus('✅ 设置已保存！', 'success');
    }
  });
}

// --- 绑定事件 ---
function bindEvents() {
  providerSelect.addEventListener('change', () => {
    showProviderConfig(providerSelect.value);
  });

  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('add-template-btn').addEventListener('click', addTemplate);
  document.getElementById('add-custom-btn').addEventListener('click', addCustomItem);

  // 密码显隐切换（内置 provider）
  document.querySelectorAll('.btn-toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
}

function showSaveStatus(message, type) {
  const el = document.getElementById('save-status');
  el.textContent = message;
  el.className = 'save-status ' + type;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'save-status';
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
