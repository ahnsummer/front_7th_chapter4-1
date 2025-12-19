## 과제 체크포인트

### 배포 링크

<!--
배포 링크를 적어주세요
예시: https://<username>.github.io/front-7th-chapter4-1/

배포가 완료되지 않으면 과제를 통과할 수 없습니다.
배포 후에 정상 작동하는지 확인해주세요.
-->

### 기본과제 (Vanilla SSR & SSG)

#### Express SSR 서버

- [x] Express 미들웨어 기반 서버 구현
- [x] 개발/프로덕션 환경 분기 처리
- [x] HTML 템플릿 치환 (`<!--app-html-->`, `<!--app-head-->`)

#### 서버 사이드 렌더링

- [x] 서버에서 동작하는 Router 구현
- [x] 서버 데이터 프리페칭 (상품 목록, 상품 상세)
- [x] 서버 상태관리 초기화

#### 클라이언트 Hydration

- [x] `window.__INITIAL_DATA__` 스크립트 주입
- [x] 클라이언트 상태 복원
- [x] 서버-클라이언트 데이터 일치

#### Static Site Generation

- [x] 동적 라우트 SSG (상품 상세 페이지들)
- [x] 빌드 타임 페이지 생성
- [x] 파일 시스템 기반 배포

### 심화과제 (React SSR & SSG)

#### React SSR

- [ ] `renderToString` 서버 렌더링
- [ ] TypeScript SSR 모듈 빌드
- [ ] Universal React Router (서버/클라이언트 분기)
- [ ] React 상태관리 서버 초기화

#### React Hydration

- [ ] Hydration 불일치 방지
- [ ] 클라이언트 상태 복원

#### Static Site Generation

- [ ] 동적 라우트 SSG (상품 상세 페이지들)
- [ ] 빌드 타임 페이지 생성
- [ ] 파일 시스템 기반 배포

## 아하! 모먼트 (A-ha! Moment)

### AsyncLocalStorage를 통한 요청 격리의 중요성

처음에는 서버 렌더링에서 `globalThis`를 사용해 요청 컨텍스트를 저장했습니다. 그러다 동시 요청이 들어올 때 데이터가 섞이는 버그를 발견했고, Node.js의 `AsyncLocalStorage`를 알게 되었습니다. 이를 통해 각 요청이 독립적인 컨텍스트를 가질 수 있다는 것을 깨달았습니다.

```javascript
// packages/vanilla/src/lib/asyncContext.js
await runWithContext(context, async () => {
  const html = await render(route.component);
  // 이 스코프 안에서 getContext()는 항상 올바른 요청의 context를 반환
});
```

### withLifecycle의 서버/클라이언트 분기

라이프사이클을 HOC 패턴으로 추상화하면서, 서버에서는 async 함수를, 클라이언트에서는 동기 함수를 반환해야 한다는 것을 알게 되었습니다. 서버는 데이터 프리페칭을 기다려야 하지만, 클라이언트는 즉시 렌더링 후 비동기로 업데이트하는 것이 UX에 더 좋기 때문입니다.

## 자유롭게 회고하기

### 구현하면서 집중한 부분들

#### 1. 요청별 컨텍스트 격리

서버 사이드 렌더링의 핵심은 동시 요청 처리입니다. 각 요청이 독립적인 상태를 유지해야 하므로 `AsyncLocalStorage`를 활용했습니다.

```javascript
// packages/vanilla/src/lib/asyncContext.js
export const runWithContext = async (context, callback) => {
  await initAsyncLocalStorage();
  return asyncLocalStorage.run(context, callback);
};
```

#### 2. 라이프사이클 관리

기존 클라이언트 전용 라이프사이클을 서버에서도 동작하도록 확장했습니다. `withLifecycle` HOC를 통해:

- 서버: `onMount`를 실행하고 데이터를 `initialData`에 저장
- 클라이언트: `window.__INITIAL_DATA__`에서 초기 데이터 복원 후 필요시 재요청

#### 3. 메타태그 동적 생성

상품 상세 페이지의 경우, SEO를 위해 동적 메타태그가 필수입니다. `updateInitialData`를 통해 렌더링 중에 메타 정보를 수집하고, 서버에서 HTML에 주입하는 방식을 구현했습니다.

