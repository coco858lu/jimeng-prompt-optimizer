// ============================================================
// 即梦提示词优化器 - Popup 逻辑
// ============================================================

// --- DOM 引用 ---
const $ = (id) => document.getElementById(id);

const promptInput = $('prompt-input');
const readPromptBtn = $('read-prompt-btn');
const clearBtn = $('clear-btn');
const optimizeBtn = $('optimize-btn');
const templateSelect = $('template-select');
const providerSelect = $('provider-select');
const resultOutput = $('result-output');
const resultSection = $('result-section');
const statusBar = $('status-bar');
const copyBtn = $('copy-btn');
const writeBackBtn = $('write-back-btn');
const appendBtn = $('append-btn');
const scanImagesBtn = $('scan-images-btn');
const imagePreviewArea = $('image-preview-area');
const openOptionsLink = $('open-options');
const historyList = $('history-list');
const clearHistoryBtn = $('clear-history-btn');
const batchCount = $('batch-count');

// --- 状态 ---
let capturedImages = [];
let isOptimizing = false;

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  loadTemplates();
  loadHistory();
  checkCurrentTab();
  bindEvents();
  restoreState();
  window.addEventListener('beforeunload', saveState);
});

// --- 加载配置并填充 provider 下拉（含自定义 API 条目） ---
async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      const config = response.config;

      // 填充 provider 列表
      populateProviders(config);

      // 检查 API Key 是否已配置
      const hasApiKey = config.apiKeyConfigured === true;
      optimizeBtn.disabled = !hasApiKey;
      if (!hasApiKey) {
        setStatus('请先在设置页面配置 API Key', 'info');
      } else {
        clearStatus();
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    setStatus('加载配置失败: ' + error.message, 'error');
  }
}

// --- 模型选项定义（供下拉列表使用） ---
const MODEL_OPTIONS = [
  { value: 'doubao:doubao-seed-2-0-pro-260215', label: '豆包 Pro', modelLabel: 'doubao-seed-2-0-pro-260215', provider: 'doubao' },
  { value: 'doubao:doubao-seed-2-0-lite-260428', label: '豆包 Lite', modelLabel: 'doubao-seed-2-0-lite-260428', provider: 'doubao' },
  { value: 'doubao:doubao-seed-2-0-mini-260428', label: '豆包 Mini', modelLabel: 'doubao-seed-2-0-mini-260428', provider: 'doubao' },
  { value: 'deepseek:deepseek-v4-flash', label: 'DeepSeek Flash', modelLabel: 'deepseek-v4-flash', provider: 'deepseek' },
  { value: 'deepseek:deepseek-v4-pro', label: 'DeepSeek Pro', modelLabel: 'deepseek-v4-pro', provider: 'deepseek' },
  { value: 'qwen:qwen-max', label: '通义千问', modelLabel: 'qwen-max', provider: 'qwen' },
];

// --- 填充 provider 下拉（按模型细分 + 自定义条目） ---
function populateProviders(config) {
  providerSelect.innerHTML = '';

  // 内建模型选项（按 provider 分组）
  const groups = {};
  MODEL_OPTIONS.forEach(m => {
    if (!groups[m.provider]) groups[m.provider] = [];
    groups[m.provider].push(m);
  });

  let currentProvider = config.provider || 'doubao';

  for (const [providerKey, models] of Object.entries(groups)) {
    const group = document.createElement('optgroup');
    group.label = PROVIDER_LABELS[providerKey] || providerKey;
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = `${m.label} (${m.modelLabel})`;
      group.appendChild(opt);
    });
    providerSelect.appendChild(group);
  }

  // 自定义 API 条目（如果有）
  const customItems = config.custom?.items || [];
  if (customItems.length > 0) {
    const group = document.createElement('optgroup');
    group.label = '自定义 API';
    customItems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `🤖 ${item.name} (${item.model})`;
      group.appendChild(opt);
    });
    providerSelect.appendChild(group);
  }

  // 设置当前选中的 provider
  // 兼容旧格式（无冒号）→ 映射到当前 provider 的第一个模型
  if (!currentProvider.includes(':') && currentProvider !== 'custom') {
    const firstModel = MODEL_OPTIONS.find(m => m.provider === currentProvider);
    if (firstModel) currentProvider = firstModel.value;
  }
  if (providerSelect.querySelector(`option[value="${currentProvider}"]`)) {
    providerSelect.value = currentProvider;
  }
}

