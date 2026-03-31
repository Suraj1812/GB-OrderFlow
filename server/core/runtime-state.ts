let shuttingDown = false;

export function markShuttingDown() {
  shuttingDown = true;
}

export function resetRuntimeState() {
  shuttingDown = false;
}

export function isReady() {
  return !shuttingDown;
}
