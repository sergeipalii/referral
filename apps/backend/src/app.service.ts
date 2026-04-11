import { Injectable } from '@nestjs/common';
import { AppInfo } from './common/interfaces/app-info.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getInfo(): AppInfo {
    return {
      name: this.configService.get<string>('app.name', 'NestJS API'),
      version: this.configService.get<string>('app.version', '1.0'),
      description: this.configService.get<string>(
        'app.description',
        'API documentation',
      ),
    };
  }
}
