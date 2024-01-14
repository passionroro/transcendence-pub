import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('APP E2E', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authToken: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
            }),
        );
        await app.init();
        await app.listen(3000);

        prisma = app.get(PrismaService);
        await prisma.cleanDb();
        request('http://localhost:3000');

        const username = 'rohoarau';
        const email = 'rohoarau@student.42lausanne.ch';
        const response = await request(app.getHttpServer())
            .get('/auth/login')
            .query({ username, email });
        authToken = response.body.token;
    });

    afterAll(() => {
        app.close();
    });

    describe('Authentication', () => {
        describe('AuthGuard', () => {
            it('success', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/validate')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                expect(response.body).toEqual({ ok: true });
            });

            it('invalid token', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/validate')
                    .set('Authorization', `Bearer ${authToken + 'f'}`)
                    .expect(401);
                expect(response.body).toEqual({
                    statusCode: 401,
                    message: 'Token is invalid',
                    error: 'Unauthorized',
                });
            });

            it('empty token', async () => {
                const response = await request(app.getHttpServer())
                    .get('/auth/validate')
                    .set('Authorization', 'Bearer ')
                    .expect(401);
                expect(response.body).toEqual({
                    statusCode: 401,
                    message: 'Token not found',
                    error: 'Unauthorized',
                });
            });

            it.todo('token valid but user not in database');
        });
        describe('Two-Factor authentication', () => {
            it('should enable two-factor authentication for a user', async () => {
                const response = await request(app.getHttpServer())
                    .post('/tfa/enable')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                expect(response.body.message).toEqual(
                    '2FA suffessfully enabled.',
                );
            });

            it('should not enable two-factor if already enabled', async () => {
                const response = await request(app.getHttpServer())
                    .post('/tfa/enable')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(401);
                expect(response.body).toEqual({
                    statusCode: 401,
                    message:
                        'enable error: Two-factor authentication already enabled.',
                    error: 'Unauthorized',
                });
            });

            it('should disable two-factor authentication for a user', async () => {
                const response = await request(app.getHttpServer())
                    .post('/tfa/disable')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                expect(response.body.message).toEqual(
                    '2FA suffessfully disabled.',
                );
            });

            it('should not disable two-factor if already disabled', async () => {
                const response = await request(app.getHttpServer())
                    .post('/tfa/disable')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(401);
                expect(response.body).toEqual({
                    statusCode: 401,
                    message: 'Two-factor authentication is disabled.',
                    error: 'Unauthorized',
                });
            });

            it('should return unauthorized (tfa disabled)', async () => {
                await request(app.getHttpServer())
                    .get('/tfa/generate')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(401);
            });

            it('should return qrcode', async () => {
                await request(app.getHttpServer())
                    .post('/tfa/enable')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                const response = await request(app.getHttpServer())
                    .get('/tfa/generate')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                expect(response.body.qrCode).toBeDefined();
            });

            it('should return unauthorized (user has secret already)', async () => {
                const response = await request(app.getHttpServer())
                    .get('/tfa/generate')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(401);
                expect(response.body).toEqual({
                    statusCode: 401,
                    message: 'generate error: User rohoarau already has a secret.',
                    error: 'Unauthorized',
                });
            });
            it.todo('verify');
        });
    });

    // describe('User', () => {
    //     describe('Get me', () => {
    //         it('should get current user', () => {
    //             return pactum
    //                 .spec()
    //                 .get('/users/me')
    //                 .withHeaders({
    //                     Authorization: 'Bearer $S{userAt}',
    //                 })
    //                 .expectStatus(200);
    //         });
    //     });

    //     describe('Edit user', () => {
    //         it('should edit user', () => {
    //             const dto: EditUserDto = {
    //                 firstName: 'Vladimir',
    //                 email: 'vlad@codewithvlad.com',
    //             };
    //             return pactum
    //                 .spec()
    //                 .patch('/users')
    //                 .withHeaders({
    //                     Authorization: 'Bearer $S{userAt}',
    //                 })
    //                 .withBody(dto)
    //                 .expectStatus(200)
    //                 .expectBodyContains(dto.firstName)
    //                 .expectBodyContains(dto.email);
    //         });
    //     });
    // });
});
