import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tax Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/tax/calculate — should calculate US state tax', () => {
    return request(app.getHttpServer())
      .post('/api/v1/tax/calculate')
      .send({
        subtotal: 1000,
        currency: 'USD',
        jurisdictionCode: {
          country: 'US',
          region: 'US',
          state: 'CA',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('transactionId');
        expect(res.body).toHaveProperty('taxAmount');
        expect(res.body).toHaveProperty('breakdown');
        expect(res.body.taxAmount.currency).toBe('USD');
      });
  });

  it('POST /api/v1/tax/calculate — should reject invalid currency', () => {
    return request(app.getHttpServer())
      .post('/api/v1/tax/calculate')
      .send({
        subtotal: 1000,
        currency: 'X', // invalid — must be 3 chars
        jurisdictionCode: {
          country: 'US',
          region: 'US',
        },
      })
      .expect(400);
  });

  it('GET /health — should return health status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
      });
  });
});
