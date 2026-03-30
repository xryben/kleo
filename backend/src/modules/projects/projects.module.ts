import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'video-processing' })],
  controllers: [ProjectsController],
  providers: [ProjectsService, PrismaService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
