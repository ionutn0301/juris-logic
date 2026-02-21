import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import {
  TaxController,
  CommissionController,
  BatchController,
  HealthController,
} from './controllers';
import { ApplicationModule } from '../../application/application.module';

/**
 * InterfacesModule — registers all REST controllers.
 * Imports ApplicationModule to access use cases.
 */
@Module({
  imports: [ApplicationModule, TerminusModule],
  controllers: [TaxController, CommissionController, BatchController, HealthController],
})
export class InterfacesModule {}
