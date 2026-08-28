import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrgModule } from './modules/org/org.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { UnitsModule } from './modules/units/units.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AssetModelsModule } from './modules/asset-models/asset-models.module';
import { ServiceEventsModule } from './modules/service-events/service-events.module';
import { PartsModule } from './modules/parts/parts.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { UsersModule } from './modules/users/users.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrgModule,
    PropertiesModule,
    BuildingsModule,
    UnitsModule,
    AssetsModule,
    AssetModelsModule,
    ServiceEventsModule,
    PartsModule,
    WorkOrdersModule,
    UsersModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
