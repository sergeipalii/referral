import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { AppInfo } from './common/interfaces/app-info.interface';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Returns application name, version, and description',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Referral System API' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string', example: 'Referral System API' },
      },
    },
  })
  getInfo(): AppInfo {
    return this.appService.getInfo();
  }
}
