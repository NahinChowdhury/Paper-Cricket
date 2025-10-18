Bug resolved!

Excellent — your debugging info and screenshots clearly show what’s happening.
Let’s walk through this carefully and fix the negative sliceIndex issue.

🧠 Problem Summary

Your code:
```ts
const angle = Math.atan2(dy, dx) - rotation;
const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
const sliceAngle = (2 * Math.PI) / slices.length;
const sliceIndex = Math.floor(normalized / sliceAngle) % slices.length;
```

You said:

The pie rotation is fixed at 6.1899 radians ≈ 354.7°.

Some clicks yield negative indices (-1, -2, -3, -4).

Others work correctly (0–3).

That’s the key: the negative indices are a direct result of how the rotation subtraction interacts with the modulo operation.

⚙️ Why Negative Indices Happen

`Math.atan2(dy, dx)` returns an angle in `[-π, +π]`.

You then subtract rotation, so the raw angle can become negative, e.g. -0.1, -2, etc.

While you try to normalize it with:
```ts
(angle + 2 * Math.PI) % (2 * Math.PI)
```

this only guarantees that the result is between 0 and 2π if angle itself is within -2π..2π.
When you subtract rotation = 6.18, your effective range can go beyond that, and JavaScript % on negative numbers yields negative results (unlike a mathematical modulo).

So after `Math.floor(normalized / sliceAngle)`, **sliceIndex** can be negative.

✅ Fix

Use a proper positive modulo helper to ensure your normalized angle is always within [0, 2π).

Replace your normalization with this:
```ts
const fullCircle = 2 * Math.PI;
const angle = Math.atan2(dy, dx) - rotation;

// Proper modulo normalization
const normalized = ((angle % fullCircle) + fullCircle) % fullCircle;

const sliceAngle = fullCircle / slices.length;
const sliceIndex = Math.floor(normalized / sliceAngle);
```

That extra `((x % fullCircle) + fullCircle) % fullCircle` guarantees no negative result, ever.