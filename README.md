# High level architectural diagram for video stream platform

<img width="872" height="651" alt="image (1)" src="https://github.com/user-attachments/assets/76c2d782-70b6-4e30-905e-408a25422e13" />

# Tech Stack
1. Frontend
- Angular
- TypeScript
- HTML
- CSS
2. Backend
- Node.js
- Express
- TypeScript
3. Database
- MySQL
- Sequelize ORM
4. Storage
- MinIO
- S3-compatible object storage
5. Message Queue
- RabbitMQ
6. Caching
- Redis
7. Video Processing
- FFmpeg
- FFprobe
8. Reverse Proxy
- Nginx
9. Containerization
- Docker
- Docker Compose

# How to Start the Application

Clone the repository:

git clone <your-repository-url>
cd video-streaming-platform

Start all services:

docker compose up --build

Run in detached mode:

docker compose up --build -d

#Check Running Containers

docker compose ps

You can also use:

docker ps

Expected services include:

frontend
api
worker
nginx
mysql
redis
rabbitmq
minio