const PROVIDER_LABELS = {
  doubao: '豆包',
  deepseek: 'DeepSeek',
  qwen: '通义千问'
};

// --- 加载模板 ---
function loadTemplates() {
  chrome.storage.local.get(['templates', 'currentTemplateId'], (result) => {
    const templates = result.templates || [];
    const currentId = result.currentTemplateId || 'detail-zh';

    templateSelect.innerHTML = '';
    if (templates.length === 0) {
      templateSelect.innerHTML = '<option value="">暂无模板</option>';
      return;
    }

    templates.forEach(t => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      if (t.id === currentId) option.selected = true;
      templateSelect.appendChild(option);
    });

    // 保存选中的模板
    templateSelect.addEventListener('change', () => {
      chrome.storage.local.set({ currentTemplateId: templateSelect.value });
    });
  });
}

// --- 检查当前标签页 ---
async function checkCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const isJimeng = tabs[0]?.url?.includes('jimeng.jianying.com');
    if (!isJimeng) {
      setStatus('⚠️ 请先在即梦页面 (jimeng.jianying.com) 使用', 'info');
    }
  } catch (e) {
    // 忽略
  }
}

// --- 绑定事件 ---
function bindEvents() {
  // 读取提示词
  readPromptBtn.addEventListener('click', readPromptFromPage);

  // 清空
  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    resultSection.style.display = 'none';
    clearStatus();
  });

  // 扫描图片
  scanImagesBtn.addEventListener('click', scanImages);

  // 优化
  optimizeBtn.addEventListener('click', optimizePrompt);

  // 复制结果
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultOutput.value).then(() => {
      setStatus('✅ 已复制到剪贴板', 'success');
    }).catch(() => {
      resultOutput.select();
      document.execCommand('copy');
      setStatus('✅ 已复制到剪贴板', 'success');
    });
  });

  // 回填
  writeBackBtn.addEventListener('click', () => writeBackToPage(false));

  // 追加
  appendBtn.addEventListener('click', () => writeBackToPage(true));

  // 打开设置
  openOptionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // 清空历史
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('确定清空所有历史记录？')) {
      chrome.storage.local.set({ optimizeHistory: [] }, () => {
        renderHistory([]);
        setStatus('🗑️ 历史已清空', 'info');
      });
    }
  });

  // 保存 provider 选择
  providerSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ provider: providerSelect.value });
    // 重新检查 API Key
    chrome.runtime.sendMessage({ action: 'getConfig' }).then(response => {
      if (response.success) {
        optimizeBtn.disabled = response.config.apiKeyConfigured !== true;
      }
    });
  });

  // Enter 快捷键触发优化
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !optimizeBtn.disabled) {
      e.preventDefault();
      optimizePrompt();
    }
  });
}

// --- 从即梦页面读取提示词 ---
async function readPromptFromPage() {
  setStatus('📄 正在读取页面提示词...', 'loading');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      setStatus('❌ 未找到活动标签页', 'error');
      return;
    }

    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPromptFromPage' });
    if (response.success && response.prompt) {
      promptInput.value = response.prompt;
      setStatus('✅ 已读取提示词', 'success');
      saveState();
    } else {
      setStatus('⚠️ 页面中未找到提示词，请手动输入', 'info');
    }
  } catch (error) {
    setStatus('❌ 读取失败: ' + error.message, 'error');
  }
}

// --- 扫描页面参考图 ---
async function scanImages() {
  setStatus('🔄 正在扫描参考图...', 'loading');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      setStatus('❌ 未找到活动标签页', 'error');
      return;
    }

    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getImagesFromPage' });
    if (response.success) {
      capturedImages = response.images || [];
      renderImagePreviews();
      if (capturedImages.length > 0) {
        setStatus(`🖼️ 已检测到 ${capturedImages.length} 张参考图`, 'success');
        saveState();
      } else {
        setStatus('⚠️ 未检测到参考图', 'info');
      }
    } else {
      setStatus('⚠️ 扫描失败: ' + (response.error || '未知错误'), 'error');
    }
  } catch (error) {
    // 可能不在即梦页面
    setStatus('⚠️ 请确保在即梦页面操作', 'info');
  }
}

