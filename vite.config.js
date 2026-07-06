import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

const apiPlugin = () => ({
  name: 'api-server',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      
      const urlPath = req.url.split('?')[0];
      let handlerFile = null;
      if (urlPath === '/api/fetch-data') handlerFile = './api/fetch-data.js';
      else if (urlPath === '/api/autosave-c') handlerFile = './api/autosave-c.js';
      else if (urlPath === '/api/autosave-f') handlerFile = './api/autosave-f.js';

      if (!handlerFile) return next();

      try {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        await new Promise(resolve => req.on('end', resolve));

        req.body = body ? JSON.parse(body) : {};

        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        const { default: handler } = await server.ssrLoadModule(handlerFile);
        await handler(req, res);
      } catch (err) {
        console.error('API Middleware Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})