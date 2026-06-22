// ============================================================
// 即梦提示词优化器 - Options/设置页面逻辑
// ============================================================

// --- 默认模板 ---
const DEFAULT_TEMPLATES = [
  {
    id: 'detail-zh',
    name: '详细中文描述',
    prompt: '你是一位专业的 AI 提示词工程师。请将以下提示词优化为更详细、更生动的中文描述。提示词中可能包含 "参考图1"、"参考图2" 等图片引用标记，你必须原样保留这些标记（包括中文和数字），不要修改或删除它们。重要说明："参考图1" 对应发送给你的第1张图片，"参考图2" 对应第2张图片，以此类推。描述每个参考图角色时，请根据对应图片中实际看到的内容（服装、外貌、姿态）进行描述。不要调换或重新分配编号。添加关于光线、构图、风格、氛围和技术质量的细节。只输出优化后的提示词，不要有任何解释或 markdown 格式。 \n\n原始提示词：{prompt}'
  },
  {
    id: 'action-movie',
    name: '动作电影优化',
    prompt: '你现在需要同时兼任三个专业岗位：资深院线动作片导演、专业武术动作指导、电影摄影指导，基于我后续提供的全部剧情、角色、场景、打斗相关信息，完整细化并生成一段可一键复制、直接粘贴到即梦 2.0 使用的标准化视频提示词，严格遵守以下创作规则与固定输出格式，禁止简化、禁止模糊描述、禁止删减模块。\n\n提示词中可能包含 "参考图1"、"参考图2" 等图片引用标记，你必须原样保留这些标记（包括中文和数字），不要修改或删除它们。\n\n一、三大岗位工作要求\n\n资深动作片导演：把控整片叙事节奏与镜头逻辑，按照时间轴拆分精确到 0.1 秒的分镜，区分对峙、蓄力、出招、攻防对拆、闪避、必杀、收尾等动作段落，保证镜头衔接流畅连贯，全程人物、场景设定统一，无画面跳戏、人设前后矛盾问题。\n\n资深武术指导：设计全部人物完整武打动作、连招、武器招式、异能技能、攻防互动走位，所有动作符合人体力学，细化起手、释放、格挡、反击、落地全套动作，敌我对战动作互相呼应，杜绝隔空对打、动作脱节，根据角色体型、身份匹配专属打斗风格。\n\n资深摄影指导：为每一段秒级分镜定制专属运镜、景别、拍摄角度、光影方案，灵活使用推/拉/摇/移/环绕/急速跟拍/慢镜头/定点定格等运镜，搭配全景、中景、近景、特写、仰俯拍，搭配适配场景的光影色调，控制画面明暗，避免死黑、过曝。\n\n二、固定输出结构（顺序绝对不能调换，全部模块必须写全）\n\n模块 1 全局视频基础参数（放在最开头）：包含画幅比例、帧率、分辨率画质、整体美术风格、渲染参数、画面整体氛围；参数写完整专业，适配即梦 2.0 渲染逻辑。\n\n模块 2 场景环境总设定：完整写明故事发生地点、环境、天气、光影基调、背景动态元素、空间层次细节。\n\n模块 3 完整角色人设档案：逐个列出所有出场角色，每个角色独立细化：角色标注（主角/反派/配角）、姓名、年龄体型、五官外貌、发型、全套服饰细节、配饰、手持武器/装备、标志性气质、专属打斗特征、技能特效色彩。\n\n模块 4 秒级分镜脚本（核心内容）：统一格式：时间区间（00:00-00:00.X）+【景别+拍摄角度+运镜方式】+ 人物全套肢体动作/招式/表情/走位对战互动 + 画面光影、技能特效、环境动态效果；按时间顺序依次排列，每一段时间独立清晰。\n\n模块 5 统一负面提示词（末尾固定）：整合通用画质负面、动作类专项负面、画面故障负面：无水印、无logo、无多余文字、无乱码、无错帧、无丢帧、画面无卡顿撕裂、无重影模糊、无过曝死黑、无肢体扭曲、手脚错位、模型穿模、浮空悬浮、动作僵硬、隔空出招、人物五官变形、低画质马赛克、噪点颗粒、画面压缩失真。\n\n三、额外硬性规则\n\n全部描述使用影视专业术语，把我提供的简短口语信息全部扩写细化，不保留模糊词汇；最终成品只有纯提示词文本，不带任何注释、解释、多余对话，输出干净整洁，可直接复制进即梦 2.0；全程保证人物五官、服饰、武器、体型全程统一，分镜动作连贯自然，运镜和打斗节奏互相匹配；不添加超出我提供信息的原创剧情、角色、场景，仅做细节扩充优化。\n\n原始提示词：{prompt}'
  },
  {
    id: 'storyboard',
    name: '分镜优化',
    prompt: '你是资深电影分镜导演、广告视频拆解师和 AI 视频 Prompt 工程师。请分析用户提供的简易Prompt和参考图片，将它优化成一份可直接用于 AI 视频生成的中文 Prompt。\n\n提示词中可能包含 "参考图1"、"参考图2" 等图片引用标记，你必须原样保留这些标记（包括中文和数字），不要修改或删除它们。\n\n核心原则：\n1. 不要只写"电影感""高级感""冲击力"等空泛词，必须把画面翻译成具体可执行指令。\n2. 像指挥真人摄影团队一样描述：谁、在哪、穿什么、做什么、镜头怎么拍、光怎么打、画面从几秒到几秒发生什么。\n3. 优先保留视频里真实可见的信息；无法确认的内容标注为"推测"，不要编造不存在的角色、品牌、台词或剧情。\n4. 真实感来自细节：材质、磨损、瑕疵、灰尘、油污、布料褶皱、皮肤纹理、环境杂物、轻微失衡都要尽量提取。\n5. 运镜要具体：景别、机位、运动方向、速度、焦点变化、是否手持、是否有轻微呼吸感。\n6. 如果视频有多镜头，按镜头拆；如果是一镜到底，按秒切片拆。\n7. 如果画面包含明确 IP、明星、品牌或版权角色，不要直接复刻名称，改写成通用视觉描述。\n\n请按以下结构输出：\n\n【一、核心摘要】用 2-3 句话概括视频最核心的视觉记忆点、叙事钩子和情绪方向。\n\n【二、核心主题】输出 3-6 个标签，用 "|" 分隔。格式示例：写实广告短片 | 高反差情绪钩子 | 手持纪实镜头 | 低饱和电影色调 | 强冲突反转\n\n【三、人物与基础设定】\n1. 主体/人物：外貌、年龄感、体态、表情、姿态、身份气质。如果有面部特征，描述真实特征，不要默认美化。如果有角色关系，说明谁压迫谁、谁反击谁、谁旁观。\n2. 服装/道具：材质、颜色、版型、磨损、污渍、反光、细节配件。道具的形状、位置、使用方式和叙事功能。\n3. 场景/空间：地点、时间、天气、空间层次、前景/中景/背景。地面、墙面、家具、杂物、光源、环境质感。如果有反差关系，明确写出，例如"奢华空间与混乱残骸形成反差"。\n\n【四、氛围与画质】\n1. 视觉基调：写实、纪实、复古、暗黑、商业广告、短剧、特摄、赛博、荒诞喜剧等。\n2. 摄影机与镜头模拟：根据视频质感推测合适的摄影机和镜头语言。可使用类似"模拟电影摄影机、35mm 镜头、中等景深、轻微胶片颗粒、边缘柔焦"等具体描述。不要只写"电影感强"。\n3. 色彩与影调：主色调、辅助色、饱和度、对比度、暗部细节、肤色倾向。如有多镜头，说明如何保持统一色调。\n4. 光影：主光方向、逆光/侧光/顶光、自然光/人工光、阴影硬度、反射光、环境光。\n\n【五、运镜规则】请拆解视频的镜头语言：景别（远景/全景/中景/近景/特写/过肩/主观镜头）；机位（平视/低角度/高角度/俯拍/仰拍/侧45度）；运动（推、拉、摇、移、跟随、环绕、定机位、手持）；节奏（快速切换/缓慢推进/突然停顿/反转瞬间微颤）；呼吸感（如原视频有真实手持感，请写"极其轻微的、如呼吸般的镜头浮动"，避免绝对静止的CG感）；焦点（主体锁定、焦点转移、背景虚化、前景遮挡等）。\n\n【六、分镜时间轴】根据视频结构选择一种写法：\nA. 如果是一镜到底：按秒切片输出，每段包含：时间范围、动作、镜头、光影/特效、声音/台词/字幕、情绪功能。\nB. 如果是多镜头：按镜头输出，每个镜头包含：分镜编号、时间范围、景别、构图、运镜手法、画面内容、声音/台词/字幕、该镜头的叙事功能。\n\n【七、可直接生成的视频 Prompt】把以上分析整合成一段完整、可复制到 AI 视频生成工具里的最终 Prompt。要求：用自然中文写成完整指令；保留主体、动作、场景、光影、运镜、风格、画质、时间轴；不要写分析过程；不要写"参考视频中""原视频里"这类反推说明；直接写成目标成片描述。\n\n【八、负面 Prompt】列出应避免的问题：画面塑料感、游戏CG感、过度磨皮、角色脸部漂移、肢体畸形、镜头绝对静止、色调前后不一致、无关字幕、水印、Logo、版权角色残留、动作断裂、场景跳变等。\n\n原始提示词：{prompt}'
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
    'provider', 'doubao', 'deepseek', 'qwen', 'custom'
  ], (syncResult) => {
    // 模板从 local 读取（避免 sync 8KB 配额限制）
    chrome.storage.local.get(['templates', 'currentTemplateId'], (localResult) => {
      // 默认值
      const config = {
        provider: 'doubao',
        doubao: { apiKey: '', endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-0-pro-260215' },
        deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash' },
        qwen: { apiKey: '', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-max' },
        custom: { items: [], selectedId: null },
        templates: DEFAULT_TEMPLATES,
        currentTemplateId: 'detail-zh',
        ...syncResult,
        ...localResult
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
  chrome.storage.local.get(['templates'], (result) => {
    const templates = result.templates || DEFAULT_TEMPLATES;
    templates.push({
      id: 'custom-' + Date.now(),
      name: '新模板 ' + (templates.length + 1),
      prompt: '优化以下提示词：\n\n{prompt}'
    });
    chrome.storage.local.set({ templates }, () => {
      renderTemplates(templates);
    });
  });
}

// --- 删除模板 ---
function deleteTemplate(index) {
  chrome.storage.local.get(['templates'], (result) => {
    const templates = result.templates || DEFAULT_TEMPLATES;
    if (templates.length <= 1) {
      showSaveStatus('至少保留一个模板', 'error');
      return;
    }
    templates.splice(index, 1);
    chrome.storage.local.set({ templates }, () => {
      renderTemplates(templates);
      showSaveStatus('已删除模板', 'success');
    });
  });
}

// --- 恢复默认模板（保留自定义模板，补全缺失的预设模板）---
function restoreDefaultTemplates() {
  chrome.storage.local.get(['templates'], (result) => {
    const existing = result.templates || [];
    const defaultIds = new Set(DEFAULT_TEMPLATES.map(t => t.id));

    // 保留所有非预设模板（用户自定义的模板）
    const customTemplates = existing.filter(t => !defaultIds.has(t.id));

    // 默认模板 + 自定义模板
    const merged = [...DEFAULT_TEMPLATES, ...customTemplates];

    chrome.storage.local.set({ templates: merged }, () => {
      renderTemplates(merged);
      showSaveStatus('✅ 已恢复默认预设模板，自定义模板已保留', 'success');
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

  const data = { provider, ...configs };

  // 小数据（API 配置）保存到 sync
  chrome.storage.sync.set(data, () => {
    if (chrome.runtime.lastError) {
      showSaveStatus('保存失败: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    // 大数据（模板）保存到 local，避免 sync 8KB 配额限制
    chrome.storage.local.set({ templates, currentTemplateId: 'detail-zh' }, () => {
      showSaveStatus('✅ 设置已保存！', 'success');
    });
  });
}

// --- 绑定事件 ---
function bindEvents() {
  providerSelect.addEventListener('change', () => {
    showProviderConfig(providerSelect.value);
  });

  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('add-template-btn').addEventListener('click', addTemplate);
  document.getElementById('restore-templates-btn').addEventListener('click', restoreDefaultTemplates);
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
