<?php
/* ============================================================
   INTENTIONALLY VULNERABLE — training target, localhost only.
   "Upload a profile photo" endpoint.

     POST /student-management-system/api/upload_photo.php
     Content-Type: multipart/form-data
     studentId=STU001
     photo=<file>

   Bug on purpose (content-type validation, not content validation):
   - The code checks $_FILES['photo']['type'], which is just a label the
     BROWSER sends and the attacker fully controls (e.g. with Burp Repeater,
     or `curl -F "photo=@shell.php;type=image/jpeg"`). It never looks at the
     actual file bytes.
   - So: take a PHP shell, name it shell.php, upload it with the form field
     forced to Content-Type: image/jpeg -> the "allow-list" check passes,
     the file is saved with its real .php extension, and it's immediately
     executable at uploads/photos/shell.php.
   - No login check either, and the filename is trusted as-is (path traversal,
     same class of bug as upload.php).

   What a correct version would do instead: check the real file signature
   (e.g. getimagesize() or finfo_file() on the actual bytes), force a safe
   generated filename + extension, and store outside the web root.
   ============================================================ */
require __DIR__ . '/db.php';
header('Content-Type: application/json');

// Remove photo: DELETE /api/upload_photo.php?studentId=STU001
// BUG: no login/ownership check here either — any logged-in (or logged-out, since this
// file never checks a session at all) request can clear any student's photo.
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents('php://input'), $q);
    $studentId = $_GET['studentId'] ?? $q['studentId'] ?? '';
    if ($studentId === '') { http_response_code(400); exit(json_encode(['error' => 'Missing studentId'])); }
    run('UPDATE students SET photo=NULL WHERE id=?', 's', [$studentId]);
    // Note: the file itself is left behind in uploads/photos/ — only the DB reference is cleared.
    exit(json_encode(['success' => true]));
}

if (!isset($_FILES['photo'])) { http_response_code(400); exit(json_encode(['error' => 'No photo sent'])); }

// BUG: allow-list checks the client-supplied MIME label, not the file itself
$allowed = ['image/jpeg', 'image/png', 'image/gif'];
if (!in_array($_FILES['photo']['type'], $allowed, true)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Only JPG, PNG or GIF images are allowed.']));
}

$studentId = $_POST['studentId'] ?? '';
if ($studentId === '') { http_response_code(400); exit(json_encode(['error' => 'Missing studentId'])); }

$dir = __DIR__ . '/../uploads/photos/';
if (!is_dir($dir)) mkdir($dir, 0777, true);

$name = $_FILES['photo']['name'];     // BUG: original filename trusted as-is (extension + path traversal)
$dest = $dir . $name;
move_uploaded_file($_FILES['photo']['tmp_name'], $dest);

$publicPath = 'uploads/photos/' . $name;
run('UPDATE students SET photo=? WHERE id=?', 'ss', [$publicPath, $studentId]);

echo json_encode(['success' => true, 'photo' => $publicPath]);
