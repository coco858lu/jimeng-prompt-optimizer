// ============================================================
// 即梦提示词优化器 - Content Script
// 负责与即梦页面 DOM 交互
// ============================================================

// --- 选择器配置 ---
const SELECTORS = {
  // 提示词输入框（即梦使用 Tiptap/ProseMirror）
  promptTextarea: [
    'div.tiptap.ProseMirror[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][class*="tiptap"]',
    'textarea[placeholder*="提示词"]',
    'textarea[class*="prompt"]',
    'div[class*="prompt"] textarea'
  ],
  // 即梦用户上传的参考图容器
  referenceGroup: [
    'div[class^="reference-group-content-"]',
    'div[class*="reference-group-content"]'
  ],
  mentionTag: '.node-reference-mention-tag'
};

// ==================== 工具函数 ====================

/** 从 mention 标签中提取唯一标识（优先 blob/CDN URL，其次 label） */
function getMentionKey(tagEl) {
  const img = tagEl.querySelector('img');
  if (img && img.src && (img.src.startsWith('blob:') || img.src.startsWith('http'))) return img.src;
  // 降级：label 文本
  const label = tagEl.querySelector('[class*="label-"]');
  return label ? label.textContent.trim() : null;
}

// ==================== 提示词读写 ====================

// 模块级变量：保存 mention 槽位映射（由 readPrompt 填充，writePrompt 消费）
// 保持 DOM 顺序，每个槽位对应一个原始 DOM 元素
let mentionSlots = [];

// --- 查找提示词输入框 ---
function findPromptInput() {
  for (const selector of SELECTORS.promptTextarea) {
    const el = document.querySelector(selector);
    if (el) {
      console.log('找到提示词输入框:', selector);
      return el;
    }
  }
  const fallback = document.querySelector('div[contenteditable="true"]');
  if (fallback) {
    console.log('找到提示词输入框 (兜底 contenteditable)');
  }
  return fallback || null;
}

// --- 读取提示词：引用标签按参考面板顺序替换为「参考图N」占位符 ---
function readPrompt() {
  const input = findPromptInput();
  if (!input) return '';

  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    return input.value || '';
  }

  if (!input.isContentEditable) return '';

  // 1. 先扫描参考面板，建立图片 → 面板顺序号 的映射
  const panelImages = queryPanelImages();
  const panelOrderMap = new Map(); // URL → 面板中的序号 (1-based)
  panelImages.forEach((img, i) => {
    const url = img.src || '';
    if (url && (url.startsWith('blob:') || url.startsWith('http'))) {
      if (!panelOrderMap.has(url)) {
        panelOrderMap.set(url, i + 1);
      }
    }
  });
  console.log(`参考面板中有 ${panelImages.length} 张图片`);

  // 2. 获取所有 mention 标签，按面板顺序分配编号
  const liveMentions = input.querySelectorAll(SELECTORS.mentionTag);
  mentionSlots = [];

  // 不在面板中的 mention 的降级编号计数器
  const fallbackMap = new Map(); // key → 降级编号
  let fallbackCounter = panelOrderMap.size; // 从面板数开始累加

  liveMentions.forEach(tag => {
    const key = getMentionKey(tag); // ← blob URL 或 label 文本

    let idx;
    if (key && panelOrderMap.has(key)) {
      // 在参考面板中 → 按面板顺序编号
      idx = panelOrderMap.get(key);
    } else {
      // 不在面板中（纯文字mention）→ 顺序分配
      if (!fallbackMap.has(key)) {
        fallbackCounter++;
        fallbackMap.set(key, fallbackCounter);
      }
      idx = fallbackMap.get(key);
    }

    mentionSlots.push({
      placeholder: `参考图${idx}`,
      element: tag
    });
  });

  // 3. 克隆 DOM 提取文本
  const clone = input.cloneNode(true);
  const cloneMentions = clone.querySelectorAll(SELECTORS.mentionTag);
  cloneMentions.forEach((tag, i) => {
    const placeholder = document.createElement('span');
    placeholder.textContent = mentionSlots[i].placeholder;
    tag.replaceWith(placeholder);
  });

  const text = (clone.textContent || '').trim();
  console.log(
    `读取到提示词(${liveMentions.length} 处引用, ${panelOrderMap.size} 张面板图, ${fallbackMap.size} 个其他引用)`
  );
  return text;
}

