const API_DELAY = 800;

export function delay(ms = API_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function simulateRequest(handler, ms = API_DELAY) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(handler());
      } catch (error) {
        reject(error);
      }
    }, ms);
  });
}
