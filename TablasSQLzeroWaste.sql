CREATE DATABASE IF NOT EXISTS zerowaste_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE zerowaste_db;

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    precio DECIMAL(10,2),
    codigo_barras VARCHAR(32),
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE estado_caducidad (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    dias_min INT NOT NULL,
    dias_max INT NOT NULL
);

CREATE TABLE lista_compra (
    id_lista INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_lista VARCHAR(120) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE inventario (
    id_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_producto INT NOT NULL,
    id_estado INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    fecha_compra DATE,
    fecha_caducidad DATE NOT NULL,
    ubicacion VARCHAR(100),
    consumido BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    FOREIGN KEY (id_estado) REFERENCES estado_caducidad(id_estado)
);

CREATE TABLE item_lista_compra (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_lista INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    comprado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_lista) REFERENCES lista_compra(id_lista),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

INSERT INTO estado_caducidad (nombre_estado, color, dias_min, dias_max) VALUES
('Todo bien', 'Verde', 7, 3650),
('Consumir pronto', 'Amarillo', 3, 6),
('Caduca muy pronto', 'Rojo', -3650, 2);
