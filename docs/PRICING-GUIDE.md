# Pricing Calculator Guide

## Overview
This guide explains how the pricing calculator works for shopkeepers who buy in bulk and sell in smaller units.

## Real-World Example
**Scenario**: Buy 3kg rice at ₹200/kg, sell 50g portions at ₹15

### Step-by-Step Calculation

**Step 1: Convert units**
```
50 grams → kg = 50 ÷ 1000 = 0.05 kg
```

**Step 2: Calculate cost**
```
Cost = Cost per kg × Quantity in kg
Cost = 200 × 0.05 = ₹10
```

**Step 3: Calculate profit**
```
Profit = Selling Price - Cost
Profit = 15 - 10 = ₹5
```

**Step 4: Calculate margin percentage**
```
Margin = (Profit ÷ Selling Price) × 100
Margin = (5 ÷ 15) × 100 = 33.33%

What it means: 33.33% of every ₹15 sale is pure profit
```

**Step 5: Calculate markup percentage**
```
Markup = (Profit ÷ Cost) × 100
Markup = (5 ÷ 10) × 100 = 50%

What it means: You're selling at 50% markup above cost
```

---

## Common Scenarios

### Scenario 1: High-value spice
- Buy: 500g saffron at ₹80,000/kg (₹40 per 500g)
- Sell: 1g at ₹2
- Cost: ₹0.04
- Profit: ₹1.96
- Margin: 98%
- Markup: 4800%

### Scenario 2: Flour
- Buy: 50kg flour at ₹20/kg (₹1000 total)
- Sell: 500g at ₹12
- Cost: ₹0.20
- Profit: ₹11.80
- Margin: 98.33%
- Markup: 5900%

### Scenario 3: Oil
- Buy: 20L oil at ₹150/L (₹3000 total)
- Sell: 500ml at ₹85
- Cost: ₹7.50
- Profit: ₹77.50
- Margin: 91.18%
- Markup: 1033%

---

## Understanding Margin vs Markup

| Aspect | Margin | Markup |
|--------|--------|--------|
| **Base** | Selling Price | Cost Price |
| **Formula** | Profit ÷ Selling Price | Profit ÷ Cost |
| **Use** | Shows profit percentage retained | Shows price increase above cost |
| **Example** | If margin is 30%, ₹100 sale = ₹30 profit | If markup is 50%, ₹100 cost = ₹150 sale |
| **Better for shopkeepers** | YES - shows actual profit kept | NO - shows markup but not profit |

### Why Margin is Better for Shopkeepers
- **Margin shows real money kept**: 33% margin on ₹100 sale = you keep ₹33
- **Markup can be misleading**: 200% markup on ₹10 cost = you keep ₹20 out of ₹30 sale (only 67% margin)

---

## Code Usage

### Basic Calculation
```typescript
import { calculatePricingMetrics } from '@/lib/pricing-calculator';

const metrics = calculatePricingMetrics(
  200,      // Cost per kg
  'kg',     // Base unit
  50,       // Quantity selling
  'g',      // Selling unit
  15        // Selling price
);

console.log(metrics);
// Output: { cost: 10, profit: 5, margin: 33.33, markup: 50 }
```

### Calculate Target Price
```typescript
import { calculatePriceForTargetMargin } from '@/lib/pricing-calculator';

// What price to set for 35% margin on ₹10 cost?
const price = calculatePriceForTargetMargin(10, 35);
console.log(price); // ₹15.38

// Formula: Selling Price = Cost / (1 - Margin%)
// = 10 / (1 - 0.35) = 10 / 0.65 = 15.38
```

---

## Unit Conversions Supported

### Weight
- kg ↔ g ↔ mg
- Examples: 1kg = 1000g, 50g = 0.05kg

### Volume
- l ↔ ml ↔ cl
- Examples: 1l = 1000ml, 500ml = 0.5l

### Count
- pcs ↔ dozen
- Examples: 12 pcs = 1 dozen

---

## Common Issues & Fixes

### Issue: Calculation showing negative margin
**Cause**: Selling price is less than cost
**Fix**: Increase selling price or reduce cost (negotiate better wholesale price)

### Issue: Margin showing 0%
**Cause**: Selling price = Cost (break-even)
**Fix**: Add profit margin to selling price

### Issue: Different results from manual calculation
**Cause**: Likely not converting units correctly
**Fix**: Use the calculator - it handles unit conversion automatically

---

## For Developers

The calculator is in `/lib/pricing-calculator.ts` and provides:
- `calculatePricingMetrics()` - Main function for tier calculations
- `calculateMargins()` - Quick margin calculation from known cost
- `calculatePriceForTargetMargin()` - Calculate price for target margin
- `calculatePriceForTargetMarkup()` - Calculate price for target markup

All functions handle edge cases (negative values, division by zero, etc.)
