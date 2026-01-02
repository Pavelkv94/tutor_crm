// import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
// import { ReportsService } from './reports.service';
// import { SendReportDto } from './dto/send-report.dto';

// @Controller('reports')
// export class ReportsController {
// 	constructor(private readonly reportsService: ReportsService) {}


// 	@Get(':studentId')
// 	findReport(@Param('studentId') studentId: string, @Query('start_date') start_date: string, @Query('end_date') end_date: string) {
// 		return this.reportsService.findReport(+studentId, start_date, end_date);
// 	}

// 	@Post('send-report')
// 	sendReport(@Body() sendReportDto: SendReportDto) {
// 		return this.reportsService.sendReport(sendReportDto);
// 	}
// }