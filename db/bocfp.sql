-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 03, 2023 at 11:32 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.0.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bocfp`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `annou_id` int(11) NOT NULL,
  `title` varchar(96) NOT NULL,
  `content` varchar(512) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `soft_delete` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child`
--

CREATE TABLE `child` (
  `id` int(11) NOT NULL,
  `fname` varchar(48) NOT NULL,
  `lname` varchar(48) NOT NULL,
  `bdate` varchar(10) NOT NULL,
  `sex` varchar(6) NOT NULL,
  `soft_delete` tinyint(1) NOT NULL,
  `image` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `child`
--

INSERT INTO `child` (`id`, `fname`, `lname`, `bdate`, `sex`, `soft_delete`, `image`) VALUES
(1, 'Christian', 'Cayabyab', '2014-08-09', 'M', 0, ''),
(2, 'Francin Kate', 'Hallarde', '2015-10-17', 'F', 0, ''),
(3, 'Mark Aaron', 'Acupiado', '2012-01-11', 'M', 0, '');

-- --------------------------------------------------------

--
-- Table structure for table `guardian`
--

CREATE TABLE `guardian` (
  `guardian_id` int(11) NOT NULL,
  `fname` varchar(48) NOT NULL,
  `lname` varchar(48) NOT NULL,
  `contact` varchar(11) NOT NULL,
  `household_id` varchar(7) NOT NULL,
  `address` varchar(128) NOT NULL,
  `purok` int(3) NOT NULL,
  `soft_delete` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `guardian`
--

INSERT INTO `guardian` (`guardian_id`, `fname`, `lname`, `contact`, `household_id`, `address`, `purok`, `soft_delete`) VALUES
(1, 'Tina', 'Velasco', '09649656465', 'P1108Q5', 'National Highway Purok 7', 7, 0),
(2, 'Joanne', 'Lara', '09462164651', 'P696S25', '2071 Apitong St. Purok 10', 10, 0),
(3, 'Rachell', 'Acupiado', '09321654651', 'P12C955', '2049 Bataan Road', 10, 0);

-- --------------------------------------------------------

--
-- Table structure for table `link`
--

CREATE TABLE `link` (
  `link_id` int(11) NOT NULL,
  `id` varchar(11) NOT NULL,
  `relationship` varchar(15) NOT NULL,
  `guardian_id` varchar(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `link`
--

INSERT INTO `link` (`link_id`, `id`, `relationship`, `guardian_id`) VALUES
(2, '1', 'Guardian', '1'),
(3, '2', 'Guardian', '2'),
(4, '3', 'Mother', '3');

-- --------------------------------------------------------

--
-- Table structure for table `record`
--

CREATE TABLE `record` (
  `record_id` int(11) NOT NULL,
  `id` int(11) NOT NULL,
  `height` double NOT NULL,
  `weight` double NOT NULL,
  `remark` varchar(15) NOT NULL,
  `output` double NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `soft_delete` tinyint(1) NOT NULL DEFAULT 0,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `record`
--

INSERT INTO `record` (`record_id`, `id`, `height`, `weight`, `remark`, `output`, `date`, `soft_delete`, `user_id`) VALUES
(1, 3, 135.1, 29.4, 'Underweight', 16.107814974898655, '2023-05-03 08:21:51', 0, 1),
(2, 1, 129.3, 35.5, 'Normal', 21.233975077892797, '2023-05-03 08:23:19', 0, 1),
(3, 2, 120.9, 39.3, 'Overweight', 26.886851508639708, '2023-05-03 09:28:21', 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `fname` varchar(32) NOT NULL,
  `lname` varchar(32) NOT NULL,
  `username` varchar(64) NOT NULL,
  `password` varchar(124) NOT NULL,
  `contact` varchar(11) NOT NULL,
  `admin_power` tinyint(1) NOT NULL,
  `soft_delete` tinyint(1) NOT NULL,
  `refresh_token` varchar(256) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `fname`, `lname`, `username`, `password`, `contact`, `admin_power`, `soft_delete`, `refresh_token`) VALUES
(1, 'Jenny', 'De Leon', 'admin', '0d3c456672f7646f6403659b91c8987e95ecc7012fd7f77cfa400ce6dd33c789', '09999999999', 1, 0, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmbmFtZSI6Ikplbm55IiwiYWRtaW5fcG93ZXIiOjEsImlkIjoxLCJpYXQiOjE2ODMxMDU1MjF9.DjwxCaOEBI5VUhDyoAtoZZjHA3ZOeIKDBvxo5NPS3YQ');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`annou_id`);

--
-- Indexes for table `child`
--
ALTER TABLE `child`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `guardian`
--
ALTER TABLE `guardian`
  ADD PRIMARY KEY (`guardian_id`);

--
-- Indexes for table `link`
--
ALTER TABLE `link`
  ADD PRIMARY KEY (`link_id`);

--
-- Indexes for table `record`
--
ALTER TABLE `record`
  ADD PRIMARY KEY (`record_id`),
  ADD KEY `id` (`id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `annou_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `child`
--
ALTER TABLE `child`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `guardian`
--
ALTER TABLE `guardian`
  MODIFY `guardian_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `link`
--
ALTER TABLE `link`
  MODIFY `link_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `record`
--
ALTER TABLE `record`
  MODIFY `record_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
