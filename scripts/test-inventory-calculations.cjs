const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, "..", "lib", "inventory-calculations.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
const inventory = { exports: {} };
new Function("require", "module", "exports", source)(require, inventory, inventory.exports);

const { EXPIRY_WARNING_DAYS, calculateGrossMargin, calculateStockChange, roundStockQuantity, stockMovementType } = inventory.exports;

test("expiry attention window is seven days", () => {
  assert.equal(EXPIRY_WARNING_DAYS, 7);
});

test("gross margin consistently uses selling price", () => {
  assert.deepEqual(calculateGrossMargin(80, 100), {
    marginAmount: 20,
    marginPercent: 20,
  });
});

test("stock quantities preserve up to three decimal places", () => {
  assert.equal(roundStockQuantity(1.23456), 1.235);
  assert.deepEqual(calculateStockChange(2.5, "receive", 0.25), {
    change: 0.25,
    resultingQuantity: 2.75,
  });
});

test("correction uses the entered quantity as the new total", () => {
  assert.deepEqual(calculateStockChange(7, "correction", 4.5), {
    change: -2.5,
    resultingQuantity: 4.5,
  });
});

test("stock cannot become negative", () => {
  assert.throws(
    () => calculateStockChange(2, "damage", 3),
    /cannot remove more stock/i,
  );
});

test("movement reasons map to database history types", () => {
  assert.equal(stockMovementType("receive"), "purchase");
  assert.equal(stockMovementType("return"), "adjustment");
  assert.equal(stockMovementType("damage"), "damage");
  assert.equal(stockMovementType("expired"), "expiry");
});