// --- 写入提示词：按 placeholder 匹配法则正确恢复每个引用 ---
function writePrompt(text) {
  const input = findPromptInput();
  if (!input) return false;

  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    const ns = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (ns) ns.call(input, text);
    else input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    return true;
  }

  if (!input.isContentEditable) return false;

  // 使用 mentionSlots（由 readPrompt 建立，包含 placeholder + 原始 DOM 元素）
  const slots = mentionSlots.length > 0 ? mentionSlots
    : Array.from(input.querySelectorAll(SELECTORS.mentionTag)).map(el => ({ element: el }));

  if (slots.length === 0) {
    // 没有引用标签，写入纯文本
    const paragraphs = text.split('\n').map(line => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    });
    input.innerHTML = '';
    paragraphs.forEach(p => input.appendChild(p));
  } else {
    // 1. 提取 AI 文本中「参考图N」标记的出现序列
    const markers = text.match(/参考图\s*\d+/g) || [];
    const parts = text.split(/参考图\s*\d+/);

    // 2. 按 placeholder 为每个标记建立 DOM 元素队列
    const slotQueues = {};
    slots.forEach(s => {
      const key = s.placeholder || '';
      if (!slotQueues[key]) slotQueues[key] = [];
      slotQueues[key].push(s.element);
    });

    // 3. 从 DOM 中摘除所有 mention 元素并清空编辑器
    slots.forEach(s => {
      if (s.element && s.element.parentNode) s.element.remove();
    });
    input.innerHTML = '';

    // 4. 按 markers 序列从队列中弹取正确的 DOM 元素
    for (let i = 0; i < Math.max(parts.length, markers.length); i++) {
      if (i < parts.length && parts[i].trim()) {
        const p = document.createElement('p');
        p.textContent = parts[i].trim();
        input.appendChild(p);
      }
      if (i < markers.length) {
        const queue = slotQueues[markers[i]];
        if (queue && queue.length > 0) {
          const element = queue.shift();
          const p = document.createElement('p');
          p.appendChild(element);
          input.appendChild(p);
        }
      }
    }

    console.log(
      `${markers.length} 处引用标记已替换, ${slots.length} 个原始 DOM 槽位已匹配`
    );
  }

  // 触发 ProseMirror 事件
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertFromPaste',
    data: text
  }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  input.focus();
  input.dispatchEvent(new Event('focus', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  setTimeout(() => input.focus(), 50);

  return true;
}

// ==================== 参考图获取 ====================

// --- 获取参考图 base64（严格按面板顺序） ---
async function getReferenceImages() {
  const images = [];

  // 从引用面板获取图片（已按 DOM 顺序 = 上传顺序）
  const panelImgs = queryPanelImages();
  for (const img of panelImgs) {
    const src = img.src || '';
    if (!src) continue;
    const base64 = await tryGetBase64(src);
    if (base64) {
      images.push({ data: base64, src: src.substring(0, 100) });
    }
  }

  console.log(`获取到 ${images.length} 张参考图（面板顺序）`);
  return images;
}

// --- 从引用面板中按 data-index 顺序获取图片（严格匹配上传顺序） ---
function queryPanelImages() {
  const results = [];
  const seenSrcs = new Set();

  // 找到第一个匹配的参考图容器
  let container = null;
  for (const selector of SELECTORS.referenceGroup) {
    container = document.querySelector(selector);
    if (container) break;
  }
  if (!container) return results;

  // 按 data-index 排序获取引用条目
  const items = container.querySelectorAll('[class*="reference-item-"]');
  const sortedItems = Array.from(items).sort((a, b) => {
    const ia = parseInt(a.getAttribute('data-index'), 10);
    const ib = parseInt(b.getAttribute('data-index'), 10);
    return (isNaN(ia) ? 0 : ia) - (isNaN(ib) ? 0 : ib);
  });

  // 从每个条目中提取图片（支持 blob URL 新建任务 和 https CDN 编辑已有任务）
  for (const item of sortedItems) {
    const imgs = item.querySelectorAll('img');
    for (const img of imgs) {
      const src = img.src || '';
      if ((src.startsWith('blob:') || src.startsWith('http')) && !seenSrcs.has(src)) {
        seenSrcs.add(src);
        results.push(img);
      }
    }
  }

  console.log(`面板中找到 ${results.length} 张参考图（按 data-index 排序）`);
  return results;
}

// --- 尝试获取图片 base64（支持 blob / data / http） ---
async function tryGetBase64(src) {
  try {
    if (src.startsWith('blob:')) return await fetchBlobAsBase64(src);
    if (src.startsWith('data:')) return src.replace(/^data:image\/\w+;base64,/, '');
    if (src.startsWith('http')) return await imageUrlToBase64(src);
  } catch (e) {
    console.warn('图片转换失败:', e.message);
  }
  return null;
}

// --- 通过 fetch 获取 blob URL 的 base64 ---
async function fetchBlobAsBase64(blobUrl) {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.replace(/^data:image\/\w+;base64,/, ''));
      reader.onerror = () => reject(new Error('FileReader 失败'));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('fetch blob 失败，注入页面脚本:', e.message);
    return await injectGetBlobBase64(blobUrl);
  }
}

