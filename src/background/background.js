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
      id: 'detail-zh',
      name: '详细中文描述',
      prompt: '你是一位专业的 AI 提示词工程师。请将以下提示词优化为更详细、更生动的中文描述。提示词中可能包含 "参考图1"、"参考图2" 等图片引用标记，你必须原样保留这些标记（包括中文和数字），不要修改或删除它们。重要说明："参考图1" 对应发送给你的第1张图片，"参考图2" 对应第2张图片，以此类推。描述每个参考图角色时，请根据对应图片中实际看到的内容（服装、外貌、姿态）进行描述。不要调换或重新分配编号。添加关于光线、构图、风格、氛围和技术质量的细节。只输出优化后的提示词，不要有任何解释或 markdown 格式。\n\n原始提示词：{prompt}'
    },
    {
      id: 'action-movie',
      name: '动作电影优化',
      prompt: '你现在需要同时兼任三个专业岗位：资深院线动作片导演、专业武术动作指导、电影摄影指导，基于我后续提供的全部剧情、角色、场景、打斗相关信息，完整细化并生成一段可一键复制、直接粘贴到即梦 2.0 使用的标准化视频提示词，严格遵守以下创作规则与固定输出格式，禁止简化、禁止模糊描述、禁止删减模块。\n\n一、三大岗位工作要求\n\n资深动作片导演：把控整片叙事节奏与镜头逻辑，按照时间轴拆分精确到 0.1 秒的分镜，区分对峙、蓄力、出招、攻防对拆、闪避、必杀、收尾等动作段落，保证镜头衔接流畅连贯，全程人物、场景设定统一，无画面跳戏、人设前后矛盾问题。\n\n资深武术指导：设计全部人物完整武打动作、连招、武器招式、异能技能、攻防互动走位，所有动作符合人体力学，细化起手、释放、格挡、反击、落地全套动作，敌我对战动作互相呼应，杜绝隔空对打、动作脱节，根据角色体型、身份匹配专属打斗风格。\n\n资深摄影指导：为每一段秒级分镜定制专属运镜、景别、拍摄角度、光影方案，灵活使用推/拉/摇/移/环绕/急速跟拍/慢镜头/定点定格等运镜，搭配全景、中景、近景、特写、仰俯拍，搭配适配场景的光影色调，控制画面明暗，避免死黑、过曝。\n\n二、固定输出结构（顺序绝对不能调换，全部模块必须写全）\n\n模块 1 全局视频基础参数（放在最开头）：包含画幅比例、帧率、分辨率画质、整体美术风格、渲染参数、画面整体氛围；参数写完整专业，适配即梦 2.0 渲染逻辑。\n\n模块 2 场景环境总设定：完整写明故事发生地点、环境、天气、光影基调、背景动态元素、空间层次细节。\n\n模块 3 完整角色人设档案：逐个列出所有出场角色，每个角色独立细化：角色标注（主角/反派/配角）、姓名、年龄体型、五官外貌、发型、全套服饰细节、配饰、手持武器/装备、标志性气质、专属打斗特征、技能特效色彩。\n\n模块 4 秒级分镜脚本（核心内容）：统一格式：时间区间（00:00-00:00.X）+【景别+拍摄角度+运镜方式】+ 人物全套肢体动作/招式/表情/走位对战互动 + 画面光影、技能特效、环境动态效果；按时间顺序依次排列，每一段时间独立清晰。\n\n模块 5 统一负面提示词（末尾固定）：整合通用画质负面、动作类专项负面、画面故障负面：无水印、无logo、无多余文字、无乱码、无错帧、无丢帧、画面无卡顿撕裂、无重影模糊、无过曝死黑、无肢体扭曲、手脚错位、模型穿模、浮空悬浮、动作僵硬、隔空出招、人物五官变形、低画质马赛克、噪点颗粒、画面压缩失真。\n\n三、额外硬性规则\n\n全部描述使用影视专业术语，把我提供的简短口语信息全部扩写细化，不保留模糊词汇；最终成品只有纯提示词文本，不带任何注释、解释、多余对话，输出干净整洁，可直接复制进即梦 2.0；全程保证人物五官、服饰、武器、体型全程统一，分镜动作连贯自然，运镜和打斗节奏互相匹配；不添加超出我提供信息的原创剧情、角色、场景，仅做细节扩充优化。\n\n原始提示词：{prompt}'
    },
    {
      id: 'storyboard',
      name: '分镜优化',
      prompt: '你是资深电影分镜导演、广告视频拆解师和 AI 视频 Prompt 工程师。请分析用户提供的简易Prompt和参考图片，将它优化成一份可直接用于 AI 视频生成的中文 Prompt。\n\n核心原则：\n1. 不要只写"电影感""高级感""冲击力"等空泛词，必须把画面翻译成具体可执行指令。\n2. 像指挥真人摄影团队一样描述：谁、在哪、穿什么、做什么、镜头怎么拍、光怎么打、画面从几秒到几秒发生什么。\n3. 优先保留视频里真实可见的信息；无法确认的内容标注为"推测"，不要编造不存在的角色、品牌、台词或剧情。\n4. 真实感来自细节：材质、磨损、瑕疵、灰尘、油污、布料褶皱、皮肤纹理、环境杂物、轻微失衡都要尽量提取。\n5. 运镜要具体：景别、机位、运动方向、速度、焦点变化、是否手持、是否有轻微呼吸感。\n6. 如果视频有多镜头，按镜头拆；如果是一镜到底，按秒切片拆。\n7. 如果画面包含明确 IP、明星、品牌或版权角色，不要直接复刻名称，改写成通用视觉描述。\n\n请按以下结构输出：\n\n【一、核心摘要】用 2-3 句话概括视频最核心的视觉记忆点、叙事钩子和情绪方向。\n\n【二、核心主题】输出 3-6 个标签，用 "|" 分隔。格式示例：写实广告短片 | 高反差情绪钩子 | 手持纪实镜头 | 低饱和电影色调 | 强冲突反转\n\n【三、人物与基础设定】\n1. 主体/人物：外貌、年龄感、体态、表情、姿态、身份气质。如果有面部特征，描述真实特征，不要默认美化。如果有角色关系，说明谁压迫谁、谁反击谁、谁旁观。\n2. 服装/道具：材质、颜色、版型、磨损、污渍、反光、细节配件。道具的形状、位置、使用方式和叙事功能。\n3. 场景/空间：地点、时间、天气、空间层次、前景/中景/背景。地面、墙面、家具、杂物、光源、环境质感。如果有反差关系，明确写出，例如"奢华空间与混乱残骸形成反差"。\n\n【四、氛围与画质】\n1. 视觉基调：写实、纪实、复古、暗黑、商业广告、短剧、特摄、赛博、荒诞喜剧等。\n2. 摄影机与镜头模拟：根据视频质感推测合适的摄影机和镜头语言。可使用类似"模拟电影摄影机、35mm 镜头、中等景深、轻微胶片颗粒、边缘柔焦"等具体描述。不要只写"电影感强"。\n3. 色彩与影调：主色调、辅助色、饱和度、对比度、暗部细节、肤色倾向。如有多镜头，说明如何保持统一色调。\n4. 光影：主光方向、逆光/侧光/顶光、自然光/人工光、阴影硬度、反射光、环境光。\n\n【五、运镜规则】请拆解视频的镜头语言：景别（远景/全景/中景/近景/特写/过肩/主观镜头）；机位（平视/低角度/高角度/俯拍/仰拍/侧45度）；运动（推、拉、摇、移、跟随、环绕、定机位、手持）；节奏（快速切换/缓慢推进/突然停顿/反转瞬间微颤）；呼吸感（如原视频有真实手持感，请写"极其轻微的、如呼吸般的镜头浮动"，避免绝对静止的CG感）；焦点（主体锁定、焦点转移、背景虚化、前景遮挡等）。\n\n【六、分镜时间轴】根据视频结构选择一种写法：\nA. 如果是一镜到底：按秒切片输出，每段包含：时间范围、动作、镜头、光影/特效、声音/台词/字幕、情绪功能。\nB. 如果是多镜头：按镜头输出，每个镜头包含：分镜编号、时间范围、景别、构图、运镜手法、画面内容、声音/台词/字幕、该镜头的叙事功能。\n\n【七、可直接生成的视频 Prompt】把以上分析整合成一段完整、可复制到 AI 视频生成工具里的最终 Prompt。要求：用自然中文写成完整指令；保留主体、动作、场景、光影、运镜、风格、画质、时间轴；不要写分析过程；不要写"参考视频中""原视频里"这类反推说明；直接写成目标成片描述。\n\n【八、负面 Prompt】列出应避免的问题：画面塑料感、游戏CG感、过度磨皮、角色脸部漂移、肢体畸形、镜头绝对静止、色调前后不一致、无关字幕、水印、Logo、版权角色残留、动作断裂、场景跳变等。\n\n原始提示词：{prompt}'
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
    'provider', 'doubao', 'deepseek', 'qwen', 'custom'
  ]);

  // 模板数据较大，从 chrome.storage.local 读取（避免 sync 8KB 配额限制）
  let templates = DEFAULT_CONFIG.templates;
  try {
    const localResult = await chrome.storage.local.get('templates');
    if (localResult.templates && localResult.templates.length > 0) {
      templates = localResult.templates;
    } else {
      // 迁移：从 sync 读取旧模板并写入 local
      const syncResult = await chrome.storage.sync.get('templates');
      if (syncResult.templates && syncResult.templates.length > 0) {
        templates = syncResult.templates;
        chrome.storage.local.set({ templates }).catch(() => {});
        chrome.storage.sync.remove('templates').catch(() => {});
      }
    }
  } catch (e) {
    // 降级到默认模板
  }

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
    templates: templates || DEFAULT_CONFIG.templates
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
  const templateId = config.currentTemplateId || 'detail-zh';
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
