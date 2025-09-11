# 🚀 CRM Performance Optimization Guide

## Common Re-render Issues & Solutions

### 1. Inline Object/Array Creation

#### 🚨 Problem
```typescript
// New array/object created every render
const [data, setData] = useState([]);
const config = { key: value };
```

#### ✅ Solution
```typescript
// Memoize objects/arrays
const data = useMemo(() => sourceData ?? [], [sourceData]);
const config = useMemo(() => ({ key: value }), [value]);
```

### 2. Inline Event Handlers

#### 🚨 Problem
```typescript
<Button onClick={() => handleClick(id)} />
<Input onChange={(e) => setValue(e.target.value)} />
```

#### ✅ Solution
```typescript
const handleItemClick = useCallback((id) => handleClick(id), [handleClick]);
const handleChange = useCallback((e) => setValue(e.target.value), []);

<Button onClick={handleItemClick} />
<Input onChange={handleChange} />
```

### 3. Missing/Excessive Effect Dependencies

#### 🚨 Problem
```typescript
// Missing dependencies
useEffect(() => {
  fetchData();
}, []);

// Too many dependencies
useEffect(() => {
  fetchData();
}, [search, filter, sort, page, limit]); 
```

#### ✅ Solution
```typescript
// Include all required dependencies
const fetchData = useCallback(() => {
  // fetch logic
}, [necessaryDep]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// Debounce rapidly changing values
const debouncedSearch = useDebounce(search, 300);
useEffect(() => {
  fetchData();
}, [debouncedSearch]);
```

### 4. Component Memoization

#### 🚨 Problem
```typescript
// Heavy component re-renders on any parent update
export function HeavyComponent({ data, onAction }) {
  // Expensive calculations
}
```

#### ✅ Solution
```typescript
// Memoize component with necessary props
export const HeavyComponent = React.memo(
  function HeavyComponent({ data, onAction }) {
    // Expensive calculations
  },
  (prevProps, nextProps) => {
    // Optional custom comparison
    return prevProps.data.id === nextProps.data.id;
  }
);
```

### 5. Context Optimization

#### 🚨 Problem
```typescript
// Single context causing full tree re-renders
const AppContext = React.createContext();

function App() {
  const [state, setState] = useState({ 
    theme: 'light',
    user: null,
    settings: {},
    // ... other values
  });

  return (
    <AppContext.Provider value={state}>
      <App />
    </AppContext.Provider>
  );
}
```

#### ✅ Solution
```typescript
// Split context by concern
const ThemeContext = React.createContext();
const UserContext = React.createContext();
const SettingsContext = React.createContext();

function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <SettingsContext.Provider value={settings}>
          <App />
        </SettingsContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
```

## Best Practices

### 1. Use Proper Hook Dependencies

```typescript
// ✅ Good: All dependencies listed
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);

// ✅ Good: Callback with proper deps
const handleSubmit = useCallback(
  (data) => {
    submit(data, userId);
  },
  [userId]
);
```

### 2. Implement Proper Data Fetching Patterns

```typescript
// ✅ Good: Cached data fetching with proper deps
function useData(id) {
  const fetchData = useCallback(async () => {
    const response = await fetch(`/api/data/${id}`);
    return response.json();
  }, [id]);

  const { data, error } = useSWR(
    id ? `/api/data/${id}` : null,
    fetchData
  );

  return { data, error };
}
```

### 3. Optimize Lists and Tables

```typescript
// ✅ Good: Virtualized list for large datasets
import { VirtualizedList } from 'react-virtualized';

function OptimizedList({ items }) {
  const renderRow = useCallback(({ index, style }) => (
    <div style={style}>
      <ListItem item={items[index]} />
    </div>
  ), [items]);

  return (
    <VirtualizedList
      width={800}
      height={600}
      rowCount={items.length}
      rowHeight={50}
      rowRenderer={renderRow}
    />
  );
}
```

### 4. Form Optimization

```typescript
// ✅ Good: Debounced input handling
function SearchInput() {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    search(debouncedValue);
  }, [debouncedValue]);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### 5. Performance Monitoring

```typescript
// ✅ Good: Monitor component render performance
import { Profiler } from 'react';

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  if (actualDuration > 16) {
    console.warn(`Slow render detected in ${id}: ${actualDuration}ms`);
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Component />
    </Profiler>
  );
}
