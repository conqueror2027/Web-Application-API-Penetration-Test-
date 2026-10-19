<?php
// Database connection + small helpers shared by index.php and setup.php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const DB_HOST = 'localhost';
const DB_USER = 'root';          // XAMPP default
const DB_PASS = '';              // XAMPP default (empty)
const DB_NAME = 'student_system';
const DEBUG   = true;            // set to false when you publish the site

function db(): mysqli {
    static $conn = null;
    if ($conn) return $conn;
    $conn = mysqli_init();
    $conn->options(MYSQLI_OPT_INT_AND_FLOAT_NATIVE, 1); // numbers stay numbers in JSON
    $conn->real_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    $conn->set_charset('utf8mb4');
    return $conn;
}

// Run a prepared statement:  run("SELECT ... WHERE id=?", "s", [$id])
function run(string $sql, string $types = '', array $params = []): mysqli_stmt {
    $st = db()->prepare($sql);
    if ($params) $st->bind_param($types, ...$params);
    $st->execute();
    return $st;
}

// Run a SELECT and return all rows as an array
function rows(string $sql, string $types = '', array $params = []): array {
    return run($sql, $types, $params)->get_result()->fetch_all(MYSQLI_ASSOC);
}