```javascript
// packages/vanilla/src/pages/ProductDetailPage.js
updateInitialData("meta", {
  title: `${product.title} - 쇼핑몰`,
  description: `${product.title} - ${product.brand || "쇼핑몰"}`,
  image: product.image,
});
```

#### 4. Universal Code

가능한 한 많은 코드를 서버/클라이언트에서 공유하도록 설계했습니다:

- `Router`: 동일한 라우팅 로직
- `withLifecycle`: 환경에 따라 다른 동작이지만 동일한 인터페이스
- `createStorage`: 서버에서는 no-op, 클라이언트에서는 localStorage 사용

#### 5. Static Site Generation (SSG)

**SSR 인프라 100% 재사용**: 기존 `render()`, `runWithContext()`, `withLifecycle` 등 모든 SSR 로직을 그대로 사용했습니다. 별도의 SSG 전용 코드를 작성하지 않고, 빌드 타임에 SSR을 실행하는 방식으로 구현했습니다.

**Global fetch 폴리필**: MSW는 실제 네트워크 요청을 보내려고 해서 샌드박스 환경에서 실패했습니다. 대신 `globalThis.fetch`를 직접 폴리필해서 `items.json` 데이터를 반환하도록 구현했습니다.

```javascript
// packages/vanilla/static-site-generate.js
globalThis.fetch = async (url) => {
  const urlObj = new URL(url, "http://localhost");
  // /api/products, /api/products/:id, /api/categories 모두 처리
  return { ok: true, json: async () => mockData };
};
```

**340개 페이지 자동 생성**: `items.json`에서 상품 ID를 추출해 각 상품마다 `/product/:id/index.html` 생성. 홈페이지와 404 페이지까지 총 342개의 정적 HTML 파일이 생성됩니다.

**SEO 최적화 완료**: 각 상품 페이지는 동적 메타태그가 포함되어 있고, 완전히 렌더링된 HTML을 제공하므로 검색 엔진 크롤러가 내용을 바로 인덱싱할 수 있습니다.

### 아쉬운 부분들

#### 1. Store의 서버 격리 미흡

`productStore`, `cartStore` 등은 싱글톤으로 동작합니다. 서버 환경에서는 각 요청마다 독립적인 store 인스턴스가 필요할 수 있는데, 현재는 `initialData`를 통해 클라이언트에 전달하는 방식으로만 해결했습니다. 동시 요청이 많아지면 race condition 가능성이 있습니다.

#### 2. 에러 바운더리 부재

서버 렌더링 중 에러 발생 시 적절한 fallback이 없습니다. 현재는 try-catch로 잡힌 에러만 처리하고 있어, 예상치 못한 에러가 발생하면 서버가 크래시할 수 있습니다.

#### 3. 성능 최적화 여지

- HTML 템플릿이 매 요청마다 문자열로 생성됨 (캐싱 가능)
- CSS 파일을 매번 읽음 (메모리 캐싱 필요)
- 중복되는 HTML 템플릿 코드 (404와 일반 페이지)

### 기술적 도전과 해결

#### 1. AsyncLocalStorage 동작 원리 이해하기

**문제 상황:**
초기에는 각 요청의 컨텍스트를 `globalThis`에 저장했는데, 동시에 2개의 요청이 들어오면 나중 요청이 먼저 요청의 데이터를 덮어쓰는 문제가 발생했습니다.

```javascript
// 잘못된 접근 (초기 버전)
app.get("/product/:id", async (req, res) => {
  globalThis.pathname = req.url;
  globalThis.params = req.params;
  const html = await render(); // 비동기 중에 다른 요청이 globalThis를 덮어쓸 수 있음
});
```

**해결 방법:**
`AsyncLocalStorage`는 비동기 콜백 체인 전체에서 격리된 스토리지를 제공합니다. `async_hooks` 모듈의 실행 컨텍스트 추적을 활용해, 같은 요청에서 파생된 모든 비동기 작업이 동일한 컨텍스트를 공유하도록 했습니다.

