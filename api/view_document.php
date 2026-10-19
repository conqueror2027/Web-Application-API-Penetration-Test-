<?php
/* ============================================================
   INTENTIONALLY VULNERABLE — training target, localhost only.
   "View an uploaded document" endpoint.

     GET /student-management-system/api/view_document.php?file=sample.txt

   Bugs on purpose:
   - $_GET['file'] is concatenated into the path with no basename()/realpath() check
     -> classic path traversal:  ?file=../../api/db.php
     -> or absolute path on the LFI side:  ?file=../index.php
   - readfile() is used instead of serving through a safe, allow-listed route
   - no login check
   ============================================================ */
$dir = __DIR__ . '/../uploads/';
$file = $_GET['file'] ?? '';
$path = $dir . $file;   // BUG: no sanitization at all

if (!file_exists($path)) { http_response_code(404); exit('Not found'); }

header('Content-Type: text/plain');
readfile($path);        // BUG: will happily read and output any file the web server user can read
