/**
 * Minimal `path` shim for browser/extension context.
 * kuromoji only calls path.join(dic_path, filename) to build URLs.
 * Standard path-browserify breaks chrome-extension:// URLs (collapses //),
 * so we handle the URL case separately.
 */
export function join() {
  var parts = Array.prototype.slice.call(arguments);
  var base = parts[0] || '';

  // URL path (e.g. chrome-extension://, https://) — use simple concatenation
  if (base.indexOf('://') !== -1) {
    var root = base.endsWith('/') ? base : base + '/';
    return root + parts.slice(1).join('/');
  }

  // Regular POSIX-style path
  return parts.join('/').replace(/\/\/+/g, '/');
}

// Default export so CJS require("path").join works via esbuild interop
export default { join };
