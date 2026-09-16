import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * پلاگین مخصوص تزریق Telegram WebApp SDK به index.html
 * این تضمین می‌کنه که اسکریپت تلگرام همیشه توی dist/index.html باشه
 */
function telegramSdkPlugin(): Plugin {
  const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';

  return {
    name: 'inject-telegram-webapp-sdk',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        // اگه از قبل هست، دوباره اضافه نکن
        if (html.includes('telegram-web-app.js')) {
          console.log('[vite-plugin] Telegram SDK already present in HTML');
          return html;
        }

        // تزریق قبل از </head>
        const tag = `<script src="${SDK_URL}"></script>`;
        const modified = html.replace('</head>', `  ${tag}\n</head>`);

        console.log('[vite-plugin] Telegram SDK injected into HTML');
        return modified;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), telegramSdkPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});