import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'prisma-client-custom';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  create(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    return this.supportService.create(req.user.id, createTicketDto);
  }

  @Get('my-tickets')
  findMyTickets(@Request() req) {
    return this.supportService.findMyTickets(req.user.id);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getStats() {
    return this.supportService.getStats();
  }

  @Get('all-tickets')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Request() req) {
    const status = req.query.status as string;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return this.supportService.findAll(status, page, limit);
  }

  @Get('tickets/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @Post('tickets/:id/reply')
  addReply(@Request() req, @Param('id') id: string, @Body('message') message: string) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.supportService.addReply(id, req.user.id, message, isAdmin);
  }

  @Post('tickets/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  resolve(@Param('id') id: string) {
    return this.supportService.resolve(id);
  }
}
