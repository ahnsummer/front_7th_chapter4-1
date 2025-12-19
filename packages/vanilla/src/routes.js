import { HomePage, NotFoundPage, ProductDetailPage } from "./pages/index.js";

export default [
  {
    title: "쇼핑몰 - 홈",
    path: "/",
    component: HomePage,
  },
  {
    title: "쇼핑몰 - 상품 상세",
    path: "/product/:id/",
    component: ProductDetailPage,
  },
  {
    title: "404",
    path: ".*",
    component: NotFoundPage,
  },
];
