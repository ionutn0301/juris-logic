import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino structured logger globally
  app.useLogger(app.get(Logger));

  // Global validation pipe — auto-validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject unknown properties
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable CORS for headless microservice consumption
  app.enableCors();

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('JurisLogic — Tax & Commission Microservice')
    .setDescription(
      'Headless microservice for multi-jurisdiction tax calculation and commission computation. ' +
      'Supports US Sales Tax, EU VAT, UK VAT, Canadian GST/HST/PST, ' +
      'flat/percentage/tiered commissions, and high-volume batch processing.',
    )
    .setVersion('1.0.0')
    .addTag('Tax', 'Single tax calculation endpoints')
    .addTag('Commission', 'Commission calculation endpoints')
    .addTag('Batch Processing', 'High-volume async batch endpoints')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  JurisLogic Tax & Commission Microservice                    ║
║  Running on: http://localhost:${port}                        ║
║  API Docs:   http://localhost:${port}/api/docs               ║
║  Health:     http://localhost:${port}/health                 ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
