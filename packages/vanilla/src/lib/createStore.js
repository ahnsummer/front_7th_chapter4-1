import { createObserver } from "./createObserver.js";
import { updateInitialData } from "./asyncContext.js";

/**
 * Redux-style Store 생성 함수
 * @param {Function} reducer - (state, action) => newState 형태의 reducer 함수
 * @param {*} initialState - 초기 상태
 * @returns {Object} { getState, dispatch, subscribe }
 */
export const createStore = (key, reducer, initialState) => {
  const { subscribe, notify } = createObserver();

  if ("window" in globalThis) {
    initialState = window.__INITIAL_DATA__?.[key] ?? initialState;
  }

  let state = initialState;

  const getState = () => state;

  const dispatch = (action) => {
    const newState = reducer(state, action);

    // 서버 환경에서 컨텍스트에 상태 저장
    if (!("window" in globalThis)) {
      updateInitialData(key, newState);
    }

    if (newState !== state) {
      state = newState;
      notify();
    }
  };

  return { getState, dispatch, subscribe };
};