// --- 渲染图片预览 ---
function renderImagePreviews() {
  imagePreviewArea.innerHTML = '';
  if (capturedImages.length === 0) {
    imagePreviewArea.innerHTML = '<span class="image-placeholder">未检测到参考图</span>';
    return;
  }

  capturedImages.forEach((img, index) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    const thumb = document.createElement('img');
    thumb.className = 'image-thumb';
    thumb.src = `data:image/png;base64,${img.data}`;
    thumb.title = `参考图 ${index + 1}`;

    const badge = document.createElement('span');
    badge.textContent = `${index + 1}`;
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      background: #667eea; color: white;
      width: 18px; height: 18px; border-radius: 50%;
      font-size: 10px; display: flex; align-items: center; justify-content: center;
    `;

    wrapper.appendChild(thumb);
    wrapper.appendChild(badge);
    imagePreviewArea.appendChild(wrapper);
  });
}

// --- 优化提示词（支持批量，多次请求） ---
async function optimizePrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus('⚠️ 请输入或读取提示词', 'error');
    return;
  }

  const n = parseInt(batchCount.value, 10) || 1;
  const total = Math.max(1, Math.min(n, 10));

  isOptimizing = true;
  optimizeBtn.disabled = true;
  optimizeBtn.classList.add('loading');
  optimizeBtn.querySelector('.btn-text').textContent = `优化中 1/${total}`;
  setStatus(`🚀 正在调用 AI 优化提示词 (${total} 次)...`, 'loading');

  const imageBase64Array = capturedImages.map(img => img.data);
  const modelValue = providerSelect.value;

  let lastResult = '';

  for (let i = 0; i < total; i++) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'optimizePrompt',
        prompt: prompt,
        imageBase64Array: imageBase64Array
      });

      if (response.success) {
        lastResult = response.result;
        // 每次结果都写入历史
        addToHistory(response.result, modelValue, prompt);
        if (total > 1) {
          optimizeBtn.querySelector('.btn-text').textContent = `优化中 ${i + 1}/${total}`;
          setStatus(`✅ 第 ${i + 1}/${total} 次完成`, 'success');
        }
      } else {
        setStatus(`❌ 第 ${i + 1} 次失败: ${response.error}`, 'error');
      }
    } catch (error) {
      setStatus(`❌ 第 ${i + 1} 次请求失败: ${error.message}`, 'error');
    }
  }

  // 显示最后一次的结果
  if (lastResult) {
    resultOutput.value = lastResult;
    resultSection.style.display = 'block';
    setStatus(`✅ 优化完成！共 ${total} 次`, 'success');
    saveState();
  }

  isOptimizing = false;
  optimizeBtn.disabled = false;
  optimizeBtn.classList.remove('loading');
  optimizeBtn.querySelector('.btn-text').textContent = '开始优化';
}

// --- 回填到即梦页面 ---
async function writeBackToPage(append = false) {
  const text = resultOutput.value.trim();
  if (!text) {
    setStatus('⚠️ 没有可回填的内容', 'error');
    return;
  }

  setStatus('⬅️ 正在回填到即梦页面...', 'loading');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      setStatus('❌ 未找到活动标签页', 'error');
      return;
    }

    let finalText = text;
    if (append) {
      // 追加到现有提示词后面
      const currentResp = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPromptFromPage' });
      const currentPrompt = currentResp.success ? currentResp.prompt : '';
      if (currentPrompt) {
        finalText = currentPrompt + ', ' + text;
      }
    }

    await chrome.tabs.sendMessage(tabs[0].id, { action: 'writePromptToPage', text: finalText });
    setStatus(append ? '✅ 已追加到即梦页面' : '✅ 已回填到即梦页面', 'success');
  } catch (error) {
    setStatus('❌ 回填失败: ' + error.message, 'error');
  }
}

// --- 状态栏 ---
function setStatus(message, type = 'info') {
  statusBar.textContent = message;
  statusBar.className = 'status-bar ' + type;
}

function clearStatus() {
  statusBar.textContent = '';
  statusBar.className = 'status-bar';
}

// ==================== 状态持久化 ====================

// === 历史记录 ===

// --- 加载历史 ---
function loadHistory() {
  chrome.storage.local.get('optimizeHistory', (result) => {
    const list = result.optimizeHistory || [];
    renderHistory(list);
  });
}

// --- 渲染历史 ---
function renderHistory(list) {
  historyList.innerHTML = '';
  if (!list || list.length === 0) {
    historyList.innerHTML = '<span class="history-empty">暂无记录</span>';
    return;
  }
  // 最新在前
  const reversed = list.slice().reverse();
  reversed.forEach((item, displayIndex) => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const time = new Date(item.timestamp).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const modelDisplay = item.model || '未知模型';
    const textPreview = item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text;

    div.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-model">${modelDisplay}</span>
        <span class="history-item-time">${time}</span>
      </div>
      <div class="history-item-text">${escapeHtml(textPreview)}</div>
      <div class="history-item-actions">
        <button class="btn btn-history-use">📋 使用</button>
        <button class="btn btn-history-delete">🗑️</button>
      </div>
    `;

    // 「使用」按钮 — 用 closure 直接捕获 item
    const useBtn = div.querySelector('.btn-history-use');
    useBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resultOutput.value = item.text;
      resultSection.style.display = 'block';
      saveState();
      setStatus('✅ 已载入历史结果', 'success');
    });

    // 「删除」按钮
    const delBtn = div.querySelector('.btn-history-delete');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const realIdx = list.length - 1 - displayIndex;
      list.splice(realIdx, 1);
      chrome.storage.local.set({ optimizeHistory: list }, () => {
        renderHistory(list);
      });
    });

    historyList.appendChild(div);
  });
}

