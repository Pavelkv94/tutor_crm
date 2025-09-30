import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TelegramService } from 'src/telegram/telegram.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, TelegramService],
})
export class ReportsModule {}
