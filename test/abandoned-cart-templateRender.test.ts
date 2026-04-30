import test from "node:test"
import assert from "node:assert/strict"
import { renderPlaceholders } from "@/src/server/modules/abandoned-carts/templateRender"

test("renderPlaceholders replaces known placeholders and leaves unknown empty", () => {
  const out = renderPlaceholders("Hi {{name}}, total {{amount}} link {{resume_link}} x={{unknown}}", {
    name: "A",
    amount: "123.45",
    resume_link: "https://example.test/r",
  })
  assert.equal(out, "Hi A, total 123.45 link https://example.test/r x=")
})

