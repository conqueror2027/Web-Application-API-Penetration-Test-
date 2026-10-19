-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2026 at 06:28 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `student_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity`
--

CREATE TABLE `activity` (
  `id` int(11) NOT NULL,
  `text` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity`
--

INSERT INTO `activity` (`id`, `text`, `created_at`) VALUES
(1, 'Grade updated for STU002 in Database', '2026-10-09 20:24:55'),
(2, 'New student STU005 added', '2026-10-09 19:34:55'),
(3, 'Profile updated by STU003', '2026-10-09 17:34:55'),
(4, 'Grades exported for Fall 2025', '2026-10-08 19:34:55');

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password_hash`) VALUES
(1, 'admin', 'admin123');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `tag` varchar(30) DEFAULT NULL,
  `date` date NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `tag`, `date`, `title`, `body`) VALUES
(1, 'Exams', '2026-10-12', 'Midterm exam schedule published', 'Midterms begin on October 25. Check the schedule page for your sessions.'),
(2, 'Event', '2026-10-09', 'Cybersecurity CTF Night', 'Join the annual capture-the-flag competition in Lab B2 this Friday at 6 PM.'),
(3, 'Library', '2026-10-05', 'Extended library hours', 'The library will stay open until midnight during exam weeks.'),
(4, 'Admin', '2026-10-01', 'Course registration reminder', 'Spring 2027 registration opens on November 1. Confirm your advisor approval.');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `credits` int(11) NOT NULL DEFAULT 3,
  `instructor` varchar(100) DEFAULT NULL,
  `semester` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`code`, `name`, `credits`, `instructor`, `semester`) VALUES
('CS102', 'Programming', 3, 'Dr. Tarek Aziz', 'Spring 2026'),
('CS201', 'Database', 4, 'Dr. Layla Samir', 'Spring 2026'),
('MATH101', 'Mathematics', 3, 'Dr. Hala Fathy', 'Fall 2025'),
('SEC301', 'Network Security', 4, 'Dr. Karim Nabil', 'Fall 2025'),
('SEC302', 'Web Security', 3, 'Dr. Mona Saeed', 'Fall 2025');

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

CREATE TABLE `grades` (
  `id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `course_code` varchar(20) NOT NULL,
  `grade` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grades`
--

INSERT INTO `grades` (`id`, `student_id`, `course_code`, `grade`) VALUES
(1, 'STU001', 'MATH101', 88),
(2, 'STU001', 'SEC301', 92),
(3, 'STU001', 'SEC302', 85),
(4, 'STU001', 'CS102', 90),
(5, 'STU001', 'CS201', 78),
(6, 'STU002', 'MATH101', 72),
(7, 'STU002', 'SEC301', 65),
(8, 'STU002', 'SEC302', 70),
(9, 'STU002', 'CS102', 81),
(10, 'STU002', 'CS201', 59),
(11, 'STU003', 'MATH101', 95),
(12, 'STU003', 'SEC301', 91),
(13, 'STU003', 'SEC302', 89),
(14, 'STU003', 'CS102', 94),
(15, 'STU003', 'CS201', 92),
(16, 'STU004', 'MATH101', 55),
(17, 'STU004', 'SEC301', 68),
(18, 'STU004', 'SEC302', 62),
(19, 'STU004', 'CS102', 74),
(20, 'STU004', 'CS201', 60),
(21, 'STU005', 'MATH101', 80),
(22, 'STU005', 'SEC301', 77),
(23, 'STU005', 'SEC302', 83),
(24, 'STU005', 'CS102', 69),
(25, 'STU005', 'CS201', 86);

-- --------------------------------------------------------

--
-- Table structure for table `schedule`
--

CREATE TABLE `schedule` (
  `id` int(11) NOT NULL,
  `day` varchar(15) NOT NULL,
  `time` varchar(30) NOT NULL,
  `course` varchar(100) NOT NULL,
  `room` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schedule`
--

INSERT INTO `schedule` (`id`, `day`, `time`, `course`, `room`) VALUES
(1, 'Sunday', '09:00 - 10:30', 'Network Security', 'Lab B2'),
(2, 'Monday', '11:00 - 12:30', 'Web Security', 'Hall A1'),
(3, 'Tuesday', '10:00 - 11:30', 'Database', 'Lab C1'),
(4, 'Wednesday', '13:00 - 14:30', 'Programming', 'Lab A3'),
(5, 'Thursday', '09:00 - 10:30', 'Mathematics', 'Hall B4');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `level` varchar(20) DEFAULT NULL,
  `enrolled` varchar(4) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `name`, `email`, `phone`, `address`, `department`, `level`, `enrolled`, `status`, `password_hash`, `created_at`) VALUES
('STU001', 'Ahmed Hassan', 'ahmed.hassan@uni.edu', '0100 111 2233', '12 Nile St, Cairo', 'Cybersecurity', 'Level 3', '2023', 'Active', '123456', '2026-10-09 20:34:55'),
('STU002', 'Sara Mahmoud', 'sara.mahmoud@uni.edu', '0111 222 3344', '5 Garden Rd, Giza', 'Computer Science', 'Level 2', '2024', 'Active', '123457', '2026-10-09 20:34:55'),
('STU003', 'Omar Khaled', 'omar.khaled@uni.edu', '0122 333 4455', '88 Tahrir Sq, Cairo', 'Cybersecurity', 'Level 4', '2022', 'Active', '123458', '2026-10-09 20:34:55'),
('STU004', 'Nour Ali', 'nour.ali@uni.edu', '0155 444 5566', '3 Park Ave, Alexandria', 'Information Systems', 'Level 1', '2025', 'Inactive', '123459', '2026-10-09 20:34:55'),
('STU005', 'Youssef Adel', 'youssef.adel@uni.edu', '0106 555 6677', '21 Palm Ln, Giza', 'Computer Science', 'Level 3', '2023', 'Active', '123460', '2026-10-09 20:34:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity`
--
ALTER TABLE `activity`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`code`);

--
-- Indexes for table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`,`course_code`),
  ADD KEY `course_code` (`course_code`);

--
-- Indexes for table `schedule`
--
ALTER TABLE `schedule`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `password_hash` (`password_hash`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity`
--
ALTER TABLE `activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `grades`
--
ALTER TABLE `grades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `schedule`
--
ALTER TABLE `schedule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`course_code`) REFERENCES `courses` (`code`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
