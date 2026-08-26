import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";

import { sequelize } from "../config/database";

export class Video extends Model<
  InferAttributes<Video>,
  InferCreationAttributes<Video>
> {
  declare id: CreationOptional<number>;
  declare userId: number;

  declare title: string;
  declare originalFilename: string;

  declare fileSize: number;

  declare duration: number | null;
  declare width: number | null;
  declare height: number | null;
  declare codec: string | null;

  declare status:
    | "UPLOADING"
    | "QUEUED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

  declare originalObjectKey: string | null;
  declare thumbnailObjectKey: string | null;

  declare hlsObjectKey: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Video.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "user_id",
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "original_filename",
    },

    fileSize: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "file_size",
    },

    duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    width: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    height: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    codec: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "UPLOADING",
        "QUEUED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ),
      allowNull: false,
      defaultValue: "UPLOADING",
    },

    originalObjectKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "original_object_key",
    },
    thumbnailObjectKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "thumbnail_object_key",
    },

    hlsObjectKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "hls_object_key",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "videos",
    timestamps: true,
    underscored: true,
  },
);
