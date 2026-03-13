// Measure component render time
export const measureRender = (componentName) => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  };
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Cache API responses
export const cacheAPI = (fn, ttl = 60000) => {
  const cache = {};
  return async (...args) => {
    const key = JSON.stringify(args);
    if (cache[key] && Date.now() - cache[key].timestamp < ttl) {
      return cache[key].data;
    }
    const data = await fn(...args);
    cache[key] = { data, timestamp: Date.now() };
    return data;
  };
};