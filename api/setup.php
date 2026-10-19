<?php
// Run ONCE in the browser:  .../api/setup.php?confirm=yes
// WARNING: it drops and recreates all tables, then inserts the sample data.
require __DIR__ . '/db.php';
header('Content-Type: text/plain; charset=utf-8');

if (($_GET['confirm'] ?? '') !== 'yes') {
    exit("This will DELETE and recreate all tables in '" . DB_NAME . "'.\nAdd ?confirm=yes to the URL to continue.");
}

// BUG (weak crypto, Week 3 "broken authentication"): MD5 is fast and unsalted, so these
// hashes fall to an offline rainbow-table/brute-force attack in seconds.
@mkdir(__DIR__ . '/../uploads', 0777, true);

$c = db();
$c->query('SET FOREIGN_KEY_CHECKS=0');
foreach (['activity','announcements','schedule','grades','courses','students','admins','users','departments','enrollments'] as $t) {
    $c->query("DROP TABLE IF EXISTS `$t`");
}
$c->query('SET FOREIGN_KEY_CHECKS=1');

$c->query("CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
)");

$c->query("CREATE TABLE students (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(30),
  address VARCHAR(255),
  department VARCHAR(100),
  level VARCHAR(20),
  enrolled VARCHAR(4),
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  photo VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$c->query("CREATE TABLE courses (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INT NOT NULL DEFAULT 3,
  instructor VARCHAR(100),
  semester VARCHAR(30)
)");

$c->query("CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  grade DOUBLE NOT NULL,
  UNIQUE (student_id, course_code),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (course_code) REFERENCES courses(code) ON DELETE CASCADE ON UPDATE CASCADE
)");

$c->query("CREATE TABLE schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `day` VARCHAR(15) NOT NULL,
  `time` VARCHAR(30) NOT NULL,
  course VARCHAR(100) NOT NULL,
  room VARCHAR(50)
)");

$c->query("CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag VARCHAR(30),
  `date` DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT
)");

$c->query("CREATE TABLE activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `text` VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

// ---------- seed data (same as your old data.js) ----------
// BUG (plaintext credential storage): passwords are saved as-is, no hashing at all.
// Anyone with DB read access (or an SQL injection, see bug #1/#2) reads every password directly.
run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', 'ss', ['admin', 'admin123']);

// password_hash is UNIQUE now, so each student needs a distinct (still simple) password.
$students = [
  ['STU001','Ahmed Hassan','ahmed.hassan@uni.edu','0100 111 2233','12 Nile St, Cairo','Cybersecurity','Level 3','2023','Active','123456'],
  ['STU002','Sara Mahmoud','sara.mahmoud@uni.edu','0111 222 3344','5 Garden Rd, Giza','Computer Science','Level 2','2024','Active','123457'],
  ['STU003','Omar Khaled','omar.khaled@uni.edu','0122 333 4455','88 Tahrir Sq, Cairo','Cybersecurity','Level 4','2022','Active','123458'],
  ['STU004','Nour Ali','nour.ali@uni.edu','0155 444 5566','3 Park Ave, Alexandria','Information Systems','Level 1','2025','Inactive','123459'],
  ['STU005','Youssef Adel','youssef.adel@uni.edu','0106 555 6677','21 Palm Ln, Giza','Computer Science','Level 3','2023','Active','123460'],
];
foreach ($students as $s) {
    run('INSERT INTO students (id,name,email,phone,address,department,level,enrolled,status,password_hash) VALUES (?,?,?,?,?,?,?,?,?,?)',
        'ssssssssss', $s);
}

$courses = [
  ['MATH101','Mathematics',3,'Dr. Hala Fathy','Fall 2025'],
  ['SEC301','Network Security',4,'Dr. Karim Nabil','Fall 2025'],
  ['SEC302','Web Security',3,'Dr. Mona Saeed','Fall 2025'],
  ['CS102','Programming',3,'Dr. Tarek Aziz','Spring 2026'],
  ['CS201','Database',4,'Dr. Layla Samir','Spring 2026'],
];
foreach ($courses as $co) {
    run('INSERT INTO courses (code,name,credits,instructor,semester) VALUES (?,?,?,?,?)', 'ssiss', $co);
}

$scores = [
  'STU001' => [88, 92, 85, 90, 78],
  'STU002' => [72, 65, 70, 81, 59],
  'STU003' => [95, 91, 89, 94, 92],
  'STU004' => [55, 68, 62, 74, 60],
  'STU005' => [80, 77, 83, 69, 86],
];
foreach ($scores as $sid => $list) {
    foreach ($list as $i => $g) {
        run('INSERT INTO grades (student_id, course_code, grade) VALUES (?,?,?)', 'ssd', [$sid, $courses[$i][0], $g]);
    }
}

$schedule = [
  ['Sunday','09:00 - 10:30','Network Security','Lab B2'],
  ['Monday','11:00 - 12:30','Web Security','Hall A1'],
  ['Tuesday','10:00 - 11:30','Database','Lab C1'],
  ['Wednesday','13:00 - 14:30','Programming','Lab A3'],
  ['Thursday','09:00 - 10:30','Mathematics','Hall B4'],
];
foreach ($schedule as $r) {
    run('INSERT INTO schedule (`day`,`time`,course,room) VALUES (?,?,?,?)', 'ssss', $r);
}

$ann = [
  ['Exams','2026-10-12','Midterm exam schedule published','Midterms begin on October 25. Check the schedule page for your sessions.'],
  ['Event','2026-10-09','Cybersecurity CTF Night','Join the annual capture-the-flag competition in Lab B2 this Friday at 6 PM.'],
  ['Library','2026-10-05','Extended library hours','The library will stay open until midnight during exam weeks.'],
  ['Admin','2026-10-01','Course registration reminder','Spring 2027 registration opens on November 1. Confirm your advisor approval.'],
];
foreach ($ann as $a) {
    run('INSERT INTO announcements (tag,`date`,title,body) VALUES (?,?,?,?)', 'ssss', $a);
}

$act = [
  ['Grade updated for STU002 in Database', 10],
  ['New student STU005 added', 60],
  ['Profile updated by STU003', 180],
  ['Grades exported for Fall 2025', 1500],
];
foreach ($act as $a) {
    run('INSERT INTO activity (`text`, created_at) VALUES (?, NOW() - INTERVAL ? MINUTE)', 'si', $a);
}

echo "Done! Tables created and sample data inserted.\n\n";
echo "Admin login:   admin / admin123\n";
echo "Student login: STU001 (or ahmed.hassan@uni.edu) / 123456\n\n";
echo "You can now delete api/setup.php.";
