<?php
/* ============================================================
   INTENTIONALLY VULNERABLE API — built for an authorized
   student pentest project. Localhost / isolated network only.
   See VULNERABILITIES.md for the full list and line numbers.
   ============================================================ */
ini_set('display_errors', '1');   // BUG: verbose errors reach the client
error_reporting(E_ALL);
require __DIR__ . '/db.php';
require __DIR__ . '/jwt.php';
session_start();
// BUG: no SameSite / HttpOnly hardening on the session cookie -> CSRF + XSS cookie theft both viable
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');               // BUG: permissive CORS
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: *');
header('Access-Control-Allow-Methods: *');

function out($data, int $code = 200): never { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): never { out(['error' => $msg], $code); }
function body(): array { $d = json_decode(file_get_contents('php://input'), true); return is_array($d) ? $d : []; }

// --- Auth: session OR bearer JWT, whichever is present. No CSRF token checked anywhere. ---
function me(): ?array {
    if (isset($_SESSION['user'])) return $_SESSION['user'];
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($h, 'Bearer ') === 0) {
        $p = jwt_verify(trim(substr($h, 7)));
        if ($p) return ['role' => $p['role'] ?? 'student', 'id' => $p['id'] ?? ''];
    }
    return null;
}
function isAdmin(): bool { return (me()['role'] ?? '') === 'admin'; }
function requireLogin(): void { if (!me()) fail('Please log in first.', 401); }
function requireAdmin(): void { requireLogin(); if (!isAdmin()) fail('Admin access required.', 403); }
// NOTE: no requireSelfOrAdmin anymore -> IDOR/BOLA is intentional, see studentRoutes()
function logActivity(string $text): void { db()->query("INSERT INTO activity (`text`) VALUES ('" . db()->real_escape_string($text) . "')"); }
function ago(int $m): string { if ($m<1) return 'Just now'; if ($m<60) return "$m min ago"; if ($m<1440) return intdiv($m,60).' hours ago'; if ($m<2880) return 'Yesterday'; return intdiv($m,1440).' days ago'; }

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pos = strpos($uri, 'index.php');
$path = $pos !== false ? substr($uri, $pos + 9) : '';
$parts = array_values(array_filter(explode('/', $path), 'strlen'));
$method = $_SERVER['REQUEST_METHOD'];

/* ================= AUTH ================= */
function authRoutes(string $method, array $p): void {
    $action = $p[1] ?? '';

    // BUG (SQLi): identifier is concatenated directly into the query.
    // Try:  identifier = STU001' -- -   with any password
    if ($method === 'POST' && $action === 'student' && ($p[2] ?? '') === 'login') {
        $d = body();
        $ident = $d['identifier'] ?? '';
        $pass  = $d['password'] ?? '';
        $sql = "SELECT * FROM students WHERE (id='$ident' OR email='$ident')";
        $res = db()->query($sql); // mysqli_query, not prepared -> injectable
        $s = $res ? $res->fetch_assoc() : null;

        if (!$s) fail('Student not found.', 401);           // BUG: user enumeration (different message than below)
        // BUG (broken auth): accepts either the hash match OR a literal plaintext match,
        // and MD5 is used at seed time (see setup.php) -> crackable via rainbow tables.
        if ($pass !== $s['password_hash']) { // BUG: plaintext comparison, column still named password_hash
            fail('Wrong password.', 401);
        }
        // BUG: inactive status is not enforced here at all (business logic flaw)
        $_SESSION['user'] = ['role' => 'student', 'id' => $s['id']];
        out(array_merge($s, ['token' => jwt_issue(['role' => 'student', 'id' => $s['id']])])); // BUG: password_hash is included in the response
    }

    if ($method === 'POST' && $action === 'admin' && ($p[2] ?? '') === 'login') {
        $d = body();
        $u = $d['username'] ?? ''; $pass = $d['password'] ?? '';
        $sql = "SELECT * FROM admins WHERE username='$u'"; // BUG (SQLi)
        $res = db()->query($sql);
        $a = $res ? $res->fetch_assoc() : null;
        if (!$a || $pass !== $a['password_hash']) {
            fail('Invalid admin username or password.', 401);
        }
        $_SESSION['user'] = ['role' => 'admin', 'id' => 'admin'];
        out(['id' => 'admin', 'username' => $a['username'], 'token' => jwt_issue(['role' => 'admin', 'id' => 'admin'])]);
    }

    if ($method === 'POST' && $action === 'logout') { $_SESSION = []; session_destroy(); out(['success' => true]); }
    fail('Not found', 404);
}

