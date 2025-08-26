# Code Rules

## Basic Style

- Keep lines under 100 characters
- Use single quotes `'` for strings
- Use backticks `` ` `` for template strings (never join strings with `+`)

```typescript
// ✅ Do this
const message = `Hello ${name}, welcome!`;

// ❌ Not this
const message = 'Hello ' + name + ', welcome!';
```

- Always use `===` and `!==` (never `==` or `!=`)
- Use `const` by default, `let` only when you need to change the value
- Never use `var`
- Prefer single-line objects when they fit under 100 characters

```typescript
// ✅ Short objects on one line
const user = prisma.user.findMany({ where: { active: true } });

// ✅ Long objects need multiple lines
const user = prisma.user.findMany({
 where: {
  active: true,
  name: 'someVeryLongNameThatExceedsTheLineLimit',
 },
});

// ❌ Don't split short objects unnecessarily
const user = prisma.user.findMany({
 where: {
  active: true,
 },
});
```

## Naming

- Variables and functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_CASE`
- Files: `camelCase` (except class files use `PascalCase`)
- Indent with 1 space only

## Functions

- Use arrow functions: `const myFunc = () => {}`
- Use `async/await` instead of `.then()`
- Use `.catch()` instead of try/catch for errors
- Use destructuring: `const { name, age } = user`
- Use `map()` when returning values, `forEach()` for side effects but prefer for..of and for..in
- Keep functions shallow - max 1 level of indentation
- Skip `{}` braces for simple return functions
- Use ternary `?:` for simple checks

```typescript
// ✅ Good - shallow and clear
const processUsers = (users: User[]): ValidUser[] =>
 users.map((user) => validateAndTransformUser(user));

const validateAndTransformUser = (user: User): ValidUser | null =>
 user.isValid ? transformUser(user) : null;

// ❌ Bad - too nested
const processUsers = (users: User[]) => {
 return users.map((user) => {
  if (user.isValid) {
   return { ...user, processed: true };
  }
  return null;
 });
};
```

## If Statements

Only use `{}` braces when:

- Multiple lines
- Single line is too long (over 100 chars)
- Favour early returns

```typescript
// ✅ Short and simple
if (user.isActive) return user.data;

// ✅ Long line needs braces
if (user.isActive) {
 return user.data.someVeryLongPropertyNameThatExceedsTheLineLimit;
}

// ✅ Multiple actions need braces
if (user.isActive) {
 user.lastAccessed = new Date();
 return user.data;
}
```

## Switch Statements

- Always include `default` case
- For simple returns: no `{}`, put return on next line
- For complex cases: use `{` `}` braces
- Always `break` unless returning
- Add empty line after each case

```typescript
const getStatusMessage = (status: string): string => {
 switch (status) {
  case 'active':
   return 'User is active';

  case 'inactive': {
   const message = 'User is inactive';
   logInactiveUser();
   return message;
  }

  case 'pending': {
   notifyAdmin();
   break;
  }

  default:
   return 'Unknown status';
 }
};
```

## Classes

- Use singletons for shared state/caches
- All methods must return values (no side effects)
- Use `static` methods when not using `this`
- Singleton pattern needs `getInstance()` method
- Private methods start with `_`
- All functions must be pure (no side effects anywhere)

```typescript
class CacheManager {
 private static instance: CacheManager;
 private cache = new Map<string, string>();

 private constructor() {}

 static getInstance(): CacheManager {
  if (!CacheManager.instance) CacheManager.instance = new CacheManager();
  return CacheManager.instance;
 }

 get(key: string): string | null {
  return this.cache.get(key) ?? null;
 }
}
```

## Values & Types

- Use `null` for empty (not `undefined`)
- Never use `any` (except in tests)
- Type everything
- Forced typecasts (`as unknown as`) should be avoided if possible
- Import types properly:

```typescript
// ✅ Correct type imports
import type { User } from './types/user.js';
import { type Product, calculatePrice } from './product.js';

// ❌ Wrong
import { User } from './types/user.js';
```

## Files & Imports

- Use ESM modules only
- All imports need `.js` extension
- Use relative paths (`./` or `../`) or aliases (`$api`) if defined, do not define new aliases
- Sort imports with VSCode (Shift-Alt-O)

## Comments

- Use `//` for single lines, `/* */` for multiple lines
- Add JSDoc above functions and classes
- Only comment when code isn't clear enough

## Testing

- Test everything in `__tests__` folder
- Use Jest with ts-jest

## Tools

- Follow ESLint + Airbnb rules
- Use Prettier for formatting
- Keep README.md updated
