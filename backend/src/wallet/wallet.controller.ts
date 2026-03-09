import { Controller, Get, Post, Body, UseGuards, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'prisma-client-custom';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
    constructor(private walletService: WalletService) { }

    @Get()
    @ApiOperation({ summary: 'Get wallet balance and recent 20 transactions' })
    getWallet(@Req() req: any) {
        return this.walletService.getWallet(req.user.id);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get paginated wallet transaction history' })
    getTransactions(
        @Req() req: any,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.walletService.getTransactions(req.user.id, page, limit);
    }

    @Post('credit')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Admin only: Credit a user wallet' })
    creditWallet(
        @Body('userId') userId: string,
        @Body('amount') amount: number,
        @Body('description') description: string,
    ) {
        return this.walletService.credit(userId, amount, description);
    }
}
