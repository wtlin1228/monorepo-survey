import { isSku, clamp } from "./index";

test("isSku matches the SKU format", () => {
  expect(isSku("ABC-123456")).toBe(true);
  expect(isSku("abc-123")).toBe(false);
});

test("clamp bounds values", () => {
  expect(clamp(15, 0, 10)).toBe(10);
});
