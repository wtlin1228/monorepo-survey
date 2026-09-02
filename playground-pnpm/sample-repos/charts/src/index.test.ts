import { normalize } from "./index";

test("normalize scales to [0,1]", () => {
  expect(normalize([1, 2, 4])).toEqual([0.25, 0.5, 1]);
});