```javascript
// packages/vanilla/src/lib/asyncContext.js
const { AsyncLocalStorage } = await import("node:async_hooks");
const asyncLocalStorage = new AsyncLocalStorage();

// 각 요청마다 독립적인 컨텍스트 실행
export const runWithContext = async (context, callback) => {
  return asyncLocalStorage.run(context, callback);
};

// 어디서든 현재 요청의 컨텍스트 접근 가능
export const getContext = () => {
  return asyncLocalStorage?.getStore();
};
```

**핵심 포인트:**

- `asyncLocalStorage.run()`으로 시작된 비동기 체인 내부의 모든 함수는 같은 store에 접근
- `await`, `Promise`, `setTimeout` 등을 거쳐도 컨텍스트가 유지됨
- 다른 요청의 실행 컨텍스트와 완전히 격리됨

#### 2. Universal Router - 하나의 코드, 두 가지 환경

**도전 과제:**
클라이언트의 `window.location`과 서버의 `req` 객체는 완전히 다른 API입니다. 하지만 라우팅 로직은 동일해야 합니다.

**구현 전략:**
환경 감지 레이어를 통해 통일된 인터페이스를 제공했습니다.

```javascript
// packages/vanilla/src/lib/Router.js
function getOrigin() {
  if ("window" in globalThis) {
    return window.location.origin;
  } else {
    const context = getContext(); // AsyncLocalStorage에서 가져옴
    return context.origin;
  }
}

function getPathname() {
  if ("window" in globalThis) {
    return window.location.pathname;
  } else {
    const context = getContext();
    return String(context.pathname);
  }
}
```

이렇게 하면 Router 클래스의 다른 메서드들은 환경에 상관없이 `getPathname()`, `getOrigin()`만 호출하면 됩니다.

**쿼리 파라미터 통합:**
Express는 `req.query`로 객체를 주지만, 클라이언트는 `location.search`로 문자열을 줍니다. `URLSearchParams`로 통일했습니다.

```javascript
// packages/vanilla/src/lib/Router.js
get query() {
  return Router.parseQuery(getSearch());
}

static parseQuery = (search) => {
  const params = new URLSearchParams(search);
  const query = {};
  for (const [key, value] of params) {
    query[key] = value;
  }
  return query;
};
```

서버에서는 `context.search` 객체를 받아서 다시 쿼리 문자열로 변환해 `URLSearchParams`에 넣으므로, 파싱 로직이 완전히 동일하게 동작합니다.

#### 3. withLifecycle의 서버/클라이언트 이중 동작

**설계 결정:**
`withLifecycle`은 동일한 HOC지만, 반환하는 함수의 동작 방식이 환경에 따라 달라야 합니다.

```javascript
// packages/vanilla/src/router/withLifecycle.js
export const withLifecycle = ({ onMount, onUnmount, watches } = {}, page) => {
  const lifecycle = getPageLifecycle(page);

  // 라이프사이클 설정
  if (typeof onMount === "function") lifecycle.mount = onMount;
  if (typeof onUnmount === "function") lifecycle.unmount = onUnmount;
  if (Array.isArray(watches)) lifecycle.watches = watches;

  // 서버 환경: async 함수 반환
  if (isServer) {
    return async (...args) => {
      await mount(page); // 데이터 페칭 완료 대기
      return page(...args); // 렌더링
    };
  }

  // 클라이언트 환경: 동기 함수 반환
  return (...args) => {
    const wasNewPage = pageState.current !== page;

    if (pageState.current && wasNewPage) {
      unmount(pageState.current); // 이전 페이지 정리
    }

    pageState.current = page;

    if (wasNewPage) {
      mount(page); // 비동기지만 await 안 함 (UX를 위해 즉시 렌더링)
    } else {
      // 같은 페이지 재렌더링 시 watches 체크
      lifecycle.watches?.forEach(([getDeps, callback], index) => {
        const newDeps = getDeps();
        if (depsChanged(newDeps, lifecycle.deps[index])) {
          callback();
        }
        lifecycle.deps[index] = Array.isArray(newDeps) ? [...newDeps] : [];
      });
    }

    return page(...args);
  };
};
```

**왜 이렇게 분기했나:**

