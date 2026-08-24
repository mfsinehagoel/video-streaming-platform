import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";

import { sequelize } from "../config/database";

export class VideoVariant extends Model<
  InferAttributes<VideoVariant>,
  InferCreationAttributes<VideoVariant>
> {
  declare id: CreationOptional<number>;

  declare videoId: number;

  declare resolution: "1080p" | "720p" | "480p";

  declare objectKey: string;

  declare fileSize: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

VideoVariant.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    videoId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "video_id",
    },

    resolution: {
      type: DataTypes.ENUM("1080p", "720p", "480p"),
      allowNull: false,
    },

    objectKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "object_key",
    },

    fileSize: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "file_size",
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
    tableName: "video_variants",
    timestamps: true,
    underscored: true,
  },
);
