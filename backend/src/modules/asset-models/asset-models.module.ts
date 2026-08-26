import { Module } from '@nestjs/common';
import { AssetModelsController } from './asset-models.controller';

@Module({ controllers: [AssetModelsController] })
export class AssetModelsModule {}