- **서버**: SEO와 초기 로딩을 위해 완전히 렌더링된 HTML이 필요 → `await`로 데이터 로딩 완료를 기다림
- **클라이언트**: 빠른 화면 전환을 위해 즉시 렌더링하고 데이터는 백그라운드에서 로드 → `await` 없이 비동기 실행

#### 4. initialData를 통한 Hydration

**Hydration 불일치 방지:**
서버에서 렌더링한 HTML과 클라이언트의 첫 렌더링이 다르면 React Hydration Error와 비슷한 문제가 발생합니다.

**해결 방법:**

```javascript
// packages/vanilla/server.js
await runWithContext(context, async () => {
  const html = await render(route.component);

  // 서버 렌더링 중 수집된 데이터를 스크립트로 주입
  res.send(`
    <div id="root">${html}</div>
    <script>
      window.__INITIAL_DATA__ = ${JSON.stringify(context.initialData)};
    </script>
  `);
});
```

클라이언트는 페이지 로드 시 `window.__INITIAL_DATA__`가 있으면 API 재호출을 건너뜁니다:

```javascript
// packages/vanilla/src/services/productService.js
export const loadProductsAndCategories = async () => {
  if ("window" in globalThis && productStore.getState().status === "done") {
    return productStore.getState(); // 이미 서버에서 로드됨
  }

  // API 호출...
};
```

**메타태그 동적 생성도 동일한 패턴:**

```javascript
// packages/vanilla/src/pages/ProductDetailPage.js
updateInitialData("meta", {
  title: `${product.title} - 쇼핑몰`,
  description: product.description,
  image: product.image,
});
```

렌더링 중에 `initialData.meta`를 설정하면, 서버가 이를 읽어서 HTML `<head>`에 주입합니다.

#### 5. createStorage의 환경별 no-op 처리

**문제:**
`localStorage`는 브라우저에만 존재하므로, 서버에서 실행하면 에러가 발생합니다.

**해결:**

```javascript
// packages/vanilla/src/lib/createStorage.js
export const createStorage = (key, storage) => {
  if (!("window" in globalThis)) {
    // 서버 환경: no-op 반환
    return {
      get: () => null,
      set: () => {},
      reset: () => {},
    };
  }

  storage = storage ?? window.localStorage;
  // 실제 로직...
};
```

이렇게 하면 `cartStorage.get()` 같은 코드를 서버/클라이언트 양쪽에서 안전하게 호출할 수 있습니다.

#### 6. SSG - Global fetch 폴리필로 네트워크 격리

**문제:**
MSW의 `setupServer`를 사용하려 했으나, 실제 네트워크 요청을 시도해서 샌드박스 환경에서 `EPERM` 에러가 발생했습니다.

**해결:**
빌드 타임에는 네트워크가 필요 없습니다. `globalThis.fetch`를 직접 폴리필해서 `items.json` 데이터를 반환하도록 구현했습니다.

```javascript
// packages/vanilla/static-site-generate.js
globalThis.fetch = async (url) => {
  const urlObj = new URL(url, "http://localhost");
  const pathname = urlObj.pathname;

  // /api/products
  if (pathname === "/api/products") {
    const filtered = filterAndSortProducts(query);
    return { ok: true, json: async () => ({ products: filtered, ... }) };
  }

  // /api/products/:id
  const productMatch = pathname.match(/^\/api\/products\/(.+)$/);
  if (productMatch) {
    const product = items.find(item => item.productId === productMatch[1]);
    return { ok: true, json: async () => product };
  }
};
```

**왜 이 방법이 좋은가:**

- MSW 같은 무거운 라이브러리 없이 순수 JavaScript로 해결
- 네트워크 요청이 전혀 발생하지 않아 빌드 속도가 빠름
- `items.json` 데이터를 직접 사용하므로 SSR handlers와 로직이 완전히 일치
- 샌드박스 환경에서도 문제없이 동작

**SSG와 SSR 코드 100% 재사용:**

```javascript
// 동일한 render 함수 사용
import { render } from "./src/main-server.js";
import { runWithContext } from "./src/lib/asyncContext.js";

// SSR과 똑같은 방식으로 페이지 렌더링
await runWithContext(context, async () => {
  const html = await render(route.component);
});
```

