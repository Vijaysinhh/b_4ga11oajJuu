const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(name) {
  const source = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, "..", "lib", `${name}.ts`), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(require, module, module.exports);
  return module.exports;
}

const {
  classifyBatchExpiry,
  combinePaymentSplits,
  creditCollectionSummary,
  dateIsInReportRange,
  getPreviousReportDateRange,
  getReportDateRange,
  reportDayCount,
  saleFinancials,
  saleLineVariance,
} = load("report-calculations");

test("profit is always derived from sales minus cost", () => {
  assert.deepEqual(
    saleFinancials({ subtotal: 100, totalCost: 65, totalProfit: 999 }),
    { revenue: 100, cost: 65, profit: 35 },
  );
});

test("report ranges include only the chosen dates and exclude future sales", () => {
  const range = getReportDateRange("month", "2026-09-24", "", new Date(2026, 8, 24));
  assert.equal(dateIsInReportRange("2026-09-01", range), true);
  assert.equal(dateIsInReportRange("2026-09-24", range), true);
  assert.equal(dateIsInReportRange("2026-09-25", range), false);
  assert.equal(dateIsInReportRange("2026-08-31", range), false);
  assert.equal(reportDayCount(range), 24);
});

test("a selected month uses its real end and compares the same number of previous days", () => {
  const range = getReportDateRange(
    "specificMonth",
    "2026-09-24",
    "2026-08",
    new Date(2026, 8, 24),
  );
  const previous = getPreviousReportDateRange(range);
  assert.equal(dateIsInReportRange("2026-08-31", range), true);
  assert.equal(dateIsInReportRange("2026-09-01", range), false);
  assert.equal(reportDayCount(range), 31);
  assert.equal(reportDayCount(previous), 31);
  assert.equal(dateIsInReportRange("2026-07-01", previous), true);
});

test("future selected months contain no report days", () => {
  const range = getReportDateRange(
    "specificMonth",
    "2026-09-24",
    "2026-10",
    new Date(2026, 8, 24),
  );
  assert.equal(reportDayCount(range), 0);
  assert.equal(dateIsInReportRange("2026-10-01", range), false);
});

test("payment totals count only money received and put partial dues in credit", () => {
  const result = combinePaymentSplits([
    { subtotal: 100, paymentMethod: "cash", paidAmount: 100, dueAmount: 0 },
    { subtotal: 200, paymentMethod: "card", paidAmount: 200, dueAmount: 0 },
    { subtotal: 300, paymentMethod: "partial", paidAmount: 120, dueAmount: 180 },
    { subtotal: 400, paymentMethod: "udhar", paidAmount: 0, dueAmount: 400 },
  ]);
  assert.deepEqual(result, {
    cash: 100,
    online: 200,
    partial: 120,
    credit: 580,
    moneyIn: 420,
  });
  assert.equal(result.cash + result.online + result.partial + result.credit, 1000);
});

test("legacy payment rows receive safe method-based fallbacks", () => {
  const result = combinePaymentSplits([
    { subtotal: 100, paymentMethod: "cash", paidAmount: 0, dueAmount: 0 },
    { subtotal: 200, paymentMethod: "udhari", paidAmount: 0, dueAmount: 0 },
    { subtotal: 300, paymentMethod: "partial", paidAmount: 0, dueAmount: 0 },
  ]);
  assert.equal(result.moneyIn, 100);
  assert.equal(result.credit, 500);
});

test("collection rate includes opening debt and cannot exceed 100 percent", () => {
  const range = getReportDateRange("month", "2026-09-24", "", new Date(2026, 8, 24));
  const summary = creditCollectionSummary(
    [
      { date: "2026-08-10", type: "credit", amount: 500 },
      { date: "2026-08-20", type: "payment", amount: 100 },
      { date: "2026-09-02", type: "credit", amount: 200 },
      { date: "2026-09-10", type: "payment", amount: 700 },
    ],
    range,
  );
  assert.deepEqual(summary, {
    openingBalance: 400,
    creditGiven: 200,
    collected: 700,
    collectable: 600,
    collectionRate: 100,
  });
});

test("expiry classification follows dates, availability, and a 30-day window", () => {
  const now = new Date(2026, 8, 24);
  assert.equal(
    classifyBatchExpiry(
      { expiryDate: "2026-09-20", status: "active", quantityAvailable: 2 },
      now,
    ),
    "expired",
  );
  assert.equal(
    classifyBatchExpiry(
      { expiryDate: "2026-10-10", status: "active", quantityAvailable: 2 },
      now,
    ),
    "expiring",
  );
  assert.equal(
    classifyBatchExpiry(
      { expiryDate: "2026-09-20", status: "expired", quantityAvailable: 0 },
      now,
    ),
    "none",
  );
});

test("incomplete bill item details are detected without replacing bill totals", () => {
  assert.equal(
    saleLineVariance({
      subtotal: 100,
      totalCost: 70,
      items: [{ totalPrice: 40, totalCost: 25, quantity: 1 }],
    }).mismatched,
    true,
  );
  assert.equal(
    saleLineVariance({
      subtotal: 100,
      totalCost: 70,
      items: [{ totalPrice: 100, totalCost: 70, quantity: 1 }],
    }).mismatched,
    false,
  );
  assert.equal(
    saleLineVariance({ subtotal: 100, totalCost: 70, items: [] }).mismatched,
    true,
  );
});
