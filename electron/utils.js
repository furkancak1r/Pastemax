// Imports
const path = require('path');

// ======================
// PATH UTILITIES
// ======================

function isWSLPath(filePath) {
  if (!filePath) return false;
  const normalized = normalizePath(filePath);
  return normalized.startsWith('\\\\wsl.localhost/') || normalized.startsWith('\\\\wsl$/');
}

function normalizePath(filePath) {
  if (!filePath) return filePath;

  if (process.platform === 'win32' && filePath.startsWith('\\\\')) {
    // For paths like \\wsl.localhost\foo or \\network\share\foo
    // This converts them to //wsl.localhost/foo or //network/share/foo
    return '//' + filePath.slice(2).replace(/\\/g, '/');
  }

  return filePath.replace(/\\/g, '/');
}

function ensureAbsolutePath(inputPath) {
  if (!path.isAbsolute(inputPath)) {
    inputPath = path.resolve(inputPath);
  }
  return normalizePath(inputPath);
}

function safeRelativePath(from, to) {
  from = normalizePath(from);
  to = normalizePath(to);

  // For WSL paths, use case-insensitive comparison (like Windows)
  if (isWSLPath(from) || isWSLPath(to)) {
    from = from.toLowerCase();
    to = to.toLowerCase();
  }

  if (process.platform === 'win32') {
    from = from.toLowerCase();
    to = to.toLowerCase();
  }

  let relativePath = path.relative(from, to);
  return normalizePath(relativePath);
}

function safePathJoin(...paths) {
  const joined = path.join(...paths);
  return normalizePath(joined);
}

function isValidPath(pathToCheck) {
  try {
    path.parse(pathToCheck);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  isWSLPath,
  normalizePath,
  ensureAbsolutePath,
  safeRelativePath,
  safePathJoin,
  isValidPath,
};
