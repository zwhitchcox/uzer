import { test, /*describe, before, after, afterEach, beforeEach*/ } from 'tezt'
import { LIB_NAME } from './lib'
import expect from "expect"

test("it works", () => {
  expect(LIB_NAME()).toBe("it works")
})