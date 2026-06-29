"""
Nagrik — No-Cache Threaded Frontend Server
Serves frontend files with Cache-Control: no-store headers
Uses ThreadingTCPServer so multiple JS module imports load simultaneously.
"""
import http.server
import socketserver
import os

PORT = 5500

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Explicitly map MIME types (Windows registry can be wrong)
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.webp': 'image/webp',
    }

    def end_headers(self):
        # Kill all caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Allow cross-origin for fonts etc
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Clean log output
        print(f"[Frontend] {self.address_string()} {fmt % args}")


class ThreadedServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"[OK] Nagrik frontend running at http://127.0.0.1:{PORT}")
    print(f"   Serving from: {os.getcwd()}")
    print(f"   Cache: DISABLED (no-store headers)")
    with ThreadedServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        httpd.serve_forever()
