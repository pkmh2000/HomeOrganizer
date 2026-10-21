import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 25mb limit for base64 photo analysis
app.use(express.json({ limit: '25mb' }));

// Initialize Google Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. API: Analyze item or container photo with Gemini AI
app.post('/api/gemini/analyze-photo', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' });
    }

    // Strip prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `請分析這張家庭收納照片。
辨識圖中是甚麼家庭物品或收納容器，並推論合適的收納分類與建議。
請嚴格以繁體中文 (Traditional Chinese) 回傳 JSON，符合以下結構：
{
  "name": "物品或容器精準名稱 (如：百靈旗艦耳溫槍、特級冷壓初榨橄欖油、Switch 無線手把、透明保鮮收納盒)",
  "type": "item 或 container (若為箱子、抽屜、置物架等可容納其他物品的請填 container，否則填 item)",
  "category": "分類類別 (例如：消耗品, 3C/電器, 急救常備藥, 食品/乾貨, 工具/修繕, 季節衣物, 重要文件, 清潔用品, 貴重物品)",
  "color": "該分類代表色 HEX (如 #ef4444, #3b82f6, #10b981, #f59e0b, #8b5cf6)",
  "description": "簡短 1~2 句物品特色、規格或存放維護注意事項",
  "suggestedContainer": "建議存放的家庭空間 (如：急救醫藥櫃、廚房乾貨箱、電視櫃抽屜、工具箱)",
  "estimatedDaysToExpiry": 0 (若為食品、藥品、化妝品或消耗品，請預估常見未開封保存天數，非耗材或永久用品填 null)
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text?.trim() || '{}';
    const parsed = JSON.parse(resultText);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing photo with Gemini:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gemini 圖片辨識失敗，請稍後重試',
    });
  }
});

// 2. API: Household Smart Q&A Assistant (Find things in your house using natural language)
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { query, inventoryData } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query prompt' });
    }

    const contextPrompt = `你是一位專業且親切的「家庭智慧收納管家」。
以下是家庭目前登記的所有收納空間、容器與物品資料：
${JSON.stringify(inventoryData || []).slice(0, 15000)}

使用者提問：「${query}」

請根據上方家庭清單精準回答使用者的問題：
1. 若使用者詢問某物品在哪裡，請詳細指出它放在哪一個房間、哪一個櫃子/抽屜或收納箱（列出完整存放層級路徑）。
2. 若使用者詢問過期狀況、保固或借出狀態，請提供清晰的摘要與具體建議。
3. 若清單中找不到，請委婉告知並給出可能遺漏或可搜尋的關鍵字建議。
請使用溫馨親切的繁體中文回答。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
    });

    res.json({
      success: true,
      answer: response.text || '無法解析回答',
    });
  } catch (error: any) {
    console.error('Error with Gemini Assistant:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gemini 智慧管家問答失敗',
    });
  }
});

// 3. API: Expiring Consumables Zero-Waste Recipe / Replenishment Ideas
app.post('/api/gemini/recipe-ideas', async (req, res) => {
  try {
    const { expiringItems } = req.body;
    if (!expiringItems || expiringItems.length === 0) {
      return res.json({ success: true, ideas: [] });
    }

    const prompt = `家庭中有以下即將過期或臨期的食材乾貨與消耗品：
${expiringItems.join(', ')}

請以「零浪費、快速清庫存」為出發點，提供 2~3 個創意的清庫存家常料理做法或實用消耗妙招。
請回傳繁體中文。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      ideas: response.text || '',
    });
  } catch (error: any) {
    console.error('Error generating recipe ideas:', error);
    res.status(500).json({
      success: false,
      error: error.message || '料理清庫存靈感生成失敗',
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HomeOrganizer server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
