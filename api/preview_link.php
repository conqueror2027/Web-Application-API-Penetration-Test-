<?php
/* ============================================================
   INTENTIONALLY VULNERABLE — training target, localhost only.
   "Preview a course syllabus link" endpoint — imagine a course admin
   pastes a URL and the dashboard shows a snippet of it.

     GET /student-management-system/api/preview_link.php?url=https://example.com

   Bugs on purpose (classic SSRF):
   - the server fetches ANY url the client supplies, with no allow-list
   - no block on internal/loopback/link-local ranges
     -> try ?url=http://127.0.0.1/student-management-system/api/db.php
     -> try ?url=http://localhost/phpmyadmin/
     -> on cloud hosts this is how people reach http://169.254.169.254/ (metadata endpoints)
   - no login check
   ============================================================ */
header('Content-Type: application/json');
$url = $_GET['url'] ?? '';
if ($url === '') { http_response_code(400); exit(json_encode(['error' => 'Missing url'])); }

$ctx = stream_context_create(['http' => ['timeout' => 5], 'https' => ['timeout' => 5]]);
$body = @file_get_contents($url, false, $ctx); // BUG: server-side request to an attacker-controlled destination

echo json_encode([
    'url'     => $url,
    'ok'      => $body !== false,
    'preview' => $body !== false ? substr($body, 0, 500) : null,
]);
