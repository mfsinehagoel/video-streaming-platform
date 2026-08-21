import express from 'express';
import cors from 'cors';

import { sequelize } from './config/database';

import videosRoutes from './videos/videos.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/videos', videosRoutes);

sequelize
  .authenticate()
  .then(() => {
    console.log('MySQL connected successfully');
  })
  .catch((error) => {
    console.error('MySQL connection failed:', error);
  });

// TODO: remove this API endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Video Streaming API is running',
  });
});

export default app;