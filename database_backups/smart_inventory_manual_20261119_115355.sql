-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: smart_inventory
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `alert_type` enum('OUT_OF_STOCK','LOW_STOCK','REORDER','EXPIRING') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `store_id` int(11) NOT NULL,
  PRIMARY KEY (`alert_id`),
  KEY `product_id` (`product_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alerts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alerts`
--

LOCK TABLES `alerts` WRITE;
/*!40000 ALTER TABLE `alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `log_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `actor_user_id` int(11) DEFAULT NULL,
  `actor_name` varchar(150) DEFAULT NULL,
  `actor_role` varchar(30) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `event_category` varchar(80) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `details` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  KEY `idx_audit_logs_category` (`event_category`),
  KEY `idx_audit_logs_actor` (`actor_user_id`),
  KEY `idx_audit_logs_store` (`store_id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,7,'Juan Dela Cruz','OWNER',2,'INVENTORY','INVENTORY_DEACTIVATED','INVENTORY','6','Deactivated inventory item: 7','{\"old_data\": {\"inventory_id\": 6, \"product_id\": 7, \"stock_quantity\": 0, \"is_active\": 1}, \"new_data\": null}','2026-10-15 13:00:40'),(2,7,'juanowner','OWNER',2,'USERS','USER_DEACTIVATED','USER','12','Deactivated staff user: teststaff','{\"old_data\": null, \"new_data\": {\"is_active\": 0}}','2026-10-15 13:22:39'),(3,7,'juanowner','OWNER',2,'INVENTORY','INVENTORY_DEACTIVATED','INVENTORY','7','Deactivated inventory item: K&N Motorcycle Oil Filter: High Performance  Premium  Designed to be used with Synthetic or Conventional Oils: Fits Select Honda  Kawasaki  Triumph  Y','{\"old_data\": {\"inventory_id\": 7, \"product_id\": 8, \"product_name\": \"K&N Motorcycle Oil Filter: High Performance  Premium  Designed to be used with Synthetic or Conventional Oils: Fits Select Honda  Kawasaki  Triumph  Y\", \"stock_quantity\": 0, \"is_active\": 1}, \"new_data\": {\"is_active\": 0}}','2026-10-15 13:23:35'),(4,7,'juanowner','OWNER',2,'INVENTORY','INVENTORY_PERMANENTLY_DELETED','INVENTORY','7','Permanently deleted inventory record for product: K&N Motorcycle Oil Filter: High Performance  Premium  Designed to be used with Synthetic or Conventional Oils: Fits Select Honda  Kawasaki  Triumph  Y','{\"old_data\": {\"inventory_id\": 7, \"product_id\": 8, \"stock_quantity\": 0, \"is_active\": 0, \"product_name\": \"K&N Motorcycle Oil Filter: High Performance  Premium  Designed to be used with Synthetic or Conventional Oils: Fits Select Honda  Kawasaki  Triumph  Y\"}, \"new_data\": {\"inventory_record_deleted\": true, \"product_moved_to_trash\": true}}','2026-10-15 13:50:29'),(5,7,'juanowner','OWNER',2,'INVENTORY','INVENTORY_PERMANENTLY_DELETED','INVENTORY','6','Permanently deleted inventory record for product: K&N Performance Powersports Oil Filter','{\"old_data\": {\"inventory_id\": 6, \"product_id\": 7, \"stock_quantity\": 0, \"is_active\": 0, \"product_name\": \"K&N Performance Powersports Oil Filter\"}, \"new_data\": {\"inventory_record_deleted\": true, \"product_moved_to_trash\": true}}','2026-10-15 13:50:34'),(6,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','4','Added category: Lightings','{\"old_data\": null, \"new_data\": {\"category_name\": \"Lightings\", \"description\": \"\"}}','2026-10-15 15:42:32'),(7,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','5','Added category: Electrical Accessories','{\"old_data\": null, \"new_data\": {\"category_name\": \"Electrical Accessories\", \"description\": \"\"}}','2026-10-15 15:43:39'),(8,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','6','Added category: Cables and Control','{\"old_data\": null, \"new_data\": {\"category_name\": \"Cables and Control\", \"description\": \"\"}}','2026-10-15 15:43:51'),(9,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','7','Added category: Air Intake','{\"old_data\": null, \"new_data\": {\"category_name\": \"Air Intake\", \"description\": \"\"}}','2026-10-15 15:43:59'),(10,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','8','Added category: Mirror','{\"old_data\": null, \"new_data\": {\"category_name\": \"Mirror\", \"description\": \"Accessories\"}}','2026-10-15 15:44:18'),(11,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','9','Added category: Control and Switches','{\"old_data\": null, \"new_data\": {\"category_name\": \"Control and Switches\", \"description\": \"turn signal and etc\"}}','2026-10-15 15:45:05'),(12,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','10','Added category: Oil filter','{\"old_data\": null, \"new_data\": {\"category_name\": \"Oil filter\", \"description\": \"\"}}','2026-10-15 15:45:30'),(13,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','11','Added category: Ignition','{\"old_data\": null, \"new_data\": {\"category_name\": \"Ignition\", \"description\": \"\"}}','2026-10-15 15:45:39'),(14,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','12','Added category: Batteries','{\"old_data\": null, \"new_data\": {\"category_name\": \"Batteries\", \"description\": \"\"}}','2026-10-15 15:45:48'),(15,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','13','Added category: Drive Chain & Sprockets','{\"old_data\": null, \"new_data\": {\"category_name\": \"Drive Chain & Sprockets\", \"description\": \"\"}}','2026-10-15 15:46:05'),(16,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','9','Added product: Starter Battery','{\"old_data\": null, \"new_data\": {\"product_name\": \"Starter Battery\", \"sku\": \"SB-001\", \"category_id\": 12, \"selling_price\": 260.0, \"reorder_level\": 5}}','2026-10-15 15:47:37'),(17,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','10','Added product: NGK Standard Plug  NG6955','{\"old_data\": null, \"new_data\": {\"product_name\": \"NGK Standard Plug  NG6955\", \"sku\": \"SP-001\", \"category_id\": 11, \"selling_price\": 100.0, \"reorder_level\": 35}}','2026-10-15 15:48:29'),(18,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','11','Added product: 32yb16ba1 - Battery Yuasa Yb16ba-1 Conventional','{\"old_data\": null, \"new_data\": {\"product_name\": \"32yb16ba1 - Battery Yuasa Yb16ba-1 Conventional\", \"sku\": \"B-001\", \"category_id\": 12, \"selling_price\": 256.15, \"reorder_level\": 8}}','2026-10-15 15:50:05'),(19,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','12','Added product: Starter Battery','{\"old_data\": null, \"new_data\": {\"product_name\": \"Starter Battery\", \"sku\": \"SP-002\", \"category_id\": 12, \"selling_price\": 599.83, \"reorder_level\": 5}}','2026-10-15 15:51:21'),(20,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','13','Added product: Brake Pad Set, disc brake','{\"old_data\": null, \"new_data\": {\"product_name\": \"Brake Pad Set, disc brake\", \"sku\": \"ST-001\", \"category_id\": 1, \"selling_price\": 1000.0, \"reorder_level\": 10}}','2026-10-15 15:53:19'),(21,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','14','Added product: Spark Plug','{\"old_data\": null, \"new_data\": {\"product_name\": \"Spark Plug\", \"sku\": \"SP-003\", \"category_id\": 11, \"selling_price\": 120.0, \"reorder_level\": 10}}','2026-10-15 15:54:12'),(22,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','15','Added product: Ebc Fa115 Performance Brake Pad Set','{\"old_data\": null, \"new_data\": {\"product_name\": \"Ebc Fa115 Performance Brake Pad Set\", \"sku\": \"BP-003\", \"category_id\": 1, \"selling_price\": 367.0, \"reorder_level\": 11}}','2026-10-15 15:57:24'),(23,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','16','Added product: Hiflofiltro HFA3617 Premium OE Replacement Air Filter','{\"old_data\": null, \"new_data\": {\"product_name\": \"Hiflofiltro HFA3617 Premium OE Replacement Air Filter\", \"sku\": \"AF-001\", \"category_id\": 7, \"selling_price\": 300.0, \"reorder_level\": 15}}','2026-10-15 16:08:17'),(24,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','17','Added product: Brake Pad Set, disc brake','{\"old_data\": null, \"new_data\": {\"product_name\": \"Brake Pad Set, disc brake\", \"sku\": \"BP-004\", \"category_id\": 1, \"selling_price\": 599.84, \"reorder_level\": 15}}','2026-10-15 16:09:39'),(25,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','18','Added product: Vicma Mirror Rearview Right Mbk Ovetto 50 (2000-2012)','{\"old_data\": null, \"new_data\": {\"product_name\": \"Vicma Mirror Rearview Right Mbk Ovetto 50 (2000-2012)\", \"sku\": \"MR-001\", \"category_id\": 8, \"selling_price\": 149.88, \"reorder_level\": 20}}','2026-10-15 16:11:09'),(26,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','19','Added product: Vicma Mirror Rearview Right Husaberg 570 All Years','{\"old_data\": null, \"new_data\": {\"product_name\": \"Vicma Mirror Rearview Right Husaberg 570 All Years\", \"sku\": \"MR-002\", \"category_id\": 8, \"selling_price\": 160.0, \"reorder_level\": 10}}','2026-10-15 16:12:14'),(27,7,'juanowner','OWNER',2,'CATEGORY','CATEGORY_ADDED','CATEGORY','14','Added category: Tires','{\"old_data\": null, \"new_data\": {\"category_name\": \"Tires\", \"description\": \"Rear and back\"}}','2026-10-15 16:14:05'),(28,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','20','Added product: EBC Carbon X Brake Pads FA116X','{\"old_data\": null, \"new_data\": {\"product_name\": \"EBC Carbon X Brake Pads FA116X\", \"sku\": \"BP-005\", \"category_id\": 1, \"selling_price\": 250.0, \"reorder_level\": 20}}','2026-10-15 16:16:45'),(29,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','21','Added product: K&N Performance Powersports Oil Filter','{\"old_data\": null, \"new_data\": {\"product_name\": \"K&N Performance Powersports Oil Filter\", \"sku\": \"OF-001\", \"category_id\": 10, \"selling_price\": 300.0, \"reorder_level\": 20}}','2026-10-15 16:24:40'),(30,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','22','Added product: K&N Motorcycle Oil Filter','{\"old_data\": null, \"new_data\": {\"product_name\": \"K&N Motorcycle Oil Filter\", \"sku\": \"OF-002\", \"category_id\": 10, \"selling_price\": 300.0, \"reorder_level\": 10}}','2026-10-15 16:26:00'),(31,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','23','Added product: K&N Performance Powersports Oil Filter','{\"old_data\": null, \"new_data\": {\"product_name\": \"K&N Performance Powersports Oil Filter\", \"sku\": \"OF-003\", \"category_id\": 10, \"selling_price\": 350.0, \"reorder_level\": 10}}','2026-10-15 16:27:11'),(32,7,'juanowner','OWNER',2,'INVENTORY','STOCK_IN','INVENTORY','23','Stock in: K&N Performance Powersports Oil Filter — +20 units (0 → 20)','{\"old_data\": {\"stock_quantity\": 0}, \"new_data\": {\"stock_quantity\": 20, \"quantity\": 20, \"reason\": \"SUPPLIER\", \"remarks\": \"\"}}','2026-10-15 16:27:45'),(33,7,'juanowner','OWNER',2,'INVENTORY','STOCK_OUT','INVENTORY','23','Stock out: K&N Performance Powersports Oil Filter — -20 units (20 → 0)','{\"old_data\": {\"stock_quantity\": 20}, \"new_data\": {\"stock_quantity\": 0, \"quantity\": 20, \"reason\": \"DAMAGED\", \"remarks\": \"\"}}','2026-10-16 01:21:50'),(34,7,'juanowner','OWNER',2,'USERS','USER_LOGIN','AUTH','7','juanowner signed in.',NULL,'2026-11-18 15:00:54'),(35,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_ADDED','PRODUCT','24','Added product: belt','{\"old_data\": null, \"new_data\": {\"product_name\": \"belt\", \"sku\": \"B-002\", \"category_id\": 14, \"selling_price\": 100.0, \"reorder_level\": 10}}','2026-11-18 15:03:46'),(36,7,'juanowner','OWNER',2,'PRODUCT','PRODUCT_EDITED','PRODUCT','24','Edited product: belt','{\"old_data\": null, \"new_data\": {\"product_name\": \"belt\", \"sku\": \"B-002\", \"category_id\": 14, \"selling_price\": 100.0, \"reorder_level\": 10}}','2026-11-18 15:03:55'),(37,7,'juanowner','OWNER',2,'USERS','USER_LOGIN','AUTH','7','juanowner signed in.',NULL,'2026-11-18 16:38:02'),(38,7,'juanowner','OWNER',2,'USERS','USER_LOGIN','AUTH','7','juanowner signed in.',NULL,'2026-11-18 17:36:33'),(39,7,'juanowner','OWNER',2,'INVENTORY','STOCK_IN','INVENTORY','24','Stock in: belt — +19 units (0 → 19)','{\"old_data\": {\"stock_quantity\": 0}, \"new_data\": {\"stock_quantity\": 19, \"quantity\": 19, \"reason\": \"SUPPLIER\", \"reference_number\": \"\", \"remarks\": \"\"}}','2026-11-18 17:37:23'),(40,7,'juanowner','OWNER',2,'INVENTORY','STOCK_OUT','INVENTORY','24','Stock out: belt — -1 units (19 → 18)','{\"old_data\": {\"stock_quantity\": 19}, \"new_data\": {\"stock_quantity\": 18, \"quantity\": 1, \"reason\": \"SALE\", \"reference_number\": \"\", \"remarks\": \"\"}}','2026-11-18 17:37:37'),(41,7,'juanowner','OWNER',2,'INVENTORY','STOCK_IN','INVENTORY','24','Stock in: belt — +10 units (18 → 28)','{\"old_data\": {\"stock_quantity\": 18}, \"new_data\": {\"stock_quantity\": 28, \"quantity\": 10, \"reason\": \"SUPPLIER\", \"reference_number\": \"\", \"remarks\": \"\"}}','2026-11-18 18:09:10'),(42,7,'juanowner','OWNER',2,'INVENTORY','STOCK_OUT','INVENTORY','24','Stock out: belt — -2 units (28 → 26)','{\"old_data\": {\"stock_quantity\": 28}, \"new_data\": {\"stock_quantity\": 26, \"quantity\": 2, \"reason\": \"SALE\", \"reference_number\": \"\", \"remarks\": \"\"}}','2026-11-18 18:09:18'),(43,7,'juanowner','OWNER',2,'USERS','USER_LOGOUT','AUTH','7','juanowner signed out.',NULL,'2026-11-18 18:24:57'),(44,7,'juanowner','OWNER',2,'USERS','USER_LOGIN','AUTH','7','juanowner signed in.',NULL,'2026-11-18 18:25:10'),(45,6,'kenedy delacruz','ADMIN',NULL,'USERS','USER_LOGIN','AUTH','6','admin signed in.',NULL,'2026-11-19 03:30:35');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `batches` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `batch_number` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`batch_id`),
  KEY `product_id` (`product_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_batches_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_batches_purchase_price` CHECK (`purchase_price` is null or `purchase_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batches`
--

LOCK TABLES `batches` WRITE;
/*!40000 ALTER TABLE `batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `store_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`category_id`),
  KEY `fk_categories_store` (`store_id`),
  CONSTRAINT `fk_categories_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Brake System','Item brake components',2,1,'2026-09-10 01:35:37','2026-10-01 10:18:59'),(2,'Engine Oil','Engine Oil',2,1,'2026-09-10 02:56:45','2026-10-01 10:19:01'),(3,'brake','ala',2,0,'2026-09-24 15:29:42','2026-10-01 10:44:50'),(4,'Lightings','',2,1,'2026-10-15 15:42:32','2026-10-15 15:42:32'),(5,'Electrical Accessories','',2,1,'2026-10-15 15:43:39','2026-10-15 15:43:39'),(6,'Cables and Control','',2,1,'2026-10-15 15:43:51','2026-10-15 15:43:51'),(7,'Air Intake','',2,1,'2026-10-15 15:43:59','2026-10-15 15:43:59'),(8,'Mirror','Accessories',2,1,'2026-10-15 15:44:18','2026-10-15 15:44:18'),(9,'Control and Switches','turn signal and etc',2,1,'2026-10-15 15:45:05','2026-10-15 15:45:05'),(10,'Oil filter','',2,1,'2026-10-15 15:45:30','2026-10-15 15:45:30'),(11,'Ignition','',2,1,'2026-10-15 15:45:39','2026-10-15 15:45:39'),(12,'Batteries','',2,1,'2026-10-15 15:45:48','2026-10-15 15:45:48'),(13,'Drive Chain & Sprockets','',2,1,'2026-10-15 15:46:05','2026-10-15 15:46:05'),(14,'Tires','Rear and back',2,1,'2026-10-15 16:14:05','2026-10-15 16:14:05');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demand_records`
--

DROP TABLE IF EXISTS `demand_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `demand_records` (
  `demand_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `quantity_demanded` int(11) NOT NULL,
  `demand_date` date NOT NULL,
  `source` enum('HISTORICAL_RECORD','DAILY_RECORD') NOT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`demand_id`),
  UNIQUE KEY `product_id` (`product_id`,`demand_date`,`source`,`store_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `demand_records_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_demand_records_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_demand_quantity` CHECK (`quantity_demanded` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `demand_records`
--

LOCK TABLES `demand_records` WRITE;
/*!40000 ALTER TABLE `demand_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `demand_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `store_id` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `uq_inventory_product_store` (`product_id`,`store_id`),
  KEY `fk_inventory_store` (`store_id`),
  CONSTRAINT `fk_inventory_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_stock` CHECK (`stock_quantity` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (9,9,0,1,2,'2026-10-15 15:47:37'),(10,10,0,1,2,'2026-10-15 15:48:29'),(11,11,0,1,2,'2026-10-15 15:50:05'),(12,12,0,1,2,'2026-10-15 15:51:21'),(13,13,0,1,2,'2026-10-15 15:53:19'),(14,14,0,1,2,'2026-10-15 15:54:12'),(15,15,0,1,2,'2026-10-15 15:57:24'),(16,16,0,1,2,'2026-10-15 16:08:17'),(17,17,0,1,2,'2026-10-15 16:09:39'),(18,18,0,1,2,'2026-10-15 16:11:09'),(19,19,0,1,2,'2026-10-15 16:12:14'),(20,20,0,1,2,'2026-10-15 16:16:45'),(21,21,0,1,2,'2026-10-15 16:24:40'),(22,22,0,1,2,'2026-10-15 16:26:00'),(23,23,0,1,2,'2026-10-16 01:21:50'),(24,24,26,1,2,'2026-11-18 18:09:18');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_brands`
--

DROP TABLE IF EXISTS `item_brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_brands` (
  `brand_id` int(11) NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(100) NOT NULL,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `brand_name` (`brand_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_brands`
--

LOCK TABLES `item_brands` WRITE;
/*!40000 ALTER TABLE `item_brands` DISABLE KEYS */;
INSERT INTO `item_brands` VALUES (6,'BETA'),(4,'HONDA'),(3,'KAWASAKI'),(5,'SUZUKI'),(1,'TRIUMPH'),(2,'YAMAHA');
/*!40000 ALTER TABLE `item_brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_models`
--

DROP TABLE IF EXISTS `item_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_models` (
  `model_id` int(11) NOT NULL AUTO_INCREMENT,
  `brand_id` int(11) NOT NULL,
  `model_name` varchar(100) NOT NULL,
  `model_year` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`model_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `item_models_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `item_brands` (`brand_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_models`
--

LOCK TABLES `item_models` WRITE;
/*!40000 ALTER TABLE `item_models` DISABLE KEYS */;
INSERT INTO `item_models` VALUES (1,1,'THUNDERBIRD',NULL),(2,1,'TROPHY',NULL),(3,2,'FJR',NULL),(4,2,'XVS',NULL),(5,3,'Z ( - 899cc)',NULL),(6,3,'GPZ',NULL),(7,3,'VN',NULL),(8,1,'DAYTONA',NULL),(9,1,'BONNEVILLE',NULL),(10,3,'W',NULL),(11,2,'YZF-R',NULL),(12,4,'XL',NULL),(13,1,'THRUXTON',NULL),(14,4,'VTR',NULL),(15,3,'ER',NULL),(16,3,'Z (900cc - )',NULL),(17,3,'NINJA (751cc - )',NULL),(18,1,'SPEED',NULL),(19,1,'SPRINT',NULL),(20,2,'XSR',NULL),(21,1,'AMERICA',NULL),(22,4,'CB HORNET',NULL),(23,4,'VT',NULL),(24,1,'LEGEND',NULL),(25,2,'FZ',NULL),(26,4,'CB (501cc - )',NULL),(27,4,'CBR ( - 600cc)',NULL),(28,4,'CBR (601cc - )',NULL),(29,4,'VFR',NULL),(30,4,'GL',NULL),(31,4,'NC',NULL),(32,4,'NC INTEGRA',NULL),(33,1,'SPEEDMASTER',NULL),(34,1,'SCRAMBLER',NULL),(35,1,'STREET',NULL),(36,2,'MT',NULL),(37,3,'NINJA (501cc - 750cc)',NULL),(38,2,'XJ',NULL),(39,2,'XT',NULL),(40,4,'CBF',NULL),(41,1,'ROCKET',NULL),(42,1,'TIGER (1000cc - )',NULL),(43,4,'DN-01',NULL),(44,4,'NSS',NULL),(45,4,'NT',NULL),(46,4,'SH',NULL),(47,4,'FJS',NULL),(48,4,'ST',NULL),(49,1,'TIGER ( - 999cc)',NULL),(50,4,'VTX',NULL),(51,5,'VZ',NULL),(52,4,'SILVERWING',NULL),(53,4,'CTX',NULL),(54,4,'CB (251cc - 500cc)',NULL),(55,4,'CRF',NULL),(56,4,'CB ( - 250cc)',NULL),(57,2,'SCR',NULL),(58,1,'STREET CUP',NULL),(59,4,'X-ADV',NULL),(60,4,'CMX',NULL),(61,2,'TENERE',NULL),(62,2,'TRACER',NULL),(63,5,'AN BURGMAN',NULL),(64,2,'YP',NULL),(65,5,'DR',NULL),(66,5,'VANVAN',NULL),(67,6,'ALP',NULL);
/*!40000 ALTER TABLE `item_models` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_history` (
  `login_history_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `login_status` enum('SUCCESS','FAILED') NOT NULL,
  `failure_reason` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`login_history_id`),
  KEY `idx_login_history_user` (`user_id`),
  KEY `idx_login_history_status` (`login_status`),
  KEY `idx_login_history_attempted_at` (`attempted_at`),
  CONSTRAINT `fk_login_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_history`
--

LOCK TABLES `login_history` WRITE;
/*!40000 ALTER TABLE `login_history` DISABLE KEYS */;
INSERT INTO `login_history` VALUES (1,7,'juanowner','FAILED','Incorrect password','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36','2026-11-18 18:25:04'),(2,7,'juanowner','SUCCESS',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36','2026-11-18 18:25:10'),(3,6,'admin','SUCCESS',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36','2026-11-19 03:30:35');
/*!40000 ALTER TABLE `login_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_compatibility`
--

DROP TABLE IF EXISTS `product_compatibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_compatibility` (
  `compatibility_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `model_id` int(11) NOT NULL,
  PRIMARY KEY (`compatibility_id`),
  UNIQUE KEY `product_id` (`product_id`,`model_id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `product_compatibility_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_compatibility_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `item_models` (`model_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_compatibility`
--

LOCK TABLES `product_compatibility` WRITE;
/*!40000 ALTER TABLE `product_compatibility` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_compatibility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(150) NOT NULL,
  `image_url` text DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `product_type` varchar(150) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `reorder_level` int(11) NOT NULL DEFAULT 10,
  `description` text DEFAULT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`,`store_id`),
  KEY `category_id` (`category_id`),
  KEY `idx_products_store_barcode` (`store_id`,`barcode`),
  CONSTRAINT `fk_products_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_products_selling_price` CHECK (`selling_price` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (9,'Starter Battery','https://fsn1.your-objectstorage.com/autopartscatalog2026v2/media_files/images/4451/2768765ed0840b71564959c4289a86193fd0bd3b.webp','SB-001','5050694031946','YT19BL-BS',NULL,'Yuasa',12,260.00,5,NULL,2,'2026-10-15 15:47:37',1,'2026-10-15 15:47:37'),(10,'NGK Standard Plug  NG6955','https://i5.walmartimages.com/asr/5f6e4b89-e64f-4601-b6d9-6c929329082f.48a1b700e2a45c010e68156bed919932.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','SP-001','0087295169551','6955',NULL,'NGK',11,100.00,35,'NGK Standard spark plugs are OE approved and recommended for reliable performance for most automotive and non-automotive applications. NGK Standard spark plugs feature a 5-Rib insulator design to prevent flashover and are also treated with corrosion-resistant plating to ensure ease of installation and removal. Cold rolled threads prevent damage to cylinder head. NGK s triple gasket sealing process virtually eliminates gas leakage past the shell. Solid Copper Core provides superior heat dissipation  conductivity and a broader heat range.',2,'2026-10-15 15:48:29',1,'2026-10-15 15:48:29'),(11,'32yb16ba1 - Battery Yuasa Yb16ba-1 Conventional','https://cdn.mscdirect.com/global/images/ProductImages/7312792-23.jpg','B-001','5050694005589','73127920',NULL,'Yuasa',12,256.15,8,NULL,2,'2026-10-15 15:50:05',1,'2026-10-15 15:50:05'),(12,'Starter Battery','https://fsn1.your-objectstorage.com/autopartscatalog2026v2/media_files/images/4895/387f791591a93e01a8d90dd2d2b0d1e87712e788.webp','SP-002','9313857335838','151129',NULL,'Century Everide',12,599.83,5,NULL,2,'2026-10-15 15:51:21',1,'2026-10-15 15:51:21'),(13,'Brake Pad Set, disc brake','https://fsn1.your-objectstorage.com/autopartscatalog2026v2/media_files/images/65/27a6c15cedb464fc49bf7458a6f32494b6ba4ba6.webp','ST-001','8020584636121','07KA1617',NULL,'BAER MANUFACTURING, LLC',1,1000.00,10,NULL,2,'2026-10-15 15:53:19',1,'2026-10-15 15:53:19'),(14,'Spark Plug','https://i5.walmartimages.com/asr/206d1d92-96bf-4712-98b0-0932acca7ad9.f07ded5dbabce9f90b4d08372597fa0e.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','SP-003','0087295175484','7548',NULL,'NGK',11,120.00,10,'NGK V-Power Spark Plug',2,'2026-10-15 15:54:12',1,'2026-10-15 15:54:12'),(15,'Ebc Fa115 Performance Brake Pad Set','https://images.baer.com/49d97fe0eee45203320cf2e0d64fe0f2fdfdaa98.jpg','BP-003','5050953001284','D1058R',NULL,'EBC',1,367.00,11,'X-ref: Vd 254, Vd925, Fa 115, Sfa115, Dp607',2,'2026-10-15 15:57:24',1,'2026-10-15 15:57:24'),(16,'Hiflofiltro HFA3617 Premium OE Replacement Air Filter','https://i5.walmartimages.com/asr/e48ea9ae-36d9-491b-a25a-e3dad8745b50.4bd5797645ca172017d104e4aa74e1ec.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','AF-001','00824225122275','HFA3617',NULL,'Hiflo',7,300.00,15,'Hiflofiltro air filters are manufactured to fit the factory air box and are a direct replacement for original equipment filters. Using top quality powerflow filtering media  developed for modern high performance engines  these filters meet or exceed OEM s',2,'2026-10-15 16:08:17',1,'2026-10-15 16:08:17'),(17,'Brake Pad Set, disc brake','https://fsn1.your-objectstorage.com/autopartscatalog2026v2/media_files/images/4986/b30e4e70bd2c395d5330959643ceb449246c0658.webp','BP-004','4044197836611','FDB497EF',NULL,'Ferodo',1,599.84,15,NULL,2,'2026-10-15 16:09:39',1,'2026-10-15 16:09:39'),(18,'Vicma Mirror Rearview Right Mbk Ovetto 50 (2000-2012)',NULL,'MR-001','8430525032286',NULL,NULL,'Vicma',8,149.88,20,NULL,2,'2026-10-15 16:11:09',1,'2026-10-15 16:11:09'),(19,'Vicma Mirror Rearview Right Husaberg 570 All Years',NULL,'MR-002','8430525137653',NULL,NULL,'Vicma',8,160.00,10,NULL,2,'2026-10-15 16:12:14',1,'2026-10-15 16:12:14'),(20,'EBC Carbon X Brake Pads FA116X','https://i5.walmartimages.com/asr/63baaa39-2ac0-47a4-a027-3e87e5af50ad_1.eb950cb3ab74a413e40432cb114a3a91.jpeg?odnHeight=450&odnWidth=450&odnBg=ffffff','BP-005','5050953001314','FA116X',NULL,'EBC Brakes',1,250.00,20,'EBC Carbon X Brake Pads FA116X',2,'2026-10-15 16:16:45',1,'2026-10-15 16:16:45'),(21,'K&N Performance Powersports Oil Filter','https://i5.walmartimages.com/asr/5055c1ae-73a3-4a94-9ea7-9d89ac7243d2.1c6cd9dcef27e525e63fef4031395fab.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','OF-001','024844084217','KN-138',NULL,'K&N',10,300.00,20,'K&N premium oil filters for powersports vehicles utilize an innovative  highly efficient synthetic-blend filtration media designed to be compatible with synthetic  petroleum-based  and blended oils  including the high concentrations of synthetic racing oils. The heavy-duty canister is engineered to be exceptionally durable  and a 17mm welded hex nut can be used for quick and easy filter removal. Engineered to support exceptionally high flow rates while providing outstanding protection from harmful engine contaminants  each filter is specifically designed to withstand the service intervals recommended by vehicle manufacturers. Vehicle Fitment: 2016-2018 Husqvarna FR450 Rally; 2017-2018 KTM 1090 Adventure; 2018 KTM 1090 Adventure L; 2017-2018 KTM 1090 Adventure R; 2017-2018 KTM 1290 Super Adventure R; 2017-2018 KTM 1290 Super Adventure S; 2016-2018 KTM 1290 Super Duke GT; 2014-2018 KTM 1290 Super Duke R; 2018 KTM 790 Duke; 2017 KTM 1290 Super Adventure T; 2011-2017 KTM 450 Rally Factory Replica; 2015-2016 KTM',2,'2026-10-15 16:24:40',1,'2026-10-15 16:24:40'),(22,'K&N Motorcycle Oil Filter','https://i5.walmartimages.com/asr/6828fde2-ffec-4a88-b25c-5ea88581e7b6.9d58e4e2ae80e19f631b45fb7a098b38.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','OF-002','024844368140','KN-204-1',NULL,'K&N',10,300.00,10,'K&N premium oil filters for powersports vehicles utilize an innovative  highly efficient synthetic-blend filtration media designed to be compatible with synthetic  petroleum-based  and blended oils  including the high concentrations of synthetic racing oils. The heavy-duty canister is engineered to be exceptionally durable  and a 17mm welded hex nut can be used for quick and easy filter removal. Engineered to support exceptionally high flow rates while providing outstanding protection from harmful engine contaminants  each filter is specifically designed to withstand the service intervals recommended by vehicle manufacturers  and is protected by the K&N 1-Year Limited Warranty. Vehicle Fitment: 2016-2018 HUSQVARNA FR450 Rally; 2017-2018 KTM 1090 Adventure; 2018 KTM 1090 Adventure L; 2017-2018 KTM 1090 Adventure R; 2017-2018 KTM 1290 Super Adventure R; 2017-2018 KTM 1290 Super Adventure S; 2016-2018 KTM 1290 Super Duke GT; 2014-2018 KTM 1290 Super Duke R; 2018 KTM 790 Duke; 2017 KTM 1290 Super Adventure T; 20',2,'2026-10-15 16:26:00',1,'2026-10-15 16:26:00'),(23,'K&N Performance Powersports Oil Filter','https://i5.walmartimages.com/asr/b6409d88-7fe3-41fe-ba69-9ee43c45a1d4.fd9cdee5a53313699a99adabe513cd8b.jpeg?odnHeight=2000&odnWidth=2000&odnBg=ffffff','OF-003','024844084163','KN-132',NULL,'K&N',10,350.00,10,'K&N Powersports Cartridge Oil Filters are designed to satisfy the needs of racers and engine builders as well as the average motorcycle or ATV owner who wants the best oil filter available. K&N Powersports Oil Filters trap harmful contaminants while the filter s construction allows for high oil flow rates. K&N Oil Filters are covered by a limited warranty to be free from defects in materials and workmanship when installed and replaced using engine and equipment manufacturer s recommended service intervals....',2,'2026-10-15 16:27:11',1,'2026-10-15 16:27:11'),(24,'belt','/uploads/products/2504bfd6cb884eeab58bcd492bd3f09a.png','B-002',NULL,'12345','belt',NULL,14,100.00,10,'belt for automatic',2,'2026-11-18 15:03:46',1,'2026-11-18 15:03:55');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `purchase_order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `ordered_quantity` int(11) NOT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `received_quantity` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`purchase_order_item_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_po_ordered_quantity` CHECK (`ordered_quantity` > 0),
  CONSTRAINT `chk_po_purchase_price` CHECK (`purchase_price` is null or `purchase_price` >= 0),
  CONSTRAINT `chk_po_received_quantity` CHECK (`received_quantity` >= 0 and `received_quantity` <= `ordered_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_po_items_before_insert
BEFORE INSERT ON purchase_order_items
FOR EACH ROW
BEGIN
    IF NEW.ordered_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ordered quantity must be greater than zero';
    END IF;

    IF NEW.received_quantity < 0
       OR NEW.received_quantity > NEW.ordered_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Received quantity must be between zero and ordered quantity';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_po_items_before_update
BEFORE UPDATE ON purchase_order_items
FOR EACH ROW
BEGIN
    IF NEW.ordered_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ordered quantity must be greater than zero';
    END IF;

    IF NEW.received_quantity < 0
       OR NEW.received_quantity > NEW.ordered_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Received quantity must be between zero and ordered quantity';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `purchase_order_receiving_history`
--

DROP TABLE IF EXISTS `purchase_order_receiving_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_receiving_history` (
  `receiving_id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int(11) NOT NULL,
  `purchase_order_item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `received_quantity` int(11) NOT NULL,
  `purchase_price` decimal(10,2) NOT NULL,
  `expiry_date` date NOT NULL,
  `stock_in_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `store_id` int(11) NOT NULL,
  `received_date` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`receiving_id`),
  KEY `idx_receiving_po` (`purchase_order_id`),
  KEY `idx_receiving_item` (`purchase_order_item_id`),
  KEY `idx_receiving_product_store` (`product_id`,`store_id`),
  KEY `idx_receiving_store_date` (`store_id`,`received_date`),
  KEY `fk_receiving_stock_in` (`stock_in_id`),
  KEY `fk_receiving_batch` (`batch_id`),
  CONSTRAINT `fk_receiving_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`batch_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_receiving_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`purchase_order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_receiving_po_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`purchase_order_item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_receiving_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_receiving_stock_in` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in` (`stock_in_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_receiving_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_receiving_quantity` CHECK (`received_quantity` > 0),
  CONSTRAINT `chk_receiving_purchase_price` CHECK (`purchase_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_receiving_history`
--

LOCK TABLES `purchase_order_receiving_history` WRITE;
/*!40000 ALTER TABLE `purchase_order_receiving_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_receiving_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `purchase_order_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `order_date` date NOT NULL DEFAULT curdate(),
  `status` enum('PENDING','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  `store_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`purchase_order_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `store_id` (`store_id`),
  CONSTRAINT `fk_purchase_orders_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_in`
--

DROP TABLE IF EXISTS `stock_in`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_in` (
  `stock_in_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `stock_in_date` datetime DEFAULT current_timestamp(),
  `store_id` int(11) NOT NULL,
  PRIMARY KEY (`stock_in_id`),
  KEY `product_id` (`product_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `fk_stock_in_store` (`store_id`),
  KEY `idx_stock_in_product_store_date` (`product_id`,`store_id`,`stock_in_date`),
  CONSTRAINT `fk_stock_in_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_in_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_in_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_in_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_stock_in_purchase_price` CHECK (`purchase_price` is null or `purchase_price` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_in`
--

LOCK TABLES `stock_in` WRITE;
/*!40000 ALTER TABLE `stock_in` DISABLE KEYS */;
INSERT INTO `stock_in` VALUES (7,24,2,19,NULL,'2026-11-19 01:37:23',2),(8,24,2,10,NULL,'2026-11-19 02:09:10',2);
/*!40000 ALTER TABLE `stock_in` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_in_before_insert
BEFORE INSERT ON stock_in
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock-in quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_in_before_update
BEFORE UPDATE ON stock_in
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock-in quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_movements` (
  `movement_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `movement_type` enum('STOCK_IN','STOCK_OUT') NOT NULL,
  `quantity` int(11) NOT NULL,
  `previous_quantity` int(11) DEFAULT NULL,
  `new_quantity` int(11) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `movement_date` datetime DEFAULT current_timestamp(),
  `store_id` int(11) NOT NULL,
  PRIMARY KEY (`movement_id`),
  KEY `product_id` (`product_id`),
  KEY `fk_stock_movements_store` (`store_id`),
  KEY `idx_stock_movements_product_store_date` (`product_id`,`store_id`,`movement_date`),
  CONSTRAINT `fk_stock_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_movements_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_stock_movements_previous` CHECK (`previous_quantity` is null or `previous_quantity` >= 0),
  CONSTRAINT `chk_stock_movements_new` CHECK (`new_quantity` is null or `new_quantity` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (13,23,'STOCK_IN',20,0,20,'SUPPLIER',23,'','2026-10-16 00:27:45',2),(14,23,'STOCK_OUT',20,20,0,'DAMAGED',23,'','2026-10-16 09:21:50',2),(15,24,'STOCK_IN',19,0,19,'SUPPLIER',7,NULL,'2026-11-19 01:37:23',2),(16,24,'STOCK_OUT',1,19,18,'SALE',1,NULL,'2026-11-19 01:37:37',2),(17,24,'STOCK_IN',10,18,28,'SUPPLIER',8,NULL,'2026-11-19 02:09:10',2),(18,24,'STOCK_OUT',2,28,26,'SALE',2,NULL,'2026-11-19 02:09:18',2);
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_movements_before_insert
BEFORE INSERT ON stock_movements
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Movement quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_movements_before_update
BEFORE UPDATE ON stock_movements
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Movement quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stock_out`
--

DROP TABLE IF EXISTS `stock_out`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_out` (
  `stock_out_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` enum('SOLD','DAMAGED','DEFECTIVE','RETURNED_TO_SUPPLIER','LOST','OTHER') NOT NULL,
  `notes` text DEFAULT NULL,
  `stock_out_date` datetime DEFAULT current_timestamp(),
  `store_id` int(11) NOT NULL,
  `stock_out_reason` enum('DAMAGED','RETURN_TO_SUPPLIER','LOST','TRANSFER','OTHER') NOT NULL DEFAULT 'OTHER',
  PRIMARY KEY (`stock_out_id`),
  KEY `product_id` (`product_id`),
  KEY `store_id` (`store_id`),
  KEY `idx_stock_out_product_store_date` (`product_id`,`store_id`,`stock_out_date`),
  CONSTRAINT `fk_stock_out_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_out_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_out_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_out`
--

LOCK TABLES `stock_out` WRITE;
/*!40000 ALTER TABLE `stock_out` DISABLE KEYS */;
INSERT INTO `stock_out` VALUES (1,24,1,'SOLD','Reason: SALE','2026-11-19 01:37:37',2,'OTHER'),(2,24,2,'SOLD','Reason: SALE','2026-11-19 02:09:18',2,'OTHER');
/*!40000 ALTER TABLE `stock_out` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_out_before_insert
BEFORE INSERT ON stock_out
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock-out quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_stock_out_before_update
BEFORE UPDATE ON stock_out
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock-out quantity must be greater than zero';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stores`
--

DROP TABLE IF EXISTS `stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stores` (
  `store_id` int(11) NOT NULL AUTO_INCREMENT,
  `store_name` varchar(150) NOT NULL,
  `store_address` varchar(255) DEFAULT NULL,
  `store_contact` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`store_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES (2,'Juan Item Parts','Manila','09123456789','2026-09-07 18:28:28');
/*!40000 ALTER TABLE `stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(150) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `store_id` int(11) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`supplier_id`),
  KEY `fk_suppliers_store` (`store_id`),
  CONSTRAINT `fk_suppliers_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (2,'ABC Item Parts','Juan Dela Cruz','09171234567','abcparts@gmail.com','Bayombong, Nueva Vizcaya',2,NULL);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('OWNER','ADMIN','STAFF') NOT NULL DEFAULT 'STAFF',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `store_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_store` (`store_id`),
  CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`store_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_users_is_active` CHECK (`is_active` in (0,1))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (6,'kenedy delacruz','admin','kenedydelacruz15@example.com','scrypt:32768:8:1$qi8isngXn1m7sR6m$e32a3e4cdd0347b189be9861092b55d1580e1662260f29fe54ea702c71bfd347f3a4f8911cb9872d652ba631361fbf678b154b16ccdb05c0ac08c56eb95778f5','ADMIN',1,'2026-09-07 18:28:02','2026-09-07 18:28:02',NULL),(7,'Juan Dela Cruz','juanowner','juan@email.com','scrypt:32768:8:1$qNQPstLwu8LJtUvR$8a02c503d4086c08b49f81485a6d775fcac4f2a07126134f14cd6a122464b70817b9b3eff0b6c8ec50e296f38bf51cba3c64c2a2114e8b568988c22df1eb5cb9','OWNER',1,'2026-09-07 18:28:28','2026-09-07 18:28:28',2),(8,'juan tamad','juanstaff','juanstaff@gmail.com','scrypt:32768:8:1$FCV5NQjN7SMZMAEI$1e1b4a2a7f19f63539fd6d7704d5d890aec70f8a422aa9840a1aea2ab80552dea27bb82a452ca3377ca63bceda6a99e938ab0a8ee37af644cc717616103f8455','STAFF',1,'2026-09-24 13:18:07','2026-09-24 13:18:07',2);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'smart_inventory'
--

--
-- Dumping routines for database 'smart_inventory'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-19 11:53:56