SSG는 본질적으로 "빌드 타임에 실행하는 SSR"입니다. 기존 SSR 인프라를 전혀 수정하지 않고, fetch만 폴리필해서 340개 페이지를 자동 생성했습니다.

### 배운 점

- **AsyncLocalStorage의 강력함**: 동시 요청을 격리하는 Node.js의 핵심 메커니즘. 이게 없으면 모든 상태를 요청 객체에 직접 전달해야 함
- **Universal Code의 핵심은 추상화**: `window` 체크만으로 대부분의 환경 차이를 흡수할 수 있음
- **서버는 동기적, 클라이언트는 비동기적**: 같은 기능도 UX와 SEO 요구사항에 따라 다른 실행 전략이 필요
- **Hydration은 데이터 동기화**: 서버 렌더링 시점의 데이터를 클라이언트에 전달하는 게 핵심
- **SSG = 빌드 타임 SSR**: SSG를 위해 새로운 코드를 작성할 필요 없음. SSR 로직을 빌드 타임에 실행하고 결과를 파일로 저장하면 됨
- **프레임워크의 가치 재발견**: Next.js가 이 모든 것을 자동으로 처리해준다는 사실에 감사. 특히 `getStaticPaths`와 `getStaticProps`의 편리함을 실감

## 리뷰 받고 싶은 내용

### 1. AsyncLocalStorage와 Store의 관계

현재 `AsyncLocalStorage`로 요청 컨텍스트(`origin`, `pathname`, `params`, `initialData`)는 격리했지만, `productStore` 자체는 여전히 전역 싱글톤입니다.

```javascript
// packages/vanilla/src/stores/productStore.js
export const productStore = createStore(initialProductState, productReducer);
```

서버 렌더링 중에 `productStore.dispatch()`를 호출하는데, 동시에 두 요청이 다른 상품을 조회하면 store 상태가 섞일 수 있습니다.

**질문:**

- `productStore`도 `AsyncLocalStorage`에 넣어서 각 요청마다 독립적인 인스턴스를 만들어야 할까요?
- 아니면 서버에서는 store를 사용하지 않고, `initialData`에 직접 데이터를 담는 방식으로 리팩토링해야 할까요?
- Redux의 SSR 방식처럼 각 요청마다 `createStore()`를 새로 호출하는 게 정답일까요?

현재는 다행히 렌더링이 빠르게 끝나서 실질적인 충돌이 없지만, 부하 테스트를 하면 문제가 발생할 것 같습니다.

### 2. Router의 params 접근 방식

Router에서 `params`를 가져올 때 두 가지 방법을 혼용하고 있습니다:

```javascript
// packages/vanilla/src/lib/Router.js
get params() {
  if (this.#route?.params) {
    return this.#route.params; // 클라이언트: 라우트 매칭 결과에서
  }
  if ("window" in globalThis) {
    return {};
  }
  const context = getContext(); // 서버: AsyncLocalStorage에서
  return context.params ?? {};
}
```

**문제점:**
서버에서는 Express의 `req.params`를 컨텍스트에 저장했지만, 클라이언트에서는 자체 정규식 매칭으로 추출합니다. 두 방식의 결과가 항상 일치한다고 보장할 수 있을까요?

특히 인코딩 문제(`/product/한글` 같은 URL)나 특수문자가 있을 때 차이가 생길 수 있을 것 같습니다. 서버에서도 Express Router가 아닌 자체 정규식으로 통일해야 할까요?

### 3. initialData의 Hydration 타이밍

현재 `window.__INITIAL_DATA__`를 확인하는 로직이 각 서비스에 흩어져 있습니다:

```javascript
// packages/vanilla/src/services/productService.js
if ("window" in globalThis && productStore.getState().status === "done") {
  return productStore.getState();
}
```

**질문:**

- `main.js`에서 앱 시작 시 `window.__INITIAL_DATA__`를 읽어서 모든 store를 한 번에 초기화하는 게 더 깔끔하지 않을까요?
- 현재 방식은 각 페이지가 마운트될 때마다 `status === "done"` 체크를 하는데, 이게 정말 안전할까요?
- `window.__INITIAL_DATA__`를 사용한 후에는 삭제해서 메모리를 해제하는 게 좋을까요?
