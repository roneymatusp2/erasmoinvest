// Utilitário para reduzir logs repetitivos
let lastLogMessage = '';
let lastLogCount = 0;
const MAX_SAME_LOGS = 3;

export const smartLog = (message: string, ...args: any[]) => {
  if (message === lastLogMessage) {
    lastLogCount++;
    if (lastLogCount <= MAX_SAME_LOGS) {
      console.log(`${message} (${lastLogCount}x)`, ...args);
    }
  } else {
    lastLogMessage = message;
    lastLogCount = 1;
    console.log(message, ...args);
  }
};

export const resetLogCounter = () => {
  lastLogMessage = '';
  lastLogCount = 0;
};
