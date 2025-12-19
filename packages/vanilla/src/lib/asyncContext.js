// 서버 환경인지 체크
const isServer = typeof window === "undefined";

// AsyncLocalStorage 인스턴스 (서버에서만 사용)
let asyncLocalStorage = null;

/**
 * AsyncLocalStorage 초기화 (서버에서만)
 */
const initAsyncLocalStorage = async () => {
  if (!isServer || asyncLocalStorage) return;

  try {
    const { AsyncLocalStorage } = await import("node:async_hooks");
    asyncLocalStorage = new AsyncLocalStorage();
  } catch (e) {
    console.warn("AsyncLocalStorage 초기화 실패:", e);
  }
};

/**
 * 현재 요청의 컨텍스트 가져오기
 */
export const getContext = () => {
  if (!isServer) {
    return {
      origin: window.location.origin,
      pathname: window.location.pathname,
      params: {},
      search: {},
      initialData: {},
    };
  }

  const store = asyncLocalStorage?.getStore();
  if (!store) {
    // fallback to globalThis for compatibility
    return {
      origin: globalThis.origin || "",
      pathname: globalThis.pathname || "",
      params: globalThis.params || {},
      search: globalThis.search || {},
      initialData: globalThis.initialData || {},
    };
  }

  return store;
};

/**
 * 새로운 요청 컨텍스트 생성 및 실행
 */
export const runWithContext = async (context, callback) => {
  if (!isServer) {
    return callback();
  }

  // AsyncLocalStorage 초기화 (아직 안 됐으면)
  await initAsyncLocalStorage();

  if (!asyncLocalStorage) {
    // AsyncLocalStorage를 사용할 수 없으면 globalThis 사용
    return callback();
  }

  return asyncLocalStorage.run(context, callback);
};

/**
 * 현재 컨텍스트의 initialData 업데이트
 */
export const updateInitialData = (key, value) => {
  const context = getContext();
  if (context.initialData) {
    context.initialData[key] = value;
  }
};
