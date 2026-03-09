import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('OtpService', () => {
    let service: OtpService;
    let prismaService: any;
    let redisService: any;

    beforeEach(async () => {
        prismaService = {
            otpRequest: {
                updateMany: jest.fn(),
                create: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
            },
            user: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        redisService = {
            get: jest.fn(),
            set: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OtpService,
                { provide: PrismaService, useValue: prismaService },
                { provide: RedisService, useValue: redisService },
                { provide: ConfigService, useValue: { get: jest.fn((key) => key) } },
                { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token') } },
            ],
        }).compile();

        service = module.get<OtpService>(OtpService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendOtp', () => {
        it('should throw if rate limited', async () => {
            redisService.get.mockResolvedValue('1');
            await expect(service.sendOtp('9999999999')).rejects.toThrow(BadRequestException);
        });

        it('should send OTP and set rate limit', async () => {
            redisService.get.mockResolvedValue(null);
            const res = await service.sendOtp('9999999999');
            expect(res.message).toBe('OTP sent successfully');
            expect(prismaService.otpRequest.create).toHaveBeenCalled();
            expect(redisService.set).toHaveBeenCalledWith('otp:ratelimit:9999999999', '1', 60);
        });
    });

    describe('verifyOtp', () => {
        it('should throw if no OTP found', async () => {
            prismaService.otpRequest.findFirst.mockResolvedValue(null);
            await expect(service.verifyOtp('9999999999', '123456')).rejects.toThrow(BadRequestException);
        });

        it('should throw and increment attempts on invalid OTP', async () => {
            prismaService.otpRequest.findFirst.mockResolvedValue({ id: '1', otpHash: 'hash', attempts: 1 });
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

            await expect(service.verifyOtp('9999999999', '123456')).rejects.toThrow(BadRequestException);
            expect(prismaService.otpRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { attempts: { increment: 1 } } })
            );
        });
    });
});
