import { InventoryNode, FamilyMemo } from '../types';
import { getNodeAncestors, getExpirationStatus } from './storage';

/**
 * Intelligent client-side assistant engine.
 * Guarantees that the app runs completely standalone on GitHub Pages or offline,
 * without needing an active backend server!
 */
export async function askSmartAssistant(
  query: string,
  nodes: InventoryNode[],
  memos: FamilyMemo[]
): Promise<string> {
  const q = query.trim().toLowerCase();

  // Try server endpoint first if available
  try {
    const customApiKey = localStorage.getItem('homeorganizer_gemini_key');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/gemini/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        inventoryData: nodes.map((n) => ({
          name: n.name,
          type: n.type,
          parentId: n.parentId,
          quantity: n.quantity,
          unit: n.unit,
          expirationDate: n.expirationDate,
          warrantyExpiry: n.warrantyExpiry,
          loanStatus: n.loanStatus,
          tags: n.tags?.map((t) => t.name),
          description: n.description,
        })),
        apiKey: customApiKey || undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.answer) {
        return data.answer;
      }
    }
  } catch (err) {
    // Server endpoint not reachable (GitHub Pages static environment or offline)
    // Fall through to smart local client-side analysis
  }

  // Smart local client-side analysis
  return generateLocalSmartAnswer(q, nodes, memos);
}

function generateLocalSmartAnswer(
  q: string,
  nodes: InventoryNode[],
  memos: FamilyMemo[]
): string {
  // 1. Inquiries about expiration (過期, 效期, 期限, 壞掉, 臨期)
  if (
    q.includes('過期') ||
    q.includes('效期') ||
    q.includes('到期') ||
    q.includes('快過期') ||
    q.includes('保存期限')
  ) {
    const expiredList: string[] = [];
    const urgentList: string[] = [];

    nodes.forEach((n) => {
      if (n.expirationDate) {
        const exp = getExpirationStatus(n.expirationDate);
        const ancestors = getNodeAncestors(nodes, n.id);
        const pathStr = ancestors.map((a) => a.name).join(' > ');
        if (exp.status === 'expired') {
          expiredList.push(`• **${n.name}**：已逾期 ${Math.abs(exp.daysLeft!)} 天（存放於：${pathStr}）`);
        } else if (exp.status === 'expiring_soon') {
          urgentList.push(`• **${n.name}**：剩餘 ${exp.daysLeft} 天到期（存放於：${pathStr}）`);
        }
      }
    });

    let ans = '📋 **家庭消耗品與食品效期檢測報告：**\n\n';
    if (expiredList.length > 0) {
      ans += `🚨 **已過期項目 (${expiredList.length} 件)：**\n${expiredList.join('\n')}\n\n`;
    }
    if (urgentList.length > 0) {
      ans += `⚠️ **即將於 7 天內到期 (${urgentList.length} 件)：**\n${urgentList.join('\n')}\n\n`;
    }
    if (expiredList.length === 0 && urgentList.length === 0) {
      ans += '✨ 太棒了！目前家中登記的所有消耗品與常備藥均在有效期限內，沒有即將逾期的項目。';
    } else {
      ans += '💡 **收納管家建議**：請優先消耗即將到期之食材，並妥善清理逾期藥品及用品。';
    }
    return ans;
  }

  // 2. Inquiries about borrowed items (借出, 誰借, 歸還, 外借)
  if (q.includes('借') || q.includes('還') || q.includes('誰拿') || q.includes('外借')) {
    const loanedItems = nodes.filter((n) => n.loanStatus?.isLoaned);
    if (loanedItems.length === 0) {
      return '📦 目前家中沒有任何登記外借中的物品，所有物資均妥善存放在各收納容器中！';
    }

    let ans = `🤝 **目前共有 ${loanedItems.length} 件物品外借中：**\n\n`;
    loanedItems.forEach((n) => {
      const ls = n.loanStatus!;
      ans += `• **${n.name}**\n  借給：${ls.borrower || '未知'}\n  借出日期：${ls.loanDate || '未記'}\n  預計歸還：${ls.returnDueDate || '未約定'}\n\n`;
    });
    return ans;
  }

  // 3. Inquiries about recipes / cooking ideas (料理, 煮, 菜, 吃)
  if (q.includes('料理') || q.includes('煮') || q.includes('吃') || q.includes('食譜') || q.includes('菜')) {
    const foodItems = nodes.filter(
      (n) =>
        n.expirationDate ||
        n.tags?.some((t) => t.name.includes('食品') || t.name.includes('乾貨') || t.name.includes('食材'))
    );
    if (foodItems.length > 0) {
      const names = foodItems.slice(0, 3).map((f) => f.name).join('、');
      return `🍳 **零浪費清庫存料理靈感：**\n\n家中目前有「${names}」等物資：\n1. **暖心綜合時蔬乾貨湯**：將乾貨食材溫水泡發後，搭配熱湯慢燉，甘醇鮮美又清爽。\n2. **蒜香快炒什錦**：熱鍋下少許橄欖油與蒜碎爆香，加入現有食材快速翻炒，5 分鐘即可美味上桌！\n3. **密封防潮提醒**：乾貨請注意放入防潮密封盒中保存，並於有效日期前食用完畢。`;
    }
  }

  // 4. Searching for specific items (在哪, 哪裡, 找, 放哪)
  // Extract key search terms
  const searchWords = q
    .replace(/在哪裡|在哪|找|有嗎|放在哪|放在哪裡|放哪|收在|收在哪|請幫我找/g, '')
    .trim();

  const candidates = nodes.filter((n) => {
    if (!searchWords) return false;
    return (
      n.name.toLowerCase().includes(searchWords) ||
      (n.description && n.description.toLowerCase().includes(searchWords)) ||
      (n.barcode && n.barcode.toLowerCase().includes(searchWords)) ||
      n.tags?.some((t) => t.name.toLowerCase().includes(searchWords))
    );
  });

  if (candidates.length > 0) {
    let ans = `🔍 為您找到 **${candidates.length}** 項符合的物品/容器：\n\n`;
    candidates.slice(0, 5).forEach((item) => {
      const ancestors = getNodeAncestors(nodes, item.id);
      const pathStr = ancestors.map((a) => a.name).join(' > ');
      ans += `📍 **${item.name}** (${item.type === 'container' ? '容器空間' : `物件 x${item.quantity}`})\n`;
      ans += `  • **收納層級**：${pathStr}\n`;
      if (item.description) {
        ans += `  • **備註說明**：${item.description}\n`;
      }
      if (item.loanStatus?.isLoaned) {
        ans += `  • ⚠️ **注意**：此物品目前外借給「${item.loanStatus.borrower}」\n`;
      }
      ans += '\n';
    });
    ans += '👉 您可以直接點擊「空間收納」或「視覺化搜尋」直達該容器深入檢視！';
    return ans;
  }

  // Fallback general guidance
  return `🤖 我是您的家庭智慧收納管家！\n\n目前在清單中未找到與「${searchWords || q}」完全符合的物品。\n建議您可以：\n1. 嘗試搜尋較短的關鍵字（如「藥」、「油」、「手把」、「線材」）\n2. 使用頂部的「相機掃描條碼」或「拍照批次收納」快速建檔\n3. 到「空間收納」中查看各房間是否有剛買回家尚未歸位的物品。`;
}
