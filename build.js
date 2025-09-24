const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const path = require('path');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// 从环境变量获取配置
const owner = process.env.PRIVATE_REPO_OWNER;
const repo = process.env.PRIVATE_REPO_NAME;
const token = process.env.GH_TOKEN;

if (!owner || !repo || !token) {
  throw new Error('Missing required environment variables');
}

const octokit = new Octokit({ auth: token });

async function generateDownloadPage() {
  try {
    // 获取最新release
    const { data: release } = await octokit.rest.repos.getLatestRelease({
      owner,
      repo
    });

    // 获取所有assets
    const assets = release.assets.map(asset => ({
      name: asset.name,
      size: formatBytes(asset.size),
      downloadUrl: asset.browser_download_url,
      createdAt: new Date(asset.created_at).toLocaleDateString()
    }));

    // 读取模板
    const templatePath = path.join(__dirname, 'template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // 生成下载列表HTML
    const downloadsList = assets.map(asset => `
      <div class="download-item">
        <div class="file-name">${asset.name}</div>
        <div class="file-size">${asset.size}</div>
        <div class="file-date">${asset.createdAt}</div>
        <a href="${asset.downloadUrl}" class="download-button">Download</a>
      </div>
    `).join('');

    // 替换模板中的占位符
    html = html
      .replace('{{RELEASE_NAME}}', release.name || release.tag_name)
      .replace('{{RELEASE_DATE}}', new Date(release.published_at).toLocaleDateString())
      .replace('{{RELEASE_NOTES}}', release.body || 'No release notes available')
      .replace('{{DOWNLOADS_LIST}}', downloadsList);

    // 写入dist目录
    const outputPath = path.join(distDir, 'index.html');
    fs.writeFileSync(outputPath, html);

    console.log('✅ Download page generated successfully!');
  } catch (error) {
    console.error('❌ Error generating download page:', error);
    process.exit(1);
  }
}

// 辅助函数：格式化文件大小
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

generateDownloadPage();