// --- 新增历史记录 ---
function addToHistory(text, model, prompt) {
  chrome.storage.local.get('optimizeHistory', (result) => {
    let list = result.optimizeHistory || [];
    list.push({
      text,
      model,
      prompt,
      timestamp: Date.now()
    });
    // 最多保留 50 条
    if (list.length > 50) list = list.slice(list.length - 50);
    chrome.storage.local.set({ optimizeHistory: list }, () => {
      renderHistory(list);
    });
  });
}

// === Popup 状态保存/恢复 ===

// --- 保存 popup 状态到 session storage（关闭再打开后恢复） ---
function saveState() {
  const state = {
    promptInput: promptInput.value,
    resultOutput: resultOutput.value,
    resultVisible: resultSection.style.display !== 'none',
    capturedImages: capturedImages,
    provider: providerSelect.value,
    batchCount: batchCount.value
  };
  // session storage 在浏览器关闭时自动清除，适合临时状态
  chrome.storage.session.set({ popupState: state }).catch(() => {
    // 旧版 chrome 可能不支持 session，降级到 local
    chrome.storage.local.set({ popupState: state }).catch(() => {});
  });
}

// --- 恢复 popup 状态 ---
function restoreState() {
  const tryRestore = (storage) => {
    storage.get('popupState')
      .then(result => {
        const state = result.popupState;
        if (!state) return;

        if (state.promptInput) promptInput.value = state.promptInput;
        if (state.resultOutput) {
          resultOutput.value = state.resultOutput;
          resultSection.style.display = state.resultVisible ? 'block' : 'none';
        }
        if (state.provider && providerSelect.querySelector(`option[value="${state.provider}"]`)) {
          providerSelect.value = state.provider;
        }
        if (state.capturedImages && state.capturedImages.length > 0) {
          capturedImages = state.capturedImages;
          renderImagePreviews();
        }
        if (state.batchCount) batchCount.value = state.batchCount;
      })
      .catch(() => {});
  };

  // 优先用 session storage，降级到 local
  if (chrome.storage.session) {
    tryRestore(chrome.storage.session);
  } else {
    tryRestore(chrome.storage.local);
  }
}

// 在关键操作后自动保存状态
const autoSave = () => saveState();
promptInput.addEventListener('input', autoSave);

// --- 工具函数 ---
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
