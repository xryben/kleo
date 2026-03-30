import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthUser } from '../auth/jwt.strategy';
import { MAX_FILE_SIZE_MB_DEFAULT } from '../../config/app.config';

interface AuthRequest extends Request {
  user: AuthUser;
}

// Multer config evaluates at class-definition time (before DI), so
// process.env is the only option here. ConfigModule.forRoot() has
// already loaded .env by the time modules are initialized.
const uploadsPath = process.env.UPLOADS_PATH || '/var/www/cleo/uploads';
const maxFileSizeMb = parseInt(
  process.env.MAX_FILE_SIZE_MB || String(MAX_FILE_SIZE_MB_DEFAULT),
  10,
);

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  private getTenantId(req: AuthRequest): string {
    if (!req.user.tenantId) throw new ForbiddenException('Sin tenant asignado');
    return req.user.tenantId;
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateProjectDto) {
    if (dto.sourceType === 'YOUTUBE' && !dto.sourceUrl) {
      throw new BadRequestException('sourceUrl requerida para YouTube');
    }
    return this.projects.create(req.user.id, this.getTenantId(req), dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tmpDir = join(uploadsPath, 'tmp');
          if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        const allowedMimes = [
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          'video/x-matroska',
          'video/webm',
        ];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext) && allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Formato de video no soportado'), false);
        }
      },
    }),
  )
  async uploadAndCreate(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
  ) {
    if (!file) throw new BadRequestException('Video requerido');
    if (!title) throw new BadRequestException('Título requerido');
    return this.projects.create(
      req.user.id,
      this.getTenantId(req),
      { title, sourceType: 'UPLOAD' },
      file.path,
    );
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.projects.findAll(this.getTenantId(req));
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.projects.findOne(id, this.getTenantId(req));
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.projects.remove(id, this.getTenantId(req));
  }
}
