import { escapeHtml, showToast } from "../core/ui.js";

const appData = {
  forum: { title: "论坛", status: "社区结构占位", intro: "小组、长帖、匿名树洞与书影音条目会共用人物和权限系统。", items: [] },
  delivery: { title: "外卖", status: "订单链路占位", intro: "商家、菜单、优惠、地址与配送状态将连接统一钱包和灵动岛。", items: [] },
  shop: { title: "购物", status: "商品系统占位", intro: "浏览、购物车、赠礼、开店、物流和售后共享真实业务记录。", items: [] },
  flea: { title: "二手平台", status: "交易结构占位", intro: "二手发布、议价、同城与邮寄交易会遵守虚拟钱包和身份边界。", items: [] },
  sms: { title: "短信", status: "通信结构占位", intro: "短信是独立通信渠道，不会绕过彻底停止联系的边界。", items: [] },
  phone: { title: "电话", status: "通话结构占位", intro: "语音、通话记录、实时打断和音频焦点会使用同一 CallSession。", items: [] },
  worldbook: { title: "世界书", status: "规则编辑占位", intro: "关键词、人物关系、秘密范围、优先级与预算将进入可见性过滤后的上下文。", items: [] },
  presets: { title: "预设", status: "版本管理占位", intro: "全局、世界、角色和会话预设分层组合，并展示实际生效来源。", items: [] },
  games: { title: "游戏", status: "规则引擎占位", intro: "先提供真心话大冒险与海龟汤，再扩展飞行棋、大富翁和斗地主。", items: [] },
  memos: { title: "备忘录", status: "本机内容占位", intro: "清单、私事与角色日记按设备主人和查手机权限过滤。", items: [] },
  calendar: { title: "日历", status: "任务结构占位", intro: "区分现实提醒时钟与剧情世界时钟，修改剧情时间不会改变番茄钟。", items: [] },
  wallet: { title: "钱包", status: "虚拟账本占位", intro: "红包、转账、购物与外卖使用统一整数金额账本并支持幂等重试。", items: [] }
};

export function createPlaceholderRenderer(route) {
  return container => {
    const app = appData[route];
    container.innerHTML = `<div class="row between"><span class="pill">${escapeHtml(app.status)}</span><button class="icon-button" data-add>＋</button></div><section class="card placeholder-hero"><span class="eyebrow">${escapeHtml(app.title).toUpperCase()}</span><h3>${escapeHtml(app.title)}</h3><p>${escapeHtml(app.intro)}</p></section><div class="section-title"><h3>暂无内容</h3><span>等待你来创建</span></div><section class="stack">${app.items.map((item,index)=>`<button class="card row between placeholder-row" data-item="${index}"><span>${escapeHtml(item)}</span><span>›</span></button>`).join("")}</section>`;
    container.querySelector("[data-add]").addEventListener("click",()=>showToast(`${app.title}的新建流程将在对应里程碑接入`));
    container.querySelectorAll("[data-item]").forEach(button=>button.addEventListener("click",()=>showToast("这是可进入的业务占位，后续将连接共享数据服务")));
  };
}

export const placeholderRoutes = Object.keys(appData);