// --- 注入页面脚本获取 blob ---
async function injectGetBlobBase64(blobUrl) {
  return new Promise((resolve, reject) => {
    const id = 'jm-optimizer-blob-' + Date.now();
    const timeout = setTimeout(() => reject(new Error('超时')), 10000);
    window.addEventListener('message', function handler(event) {
      if (event.data?.type === id) {
        window.removeEventListener('message', handler);
        clearTimeout(timeout);
        if (event.data.base64) resolve(event.data.base64);
        else reject(new Error(event.data.error || '失败'));
      }
    });
    const script = document.createElement('script');
    script.textContent = `
      (async()=>{
        try {
          const r=await fetch('${blobUrl}');
          const b=await r.blob();
          const rd=new FileReader();
          rd.onload=()=>window.postMessage({type:'${id}',base64:rd.result.replace(/^data:image\\/\\w+;base64,/,'')},'*');
          rd.onerror=()=>window.postMessage({type:'${id}',error:'FileReader failed'},'*');
          rd.readAsDataURL(b);
        }catch(e){window.postMessage({type:'${id}',error:e.message},'*')}
      })();
    `;
    document.body.appendChild(script);
    script.remove();
  });
}

// --- 通过 canvas 将远程图片转为 base64 ---
async function imageUrlToBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, ''));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

// ==================== 消息监听 ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content Script 收到消息:', request.action);

  switch (request.action) {
    case 'getPromptFromPage':
      sendResponse({ success: true, prompt: readPrompt() });
      break;

    case 'getImagesFromPage':
      getReferenceImages()
        .then(images => sendResponse({ success: true, images, count: images.length }))
        .catch(error => sendResponse({ success: false, error: error.message, images: [] }));
      return true;

    case 'writePromptToPage':
      sendResponse({ success: writePrompt(request.text) });
      break;

    default:
      sendResponse({ success: false, error: '未知操作: ' + request.action });
  }
});

// --- 初始化 ---
console.log('即梦提示词优化器 Content Script 已加载');
new MutationObserver(() => {}).observe(document.body, { childList: true, subtree: true });
