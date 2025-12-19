import express from "express";
import fs from "fs/promises";
import routes from "./src/routes.js";
import { createMiddleware } from "@mswjs/http-middleware";
import { handlers } from "./src/mocks/handlers.js";
import { createServer as createViteServer } from "vite";
import { render } from "./src/main-server.js";
import { runWithContext } from "./src/lib/asyncContext.js";

const app = express();

const prod = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 5173;
const base = process.env.BASE || (prod ? "/front_7th_chapter4-1/vanilla/" : "/");

let vite;
// if (!prod) {
vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
  base,
});
app.use(vite.middlewares);
// } else {
//   // 배포 환경일 때는 정적 파일 서빙
//   app.use(base, express.static("dist"));
// }

app.use(createMiddleware(...handlers));
app.use(express.static("public"));

const styles = fs.readFile("./src/styles.css", "utf-8");

routes.forEach((route) => {
  if (route.path === ".*") {
    return app.get(async (req, res) => {
      const origin = `${req.protocol}://${req.get("host")}`;

      // 요청별로 격리된 컨텍스트 생성
      const context = {
        origin,
        pathname: req.url,
        params: req.params,
        search: req.query,
        initialData: {},
      };

      await runWithContext(context, async () => {
        // globalThis에도 설정 (하위 호환성)
        globalThis.origin = context.origin;
        globalThis.pathname = context.pathname;
        globalThis.params = context.params;
        globalThis.search = context.search;
        globalThis.initialData = context.initialData;

        const html = await render(route.component);

        res.send(
          `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>404 - Page Not Found</title>
      <meta name="description" content="페이지를 찾을 수 없습니다" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        ${await styles}
      </style>
    </head>
    <body>
    <div id="root">${html}</div>
    <script type="module" src="/src/main.js"></script>
    <script>
      window.__INITIAL_DATA__ = ${JSON.stringify(context.initialData)};
    </script>
    </body>
    </html>
      `.trim(),
        );
      });
    });
  }

  app.get(route.path, async (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;

    // 요청별로 격리된 컨텍스트 생성
    const context = {
      origin,
      pathname: req.url,
      params: req.params,
      search: req.query,
      initialData: {},
    };

    await runWithContext(context, async () => {
      // globalThis에도 설정 (하위 호환성)
      globalThis.origin = context.origin;
      globalThis.pathname = context.pathname;
      globalThis.params = context.params;
      globalThis.search = context.search;
      globalThis.initialData = context.initialData;

      const html = await render(route.component);

      // 메타태그 생성
      let metaTags = `<meta property="og:title" content="${route.title}" />`;

      let title = route.title;

      if (context.initialData.meta) {
        const meta = context.initialData.meta;
        title = meta.title;
        metaTags = `
    <meta name="description" content="${meta.description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:image" content="${meta.image}" />`;
      }

      res.send(
        `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>${metaTags}
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      ${await styles}
    </style>
  </head>
  <body>
  <div id="root">${html}</div>
  <script type="module" src="/src/main.js"></script>
  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify(context.initialData)};
  </script>
  </body>
  </html>
    `.trim(),
      );
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
