import {
	CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import { sequelize } from '../config/database';

export class ProcessingJob extends Model<
  InferAttributes<ProcessingJob>,
  InferCreationAttributes<ProcessingJob>
> {
  declare id: CreationOptional<number>;
  declare videoId: number;

  declare status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  declare attempts: number;
  declare errorMessage: string | null;

  declare startedAt: Date | null;
  declare completedAt: Date | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ProcessingJob.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    videoId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'video_id',
    },

    status: {
      type: DataTypes.ENUM(
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
      ),
      allowNull: false,
      defaultValue: 'QUEUED',
    },

    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },

    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at',
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },

	createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'processing_jobs',
    timestamps: true,
    underscored: true,
  },
);