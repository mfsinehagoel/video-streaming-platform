# Video Streaming & Media Processing Platform

A video streaming and media processing platform built with Angular, Node.js, RabbitMQ, FFmpeg, MinIO, Redis, and MySQL.

## High-Level Architecture

![High-Level Architectural Diagram](https://github.com/user-attachments/assets/76c2d782-70b6-4e30-905e-408a25422e13)

## Tech Stack

### Frontend

* Angular
* TypeScript
* HTML
* CSS

### Backend

* Node.js
* Express
* TypeScript

### Database

* MySQL
* Sequelize ORM

### Storage

* MinIO
* S3-compatible object storage

### Message Queue

* RabbitMQ

### Caching

* Redis

### Video Processing

* FFmpeg
* FFprobe

### Reverse Proxy

* Nginx

### Containerization

* Docker
* Docker Compose

## Architecture Overview

The platform consists of the following major components:

* **Angular Frontend** — Provides the user interface for uploading, browsing, streaming, downloading, and managing videos.
* **Node.js / Express API** — Handles authentication, video uploads, metadata, video management, and API requests.
* **MySQL** — Stores users, videos, processing jobs, video variants, and related metadata.
* **MinIO** — Stores original videos and processed video files using S3-compatible object storage.
* **RabbitMQ** — Provides asynchronous job processing by sending video-processing tasks from the API to the worker.
* **Worker** — Processes videos in the background using FFmpeg and FFprobe.
* **FFprobe** — Extracts video metadata such as duration, resolution, and codec.
* **FFmpeg** — Generates thumbnails, transcodes videos into different qualities, and generates HLS output.
* **Redis** — Caches frequently requested data such as video lists and video metadata.
* **Nginx** — Acts as a reverse proxy and serves the Angular frontend.

## How to Start the Application

### Prerequisites

Make sure the following are installed:

* Docker
* Docker Compose

### Clone the Repository

```bash
git clone video-streaming-platform
cd video-streaming-platform
```

### Start All Services

Build the images and start all services:

```bash
docker compose up --build
```

To run the application in detached mode:

```bash
docker compose up --build -d
```

## Check Running Containers

To check the status of the services:

```bash
docker compose ps
```

You can also use:

```bash
docker ps
```

Expected services include:

* `frontend`
* `api`
* `worker`
* `nginx`
* `mysql`
* `redis`
* `rabbitmq`
* `minio`

## View Service Logs

To view logs for a specific service:

```bash
docker compose logs -f api
```

For the background worker:

```bash
docker compose logs -f worker
```

For all services:

```bash
docker compose logs -f
```

## Stop the Application

To stop the running services:

```bash
docker compose down
```

To stop the services and remove associated volumes:

```bash
docker compose down -v
```

### Accessing Services

Nginx acts as the reverse proxy, so both the frontend and API can be accessed through the same host port (`8081`).

The backend API requests are routed through Nginx using the `8081/api/` path, whereas frontend routes are accessed directly with `8081`.

* **Frontend:** `http://localhost:8081`
* **Backend API:** `http://localhost:8081`
* **MySQL:** `localhost:3306`
* **MinIO API:** `http://localhost:9000`
* **MinIO Console:** `http://localhost:9001`
* **RabbitMQ:** `localhost:5672`
* **RabbitMQ Management:** `http://localhost:15672`
* **Redis:** `localhost:6379`

## Application Flow

1. A user uploads a video through the Angular frontend.
2. The backend receives the upload and stores the original video in MinIO.
3. The backend creates a processing job and sends it to RabbitMQ.
4. The background worker consumes the job from RabbitMQ.
5. FFprobe extracts the video's metadata.
6. FFmpeg generates a thumbnail and processes the video into multiple resolutions.
7. The worker generates HLS playlists and video segments.
8. Processed files are uploaded to MinIO.
9. Processing status and metadata are updated in MySQL.
10. Redis caches frequently requested data to improve API performance.
11. The frontend uses the processed HLS stream for video playback.

## Supported Video Processing

The background processing pipeline includes:

* Video metadata extraction
* Thumbnail generation
* Video transcoding
* Multiple video resolutions
* HLS playlist generation
* HLS segment generation
* Processing status tracking
* Failed-job handling and retries

This provides a consistent development environment with the frontend, API, worker, database, storage, queue, cache, and reverse proxy running as separate containers.