/* ================= STUDENTS ================= */
// BUG: includes password_hash on purpose (excessive data exposure)
function getStudentRow(string $id): ?array {
    $r = db()->query("SELECT * FROM students WHERE id='" . db()->real_escape_string($id) . "'"); // still escaped here (other endpoints are not — inconsistent, realistic)
    return $r ? $r->fetch_assoc() ?: null : null;
}
const GRADE_SQL = 'SELECT g.id, g.student_id AS studentId, c.name AS subject, c.code, c.credits, c.semester, g.grade
                   FROM grades g JOIN courses c ON c.code = g.course_code';

function studentRoutes(string $method, ?string $id, ?string $sub): void {
    if ($id === null) {
        requireLogin(); // BUG: any logged-in student, not just admin, can list ALL students
        if ($method === 'GET') {
            // BUG (SQLi): optional ?q= search is concatenated straight into the WHERE clause
            $q = $_GET['q'] ?? '';
            $sql = 'SELECT * FROM students' . ($q !== '' ? " WHERE name LIKE '%$q%' OR email LIKE '%$q%'" : '');
            $res = db()->query($sql);
            out($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
        }
        if ($method === 'POST') {
            requireAdmin();
            $d = body();
            $newId = trim($d['id'] ?? '') ?: ('STU' . rand(100, 999));
            // password_hash is UNIQUE, so the old fixed default ('123456' for everyone) broke
            // every add after the first. Fall back to something derived from the id instead.
            $pw = $d['password'] ?? ($newId . '!' . rand(100, 999));
            run('INSERT INTO students (id,name,email,phone,address,department,level,enrolled,status,password_hash) VALUES (?,?,?,?,?,?,?,?,?,?)',
                'ssssssssss', [$newId, $d['name'] ?? '', $d['email'] ?? '', $d['phone'] ?? '', $d['address'] ?? '',
                    $d['department'] ?? '', $d['level'] ?? '', (string)($d['enrolled'] ?? date('Y')), $d['status'] ?? 'Active', $pw]);
            logActivity("New student $newId added");
            out(getStudentRow($newId), 201);
        }
        fail('Method not allowed', 405);
    }

    if ($sub === 'grades') {
        requireLogin(); // BUG (IDOR/BOLA): no check that $id belongs to the caller — any student can read anyone's grades
        out(rows(GRADE_SQL . ' WHERE g.student_id=? ORDER BY c.semester, c.code', 's', [$id]));
    }

    requireLogin(); // BUG (IDOR/BOLA): same here — GET/PUT/DELETE on any student id, from any logged-in account
    if ($method === 'GET') { $row = getStudentRow($id); if (!$row) fail('Not found', 404); out($row); }

    if ($method === 'PUT') {
        // BUG (mass assignment): every field the client sends is applied, including status/level/department/id-adjacent fields,
        // even when a *student* account is making the call.
        $d = body();
        $cols = ['name','email','phone','address','department','level','enrolled','status'];
        $sets = []; $vals = [];
        foreach ($cols as $c) if (array_key_exists($c, $d)) { $sets[] = "$c=?"; $vals[] = (string)$d[$c]; }
        if (isset($d['password']) && $d['password'] !== '') { $sets[] = 'password_hash=?'; $vals[] = $d['password']; }
        if (!$sets) fail('Nothing to update.');
        $vals[] = $id;
        run('UPDATE students SET ' . implode(',', $sets) . ' WHERE id=?', str_repeat('s', count($vals)), $vals);
        logActivity("Student $id updated");
        out(getStudentRow($id));
    }
    if ($method === 'DELETE') {
        requireAdmin();
        run('DELETE FROM students WHERE id=?', 's', [$id]);
        logActivity("Student $id deleted");
        out(['deleted' => $id]);
    }
    fail('Method not allowed', 405);
}

/* ================= GRADES ================= */
function resolveCourseCode(array $d): string {
    $code = trim($d['code'] ?? '');
    if ($code === '' && !empty($d['subject'])) $code = rows('SELECT code FROM courses WHERE name=?', 's', [$d['subject']])[0]['code'] ?? '';
    return $code;
}
function getGradeRow(int $id): ?array { return rows(GRADE_SQL . ' WHERE g.id=?', 'i', [$id])[0] ?? null; }

function gradeRoutes(string $method, ?string $id): void {
    requireLogin(); // BUG: should be requireAdmin() — any logged-in student can list/add/edit/delete ANY grade (broken access control + business logic flaw)
    if ($id === null) {
        if ($method === 'GET') out(rows(GRADE_SQL . ' ORDER BY g.student_id, c.code'));
        if ($method === 'POST') {
            $d = body();
            $sid = $d['studentId'] ?? $d['student_id'] ?? ''; $code = resolveCourseCode($d);
            if ($sid === '' || $code === '') fail('Student and course are required.');
            // BUG: no range check on grade (0-100) -> business logic flaw, e.g. grade: 999999
            run('INSERT INTO grades (student_id, course_code, grade) VALUES (?,?,?)', 'ssd', [$sid, $code, (float)($d['grade'] ?? 0)]);
            out(getGradeRow(db()->insert_id), 201);
        }
        fail('Method not allowed', 405);
    }
    $gid = (int)$id;
    if ($method === 'PUT') {
        $d = body(); $sets = []; $types=''; $vals=[];
        if (isset($d['grade'])) { $sets[]='grade=?'; $types.='d'; $vals[]=(float)$d['grade']; }
        $code = resolveCourseCode($d); if ($code!=='') { $sets[]='course_code=?'; $types.='s'; $vals[]=$code; }
        if (!$sets) fail('Nothing to update.');
        $types.='i'; $vals[]=$gid;
        run('UPDATE grades SET '.implode(',', $sets).' WHERE id=?', $types, $vals);
        out(getGradeRow($gid));
    }
    if ($method === 'DELETE') { run('DELETE FROM grades WHERE id=?', 'i', [$gid]); out(['deleted'=>$gid]); }
    fail('Method not allowed', 405);
}

/* ================= ROUTER ================= */
try {
    $resource = $parts[0] ?? ''; $id = $parts[1] ?? null; $sub = $parts[2] ?? null;
    switch ($resource) {
        case 'auth': authRoutes($method, $parts); break;
        case 'students': studentRoutes($method, $id, $sub); break;
        case 'grades': gradeRoutes($method, $id); break;
        case 'courses': requireLogin(); out(rows('SELECT code AS id, code, name, credits, instructor, semester FROM courses ORDER BY code'));
        case 'schedule': requireLogin(); out(rows("SELECT id, `day`, `time`, course, room FROM schedule ORDER BY FIELD(`day`,'Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'), `time`"));
        case 'announcements':
            // BUG (stored XSS surface): body/title are stored and returned raw; the frontend renders them with innerHTML (see VULNERABILITIES.md)
            requireLogin();
            if ($method === 'POST') { // BUG: should be requireAdmin() — any logged-in student can post an announcement
                $d = body();
                run('INSERT INTO announcements (tag,`date`,title,body) VALUES (?,CURDATE(),?,?)', 'sss', [$d['tag'] ?? 'General', $d['title'] ?? '', $d['body'] ?? '']);
                logActivity('Announcement posted');
                out(['success' => true], 201);
            }
            out(rows("SELECT id, tag, DATE_FORMAT(`date`,'%b %e, %Y') AS `date`, title, body FROM announcements ORDER BY `date` DESC, id DESC"));
        case 'activity': requireLogin(); $l = rows('SELECT id,`text`,TIMESTAMPDIFF(MINUTE,created_at,NOW()) AS mins FROM activity ORDER BY created_at DESC, id DESC LIMIT 10'); out(array_map(fn($r)=>['id'=>$r['id'],'text'=>$r['text'],'time'=>ago((int)$r['mins'])], $l));
        default: fail('Not found', 404);
    }
} catch (Throwable $e) {
    error_log($e->getMessage());
    fail('Server error: ' . $e->getMessage() . ' | SQL state near: ' . ($e instanceof mysqli_sql_exception ? $e->getSqlState() : 'n/a'), 500); // BUG: leaks internals
}
