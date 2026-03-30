import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4003',
    credentials: true,
  });

  const port = process.env.PORT || 4002;
  await app.listen(port);
  console.log(`Cleo backend running on port ${port}`);
}
bootstrap();
