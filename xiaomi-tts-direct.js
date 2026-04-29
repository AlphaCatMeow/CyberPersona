#!/usr/bin/env node
/**
 * Xiaomi TTS 一键调用脚本
 * 默认模拟正式链路：茉莉 + tag_only
 * 如显式传第二参数，才进入实验性的 style 提示模式
 * 用法: node xiaomi-tts-direct.js "文本" [风格描述]
 *
 * 正式/实验分层说明见：TTS-TESTS.md
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./cyber-gf-config');
const { buildTtsRequest, normalizeTaggedTtsText } = require('./cyber-gf-tts');

const TTS_CONFIG = getConfig().tts;

const CONFIG = {
  baseUrl: TTS_CONFIG.baseUrl,
  apiKey: TTS_CONFIG.apiKey,
  voice: TTS_CONFIG.voice || '茉莉',
  outputDir: '/root/.openclaw/workspace/tts-output'
};

// 解析命令行参数
const text = process.argv[2] || '（温柔）你好，我是小虾米。';
const style = process.argv[3] || '';

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

function generateTTS(text, style) {
  return new Promise((resolve, reject) => {
    const payload = buildTtsRequest(normalizeTaggedTtsText(text), style);

    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'fufu.iqach.top',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': CONFIG.apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.detail) {
            reject(new Error(`API error: ${JSON.stringify(response.detail)}`));
            return;
          }
          const audioData = response.choices?.[0]?.message?.audio?.data;
          if (!audioData) {
            reject(new Error('No audio data'));
            return;
          }
          const buffer = Buffer.from(audioData, 'base64');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `tts-${timestamp}.mp3`;
          const filepath = path.join(CONFIG.outputDir, filename);
          fs.writeFileSync(filepath, buffer);
          resolve({
            filename: filename,
            filepath: filepath,
            size: buffer.length,
            text: text,
            style: style
          });
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}`));
        }
      });
    });
    req.on('error', err => reject(new Error(`Request error: ${err.message}`)));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🎙️ Xiaomi TTS 一键生成');
  console.log('========================');
  console.log(`文本: ${text}`);
  console.log(`风格: ${style || '(正式链路默认留空)'}`);
  console.log(`音色: ${CONFIG.voice}`);
  console.log('========================');

  try {
    const result = await generateTTS(text, style);
    console.log(`\n✅ 生成成功: ${result.filename}`);
    console.log(`   大小: ${(result.size / 1024).toFixed(1)} KB`);
    console.log(`   路径: ${result.filepath}`);
    console.log(`\n💡 使用 Telegram 发送:`);
    console.log(`   把 ${result.filepath} 作为语音消息发出去`);
  } catch (err) {
    console.error(`\n❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateTTS
};
