// GET /api/admin/geoip?ip=… → IP 归属地（概览页"最近访问"列表用）
// 主查 whois.pconline.com.cn（国内 IP 返回中文省/市，GBK 编码、无 key、无需注册）；
// pconline 查不到（国外 IP）时兜底 ipwho.is 拿英文国家名，再经内置中文国家表转中文；
// 内存 Map 缓存 24 小时（按 Worker 实例隔离；个人站访问量下足够），失败返回 ok:false 由前端降级显示"—"
// PUT /api/admin/geoip {enabled} → 保存归属地开关（site_settings.visit_geo，默认开）
// 开关只控制前端是否发起归属地查询，不删数据
import { json } from '../../lib/util.js';
import { ensureSchema } from '../../lib/migrate.js';

const cache = new Map();

// ipwho.is 的英文国家名 → 中文（覆盖常见国家/地区；查不到的显示英文原文）
const CC = {
  'china': '中国', 'united states': '美国', 'united states of america': '美国', 'usa': '美国',
  'japan': '日本', 'south korea': '韩国', 'korea': '韩国', 'india': '印度',
  'germany': '德国', 'france': '法国', 'united kingdom': '英国', 'uk': '英国',
  'singapore': '新加坡', 'australia': '澳大利亚', 'canada': '加拿大', 'russia': '俄罗斯',
  'taiwan': '中国台湾', 'hong kong': '中国香港', 'macao': '中国澳门', 'macau': '中国澳门',
  'malaysia': '马来西亚', 'thailand': '泰国', 'vietnam': '越南', 'indonesia': '印度尼西亚',
  'philippines': '菲律宾', 'brazil': '巴西', 'netherlands': '荷兰', 'sweden': '瑞典',
  'norway': '挪威', 'finland': '芬兰', 'switzerland': '瑞士', 'italy': '意大利',
  'spain': '西班牙', 'ukraine': '乌克兰', 'poland': '波兰', 'turkey': '土耳其',
  'saudi arabia': '沙特阿拉伯', 'uae': '阿联酋', 'united arab emirates': '阿联酋',
  'egypt': '埃及', 'south africa': '南非', 'mexico': '墨西哥', 'argentina': '阿根廷',
  'chile': '智利', 'new zealand': '新西兰', 'ireland': '爱尔兰', 'belgium': '比利时',
  'austria': '奥地利', 'portugal': '葡萄牙', 'greece': '希腊', 'israel': '以色列',
  'pakistan': '巴基斯坦', 'bangladesh': '孟加拉国', 'nepal': '尼泊尔', 'kazakhstan': '哈萨克斯坦',
  'mongolia': '蒙古', 'myanmar': '缅甸', 'cambodia': '柬埔寨', 'maldives': '马尔代夫',
  'cuba': '古巴', 'peru': '秘鲁', 'colombia': '哥伦比亚', 'iran': '伊朗', 'iraq': '伊拉克',
  'nigeria': '尼日利亚', 'morocco': '摩洛哥', 'ethiopia': '埃塞俄比亚', 'czechia': '捷克',
};

function ipOk(ip) {
  if (!ip) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return ip.split('.').every((n) => +n <= 255);
  return /^[0-9a-f:]+$/i.test(ip) && ip.indexOf(':') > -1; // 简化 IPv6 校验
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const ip = (url.searchParams.get('ip') || '').trim();
    if (!ipOk(ip)) return json({ ok: false, error: 'bad ip' });

    const now = Date.now();
    const hit = cache.get(ip);
    if (hit && hit.exp > now) return json({ ok: true, geo: hit.geo });

    let geo = '';
    // 1) pconline：国内 IP 返回中文省/市（GBK）
    try {
      const r = await fetch('https://whois.pconline.com.cn/ipJson.jsp?ip=' + encodeURIComponent(ip) + '&json=true', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const buf = await r.arrayBuffer();
      const txt = new TextDecoder('gbk').decode(buf);
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]);
        const pro = (j.pro || '').trim();
        const city = (j.city || '').trim();
        if (pro && city) geo = pro + (city === pro || city.indexOf(pro) === 0 ? '' : ' ' + city);
        else geo = pro || city;
      }
    } catch {}
    // 2) ipwho.is 兜底（国外 IP）：英文国家名 → 中文国家表
    if (!geo) {
      try {
        const r = await fetch('https://ipwho.is/' + encodeURIComponent(ip));
        const j = await r.json();
        if (j && j.success && j.country) {
          const cn = CC[String(j.country).toLowerCase().trim()];
          geo = cn || j.country;
          if (j.region && j.region !== j.country && j.city && j.city !== j.region && j.city !== j.country) {
            geo += '·' + j.city; // 英文城市原文
          }
        }
      } catch {}
    }
    if (geo) {
      cache.set(ip, { geo: geo, exp: now + 86400e3 });
      return json({ ok: true, geo: geo });
    }
    return json({ ok: false });
  } catch {
    return json({ ok: false });
  }
}

export async function onRequestPut({ env, request }) {
  try {
    await ensureSchema(env);
    const body = await request.json();
    const enabled = !!body.enabled;
    await env.DB.prepare(
      "INSERT INTO site_settings (key, value) VALUES ('visit_geo', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(enabled ? '1' : '0').run();
    return json({ ok: true, enabled: enabled });
  } catch {
    return json({ ok: false });
  }
}