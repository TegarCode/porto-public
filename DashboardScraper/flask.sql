-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 19, 2026 at 06:44 AM
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
-- Database: `flask`
--

-- --------------------------------------------------------

--
-- Table structure for table `data_perdagangan_full_v3`
--

CREATE TABLE `data_perdagangan_full_v3` (
  `id` int NOT NULL,
  `nama_negara` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kode_negara` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kode_hs` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `product_label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `IndonesiaMitra_2017` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2018` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2019` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2020` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2021` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2022` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2023` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2024` decimal(20,2) DEFAULT NULL,
  `IndonesiaMitra_2025` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2017` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2018` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2019` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2020` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2021` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2022` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2023` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2024` decimal(20,2) DEFAULT NULL,
  `MitraWorld_2025` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2017` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2018` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2019` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2020` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2021` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2022` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2023` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2024` decimal(20,2) DEFAULT NULL,
  `IndonesiaWorld_2025` decimal(20,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `perusahaan`
--

CREATE TABLE `perusahaan` (
  `id` int NOT NULL,
  `nama_perusahaan` varchar(255) DEFAULT NULL,
  `id_siinas` varchar(255) DEFAULT NULL,
  `nib` varchar(50) DEFAULT NULL,
  `skala_usaha` varchar(50) DEFAULT NULL,
  `kbli` text,
  `tanggal_approval` date DEFAULT NULL,
  `kel_desa` varchar(100) DEFAULT NULL,
  `kecamatan` varchar(100) DEFAULT NULL,
  `kab_kota` varchar(100) DEFAULT NULL,
  `provinsi` varchar(100) DEFAULT NULL,
  `alamat_pabrik` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ref_negara`
--

CREATE TABLE `ref_negara` (
  `nama_raw` varchar(255) NOT NULL,
  `kode_alpha3` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ref_negara`
--

INSERT INTO `ref_negara` (`nama_raw`, `kode_alpha3`) VALUES
('ALAND ISLANDS', 'ALA'),
('AMERICAN SAMOA', 'ASM'),
('ANGUILLA', 'AIA'),
('ANTARTICA', 'ATA'),
('ARUBA', 'ABW'),
('BERMUDA', 'BMU'),
('BOTSWANA', 'BWA'),
('BOUVET ISLAND', 'BVT'),
('BRITISH INDIAN OCEAN TERRITORY', 'IOT'),
('CAYMAN ISLANDS', 'CYM'),
('CHRISTMAS ISLANDS', 'CXR'),
('COCOS (KEELING) ISLANDS', 'CCK'),
('CONGO', 'COG'),
('COTE DIVOIRE', 'CIV'),
('CURACAO', 'CUW'),
('CZECH REPUBLIC', 'CZE'),
('DEMOCRATIC REP. OF THE CONGO', 'COD'),
('DOMINICA', 'DMA'),
('EAST TIMOR', 'TLS'),
('FAEROE ISLANDS', 'FRO'),
('FALKLAND ISLANDS', 'FLK'),
('FRENCH GUIANA', 'GUF'),
('FRENCH SOUTHERN TERRITORIES', 'ATF'),
('GERMANY, FED. REP. OF', 'DEU'),
('GREENLAND', 'GRL'),
('GRENADA', 'GRD'),
('GUADELOUPE', 'GLP'),
('GUAM', 'GUM'),
('GUERNSEY', 'GGY'),
('GUINEA BISSAU', 'GNB'),
('HEARD ISLAND AND MCDONALD ISLANDS', 'HMD'),
('HONG KONG', 'HKG'),
('INDONESIA', 'IDN'),
('IRAN (ISLAMIC REPUBLIC OF)', 'IRN'),
('IRELAND', 'IRL'),
('ISLE OF MAN', 'IMN'),
('ISRAEL', 'ISR'),
('JERSEY', 'JEY'),
('KOREA, DEM. PEOPLES REP.', 'PRK'),
('KOSOVO', 'XKX'),
('LAO PEOPLES DEM. REP.', 'LAO'),
('MACAU', 'MAC'),
('MARTINIQUE', 'MTQ'),
('MAYOTTE', 'MYT'),
('MICRONESIA, FED. STATES OF', 'FSM'),
('MOLDOVA, REPUBLIC OF', 'MDA'),
('MONTSERRAT', 'MSR'),
('MOROCCO', 'MAR'),
('NETHERLANDS ANTILLES', 'ANT'),
('NORFOLK ISLANDS', 'NFK'),
('NORTHERN MARIANA ISLANDS', 'MNP'),
('PALESTINA', 'PSE'),
('PITCAIRN', 'PCN'),
('PUERTO RICO', 'PRI'),
('REP. OF MACEDONIA', 'MKD'),
('REUNION', 'REU'),
('RUSSIA FEDERATION', 'RUS'),
('SAINT BARTHELEMY', 'BLM'),
('SAINT HELENA', 'SHN'),
('SAINT MARTIN (FRENCH PART)', 'MAF'),
('SAINT PIERRE AND MIQUELON', 'SPM'),
('SINT MAARTEN (DUTCH PART)', 'SXM'),
('SLOVAKIA', 'SVK'),
('SOLOMON ISLANDS', 'SLB'),
('SOUTH GEORGIA AND THE SOUTH SA', 'SGS'),
('SVALBARD AND JAN MAYEN', 'SJM'),
('SWAZILAND', 'SWZ'),
('SYRIA ARAB REPUBLIC', 'SYR'),
('TAIWAN', 'TWN'),
('TANZANIA, UNITED REP. OF', 'TZA'),
('TOKELAU', 'TKL'),
('TURKS AND CAICOS ISLANDS', 'TCA'),
('U.S MINOR OUTLYING ISLAND', 'UMI'),
('U.S. VIRGIN ISLANDS', 'VIR'),
('UNITED KINGDOM', 'GBR'),
('VATICAN CITY STATE', 'VAT'),
('VIRGIN ISLANDS (BRITISH)', 'VGB'),
('WALLIS AND FUTUNA ISLANDS', 'WLF'),
('WESTERN SAHARA', 'ESH');

-- --------------------------------------------------------

--
-- Table structure for table `tbnegara`
--

CREATE TABLE `tbnegara` (
  `No` int NOT NULL,
  `Kode_Angka` int DEFAULT NULL,
  `Kode_Alpha3` char(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Kode_Alpha2` char(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Negara_IDN` varchar(150) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Negara_ENG` varchar(150) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `ID_Wil` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `ID_WIl_Kemlu` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

--
-- Dumping data for table `tbnegara`
--

INSERT INTO `tbnegara` (`No`, `Kode_Angka`, `Kode_Alpha3`, `Kode_Alpha2`, `Negara_IDN`, `Negara_ENG`, `ID_Wil`, `ID_WIl_Kemlu`) VALUES
(1, 96, 'BRN', 'BN', 'BRUNEI', 'BRUNEI DARUSSALAM', 'SIA02', 'ASTEN'),
(2, 608, 'PHL', 'PH', 'FILIPINA', 'PHILIPPINES', 'SIA02', 'ASTEN'),
(3, 116, 'KHM', 'KH', 'KAMBOJA', 'CAMBODIA', 'SIA02', 'ASTEN'),
(4, 418, 'LAO', 'LA', 'LAOS', 'LAO PEOPLE\'S DEMOCRATIC REPUBLIC', 'SIA02', 'ASTEN'),
(5, 458, 'MYS', 'MY', 'MALAYSIA', 'MALAYSIA', 'SIA02', 'ASTEN'),
(6, 104, 'MMR', 'MM', 'MYANMAR', 'MYANMAR', 'SIA02', 'ASTEN'),
(7, 702, 'SGP', 'SG', 'SINGAPURA', 'SINGAPORE', 'SIA02', 'ASTEN'),
(8, 764, 'THA', 'TH', 'THAILAND', 'THAILAND', 'SIA02', 'ASTEN'),
(9, 626, 'TLS', 'TL', 'TIMOR LESTE', 'TIMOR LESTE', 'SIA02', 'ASTEN'),
(10, 704, 'VNM', 'VN', 'VIETNAM', 'VIET NAM', 'SIA02', 'ASTEN'),
(11, 156, 'CHN', 'CN', 'CHINA', 'CHINA', 'SIA01', 'ASTIM'),
(12, 392, 'JPN', 'JP', 'JEPANG', 'JAPAN', 'SIA01', 'ASTIM'),
(13, 410, 'KOR', 'KR', 'KOREA, REPUBLIK', 'KOREA, REPUBLIC OF', 'SIA01', 'ASTIM'),
(14, 408, 'PRK', 'KP', 'KOREA, REPUBLIK RAKYAT DEMOKRATIK', 'KOREA, DEMOKRATIC PEOPLES REPUBLIC OF', 'SIA01', 'ASTIM'),
(15, 496, 'MNG', 'MN', 'MONGOLIA', 'MONGOLIA', 'SIA01', 'ASTIM'),
(16, 36, 'AUS', 'AU', 'AUSTRALIA', 'AUSTRALIA', 'AUSTR', 'PASOS'),
(17, 184, 'COK', 'CK', 'COOK, KEPULAUAN', 'COOK ISLANDS', 'POLIN', 'PASOS'),
(18, 540, 'NCL', 'NC', 'KALEDONIA BARU', 'NEW CALEDONIA', 'MELAN', 'PASOS'),
(19, 296, 'KIR', 'KI', 'KIRIBATI', 'KIRIBATI', 'MIKRO', 'PASOS'),
(20, 583, 'FSM', 'FM', 'MIKRONESIA, FEDERASI', 'FEDERATES STATES OF MICRONESIA', 'MIKRO', 'PASOS'),
(21, 242, 'FJI', 'FJ', 'FIJI', 'FIJI', 'MELAN', 'PASOS'),
(22, 584, 'MHL', 'MH', 'MARSHALL, KEPULAUAN', 'MARSHALL ISLANDS', 'MIKRO', 'PASOS'),
(23, 520, 'NRU', 'NR', 'NAURU', 'NAURU', 'MIKRO', 'PASOS'),
(24, 570, 'NIU', 'NU', 'NIUE', 'NIUE', 'MIKRO', 'PASOS'),
(25, 585, 'PLW', 'PW', 'PALAU', 'PALAU', 'MIKRO', 'PASOS'),
(26, 598, 'PNG', 'PG', 'PAPUA NUGINI', 'PAPUA NEW GUINEA', 'MELAN', 'PASOS'),
(27, 258, 'PYF', 'PF', 'POLINESIA PRANCIS', 'FRENCH POLYNESIA', 'POLIN', 'PASOS'),
(28, 882, 'WSM', 'WS', 'SAMOA', 'SAMOA', 'POLIN', 'PASOS'),
(29, 554, 'NZL', 'NZ', 'SELANDIA BARU', 'NEW ZEALAND', 'AUSTR', 'PASOS'),
(30, 90, 'SLB', 'SB', 'SOLOMON, KEPULAUAN', 'SALOMON ISLANDS', 'MELAN', 'PASOS'),
(31, 776, 'TON', 'TO', 'TONGA', 'TONGA', 'POLIN', 'PASOS'),
(32, 798, 'TUV', 'TV', 'TUVALU', 'TUVALU', 'POLIN', 'PASOS'),
(33, 548, 'VUT', 'VU', 'VANUATU', 'VANUATU', 'MELAN', 'PASOS'),
(34, 4, 'AFG', 'AF', 'AFGANISTAN', 'AFGHANISTAN', 'SIA03', 'ASETE'),
(35, 31, 'AZE', 'AZ', 'AZERBAIJAN', 'AZERBAIJAN', 'SIA04', 'ASETE'),
(36, 50, 'BGD', 'BD', 'BANGLADESH', 'BANGLADESH', 'SIA03', 'ASETE'),
(37, 64, 'BTN', 'BT', 'BHUTAN', 'BHUTAN', 'SIA03', 'ASETE'),
(38, 356, 'IND', 'IN', 'INDIA', 'INDIA', 'SIA03', 'ASETE'),
(39, 364, 'IRN', 'IR', 'IRAN', 'IRAN, ISLAMIC REPUBLIC of', 'SIA04', 'ASETE'),
(40, 398, 'KAZ', 'KZ', 'KAZAKHSTAN', 'KAZAKHSTAN', 'SIA05', 'ASETE'),
(41, 417, 'KGZ', 'KG', 'KIRGIZSTAN', 'KYRGYZSTAN', 'SIA05', 'ASETE'),
(42, 462, 'MDV', 'MV', 'MALADEWA', 'MALDIVES', 'SIA03', 'ASETE'),
(43, 524, 'NPL', 'NP', 'NEPAL', 'NEPAL', 'SIA03', 'ASETE'),
(44, 586, 'PAK', 'PK', 'PAKISTAN', 'PAKISTAN', 'SIA03', 'ASETE'),
(45, 144, 'LKA', 'LK', 'SRI LANKA', 'SRI LANKA', 'SIA03', 'ASETE'),
(46, 762, 'TJK', 'TJ', 'TAJIKISTAN', 'TAJIKISTAN', 'SIA05', 'ASETE'),
(47, 795, 'TKM', 'TM', 'TURKMENISTAN', 'TURKMENISTAN', 'SIA05', 'ASETE'),
(48, 860, 'UZB', 'UZ', 'UZBEKISTAN', 'UZBEKISTAN', 'SIA05', 'ASETE'),
(49, 12, 'DZA', 'DZ', 'ALJAZAIR', 'ALGERIA', 'SIA04', 'TITEN'),
(50, 682, 'SAU', 'SA', 'ARAB SAUDI', 'SAUDI ARABIA', 'SIA04', 'TITEN'),
(51, 48, 'BHR', 'BH', 'BAHRAIN', 'BAHRAIN', 'SIA04', 'TITEN'),
(52, 368, 'IRQ', 'IQ', 'IRAK', 'IRAQ', 'SIA04', 'TITEN'),
(53, 414, 'KWT', 'KW', 'KUWAIT', 'KUWAIT', 'SIA04', 'TITEN'),
(54, 434, 'LBY', 'LY', 'LIBYA', 'LIBYAN ARAB JAMAHIRIYA', 'SIA04', 'TITEN'),
(55, 422, 'LBN', 'LB', 'LEBANON', 'LEBANON', 'SIA04', 'TITEN'),
(56, 504, 'MAR', 'MA', 'MAROKO', 'MAROCCO', 'SIA04', 'TITEN'),
(57, 478, 'MTQ', 'MQ', 'MAURITANIA', 'MAURITANIA', 'SIA04', 'TITEN'),
(58, 818, 'EGY', 'EG', 'MESIR', 'EGYPT', 'SIA04', 'TITEN'),
(59, 512, 'OMN', 'OM', 'OMAN', 'OMAN', 'SIA04', 'TITEN'),
(60, 275, 'PSE', 'PS', 'PALESTINA', 'PALESTINIAN TERRITORY, OCCUPIED', 'SIA04', 'TITEN'),
(61, 784, 'ARE', 'AE', 'PERSATUAN EMIRAT ARAB', 'UNITED ARAB EMIRATES', 'SIA04', 'TITEN'),
(62, 634, 'QAT', 'QA', 'QATAR', 'QATAR', 'SIA04', 'TITEN'),
(63, 736, 'SDN', 'SD', 'SUDAN', 'SUDAN', 'SIA04', 'TITEN'),
(64, 728, 'SSD', 'SS', 'SUDAN SELATAN', 'SOUTH SUDAN', 'SIA04', 'TITEN'),
(65, 760, 'SYR', 'SY', 'SURIAH', 'SYRIAN ARAB REPUBLIC', 'SIA04', 'TITEN'),
(66, 788, 'TUN', 'TN', 'TUNISIA', 'TUNISIA', 'SIA04', 'TITEN'),
(67, 887, 'YEM', 'YE', 'YAMAN', 'YEMEN', 'SIA04', 'TITEN'),
(68, 400, 'JOR', 'JO', 'YORDANIA', 'JORDAN', 'SIA04', 'TITEN'),
(69, 566, 'NGA', 'NG', 'NIGERIA', 'NIGERIA', 'AFR04', 'AFRIK'),
(70, 204, 'BEN', 'BJ', 'BENIN', 'BENIN', 'AFR04', 'AFRIK'),
(71, 854, 'BFA', 'BF', 'BURKINA FASO', 'BURKINA FASO', 'AFR04', 'AFRIK'),
(72, 266, 'GAB', 'GA', 'GABON', 'GABON', 'AFR05', 'AFRIK'),
(73, 288, 'GHA', 'GH', 'GHANA', 'GHANA', 'AFR04', 'AFRIK'),
(74, 120, 'CMR', 'CM', 'KAMERUN', 'CAMEROON', 'AFR05', 'AFRIK'),
(75, 180, 'COG', 'CG', 'KONGO, REPUBLIK', 'REPUBLIC OF THE CONGO', 'AFR05', 'AFRIK'),
(76, 430, 'LBR', 'LR', 'LIBERIA', 'LIBERIA', 'AFR04', 'AFRIK'),
(77, 562, 'NER', 'NE', 'NIGER', 'NIGER', 'AFR04', 'AFRIK'),
(78, 678, 'STP', 'ST', 'SAO TOME DAN PRINCIPE', 'SAO TOME AND PRINCIPE', 'AFR05', 'AFRIK'),
(79, 768, 'TGO', 'TG', 'TOGO', 'TOGO', 'AFR04', 'AFRIK'),
(80, 148, 'TCD', 'TD', 'CHAD', 'CHAD', 'AFR05', 'AFRIK'),
(81, 140, 'CAF', 'CF', 'AFRIKA TENGAH, REPUBLIK', 'CENTRAL AFRICAN REPUBLIC', 'AFR05', 'AFRIK'),
(82, 226, 'GNQ', 'GQ', 'GUINEA KHATULISTIWA', 'EQUATORIAL GUINEA', 'AFR04', 'AFRIK'),
(83, 686, 'SEN', 'SN', 'SENEGAL', 'SENEGAL', 'AFR04', 'AFRIK'),
(84, 132, 'CPV', 'CV', 'CABO VERDE', 'CAPE VERDE', 'AFR04', 'AFRIK'),
(85, 270, 'GMB', 'GM', 'GAMBIA', 'GAMBIA', 'AFR04', 'AFRIK'),
(86, 324, 'GIN', 'GN', 'GUINEA', 'GUINEA', 'AFR04', 'AFRIK'),
(87, 624, 'GNB', 'GW', 'GUINEA-BISSAU', 'GUINEA-BISSAU', 'AFR04', 'AFRIK'),
(88, 466, 'MAL', 'MA', 'MALI', 'MALI', 'AFR04', 'AFRIK'),
(89, 384, 'CIV', 'CI', 'PANTAI GADING', 'COTE D\"IVOIRE', 'AFR04', 'AFRIK'),
(90, 694, 'SLE', 'SL', 'SIERRA LEONE', 'SIERRA LEONE', 'AFR04', 'AFRIK'),
(91, 231, 'ETH', 'ET', 'ETHIOPIA', 'ETHIOPIA', 'AFR01', 'AFRIK'),
(92, 646, 'RWA', 'RW', 'RWANDA', 'RWANDA', 'AFR01', 'AFRIK'),
(93, 108, 'BDI', 'BI', 'BURUNDI', 'BURUNDI', 'AFR01', 'AFRIK'),
(94, 262, 'DJI', 'DJ', 'DJIBOUTI', 'DJIBOUTI', 'AFR01', 'AFRIK'),
(95, 834, 'TZA', 'TZ', 'TANZANIA', 'TANZANIA', 'AFR01', 'AFRIK'),
(96, 232, 'ERI', 'ER', 'ERITREA', 'ERITREA', 'AFR01', 'AFRIK'),
(97, 404, 'KEN', 'KE', 'KENYA', 'KENYA', 'AFR01', 'AFRIK'),
(98, 800, 'UGA', 'UG', 'UGANDA', 'UGANDA', 'AFR01', 'AFRIK'),
(99, 706, 'SOM', 'SO', 'SOMALIA', 'SOMALIA', 'AFR01', 'AFRIK'),
(100, 480, 'MUS', 'MU', 'MAURITIUS', 'MAURITIUS', 'AFR01', 'AFRIK'),
(101, 690, 'SYC', 'SC', 'SEYCHELLES', 'SEYCHELLES', 'AFR01', 'AFRIK'),
(102, 180, 'COD', 'CD', 'KONGO, REPUBLIK DEMOKRATIK', 'DEMOCRATIC REPUBLIC OF THE KONGO', 'AFR05', 'AFRIK'),
(103, 508, 'MOZ', 'MZ', 'Mozambik', 'MOZAMBIQUE', 'AFR02', 'AFRIK'),
(104, 454, 'MWI', 'MW', 'MALAWI', 'MALAWI', 'AFR01', 'AFRIK'),
(105, 174, 'COM', 'KM', 'KOMORO', 'COMOROS', 'AFR01', 'AFRIK'),
(106, 450, 'MDG', 'MG', 'MADAGASKAR', 'MADAGASCAR', 'AFR01', 'AFRIK'),
(107, 710, 'ZAF', 'ZA', 'AFRIKA SELATAN', 'SOUTH AFRICA', 'AFR03', 'AFRIK'),
(108, 426, 'LSO', 'LS', 'LESOTHO', 'LESOTHO', 'AFR03', 'AFRIK'),
(109, 748, 'SWZ', 'SZ', 'ESWATINI', 'ESWATINI', 'AFR03', 'AFRIK'),
(110, 72, 'BWA', 'BW', 'BOTSWANA', 'BOSTWANA', 'AFR03', 'AFRIK'),
(111, 516, 'NAM', 'NA', 'NAMIBIA', 'NAMIBIA', 'AFR03', 'AFRIK'),
(112, 24, 'AGO', 'AO', 'ANGOLA', 'ANGOLA', 'AFR04', 'AFRIK'),
(113, 894, 'ZMB', 'ZM', 'ZAMBIA', 'ZAMBIA', 'AFR05', 'AFRIK'),
(114, 716, 'ZWE', 'ZW', 'ZIMBABWE', 'ZIMBABWE', 'AFR03', 'AFRIK'),
(115, 840, 'USA', 'US', 'AMERIKA SERIKAT', 'UNITED STATES', 'AME02', 'AMRI1'),
(116, 84, 'BLZ', 'BZ', 'BELIZE', 'BELIZE', 'AME03', 'AMRI1'),
(117, 222, 'SLV', 'SV', 'EL SALVADOR', 'EL SALVADOR', 'AME03', 'AMRI1'),
(118, 320, 'GTM', 'GT', 'GUATEMALA', 'GUATEMALA', 'AME03', 'AMRI1'),
(119, 340, 'HND', 'HN', 'HONDURAS', 'HONDURAS', 'AME03', 'AMRI1'),
(120, 124, 'CAN', 'CA', 'KANADA', 'CANADA', 'AME02', 'AMRI1'),
(121, 188, 'CRI', 'CR', 'KOSTA RIKA', 'COSTA RICA', 'AME03', 'AMRI1'),
(122, 484, 'MEX', 'MX', 'MEKSIKO', 'MEXICO', 'AME02', 'AMRI1'),
(123, 558, 'NIC', 'NI', 'NIKARAGUA', 'NICARAGUA', 'AME03', 'AMRI1'),
(124, 591, 'PAN', 'PA', 'PANAMA', 'PANAMA', 'AME03', 'AMRI1'),
(125, 28, 'ATG', 'AG', 'ANTIGUA DAN BARBUDA', 'ANTIGUA AND BARBUDA', 'AME02', 'AMRI2'),
(126, 32, 'ARG', 'AR', 'ARGENTINA', 'ARGENTINA', 'AME01', 'AMRI2'),
(127, 44, 'BHS', 'BS', 'BAHAMA', 'BAHAMAS', 'AME02', 'AMRI2'),
(128, 52, 'BRB', 'BB', 'BARBADOS', 'BARBADOS', 'AME02', 'AMRI2'),
(129, 68, 'BOL', 'BO', 'BOLIVIA', 'BOLIVIA', 'AME01', 'AMRI2'),
(130, 76, 'BRA', 'BR', 'BRASIL', 'BRAZIL', 'AME01', 'AMRI2'),
(131, 152, 'CHL', 'CL', 'CHILI', 'CHILE', 'AME01', 'AMRI2'),
(132, 214, 'DOM', 'DO', 'DOMINIKA, REPUBLIK', 'DOMINICAN REPUBLIC', 'AME02', 'AMRI2'),
(133, 218, 'ECU', 'EC', 'AKUADOR', 'ECUADOR', 'AME01', 'AMRI2'),
(134, 292, 'GIB', 'BI', 'GIBRALTAR', 'GIBRALTAR', 'ERO03', 'AMRI2'),
(135, 328, 'GUY', 'GY', 'GUYANA', 'GUYANA', 'AME01', 'AMRI2'),
(136, 332, 'HTI', 'HT', 'HAITI', 'HAITI', 'AME02', 'AMRI2'),
(137, 388, 'JAM', 'JM', 'JAMAIKA', 'JAMAICA', 'AME02', 'AMRI2'),
(138, 170, 'COL', 'CO', 'KOLOMBIA', 'COLOMBIA', 'AME01', 'AMRI2'),
(139, 192, 'CUB', 'CU', 'KUBA', 'CUBA', 'AME02', 'AMRI2'),
(140, 600, 'PRY', 'PY', 'PARAGUAY', 'PARAGUAY', 'AME01', 'AMRI2'),
(141, 604, 'PER', 'PE', 'PERU', 'PERU', 'AME01', 'AMRI2'),
(142, 214, 'DOM', 'DO', 'DOMINIKA, REPUBLIK', 'DOMINICAN REPUBLIC', 'AME02', 'AMRI2'),
(143, 659, 'KNA', 'KN', 'ST. KITTS DAN NEVIS', 'SAINT KITTS AND NEVIS', 'AME02', 'AMRI2'),
(144, 662, 'LCA', 'LC', 'ST. LUCIA', 'SAINT LUCIA', 'AME02', 'AMRI2'),
(145, 670, 'VCT', 'VC', 'ST. VINCENT DAN GRENADINES', 'SAINT VINCENT AND THE GRENADINES', 'AME02', 'AMRI2'),
(146, 740, 'SUR', 'SR', 'SURINAME', 'SURINAME', 'AME01', 'AMRI2'),
(147, 780, 'TTO', 'TT', 'TRINIDAD DAN TOBAGO', 'TRINIDAD AND TOBAGO', 'AME02', 'AMRI2'),
(148, 858, 'URY', 'UY', 'URUGUAY', 'URUGUAY', 'AME01', 'AMRI2'),
(149, 862, 'VEN', 'VE', 'VENEZUELA', 'VENEZUELA', 'AME01', 'AMRI2'),
(150, 20, 'AND', 'AD', 'ANDORRA', 'ANDORRA', 'ERO03', 'EROP1'),
(151, 40, 'AUT', 'AT', 'AUSTRIA', 'AUSTRIA', 'ERO05', 'EROP1'),
(152, 528, 'NLD', 'NL', 'BELANDA', 'NETHERLANDS', 'ERO04', 'EROP1'),
(153, 56, 'BEL', 'BE', 'BELGIA', 'BELGIUM', 'ERO04', 'EROP1'),
(154, 203, 'CZE', 'CZ', 'CEKO', 'CZECHIA', 'ERO05', 'EROP1'),
(155, 348, 'HUN', 'HU', 'HUNGARIA', 'HUNGARY', 'ERO05', 'EROP1'),
(157, 372, 'IRL', 'IE', 'IRLANDIA, REPUBLIK', 'REPUBLIC OF IRELAND', 'ERO04', 'EROP1'),
(158, 380, 'ITA', 'IT', 'ITALIA', 'ITALY', 'ERO03', 'EROP1'),
(159, 442, 'LTU', 'LT', 'LUKSEMBURG', 'LUXEMBOURG', 'ERO04', 'EROP1'),
(160, 470, 'MLT', 'MT', 'MALTA', 'MALTA', 'ERO03', 'EROP1'),
(161, 492, 'MCO', 'MC', 'MONAKO', 'MONACO', 'ERO04', 'EROP1'),
(162, 616, 'POL', 'PL', 'POLANDIA', 'POLAND', 'ERO05', 'EROP1'),
(163, 620, 'PRT', 'PT', 'PORTUGAL', 'PORTUGAL', 'ERO04', 'EROP1'),
(164, 250, 'FRA', 'FR', 'PRANCIS', 'FRANCE', 'ERO04', 'EROP1'),
(165, 674, 'SMR', 'SM', 'SAN MARINO', 'SAN MARINO', 'ERO03', 'EROP1'),
(166, 724, 'ESP', 'ES', 'SPANYOL', 'SPAIN', 'ERO03', 'EROP1'),
(167, 196, 'CYP', 'CY', 'SIPRUS', 'CYPRUS', 'ERO01', 'EROP1'),
(168, 705, 'SVN', 'SI', 'SLOVENIA', 'SLOVENIA', 'ERO05', 'EROP1'),
(169, 703, 'SVK', 'SK', 'SLOWAKIA', 'SLOWAKIA', 'ERO05', 'EROP1'),
(170, 336, 'VAT', 'VA', 'VATIKAN', 'VATICAN CITY', 'ERO03', 'EROP1'),
(171, 300, 'GRC', 'GR', 'YUNANI', 'GREECE', 'ERO03', 'EROP1'),
(172, 8, 'ALB', 'AL', 'ALBANIA', 'ALBANIA', 'ERO02', 'EROP2'),
(173, 51, 'ARM', 'AM', 'ARMENIA', 'ARMENIA', 'ERO01', 'EROP2'),
(174, 112, 'BLR', 'BY', 'BELARUS', 'BELARUS', 'ERO01', 'EROP2'),
(175, 100, 'BGR', 'BG', 'BULGARIA', 'BULGARIA', 'ERO02', 'EROP2'),
(176, 70, 'BIH', 'BA', 'BOSNIA DAN HERZEGOVINA', 'BOSNIA AND HERZEGOVINA', 'ERO02', 'EROP2'),
(177, 208, 'DNK', 'DK', 'DENMARK', 'DENMARK', 'ERO04', 'EROP2'),
(178, 233, 'EST', 'EE', 'ESTONIA', 'ESTONIA', 'ERO04', 'EROP2'),
(179, 246, 'FIN', 'FI', 'FINLANDIA', 'FINLAND', 'ERO04', 'EROP2'),
(180, 268, 'GEO', 'GE', 'GEORGIA', 'GEORGIA', 'ERO01', 'EROP2'),
(181, 352, 'ISL', 'IS', 'ISLANDIA', 'ICELAND', 'ERO04', 'EROP2'),
(182, 276, 'DEU', 'DE', 'JERMAN', 'GERMANY', 'ERO05', 'EROP2'),
(183, 191, 'HRV', 'HR', 'KROASIA', 'CROATIA', 'ERO03', 'EROP2'),
(184, 428, 'LVA', 'LV', 'LATVIA', 'LATVIA', 'ERO04', 'EROP2'),
(185, 438, 'LIE', 'LI', 'LIECHTENSTEIN', 'LIECHTENSTEIN', 'ERO05', 'EROP2'),
(186, 440, 'LTU', 'LT', 'LITHUANIA', 'LITHUANIA', 'ERO04', 'EROP2'),
(187, 499, 'MNE', 'ME', 'MONTENEGRO', 'MONTENEGRO', 'ERO03', 'EROP2'),
(188, 807, 'MKD', 'MK', 'MAKEDONIA, REPUBLIK', 'REPUBLIC OF MACEDONIA', 'ERO03', 'EROP2'),
(189, 498, 'MDA', 'MD', 'MOLDOVA', 'MOLDOVA', 'ERO01', 'EROP2'),
(190, 578, 'NOR', 'NO', 'NORWEGIA', 'NORWAY', 'ERO04', 'EROP2'),
(191, 642, 'ROU', 'RO', 'RUMANIA', 'ROMANIA', 'ERO02', 'EROP2'),
(192, 643, 'RUS', 'RU', 'RUSIA', 'RUSSIAN FEDERATION', 'ERO01', 'EROP2'),
(193, 688, 'SRB', 'RS', 'SERBIA', 'SERBIA', 'ERO03', 'EROP2'),
(194, 752, 'SWE', 'SE', 'SWEDIA', 'SWEDEN', 'ERO04', 'EROP2'),
(195, 756, 'CHE', 'CH', 'SWISS', 'SWITZERLAND', 'ERO04', 'EROP2'),
(196, 792, 'TUR', 'TR', 'TURKI', 'TURKEY', 'ERO02', 'EROP2'),
(197, 804, 'UKR', 'UA', 'UKRAINA', 'UKRAINE', 'ERO01', 'EROP2');

-- --------------------------------------------------------

--
-- Table structure for table `tbsumber`
--

CREATE TABLE `tbsumber` (
  `KodeSumber` char(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `NamaSumber` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

--
-- Dumping data for table `tbsumber`
--

INSERT INTO `tbsumber` (`KodeSumber`, `NamaSumber`) VALUES
('1', 'Badan Pusat Statistik (BPS)'),
('2', 'Comtrade'),
('3', 'https://www.eiu.com/'),
('4', 'https://www.imf.com/'),
('5', 'Trademap'),
('6', 'BKPM'),
('8', 'www.bi.go.id'),
('7', 'Data.Worldbank.org'),
('9', 'UNCTAD'),
('10', 'UN WTO'),
('11', 'KEMLU'),
('12', 'www.southafrica.net'),
('13', 'dados.turismo.gov.br'),
('14', 'data.stats.gov.cn'),
('15', 'www.trade.gov'),
('16', 'www.investmentmap.org'),
('17', 'www.bcb.gov.br'),
('18', 'data.stats.gov.cn'),
('19', 'www.bea.gov');

-- --------------------------------------------------------

--
-- Table structure for table `tbtrade`
--

CREATE TABLE `tbtrade` (
  `ID` bigint NOT NULL,
  `Kode_Alpha3_Reporter` char(3) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Provinsi_Reporter` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Kota_Reporter` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Kode_Alpha3_Partner` char(3) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Provinsi_Partner` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Kota_Partner` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Bulan` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Tahun` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `HSCode` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ID_Sektor` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Vol` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Satuan` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Tarif` decimal(45,2) DEFAULT NULL,
  `Nilai` decimal(45,2) DEFAULT NULL,
  `KodeSumber` char(2) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Status` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `Berat_Bersih` decimal(18,2) DEFAULT NULL,
  `Pelabuhan` varchar(150) DEFAULT NULL,
  `NamaNegara_Raw` varchar(150) DEFAULT NULL,
  `row_hash` char(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `data_perdagangan_full_v3`
--
ALTER TABLE `data_perdagangan_full_v3`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_data` (`nama_negara`,`kode_hs`,`product_label`,`status`);

--
-- Indexes for table `perusahaan`
--
ALTER TABLE `perusahaan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_siinas` (`id_siinas`),
  ADD KEY `idx_siinas` (`id_siinas`);

--
-- Indexes for table `tbnegara`
--
ALTER TABLE `tbnegara`
  ADD PRIMARY KEY (`No`) USING BTREE,
  ADD KEY `Kode_Alpha3` (`Kode_Alpha3`) USING BTREE;

--
-- Indexes for table `tbsumber`
--
ALTER TABLE `tbsumber`
  ADD PRIMARY KEY (`KodeSumber`) USING BTREE;

--
-- Indexes for table `tbtrade`
--
ALTER TABLE `tbtrade`
  ADD PRIMARY KEY (`ID`) USING BTREE,
  ADD KEY `Kode_Alpha3_Reporter` (`Kode_Alpha3_Reporter`,`Kode_Alpha3_Partner`,`ID_Sektor`,`KodeSumber`) USING BTREE,
  ADD KEY `Kode_Alpha3_Reporter_2` (`Kode_Alpha3_Reporter`) USING BTREE,
  ADD KEY `idx_hash` (`row_hash`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `data_perdagangan_full_v3`
--
ALTER TABLE `data_perdagangan_full_v3`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `perusahaan`
--
ALTER TABLE `perusahaan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbnegara`
--
ALTER TABLE `tbnegara`
  MODIFY `No` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=198;

--
-- AUTO_INCREMENT for table `tbtrade`
--
ALTER TABLE `tbtrade`
  MODIFY `ID` bigint NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
