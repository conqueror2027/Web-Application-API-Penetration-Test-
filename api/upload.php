<?php
/* ============================================================
   INTENTIONALLY VULNERABLE — training target, localhost only.
   "Upload transcript / profile document" endpoint.
   Call it directly (no frontend button needed) with, e.g., Burp:

     POST /student-management-system/api/upload.php
     Content-Type: multipart/form-data
     file=<the file>

   Bugs on purpose:
   - no login check at all
   - no extension / MIME allow-list -> upload a .php file and you have RCE
   - the original filename is trusted as-is -> path traversal
     (try a filename like  ../../index.php  or  ..%2f..%2fshell.php)
   - uploaded files are stored inside the web root and directly requestable
   ============================================================ */
require __DIR__ . '/db.php';
header('Content-Type: application/json');

$dir = __DIR__ . '/../uploads/';
if (!is_dir($dir)) mkdir($dir, 0777, true);

if (!isset($_FILES['file'])) { http_response_code(400); exit(json_encode(['error' => 'No file sent'])); }

$name = $_FILES['file']['name'];              // BUG: client-controlled, used unsanitized
$dest = $dir . $name;                         // BUG: no basename(), no traversal check, no extension check

move_uploaded_file($_FILES['file']['tmp_name'], $dest);

echo json_encode([
    'success'  => true,
    'stored_as'=> $name,
    'url'      => 'uploads/' . $name,          // directly reachable over HTTP -> PHP files execute
]);
