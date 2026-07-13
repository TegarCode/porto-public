-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 20, 2026 at 03:04 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `magang`
--

-- --------------------------------------------------------

--
-- Table structure for table `data_perdagangan`
--

CREATE TABLE `data_perdagangan` (
  `id` int NOT NULL,
  `nama_negara` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kode_negara` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kode_hs` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `product_label` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tahun_2017` decimal(20,2) DEFAULT NULL,
  `tahun_2018` decimal(20,2) DEFAULT NULL,
  `tahun_2019` decimal(20,2) DEFAULT NULL,
  `tahun_2020` decimal(20,2) DEFAULT NULL,
  `tahun_2021` decimal(20,2) DEFAULT NULL,
  `tahun_2022` decimal(20,2) DEFAULT NULL,
  `tahun_2023` decimal(20,2) DEFAULT NULL,
  `tahun_2024` decimal(20,2) DEFAULT NULL,
  `tahun_2025` decimal(20,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'Import'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `data_perdagangan`
--
ALTER TABLE `data_perdagangan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_data_perdagangan` (`nama_negara`,`kode_hs`,`product_label`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `data_perdagangan`
--
ALTER TABLE `data_perdagangan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
